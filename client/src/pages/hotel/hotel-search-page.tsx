import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowUpDown,
  BedDouble,
  CalendarDays,
  Coffee,
  MapPin,
  Search,
  SlidersHorizontal,
  Sparkles,
  Star,
  Waves,
  Wifi,
  Wind,
  X,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { ActiveFilterChips } from "@/components/hotel/ActiveFilterChips";
import { HotelFilterBar } from "@/components/hotel/HotelFilterBar";
import { HotelFilterDrawer } from "@/components/hotel/HotelFilterDrawer";
import { HotelFilterPanel } from "@/components/hotel/HotelFilterPanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { apiRequest } from "@/lib/queryClient";
import {
  buildHotelFilterDataset,
  buildHotelFilterQuery,
  createDefaultHotelFilterState,
  getActiveHotelFilterTags,
  getHotelFilterBounds,
  parseHotelFilterState,
  sortHotels,
  type HotelFilterState,
} from "@/lib/hotel-filters";
import type { Hotel } from "@shared/schema";

function getRatingInfo(rating: number) {
  if (rating >= 4.5) return { text: "Excellent", color: "bg-slate-900" };
  if (rating >= 4.0) return { text: "Very Good", color: "bg-emerald-600" };
  if (rating >= 3.5) return { text: "Good", color: "bg-lime-600" };
  return { text: "Okay", color: "bg-slate-500" };
}

function getAmenityIcon(amenity: string) {
  const normalized = amenity.toLowerCase();
  if (normalized.includes("wifi") || normalized.includes("internet")) return Wifi;
  if (normalized.includes("ac") || normalized.includes("air")) return Wind;
  if (normalized.includes("breakfast") || normalized.includes("restaurant")) return Coffee;
  if (normalized.includes("pool")) return Waves;
  return Sparkles;
}

function HotelCardSkeleton() {
  return (
    <Card className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row">
        <Skeleton className="h-56 w-full md:h-auto md:w-72" />
        <div className="flex-1 space-y-4 p-5">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex gap-2">
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
            <Skeleton className="h-7 w-20 rounded-full" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
      </div>
    </Card>
  );
}

export default function HotelSearchPage() {
  const isMobile = useIsMobile();
  const [location] = useLocation();
  const params = useMemo(() => new URLSearchParams(location.split("?")[1] || ""), [location]);
  const initialApiCity = params.get("city") || "";
  const initialApiSearch = params.get("search") || initialApiCity;
  const [showSearch, setShowSearch] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(initialApiSearch);

  const [filters, setFilters] = useState<HotelFilterState>(() => {
    const parsed = parseHotelFilterState(params);
    return createDefaultHotelFilterState({ ...parsed, search: parsed.search || initialApiSearch });
  });
  const [debouncedFilters, setDebouncedFilters] = useState<HotelFilterState>(filters);
  const [isFilterPending, setIsFilterPending] = useState(false);

  const serverQuery = useMemo(() => buildHotelFilterQuery(debouncedFilters), [debouncedFilters]);

  const { data: hotels = [], isLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/hotels", serverQuery],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/hotels${serverQuery ? `?${serverQuery}` : ""}`);
      return res.json();
    },
    placeholderData: (previous) => previous,
  });

  const filterDataset = useMemo(() => buildHotelFilterDataset(hotels), [hotels]);
  const priceBounds = useMemo(() => getHotelFilterBounds(filterDataset), [filterDataset]);

  useEffect(() => {
    setFilters((current) => {
      const next = parseHotelFilterState(params, priceBounds);
      return {
        ...current,
        ...next,
        search: next.search || current.search || initialApiSearch,
        priceRange: current.priceRange[0] === current.priceRange[1]
          ? next.priceRange
          : [
              Math.max(priceBounds.min, current.priceRange[0]),
              Math.min(priceBounds.max, current.priceRange[1]),
            ],
      };
    });
  }, [initialApiSearch, params, priceBounds.max, priceBounds.min]);

  useEffect(() => {
    setSearchInput(filters.search);
  }, [filters.search]);

  useEffect(() => {
    setIsFilterPending(true);
    const timeoutId = window.setTimeout(() => {
      setDebouncedFilters(filters);
      setIsFilterPending(false);
    }, 220);

    return () => window.clearTimeout(timeoutId);
  }, [filters]);

  useEffect(() => {
    const query = buildHotelFilterQuery(filters);
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    window.history.replaceState(window.history.state, "", nextUrl);
  }, [filters]);

  const filteredHotels = useMemo(() => {
    return sortHotels(filterDataset, debouncedFilters.sortBy);
  }, [debouncedFilters, filterDataset]);

  const activeFilterTags = useMemo(() => getActiveHotelFilterTags(filters), [filters]);
  const availableAmenities = useMemo(() => {
    return Array.from(new Set(filterDataset.flatMap((hotel) => hotel.amenities))).sort();
  }, [filterDataset]);
  const availablePropertyTypes = useMemo(() => {
    return Array.from(new Set(filterDataset.map((hotel) => hotel.type))).sort() as HotelFilterState["propertyTypes"];
  }, [filterDataset]);
  const availableLocations = useMemo(() => {
    return Array.from(new Set(filterDataset.flatMap((hotel) => [hotel.city, hotel.location]).filter(Boolean))).sort();
  }, [filterDataset]);

  const updateFilters = (next: HotelFilterState) => {
    setFilters(next);
  };

  const clearAllFilters = () => {
    setFilters(createDefaultHotelFilterState({
      priceRange: [priceBounds.min, priceBounds.max],
    }));
    setSearchInput("");
  };

  const removeFilterTag = (key: string) => {
    if (key === "search") {
      setFilters((current) => ({ ...current, search: "" }));
      setSearchInput("");
      return;
    }

    if (key === "guestRating") {
      setFilters((current) => ({ ...current, guestRating: null }));
      return;
    }

    if (key === "price") {
      setFilters((current) => ({ ...current, priceRange: [0, 30000] }));
      return;
    }

    if (key === "dates") {
      setFilters((current) => ({ ...current, checkIn: "", checkOut: "" }));
      return;
    }

    if (key === "guests") {
      setFilters((current) => ({ ...current, guests: 2 }));
      return;
    }

    if (key === "rooms") {
      setFilters((current) => ({ ...current, rooms: 1 }));
      return;
    }

    if (key === "availableOnly") {
      setFilters((current) => ({ ...current, availableOnly: false }));
      return;
    }

    const [group, value] = key.split(":");
    setFilters((current) => {
      switch (group) {
        case "star":
          return { ...current, starRatings: current.starRatings.filter((entry) => entry !== Number(value)) };
        case "amenity":
          return { ...current, amenities: current.amenities.filter((entry) => entry !== value) };
        case "type":
          return { ...current, propertyTypes: current.propertyTypes.filter((entry) => entry !== value) };
        case "location":
          return { ...current, locations: current.locations.filter((entry) => entry !== value) };
        case "room":
          return { ...current, roomTypes: current.roomTypes.filter((entry) => entry !== value) };
        default:
          return current;
      }
    });
  };

  const searchSummary = filters.search.trim() || initialApiCity || "All destinations";
  const datesSummary = filters.checkIn && filters.checkOut
    ? `${filters.checkIn} — ${filters.checkOut}`
    : "Any dates";

  return (
    <div className="min-h-screen bg-[#f4f7fb] pb-24 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 lg:px-6">
          <Link href="/hotels">
            <Button size="icon" variant="ghost" className="rounded-full" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          {showSearch ? (
            <div className="flex flex-1 items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search hotels, city, or area"
                  value={searchInput}
                  onChange={(event) => {
                    setSearchInput(event.target.value);
                    setFilters((current) => ({ ...current, search: event.target.value }));
                  }}
                  className="h-11 rounded-2xl border-slate-200 bg-slate-50 pl-10"
                  autoFocus
                  data-testid="input-hotel-search"
                />
              </div>
              <Button size="icon" variant="ghost" className="rounded-full" onClick={() => setShowSearch(false)} data-testid="button-close-search">
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <button
              type="button"
              className="flex-1 min-w-0 text-left"
              onClick={() => setShowSearch(true)}
              data-testid="button-open-hotel-search"
            >
              <p className="truncate text-base font-semibold">{searchSummary}</p>
              <p className="truncate text-xs text-slate-500">{datesSummary} · {filteredHotels.length} stays</p>
            </button>
          )}
          {!showSearch ? (
            <Button size="icon" variant="outline" className="rounded-full border-slate-200" onClick={() => setShowSearch(true)}>
              <Search className="h-4 w-4" />
            </Button>
          ) : null}
          {isMobile ? (
            <Button
              variant="outline"
              className="rounded-full border-slate-200"
              onClick={() => setMobileFiltersOpen(true)}
              data-testid="button-open-mobile-filters"
            >
              <SlidersHorizontal className="mr-2 h-4 w-4" />
              Filters
            </Button>
          ) : null}
        </div>
      </header>

      <HotelFilterBar
        filters={filters}
        resultCount={filteredHotels.length}
        searchInput={searchInput}
        onSearchInputChange={(value) => {
          setSearchInput(value);
          setFilters((current) => ({ ...current, search: value }));
        }}
        onChange={updateFilters}
        onOpenFilters={() => setMobileFiltersOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-5 lg:px-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-900" data-testid="text-results-count">
              {filteredHotels.length} propert{filteredHotels.length === 1 ? "y" : "ies"} found
            </p>
            <p className="mt-1 text-sm text-slate-500">Filters combine with AND logic and update live.</p>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
            <ArrowUpDown className="h-4 w-4" />
            {debouncedFilters.sortBy === "price-low"
              ? "Price Low to High"
              : debouncedFilters.sortBy === "price-high"
                ? "Price High to Low"
                : debouncedFilters.sortBy === "rating-high"
                  ? "Rating High to Low"
                  : debouncedFilters.sortBy === "popularity"
                    ? "Popularity"
                    : debouncedFilters.sortBy === "newest"
                      ? "Newest"
                      : debouncedFilters.sortBy === "stars-high"
                        ? "Star Rating"
                        : debouncedFilters.sortBy === "name"
                          ? "Name A-Z"
                          : "Recommended"}
          </div>
        </div>

        <div className="mb-5">
          <ActiveFilterChips tags={activeFilterTags} onRemove={removeFilterTag} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)] lg:items-start">
          {!isMobile ? (
            <aside className="sticky top-24 hidden lg:block">
              <HotelFilterPanel
                filters={filters}
                resultCount={filteredHotels.length}
                availableLocations={availableLocations}
                amenityOptions={availableAmenities}
                propertyTypeOptions={availablePropertyTypes}
                priceBounds={priceBounds}
                onChange={updateFilters}
                onClear={clearAllFilters}
              />
            </aside>
          ) : null}

          <section className="space-y-4">
            {isLoading || isFilterPending ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <HotelCardSkeleton key={index} />
                ))}
              </div>
            ) : filteredHotels.length === 0 ? (
              <Card className="rounded-[28px] border border-slate-200 bg-white p-10 text-center shadow-sm">
                <MapPin className="mx-auto h-10 w-10 text-slate-300" />
                <p className="mt-4 text-lg font-semibold text-slate-900" data-testid="text-no-hotel-results">No hotels match the selected filters</p>
                <p className="mt-2 text-sm text-slate-500">Try widening the price range or clearing a few filters.</p>
                <Button className="mt-5 rounded-xl" onClick={clearAllFilters}>Clear all filters</Button>
              </Card>
            ) : (
              filteredHotels.map((hotel) => {
                const ratingInfo = getRatingInfo(hotel.rating);
                const originalPrice = Math.round(hotel.price * 1.18);
                return (
                  <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                    <Card className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-lg" data-testid={`card-hotel-${hotel.id}`}>
                      <div className="flex flex-col md:flex-row">
                        <div className="relative h-56 w-full overflow-hidden md:h-auto md:w-72">
                          <img
                            src={hotel.images?.[0] || hotel.image || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=900&q=80"}
                            alt={hotel.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                            {hotel.type}
                          </div>
                        </div>

                        <div className="flex flex-1 flex-col justify-between p-5">
                          <div>
                            <div className="flex flex-wrap items-start justify-between gap-4">
                              <div className="min-w-0 flex-1">
                                <h3 className="truncate text-xl font-semibold text-slate-900" data-testid={`text-hotel-name-${hotel.id}`}>{hotel.name}</h3>
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: hotel.starRating }).map((_, index) => (
                                      <Star key={index} className="h-4 w-4 fill-amber-400 text-amber-400" />
                                    ))}
                                  </div>
                                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">{hotel.roomType}</span>
                                </div>
                                <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                                  <MapPin className="h-4 w-4 text-sky-600" />
                                  <span>{hotel.city}</span>
                                  <span className="text-slate-300">•</span>
                                  <span>{hotel.location}</span>
                                  {hotel.address ? <span className="truncate text-slate-400">• {hotel.address}</span> : null}
                                </div>
                                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{hotel.description || hotel.originalHotel?.description || "Comfortable stay with curated amenities and flexible room options."}</p>
                              </div>

                              <div className="rounded-2xl bg-slate-900 px-4 py-3 text-white shadow-sm">
                                <p className="text-right text-xs uppercase tracking-[0.2em] text-slate-300">Guest rating</p>
                                <div className="mt-2 flex items-center gap-3">
                                  <span className={`${ratingInfo.color} rounded-xl px-2.5 py-2 text-lg font-bold text-white`} data-testid={`badge-rating-${hotel.id}`}>
                                    {hotel.rating.toFixed(1)}
                                  </span>
                                  <div>
                                    <p className="text-sm font-semibold">{ratingInfo.text}</p>
                                    <p className="text-xs text-slate-300">{hotel.reviewCount} reviews</p>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap gap-2">
                              {hotel.amenities.slice(0, 5).map((amenity) => {
                                const Icon = getAmenityIcon(amenity);
                                return (
                                  <span key={amenity} className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600">
                                    <Icon className="h-3.5 w-3.5 text-sky-600" />
                                    {amenity}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          <div className="mt-5 flex flex-wrap items-end justify-between gap-4 border-t border-slate-100 pt-4">
                            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-emerald-700">
                                <CalendarDays className="h-4 w-4" />
                                {filters.checkIn && filters.checkOut ? "Date match available" : "Flexible dates"}
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-violet-700">
                                <BedDouble className="h-4 w-4" />
                                {hotel.roomType} room
                              </span>
                              <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-1.5 text-sky-700">
                                {Number((hotel.originalHotel as any)?.availableRooms || 0) > 0 ? `${(hotel.originalHotel as any).availableRooms} rooms available` : "Availability on request"}
                              </span>
                            </div>

                            <div className="text-right">
                              <p className="text-sm text-slate-400 line-through">₹{originalPrice.toLocaleString("en-IN")}</p>
                              <p className="text-3xl font-semibold text-slate-900" data-testid={`text-hotel-price-${hotel.id}`}>From ₹{hotel.price.toLocaleString("en-IN")}</p>
                              <p className="text-xs text-slate-500">price/night, taxes extra</p>
                              {(hotel.originalHotel as any)?.priceChanged && (hotel.originalHotel as any)?.priceBadge && (
                                <span className="mt-1 inline-flex rounded-full bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                                  {(hotel.originalHotel as any).priceBadge}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })
            )}
          </section>
        </div>
      </main>

      <HotelFilterDrawer
        open={mobileFiltersOpen}
        onOpenChange={setMobileFiltersOpen}
        filters={filters}
        resultCount={filteredHotels.length}
        availableLocations={availableLocations}
        amenityOptions={availableAmenities}
        propertyTypeOptions={availablePropertyTypes}
        priceBounds={priceBounds}
        onChange={updateFilters}
        onClear={clearAllFilters}
      />

      <BottomNav />
    </div>
  );
}
