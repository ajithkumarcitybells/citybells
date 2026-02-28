import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MovingBooking } from "@shared/schema";
import { ArrowLeft, MapPin, Truck, Calendar, Clock, XCircle, Package } from "lucide-react";
import { Link, Redirect } from "wouter";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  picked_up: { label: "Picked Up", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

export default function MovingBookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const { data: bookings = [], isLoading } = useQuery<MovingBooking[]>({
    queryKey: ["/api/moving/bookings"],
    enabled: !!user,
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiRequest("PATCH", `/api/moving/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moving/bookings"] });
      toast({ title: "Booking Cancelled", description: "Your booking has been cancelled." });
    },
    onError: (err: Error) => {
      toast({ title: "Cancel Failed", description: err.message, variant: "destructive" });
    },
  });

  if (!authLoading && !user) {
    return <Redirect to="/auth" />;
  }

  const activeBookings = bookings.filter((b) => !["delivered", "cancelled"].includes(b.status || ""));
  const pastBookings = bookings.filter((b) => ["delivered", "cancelled"].includes(b.status || ""));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/moving">
            <Button variant="ghost" size="icon" data-testid="button-back-moving">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-lg font-bold text-foreground" data-testid="text-bookings-title">My Bookings</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-md" />
            ))}
          </div>
        ) : bookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-foreground mb-1">No bookings yet</p>
            <p className="text-sm text-muted-foreground mb-4">Book your first move to get started</p>
            <Link href="/moving">
              <Button data-testid="button-book-now">Book Now</Button>
            </Link>
          </Card>
        ) : (
          <>
            {activeBookings.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Active</h2>
                {activeBookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    onCancel={() => cancelMutation.mutate(booking.id)}
                    isCancelling={cancelMutation.isPending}
                  />
                ))}
              </div>
            )}

            {pastBookings.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Past</h2>
                {pastBookings.map((booking) => (
                  <BookingCard key={booking.id} booking={booking} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  isCancelling,
}: {
  booking: MovingBooking;
  onCancel?: () => void;
  isCancelling?: boolean;
}) {
  const status = statusConfig[booking.status || "pending"];
  const canCancel = ["pending", "confirmed"].includes(booking.status || "");

  return (
    <Card className="p-4 space-y-3" data-testid={`card-booking-${booking.id}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={status.variant} data-testid={`badge-status-${booking.id}`}>
          {status.label}
        </Badge>
        {booking.createdAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(booking.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-foreground" data-testid={`text-booking-pickup-${booking.id}`}>
            {booking.pickupAddress}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-foreground" data-testid={`text-booking-drop-${booking.id}`}>
            {booking.dropAddress}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
        {booking.scheduledDate && (
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            {booking.scheduledDate}
          </span>
        )}
        {booking.scheduledTime && (
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {booking.scheduledTime}
          </span>
        )}
        {booking.helpersCount && Number(booking.helpersCount) > 0 && (
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {booking.helpersCount} helper(s)
          </span>
        )}
        {booking.estimatedPrice && (
          <span className="font-semibold text-primary text-sm ml-auto">
            ₹{booking.estimatedPrice}
          </span>
        )}
      </div>

      {canCancel && onCancel && (
        <Button
          variant="destructive"
          size="sm"
          onClick={onCancel}
          disabled={isCancelling}
          className="w-full"
          data-testid={`button-cancel-booking-${booking.id}`}
        >
          <XCircle className="h-4 w-4 mr-1" />
          Cancel Booking
        </Button>
      )}
    </Card>
  );
}
