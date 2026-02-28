import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, MapPin, User, Star, Clock, ArrowRight, Wrench, Sparkles, Shield, Zap } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityServiceCategory, CityService } from "@shared/schema";

function CircleCategoryCard({ category }: { category: CityServiceCategory }) {
  return (
    <Link href={`/services/category/${category.id}`}>
      <div
        className="flex flex-col items-center gap-1.5 cursor-pointer group"
        data-testid={`card-service-category-${category.id}`}
      >
        <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-50 dark:bg-purple-900/30 border-2 border-purple-100 dark:border-purple-800 flex items-center justify-center transition-transform group-hover:scale-105">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <Wrench className="h-6 w-6 text-purple-500 dark:text-purple-400" />
          )}
        </div>
        <span
          className="text-xs text-center font-medium text-foreground/80 line-clamp-2 leading-tight max-w-[72px]"
          data-testid={`text-category-name-${category.id}`}
        >
          {category.name}
        </span>
      </div>
    </Link>
  );
}

function MostBookedServiceCard({ service }: { service: CityService }) {
  const rating = parseFloat(service.rating || "4.0");
  const price = parseFloat(service.price || "0");

  return (
    <Link href={`/services/book/${service.id}`}>
      <Card
        className="w-44 flex-shrink-0 overflow-visible cursor-pointer hover-elevate"
        data-testid={`card-most-booked-${service.id}`}
      >
        <div className="relative h-28 rounded-t-md overflow-hidden bg-muted">
          {service.image ? (
            <img src={service.image} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
              <Wrench className="h-8 w-8 text-purple-400" />
            </div>
          )}
        </div>
        <div className="p-2.5">
          <h3 className="font-semibold text-sm text-foreground line-clamp-1" data-testid={`text-service-name-${service.id}`}>
            {service.name}
          </h3>
          <div className="flex items-center gap-1 mt-1">
            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
            <span className="text-xs font-medium text-foreground/70">{rating.toFixed(1)}</span>
            {(service.reviewCount || 0) > 0 && (
              <span className="text-xs text-muted-foreground">({service.reviewCount})</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-1 mt-2">
            <span className="text-sm font-bold text-foreground" data-testid={`text-service-price-${service.id}`}>
              ₹{price.toFixed(0)}
            </span>
            <Button size="sm" className="h-7 px-3 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded-full" data-testid={`button-book-${service.id}`}>
              Book
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function PopularServiceCard({ service }: { service: CityService }) {
  const rating = parseFloat(service.rating || "4.0");
  const price = parseFloat(service.price || "0");

  return (
    <Link href={`/services/book/${service.id}`}>
      <Card
        className="overflow-visible cursor-pointer hover-elevate"
        data-testid={`card-service-${service.id}`}
      >
        <div className="flex gap-3 p-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-sm" data-testid={`text-popular-name-${service.id}`}>
              {service.name}
            </h3>
            {service.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{service.description}</p>
            )}
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                <span className="text-xs font-medium text-foreground/70">{rating.toFixed(1)}</span>
                {(service.reviewCount || 0) > 0 && (
                  <span className="text-xs text-muted-foreground">({service.reviewCount})</span>
                )}
              </div>
              {service.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{service.duration}</span>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-sm font-bold text-foreground">₹{price.toFixed(0)}</span>
              <Button size="sm" className="h-7 px-4 text-xs bg-purple-700 hover:bg-purple-800 text-white rounded-full" data-testid={`button-add-service-${service.id}`}>
                Add
              </Button>
            </div>
          </div>
          <div className="w-24 h-24 rounded-md overflow-hidden bg-muted flex-shrink-0">
            {service.image ? (
              <img src={service.image} alt={service.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 flex items-center justify-center">
                <Wrench className="h-6 w-6 text-purple-400" />
              </div>
            )}
          </div>
        </div>
      </Card>
    </Link>
  );
}

const promoBanners = [
  {
    id: 1,
    title: "50% Off",
    subtitle: "on your first booking",
    gradient: "from-purple-600 to-indigo-700",
    icon: Sparkles,
  },
  {
    id: 2,
    title: "AC Service",
    subtitle: "Starting at ₹299",
    gradient: "from-emerald-600 to-teal-700",
    icon: Zap,
  },
  {
    id: 3,
    title: "Safe & Verified",
    subtitle: "All professionals verified",
    gradient: "from-amber-600 to-orange-700",
    icon: Shield,
  },
];

export default function ServicesHomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: categories = [], isLoading: loadingCategories } = useQuery<CityServiceCategory[]>({
    queryKey: ["/api/city-services/categories"],
  });

  const { data: allServices = [], isLoading: loadingServices } = useQuery<CityService[]>({
    queryKey: ["/api/city-services/services"],
  });

  const mostBookedServices = allServices
    .filter((s) => s.isActive)
    .sort((a, b) => (b.reviewCount || 0) - (a.reviewCount || 0))
    .slice(0, 8);

  const popularServices = allServices
    .filter((s) => s.isActive)
    .sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"))
    .slice(0, 6);

  const searchResults = searchQuery
    ? allServices.filter(
        (s) =>
          s.isActive &&
          (s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (s.description || "").toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : [];

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-[#1a0533] text-white">
        <div className="flex items-center justify-between gap-3 px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-purple-300" />
            <div>
              <h1 className="text-base font-bold leading-tight" data-testid="text-page-title">City Bell</h1>
              <p className="text-xs text-purple-200/70">Home services at your doorstep</p>
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setLocation("/profile")}
            className="w-9 h-9 rounded-full bg-white/10 text-purple-200"
            data-testid="button-profile"
          >
            <User className="h-5 w-5" />
          </Button>
        </div>

        <div className="px-4 pb-4 max-w-lg mx-auto">
          <form onSubmit={(e) => e.preventDefault()} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search for services..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-purple-200/50 focus:bg-white/15 rounded-full"
              data-testid="input-services-search"
            />
          </form>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        {searchQuery ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-foreground text-sm" data-testid="text-search-results-title">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-foreground font-medium" data-testid="text-no-results">No services found</p>
                <p className="text-muted-foreground text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              searchResults.map((s) => <PopularServiceCard key={s.id} service={s} />)
            )}
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-semibold text-foreground text-sm mb-3" data-testid="text-categories-title">
                Service Categories
              </h2>
              {loadingCategories ? (
                <div className="grid grid-cols-4 gap-4">
                  {Array(8)
                    .fill(0)
                    .map((_, i) => (
                      <div key={i} className="flex flex-col items-center gap-1.5">
                        <Skeleton className="w-16 h-16 rounded-full" />
                        <Skeleton className="h-3 w-12" />
                      </div>
                    ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">No categories available</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-4">
                  {categories.map((cat) => (
                    <CircleCategoryCard key={cat.id} category={cat} />
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
                {promoBanners.map((banner) => (
                  <div
                    key={banner.id}
                    className={`flex-shrink-0 w-56 rounded-md bg-gradient-to-r ${banner.gradient} p-4 text-white`}
                    data-testid={`banner-promo-${banner.id}`}
                  >
                    <banner.icon className="h-6 w-6 mb-2 opacity-80" />
                    <p className="font-bold text-base leading-tight">{banner.title}</p>
                    <p className="text-xs text-white/80 mt-0.5">{banner.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>

            {mostBookedServices.length > 0 && (
              <div>
                <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                  <h2 className="font-semibold text-foreground text-sm" data-testid="text-most-booked-title">
                    Most Booked Services
                  </h2>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-purple-600 dark:text-purple-400 font-medium h-auto py-1 px-2"
                    data-testid="button-view-all-booked"
                  >
                    View All <ArrowRight className="h-3 w-3 ml-0.5" />
                  </Button>
                </div>
                {loadingServices ? (
                  <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4">
                    {Array(4)
                      .fill(0)
                      .map((_, i) => (
                        <div key={i} className="w-44 flex-shrink-0">
                          <Skeleton className="h-28 rounded-t-md" />
                          <div className="p-2.5 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-6 w-full" />
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="flex overflow-x-auto gap-3 pb-2 -mx-4 px-4 scrollbar-hide">
                    {mostBookedServices.map((s) => (
                      <MostBookedServiceCard key={s.id} service={s} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {popularServices.length > 0 && (
              <div>
                <h2 className="font-semibold text-foreground text-sm mb-3" data-testid="text-popular-title">
                  Popular Services
                </h2>
                {loadingServices ? (
                  <div className="space-y-3">
                    {Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <Card key={i}>
                          <div className="flex gap-3 p-3">
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-1/2" />
                              <Skeleton className="h-4 w-1/4" />
                            </div>
                            <Skeleton className="w-24 h-24 rounded-md" />
                          </div>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {popularServices.map((s) => (
                      <PopularServiceCard key={s.id} service={s} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
