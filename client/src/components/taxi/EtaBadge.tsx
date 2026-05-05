import { Clock3 } from "lucide-react";

type EtaBadgeProps = {
  minutes?: number | null;
  label?: string;
  tone?: "pickup" | "trip" | "neutral";
};

export function EtaBadge({ minutes, label = "away", tone = "neutral" }: EtaBadgeProps) {
  const text = Number.isFinite(Number(minutes)) ? `${Math.max(1, Math.round(Number(minutes)))} min ${label}` : "--";
  const classes = tone === "pickup"
    ? "bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900"
    : tone === "trip"
      ? "bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900"
      : "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800";

  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${classes}`}>
      <Clock3 className="h-3 w-3" />
      {text}
    </span>
  );
}
