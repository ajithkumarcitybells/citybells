import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Star, Clock, MapPin, Calendar, Timer, Wrench } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CityService } from "@shared/schema";

export default function ServiceBookingPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [address, setAddress] = useState(user?.address || "");
  const [notes, setNotes] = useState("");

  const { data: service, isLoading } = useQuery<CityService>({
    queryKey: ["/api/city-services/services", params.id],
  });

  const bookMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/city-services/bookings", {
        serviceId: params.id,
        scheduledDate,
        scheduledTime,
        address,
        totalPrice: service?.price || "0",
        notes: notes || null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/city-services/bookings"] });
      toast({ title: "Booking confirmed!", description: "Your service has been booked successfully." });
      setLocation("/services/bookings");
    },
    onError: (error: Error) => {
      toast({ title: "Booking failed", description: error.message, variant: "destructive" });
    },
  });

  const handleBook = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    if (!scheduledDate || !scheduledTime || !address) {
      toast({ title: "Missing details", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }
    bookMutation.mutate();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-5 w-40" />
          </div>
        </header>
        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="h-48 rounded-md" />
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 rounded-md" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setLocation("/services")} data-testid="button-back">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Service Not Found</h1>
          </div>
        </header>
        <main className="px-4 py-12 text-center max-w-lg mx-auto">
          <Wrench className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">This service could not be found.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const rating = parseFloat(service.rating || "4.0");
  const price = parseFloat(service.price || "0");
  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => window.history.back()} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-service-title">
              {service.name}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Card className="overflow-hidden border-gray-100">
          {service.image && (
            <div className="aspect-video bg-gray-100">
              <img src={service.image} alt={service.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="p-4 space-y-3">
            <div>
              <h2 className="font-bold text-gray-800 text-lg" data-testid="text-service-name">{service.name}</h2>
              {service.description && (
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-medium text-gray-700">{rating.toFixed(1)}</span>
                {(service.reviewCount || 0) > 0 && (
                  <span className="text-xs text-gray-400">({service.reviewCount} reviews)</span>
                )}
              </div>
              {service.duration && (
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-gray-400" />
                  <span className="text-sm text-gray-500">{service.duration}</span>
                </div>
              )}
            </div>
            <div className="text-xl font-bold text-gray-800" data-testid="text-service-price">
              ₹{price.toFixed(0)}
            </div>
          </div>
        </Card>

        <Card className="p-4 border-gray-100 space-y-4">
          <h3 className="font-semibold text-gray-800 text-sm">Schedule Your Service</h3>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" /> Date
            </label>
            <Input
              type="date"
              min={today}
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="bg-white border-gray-200"
              data-testid="input-date"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <Timer className="h-3.5 w-3.5" /> Time
            </label>
            <Input
              type="time"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              className="bg-white border-gray-200"
              data-testid="input-time"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600 flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Service Address
            </label>
            <Textarea
              placeholder="Enter your full address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="bg-white border-gray-200 resize-none"
              rows={3}
              data-testid="input-address"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-gray-600">Special Instructions (Optional)</label>
            <Textarea
              placeholder="Any special requirements..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-white border-gray-200 resize-none"
              rows={2}
              data-testid="input-notes"
            />
          </div>
        </Card>
      </main>

      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4">
          <div>
            <p className="text-xs text-gray-500">Total</p>
            <p className="text-lg font-bold text-gray-800" data-testid="text-total-price">₹{price.toFixed(0)}</p>
          </div>
          <Button
            onClick={handleBook}
            disabled={bookMutation.isPending}
            className="flex-1 max-w-[200px]"
            data-testid="button-confirm-booking"
          >
            {bookMutation.isPending ? "Booking..." : "Confirm Booking"}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
