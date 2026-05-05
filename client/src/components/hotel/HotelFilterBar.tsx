import { CalendarDays, Search, SlidersHorizontal, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { HotelFilterState } from "@/lib/hotel-filters";

type HotelFilterBarProps = {
  filters: HotelFilterState;
  resultCount: number;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  onChange: (next: HotelFilterState) => void;
  onOpenFilters: () => void;
};

export function HotelFilterBar({
  filters,
  resultCount,
  searchInput,
  onSearchInputChange,
  onChange,
  onOpenFilters,
}: HotelFilterBarProps) {
  return (
    <section className="sticky top-[73px] z-30 -mx-4 border-b border-slate-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur lg:hidden">
      <div className="space-y-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            aria-label="Search destination, hotel name, or location"
            placeholder="Destination, hotel, or area"
            value={searchInput}
            onChange={(event) => onSearchInputChange(event.target.value)}
            className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10"
          />
        </div>
        <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
          <Button variant="outline" className="justify-start rounded-xl border-slate-200 px-3" onClick={onOpenFilters} aria-label="Open date filters">
            <CalendarDays className="mr-2 h-4 w-4" />
            <span className="truncate">{filters.checkIn && filters.checkOut ? `${filters.checkIn} - ${filters.checkOut}` : "Dates"}</span>
          </Button>
          <Button variant="outline" className="justify-start rounded-xl border-slate-200 px-3" onClick={onOpenFilters} aria-label="Open guest filters">
            <Users className="mr-2 h-4 w-4" />
            {filters.guests} guests, {filters.rooms} room
          </Button>
          <Button variant="default" className="rounded-xl" onClick={onOpenFilters} aria-label="Open all hotel filters">
            <SlidersHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-xs font-medium text-slate-500">{resultCount} stays found</div>
      </div>
    </section>
  );
}
