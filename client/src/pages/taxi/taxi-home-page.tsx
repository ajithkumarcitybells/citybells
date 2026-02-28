import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Bike, Car, Truck, Users, Loader2, MapPin, Banknote, Percent, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiVehicleType, TaxiRide } from "@shared/schema";

function getVehicleIcon(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("bike") || lower.includes("scoot") || lower.includes("two")) return Bike;
  if (lower.includes("auto") || lower.includes("rick")) return Truck;
  return Car;
}

function getVehicleDescription(name: string) {
  const lower = name.toLowerCase();
  if (lower.includes("bike")) return "Quick & Affordable";
  if (lower.includes("scoot")) return "Spacious & Comfortable";
  if (lower.includes("auto")) return "No Bargaining, Fair Price";
  if (lower.includes("economy") || lower.includes("mini")) return "Affordable AC Rides";
  if (lower.includes("priority") || lower.includes("premium") || lower.includes("sedan")) return "Top Rated Drivers, Priority Pickup";
  if (lower.includes("suv")) return "Spacious SUV for Groups";
  return "Comfortable Ride";
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

  const fares = useMemo(() => {
    const map: Record<string, string> = {};
    vehicleTypes.forEach((vt) => {
      const distance = 8;
      const fare = parseFloat(vt.baseFare) + parseFloat(vt.perKmRate) * distance;
      map[vt.id] = fare.toFixed(0);
    });
    return map;
  }, [vehicleTypes]);

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

  const selectedVehicleType = vehicleTypes.find((v) => v.id === selectedVehicle);
  const selectedName = selectedVehicleType?.name || "Ride";
  const etaMin = 2;
  const now = new Date();
  const dropTime = new Date(now.getTime() + (etaMin + 15) * 60000);
  const dropTimeStr = dropTime.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true }).toLowerCase();

  return (
    <div className="min-h-screen bg-background flex flex-col pb-20">
      <div className="sticky top-0 z-50 bg-white dark:bg-gray-900 border-b border-border">
        <div className="flex items-center justify-between px-4 py-2.5 max-w-lg mx-auto">
          <div className="flex items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setLocation("/")}
              data-testid="button-back"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-foreground" />
              <span className="text-sm font-semibold text-foreground">City Bell Taxi</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="rounded-full"
            data-testid="button-maps"
          >
            Maps
          </Button>
        </div>
      </div>

      <div className="relative bg-gradient-to-b from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex-shrink-0" style={{ height: 260 }}>
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
            backgroundSize: "30px 30px",
          }}
        />

        <div className="absolute top-4 left-4 right-4 max-w-lg mx-auto">
          <div className="flex items-start gap-3">
            <div className="flex flex-col items-center pt-3 gap-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-0.5 flex-1 min-h-[32px] bg-gray-800 dark:bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
            </div>
            <div className="flex-1 space-y-2">
              <Input
                placeholder="Enter pickup location"
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                className="bg-white dark:bg-gray-800 shadow-sm"
                data-testid="input-pickup"
              />
              <Input
                placeholder="Enter drop location"
                value={dropAddress}
                onChange={(e) => setDropAddress(e.target.value)}
                className="bg-white dark:bg-gray-800 shadow-sm"
                data-testid="input-drop"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-3 right-3">
          <Button variant="outline" size="sm" className="rounded-full bg-white dark:bg-gray-800 shadow-md" data-testid="button-add-stop">
            <span className="mr-1">◇</span>
            Add stop
          </Button>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full">
        {isLoading ? (
          <div className="px-4 py-3 space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : vehicleTypes.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <Car className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm" data-testid="text-no-vehicles">No vehicles available at the moment</p>
          </div>
        ) : (
          <div className="px-2 py-2 space-y-1">
            {vehicleTypes.map((vt) => {
              const isSelected = selectedVehicle === vt.id;
              const VehicleIcon = getVehicleIcon(vt.name);
              const fare = isSelected && estimatedFare ? parseFloat(estimatedFare).toFixed(0) : fares[vt.id] || parseFloat(vt.baseFare).toFixed(0);
              const description = vt.description || getVehicleDescription(vt.name);

              return (
                <div
                  key={vt.id}
                  className={`px-3 py-3 rounded-lg cursor-pointer transition-all ${
                    isSelected
                      ? "border-2 border-gray-800 dark:border-gray-200 bg-white dark:bg-gray-800"
                      : "border-2 border-transparent"
                  }`}
                  onClick={() => handleSelectVehicle(vt.id)}
                  data-testid={`card-vehicle-${vt.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 flex items-center justify-center flex-shrink-0">
                      <VehicleIcon className={`h-7 w-7 ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground" data-testid={`text-vehicle-name-${vt.id}`}>
                          {vt.name}
                        </p>
                        {isSelected && (
                          <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {vt.capacity}
                          </span>
                        )}
                      </div>
                      {isSelected && (
                        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {etaMin} mins · Drop {dropTimeStr}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      {isSelected && estimateMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin text-foreground" />
                      ) : (
                        <p className="font-bold text-base text-foreground" data-testid={`text-fare-${vt.id}`}>
                          ₹{fare}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="fixed bottom-16 left-0 right-0 z-40 bg-white dark:bg-gray-900 border-t border-border">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <Button variant="ghost" size="sm" data-testid="button-payment">
              <Banknote className="h-4 w-4 mr-1.5" />
              Cash
              <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLocation("/taxi/rides")} data-testid="button-offers">
              <Percent className="h-4 w-4 mr-1.5" />
              Offers
              <ChevronRight className="h-3 w-3 ml-1 text-muted-foreground" />
            </Button>
          </div>

          <div className="px-4 py-3">
            <Button
              className="w-full rounded-full bg-amber-400 text-gray-900 font-bold text-base border-0"
              size="lg"
              disabled={!pickupAddress || !dropAddress || !selectedVehicle || bookMutation.isPending}
              onClick={handleBook}
              data-testid="button-book-ride"
            >
              {bookMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Booking...
                </>
              ) : (
                `Book ${selectedName}`
              )}
            </Button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
