import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation, useRoute } from "wouter";
import { AlertTriangle, ChevronLeft, Phone, Car, User, Star, Loader2, CheckCircle2, XCircle, Navigation, Clock, CreditCard, Copy, MessageSquareWarning, Share2, ShieldAlert, ShieldCheck } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { MapComponent } from "@/components/taxi/MapComponent";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getNearbyVehicles, getRoute, type Coordinates, type LiveTaxiVehicle, type RideLocation, type TaxiMapVehicleType } from "@/lib/taxi-map";
import { EtaPredictionCard, type TaxiEtaPrediction } from "@/components/taxi/EtaPredictionCard";
import type { TaxiRide } from "@shared/schema";

const statusSteps = [
  { key: "searching", label: "Searching" },
  { key: "requested", label: "Requested" },
  { key: "accepted", label: "Accepted" },
  { key: "arriving", label: "Arriving" },
  { key: "started", label: "Started" },
  { key: "completed", label: "Completed" },
];

function getStatusIndex(status: string): number {
  if (status === "cancelled") return -1;
  if (status === "driver_assigned") return statusSteps.findIndex((s) => s.key === "accepted");
  if (status === "in_ride") return statusSteps.findIndex((s) => s.key === "started");
  return statusSteps.findIndex((s) => s.key === status);
}

function getStatusMessage(status: string): string {
  switch (status) {
    case "searching": return "Looking for a driver...";
    case "requested": return "Ride request sent to a nearby driver";
    case "accepted": return "Your ride was accepted";
    case "driver_assigned": return "Your driver is arriving";
    case "arriving": return "Driver is nearby";
    case "started": return "Enjoy your ride!";
    case "in_ride": return "Enjoy your ride!";
    case "completed": return "Ride completed";
    case "cancelled": return "Ride was cancelled";
    case "no_drivers": return "No drivers are currently available. Please try again.";
    default: return "Processing...";
  }
}

function getVehicleMapType(vehicleType?: string | null): TaxiMapVehicleType | undefined {
  const normalized = vehicleType?.toLowerCase() ?? "";
  if (normalized.includes("bike") || normalized.includes("moto")) {
    return "bike";
  }
  if (normalized.includes("auto") || normalized.includes("rick")) {
    return "auto";
  }
  if (normalized.length > 0) {
    return "car";
  }
  return undefined;
}

function readCoordinate(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

export default function TaxiBookingPage() {
  const [, params] = useRoute("/taxi/booking/:id");
  const rideId = params?.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [userRating, setUserRating] = useState(0);
  const [otpCopied, setOtpCopied] = useState(false);
  const [sosOpen, setSosOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [emergencyContacts, setEmergencyContacts] = useState(["Family", "Police 112"]);

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

  const pickupLocation = useMemo<RideLocation | null>(() => {
    const lat = readCoordinate(ride?.pickupLat);
    const lng = readCoordinate(ride?.pickupLng);
    if (!ride || lat === null || lng === null) {
      return null;
    }

    return {
      lat,
      lng,
      address: ride.pickupAddress,
    };
  }, [ride]);

  const dropLocation = useMemo<RideLocation | null>(() => {
    const lat = readCoordinate(ride?.dropLat);
    const lng = readCoordinate(ride?.dropLng);
    if (!ride || lat === null || lng === null) {
      return null;
    }

    return {
      lat,
      lng,
      address: ride.dropAddress,
    };
  }, [ride]);

  const preferredVehicleType = useMemo(() => getVehicleMapType((ride as any)?.vehicleType), [ride]);
  const isCancelled = ride?.status === "cancelled";
  const isCompleted = ride?.status === "completed";
  const isNoDrivers = ride?.status === "no_drivers";

  const { data: nearbyVehicles = [] } = useQuery<LiveTaxiVehicle[]>({
    queryKey: ["/api/drivers/nearby", "booking", ride?.id ?? rideId, pickupLocation?.lat?.toFixed(4), pickupLocation?.lng?.toFixed(4), preferredVehicleType ?? "all"],
    enabled: Boolean(ride && pickupLocation) && !isCompleted && !isCancelled && !isNoDrivers,
    queryFn: () => getNearbyVehicles(
      { lat: pickupLocation!.lat, lng: pickupLocation!.lng },
      { count: 8, type: preferredVehicleType },
    ),
    placeholderData: (previous) => previous,
    refetchInterval: 4000,
    staleTime: 2000,
  });

  const trackedDriver = useMemo(() => {
    if (!ride?.driverId) {
      return null;
    }

    return nearbyVehicles.find((vehicle) => vehicle.id === ride.driverId) ?? null;
  }, [nearbyVehicles, ride]);

  const { data: routeMetrics } = useQuery({
    queryKey: ["/api/taxi/map/route", "booking", ride?.id ?? rideId, pickupLocation?.lat, pickupLocation?.lng, dropLocation?.lat, dropLocation?.lng],
    enabled: Boolean(ride && pickupLocation && dropLocation),
    queryFn: () => getRoute(
      { lat: pickupLocation!.lat, lng: pickupLocation!.lng },
      { lat: dropLocation!.lat, lng: dropLocation!.lng },
    ),
  });

  const trackedTarget = ride?.status === "in_ride" || ride?.status === "started" ? dropLocation : pickupLocation;

  const { data: trackedDriverRoute } = useQuery({
    queryKey: ["/api/taxi/map/route", "live-driver", ride?.id ?? rideId, trackedDriver?.id, trackedTarget?.lat, trackedTarget?.lng, ride?.status],
    enabled: Boolean(ride && trackedDriver && trackedTarget) && !isCompleted && !isCancelled && !isNoDrivers,
    queryFn: () => getRoute(
      { lat: trackedDriver!.lat, lng: trackedDriver!.lng },
      { lat: trackedTarget!.lat, lng: trackedTarget!.lng },
    ),
    placeholderData: (previous) => previous,
    refetchInterval: 4000,
    staleTime: 2000,
  });

  const rideStoredEta = useMemo<TaxiEtaPrediction | null>(() => {
    const source = ride as any;
    if (!source?.predictedPickupEtaMin && !source?.predictedTripEtaMin) return null;
    return {
      pickupEtaMin: Number(source.predictedPickupEtaMin || 0),
      tripEtaMin: Number(source.predictedTripEtaMin || source.duration || 0),
      totalEtaMin: Number(source.predictedTotalEtaMin || (Number(source.predictedPickupEtaMin || 0) + Number(source.predictedTripEtaMin || source.duration || 0))),
      confidence: source.etaConfidence || "Medium",
      factors: source.etaFactors,
      generatedAt: source.etaGeneratedAt,
    };
  }, [ride]);

  const { data: liveEta, isFetching: liveEtaLoading, error: liveEtaError } = useQuery<TaxiEtaPrediction>({
    queryKey: ["/api/taxi/eta/predict", "booking", ride?.id ?? rideId, ride?.driverId ?? "nearest", ride?.status],
    enabled: Boolean(ride && pickupLocation && dropLocation && (ride as any)?.vehicleTypeId) && !isCompleted && !isCancelled && !isNoDrivers,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/taxi/eta/predict", {
        pickupLat: pickupLocation!.lat,
        pickupLng: pickupLocation!.lng,
        dropLat: dropLocation!.lat,
        dropLng: dropLocation!.lng,
        vehicleTypeId: (ride as any).vehicleTypeId,
        driverId: ride?.driverId,
        routeDistanceKm: routeMetrics?.distanceKm,
        routeDurationMin: routeMetrics?.durationMin,
      });
      return res.json();
    },
    placeholderData: (previous) => previous,
    refetchInterval: 12000,
    staleTime: 5000,
  });

  const sosMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/taxi/rides/${rideId}/sos`, {});
      return res.json();
    },
    onSuccess: (data: any) => {
      setSosOpen(false);
      toast({ title: "SOS sent", description: data?.message || "Support has been alerted." });
    },
    onError: (error: Error) => toast({ title: "SOS failed", description: error.message, variant: "destructive" }),
  });

  const shareMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/taxi/rides/${rideId}/share`, {});
      return res.json();
    },
    onSuccess: async (data: any) => {
      const text = data?.text || data?.shareUrl || "City Hub trip details";
      try {
        if (navigator.share) {
          await navigator.share({ title: "City Hub Trip", text, url: data?.shareUrl });
        } else {
          await navigator.clipboard.writeText(text);
          toast({ title: "Trip copied", description: "Only share your trip with trusted contacts." });
        }
      } catch {
        toast({ title: "Trip details ready", description: "Only share your trip with trusted contacts." });
      }
    },
    onError: (error: Error) => toast({ title: "Share failed", description: error.message, variant: "destructive" }),
  });

  const reportMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/taxi/rides/${rideId}/safety-report`, {
        category: "Safety concern",
        message: reportMessage,
      });
      return res.json();
    },
    onSuccess: (data: any) => {
      setReportOpen(false);
      setReportMessage("");
      toast({ title: "Report sent", description: data?.message || "Our team will review it." });
    },
    onError: (error: Error) => toast({ title: "Report failed", description: error.message, variant: "destructive" }),
  });

  const mapCenter = useMemo<Coordinates>(() => {
    if (trackedDriver) {
      return { lat: trackedDriver.lat, lng: trackedDriver.lng };
    }
    if (pickupLocation) {
      return { lat: pickupLocation.lat, lng: pickupLocation.lng };
    }
    if (dropLocation) {
      return { lat: dropLocation.lat, lng: dropLocation.lng };
    }
    return { lat: 11.9416, lng: 79.8083 };
  }, [dropLocation, pickupLocation, trackedDriver]);

  const trackingHeadingText = trackedDriver
    ? ride?.status === "in_ride" || ride?.status === "started"
      ? `${trackedDriver.driverName} is taking you to your drop`
      : `${trackedDriver.driverName} is heading to your pickup`
    : undefined;

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
  const canCancel = !isCancelled && !isCompleted && !isNoDrivers && ride.status !== "in_ride" && ride.status !== "started";
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

      <div className="px-4 pt-4 max-w-lg mx-auto">
        <MapComponent
          activeField="pickup"
          allowMarkerDrag={false}
          center={mapCenter}
          drop={dropLocation}
          highlightedVehicleId={trackedDriver?.id ?? ride.driverId ?? null}
          interactive={false}
          mapClassName="h-[260px] w-full sm:h-[320px]"
          mapTheme="light"
          onDropDrag={() => undefined}
          onMapSelect={() => undefined}
          onPickupDrag={() => undefined}
          pickup={pickupLocation}
          routeGeometry={routeMetrics?.geometry ?? []}
          showSelectionHint={false}
          showTrackingCard={Boolean(trackedDriver)}
          trackedDriver={trackedDriver}
          trackedDriverRoute={trackedDriverRoute?.geometry ?? []}
          trackingHeadingText={trackingHeadingText}
          vehicles={nearbyVehicles}
        />
        {ride.status === "searching" && !trackedDriver ? (
          <div className="mt-3 flex justify-center">
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1.5 shadow dark:bg-gray-800">
              <div className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
              <span className="text-xs font-medium text-foreground">Finding nearby drivers</span>
            </div>
          </div>
        ) : null}
      </div>

      <main className="px-4 max-w-lg mx-auto pt-4 relative z-10 space-y-3">
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

        {isNoDrivers && (
          <Card className="p-4 border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-sm text-foreground">No drivers available</p>
                <p className="text-xs text-muted-foreground">No drivers are currently available. Please try again.</p>
              </div>
            </div>
          </Card>
        )}

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            {ride.status === "searching" || ride.status === "requested" ? (
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

        <EtaPredictionCard
          prediction={liveEta ?? rideStoredEta}
          isLoading={liveEtaLoading}
          error={liveEtaError instanceof Error ? liveEtaError.message : null}
          title={ride.status === "started" || ride.status === "in_ride" ? "Trip ETA" : "Pickup ETA"}
        />

        {hasDriver && (
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="text-xs font-semibold uppercase text-muted-foreground">Verified driver</p>
              {(ride as any).customerSelectedDriver ? <Badge className="border-transparent bg-amber-100 text-amber-900">Your selected driver</Badge> : null}
            </div>
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
                  {(ride as any).vehicleType && (
                    <Badge variant="outline" className="text-[10px]">
                      {(ride as any).vehicleType}
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
                <a href={`tel:${ride.driverPhone}`} data-testid="link-call-driver" title="Masked call">
                  <Button size="icon" className="bg-green-500 border-green-600 text-white rounded-full">
                    <Phone className="h-4 w-4" />
                  </Button>
                </a>
              )}
            </div>
            <p className="mt-3 text-xs text-muted-foreground">Use masked call for ride coordination. Do not share personal codes except the ride PIN at pickup.</p>
          </Card>
        )}

        {!isCompleted && !isCancelled && !isNoDrivers && (
          <Card className="p-4 border-red-100 dark:border-red-900/60">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">Ride safety</p>
                <p className="mt-1 text-xs text-muted-foreground">Only share your trip with trusted contacts.</p>
              </div>
              <Button size="sm" variant="destructive" onClick={() => setSosOpen(true)}>
                <ShieldAlert className="mr-1.5 h-4 w-4" />
                SOS
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2">
              <Button size="sm" variant="outline" onClick={() => shareMutation.mutate()} disabled={shareMutation.isPending}>
                <Share2 className="mr-1 h-3.5 w-3.5" />
                Share
              </Button>
              <Button size="sm" variant="outline" onClick={() => setContactsOpen(true)}>
                <Phone className="mr-1 h-3.5 w-3.5" />
                Contacts
              </Button>
              <Button size="sm" variant="outline" onClick={() => setReportOpen(true)}>
                <MessageSquareWarning className="mr-1 h-3.5 w-3.5" />
                Report
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-1 text-[10px] text-muted-foreground">
              {["Driver assigned", "Driver arrived", "Ride started", "Ride completed"].map((label, index) => {
                const active = currentStepIndex >= index + 2 || (label === "Driver assigned" && hasDriver);
                return (
                  <div key={label} className={`rounded-md border p-2 text-center ${active ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/30" : "border-border"}`}>
                    {label}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* OTP Display for Customer */}
        {(ride as any)?.rideStartOtp && !isCompleted && !isCancelled && (
          <Card className="p-4 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Share OTP with Driver</p>
                  <p className="text-sm text-blue-900 dark:text-blue-100 mt-1">Your ride verification code</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-center">
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400 tracking-widest font-mono">{(ride as any).rideStartOtp}</p>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText((ride as any).rideStartOtp);
                    setOtpCopied(true);
                    setTimeout(() => setOtpCopied(false), 2000);
                  }}
                  className="p-2 rounded-lg bg-blue-100 dark:bg-blue-800 hover:bg-blue-200 dark:hover:bg-blue-700 transition-colors"
                  title="Copy OTP"
                >
                  <Copy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </button>
              </div>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {otpCopied ? "✓ Copied to clipboard" : "Tap copy icon to share with your driver"}
              </p>
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

      <Drawer open={sosOpen} onOpenChange={setSosOpen}>
        <DrawerContent className="mx-auto max-w-lg p-4">
          <DrawerHeader>
            <DrawerTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirm SOS alert
            </DrawerTitle>
          </DrawerHeader>
          <p className="text-sm text-muted-foreground">This will alert City Hub support with your ride details and current trip status.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setSosOpen(false)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" onClick={() => sosMutation.mutate()} disabled={sosMutation.isPending}>
              {sosMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Send SOS
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={reportOpen} onOpenChange={setReportOpen}>
        <DrawerContent className="mx-auto max-w-lg p-4">
          <DrawerHeader>
            <DrawerTitle>Report Safety Issue</DrawerTitle>
          </DrawerHeader>
          <Textarea
            value={reportMessage}
            onChange={(event) => setReportMessage(event.target.value)}
            placeholder="Tell us what happened"
            className="min-h-28"
          />
          <div className="mt-4 flex gap-2">
            <Button variant="outline" className="flex-1" onClick={() => setReportOpen(false)}>Cancel</Button>
            <Button className="flex-1 bg-red-600 text-white hover:bg-red-700" onClick={() => reportMutation.mutate()} disabled={reportMutation.isPending || reportMessage.trim().length < 5}>
              {reportMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit
            </Button>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={contactsOpen} onOpenChange={setContactsOpen}>
        <DrawerContent className="mx-auto max-w-lg p-4">
          <DrawerHeader>
            <DrawerTitle>Emergency Contacts</DrawerTitle>
          </DrawerHeader>
          <div className="space-y-2">
            {emergencyContacts.map((contact, index) => (
              <Input
                key={index}
                value={contact}
                onChange={(event) => {
                  const next = [...emergencyContacts];
                  next[index] = event.target.value;
                  setEmergencyContacts(next);
                }}
              />
            ))}
          </div>
          <Button variant="outline" className="mt-3 w-full" onClick={() => setEmergencyContacts((contacts) => [...contacts, ""])}>
            Add contact
          </Button>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
