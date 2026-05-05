import { BadgePercent, X } from "lucide-react";
import { useState } from "react";

export function OfferBanner() {
  const [visible, setVisible] = useState(true);
  if (!visible) return null;

  return (
    <div className="mb-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 shadow-sm dark:border-emerald-900/60 dark:bg-emerald-950/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <BadgePercent className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-emerald-800 dark:text-emerald-200">20% off your first ride</div>
            <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">Use code FIRST20. Valid for new users.</div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700">Apply</button>
          <button onClick={() => setVisible(false)} className="rounded-md p-1 text-slate-400 hover:bg-white/70 hover:text-slate-600 dark:hover:bg-slate-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default OfferBanner;
