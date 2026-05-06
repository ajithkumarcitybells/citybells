import { useEffect, useMemo, useRef, useState } from "react";
import { useTaxiSocket } from "@/hooks/useTaxiSocket";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Camera,
  Car,
  CheckCircle2,
  Clock,
  CreditCard,
  DollarSign,
  Home,
  LayoutDashboard,
  Loader2,
  MapPin,
  Navigation,
  Phone,
  Power,
  Save,
  ShieldCheck,
  Star,
  TrendingUp,
  Upload,
  User,
  X,
  ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { TaxiDriver, TaxiRide } from "@shared/schema";
import { DriverScheduledRideCard } from "@/components/taxi/scheduled-rides";

type DriverTab = "home" | "dashboard" | "trips" | "scheduled" | "profile";

type DashboardTaxiDriver = TaxiDriver & {
  isActive?: boolean | null;
  vehicleType?: string | null;
  profilePhoto?: string | null;
  licenseFrontPhoto?: string | null;
  licenseBackPhoto?: string | null;
  rcBookNumber?: string | null;
  rcBookFrontPhoto?: string | null;
  rcBookBackPhoto?: string | null;
  currentLat?: string | number | null;
  currentLng?: string | number | null;
};

type ProfileFormState = {
  name: string;
  phone: string;
  profilePhoto: string;
  licenseNumber: string;
  licenseFrontPhoto: string;
  licenseBackPhoto: string;
  rcBookNumber: string;
  rcBookFrontPhoto: string;
  rcBookBackPhoto: string;
  vehicleType: string;
  vehicleNumber: string;
};

const vehicleOptions = [
  { value: "mini", label: "Mini" },
  { value: "suv", label: "SUV" },
  { value: "auto", label: "Auto" },
  { value: "sedan", label: "Sedan" },
];

const emptyProfileForm: ProfileFormState = {
  name: "",
  phone: "",
  profilePhoto: "",
  licenseNumber: "",
  licenseFrontPhoto: "",
  licenseBackPhoto: "",
  rcBookNumber: "",
  rcBookFrontPhoto: "",
  rcBookBackPhoto: "",
  vehicleType: "mini",
  vehicleNumber: "",
};

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusColor(status: string) {
  switch (status) {
    case "requested": return "bg-amber-100 text-amber-900";
    case "accepted": return "bg-emerald-100 text-emerald-800";
    case "arriving": return "bg-indigo-100 text-indigo-800";
    case "started":
    case "in_ride": return "bg-purple-100 text-purple-800";
    case "completed": return "bg-green-100 text-green-800";
    case "cancelled": return "bg-red-100 text-red-800";
    default: return "bg-slate-100 text-slate-700";
  }
}

function getNextStatus(current: string): string | null {
  const flow: Record<string, string> = {
    accepted: "arriving",
    driver_assigned: "arriving",
    arriving: "started",
    started: "completed",
    in_ride: "completed",
  };
  return flow[current] || null;
}

function getNextStatusLabel(current: string) {
  const labels: Record<string, string> = {
    accepted: "Start navigation",
    driver_assigned: "Start navigation",
    arriving: "Verify OTP",
    started: "Complete trip",
    in_ride: "Complete trip",
  };
  return labels[current] || "Update";
}

function readDriverOnline(driver?: DashboardTaxiDriver | null) {
  return Boolean(driver?.isActive ?? driver?.isOnline);
}

function readCoordinate(value: string | number | null | undefined) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function getRideFare(ride: TaxiRide) {
  const rawFare = (ride as any).estimatedFare ?? (ride as any).fare ?? (ride as any).actualFare;
  const fare = Number(rawFare);
  return Number.isFinite(fare) ? fare.toFixed(0) : "--";
}

function createProfileForm(driver?: DashboardTaxiDriver | null): ProfileFormState {
  if (!driver) return emptyProfileForm;
  return {
    name: driver.name || "",
    phone: driver.phone || "",
    profilePhoto: driver.profilePhoto || "",
    licenseNumber: driver.licenseNumber || "",
    licenseFrontPhoto: driver.licenseFrontPhoto || "",
    licenseBackPhoto: driver.licenseBackPhoto || "",
    rcBookNumber: driver.rcBookNumber || "",
    rcBookFrontPhoto: driver.rcBookFrontPhoto || "",
    rcBookBackPhoto: driver.rcBookBackPhoto || "",
    vehicleType: driver.vehicleType || driver.vehicleTypeId || "mini",
    vehicleNumber: driver.vehicleNumber || "",
  };
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function DocUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block rounded-2xl border border-dashed border-slate-300 bg-white p-3 text-sm shadow-sm">
      <span className="mb-2 flex items-center justify-between gap-2 font-semibold text-slate-800">
        {label}
        {value ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Upload className="h-4 w-4 text-slate-400" />}
      </span>
      {value ? (
        <img src={value} alt={label} className="mb-2 h-28 w-full rounded-xl object-cover" />
      ) : (
        <div className="mb-2 flex h-28 items-center justify-center rounded-xl bg-slate-50 text-xs text-slate-400">
          Upload photo
        </div>
      )}
      <input
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          if (file) onChange(await fileToDataUrl(file));
        }}
      />
      <span className="text-xs font-medium text-amber-700">Choose image</span>
    </label>
  );
}

function RideRequestCard({
  ride,
  onAccept,
  onReject,
  isAccepting,
  isRejecting,
}: {
  ride: TaxiRide;
  onAccept: () => void;
  onReject: () => void;
  isAccepting: boolean;
  isRejecting: boolean;
}) {
  return (
    <Card className="rounded-3xl border-amber-200 bg-amber-50 p-4 shadow-sm" data-testid={`card-ride-request-${ride.id}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <Badge className="border-transparent bg-amber-100 text-[10px] uppercase tracking-[0.2em] text-amber-900">Upcoming Trip</Badge>
          <p className="mt-2 text-base font-bold text-slate-950">New ride request</p>
          <p className="text-xs text-slate-500">Accept to claim this trip before another driver.</p>
        </div>
        <div className="rounded-2xl bg-white p-3 text-amber-700 shadow-sm">
          <Clock className="h-5 w-5" />
        </div>
      </div>

      <div className="space-y-3 rounded-2xl bg-white p-3">
        <div className="flex gap-3">
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-green-500" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Pickup</p>
            <p className="line-clamp-2 text-sm font-semibold text-slate-800">{ride.pickupAddress}</p>
          </div>
        </div>
        <div className="flex gap-3">
          <span className="mt-1 h-2.5 w-2.5 rounded-full bg-red-500" />
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400">Drop</p>
            <p className="line-clamp-2 text-sm font-semibold text-slate-800">{ride.dropAddress}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Fare</p>
          <p className="font-bold text-slate-950">Rs {getRideFare(ride)}</p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Distance</p>
          <p className="font-bold text-slate-950">{ride.distance ? `${Number(ride.distance).toFixed(1)} km` : "--"}</p>
        </div>
        <div className="rounded-2xl bg-white p-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-slate-400">Vehicle</p>
          <p className="font-bold capitalize text-slate-950">{(ride as any).vehicleType || ride.vehicleTypeId || "Taxi"}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <Button className="h-12 rounded-2xl bg-green-600 hover:bg-green-700" onClick={onAccept} disabled={isAccepting || isRejecting}>
          {isAccepting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Accept
        </Button>
        <Button variant="outline" className="h-12 rounded-2xl border-red-200 text-red-600 hover:bg-red-50" onClick={onReject} disabled={isAccepting || isRejecting}>
          {isRejecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Reject
        </Button>
      </div>
    </Card>
  );
}

function TripCard({
  ride,
  updateStatus,
  openOtp,
  isUpdating,
}: {
  ride: TaxiRide;
  updateStatus: (payload: { rideId: string; status: string }) => void;
  openOtp: (rideId: string) => void;
  isUpdating: boolean;
}) {
  const nextStatus = getNextStatus(ride.status || "");
  return (
    <Card className="rounded-3xl p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Badge className={`${getStatusColor(ride.status || "")} border-transparent text-[10px] uppercase tracking-[0.14em]`}>
          {formatStatus(ride.status || "")}
        </Badge>
        <span className="text-sm font-bold text-slate-950">Rs {getRideFare(ride)}</span>
      </div>
      <div className="space-y-2 text-sm">
        <div className="flex gap-2">
          <MapPin className="mt-0.5 h-4 w-4 text-green-600" />
          <span className="line-clamp-1 text-slate-700">{ride.pickupAddress}</span>
        </div>
        <div className="flex gap-2">
          <Navigation className="mt-0.5 h-4 w-4 text-red-500" />
          <span className="line-clamp-1 text-slate-700">{ride.dropAddress}</span>
        </div>
      </div>
      {nextStatus ? (
        <Button
          className="mt-4 h-11 w-full rounded-2xl bg-slate-950 hover:bg-slate-800"
          disabled={isUpdating}
          onClick={() => {
            if (nextStatus === "started" || nextStatus === "in_ride") {
              openOtp(ride.id);
              return;
            }
            updateStatus({ rideId: ride.id, status: nextStatus });
          }}
        >
          {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {getNextStatusLabel(ride.status || "")}
        </Button>
      ) : null}
    </Card>
  );
}

export default function TaxiDriverDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<DriverTab>("dashboard");
  const [dashboardTab, setDashboardTab] = useState("overview");
  const [profileForm, setProfileForm] = useState<ProfileFormState>(emptyProfileForm);
  const [locationState, setLocationState] = useState<"idle" | "starting" | "live" | "error">("idle");
  const [locationMessage, setLocationMessage] = useState("Go online to share your live location.");
  const [otpModalRideId, setOtpModalRideId] = useState<string | null>(null);
  const [otpInput, setOtpInput] = useState("");
  const watchIdRef = useRef<number | null>(null);
  const lastSentRef = useRef<{ lat: number; lng: number; timestamp: number } | null>(null);
  const { socketRef, connected: socketConnected, emit } = useTaxiSocket();

  const { data: driver, isLoading: driverLoading } = useQuery<DashboardTaxiDriver | null>({
    queryKey: ["/api/taxi/driver/profile"],
    enabled: !!user,
    queryFn: async () => {
      const res = await fetch("/api/taxi/driver/profile", { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) {
        const text = (await res.text()) || res.statusText;
        throw new Error(`${res.status}: ${text}`);
      }
      return res.json();
    },
  });

  const isDriverOnline = readDriverOnline(driver);
  const driverCurrentLat = readCoordinate(driver?.currentLat);
  const driverCurrentLng = readCoordinate(driver?.currentLng);

  const { data: stats } = useQuery<{ totalRides: number; todayRides: number; earnings: string; rating: string }>({
    queryKey: ["/api/taxi/driver/stats"],
    enabled: !!user && !!driver,
  });

  const { data: rides = [], isLoading: ridesLoading } = useQuery<TaxiRide[]>({
    queryKey: ["/api/taxi/driver/rides"],
    enabled: !!user && !!driver,
    refetchInterval: isDriverOnline ? 3000 : 10000,
  });
  const { data: scheduledRides = [], isLoading: scheduledLoading } = useQuery<TaxiRide[]>({
    queryKey: ["/api/taxi/driver/scheduled-rides"],
    enabled: !!user && !!driver,
    refetchInterval: isDriverOnline ? 10000 : 30000,
  });

  const requestRides = rides.filter((ride) => ride.status === "requested");
  const activeRides = rides.filter((ride) => !["requested", "completed", "cancelled"].includes(String(ride.status)));
  const completedRides = rides.filter((ride) => ride.status === "completed");
  const feedTitle = requestRides.length > 0 ? `${requestRides.length} request${requestRides.length > 1 ? "s" : ""} waiting` : "Waiting for the next request";

  const onlineHours = useMemo(() => {
    const total = Math.max(1, Number(stats?.todayRides || 0));
    return `${(total * 1.9 + 0.5).toFixed(1)}h`;
  }, [stats?.todayRides]);

  useEffect(() => {
    if (driver) setProfileForm(createProfileForm(driver));
  }, [driver?.id]);

  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    emit("joinDriverRides");
    const refreshRideRequests = () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/rides"] });
    };
    socket.on("taxiRideRequest", refreshRideRequests);
    socket.on("taxiRideUpdate", refreshRideRequests);
    return () => {
      socket.off("taxiRideRequest", refreshRideRequests);
      socket.off("taxiRideUpdate", refreshRideRequests);
    };
  }, [emit, socketConnected, socketRef]);

  const toggleOnlineMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const res = await apiRequest("PATCH", "/api/taxi/driver/toggle-online", { isOnline });
      return await res.json();
    },
    onSuccess: (data: DashboardTaxiDriver) => {
      queryClient.setQueryData(["/api/taxi/driver/profile"], data);
      toast({ title: readDriverOnline(data) ? "You are Online" : "You are Offline" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateLocationMutation = useMutation({
    mutationFn: async (coordinates: { lat: number; lng: number }) => {
      const res = await apiRequest("PATCH", "/api/taxi/driver/location", coordinates);
      return await res.json();
    },
    onSuccess: (data: DashboardTaxiDriver) => {
      queryClient.setQueryData(["/api/taxi/driver/profile"], data);
      setLocationState("live");
      setLocationMessage("Live GPS is updating for nearby riders.");
    },
    onError: (error: Error) => {
      setLocationState("error");
      setLocationMessage(error.message || "Unable to update your live location.");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: ProfileFormState) => {
      const res = await apiRequest("PATCH", "/api/taxi/driver/profile", payload);
      return await res.json();
    },
    onSuccess: (data: DashboardTaxiDriver) => {
      queryClient.setQueryData(["/api/taxi/driver/profile"], data);
      toast({ title: "Profile saved", description: "Your driver documents and vehicle details were updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to save profile", description: error.message, variant: "destructive" });
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
      toast({ title: "Trip updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const acceptRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const res = await apiRequest("PATCH", `/api/taxi/driver/rides/${rideId}/accept`);
      return await res.json();
    },
    onSuccess: () => {
      setActiveTab("trips");
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/stats"] });
      toast({ title: "Ride accepted", description: "Pickup and drop details are now available." });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to accept ride", description: error.message, variant: "destructive" });
    },
  });

  const rejectRideMutation = useMutation({
    mutationFn: async (rideId: string) => {
      const res = await apiRequest("PATCH", `/api/taxi/driver/rides/${rideId}/reject`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/rides"] });
      toast({ title: "Ride rejected", description: "We are offering it to another nearby driver." });
    },
    onError: (error: Error) => {
      toast({ title: "Unable to reject ride", description: error.message, variant: "destructive" });
    },
  });

  const verifyOtpMutation = useMutation({
    mutationFn: async ({ rideId, otp }: { rideId: string; otp: string }) => {
      const res = await apiRequest("PATCH", `/api/taxi/driver/rides/${rideId}/start`, { otp });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/rides"] });
      setOtpModalRideId(null);
      setOtpInput("");
      toast({ title: "Trip started", description: "OTP verified successfully." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateScheduledStatusMutation = useMutation({
    mutationFn: async ({ rideId, status }: { rideId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/taxi/driver/scheduled-rides/${rideId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/scheduled-rides"] });
      queryClient.invalidateQueries({ queryKey: ["/api/taxi/driver/rides"] });
      toast({ title: "Scheduled ride updated" });
    },
    onError: (error: Error) => toast({ title: "Update failed", description: error.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (!user || driverLoading || !driver || !isDriverOnline) {
      if (watchIdRef.current !== null && typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      lastSentRef.current = null;
      setLocationState("idle");
      setLocationMessage("Go online to share your live location.");
      return;
    }

    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationState("error");
      setLocationMessage("Geolocation is not supported in this browser.");
      return;
    }

    const shouldSendLocation = (lat: number, lng: number) => {
      const previous = lastSentRef.current;
      const now = Date.now();
      if (!previous) return true;
      return Math.abs(previous.lat - lat) > 0.0001 || Math.abs(previous.lng - lng) > 0.0001 || now - previous.timestamp > 15000;
    };

    setLocationState("starting");
    setLocationMessage("Requesting GPS access for live rider visibility...");

    const handlePosition = (position: GeolocationPosition) => {
      const nextCoordinates = { lat: position.coords.latitude, lng: position.coords.longitude };
      if (!shouldSendLocation(nextCoordinates.lat, nextCoordinates.lng)) return;
      lastSentRef.current = { ...nextCoordinates, timestamp: Date.now() };
      updateLocationMutation.mutate(nextCoordinates);
      emit("driverLocationUpdate", { driverId: driver.id, ...nextCoordinates });
    };

    const handleError = (error: GeolocationPositionError) => {
      setLocationState("error");
      setLocationMessage(error.message || "Unable to read your GPS location.");
    };

    navigator.geolocation.getCurrentPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    watchIdRef.current = navigator.geolocation.watchPosition(handlePosition, handleError, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 });

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, driverLoading, driver?.id, isDriverOnline]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-sm rounded-3xl p-6 text-center">
          <p className="mb-4 text-slate-500">Please log in to access your driver dashboard.</p>
          <Button onClick={() => setLocation("/auth")}>Log in</Button>
        </Card>
      </div>
    );
  }

  if (driverLoading) {
    return (
      <div className="mx-auto min-h-screen max-w-lg bg-slate-50 px-4 py-6">
        <Skeleton className="h-24 rounded-3xl" />
        <Skeleton className="mt-4 h-44 rounded-3xl" />
        <Skeleton className="mt-4 h-64 rounded-3xl" />
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
        <Card className="max-w-sm rounded-3xl p-6 text-center">
          <Car className="mx-auto mb-3 h-12 w-12 text-slate-300" />
          <p className="font-semibold text-slate-800">Driver profile not found</p>
          <p className="mt-1 text-sm text-slate-500">Contact admin to set up your profile.</p>
        </Card>
      </div>
    );
  }

  const renderHome = () => (
    <div className="space-y-4">
      <Card className="rounded-3xl border-0 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="rounded-2xl bg-slate-100 p-3">
            <ClipboardList className="h-6 w-6 text-slate-900" />
          </div>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">Realtime Feed</p>
            <h2 className="text-xl font-black text-slate-950">{feedTitle}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {requestRides.length ? "Open Trips to accept or reject your next request." : "Your car is visible to nearby riders. The next request will appear here."}
            </p>
          </div>
        </div>
      </Card>
      {requestRides[0] ? (
        <RideRequestCard
          ride={requestRides[0]}
          onAccept={() => acceptRideMutation.mutate(requestRides[0].id)}
          onReject={() => rejectRideMutation.mutate(requestRides[0].id)}
          isAccepting={acceptRideMutation.isPending}
          isRejecting={rejectRideMutation.isPending}
        />
      ) : (
        <Card className="rounded-3xl p-6 text-center shadow-sm">
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-emerald-500" />
          <p className="font-semibold text-slate-900">You are ready for bookings</p>
          <p className="mt-1 text-sm text-slate-500">Keep GPS on and stay online to receive requests.</p>
        </Card>
      )}
    </div>
  );

  const renderDashboard = () => (
    <Tabs value={dashboardTab} onValueChange={setDashboardTab}>
      <TabsList className="grid h-14 w-full grid-cols-2 rounded-3xl bg-white p-1 shadow-sm">
        <TabsTrigger value="overview" className="rounded-2xl data-[state=active]:bg-black data-[state=active]:text-white">Overview</TabsTrigger>
        <TabsTrigger value="history" className="rounded-2xl data-[state=active]:bg-black data-[state=active]:text-white">History</TabsTrigger>
      </TabsList>
      <TabsContent value="overview" className="mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: "Today's Rides", value: stats?.todayRides || 0, icon: Car },
            { label: "Today Earnings", value: `Rs ${stats?.earnings ? Number(stats.earnings).toFixed(0) : "0"}`, icon: DollarSign },
            { label: "Online Hours", value: onlineHours, icon: Clock },
            { label: "Total Rides", value: stats?.totalRides || 0, icon: TrendingUp },
          ].map((item) => (
            <Card key={item.label} className="rounded-3xl p-4 shadow-sm">
              <div className="mb-3 inline-flex rounded-2xl bg-slate-100 p-3">
                <item.icon className="h-5 w-5 text-slate-900" />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-slate-950">{item.value}</p>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Card className="rounded-3xl p-4 shadow-sm">
            <DollarSign className="mb-2 h-5 w-5" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Total Earnings</p>
            <p className="mt-1 font-black">Rs {stats?.earnings ? Number(stats.earnings).toFixed(0) : "0"}</p>
          </Card>
          <Card className="rounded-3xl p-4 shadow-sm">
            <ClipboardList className="mb-2 h-5 w-5" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Trips</p>
            <p className="mt-1 font-black">{completedRides.length} Completed</p>
          </Card>
          <Card className="rounded-3xl p-4 shadow-sm">
            <Star className="mb-2 h-5 w-5" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Rating</p>
            <p className="mt-1 font-black">{stats?.rating ? Number(stats.rating).toFixed(1) : "4.5"} ★</p>
          </Card>
        </div>
      </TabsContent>
      <TabsContent value="history" className="mt-4 space-y-3">
        {completedRides.length === 0 ? (
          <Card className="rounded-3xl p-8 text-center text-sm text-slate-500">No completed trips yet.</Card>
        ) : completedRides.map((ride) => (
          <TripCard
            key={ride.id}
            ride={ride}
            updateStatus={updateStatusMutation.mutate}
            openOtp={setOtpModalRideId}
            isUpdating={updateStatusMutation.isPending}
          />
        ))}
      </TabsContent>
    </Tabs>
  );

  const renderTrips = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-950">Upcoming trips</h2>
        <p className="text-sm text-slate-500">Accept new requests and manage active rides.</p>
      </div>
      {ridesLoading ? (
        <Skeleton className="h-44 rounded-3xl" />
      ) : requestRides.length === 0 && activeRides.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center">
          <Car className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-800">No upcoming trips</p>
          <p className="mt-1 text-sm text-slate-500">New ride requests will appear here.</p>
        </Card>
      ) : (
        <>
          {requestRides.map((ride) => (
            <RideRequestCard
              key={ride.id}
              ride={ride}
              onAccept={() => acceptRideMutation.mutate(ride.id)}
              onReject={() => rejectRideMutation.mutate(ride.id)}
              isAccepting={acceptRideMutation.isPending}
              isRejecting={rejectRideMutation.isPending}
            />
          ))}
          {activeRides.map((ride) => (
            <TripCard
              key={ride.id}
              ride={ride}
              updateStatus={updateStatusMutation.mutate}
              openOtp={setOtpModalRideId}
              isUpdating={updateStatusMutation.isPending}
            />
          ))}
        </>
      )}
    </div>
  );

  const renderScheduled = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-black text-slate-950">Scheduled rides</h2>
        <p className="text-sm text-slate-500">Assigned future pickups appear here with countdowns.</p>
      </div>
      {scheduledLoading ? (
        <Skeleton className="h-44 rounded-3xl" />
      ) : scheduledRides.length === 0 ? (
        <Card className="rounded-3xl p-8 text-center">
          <Clock className="mx-auto mb-3 h-10 w-10 text-slate-300" />
          <p className="font-semibold text-slate-800">No scheduled rides assigned</p>
          <p className="mt-1 text-sm text-slate-500">Admin-assigned future rides will show here.</p>
        </Card>
      ) : scheduledRides.map((ride) => (
        <DriverScheduledRideCard
          key={ride.id}
          ride={ride}
          onStatus={(status) => updateScheduledStatusMutation.mutate({ rideId: ride.id, status })}
        />
      ))}
    </div>
  );

  const renderProfile = () => (
    <div className="space-y-4">
      <Card className="rounded-3xl p-4 shadow-sm">
        <div className="flex items-center gap-4">
          <label className="relative h-20 w-20 overflow-hidden rounded-3xl bg-slate-100">
            {profileForm.profilePhoto ? (
              <img src={profileForm.profilePhoto} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <User className="m-5 h-10 w-10 text-slate-400" />
            )}
            <span className="absolute bottom-1 right-1 rounded-full bg-black p-1.5 text-white">
              <Camera className="h-3.5 w-3.5" />
            </span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (file) {
                  const dataUrl = await fileToDataUrl(file);
                  setProfileForm((prev) => ({ ...prev, profilePhoto: dataUrl }));
                }
              }}
            />
          </label>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-400">Driver Profile</p>
            <h2 className="text-xl font-black text-slate-950">{driver.name}</h2>
            <p className="text-sm text-slate-500">Update documents, RC book and vehicle type.</p>
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl p-4 shadow-sm">
        <div className="grid gap-3">
          <label className="text-sm font-semibold text-slate-700">
            Name
            <Input className="mt-1 rounded-2xl" value={profileForm.name} onChange={(event) => setProfileForm((prev) => ({ ...prev, name: event.target.value }))} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Phone
            <Input className="mt-1 rounded-2xl" value={profileForm.phone} onChange={(event) => setProfileForm((prev) => ({ ...prev, phone: event.target.value }))} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Vehicle type
            <select
              className="mt-1 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm"
              value={profileForm.vehicleType}
              onChange={(event) => setProfileForm((prev) => ({ ...prev, vehicleType: event.target.value }))}
            >
              {vehicleOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm font-semibold text-slate-700">
            Vehicle number
            <Input className="mt-1 rounded-2xl uppercase" value={profileForm.vehicleNumber} onChange={(event) => setProfileForm((prev) => ({ ...prev, vehicleNumber: event.target.value.toUpperCase() }))} />
          </label>
          <label className="text-sm font-semibold text-slate-700">
            License number
            <Input className="mt-1 rounded-2xl uppercase" value={profileForm.licenseNumber} onChange={(event) => setProfileForm((prev) => ({ ...prev, licenseNumber: event.target.value.toUpperCase() }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <DocUpload label="License front" value={profileForm.licenseFrontPhoto} onChange={(value) => setProfileForm((prev) => ({ ...prev, licenseFrontPhoto: value }))} />
            <DocUpload label="License back" value={profileForm.licenseBackPhoto} onChange={(value) => setProfileForm((prev) => ({ ...prev, licenseBackPhoto: value }))} />
          </div>
          <label className="text-sm font-semibold text-slate-700">
            RC book number
            <Input className="mt-1 rounded-2xl uppercase" value={profileForm.rcBookNumber} onChange={(event) => setProfileForm((prev) => ({ ...prev, rcBookNumber: event.target.value.toUpperCase() }))} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <DocUpload label="RC front" value={profileForm.rcBookFrontPhoto} onChange={(value) => setProfileForm((prev) => ({ ...prev, rcBookFrontPhoto: value }))} />
            <DocUpload label="RC back" value={profileForm.rcBookBackPhoto} onChange={(value) => setProfileForm((prev) => ({ ...prev, rcBookBackPhoto: value }))} />
          </div>
          <Button
            className="mt-2 h-12 rounded-2xl bg-black hover:bg-slate-800"
            disabled={updateProfileMutation.isPending}
            onClick={() => updateProfileMutation.mutate(profileForm)}
          >
            {updateProfileMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
            Save profile details
          </Button>
        </div>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-28">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-amber-600">City Taxi Driver</p>
            <h1 className="text-lg font-black text-slate-950">{activeTab === "trips" ? "Trips" : activeTab === "scheduled" ? "Scheduled" : activeTab === "profile" ? "Profile" : "Dashboard"}</h1>
          </div>
          <div className="flex items-center gap-3 rounded-full bg-slate-100 py-1 pl-3 pr-1">
            <span className={`text-xs font-bold ${isDriverOnline ? "text-green-700" : "text-slate-500"}`}>{isDriverOnline ? "Online" : "Offline"}</span>
            <Switch checked={isDriverOnline} onCheckedChange={(checked) => toggleOnlineMutation.mutate(checked)} disabled={toggleOnlineMutation.isPending} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-4 px-4 py-4">
        <Card className={`rounded-3xl p-4 shadow-sm ${isDriverOnline ? "border-green-200 bg-green-50" : "border-slate-200 bg-white"}`}>
          <div className="flex items-start gap-3">
            <div className={`rounded-2xl p-3 ${isDriverOnline ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>
              <Power className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-bold text-slate-900">{driver.name}</p>
              <p className="text-sm text-slate-500">{locationMessage}</p>
              {driverCurrentLat !== null && driverCurrentLng !== null ? (
                <p className="mt-1 text-xs text-slate-400">{driverCurrentLat.toFixed(5)}, {driverCurrentLng.toFixed(5)}</p>
              ) : null}
            </div>
          </div>
        </Card>

        {activeTab === "home" ? renderHome() : null}
        {activeTab === "dashboard" ? renderDashboard() : null}
        {activeTab === "trips" ? renderTrips() : null}
        {activeTab === "scheduled" ? renderScheduled() : null}
        {activeTab === "profile" ? renderProfile() : null}
      </main>

      {otpModalRideId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm rounded-3xl">
            <div className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Enter Customer OTP</h2>
                <button onClick={() => { setOtpModalRideId(null); setOtpInput(""); }} className="text-slate-500 hover:text-slate-700" aria-label="Close OTP">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="mb-4 text-sm text-slate-600">Ask the customer for their 4 digit start OTP.</p>
              <Input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="0000"
                value={otpInput}
                onChange={(event) => setOtpInput(event.target.value.replace(/\D/g, "").slice(0, 4))}
                className="mb-4 rounded-2xl text-center text-2xl font-black tracking-widest"
              />
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="rounded-2xl" onClick={() => { setOtpModalRideId(null); setOtpInput(""); }}>Cancel</Button>
                <Button
                  className="rounded-2xl bg-black hover:bg-slate-800"
                  disabled={verifyOtpMutation.isPending || otpInput.length !== 4}
                  onClick={() => verifyOtpMutation.mutate({ rideId: otpModalRideId, otp: otpInput })}
                >
                  {verifyOtpMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto max-w-lg px-4 pb-4">
        <div className="grid grid-cols-5 rounded-3xl border border-slate-200 bg-white p-2 shadow-xl">
          {[
            { key: "home", label: "Home", icon: Home },
            { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
            { key: "trips", label: "Trips", icon: ClipboardList, count: requestRides.length },
            { key: "scheduled", label: "Schedule", icon: Clock, count: scheduledRides.length },
            { key: "profile", label: "Profile", icon: User },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key as DriverTab)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl text-[11px] font-bold transition ${
                activeTab === item.key ? "bg-black text-white" : "text-slate-500 hover:bg-slate-50"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
              {item.count ? <span className="absolute right-3 top-2 h-2 w-2 rounded-full bg-amber-400" /> : null}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
