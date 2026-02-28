import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation, useParams } from "wouter";
import { ChevronLeft, Star, Clock, Wrench, Search } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityServiceCategory, CityService } from "@shared/schema";

type SortOption = "relevance" | "rating" | "price_low" | "price_high";

const sortOptions: { value: SortOption; label: string }[] = [
  { value: "relevance", label: "Relevance" },
  { value: "rating", label: "Rating" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
];

export default function ServicesCategoryPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: category } = useQuery<CityServiceCategory>({
    queryKey: ["/api/city-services/categories", params.id],
    enabled: false,
  });

  const { data: allCategories = [] } = useQuery<CityServiceCategory[]>({
    queryKey: ["/api/city-services/categories"],
  });

  const currentCategory = category || allCategories.find((c) => c.id === params.id);

  const { data: services = [], isLoading } = useQuery<CityService[]>({
    queryKey: ["/api/city-services/services", { categoryId: params.id }],
    queryFn: async () => {
      const res = await fetch(`/api/city-services/services?categoryId=${params.id}`);
      if (!res.ok) throw new Error("Failed to fetch services");
      return res.json();
    },
  });

  const activeServices = services.filter((s) => s.isActive);

  const filtered = searchQuery
    ? activeServices.filter((s) =>
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : activeServices;

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "rating") return parseFloat(b.rating || "0") - parseFloat(a.rating || "0");
    if (sortBy === "price_low") return parseFloat(a.price) - parseFloat(b.price);
    if (sortBy === "price_high") return parseFloat(b.price) - parseFloat(a.price);
    return 0;
  });

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-[#1a0533] dark:bg-[#0f0120] text-white border-b border-purple-900/30">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80"
            onClick={() => setLocation("/services")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate text-white" data-testid="text-category-title">
              {currentCategory?.name || "Services"}
            </h1>
          </div>
        </div>

        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50 focus:bg-white/15 rounded-full"
              data-testid="input-search-services"
            />
          </div>
        </div>

        <div className="px-4 pb-3 max-w-lg mx-auto">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {sortOptions.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={sortBy === opt.value ? "default" : "outline"}
                className={`rounded-full whitespace-nowrap flex-shrink-0 ${
                  sortBy === opt.value
                    ? "bg-white text-[#1a0533]"
                    : "bg-transparent text-white/80 border-white/30"
                }`}
                onClick={() => setSortBy(opt.value)}
                data-testid={`button-sort-${opt.value}`}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {currentCategory?.description && (
          <p className="text-sm text-muted-foreground" data-testid="text-category-description">
            {currentCategory.description}
          </p>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array(5)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="flex gap-4">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                      <Skeleton className="h-4 w-1/4" />
                      <Skeleton className="h-5 w-1/3" />
                    </div>
                    <Skeleton className="w-24 h-24 rounded-md flex-shrink-0" />
                  </div>
                </Card>
              ))}
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Wrench className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="font-semibold text-foreground" data-testid="text-no-services">
              No services available
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {searchQuery ? "Try a different search term" : "Check back later for new services"}
            </p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/services")}
              data-testid="button-browse-services"
            >
              Browse All Services
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground" data-testid="text-service-count">
              {sorted.length} service{sorted.length !== 1 ? "s" : ""} available
            </p>
            {sorted.map((service) => {
              const rating = parseFloat(service.rating || "4.0");
              const price = parseFloat(service.price || "0");
              const reviewCount = service.reviewCount || 0;

              return (
                <Card
                  key={service.id}
                  className="p-4"
                  data-testid={`card-service-${service.id}`}
                >
                  <div className="flex gap-4">
                    <div className="flex-1 min-w-0">
                      <h3
                        className="font-semibold text-foreground leading-tight"
                        data-testid={`text-service-name-${service.id}`}
                      >
                        {service.name}
                      </h3>

                      {service.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {service.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        <div className="flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                          <span className="text-xs font-semibold">{rating.toFixed(1)}</span>
                          {reviewCount > 0 && (
                            <span className="text-xs text-muted-foreground">
                              ({reviewCount} review{reviewCount !== 1 ? "s" : ""})
                            </span>
                          )}
                        </div>
                        {service.duration && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">{service.duration}</span>
                          </div>
                        )}
                      </div>

                      <p className="text-base font-bold mt-2" data-testid={`text-service-price-${service.id}`}>
                        ₹{price.toFixed(0)}
                      </p>

                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        <Link href={`/services/book/${service.id}`}>
                          <Button
                            size="sm"
                            className="rounded-full"
                            data-testid={`button-add-service-${service.id}`}
                          >
                            Add
                          </Button>
                        </Link>
                        <Link href={`/services/book/${service.id}`}>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-full text-xs"
                            data-testid={`button-view-details-${service.id}`}
                          >
                            View Details
                          </Button>
                        </Link>
                      </div>
                    </div>

                    <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
                      {service.image ? (
                        <img
                          src={service.image}
                          alt={service.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center">
                          <Wrench className="h-8 w-8 text-primary/40" />
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
