import React, { useEffect, useMemo, useState } from "react";
import { GoogleMap, MarkerF, PolylineF, useLoadScript } from "@react-google-maps/api";
import type { LatLng } from "@/lib/geo";

type Props = {
  pickup?: LatLng | null;
  drop?: LatLng | null;
  driver?: LatLng | null;
  height?: number | string;
  tileTheme?: "light" | "dark";
};

const darkMapStyle: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#1f2937" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#111827" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#374151" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#111827" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#9ca3af" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6b7280" }] },
];

export default function RideTrackingMap({ pickup, drop, driver, height = 220, tileTheme = "light" }: Props) {
  const apiKey = (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: apiKey || "",
  });

  const center = useMemo(() => {
    if (driver) return [driver.lat, driver.lng];
    if (pickup) return [pickup.lat, pickup.lng];
    if (drop) return [drop.lat, drop.lng];
    return [20.5937, 78.9629];
  }, [driver?.lat, driver?.lng, pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

  const [rideLine, setRideLine] = useState<google.maps.LatLngLiteral[] | null>(null);
  const [driverToPickupLine, setDriverToPickupLine] = useState<google.maps.LatLngLiteral[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!pickup || !drop) return setRideLine(null);
        if (!window.google?.maps) return;
        const ds = new window.google.maps.DirectionsService();
        ds.route(
          {
            origin: { lat: pickup.lat, lng: pickup.lng },
            destination: { lat: drop.lat, lng: drop.lng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (cancelled) return;
            if (status !== window.google.maps.DirectionsStatus.OK || !result?.routes?.[0]?.overview_path?.length) {
              setRideLine(null);
              return;
            }
            const path = result.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
            setRideLine(path);
          },
        );
      } catch {
        if (!cancelled) setRideLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pickup?.lat, pickup?.lng, drop?.lat, drop?.lng]);

  // optional: show driver -> pickup route when driver is present
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!driver || !pickup) return setDriverToPickupLine(null);
        if (!window.google?.maps) return;
        const ds = new window.google.maps.DirectionsService();
        ds.route(
          {
            origin: { lat: driver.lat, lng: driver.lng },
            destination: { lat: pickup.lat, lng: pickup.lng },
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (cancelled) return;
            if (status !== window.google.maps.DirectionsStatus.OK || !result?.routes?.[0]?.overview_path?.length) {
              setDriverToPickupLine(null);
              return;
            }
            const path = result.routes[0].overview_path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
            setDriverToPickupLine(path);
          },
        );
      } catch {
        if (!cancelled) setDriverToPickupLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [driver?.lat, driver?.lng, pickup?.lat, pickup?.lng]);

  if (!apiKey) {
    return (
      <div className="w-full rounded-lg border p-3 text-sm text-muted-foreground" style={{ height }}>
        Google Maps API key missing. Set `VITE_GOOGLE_MAPS_API_KEY` and restart the dev server.
      </div>
    );
  }
  if (loadError) {
    return (
      <div className="w-full rounded-lg border p-3 text-sm text-red-600" style={{ height }}>
        Failed to load Google Maps: {String(loadError)}
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="w-full rounded-lg border p-3 text-sm text-muted-foreground" style={{ height }}>
        Loading map…
      </div>
    );
  }

  return (
    <div className="relative w-full overflow-hidden rounded-lg border" style={{ height }}>
      <GoogleMap
        zoom={13}
        center={{ lat: center[0], lng: center[1] }}
        mapContainerStyle={{ height: "100%", width: "100%" }}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          styles: tileTheme === "dark" ? darkMapStyle : undefined,
          gestureHandling: "greedy",
          keyboardShortcuts: true,
        }}
      >
        {rideLine?.length ? (
          <PolylineF path={rideLine} options={{ strokeColor: "#f59e0b", strokeOpacity: 1, strokeWeight: 5 }} />
        ) : null}
        {driverToPickupLine?.length ? (
          <PolylineF
            path={driverToPickupLine}
            options={{
              strokeColor: "#22c55e",
              strokeOpacity: 1,
              strokeWeight: 4,
              // dashed line
              icons: [
                {
                  icon: { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 4 },
                  offset: "0",
                  repeat: "14px",
                },
              ],
            }}
          />
        ) : null}

        {pickup ? <MarkerF position={{ lat: pickup.lat, lng: pickup.lng }} label={{ text: "P", color: "white" }} /> : null}
        {drop ? <MarkerF position={{ lat: drop.lat, lng: drop.lng }} label={{ text: "D", color: "white" }} /> : null}
        {driver ? <MarkerF position={{ lat: driver.lat, lng: driver.lng }} label={{ text: "🚗" }} /> : null}
      </GoogleMap>
    </div>
  );
}

