import { useQuery, useQueries } from "@tanstack/react-query";

export type FoodDynamicPriceResponse = {
  itemId: string;
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
  distanceKm: number | null;
};

function buildFoodDynamicPriceUrl(itemId: string, lat?: number | null, lng?: number | null) {
  const params = new URLSearchParams();
  if (lat != null) {
    params.set("lat", String(lat));
  }
  if (lng != null) {
    params.set("lng", String(lng));
  }

  const queryString = params.toString();
  return `/api/food/menu-items/${itemId}/dynamic-price${queryString ? `?${queryString}` : ""}`;
}

async function fetchFoodDynamicPrice(itemId: string, lat?: number | null, lng?: number | null) {
  const response = await fetch(buildFoodDynamicPriceUrl(itemId, lat, lng), {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error("Failed to fetch food dynamic price");
  }

  return (await response.json()) as FoodDynamicPriceResponse;
}

export function useFoodDynamicPrice(itemId: string, fallbackBasePrice: number, lat?: number | null, lng?: number | null) {
  return useQuery<FoodDynamicPriceResponse>({
    queryKey: ["food-dynamic-price", itemId, lat ?? null, lng ?? null],
    enabled: Boolean(itemId),
    queryFn: () => fetchFoodDynamicPrice(itemId, lat, lng),
    staleTime: 30_000,
    refetchInterval: 45_000,
    placeholderData: {
      itemId,
      basePrice: fallbackBasePrice,
      dynamicPrice: fallbackBasePrice,
      percentageChange: 0,
      appliedRules: [],
      cached: true,
      distanceKm: null,
    },
  });
}

export function useFoodDynamicPrices(items: Array<{ itemId: string; fallbackBasePrice: number }>, lat?: number | null, lng?: number | null) {
  const queries = useQueries({
    queries: items.map((item) => ({
      queryKey: ["food-dynamic-price", item.itemId, lat ?? null, lng ?? null],
      queryFn: () => fetchFoodDynamicPrice(item.itemId, lat, lng),
      enabled: Boolean(item.itemId),
      staleTime: 30_000,
      refetchInterval: 45_000,
      placeholderData: {
        itemId: item.itemId,
        basePrice: item.fallbackBasePrice,
        dynamicPrice: item.fallbackBasePrice,
        percentageChange: 0,
        appliedRules: [],
        cached: true,
        distanceKm: null,
      } satisfies FoodDynamicPriceResponse,
    })),
  });

  return new Map(
    queries.map((query, index) => [items[index].itemId, query.data as FoodDynamicPriceResponse | undefined]),
  );
}

export async function postFoodDemandSignal(itemId: string, action: "view" | "add_to_cart" | "purchase", delta?: number) {
  await fetch(`/api/food/menu-items/${itemId}/update-demand`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({ action, delta }),
  }).catch(() => undefined);
}