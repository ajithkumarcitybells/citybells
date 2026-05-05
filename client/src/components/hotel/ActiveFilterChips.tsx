import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { HotelFilterTag } from "@/lib/hotel-filters";

type ActiveFilterChipsProps = {
  tags: HotelFilterTag[];
  onRemove: (key: string) => void;
};

export function ActiveFilterChips({ tags, onRemove }: ActiveFilterChipsProps) {
  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2" aria-label="Active hotel filters">
      {tags.map((tag) => (
        <Badge
          key={tag.key}
          variant="secondary"
          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 shadow-sm"
          data-testid={`tag-filter-${tag.key.replace(/[:.]/g, "-")}`}
        >
          {tag.label}
          <button type="button" className="ml-2" onClick={() => onRemove(tag.key)} aria-label={`Remove ${tag.label}`}>
            <X className="h-3.5 w-3.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
