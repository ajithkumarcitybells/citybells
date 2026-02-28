import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { ChevronLeft, MapPin, Phone, Car, User, Star, Loader2, CheckCircle2, XCircle, Navigation } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiRide } from "@shared/schema";

const statusSteps = [
  { key: "searching", label: "Searching for driver", icon: Loader2 },
  { key: "driver_assigned", label: "Driver assigned", icon: Car },
  { key: "arriving", label: "Driver arriving", icon: Navigation },
  { key: "in_ride", label: "In ride", icon: Car },
  { key: "completed", label: "Ride completed", icon: CheckCircle2 },
];

function getStatusIndex(status: string): number {
  if (status === "cancelled") return -1;
  return statusSteps.findIndex((s) => s.key === status);
}

export default function TaxiBookingPage() {
  const [, params] = useRoute("/taxi/booking/:id");
  const rideId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!ride) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <XCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Ride not found</p>
          <Button variant="ghost" onClick={() => setLocation("/taxi")} className="mt-4" data-testid="button-back-to-taxi">
            Back to Taxi
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const currentStepIndex = getStatusIndex(ride.status || "searching");
  const isCancelled = ride.status === "cancelled";
  const isCompleted = ride.status === "completed";
  const canCancel = !isCancelled && !isCompleted && ride.status !== "in_ride";

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/taxi")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Ride Status</h1>
        </div>

        {isCancelled && (
          <Card className="p-4 mb-4 bg-red-50 border-red-200">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <p className="text-red-700 font-medium text-sm" data-testid="text-ride-cancelled">Ride Cancelled</p>
            </div>
          </Card>
        )}

        <Card className="p-4 mb-4">
          <div className="space-y-4">
            {statusSteps.map((step, index) => {
              const isActive = index <= currentStepIndex && !isCancelled;
              const isCurrent = index === currentStepIndex && !isCancelled;
              const StepIcon = step.icon;
              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      isCurrent ? "bg-primary text-white" : isActive ? "bg-green-100 text-green-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {isCurrent && step.key === "searching" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <StepIcon className="h-4 w-4" />
                    )}
                  </div>
                  <span
                    className={`text-sm ${isCurrent ? "font-semibold text-gray-800" : isActive ? "text-gray-600" : "text-gray-400"}`}
                    data-testid={`text-status-${step.key}`}
                  >
                    {step.label}
                  </span>
                  {isCurrent && (
                    <Badge variant="secondary" className="ml-auto text-[10px]">Current</Badge>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-600 mb-3">Trip Details</h3>
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Pickup</p>
                <p className="text-sm text-gray-700" data-testid="text-pickup">{ride.pickupAddress}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
              <div>
                <p className="text-xs text-gray-400">Drop</p>
                <p className="text-sm text-gray-700" data-testid="text-drop">{ride.dropAddress}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-gray-100 flex-wrap">
            <div>
              <p className="text-xs text-gray-400">Estimated Fare</p>
              <p className="font-bold text-gray-800" data-testid="text-estimated-fare">
                ₹{ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
              </p>
            </div>
            {ride.actualFare && (
              <div>
                <p className="text-xs text-gray-400">Actual Fare</p>
                <p className="font-bold text-green-600" data-testid="text-actual-fare">
                  ₹{parseFloat(ride.actualFare).toFixed(0)}
                </p>
              </div>
            )}
            {ride.distance && (
              <div>
                <p className="text-xs text-gray-400">Distance</p>
                <p className="font-semibold text-gray-700">{parseFloat(ride.distance).toFixed(1)} km</p>
              </div>
            )}
          </div>
        </Card>

        {(ride.driverName || ride.driverPhone || ride.vehicleNumber) && (
          <Card className="p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-600 mb-3">Driver Details</h3>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="h-6 w-6 text-gray-500" />
              </div>
              <div className="flex-1 min-w-0">
                {ride.driverName && (
                  <p className="font-semibold text-gray-800 text-sm" data-testid="text-driver-name">{ride.driverName}</p>
                )}
                {ride.vehicleNumber && (
                  <p className="text-xs text-gray-500" data-testid="text-vehicle-number">{ride.vehicleNumber}</p>
                )}
              </div>
              {ride.driverPhone && (
                <a href={`tel:${ride.driverPhone}`} data-testid="link-call-driver">
                  <Button size="icon" variant="outline">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
          </Card>
        )}

        <div className="flex gap-2 flex-wrap">
          {canCancel && (
            <Button
              variant="destructive"
              className="flex-1"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              data-testid="button-cancel-ride"
            >
              {cancelMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Cancel Ride
            </Button>
          )}
          {(isCompleted || isCancelled) && (
            <Button className="flex-1" onClick={() => setLocation("/taxi")} data-testid="button-book-another">
              Book Another Ride
            </Button>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
