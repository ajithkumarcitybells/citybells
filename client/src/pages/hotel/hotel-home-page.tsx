import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Star, MapPin, Calendar, Users, ArrowLeft, ChevronRight } from "lucide-react";
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

export default function HotelHomePage() {
  const [, setLocation] = useLocation();
  const [city, setCity] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");

  const { data: featuredHotels = [], isLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/hotels"],
  });

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (city) params.set("city", city);
    if (checkIn) params.set("checkIn", checkIn);
    if (checkOut) params.set("checkOut", checkOut);
    if (guests) params.set("guests", guests);
    setLocation(`/hotels/search?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Hotel Booking</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        <Card className="p-4 space-y-4">
          <h2 className="text-base font-semibold text-gray-800" data-testid="text-search-heading">Find Your Perfect Stay</h2>

          <div className="space-y-3">
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Where are you going?"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="pl-10"
                data-testid="input-city"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  placeholder="Check-in"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="pl-10"
                  data-testid="input-checkin"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  placeholder="Check-out"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  className="pl-10"
                  data-testid="input-checkout"
                />
              </div>
            </div>

            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="number"
                min="1"
                max="10"
                placeholder="Guests"
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="pl-10"
                data-testid="input-guests"
              />
            </div>

            <Button className="w-full" onClick={handleSearch} data-testid="button-search-hotels">
              <Search className="h-4 w-4 mr-2" />
              Search Hotels
            </Button>
          </div>
        </Card>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800" data-testid="text-destinations-heading">Popular Destinations</h2>
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
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <span className="absolute bottom-2 left-2 text-white text-sm font-semibold">{dest.name}</span>
              </button>
            ))}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-800" data-testid="text-featured-heading">Featured Hotels</h2>
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
              {featuredHotels.slice(0, 5).map((hotel) => (
                <Link key={hotel.id} href={`/hotels/${hotel.id}`}>
                  <Card className="hover-elevate overflow-hidden" data-testid={`card-hotel-${hotel.id}`}>
                    <div className="flex">
                      <div className="w-28 h-28 flex-shrink-0">
                        <img
                          src={hotel.images?.[0] || "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&q=80"}
                          alt={hotel.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                      <div className="p-3 flex-1 min-w-0">
                        <h3 className="font-semibold text-sm text-gray-800 truncate" data-testid={`text-hotel-name-${hotel.id}`}>{hotel.name}</h3>
                        <div className="flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-muted-foreground truncate">{hotel.city}</span>
                        </div>
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
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
