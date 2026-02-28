import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { ChevronLeft, Star, Clock, MapPin, Calendar, CheckCircle2, Sun, CloudSun, Moon, Wrench } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { CityService } from "@shared/schema";

const TIME_SLOTS = [
  { label: "Morning", icon: Sun, times: ["08:00", "09:00", "10:00", "11:00"] },
  { label: "Afternoon", icon: CloudSun, times: ["12:00", "13:00", "14:00", "15:00"] },
  { label: "Evening", icon: Moon, times: ["16:00", "17:00", "18:00", "19:00"] },
];

function formatTime(t: string) {
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  const ampm = hr >= 12 ? "PM" : "AM";
  const display = hr > 12 ? hr - 12 : hr === 0 ? 12 : hr;
  return `${display}:${m} ${ampm}`;
}

function getNextSevenDays() {
  const days: { date: string; day: string; dayNum: string; month: string; isToday: boolean }[] = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    days.push({
      date: d.toISOString().split("T")[0],
      day: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate().toString(),
      month: d.toLocaleDateString("en-US", { month: "short" }),
      isToday: i === 0,
    });
  }
  return days;
}

export default function ServiceBookingPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [address, setAddress] = useState(user?.address || "");
  const [notes, setNotes] = useState("");

  const dates = getNextSevenDays();

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
      <div className="min-h-screen bg-background pb-20">
        <div className="max-w-lg mx-auto">
          <Skeleton className="h-56 w-full" />
          <div className="px-4 py-4 space-y-4">
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-32 rounded-md" />
            <Skeleton className="h-32 rounded-md" />
          </div>
        </div>
        <BottomNav />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <Button variant="ghost" size="icon" onClick={() => setLocation("/services")} data-testid="button-back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-bold">Service Not Found</h1>
          </div>
        </header>
        <main className="px-4 py-12 text-center max-w-lg mx-auto">
          <Wrench className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">This service could not be found.</p>
        </main>
        <BottomNav />
      </div>
    );
  }

  const rating = parseFloat(service.rating || "4.0");
  const price = parseFloat(service.price || "0");

  const descriptionPoints = service.description
    ? service.description.split(/[.,;]/).map(s => s.trim()).filter(s => s.length > 3)
    : [];

  return (
    <div className="min-h-screen bg-background pb-44">
      <div className="max-w-lg mx-auto">
        <div className="relative">
          {service.image ? (
            <div className="relative h-56 bg-muted">
              <img
                src={service.image}
                alt={service.name}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
            </div>
          ) : (
            <div className="h-56 bg-gradient-to-br from-[#1a0533] to-[#3b1d6e] flex items-center justify-center">
              <Wrench className="h-16 w-16 text-white/30" />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => window.history.back()}
            className="absolute top-3 left-3 bg-black/30 text-white backdrop-blur-sm rounded-full"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="absolute bottom-0 left-0 right-0 p-4 text-white">
            <h1 className="text-xl font-bold" data-testid="text-service-title">{service.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Badge className="bg-green-600 text-white border-green-700 no-default-hover-elevate no-default-active-elevate">
                <Star className="h-3 w-3 fill-white mr-1" />
                {rating.toFixed(1)}
              </Badge>
              {(service.reviewCount || 0) > 0 && (
                <span className="text-sm text-white/80">{service.reviewCount} reviews</span>
              )}
              {service.duration && (
                <span className="flex items-center gap-1 text-sm text-white/80">
                  <Clock className="h-3.5 w-3.5" />
                  {service.duration}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <p className="text-xs text-muted-foreground">Service Price</p>
                <p className="text-2xl font-bold" data-testid="text-service-price">₹{price.toFixed(0)}</p>
              </div>
              {service.duration && (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {service.duration}
                </Badge>
              )}
            </div>
          </Card>

          {descriptionPoints.length > 0 && (
            <Card className="p-4">
              <h3 className="font-semibold text-sm mb-3">Included in this service</h3>
              <div className="space-y-2.5">
                {descriptionPoints.map((point, idx) => (
                  <div key={idx} className="flex items-start gap-2.5">
                    <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{point}</span>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Select Date
            </h3>
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {dates.map((d) => (
                <Button
                  key={d.date}
                  variant={scheduledDate === d.date ? "default" : "outline"}
                  onClick={() => setScheduledDate(d.date)}
                  className={`flex flex-col items-center min-w-[60px] h-auto py-2.5 px-3 shrink-0 ${
                    scheduledDate === d.date
                      ? "bg-[#1a0533] dark:bg-[#7c3aed] text-white border-[#1a0533] dark:border-[#7c3aed]"
                      : ""
                  }`}
                  data-testid={`button-date-${d.date}`}
                >
                  <span className="text-[10px] uppercase font-medium opacity-80">{d.isToday ? "Today" : d.day}</span>
                  <span className="text-lg font-bold leading-tight">{d.dayNum}</span>
                  <span className="text-[10px] uppercase opacity-70">{d.month}</span>
                </Button>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Select Time Slot
            </h3>
            <div className="space-y-4">
              {TIME_SLOTS.map((slot) => (
                <div key={slot.label}>
                  <div className="flex items-center gap-2 mb-2">
                    <slot.icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground">{slot.label}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {slot.times.map((time) => (
                      <Button
                        key={time}
                        variant={scheduledTime === time ? "default" : "outline"}
                        size="sm"
                        onClick={() => setScheduledTime(time)}
                        className={scheduledTime === time
                          ? "bg-[#1a0533] dark:bg-[#7c3aed] text-white border-[#1a0533] dark:border-[#7c3aed]"
                          : ""
                        }
                        data-testid={`button-time-${time}`}
                      >
                        {formatTime(time)}
                      </Button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Service Address
            </h3>
            <Textarea
              placeholder="Enter your full address for the service"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="resize-none"
              rows={3}
              data-testid="input-address"
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Special Instructions (Optional)</h3>
            <Textarea
              placeholder="Any special requirements or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={2}
              data-testid="input-notes"
            />
          </Card>

          <Card className="p-4">
            <h3 className="font-semibold text-sm mb-3">Price Summary</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Service charge</span>
                <span data-testid="text-subtotal">₹{price.toFixed(0)}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Discount</span>
                <span className="text-green-600 dark:text-green-400">-₹0</span>
              </div>
              <div className="border-t pt-2 mt-2 flex items-center justify-between font-semibold">
                <span>Total</span>
                <span data-testid="text-total-price">₹{price.toFixed(0)}</span>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t z-40">
        <div className="max-w-lg mx-auto flex items-center justify-between gap-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">Total Amount</p>
            <p className="text-xl font-bold" data-testid="text-footer-total">₹{price.toFixed(0)}</p>
          </div>
          <Button
            onClick={handleBook}
            disabled={bookMutation.isPending}
            className="flex-1 max-w-[220px] bg-[#1a0533] dark:bg-[#7c3aed] text-white border-[#1a0533] dark:border-[#7c3aed]"
            data-testid="button-confirm-booking"
          >
            {bookMutation.isPending ? "Booking..." : "Proceed to Book"}
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
