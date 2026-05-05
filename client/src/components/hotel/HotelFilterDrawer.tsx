import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { HotelFilterPanel } from "./HotelFilterPanel";
import type { HotelFilterState, HotelPropertyType } from "@/lib/hotel-filters";

type HotelFilterDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: HotelFilterState;
  resultCount: number;
  availableLocations: string[];
  amenityOptions: string[];
  propertyTypeOptions: HotelPropertyType[];
  priceBounds: { min: number; max: number };
  onChange: (next: HotelFilterState) => void;
  onClear: () => void;
};

export function HotelFilterDrawer({
  open,
  onOpenChange,
  filters,
  resultCount,
  availableLocations,
  amenityOptions,
  propertyTypeOptions,
  priceBounds,
  onChange,
  onClear,
}: HotelFilterDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[86vh] rounded-t-[28px] border-0 bg-[#f4f7fb] px-0">
        <SheetHeader className="px-4 pb-2 pt-1 text-left">
          <SheetTitle>Filter hotels</SheetTitle>
          <SheetDescription>Choose dates, guests, price, amenities, and sort order.</SheetDescription>
        </SheetHeader>
        <div className="h-full overflow-y-auto px-4 pb-32">
          <HotelFilterPanel
            filters={filters}
            resultCount={resultCount}
            availableLocations={availableLocations}
            amenityOptions={amenityOptions}
            propertyTypeOptions={propertyTypeOptions}
            priceBounds={priceBounds}
            onChange={onChange}
            onClear={onClear}
          />
        </div>
        <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 bg-white p-4">
          <Button className="h-11 w-full rounded-xl" onClick={() => onOpenChange(false)} data-testid="button-apply-mobile-filters">
            Show {resultCount} stay{resultCount === 1 ? "" : "s"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
