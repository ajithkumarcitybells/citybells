import { Slider } from "@/components/ui/slider";

type PriceRangeFilterProps = {
  value: [number, number];
  bounds: { min: number; max: number };
  onChange: (value: [number, number]) => void;
};

export function PriceRangeFilter({ value, bounds, onChange }: PriceRangeFilterProps) {
  return (
    <div className="space-y-3" aria-label="Price range filter">
      <Slider
        min={bounds.min}
        max={bounds.max}
        step={100}
        value={value}
        onValueChange={(next) => onChange([next[0] ?? bounds.min, next[1] ?? bounds.max])}
        data-testid="slider-price-range"
      />
      <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">Rs {value[0].toLocaleString("en-IN")}</span>
        <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">Rs {value[1].toLocaleString("en-IN")}</span>
      </div>
    </div>
  );
}
