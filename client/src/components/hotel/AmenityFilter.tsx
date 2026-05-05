import {
  Coffee,
  Dumbbell,
  Hotel as HotelIcon,
  ParkingCircle,
  ShieldCheck,
  Sparkles,
  Waves,
  Wifi,
  Wind,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { HOTEL_AMENITY_OPTIONS } from "@/lib/hotel-filters";

type AmenityFilterProps = {
  value: string[];
  options: string[];
  onChange: (value: string[]) => void;
};

const amenityIcons = {
  WiFi: Wifi,
  AC: Wind,
  Pool: Waves,
  Parking: ParkingCircle,
  Breakfast: Coffee,
  Spa: Sparkles,
  Gym: Dumbbell,
  Restaurant: HotelIcon,
} satisfies Record<string, React.ComponentType<{ className?: string }>>;

function toggleStringValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value];
}

export function AmenityFilter({ value, options, onChange }: AmenityFilterProps) {
  const filterOptions = options.length > 0 ? options : HOTEL_AMENITY_OPTIONS;

  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Amenities filter">
      {filterOptions.map((amenity) => {
        const Icon = amenityIcons[amenity as keyof typeof amenityIcons] ?? ShieldCheck;
        return (
          <label key={amenity} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
            <Checkbox
              checked={value.includes(amenity)}
              onCheckedChange={() => onChange(toggleStringValue(value, amenity))}
              aria-label={`Amenity ${amenity}`}
              data-testid={`checkbox-amenity-${amenity.toLowerCase()}`}
            />
            <Icon className="h-4 w-4 text-sky-600" />
            <span>{amenity}</span>
          </label>
        );
      })}
    </div>
  );
}
