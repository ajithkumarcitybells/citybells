import { getDb, toObjectId } from "../db";

export type TaxiEtaConfidence = "High" | "Medium" | "Low";

export type TaxiEtaPredictionInput = {
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  vehicleTypeId: string;
  driverId?: string | null;
  routeDistanceKm?: number | null;
  routeDurationMin?: number | null;
};

export type TaxiEtaPrediction = {
  pickupEtaMin: number;
  tripEtaMin: number;
  totalEtaMin: number;
  confidence: TaxiEtaConfidence;
  factors: {
    driverDistanceKm: number | null;
    routeDistanceKm: number;
    routeDurationMin: number;
    vehicleType: string;
    vehicleMultiplier: number;
    peakMultiplier: number;
    surgeMultiplier: number;
    availabilityMultiplier: number;
    availableDrivers: number;
    weatherMultiplier: number;
    historicalMultiplier: number;
    routeSource: "osrm" | "stored" | "haversine";
  };
  generatedAt: string;
};

const CITY_AVG_SPEED_KMPH = 25;
const PICKUP_AVG_SPEED_KMPH = 22;

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const earthRadiusKm = 6371;
  const latDelta = ((b.lat - a.lat) * Math.PI) / 180;
  const lngDelta = ((b.lng - a.lng) * Math.PI) / 180;
  const startLat = (a.lat * Math.PI) / 180;
  const endLat = (b.lat * Math.PI) / 180;
  const haversine = Math.sin(latDelta / 2) ** 2
    + Math.cos(startLat) * Math.cos(endLat) * Math.sin(lngDelta / 2) ** 2;
  return 2 * earthRadiusKm * Math.asin(Math.sqrt(haversine));
}

function vehicleMultiplierFromName(name?: string | null) {
  const normalized = String(name || "").toLowerCase();
  if (normalized.includes("bike") || normalized.includes("moto")) return 0.85;
  if (normalized.includes("auto") || normalized.includes("rick")) return 1.05;
  if (normalized.includes("suv")) return 1.1;
  return 1;
}

function peakMultiplier(now = new Date()) {
  const hour = now.getHours();
  if ((hour >= 7 && hour <= 10) || (hour >= 17 && hour <= 20)) return 1.25;
  if (hour >= 12 && hour <= 14) return 1.1;
  return 1;
}

async function resolveVehicleType(vehicleTypeId: string) {
  const db = getDb();
  let vehicleType = await db.collection("taxi_vehicle_types").findOne({ _id: vehicleTypeId as any });
  if (!vehicleType) {
    try {
      vehicleType = await db.collection("taxi_vehicle_types").findOne({ _id: toObjectId(vehicleTypeId) });
    } catch {
      vehicleType = null;
    }
  }
  return vehicleType;
}

async function getRouteEstimate(input: TaxiEtaPredictionInput) {
  const pickup = { lat: input.pickupLat, lng: input.pickupLng };
  const drop = { lat: input.dropLat, lng: input.dropLng };
  const fallbackDistanceKm = Number(haversineKm(pickup, drop).toFixed(1));
  const fallbackDurationMin = Math.max(2, Math.round((fallbackDistanceKm / CITY_AVG_SPEED_KMPH) * 60));

  if (input.routeDistanceKm && input.routeDurationMin) {
    return {
      routeDistanceKm: Number(input.routeDistanceKm.toFixed(1)),
      routeDurationMin: Math.max(1, Math.round(input.routeDurationMin)),
      routeSource: "stored" as const,
    };
  }

  try {
    const url = new URL(`https://router.project-osrm.org/route/v1/driving/${input.pickupLng},${input.pickupLat};${input.dropLng},${input.dropLat}`);
    url.searchParams.set("overview", "false");
    url.searchParams.set("steps", "false");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: "application/json" } });
    clearTimeout(timeout);
    if (!response.ok) throw new Error(`OSRM ${response.status}`);
    const data = await response.json() as { routes?: Array<{ distance: number; duration: number }> };
    const route = data.routes?.[0];
    if (!route) throw new Error("No route");
    return {
      routeDistanceKm: Number((route.distance / 1000).toFixed(1)),
      routeDurationMin: Math.max(1, Math.round(route.duration / 60)),
      routeSource: "osrm" as const,
    };
  } catch {
    return {
      routeDistanceKm: fallbackDistanceKm,
      routeDurationMin: fallbackDurationMin,
      routeSource: "haversine" as const,
    };
  }
}

async function getDriverContext(input: TaxiEtaPredictionInput) {
  const db = getDb();
  const pickup = { lat: input.pickupLat, lng: input.pickupLng };
  const driverQuery: any = { isApproved: { $ne: false } };
  const drivers = await db.collection("taxi_drivers").find(driverQuery).toArray();
  const onlineDrivers = drivers.filter((driver: any) => {
    const hasOnlineFlag = driver.isActive !== undefined || driver.isOnline !== undefined;
    return !hasOnlineFlag || driver.isActive === true || driver.isOnline === true;
  });

  let chosenDriver = null as any;
  if (input.driverId) {
    chosenDriver = onlineDrivers.find((driver: any) => String(driver._id) === String(input.driverId) || String(driver.id) === String(input.driverId)) ?? null;
  }

  const locatedDrivers = onlineDrivers
    .map((driver: any) => {
      const lat = Number(driver.currentLat);
      const lng = Number(driver.currentLng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      return {
        driver,
        distanceKm: haversineKm({ lat, lng }, pickup),
      };
    })
    .filter(Boolean) as Array<{ driver: any; distanceKm: number }>;

  const nearest = chosenDriver
    ? locatedDrivers.find((item) => String(item.driver._id) === String(chosenDriver._id)) ?? null
    : locatedDrivers.sort((a, b) => a.distanceKm - b.distanceKm)[0] ?? null;

  return {
    availableDrivers: onlineDrivers.length,
    driverDistanceKm: nearest ? Number(nearest.distanceKm.toFixed(2)) : null,
  };
}

export async function predictTaxiEta(input: TaxiEtaPredictionInput): Promise<TaxiEtaPrediction> {
  const [vehicleType, route, driverContext] = await Promise.all([
    resolveVehicleType(input.vehicleTypeId),
    getRouteEstimate(input),
    getDriverContext(input),
  ]);

  const vehicleTypeName = vehicleType?.name || vehicleType?.type || "Cab";
  const vehicleMultiplier = vehicleMultiplierFromName(vehicleTypeName);
  const peak = peakMultiplier();
  const weatherMultiplier = 1;
  const historicalMultiplier = 1;
  const surgeMultiplier = peak > 1 ? 1.08 : 1;
  const availabilityMultiplier = driverContext.availableDrivers >= 5 ? 0.95 : driverContext.availableDrivers >= 2 ? 1 : 1.2;
  const pickupBaseMin = driverContext.driverDistanceKm == null
    ? 6
    : Math.max(2, Math.round((driverContext.driverDistanceKm / PICKUP_AVG_SPEED_KMPH) * 60));

  const pickupEtaMin = Math.max(2, Math.round(pickupBaseMin * peak * availabilityMultiplier));
  const tripEtaMin = Math.max(2, Math.round(route.routeDurationMin * vehicleMultiplier * peak * weatherMultiplier * historicalMultiplier));
  const totalEtaMin = pickupEtaMin + tripEtaMin;

  const confidence: TaxiEtaConfidence = route.routeSource !== "haversine" && driverContext.driverDistanceKm != null && driverContext.availableDrivers > 0
    ? "High"
    : route.routeSource !== "haversine" || driverContext.driverDistanceKm != null
      ? "Medium"
      : "Low";

  return {
    pickupEtaMin,
    tripEtaMin,
    totalEtaMin,
    confidence,
    factors: {
      driverDistanceKm: driverContext.driverDistanceKm,
      routeDistanceKm: route.routeDistanceKm,
      routeDurationMin: route.routeDurationMin,
      vehicleType: vehicleTypeName,
      vehicleMultiplier,
      peakMultiplier: peak,
      surgeMultiplier,
      availabilityMultiplier,
      availableDrivers: driverContext.availableDrivers,
      weatherMultiplier,
      historicalMultiplier,
      routeSource: route.routeSource,
    },
    generatedAt: new Date().toISOString(),
  };
}
