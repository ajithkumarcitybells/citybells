import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AdminTaxiPricingPage() {
  const { toast } = useToast();
  const { data: pricings = [] } = useQuery({ queryKey: ["/api/taxi/pricing"], queryFn: async () => { const r = await apiRequest('GET','/api/taxi/pricing'); return r.json(); } });
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ name: '', startTime: '06:00', endTime: '12:00', baseFare: 0, perKmRate: 0, perMinuteRate: 0, surgeMultiplier: 1, minimumFare: 0, bookingFee: 0, isActive: false });

  const savePricing = useMutation({ mutationFn: async () => {
    if (editing) {
      await apiRequest('PATCH', `/api/taxi/pricing/${editing.id}`, form);
    } else {
      await apiRequest('POST', '/api/taxi/pricing', form);
    }
  }, onSuccess: async () => { queryClient.invalidateQueries({ queryKey: ['/api/taxi/pricing'] }); setEditing(null); setForm({ name: '', startTime: '06:00', endTime: '12:00', baseFare: 0, perKmRate: 0, perMinuteRate: 0, surgeMultiplier: 1, minimumFare: 0, bookingFee: 0, isActive: false }); toast({ title: 'Saved' }); }, onError: (err: any) => { toast({ title: 'Error saving', description: err.message || String(err), variant: 'destructive' }); } });

  const deletePricing = useMutation({ mutationFn: async (id: string) => { await apiRequest('DELETE', `/api/taxi/pricing/${id}`); }, onSuccess: async () => { queryClient.invalidateQueries({ queryKey: ['/api/taxi/pricing'] }); toast({ title: 'Deleted' }); } });

  function startEdit(p: any) {
    setEditing(p);
    setForm({ ...p });
  }

  function calcFare(pricing: any, distanceKm: number, durationMin: number) {
    if (!pricing) return null;
    const base = Number(pricing.baseFare || 0);
    const perKm = Number(pricing.perKmRate || 0);
    const perMin = Number(pricing.perMinuteRate || 0);
    const surge = Number(pricing.surgeMultiplier || 1) || 1;
    const minFare = Number(pricing.minimumFare || 0);
    const bookingFee = Number(pricing.bookingFee || 0);

    let fare = base + distanceKm * perKm + durationMin * perMin;
    fare = fare * surge;
    if (fare < minFare) fare = minFare;
    fare = fare + bookingFee;
    return Math.round(fare * 100) / 100;
  }

  const [simDistance, setSimDistance] = useState<number>(5);
  const [simDuration, setSimDuration] = useState<number>(10);
  const [selectedPricingId, setSelectedPricingId] = useState<string | null>(null);

  const selectedPricing = useMemo(() => pricings.find((p: any) => p.id === selectedPricingId) || pricings[0] || null, [pricings, selectedPricingId]);
  const previewFare = calcFare(selectedPricing, simDistance, simDuration);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Taxi Pricing</h1>
          <div>
            <Button onClick={() => { setEditing(null); setForm({ name: '', startTime: '06:00', endTime: '12:00', baseFare: 0, perKmRate: 0, perMinuteRate: 0, surgeMultiplier: 1, minimumFare: 0, bookingFee: 0, isActive: false }); }}>New Pricing</Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="font-medium mb-2">Pricing Rules</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b"><th>Name</th><th>Time</th><th>Rates</th><th>Active</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {pricings.map((p: any) => (
                    <tr key={p.id} className="border-b">
                      <td className="px-2 py-2">{p.name}</td>
                      <td>{p.startTime} - {p.endTime}</td>
                      <td>Base ₹{p.baseFare} · ₹{p.perKmRate}/km · ₹{p.perMinuteRate}/min · x{p.surgeMultiplier}</td>
                      <td>{p.isActive ? 'Yes' : 'No'}</td>
                      <td className="px-2 py-2"><div className="flex gap-2"><Button size="sm" onClick={() => startEdit(p)}>Edit</Button><Button size="sm" variant="destructive" onClick={() => { if (!confirm('Delete?')) return; deletePricing.mutate(p.id); }}>Delete</Button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-medium mb-2">Simulator</h2>
            <div className="space-y-2">
              <div>
                <Label>Pricing rule</Label>
                <select value={selectedPricingId || (pricings[0] && pricings[0].id) || ''} onChange={(e) => setSelectedPricingId(e.target.value)} className="w-full p-2 border rounded">
                  {pricings.map((p:any)=> <option key={p.id} value={p.id}>{p.name} ({p.startTime}-{p.endTime})</option>)}
                </select>
              </div>
              <div>
                <Label>Distance (km)</Label>
                <Input type="number" value={simDistance} onChange={(e:any)=>setSimDistance(Number(e.target.value || 0))} />
              </div>
              <div>
                <Label>Duration (min)</Label>
                <Input type="number" value={simDuration} onChange={(e:any)=>setSimDuration(Number(e.target.value || 0))} />
              </div>
              <div className="pt-2">
                <div className="text-lg font-semibold">Estimated Fare: {previewFare != null ? `₹${previewFare}` : '—'}</div>
                <div className="text-sm text-gray-600">Breakdown: base + perKm*km + perMin*min, then surge, min fare, booking fee.</div>
              </div>
            </div>
          </Card>
        </div>

        <div className="mt-6">
          <Card className="p-4">
            <h2 className="font-medium mb-2">Editor</h2>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Name</Label>
                <Input value={form.name} onChange={(e:any)=>setForm({...form, name:e.target.value})} />
              </div>
              <div>
                <Label>Active</Label>
                <select value={String(form.isActive || false)} onChange={(e)=>setForm({...form, isActive: e.target.value === 'true'})} className="w-full p-2 border rounded">
                  <option value="true">Yes</option>
                  <option value="false">No</option>
                </select>
              </div>
              <div>
                <Label>Start Time</Label>
                <Input value={form.startTime} onChange={(e:any)=>setForm({...form, startTime: e.target.value})} />
              </div>
              <div>
                <Label>End Time</Label>
                <Input value={form.endTime} onChange={(e:any)=>setForm({...form, endTime: e.target.value})} />
              </div>
              <div>
                <Label>Base Fare</Label>
                <Input type="number" value={form.baseFare} onChange={(e:any)=>setForm({...form, baseFare: Number(e.target.value || 0)})} />
              </div>
              <div>
                <Label>Per km rate</Label>
                <Input type="number" value={form.perKmRate} onChange={(e:any)=>setForm({...form, perKmRate: Number(e.target.value || 0)})} />
              </div>
              <div>
                <Label>Per minute rate</Label>
                <Input type="number" value={form.perMinuteRate} onChange={(e:any)=>setForm({...form, perMinuteRate: Number(e.target.value || 0)})} />
              </div>
              <div>
                <Label>Surge multiplier</Label>
                <Input type="number" value={form.surgeMultiplier} onChange={(e:any)=>setForm({...form, surgeMultiplier: Number(e.target.value || 1)})} />
              </div>
              <div>
                <Label>Minimum fare</Label>
                <Input type="number" value={form.minimumFare} onChange={(e:any)=>setForm({...form, minimumFare: Number(e.target.value || 0)})} />
              </div>
              <div>
                <Label>Booking fee</Label>
                <Input type="number" value={form.bookingFee} onChange={(e:any)=>setForm({...form, bookingFee: Number(e.target.value || 0)})} />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={()=>{ setEditing(null); setForm({ name: '', startTime: '06:00', endTime: '12:00', baseFare: 0, perKmRate: 0, perMinuteRate: 0, surgeMultiplier: 1, minimumFare: 0, bookingFee: 0, isActive: false }); }}>Clear</Button>
              <Button onClick={()=>savePricing.mutate()} disabled={savePricing.isPending}>{savePricing.isPending ? 'Saving...' : (editing ? 'Save' : 'Create')}</Button>
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
