import { useState } from "react";
import type { ReactNode } from "react";
import { CalendarDays, IndianRupee, Pause, Play, XCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { FoodMealPlan, FoodSubscription } from "@shared/schema";

const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const slots = ["breakfast", "lunch", "dinner"];

export function formatRupees(value: number | string | undefined) {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}

export function MealPlanCard({ plan, onSubscribe }: { plan: FoodMealPlan; onSubscribe: (plan: FoodMealPlan) => void }) {
  return (
    <Card className="overflow-hidden rounded-xl border bg-white">
      <img src={plan.image || "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80"} alt={plan.name} className="h-44 w-full object-cover" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">{plan.title || plan.name}</h3>
            <p className="text-sm text-gray-500">{plan.cuisine} • {plan.calories || 0} kcal</p>
          </div>
          <Badge variant={plan.dietType === "non_veg" ? "destructive" : "secondary"}>{plan.dietType.replace("_", " ")}</Badge>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="outline">{plan.mealType.replace("_", " ")}</Badge>
          <Badge variant="outline">Rating {plan.rating || 4.5}</Badge>
          {(plan.includedMeals || []).slice(0, 3).map((meal) => <Badge key={meal} variant="outline">{meal}</Badge>)}
        </div>
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div><p className="text-gray-500">Day</p><p className="font-semibold">{formatRupees(plan.pricePerDay)}</p></div>
          <div><p className="text-gray-500">Week</p><p className="font-semibold">{formatRupees(plan.pricePerWeek)}</p></div>
          <div><p className="text-gray-500">Month</p><p className="font-semibold">{formatRupees(plan.pricePerMonth)}</p></div>
        </div>
        <Button className="w-full" onClick={() => onSubscribe(plan)} aria-label={`Subscribe to ${plan.name}`}>Subscribe</Button>
      </div>
    </Card>
  );
}

export function MealPlanFilters({ filters, onChange }: { filters: any; onChange: (filters: any) => void }) {
  const update = (key: string, value: string) => onChange({ ...filters, [key]: value || undefined });
  return (
    <Card className="rounded-xl p-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        <Field label="Meal type"><select className="h-10 rounded-md border px-3" value={filters.mealType || ""} onChange={(e) => update("mealType", e.target.value)}><option value="">All</option><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="full_day">Full day</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
        <Field label="Diet"><select className="h-10 rounded-md border px-3" value={filters.dietType || ""} onChange={(e) => update("dietType", e.target.value)}><option value="">All</option><option value="veg">Veg</option><option value="egg">Egg</option><option value="non_veg">Non veg</option></select></Field>
        <Field label="Cuisine"><Input value={filters.cuisine || ""} onChange={(e) => update("cuisine", e.target.value)} placeholder="Indian" /></Field>
        <Field label="Budget/day"><Input type="number" value={filters.maxBudget || ""} onChange={(e) => update("maxBudget", e.target.value)} /></Field>
        <Field label="Calories"><Input type="number" value={filters.maxCalories || ""} onChange={(e) => update("maxCalories", e.target.value)} /></Field>
        <Field label="Duration"><select className="h-10 rounded-md border px-3" value={filters.duration || ""} onChange={(e) => update("duration", e.target.value)}><option value="">Any</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
      </div>
    </Card>
  );
}

export function MealPreferenceForm({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const update = (key: string, next: any) => onChange({ ...value, [key]: next });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Diet preference"><select className="h-10 rounded-md border px-3" value={value.dietType} onChange={(e) => update("dietType", e.target.value)}><option value="veg">Veg</option><option value="egg">Egg</option><option value="non_veg">Non veg</option></select></Field>
      <Field label="Spice level"><select className="h-10 rounded-md border px-3" value={value.spiceLevel} onChange={(e) => update("spiceLevel", e.target.value)}><option value="mild">Mild</option><option value="medium">Medium</option><option value="hot">Hot</option></select></Field>
      <Field label="Allergies"><Input value={(value.allergies || []).join(", ")} onChange={(e) => update("allergies", splitList(e.target.value))} placeholder="Peanuts, dairy" /></Field>
      <Field label="Disliked ingredients"><Input value={(value.dislikedIngredients || []).join(", ")} onChange={(e) => update("dislikedIngredients", splitList(e.target.value))} placeholder="Mushroom, onion" /></Field>
      <Field label="Calorie target"><Input type="number" value={value.calorieTarget || ""} onChange={(e) => update("calorieTarget", e.target.value ? Number(e.target.value) : undefined)} /></Field>
      <Field label="Cuisine preference"><Input value={value.cuisinePreference || ""} onChange={(e) => update("cuisinePreference", e.target.value)} /></Field>
      <div className="sm:col-span-2"><Field label="Delivery instructions"><Textarea value={value.deliveryInstructions || ""} onChange={(e) => update("deliveryInstructions", e.target.value)} /></Field></div>
    </div>
  );
}

export function SubscriptionSchedulePicker({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const update = (key: string, next: any) => onChange({ ...value, [key]: next });
  const toggle = (key: string, item: string) => {
    const current = new Set(value[key] || []);
    current.has(item) ? current.delete(item) : current.add(item);
    update(key, Array.from(current));
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Start date"><Input type="date" value={value.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field>
        <Field label="End date"><Input type="date" value={value.endDate} onChange={(e) => update("endDate", e.target.value)} /></Field>
        <Field label="Delivery window"><Input value={value.deliveryWindow} onChange={(e) => update("deliveryWindow", e.target.value)} placeholder="8:00 AM - 9:00 AM" /></Field>
        <Field label="Address"><Input value={value.addressText} onChange={(e) => update("addressText", e.target.value)} placeholder="House, street, area" /></Field>
      </div>
      <CheckboxGroup label="Days of week" items={weekdays} selected={value.daysOfWeek || []} onToggle={(item) => toggle("daysOfWeek", item)} />
      <CheckboxGroup label="Meal slots" items={slots} selected={value.mealSlots || []} onToggle={(item) => toggle("mealSlots", item)} />
    </div>
  );
}

export function SubscriptionPaymentStep({ subscription, onCreateOrder, isLoading }: { subscription: FoodSubscription | null; onCreateOrder: () => void; isLoading?: boolean }) {
  if (!subscription) return null;
  return (
    <Card className="rounded-xl p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Subscription amount</p>
          <p className="text-2xl font-bold">{formatRupees(subscription.amount)}</p>
          <p className="text-sm text-gray-500">Payment status: {subscription.paymentStatus}</p>
        </div>
        <Button onClick={onCreateOrder} disabled={isLoading || subscription.paymentStatus === "paid"}><IndianRupee className="mr-2 h-4 w-4" />Pay online</Button>
      </div>
    </Card>
  );
}

export function SubscriptionDashboardCard({ subscription, onPause, onResume, onCancel, onSkip }: { subscription: FoodSubscription; onPause: () => void; onResume: () => void; onCancel: () => void; onSkip: () => void }) {
  return (
    <Card className="rounded-xl p-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold">{subscription.planSnapshot?.name || "Meal subscription"}</h3>
            <StatusBadge status={subscription.status} />
            {subscription.paymentStatus !== "paid" && <Badge variant="destructive">Payment Due</Badge>}
          </div>
          <p className="text-sm text-gray-500">Next delivery: {subscription.nextDeliveryDate || "Not scheduled"} • Remaining days: {subscription.remainingDays}</p>
          <p className="text-sm text-gray-500">{subscription.schedule?.mealSlots?.join(", ")} at {subscription.schedule?.deliveryWindow}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {subscription.status === "paused" ? <Button size="sm" onClick={onResume}><Play className="mr-1 h-4 w-4" />Resume</Button> : <Button size="sm" variant="outline" onClick={onPause}><Pause className="mr-1 h-4 w-4" />Pause</Button>}
          <Button size="sm" variant="outline" onClick={onSkip}><CalendarDays className="mr-1 h-4 w-4" />Skip</Button>
          <Button size="sm" variant="destructive" onClick={onCancel}><XCircle className="mr-1 h-4 w-4" />Cancel</Button>
        </div>
      </div>
      <SubscriptionCalendar subscription={subscription} />
    </Card>
  );
}

export function SubscriptionCalendar({ subscription }: { subscription: FoodSubscription }) {
  const start = subscription.schedule?.startDate;
  const end = subscription.schedule?.endDate;
  return <div className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-900">Meal calendar: {start} to {end} • {subscription.schedule?.daysOfWeek?.join(", ")}</div>;
}

export function PauseSubscriptionDialog({ open, onOpenChange, onSubmit }: DialogProps) {
  const [form, setForm] = useState({ startDate: "", endDate: "", reason: "" });
  return <ActionDialog title="Pause subscription" open={open} onOpenChange={onOpenChange} onSubmit={() => onSubmit(form)} submitLabel="Pause"><DateReasonForm form={form} setForm={setForm} /></ActionDialog>;
}

export function CancelSubscriptionDialog({ open, onOpenChange, onSubmit }: DialogProps) {
  const [reason, setReason] = useState("");
  return <ActionDialog title="Cancel subscription" open={open} onOpenChange={onOpenChange} onSubmit={() => onSubmit({ reason })} submitLabel="Cancel"><Field label="Reason"><Textarea value={reason} onChange={(e) => setReason(e.target.value)} /></Field><p className="text-sm text-gray-500">Refund or credit note can be reviewed by admin after cancellation.</p></ActionDialog>;
}

export function SkipMealDialog({ open, onOpenChange, onSubmit }: DialogProps) {
  const [form, setForm] = useState({ date: "", mealSlot: "lunch", reason: "" });
  return <ActionDialog title="Skip one meal" open={open} onOpenChange={onOpenChange} onSubmit={() => onSubmit(form)} submitLabel="Skip meal"><DateReasonForm form={form} setForm={setForm} includeSlot /></ActionDialog>;
}

export function AdminMealPlanForm({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const update = (key: string, next: any) => onChange({ ...value, [key]: next });
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Name"><Input value={value.name || ""} onChange={(e) => update("name", e.target.value)} /></Field>
      <Field label="Image URL"><Input value={value.image || ""} onChange={(e) => update("image", e.target.value)} /></Field>
      <Field label="Meal type"><select className="h-10 rounded-md border px-3" value={value.mealType || "lunch"} onChange={(e) => update("mealType", e.target.value)}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option><option value="full_day">Full day</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
      <Field label="Diet"><select className="h-10 rounded-md border px-3" value={value.dietType || "veg"} onChange={(e) => update("dietType", e.target.value)}><option value="veg">Veg</option><option value="egg">Egg</option><option value="non_veg">Non veg</option></select></Field>
      <Field label="Cuisine"><Input value={value.cuisine || ""} onChange={(e) => update("cuisine", e.target.value)} /></Field>
      <Field label="Calories"><Input type="number" value={value.calories || ""} onChange={(e) => update("calories", Number(e.target.value || 0))} /></Field>
      <Field label="Price/day"><Input type="number" value={value.pricePerDay || ""} onChange={(e) => update("pricePerDay", Number(e.target.value || 0))} /></Field>
      <Field label="Price/week"><Input type="number" value={value.pricePerWeek || ""} onChange={(e) => update("pricePerWeek", Number(e.target.value || 0))} /></Field>
      <Field label="Price/month"><Input type="number" value={value.pricePerMonth || ""} onChange={(e) => update("pricePerMonth", Number(e.target.value || 0))} /></Field>
      <Field label="Duration"><select className="h-10 rounded-md border px-3" value={value.duration || "weekly"} onChange={(e) => update("duration", e.target.value)}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></Field>
      <Field label="Included meals"><Input value={(value.includedMeals || []).join(", ")} onChange={(e) => update("includedMeals", splitList(e.target.value))} /></Field>
      <Field label="Dietary tags"><Input value={(value.dietaryTags || []).join(", ")} onChange={(e) => update("dietaryTags", splitList(e.target.value))} /></Field>
      <div className="sm:col-span-2"><Field label="Description"><Textarea value={value.description || ""} onChange={(e) => update("description", e.target.value)} /></Field></div>
      <label className="flex items-center gap-2 text-sm"><Checkbox checked={value.isActive !== false} onCheckedChange={(checked) => update("isActive", Boolean(checked))} /> Active plan</label>
    </div>
  );
}

export function AdminSubscriberTable({ subscriptions, onStatus }: { subscriptions: FoodSubscription[]; onStatus: (id: string, patch: any) => void }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-white">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 text-left"><tr><th className="p-3">Subscriber</th><th className="p-3">Plan</th><th className="p-3">Schedule</th><th className="p-3">Status</th><th className="p-3">Payment</th><th className="p-3">Actions</th></tr></thead>
        <tbody>{subscriptions.map((sub: any) => <tr key={sub.id} className="border-t"><td className="p-3">{sub.customerName}<br /><span className="text-gray-500">{sub.phone}</span></td><td className="p-3">{sub.planSnapshot?.name}</td><td className="p-3">{sub.schedule?.mealSlots?.join(", ")}<br /><span className="text-gray-500">{sub.nextDeliveryDate || "No next date"}</span></td><td className="p-3"><StatusBadge status={sub.status} /></td><td className="p-3"><Badge variant={sub.paymentStatus === "paid" ? "secondary" : "destructive"}>{sub.paymentStatus}</Badge></td><td className="p-3"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => onStatus(sub.id, { paymentStatus: "paid" })}>Mark paid</Button><Button size="sm" variant="outline" onClick={() => onStatus(sub.id, { paymentStatus: "refunded", refundNote: "Manual refund note" })}>Refund note</Button></div></td></tr>)}</tbody>
      </table>
    </div>
  );
}

export function DailyDeliveryList({ rows }: { rows: any[] }) {
  if (!rows.length) return <Card className="rounded-xl p-6 text-center text-gray-500">No deliveries for this date.</Card>;
  return <div className="grid gap-3">{rows.map((row) => <Card key={`${row.subscriptionId}-${row.mealSlot}`} className="rounded-xl p-4"><div className="flex flex-col gap-2 sm:flex-row sm:justify-between"><div><p className="font-semibold">{row.customerName} • {row.mealSlot}</p><p className="text-sm text-gray-500">{row.address}</p><p className="text-sm text-gray-500">Allergies: {(row.allergies || []).join(", ") || "None"} • {row.notes || "No notes"}</p></div><Badge>{row.area}</Badge></div></Card>)}</div>;
}

export function MealCalendarManager({ entries, onEntriesChange }: { entries: any[]; onEntriesChange: (entries: any[]) => void }) {
  const add = () => onEntriesChange([...entries, { date: "", breakfast: "", lunch: "", dinner: "", notes: "" }]);
  const update = (index: number, key: string, value: string) => onEntriesChange(entries.map((entry, i) => i === index ? { ...entry, [key]: value } : entry));
  return (
    <div className="space-y-3">
      {entries.map((entry, index) => <Card key={index} className="grid gap-2 rounded-xl p-3 sm:grid-cols-5"><Input type="date" value={entry.date} onChange={(e) => update(index, "date", e.target.value)} /><Input placeholder="Breakfast" value={entry.breakfast || ""} onChange={(e) => update(index, "breakfast", e.target.value)} /><Input placeholder="Lunch" value={entry.lunch || ""} onChange={(e) => update(index, "lunch", e.target.value)} /><Input placeholder="Dinner" value={entry.dinner || ""} onChange={(e) => update(index, "dinner", e.target.value)} /><Input placeholder="Notes" value={entry.notes || ""} onChange={(e) => update(index, "notes", e.target.value)} /></Card>)}
      <Button type="button" variant="outline" onClick={add}>Add calendar day</Button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function CheckboxGroup({ label, items, selected, onToggle }: { label: string; items: string[]; selected: string[]; onToggle: (item: string) => void }) {
  return <div><Label>{label}</Label><div className="mt-2 flex flex-wrap gap-2">{items.map((item) => <label key={item} className="flex items-center gap-2 rounded-full border px-3 py-2 text-sm"><Checkbox checked={selected.includes(item)} onCheckedChange={() => onToggle(item)} />{item}</label>)}</div></div>;
}

function StatusBadge({ status }: { status: string }) {
  const variant = status === "cancelled" ? "destructive" : "secondary";
  return <Badge variant={variant}>{status}</Badge>;
}

function splitList(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

type DialogProps = { open: boolean; onOpenChange: (open: boolean) => void; onSubmit: (data: any) => void };

function ActionDialog({ title, open, onOpenChange, onSubmit, submitLabel, children }: DialogProps & { title: string; submitLabel: string; children: ReactNode }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>
        <div className="space-y-4">{children}<Button className="w-full" onClick={onSubmit}>{submitLabel}</Button></div>
      </DialogContent>
    </Dialog>
  );
}

function DateReasonForm({ form, setForm, includeSlot }: { form: any; setForm: (form: any) => void; includeSlot?: boolean }) {
  return (
    <div className="grid gap-3">
      <Field label={includeSlot ? "Date" : "Start date"}><Input type="date" value={form.startDate || form.date} onChange={(e) => setForm({ ...form, [includeSlot ? "date" : "startDate"]: e.target.value })} /></Field>
      {!includeSlot && <Field label="End date"><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></Field>}
      {includeSlot && <Field label="Meal slot"><select className="h-10 rounded-md border px-3" value={form.mealSlot} onChange={(e) => setForm({ ...form, mealSlot: e.target.value })}><option value="breakfast">Breakfast</option><option value="lunch">Lunch</option><option value="dinner">Dinner</option></select></Field>}
      <Field label="Reason"><Textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></Field>
    </div>
  );
}
