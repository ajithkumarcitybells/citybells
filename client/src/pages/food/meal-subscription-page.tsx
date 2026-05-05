import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  MealPlanCard,
  MealPlanFilters,
  MealPreferenceForm,
  SubscriptionPaymentStep,
  SubscriptionSchedulePicker,
  formatRupees,
} from "@/components/food/meal-subscription-components";
import type { FoodMealPlan, FoodSubscription } from "@shared/schema";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const today = new Date().toISOString().slice(0, 10);
const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export default function MealSubscriptionPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [filters, setFilters] = useState<any>({});
  const [selectedPlan, setSelectedPlan] = useState<FoodMealPlan | null>(null);
  const [createdSubscription, setCreatedSubscription] = useState<FoodSubscription | null>(null);
  const [paymentCycle, setPaymentCycle] = useState<"weekly" | "monthly">("weekly");
  const [preferences, setPreferences] = useState({
    dietType: "veg",
    spiceLevel: "medium",
    allergies: [],
    dislikedIngredients: [],
    calorieTarget: undefined,
    cuisinePreference: "",
    deliveryInstructions: "",
  });
  const [schedule, setSchedule] = useState({
    startDate: today,
    endDate: nextMonth,
    daysOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"],
    mealSlots: ["lunch"],
    deliveryWindow: "12:00 PM - 1:00 PM",
    addressText: "",
  });

  const query = useMemo(() => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, String(value));
    });
    return params.toString() ? `/api/food/meal-plans?${params.toString()}` : "/api/food/meal-plans";
  }, [filters]);

  const { data: plans = [], isLoading, error } = useQuery<FoodMealPlan[]>({ queryKey: [query] });

  const createSubscription = useMutation({
    mutationFn: async () => {
      if (!selectedPlan) throw new Error("Select a meal plan first");
      const res = await apiRequest("POST", "/api/food/subscriptions", {
        planId: selectedPlan.id,
        paymentCycle,
        preferences,
        schedule,
      });
      return res.json();
    },
    onSuccess: (subscription) => {
      setCreatedSubscription(subscription);
      queryClient.invalidateQueries({ queryKey: ["/api/food/subscriptions"] });
      toast({ title: "Subscription created", description: "Complete payment to activate prepaid delivery." });
    },
    onError: (err: any) => toast({ title: "Subscription failed", description: err?.message || "Could not create subscription.", variant: "destructive" }),
  });

  const createOrder = useMutation({
    mutationFn: async () => {
      if (!createdSubscription) throw new Error("Create subscription first");
      const res = await apiRequest("POST", `/api/food/subscriptions/${createdSubscription.id}/payment/create-order`);
      return res.json();
    },
    onSuccess: (order) => {
      if (!window.Razorpay) {
        toast({ title: "Payment order created", description: `Razorpay order ${order.orderId} is ready. Load Razorpay checkout to pay online.` });
        return;
      }
      const checkout = new window.Razorpay({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        name: order.name,
        description: order.description,
        order_id: order.orderId,
        handler: async (response: any) => {
          const verify = await apiRequest("POST", `/api/food/subscriptions/${createdSubscription!.id}/payment/verify`, {
            orderId: response.razorpay_order_id,
            paymentId: response.razorpay_payment_id,
            signature: response.razorpay_signature,
          });
          const data = await verify.json();
          setCreatedSubscription(data.subscription);
          toast({ title: "Payment verified", description: "Your meal subscription is paid." });
        },
      });
      checkout.open();
    },
    onError: (err: any) => toast({ title: "Payment failed", description: err?.message || "Could not create payment order.", variant: "destructive" }),
  });

  const closeSetup = () => {
    setSelectedPlan(null);
    setCreatedSubscription(null);
  };

  return (
    <div className="min-h-screen bg-orange-50/50 pb-24">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/food")} aria-label="Back to food">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold">Meal Subscription Plans</h1>
            <p className="text-xs text-gray-500">Weekly and monthly recurring meals with preferences, schedule, and prepaid billing.</p>
          </div>
          <Button variant="outline" onClick={() => setLocation("/food/subscriptions")}><CalendarDays className="mr-2 h-4 w-4" />My plans</Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-5">
        <Card className="rounded-xl bg-white p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold">Subscribe to fresh meals</h2>
              <p className="text-sm text-gray-500">Choose breakfast, lunch, dinner, full-day, weekly, or monthly plans.</p>
            </div>
            <div className="text-right text-sm text-gray-500">Starting from <span className="text-xl font-bold text-gray-900">{formatRupees(Math.min(...plans.map((p) => Number(p.pricePerDay || 0)).filter(Boolean), 129))}</span>/day</div>
          </div>
        </Card>

        <MealPlanFilters filters={filters} onChange={setFilters} />

        {error && <Card className="rounded-xl p-4 text-red-600">Failed to load meal plans.</Card>}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-80 rounded-xl" />)}</div>
        ) : plans.length === 0 ? (
          <Card className="rounded-xl p-8 text-center text-gray-500">No meal plans match these filters.</Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => <MealPlanCard key={plan.id} plan={plan} onSubscribe={setSelectedPlan} />)}
          </div>
        )}
      </main>

      <Dialog open={Boolean(selectedPlan)} onOpenChange={(open) => !open && closeSetup()}>
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{createdSubscription ? "Complete payment" : `Subscribe to ${selectedPlan?.name || "meal plan"}`}</DialogTitle>
          </DialogHeader>
          {!createdSubscription ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-medium">Billing cycle<select className="h-10 rounded-md border px-3" value={paymentCycle} onChange={(e) => setPaymentCycle(e.target.value as "weekly" | "monthly")}><option value="weekly">Weekly prepaid</option><option value="monthly">Monthly prepaid</option></select></label>
                <div className="rounded-lg bg-orange-50 p-3 text-sm">Amount: <span className="font-bold">{formatRupees(paymentCycle === "monthly" ? selectedPlan?.pricePerMonth : selectedPlan?.pricePerWeek)}</span></div>
              </div>
              <MealPreferenceForm value={preferences} onChange={setPreferences} />
              <SubscriptionSchedulePicker value={schedule} onChange={setSchedule} />
              <Button className="w-full" onClick={() => createSubscription.mutate()} disabled={createSubscription.isPending}>{createSubscription.isPending ? "Creating..." : "Create subscription"}</Button>
            </div>
          ) : (
            <SubscriptionPaymentStep subscription={createdSubscription} onCreateOrder={() => createOrder.mutate()} isLoading={createOrder.isPending} />
          )}
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
}
