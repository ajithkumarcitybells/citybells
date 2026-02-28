import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MovingDriver, MovingBooking } from "@shared/schema";
import {
  Truck, MapPin, Calendar, Clock, Package, Star,
  CheckCircle, ArrowRight, DollarSign, Activity
} from "lucide-react";
import { Redirect } from "wouter";

type Section = "overview" | "active" | "history" | "profile";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", variant: "secondary" },
  confirmed: { label: "Confirmed", variant: "default" },
  picked_up: { label: "Picked Up", variant: "default" },
  in_transit: { label: "In Transit", variant: "default" },
  delivered: { label: "Delivered", variant: "outline" },
  cancelled: { label: "Cancelled", variant: "destructive" },
};

const nextStatusMap: Record<string, string> = {
  pending: "confirmed",
  confirmed: "picked_up",
  picked_up: "in_transit",
  in_transit: "delivered",
};

const nextStatusLabel: Record<string, string> = {
  pending: "Accept",
  confirmed: "Mark Picked Up",
  picked_up: "Start Transit",
  in_transit: "Mark Delivered",
};

export default function DriverDashboard() {
  const { user, isLoading: authLoading } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState<Section>("overview");

  const { data: driverProfile, isLoading: profileLoading } = useQuery<MovingDriver>({
    queryKey: ["/api/moving/driver/profile"],
    enabled: !!user,
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<MovingBooking[]>({
    queryKey: ["/api/moving/driver/bookings"],
    enabled: !!user,
  });

  const toggleAvailabilityMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", "/api/moving/driver/availability");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moving/driver/profile"] });
      toast({ title: "Availability Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/moving/driver/bookings/${bookingId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moving/driver/bookings"] });
      toast({ title: "Status Updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (!authLoading && !user) {
    return <Redirect to="/auth" />;
  }

  if (profileLoading || bookingsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!driverProfile) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-4 max-w-lg mx-auto">
          <Card className="p-8 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="font-medium text-foreground mb-1">No Driver Profile</p>
            <p className="text-sm text-muted-foreground">Your driver profile has not been set up yet. Contact admin.</p>
          </Card>
        </main>
        <BottomNav />
      </div>
    );
  }

  const activeBookings = bookings.filter((b) => !["delivered", "cancelled"].includes(b.status || ""));
  const completedBookings = bookings.filter((b) => b.status === "delivered");
  const todayBookings = bookings.filter((b) => {
    if (!b.createdAt) return false;
    const d = new Date(b.createdAt);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const totalEarnings = completedBookings.reduce((sum, b) => {
    return sum + parseFloat(b.actualPrice || b.estimatedPrice || "0");
  }, 0);

  const sections: { key: Section; label: string; icon: typeof Activity }[] = [
    { key: "overview", label: "Overview", icon: Activity },
    { key: "active", label: "Active", icon: Truck },
    { key: "history", label: "History", icon: Clock },
    { key: "profile", label: "Profile", icon: Package },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-xl font-bold text-foreground" data-testid="text-driver-dashboard-title">
            Driver Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {driverProfile.isAvailable ? "Online" : "Offline"}
            </span>
            <Switch
              checked={!!driverProfile.isAvailable}
              onCheckedChange={() => toggleAvailabilityMutation.mutate()}
              data-testid="switch-availability"
            />
          </div>
        </div>

        <div className="flex gap-1 overflow-x-auto pb-1">
          {sections.map((section) => (
            <Button
              key={section.key}
              variant={activeSection === section.key ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection(section.key)}
              className="flex-shrink-0"
              data-testid={`button-section-${section.key}`}
            >
              <section.icon className="h-4 w-4 mr-1" />
              {section.label}
            </Button>
          ))}
        </div>

        {activeSection === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Truck className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Today's Bookings</span>
                </div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-today-bookings">
                  {todayBookings.length}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-completed-count">
                  {completedBookings.length}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Earnings</span>
                </div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-total-earnings">
                  ₹{totalEarnings.toFixed(0)}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Rating</span>
                </div>
                <p className="text-2xl font-bold text-foreground" data-testid="text-driver-rating">
                  {driverProfile.rating || "4.5"}
                </p>
              </Card>
            </div>

            {activeBookings.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Pending Actions</h3>
                {activeBookings.slice(0, 3).map((booking) => (
                  <DriverBookingCard
                    key={booking.id}
                    booking={booking}
                    onStatusUpdate={(status) => updateStatusMutation.mutate({ bookingId: booking.id, status })}
                    isUpdating={updateStatusMutation.isPending}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "active" && (
          <div className="space-y-3">
            {activeBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No active bookings</p>
              </Card>
            ) : (
              activeBookings.map((booking) => (
                <DriverBookingCard
                  key={booking.id}
                  booking={booking}
                  onStatusUpdate={(status) => updateStatusMutation.mutate({ bookingId: booking.id, status })}
                  isUpdating={updateStatusMutation.isPending}
                />
              ))
            )}
          </div>
        )}

        {activeSection === "history" && (
          <div className="space-y-3">
            {completedBookings.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                <p className="text-muted-foreground">No completed bookings yet</p>
              </Card>
            ) : (
              completedBookings.map((booking) => (
                <Card key={booking.id} className="p-4 space-y-2" data-testid={`card-history-${booking.id}`}>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <Badge variant="outline">Delivered</Badge>
                    {booking.createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(booking.createdAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-foreground truncate">{booking.pickupAddress}</p>
                    </div>
                    <div className="flex items-start gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                      <p className="text-sm text-foreground truncate">{booking.dropAddress}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <span className="font-semibold text-primary">
                      ₹{booking.actualPrice || booking.estimatedPrice || "0"}
                    </span>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}

        {activeSection === "profile" && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Driver Info</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Name</span>
                  <span className="font-medium text-foreground" data-testid="text-driver-name">
                    {driverProfile.name}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Phone</span>
                  <span className="text-foreground" data-testid="text-driver-phone">
                    {driverProfile.phone || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Vehicle Number</span>
                  <span className="text-foreground" data-testid="text-vehicle-number">
                    {driverProfile.vehicleNumber || "Not set"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Rating</span>
                  <span className="flex items-center gap-1 text-foreground">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {driverProfile.rating || "4.5"}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Status</span>
                  <Badge variant={driverProfile.isAvailable ? "default" : "secondary"}>
                    {driverProfile.isAvailable ? "Available" : "Unavailable"}
                  </Badge>
                </div>
              </div>
            </Card>

            <Card className="p-4 space-y-3">
              <h3 className="font-semibold text-foreground">Stats</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total Deliveries</span>
                  <span className="font-medium text-foreground">{completedBookings.length}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Total Earnings</span>
                  <span className="font-semibold text-primary">₹{totalEarnings.toFixed(0)}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Active Bookings</span>
                  <span className="text-foreground">{activeBookings.length}</span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function DriverBookingCard({
  booking,
  onStatusUpdate,
  isUpdating,
}: {
  booking: MovingBooking;
  onStatusUpdate: (status: string) => void;
  isUpdating: boolean;
}) {
  const status = statusConfig[booking.status || "pending"];
  const nextStatus = nextStatusMap[booking.status || ""];
  const nextLabel = nextStatusLabel[booking.status || ""];

  return (
    <Card className="p-4 space-y-3" data-testid={`card-driver-booking-${booking.id}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Badge variant={status.variant}>{status.label}</Badge>
        {booking.createdAt && (
          <span className="text-xs text-muted-foreground">
            {new Date(booking.createdAt).toLocaleDateString()}
          </span>
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-foreground">{booking.pickupAddress}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-foreground">{booking.dropAddress}</p>
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
        {booking.description && (
          <span className="flex items-center gap-1">
            <Package className="h-3 w-3" />
            {booking.description}
          </span>
        )}
      </div>

      {booking.estimatedPrice && (
        <div className="flex justify-end">
          <span className="font-semibold text-primary">₹{booking.estimatedPrice}</span>
        </div>
      )}

      {nextStatus && nextLabel && (
        <Button
          className="w-full"
          size="sm"
          onClick={() => onStatusUpdate(nextStatus)}
          disabled={isUpdating}
          data-testid={`button-update-status-${booking.id}`}
        >
          <ArrowRight className="h-4 w-4 mr-1" />
          {nextLabel}
        </Button>
      )}
    </Card>
  );
}
