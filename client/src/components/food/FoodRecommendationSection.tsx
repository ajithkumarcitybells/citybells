import { Heart, Plus, Star, Timer } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FoodDynamicPrice } from "@/components/food/FoodDynamicPrice";
import { useFoodDynamicPrice, postFoodDemandSignal } from "@/hooks/use-food-dynamic-price";
import { useToast } from "@/hooks/use-toast";
import { addFoodCartItem, snapshotFoodCartItem } from "@/lib/food-cart";
import {
  isFavoriteFoodItem,
  recordViewedFoodItem,
  toggleFavoriteFoodItem,
  type TrackedFoodItem,
} from "@/lib/food-personalization";
import { cn } from "@/lib/utils";
import type { FoodRecommendationItem } from "@/hooks/use-food-recommendations";

type FoodRecommendationSectionProps = {
  title: string;
  subtitle: string;
  items: FoodRecommendationItem[];
  lat?: number | null;
  lng?: number | null;
};

function toTrackedFoodItem(item: FoodRecommendationItem): TrackedFoodItem {
  return {
    id: item.id,
    restaurantId: item.restaurantId,
    restaurantName: item.restaurantName,
    name: item.name,
    image: item.image,
    price: item.price,
    rating: item.rating,
    reviewCount: item.reviewCount,
    category: item.category,
    cuisine: item.cuisine,
    isVeg: item.isVeg,
    isSpicy: item.isSpicy,
  };
}

function FoodRecommendationCard({ item, lat, lng }: { item: FoodRecommendationItem; lat?: number | null; lng?: number | null }) {
  const { toast } = useToast();
  const favorite = isFavoriteFoodItem(item.id);
  const { data: priceData } = useFoodDynamicPrice(item.id, item.price, lat, lng);
  const livePrice = priceData?.dynamicPrice ?? item.price;

  const handleView = () => {
    recordViewedFoodItem(toTrackedFoodItem(item));
    void postFoodDemandSignal(item.id, "view");
  };

  return (
    <Card className="w-[16.5rem] flex-shrink-0 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-[0_6px_18px_rgba(15,23,42,0.08)]">
      <div className="relative">
        <Link href={`/food/restaurant/${item.restaurantId}`}>
          <button
            type="button"
            className="block w-full text-left"
            onClick={handleView}
          >
            {item.image ? (
              <img src={item.image} alt={item.name} className="h-32 w-full object-cover" loading="lazy" />
            ) : (
              <div className="h-32 w-full bg-gradient-to-br from-orange-100 to-amber-100" />
            )}
          </button>
        </Link>
        <button
          type="button"
          onClick={() => {
            const nextFavorite = toggleFavoriteFoodItem(toTrackedFoodItem(item));
            toast({
              title: nextFavorite ? "Added to favorites" : "Removed from favorites",
              description: item.name,
            });
          }}
          className={cn(
            "absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 backdrop-blur transition-colors",
            favorite ? "border-rose-200 text-rose-500" : "border-white/40 text-gray-500",
          )}
          aria-label={favorite ? "Remove from favorites" : "Add to favorites"}
        >
          <Heart className={cn("h-4 w-4", favorite && "fill-current")} />
        </button>
        {item.badges.length > 0 ? (
          <div className="absolute left-3 top-3 flex max-w-[70%] flex-wrap gap-1">
            {item.badges.slice(0, 2).map((badge) => (
              <Badge key={badge} className="bg-black/70 text-white hover:bg-black/70">
                {badge}
              </Badge>
            ))}
          </div>
        ) : null}
      </div>

      <div className="space-y-2.5 p-3.5">
        <div>
          <Link href={`/food/restaurant/${item.restaurantId}`}>
            <button
              type="button"
              className="text-left"
              onClick={handleView}
            >
              <h3 className="line-clamp-1 text-[15px] font-semibold leading-tight text-gray-900">{item.name}</h3>
              <p className="mt-1 line-clamp-1 text-[11px] text-gray-500">{item.restaurantName}</p>
            </button>
          </Link>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {item.rating.toFixed(1)}
          </span>
          {item.deliveryTime > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Timer className="h-3.5 w-3.5 text-orange-500" />
              {item.deliveryTime} min
            </span>
          ) : null}
          {item.distanceKm !== undefined ? <span>{item.distanceKm.toFixed(1)} km</span> : null}
        </div>

        <p className="line-clamp-2 min-h-[32px] text-[11px] leading-4 text-gray-500">{item.reason}</p>

        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2.5 pt-1">
          <div className="min-w-0 overflow-hidden">
            <FoodDynamicPrice
              itemId={item.id}
              fallbackBasePrice={item.price}
              lat={lat}
              lng={lng}
              compact
              compactMode="minimal"
              showRuleSummary={false}
              showRuleBadges={false}
              showChangeBadge={false}
            />
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-400">Live price</p>
            {item.offerText ? <p className="mt-1 line-clamp-1 text-[10px] font-medium text-emerald-600">{item.offerText}</p> : null}
          </div>
          <Button
            type="button"
            size="sm"
            className="h-10 shrink-0 rounded-xl border border-orange-500 bg-white px-3 text-sm font-semibold text-orange-600 shadow-sm hover:bg-orange-50"
            onClick={() => {
              const result = addFoodCartItem(snapshotFoodCartItem({
                id: item.id,
                _id: item.id,
                restaurantId: item.restaurantId,
                name: item.name,
                description: item.description ?? "",
                price: String(item.price),
                category: item.category ?? "Recommended",
                image: item.image ?? "",
                isVeg: item.isVeg,
                isVegetarian: item.isVeg,
                isSpicy: item.isSpicy,
                rating: item.rating,
                reviewCount: item.reviewCount,
                isAvailable: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              } as any, livePrice));

              handleView();
              void postFoodDemandSignal(item.id, "add_to_cart");
              toast({
                title: result.replacedRestaurant ? "Started a new cart" : "Added to cart",
                description: result.replacedRestaurant
                  ? `${item.name} was added and the previous restaurant cart was replaced.`
                  : item.name,
              });
            }}
            data-testid={`button-recommendation-add-${item.id}`}
          >
            <Plus className="mr-1 h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">Add to Cart</span>
          </Button>
        </div>
      </div>
    </Card>
  );
}

export function FoodRecommendationSection({ title, subtitle, items, lat, lng }: FoodRecommendationSectionProps) {
  if (items.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3" data-testid={`section-${title.toLowerCase().replace(/\s+/g, "-")}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide">
        {items.map((item) => (
          <FoodRecommendationCard key={`${title}-${item.id}`} item={item} lat={lat} lng={lng} />
        ))}
      </div>
    </section>
  );
}