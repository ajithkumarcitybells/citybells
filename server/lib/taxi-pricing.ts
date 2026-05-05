import { getDb, toDoc } from "../db";
import type { TaxiPricing } from "@shared/schema";

function timeToMinutes(t: string) {
  const [h, m] = t.split(":").map((s) => parseInt(s, 10));
  return h * 60 + (m || 0);
}

export async function getActivePricing() {
  const db = getDb();
  const now = new Date();
  const curMinutes = now.getHours() * 60 + now.getMinutes();

  const raw = await db.collection("taxi_pricing").find({ isActive: true }).toArray();
  const pricings = raw.map((r) => toDoc<TaxiPricing>(r));
  for (const p of pricings) {
    try {
      const start = timeToMinutes(p.startTime);
      const end = timeToMinutes(p.endTime);
      if (start <= end) {
        if (curMinutes >= start && curMinutes < end) return p;
      } else {
        // overnight slot (e.g., 22:00 - 04:00)
        if (curMinutes >= start || curMinutes < end) return p;
      }
    } catch (e) {
      continue;
    }
  }

  return null;
}

export function calculateFare(pricing: TaxiPricing | null, distanceKm: number, durationMin: number, vehicleMultiplier = 1) {
  // If no active pricing, fallback to simple calculation using pricing-like defaults
  const baseFare = pricing?.baseFare ?? 50;
  const perKm = pricing?.perKmRate ?? 15;
  const perMin = pricing?.perMinuteRate ?? 0.5;
  const surge = pricing?.surgeMultiplier ?? 1;
  const minimum = pricing?.minimumFare ?? 0;
  const bookingFee = pricing?.bookingFee ?? 0;

  let fare = baseFare + (perKm * distanceKm + perMin * durationMin) * vehicleMultiplier;
  fare = fare * surge;
  fare = Math.max(fare, minimum);
  fare = fare + bookingFee;
  return {
    fare: Math.round(fare),
    breakdown: {
      baseFare,
      distanceCharge: (perKm * distanceKm * vehicleMultiplier),
      timeCharge: (perMin * durationMin * vehicleMultiplier),
      surge,
      bookingFee,
      minimum,
    },
  };
}
