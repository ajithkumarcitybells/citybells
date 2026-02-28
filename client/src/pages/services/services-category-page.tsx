import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ChevronLeft, Star, Clock, ArrowRight, Wrench, SlidersHorizontal } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityServiceCategory, CityService } from "@shared/schema";

type SortOption = "rating" | "price_low" | "price_high";

export default function ServicesCategoryPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState<SortOption>("rating");
  const [showSort, setShowSort] = useState(false);

  const { data: category } = useQuery<CityServiceCategory>({
    queryKey: ["/api/city-services/categories", params.id],
    enabled: false,
  });

  const { data: allCategories = [] } = useQuery<CityServiceCategory[]>({
    queryKey: ["/api/city-services/categories"],
  });

  const currentCategory = category || allCategories.find((c) => c.id === params.id);

  const { data: services = [], isLoading } = useQuery<CityService[]>({
    queryKey: [`/api/city-services/services?categoryId=${params.id}`],
  });

  const activeServices = services.filter((s) => s.isActive);
  const sorted = [...activeServices].sort((a, b) => {
    if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
    if (sortBy === "price_low") return parseFloat(a.price) - parseFloat(b.price);
    return parseFloat(b.price) - parseFloat(a.price);
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/services")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-category-title">
              {currentCategory?.name || "Services"}
            </h1>
            {currentCategory?.description && (
              <p className="text-xs text-gray-500 line-clamp-1">{currentCategory.description}</p>
            )}
          </div>
          <button
            onClick={() => setShowSort(!showSort)}
            className="p-2 rounded-md border border-gray-200"
            data-testid="button-sort"
          >
            <SlidersHorizontal className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </header>

      {showSort && (
        <div className="bg-white border-b border-gray-100 px-4 py-2 max-w-lg mx-auto">
          <div className="flex gap-2">
            {([
              { value: "rating" as SortOption, label: "Top Rated" },
              { value: "price_low" as SortOption, label: "Price: Low" },
              { value: "price_high" as SortOption, label: "Price: High" },
            ] as const).map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setSortBy(opt.value);
                  setShowSort(false);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  sortBy === opt.value
                    ? "bg-blue-500 text-white border-blue-500"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
                data-testid={`button-sort-${opt.value}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="flex gap-3 p-3">
                    <Skeleton className="w-20 h-20 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/3" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </div>
                  </div>
                </Card>
              ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium" data-testid="text-no-services">No services available</p>
            <p className="text-gray-400 text-sm mt-1">Check back later for new services</p>
          </div>
        ) : (
          sorted.map((service) => {
            const rating = parseFloat(service.rating || "4.0");
            const price = parseFloat(service.price || "0");

            return (
              <Link key={service.id} href={`/services/book/${service.id}`}>
                <Card
                  className="overflow-hidden border-gray-100 cursor-pointer"
                  data-testid={`card-service-${service.id}`}
                >
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                      {service.image ? (
                        <img src={service.image} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                          <Wrench className="h-6 w-6 text-blue-400" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 text-sm" data-testid={`text-service-name-${service.id}`}>
                        {service.name}
                      </h3>
                      {service.description && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5">
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-medium text-gray-700">{rating.toFixed(1)}</span>
                          {(service.reviewCount || 0) > 0 && (
                            <span className="text-xs text-gray-400">({service.reviewCount})</span>
                          )}
                        </div>
                        {service.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-400" />
                            <span className="text-xs text-gray-500">{service.duration}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-sm font-bold text-gray-800 mt-1">₹{price.toFixed(0)}</p>
                    </div>
                    <div className="flex items-center">
                      <ArrowRight className="h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
}
