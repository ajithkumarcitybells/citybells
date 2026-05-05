import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  FOOD_PERSONALIZATION_UPDATED_EVENT,
  getFoodBehaviorSnapshot,
  type TrackedFoodItem,
} from "@/lib/food-personalization";

export type FoodRecommendationItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  restaurantImage?: string;
  restaurantRating: number;
  name: string;
  description?: string;
  category?: string;
  cuisine: string[];
  image?: string;
  price: number;
  rating: number;
  reviewCount: number;
  isVeg: boolean;
  isSpicy: boolean;
  deliveryTime: number;
  deliveryFee: number;
  distanceKm?: number;
  badges: string[];
  reason: string;
  offerText?: string;
};

type RecommendationSectionResult = {
  items: FoodRecommendationItem[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

type UserRecommendationResponse = {
  recommendedForYou: RecommendationSectionResult;
  popularNearYou: RecommendationSectionResult;
  trendingNow: RecommendationSectionResult;
  becauseYouOrdered: RecommendationSectionResult;
  generatedAt: string;
};

type SectionDescriptor = {
  key: string;
  title: string;
  subtitle: string;
  items: FoodRecommendationItem[];
};

function toRecommendationItem(item: TrackedFoodItem): FoodRecommendationItem {
  return {
    id: item.id,
    restaurantId: item.restaurantId,
    restaurantName: item.restaurantName,
    restaurantRating: item.rating,
    name: item.name,
    image: item.image,
    price: Number(item.price ?? 0),
    rating: Number(item.rating ?? 0),
    reviewCount: Number(item.reviewCount ?? 0),
    category: item.category,
    cuisine: item.cuisine ?? [],
    isVeg: Boolean(item.isVeg),
    isSpicy: Boolean(item.isSpicy),
    deliveryTime: 0,
    deliveryFee: 0,
    badges: ["Recently Viewed"],
    reason: "Based on items you viewed recently",
  };
}

async function fetchJson<T>(url: string) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}`);
  }

  return (await response.json()) as T;
}

export function useFoodRecommendations(options: { lat?: number | null; lng?: number | null; enabled?: boolean }) {
  const { user } = useAuth();
  const [snapshotVersion, setSnapshotVersion] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleUpdate = () => setSnapshotVersion((current) => current + 1);

    window.addEventListener(FOOD_PERSONALIZATION_UPDATED_EVENT, handleUpdate);
    window.addEventListener("storage", handleUpdate);

    return () => {
      window.removeEventListener(FOOD_PERSONALIZATION_UPDATED_EVENT, handleUpdate);
      window.removeEventListener("storage", handleUpdate);
    };
  }, []);

  const behaviorSnapshot = useMemo(() => getFoodBehaviorSnapshot(), [snapshotVersion]);
  const lat = options.lat ?? undefined;
  const lng = options.lng ?? undefined;
  const enabled = options.enabled ?? true;

  const userRecommendationsQuery = useQuery<UserRecommendationResponse>({
    queryKey: [
      "food-recommendations",
      "user",
      user?._id,
      lat,
      lng,
      behaviorSnapshot.recentItemIds.join(","),
      behaviorSnapshot.favoriteItemIds.join(","),
      behaviorSnapshot.searchTerms.join(","),
    ],
    enabled: enabled && Boolean(user?._id),
    queryFn: async () => {
      const params = new URLSearchParams();

      if (lat !== undefined) {
        params.set("lat", String(lat));
      }
      if (lng !== undefined) {
        params.set("lng", String(lng));
      }
      if (behaviorSnapshot.recentItemIds.length > 0) {
        params.set("recentItemIds", behaviorSnapshot.recentItemIds.join(","));
      }
      if (behaviorSnapshot.favoriteItemIds.length > 0) {
        params.set("favoriteItemIds", behaviorSnapshot.favoriteItemIds.join(","));
      }
      if (behaviorSnapshot.searchTerms.length > 0) {
        params.set("searchTerms", behaviorSnapshot.searchTerms.join(","));
      }

      return fetchJson<UserRecommendationResponse>(`/api/recommendations/user/${user!._id}?${params.toString()}`);
    },
  });

  const trendingQuery = useQuery<RecommendationSectionResult>({
    queryKey: ["food-recommendations", "trending"],
    enabled,
    queryFn: () => fetchJson<RecommendationSectionResult>("/api/recommendations/trending"),
  });

  const locationQuery = useQuery<RecommendationSectionResult>({
    queryKey: ["food-recommendations", "location", lat, lng],
    enabled: enabled && lat !== undefined && lng !== undefined,
    queryFn: () => fetchJson<RecommendationSectionResult>(`/api/recommendations/location?lat=${lat}&lng=${lng}`),
  });

  const sections = useMemo<SectionDescriptor[]>(() => {
    if (userRecommendationsQuery.data) {
      return [
        {
          key: "recommended-for-you",
          title: "Recommended For You",
          subtitle: "Personalized using orders, favorites, views, and searches",
          items: userRecommendationsQuery.data.recommendedForYou.items,
        },
        {
          key: "popular-near-you",
          title: "Popular Near You",
          subtitle: "Strong performers near your current location",
          items: userRecommendationsQuery.data.popularNearYou.items,
        },
        {
          key: "trending-now",
          title: "Trending Now",
          subtitle: "Recent orders are pushing these dishes up",
          items: userRecommendationsQuery.data.trendingNow.items,
        },
        {
          key: "because-you-ordered",
          title: "Because You Ordered",
          subtitle: "Similar dishes, cuisines, and restaurants from your history",
          items: userRecommendationsQuery.data.becauseYouOrdered.items,
        },
      ].filter((section) => section.items.length > 0);
    }

    const localRecommended = [
      ...behaviorSnapshot.favoriteItems.map(toRecommendationItem),
      ...behaviorSnapshot.viewedItems.map(toRecommendationItem),
    ].filter((item, index, array) => array.findIndex((entry) => entry.id === item.id) === index);

    return [
      {
        key: "recommended-for-you",
        title: "Recommended For You",
        subtitle: "Built from your recent views and favorites on this device",
        items: localRecommended.slice(0, 10),
      },
      {
        key: "popular-near-you",
        title: "Popular Near You",
        subtitle: "Local favorites around your current delivery area",
        items: locationQuery.data?.items ?? [],
      },
      {
        key: "trending-now",
        title: "Trending Now",
        subtitle: "Currently popular across food delivery orders",
        items: trendingQuery.data?.items ?? [],
      },
    ].filter((section) => section.items.length > 0);
  }, [behaviorSnapshot.favoriteItems, behaviorSnapshot.viewedItems, locationQuery.data, trendingQuery.data, userRecommendationsQuery.data]);

  return {
    sections,
    isLoading: userRecommendationsQuery.isLoading || trendingQuery.isLoading || locationQuery.isLoading,
  };
}