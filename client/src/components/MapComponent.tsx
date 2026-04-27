import React, { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents } from "react-leaflet";
import L, { type LatLngExpression } from "leaflet";

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
  polyline: { lat: number; lng: number }[];
} | null;

// Fix missing default marker icons in bundlers (Vite/Webpack).
const DefaultIcon = L.icon({
  iconUrl: new URL("leaflet/dist/images/marker-icon.png", import.meta.url).toString(),
  iconRetinaUrl: new URL("leaflet/dist/images/marker-icon-2x.png", import.meta.url).toString(),
  shadowUrl: new URL("leaflet/dist/images/marker-shadow.png", import.meta.url).toString(),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

async function reverseGeocodeNominatim(lat: number, lng: number): Promise<string> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(
    String(lat),
  )}&lon=${encodeURIComponent(String(lng))}`;
  const r = await fetch(url, {
    headers: {
      // Nominatim usage policy asks for a valid UA/Referer; browser sets UA.
      Accept: "application/json",
    },
  });
  if (!r.ok) throw new Error(`Reverse geocode failed (${r.status})`);
  const j = await r.json();
  return j?.display_name || "";
}

async function getRouteOsrm(pickup: { lat: number; lng: number }, drop: { lat: number; lng: number }): Promise<RouteInfo> {
  // OSRM expects lon,lat.
  const url = `https://router.project-osrm.org/route/v1/driving/${pickup.lng},${pickup.lat};${drop.lng},${drop.lat}?overview=full&geometries=geojson`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`Route failed (${r.status})`);
  const j = await r.json();
  const route = j?.routes?.[0];
  const coords: [number, number][] | undefined = route?.geometry?.coordinates;
  if (!route || !coords?.length) return null;
  const polyline = coords.map(([lng, lat]) => ({ lat, lng }));
  return {
    distanceMeters: Number(route.distance || 0),
    durationSec: Number(route.duration || 0),
    polyline,
  };
}

function ClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click: (e) => onClick(e.latlng.lat, e.latlng.lng),
  });
  return null;
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
  const center: LatLngExpression = useMemo(() => {
    if (pickup) return [pickup.lat, pickup.lng];
    return [20.5937, 78.9629]; // fallback: India-ish center
  }, [pickup?.lat, pickup?.lng]);

  const [routeInfo, setRouteInfo] = useState<RouteInfo>(null);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [driverPos, setDriverPos] = useState<{ lat: number; lng: number } | null>(null);
  const driverIdxRef = useRef(0);

  // Recompute route whenever endpoints change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRouteError(null);
      if (!pickup || !drop) {
        setRouteInfo(null);
        onRoute?.(0, 0);
        return;
      }
      try {
        const info = await getRouteOsrm(pickup, drop);
        if (cancelled) return;
        setRouteInfo(info);
        onRoute?.(info?.distanceMeters || 0, info?.durationSec || 0);
        if (enableDriverSim && info?.polyline?.length) {
          driverIdxRef.current = 0;
          setDriverPos(info.polyline[0]);
        } else {
          setDriverPos(null);
        }
      } catch (e: any) {
        if (cancelled) return;
        setRouteInfo(null);
        onRoute?.(0, 0);
        setRouteError(e?.message || "Routing failed");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng, enableDriverSim]);

  // Driver moving marker simulation along the route polyline.
  useEffect(() => {
    if (!enableDriverSim || !routeInfo?.polyline?.length) return;
    const id = window.setInterval(() => {
      const pts = routeInfo.polyline;
      const nextIdx = Math.min(driverIdxRef.current + 1, pts.length - 1);
      driverIdxRef.current = nextIdx;
      setDriverPos(pts[nextIdx]);
      if (nextIdx >= pts.length - 1) {
        // loop back
        driverIdxRef.current = 0;
      }
    }, 700);
    return () => window.clearInterval(id);
  }, [enableDriverSim, routeInfo?.polyline]);

  const tile = tileTheme === "dark"
    ? {
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      }
    : {
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      };

  async function setPickupFrom(lat: number, lng: number) {
    setPickup({ lat, lng });
    if (!setPickupAddress) return;
    try {
      const a = await reverseGeocodeNominatim(lat, lng);
      setPickupAddress(a);
    } catch {
      setPickupAddress("");
    }
  }

  async function setDropFrom(lat: number, lng: number) {
    setDrop({ lat, lng });
    if (!setDropAddress) return;
    try {
      const a = await reverseGeocodeNominatim(lat, lng);
      setDropAddress(a);
    } catch {
      setDropAddress("");
    }
  }

  return (
    <div style={{ height }} className="relative w-full rounded-md overflow-hidden border">
      <MapContainer center={center} zoom={pickup ? 14 : 5} scrollWheelZoom className="h-full w-full">
        <TileLayer url={tile.url} attribution={tile.attribution} />
        <ClickHandler
          onClick={(lat, lng) => {
            if (!pickup) void setPickupFrom(lat, lng);
            else if (!drop) void setDropFrom(lat, lng);
            else void setPickupFrom(lat, lng); // third click = move pickup (common UX)
          }}
        />

        {pickup && (
          <Marker
            position={[pickup.lat, pickup.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as any).getLatLng();
                void setPickupFrom(p.lat, p.lng);
              },
            }}
          />
        )}
        {drop && (
          <Marker
            position={[drop.lat, drop.lng]}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const p = (e.target as any).getLatLng();
                void setDropFrom(p.lat, p.lng);
              },
            }}
          />
        )}

        {routeInfo?.polyline?.length ? (
          <Polyline positions={routeInfo.polyline.map((p) => [p.lat, p.lng] as [number, number])} pathOptions={{ color: "#f59e0b", weight: 5 }} />
        ) : null}

        {enableDriverSim && driverPos ? (
          <Marker
            position={[driverPos.lat, driverPos.lng]}
            icon={L.divIcon({
              className: "driver-marker",
              html: `<div style="width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid white;box-shadow:0 2px 10px rgba(0,0,0,.25)"></div>`,
              iconSize: [14, 14],
              iconAnchor: [7, 7],
            })}
          />
        ) : null}
      </MapContainer>

      {routeError ? (
        <div className="absolute left-0 right-0 bottom-0 p-2 text-xs bg-red-50 text-red-700 border-t">
          {routeError}
        </div>
      ) : null}
    </div>
  );
}
