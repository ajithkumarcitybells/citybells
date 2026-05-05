import { BedDouble, Building2, Filter, MapPin, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { AmenityFilter } from "./AmenityFilter";
import { PriceRangeFilter } from "./PriceRangeFilter";
import { StarRatingFilter } from "./StarRatingFilter";
import {
  HOTEL_GUEST_RATING_OPTIONS,
  HOTEL_PROPERTY_TYPE_OPTIONS,
  HOTEL_ROOM_TYPE_OPTIONS,
  type HotelFilterState,
  type HotelPropertyType,
  type HotelRoomTypeFilter,
} from "@/lib/hotel-filters";

type HotelFilterPanelProps = {
  filters: HotelFilterState;
  resultCount: number;
  availableLocations: string[];
  amenityOptions: string[];
  propertyTypeOptions: HotelPropertyType[];
  priceBounds: { min: number; max: number };
  onChange: (next: HotelFilterState) => void;
  onClear: () => void;
  className?: string;
};

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      {children}
    </section>
  );
}

function toggleStringValue<T extends string>(values: T[], value: T) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function HotelFilterPanel({
  filters,
  resultCount,
  availableLocations,
  amenityOptions,
  propertyTypeOptions,
  priceBounds,
  onChange,
  onClear,
  className,
}: HotelFilterPanelProps) {
  const update = (patch: Partial<HotelFilterState>) => onChange({ ...filters, ...patch });

  return (
    <div className={cn("space-y-4", className)}>
      <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-5 text-white shadow-lg">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-300">Hotel filters</p>
            <h2 className="mt-2 text-xl font-semibold">Refine your stay</h2>
            <p className="mt-2 text-sm text-slate-300">{resultCount} matching propert{resultCount === 1 ? "y" : "ies"}.</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-3">
            <Filter className="h-5 w-5" />
          </div>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="mt-4 h-10 rounded-xl bg-white text-slate-900 hover:bg-slate-100"
          onClick={onClear}
          data-testid="button-clear-all-filters"
        >
          Reset filters
        </Button>
      </div>

      <FilterSection title="Destination / city">
        <div className="relative">
          <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            list="hotel-location-options"
            value={filters.locations[0] ?? ""}
            onChange={(event) => update({ locations: event.target.value ? [event.target.value] : [] })}
            placeholder="City, area, or landmark"
            className="pl-10"
            aria-label="Destination or city search"
            data-testid="input-location-filter"
          />
          <datalist id="hotel-location-options">
            {availableLocations.map((location) => (
              <option key={location} value={location} />
            ))}
          </datalist>
        </div>
      </FilterSection>

      <FilterSection title="Dates and guests">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Check-in
            <Input
              type="date"
              value={filters.checkIn}
              onChange={(event) => update({ checkIn: event.target.value })}
              aria-label="Check-in date"
              data-testid="input-check-in"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Check-out
            <Input
              type="date"
              value={filters.checkOut}
              min={filters.checkIn || undefined}
              onChange={(event) => update({ checkOut: event.target.value })}
              aria-label="Check-out date"
              data-testid="input-check-out"
            />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Guests
            <Input
              type="number"
              min={1}
              max={30}
              value={filters.guests}
              onChange={(event) => update({ guests: Math.max(1, Math.min(30, Number(event.target.value || 1))) })}
              aria-label="Guest count"
            />
          </label>
          <label className="space-y-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            Rooms
            <Input
              type="number"
              min={1}
              max={10}
              value={filters.rooms}
              onChange={(event) => update({ rooms: Math.max(1, Math.min(10, Number(event.target.value || 1))) })}
              aria-label="Room count"
            />
          </label>
        </div>
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <Checkbox
            checked={filters.availableOnly}
            onCheckedChange={(checked) => update({ availableOnly: checked === true })}
            aria-label="Show available rooms only"
          />
          <Users className="h-4 w-4 text-sky-600" />
          Available rooms only
        </label>
      </FilterSection>

      <FilterSection title="Price range">
        <PriceRangeFilter value={filters.priceRange} bounds={priceBounds} onChange={(priceRange) => update({ priceRange })} />
      </FilterSection>

      <FilterSection title="Star rating">
        <StarRatingFilter value={filters.starRatings} onChange={(starRatings) => update({ starRatings })} />
      </FilterSection>

      <FilterSection title="Amenities">
        <AmenityFilter value={filters.amenities} options={amenityOptions} onChange={(amenities) => update({ amenities })} />
      </FilterSection>

      <FilterSection title="Property type">
        <div className="grid grid-cols-2 gap-2">
          {(propertyTypeOptions.length > 0 ? propertyTypeOptions : HOTEL_PROPERTY_TYPE_OPTIONS).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => update({ propertyTypes: toggleStringValue(filters.propertyTypes, type as HotelPropertyType) })}
              className={cn(
                "rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filters.propertyTypes.includes(type)
                  ? "border-sky-500 bg-sky-50 text-sky-700"
                  : "border-slate-200 bg-white text-slate-700",
              )}
              aria-label={`Filter ${type} properties`}
              data-testid={`button-property-type-${type.toLowerCase()}`}
            >
              {type}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Guest rating">
        <div className="flex flex-wrap gap-2">
          {HOTEL_GUEST_RATING_OPTIONS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => update({ guestRating: filters.guestRating === value ? null : value })}
              className={cn(
                "rounded-full border px-3 py-2 text-sm font-medium transition-colors",
                filters.guestRating === value
                  ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 bg-white text-slate-700",
              )}
              aria-label={`Filter hotels rated ${value} and above`}
              data-testid={`button-guest-rating-${String(value).replace(".", "-")}`}
            >
              {value}+ rated
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Room type">
        <div className="grid grid-cols-2 gap-2">
          {HOTEL_ROOM_TYPE_OPTIONS.map((roomType) => (
            <button
              key={roomType}
              type="button"
              onClick={() => update({ roomTypes: toggleStringValue(filters.roomTypes, roomType as HotelRoomTypeFilter) })}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filters.roomTypes.includes(roomType)
                  ? "border-violet-500 bg-violet-50 text-violet-700"
                  : "border-slate-200 bg-white text-slate-700",
              )}
              aria-label={`Filter ${roomType} room type`}
              data-testid={`button-room-type-${roomType.toLowerCase()}`}
            >
              <BedDouble className="h-4 w-4" />
              {roomType}
            </button>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="Sort by">
        <div className="grid gap-2">
          {[
            { value: "recommended", label: "Recommended" },
            { value: "price-low", label: "Price: Low to High" },
            { value: "price-high", label: "Price: High to Low" },
            { value: "rating-high", label: "Rating: High to Low" },
            { value: "popularity", label: "Popularity" },
            { value: "newest", label: "Newest first" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => update({ sortBy: option.value as HotelFilterState["sortBy"] })}
              className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-medium transition-colors",
                filters.sortBy === option.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700",
              )}
              aria-label={`Sort hotels by ${option.label}`}
              data-testid={`button-sort-${option.value}`}
            >
              <span>{option.label}</span>
              {option.value === "recommended" ? <Building2 className="h-4 w-4" /> : null}
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );
}
