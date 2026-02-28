import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MovingVehicleType } from "@shared/schema";
import { ArrowLeft, Truck, Package, Check, Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function MovingVehiclesPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedVehicle, setSelectedVehicle] = useState<string | null>(null);

  const params = new URLSearchParams(window.location.search);
  const pickupAddress = params.get("pickup") || "";
  const dropAddress = params.get("drop") || "";
  const scheduledDate = params.get("date") || "";
  const scheduledTime = params.get("time") || "";
  const description = params.get("desc") || "";
  const helpersCount = parseInt(params.get("helpers") || "0", 10);

  const { data: vehicleTypes = [], isLoading } = useQuery<MovingVehicleType[]>({
    queryKey: ["/api/moving/vehicle-types"],
  });

  const estimateMutation = useMutation({
    mutationFn: async (vehicleTypeId: string) => {
      const res = await apiRequest("POST", "/api/moving/estimate", {
        vehicleTypeId,
        distanceKm: 10,
        helpersCount,
      });
      return await res.json();
    },
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!selectedVehicle) throw new Error("Select a vehicle");
      const res = await apiRequest("POST", "/api/moving/bookings", {
        vehicleTypeId: selectedVehicle,
        pickupAddress,
        dropAddress,
        scheduledDate: scheduledDate || undefined,
        scheduledTime: scheduledTime || undefined,
        estimatedPrice: estimateMutation.data?.estimatedPrice || undefined,
        helpersCount,
        description: description || undefined,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/moving/bookings"] });
      toast({ title: "Booking Confirmed!", description: "Your moving booking has been placed." });
      setLocation("/moving/bookings");
    },
    onError: (err: Error) => {
      toast({ title: "Booking Failed", description: err.message, variant: "destructive" });
    },
  });

  const handleSelectVehicle = (id: string) => {
    setSelectedVehicle(id);
    if (user) {
      estimateMutation.mutate(id);
    }
  };

  const selectedType = vehicleTypes.find((v) => v.id === selectedVehicle);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center gap-2">
          <Link href="/moving">
            <Button variant="ghost" size="icon" data-testid="button-back-moving">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-lg font-bold text-foreground" data-testid="text-vehicles-title">Choose Vehicle</h1>
            <p className="text-xs text-muted-foreground">Select the right vehicle for your move</p>
          </div>
        </div>

        <Card className="p-3">
          <div className="flex items-start gap-2 text-sm">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="text-muted-foreground truncate" data-testid="text-pickup-summary">{pickupAddress || "Not set"}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <span className="text-muted-foreground truncate" data-testid="text-drop-summary">{dropAddress || "Not set"}</span>
              </div>
            </div>
          </div>
          {(scheduledDate || description) && (
            <div className="mt-2 pt-2 border-t flex flex-wrap gap-2">
              {scheduledDate && (
                <Badge variant="secondary" className="text-xs">{scheduledDate} {scheduledTime}</Badge>
              )}
              {helpersCount > 0 && (
                <Badge variant="secondary" className="text-xs">{helpersCount} helper(s)</Badge>
              )}
              {description && (
                <Badge variant="secondary" className="text-xs truncate max-w-[200px]">{description}</Badge>
              )}
            </div>
          )}
        </Card>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-28 w-full rounded-md" />
            ))}
          </div>
        ) : vehicleTypes.length === 0 ? (
          <Card className="p-8 text-center">
            <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No vehicles available at the moment</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {vehicleTypes.map((vehicle) => {
              const isSelected = selectedVehicle === vehicle.id;
              return (
                <Card
                  key={vehicle.id}
                  className={`p-4 cursor-pointer transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
                  onClick={() => handleSelectVehicle(vehicle.id)}
                  data-testid={`card-vehicle-${vehicle.id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-md bg-muted flex items-center justify-center flex-shrink-0 overflow-hidden">
                      {vehicle.image ? (
                        <img src={vehicle.image} alt={vehicle.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="font-semibold text-foreground" data-testid={`text-vehicle-name-${vehicle.id}`}>
                          {vehicle.name}
                        </h3>
                        {isSelected && <Check className="h-5 w-5 text-primary flex-shrink-0" />}
                      </div>
                      {vehicle.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{vehicle.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        {vehicle.capacity && (
                          <Badge variant="secondary" className="text-xs">{vehicle.capacity}</Badge>
                        )}
                        <span className="text-sm font-semibold text-primary" data-testid={`text-vehicle-price-${vehicle.id}`}>
                          From ₹{vehicle.basePrice}
                        </span>
                        <span className="text-xs text-muted-foreground">+₹{vehicle.pricePerKm}/km</span>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {selectedVehicle && (
          <Card className="p-4 space-y-3 border-primary/20">
            <h3 className="font-semibold text-foreground">Booking Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="font-medium text-foreground">{selectedType?.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Base Price</span>
                <span className="text-foreground">₹{selectedType?.basePrice}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">Per Km</span>
                <span className="text-foreground">₹{selectedType?.pricePerKm}/km</span>
              </div>
              {helpersCount > 0 && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Helpers ({helpersCount})</span>
                  <span className="text-foreground">₹{helpersCount * 200}</span>
                </div>
              )}
              {estimateMutation.data && (
                <>
                  <div className="border-t pt-2 flex justify-between gap-2">
                    <span className="font-semibold text-foreground">Estimated Total</span>
                    <span className="font-bold text-primary text-base" data-testid="text-estimated-price">
                      ₹{estimateMutation.data.estimatedPrice}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">*Final price may vary based on actual distance</p>
                </>
              )}
            </div>

            {!user ? (
              <Link href="/auth">
                <Button className="w-full" data-testid="button-login-to-book">
                  Login to Book
                </Button>
              </Link>
            ) : (
              <Button
                className="w-full"
                size="lg"
                onClick={() => bookingMutation.mutate()}
                disabled={bookingMutation.isPending}
                data-testid="button-confirm-booking"
              >
                {bookingMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Truck className="h-4 w-4 mr-2" />
                )}
                Confirm Booking
              </Button>
            )}
          </Card>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
