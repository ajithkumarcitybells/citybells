import { useQuery } from "@tanstack/react-query";
import { useDeliveryLocation } from "@/hooks/use-delivery-location";

type DynamicPriceResponse = {
  basePrice: number;
  dynamicPrice: number;
  percentageChange: number;
  appliedRules: Array<{
    rule: string;
    label: string;
    percentage: number;
    amount: number;
  }>;
  cached: boolean;
};

type DynamicPriceProps = {
  productId: string;
  fallbackBasePrice: number;
  fallbackDynamicPrice?: number;
  unitLabel?: string;
  compact?: boolean;
  showRuleSummary?: boolean;
  className?: string;
};

function formatCurrency(value: number) {
  return `₹${value.toFixed(2)}`;
}

export function DynamicPrice({
  productId,
  fallbackBasePrice,
  fallbackDynamicPrice,
  unitLabel,
  compact = false,
  showRuleSummary = true,
  className,
}: DynamicPriceProps) {
  const { selectedLocation } = useDeliveryLocation();
  const location = selectedLocation?.city || selectedLocation?.pincode || "";

  const { data } = useQuery<DynamicPriceResponse>({
    queryKey: ["dynamic-price", productId, location],
    enabled: Boolean(productId),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (location) {
        params.set("location", location);
      }

      const response = await fetch(`/api/products/${productId}/dynamic-price?${params.toString()}`, {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to fetch dynamic price");
      }

      return response.json();
    },
    staleTime: 30_000,
    refetchInterval: 45_000,
  });

  const basePrice = data?.basePrice ?? fallbackBasePrice;
  const dynamicPrice = data?.dynamicPrice ?? fallbackDynamicPrice ?? fallbackBasePrice;
  const priceChanged = Math.abs(dynamicPrice - basePrice) >= 0.01;
  const isDiscount = dynamicPrice < basePrice;
  const highlightClass = isDiscount ? "text-green-700 bg-green-50 border-green-100" : "text-amber-700 bg-amber-50 border-amber-100";
  const summary = data?.appliedRules?.slice(0, compact ? 1 : 2).map((rule) => rule.label).join(" • ");

  return (
    <div className={className}>
      <div className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 ${highlightClass}`}>
        <span className={`${compact ? "text-base" : "text-xl"} font-bold`}>
          {formatCurrency(dynamicPrice)}
        </span>
        {priceChanged ? (
          <span className={`${compact ? "text-xs" : "text-sm"} text-gray-500 line-through`}>
            {formatCurrency(basePrice)}
          </span>
        ) : (
          <span className={`${compact ? "text-[11px]" : "text-xs"} font-medium uppercase tracking-wide text-gray-500`}>
            Base price
          </span>
        )}
      </div>

      {unitLabel ? (
        <p className="mt-1 text-xs text-gray-400">per {unitLabel} price</p>
      ) : null}

      {showRuleSummary ? (
        <p className="mt-2 text-xs text-gray-500">
          {summary || "Live pricing refreshes automatically every 45 seconds."}
        </p>
      ) : null}
    </div>
  );
}