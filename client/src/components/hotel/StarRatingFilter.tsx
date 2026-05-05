import { Star } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

type StarRatingFilterProps = {
  value: number[];
  onChange: (value: number[]) => void;
};

function toggleNumberValue(values: number[], value: number) {
  return values.includes(value) ? values.filter((entry) => entry !== value) : [...values, value].sort((left, right) => left - right);
}

export function StarRatingFilter({ value, onChange }: StarRatingFilterProps) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Star rating filter">
      {[5, 4, 3, 2, 1].map((stars) => (
        <label key={stars} className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700">
          <Checkbox
            checked={value.includes(stars)}
            onCheckedChange={() => onChange(toggleNumberValue(value, stars))}
            aria-label={`${stars} star hotels`}
            data-testid={`checkbox-star-${stars}`}
          />
          <span className="inline-flex items-center gap-1">
            {stars}
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          </span>
        </label>
      ))}
    </div>
  );
}
