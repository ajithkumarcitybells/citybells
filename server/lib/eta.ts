import type { Db } from "mongodb";

const EARTH_RADIUS_METERS = 6371000;

function haversineDistanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLon = Math.sin(dLon / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return EARTH_RADIUS_METERS * c;
}

function metersToKm(m: number) {
  return m / 1000;
}

function defaultTrafficMultiplier(date = new Date()) {
  // crude time-of-day traffic factor: 1 normal, >1 slower
  const h = date.getHours();
  if (h >= 7 && h < 10) return 1.25; // morning peak
  if (h >= 17 && h < 20) return 1.35; // evening peak
  return 1.0;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export type EtaOptions = {
  mapboxToken?: string;
  now?: Date;
  trafficMultiplier?: number; // override
};

async function routeWithMapbox(driver: { lat: number; lon: number }, dest: { lat: number; lon: number }, token?: string) {
  if (!token) return null;
  try {
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${driver.lon},${driver.lat};${dest.lon},${dest.lat}?overview=full&geometries=polyline&annotations=duration,distance&access_token=${token}`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = await r.json();
    if (!j.routes || !j.routes[0]) return null;
    const route = j.routes[0];
    return {
      distance: route.distance as number,
      duration: route.duration as number,
      geometry: route.geometry as string,
    };
  } catch (e) {
    return null;
  }
}

/**
 * Calculate driver arrival ETA (seconds) from driver -> pickup.
 * Tries Mapbox route first, falls back to haversine + assumptions.
 */
export async function calculateDriverArrivalETA(db: Db | null, driver: { lat: number; lon: number; speedKmh?: number } , pickup: { lat: number; lon: number }, opts: EtaOptions = {}) {
  const now = opts.now || new Date();
  const token = opts.mapboxToken || process.env.MAPBOX_TOKEN;
  const route = await routeWithMapbox({ lat: driver.lat, lon: driver.lon }, pickup, token);
  if (route) {
    // route.duration is in seconds; adjust for traffic multiplier/historical
    const traffic = opts.trafficMultiplier ?? defaultTrafficMultiplier(now);
    const adjusted = Math.round(route.duration * traffic);
    return { seconds: adjusted, distanceMeters: route.distance, geometry: route.geometry, source: 'mapbox' };
  }

  // fallback: haversine + assumed effective speed
  const meters = haversineDistanceMeters(driver, pickup);
  const speedKmh = driver.speedKmh && driver.speedKmh > 5 ? clamp(driver.speedKmh, 10, 80) : 35; // default
  const traffic = opts.trafficMultiplier ?? defaultTrafficMultiplier(now);
  const effectiveKmh = clamp(speedKmh / traffic, 5, 90);
  const hours = metersToKm(meters) / effectiveKmh;
  const seconds = Math.max(10, Math.round(hours * 3600));
  return { seconds, distanceMeters: meters, geometry: null, source: 'haversine' };
}

/**
 * Calculate trip ETA from current position -> destination.
 * Returns seconds, distance meters, arrival timestamp and breakdown.
 */
export async function calculateTripEta(db: Db | null, current: { lat: number; lon: number }, dest: { lat: number; lon: number }, opts: EtaOptions = {}) {
  const now = opts.now || new Date();
  const token = opts.mapboxToken || process.env.MAPBOX_TOKEN;
  const route = await routeWithMapbox(current, dest, token);
  if (route) {
    const traffic = opts.trafficMultiplier ?? defaultTrafficMultiplier(now);
    const adjustedSec = Math.round(route.duration * traffic);
    const arrival = new Date(now.getTime() + adjustedSec * 1000);
    return { seconds: adjustedSec, distanceMeters: route.distance, arrival, geometry: route.geometry, source: 'mapbox', trafficMultiplier: traffic };
  }

  const meters = haversineDistanceMeters(current, dest);
  const speedKmh = 40; // default moving speed
  const traffic = opts.trafficMultiplier ?? defaultTrafficMultiplier(now);
  const effectiveKmh = clamp(speedKmh / traffic, 5, 120);
  const hours = metersToKm(meters) / effectiveKmh;
  const seconds = Math.max(30, Math.round(hours * 3600));
  const arrival = new Date(now.getTime() + seconds * 1000);
  return { seconds, distanceMeters: meters, arrival, geometry: null, source: 'haversine', trafficMultiplier: traffic };
}

export default { calculateDriverArrivalETA, calculateTripEta };
