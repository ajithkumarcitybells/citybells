import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  CancelSubscriptionDialog,
  PauseSubscriptionDialog,
  SkipMealDialog,
  SubscriptionDashboardCard,
} from "@/components/food/meal-subscription-components";
import type { FoodSubscription } from "@shared/schema";

export default function FoodSubscriptionsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [target, setTarget] = useState<FoodSubscription | null>(null);
  const [dialog, setDialog] = useState<"pause" | "cancel" | "skip" | null>(null);

  const { data: subscriptions = [], isLoading } = useQuery<FoodSubscription[]>({ queryKey: ["/api/food/subscriptions"] });

  const action = useMutation({
    mutationFn: async ({ id, type, data }: { id: string; type: string; data?: any }) => {
      const method = type === "skip" ? "POST" : "PATCH";
      const res = await apiRequest(method, `/api/food/subscriptions/${id}/${type}`, data || {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food/subscriptions"] });
      setDialog(null);
      setTarget(null);
      toast({ title: "Subscription updated", description: "Your changes were saved." });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err?.message || "Could not update subscription.", variant: "destructive" }),
  });

  const open = (sub: FoodSubscription, kind: "pause" | "cancel" | "skip") => {
    setTarget(sub);
    setDialog(kind);
  };

  return (
    <div className="min-h-screen bg-orange-50/50 pb-24">
      <header className="sticky top-0 z-40 border-b bg-white">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/food/meal-plans")} aria-label="Back to meal plans">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-lg font-bold">My Meal Subscriptions</h1>
            <p className="text-xs text-gray-500">Pause, skip, cancel, or resume your recurring meals.</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 px-4 py-5">
        {isLoading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-xl" />) : subscriptions.length === 0 ? (
          <Card className="rounded-xl p-8 text-center">
            <p className="font-semibold">No meal subscriptions yet</p>
            <p className="mt-1 text-sm text-gray-500">Browse plans and set your first delivery schedule.</p>
            <Button className="mt-4" onClick={() => setLocation("/food/meal-plans")}>Browse meal plans</Button>
          </Card>
        ) : subscriptions.map((subscription) => (
          <SubscriptionDashboardCard
            key={subscription.id}
            subscription={subscription}
            onPause={() => open(subscription, "pause")}
            onCancel={() => open(subscription, "cancel")}
            onSkip={() => open(subscription, "skip")}
            onResume={() => action.mutate({ id: subscription.id, type: "resume" })}
          />
        ))}
      </main>

      <PauseSubscriptionDialog open={dialog === "pause"} onOpenChange={(open) => !open && setDialog(null)} onSubmit={(data) => target && action.mutate({ id: target.id, type: "pause", data })} />
      <CancelSubscriptionDialog open={dialog === "cancel"} onOpenChange={(open) => !open && setDialog(null)} onSubmit={(data) => target && action.mutate({ id: target.id, type: "cancel", data })} />
      <SkipMealDialog open={dialog === "skip"} onOpenChange={(open) => !open && setDialog(null)} onSubmit={(data) => target && action.mutate({ id: target.id, type: "skip", data })} />

      <BottomNav />
    </div>
  );
}
