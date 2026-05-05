import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LocationSearchInput } from "@/components/taxi/LocationSearchInput";
import { LocateFixed, MapPin } from "lucide-react";
import type { Coordinates } from "@/lib/taxi-map";

type BookingCardProps = {
  initialPickup?: { address?: string; lat?: number; lng?: number };
  initialDrop?: { address?: string; lat?: number; lng?: number };
  onRequestBook?: (payload: { pickup: any; drop: any }) => void;
  onUseCurrent?: (forField: "pickup" | "drop") => void;
};

export function BookingCard({ initialPickup, initialDrop, onRequestBook, onUseCurrent }: BookingCardProps) {
  const [pickup, setPickup] = useState(initialPickup ?? { address: "" });
  const [drop, setDrop] = useState(initialDrop ?? { address: "" });

  return (
    <div className="mx-auto w-full max-w-xl rounded-3xl bg-white/90 p-4 shadow-lg dark:bg-slate-900/90">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Where to?</h3>
        <div className="text-sm text-slate-500">Now</div>
      </div>

      <div className="mt-3 space-y-3">
        <LocationSearchInput
          label="Pickup"
          placeholder="Enter pickup location"
          value={pickup.address ?? ""}
          onChange={(v) => setPickup((p) => ({ ...p, address: v }))}
          onFocus={() => {}}
          onSelectSuggestion={(s) => setPickup({ address: s.address, lat: s.lat, lng: s.lng })}
          showUseCurrent
          recentKey="booking_recent_pickup"
        />

        <LocationSearchInput
          label="Drop"
          placeholder="Enter destination"
          value={drop.address ?? ""}
          onChange={(v) => setDrop((d) => ({ ...d, address: v }))}
          onFocus={() => {}}
          onSelectSuggestion={(s) => setDrop({ address: s.address, lat: s.lat, lng: s.lng })}
          recentKey="booking_recent_drop"
        />

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => onUseCurrent?.("pickup")}
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <span className="inline-flex items-center gap-2">
              <LocateFixed className="h-4 w-4 text-emerald-600" /> Use current
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (!pickup.address || !drop.address) return;
              onRequestBook?.({ pickup, drop });
            }}
            className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            Book Taxi
          </button>
        </div>
      </div>
    </div>
  );
}

export default BookingCard;
