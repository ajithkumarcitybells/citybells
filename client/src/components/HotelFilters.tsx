import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export type Filters = {
  priceMin?: number | null;
  priceMax?: number | null;
  stars?: number | "all";
  amenities?: string[];
  roomTypes?: string[];
  ratingMin?: number | null;
  location?: string;
  landmarks?: string[];
  availableOnly?: boolean;
};

export default function HotelFilters({
  value,
  onChange,
  onApply,
  onReset,
}: {
  value: Filters;
  onChange: (v: Filters) => void;
  onApply?: () => void;
  onReset?: () => void;
}) {
  const [local, setLocal] = useState<Filters>(value || {});

  const amenitiesList = ["Free WiFi", "AC", "Parking", "Swimming Pool", "Restaurant", "Breakfast Included"];
  const roomTypes = ["Single Room", "Double Room", "Deluxe", "Suite"];
  const landmarkOptions = ["Near Airport", "Near Railway Station", "Near City Center"];

  const toggleAmenity = (a: string) => {
    const arr = new Set(local.amenities || []);
    if (arr.has(a)) arr.delete(a); else arr.add(a);
    const next = { ...local, amenities: Array.from(arr) };
    setLocal(next); onChange(next);
  };

  const toggleRoomType = (r: string) => {
    const arr = new Set(local.roomTypes || []);
    if (arr.has(r)) arr.delete(r); else arr.add(r);
    const next = { ...local, roomTypes: Array.from(arr) };
    setLocal(next); onChange(next);
  };

  const reset = () => {
    const next: Filters = {};
    setLocal(next); onChange(next); if (onReset) onReset();
  };

  return (
    <div className="p-3 bg-white dark:bg-gray-800 rounded-md shadow-sm">
      <div className="space-y-3">
        <div>
          <Label>Price range (₹)</Label>
          <div className="flex gap-2 mt-1">
            <Input aria-label="min-price" placeholder="Min" value={local.priceMin ?? ""} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); const next = { ...local, priceMin: n }; setLocal(next); onChange(next); }} />
            <Input aria-label="max-price" placeholder="Max" value={local.priceMax ?? ""} onChange={(e) => { const v = e.target.value; const n = v === "" ? null : Number(v); const next = { ...local, priceMax: n }; setLocal(next); onChange(next); }} />
          </div>
        </div>

        <div>
          <Label>Star rating</Label>
          <div className="flex gap-2 mt-1 items-center">
            <select aria-label="star-filter" value={String(local.stars ?? "all")} onChange={(e) => { const v = e.target.value === "all" ? "all" : Number(e.target.value); const next = { ...local, stars: v as any }; setLocal(next); onChange(next); }} className="p-2 border rounded-md w-full">
              <option value="all">All stars</option>
              <option value="5">5 Star</option>
              <option value="4">4 Star & above</option>
              <option value="3">3 Star & above</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Amenities</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {amenitiesList.map((a) => (
              <label key={a} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(local.amenities || []).includes(a)} onChange={() => toggleAmenity(a)} aria-label={`amenity-${a}`} />
                <span>{a}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Room type</Label>
          <div className="grid grid-cols-2 gap-2 mt-1">
            {roomTypes.map((r) => (
              <label key={r} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(local.roomTypes || []).includes(r)} onChange={() => toggleRoomType(r)} aria-label={`roomtype-${r}`} />
                <span>{r}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Landmarks / Nearby</Label>
          <div className="grid grid-cols-1 gap-2 mt-1">
            {landmarkOptions.map((lm) => (
              <label key={lm} className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={(local.landmarks || []).includes(lm)} onChange={() => {
                  const arr = new Set(local.landmarks || []);
                  if (arr.has(lm)) arr.delete(lm); else arr.add(lm);
                  const next = { ...local, landmarks: Array.from(arr) };
                  setLocal(next); onChange(next);
                }} aria-label={`landmark-${lm}`} />
                <span>{lm}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Guest rating</Label>
          <div className="flex gap-2 mt-1">
            <select aria-label="guest-rating" value={String(local.ratingMin ?? "")} onChange={(e) => { const v = e.target.value === "" ? null : Number(e.target.value); const next = { ...local, ratingMin: v }; setLocal(next); onChange(next); }} className="p-2 border rounded-md w-full">
              <option value="">Any rating</option>
              <option value="4.5">4.5+</option>
              <option value="4.0">4.0+</option>
              <option value="3.5">3.5+</option>
            </select>
          </div>
        </div>

        <div>
          <Label>Location / area</Label>
          <Input aria-label="location" placeholder="Area or landmark" value={local.location || ""} onChange={(e) => { const next = { ...local, location: e.target.value }; setLocal(next); onChange(next); }} className="mt-1" />
        </div>

        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" onClick={reset}>Reset</Button>
          <Button onClick={() => { if (onApply) onApply(); }}>Apply Filters</Button>
        </div>
      </div>
    </div>
  );
}
