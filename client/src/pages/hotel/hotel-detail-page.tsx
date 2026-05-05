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
import {
  Star, MapPin, ArrowLeft, Clock, Users, Wifi, Car, Coffee, Dumbbell,
  ChevronLeft, ChevronRight, BedDouble, Check, AlertTriangle, Maximize,
  Bath, Wind, Tv, ShowerHead
} from "lucide-react";
import type { Hotel, HotelRoom } from "@shared/schema";

type HotelWithRooms = Hotel & { rooms: HotelRoom[] };

const amenityIcons: Record<string, any> = {
  "WiFi": Wifi,
  "Free WiFi": Wifi,
  "Parking": Car,
  "Free Parking": Car,
  "Restaurant": Coffee,
  "Gym": Dumbbell,
  "Fitness Centre": Dumbbell,
  "Air conditioning": Wind,
  "TV": Tv,
  "Private bathroom": Bath,
  "Shower": ShowerHead,
};

function getRatingInfo(rating: number): { color: string; text: string } {
  if (rating >= 9) return { color: "bg-[#003580]", text: "Wonderful" };
  if (rating >= 8) return { color: "bg-[#003580]", text: "Fabulous" };
  if (rating >= 7) return { color: "bg-[#388e3c]", text: "Very good" };
  if (rating >= 6) return { color: "bg-[#43a047]", text: "Good" };
  return { color: "bg-[#757575]", text: "Pleasant" };
}

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

  const { data: bookingPricePreview } = useQuery<any>({
    queryKey: ["/api/hotels", hotel?.id, "rooms", bookingRoom?.id, "calculate-price", checkIn, checkOut],
    enabled: !!hotel?.id && !!bookingRoom?.id && !!checkIn && !!checkOut && new Date(checkOut) > new Date(checkIn),
    queryFn: async () => {
      const res = await apiRequest("POST", `/api/hotels/${hotel!.id}/rooms/${bookingRoom!.id}/calculate-price`, { checkIn, checkOut });
      return res.json();
    },
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
    bookMutation.mutate({
      hotelId: hotel!.id,
      roomId: bookingRoom.id,
      checkIn,
      checkOut,
      guests: parseInt(guests) || 2,
      guestName: guestName || undefined,
      guestPhone: guestPhone || undefined,
      specialRequests: specialRequests || undefined,
    });
  };

  const getOriginalPrice = (price: string) => {
    return Math.round(parseFloat(price) * 1.18);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-[#003580] h-14" />
        <div className="px-4 py-4 space-y-4">
          <Skeleton className="h-56 w-full rounded-md" />
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!hotel) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center pb-20">
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

  const ratingNum = parseFloat(hotel.rating || "4.0");
  const ratingScale = Math.min(10, ratingNum * 2.2).toFixed(1);
  const { color: ratingColor, text: ratingText } = getRatingInfo(parseFloat(ratingScale));

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-50 bg-[#003580] text-white">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/hotels/search">
            <button className="text-white" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-base truncate" data-testid="text-hotel-name">{hotel.name}</h1>
            <p className="text-xs text-blue-200 truncate">{hotel.city}{hotel.address ? `, ${hotel.address}` : ""}</p>
          </div>
        </div>
      </div>

      <div className="relative h-56 overflow-hidden bg-gray-200 dark:bg-gray-700">
        <img
          src={images[imageIndex]}
          alt={hotel.name}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

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

        {images.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
            {imageIndex + 1}/{images.length}
          </div>
        )}
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{hotel.name}</h2>
              <div className="flex items-center gap-1 mt-1">
                {Array.from({ length: hotel.starRating || 3 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 text-yellow-500 fill-yellow-500" />
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{ratingText}</p>
              </div>
              <div className={`${ratingColor} text-white font-bold text-sm rounded-tl-md rounded-tr-md rounded-br-md px-2 py-1.5 min-w-[36px] text-center`}>
                {ratingScale}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 mt-2">
            <MapPin className="h-4 w-4 text-[#003580]" />
            <span className="text-sm text-[#003580] dark:text-blue-400">{hotel.city}{hotel.address ? `, ${hotel.address}` : ""}</span>
          </div>

          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>Check-in: {hotel.checkInTime} | Check-out: {hotel.checkOutTime}</span>
          </div>
        </div>

        {hotel.description && (
          <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-description">{hotel.description}</p>
        )}

        {hotel.amenities && hotel.amenities.length > 0 && (
          <div>
            <h3 className="font-semibold text-sm mb-2 text-gray-900 dark:text-gray-100">Most popular facilities</h3>
            <div className="flex flex-wrap gap-2">
              {hotel.amenities.map((amenity) => {
                const Icon = amenityIcons[amenity];
                return (
                  <Badge
                    key={amenity}
                    variant="outline"
                    className="no-default-hover-elevate no-default-active-elevate gap-1.5 text-xs bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200"
                  >
                    {Icon && <Icon className="h-3 w-3" />}
                    {amenity}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        <section>
          <h3 className="font-bold text-base mb-3 text-gray-900 dark:text-gray-100" data-testid="text-rooms-heading">Availability</h3>
          {hotel.rooms && hotel.rooms.length > 0 ? (
            <div className="space-y-4">
              {hotel.rooms.filter(r => r.isAvailable).map((room) => {
                const price = Number((room as any).dynamicPrice ?? room.price);
                const originalPrice = getOriginalPrice(room.price);
                const availableRooms = room.availableRooms || 0;
                const roomAmenities = room.amenities || [];

                return (
                  <Card key={room.id} className="overflow-visible" data-testid={`card-room-${room.id}`}>
                    <div className="p-4 space-y-3">
                      <div>
                        <h4
                          className="font-semibold text-[#003580] dark:text-blue-400 text-base cursor-pointer"
                          data-testid={`text-room-name-${room.id}`}
                        >
                          {room.name}
                        </h4>
                        <Badge
                          variant="outline"
                          className="mt-1 text-[10px] no-default-hover-elevate no-default-active-elevate"
                        >
                          {room.type}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 flex-wrap">
                        <span className="flex items-center gap-1.5">
                          <Users className="h-4 w-4" />
                          Price for up to: {room.maxGuests}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <BedDouble className="h-4 w-4" />
                          1 {room.type === "Single" ? "single" : "double"} bed
                        </span>
                      </div>

                      {roomAmenities.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {roomAmenities.map((a) => {
                            const AmenityIcon = amenityIcons[a];
                            return (
                              <Badge
                                key={a}
                                variant="outline"
                                className="text-[11px] no-default-hover-elevate no-default-active-elevate gap-1 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                              >
                                {AmenityIcon ? <AmenityIcon className="h-3 w-3" /> : <Maximize className="h-3 w-3" />}
                                {a}
                              </Badge>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <div className="flex items-center gap-1.5 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">Free cancellation</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">No prepayment needed</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          <Check className="h-4 w-4 text-green-600" />
                          <span className="text-green-700 dark:text-green-400">Pay at the property</span>
                        </div>
                      </div>

                      <div className="flex items-end justify-between gap-2 pt-1 flex-wrap">
                        <div>
                          <p className="text-sm text-muted-foreground line-through">
                            ₹{originalPrice.toLocaleString()}
                          </p>
                          <p className="text-xl font-bold text-gray-900 dark:text-gray-100" data-testid={`text-room-price-${room.id}`}>
                            From{" "}
                            ₹{price.toLocaleString()}
                          </p>
                          <p className="text-xs text-muted-foreground">per night</p>
                          {(room as any).priceChanged && (room as any).priceBadge && (
                            <Badge className="mt-1 bg-blue-100 text-blue-800 no-default-hover-elevate no-default-active-elevate">
                              {(room as any).priceBadge}
                            </Badge>
                          )}
                          {availableRooms <= 5 && availableRooms > 0 && (
                            <p className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 font-medium mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              Only {availableRooms} left on our site!
                            </p>
                          )}
                        </div>
                        <Button
                          className="bg-[#003580] hover:bg-[#00264d] text-white"
                          onClick={() => setBookingRoom(room)}
                          disabled={availableRooms <= 0}
                          data-testid={`button-book-room-${room.id}`}
                        >
                          Reserve
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
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
            <DialogTitle className="text-[#003580] dark:text-blue-400">Reserve: {bookingRoom?.name}</DialogTitle>
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

            {checkIn && checkOut && bookingRoom && calculateNights() > 0 && !bookingPricePreview && (
              <Card className="p-3 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    ₹{parseFloat(bookingRoom.price).toLocaleString()} x {calculateNights()} night{calculateNights() > 1 ? "s" : ""}
                  </span>
                  <span className="font-bold text-[#003580] dark:text-blue-400 text-base" data-testid="text-total-price">
                    ₹{(parseFloat(bookingRoom.price) * calculateNights()).toLocaleString()}
                  </span>
                </div>
              </Card>
            )}
            {bookingPricePreview && (
              <Card className="p-3 border-blue-200 bg-white">
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span>Server price/night</span>
                    <span className="font-semibold">₹{Number(bookingPricePreview.dynamicPrice).toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{bookingPricePreview.nights} night{bookingPricePreview.nights > 1 ? "s" : ""}</span>
                    <span className="font-semibold">₹{Number(bookingPricePreview.totalPrice).toLocaleString("en-IN")}</span>
                  </div>
                  {bookingPricePreview.badge && <Badge className="bg-blue-100 text-blue-800">{bookingPricePreview.badge}</Badge>}
                  {bookingPricePreview.appliedRules?.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      Applied: {bookingPricePreview.appliedRules.map((rule: any) => rule.name).join(", ")}
                    </p>
                  )}
                </div>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBookingRoom(null)} data-testid="button-cancel-booking">
              Cancel
            </Button>
            <Button
              className="bg-[#003580] hover:bg-[#00264d] text-white"
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
