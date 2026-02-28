import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, MapPin, Navigation, Car, Users, Zap, Loader2 } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiVehicleType, TaxiRide } from "@shared/schema";

export default function TaxiHomePage() {
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);
  const [estimatedFare, setEstimatedFare] = useState<string | null>(null);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: vehicleTypes = [], isLoading } = useQuery<TaxiVehicleType[]>({
    queryKey: ["/api/taxi/vehicle-types"],
  });

  const estimateMutation = useMutation({
    mutationFn: async (vehicleTypeId: string) => {
      const distance = 5 + Math.random() * 15;
      const duration = 10 + Math.random() * 30;
      const res = await apiRequest("POST", "/api/taxi/estimate", {
        vehicleTypeId,
        distance: parseFloat(distance.toFixed(1)),
        duration: parseFloat(duration.toFixed(0)),
      });
      return await res.json();
    },
    onSuccess: (data) => {
      setEstimatedFare(data.estimatedFare);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/taxi/rides", {
        vehicleTypeId: selectedVehicle,
        pickupAddress,
        dropAddress,
        estimatedFare,
        distance: (5 + Math.random() * 15).toFixed(1),
      });
      return await res.json();
    },
    onSuccess: (ride: TaxiRide) => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides"] });
      toast({ title: "Ride Booked", description: "Searching for a driver..." });
      setLocation(`/taxi/booking/${ride.id}`);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicle(id);
    if (user && pickupAddress && dropAddress) {
      estimateMutation.mutate(id);
    }
  };

  const handleBook = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (!pickupAddress || !dropAddress) {
      toast({ title: "Missing Details", description: "Please enter pickup and drop locations", variant: "destructive" });
      return;
    }
    if (!selectedVehicle) {
      toast({ title: "Select Vehicle", description: "Please select a vehicle type", variant: "destructive" });
      return;
    }
    bookMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Book a Ride</h1>
        </div>

        <Card className="p-4 mb-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500 flex-shrink-0" />
              <Input
                placeholder="Enter pickup location"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                data-testid="input-pickup"
              />
            </div>
            <div className="border-l-2 border-dashed border-gray-300 h-4 ml-1.5" />
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-500 flex-shrink-0" />
              <Input
                placeholder="Enter drop location"
                value={dropAddress}
                onChange={(e) => setDropAddress(e.target.value)}
                data-testid="input-drop"
              />
            </div>
          </div>
        </Card>

        <h2 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Choose your ride</h2>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {vehicleTypes.map((vt) => {
              const isSelected = selectedVehicle === vt.id;
              return (
                <Card
                  key={vt.id}
                  className={`p-3 cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary border-primary" : "border-gray-100"}`}
                  onClick={() => handleSelectVehicle(vt.id)}
                  data-testid={`card-vehicle-${vt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Car className="h-7 w-7 text-gray-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-gray-800 text-sm" data-testid={`text-vehicle-name-${vt.id}`}>
                          {vt.name}
                        </h3>
                        <Badge variant="secondary" className="text-[10px]">
                          <Users className="h-3 w-3 mr-1" />
                          {vt.capacity}
                        </Badge>
                      </div>
                      {vt.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{vt.description}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        Base: ₹{parseFloat(vt.baseFare).toFixed(0)} + ₹{parseFloat(vt.perKmRate).toFixed(0)}/km
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {isSelected && estimatedFare ? (
                        <p className="font-bold text-primary text-base" data-testid={`text-fare-${vt.id}`}>
                          ₹{parseFloat(estimatedFare).toFixed(0)}
                        </p>
                      ) : isSelected && estimateMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      ) : (
                        <p className="text-sm text-gray-400">₹{parseFloat(vt.baseFare).toFixed(0)}+</p>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {vehicleTypes.length === 0 && !isLoading && (
          <Card className="p-8 text-center">
            <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">No vehicles available at the moment</p>
          </Card>
        )}

        <div className="mt-4">
          <Button
            className="w-full"
            size="lg"
            disabled={!pickupAddress || !dropAddress || !selectedVehicle || bookMutation.isPending}
            onClick={handleBook}
            data-testid="button-book-ride"
          >
            {bookMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : null}
            {bookMutation.isPending ? "Booking..." : "Book Ride"}
          </Button>
        </div>

        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={() => setLocation("/taxi/rides")} data-testid="link-ride-history">
            View Ride History
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
