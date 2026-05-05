import { Bike, Car, Clock3, Loader2, MapPin, Truck } from "lucide-react";
import type { LiveTaxiVehicle } from "@/lib/taxi-map";
import { Button } from "@/components/ui/button";

type NearbyDriversPanelProps = {
  drivers: LiveTaxiVehicle[];
  selectedDriverId: string | null;
  highlightedDriverId: string | null;
  canRequestTracking: boolean;
  liveUpdatesEnabled: boolean;
  isRefreshing: boolean;
  onEnableTracking: () => void;
  onSelectDriver: (driverId: string | null) => void;
};

function getVehicleIcon(type: LiveTaxiVehicle["type"]) {
  if (type === "bike") {
    return Bike;
  }
  if (type === "auto") {
    return Truck;
  }
  return Car;
}

export function NearbyDriversPanel({
  drivers,
  selectedDriverId,
  highlightedDriverId,
  canRequestTracking,
  liveUpdatesEnabled,
  isRefreshing,
  onEnableTracking,
  onSelectDriver,
}: NearbyDriversPanelProps) {
  return (
    <section className="rounded-[30px] border border-white/60 bg-white/85 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Nearby drivers</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">Track drivers before you confirm</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Preview live ETA, distance, and route-to-pickup for nearby drivers.</p>
        </div>
        {isRefreshing ? (
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-300">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Searching
          </div>
        ) : null}
      </div>

      {!liveUpdatesEnabled ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">Enable tracking to start polling nearby drivers for the selected pickup point.</p>
          <Button className="mt-3 rounded-full" disabled={!canRequestTracking} onClick={onEnableTracking} type="button" variant="outline">
            Enable Driver Tracking
          </Button>
        </div>
      ) : null}

      {liveUpdatesEnabled && !canRequestTracking ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          Choose a pickup location to search nearby drivers.
        </div>
      ) : null}

      {liveUpdatesEnabled && canRequestTracking && drivers.length === 0 ? (
        <div className="mt-5 rounded-[24px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
            <span aria-hidden="true" className="driver-searching-dots">
              <span></span>
              <span></span>
              <span></span>
            </span>
            Searching for available drivers near your pickup point...
          </div>
        </div>
      ) : null}

      {drivers.length > 0 ? (
        <div className="mt-5 space-y-3">
          {drivers.map((driver, index) => {
            const VehicleIcon = getVehicleIcon(driver.type);
            const isSelected = selectedDriverId === driver.id;
            const isHighlighted = highlightedDriverId === driver.id;

            return (
              <button
                key={driver.id}
                className={`flex w-full items-center gap-4 rounded-[26px] border px-4 py-4 text-left transition ${isHighlighted ? "border-amber-300 bg-amber-50 shadow-lg shadow-amber-500/10 dark:border-amber-300/50 dark:bg-amber-500/10" : "border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700"}`}
                onClick={() => onSelectDriver(isSelected ? null : driver.id)}
                type="button"
              >
                <span className={`rounded-2xl p-3 ${isHighlighted ? "bg-amber-500 text-white dark:bg-amber-300 dark:text-slate-950" : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"}`}>
                  <VehicleIcon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold text-slate-950 dark:text-slate-50">
                    {driver.driverName}
                    {index === 0 ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">Nearest</span> : null}
                    {isSelected ? <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[11px] font-medium text-white dark:bg-white dark:text-slate-900">Selected</span> : null}
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{driver.vehicleType} • {driver.vehicleNumber} • {driver.status}</span>
                  <span className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {driver.distanceKm.toFixed(1)} km away
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock3 className="h-3.5 w-3.5" />
                      ETA {driver.etaMin} min
                    </span>
                  </span>
                </span>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{isSelected ? "Tracking" : "View route"}</span>
              </button>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}