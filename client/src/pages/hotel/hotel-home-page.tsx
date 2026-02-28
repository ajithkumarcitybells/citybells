import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, MapPin, Calendar, Users, ArrowLeft, ChevronRight, Percent, Sun, Sparkles } from "lucide-react";
import { Link } from "wouter";
import type { Hotel } from "@shared/schema";

const popularDestinations = [
  { name: "Bangalore", image: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=400&q=80" },
  { name: "Mumbai", image: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=400&q=80" },
  { name: "Delhi", image: "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=400&q=80" },
  { name: "Goa", image: "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=400&q=80" },
  { name: "Jaipur", image: "https://images.unsplash.com/photo-1477587458883-47145ed94245?w=400&q=80" },
  { name: "Chennai", image: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=400&q=80" },
];

const offerCards = [
  {
    icon: Percent,
    title: "Up to 20% off attractions",
    description: "Save on tickets and tours with exclusive deals",
    color: "bg-green-600",
  },
  {
    icon: Sun,
    title: "Early bird deals",
    description: "Book early and save up to 15% on select hotels",
    color: "bg-blue-600",
  },
  {
    icon: Sparkles,
    title: "Weekend getaways",
    description: "Special rates for weekend stays at top properties",
    color: "bg-purple-600",
  },
];

interface RecentSearch {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: string;
  timestamp: number;
}

function getRatingColor(rating: number): string {
  if (rating >= 8) return "bg-[#003580]";
  if (rating >= 7) return "bg-[#007a3d]";
  if (rating >= 6) return "bg-[#febb02] text-[#003580]";
  return "bg-[#6b7280]";
}

function getRatingText(rating: number): string {
  if (rating >= 9) return "Exceptional";
  if (rating >= 8) return "Fabulous";
  if (rating >= 7) return "Very good";
  if (rating >= 6) return "Good";
  return "Pleasant";
}

export default function HotelHomePage() {
  const [, setLocation] = useLocation();
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("1 room \u00b7 2 adults \u00b7 No children");
  const [recentSearch, setRecentSearch] = useState<RecentSearch | null>(null);

  const { data: featuredHotels = [], isLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/hotels"],
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem("hotel_recent_search");
      if (saved) {
        setRecentSearch(JSON.parse(saved));
      }
    } catch {}
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);

    if (city) {
      const searchData: RecentSearch = {
        destination: city,
        checkIn,
        checkOut,
        guests,
        timestamp: Date.now(),
      };
      localStorage.setItem("hotel_recent_search", JSON.stringify(searchData));
    }

    setLocation(`/hotels/search?${params.toString()}`);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-[#003580] text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold" data-testid="text-page-title">Stays</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto space-y-6">
        <div className="bg-[#003580] px-4 pb-6 pt-2">
          <Card className="p-4 space-y-3 bg-white dark:bg-card border-0 shadow-lg">
            <div className="relative border border-border rounded-md">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Where are you going?"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10 border-0 focus-visible:ring-0 shadow-none"
                data-testid="input-city"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative border border-border rounded-md">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Check-in"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="pl-10 border-0 focus-visible:ring-0 shadow-none"
                  data-testid="input-checkin"
                />
              </div>
              <div className="relative border border-border rounded-md">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Check-out"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="pl-10 border-0 focus-visible:ring-0 shadow-none"
                  data-testid="input-checkout"
                />
              </div>
            </div>

            <div className="relative border border-border rounded-md">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="1 room · 2 adults · No children"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="pl-10 border-0 focus-visible:ring-0 shadow-none"
                data-testid="input-guests"
              />
            </div>

            <Button
              className="w-full bg-[#0071c2] text-white border-[#0071c2]"
              onClick={handleSearch}
              data-testid="button-search-hotels"
            >
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </Card>
        </div>

        <div className="px-4 space-y-6">
          {recentSearch && (
            <section>
              <h2 className="text-base font-semibold mb-3" data-testid="text-continue-search-heading">
                Continue your search
              </h2>
              <button
                onClick={() => {
                  setCity(recentSearch.destination);
                  setCheckIn(recentSearch.checkIn);
                  setCheckOut(recentSearch.checkOut);
                  setGuests(recentSearch.guests);
                  const params = new URLSearchParams();
                  params.set("city", recentSearch.destination);
                  if (recentSearch.checkIn) params.set("checkIn", recentSearch.checkIn);
                  if (recentSearch.checkOut) params.set("checkOut", recentSearch.checkOut);
                  if (recentSearch.guests) params.set("guests", recentSearch.guests);
                  setLocation(`/hotels/search?${params.toString()}`);
                }}
                className="w-full text-left"
                data-testid="button-recent-search"
              >
                <Card className="p-3 hover-elevate">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center justify-center w-10 h-10 rounded-md bg-[#003580]/10 dark:bg-[#003580]/30 flex-shrink-0">
                      <MapPin className="h-5 w-5 text-[#003580] dark:text-[#4a9eff]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate" data-testid="text-recent-destination">
                        {recentSearch.destination}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {recentSearch.checkIn && recentSearch.checkOut
                          ? `${formatDate(recentSearch.checkIn)} - ${formatDate(recentSearch.checkOut)}`
                          : "Any dates"}
                        {" \u00b7 "}
                        {featuredHotels.filter(h => h.city.toLowerCase() === recentSearch.destination.toLowerCase()).length || "Many"} properties
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            </section>
          )}

          <section>
            <h2 className="text-base font-semibold mb-1" data-testid="text-offers-heading">
              Promotions, deals and special offers for you
            </h2>
            <p className="text-xs text-muted-foreground mb-3">Save on your next stay</p>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {offerCards.map((offer) => (
                <Card
                  key={offer.title}
                  className="min-w-[240px] flex-shrink-0 overflow-visible hover-elevate"
                  data-testid={`card-offer-${offer.title.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  <div className="p-4">
                    <div className={`inline-flex items-center justify-center w-8 h-8 rounded-md ${offer.color} text-white mb-2`}>
                      <offer.icon className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold text-sm mb-1">{offer.title}</h3>
                    <p className="text-xs text-muted-foreground">{offer.description}</p>
                  </div>
                </Card>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-base font-semibold" data-testid="text-destinations-heading">Popular Destinations</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {popularDestinations.map((dest) => (
                <button
                  key={dest.name}
                  onClick={() => {
                    setCity(dest.name);
                    setLocation(`/hotels/search?city=${encodeURIComponent(dest.name)}`);
                  }}
                  className="relative rounded-md overflow-hidden aspect-square"
                  data-testid={`button-destination-${dest.name.toLowerCase()}`}
                >
                  <img src={dest.image} alt={dest.name} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-white text-sm font-semibold">{dest.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section>
            <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
              <h2 className="text-base font-semibold" data-testid="text-featured-heading">Featured Hotels</h2>
              <Link href="/hotels/search">
                <Button variant="ghost" size="sm" data-testid="link-view-all-hotels">
                  View All <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-md" />
                ))}
              </div>
            ) : featuredHotels.length === 0 ? (
              <Card className="p-6 text-center">
                <p className="text-sm text-muted-foreground" data-testid="text-no-hotels">No hotels available yet</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {featuredHotels.slice(0, 5).map((hotel) => {
                  const ratingNum = parseFloat(String(hotel.rating || "0"));
                  const ratingScaled = Math.min(10, ratingNum > 5 ? ratingNum : ratingNum * 2);

                  return (
                    <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                      <Card className="hover-elevate overflow-visible" data-testid={`card-hotel-${hotel.id}`}>
                        <div className="flex">
                          <div className="w-[120px] h-[130px] flex-shrink-0 rounded-l-md overflow-hidden">
                            <img
                              src={hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
                              alt={hotel.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                            />
                          </div>
                          <div className="p-3 flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <h3 className="font-semibold text-sm text-[#003580] dark:text-[#4a9eff] truncate" data-testid={`text-hotel-name-${hotel.id}`}>
                                {hotel.name}
                              </h3>
                              <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                                <MapPin className="h-3 w-3 text-muted-foreground flex-shrink-0" />
                                <span className="text-xs text-muted-foreground truncate">{hotel.city}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-[10px] text-[#0071c2] dark:text-[#4a9eff]">Show on map</span>
                              </div>
                              {hotel.amenities && hotel.amenities.length > 0 && (
                                <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                  {hotel.amenities.slice(0, 3).map((a) => (
                                    <Badge key={a} variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                                      {a}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-1.5 flex-wrap">
                              <div className="flex items-center gap-1.5">
                                <span className={`inline-flex items-center justify-center w-7 h-7 rounded-md text-xs font-bold text-white ${getRatingColor(ratingScaled)}`}>
                                  {ratingScaled.toFixed(1)}
                                </span>
                                <div>
                                  <span className="text-xs font-medium">{getRatingText(ratingScaled)}</span>
                                </div>
                              </div>
                              <Badge variant="secondary" className="text-[10px]">
                                {hotel.starRating} Star
                              </Badge>
                            </div>
                          </div>
                        </div>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
