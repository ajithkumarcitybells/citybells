import { Bike, Car, Clock3, Loader2, Navigation, Route, ShieldCheck, Truck, Users } from "lucide-react";
import type { TaxiVehicleType } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { calculateFare, formatCurrency, getDocumentId, type LiveTaxiVehicle, type RouteMetrics } from "@/lib/taxi-map";
import { EtaBadge } from "./EtaBadge";
import type { TaxiEtaPrediction } from "./EtaPredictionCard";

type RideSummaryProps = {
  vehicleTypes: TaxiVehicleType[];
  selectedVehicleId: string | null;
  onSelectVehicle: (vehicleId: string) => void;
  routeMetrics: RouteMetrics | null;
  trackedDriver: LiveTaxiVehicle | null;
  liveUpdatesEnabled: boolean;
  trackingRequired: boolean;
  trackingStatusLabel: string;
  onEnableTracking: () => void;
  onConfirmRide: () => void;
  confirmDisabled: boolean;
  confirmPending: boolean;
  etaPrediction?: TaxiEtaPrediction | null;
};

function getVehicleIcon(name: string) {
  const normalized = name.toLowerCase();
  if (normalized.includes("bike") || normalized.includes("moto")) return Bike;
  if (normalized.includes("auto") || normalized.includes("rick")) return Truck;
  return Car;
}

function readCurrencyNumber(value: string | number | null | undefined) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function RideSummary({
  confirmDisabled,
  confirmPending,
  onConfirmRide,
  onSelectVehicle,
  routeMetrics,
  selectedVehicleId,
  trackedDriver,
  liveUpdatesEnabled,
  trackingRequired,
  trackingStatusLabel,
  onEnableTracking,
  vehicleTypes,
  etaPrediction,
}: RideSummaryProps) {
  const selectedVehicle = vehicleTypes.find((vehicleType) => getDocumentId(vehicleType) === selectedVehicleId) ?? null;
  const selectedFare = selectedVehicle ? calculateFare(selectedVehicle, routeMetrics) : null;

  return (
    <section className="space-y-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Choose ride</p>
          <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">Recommended options</h2>
        </div>
        <span className="rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white dark:bg-amber-400 dark:text-slate-950">
          {formatCurrency(selectedFare)}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
          <Route className="h-4 w-4 text-slate-500" />
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{routeMetrics ? `${routeMetrics.distanceKm.toFixed(1)} km` : "--"}</p>
          <p className="text-[11px] text-slate-500">Distance</p>
        </div>
        <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
          <Clock3 className="h-4 w-4 text-slate-500" />
          <p className="mt-2 text-sm font-semibold text-slate-950 dark:text-slate-50">{routeMetrics ? `${routeMetrics.durationMin} min` : "--"}</p>
          <p className="text-[11px] text-slate-500">Trip time</p>
        </div>
        <div className="rounded-lg bg-slate-950 p-3 text-white dark:bg-amber-400 dark:text-slate-950">
          <ShieldCheck className="h-4 w-4" />
          <p className="mt-2 text-sm font-semibold">Verified</p>
          <p className="text-[11px] text-white/70 dark:text-slate-800/70">Drivers</p>
        </div>
      </div>

      <div className="space-y-2">
        {vehicleTypes.map((vehicleType) => {
          const vehicleId = getDocumentId(vehicleType);
          const VehicleIcon = getVehicleIcon(vehicleType.name);
          const isSelected = vehicleId === selectedVehicleId;
          const fare = calculateFare(vehicleType, routeMetrics);

          return (
            <button
              key={vehicleId}
              className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition ${
                isSelected
                  ? "border-slate-950 bg-slate-50 shadow-sm dark:border-amber-300 dark:bg-amber-500/10"
                  : "border-slate-200 bg-white hover:border-slate-400 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600"
              }`}
              onClick={() => onSelectVehicle(vehicleId)}
              type="button"
            >
              <span className={`rounded-lg p-3 ${isSelected ? "bg-slate-950 text-white dark:bg-amber-300 dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                <VehicleIcon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                  {vehicleType.name}
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                    <Users className="h-3 w-3" />
                    {vehicleType.capacity}
                  </span>
                </span>
                <span className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                  <span className="truncate">{vehicleType.description || "Fast pickup with live route tracking"}</span>
                  {isSelected && etaPrediction ? (
                    <>
                      <EtaBadge minutes={etaPrediction.pickupEtaMin} label="away" tone="pickup" />
                      <EtaBadge minutes={etaPrediction.tripEtaMin} label="trip" tone="trip" />
                    </>
                  ) : null}
                </span>
              </span>
              <span className="text-right">
                <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">{formatCurrency(fare)}</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">base {formatCurrency(readCurrencyNumber(vehicleType.baseFare))}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className={`rounded-lg border p-3 ${trackedDriver ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30" : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900"}`}>
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 rounded-lg p-2 ${trackedDriver ? "bg-emerald-600 text-white" : "bg-white text-slate-600 dark:bg-slate-950 dark:text-slate-300"}`}>
            <Navigation className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-950 dark:text-slate-50">
              {trackedDriver ? `${trackedDriver.driverName} is nearby` : trackingRequired ? "Track nearby drivers" : "Route and cab needed"}
            </p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{trackingStatusLabel}</p>
            {!liveUpdatesEnabled && trackingRequired ? (
              <Button className="mt-3 rounded-md" onClick={onEnableTracking} type="button" variant="outline" size="sm">
                Enable Tracking
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      <Button
        className="h-12 w-full rounded-md bg-slate-950 text-base font-semibold text-white hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
        disabled={confirmDisabled}
        onClick={onConfirmRide}
      >
        {confirmPending ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
        {trackedDriver ? "Confirm ride" : liveUpdatesEnabled ? "Searching for drivers" : "Enable tracking to continue"}
      </Button>
    </section>
  );
}
