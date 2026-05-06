import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { CalendarClock, Clock, Edit3, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { TaxiRide } from "@shared/schema";

export function RideModeToggle({ value, onChange }: { value: "now" | "schedule"; onChange: (value: "now" | "schedule") => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-900">
      {(["now", "schedule"] as const).map((mode) => (
        <button key={mode} type="button" onClick={() => onChange(mode)} className={`h-10 rounded-md text-sm font-bold ${value === mode ? "bg-yellow-400 text-slate-950 shadow-sm" : "text-slate-600 dark:text-slate-300"}`}>
          {mode === "now" ? "Ride now" : "Schedule"}
        </button>
      ))}
    </div>
  );
}

export function ScheduledDateTimePicker({ date, time, onDateChange, onTimeChange, error }: { date: string; time: string; onDateChange: (value: string) => void; onTimeChange: (value: string) => void; error?: string | null }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label="Pickup date"><Input type="date" value={date} onChange={(event) => onDateChange(event.target.value)} /></Field>
      <Field label="Pickup time"><Input type="time" value={time} onChange={(event) => onTimeChange(event.target.value)} /></Field>
      {error ? <p className="sm:col-span-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
    </div>
  );
}

export function ScheduledRideForm({ date, time, paymentMethod, onDateChange, onTimeChange, onPaymentMethodChange, error }: any) {
  return (
    <Card className="space-y-3 rounded-lg border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-900/50 dark:bg-yellow-950/30">
      <div className="flex items-center gap-2">
        <CalendarClock className="h-4 w-4 text-yellow-700" />
        <p className="text-sm font-bold text-slate-900 dark:text-yellow-50">Schedule your pickup</p>
      </div>
      <ScheduledDateTimePicker date={date} time={time} onDateChange={onDateChange} onTimeChange={onTimeChange} error={error} />
      <Field label="Payment method">
        <select className="h-10 rounded-md border bg-white px-3 text-sm" value={paymentMethod} onChange={(event) => onPaymentMethodChange(event.target.value)}>
          <option value="cash">Cash</option>
          <option value="upi">UPI</option>
          <option value="card">Card</option>
          <option value="wallet">Wallet</option>
        </select>
      </Field>
      <p className="text-xs text-slate-600 dark:text-yellow-100/80">Drivers are assigned close to pickup time. Free cancellation policy placeholder applies before assignment.</p>
    </Card>
  );
}

export function ScheduledFareEstimateCard({ baseFare, distanceFare, timeFare, scheduledFee, total }: { baseFare: number; distanceFare: number; timeFare: number; scheduledFee: number; total: number }) {
  const rows = [
    ["Base fare", baseFare],
    ["Distance fare", distanceFare],
    ["Time fare", timeFare],
    ["Scheduled fee", scheduledFee],
  ];
  return (
    <Card className="rounded-lg bg-slate-950 p-4 text-white dark:bg-yellow-400 dark:text-slate-950">
      <p className="text-sm font-bold">Scheduled fare estimate</p>
      <div className="mt-3 space-y-1 text-sm">
        {rows.map(([label, value]) => <div key={String(label)} className="flex justify-between"><span>{label}</span><span>{formatMoney(Number(value))}</span></div>)}
      </div>
      <div className="mt-3 flex justify-between border-t border-white/20 pt-3 text-lg font-bold"><span>Total estimate</span><span>{formatMoney(total)}</span></div>
    </Card>
  );
}

export function ScheduledRideStatusBadge({ status }: { status?: string | null }) {
  const value = status || "scheduled";
  const className = value === "cancelled" ? "bg-red-100 text-red-800" : value === "completed" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-900";
  return <Badge className={`${className} border-transparent`}>{formatStatus(value)}</Badge>;
}

export function ScheduledRideCountdown({ scheduledPickupAt }: { scheduledPickupAt?: string | Date | null }) {
  const label = useMemo(() => pickupCountdown(scheduledPickupAt), [scheduledPickupAt]);
  return <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-900"><Clock className="h-3 w-3" />{label}</span>;
}

export function UpcomingRideCard({ ride, onReschedule, onCancel }: { ride: TaxiRide; onReschedule?: () => void; onCancel?: () => void }) {
  return (
    <Card className="space-y-3 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold">{formatPickup(ride.scheduledPickupAt)}</p>
          <ScheduledRideCountdown scheduledPickupAt={ride.scheduledPickupAt} />
        </div>
        <ScheduledRideStatusBadge status={ride.status} />
      </div>
      <div className="text-sm">
        <p className="line-clamp-1"><span className="font-semibold text-green-700">Pickup:</span> {ride.pickupAddress}</p>
        <p className="line-clamp-1"><span className="font-semibold text-red-700">Drop:</span> {ride.dropAddress}</p>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <span>{(ride as any).vehicleType || ride.vehicleTypeId || "Cab"} • {ride.driverName ? `Assigned to ${ride.driverName}` : "Driver not assigned yet"}</span>
        <span className="font-bold">{formatMoney(Number((ride as any).fare || ride.estimatedFare || 0))}</span>
      </div>
      {(onReschedule || onCancel) ? (
        <div className="flex gap-2">
          {onReschedule ? <Button size="sm" variant="outline" onClick={onReschedule}><Edit3 className="mr-1 h-3.5 w-3.5" />Reschedule</Button> : null}
          {onCancel ? <Button size="sm" variant="destructive" onClick={onCancel}><XCircle className="mr-1 h-3.5 w-3.5" />Cancel</Button> : null}
        </div>
      ) : null}
    </Card>
  );
}

export function AdminScheduledRideCard({ ride, drivers, onAssign, onAutoAssign, onCancel }: any) {
  const [driverId, setDriverId] = useState("");
  return (
    <Card className="space-y-3 rounded-xl p-4">
      <UpcomingRideSummary ride={ride} />
      <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
        <select className="h-10 rounded-md border px-3" value={driverId} onChange={(event) => setDriverId(event.target.value)}>
          <option value="">Select driver</option>
          {drivers.map((driver: any) => <option key={driver.id} value={driver.id}>{driver.name} • {driver.vehicleNumber || "vehicle"}</option>)}
        </select>
        <Button size="sm" onClick={() => driverId && onAssign(driverId)}>Assign</Button>
        <Button size="sm" variant="outline" onClick={onAutoAssign}>Auto-assign</Button>
      </div>
      <Button size="sm" variant="destructive" onClick={onCancel}>Cancel scheduled ride</Button>
    </Card>
  );
}

export function DriverScheduledRideCard({ ride, onStatus }: { ride: TaxiRide; onStatus: (status: string) => void }) {
  const next = nextDriverStatus(String(ride.status || ""));
  return (
    <Card className="space-y-3 rounded-xl p-4">
      <UpcomingRideSummary ride={ride} />
      {next ? <Button className="w-full bg-yellow-400 text-slate-950 hover:bg-yellow-300" onClick={() => onStatus(next)}>{next === "arriving" ? "Start to pickup" : next === "started" ? "Start ride" : "Complete ride"}</Button> : null}
    </Card>
  );
}

export function RescheduleRideDialog({ open, onOpenChange, onSubmit, defaultDate = "", defaultTime = "" }: any) {
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState(defaultTime);
  return <ActionDialog title="Reschedule ride" open={open} onOpenChange={onOpenChange} onSubmit={() => onSubmit({ date, time })} submitLabel="Reschedule"><ScheduledDateTimePicker date={date} time={time} onDateChange={setDate} onTimeChange={setTime} /></ActionDialog>;
}

export function CancelScheduledRideDialog({ open, onOpenChange, onSubmit }: any) {
  const [reason, setReason] = useState("");
  return <ActionDialog title="Cancel scheduled ride" open={open} onOpenChange={onOpenChange} onSubmit={() => onSubmit({ reason })} submitLabel="Cancel ride"><Field label="Reason"><Textarea value={reason} onChange={(event) => setReason(event.target.value)} /></Field><p className="text-xs text-slate-500">Cancellation fee/refund policy placeholder will be evaluated by support/admin.</p></ActionDialog>;
}

function UpcomingRideSummary({ ride }: { ride: TaxiRide }) {
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3"><div><p className="font-bold">{formatPickup(ride.scheduledPickupAt)}</p><ScheduledRideCountdown scheduledPickupAt={ride.scheduledPickupAt} /></div><ScheduledRideStatusBadge status={ride.status} /></div>
      <p className="text-sm line-clamp-1">{ride.pickupAddress}</p>
      <p className="text-sm line-clamp-1">{ride.dropAddress}</p>
      <p className="text-sm font-semibold">{formatMoney(Number((ride as any).fare || ride.estimatedFare || 0))} • {ride.driverName || "Driver pending"}</p>
    </div>
  );
}

function ActionDialog({ title, open, onOpenChange, onSubmit, submitLabel, children }: { title: string; open: boolean; onOpenChange: (open: boolean) => void; onSubmit: () => void; submitLabel: string; children: ReactNode }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader><div className="space-y-4">{children}<Button className="w-full" onClick={onSubmit}>{submitLabel}</Button></div></DialogContent></Dialog>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="grid gap-1.5"><Label>{label}</Label>{children}</div>;
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number.isFinite(value) ? value : 0);
}

function formatStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatPickup(value?: string | Date | null) {
  if (!value) return "Pickup time pending";
  return new Date(value).toLocaleString("en-IN", { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
}

function pickupCountdown(value?: string | Date | null) {
  if (!value) return "Pickup time pending";
  const diff = new Date(value).getTime() - Date.now();
  if (diff <= 0) return "Pickup time now";
  const minutes = Math.round(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? `Pickup in ${hours}h ${mins}m` : `Pickup in ${mins}m`;
}

function nextDriverStatus(status: string) {
  if (status === "driver_assigned" || status === "accepted") return "arriving";
  if (status === "arriving") return "started";
  if (status === "started" || status === "in_ride") return "completed";
  return null;
}
