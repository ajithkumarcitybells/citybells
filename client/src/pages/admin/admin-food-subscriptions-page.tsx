import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CalendarDays, CreditCard, Download, Users } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminSubscriberTable, DailyDeliveryList, formatRupees } from "@/components/food/meal-subscription-components";
import type { FoodSubscription } from "@shared/schema";

export default function AdminFoodSubscriptionsPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (paymentStatus) params.set("paymentStatus", paymentStatus);
    return `/api/admin/food/subscriptions${params.toString() ? `?${params}` : ""}`;
  }, [status, paymentStatus]);

  const { data: subscriptions = [], isLoading } = useQuery<FoodSubscription[]>({ queryKey: [query] });
  const { data: delivery = { rows: [] }, isLoading: deliveryLoading } = useQuery<any>({ queryKey: [`/api/admin/food/subscriptions/delivery-list?date=${date}`] });
  const { data: payments = [] } = useQuery<any[]>({ queryKey: ["/api/admin/food/subscriptions/payments"] });

  const updateStatus = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/food/subscriptions/${id}/status`, patch);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [query] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/food/subscriptions/payments"] });
      toast({ title: "Subscription updated", description: "Status and payment notes were saved." });
    },
    onError: (err: any) => toast({ title: "Update failed", description: err?.message || "Could not update subscription.", variant: "destructive" }),
  });

  const exportCsv = () => {
    const rows = delivery.rows || [];
    const header = ["Slot", "Area", "Customer", "Phone", "Plan", "Address", "Allergies", "Notes"];
    const csv = [header, ...rows.map((row: any) => [row.mealSlot, row.area, row.customerName, row.phone, row.planName, row.address, (row.allergies || []).join("; "), row.notes])].map((line: any[]) => line.map((cell: any) => `"${String(cell || "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `meal-delivery-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPaid = payments.filter((p) => p.status === "paid").reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <AdminLayout>
      <div className="space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-orange-500" />
            <div>
              <h1 className="text-2xl font-bold">Food Subscriptions</h1>
              <p className="text-sm text-gray-500">Track subscribers, payments, skips, pauses, and daily delivery lists.</p>
            </div>
          </div>
          <Button variant="outline" onClick={exportCsv}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Metric icon={<Users className="h-5 w-5" />} label="Subscribers" value={subscriptions.length} />
          <Metric icon={<CreditCard className="h-5 w-5" />} label="Paid revenue" value={formatRupees(totalPaid)} />
          <Metric icon={<CalendarDays className="h-5 w-5" />} label="Deliveries today" value={(delivery.rows || []).length} />
        </div>

        <Card className="rounded-xl p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Subscription status"><select className="h-10 rounded-md border px-3" value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All</option><option value="active">Active</option><option value="paused">Paused</option><option value="cancelled">Cancelled</option><option value="expired">Expired</option></select></Field>
            <Field label="Payment"><select className="h-10 rounded-md border px-3" value={paymentStatus} onChange={(e) => setPaymentStatus(e.target.value)}><option value="">All</option><option value="paid">Paid</option><option value="pending">Pending</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></Field>
            <Field label="Delivery list date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          </div>
        </Card>

        {isLoading ? <Skeleton className="h-72 rounded-xl" /> : <AdminSubscriberTable subscriptions={subscriptions} onStatus={(id, patch) => updateStatus.mutate({ id, patch })} />}

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Daily Delivery List</h2>
          {deliveryLoading ? <Skeleton className="h-40 rounded-xl" /> : <DailyDeliveryList rows={delivery.rows || []} />}
        </section>
      </div>
    </AdminLayout>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string | number }) {
  return <Card className="rounded-xl p-4"><div className="flex items-center gap-3 text-orange-600">{icon}<span className="text-sm text-gray-500">{label}</span></div><p className="mt-2 text-2xl font-bold">{value}</p></Card>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}
