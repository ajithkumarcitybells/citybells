import type { TaxiVehicleType } from "@shared/schema";

export type Coordinates = {
  lat: number;
  lng: number;
};

export type RideLocation = Coordinates & {
  address: string;
};

export type SearchSuggestion = Coordinates & {
  id: string;
  name: string;
  address: string;
};

export type RouteMetrics = {
  distanceKm: number;
  durationMin: number;
  geometry: [number, number][];
};

export type TaxiMapVehicleType = "car" | "bike" | "auto";

export type NearbyDriver = {
  id: string;
  name: string;
  vehicleType: string;
  vehicleNumber: string;
  currentLocation: Coordinates;
  status: "available";
  type: TaxiMapVehicleType;
  heading: number;
  distanceKm: number;
  etaMin: number;
  rating: number;
  isRecommended?: boolean;
  completedRides?: number;
  safetyVerified?: boolean;
  photo?: string | null;
};

export type LiveTaxiVehicle = NearbyDriver & {
  driverName: string;
  lat: number;
  lng: number;
};

export const TAXI_DEFAULT_CENTER: Coordinates = {
  lat: 11.9416,
  lng: 79.8083,
};

async function fetchJson<T>(url: string) {
  const response = await fetch(url, {
    credentials: "include",
  });

  if (!response.ok) {
    const message = (await response.text()) || response.statusText;
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function hasCoordinates(location?: Partial<RideLocation> | null): location is RideLocation {
  return Boolean(
    location
      && typeof location.address === "string"
      && Number.isFinite(location.lat)
      && Number.isFinite(location.lng),
  );
}

export function getDocumentId(document: { id?: string; _id?: string }) {
  return document.id ?? document._id ?? "";
}

export function formatCurrency(amount?: number | null) {
  if (typeof amount !== "number" || Number.isNaN(amount)) {
    return "--";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function readFareNumber(value: unknown, fallback = 0) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

export function calculateFare(vehicleType: TaxiVehicleType, routeMetrics: RouteMetrics | null) {
  if (!routeMetrics) {
    return null;
  }

  const baseFare = readFareNumber(vehicleType.baseFare);
  const perKmRate = readFareNumber((vehicleType as any).perKmRate ?? (vehicleType as any).pricePerKm);
  const perMinRate = readFareNumber((vehicleType as any).perMinRate ?? (vehicleType as any).pricePerMinute);

  const fare = baseFare
    + (perKmRate * routeMetrics.distanceKm)
    + (perMinRate * routeMetrics.durationMin);

  return Math.round(fare);
}

export async function searchLocations(query: string) {
  const params = new URLSearchParams({ q: query });
  return fetchJson<SearchSuggestion[]>(`/api/taxi/map/search?${params.toString()}`);
}

export async function reverseGeocode(coordinates: Coordinates) {
  const params = new URLSearchParams({
    lat: coordinates.lat.toString(),
    lng: coordinates.lng.toString(),
  });

  return fetchJson<RideLocation>(`/api/taxi/map/reverse?${params.toString()}`);
}

export async function getRoute(pickup: Coordinates, drop: Coordinates) {
  const params = new URLSearchParams({
    pickupLat: pickup.lat.toString(),
    pickupLng: pickup.lng.toString(),
    dropLat: drop.lat.toString(),
    dropLng: drop.lng.toString(),
  });

  return fetchJson<RouteMetrics>(`/api/taxi/map/route?${params.toString()}`);
}

export async function getNearbyVehicles(
  center: Coordinates,
  options?: { count?: number; type?: TaxiMapVehicleType },
) {
  const params = new URLSearchParams({
    lat: center.lat.toString(),
    lng: center.lng.toString(),
    count: String(options?.count ?? 8),
  });

  if (options?.type) {
    params.set("type", options.type);
  }

  const drivers = await fetchJson<NearbyDriver[]>(`/api/drivers/nearby?${params.toString()}`);

  return drivers.map((driver) => ({
    ...driver,
    driverName: driver.name,
    lat: driver.currentLocation.lat,
    lng: driver.currentLocation.lng,
  })) satisfies LiveTaxiVehicle[];
}
