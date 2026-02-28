import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  Briefcase,
  Clock,
  CheckCircle,
  DollarSign,
  Star,
  Power,
  User,
  Calendar,
  MapPin,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CityServiceProvider, CityServiceBooking } from "@shared/schema";

type DashboardTab = "overview" | "active" | "history" | "profile";

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  provider_assigned: "bg-indigo-100 text-indigo-800 border-indigo-200",
  in_progress: "bg-orange-100 text-orange-800 border-orange-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  provider_assigned: "Assigned",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: provider, isLoading: loadingProvider } = useQuery<CityServiceProvider>({
    queryKey: ["/api/city-services/provider/profile"],
    enabled: !!user,
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<CityServiceBooking[]>({
    queryKey: ["/api/city-services/provider/bookings"],
    enabled: !!user && !!provider,
  });

  const toggleAvailability = useMutation({
    mutationFn: async (isAvailable: boolean) => {
      const res = await apiRequest("PATCH", "/api/city-services/provider/availability", { isAvailable });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-services/provider/profile"] });
      toast({ title: "Status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ bookingId, status }: { bookingId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/city-services/provider/bookings/${bookingId}/status`, { status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-services/provider/bookings"] });
      toast({ title: "Booking updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const updateProfile = useMutation({
    mutationFn: async (data: Partial<CityServiceProvider>) => {
      const res = await apiRequest("PATCH", "/api/city-services/provider/profile", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-services/provider/profile"] });
      toast({ title: "Profile updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  if (loadingProvider) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-md" />
        <Skeleton className="h-32 rounded-md" />
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8">
          <Briefcase className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Provider profile not found</p>
          <p className="text-gray-400 text-sm mt-1">Contact admin to set up your profile</p>
          <Button variant="outline" className="mt-4" onClick={() => setLocation("/")} data-testid="button-go-home">
            Go Home
          </Button>
        </div>
      </div>
    );
  }

  const activeBookings = bookings.filter(
    (b) => !["completed", "cancelled"].includes(b.status || "")
  );
  const completedBookings = bookings.filter((b) => b.status === "completed");
  const todayStr = new Date().toISOString().split("T")[0];
  const todayBookings = bookings.filter((b) => b.scheduledDate === todayStr && b.status !== "cancelled");
  const totalEarnings = completedBookings.reduce((sum, b) => sum + parseFloat(b.totalPrice || "0"), 0);
  const rating = parseFloat(provider.rating || "4.5");

  const tabs: { key: DashboardTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "active", label: "Active" },
    { key: "history", label: "History" },
    { key: "profile", label: "Profile" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/profile")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-dashboard-title">
              Provider Dashboard
            </h1>
            <p className="text-xs text-gray-500">{provider.name}</p>
          </div>
          <div className="flex items-center gap-2">
            <Power className={`h-4 w-4 ${provider.isAvailable ? "text-green-500" : "text-gray-400"}`} />
            <Switch
              checked={provider.isAvailable ?? false}
              onCheckedChange={(v) => toggleAvailability.mutate(v)}
              data-testid="switch-availability"
            />
          </div>
        </div>
      </header>

      <div className="sticky top-[57px] z-40 bg-white border-b border-gray-100">
        <div className="flex max-w-lg mx-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 py-2.5 text-xs font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "text-blue-600 border-blue-600"
                  : "text-gray-500 border-transparent"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
              {tab.key === "active" && activeBookings.length > 0 && (
                <Badge className="ml-1 bg-blue-100 text-blue-700 border-blue-200 text-[10px] no-default-active-elevate">
                  {activeBookings.length}
                </Badge>
              )}
            </button>
          ))}
        </div>
      </div>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        {activeTab === "overview" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Card className="p-4 border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-gray-500">Today</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-today-count">
                  {todayBookings.length}
                </p>
                <p className="text-xs text-gray-400">bookings</p>
              </Card>
              <Card className="p-4 border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-xs text-gray-500">Completed</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-completed-count">
                  {completedBookings.length}
                </p>
                <p className="text-xs text-gray-400">total</p>
              </Card>
              <Card className="p-4 border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-gray-500">Earnings</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-total-earnings">
                  ₹{totalEarnings.toFixed(0)}
                </p>
                <p className="text-xs text-gray-400">total</p>
              </Card>
              <Card className="p-4 border-gray-100">
                <div className="flex items-center gap-2 mb-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-gray-500">Rating</span>
                </div>
                <p className="text-2xl font-bold text-gray-800" data-testid="text-rating">
                  {rating.toFixed(1)}
                </p>
                <p className="text-xs text-gray-400">average</p>
              </Card>
            </div>

            {activeBookings.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-800 text-sm mb-2">Upcoming</h3>
                {activeBookings.slice(0, 3).map((b) => (
                  <BookingCard key={b.id} booking={b} onUpdateStatus={updateStatus.mutate} isPending={updateStatus.isPending} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "active" && (
          <>
            {loadingBookings ? (
              <div className="space-y-3">
                {Array(3).fill(0).map((_, i) => (
                  <Card key={i} className="p-4"><Skeleton className="h-20" /></Card>
                ))}
              </div>
            ) : activeBookings.length === 0 ? (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium" data-testid="text-no-active">No active bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activeBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} onUpdateStatus={updateStatus.mutate} isPending={updateStatus.isPending} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "history" && (
          <>
            {completedBookings.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium" data-testid="text-no-history">No completed bookings</p>
              </div>
            ) : (
              <div className="space-y-3">
                {completedBookings.map((b) => (
                  <BookingCard key={b.id} booking={b} onUpdateStatus={updateStatus.mutate} isPending={updateStatus.isPending} />
                ))}
              </div>
            )}
          </>
        )}

        {activeTab === "profile" && (
          <ProviderProfile provider={provider} onUpdate={updateProfile.mutate} isPending={updateProfile.isPending} />
        )}
      </main>
    </div>
  );
}

function BookingCard({
  booking,
  onUpdateStatus,
  isPending,
}: {
  booking: CityServiceBooking;
  onUpdateStatus: (args: { bookingId: string; status: string }) => void;
  isPending: boolean;
}) {
  const status = booking.status || "pending";
  const price = parseFloat(booking.totalPrice || "0");

  const nextStatus: Record<string, { label: string; status: string } | null> = {
    provider_assigned: { label: "Start Service", status: "in_progress" },
    confirmed: { label: "Start Service", status: "in_progress" },
    in_progress: { label: "Mark Complete", status: "completed" },
  };

  const action = nextStatus[status] || null;

  return (
    <Card className="p-4 border-gray-100 space-y-3" data-testid={`card-provider-booking-${booking.id}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 text-sm">
            #{booking.id.slice(-6).toUpperCase()}
          </p>
        </div>
        <Badge
          className={`text-xs ${statusColors[status] || "bg-gray-100 text-gray-800"}`}
          data-testid={`badge-provider-status-${booking.id}`}
        >
          {statusLabels[status] || status}
        </Badge>
      </div>

      <div className="space-y-1.5 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5 text-gray-400" />
          <span>{booking.scheduledDate} at {booking.scheduledTime}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-gray-400" />
          <span className="line-clamp-1">{booking.address}</span>
        </div>
        {booking.notes && (
          <p className="text-gray-400 italic">Notes: {booking.notes}</p>
        )}
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-gray-50">
        <p className="font-bold text-gray-800">₹{price.toFixed(0)}</p>
        {action && (
          <Button
            size="sm"
            onClick={() => onUpdateStatus({ bookingId: booking.id, status: action.status })}
            disabled={isPending}
            data-testid={`button-action-${booking.id}`}
          >
            {action.label}
          </Button>
        )}
      </div>
    </Card>
  );
}

function ProviderProfile({
  provider,
  onUpdate,
  isPending,
}: {
  provider: CityServiceProvider;
  onUpdate: (data: Partial<CityServiceProvider>) => void;
  isPending: boolean;
}) {
  const [name, setName] = useState(provider.name);
  const [phone, setPhone] = useState(provider.phone || "");
  const [experience, setExperience] = useState(provider.experience || "");
  const [agencyName, setAgencyName] = useState(provider.agencyName || "");
  const [specializations, setSpecializations] = useState(
    ((provider.specializations as string[]) || []).join(", ")
  );

  const handleSave = () => {
    onUpdate({
      name,
      phone: phone || null,
      experience: experience || null,
      agencyName: agencyName || null,
      specializations: specializations
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    } as any);
  };

  return (
    <Card className="p-4 border-gray-100 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="h-6 w-6 text-blue-500" />
        </div>
        <div>
          <h3 className="font-semibold text-gray-800" data-testid="text-provider-name">{provider.name}</h3>
          <p className="text-xs text-gray-500">
            {provider.isAvailable ? "Available" : "Unavailable"}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} data-testid="input-provider-name" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Phone</label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-provider-phone" />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Experience</label>
          <Input
            value={experience}
            onChange={(e) => setExperience(e.target.value)}
            placeholder="e.g. 5 years"
            data-testid="input-provider-experience"
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs font-medium text-gray-600">Specializations (comma separated)</label>
          <Input
            value={specializations}
            onChange={(e) => setSpecializations(e.target.value)}
            placeholder="e.g. Plumbing, Electrical, Cleaning"
            data-testid="input-provider-specializations"
          />
        </div>
        {provider.isAgency && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Agency Name</label>
            <Input value={agencyName} onChange={(e) => setAgencyName(e.target.value)} data-testid="input-agency-name" />
          </div>
        )}
      </div>

      <Button onClick={handleSave} disabled={isPending} className="w-full" data-testid="button-save-profile">
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </Card>
  );
}
