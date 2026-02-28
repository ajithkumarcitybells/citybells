import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MovingBooking, MovingVehicleType, MovingDriver } from "@shared/schema";
import {
  ArrowLeft,
  MapPin,
  Truck,
  Calendar,
  Clock,
  XCircle,
  Package,
  Hash,
  ChevronRight,
  CircleCheck,
  Circle,
  Navigation,
  Star,
  Phone,
  User,
  FileText,
  Box,
} from "lucide-react";
import { Link, Redirect } from "wouter";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; color: string }> = {
  pending: { label: "Pending", variant: "secondary", color: "text-yellow-600" },
  confirmed: { label: "Confirmed", variant: "default", color: "text-blue-600" },
  picked_up: { label: "Picked Up", variant: "default", color: "text-indigo-600" },
  in_transit: { label: "In Transit", variant: "default", color: "text-purple-600" },
  delivered: { label: "Delivered", variant: "outline", color: "text-green-600" },
  cancelled: { label: "Cancelled", variant: "destructive", color: "text-red-600" },
};

const statusSteps = ["pending", "confirmed", "picked_up", "in_transit", "delivered"];
const statusStepLabels: Record<string, string> = {
  pending: "Booking Created",
  confirmed: "Confirmed",
  picked_up: "Picked Up",
  in_transit: "In Transit",
  delivered: "Delivered",
};

function getStepIndex(status: string): number {
  if (status === "cancelled") return -1;
  return statusSteps.indexOf(status);
}

export default function MovingBookingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"active" | "past">("active");
  const [selectedBooking, setSelectedBooking] = useState<MovingBooking | null>(null);

  const { data: bookings = [], isLoading } = useQuery<MovingBooking[]>({
    queryKey: ["/api/moving/bookings"],
    enabled: !!user,
  });

  const { data: vehicleTypes = [] } = useQuery<MovingVehicleType[]>({
    queryKey: ["/api/moving/vehicle-types"],
  });

  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      await apiRequest("PATCH", `/api/moving/bookings/${bookingId}/cancel`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moving/bookings"] });
      toast({ title: "Booking Cancelled", description: "Your booking has been cancelled." });
      setSelectedBooking(null);
    },
    onError: (err: Error) => {
      toast({ title: "Cancel Failed", description: err.message, variant: "destructive" });
    },
  });

  useEffect(() => {
    if (bookings.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const trackParam = params.get("track");
    if (trackParam) {
      const match = bookings.find((b) => b.trackingNumber?.toLowerCase() === trackParam.toLowerCase());
      if (match) {
        setSelectedBooking(match);
        if (["delivered", "cancelled"].includes(match.status || "")) {
          setActiveTab("past");
        }
      }
    }
  }, [bookings]);

  if (!authLoading && !user) {
    return <Redirect to="/auth" />;
  }

  const activeBookings = bookings.filter((b) => !["delivered", "cancelled"].includes(b.status || ""));
  const pastBookings = bookings.filter((b) => ["delivered", "cancelled"].includes(b.status || ""));
  const displayedBookings = activeTab === "active" ? activeBookings : pastBookings;

  const getVehicleType = (id: string | null) => vehicleTypes.find((v) => v.id === id);

  return (
    <div className="min-h-screen bg-background pb-20">
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

        <div className="flex gap-2">
          <Button
            variant={activeTab === "active" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("active")}
            data-testid="button-tab-active"
            className="flex-1"
          >
            Active ({activeBookings.length})
          </Button>
          <Button
            variant={activeTab === "past" ? "default" : "outline"}
            size="sm"
            onClick={() => setActiveTab("past")}
            data-testid="button-tab-past"
            className="flex-1"
          >
            Past ({pastBookings.length})
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-md" />
            ))}
          </div>
        ) : displayedBookings.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-foreground mb-1" data-testid="text-no-bookings">
              {activeTab === "active" ? "No active bookings" : "No past bookings"}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {activeTab === "active" ? "Book a package delivery to get started" : "Your completed bookings will appear here"}
            </p>
            {activeTab === "active" && (
              <Link href="/moving">
                <Button data-testid="button-book-now">Book Now</Button>
              </Link>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {displayedBookings.map((booking) => (
              <BookingCard
                key={booking.id}
                booking={booking}
                vehicleType={getVehicleType(booking.vehicleTypeId)}
                onViewDetails={() => setSelectedBooking(booking)}
              />
            ))}
          </div>
        )}
      </main>

      {selectedBooking && (
        <TrackingDetailsModal
          booking={selectedBooking}
          vehicleType={getVehicleType(selectedBooking.vehicleTypeId)}
          open={!!selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCancel={() => cancelMutation.mutate(selectedBooking.id)}
          isCancelling={cancelMutation.isPending}
        />
      )}

      <BottomNav />
    </div>
  );
}

function BookingCard({
  booking,
  vehicleType,
  onViewDetails,
}: {
  booking: MovingBooking;
  vehicleType?: MovingVehicleType;
  onViewDetails: () => void;
}) {
  const status = statusConfig[booking.status || "pending"];

  return (
    <Card className="p-4 space-y-3" data-testid={`card-booking-${booking.id}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-md bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
            <Package className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground" data-testid={`text-booking-desc-${booking.id}`}>
              {booking.description || vehicleType?.name || "Package Delivery"}
            </p>
            {booking.trackingNumber && (
              <p className="text-xs text-muted-foreground flex items-center gap-1" data-testid={`text-tracking-${booking.id}`}>
                <Hash className="h-3 w-3" />
                {booking.trackingNumber}
              </p>
            )}
          </div>
        </div>
        <Badge variant={status.variant} data-testid={`badge-status-${booking.id}`}>
          {status.label}
        </Badge>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-foreground line-clamp-1" data-testid={`text-booking-pickup-${booking.id}`}>
            {booking.pickupAddress}
          </p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-foreground line-clamp-1" data-testid={`text-booking-drop-${booking.id}`}>
            {booking.dropAddress}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
          {booking.scheduledDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {booking.scheduledDate}
            </span>
          )}
          {booking.estimatedPrice && (
            <span className="font-semibold text-foreground text-sm">
              ₹{booking.estimatedPrice}
            </span>
          )}
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onViewDetails}
          data-testid={`button-view-details-${booking.id}`}
        >
          View Details
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}

function TrackingDetailsModal({
  booking,
  vehicleType,
  open,
  onClose,
  onCancel,
  isCancelling,
}: {
  booking: MovingBooking;
  vehicleType?: MovingVehicleType;
  open: boolean;
  onClose: () => void;
  onCancel: () => void;
  isCancelling: boolean;
}) {
  const status = statusConfig[booking.status || "pending"];
  const currentStepIndex = getStepIndex(booking.status || "pending");
  const canCancel = ["pending", "confirmed"].includes(booking.status || "");
  const isCancelled = booking.status === "cancelled";

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto" data-testid="dialog-tracking-details">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-purple-600" />
            Tracking Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="font-semibold text-foreground" data-testid="text-modal-booking-name">
                  {booking.description || vehicleType?.name || "Package Delivery"}
                </p>
                {booking.trackingNumber && (
                  <p className="text-sm text-muted-foreground flex items-center gap-1" data-testid="text-modal-tracking-number">
                    <Hash className="h-3.5 w-3.5" />
                    {booking.trackingNumber}
                  </p>
                )}
              </div>
              <Badge variant={status.variant} data-testid="badge-modal-status">
                {status.label}
              </Badge>
            </div>
          </div>

          <Card className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Route</p>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="mt-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-green-500 bg-green-100 dark:bg-green-900/30" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">From</p>
                  <p className="text-sm text-foreground" data-testid="text-modal-pickup">{booking.pickupAddress}</p>
                </div>
              </div>
              <div className="ml-1.5 border-l-2 border-dashed border-muted-foreground/30 h-4" />
              <div className="flex items-start gap-2">
                <div className="mt-1 flex-shrink-0">
                  <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-red-100 dark:bg-red-900/30" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Destination</p>
                  <p className="text-sm text-foreground" data-testid="text-modal-drop">{booking.dropAddress}</p>
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-3 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Booking Details</p>
            <div className="grid grid-cols-2 gap-3">
              {booking.scheduledDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Date</p>
                    <p className="text-sm text-foreground" data-testid="text-modal-date">{booking.scheduledDate}</p>
                  </div>
                </div>
              )}
              {booking.scheduledTime && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Time</p>
                    <p className="text-sm text-foreground" data-testid="text-modal-time">{booking.scheduledTime}</p>
                  </div>
                </div>
              )}
              {vehicleType && (
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="text-sm text-foreground" data-testid="text-modal-vehicle">{vehicleType.name}</p>
                  </div>
                </div>
              )}
              {booking.helpersCount != null && Number(booking.helpersCount) > 0 && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Helpers</p>
                    <p className="text-sm text-foreground" data-testid="text-modal-helpers">{booking.helpersCount}</p>
                  </div>
                </div>
              )}
              {booking.estimatedPrice && (
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Price</p>
                    <p className="text-sm font-semibold text-foreground" data-testid="text-modal-price">₹{booking.estimatedPrice}</p>
                  </div>
                </div>
              )}
              {booking.description && (
                <div className="flex items-center gap-2 col-span-2">
                  <Box className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Description</p>
                    <p className="text-sm text-foreground" data-testid="text-modal-description">{booking.description}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-3 space-y-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status Timeline</p>
            {isCancelled ? (
              <div className="flex items-center gap-3 py-2">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                  <XCircle className="h-3 w-3 text-white" />
                </div>
                <p className="text-sm font-medium text-red-600 dark:text-red-400" data-testid="text-timeline-cancelled">
                  Booking Cancelled
                </p>
              </div>
            ) : (
              <div className="space-y-0" data-testid="timeline-container">
                {statusSteps.map((step, index) => {
                  const isCompleted = index <= currentStepIndex;
                  const isCurrent = index === currentStepIndex;
                  const isLast = index === statusSteps.length - 1;

                  return (
                    <div key={step} className="flex gap-3" data-testid={`timeline-step-${step}`}>
                      <div className="flex flex-col items-center">
                        {isCompleted ? (
                          <div className="w-5 h-5 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
                            <CircleCheck className="h-3.5 w-3.5 text-white" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex-shrink-0 flex items-center justify-center">
                            <Circle className="h-2.5 w-2.5 text-muted-foreground/30" />
                          </div>
                        )}
                        {!isLast && (
                          <div
                            className={`w-0.5 h-6 ${
                              index < currentStepIndex ? "bg-purple-600" : "bg-muted-foreground/20"
                            }`}
                          />
                        )}
                      </div>
                      <div className={`pb-4 ${isLast ? "pb-0" : ""}`}>
                        <p
                          className={`text-sm font-medium ${
                            isCompleted ? "text-foreground" : "text-muted-foreground"
                          } ${isCurrent ? "text-purple-600 dark:text-purple-400" : ""}`}
                        >
                          {statusStepLabels[step]}
                        </p>
                        {isCurrent && (
                          <p className="text-xs text-muted-foreground">Current status</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>

          {booking.driverId && (
            <Card className="p-3 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Driver Information</p>
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground" data-testid="text-driver-name">Driver Assigned</p>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    Rated driver
                  </p>
                </div>
                <Button variant="outline" size="icon" data-testid="button-call-driver">
                  <Phone className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            <Button
              variant="default"
              className="w-full bg-purple-600 hover:bg-purple-700 border-purple-600"
              data-testid="button-live-tracking"
              disabled
            >
              <Navigation className="h-4 w-4 mr-2" />
              Live Tracking
            </Button>

            {canCancel && (
              <Button
                variant="destructive"
                onClick={onCancel}
                disabled={isCancelling}
                className="w-full"
                data-testid={`button-cancel-booking-${booking.id}`}
              >
                <XCircle className="h-4 w-4 mr-1" />
                {isCancelling ? "Cancelling..." : "Cancel Booking"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
