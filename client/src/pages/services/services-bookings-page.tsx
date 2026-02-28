import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Calendar, Clock, MapPin, Star, Wrench } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CityServiceBooking } from "@shared/schema";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  provider_assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  provider_assigned: "Provider Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function RatingStars({
  bookingId,
  currentRating,
}: {
  bookingId: string;
  currentRating: number | null;
}) {
  const [hovered, setHovered] = useState(0);
  const [selected, setSelected] = useState(currentRating || 0);
  const { toast } = useToast();

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("POST", `/api/city-services/bookings/${bookingId}/rate`, { rating });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-services/bookings"] });
      toast({ title: "Thank you!", description: "Your rating has been submitted." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to rate", description: error.message, variant: "destructive" });
    },
  });

  if (currentRating) {
    return (
      <div className="flex items-center gap-1" data-testid={`rating-display-${bookingId}`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${star <= currentRating ? "text-yellow-500 fill-yellow-500" : "text-gray-300"}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1" data-testid={`rating-input-${bookingId}`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => {
            setSelected(star);
            rateMutation.mutate(star);
          }}
          disabled={rateMutation.isPending}
          data-testid={`button-rate-${star}-${bookingId}`}
        >
          <Star
            className={`h-5 w-5 transition-colors ${
              star <= (hovered || selected)
                ? "text-yellow-500 fill-yellow-500"
                : "text-gray-300"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function ServicesBookingsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: bookings = [], isLoading } = useQuery<CityServiceBooking[]>({
    queryKey: ["/api/city-services/bookings"],
    enabled: !!user,
  });

  const { toast } = useToast();

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const res = await apiRequest("PATCH", `/api/city-services/bookings/${bookingId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-services/bookings"] });
      toast({ title: "Booking cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to cancel", description: error.message, variant: "destructive" });
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/services")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">
            My Bookings
          </h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="p-4 space-y-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-2/3" />
                </Card>
              ))}
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium" data-testid="text-no-bookings">No bookings yet</p>
            <p className="text-gray-400 text-sm mt-1">Book a service to get started</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => setLocation("/services")}
              data-testid="button-browse-services"
            >
              Browse Services
            </Button>
          </div>
        ) : (
          bookings.map((booking) => {
            const status = booking.status || "pending";
            const canCancel = !["completed", "cancelled", "in_progress"].includes(status);
            const isCompleted = status === "completed";
            const price = parseFloat(booking.totalPrice || "0");

            return (
              <Card
                key={booking.id}
                className="p-4 border-gray-100 space-y-3"
                data-testid={`card-booking-${booking.id}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm" data-testid={`text-booking-id-${booking.id}`}>
                      Booking #{booking.id.slice(-6).toUpperCase()}
                    </p>
                  </div>
                  <Badge
                    className={`text-xs ${statusColors[status] || "bg-gray-100 text-gray-800"}`}
                    data-testid={`badge-status-${booking.id}`}
                  >
                    {statusLabels[status] || status}
                  </Badge>
                </div>

                <div className="space-y-1.5 text-xs text-gray-500">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-3.5 w-3.5 text-gray-400" />
                    <span>{booking.scheduledDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <span>{booking.scheduledTime}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span className="line-clamp-1">{booking.address}</span>
                  </div>
                </div>

                {booking.notes && (
                  <p className="text-xs text-gray-400 italic">Notes: {booking.notes}</p>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-gray-50">
                  <p className="font-bold text-gray-800" data-testid={`text-booking-price-${booking.id}`}>
                    ₹{price.toFixed(0)}
                  </p>
                  <div className="flex items-center gap-2">
                    {isCompleted && (
                      <RatingStars bookingId={booking.id} currentRating={booking.rating} />
                    )}
                    {canCancel && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => cancelMutation.mutate(booking.id)}
                        disabled={cancelMutation.isPending}
                        data-testid={`button-cancel-${booking.id}`}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </main>

      <BottomNav />
    </div>
  );
}
