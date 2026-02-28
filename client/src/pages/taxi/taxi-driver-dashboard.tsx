import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ChevronLeft, Car, MapPin, Phone, Star, Loader2, Power, Clock,
  DollarSign, TrendingUp, CheckCircle2, Navigation, User, CreditCard,
} from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiDriver, TaxiRide } from "@shared/schema";

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

function getNextStatus(current: string): string | null {
  const flow: Record<string, string> = {
    driver_assigned: "arriving",
    arriving: "in_ride",
    in_ride: "completed",
  };
  return flow[current] || null;
}

function getNextStatusLabel(current: string): string {
  const labels: Record<string, string> = {
    driver_assigned: "Start Arriving",
    arriving: "Picked Up",
    in_ride: "Complete Ride",
  };
  return labels[current] || "Update";
}

export default function TaxiDriverDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: driver, isLoading: driverLoading } = useQuery<TaxiDriver>({
    queryKey: ["/api/taxi/driver/profile"],
    enabled: !!user,
  });

  const { data: stats } = useQuery<{ totalRides: number; todayRides: number; earnings: string; rating: string }>({
    queryKey: ["/api/taxi/driver/stats"],
    enabled: !!user,
  });

  const { data: rides = [], isLoading: ridesLoading } = useQuery<TaxiRide[]>({
    queryKey: ["/api/taxi/driver/rides"],
    enabled: !!user,
    refetchInterval: 10000,
  });

  const toggleOnlineMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const res = await apiRequest("PATCH", "/api/taxi/driver/toggle-online", { isOnline });
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/profile"] });
      toast({ title: data.isOnline ? "You are Online" : "You are Offline" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ rideId, status }: { rideId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/taxi/driver/rides/${rideId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/stats"] });
      toast({ title: "Status Updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/profile")} className="text-gray-900 no-default-hover-elevate" data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900" data-testid="text-page-title">Driver Dashboard</h1>
        </div>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <p className="text-gray-500 mb-4">Please log in to access your dashboard</p>
          <Button onClick={() => setLocation("/auth")} data-testid="button-login">Log In</Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (driverLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/profile")} className="text-gray-900 no-default-hover-elevate" data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900" data-testid="text-page-title">Driver Dashboard</h1>
        </div>
        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
        <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3 flex items-center gap-3">
          <Button size="icon" variant="ghost" onClick={() => setLocation("/profile")} className="text-gray-900 no-default-hover-elevate" data-testid="button-back">
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold text-gray-900" data-testid="text-page-title">Driver Dashboard</h1>
        </div>
        <main className="px-4 py-8 max-w-lg mx-auto text-center">
          <Car className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 mb-2">Driver profile not found</p>
          <p className="text-gray-400 text-sm">Contact admin to set up your driver profile</p>
          <Button variant="ghost" onClick={() => setLocation("/")} className="mt-4" data-testid="button-go-home">
            Go Home
          </Button>
        </main>
        <BottomNav />
      </div>
    );
  }

  const activeRides = rides.filter((r) => r.status !== "completed" && r.status !== "cancelled");
  const completedRides = rides.filter((r) => r.status === "completed");

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
      <div className="sticky top-0 z-50 bg-gradient-to-r from-yellow-400 to-amber-500 px-4 py-3 flex items-center gap-3">
        <Button size="icon" variant="ghost" onClick={() => setLocation("/profile")} className="text-gray-900 no-default-hover-elevate" data-testid="button-back">
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-bold text-gray-900" data-testid="text-page-title">Driver Dashboard</h1>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto">

        <Card className={`p-4 mb-4 ${driver.isOnline ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${driver.isOnline ? "bg-green-100" : "bg-gray-200"}`}>
                <Power className={`h-6 w-6 ${driver.isOnline ? "text-green-600" : "text-gray-500"}`} />
              </div>
              <div>
                <p className="font-semibold text-gray-800" data-testid="text-driver-name">{driver.name}</p>
                <p className={`text-sm font-medium ${driver.isOnline ? "text-green-600" : "text-gray-500"}`} data-testid="text-online-status">
                  {driver.isOnline ? "Online" : "Offline"}
                </p>
              </div>
            </div>
            <Switch
              checked={!!driver.isOnline}
              onCheckedChange={(checked) => toggleOnlineMutation.mutate(checked)}
              disabled={toggleOnlineMutation.isPending}
              data-testid="switch-online"
            />
          </div>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="overview" data-testid="tab-overview">Overview</TabsTrigger>
            <TabsTrigger value="current" data-testid="tab-current">
              Active{activeRides.length > 0 ? ` (${activeRides.length})` : ""}
            </TabsTrigger>
            <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
            <TabsTrigger value="profile" data-testid="tab-profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Car className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500">Today's Rides</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-today-rides">
                  {stats?.todayRides || 0}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-500">Total Earnings</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-earnings">
                  ₹{stats?.earnings ? parseFloat(stats.earnings).toFixed(0) : "0"}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-gray-500">Total Rides</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-total-rides">
                  {stats?.totalRides || 0}
                </p>
              </Card>
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-500">Rating</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-rating">
                  {stats?.rating ? parseFloat(stats.rating).toFixed(1) : "4.5"}
                </p>
              </Card>
            </div>

            {activeRides.length > 0 && (
              <>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">Active Rides</h3>
                <div className="space-y-2">
                  {activeRides.slice(0, 3).map((ride) => {
                    const nextStatus = getNextStatus(ride.status || "");
                    return (
                      <Card key={ride.id} className="p-3" data-testid={`card-active-ride-${ride.id}`}>
                        <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                          <Badge className={`${getStatusColor(ride.status || "")} border-transparent text-[10px]`}>
                            {formatStatus(ride.status || "")}
                          </Badge>
                          <span className="text-sm font-bold text-gray-800">
                            ₹{ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm mb-2">
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                            <span className="text-gray-600 line-clamp-1">{ride.pickupAddress}</span>
                          </div>
                          <div className="flex items-start gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                            <span className="text-gray-600 line-clamp-1">{ride.dropAddress}</span>
                          </div>
                        </div>
                        {nextStatus && (
                          <Button
                            size="sm"
                            className="w-full"
                            onClick={() => updateStatusMutation.mutate({ rideId: ride.id, status: nextStatus })}
                            disabled={updateStatusMutation.isPending}
                            data-testid={`button-update-status-${ride.id}`}
                          >
                            {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            {getNextStatusLabel(ride.status || "")}
                          </Button>
                        )}
                      </Card>
                    );
                  })}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="current" className="mt-4">
            {ridesLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => <Skeleton key={i} className="h-32 w-full rounded-lg" />)}
              </div>
            ) : activeRides.length === 0 ? (
              <Card className="p-8 text-center">
                <Car className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No active rides</p>
                <p className="text-gray-400 text-xs mt-1">New ride requests will appear here</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {activeRides.map((ride) => {
                  const nextStatus = getNextStatus(ride.status || "");
                  return (
                    <Card key={ride.id} className="p-4" data-testid={`card-current-ride-${ride.id}`}>
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <Badge className={`${getStatusColor(ride.status || "")} border-transparent text-[10px]`}>
                          {formatStatus(ride.status || "")}
                        </Badge>
                        {ride.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(ride.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="space-y-2 mb-3">
                        <div className="flex items-start gap-2">
                          <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Pickup</p>
                            <p className="text-sm text-gray-700">{ride.pickupAddress}</p>
                          </div>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-3 h-3 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">Drop</p>
                            <p className="text-sm text-gray-700">{ride.dropAddress}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 mb-3 pt-2 border-t border-gray-100 flex-wrap">
                        <div>
                          <p className="text-xs text-gray-400">Fare</p>
                          <p className="font-bold text-gray-800">
                            ₹{ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
                          </p>
                        </div>
                        {ride.distance && (
                          <div>
                            <p className="text-xs text-gray-400">Distance</p>
                            <p className="font-semibold text-gray-700">{parseFloat(ride.distance).toFixed(1)} km</p>
                          </div>
                        )}
                      </div>
                      {nextStatus && (
                        <Button
                          className="w-full"
                          onClick={() => updateStatusMutation.mutate({ rideId: ride.id, status: nextStatus })}
                          disabled={updateStatusMutation.isPending}
                          data-testid={`button-status-update-${ride.id}`}
                        >
                          {updateStatusMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                          {getNextStatusLabel(ride.status || "")}
                        </Button>
                      )}
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {ridesLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
              </div>
            ) : completedRides.length === 0 ? (
              <Card className="p-8 text-center">
                <Clock className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500 text-sm">No completed rides yet</p>
              </Card>
            ) : (
              <div className="space-y-2">
                {completedRides.map((ride) => (
                  <Card key={ride.id} className="p-3" data-testid={`card-history-ride-${ride.id}`}>
                    <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="bg-green-100 text-green-800 border-transparent text-[10px]">Completed</Badge>
                        {ride.createdAt && (
                          <span className="text-xs text-gray-400">
                            {new Date(ride.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                          </span>
                        )}
                      </div>
                      <p className="font-bold text-green-600 text-sm">
                        ₹{ride.actualFare ? parseFloat(ride.actualFare).toFixed(0) : ride.estimatedFare ? parseFloat(ride.estimatedFare).toFixed(0) : "--"}
                      </p>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                        <span className="text-gray-600 line-clamp-1">{ride.pickupAddress}</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-500 mt-1.5 flex-shrink-0" />
                        <span className="text-gray-600 line-clamp-1">{ride.dropAddress}</span>
                      </div>
                    </div>
                    {ride.rating && (
                      <div className="flex items-center gap-1 mt-2">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`h-3.5 w-3.5 ${s <= ride.rating! ? "text-yellow-400 fill-yellow-400" : "text-gray-300"}`} />
                        ))}
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="profile" className="mt-4">
            <Card className="p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-4">Driver Profile</h3>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-500" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800" data-testid="text-profile-name">{driver.name}</p>
                    <div className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm text-gray-600" data-testid="text-profile-rating">
                        {driver.rating ? parseFloat(driver.rating).toFixed(1) : "4.5"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-3 border-t border-gray-100">
                  {driver.phone && (
                    <div className="flex items-center gap-3">
                      <Phone className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Phone</p>
                        <p className="text-sm text-gray-700" data-testid="text-profile-phone">{driver.phone}</p>
                      </div>
                    </div>
                  )}
                  {driver.vehicleNumber && (
                    <div className="flex items-center gap-3">
                      <Car className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">Vehicle Number</p>
                        <p className="text-sm text-gray-700" data-testid="text-profile-vehicle">{driver.vehicleNumber}</p>
                      </div>
                    </div>
                  )}
                  {driver.licenseNumber && (
                    <div className="flex items-center gap-3">
                      <CreditCard className="h-4 w-4 text-gray-400" />
                      <div>
                        <p className="text-xs text-gray-400">License Number</p>
                        <p className="text-sm text-gray-700" data-testid="text-profile-license">{driver.licenseNumber}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNav />
    </div>
  );
}
