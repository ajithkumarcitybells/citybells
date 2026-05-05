import type { LatLng } from "./geo";

export type OsrmRoute = {
  distanceMeters: number;
  durationSec: number;
  polyline: LatLng[];
};

export async function getOsrmRoute(origin: LatLng, destination: LatLng): Promise<OsrmRoute | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${destination.lng},${destination.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Routing failed (${r.status})`);
  const j = await r.json();
  const route = j?.routes?.[0];
  const coords: [number, number][] | undefined = route?.geometry?.coordinates;
  if (!route || !coords?.length) return null;

  return {
    distanceMeters: Number(route.distance || 0),
    durationSec: Number(route.duration || 0),
    polyline: coords.map(([lng, lat]) => ({ lat, lng })),
  };
}

