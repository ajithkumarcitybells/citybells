import { getRedis } from "../redis";

const CACHE_TTL_MS = Number(process.env.MAP_SEARCH_CACHE_MS || String(5 * 60 * 1000)); // 5 minutes

type Suggestion = { id: string; name: string; address: string; lat: number; lng: number };

const inMemoryCache = new Map<string, { expires: number; value: Suggestion[] }>();

function cacheKey(q: string) {
  return `mapbox:search:${q.toLowerCase()}`;
}

async function getCached(q: string): Promise<Suggestion[] | null> {
  const key = cacheKey(q);
  // try Redis first
  try {
    const redis = getRedis();
    if (redis) {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw) as Suggestion[];
    }
  } catch (e) {
    console.error("Redis read failed for map search", e);
  }

  const mem = inMemoryCache.get(key);
  if (mem && mem.expires > Date.now()) return mem.value;
  return null;
}

async function setCached(q: string, value: Suggestion[]) {
  const key = cacheKey(q);
  try {
    const redis = getRedis();
    if (redis) {
      await redis.set(key, JSON.stringify(value), "PX", CACHE_TTL_MS);
    }
  } catch (e) {
    console.error("Redis write failed for map search", e);
  }

  inMemoryCache.set(key, { expires: Date.now() + CACHE_TTL_MS, value });
}

export async function mapboxSearch(query: string): Promise<Suggestion[]> {
  const token = process.env.MAPBOX_TOKEN || process.env.VITE_MAPS_API_KEY || process.env.MAPBOX_API_KEY;
  if (!token) throw new Error("No Mapbox token configured (set MAPBOX_TOKEN or VITE_MAPS_API_KEY)");

  const url = new URL(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json`);
  url.searchParams.set("autocomplete", "true");
  url.searchParams.set("types", "place,address,poi");
  url.searchParams.set("limit", "6");
  url.searchParams.set("access_token", token);

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Mapbox search failed ${res.status}`);
  const j = await res.json();
  const features = Array.isArray(j.features) ? j.features : [];

  return features.map((f: any) => ({
    id: String(f.id),
    name: String(f.text || (f.place_name || '').split(',')[0] || ''),
    address: String(f.place_name || ''),
    lat: Number(f.center?.[1] ?? 0),
    lng: Number(f.center?.[0] ?? 0),
  }));
}

export async function searchLocationsWithCache(q: string): Promise<Suggestion[]> {
  const trimmed = q.trim();
  if (!trimmed) return [];

  // check cache
  const cached = await getCached(trimmed);
  if (cached) return cached;

  let results: Suggestion[] = [];
  try {
    // try Mapbox first
    results = await mapboxSearch(trimmed);
  } catch (e) {
    console.warn("Mapbox search failed, falling back to Nominatim", e);
    // fallback to nominatim
    try {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", trimmed);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("addressdetails", "1");
      url.searchParams.set("limit", "6");
      const r = await fetch(url.toString(), { headers: { Accept: "application/json" } });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) {
          results = j.map((item: any) => ({
            id: String(item.place_id || item.osm_id || Date.now()),
            name: String((item.name || item.display_name || '').split(',')[0] || ''),
            address: String(item.display_name || ''),
            lat: Number(item.lat),
            lng: Number(item.lon),
          }));
        }
      }
    } catch (e2) {
      console.error("Nominatim fallback failed", e2);
    }
  }

  // store in cache
  try { await setCached(trimmed, results); } catch (e) { console.error('Cache set failed', e); }
  return results;
}

// Simple cleanup for expired keys to avoid memory leak (runs rarely)
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of Array.from(inMemoryCache.entries())) {
    if (v.expires <= now) inMemoryCache.delete(k);
  }
}, 60_000).unref();

export type { Suggestion };
