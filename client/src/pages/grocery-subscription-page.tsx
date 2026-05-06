import { useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Crown, PackageOpen, Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import {
  DailyEssentialsSubscriptionForm,
  EarlyAccessProductsRail,
  RecurringOrderScheduler,
  RewardsWalletCard,
  SubscriberBadge,
  SubscriberPlanCard,
  SubscriptionBoxCard,
} from "@/components/GrocerySubscription";

export default function GrocerySubscriptionPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: plans = [], isLoading: plansLoading } = useQuery<any[]>({ queryKey: ["/api/grocery/subscription/plans"] });
  const { data: me } = useQuery<any>({ queryKey: ["/api/grocery/subscription/me"], enabled: !!user });
  const { data: rewards } = useQuery<any>({ queryKey: ["/api/grocery/rewards"], enabled: !!user });
  const { data: recurringOrders = [] } = useQuery<any[]>({ queryKey: ["/api/grocery/recurring-orders"], enabled: !!user });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/products"] });

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const subscribeMutation = useMutation({
    mutationFn: async (plan: any) => {
      if (!user) {
        setLocation("/auth");
        throw new Error("Please login to subscribe");
      }
      let paymentId: string | null = null;
      let orderId: string | null = null;
      if ((window as any).Razorpay) {
        const orderRes = await apiRequest("POST", "/api/payment/create-order", { amount: Number(plan.price || 0) });
        const order = await orderRes.json();
        orderId = order.orderId;
        paymentId = await new Promise<string>((resolve, reject) => {
          const razorpay = new (window as any).Razorpay({
            key: order.keyId,
            amount: order.amount,
            currency: order.currency,
            name: "City Bell Grocery",
            description: `${plan.name} Membership`,
            order_id: order.orderId,
            handler: async (response: any) => {
              try {
                await apiRequest("POST", "/api/payment/verify", response);
                resolve(response.razorpay_payment_id);
              } catch (error) {
                reject(error);
              }
            },
            modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
          });
          razorpay.open();
        });
      }
      const res = await apiRequest("POST", "/api/grocery/subscription/subscribe", {
        planId: plan.id,
        paymentId,
        orderId,
        paymentStatus: paymentId || !(window as any).Razorpay ? "paid" : "pending",
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/subscription/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/rewards"] });
      toast({ title: "Membership activated", description: "Your grocery subscriber benefits are now available." });
    },
    onError: (error: Error) => toast({ title: "Subscription failed", description: error.message, variant: "destructive" }),
  });

  const recurringMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/grocery/recurring-orders", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/grocery/recurring-orders"] });
      toast({ title: "Recurring order scheduled" });
    },
    onError: (error: Error) => toast({ title: "Could not schedule order", description: error.message, variant: "destructive" }),
  });

  const pauseRecurring = useMutation({
    mutationFn: (id: string) => apiRequest("PATCH", `/api/grocery/recurring-orders/${id}/pause`, {}),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/grocery/recurring-orders"] }),
  });

  const active = !!me?.active;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      <main className="mx-auto max-w-5xl space-y-6 px-4 py-5">
        <section className="rounded-2xl bg-gradient-to-br from-amber-500 to-emerald-600 p-5 text-white shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
                <Crown className="mr-2 h-4 w-4" />
                Grocery Membership
              </div>
              <h1 className="text-3xl font-bold">Save on every grocery run</h1>
              <p className="mt-2 max-w-2xl text-sm text-white/90">Free delivery, subscriber deals, rewards, priority support, recurring essentials, and early access to limited stock.</p>
            </div>
            {active ? (
              <div className="rounded-xl bg-white p-4 text-gray-900">
                <SubscriberBadge />
                <p className="mt-2 text-sm">Active until {new Date(me.subscription.endDate).toLocaleDateString("en-IN")}</p>
                <Link href="/grocery"><Button className="mt-3 w-full">Shop with Benefits</Button></Link>
              </div>
            ) : null}
          </div>
        </section>

        {active ? (
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-4">
              <EarlyAccessProductsRail products={products} />
              <RecurringOrderScheduler products={products} onSubmit={(data) => recurringMutation.mutate(data)} />
              <DailyEssentialsSubscriptionForm products={products} onSubmit={(data) => recurringMutation.mutate({ ...data, name: "Daily essentials" })} />
              <section className="rounded-xl bg-white p-4 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 font-semibold"><PackageOpen className="h-5 w-5" /> Recurring Orders</h2>
                {recurringOrders.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No recurring orders yet.</p>
                ) : (
                  <div className="space-y-2">
                    {recurringOrders.map(order => (
                      <div key={order.id} className="flex items-center justify-between rounded-lg border p-3">
                        <div>
                          <p className="font-medium">{order.name}</p>
                          <p className="text-xs text-muted-foreground">{order.frequency} • {order.status}</p>
                        </div>
                        <Button size="sm" variant="outline" onClick={() => pauseRecurring.mutate(order.id)}>Pause</Button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
            <div className="space-y-4">
              <RewardsWalletCard rewards={rewards} />
              <section className="space-y-3">
                <h2 className="flex items-center gap-2 font-semibold"><Sparkles className="h-5 w-5 text-purple-600" /> Subscription Boxes</h2>
                {(me?.boxes || []).map((box: any) => <SubscriptionBoxCard key={box.id} box={box} />)}
              </section>
            </div>
          </div>
        ) : (
          <section className="grid gap-4 md:grid-cols-3">
            {plansLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-72 rounded-xl" />) : plans.map(plan => (
              <SubscriberPlanCard key={plan.id} plan={plan} onSubscribe={(p) => subscribeMutation.mutate(p)} loading={subscribeMutation.isPending} />
            ))}
          </section>
        )}
      </main>
      <BottomNav />
    </div>
  );
}
