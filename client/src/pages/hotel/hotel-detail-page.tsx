import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, Link, useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Star, MapPin, ArrowLeft, Clock, Users, Wifi, Car, Coffee, Dumbbell, ChevronLeft, ChevronRight } from "lucide-react";
import type { Hotel, HotelRoom } from "@shared/schema";

type HotelWithRooms = Hotel & { rooms: HotelRoom[] };

const amenityIcons: Record<string, any> = {
  "WiFi": Wifi,
  "Parking": Car,
  "Restaurant": Coffee,
  "Gym": Dumbbell,
};

export default function HotelDetailPage() {
  const [, params] = useRoute("/hotels/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [imageIndex, setImageIndex] = useState(0);
  const [bookingRoom, setBookingRoom] = useState<HotelRoom | null>(null);
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guests, setGuests] = useState("2");
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [specialRequests, setSpecialRequests] = useState("");

  const { data: hotel, isLoading } = useQuery<HotelWithRooms>({
    queryKey: ["/api/hotels", params?.id],
    enabled: !!params?.id,
  });

  const bookMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/hotel-bookings", data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Booking confirmed!", description: "Your hotel booking has been placed." });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-bookings"] });
      setBookingRoom(null);
      setLocation("/hotels/bookings");
    },
    onError: (error: Error) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const calculateNights = () => {
    if (!checkIn || !checkOut) return 0;
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  const handleBook = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (!bookingRoom || !checkIn || !checkOut) {
      toast({ title: "Missing details", description: "Please select dates", variant: "destructive" });
      return;
    }
    const nights = calculateNights();
    const totalPrice = (parseFloat(bookingRoom.price) * nights).toFixed(2);

    bookMutation.mutate({
      hotelId: hotel!.id,
      roomId: bookingRoom.id,
      checkIn,
      checkOut,
      guests: parseInt(guests) || 2,
      totalPrice,
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      specialRequests: specialRequests || undefined,
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-56 w-full rounded-md" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center pb-20">
        <Card className="p-6 text-center">
          <p className="text-muted-foreground" data-testid="text-not-found">Hotel not found</p>
          <Link href="/hotels">
            <Button className="mt-3" data-testid="button-back-to-hotels">Back to Hotels</Button>
          </Link>
        </Card>
        <BottomNav />
      </div>
    );
  }

  const images = hotel.images && hotel.images.length > 0
    ? hotel.images
    : ["https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80"];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="relative">
        <div className="relative h-56 overflow-hidden">
          <img
            src={images[imageIndex]}
            alt={hotel.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

          {images.length > 1 && (
            <>
              <button
                onClick={() => setImageIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
                data-testid="button-prev-image"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                onClick={() => setImageIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-1"
                data-testid="button-next-image"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          <Link href="/hotels/search">
            <button className="absolute top-3 left-3 bg-black/40 text-white rounded-full p-2" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>

          {images.length > 1 && (
            <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
              {imageIndex + 1}/{images.length}
            </div>
          )}
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-gray-800" data-testid="text-hotel-name">{hotel.name}</h1>
            <Badge variant="secondary">{hotel.starRating} Star</Badge>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <MapPin className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-muted-foreground">{hotel.city}{hotel.address ? `, ${hotel.address}` : ""}</span>
          </div>
          <div className="flex items-center gap-3 mt-2 flex-wrap">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              <span className="text-sm font-medium">{hotel.rating}</span>
            </div>
            <div className="flex items-center gap-1 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Check-in: {hotel.checkInTime} | Check-out: {hotel.checkOutTime}
            </div>
          </div>
        </div>

        {hotel.description && (
          <p className="text-sm text-muted-foreground" data-testid="text-description">{hotel.description}</p>
        )}

        {hotel.amenities && hotel.amenities.length > 0 && (
          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Amenities</h3>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.map((amenity) => {
                const Icon = amenityIcons[amenity];
                return (
                  <Badge key={amenity} variant="outline" className="no-default-hover-elevate no-default-active-elevate gap-1">
                    {Icon && <Icon className="h-3 w-3" />}
                    {amenity}
                  </Badge>
                );
              })}
            </div>
          </Card>
        )}

        <section>
          <h3 className="font-semibold text-base mb-3" data-testid="text-rooms-heading">Available Rooms</h3>
          {hotel.rooms && hotel.rooms.length > 0 ? (
            <div className="space-y-3">
              {hotel.rooms.filter(r => r.isAvailable).map((room) => (
                <Card key={room.id} className="p-4" data-testid={`card-room-${room.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm" data-testid={`text-room-name-${room.id}`}>{room.name}</h4>
                      <Badge variant="outline" className="mt-1 text-[10px] no-default-hover-elevate no-default-active-elevate">
                        {room.type}
                      </Badge>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" /> Max {room.maxGuests} guests
                        </span>
                        <span>{room.availableRooms} rooms left</span>
                      </div>
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.amenities.slice(0, 4).map((a) => (
                            <Badge key={a} variant="outline" className="text-[10px] no-default-hover-elevate no-default-active-elevate">
                              {a}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-lg font-bold text-primary" data-testid={`text-room-price-${room.id}`}>
                        ₹{parseFloat(room.price).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">per night</p>
                      <Button
                        size="sm"
                        className="mt-2"
                        onClick={() => setBookingRoom(room)}
                        disabled={(room.availableRooms || 0) <= 0}
                        data-testid={`button-book-room-${room.id}`}
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="p-6 text-center">
              <p className="text-sm text-muted-foreground" data-testid="text-no-rooms">No rooms available</p>
            </Card>
          )}
        </section>
      </main>

      <Dialog open={!!bookingRoom} onOpenChange={(open) => !open && setBookingRoom(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book {bookingRoom?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Check-in</label>
                <Input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-booking-checkin"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Check-out</label>
                <Input
                  type="date"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                  min={checkIn || new Date().toISOString().split("T")[0]}
                  data-testid="input-booking-checkout"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Guests</label>
              <Input
                type="number"
                min="1"
                max={bookingRoom?.maxGuests || 4}
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                data-testid="input-booking-guests"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Guest Name</label>
              <Input
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Full name"
                data-testid="input-guest-name"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Phone</label>
              <Input
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                placeholder="Contact number"
                data-testid="input-guest-phone"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Special Requests</label>
              <Textarea
                value={specialRequests}
                onChange={(e) => setSpecialRequests(e.target.value)}
                placeholder="Any special requests..."
                className="resize-none"
                data-testid="input-special-requests"
              />
            </div>

            {checkIn && checkOut && bookingRoom && calculateNights() > 0 && (
              <Card className="p-3 bg-muted/50">
                <div className="flex items-center justify-between text-sm">
                  <span>₹{parseFloat(bookingRoom.price).toLocaleString()} x {calculateNights()} night{calculateNights() > 1 ? "s" : ""}</span>
                  <span className="font-bold text-primary" data-testid="text-total-price">
                    ₹{(parseFloat(bookingRoom.price) * calculateNights()).toLocaleString()}
                  </span>
                </div>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingRoom(null)} data-testid="button-cancel-booking">
              Cancel
            </Button>
            <Button
              onClick={handleBook}
              disabled={bookMutation.isPending || !checkIn || !checkOut}
              data-testid="button-confirm-booking"
            >
              {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
