import { Clock3, CloudSun, Gauge, MapPin, Navigation } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EtaBadge } from "./EtaBadge";
import { EtaConfidencePill } from "./EtaConfidencePill";

export type TaxiEtaPrediction = {
  pickupEtaMin: number;
  tripEtaMin: number;
  totalEtaMin: number;
  confidence: "High" | "Medium" | "Low" | string;
  factors?: {
    driverDistanceKm?: number | null;
    routeDistanceKm?: number | null;
    availableDrivers?: number | null;
    peakMultiplier?: number | null;
    weatherMultiplier?: number | null;
    routeSource?: string | null;
  };
  generatedAt?: string;
};

type EtaPredictionCardProps = {
  prediction?: TaxiEtaPrediction | null;
  isLoading?: boolean;
  error?: string | null;
  compact?: boolean;
  title?: string;
};

export function EtaPredictionCard({
  prediction,
  isLoading,
  error,
  compact = false,
  title = "Live ETA",
}: EtaPredictionCardProps) {
  if (isLoading && !prediction) {
    return (
      <Card className="p-4 border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/20">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
          <Skeleton className="h-14 rounded-md" />
        </div>
      </Card>
    );
  }

  if (error && !prediction) {
    return (
      <Card className="p-4 border-amber-200 bg-white dark:border-amber-900/60 dark:bg-slate-950">
        <p className="text-sm font-semibold text-foreground">{title}</p>
        <p className="mt-1 text-xs text-muted-foreground">ETA is temporarily unavailable. We will keep checking in the background.</p>
      </Card>
    );
  }

  if (!prediction) return null;

  const generatedLabel = prediction.generatedAt
    ? new Date(prediction.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
    : null;

  return (
    <Card className="p-4 border-amber-200 bg-gradient-to-br from-amber-50 to-white dark:border-amber-900/60 dark:from-amber-950/25 dark:to-slate-950">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">{title}</p>
          <h3 className="mt-1 text-lg font-bold text-foreground">{prediction.totalEtaMin} min total</h3>
        </div>
        <EtaConfidencePill confidence={prediction.confidence} />
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <EtaBadge minutes={prediction.pickupEtaMin} label="away" tone="pickup" />
        <EtaBadge minutes={prediction.tripEtaMin} label="trip" tone="trip" />
      </div>

      {!compact && (
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <div className="rounded-md bg-white/80 p-2 dark:bg-slate-900/70">
            <MapPin className="mb-1 h-3.5 w-3.5 text-emerald-600" />
            <p className="font-semibold text-foreground">{prediction.factors?.driverDistanceKm ?? "--"} km</p>
            <p className="text-muted-foreground">Driver distance</p>
          </div>
          <div className="rounded-md bg-white/80 p-2 dark:bg-slate-900/70">
            <Navigation className="mb-1 h-3.5 w-3.5 text-amber-600" />
            <p className="font-semibold text-foreground">{prediction.factors?.routeDistanceKm ?? "--"} km</p>
            <p className="text-muted-foreground">Trip route</p>
          </div>
          <div className="rounded-md bg-white/80 p-2 dark:bg-slate-900/70">
            <Gauge className="mb-1 h-3.5 w-3.5 text-blue-600" />
            <p className="font-semibold text-foreground">{prediction.factors?.availableDrivers ?? 0}</p>
            <p className="text-muted-foreground">Available drivers</p>
          </div>
          <div className="rounded-md bg-white/80 p-2 dark:bg-slate-900/70">
            <CloudSun className="mb-1 h-3.5 w-3.5 text-slate-600" />
            <p className="font-semibold text-foreground">Ready</p>
            <p className="text-muted-foreground">Weather support</p>
          </div>
        </div>
      )}

      <div className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock3 className="h-3 w-3" />
        {generatedLabel ? `Updated ${generatedLabel}` : "Updating live"}
      </div>
    </Card>
  );
}
