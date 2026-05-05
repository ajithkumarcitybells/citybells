import { useState } from "react";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";

export default function AdminTaxiSurgePage() {
  const [peakJson, setPeakJson] = useState<string>(`[
  { "name": "Morning Rush", "startTime": "07:00", "endTime": "10:00", "multiplier": 1.5, "enabled": true },
  { "name": "Evening Rush", "startTime": "17:00", "endTime": "21:00", "multiplier": 1.8, "enabled": true }
]`);
  const [weatherJson, setWeatherJson] = useState<string>(`[
  { "condition": "light_rain", "multiplier": 1.1, "enabled": true },
  { "condition": "heavy_rain", "multiplier": 1.25, "enabled": true }
]`);
  const [demandJson, setDemandJson] = useState<string>(`{
  "low": { "maxRatio": 1.0, "multiplier": 1.0 },
  "medium": { "maxRatio": 1.5, "multiplier": 1.3 },
  "high": { "maxRatio": 2.5, "multiplier": 1.8 },
  "extreme": { "multiplier": 2.5 }
}`);

  const [simDistance, setSimDistance] = useState<number>(9000);
  const [simDuration, setSimDuration] = useState<number>(900);
  const [simDrivers, setSimDrivers] = useState<number>(12);
  const [simRequests, setSimRequests] = useState<number>(48);
  const [simLat, setSimLat] = useState<number | undefined>(undefined);
  const [simLon, setSimLon] = useState<number | undefined>(undefined);
  const [result, setResult] = useState<any>(null);

  async function saveRules() {
    try {
      const peakRules = JSON.parse(peakJson);
      const weatherRules = JSON.parse(weatherJson);
      const demandConfig = JSON.parse(demandJson);
      await apiRequest('POST', '/api/surge/update', { peakRules, weatherRules, demandConfig });
      alert('Saved');
    } catch (e: any) {
      alert('Invalid JSON: ' + e.message);
    }
  }

  async function simulate() {
    try {
      const body = { distanceMeters: simDistance, durationSec: simDuration, requests: simRequests, availableDrivers: simDrivers, lat: simLat, lon: simLon };
      const r = await apiRequest('POST', '/api/pricing/calculate', body);
      const j = await r.json();
      setResult(j);
    } catch (e: any) {
      alert(e.message || String(e));
    }
  }

  return (
    <AdminLayout>
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Surge Pricing Management</h1></div>
        <div className="grid grid-cols-2 gap-4">
          <Card className="p-4">
            <h2 className="font-medium mb-2">Peak Hour Rules (JSON)</h2>
            <textarea value={peakJson} onChange={(e)=>setPeakJson(e.target.value)} className="w-full h-48 p-2 border rounded" />
          </Card>
          <Card className="p-4">
            <h2 className="font-medium mb-2">Weather Rules (JSON)</h2>
            <textarea value={weatherJson} onChange={(e)=>setWeatherJson(e.target.value)} className="w-full h-48 p-2 border rounded" />
          </Card>
        </div>

        <Card className="p-4">
          <h2 className="font-medium mb-2">Demand Config (JSON)</h2>
          <textarea value={demandJson} onChange={(e)=>setDemandJson(e.target.value)} className="w-full h-36 p-2 border rounded" />
        </Card>

        <div className="flex gap-2">
          <Button onClick={saveRules}>Save Rules</Button>
        </div>

        <Card className="p-4">
          <h2 className="font-medium mb-2">Surge Simulator</h2>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Distance (meters)</Label><Input value={simDistance} onChange={(e:any)=>setSimDistance(Number(e.target.value||0))} /></div>
            <div><Label>Duration (sec)</Label><Input value={simDuration} onChange={(e:any)=>setSimDuration(Number(e.target.value||0))} /></div>
            <div><Label>Drivers Online</Label><Input value={simDrivers} onChange={(e:any)=>setSimDrivers(Number(e.target.value||0))} /></div>
            <div><Label>Requests</Label><Input value={simRequests} onChange={(e:any)=>setSimRequests(Number(e.target.value||0))} /></div>
            <div><Label>Lat</Label><Input value={simLat || ''} onChange={(e:any)=>setSimLat(e.target.value ? Number(e.target.value) : undefined)} /></div>
            <div><Label>Lon</Label><Input value={simLon || ''} onChange={(e:any)=>setSimLon(e.target.value ? Number(e.target.value) : undefined)} /></div>
          </div>
          <div className="mt-3"><Button onClick={simulate}>Run Simulation</Button></div>
          {result && (
            <div className="mt-3">
              <pre className="p-2 bg-gray-50 rounded">{JSON.stringify(result, null, 2)}</pre>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
}
