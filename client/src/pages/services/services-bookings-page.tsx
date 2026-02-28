import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Calendar, Clock, MapPin, Star, User, Phone, ClipboardList, ArrowRight } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CityServiceBooking } from "@shared/schema";

type TabFilter = "upcoming" | "completed" | "cancelled";

const TAB_OPTIONS: { key: TabFilter; label: string }[] = [
  { key: "upcoming", label: "Upcoming" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const upcomingStatuses = ["pending", "confirmed", "provider_assigned", "in_progress"];

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  provider_assigned: { label: "Provider Assigned", variant: "default" },
  in_progress: { label: "In Progress", variant: "outline" },
  completed: { label: "Completed", variant: "secondary" },
  cancelled: { label: "Cancelled", variant: "destructive" },
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
            className={`h-4 w-4 ${star <= currentRating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"}`}
          />
        ))}
        <span className="text-xs text-muted-foreground ml-1">{currentRating}/5</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5" data-testid={`rating-input-${bookingId}`}>
      <span className="text-xs text-muted-foreground">Rate this service</span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Button
            key={star}
            variant="ghost"
            size="icon"
            className="h-7 w-7 p-0"
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
                  ? "text-amber-500 fill-amber-500"
                  : "text-muted-foreground/30"
              }`}
            />
          </Button>
        ))}
      </div>
    </div>
  );
}

function BookingCard({ booking, onCancel, isCancelling }: {
  booking: CityServiceBooking;
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const status = booking.status || "pending";
  const canCancel = !["completed", "cancelled", "in_progress"].includes(status);
  const isCompleted = status === "completed";
  const price = parseFloat(booking.totalPrice || "0");
  const config = statusConfig[status] || { label: status, variant: "secondary" as const };

  return (
    <Card
      className="overflow-visible border-border/60"
      data-testid={`card-booking-${booking.id}`}
    >
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-foreground" data-testid={`text-booking-id-${booking.id}`}>
              Booking #{booking.id.slice(-6).toUpperCase()}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {booking.scheduledDate}
            </p>
          </div>
          <Badge
            variant={config.variant}
            data-testid={`badge-status-${booking.id}`}
          >
            {config.label}
          </Badge>
        </div>

        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-4 w-4 shrink-0 text-primary/70" />
            <span>{booking.scheduledDate}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 shrink-0 text-primary/70" />
            <span>{booking.scheduledTime}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-primary/70" />
            <span className="line-clamp-1">{booking.address}</span>
          </div>
        </div>

        {(booking.professionalName || booking.professionalPhone) && (
          <div className="bg-muted/50 rounded-md p-3 space-y-1.5">
            <p className="text-xs font-medium text-foreground">Service Provider</p>
            {booking.professionalName && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-3.5 w-3.5 shrink-0" />
                <span data-testid={`text-provider-name-${booking.id}`}>{booking.professionalName}</span>
              </div>
            )}
            {booking.professionalPhone && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span data-testid={`text-provider-phone-${booking.id}`}>{booking.professionalPhone}</span>
              </div>
            )}
          </div>
        )}

        {booking.notes && (
          <p className="text-xs text-muted-foreground/80 italic">Notes: {booking.notes}</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-border/40">
          <p className="font-bold text-foreground text-base" data-testid={`text-booking-price-${booking.id}`}>
            ₹{price.toFixed(0)}
          </p>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {isCompleted && (
              <RatingStars bookingId={booking.id} currentRating={booking.rating} />
            )}
            {canCancel && (
              <Button
                variant="destructive"
                size="sm"
                onClick={() => onCancel(booking.id)}
                disabled={isCancelling}
                data-testid={`button-cancel-${booking.id}`}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function ServicesBookingsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<TabFilter>("upcoming");
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

  const filteredBookings = bookings.filter((b) => {
    const status = b.status || "pending";
    if (activeTab === "upcoming") return upcomingStatuses.includes(status);
    if (activeTab === "completed") return status === "completed";
    if (activeTab === "cancelled") return status === "cancelled";
    return true;
  });

  const emptyMessages: Record<TabFilter, { title: string; subtitle: string }> = {
    upcoming: { title: "No upcoming bookings", subtitle: "Book a service to get started" },
    completed: { title: "No completed bookings", subtitle: "Your completed bookings will appear here" },
    cancelled: { title: "No cancelled bookings", subtitle: "Cancelled bookings will appear here" },
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-[#1a0533] dark:bg-[#0f0120] text-white shadow-md">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <Button
            size="icon"
            variant="ghost"
            className="text-white/80"
            onClick={() => setLocation("/services")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold" data-testid="text-page-title">
            My Bookings
          </h1>
        </div>
      </header>

      <div className="sticky top-[52px] z-40 bg-background border-b border-border/40">
        <div className="flex gap-2 px-4 py-3 max-w-lg mx-auto">
          {TAB_OPTIONS.map((tab) => (
            <Button
              key={tab.key}
              variant={activeTab === tab.key ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveTab(tab.key)}
              className={activeTab === tab.key ? "bg-[#1a0533] dark:bg-[#2d1050]" : ""}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i} className="p-4 space-y-3">
                  <div className="flex justify-between gap-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-5 w-20" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </Card>
              ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 rounded-full bg-muted/60 flex items-center justify-center mx-auto mb-4">
              <ClipboardList className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <p className="text-foreground font-semibold text-base" data-testid="text-no-bookings">
              {emptyMessages[activeTab].title}
            </p>
            <p className="text-muted-foreground text-sm mt-1.5">
              {emptyMessages[activeTab].subtitle}
            </p>
            {activeTab === "upcoming" && (
              <Button
                className="mt-6 bg-[#1a0533] dark:bg-[#2d1050]"
                onClick={() => setLocation("/services")}
                data-testid="button-browse-services"
              >
                Browse Services
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        ) : (
          filteredBookings.map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onCancel={(id) => cancelMutation.mutate(id)}
              isCancelling={cancelMutation.isPending}
            />
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
}
