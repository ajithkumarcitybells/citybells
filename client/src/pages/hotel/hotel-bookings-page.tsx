import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ArrowLeft, Calendar, MapPin, Building2 } from "lucide-react";
import type { HotelBooking } from "@shared/schema";

type BookingWithDetails = HotelBooking & { hotelName?: string; roomName?: string };

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-green-100 text-green-800",
  checked_out: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  checked_in: "Checked In",
  checked_out: "Checked Out",
  cancelled: "Cancelled",
};

export default function HotelBookingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: bookings = [], isLoading } = useQuery<BookingWithDetails[]>({
    queryKey: ["/api/hotel-bookings"],
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiRequest("PATCH", `/api/hotel-bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      toast({ title: "Booking cancelled" });
      queryClient.invalidateQueries({ queryKey: ["/api/hotel-bookings"] });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/hotels">
            <Button size="icon" variant="ghost" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">My Hotel Bookings</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-md" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Building2 className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground mb-3" data-testid="text-no-bookings">No bookings yet</p>
            <Link href="/hotels">
              <Button data-testid="button-browse-hotels">Browse Hotels</Button>
            </Link>
          </Card>
        ) : (
          <div className="space-y-3">
            {bookings.map((booking) => (
              <Card key={booking.id} className="p-4" data-testid={`card-booking-${booking.id}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm truncate" data-testid={`text-booking-hotel-${booking.id}`}>
                      {booking.hotelName || "Hotel"}
                    </h3>
                    {booking.roomName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{booking.roomName}</p>
                    )}
                  </div>
                  <Badge className={`${statusColors[booking.status || "pending"]} no-default-hover-elevate no-default-active-elevate text-[10px]`}>
                    {statusLabels[booking.status || "pending"]}
                  </Badge>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3 flex-shrink-0" />
                    <span>{booking.checkIn} to {booking.checkOut}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 flex-shrink-0" />
                    <span>{booking.guests} guest{(booking.guests || 1) > 1 ? "s" : ""}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <span className="font-bold text-primary" data-testid={`text-booking-price-${booking.id}`}>
                    ₹{parseFloat(booking.totalPrice).toLocaleString()}
                  </span>
                  {(booking.status === "pending" || booking.status === "confirmed") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cancelMutation.mutate(booking.id)}
                      disabled={cancelMutation.isPending}
                      data-testid={`button-cancel-booking-${booking.id}`}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
