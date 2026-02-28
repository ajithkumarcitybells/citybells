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
import { ArrowLeft, Calendar, Users, Building2, Search, BedDouble, XCircle } from "lucide-react";
import type { HotelBooking } from "@shared/schema";

type BookingWithDetails = HotelBooking & { hotelName?: string; roomName?: string };

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-[#febb02]", text: "text-[#1a1a1a]", label: "Pending" },
  confirmed: { bg: "bg-[#003580]", text: "text-white", label: "Confirmed" },
  checked_in: { bg: "bg-[#008009]", text: "text-white", label: "Checked In" },
  checked_out: { bg: "bg-[#6b6b6b]", text: "text-white", label: "Checked Out" },
  cancelled: { bg: "bg-[#cc0000]", text: "text-white", label: "Cancelled" },
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

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-[#1a1a2e] pb-20">
      <header className="sticky top-0 z-50 bg-[#003580] shadow-md">
        <div className="flex items-center gap-3 px-4 py-3">
          <Link href="/hotels">
            <Button size="icon" variant="ghost" className="text-white" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-white" data-testid="text-page-title">My Bookings</h1>
            <p className="text-xs text-blue-200">Your hotel reservations</p>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-md" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-20 h-20 rounded-full bg-[#003580]/10 dark:bg-[#003580]/30 flex items-center justify-center mb-4">
              <Building2 className="h-10 w-10 text-[#003580] dark:text-blue-300" />
            </div>
            <h2 className="text-lg font-semibold text-foreground mb-1" data-testid="text-no-bookings">No bookings yet</h2>
            <p className="text-sm text-muted-foreground mb-5 text-center max-w-[250px]">
              Find your perfect stay and book your next trip
            </p>
            <Link href="/hotels">
              <Button className="bg-[#003580] text-white" data-testid="button-browse-hotels">
                <Search className="h-4 w-4 mr-2" />
                Search Hotels
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground" data-testid="text-bookings-count">
              {bookings.length} booking{bookings.length !== 1 ? "s" : ""}
            </p>
            {bookings.map((booking) => {
              const status = statusConfig[booking.status || "pending"] || statusConfig.pending;
              const isCancellable = booking.status === "pending" || booking.status === "confirmed";

              return (
                <Card key={booking.id} className="overflow-visible" data-testid={`card-booking-${booking.id}`}>
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-[#003580] dark:text-blue-300 truncate" data-testid={`text-booking-hotel-${booking.id}`}>
                          {booking.hotelName || "Hotel"}
                        </h3>
                        {booking.roomName && (
                          <div className="flex items-center gap-1.5 mt-1">
                            <BedDouble className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="text-sm text-muted-foreground truncate">{booking.roomName}</span>
                          </div>
                        )}
                      </div>
                      <Badge className={`${status.bg} ${status.text} no-default-hover-elevate no-default-active-elevate text-xs font-medium rounded-md px-2`}>
                        {status.label}
                      </Badge>
                    </div>

                    <div className="bg-[#f0f6ff] dark:bg-[#1e3a5f] rounded-md p-3 space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-[#003580] dark:text-blue-300 flex-shrink-0" />
                        <div className="flex items-center gap-1 flex-wrap">
                          <span className="font-medium text-foreground">{formatDate(booking.checkIn)}</span>
                          <span className="text-muted-foreground mx-1">to</span>
                          <span className="font-medium text-foreground">{formatDate(booking.checkOut)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4 text-[#003580] dark:text-blue-300 flex-shrink-0" />
                        <span className="text-foreground">{booking.guests} guest{(booking.guests || 1) > 1 ? "s" : ""}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-xs text-muted-foreground">Total price</p>
                        <span className="text-lg font-bold text-foreground" data-testid={`text-booking-price-${booking.id}`}>
                          ₹{parseFloat(booking.totalPrice).toLocaleString()}
                        </span>
                      </div>
                      {isCancellable && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#cc0000] border-[#cc0000]/30"
                          onClick={() => cancelMutation.mutate(booking.id)}
                          disabled={cancelMutation.isPending}
                          data-testid={`button-cancel-booking-${booking.id}`}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1.5" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
