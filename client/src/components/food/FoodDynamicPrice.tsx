import { useFoodDynamicPrice } from "@/hooks/use-food-dynamic-price";
import { cn } from "@/lib/utils";

type FoodDynamicPriceProps = {
  itemId: string;
  fallbackBasePrice: number;
  lat?: number | null;
  lng?: number | null;
  compact?: boolean;
  compactMode?: "default" | "minimal";
  showRuleSummary?: boolean;
  showRuleBadges?: boolean;
  showChangeBadge?: boolean;
  maxRuleBadges?: number;
  className?: string;
};

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export function FoodDynamicPrice({
  itemId,
  fallbackBasePrice,
  lat,
  lng,
  compact = false,
  compactMode = "default",
  showRuleSummary = true,
  showRuleBadges = true,
  showChangeBadge = true,
  maxRuleBadges = compact ? 1 : 3,
  className,
}: FoodDynamicPriceProps) {
  const { data } = useFoodDynamicPrice(itemId, fallbackBasePrice, lat, lng);

  const basePrice = data?.basePrice ?? fallbackBasePrice;
  const dynamicPrice = data?.dynamicPrice ?? fallbackBasePrice;
  const priceChanged = Math.abs(dynamicPrice - basePrice) >= 0.01;
  const isDiscount = dynamicPrice < basePrice;
  const highlightClass = priceChanged
    ? isDiscount
      ? "text-green-700 bg-green-50 border-green-100"
      : "text-amber-700 bg-amber-50 border-amber-100"
    : "text-slate-700 bg-slate-50 border-slate-200";
  const summary = data?.appliedRules?.slice(0, compact ? 1 : 2).map((rule) => rule.label).join(" • ");
  const titleText = data?.appliedRules?.map((rule) => rule.label).join(" • ") || "Food prices refresh automatically based on live demand and delivery conditions.";
  const visibleRules = data?.appliedRules?.slice(0, maxRuleBadges) ?? [];
  const percentageText = priceChanged ? `${dynamicPrice > basePrice ? "+" : ""}${(data?.percentageChange ?? 0).toFixed(1)}%` : "Live";
  const isMinimalCompact = compact && compactMode === "minimal";

  return (
    <div className={className}>
      <div
        className={cn(
          "inline-flex border",
          isMinimalCompact
            ? "min-w-0 items-center gap-1 rounded-xl border-gray-200 bg-white px-2.5 py-2 text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.06)]"
            : "items-center gap-2 rounded-xl px-3 py-2",
          isMinimalCompact ? undefined : highlightClass,
        )}
        title={titleText}
      >
        <span className={`${compact ? "text-base" : "text-xl"} font-bold leading-none`}>
          {formatCurrency(dynamicPrice)}
        </span>
        {priceChanged && !isMinimalCompact ? (
          <span className={`${compact ? "text-[11px]" : "text-sm"} text-gray-500 line-through`}>
            {formatCurrency(basePrice)}
          </span>
        ) : !isMinimalCompact ? (
          <span className={`${compact ? "text-[11px]" : "text-xs"} font-medium uppercase tracking-wide text-gray-500`}>
            Live price
          </span>
        ) : null}
        {showChangeBadge ? (
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
              priceChanged
                ? isDiscount
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-100 text-amber-700"
                : "bg-slate-200 text-slate-600",
            )}
          >
            {percentageText}
          </span>
        ) : null}
        {priceChanged && isMinimalCompact ? (
          <span className="truncate text-[11px] font-medium leading-none text-slate-400 line-through">
            {formatCurrency(basePrice)}
          </span>
        ) : null}
      </div>

      {showRuleSummary ? (
        <p className="mt-2 text-xs text-gray-500">
          {summary || "Food prices refresh automatically based on live demand and delivery conditions."}
        </p>
      ) : null}

      {showRuleBadges && visibleRules.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {visibleRules.map((rule) => (
            <span
              key={`${itemId}-${rule.rule}-${rule.label}`}
              className="rounded-full border border-orange-100 bg-orange-50 px-2 py-1 text-[10px] font-medium text-orange-700"
              title={`${rule.label} (${rule.percentage > 0 ? "+" : ""}${(rule.percentage * 100).toFixed(0)}%)`}
            >
              {rule.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}