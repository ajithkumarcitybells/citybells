import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Car, Star, Loader2, Bike, Navigation } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { EtaBadge } from "@/components/taxi/EtaBadge";
import type { TaxiRide } from "@shared/schema";

type FilterTab = "all" | "completed" | "cancelled";

function getStatusBadgeClasses(status: string) {
  switch (status) {
    case "searching":
    case "requested":
    case "accepted":
    case "driver_assigned":
    case "arriving":
    case "started":
    case "in_ride":
      return "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300";
    case "completed":
      return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300";
    case "cancelled":
      return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300";
    default:
      return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300";
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getVehicleIcon(vehicleTypeId?: string | null) {
  if (vehicleTypeId === "bike") return Bike;
  return Car;
}

function RideCard({ ride }: { ride: TaxiRide }) {
  const [, setLocation] = useLocation();
  const [ratingValue, setRatingValue] = useState(0);
  const { toast } = useToast();

  const rateMutation = useMutation({
    mutationFn: async (rating: number) => {
      const res = await apiRequest("POST", `/api/taxi/rides/${ride.id}/rate`, { rating });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides"] });
      toast({ title: "Rated", description: "Thanks for your feedback!" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const isActive = ride.status !== "completed" && ride.status !== "cancelled";
  const canRate = ride.status === "completed" && !ride.rating;
  const VehicleIcon = getVehicleIcon(ride.vehicleTypeId);

  return (
    <Card
      className="p-4 overflow-visible"
      data-testid={`card-ride-${ride.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex flex-col gap-1">
          {ride.createdAt && (
            <span className="text-xs font-medium text-muted-foreground" data-testid={`text-ride-date-${ride.id}`}>
              {new Date(ride.createdAt).toLocaleDateString("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          )}
          {ride.createdAt && (
            <span className="text-xs text-muted-foreground">
              {new Date(ride.createdAt).toLocaleTimeString("en-IN", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <Badge className={`${getStatusBadgeClasses(ride.status || "searching")} border-transparent text-[10px]`}>
          {formatStatus(ride.status || "searching")}
        </Badge>
      </div>

      <div className="flex items-start gap-3 mb-3">
        <div className="flex flex-col items-center gap-0.5 pt-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
          <div className="w-px h-6 bg-gray-300 dark:bg-gray-600" />
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
        </div>
        <div className="flex-1 space-y-2 min-w-0">
          <p className="text-sm text-foreground line-clamp-1" data-testid={`text-ride-pickup-${ride.id}`}>{ride.pickupAddress}</p>
          <p className="text-sm text-foreground line-clamp-1" data-testid={`text-ride-drop-${ride.id}`}>{ride.dropAddress}</p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <VehicleIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground capitalize">{ride.vehicleTypeId || "Cab"}</span>
        </div>
        <p className="font-bold text-base text-foreground" data-testid={`text-ride-fare-${ride.id}`}>
          ₹{ride.actualFare ? parseFloat(ride.actualFare).toFixed(0) : ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
        </p>
      </div>

      {((ride as any).predictedPickupEtaMin || (ride as any).predictedTripEtaMin || ride.duration) && (
        <div className="mb-3 flex flex-wrap gap-2">
          <EtaBadge minutes={(ride as any).predictedPickupEtaMin} label="away" tone="pickup" />
          <EtaBadge minutes={(ride as any).predictedTripEtaMin || ride.duration} label="trip" tone="trip" />
          {(ride as any).etaConfidence && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {(ride as any).etaConfidence} confidence
            </span>
          )}
        </div>
      )}

      {ride.driverName && (
        <div className="flex items-center gap-2 mb-3 pb-3 border-b">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
              {ride.driverName.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <span className="text-sm text-foreground" data-testid={`text-ride-driver-${ride.id}`}>{ride.driverName}</span>
            {ride.vehicleNumber && (
              <span className="text-xs text-muted-foreground ml-2">({ride.vehicleNumber})</span>
            )}
          </div>
        </div>
      )}

      {ride.rating && (
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-4 w-4 ${s <= ride.rating! ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"}`}
            />
          ))}
          <span className="text-xs text-muted-foreground ml-1">Your rating</span>
        </div>
      )}

      {canRate && (
        <div className="flex items-center gap-1 mb-3">
          <span className="text-xs text-muted-foreground mr-1">Rate:</span>
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => {
                setRatingValue(s);
                rateMutation.mutate(s);
              }}
              disabled={rateMutation.isPending}
              data-testid={`button-rate-${ride.id}-${s}`}
            >
              <Star
                className={`h-5 w-5 cursor-pointer transition-colors ${
                  s <= ratingValue ? "text-amber-400 fill-amber-400" : "text-gray-300 dark:text-gray-600"
                }`}
              />
            </button>
          ))}
          {rateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-amber-500 ml-1" />}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isActive && (
          <Button
            size="sm"
            className="bg-amber-500 hover:bg-amber-500 text-black border-amber-600"
            onClick={() => setLocation(`/taxi/booking/${ride.id}`)}
            data-testid={`button-track-${ride.id}`}
          >
            <Navigation className="h-3.5 w-3.5 mr-1" />
            Track Ride
          </Button>
        )}
        {ride.status === "completed" && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocation("/taxi")}
            data-testid={`button-book-again-${ride.id}`}
          >
            Book Again
          </Button>
        )}
      </div>
    </Card>
  );
}

export default function TaxiRidesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  const { data: rides = [], isLoading } = useQuery<TaxiRide[]>({
    queryKey: ["/api/taxi/rides"],
    enabled: !!user,
  });

  const filteredRides = rides.filter((ride) => {
    if (activeTab === "all") return true;
    if (activeTab === "completed") return ride.status === "completed";
    if (activeTab === "cancelled") return ride.status === "cancelled";
    return true;
  });

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3">
          <div className="flex items-center gap-3 max-w-lg mx-auto">
            <Button size="icon" variant="ghost" className="text-black" onClick={() => setLocation("/taxi")} data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold text-black" data-testid="text-page-title">My Rides</h1>
          </div>
        </div>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <p className="text-muted-foreground mb-4">Please log in to view your rides</p>
          <Button className="bg-amber-500 hover:bg-amber-500 text-black border-amber-600" onClick={() => setLocation("/auth")} data-testid="button-login">Log In</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button size="icon" variant="ghost" className="text-black" onClick={() => setLocation("/taxi")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-black" data-testid="text-page-title">My Rides</h1>
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex gap-2 mb-4 flex-wrap">
          {tabs.map((tab) => (
            <Button
              key={tab.key}
              size="sm"
              variant={activeTab === tab.key ? "default" : "outline"}
              className={activeTab === tab.key ? "bg-amber-500 hover:bg-amber-500 text-black border-amber-600 rounded-full" : "rounded-full"}
              onClick={() => setActiveTab(tab.key)}
              data-testid={`button-tab-${tab.key}`}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        ) : filteredRides.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="h-12 w-12 text-amber-400 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm mb-1 font-medium">No rides yet</p>
            <p className="text-xs text-muted-foreground mb-4">Your ride history will appear here</p>
            <Button
              className="bg-amber-500 hover:bg-amber-500 text-black border-amber-600"
              onClick={() => setLocation("/taxi")}
              data-testid="button-book-first"
            >
              Book Your First Ride
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredRides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
