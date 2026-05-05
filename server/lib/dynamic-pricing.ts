import { Db } from 'mongodb';

// Demand surge thresholds (defaults). Stored in collection 'demand_surge_config'
const DEFAULT_DEMAND_CONFIG = {
  low: { maxRatio: 1.0, multiplier: 1.0 },
  medium: { maxRatio: 1.5, multiplier: 1.3 },
  high: { maxRatio: 2.5, multiplier: 1.8 },
  extreme: { multiplier: 2.5 },
};

function ratioToDemandMultiplier(ratio: number, cfg: any) {
  if (ratio <= (cfg.low?.maxRatio ?? 1.0)) return cfg.low?.multiplier ?? 1.0;
  if (ratio <= (cfg.medium?.maxRatio ?? 1.5)) return cfg.medium?.multiplier ?? 1.3;
  if (ratio <= (cfg.high?.maxRatio ?? 2.5)) return cfg.high?.multiplier ?? 1.8;
  return cfg.extreme?.multiplier ?? 2.5;
}

export async function getDemandMultiplier(db: Db, requests: number, availableDrivers: number) {
  const cfg = await db.collection('demand_surge_config').findOne({}) || DEFAULT_DEMAND_CONFIG;
  const drivers = Math.max(1, availableDrivers || 0);
  const ratio = requests / drivers;
  return ratioToDemandMultiplier(ratio, cfg);
}

export async function getPeakMultiplier(db: Db, now: Date = new Date(), vehicleType?: string) {
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  const rows = await db.collection('peak_surge_rules').find({ enabled: true }).toArray();
  for (const r of rows) {
    try {
      if (r.vehicleType && vehicleType && r.vehicleType !== vehicleType) continue;
      const [sh, sm] = (r.startTime || '00:00').split(':').map((s: string) => parseInt(s, 10));
      const [eh, em] = (r.endTime || '00:00').split(':').map((s: string) => parseInt(s, 10));
      const start = sh * 60 + (sm || 0);
      const end = eh * 60 + (em || 0);
      if (start <= end) {
        if (curMinutes >= start && curMinutes < end) return Number(r.multiplier) || 1;
      } else {
        if (curMinutes >= start || curMinutes < end) return Number(r.multiplier) || 1;
      }
    } catch (e) {
      continue;
    }
  }
  return 1;
}

export async function getWeatherMultiplier(db: Db, lat?: number, lon?: number) {
  // First prefer explicit weather rules in DB
  const rules = await db.collection('weather_surge_rules').find({ enabled: true }).toArray();
  if (rules && rules.length) {
    // If lat/lon not provided, return default 1
  }

  // If OPENWEATHER_API_KEY provided and coordinates given, call OpenWeather to determine category
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey || typeof lat !== 'number' || typeof lon !== 'number') return 1;

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}`;
    const r = await (globalThis as any).fetch(url, { method: 'GET' });
    if (!r.ok) return 1;
    const data = await r.json();
    const main = (data.weather && data.weather[0] && data.weather[0].main) || '';
    const desc = (data.weather && data.weather[0] && data.weather[0].description) || '';
    const rainVol = (data.rain && (data.rain['1h'] || data.rain['3h'])) || 0;

    // Simple mapping
    if (/thunder|storm/i.test(main || desc)) return 1.4; // Storm
    if (/rain/i.test(main || desc)) {
      if (rainVol >= 10) return 1.25; // heavy
      return 1.1; // light
    }
    return 1;
  } catch (e) {
    return 1;
  }
}

export async function calculateDynamicFare(db: Db, distanceMeters: number, durationSec: number, opts: { vehicleType?: string; requests?: number; availableDrivers?: number; lat?: number; lon?: number } = {}) {
  // Base time-slot pricing: read active taxi pricing
  const now = new Date();
  const pricings = await db.collection('taxi_pricing').find({ isActive: true }).toArray();
  let activePricing: any = null;
  const curMinutes = now.getHours() * 60 + now.getMinutes();
  for (const p of pricings) {
    try {
      const [sh, sm] = (p.startTime || '00:00').split(':').map((s: string) => parseInt(s, 10));
      const [eh, em] = (p.endTime || '00:00').split(':').map((s: string) => parseInt(s, 10));
      const start = sh * 60 + (sm || 0);
      const end = eh * 60 + (em || 0);
      if (start <= end) {
        if (curMinutes >= start && curMinutes < end) {
          activePricing = p; break;
        }
      } else {
        if (curMinutes >= start || curMinutes < end) { activePricing = p; break; }
      }
    } catch (e) { continue; }
  }

  const baseFare = (activePricing && activePricing.baseFare) || 50;
  const perKm = (activePricing && activePricing.perKmRate) || 15;
  const perMin = (activePricing && activePricing.perMinuteRate) || 0.5;
  const bookingFee = (activePricing && activePricing.bookingFee) || 0;
  const minimum = (activePricing && activePricing.minimumFare) || 0;

  const distanceKm = Math.max(0, distanceMeters / 1000);
  const durationMin = Math.max(0, durationSec / 60);

  // Compute multipliers
  const peak = await getPeakMultiplier(db, now, opts.vehicleType);
  const demand = await getDemandMultiplier(db, opts.requests || 0, opts.availableDrivers || 0);
  const weather = await getWeatherMultiplier(db, opts.lat, opts.lon);

  const vehicleMultiplier = 1; // reserved for vehicle specific multipliers in future

  const distanceCharge = perKm * distanceKm * vehicleMultiplier;
  const timeCharge = perMin * durationMin * vehicleMultiplier;
  const subtotal = baseFare + distanceCharge + timeCharge;

  const totalMultiplier = peak * demand * weather;

  let fare = subtotal * totalMultiplier;
  fare = Math.max(fare, minimum);
  fare = fare + bookingFee;
  fare = Math.round(fare);

  return {
    fare,
    breakdown: {
      baseFare,
      distanceCharge: Math.round(distanceCharge * 100) / 100,
      timeCharge: Math.round(timeCharge * 100) / 100,
      bookingFee,
      minimum,
    },
    multipliers: { peak, demand, weather, totalMultiplier },
  };
}

export default {
  calculateDynamicFare,
  getPeakMultiplier,
  getDemandMultiplier,
  getWeatherMultiplier,
};
