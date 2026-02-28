import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Car, MapPin, Clock, Star, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiRide } from "@shared/schema";

function getStatusColor(status: string) {
  switch (status) {
    case "searching": return "bg-yellow-100 text-yellow-800";
    case "driver_assigned": return "bg-blue-100 text-blue-800";
    case "arriving": return "bg-indigo-100 text-indigo-800";
    case "in_ride": return "bg-purple-100 text-purple-800";
    case "completed": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-gray-100 text-gray-800";
  }
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
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

  return (
    <Card
      className="p-4 border-gray-100"
      data-testid={`card-ride-${ride.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className={`${getStatusColor(ride.status || "searching")} border-transparent text-[10px]`}>
            {formatStatus(ride.status || "searching")}
          </Badge>
          {ride.createdAt && (
            <span className="text-xs text-gray-400">
              {new Date(ride.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-800 text-sm" data-testid={`text-ride-fare-${ride.id}`}>
            ₹{ride.actualFare ? parseFloat(ride.actualFare).toFixed(0) : ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex items-start gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 line-clamp-1" data-testid={`text-ride-pickup-${ride.id}`}>{ride.pickupAddress}</p>
        </div>
        <div className="flex items-start gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
          <p className="text-sm text-gray-700 line-clamp-1" data-testid={`text-ride-drop-${ride.id}`}>{ride.dropAddress}</p>
        </div>
      </div>

      {ride.driverName && (
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Car className="h-3.5 w-3.5" />
          <span data-testid={`text-ride-driver-${ride.id}`}>{ride.driverName}</span>
          {ride.vehicleNumber && <span>({ride.vehicleNumber})</span>}
        </div>
      )}

      {ride.rating && (
        <div className="flex items-center gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <Star
              key={s}
              className={`h-4 w-4 ${s <= ride.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`}
            />
          ))}
          <span className="text-xs text-gray-500 ml-1">Your rating</span>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {isActive && (
          <Button
            size="sm"
            onClick={() => setLocation(`/taxi/booking/${ride.id}`)}
            data-testid={`button-track-${ride.id}`}
          >
            Track Ride
          </Button>
        )}
        {canRate && (
          <div className="flex items-center gap-1">
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
                  className={`h-5 w-5 cursor-pointer ${
                    s <= ratingValue ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-300"
                  }`}
                />
              </button>
            ))}
            {rateMutation.isPending && <Loader2 className="h-4 w-4 animate-spin text-primary ml-1" />}
          </div>
        )}
      </div>
    </Card>
  );
}

export default function TaxiRidesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: rides = [], isLoading } = useQuery<TaxiRide[]>({
    queryKey: ["/api/taxi/rides"],
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <p className="text-gray-500 mb-4">Please log in to view your rides</p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-login">Log In</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/taxi")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">My Rides</h1>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 w-full rounded-lg" />
            ))}
          </div>
        ) : rides.length === 0 ? (
          <Card className="p-8 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm mb-4">No rides yet</p>
            <Button onClick={() => setLocation("/taxi")} data-testid="button-book-first">
              Book Your First Ride
            </Button>
          </Card>
        ) : (
          <div className="space-y-3">
            {rides.map((ride) => (
              <RideCard key={ride.id} ride={ride} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
