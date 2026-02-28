import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, Star, Clock, ChevronLeft, Leaf } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FoodRestaurant } from "@shared/schema";

const cuisineFilters = [
  "All", "North Indian", "South Indian", "Chinese", "Italian",
  "Fast Food", "Biryani", "Pizza", "Desserts", "Beverages",
];

function RestaurantCard({ restaurant }: { restaurant: FoodRestaurant }) {
  const rating = parseFloat(restaurant.rating || "4.0");
  const cuisines = (restaurant.cuisine as string[]) || [];

  return (
    <Link href={`/food/restaurant/${restaurant.id}`}>
      <Card
        className="overflow-hidden border-gray-100 cursor-pointer"
        data-testid={`card-restaurant-${restaurant.id}`}
      >
        <div className="relative aspect-[16/9] bg-gray-100">
          {restaurant.image ? (
            <img
              src={restaurant.image}
              alt={restaurant.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-orange-100 to-red-100" />
          )}
          <div className="absolute top-2 right-2">
            <Badge className="bg-green-600 text-white border-green-700 gap-1">
              <Star className="h-3 w-3 fill-white" />
              {rating.toFixed(1)}
            </Badge>
          </div>
          {restaurant.deliveryTime && (
            <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-md px-2 py-1 flex items-center gap-1">
              <Clock className="h-3 w-3 text-gray-600" />
              <span className="text-xs font-medium text-gray-700" data-testid={`text-delivery-time-${restaurant.id}`}>
                {restaurant.deliveryTime}
              </span>
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold text-gray-800 text-sm" data-testid={`text-restaurant-name-${restaurant.id}`}>
            {restaurant.name}
          </h3>
          {cuisines.length > 0 && (
            <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">
              {cuisines.join(", ")}
            </p>
          )}
          {restaurant.minOrder && (
            <p className="text-xs text-gray-400 mt-1">
              Min order: ₹{parseFloat(restaurant.minOrder).toFixed(0)}
            </p>
          )}
        </div>
      </Card>
    </Link>
  );
}

export default function FoodHomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCuisine, setSelectedCuisine] = useState("All");
  const [, setLocation] = useLocation();

  const { data: restaurants = [], isLoading } = useQuery<FoodRestaurant[]>({
    queryKey: ["/api/food/restaurants"],
  });

  const filtered = restaurants.filter((r) => {
    if (!r.isActive) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = r.name.toLowerCase().includes(q);
      const cuisineMatch = ((r.cuisine as string[]) || []).some((c) =>
        c.toLowerCase().includes(q)
      );
      if (!nameMatch && !cuisineMatch) return false;
    }
    if (selectedCuisine !== "All") {
      const cuisines = (r.cuisine as string[]) || [];
      if (!cuisines.some((c) => c.toLowerCase().includes(selectedCuisine.toLowerCase())))
        return false;
    }
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Food Delivery</h1>
            <p className="text-xs text-gray-500">Order from your favourite restaurants</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
          }}
          className="relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search restaurants or cuisines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200"
            data-testid="input-food-search"
          />
        </form>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
          {cuisineFilters.map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCuisine(c)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                selectedCuisine === c
                  ? "bg-orange-500 text-white border-orange-500"
                  : "bg-white text-gray-600 border-gray-200"
              }`}
              data-testid={`button-cuisine-${c.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {c}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array(4)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="aspect-[16/9]" />
                  <div className="p-3 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                </Card>
              ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium" data-testid="text-no-restaurants">No restaurants found</p>
            <p className="text-gray-400 text-sm mt-1">Try a different search or cuisine</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <RestaurantCard key={r.id} restaurant={r} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
