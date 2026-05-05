import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Hotel, HotelPricingRule, HotelRoom } from "@shared/schema";

const emptyRule = {
  name: "",
  type: "weekend",
  multiplier: 1.2,
  fixedPrice: "",
  minPrice: "",
  maxPrice: "",
  startDate: "",
  endDate: "",
  hotelId: "",
  roomId: "",
  enabled: true,
  priority: 100,
};

const ruleTypes = ["weekend", "holiday", "demand", "season", "availability", "manual_override"];

function money(value: unknown) {
  const numeric = Number(value || 0);
  return numeric.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function AdminHotelPricingPage() {
  const { toast } = useToast();
  const [editingRule, setEditingRule] = useState<HotelPricingRule | null>(null);
  const [ruleDialogOpen, setRuleDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyRule);
  const [simHotelId, setSimHotelId] = useState("");
  const [simRoomId, setSimRoomId] = useState("");
  const [simCheckIn, setSimCheckIn] = useState("");
  const [simCheckOut, setSimCheckOut] = useState("");
  const [simResult, setSimResult] = useState<any>(null);

  const { data: pricingData = { dynamicPricingEnabled: true, rules: [] } } = useQuery<{ dynamicPricingEnabled: boolean; rules: HotelPricingRule[] }>({
    queryKey: ["/api/admin/hotel-pricing/rules"],
  });
  const { data: hotels = [] } = useQuery<Hotel[]>({ queryKey: ["/api/admin/hotels"] });
  const selectedHotelId = form.hotelId || simHotelId;
  const { data: rooms = [] } = useQuery<HotelRoom[]>({
    queryKey: ["/api/admin/hotels", selectedHotelId, "rooms"],
    enabled: !!selectedHotelId,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/admin/hotels/${selectedHotelId}/rooms`);
      return res.json();
    },
  });

  const selectedSimRooms = useMemo(() => rooms.filter((room) => !simHotelId || room.hotelId === simHotelId), [rooms, simHotelId]);

  const saveGlobal = useMutation({
    mutationFn: async (enabled: boolean) => apiRequest("POST", "/api/admin/hotel-pricing/rules", { dynamicPricingEnabled: enabled }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hotel-pricing/rules"] });
      toast({ title: "Hotel dynamic pricing updated" });
    },
  });

  const saveRule = useMutation({
    mutationFn: async () => {
      const ruleName = String(form.name || "").trim();
      if (!ruleName) {
        throw new Error("Rule name is required.");
      }
      if (form.type === "manual_override" && (form.fixedPrice === "" || Number(form.fixedPrice) <= 0)) {
        throw new Error("Fixed price override must be greater than 0.");
      }
      const payload = {
        ...form,
        name: ruleName,
        hotelId: form.hotelId || null,
        roomId: form.roomId || null,
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        multiplier: form.type === "manual_override" ? null : Number(form.multiplier || 1),
        fixedPrice: form.type === "manual_override" ? Number(form.fixedPrice || 0) : null,
        minPrice: form.minPrice === "" ? null : Number(form.minPrice),
        maxPrice: form.maxPrice === "" ? null : Number(form.maxPrice),
        priority: Number(form.priority || 100),
      };
      if (editingRule) {
        await apiRequest("PATCH", `/api/admin/hotel-pricing/rules/${editingRule.id}`, payload);
      } else {
        await apiRequest("POST", "/api/admin/hotel-pricing/rules", payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hotel-pricing/rules"] });
      setRuleDialogOpen(false);
      setEditingRule(null);
      setForm(emptyRule);
      toast({ title: "Pricing rule saved" });
    },
    onError: (error: Error) => toast({ title: "Save failed", description: error.message, variant: "destructive" }),
  });

  const deleteRule = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/admin/hotel-pricing/rules/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/hotel-pricing/rules"] });
      toast({ title: "Pricing rule deleted" });
    },
  });

  async function runSimulation() {
    setSimResult(null);
    if (!simHotelId || !simRoomId || !simCheckIn || !simCheckOut) {
      toast({ title: "Select room and dates", variant: "destructive" });
      return;
    }
    const checkInDate = new Date(`${simCheckIn}T00:00:00`);
    const checkOutDate = new Date(`${simCheckOut}T00:00:00`);
    if (Number.isNaN(checkInDate.getTime()) || Number.isNaN(checkOutDate.getTime()) || checkOutDate <= checkInDate) {
      toast({ title: "Invalid dates", description: "Check-out date must be after check-in date.", variant: "destructive" });
      return;
    }
    try {
      const res = await apiRequest("POST", `/api/hotels/${simHotelId}/rooms/${simRoomId}/calculate-price`, {
        checkIn: simCheckIn,
        checkOut: simCheckOut,
      });
      setSimResult(await res.json());
    } catch (error: any) {
      toast({
        title: "Simulation failed",
        description: error?.message || "Unable to calculate hotel price.",
        variant: "destructive",
      });
    }
  }

  function openRule(rule?: HotelPricingRule) {
    if (rule) {
      setEditingRule(rule);
      setForm({
        ...emptyRule,
        ...rule,
        multiplier: rule.multiplier ?? 1,
        fixedPrice: rule.fixedPrice ?? "",
        minPrice: rule.minPrice ?? "",
        maxPrice: rule.maxPrice ?? "",
        startDate: rule.startDate ?? "",
        endDate: rule.endDate ?? "",
        hotelId: rule.hotelId ?? "",
        roomId: rule.roomId ?? "",
      });
    } else {
      setEditingRule(null);
      setForm(emptyRule);
    }
    setRuleDialogOpen(true);
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Hotel Dynamic Pricing</h1>
            <p className="text-sm text-gray-500">Control date, demand, availability, and fixed room prices.</p>
          </div>
          <Button onClick={() => openRule()}>New Rule</Button>
        </div>

        <Card className="p-4 flex items-center justify-between">
          <div>
            <h2 className="font-medium">Global dynamic pricing</h2>
            <p className="text-sm text-gray-500">Manual fixed overrides still apply when global dynamic pricing is off.</p>
          </div>
          <Button
            variant={pricingData.dynamicPricingEnabled ? "default" : "outline"}
            onClick={() => saveGlobal.mutate(!pricingData.dynamicPricingEnabled)}
          >
            {pricingData.dynamicPricingEnabled ? "Enabled" : "Disabled"}
          </Button>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_420px] gap-4">
          <Card className="p-4">
            <h2 className="font-medium mb-3">Pricing Rules</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b">
                    <th className="px-2 py-2">Name</th><th>Type</th><th>Scope</th><th>Value</th><th>Dates</th><th>Status</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pricingData.rules.map((rule) => (
                    <tr key={rule.id} className="border-b">
                      <td className="px-2 py-2 font-medium">{rule.name}</td>
                      <td>{rule.type.replace("_", " ")}</td>
                      <td>{rule.roomId ? "Room" : rule.hotelId ? "Hotel" : "Global"}</td>
                      <td>{rule.type === "manual_override" ? `₹${money(rule.fixedPrice)}` : `x${rule.multiplier || 1}`}</td>
                      <td>{rule.startDate || "Any"} - {rule.endDate || "Any"}</td>
                      <td><Badge className={rule.enabled ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"}>{rule.enabled ? "Enabled" : "Off"}</Badge></td>
                      <td>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openRule(rule)}>Edit</Button>
                          <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete pricing rule?")) deleteRule.mutate(rule.id); }}>Delete</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-medium mb-3">Simulator</h2>
            <div className="space-y-3">
              <div>
                <Label>Hotel</Label>
                <select className="w-full p-2 border rounded" value={simHotelId} onChange={(e) => { setSimHotelId(e.target.value); setSimRoomId(""); setSimResult(null); }}>
                  <option value="">Select hotel</option>
                  {hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Room</Label>
                <select className="w-full p-2 border rounded" value={simRoomId} onChange={(e) => setSimRoomId(e.target.value)}>
                  <option value="">Select room</option>
                  {selectedSimRooms.map((room) => <option key={room.id} value={room.id}>{room.name} - ₹{money(room.price)}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label>Check-in</Label><Input type="date" value={simCheckIn} onChange={(e) => setSimCheckIn(e.target.value)} /></div>
                <div><Label>Check-out</Label><Input type="date" min={simCheckIn || undefined} value={simCheckOut} onChange={(e) => setSimCheckOut(e.target.value)} /></div>
              </div>
              <Button onClick={runSimulation}>Calculate</Button>
              {simResult && (
                <div className="rounded border p-3 text-sm space-y-2">
                  <div className="flex justify-between"><span>Base</span><span>₹{money(simResult.basePrice)}</span></div>
                  <div className="flex justify-between"><span>Calculated/night</span><span>₹{money(simResult.dynamicPrice)}</span></div>
                  <div className="flex justify-between font-semibold"><span>{simResult.nights} nights</span><span>₹{money(simResult.totalPrice)}</span></div>
                  {simResult.badge && <Badge>{simResult.badge}</Badge>}
                  {simResult.appliedRules?.map((rule: any) => (
                    <div key={rule.id} className="text-xs text-gray-500">{rule.name}: ₹{money(rule.amountBefore)} → ₹{money(rule.amountAfter)}</div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        <Dialog open={ruleDialogOpen} onOpenChange={setRuleDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingRule ? "Edit Pricing Rule" : "Create Pricing Rule"}</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Name</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div>
                <Label>Type</Label>
                <select className="w-full p-2 border rounded" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {ruleTypes.map((type) => <option key={type} value={type}>{type.replace("_", " ")}</option>)}
                </select>
              </div>
              <div><Label>Multiplier</Label><Input type="number" step="0.01" disabled={form.type === "manual_override"} value={form.multiplier} onChange={(e) => setForm({ ...form, multiplier: e.target.value })} /></div>
              <div><Label>Fixed Price Override</Label><Input type="number" disabled={form.type !== "manual_override"} value={form.fixedPrice} onChange={(e) => setForm({ ...form, fixedPrice: e.target.value })} /></div>
              <div><Label>Minimum Price</Label><Input type="number" value={form.minPrice} onChange={(e) => setForm({ ...form, minPrice: e.target.value })} /></div>
              <div><Label>Maximum Price</Label><Input type="number" value={form.maxPrice} onChange={(e) => setForm({ ...form, maxPrice: e.target.value })} /></div>
              <div><Label>Start Date</Label><Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
              <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
              <div>
                <Label>Hotel Scope</Label>
                <select className="w-full p-2 border rounded" value={form.hotelId} onChange={(e) => setForm({ ...form, hotelId: e.target.value, roomId: "" })}>
                  <option value="">All hotels</option>
                  {hotels.map((hotel) => <option key={hotel.id} value={hotel.id}>{hotel.name}</option>)}
                </select>
              </div>
              <div>
                <Label>Room Scope</Label>
                <select className="w-full p-2 border rounded" value={form.roomId} onChange={(e) => setForm({ ...form, roomId: e.target.value })} disabled={!form.hotelId}>
                  <option value="">All rooms</option>
                  {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                </select>
              </div>
              <div><Label>Priority</Label><Input type="number" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} /></div>
              <div>
                <Label>Enabled</Label>
                <select className="w-full p-2 border rounded" value={String(form.enabled)} onChange={(e) => setForm({ ...form, enabled: e.target.value === "true" })}>
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRuleDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => saveRule.mutate()} disabled={saveRule.isPending || !String(form.name || "").trim()}>
                {saveRule.isPending ? "Saving..." : "Save Rule"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
