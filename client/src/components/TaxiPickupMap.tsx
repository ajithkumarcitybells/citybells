import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { GeoJSONSourceSpecification } from "mapbox-gl";

type LatLng = { lat: number; lng: number } | null;

interface Suggestion {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

const RECENT_KEY = "recent_addresses_v1";

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = window.setTimeout(() => setV(value), ms);
    return () => window.clearTimeout(id);
  }, [value, ms]);
  return v;
}

interface Props {
  pickupAddress?: string;
  setPickupAddress?: (s: string) => void;
  dropAddress?: string;
  setDropAddress?: (s: string) => void;
  onRouteUpdate?: (info: { distanceMeters: number; durationSec: number; fare: number } | null) => void;
}

export default function TaxiPickupMap({ pickupAddress, setPickupAddress, dropAddress, setDropAddress, onRouteUpdate }: Props) {
  const token = import.meta.env.VITE_MAPS_API_KEY as string | undefined;
  const mapContainer = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const pickupMarker = useRef<mapboxgl.Marker | null>(null);
  const dropMarker = useRef<mapboxgl.Marker | null>(null);

  const [pickupText, setPickupText] = useState("");
  const [dropText, setDropText] = useState("");
  const [pickup, setPickup] = useState<LatLng>(null);
  const [drop, setDrop] = useState<LatLng>(null);

  const [pickupQuery, setPickupQuery] = useState("");
  const [dropQuery, setDropQuery] = useState("");
  const debouncedPickup = useDebounced(pickupQuery, 300);
  const debouncedDrop = useDebounced(dropQuery, 300);

  const [pickupSug, setPickupSug] = useState<Suggestion[]>([]);
  const [dropSug, setDropSug] = useState<Suggestion[]>([]);
  const [pickupOpen, setPickupOpen] = useState(false);
  const [dropOpen, setDropOpen] = useState(false);
  const [loadingPickup, setLoadingPickup] = useState(false);
  const [loadingDrop, setLoadingDrop] = useState(false);

  const [routeInfo, setRouteInfo] = useState<{ distanceMeters: number; durationSec: number } | null>(null);

  const recent = useMemo(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      return raw ? JSON.parse(raw) as Suggestion[] : [];
    } catch { return []; }
  }, []);

  // init map
  useEffect(() => {
    if (!token) return;
    if (!mapContainer.current) return;
    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [78.9629, 20.5937],
      zoom: 5,
    });
    mapRef.current = map;

    // try browser geolocation for default center
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const lng = pos.coords.longitude;
        const lat = pos.coords.latitude;
        map.setCenter([lng, lat]);
        map.setZoom(14);
        // show current location marker
        const el = document.createElement("div");
        el.className = "w-3 h-3 rounded-full bg-blue-600 border-2 border-white";
        new mapboxgl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
      });
    }

    // click handler to set pickup if pickup input focused, else set drop
    map.on("click", (e) => {
      const coords = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      // Prefers pickup when none set
      if (!pickup) {
        setPickup(coords);
        reverseGeocode(coords).then((name) => {
          setPickupText(name);
          setPickupAddress?.(name);
        });
      } else if (!drop) {
        setDrop(coords);
        reverseGeocode(coords).then((name) => {
          setDropText(name);
          setDropAddress?.(name);
        });
      }
    });

    return () => map.remove();
  }, [token]);

  // ensure markers on map
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (pickup) {
      if (!pickupMarker.current) {
        const el = document.createElement("div");
        el.innerHTML = '<div class="w-5 h-5 rounded-full bg-red-600 border-2 border-white shadow" />';
        pickupMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([pickup.lng, pickup.lat])
          .addTo(map);
        pickupMarker.current.on("dragend", () => {
          const p = pickupMarker.current?.getLngLat();
          if (!p) return;
          const coords = { lat: p.lat, lng: p.lng };
          setPickup(coords);
          reverseGeocode(coords).then((n) => setPickupText(n));
        });
      } else {
        pickupMarker.current.setLngLat([pickup.lng, pickup.lat]);
      }
    } else if (pickupMarker.current) {
      pickupMarker.current.remove();
      pickupMarker.current = null;
    }

    if (drop) {
      if (!dropMarker.current) {
        const el = document.createElement("div");
        el.innerHTML = '<div class="w-5 h-5 rounded-full bg-green-600 border-2 border-white shadow" />';
        dropMarker.current = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([drop.lng, drop.lat])
          .addTo(map);
        dropMarker.current.on("dragend", () => {
          const p = dropMarker.current?.getLngLat();
          if (!p) return;
          const coords = { lat: p.lat, lng: p.lng };
          setDrop(coords);
          reverseGeocode(coords).then((n) => setDropText(n));
        });
      } else {
        dropMarker.current.setLngLat([drop.lng, drop.lat]);
      }
    } else if (dropMarker.current) {
      dropMarker.current.remove();
      dropMarker.current = null;
    }
  }, [pickup, drop]);

  // When both selected, fetch route
  useEffect(() => {
    if (!pickup || !drop || !token) return;
    (async () => {
      try {
        const r = await fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?access_token=${token}&geometries=geojson&overview=full`
        );
        const j = await r.json();
        const route = j.routes?.[0];
        if (!route) return;
        const coords: [number, number][] = route.geometry.coordinates;
        drawRoute(coords);
        setRouteInfo({ distanceMeters: route.distance, durationSec: route.duration });
        // notify parent about route updates
        onRouteUpdate?.({ distanceMeters: route.distance, durationSec: route.duration, fare: computeFare(route.distance) });
        // fit bounds
        const lats = coords.map((c) => c[1]);
        const lngs = coords.map((c) => c[0]);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        mapRef.current?.fitBounds([[minLng, minLat], [maxLng, maxLat]], { padding: 80 });
      } catch (e) {
        console.error(e);
      }
    })();
  }, [pickup, drop, token]);

  async function reverseGeocode(pt: { lat: number; lng: number }): Promise<string> {
    if (!token) return "";
    try {
      const r = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${pt.lng},${pt.lat}.json?access_token=${token}&limit=1`
      );
      const j = await r.json();
      return j.features?.[0]?.place_name || "";
    } catch {
      return "";
    }
  }

  function drawRoute(coords: [number, number][]) {
    const map = mapRef.current;
    if (!map) return;
    const geojson: GeoJSONSourceSpecification = {
      type: "geojson",
      data: {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: coords,
            },
          },
        ],
      },
    };
    if (map.getSource("route")) {
      const source = map.getSource("route");
      if (source && "setData" in source) {
        (source as any).setData(geojson.data);
      }
    } else {
      map.addSource("route", geojson);
      map.addLayer({
        id: "route-line",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#f59e0b", "line-width": 6 },
      });
    }
  }

  // geocoding suggestions
  const doSearch = useCallback(async (q: string) => {
    if (!token || !q.trim()) return [] as Suggestion[];
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${token}&autocomplete=true&limit=5&types=place,address,poi`;
    const r = await fetch(url);
    if (!r.ok) return [];
    const j = await r.json();
    return (j.features || []).map((f: any) => ({ id: f.id, place_name: f.place_name, center: f.center }));
  }, [token]);

  // pickup search
  useEffect(() => {
    let cancelled = false;
    if (!debouncedPickup) { setPickupSug([]); return; }
    (async () => {
      setLoadingPickup(true);
      const list = await doSearch(debouncedPickup);
      if (cancelled) return;
      setPickupSug(list);
      setLoadingPickup(false);
      setPickupOpen(true);
    })();
    return () => { cancelled = true; };
  }, [debouncedPickup, doSearch]);

  // drop search
  useEffect(() => {
    let cancelled = false;
    if (!debouncedDrop) { setDropSug([]); return; }
    (async () => {
      setLoadingDrop(true);
      const list = await doSearch(debouncedDrop);
      if (cancelled) return;
      setDropSug(list);
      setLoadingDrop(false);
      setDropOpen(true);
    })();
    return () => { cancelled = true; };
  }, [debouncedDrop, doSearch]);

  function choosePickup(s: Suggestion) {
    setPickupText(s.place_name);
    setPickup({ lat: s.center[1], lng: s.center[0] });
    setPickupOpen(false);
    saveRecent(s);
  }

  function chooseDrop(s: Suggestion) {
    setDropText(s.place_name);
    setDrop({ lat: s.center[1], lng: s.center[0] });
    setDropOpen(false);
    saveRecent(s);
  }

  function saveRecent(s: Suggestion) {
    try {
      const cur = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]") as Suggestion[];
      const filtered = [s, ...cur.filter((c) => c.id !== s.id)].slice(0, 6);
      localStorage.setItem(RECENT_KEY, JSON.stringify(filtered));
    } catch {}
  }

  function useCurrentForPickup() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setPickup(coords);
      setPickupText(await reverseGeocode(coords));
    });
  }

  function formatDistance(m: number) { return `${(m/1000).toFixed(1)} km`; }
  function formatDuration(s: number) { const m = Math.round(s/60); return `${m} mins`; }

  function computeFare(distanceMeters: number) {
    const base = 30; const perKm = 8; const km = distanceMeters/1000; return Math.max(25, Math.round(base + perKm*km));
  }

  return (
    <div className="w-full">
      <div className="relative h-80 md:h-96 rounded overflow-hidden border">
        {!token ? (
          <div className="flex items-center justify-center h-full text-sm text-red-600">Mapbox API key missing.</div>
        ) : null}
        <div ref={mapContainer} className="absolute inset-0" />

        <div className="absolute top-4 left-4 right-4 mx-auto max-w-3xl bg-white/80 backdrop-blur rounded p-3 shadow flex gap-3">
          <div className="w-1/2">
            <label className="text-xs text-muted-foreground">Pickup</label>
            <div className="relative">
              <input value={pickupText} onChange={(e) => { setPickupQuery(e.target.value); setPickupText(e.target.value); }} onFocus={() => setPickupOpen(true)} className="w-full px-3 py-2 rounded border" placeholder="Enter pickup location" />
              {pickupOpen && (loadingPickup || pickupSug.length || recent.length) ? (
                <div className="absolute z-50 bg-white w-full mt-1 rounded border shadow max-h-60 overflow-auto">
                  <button className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onMouseDown={(e)=>e.preventDefault()} onClick={() => useCurrentForPickup()}>Use current location</button>
                  {loadingPickup ? <div className="px-3 py-2 text-sm">Searching…</div> : null}
                  {!loadingPickup && pickupSug.map((s) => (
                    <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onMouseDown={(e)=>e.preventDefault()} onClick={() => choosePickup(s)}>{s.place_name}</button>
                  ))}
                  {!loadingPickup && !pickupSug.length && recent.length ? (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Recent</div>
                  ) : null}
                  {!loadingPickup && !pickupSug.length && recent.map((r:any)=> (
                    <button key={r.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onMouseDown={(e)=>e.preventDefault()} onClick={() => choosePickup(r)}>{r.place_name}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="w-1/2">
            <label className="text-xs text-muted-foreground">Drop</label>
            <div className="relative">
              <input value={dropText} onChange={(e) => { setDropQuery(e.target.value); setDropText(e.target.value); }} onFocus={() => setDropOpen(true)} className="w-full px-3 py-2 rounded border" placeholder="Enter drop location" />
              {dropOpen && (loadingDrop || dropSug.length) ? (
                <div className="absolute z-50 bg-white w-full mt-1 rounded border shadow max-h-60 overflow-auto">
                  {loadingDrop ? <div className="px-3 py-2 text-sm">Searching…</div> : null}
                  {!loadingDrop && dropSug.map((s) => (
                    <button key={s.id} className="w-full text-left px-3 py-2 text-sm hover:bg-muted" onMouseDown={(e)=>e.preventDefault()} onClick={() => chooseDrop(s)}>{s.place_name}</button>
                  ))}
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex items-end">
            <button className="ml-2 px-3 py-2 rounded bg-white border">Add stop</button>
          </div>
        </div>
      </div>

      <div className="mt-4 max-w-3xl mx-auto flex items-center justify-between p-3 bg-white rounded shadow">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center text-xs text-muted-foreground">
            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center"> 🚚 </div>
            <div className="font-bold">Auto</div>
            <div className="text-sm">{routeInfo ? formatDuration(routeInfo.durationSec) : "—"}</div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm text-muted-foreground">Fare</div>
          <div className="text-xl font-bold">₹{routeInfo ? computeFare(routeInfo.distanceMeters) : "—"}</div>
        </div>
      </div>
    </div>
  );
}
