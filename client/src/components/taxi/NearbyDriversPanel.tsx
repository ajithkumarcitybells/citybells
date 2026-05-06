import { useMemo, useState } from "react";
import { Bike, Car, Clock3, Filter, Loader2, MapPin, RefreshCw, ShieldCheck, Star, Truck, UserRound, WifiOff } from "lucide-react";
import type { LiveTaxiVehicle } from "@/lib/taxi-map";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

type DriverSort = "recommended" | "nearest" | "eta" | "rating";

type NearbyDriversPanelProps = {
  drivers: LiveTaxiVehicle[];
  selectedDriverId: string | null;
  highlightedDriverId: string | null;
  canRequestTracking: boolean;
  liveUpdatesEnabled: boolean;
  isRefreshing: boolean;
  isLoading?: boolean;
  error?: unknown;
  onEnableTracking: () => void;
  onRefresh?: () => void;
  onSelectDriver: (driverId: string | null) => void;
};

function getVehicleIcon(type: LiveTaxiVehicle["type"]) {
  if (type === "bike") return Bike;
  if (type === "auto") return Truck;
  return Car;
}

export function RecommendedDriverBadge() {
  return <Badge className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200">Recommended</Badge>;
}

export function DriverSortControl({ sort, onSortChange, ratingOnly, within5Km, onRatingOnlyChange, onWithin5KmChange }: any) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
      <label className="grid gap-1 text-xs font-semibold uppercase text-slate-500">
        Sort drivers
        <select className="h-10 rounded-xl border bg-white px-3 text-sm normal-case text-slate-800 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" value={sort} onChange={(event) => onSortChange(event.target.value)}>
          <option value="recommended">Recommended</option>
          <option value="nearest">Nearest</option>
          <option value="eta">Fastest ETA</option>
          <option value="rating">Highest rating</option>
        </select>
      </label>
      <label className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm dark:border-slate-800">
        <input type="checkbox" checked={ratingOnly} onChange={(event) => onRatingOnlyChange(event.target.checked)} />
        4.5+
      </label>
      <label className="flex h-10 items-center gap-2 rounded-xl border px-3 text-sm dark:border-slate-800">
        <input type="checkbox" checked={within5Km} onChange={(event) => onWithin5KmChange(event.target.checked)} />
        Within 5 km
      </label>
    </div>
  );
}

export function DriverOptionCard({ driver, selected, highlighted, recommended, onSelect, onPreview }: {
  driver: LiveTaxiVehicle;
  selected: boolean;
  highlighted: boolean;
  recommended: boolean;
  onSelect: () => void;
  onPreview: () => void;
}) {
  const VehicleIcon = getVehicleIcon(driver.type);
  return (
    <Card className={`rounded-2xl border p-3 shadow-sm transition ${highlighted ? "border-amber-300 bg-amber-50 dark:border-amber-400/50 dark:bg-amber-500/10" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"}`}>
      <div className="flex gap-3">
        <button aria-label={`Preview ${driver.driverName}`} className="h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900" onClick={onPreview} type="button">
          {driver.photo ? <img src={driver.photo} alt={driver.driverName} className="h-full w-full object-cover" /> : <UserRound className="m-4 h-6 w-6 text-slate-500" />}
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <button className="text-left text-sm font-bold text-slate-950 dark:text-slate-50" onClick={onPreview} type="button">{driver.driverName}</button>
            {recommended ? <RecommendedDriverBadge /> : null}
            {selected ? <Badge className="border-transparent bg-slate-950 text-white dark:bg-white dark:text-slate-950">Selected</Badge> : null}
          </div>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{driver.vehicleType} • {driver.vehicleNumber}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="inline-flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />{driver.rating.toFixed(1)}</span>
            <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{driver.distanceKm.toFixed(1)} km</span>
            <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{driver.etaMin} min</span>
            <span className="inline-flex items-center gap-1"><VehicleIcon className="h-3.5 w-3.5" />{driver.type}</span>
          </div>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <Button className={selected ? "bg-slate-950 text-white" : "bg-amber-400 text-slate-950 hover:bg-amber-300"} onClick={onSelect} type="button">
          {selected ? "Selected" : "Select driver"}
        </Button>
        <Button variant="outline" onClick={onPreview} type="button">Profile</Button>
      </div>
    </Card>
  );
}

export function DriverProfileSheet({ driver, open, onOpenChange, onSelect }: { driver: LiveTaxiVehicle | null; open: boolean; onOpenChange: (open: boolean) => void; onSelect: () => void }) {
  if (!driver) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bottom-0 top-auto translate-y-0 rounded-b-none sm:top-1/2 sm:translate-y-[-50%] sm:rounded-2xl">
        <DialogHeader><DialogTitle>Driver profile</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 dark:bg-slate-900">
              {driver.photo ? <img src={driver.photo} alt={driver.driverName} className="h-full w-full object-cover" /> : <UserRound className="m-6 h-8 w-8 text-slate-500" />}
            </div>
            <div>
              <h3 className="text-xl font-black">{driver.driverName}</h3>
              <p className="text-sm text-slate-500">{driver.vehicleType} • {driver.vehicleNumber}</p>
              <div className="mt-2 flex gap-2"><RecommendedDriverBadge /><Badge variant="outline"><ShieldCheck className="mr-1 h-3.5 w-3.5" />Safety verified</Badge></div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <Info label="Rating" value={`${driver.rating.toFixed(1)} stars`} />
            <Info label="ETA" value={`${driver.etaMin} min`} />
            <Info label="Completed rides" value={`${driver.completedRides || 250}+`} />
            <Info label="Languages" value="Tamil, English" />
          </div>
          <Button className="h-12 w-full bg-amber-400 text-slate-950 hover:bg-amber-300" onClick={onSelect}>Select driver</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function SelectedDriverSummary({ driver, onClear }: { driver: LiveTaxiVehicle | null; onClear: () => void }) {
  if (!driver) {
    return (
      <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-400/50 dark:bg-amber-500/10 dark:text-amber-100">
        Auto assign best driver is selected. We will offer the ride to the best available driver.
      </div>
    );
  }
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-500/30 dark:bg-emerald-500/10">
      <div className="min-w-0 text-sm">
        <p className="font-bold text-emerald-950 dark:text-emerald-100">Selected: {driver.driverName}</p>
        <p className="text-emerald-800 dark:text-emerald-200">{driver.vehicleType} • {driver.etaMin} min away • {driver.rating.toFixed(1)}★</p>
      </div>
      <Button size="sm" variant="outline" onClick={onClear}>Auto assign</Button>
    </div>
  );
}

export function NearbyDriversPanel({
  drivers,
  selectedDriverId,
  highlightedDriverId,
  canRequestTracking,
  liveUpdatesEnabled,
  isRefreshing,
  isLoading,
  error,
  onEnableTracking,
  onRefresh,
  onSelectDriver,
}: NearbyDriversPanelProps) {
  const [sort, setSort] = useState<DriverSort>("recommended");
  const [ratingOnly, setRatingOnly] = useState(false);
  const [within5Km, setWithin5Km] = useState(false);
  const [previewDriver, setPreviewDriver] = useState<LiveTaxiVehicle | null>(null);
  const isOffline = typeof navigator !== "undefined" && navigator.onLine === false;

  const sortedDrivers = useMemo(() => {
    const filtered = drivers
      .filter((driver) => !ratingOnly || driver.rating >= 4.5)
      .filter((driver) => !within5Km || driver.distanceKm <= 5);
    return [...filtered].sort((left, right) => {
      if (sort === "rating") return right.rating - left.rating;
      if (sort === "eta") return left.etaMin - right.etaMin;
      if (sort === "nearest") return left.distanceKm - right.distanceKm;
      return Number(Boolean(right.isRecommended)) - Number(Boolean(left.isRecommended)) || left.distanceKm - right.distanceKm || right.rating - left.rating;
    });
  }, [drivers, ratingOnly, sort, within5Km]);

  const recommendedDriver = sortedDrivers[0] ?? null;

  return (
    <section className="rounded-[30px] border border-white/60 bg-white/90 p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12)] backdrop-blur dark:border-slate-800 dark:bg-slate-950/85">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500 dark:text-slate-400">Choose your driver</p>
          <h3 className="mt-2 text-xl font-semibold text-slate-950 dark:text-slate-50">Nearby available drivers</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Pick a preferred driver or keep auto assign for the best match.</p>
        </div>
        <Button aria-label="Refresh nearby drivers" size="icon" variant="outline" onClick={onRefresh} disabled={isRefreshing || !canRequestTracking}>
          {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
        </Button>
      </div>

      <div className="mt-4">
        <SelectedDriverSummary driver={drivers.find((driver) => driver.id === selectedDriverId) ?? null} onClear={() => onSelectDriver(null)} />
      </div>

      <div className="mt-4">
        <DriverSortControl sort={sort} onSortChange={setSort} ratingOnly={ratingOnly} within5Km={within5Km} onRatingOnlyChange={setRatingOnly} onWithin5KmChange={setWithin5Km} />
      </div>

      {isOffline ? (
        <div className="mt-5 flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <WifiOff className="h-4 w-4" />
          Driver selection unavailable offline.
        </div>
      ) : null}

      {!liveUpdatesEnabled ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-300">Enable live tracking to show drivers on the map and route the selected driver to pickup.</p>
          <Button className="mt-3 rounded-full" disabled={!canRequestTracking} onClick={onEnableTracking} type="button" variant="outline">
            Enable Driver Tracking
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200">
          Failed to load nearby drivers. <button className="font-bold underline" onClick={onRefresh} type="button">Retry</button>
        </div>
      ) : null}

      {isLoading ? (
        <div className="mt-5 space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-36 rounded-2xl" />)}</div>
      ) : canRequestTracking && sortedDrivers.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">
          <Filter className="mx-auto mb-2 h-8 w-8 text-slate-300" />
          No drivers nearby. Try auto assign.
        </div>
      ) : sortedDrivers.length > 0 ? (
        <div className="mt-5 space-y-3">
          {sortedDrivers.map((driver) => (
            <DriverOptionCard
              key={driver.id}
              driver={driver}
              highlighted={(highlightedDriverId || recommendedDriver?.id) === driver.id}
              onPreview={() => setPreviewDriver(driver)}
              onSelect={() => onSelectDriver(selectedDriverId === driver.id ? null : driver.id)}
              recommended={driver.id === recommendedDriver?.id || Boolean(driver.isRecommended)}
              selected={selectedDriverId === driver.id}
            />
          ))}
        </div>
      ) : null}

      <DriverProfileSheet
        driver={previewDriver}
        open={Boolean(previewDriver)}
        onOpenChange={(open) => !open && setPreviewDriver(null)}
        onSelect={() => {
          if (previewDriver) onSelectDriver(previewDriver.id);
          setPreviewDriver(null);
        }}
      />
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-100 p-3 dark:bg-slate-900"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 font-bold">{value}</p></div>;
}
