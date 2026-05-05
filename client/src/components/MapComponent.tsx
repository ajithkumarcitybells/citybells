import React, { useEffect, useMemo, useRef, useState } from "react";
// mapbox-gl is loaded dynamically only when a token is present. Avoid static import
// so the dev server won't fail when mapbox-gl isn't installed.
import type mapboxgl from "mapbox-gl";
import type { GeoJSONSourceSpecification } from "mapbox-gl";

export type LatLng = { lat: number; lng: number } | null;

interface MapComponentProps {
  pickup: LatLng;
  drop: LatLng;
  setPickup: (p: LatLng) => void;
  setDrop: (d: LatLng) => void;
  setPickupAddress?: (s: string) => void;
  setDropAddress?: (s: string) => void;
  onRoute?: (distanceMeters: number, durationSec: number) => void;
  height?: string;
  tileTheme?: "light" | "dark";
  enableDriverSim?: boolean;
}

type RouteInfo = {
  distanceMeters: number;
  durationSec: number;
  path: { lat: number; lng: number }[];
} | null;

async function reverseGeocode(lat: number, lng: number, token: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${token}`
    );
    const data = await response.json();
    if (data.features?.[0]) {
      return data.features[0].place_name || "";
    }
    return "";
  } catch {
    return "";
  }
}

async function getRoute(
  pickup: LatLng,
  drop: LatLng,
  token: string
): Promise<RouteInfo> {
  if (!pickup || !drop) return null;
  try {
    const response = await fetch(
      `https://api.mapbox.com/directions/v5/mapbox/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?access_token=${token}&geometries=geojson&overview=full`
    );
    const data = await response.json();
    if (!data.routes?.[0]) return null;
    
    const route = data.routes[0];
    const coords = route.geometry.coordinates;
    const path = coords.map(([lng, lat]: [number, number]) => ({ lat, lng }));
    
    return {
      distanceMeters: route.distance,
      durationSec: route.duration,
      path,
    };
  } catch {
    return null;
  }
}

export default function MapComponent({
  pickup,
  drop,
  setPickup,
  setDrop,
  setPickupAddress,
  setDropAddress,
  onRoute,
  height = "60vh",
  tileTheme = "light",
  enableDriverSim = false,
}: MapComponentProps) {
  const apiKey = import.meta.env.VITE_MAPS_API_KEY as string | undefined;
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapboxModule = useRef<typeof mapboxgl | null>(null);
  const map = useRef<any | null>(null);
  const pickupMarker = useRef<any | null>(null);
  const dropMarker = useRef<any | null>(null);
  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const driverIdxRef = useRef(0);

  const center = useMemo(() => {
    if (pickup) return { lng: pickup.lng, lat: pickup.lat };
    return { lng: 78.9629, lat: 20.5937 };
  }, [pickup?.lat, pickup?.lng]);

  // Initialize map
  useEffect(() => {
    let mounted = true;
    if (!apiKey || !mapContainer.current) return;

    (async () => {
      try {
        const mapbox = await import("mapbox-gl");
        await import("mapbox-gl/dist/mapbox-gl.css");
        if (!mounted) return;
        mapboxModule.current = mapbox.default;
        mapboxModule.current.accessToken = apiKey;
        const newMap = new mapboxModule.current.Map({
          container: mapContainer.current as HTMLElement,
          style: tileTheme === "dark" ? "mapbox://styles/mapbox/dark-v11" : "mapbox://styles/mapbox/light-v11",
          center: [center.lng, center.lat],
          zoom: pickup ? 14 : 5,
        });

        map.current = newMap;

        newMap.on("click", (e: any) => {
          const { lng, lat } = e.lngLat;
          if (!pickup) void setPickupFrom(lat, lng);
          else if (!drop) void setDropFrom(lat, lng);
          else void setPickupFrom(lat, lng);
        });
      } catch (err) {
        // Mapbox not available or failed to load — leave mapContainer empty and show fallback UI
        console.warn("Mapbox failed to load:", err);
        setRouteError("Mapbox not configured or unavailable");
      }
    })();

    return () => {
      mounted = false;
      if (map.current && typeof map.current.remove === "function") map.current.remove();
    };
  }, [apiKey]);

  // Update map center and zoom
  useEffect(() => {
    if (!map.current) return;
    map.current.flyTo({
      center: [center.lng, center.lat],
      zoom: pickup ? 14 : 5,
      duration: 1500,
    });
  }, [center, pickup]);

  // Route calculation
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setRouteError(null);
      if (!pickup || !drop || !apiKey) {
        setRouteInfo(null);
        onRoute?.(0, 0);
        
        // Clear route from map
        if (map.current?.getSource("route")) {
          map.current.removeLayer("route");
          map.current.removeSource("route");
        }
        setDriverPos(null);
        return;
      }

      const route = await getRoute(pickup, drop, apiKey);
      if (cancelled) return;
      
      if (!route) {
        setRouteInfo(null);
        onRoute?.(0, 0);
        setRouteError("Could not calculate route");
        setDriverPos(null);
        return;
      }

      setRouteInfo(route);
      onRoute?.(route.distanceMeters, route.durationSec);

      // Add route to map
      if (map.current) {
        const geoJson: GeoJSONSourceSpecification = {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "LineString",
                  coordinates: route.path.map((p) => [p.lng, p.lat]),
                },
              },
            ],
          },
        };

        if (map.current.getSource("route")) {
          const source = map.current.getSource("route");
          if (source && "setData" in source) {
            (source as any).setData(geoJson.data);
          }
        } else {
          map.current.addSource("route", geoJson);
          map.current.addLayer({
            id: "route",
            type: "line",
            source: "route",
            layout: { "line-join": "round", "line-cap": "round" },
            paint: { "line-color": "#f59e0b", "line-width": 5, "line-opacity": 1 },
          });
        }
      }

      if (enableDriverSim && route.path.length) {
        driverIdxRef.current = 0;
        setDriverPos(route.path[0]);
      } else {
        setDriverPos(null);
      }
    })().catch((e: any) => {
      if (cancelled) return;
      setRouteInfo(null);
      onRoute?.(0, 0);
      setRouteError(e?.message || "Routing failed");
    });

    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, enableDriverSim, apiKey]);

  // Driver simulation along route
  useEffect(() => {
    if (!enableDriverSim || !routeInfo?.path?.length) return;
    const id = window.setInterval(() => {
      const pts = routeInfo.path;
      const nextIdx = Math.min(driverIdxRef.current + 1, pts.length - 1);
      driverIdxRef.current = nextIdx;
      setDriverPos(pts[nextIdx]);
      if (nextIdx >= pts.length - 1) driverIdxRef.current = 0;
    }, 700);
    return () => window.clearInterval(id);
  }, [enableDriverSim, routeInfo?.path]);

  // Update pickup marker
  useEffect(() => {
    if (!map.current) return;
    if (!mapboxModule.current) return;
    
    if (pickup) {
      if (!pickupMarker.current) {
        const el = document.createElement("div");
        el.innerHTML = '<div class="w-6 h-6 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">P</div>';
        pickupMarker.current = new mapboxModule.current.Marker({ element: el, draggable: true })
          .setLngLat([pickup.lng, pickup.lat])
          .addTo(map.current);
        
        pickupMarker.current.on("dragend", () => {
          const pos = pickupMarker.current?.getLngLat();
          if (pos) void setPickupFrom(pos.lat, pos.lng);
        });
      } else {
        pickupMarker.current.setLngLat([pickup.lng, pickup.lat]);
      }
    } else if (pickupMarker.current) {
      pickupMarker.current.remove();
      pickupMarker.current = null;
    }
  }, [pickup]);

  // Update drop marker
  useEffect(() => {
    if (!map.current) return;
    if (!mapboxModule.current) return;
    
    if (drop) {
      if (!dropMarker.current) {
        const el = document.createElement("div");
        el.innerHTML = '<div class="w-6 h-6 bg-red-500 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold">D</div>';
        dropMarker.current = new mapboxModule.current.Marker({ element: el, draggable: true })
          .setLngLat([drop.lng, drop.lat])
          .addTo(map.current);
        
        dropMarker.current.on("dragend", () => {
          const pos = dropMarker.current?.getLngLat();
          if (pos) void setDropFrom(pos.lat, pos.lng);
        });
      } else {
        dropMarker.current.setLngLat([drop.lng, drop.lat]);
      }
    } else if (dropMarker.current) {
      dropMarker.current.remove();
      dropMarker.current = null;
    }
  }, [drop]);

  // Driver position marker
  useEffect(() => {
    if (!map.current) return;

    if (enableDriverSim && driverPos) {
      if (!map.current.getSource("driver")) {
        map.current.addSource("driver", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: { type: "Point", coordinates: [driverPos.lng, driverPos.lat] },
          },
        });
        map.current.addLayer({
          id: "driver-marker",
          type: "symbol",
          source: "driver",
          layout: { "icon-image": "marker-15", "text-field": "🚕", "text-size": 20 },
        });
      } else {
        (map.current.getSource("driver") as any).setData({
          type: "Feature",
          properties: {},
          geometry: { type: "Point", coordinates: [driverPos.lng, driverPos.lat] },
        });
      }
    } else if (map.current.getSource("driver")) {
      map.current.removeLayer("driver-marker");
      map.current.removeSource("driver");
    }
  }, [driverPos, enableDriverSim]);

  async function setPickupFrom(lat: number, lng: number) {
    setPickup({ lat, lng });
    if (!setPickupAddress || !apiKey) return;
    try {
      setPickupAddress(await reverseGeocode(lat, lng, apiKey));
    } catch {
      setPickupAddress("");
    }
  }

  async function setDropFrom(lat: number, lng: number) {
    setDrop({ lat, lng });
    if (!setDropAddress || !apiKey) return;
    try {
      setDropAddress(await reverseGeocode(lat, lng, apiKey));
    } catch {
      setDropAddress("");
    }
  }

  if (!apiKey) {
    return (
      <div style={{ height }} className="w-full rounded-md border p-3 text-sm text-muted-foreground">
        Mapbox API key missing. Set `VITE_MAPS_API_KEY` and restart.
      </div>
    );
  }

  return (
    <div style={{ height }} className="relative w-full rounded-md overflow-hidden border">
      <div ref={mapContainer} style={{ height: "100%", width: "100%" }} />

      {routeError ? (
        <div className="absolute left-0 right-0 bottom-0 p-2 text-xs bg-red-50 text-red-700 border-t">
          {routeError}
        </div>
      ) : null}
    </div>
  );
}
