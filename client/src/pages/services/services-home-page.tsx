import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, ChevronLeft, Wrench, Star, Clock, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { CityServiceCategory, CityService } from "@shared/schema";

function CategoryCard({ category }: { category: CityServiceCategory }) {
  return (
    <Link href={`/services/category/${category.id}`}>
      <Card
        className="overflow-hidden border-gray-100 cursor-pointer"
        data-testid={`card-service-category-${category.id}`}
      >
        <div className="relative aspect-square bg-gray-100">
          {category.image ? (
            <img
              src={category.image}
              alt={category.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
              <Wrench className="h-8 w-8 text-blue-400" />
            </div>
          )}
        </div>
        <div className="p-2 text-center">
          <h3 className="font-medium text-gray-800 text-xs line-clamp-2" data-testid={`text-category-name-${category.id}`}>
            {category.name}
          </h3>
        </div>
      </Card>
    </Link>
  );
}

function ServiceListItem({ service }: { service: CityService }) {
  const rating = parseFloat(service.rating || "4.0");
  const price = parseFloat(service.price || "0");

  return (
    <Link href={`/services/book/${service.id}`}>
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
            <p className="text-sm font-bold text-gray-800 mt-1" data-testid={`text-service-price-${service.id}`}>
              ₹{price.toFixed(0)}
            </p>
          </div>
          <div className="flex items-center">
            <ArrowRight className="h-4 w-4 text-gray-400" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function ServicesHomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: categories = [], isLoading: loadingCategories } = useQuery<CityServiceCategory[]>({
    queryKey: ["/api/city-services/categories"],
  });

  const { data: allServices = [], isLoading: loadingServices } = useQuery<CityService[]>({
    queryKey: ["/api/city-services/services"],
  });

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
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">City Services</h1>
            <p className="text-xs text-gray-500">Home services at your doorstep</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-5">
        <form onSubmit={(e) => e.preventDefault()} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search for services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200"
            data-testid="input-services-search"
          />
        </form>

        {searchQuery ? (
          <div className="space-y-3">
            <h2 className="font-semibold text-gray-800 text-sm" data-testid="text-search-results-title">
              Search Results ({searchResults.length})
            </h2>
            {searchResults.length === 0 ? (
              <div className="text-center py-12">
                <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium" data-testid="text-no-results">No services found</p>
                <p className="text-gray-400 text-sm mt-1">Try a different search term</p>
              </div>
            ) : (
              searchResults.map((s) => <ServiceListItem key={s.id} service={s} />)
            )}
          </div>
        ) : (
          <>
            <div>
              <h2 className="font-semibold text-gray-800 text-sm mb-3" data-testid="text-categories-title">
                Service Categories
              </h2>
              {loadingCategories ? (
                <div className="grid grid-cols-3 gap-3">
                  {Array(6)
                    .fill(0)
                    .map((_, i) => (
                      <Card key={i} className="overflow-hidden">
                        <Skeleton className="aspect-square" />
                        <div className="p-2">
                          <Skeleton className="h-3 w-full" />
                        </div>
                      </Card>
                    ))}
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-400 text-sm">No categories available</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {categories.map((cat) => (
                    <CategoryCard key={cat.id} category={cat} />
                  ))}
                </div>
              )}
            </div>

            {popularServices.length > 0 && (
              <div>
                <h2 className="font-semibold text-gray-800 text-sm mb-3" data-testid="text-popular-title">
                  Popular Services
                </h2>
                {loadingServices ? (
                  <div className="space-y-3">
                    {Array(3)
                      .fill(0)
                      .map((_, i) => (
                        <Card key={i} className="overflow-hidden">
                          <div className="flex gap-3 p-3">
                            <Skeleton className="w-20 h-20 rounded-md" />
                            <div className="flex-1 space-y-2">
                              <Skeleton className="h-4 w-2/3" />
                              <Skeleton className="h-3 w-1/2" />
                              <Skeleton className="h-4 w-1/4" />
                            </div>
                          </div>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {popularServices.map((s) => (
                      <ServiceListItem key={s.id} service={s} />
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
