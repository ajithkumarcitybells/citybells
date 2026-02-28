import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Bike, Car, Truck, Users, Loader2, MapPin, Clock, Shield, Tag, Home, Briefcase, Navigation } from "lucide-react";
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

function getVehicleIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("bike") || lower.includes("two")) return Bike;
  if (lower.includes("auto") || lower.includes("rick")) return Truck;
  return Car;
}

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
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <Button
            size="icon"
            variant="ghost"
            className="text-gray-900 no-default-hover-elevate"
            onClick={() => setLocation("/")}
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900" data-testid="text-page-title">City Bell Taxi</h1>
        </div>
      </div>

      <main className="max-w-lg mx-auto">
        <div className="relative bg-gradient-to-b from-slate-200 to-slate-100 dark:from-slate-800 dark:to-slate-700" style={{ height: 220 }}>
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div className="absolute inset-0 flex flex-col justify-end px-4 pb-4">
            <p className="text-xl font-bold text-foreground mb-3" data-testid="text-where-to">Where to?</p>
            <div className="rounded-md bg-background/95 dark:bg-background/90 p-3 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <div className="flex flex-col items-center pt-2.5 gap-0.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500 flex-shrink-0" />
                  <div className="w-0.5 h-8 border-l-2 border-dashed border-muted-foreground/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0" />
                </div>
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder="Pickup location"
                    value={pickupAddress}
                    onChange={(e) => setPickupAddress(e.target.value)}
                    className="bg-muted/50"
                    data-testid="input-pickup"
                  />
                  <Input
                    placeholder="Drop location"
                    value={dropAddress}
                    onChange={(e) => setDropAddress(e.target.value)}
                    className="bg-muted/50"
                    data-testid="input-drop"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 hover-elevate cursor-pointer" data-testid="link-saved-home">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Home</span>
            </div>
            <div className="flex items-center gap-2 rounded-md bg-muted/60 px-3 py-2 hover-elevate cursor-pointer" data-testid="link-saved-work">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Work</span>
            </div>
          </div>
        </div>

        <div className="px-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Choose your ride</p>

          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-32 w-28 rounded-md flex-shrink-0" />
              ))}
            </div>
          ) : vehicleTypes.length === 0 ? (
            <Card className="p-8 text-center">
              <Car className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm" data-testid="text-no-vehicles">No vehicles available at the moment</p>
            </Card>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
              {vehicleTypes.map((vt) => {
                const isSelected = selectedVehicle === vt.id;
                const VehicleIcon = getVehicleIcon(vt.name);
                return (
                  <div
                    key={vt.id}
                    className={`flex-shrink-0 w-28 rounded-md border-2 p-3 cursor-pointer transition-colors ${
                      isSelected
                        ? "border-amber-400 bg-amber-50 dark:bg-amber-950/30"
                        : "border-border bg-card"
                    }`}
                    onClick={() => handleSelectVehicle(vt.id)}
                    data-testid={`card-vehicle-${vt.id}`}
                  >
                    <div className="flex flex-col items-center text-center gap-1.5">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        isSelected ? "bg-amber-100 dark:bg-amber-900/50" : "bg-muted"
                      }`}>
                        <VehicleIcon className={`h-6 w-6 ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                      </div>
                      <p className="text-xs font-semibold text-foreground truncate w-full" data-testid={`text-vehicle-name-${vt.id}`}>
                        {vt.name}
                      </p>
                      <Badge variant="secondary" className="text-[10px]">
                        <Users className="h-3 w-3 mr-0.5" />
                        {vt.capacity}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {isSelected && estimateMutation.isPending ? (
                          <Loader2 className="h-3 w-3 animate-spin inline" />
                        ) : isSelected && estimatedFare ? (
                          <span className="font-bold text-amber-600 dark:text-amber-400 text-sm" data-testid={`text-fare-${vt.id}`}>
                            ₹{parseFloat(estimatedFare).toFixed(0)}
                          </span>
                        ) : (
                          <span>₹{parseFloat(vt.baseFare).toFixed(0)}+</span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {selectedVehicle && estimatedFare && pickupAddress && dropAddress && (
          <div className="px-4 mt-3">
            <Card className="border-amber-300 dark:border-amber-700 bg-amber-50/50 dark:bg-amber-950/20 p-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated Fare</p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-400" data-testid="text-estimated-fare">
                    ₹{parseFloat(estimatedFare).toFixed(0)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Navigation className="h-3 w-3" />
                    <span className="text-xs">~{(5 + Math.random() * 10).toFixed(1)} km</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground mt-0.5">
                    <Clock className="h-3 w-3" />
                    <span className="text-xs">~{Math.floor(10 + Math.random() * 20)} min</span>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}

        <div className="px-4 mt-4">
          <Button
            className="w-full bg-gradient-to-r from-yellow-400 to-amber-500 text-gray-900 font-bold border-amber-500"
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

        <div className="px-4 mt-4 flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setLocation("/taxi/rides")}
            data-testid="link-ride-history"
          >
            <Clock className="h-4 w-4 mr-1.5" />
            My Rides
          </Button>
          <Button variant="outline" size="sm" data-testid="link-offers">
            <Tag className="h-4 w-4 mr-1.5" />
            Offers
          </Button>
          <Button variant="outline" size="sm" data-testid="link-safety">
            <Shield className="h-4 w-4 mr-1.5" />
            Safety
          </Button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
