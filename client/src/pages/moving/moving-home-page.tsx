import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  Truck,
  ArrowRight,
  Package,
  History,
  Search,
  ArrowLeft,
  Navigation,
  ChevronRight,
} from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import type { MovingBooking } from "@shared/schema";

function getStatusColor(status: string) {
  switch (status) {
    case "pending":
      return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
    case "confirmed":
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
    case "picked_up":
      return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200";
    case "in_transit":
      return "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200";
    case "delivered":
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "pending":
      return "Pending";
    case "confirmed":
      return "Confirmed";
    case "picked_up":
      return "Picked Up";
    case "in_transit":
      return "In Transit";
    case "delivered":
      return "Delivered";
    case "cancelled":
      return "Cancelled";
    default:
      return status;
  }
}

export default function MovingHomePage() {
  const [, setLocation] = useLocation();
  const [trackingInput, setTrackingInput] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [description, setDescription] = useState("");
  const [helpersCount, setHelpersCount] = useState(0);
  const bookingFormRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery<MovingBooking[]>({
    queryKey: ["/api/moving/bookings"],
    enabled: !!user,
  });

  const activeBookings = bookings.filter(
    (b) => b.status === "pending" || b.status === "confirmed" || b.status === "in_transit" || b.status === "picked_up"
  );

  const handleGetEstimate = () => {
    const params = new URLSearchParams();
    if (pickupAddress) params.set("pickup", pickupAddress);
    if (dropAddress) params.set("drop", dropAddress);
    if (scheduledDate) params.set("date", scheduledDate);
    if (scheduledTime) params.set("time", scheduledTime);
    if (description) params.set("desc", description);
    if (helpersCount > 0) params.set("helpers", String(helpersCount));
    setLocation(`/moving/vehicles?${params.toString()}`);
  };

  const handleTrackOrder = () => {
    if (trackingInput.trim()) {
      setLocation(`/moving/bookings?track=${encodeURIComponent(trackingInput.trim())}`);
    } else {
      setLocation("/moving/bookings");
    }
  };

  const handleBookPackage = () => {
    bookingFormRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const isFormValid = pickupAddress.trim() && dropAddress.trim();

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-50 bg-background border-b shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => window.history.back()} data-testid="button-back">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground" data-testid="text-moving-title">
              Parcel Delivery
            </h1>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Navigation className="h-3 w-3" />
              <span>Your location</span>
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-5">
        <div className="rounded-md bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white">
          <h2 className="text-lg font-bold mb-1" data-testid="text-track-title">
            Track your package
          </h2>
          <p className="text-sm text-white/80 mb-4">
            Enter your tracking number to see delivery status
          </p>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/50" />
            <Input
              placeholder="Enter tracking number (e.g. CBH12345AB)"
              value={trackingInput}
              onChange={(e) => setTrackingInput(e.target.value)}
              className="pl-10 bg-white/15 border-white/20 text-white placeholder:text-white/50 focus-visible:ring-white/30"
              data-testid="input-tracking-number"
            />
          </div>

          <div className="flex gap-3">
            <Button
              variant="secondary"
              className="flex-1 bg-white text-indigo-700 hover-elevate"
              onClick={handleTrackOrder}
              data-testid="button-track-order"
            >
              <Search className="h-4 w-4 mr-1.5" />
              Track Order
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white/30 text-white bg-white/10 backdrop-blur-sm"
              onClick={handleBookPackage}
              data-testid="button-book-package-hero"
            >
              <Package className="h-4 w-4 mr-1.5" />
              Book Package
            </Button>
          </div>
        </div>

        {user && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-base font-semibold text-foreground" data-testid="text-current-shipments">
                Current Shipments
              </h3>
              <Link href="/moving/bookings">
                <Button variant="ghost" size="sm" data-testid="link-see-all-bookings">
                  See all
                  <ChevronRight className="h-4 w-4 ml-0.5" />
                </Button>
              </Link>
            </div>

            {bookingsLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-32 w-full rounded-md" />
                <Skeleton className="h-32 w-full rounded-md" />
              </div>
            ) : activeBookings.length === 0 ? (
              <Card className="p-6 text-center">
                <Package className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No active shipments</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Book a package to get started
                </p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeBookings.slice(0, 3).map((booking) => (
                  <Card
                    key={booking.id}
                    className="p-4 hover-elevate cursor-pointer"
                    onClick={() => setLocation(`/moving/bookings?track=${booking.trackingNumber || ""}`)}
                    data-testid={`card-shipment-${booking.id}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-md bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center flex-shrink-0">
                          <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {booking.description || "Package Delivery"}
                          </p>
                          <p className="text-xs text-muted-foreground font-mono">
                            {booking.trackingNumber || "—"}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`text-xs px-2 py-0.5 rounded-md font-medium ${getStatusColor(booking.status || "pending")}`}
                        data-testid={`badge-status-${booking.id}`}
                      >
                        {getStatusLabel(booking.status || "pending")}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-green-600 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground line-clamp-1">{booking.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-3.5 w-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                        <span className="text-muted-foreground line-clamp-1">{booking.dropAddress}</span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        <div ref={bookingFormRef}>
          <h3 className="text-base font-semibold text-foreground mb-3" data-testid="text-book-package-title">
            Book a Package
          </h3>
          <Card className="p-4 space-y-4">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="pickup" className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-green-600" />
                  Pickup Location
                </Label>
                <Input
                  id="pickup"
                  placeholder="Enter pickup address"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  data-testid="input-pickup-address"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="drop" className="text-sm font-medium flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-red-500" />
                  Drop Location
                </Label>
                <Input
                  id="drop"
                  placeholder="Enter drop address"
                  value={dropAddress}
                  onChange={(e) => setDropAddress(e.target.value)}
                  data-testid="input-drop-address"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="date" className="text-sm font-medium flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  Date
                </Label>
                <Input
                  id="date"
                  type="date"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  data-testid="input-scheduled-date"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="time" className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Time
                </Label>
                <Input
                  id="time"
                  type="time"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  data-testid="input-scheduled-time"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description" className="text-sm font-medium flex items-center gap-1.5">
                <Package className="h-4 w-4 text-muted-foreground" />
                What are you moving?
              </Label>
              <Textarea
                id="description"
                placeholder="e.g., 1 BHK apartment furniture, 5 boxes, washing machine..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                rows={3}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium flex items-center gap-1.5">
                <Users className="h-4 w-4 text-muted-foreground" />
                Helpers Needed
              </Label>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHelpersCount(Math.max(0, helpersCount - 1))}
                  disabled={helpersCount === 0}
                  data-testid="button-helpers-minus"
                >
                  -
                </Button>
                <span className="text-lg font-semibold w-8 text-center" data-testid="text-helpers-count">
                  {helpersCount}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setHelpersCount(helpersCount + 1)}
                  data-testid="button-helpers-plus"
                >
                  +
                </Button>
                <span className="text-sm text-muted-foreground ml-2">
                  Loading/unloading help
                </span>
              </div>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={handleGetEstimate}
              disabled={!isFormValid}
              data-testid="button-get-estimate"
            >
              <Truck className="h-5 w-5 mr-2" />
              Choose Vehicle
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Card>
        </div>

        <div>
          <h3 className="text-base font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-3">
            <Card
              className="p-4 flex flex-col items-center text-center hover-elevate cursor-pointer"
              onClick={handleBookPackage}
              data-testid="card-quick-book"
            >
              <div className="w-10 h-10 rounded-md bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center mb-2">
                <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-300" />
              </div>
              <span className="text-xs font-medium text-foreground">Book Package</span>
            </Card>

            <Card
              className="p-4 flex flex-col items-center text-center hover-elevate cursor-pointer"
              onClick={handleTrackOrder}
              data-testid="card-quick-track"
            >
              <div className="w-10 h-10 rounded-md bg-purple-100 dark:bg-purple-900 flex items-center justify-center mb-2">
                <Search className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <span className="text-xs font-medium text-foreground">Track Order</span>
            </Card>

            <Link href="/moving/bookings">
              <Card
                className="p-4 flex flex-col items-center text-center hover-elevate cursor-pointer"
                data-testid="card-quick-bookings"
              >
                <div className="w-10 h-10 rounded-md bg-blue-100 dark:bg-blue-900 flex items-center justify-center mb-2">
                  <History className="h-5 w-5 text-blue-600 dark:text-blue-300" />
                </div>
                <span className="text-xs font-medium text-foreground">My Bookings</span>
              </Card>
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
