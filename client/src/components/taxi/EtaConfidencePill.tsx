import { Badge } from "@/components/ui/badge";

type EtaConfidence = "High" | "Medium" | "Low" | string;

export function EtaConfidencePill({ confidence }: { confidence?: EtaConfidence | null }) {
  const value = confidence || "Low";
  const classes = value === "High"
    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300"
    : value === "Medium"
      ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
      : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

  return (
    <Badge className={`${classes} border-transparent text-[10px]`}>
      {value} confidence
    </Badge>
  );
}
