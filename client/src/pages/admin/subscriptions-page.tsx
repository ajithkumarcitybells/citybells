import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Crown, Gift, PackageOpen, Plus, RotateCcw, Sparkles, Users } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Product } from "@shared/schema";
import { SubscriberBadge, SubscriberDealBadge } from "@/components/GrocerySubscription";

function AdminSubscriptionPlanForm() {
  const { toast } = useToast();
  const createPlan = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/subscription-plans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/subscription-plans"] });
      toast({ title: "Subscription plan saved" });
    },
  });

  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Create Plan</CardTitle></CardHeader>
      <CardContent>
        <form
          className="grid gap-3 md:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            createPlan.mutate({
              name: form.get("name"),
              description: form.get("description"),
              price: form.get("price"),
              durationDays: Number(form.get("durationDays") || 30),
              benefits: String(form.get("benefits") || "").split(",").map(x => x.trim()).filter(Boolean),
              cashbackPercent: Number(form.get("cashbackPercent") || 0),
              rewardMultiplier: Number(form.get("rewardMultiplier") || 1),
              priorityDelivery: form.get("priorityDelivery") === "on",
              isActive: true,
            });
            event.currentTarget.reset();
          }}
        >
          <div><Label>Name</Label><Input name="name" required /></div>
          <div><Label>Price</Label><Input name="price" type="number" required /></div>
          <div><Label>Duration Days</Label><Input name="durationDays" type="number" defaultValue="30" /></div>
          <div><Label>Cashback %</Label><Input name="cashbackPercent" type="number" defaultValue="1" /></div>
          <div><Label>Reward Multiplier</Label><Input name="rewardMultiplier" type="number" defaultValue="1" /></div>
          <label className="flex items-center gap-2 pt-6"><Switch name="priorityDelivery" /> Priority delivery</label>
          <div className="md:col-span-2"><Label>Description</Label><Textarea name="description" /></div>
          <div className="md:col-span-2"><Label>Benefits</Label><Input name="benefits" placeholder="Free delivery, Priority support" /></div>
          <Button className="md:col-span-2" disabled={createPlan.isPending}>Save Plan</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function AdminSubscribersTable({ subscribers }: { subscribers: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Subscribers</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {subscribers.length === 0 ? <p className="text-sm text-muted-foreground">No subscribers yet.</p> : subscribers.map(sub => (
          <div key={sub.id} className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <p className="font-medium">{sub.planName}</p>
              <p className="text-xs text-muted-foreground">{sub.userId} • expires {new Date(sub.endDate).toLocaleDateString("en-IN")}</p>
            </div>
            <SubscriberBadge compact />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AdminRecurringOrdersTable({ orders }: { orders: any[] }) {
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><RotateCcw className="h-5 w-5" /> Recurring Orders</CardTitle></CardHeader>
      <CardContent className="space-y-2">
        {orders.length === 0 ? <p className="text-sm text-muted-foreground">No recurring orders.</p> : orders.map(order => (
          <div key={order.id} className="rounded-lg border p-3">
            <p className="font-medium">{order.name}</p>
            <p className="text-xs text-muted-foreground">{order.frequency} • {order.status} • {order.userId}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AdminSubscriberDealToggle({ product }: { product: Product }) {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${product.id}/subscriber-deal`, {
        subscriberDeal: enabled,
        subscriberDiscountPercent: enabled ? ((product as any).subscriberDiscountPercent || 10) : 0,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "Subscriber deal updated" });
    },
  });
  return <Switch checked={!!(product as any).subscriberDeal} onCheckedChange={(v) => mutation.mutate(!!v)} />;
}

function AdminSubscriptionBoxForm() {
  const { toast } = useToast();
  const mutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/subscription-boxes", data);
      return res.json();
    },
    onSuccess: () => toast({ title: "Subscription box created" }),
  });
  return (
    <Card>
      <CardHeader><CardTitle className="flex items-center gap-2"><PackageOpen className="h-5 w-5" /> Subscription Box</CardTitle></CardHeader>
      <CardContent>
        <form className="grid gap-3 md:grid-cols-2" onSubmit={(event) => {
          event.preventDefault();
          const form = new FormData(event.currentTarget);
          mutation.mutate({ name: form.get("name"), description: form.get("description"), price: form.get("price"), cadence: form.get("cadence") || "weekly", isActive: true });
          event.currentTarget.reset();
        }}>
          <div><Label>Name</Label><Input name="name" required /></div>
          <div><Label>Price</Label><Input name="price" type="number" required /></div>
          <div><Label>Cadence</Label><Input name="cadence" defaultValue="weekly" /></div>
          <div><Label>Description</Label><Input name="description" /></div>
          <Button className="md:col-span-2">Create Box</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function AdminSubscriptionsPage() {
  const [tab, setTab] = useState("overview");
  const { data: plans = [] } = useQuery<any[]>({ queryKey: ["/api/admin/subscription-plans"] });
  const { data: subscribers = [] } = useQuery<any[]>({ queryKey: ["/api/admin/subscribers"] });
  const { data: recurringOrders = [] } = useQuery<any[]>({ queryKey: ["/api/admin/recurring-orders"] });
  const { data: products = [] } = useQuery<Product[]>({ queryKey: ["/api/admin/products"] });

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grocery Subscriptions</h1>
          <p className="text-muted-foreground">Plans, subscriber deals, recurring orders, boxes, rewards, and early access.</p>
        </div>
        <SubscriberBadge />
      </div>
      <div className="mb-5 flex flex-wrap gap-2">
        {["overview", "plans", "deals", "recurring", "boxes"].map(item => (
          <Button key={item} variant={tab === item ? "default" : "outline"} onClick={() => setTab(item)} className="capitalize">{item}</Button>
        ))}
      </div>
      {tab === "overview" && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-5"><Crown className="mb-2 h-6 w-6 text-amber-600" /><p className="text-2xl font-bold">{plans.length}</p><p className="text-sm text-muted-foreground">Plans</p></CardContent></Card>
          <Card><CardContent className="p-5"><Users className="mb-2 h-6 w-6 text-emerald-600" /><p className="text-2xl font-bold">{subscribers.length}</p><p className="text-sm text-muted-foreground">Subscribers</p></CardContent></Card>
          <Card><CardContent className="p-5"><RotateCcw className="mb-2 h-6 w-6 text-blue-600" /><p className="text-2xl font-bold">{recurringOrders.length}</p><p className="text-sm text-muted-foreground">Recurring Orders</p></CardContent></Card>
          <AdminSubscribersTable subscribers={subscribers} />
          <AdminRecurringOrdersTable orders={recurringOrders} />
        </div>
      )}
      {tab === "plans" && <div className="grid gap-4 lg:grid-cols-2"><AdminSubscriptionPlanForm />{plans.map(plan => <Card key={plan.id}><CardContent className="p-4"><p className="font-semibold">{plan.name}</p><p className="text-sm text-muted-foreground">Rs {plan.price} • {plan.durationDays} days</p></CardContent></Card>)}</div>}
      {tab === "deals" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5" /> Subscriber Deals</CardTitle></CardHeader><CardContent className="grid gap-2 md:grid-cols-2">{products.slice(0, 60).map(product => <div key={product.id} className="flex items-center justify-between rounded-lg border p-3"><div><p className="font-medium">{product.name}</p>{(product as any).subscriberDeal ? <SubscriberDealBadge discount={(product as any).subscriberDiscountPercent} /> : null}</div><AdminSubscriberDealToggle product={product} /></div>)}</CardContent></Card>}
      {tab === "recurring" && <AdminRecurringOrdersTable orders={recurringOrders} />}
      {tab === "boxes" && <AdminSubscriptionBoxForm />}
    </AdminLayout>
  );
}

export { AdminSubscriptionPlanForm, AdminSubscribersTable, AdminRecurringOrdersTable, AdminSubscriberDealToggle, AdminSubscriptionBoxForm };
