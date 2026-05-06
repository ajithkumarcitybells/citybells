import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ArrowRight, CalendarDays, CarFront, ChevronLeft, Clock3, Crosshair, Headphones, History, IndianRupee, Loader2, LocateFixed, MapPinned, Menu, MoonStar, Navigation, Repeat2, ShieldCheck, SunMedium, UserRound, X } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { LocationSearchInput } from "@/components/taxi/LocationSearchInput";
import { MapComponent } from "@/components/taxi/MapComponent";
import { NearbyDriversPanel } from "@/components/taxi/NearbyDriversPanel";
import { RideSummary } from "@/components/taxi/RideSummary";
import OfferBanner from "@/components/taxi/OfferBanner";
import RideSuggestionsStrip from "@/components/taxi/RideSuggestionsStrip";
import FareSelector from "@/components/taxi/FareSelector";
import { EtaPredictionCard, type TaxiEtaPrediction } from "@/components/taxi/EtaPredictionCard";
import { RideModeToggle, ScheduledFareEstimateCard, ScheduledRideForm } from "@/components/taxi/scheduled-rides";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { TAXI_DEFAULT_CENTER, calculateFare, formatCurrency, getDocumentId, getNearbyVehicles, getRoute, hasCoordinates, reverseGeocode, type Coordinates, type LiveTaxiVehicle, type RideLocation, type RouteMetrics, type SearchSuggestion, type TaxiMapVehicleType } from "@/lib/taxi-map";
import type { TaxiVehicleType, TaxiRide } from "@shared/schema";

type RideField = "pickup" | "drop";

type RideLocationDraft = Partial<RideLocation> & {
  address: string;
};

function getDateValue(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function getDateLabel(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

function getNextMapField(activeField: RideField, pickup: RideLocationDraft, drop: RideLocationDraft): RideField {
  if (!hasCoordinates(pickup)) {
    return "pickup";
  }
  if (!hasCoordinates(drop)) {
    return "drop";
  }
  return activeField;
}

export default function TaxiHomePage() {
  const [pickup, setPickup] = useState<RideLocationDraft>({ address: "" });
  const [drop, setDrop] = useState<RideLocationDraft>({ address: "" });
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [mapCenter, setMapCenter] = useState<Coordinates>(TAXI_DEFAULT_CENTER);
  const [routeMetrics, setRouteMetrics] = useState<RouteMetrics | null>(null);
  const [trackedDriverRoute, setTrackedDriverRoute] = useState<[number, number][]>([]);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeError, setRouteError] = useState<string | null>(null);
  const [activeField, setActiveField] = useState<RideField>("pickup");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [showBookingPanel, setShowBookingPanel] = useState(false);
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [rideMode, setRideMode] = useState<"daily" | "outstation" | "rentals">("daily");
  const [bookingMode, setBookingMode] = useState<"now" | "schedule">("now");
  const [tripStart, setTripStart] = useState<"now" | "schedule">("schedule");
  const [journeyType, setJourneyType] = useState<"one-way" | "round-trip">("one-way");
  const [departDate, setDepartDate] = useState(() => getDateValue(2));
  const [departDay, setDepartDay] = useState(() => getDateValue(2));
  const [departTime, setDepartTime] = useState("11:30");
  const [scheduledDate, setScheduledDate] = useState(() => getDateValue(1));
  const [scheduledTime, setScheduledTime] = useState("09:30");
  const [scheduledPaymentMethod, setScheduledPaymentMethod] = useState("cash");
  const [mapPickerField, setMapPickerField] = useState<RideField | null>(null);
  const [mapPickerCoordinates, setMapPickerCoordinates] = useState<Coordinates | null>(null);
  const [mapPickerAddress, setMapPickerAddress] = useState("");
  const [mapPickerResolving, setMapPickerResolving] = useState(false);
  const [taxiMenuOpen, setTaxiMenuOpen] = useState(false);
  const [rateCardsOpen, setRateCardsOpen] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const reverseRequestRef = useRef({ pickup: 0, drop: 0 });
  const mapPickerRequestRef = useRef(0);

  const { data: vehicleTypes = [], isLoading } = useQuery<TaxiVehicleType[]>({
    queryKey: ["/api/taxi/vehicle-types"],
  });

  // Auto-select a sensible default vehicle when vehicle types load
  useEffect(() => {
    if (!selectedVehicleId && vehicleTypes.length > 0) {
      setSelectedVehicleId(getDocumentId(vehicleTypes[0]));
    }
  }, [vehicleTypes, selectedVehicleId]);

  const selectedVehicle = useMemo(
    () => vehicleTypes.find((vehicleType) => getDocumentId(vehicleType) === selectedVehicleId) ?? null,
    [selectedVehicleId, vehicleTypes],
  );

  const estimatedFare = useMemo(
    () => (selectedVehicle ? calculateFare(selectedVehicle, routeMetrics) : null),
    [routeMetrics, selectedVehicle],
  );
  const hasFareEstimate = typeof estimatedFare === "number" && Number.isFinite(estimatedFare);
  const scheduledBookingFee = 25;
  const scheduledFareTotal = hasFareEstimate ? estimatedFare + scheduledBookingFee : 0;
  const scheduledTimeError = useMemo(() => {
    if (bookingMode !== "schedule") return null;
    const pickupAt = new Date(`${scheduledDate}T${scheduledTime}:00`);
    const min = Date.now() + 30 * 60_000;
    const max = Date.now() + 30 * 24 * 60 * 60_000;
    if (!Number.isFinite(pickupAt.getTime())) return "Choose a valid pickup date and time.";
    if (pickupAt.getTime() < min) return "Schedule pickup at least 30 minutes from now.";
    if (pickupAt.getTime() > max) return "Schedule pickup within the next 30 days.";
    return null;
  }, [bookingMode, scheduledDate, scheduledTime]);

  const preferredVehicleType = useMemo<TaxiMapVehicleType | undefined>(() => {
    if (!selectedVehicle) {
      return undefined;
    }

    const normalized = selectedVehicle.name.toLowerCase();
    if (normalized.includes("bike") || normalized.includes("moto")) {
      return "bike";
    }
    if (normalized.includes("auto") || normalized.includes("rick")) {
      return "auto";
    }
    return "car";
  }, [selectedVehicle]);

  const fleetCenter = useMemo(
    () => (hasCoordinates(pickup) ? { lat: pickup.lat, lng: pickup.lng } : (userLocation ?? mapCenter)),
    [mapCenter, pickup, userLocation],
  );

  const canRequestTracking = hasCoordinates(pickup);

  const { data: nearbyVehicles = [], isFetching: isRefreshingVehicles, isLoading: nearbyDriversLoading, error: nearbyDriversError, refetch: refetchNearbyDrivers } = useQuery<LiveTaxiVehicle[]>({
    queryKey: ["/api/drivers/nearby", fleetCenter.lat.toFixed(4), fleetCenter.lng.toFixed(4), preferredVehicleType ?? "all"],
    queryFn: () => getNearbyVehicles(fleetCenter, { count: 8, type: preferredVehicleType }),
    enabled: canRequestTracking && Boolean(selectedVehicleId) && hasCoordinates(drop),
    placeholderData: (previous) => previous,
    staleTime: 2000,
    refetchInterval: liveUpdatesEnabled ? 4000 : false,
  });

  const recommendedDriver = nearbyVehicles[0] ?? null;
  const selectedDriver = useMemo(
    () => nearbyVehicles.find((driver) => driver.id === selectedDriverId) ?? null,
    [nearbyVehicles, selectedDriverId],
  );
  const trackedDriver = useMemo(() => {
    if (!hasCoordinates(pickup) || nearbyVehicles.length === 0) {
      return null;
    }

    return selectedDriver ?? recommendedDriver;
  }, [nearbyVehicles, pickup, recommendedDriver, selectedDriver]);
  const highlightedVehicleId = selectedDriver?.id ?? recommendedDriver?.id ?? null;

  const etaEnabled = hasCoordinates(pickup) && hasCoordinates(drop) && Boolean(selectedVehicleId);
  const { data: etaPrediction, isFetching: etaLoading, error: etaError } = useQuery<TaxiEtaPrediction>({
    queryKey: [
      "/api/taxi/eta/predict",
      pickup.lat,
      pickup.lng,
      drop.lat,
      drop.lng,
      selectedVehicleId,
      trackedDriver?.id ?? "nearest",
      routeMetrics?.durationMin ?? "fallback",
    ],
    enabled: etaEnabled,
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/taxi/eta/predict", {
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        vehicleTypeId: selectedVehicleId,
        driverId: selectedDriver?.id,
        routeDistanceKm: routeMetrics?.distanceKm,
        routeDurationMin: routeMetrics?.durationMin,
      });
      return res.json();
    },
    placeholderData: (previous) => previous,
    refetchInterval: liveUpdatesEnabled || etaEnabled ? 12000 : false,
    staleTime: 5000,
  });

  const trackingStatusLabel = useMemo(() => {
    if (trackedDriver) {
      return `${trackedDriver.vehicleType} • ${trackedDriver.etaMin} min to pickup • ${trackedDriver.vehicleNumber}`;
    }
    if (!liveUpdatesEnabled) {
      return canRequestTracking
        ? "Enable driver tracking to search live drivers for this route."
        : "Set a pickup location to enable live driver tracking.";
    }
    if (!hasCoordinates(pickup)) {
      return "Set a pickup location to start scanning nearby drivers.";
    }
    if (!selectedVehicleId) {
      return "Choose a vehicle type to filter nearby drivers.";
    }
    if (isRefreshingVehicles) {
      return "Refreshing live drivers near your pickup point.";
    }
    return "No GPS-sharing driver is available near the selected pickup point yet.";
  }, [canRequestTracking, isRefreshingVehicles, liveUpdatesEnabled, pickup, selectedVehicleId, trackedDriver]);

  useEffect(() => {
    if (!canRequestTracking && liveUpdatesEnabled) {
      setLiveUpdatesEnabled(false);
    }
  }, [canRequestTracking, liveUpdatesEnabled]);

  useEffect(() => {
    if (selectedDriverId && !nearbyVehicles.some((driver) => driver.id === selectedDriverId)) {
      setSelectedDriverId(null);
    }
  }, [nearbyVehicles, selectedDriverId]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Geolocation is not supported in this browser.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setUserLocation(nextLocation);
        setMapCenter(nextLocation);
        setLocationError(null);
        setIsLocating(false);
        void updateLocationFromCoordinates("pickup", nextLocation);
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message || "Unable to access your location.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, []);

  useEffect(() => {
    if (!hasCoordinates(pickup) || !hasCoordinates(drop)) {
      setRouteMetrics(null);
      setRouteError(null);
      return;
    }

    let cancelled = false;
    setRouteLoading(true);
    setRouteError(null);

    void getRoute({ lat: pickup.lat, lng: pickup.lng }, { lat: drop.lat, lng: drop.lng })
      .then((nextRoute) => {
        if (!cancelled) {
          setRouteMetrics(nextRoute);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setRouteMetrics(null);
          setRouteError(error instanceof Error ? error.message : "Unable to calculate route");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setRouteLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [drop, pickup]);

  useEffect(() => {
    if (!hasCoordinates(pickup) || !trackedDriver) {
      setTrackedDriverRoute([]);
      return;
    }

    let cancelled = false;

    void getRoute(
      { lat: trackedDriver.lat, lng: trackedDriver.lng },
      { lat: pickup.lat, lng: pickup.lng },
    )
      .then((nextRoute) => {
        if (!cancelled) {
          setTrackedDriverRoute(nextRoute.geometry);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTrackedDriverRoute([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [pickup, trackedDriver]);

  const bookMutation = useMutation({
    mutationFn: async () => {
      if (!hasCoordinates(pickup) || !hasCoordinates(drop) || !selectedVehicle || !hasFareEstimate) {
        throw new Error("Pickup, drop and fare details are required");
      }

      const res = await apiRequest("POST", "/api/taxi/rides", {
        vehicleTypeId: getDocumentId(selectedVehicle),
        driverId: selectedDriver?.id,
        pickupAddress: pickup.address,
        dropAddress: drop.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        fare: estimatedFare,
        distance: routeMetrics?.distanceKm,
        duration: routeMetrics?.durationMin,
        paymentMethod: "cash",
      });
      return await res.json();
    },
    onSuccess: (ride: TaxiRide) => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides"] });
      toast({ title: "Ride Booked", description: "Searching for a driver..." });
      const rideId = getDocumentId(ride);
      if (!rideId) {
        toast({ title: "Ride booked", description: "Open Your rides to track this booking." });
        setLocation("/taxi/rides");
        return;
      }
      setLocation(`/taxi/booking/${rideId}`);
    },
    onError: (error: Error) => {
      if (error.message.includes("Selected driver is no longer available")) {
        setSelectedDriverId(null);
        queryClient.invalidateQueries({ queryKey: ["/api/drivers/nearby"] });
      }
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const scheduleRideMutation = useMutation({
    mutationFn: async () => {
      if (!hasCoordinates(pickup) || !hasCoordinates(drop) || !selectedVehicle || !hasFareEstimate || scheduledTimeError) {
        throw new Error(scheduledTimeError || "Pickup, drop, vehicle and scheduled fare details are required");
      }
      const res = await apiRequest("POST", "/api/taxi/scheduled-rides", {
        vehicleTypeId: getDocumentId(selectedVehicle),
        pickupAddress: pickup.address,
        dropAddress: drop.address,
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        dropLat: drop.lat,
        dropLng: drop.lng,
        fare: estimatedFare,
        scheduledBookingFee,
        scheduledPickupAt: new Date(`${scheduledDate}T${scheduledTime}:00`).toISOString(),
        distance: routeMetrics?.distanceKm,
        duration: routeMetrics?.durationMin,
        paymentMethod: scheduledPaymentMethod,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/scheduled-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/rides"] });
      toast({ title: "Scheduled ride confirmed", description: "You can view it in Upcoming rides." });
      setLocation("/taxi/rides?tab=upcoming");
    },
    onError: (error: Error) => {
      toast({ title: "Could not schedule ride", description: `${error.message}. If you are offline, try again when network is back.`, variant: "destructive" });
    },
  });

  const updateLocationState = (field: RideField, nextValue: RideLocationDraft) => {
    if (field === "pickup") {
      setPickup(nextValue);
      return;
    }

    setDrop(nextValue);
  };

  const updateLocationFromCoordinates = async (field: RideField, coordinates: Coordinates, fallbackAddress?: string) => {
    reverseRequestRef.current[field] += 1;
    const requestId = reverseRequestRef.current[field];

    updateLocationState(field, {
      ...coordinates,
      address: fallbackAddress ?? "Resolving address...",
    });

    try {
      const resolvedLocation = await reverseGeocode(coordinates);
      if (reverseRequestRef.current[field] !== requestId) {
        return;
      }

      updateLocationState(field, resolvedLocation);
      setMapCenter(coordinates);
      setRouteError(null);
    } catch (error) {
      if (reverseRequestRef.current[field] !== requestId) {
        return;
      }

      updateLocationState(field, {
        ...coordinates,
        address: fallbackAddress ?? `${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`,
      });
      toast({
        title: "Address lookup failed",
        description: error instanceof Error ? error.message : "Unable to resolve the selected address",
        variant: "destructive",
      });
    }

    if (field === "pickup" && !hasCoordinates(drop)) {
      setActiveField("drop");
    }
  };

  const resolveMapPickerAddress = async (coordinates: Coordinates) => {
    if (
      mapPickerCoordinates &&
      Math.abs(mapPickerCoordinates.lat - coordinates.lat) < 0.000001 &&
      Math.abs(mapPickerCoordinates.lng - coordinates.lng) < 0.000001 &&
      mapPickerAddress &&
      !mapPickerResolving
    ) {
      return;
    }

    mapPickerRequestRef.current += 1;
    const requestId = mapPickerRequestRef.current;
    setMapPickerCoordinates(coordinates);
    setMapCenter(coordinates);
    setMapPickerResolving(true);
    setMapPickerAddress("Resolving address...");

    try {
      const resolvedLocation = await reverseGeocode(coordinates);
      if (mapPickerRequestRef.current !== requestId) {
        return;
      }
      setMapPickerAddress(resolvedLocation.address);
    } catch {
      if (mapPickerRequestRef.current !== requestId) {
        return;
      }
      setMapPickerAddress(`${coordinates.lat.toFixed(5)}, ${coordinates.lng.toFixed(5)}`);
    } finally {
      if (mapPickerRequestRef.current === requestId) {
        setMapPickerResolving(false);
      }
    }
  };

  const openMapPicker = (field: RideField) => {
    const source = field === "pickup" ? pickup : drop;
    const coordinates = hasCoordinates(source)
      ? { lat: source.lat, lng: source.lng }
      : userLocation ?? mapCenter;

    setMapPickerField(field);
    setActiveField(field);
    setMapCenter(coordinates);
    void resolveMapPickerAddress(coordinates);
  };

  const closeMapPicker = () => {
    setMapPickerField(null);
    setMapPickerCoordinates(null);
    setMapPickerAddress("");
    setMapPickerResolving(false);
  };

  const confirmMapPickerLocation = () => {
    if (!mapPickerField || !mapPickerCoordinates) {
      return;
    }

    updateLocationState(mapPickerField, {
      ...mapPickerCoordinates,
      address: mapPickerAddress || `${mapPickerCoordinates.lat.toFixed(5)}, ${mapPickerCoordinates.lng.toFixed(5)}`,
    });
    setMapCenter(mapPickerCoordinates);
    setRouteError(null);

    if (mapPickerField === "pickup" && !hasCoordinates(drop)) {
      setActiveField("drop");
    }

    closeMapPicker();
  };

  const handleAddressInput = (field: RideField, address: string) => {
    updateLocationState(field, { address });
  };

  const handleSuggestionSelect = (field: RideField, suggestion: SearchSuggestion) => {
    updateLocationState(field, {
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng,
    });
    setMapCenter({ lat: suggestion.lat, lng: suggestion.lng });

    if (field === "pickup" && !hasCoordinates(drop)) {
      setActiveField("drop");
    }
  };

  const handleBook = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (!hasCoordinates(pickup) || !hasCoordinates(drop)) {
      toast({ title: "Missing Details", description: "Select valid pickup and drop locations first", variant: "destructive" });
      return;
    }
    if (!selectedVehicleId) {
      toast({ title: "Select Vehicle", description: "Please select a vehicle type", variant: "destructive" });
      return;
    }
    if (!routeMetrics || !hasFareEstimate) {
      toast({ title: "Route not ready", description: "Wait for the route and fare estimate to finish loading", variant: "destructive" });
      return;
    }
    if (bookingMode === "schedule") {
      scheduleRideMutation.mutate();
      return;
    }
    bookMutation.mutate();
  };

  const bookDisabled = routeLoading || !hasCoordinates(pickup) || !hasCoordinates(drop) || !routeMetrics || !hasFareEstimate || !selectedVehicleId || bookMutation.isPending || scheduleRideMutation.isPending || Boolean(scheduledTimeError);
  const disabledReason = (() => {
    if (!hasCoordinates(pickup) || !hasCoordinates(drop)) return "Select valid pickup and drop locations";
    if (!selectedVehicleId) return "Please select a vehicle type";
    if (routeLoading || !routeMetrics || !hasFareEstimate) return "Wait for the route and fare estimate to finish";
    if (scheduledTimeError) return scheduledTimeError;
    if (bookMutation.isPending || scheduleRideMutation.isPending) return "Booking in progress...";
    return "Action unavailable";
  })();

  const requestCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Geolocation is not supported in this browser", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setIsLocating(false);
        setLocationError(null);
        setUserLocation(nextLocation);
        setMapCenter(nextLocation);
        void updateLocationFromCoordinates("pickup", nextLocation);
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message || "Unable to access your current location.");
        toast({ title: "Location denied", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const centerMapPickerOnCurrentLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      toast({ title: "Location unavailable", description: "Geolocation is not supported in this browser", variant: "destructive" });
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        setIsLocating(false);
        setLocationError(null);
        setUserLocation(nextLocation);
        void resolveMapPickerAddress(nextLocation);
      },
      (error) => {
        setIsLocating(false);
        setLocationError(error.message || "Unable to access your current location.");
        toast({ title: "Location denied", description: error.message, variant: "destructive" });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const handleMapSelect = (coordinates: Coordinates) => {
    if (mapPickerField) {
      void resolveMapPickerAddress(coordinates);
      return;
    }

    const field = getNextMapField(activeField, pickup, drop);
    void updateLocationFromCoordinates(field, coordinates);
  };

  const closeFareSelector = () => setShowBookingPanel(false);

  const selectedName = selectedVehicle?.name || "Ride";
  const rideTabs = [
    { id: "daily" as const, label: "Daily rides" },
    { id: "outstation" as const, label: "Outstation" },
    { id: "rentals" as const, label: "Rentals" },
  ];
  const departDateOptions = useMemo(
    () => Array.from({ length: 10 }, (_, index) => getDateValue(index)),
    [],
  );
  const departTimeOptions = useMemo(
    () => {
      const values: string[] = [];
      for (let hour = 0; hour < 24; hour += 1) {
        for (const minute of [0, 15, 30, 45]) {
          values.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
        }
      }
      return values;
    },
    [],
  );
  const formatTimeLabel = (value: string) => {
    const [hourValue, minuteValue] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hourValue, minuteValue, 0, 0);
    return date.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", hour12: true });
  };
  const heroCopy = rideMode === "outstation"
    ? { title: "Ride out of town", subtitle: "Book and depart in an hour" }
    : rideMode === "rentals"
      ? { title: "Hourly city rentals", subtitle: "Keep a cab with you for every stop" }
      : { title: "Everyday city commute", subtitle: "Affordable rides at your doorstep" };
  const taxiMenuItems = [
    {
      label: "Book your ride",
      description: "Search pickup, drop and cab options",
      icon: CarFront,
      action: () => {
        setTaxiMenuOpen(false);
        setLocation("/taxi");
        window.setTimeout(() => {
          document.getElementById("book-your-ride")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 40);
      },
    },
    {
      label: "Your rides",
      description: "Past rides and active bookings",
      icon: History,
      action: () => {
        setTaxiMenuOpen(false);
        setLocation("/taxi/rides");
      },
    },
    {
      label: "Rate cards",
      description: "View base fare and per km pricing",
      icon: IndianRupee,
      action: () => {
        setTaxiMenuOpen(false);
        setRateCardsOpen(true);
      },
    },
    {
      label: "Support",
      description: "Get help with rides and payments",
      icon: Headphones,
      action: () => {
        setTaxiMenuOpen(false);
        setLocation("/support");
      },
    },
  ];

  return (
    <div className="min-h-screen bg-slate-100 pb-24 dark:bg-slate-950">
      <button
        className="sticky top-0 z-50 flex h-10 w-full items-center justify-center bg-blue-500 px-4 text-sm font-semibold text-white hover:bg-blue-600"
        onClick={() => setLocation("/taxi/rides")}
        type="button"
      >
        Track your current rides
      </button>

      <div className="sticky top-10 z-40 border-b border-slate-200 bg-white/95 backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <Button onClick={() => setLocation("/")} size="icon" variant="ghost" data-testid="button-back" className="rounded-md">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" className="rounded-md" onClick={() => setTaxiMenuOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
          </div>
          <button className="flex items-center gap-2" onClick={() => setLocation("/taxi")} type="button">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-lime-300 text-slate-950">
              <CarFront className="h-4 w-4" />
            </span>
            <span className="text-lg font-bold tracking-wide text-slate-950 dark:text-slate-50">CITY RIDE</span>
          </button>
          <div className="flex items-center gap-2">
            <Button className="rounded-md" onClick={() => setMapTheme((theme) => (theme === "light" ? "dark" : "light"))} size="icon" variant="ghost">
              {mapTheme === "light" ? <MoonStar className="h-5 w-5" /> : <SunMedium className="h-5 w-5" />}
            </Button>
            <Button className="rounded-md" onClick={() => setLocation("/profile")} size="icon" variant="ghost">
              <UserRound className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {taxiMenuOpen ? (
        <div className="fixed inset-0 z-[80] bg-black/35" onClick={() => setTaxiMenuOpen(false)}>
          <div
            className="h-full w-[min(360px,88vw)] border-r border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-lime-300 text-slate-950">
                  <CarFront className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-xl font-bold text-slate-950 dark:text-slate-50">CITY RIDE</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Taxi services</p>
                </div>
              </div>
              <button
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                onClick={() => setTaxiMenuOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="divide-y divide-slate-200 dark:divide-slate-800">
              {taxiMenuItems.map((item) => {
                const ItemIcon = item.icon;
                return (
                  <button
                    key={item.label}
                    className="flex w-full items-center gap-4 px-5 py-4 text-left transition hover:bg-slate-50 dark:hover:bg-slate-900"
                    onClick={item.action}
                    type="button"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200">
                      <ItemIcon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-slate-950 dark:text-slate-50">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-slate-500 dark:text-slate-400">{item.description}</span>
                    </span>
                    <ChevronLeft className="h-4 w-4 rotate-180 text-slate-400" />
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      ) : null}

      {rateCardsOpen ? (
        <div className="fixed inset-0 z-[90] flex items-end bg-black/45 sm:items-center sm:justify-center" onClick={() => setRateCardsOpen(false)}>
          <div
            className="max-h-[88vh] w-full overflow-y-auto rounded-t-lg bg-white p-4 shadow-2xl dark:bg-slate-950 sm:max-w-2xl sm:rounded-lg"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Rate cards</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-slate-50">Taxi fares and charges</h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prices are estimates and can change by distance, time and demand.</p>
              </div>
              <button
                className="rounded-md p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
                onClick={() => setRateCardsOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {vehicleTypes.length > 0 ? vehicleTypes.map((vehicleType) => {
                const vehicleId = getDocumentId(vehicleType);
                const baseFare = Number(vehicleType.baseFare || 0);
                const perKmRate = Number(vehicleType.perKmRate || 0);
                const perMinuteRate = Number((vehicleType as any).perMinuteRate || 0);
                const minimumFare = Number((vehicleType as any).minimumFare || baseFare || 0);
                return (
                  <div key={vehicleId} className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold text-slate-950 dark:text-slate-50">{vehicleType.name}</p>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{vehicleType.description || "Comfortable ride with live route tracking"}</p>
                      </div>
                      <span className="rounded-md bg-lime-300 px-2 py-1 text-xs font-bold text-slate-950">{vehicleType.capacity ?? "-"} seats</span>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">
                        <p className="text-[10px] uppercase text-slate-500">Base fare</p>
                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">{formatCurrency(baseFare)}</p>
                      </div>
                      <div className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">
                        <p className="text-[10px] uppercase text-slate-500">Per km</p>
                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">{formatCurrency(perKmRate)}</p>
                      </div>
                      <div className="rounded-md bg-slate-100 p-3 dark:bg-slate-900">
                        <p className="text-[10px] uppercase text-slate-500">Per min</p>
                        <p className="mt-1 text-sm font-bold text-slate-950 dark:text-slate-50">{formatCurrency(perMinuteRate)}</p>
                      </div>
                      <div className="rounded-md bg-slate-950 p-3 text-white dark:bg-amber-400 dark:text-slate-950">
                        <p className="text-[10px] uppercase text-white/70 dark:text-slate-800/70">Minimum</p>
                        <p className="mt-1 text-sm font-bold">{formatCurrency(minimumFare)}</p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-lg border border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Rate cards will appear once vehicle types load.
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <main className="mx-auto grid min-h-[calc(100vh-5.5rem)] max-w-7xl bg-white dark:bg-slate-950 lg:grid-cols-[520px_minmax(0,1fr)]">
        <aside className="order-1 border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
          <section id="book-your-ride" className="p-3 sm:p-5">
            <div className="mb-4 grid grid-cols-3 gap-2">
              {rideTabs.map((tab) => (
                <button
                  key={tab.id}
                  className={`h-10 rounded-md text-xs font-bold uppercase transition ${
                    rideMode === tab.id
                      ? "bg-lime-300 text-slate-950"
                      : "bg-transparent text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
                  }`}
                  onClick={() => setRideMode(tab.id)}
                  type="button"
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Where to?</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950 dark:text-slate-50">Set pickup and drop</h2>
              </div>
              <div className="rounded-lg bg-slate-950 p-3 text-white dark:bg-amber-400 dark:text-slate-950">
                <MapPinned className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                <CarFront className="h-4 w-4 text-slate-500" />
                <p className="mt-2 text-xs font-semibold text-slate-950 dark:text-slate-50">Mini, Auto</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                <Clock3 className="h-4 w-4 text-slate-500" />
                <p className="mt-2 text-xs font-semibold text-slate-950 dark:text-slate-50">Live ETA</p>
              </div>
              <div className="rounded-lg bg-slate-100 p-3 dark:bg-slate-900">
                <ShieldCheck className="h-4 w-4 text-slate-500" />
                <p className="mt-2 text-xs font-semibold text-slate-950 dark:text-slate-50">OTP safe</p>
              </div>
            </div>

            <OfferBanner />

            <div className="mt-5 space-y-3">
              <LocationSearchInput
                active={activeField === "pickup"}
                label="Pickup location"
                onChange={(value) => handleAddressInput("pickup", value)}
                onFocus={() => setActiveField("pickup")}
                onSelectSuggestion={(suggestion) => handleSuggestionSelect("pickup", suggestion)}
                placeholder="Click the map or search an address"
                value={pickup.address}
                showUseCurrent
                recentKey="taxi_recent_pickup"
              />
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
                onClick={() => openMapPicker("pickup")}
                type="button"
              >
                <Crosshair className="h-4 w-4" />
                Select pickup on map
              </button>
              <LocationSearchInput
                active={activeField === "drop"}
                label={rideMode === "outstation" ? "Destination city" : "Drop location"}
                onChange={(value) => handleAddressInput("drop", value)}
                onFocus={() => setActiveField("drop")}
                onSelectSuggestion={(suggestion) => handleSuggestionSelect("drop", suggestion)}
                placeholder={rideMode === "outstation" ? "Enter destination city" : "Search destination with autocomplete"}
                value={drop.address}
                recentKey="taxi_recent_drop"
              />
              <button
                className="flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600"
                onClick={() => openMapPicker("drop")}
                type="button"
              >
                <Crosshair className="h-4 w-4" />
                {rideMode === "outstation" ? "Select destination on map" : "Select drop on map"}
              </button>
              <RideSuggestionsStrip onSelect={(s) => {
                // quick handling for suggestions: redirect to search or prefill
                if (s.id === 'airport') {
                  setDrop((d) => ({ ...d, address: 'Airport' }));
                }
              }} />
              <RideModeToggle value={bookingMode} onChange={setBookingMode} />
              {bookingMode === "schedule" ? (
                <ScheduledRideForm
                  date={scheduledDate}
                  error={scheduledTimeError}
                  onDateChange={setScheduledDate}
                  onPaymentMethodChange={setScheduledPaymentMethod}
                  onTimeChange={setScheduledTime}
                  paymentMethod={scheduledPaymentMethod}
                  time={scheduledTime}
                />
              ) : null}
              {rideMode === "outstation" ? (
                <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">Trip starts</p>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        className={`h-10 rounded-md border text-sm font-semibold ${
                          tripStart === "now"
                            ? "border-slate-950 bg-white text-slate-950 dark:border-amber-300 dark:bg-slate-950 dark:text-amber-200"
                            : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                        }`}
                        onClick={() => setTripStart("now")}
                        type="button"
                      >
                        Leave now
                      </button>
                      <button
                        className={`h-10 rounded-md border text-sm font-semibold ${
                          tripStart === "schedule"
                            ? "border-slate-950 bg-white text-slate-950 dark:border-amber-300 dark:bg-slate-950 dark:text-amber-200"
                            : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                        }`}
                        onClick={() => setTripStart("schedule")}
                        type="button"
                      >
                        Schedule
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold ${
                        journeyType === "one-way"
                          ? "border-slate-950 bg-white text-slate-950 dark:border-amber-300 dark:bg-slate-950 dark:text-amber-200"
                          : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                      }`}
                      onClick={() => setJourneyType("one-way")}
                      type="button"
                    >
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-950 text-[10px] text-white dark:bg-amber-300 dark:text-slate-950">✓</span>
                      One Way
                    </button>
                    <button
                      className={`flex h-11 items-center justify-center gap-2 rounded-md border text-sm font-semibold ${
                        journeyType === "round-trip"
                          ? "border-slate-950 bg-white text-slate-950 dark:border-amber-300 dark:bg-slate-950 dark:text-amber-200"
                          : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300"
                      }`}
                      onClick={() => setJourneyType("round-trip")}
                      type="button"
                    >
                      <Repeat2 className="h-4 w-4" />
                      Round Trip
                    </button>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="block rounded-md bg-white px-3 py-2 dark:bg-slate-950">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase text-slate-500">
                        <CalendarDays className="h-3.5 w-3.5" />
                        Depart day
                      </span>
                      <select
                        className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-slate-50"
                        value={departDay}
                        onChange={(event) => {
                          setDepartDay(event.target.value);
                          setDepartDate(event.target.value);
                          setTripStart("schedule");
                        }}
                      >
                        {departDateOptions.map((value) => (
                          <option key={value} value={value}>{getDateLabel(value).split(",")[0]}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block rounded-md bg-white px-3 py-2 dark:bg-slate-950">
                      <span className="text-[10px] font-semibold uppercase text-slate-500">Depart date</span>
                      <select
                        className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-slate-50"
                        value={departDate}
                        onChange={(event) => {
                          setDepartDate(event.target.value);
                          setDepartDay(event.target.value);
                          setTripStart("schedule");
                        }}
                      >
                        {departDateOptions.map((value) => (
                          <option key={value} value={value}>{getDateLabel(value)}</option>
                        ))}
                      </select>
                    </label>
                    <label className="block rounded-md bg-white px-3 py-2 dark:bg-slate-950">
                      <span className="text-[10px] font-semibold uppercase text-slate-500">Depart time</span>
                      <select
                        className="mt-1 w-full bg-transparent text-sm font-semibold text-slate-950 outline-none dark:text-slate-50"
                        value={departTime}
                        onChange={(event) => {
                          setDepartTime(event.target.value);
                          setTripStart("schedule");
                        }}
                      >
                        {departTimeOptions.map((value) => (
                          <option key={value} value={value}>{formatTimeLabel(value)}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="rounded-lg border border-yellow-200 bg-yellow-50 px-3 py-3 text-sm text-slate-800 dark:border-yellow-900/50 dark:bg-yellow-950/30 dark:text-yellow-100">
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-lime-500 bg-white text-lime-700 dark:bg-slate-950">
                        <MapPinned className="h-4 w-4" />
                      </span>
                      <div>
                        <p className="font-semibold">{routeMetrics ? `About ${Math.round(routeMetrics.distanceKm)} km` : "Distance will appear after route selection"}</p>
                        <p className="mt-1 text-xs text-slate-600 dark:text-yellow-100/75">No pre-payment required. Free cancellation.</p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="mt-3">
                {bookDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        disabled
                        aria-busy={routeLoading || bookMutation.isPending}
                        className="mt-2 h-12 w-full cursor-not-allowed rounded-md bg-slate-300 text-base font-semibold text-slate-700"
                      >
                        {routeLoading ? (
                          <span className="flex items-center justify-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Calculating route...
                          </span>
                        ) : bookMutation.isPending || scheduleRideMutation.isPending ? (
                          <span className="flex items-center justify-center gap-3">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            {bookingMode === "schedule" ? "Scheduling ride..." : "Finding drivers..."}
                          </span>
                        ) : (
                          bookingMode === "schedule" ? "Confirm Scheduled Ride" : rideMode === "outstation" ? "Search outstation cabs" : 'See ride options'
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {disabledReason}
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      if (!user) {
                        setLocation("/auth");
                        return;
                      }
                      setShowBookingPanel(true);
                      // ensure vehicle/route panel is visible
                      window.setTimeout(() => {
                        const el = document.getElementById("ride-summary-panel");
                        if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
                      }, 60);
                    }}
                    className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-md bg-slate-950 text-base font-semibold text-white hover:bg-slate-800 dark:bg-amber-400 dark:text-slate-950 dark:hover:bg-amber-300"
                  >
                    {bookingMode === "schedule" ? "Confirm Scheduled Ride" : rideMode === "outstation" ? "Search outstation cabs" : "See ride options"}
                    <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button className="rounded-md" onClick={requestCurrentLocation} variant="outline">
                {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                Use current
              </Button>
              <Button className="rounded-md" onClick={() => setLiveUpdatesEnabled((value) => !value)} variant="outline">
                <Navigation className="mr-2 h-4 w-4" />
                {liveUpdatesEnabled ? "Pause tracking" : "Track drivers"}
              </Button>
            </div>

            {locationError ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300">
                {locationError}
              </p>
            ) : null}
            {routeError ? (
              <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-300">
                {routeError}
              </p>
            ) : null}
            {!routeError && routeLoading ? (
              <p className="mt-4 flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                Calculating route and travel time...
              </p>
            ) : null}
            {nearbyVehicles.length > 0 ? (
              <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                {isRefreshingVehicles
                  ? "Refreshing live driver tracking..."
                  : trackedDriver
                    ? `${trackedDriver.driverName} is being tracked live on the map.`
                    : `${nearbyVehicles.length} nearby drivers visible around your pickup point.`}
              </p>
            ) : !liveUpdatesEnabled ? (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                Enable driver tracking to search for live drivers before confirming the ride.
              </p>
            ) : (
              <p className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                No live drivers with GPS are online near this location yet.
              </p>
            )}
            {selectedVehicle && hasFareEstimate ? (
              <p className="mt-4 rounded-lg bg-slate-950 px-4 py-3 text-sm text-white dark:bg-amber-400 dark:text-slate-950">
                {selectedName} currently estimated at {formatCurrency(estimatedFare)}.
              </p>
            ) : null}
            {bookingMode === "schedule" && selectedVehicle && hasFareEstimate ? (
              <div className="mt-4">
                <ScheduledFareEstimateCard
                  baseFare={Number(selectedVehicle.baseFare || 0)}
                  distanceFare={Math.max(0, estimatedFare - Number(selectedVehicle.baseFare || 0))}
                  scheduledFee={scheduledBookingFee}
                  timeFare={0}
                  total={scheduledFareTotal}
                />
              </div>
            ) : null}
          </section>

          {isLoading ? (
            <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              {[1, 2, 3].map((item) => (
                <Skeleton key={item} className="h-24 w-full rounded-lg" />
              ))}
            </section>
          ) : (
            <div id="ride-summary-panel" className="space-y-3">
              <EtaPredictionCard
                prediction={etaPrediction}
                isLoading={etaLoading}
                error={etaError instanceof Error ? etaError.message : null}
                title="Pickup and trip ETA"
              />
              <RideSummary
              confirmDisabled={!hasCoordinates(pickup) || !hasCoordinates(drop) || !selectedVehicleId || !routeMetrics || !hasFareEstimate || bookMutation.isPending || scheduleRideMutation.isPending || Boolean(scheduledTimeError)}
              confirmPending={bookMutation.isPending || scheduleRideMutation.isPending}
              etaPrediction={etaPrediction}
              liveUpdatesEnabled={liveUpdatesEnabled}
              onEnableTracking={() => setLiveUpdatesEnabled(true)}
              onConfirmRide={handleBook}
              onSelectVehicle={setSelectedVehicleId}
              routeMetrics={routeMetrics}
              selectedVehicleId={selectedVehicleId}
              trackedDriver={trackedDriver}
              trackingRequired={hasCoordinates(pickup) && hasCoordinates(drop) && Boolean(selectedVehicleId)}
              trackingStatusLabel={trackingStatusLabel}
              vehicleTypes={vehicleTypes}
            />
            </div>
          )}
        </aside>

        <section className="order-2 space-y-4 bg-slate-900 p-3 dark:bg-slate-950 lg:p-4">
          <div className="relative">
            {mapPickerField ? (
              <div className="absolute inset-x-3 top-3 z-[520] space-y-3 sm:inset-x-5">
                <div className="flex items-center gap-3 rounded-lg bg-white px-3 py-3 shadow-lg dark:bg-slate-950">
                  <button
                    className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                    onClick={closeMapPicker}
                    type="button"
                  >
                    <X className="h-5 w-5" />
                  </button>
                  <div className="min-w-0 flex-1 text-center">
                    <p className="text-base font-bold text-slate-950 dark:text-slate-50">Move map to adjust location</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{mapPickerField === "pickup" ? "Pickup location" : "Drop location"}</p>
                  </div>
                  <button
                    className="rounded-md p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900"
                    onClick={centerMapPickerOnCurrentLocation}
                    type="button"
                  >
                    <LocateFixed className="h-5 w-5" />
                  </button>
                </div>
                <div className="rounded-md border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100">
                  {mapPickerResolving ? "Resolving address..." : mapPickerAddress || "Move the map to choose a location"}
                </div>
              </div>
            ) : null}

            <div className={`pointer-events-none absolute left-5 top-5 z-[510] max-w-sm text-white lg:left-10 lg:top-12 ${mapPickerField ? "hidden" : ""}`}>
              <p className="text-sm font-bold uppercase text-lime-300">#CityRideForWeb</p>
              <h2 className="mt-3 text-3xl font-bold leading-tight lg:text-4xl">{heroCopy.title}</h2>
              <p className="mt-2 max-w-xs text-base text-white/85">{heroCopy.subtitle}</p>
            </div>
            <MapComponent
              activeField={activeField}
              center={mapPickerCoordinates ?? mapCenter}
              drop={!mapPickerField && hasCoordinates(drop) ? drop : null}
              highlightedVehicleId={highlightedVehicleId}
              mapClassName="h-[360px] w-full sm:h-[460px] lg:h-[calc(100vh-9rem)]"
              mapTheme={mapTheme}
              onDropDrag={(coordinates) => void updateLocationFromCoordinates("drop", coordinates)}
              onMapSelect={handleMapSelect}
              onPickupDrag={(coordinates) => void updateLocationFromCoordinates("pickup", coordinates)}
              onViewportChange={(coordinates) => {
                if (mapPickerField) {
                  void resolveMapPickerAddress(coordinates);
                }
              }}
              pickerLabel={mapPickerField ?? undefined}
              pickerMode={Boolean(mapPickerField)}
              pickup={!mapPickerField && hasCoordinates(pickup) ? pickup : null}
              routeGeometry={mapPickerField ? [] : routeMetrics?.geometry ?? []}
              showSelectionHint
              trackedDriver={trackedDriver}
              trackedDriverRoute={mapPickerField ? [] : trackedDriverRoute}
              userLocation={userLocation}
              vehicles={mapPickerField ? [] : nearbyVehicles}
            />
            {mapPickerField ? (
              <div className="absolute inset-x-3 bottom-3 z-[520] sm:inset-x-5">
                <button
                  className="h-12 w-full rounded-md bg-black text-base font-bold text-lime-300 shadow-xl hover:bg-slate-900 disabled:cursor-not-allowed disabled:bg-slate-400 disabled:text-slate-700"
                  disabled={!mapPickerCoordinates || mapPickerResolving}
                  onClick={confirmMapPickerLocation}
                  type="button"
                >
                  Confirm Location
                </button>
              </div>
            ) : null}
          </div>

          <NearbyDriversPanel
            canRequestTracking={canRequestTracking}
            drivers={nearbyVehicles}
            error={nearbyDriversError}
            highlightedDriverId={highlightedVehicleId}
            isLoading={nearbyDriversLoading}
            isRefreshing={isRefreshingVehicles}
            liveUpdatesEnabled={liveUpdatesEnabled}
            onEnableTracking={() => setLiveUpdatesEnabled(true)}
            onRefresh={() => refetchNearbyDrivers()}
            onSelectDriver={setSelectedDriverId}
            selectedDriverId={selectedDriverId}
          />

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Pickup</p>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{pickup.address || "Tap the map or use current location."}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <p className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400">Drop</p>
              <p className="mt-3 text-sm text-slate-700 dark:text-slate-200">{drop.address || "Search for a destination or click the map."}</p>
            </div>
            <div className="rounded-lg border border-slate-950 bg-slate-950 p-4 text-white shadow-sm dark:border-amber-400 dark:bg-amber-400 dark:text-slate-950">
              <p className="text-xs font-semibold uppercase text-white/65 dark:text-slate-800/70">Live status</p>
              <p className="mt-3 text-sm">
                {trackedDriver
                  ? `${trackedDriver.driverName} • ${trackedDriver.vehicleType} • ${trackedDriver.etaMin} min to pickup`
                  : nearbyVehicles.length > 0
                    ? `${nearbyVehicles.length} drivers nearby • select one to preview route to pickup`
                  : routeMetrics
                    ? `Route ready • ${routeMetrics.distanceKm.toFixed(1)} km • ${routeMetrics.durationMin} min`
                    : "No live drivers online nearby yet."}
              </p>
            </div>
          </div>
        </section>
      </main>

      <BottomNav />
      <FareSelector
        open={showBookingPanel}
        onClose={closeFareSelector}
        vehicleTypes={vehicleTypes}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={setSelectedVehicleId}
        estimatedFare={estimatedFare ?? undefined}
        routeMetrics={routeMetrics}
        onConfirm={handleBook}
        confirmPending={bookMutation.isPending}
        canConfirm={Boolean(routeMetrics && typeof estimatedFare === "number" && Number.isFinite(estimatedFare) && selectedVehicleId)}
      />
    </div>
  );
}
