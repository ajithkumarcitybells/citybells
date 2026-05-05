import { useEffect, useMemo, useRef } from "react";
import L, { type LatLngBoundsExpression } from "leaflet";
import { Circle, MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Coordinates, LiveTaxiVehicle, RideLocation } from "@/lib/taxi-map";

type MapTheme = "light" | "dark";

type MapComponentProps = {
  center: Coordinates;
  pickup?: RideLocation | null;
  drop?: RideLocation | null;
  trackedDriver?: LiveTaxiVehicle | null;
  trackedDriverRoute?: [number, number][];
  userLocation?: Coordinates | null;
  routeGeometry: [number, number][];
  vehicles?: LiveTaxiVehicle[];
  highlightedVehicleId?: string | null;
  activeField: "pickup" | "drop";
  mapTheme: MapTheme;
  interactive?: boolean;
  allowMarkerDrag?: boolean;
  showSelectionHint?: boolean;
  showTrackingCard?: boolean;
  trackingHeadingText?: string;
  mapClassName?: string;
  pickerMode?: boolean;
  pickerLabel?: "pickup" | "drop";
  onViewportChange?: (coordinates: Coordinates) => void;
  onMapSelect: (coordinates: Coordinates) => void;
  onPickupDrag: (coordinates: Coordinates) => void;
  onDropDrag: (coordinates: Coordinates) => void;
};

const tileLayers: Record<MapTheme, { url: string; attribution: string }> = {
  light: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  dark: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
};

function createMarkerIcon(background: string, label: string) {
  return L.divIcon({
    className: "",
    html: `<div style="display:flex;align-items:center;justify-content:center;width:42px;height:42px;border-radius:9999px;background:${background};color:#fff;font-weight:700;font-size:13px;border:4px solid #fff;box-shadow:0 10px 30px rgba(15,23,42,0.22);">${label}</div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
    popupAnchor: [0, -18],
  });
}

const trackedDriverIconCache = new Map<LiveTaxiVehicle["type"], L.DivIcon>();

function createTrackedDriverIcon(type: LiveTaxiVehicle["type"]) {
  const cached = trackedDriverIconCache.get(type);
  if (cached) {
    return cached;
  }

  const icon = L.divIcon({
    className: "",
    html: `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 12px 6px 6px;border-radius:9999px;background:rgba(15,23,42,0.92);border:3px solid #fff;box-shadow:0 16px 40px rgba(15,23,42,0.28);">
        <span style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:9999px;background:#f59e0b;box-shadow:inset 0 1px 0 rgba(255,255,255,0.22);">
          <img alt="${type}" src="/assets/icons/${type}.svg" style="width:22px;height:22px;display:block;" />
        </span>
        <span style="color:#fff;font-size:11px;font-weight:700;letter-spacing:0.12em;">LIVE</span>
      </div>
    `,
    iconSize: [92, 46],
    iconAnchor: [24, 23],
    popupAnchor: [12, -18],
  });

  trackedDriverIconCache.set(type, icon);
  return icon;
}

const pickupIcon = createMarkerIcon("#f97316", "P");
const dropIcon = createMarkerIcon("#10b981", "D");
const pickupPulseIcon = L.divIcon({
  className: "pickup-pulse-icon",
  html: '<span class="pickup-pulse-ring"></span>',
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

const vehicleIconCache = new Map<string, L.DivIcon>();

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getVehicleIcon(type: LiveTaxiVehicle["type"], heading: number, highlighted: boolean) {
  const bucket = (Math.round(heading / 10) * 10) % 360;
  const key = `${type}-${bucket}-${highlighted ? "primary" : "base"}`;
  const cached = vehicleIconCache.get(key);
  if (cached) {
    return cached;
  }

  const size = highlighted ? 48 : 40;
  const icon = L.divIcon({
    className: "fleet-vehicle-icon",
    html: `
      <div class="fleet-marker${highlighted ? " fleet-marker--highlighted" : ""}">
        <span class="fleet-marker__glow"></span>
        <span class="fleet-marker__shadow"></span>
        <span class="fleet-marker__body" style="transform: rotate(${bucket}deg)">
          <img alt="${type}" class="fleet-marker__image" src="/assets/icons/${type}.svg" />
        </span>
      </div>
    `,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -20],
    tooltipAnchor: [0, -18],
  });

  vehicleIconCache.set(key, icon);
  return icon;
}

function buildVehiclePopup(vehicle: LiveTaxiVehicle) {
  const vehicleType = vehicle.vehicleType || vehicle.type || "Taxi";
  const driverName = vehicle.driverName || "Nearby driver";
  const vehicleNumber = vehicle.vehicleNumber || "Vehicle number pending";
  const rating = Number.isFinite(Number(vehicle.rating)) ? Number(vehicle.rating).toFixed(1) : "--";
  const distanceKm = Number.isFinite(Number(vehicle.distanceKm)) ? Number(vehicle.distanceKm).toFixed(1) : "--";
  const etaMin = Number.isFinite(Number(vehicle.etaMin)) ? Number(vehicle.etaMin) : "--";

  return `
    <div class="fleet-popup-card">
      <div class="fleet-popup-card__topline">${escapeHtml(vehicleType)}</div>
      <div class="fleet-popup-card__title">${escapeHtml(driverName)}</div>
      <div class="fleet-popup-card__meta">
        <span>${etaMin} min away</span>
        <span>${distanceKm} km</span>
      </div>
      <div class="fleet-popup-card__footer">
        <span>${escapeHtml(vehicleNumber)}</span>
        <span>${rating} star</span>
      </div>
    </div>
  `;
}

function animateMarker(marker: L.Marker, destination: L.LatLng, onFrame: (animationFrame: number) => void) {
  const origin = marker.getLatLng();
  const latDelta = destination.lat - origin.lat;
  const lngDelta = destination.lng - origin.lng;
  if (Math.abs(latDelta) < 0.000001 && Math.abs(lngDelta) < 0.000001) {
    marker.setLatLng(destination);
    return;
  }

  const start = performance.now();
  const duration = 2600;

  const step = (timestamp: number) => {
    const progress = Math.min((timestamp - start) / duration, 1);
    const eased = 1 - ((1 - progress) ** 3);

    marker.setLatLng([
      origin.lat + (latDelta * eased),
      origin.lng + (lngDelta * eased),
    ]);

    if (progress < 1) {
      onFrame(requestAnimationFrame(step));
    }
  };

  onFrame(requestAnimationFrame(step));
}

function MapViewportController({
  center,
  pickup,
  drop,
  routeGeometry,
  trackedDriverRoute,
  pickerMode,
}: Pick<MapComponentProps, "center" | "pickup" | "drop" | "routeGeometry" | "trackedDriverRoute" | "pickerMode">) {
  const map = useMap();

  useEffect(() => {
    if (pickerMode) {
      return;
    }

    const combinedGeometry = [...trackedDriverRoute, ...routeGeometry];

    if (combinedGeometry.length > 1) {
      map.fitBounds(combinedGeometry as LatLngBoundsExpression, {
        padding: [36, 36],
        animate: false,
      });
      return;
    }

    if (pickup && drop) {
      map.fitBounds([
        [pickup.lat, pickup.lng],
        [drop.lat, drop.lng],
      ], {
        padding: [36, 36],
        animate: false,
      });
      return;
    }

    map.setView([center.lat, center.lng], 14, {
      animate: false,
    });
  }, [center, drop, map, pickup, routeGeometry, trackedDriverRoute, pickerMode]);

  return null;
}

function MapPickerCenterController({ center, pickerMode }: Pick<MapComponentProps, "center" | "pickerMode">) {
  const map = useMap();
  const previousPickerMode = useRef(Boolean(pickerMode));

  useEffect(() => {
    if (!pickerMode) {
      previousPickerMode.current = false;
      return;
    }

    if (!previousPickerMode.current) {
      map.setView([center.lat, center.lng], map.getZoom(), { animate: false });
    }

    previousPickerMode.current = true;
  }, [center, map, pickerMode]);

  return null;
}

function MapClickHandler({ onMapSelect }: Pick<MapComponentProps, "onMapSelect">) {
  useMapEvents({
    click(event) {
      onMapSelect({
        lat: event.latlng.lat,
        lng: event.latlng.lng,
      });
    },
  });

  return null;
}

function MapViewportChangeHandler({ onViewportChange }: Pick<MapComponentProps, "onViewportChange">) {
  const map = useMapEvents({
    moveend() {
      const center = map.getCenter();
      onViewportChange?.({
        lat: center.lat,
        lng: center.lng,
      });
    },
  });

  return null;
}

type DraggableMarkerProps = {
  position: Coordinates;
  icon: L.DivIcon;
  onDragEnd: (coordinates: Coordinates) => void;
};

function DraggableMarker({ position, icon, onDragEnd }: DraggableMarkerProps) {
  const eventHandlers = useMemo(() => ({
    dragend(event: L.LeafletEvent) {
      const marker = event.target as L.Marker;
      const nextPosition = marker.getLatLng();
      onDragEnd({
        lat: nextPosition.lat,
        lng: nextPosition.lng,
      });
    },
  }), [onDragEnd]);

  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      icon={icon}
      position={[position.lat, position.lng]}
    />
  );
}

type LiveVehicleMarkersProps = {
  vehicles: LiveTaxiVehicle[];
  highlightedVehicleId?: string | null;
};

function LiveVehicleMarkers({ vehicles, highlightedVehicleId }: LiveVehicleMarkersProps) {
  const map = useMap();
  const markersRef = useRef(new Map<string, L.Marker>());
  const animationRef = useRef(new Map<string, number>());

  useEffect(() => {
    const visibleVehicleIds = new Set(vehicles.map((vehicle) => vehicle.id));

    markersRef.current.forEach((marker, id) => {
      if (visibleVehicleIds.has(id)) {
        return;
      }

      const pendingFrame = animationRef.current.get(id);
      if (pendingFrame) {
        cancelAnimationFrame(pendingFrame);
        animationRef.current.delete(id);
      }
      marker.removeFrom(map);
      markersRef.current.delete(id);
    });

    vehicles.forEach((vehicle) => {
      const icon = getVehicleIcon(vehicle.type, vehicle.heading, vehicle.id === highlightedVehicleId);
      const nextPosition = L.latLng(vehicle.lat, vehicle.lng);
      const tooltipVehicleType = vehicle.vehicleType || vehicle.type || "Taxi";
      const tooltipEta = Number.isFinite(Number(vehicle.etaMin)) ? Number(vehicle.etaMin) : "--";
      const tooltipContent = `${tooltipVehicleType} - ${tooltipEta} min`;
      const popupContent = buildVehiclePopup(vehicle);
      const zIndexOffset = vehicle.id === highlightedVehicleId ? 900 : 500;
      const existingMarker = markersRef.current.get(vehicle.id);

      if (!existingMarker) {
        const marker = L.marker(nextPosition, {
          icon,
          keyboard: false,
          riseOnHover: true,
          zIndexOffset,
        });

        marker.bindPopup(popupContent, {
          className: "fleet-popup",
          closeButton: false,
          offset: [0, -18],
        });
        marker.bindTooltip(tooltipContent, {
          className: "fleet-tooltip",
          direction: "top",
          offset: [0, -22],
          opacity: 0.96,
        });
        marker.addTo(map);
        markersRef.current.set(vehicle.id, marker);
        return;
      }

      const pendingFrame = animationRef.current.get(vehicle.id);
      if (pendingFrame) {
        cancelAnimationFrame(pendingFrame);
        animationRef.current.delete(vehicle.id);
      }

      existingMarker.setIcon(icon);
      existingMarker.setZIndexOffset(zIndexOffset);
      existingMarker.getPopup()?.setContent(popupContent);
      existingMarker.getTooltip()?.setContent(tooltipContent);
      animateMarker(existingMarker, nextPosition, (frameId) => {
        animationRef.current.set(vehicle.id, frameId);
      });
    });
  }, [highlightedVehicleId, map, vehicles]);

  useEffect(() => () => {
    animationRef.current.forEach((frameId) => {
      cancelAnimationFrame(frameId);
    });
    markersRef.current.forEach((marker) => {
      marker.removeFrom(map);
    });
    animationRef.current.clear();
    markersRef.current.clear();
  }, [map]);

  return null;
}

export function MapComponent({
  activeField,
  allowMarkerDrag = true,
  center,
  drop,
  highlightedVehicleId,
  interactive = true,
  mapClassName = "h-[440px] w-full md:h-[620px]",
  mapTheme,
  onDropDrag,
  onMapSelect,
  onPickupDrag,
  onViewportChange,
  pickerLabel,
  pickerMode = false,
  pickup,
  routeGeometry,
  showSelectionHint = true,
  showTrackingCard = true,
  trackingHeadingText,
  trackedDriver,
  trackedDriverRoute = [],
  userLocation,
  vehicles = [],
}: MapComponentProps) {
  const passiveVehicles = trackedDriver
    ? vehicles.filter((vehicle) => vehicle.id !== trackedDriver.id)
    : vehicles;

  return (
    <div className="relative overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
      {showSelectionHint ? (
        <div className="absolute left-4 top-4 z-[500] rounded-md bg-slate-950/85 px-3 py-2 text-xs font-semibold text-white shadow-lg dark:bg-white/90 dark:text-slate-900">
          {pickerMode ? `Move map to adjust ${pickerLabel ?? activeField}` : `Map click selects ${activeField === "pickup" ? "pickup" : "drop"}`}
        </div>
      ) : null}
      {pickerMode ? (
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500] -translate-x-1/2 -translate-y-full">
          <div className="relative flex flex-col items-center">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border-4 border-white bg-lime-500 text-sm font-bold text-slate-950 shadow-xl">
              {pickerLabel === "drop" ? "D" : "P"}
            </span>
            <span className="h-6 w-0.5 bg-slate-950 shadow" />
            <span className="h-2 w-6 rounded-full bg-slate-950/20" />
          </div>
        </div>
      ) : null}
      {trackedDriver && showTrackingCard ? (
        <div className="absolute bottom-4 left-4 z-[500] max-w-[320px] rounded-lg border border-amber-200/70 bg-white/94 px-4 py-3 shadow-lg backdrop-blur dark:border-amber-400/20 dark:bg-slate-950/90">
          <p className="text-[10px] font-semibold uppercase text-amber-600 dark:text-amber-300">Driver tracking</p>
          <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-slate-50">{trackingHeadingText ?? `${trackedDriver.driverName} is approaching your pickup`}</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{trackedDriver.vehicleType} • {trackedDriver.etaMin} min away • {trackedDriver.vehicleNumber}</p>
        </div>
      ) : null}
      <MapContainer
        center={[center.lat, center.lng]}
        className={mapClassName}
        scrollWheelZoom={interactive}
        zoom={14}
        zoomControl={false}
      >
        <TileLayer attribution={tileLayers[mapTheme].attribution} url={tileLayers[mapTheme].url} />
        <ZoomControl position="bottomright" />
        <MapViewportController center={center} drop={drop} pickup={pickup} pickerMode={pickerMode} routeGeometry={routeGeometry} trackedDriverRoute={trackedDriverRoute} />
        <MapPickerCenterController center={center} pickerMode={pickerMode} />
        {pickerMode ? <MapViewportChangeHandler onViewportChange={onViewportChange} /> : null}
        {interactive ? <MapClickHandler onMapSelect={onMapSelect} /> : null}

        {userLocation ? (
          <Circle
            center={[userLocation.lat, userLocation.lng]}
            pathOptions={{ color: "#2563eb", fillColor: "#60a5fa", fillOpacity: 0.2 }}
            radius={120}
          />
        ) : null}

        {pickup ? <Marker icon={pickupPulseIcon} interactive={false} position={[pickup.lat, pickup.lng]} /> : null}
        {pickup ? (allowMarkerDrag ? <DraggableMarker icon={pickupIcon} onDragEnd={onPickupDrag} position={pickup} /> : <Marker icon={pickupIcon} position={[pickup.lat, pickup.lng]} />) : null}
        {drop ? (allowMarkerDrag ? <DraggableMarker icon={dropIcon} onDragEnd={onDropDrag} position={drop} /> : <Marker icon={dropIcon} position={[drop.lat, drop.lng]} />) : null}
        {trackedDriverRoute.length > 1 ? (
          <>
            <Polyline
              pathOptions={{ color: "rgba(120,53,15,0.34)", lineCap: "round", opacity: 0.9, weight: 10 }}
              positions={trackedDriverRoute}
            />
            <Polyline
              pathOptions={{ color: "#f59e0b", dashArray: "12 12", lineCap: "round", opacity: 0.98, weight: 5 }}
              positions={trackedDriverRoute}
            />
          </>
        ) : null}
        {routeGeometry.length > 1 ? (
          <>
            <Polyline
              pathOptions={{ color: mapTheme === "dark" ? "rgba(255,237,213,0.28)" : "rgba(124,45,18,0.22)", lineCap: "round", opacity: 0.95, weight: 11 }}
              positions={routeGeometry}
            />
            <Polyline
              pathOptions={{ color: mapTheme === "dark" ? "#fed7aa" : "#ea580c", lineCap: "round", opacity: 0.98, weight: 6 }}
              positions={routeGeometry}
            />
          </>
        ) : null}
        {trackedDriver ? (
          <Marker
            icon={createTrackedDriverIcon(trackedDriver.type)}
            position={[trackedDriver.lat, trackedDriver.lng]}
          />
        ) : null}
        <LiveVehicleMarkers highlightedVehicleId={highlightedVehicleId} vehicles={passiveVehicles} />
      </MapContainer>
    </div>
  );
}
