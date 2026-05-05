import { MapPin, Plane, Repeat, Truck, Tag } from "lucide-react";
import type { SearchSuggestion } from "@/lib/taxi-map";

type Props = {
  onSelect?: (s: { id: string; name: string; address?: string; lat?: number; lng?: number }) => void;
};

const items = [
  { id: "airport", name: "Airport Rides", icon: Plane },
  { id: "outstation", name: "Outstation", icon: Truck },
  { id: "rentals", name: "Rentals", icon: Repeat },
  { id: "auto", name: "Auto", icon: MapPin },
  { id: "offers", name: "Offers", icon: Tag },
];

export function RideSuggestionsStrip({ onSelect }: Props) {
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">Quick rides</h4>
        <div className="text-xs text-slate-500">Popular</div>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto py-2">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <button
              key={it.id}
              onClick={() => onSelect?.({ id: it.id, name: it.name })}
              className="min-w-[120px] shrink-0 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm hover:translate-y-[-2px] transition-transform"
            >
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-slate-100 p-2 text-slate-700">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{it.name}</div>
                  <div className="text-xs text-slate-500">Popular choice</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RideSuggestionsStrip;
