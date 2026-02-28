import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, Phone, Car, User, Star, Loader2, CheckCircle2, XCircle, Navigation, Clock, CreditCard } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiRide } from "@shared/schema";

const statusSteps = [
  { key: "searching", label: "Searching" },
  { key: "driver_assigned", label: "Assigned" },
  { key: "arriving", label: "Arriving" },
  { key: "in_ride", label: "In Ride" },
  { key: "completed", label: "Completed" },
];

function getStatusIndex(status: string): number {
  if (status === "cancelled") return -1;
  return statusSteps.findIndex((s) => s.key === status);
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "searching": return "Looking for a driver...";
    case "driver_assigned": return "Your driver is arriving";
    case "arriving": return "Driver is nearby";
    case "in_ride": return "Enjoy your ride!";
    case "completed": return "Ride completed";
    case "cancelled": return "Ride was cancelled";
    default: return "Processing...";
  }
}

export default function TaxiBookingPage() {
  const [, params] = useRoute("/taxi/booking/:id");
  const rideId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userRating, setUserRating] = useState(0);

  const { data: ride, isLoading } = useQuery<TaxiRide>({
    queryKey: ["/api/taxi/rides", rideId],
    enabled: !!rideId,
    refetchInterval: (query) => {
      const data = query.state.data as TaxiRide | undefined;
      if (data && (data.status === "completed" || data.status === "cancelled")) return false;
      return 5000;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("PATCH", `/api/taxi/rides/${rideId}/cancel`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides", rideId] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides"] });
      toast({ title: "Ride Cancelled", description: "Your ride has been cancelled" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("POST", `/api/taxi/rides/${rideId}/rate`, { rating });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides", rideId] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides"] });
      toast({ title: "Thanks!", description: "Your rating has been submitted" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-4">
          <Skeleton className="h-6 w-32 bg-yellow-300/50" />
        </div>
        <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 w-full rounded-md" />
          <Skeleton className="h-32 w-full rounded-md" />
          <Skeleton className="h-24 w-full rounded-md" />
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="bg-gradient-to-r from-yellow-400 to-amber-500 p-4">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Button size="icon" variant="ghost" onClick={() => setLocation("/taxi")} className="text-gray-900" data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-gray-900">Ride Status</h1>
          </div>
        </div>
        <div className="px-4 py-12 max-w-lg mx-auto text-center">
          <XCircle className="h-16 w-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">Ride not found</p>
          <Button onClick={() => setLocation("/taxi")} className="bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 border-amber-500" data-testid="button-back-to-taxi">
            Back to Taxi
          </Button>
        </div>
        <BottomNav />
      </div>
    );
  }

  const currentStepIndex = getStatusIndex(ride.status || "searching");
  const isCancelled = ride.status === "cancelled";
  const isCompleted = ride.status === "completed";
  const canCancel = !isCancelled && !isCompleted && ride.status !== "in_ride";
  const hasDriver = ride.driverName || ride.driverPhone || ride.vehicleNumber;
  const displayRating = ride.rating || userRating;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="bg-gradient-to-r from-yellow-400 to-amber-500 sticky top-0 z-50 p-4">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/taxi")} className="text-gray-900" data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900" data-testid="text-page-title">Ride Status</h1>
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-gray-200 to-gray-100 dark:from-gray-800 dark:to-gray-700 h-48 overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="roadGrid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#roadGrid)" />
          </svg>
        </div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-green-500 border-2 border-white shadow" />
              <span className="text-[10px] text-muted-foreground mt-1 max-w-[80px] truncate">Pickup</span>
            </div>
            <div className="flex items-center gap-0.5">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="w-3 h-0.5 bg-amber-500 rounded-full" />
              ))}
            </div>
            {ride.status === "in_ride" && (
              <div className="bg-amber-500 text-gray-900 rounded-full p-1.5 shadow-lg">
                <Car className="h-4 w-4" />
              </div>
            )}
            {ride.status === "in_ride" && (
              <div className="flex items-center gap-0.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="w-3 h-0.5 bg-gray-400 rounded-full" />
                ))}
              </div>
            )}
            <div className="flex flex-col items-center">
              <div className="w-4 h-4 rounded-full bg-red-500 border-2 border-white shadow" />
              <span className="text-[10px] text-muted-foreground mt-1 max-w-[80px] truncate">Drop</span>
            </div>
          </div>
        </div>
        {ride.status === "searching" && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-3 py-1.5 shadow">
              <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span className="text-xs font-medium text-foreground">Finding nearby drivers</span>
            </div>
          </div>
        )}
      </div>

      <main className="px-4 max-w-lg mx-auto -mt-4 relative z-10 space-y-3">
        {isCancelled && (
          <Card className="p-4 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground" data-testid="text-ride-cancelled">Ride Cancelled</p>
                <p className="text-xs text-muted-foreground">This ride has been cancelled</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            {ride.status === "searching" ? (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-5 w-5 text-amber-600 animate-spin" />
              </div>
            ) : ride.status === "completed" ? (
              <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              </div>
            ) : isCancelled ? (
              <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <Car className="h-5 w-5 text-amber-600" />
              </div>
            )}
            <div>
              <p className="font-bold text-foreground" data-testid="text-status-message">{getStatusMessage(ride.status || "searching")}</p>
              {ride.duration && !isCompleted && !isCancelled && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  ETA: {ride.duration} min
                </p>
              )}
            </div>
          </div>

          {!isCancelled && (
            <div className="flex items-center gap-1 justify-between">
              {statusSteps.map((step, index) => {
                const isActive = index <= currentStepIndex;
                const isCurrent = index === currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center flex-1 gap-1">
                    <div
                      className={`w-3 h-3 rounded-full border-2 transition-colors ${
                        isCurrent
                          ? "bg-amber-500 border-amber-500 shadow-sm"
                          : isActive
                            ? "bg-green-500 border-green-500"
                            : "bg-gray-200 dark:bg-gray-700 border-gray-300 dark:border-gray-600"
                      }`}
                      data-testid={`dot-status-${step.key}`}
                    />
                    <span
                      className={`text-[9px] leading-tight text-center ${
                        isCurrent ? "font-semibold text-amber-600 dark:text-amber-400" : isActive ? "text-green-600 dark:text-green-400" : "text-muted-foreground"
                      }`}
                      data-testid={`text-status-${step.key}`}
                    >
                      {step.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {hasDriver && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-amber-200 dark:border-amber-700">
                <User className="h-6 w-6 text-amber-700 dark:text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                {ride.driverName && (
                  <p className="font-semibold text-sm text-foreground" data-testid="text-driver-name">{ride.driverName}</p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  {ride.vehicleNumber && (
                    <Badge variant="secondary" className="text-[10px]" data-testid="text-vehicle-number">
                      {ride.vehicleNumber}
                    </Badge>
                  )}
                  {ride.rating && (
                    <div className="flex items-center gap-0.5">
                      <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                      <span className="text-xs text-muted-foreground">{ride.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              {ride.driverPhone && (
                <a href={`tel:${ride.driverPhone}`} data-testid="link-call-driver">
                  <Button size="icon" className="bg-green-500 border-green-600 text-white rounded-full">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="flex flex-col items-center gap-0.5 pt-1">
                <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
                <div className="w-0.5 h-6 bg-gray-200 dark:bg-gray-700" />
                <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
              </div>
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Pickup</p>
                  <p className="text-sm text-foreground" data-testid="text-pickup">{ride.pickupAddress}</p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Drop</p>
                  <p className="text-sm text-foreground" data-testid="text-drop">{ride.dropAddress}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Estimated Fare</p>
              <p className="text-xl font-bold text-foreground" data-testid="text-estimated-fare">
                ₹{ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
              </p>
            </div>
            {ride.actualFare && (
              <div className="text-right">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actual Fare</p>
                <p className="text-xl font-bold text-green-600" data-testid="text-actual-fare">
                  ₹{parseFloat(ride.actualFare).toFixed(0)}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 mt-3 pt-3 border-t flex-wrap">
            {ride.distance && (
              <div className="flex items-center gap-1.5">
                <Navigation className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{parseFloat(ride.distance).toFixed(1)} km</span>
              </div>
            )}
            {ride.duration && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{ride.duration} min</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">Cash</span>
            </div>
          </div>
        </Card>

        {isCompleted && !ride.rating && (
          <Card className="p-4">
            <p className="text-sm font-semibold text-foreground mb-3 text-center">Rate your ride</p>
            <div className="flex items-center justify-center gap-2 mb-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setUserRating(star)}
                  className="p-1"
                  data-testid={`button-rate-${star}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (userRating || 0)
                        ? "fill-amber-500 text-amber-500"
                        : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                </button>
              ))}
            </div>
            {userRating > 0 && (
              <Button
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 border-amber-500"
                onClick={() => rateMutation.mutate(userRating)}
                disabled={rateMutation.isPending}
                data-testid="button-submit-rating"
              >
                {rateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Submit Rating
              </Button>
            )}
          </Card>
        )}

        {isCompleted && ride.rating && (
          <Card className="p-4">
            <div className="flex flex-col items-center gap-2">
              <p className="text-sm text-muted-foreground">Your Rating</p>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-5 w-5 ${
                      star <= ride.rating! ? "fill-amber-500 text-amber-500" : "text-gray-300 dark:text-gray-600"
                    }`}
                  />
                ))}
              </div>
            </div>
          </Card>
        )}

        <div className="flex gap-2 pb-4 flex-wrap">
          {canCancel && (
            <Button
              variant="outline"
              className="flex-1 border-red-300 dark:border-red-700 text-red-600 dark:text-red-400"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-ride"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Ride
            </Button>
          )}
          {(isCompleted || isCancelled) && (
            <Button
              className="flex-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 border-amber-500"
              onClick={() => setLocation("/taxi")}
              data-testid="button-book-another"
            >
              Book Again
            </Button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
