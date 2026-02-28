import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Star, MapPin, ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import type { Hotel } from "@shared/schema";

export default function HotelSearchPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(location.split("?")[1] || "");
  const initialCity = params.get("city") || "";

  const [searchQuery, setSearchQuery] = useState(initialCity);
  const [starFilter, setStarFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("rating");
  const [showFilters, setShowFilters] = useState(false);

  const queryParams = new URLSearchParams();
  if (searchQuery) queryParams.set("search", searchQuery);
  if (initialCity && !searchQuery) queryParams.set("city", initialCity);

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

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/hotels">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search hotels or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-search"
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowFilters(!showFilters)}
            data-testid="button-toggle-filters"
          >
            <SlidersHorizontal className="h-5 w-5" />
          </Button>
        </div>

        {showFilters && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center gap-3 flex-wrap">
            <Select value={starFilter} onValueChange={setStarFilter}>
              <SelectTrigger className="w-[120px]" data-testid="select-star-filter">
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
              <SelectTrigger className="w-[130px]" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="stars">Star Rating</SelectItem>
                <SelectItem value="name">Name A-Z</SelectItem>
              </SelectContent>
            </Select>
            {starFilter !== "all" && (
              <Button size="sm" variant="ghost" onClick={() => setStarFilter("all")} data-testid="button-clear-filters">
                <X className="h-3 w-3 mr-1" /> Clear
              </Button>
            )}
          </div>
        )}
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground mb-3" data-testid="text-results-count">
          {filteredHotels.length} hotel{filteredHotels.length !== 1 ? "s" : ""} found
          {searchQuery ? ` for "${searchQuery}"` : ""}
        </p>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-36 w-full rounded-md" />
            ))}
          </div>
        ) : filteredHotels.length === 0 ? (
          <Card className="p-8 text-center">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground" data-testid="text-no-results">No hotels found. Try a different search.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredHotels.map((hotel) => (
              <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                <Card className="hover-elevate overflow-hidden" data-testid={`card-hotel-${hotel.id}`}>
                  <div className="flex">
                    <div className="w-32 h-36 flex-shrink-0">
                      <img
                        src={hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
                        alt={hotel.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    </div>
                    <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
                      <div>
                        <h3 className="font-semibold text-sm text-gray-800 truncate" data-testid={`text-hotel-name-${hotel.id}`}>
                          {hotel.name}
                        </h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400 flex-shrink-0" />
                          <span className="text-xs text-muted-foreground truncate">{hotel.city}</span>
                        </div>
                        {hotel.address && (
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{hotel.address}</p>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />
                            <span className="text-xs font-medium">{hotel.rating}</span>
                          </div>
                          <Badge variant="secondary" className="text-[10px]">
                            {hotel.starRating} Star
                          </Badge>
                        </div>
                        {hotel.amenities && hotel.amenities.length > 0 && (
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {hotel.amenities.slice(0, 3).map((a) => (
                              <Badge key={a} variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                                {a}
                              </Badge>
                            ))}
                            {hotel.amenities.length > 3 && (
                              <span className="text-[10px] text-muted-foreground">+{hotel.amenities.length - 3}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
