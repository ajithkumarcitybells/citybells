import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { ArrowLeft, SlidersHorizontal, ArrowUpDown, MapPin, Wifi, Car, Coffee, Waves, Search, X } from "lucide-react";
import type { Hotel } from "@shared/schema";

function getRatingInfo(rating: string | null) {
  const score = parseFloat(rating || "0");
  if (score >= 9) return { text: "Exceptional", color: "bg-[#003580]" };
  if (score >= 8) return { text: "Fabulous", color: "bg-[#003580]" };
  if (score >= 7) return { text: "Very Good", color: "bg-[#00800a]" };
  if (score >= 6) return { text: "Good", color: "bg-[#6b9e1f]" };
  return { text: "Pleasant", color: "bg-[#7c8c8d]" };
}

function getAmenityIcon(amenity: string) {
  const lower = amenity.toLowerCase();
  if (lower.includes("wifi") || lower.includes("internet")) return Wifi;
  if (lower.includes("parking") || lower.includes("car")) return Car;
  if (lower.includes("breakfast") || lower.includes("restaurant") || lower.includes("dining")) return Coffee;
  if (lower.includes("pool") || lower.includes("swim")) return Waves;
  return null;
}

export default function HotelSearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialCity = params.get("city") || "";
  const checkIn = params.get("checkIn") || "";
  const checkOut = params.get("checkOut") || "";
  const guests = params.get("guests") || "";

  const [searchQuery, setSearchQuery] = useState(initialCity);
  const [starFilter, setStarFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("rating");
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const { data: hotels = [], isLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/hotels", searchQuery ? `?search=${searchQuery}` : initialCity ? `?city=${initialCity}` : ""],
  });

  const filteredHotels = useMemo(() => {
    let result = [...hotels];
    if (starFilter !== "all") {
      result = result.filter((h) => h.starRating === parseInt(starFilter));
    }
    if (sortBy === "rating") {
      result.sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"));
    } else if (sortBy === "stars") {
      result.sort((a, b) => (b.starRating || 0) - (a.starRating || 0));
    } else if (sortBy === "name") {
      result.sort((a, b) => a.name.localeCompare(b.name));
    }
    return result;
  }, [hotels, starFilter, sortBy]);

  const searchSummary = searchQuery || initialCity || "All destinations";
  const datesSummary = checkIn && checkOut ? `${checkIn} — ${checkOut}` : "Any dates";
  const guestsSummary = guests || "2 adults";

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20">
      <header className="sticky top-0 z-50 bg-[#003580] text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/hotels">
            <Button size="icon" variant="ghost" className="text-white no-default-hover-elevate" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          {showSearch ? (
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search hotels or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 bg-white text-gray-800 h-9 text-sm"
                  autoFocus
                  data-testid="input-search"
                />
              </div>
              <Button size="icon" variant="ghost" className="text-white no-default-hover-elevate" onClick={() => setShowSearch(false)} data-testid="button-close-search">
                <X className="h-5 w-5" />
              </Button>
            </div>
          ) : (
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setShowSearch(true)} data-testid="text-search-summary">
              <p className="font-semibold text-sm truncate">{searchSummary}</p>
              <p className="text-xs text-blue-200 truncate">{datesSummary} · {guestsSummary}</p>
            </div>
          )}
          {!showSearch && (
            <Button size="icon" variant="ghost" className="text-white no-default-hover-elevate" onClick={() => setShowSearch(true)} data-testid="button-open-search">
              <Search className="h-5 w-5" />
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 px-4 pb-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/30 text-white text-xs no-default-hover-elevate"
            onClick={() => setSortBy(sortBy === "rating" ? "stars" : sortBy === "stars" ? "name" : "rating")}
            data-testid="button-sort"
          >
            <ArrowUpDown className="h-3 w-3 mr-1" />
            {sortBy === "rating" ? "Top Rated" : sortBy === "stars" ? "Stars" : "Name"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className={`bg-white/10 border-white/30 text-white text-xs no-default-hover-elevate ${showFilters ? "bg-white/25" : ""}`}
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="h-3 w-3 mr-1" />
            Filter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="bg-white/10 border-white/30 text-white text-xs no-default-hover-elevate"
            data-testid="button-map"
          >
            <MapPin className="h-3 w-3 mr-1" />
            Map
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 pb-3 flex items-center gap-3 flex-wrap">
            <Select value={starFilter} onValueChange={setStarFilter}>
              <SelectTrigger className="w-[120px] bg-white/10 border-white/30 text-white text-xs" data-testid="select-star-filter">
                <SelectValue placeholder="Stars" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stars</SelectItem>
                <SelectItem value="5">5 Star</SelectItem>
                <SelectItem value="4">4 Star</SelectItem>
                <SelectItem value="3">3 Star</SelectItem>
                <SelectItem value="2">2 Star</SelectItem>
                <SelectItem value="1">1 Star</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[130px] bg-white/10 border-white/30 text-white text-xs" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="stars">Star Rating</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </header>

      <main className="px-3 py-3 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground mb-3 font-medium" data-testid="text-results-count">
          {filteredHotels.length} propert{filteredHotels.length !== 1 ? "ies" : "y"} found
          {searchQuery ? ` in "${searchQuery}"` : ""}
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="flex">
                  <Skeleton className="w-[120px] h-[140px] flex-shrink-0 rounded-none" />
                  <div className="p-3 flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                    <Skeleton className="h-5 w-1/3 mt-4" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : filteredHotels.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium mb-1" data-testid="text-no-results">No properties found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your search or filters</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHotels.map((hotel) => {
              const ratingInfo = getRatingInfo(hotel.rating);
              const score = parseFloat(hotel.rating || "0");
              const hasBreakfast = hotel.amenities?.some(a => a.toLowerCase().includes("breakfast"));
              const roomsLeft = Math.floor(Math.random() * 5) + 1;
              const originalPrice = Math.round(score * 800 + (hotel.starRating || 3) * 500);
              const discountedPrice = Math.round(originalPrice * 0.85);

              return (
                <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                  <Card className="hover-elevate overflow-hidden bg-white dark:bg-gray-800" data-testid={`card-hotel-${hotel.id}`}>
                    <div className="flex">
                      <div className="w-[120px] h-[160px] flex-shrink-0 relative">
                        <img
                          src={hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
                        <div>
                          <h3 className="font-bold text-sm text-[#003580] dark:text-blue-300 leading-tight" data-testid={`text-hotel-name-${hotel.id}`}>
                            {hotel.name}
                          </h3>
                          <div className="flex items-center gap-1 mt-1">
                            {Array.from({ length: hotel.starRating || 3 }).map((_, i) => (
                              <span key={i} className="text-[#febb02] text-xs">&#9733;</span>
                            ))}
                          </div>
                          <div className="flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3 text-[#006ce4] flex-shrink-0" />
                            <span className="text-xs text-[#006ce4] dark:text-blue-400 truncate">{hotel.city}</span>
                            {hotel.address && (
                              <span className="text-xs text-muted-foreground truncate ml-1">· {hotel.address}</span>
                            )}
                          </div>

                          {hotel.amenities && hotel.amenities.length > 0 && (
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              {hotel.amenities.slice(0, 3).map((a) => {
                                const Icon = getAmenityIcon(a);
                                return (
                                  <Badge key={a} variant="outline" className="text-[10px] px-1.5 py-0 no-default-hover-elevate no-default-active-elevate border-gray-300 dark:border-gray-600">
                                    {Icon && <Icon className="h-2.5 w-2.5 mr-0.5" />}
                                    {a}
                                  </Badge>
                                );
                              })}
                              {hotel.amenities.length > 3 && (
                                <span className="text-[10px] text-muted-foreground">+{hotel.amenities.length - 3}</span>
                              )}
                            </div>
                          )}

                          {hasBreakfast && (
                            <p className="text-[11px] text-green-700 dark:text-green-400 font-medium mt-1">
                              Breakfast included
                            </p>
                          )}
                        </div>

                        <div className="flex items-end justify-between mt-2 gap-2">
                          <div className="flex items-center gap-1.5">
                            <span className={`${ratingInfo.color} text-white text-xs font-bold rounded-md rounded-bl-none px-1.5 py-1 leading-none`} data-testid={`badge-rating-${hotel.id}`}>
                              {score.toFixed(1)}
                            </span>
                            <div>
                              <p className="text-xs font-semibold leading-tight">{ratingInfo.text}</p>
                              <p className="text-[10px] text-muted-foreground">{Math.floor(score * 50)} reviews</p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0">
                            <p className="text-[11px] text-muted-foreground line-through">
                              &#8377;{originalPrice.toLocaleString("en-IN")}
                            </p>
                            <p className="text-base font-bold text-gray-900 dark:text-gray-100 leading-tight" data-testid={`text-price-${hotel.id}`}>
                              &#8377;{discountedPrice.toLocaleString("en-IN")}
                            </p>
                            <p className="text-[10px] text-muted-foreground">per night</p>
                          </div>
                        </div>

                        {roomsLeft <= 3 && (
                          <p className="text-[11px] text-red-600 dark:text-red-400 font-medium mt-1" data-testid={`text-urgency-${hotel.id}`}>
                            Only {roomsLeft} room{roomsLeft !== 1 ? "s" : ""} left at this price!
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
