import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import TaxiSocketDemo from "@/components/TaxiSocketDemo";
import useTaxiSocket from "@/hooks/use-taxi-socket";
import RideTrackingMap from "@/components/RideTrackingMap";
import { EtaBadge } from "@/components/taxi/EtaBadge";

export default function AdminTaxiPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"vehicles"|"drivers"|"rides">("vehicles");

  const { data: vehicles = [], isLoading: loadingVehicles } = useQuery({ queryKey: ["/api/admin/taxi/vehicle-types"], queryFn: async () => { const r = await apiRequest('GET','/api/admin/taxi/vehicle-types'); return r.json(); } });
  const { data: drivers = [], isLoading: loadingDrivers } = useQuery({ queryKey: ["/api/admin/taxi/drivers"], queryFn: async () => { const r = await apiRequest('GET','/api/admin/taxi/drivers'); return r.json(); } });
  const [maxKm, setMaxKm] = useState<number>(20);
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(10);

  const [vehicleDrawerOpen, setVehicleDrawerOpen] = useState(false);
  const [driverDrawerOpen, setDriverDrawerOpen] = useState(false);
  const [assignDrawerOpen, setAssignDrawerOpen] = useState(false);

  const [vehicleForm, setVehicleForm] = useState<any>({ name:'', baseFare:'',pricePerKm: '',pricePerMinute: '',capacity: 4,icon: '' });
  const [driverForm, setDriverForm] = useState<any>({ name:'', phone:'', licenseNumber:'', vehicleTypeId:'', vehicleNumber:'', isOnline:false });
  const [currentRide, setCurrentRide] = useState<any>(null);

  const { data: availableDrivers = [], isLoading: loadingAvailableDrivers, refetch: refetchAvailable } = useQuery({
    queryKey: ['/api/admin/taxi/drivers/available'],
    enabled: true,
    queryFn: async () => {
      // include pickup coords when available to sort/filter by distance
      let url = '/api/admin/taxi/drivers/available';
      if (currentRide && currentRide.pickupLat && currentRide.pickupLng) {
        const params = new URLSearchParams();
        params.set('pickupLat', String(currentRide.pickupLat));
        params.set('pickupLng', String(currentRide.pickupLng));
        if (typeof maxKm === 'number' && !Number.isNaN(maxKm)) params.set('maxKm', String(maxKm));
        url = `${url}?${params.toString()}`;
      } else if (typeof maxKm === 'number' && !Number.isNaN(maxKm)) {
        const params = new URLSearchParams(); params.set('maxKm', String(maxKm)); url = `${url}?${params.toString()}`;
      }
      const r = await apiRequest('GET', url);
      return r.json();
    }
  });

  // Auto-refresh available drivers while assign modal is open
  useEffect(() => {
    if (!assignDrawerOpen) return;
    // immediate fetch when opening
    try { refetchAvailable(); } catch (e:any) {}
    const id = setInterval(() => {
      try { refetchAvailable(); } catch (e:any) {}
    }, Math.max(5, refreshIntervalSec) * 1000);
    return () => clearInterval(id);
  }, [assignDrawerOpen, refreshIntervalSec, refetchAvailable, currentRide?.id, maxKm]);
  const { data: rides = [], isLoading: loadingRides } = useQuery({ queryKey: ["/api/admin/taxi/rides"], queryFn: async () => { const r = await apiRequest('GET','/api/admin/taxi/rides'); return r.json(); } });
  const { data: safetyDashboard } = useQuery({
    queryKey: ["/api/admin/taxi/safety"],
    queryFn: async () => {
      const r = await apiRequest("GET", "/api/admin/taxi/safety");
      return r.json();
    },
    refetchInterval: 15000,
  });

  const { connected, lastRideUpdate, lastDriverLocation, joinAdmin } = useTaxiSocket();

  // Local driver location cache (for admin map + per-ride tracking)
  const [driverLocations, setDriverLocations] = useState<Record<string, { lat: number; lng: number; rideId?: string }>>({});
  useEffect(() => {
    if (!lastDriverLocation?.driverId) return;
    setDriverLocations((prev) => ({
      ...prev,
      [String(lastDriverLocation.driverId)]: { lat: lastDriverLocation.lat, lng: lastDriverLocation.lng, rideId: lastDriverLocation.rideId },
    }));
  }, [lastDriverLocation]);

  // real-time: join admin room and react to ride updates
  useEffect(() => {
    try { joinAdmin(); } catch (e:any) { console.error(e); }
  }, [joinAdmin]);

  // when a ride update comes in, refresh rides list
  useEffect(() => {
    if (!lastRideUpdate) return;
    queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/rides'] });
    try { toast({ title: `Ride update: ${lastRideUpdate.status || lastRideUpdate.sta || 'update'}` }); } catch (e:any) { console.error(e); }
  }, [lastRideUpdate, toast]);


  const saveVehicle = useMutation({ mutationFn: async () => {
    if (!vehicleForm.name) throw new Error('Name required');
    if (vehicleForm.id) {
      await apiRequest('PATCH', `/api/admin/taxi/vehicle-types/${vehicleForm.id}`, vehicleForm);
    } else {
      await apiRequest('POST', '/api/admin/taxi/vehicle-types', vehicleForm);
    }
  }, onSuccess: async () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/vehicle-types'] }); setVehicleDrawerOpen(false); toast({ title: 'Saved' }); } });

  const saveDriver = useMutation({ mutationFn: async () => {
    if (!driverForm.name || !driverForm.licenseNumber) throw new Error('Name and license required');
    if (driverForm.id) {
      await apiRequest('PATCH', `/api/admin/taxi/drivers/${driverForm.id}`, driverForm);
    } else {
      await apiRequest('POST', '/api/admin/taxi/drivers', driverForm);
    }
  }, onSuccess: async () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/drivers'] }); setDriverDrawerOpen(false); toast({ title: 'Saved' }); } });

  const assignDriver = useMutation({ mutationFn: async ({ rideId, driverId }: any) => {
    await apiRequest('PATCH', `/api/admin/taxi/rides/${rideId}/assign`, { driverId });
  }, onSuccess: async () => { queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/rides'] }); setAssignDrawerOpen(false); toast({ title: 'Driver assigned' }); } });

  const rejectRide = useMutation({
    mutationFn: async (rideId: string) => {
      const res = await apiRequest('PATCH', `/api/admin/taxi/rides/${rideId}/status`, { status: 'cancelled' });
      return res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/rides'] });
      toast({ title: 'Ride rejected', description: 'Marked as cancelled' });
    },
    onError: (err: any) => toast({ title: 'Reject failed', description: err?.message || 'Error', variant: 'destructive' }),
  });

  const autoAssign = useMutation({
    mutationFn: async (ride: any) => {
      // choose the first driver from /available (already sorted by distance when pickup coords included)
      let url = '/api/admin/taxi/drivers/available';
      if (ride?.pickupLat && ride?.pickupLng) {
        const params = new URLSearchParams();
        params.set('pickupLat', String(ride.pickupLat));
        params.set('pickupLng', String(ride.pickupLng));
        if (typeof maxKm === 'number' && !Number.isNaN(maxKm)) params.set('maxKm', String(maxKm));
        url = `${url}?${params.toString()}`;
      }
      const drivers = await (await apiRequest('GET', url)).json();
      const driverId = drivers?.[0]?.id;
      if (!driverId) throw new Error('No available drivers');
      await apiRequest('PATCH', `/api/admin/taxi/rides/${ride.id}/assign`, { driverId });
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/rides'] });
      toast({ title: 'Auto-assigned driver' });
    },
    onError: (err: any) => toast({ title: 'Auto-assign failed', description: err?.message || 'Error', variant: 'destructive' }),
  });

  const incomingRides = useMemo(() => rides.filter((r: any) => ['searching', 'requested', 'no_drivers'].includes(r.status)), [rides]);
  const activeRides = useMemo(() => rides.filter((r: any) => ['requested', 'accepted', 'driver_assigned', 'arriving', 'started', 'in_ride'].includes(r.status)), [rides]);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Taxi Management</h1>
          <div className="flex gap-2">
            <Button onClick={() => setActiveTab('vehicles')}>Vehicles</Button>
            <Button onClick={() => setActiveTab('drivers')}>Drivers</Button>
            <Button onClick={() => setActiveTab('rides')}>Rides</Button>
          </div>
        </div>

        {activeTab === 'vehicles' && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Vehicle Types</h2>
              <Button onClick={() => { setVehicleForm({ name:'', baseFare:'', perKmRate:'', perMinRate:'', capacity:1, icon:'' }); setVehicleDrawerOpen(true); }}>Add Vehicle Type</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Name</th><th>Base</th><th>Per km</th><th>Capacity</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {vehicles.map((v:any)=> (
                    <tr key={v.id} className="border-b"><td className="px-4 py-2">{v.name}</td><td>₹{v.baseFare}</td><td>₹{v.perKmRate}</td><td>{v.capacity}</td><td className="px-4 py-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>{ setVehicleForm(v); setVehicleDrawerOpen(true); }}>Edit</Button><Button size="sm" variant="destructive" onClick={async()=>{ try { if(!confirm('Delete?'))return; await apiRequest('DELETE', `/api/admin/taxi/vehicle-types/${v.id}`); queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/vehicle-types'] }); toast({ title:'Deleted' }); } catch (err:any) { toast({ title: err?.message || 'Delete failed' }); } }}>Delete</Button></div></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'drivers' && (
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Drivers</h2>
              <Button onClick={() => { setDriverForm({ name:'', phone:'', licenseNumber:'', vehicleTypeId:'', vehicleNumber:'', isOnline:false }); setDriverDrawerOpen(true); }}>Add Driver</Button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b"><th className="px-4 py-2">Name</th><th>Phone</th><th>License</th><th>Vehicle</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {drivers.map((d:any)=> (
                    <tr key={d.id} className="border-b"><td className="px-4 py-2">{d.name}</td><td>{d.phone || 'N/A'}</td><td>{d.licenseNumber || 'N/A'}</td><td>{d.vehicleNumber || 'N/A'}</td><td><Badge className={`${d.isOnline? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{d.isOnline? 'Available':'Offline'}</Badge></td><td className="px-4 py-2"><div className="flex gap-2"><Button size="sm" variant="outline" onClick={()=>{ setDriverForm(d); setDriverDrawerOpen(true); }}>Edit</Button><Button size="sm" variant="destructive" onClick={async()=>{ try { if(!confirm('Delete?'))return; await apiRequest('DELETE', `/api/admin/taxi/drivers/${d.id}`); queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/drivers'] }); toast({ title:'Deleted' }); } catch (err:any) { toast({ title: err?.message || 'Delete failed' }); } }}>Delete</Button></div></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {activeTab === 'rides' && (
          <Card className="p-4">
            <div className="mb-4">
              <TaxiSocketDemo />
            </div>
            <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-900/60 dark:bg-red-950/20">
                <p className="text-xs font-semibold uppercase text-red-700 dark:text-red-300">Active SOS alerts</p>
                <p className="mt-1 text-2xl font-bold">{safetyDashboard?.activeSos?.length || 0}</p>
              </div>
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/20">
                <p className="text-xs font-semibold uppercase text-amber-700 dark:text-amber-300">Reported rides</p>
                <p className="mt-1 text-2xl font-bold">{safetyDashboard?.reportedRides?.length || 0}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs font-semibold uppercase text-slate-600 dark:text-slate-300">High-delay rides</p>
                <p className="mt-1 text-2xl font-bold">{safetyDashboard?.highDelayRides?.length || 0}</p>
              </div>
            </div>
            {(safetyDashboard?.activeSos?.length || safetyDashboard?.reportedRides?.length) ? (
              <div className="mb-4 rounded-lg border p-3">
                <h3 className="mb-2 text-sm font-semibold">Safety queue</h3>
                <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
                  {[...(safetyDashboard?.activeSos || []), ...(safetyDashboard?.reportedRides || [])].slice(0, 6).map((event: any) => (
                    <div key={event.id} className="rounded-md bg-background p-2 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <Badge className={event.type === "sos" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}>{event.type}</Badge>
                        <span className="text-muted-foreground">{event.createdAt ? new Date(event.createdAt).toLocaleString() : ""}</span>
                      </div>
                      <p className="mt-1 font-medium">{event.rideSnapshot?.driverName || "Unassigned driver"} · {event.rideSnapshot?.driverPhone || "No phone"}</p>
                      <p className="mt-1 text-muted-foreground line-clamp-1">{event.message || event.category || "Safety event"}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-medium">Rides</h2>
              <div className="text-sm text-gray-600">
                <span className="mr-4">Incoming: {incomingRides.length}</span>
                <span className="mr-4">Assigned: {rides.filter((r:any)=> r.driverId && r.status !== 'completed' && r.status !== 'cancelled').length}</span>
                <span className="mr-4">Active: {activeRides.length}</span>
                <span>Unassigned: {incomingRides.length}</span>
              </div>
            </div>

            {/* Incoming ride requests (admin) */}
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2">Incoming ride requests (live)</h3>
              {incomingRides.length === 0 ? (
                <div className="text-sm text-muted-foreground">No new requests</div>
              ) : (
                <div className="grid grid-cols-1 gap-3">
                  {incomingRides.slice(0, 10).map((r: any) => (
                    <div key={r.id} className="p-3 border rounded-lg bg-background">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm font-semibold truncate">{r.pickupAddress} → {r.dropAddress}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Rider: {r.userId} · {r.distance ? `${Number(r.distance).toFixed(1)} km` : '—'} · ₹{r.estimatedFare || '—'}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            Requested: {r.createdAt ? new Date(r.createdAt).toLocaleString() : '—'}
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 flex-shrink-0">
                          <Button size="sm" onClick={() => { setCurrentRide(r); setAssignDrawerOpen(true); }} aria-label={`Accept and assign ride ${r.id}`}>Accept</Button>
                          <Button size="sm" variant="outline" onClick={() => autoAssign.mutate(r)} aria-label={`Auto-assign driver for ride ${r.id}`}>Auto-assign</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectRide.mutate(r.id)} aria-label={`Reject ride ${r.id}`}>Reject</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b"><th>User</th><th>Pickup</th><th>Drop</th><th>Distance</th><th>ETA</th><th>Fare</th><th>Driver</th><th>Status</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {rides.map((r:any)=> (
                    <tr key={r.id} className="border-b">
                      <td className="px-4 py-2">{r.userId}</td>
                      <td>{r.pickupAddress}</td>
                      <td>{r.dropAddress}</td>
                      <td>{r.distance || 'N/A'}</td>
                      <td>
                        <div className="flex flex-col gap-1">
                          <EtaBadge minutes={r.predictedPickupEtaMin} label="away" tone="pickup" />
                          <EtaBadge minutes={r.predictedTripEtaMin || r.duration} label="trip" tone="trip" />
                          {r.etaConfidence && <span className="text-[10px] text-muted-foreground">{r.etaConfidence}</span>}
                        </div>
                      </td>
                      <td>{r.estimatedFare || r.actualFare || 'N/A'}</td>
                      <td>{r.driverName || 'Unassigned'}</td>
                      <td>
                        <Badge className={`${r.status==='completed'? 'bg-green-100 text-green-800' : r.status==='in_ride' ? 'bg-yellow-100 text-yellow-800' : r.status==='driver_assigned' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>{r.status}</Badge>
                      </td>
                      <td className="px-4 py-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" aria-label={`Assign driver to ${r.id}`} onClick={()=>{ setCurrentRide(r); setAssignDrawerOpen(true); }}>Assign</Button>
                          {r.driverId && (
                            <Button size="sm" variant="secondary" aria-label={`Reassign driver for ${r.id}`} onClick={()=>{ setCurrentRide(r); setAssignDrawerOpen(true); toast({ title: 'Choose a driver to reassign' }); }}>Reassign</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={async ()=>{ try { const next = r.status==='searching' ? 'driver_assigned' : r.status==='driver_assigned' ? 'in_ride' : 'completed'; await apiRequest('PATCH', `/api/admin/taxi/rides/${r.id}/status`, { status: next }); queryClient.invalidateQueries({ queryKey: ['/api/admin/taxi/rides'] }); toast({ title: 'Updated' }); } catch (err:any) { toast({ title: err?.message || 'Update failed' }); } }}>Advance</Button>
                          <Button size="sm" variant="ghost" onClick={()=>{ setCurrentRide(r); setAssignDrawerOpen(true); }}>View</Button>
                          <Button size="sm" variant="destructive" onClick={() => rejectRide.mutate(r.id)} aria-label={`Reject ride ${r.id}`}>Reject</Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        <Drawer open={vehicleDrawerOpen} onOpenChange={setVehicleDrawerOpen}>
          <DrawerContent className="max-w-md">
            <DrawerHeader>
              <DrawerTitle>{vehicleForm.id ? 'Edit Vehicle' : 'Add Vehicle'}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-3 mt-3">
              <div><Label>Name</Label><Input value={vehicleForm.name} onChange={(e:any)=>setVehicleForm({...vehicleForm, name:e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-2"><div><Label>Base Fare</Label><Input value={vehicleForm.baseFare} onChange={(e:any)=>setVehicleForm({...vehicleForm, baseFare:e.target.value})} /></div><div><Label>Per km</Label><Input value={vehicleForm.perKmRate} onChange={(e:any)=>setVehicleForm({...vehicleForm, perKmRate:e.target.value})} /></div></div>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setVehicleDrawerOpen(false)}>Cancel</Button><Button onClick={()=>saveVehicle.mutate()}>Save</Button></div>
            </div>
          </DrawerContent>
        </Drawer>

        <Drawer open={driverDrawerOpen} onOpenChange={setDriverDrawerOpen}>
          <DrawerContent className="max-w-md">
            <DrawerHeader>
              <DrawerTitle>{driverForm.id ? 'Edit Driver' : 'Add Driver'}</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-3 mt-3">
              <div><Label>Name</Label><Input value={driverForm.name} onChange={(e:any)=>setDriverForm({...driverForm, name:e.target.value})} /></div>
              <div><Label>Phone</Label><Input value={driverForm.phone} onChange={(e:any)=>setDriverForm({...driverForm, phone:e.target.value})} /></div>
              <div><Label>License</Label><Input value={driverForm.licenseNumber} onChange={(e:any)=>setDriverForm({...driverForm, licenseNumber:e.target.value})} /></div>
              <div className="flex justify-end gap-2"><Button variant="ghost" onClick={()=>setDriverDrawerOpen(false)}>Cancel</Button><Button onClick={()=>saveDriver.mutate()}>Save</Button></div>
            </div>
          </DrawerContent>
        </Drawer>
        <Drawer open={assignDrawerOpen} onOpenChange={setAssignDrawerOpen}>
          <DrawerContent className="max-w-md">
            <DrawerHeader>
              <DrawerTitle>Assign Driver</DrawerTitle>
            </DrawerHeader>
            <div className="space-y-3 mt-3">
              <div>
                <Label>Ride</Label>
                <div className="p-2 border rounded">{currentRide ? `${currentRide.pickupAddress} → ${currentRide.dropAddress}` : 'No ride selected'}</div>
              </div>
              {currentRide && (currentRide.pickupLat && currentRide.pickupLng) && (
                <div>
                  <Label>Live map</Label>
                  <RideTrackingMap
                    pickup={{ lat: Number(currentRide.pickupLat), lng: Number(currentRide.pickupLng) } as any}
                    drop={currentRide.dropLat && currentRide.dropLng ? ({ lat: Number(currentRide.dropLat), lng: Number(currentRide.dropLng) } as any) : null}
                    driver={currentRide.driverId && driverLocations[String(currentRide.driverId)] ? ({ lat: driverLocations[String(currentRide.driverId)].lat, lng: driverLocations[String(currentRide.driverId)].lng } as any) : null}
                    height={220}
                    tileTheme="light"
                  />
                </div>
              )}
              <div>
                <Label>Driver</Label>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Label className="text-sm">Max distance (km)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={maxKm}
                      onChange={(e:any) => { const v = Number(e.target.value || 0); setMaxKm(v); try { refetchAvailable(); } catch (e:any) { } }}
                      className="w-24"
                      aria-label="Max distance in km for available drivers"
                    />
                    <div className="flex items-center gap-2 ml-2">
                      <Label className="text-sm">Auto-refresh (s)</Label>
                      <Input
                        type="number"
                        min={5}
                        value={refreshIntervalSec}
                        onChange={(e:any) => { const v = Math.max(5, Number(e.target.value || 5)); setRefreshIntervalSec(v); }}
                        className="w-20"
                        aria-label="Auto refresh interval seconds"
                      />
                    </div>
                    <div className="text-sm text-gray-500">Adjust filter for drivers near pickup</div>
                  </div>
                  {availableDrivers.length === 0 && <div className="text-sm text-gray-500">No available drivers</div>}
                  {availableDrivers.map((d:any)=> (
                    <div key={d.id} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-3">
                        <div className="font-medium">{d.name}</div>
                        <div className="text-sm text-gray-500">{d.vehicleNumber || '—'}</div>
                        <Badge className={`${d.isOnline? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>{d.isOnline? 'Available':'Offline'}</Badge>
                        {d.distanceKm != null && <div className="text-xs text-gray-600">{d.distanceKm} km</div>}
                      </div>
                      <Button size="sm" aria-label={`Assign ${d.name}`} onClick={()=>assignDriver.mutate({ rideId: currentRide.id, driverId: d.id })}>Assign</Button>
                    </div>
                  ))}
                </div>
              </div>
              {currentRide ? (
                <div className="pt-2 border-t">
                  <Label>Status</Label>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {["searching", "requested", "accepted", "driver_assigned", "arriving", "started", "in_ride", "completed", "cancelled", "no_drivers"].map((s) => (
                      <Button
                        key={s}
                        size="sm"
                        variant={currentRide.status === s ? "default" : "outline"}
                        aria-label={`Set ride status ${s}`}
                        onClick={async () => {
                          try {
                            await apiRequest("PATCH", `/api/admin/taxi/rides/${currentRide.id}/status`, { status: s });
                            queryClient.invalidateQueries({ queryKey: ["/api/admin/taxi/rides"] });
                            toast({ title: "Status updated" });
                          } catch (e: any) {
                            toast({ title: "Update failed", description: e?.message || "Error", variant: "destructive" });
                          }
                        }}
                      >
                        {s.replace(/_/g, " ")}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
              {currentRide && currentRide.assignmentHistory && currentRide.assignmentHistory.length > 0 && (
                <div>
                  <Label>Assignment History</Label>
                  <div className="space-y-2 mt-2">
                    {currentRide.assignmentHistory.map((h:any, idx:number) => (
                      <div key={idx} className="p-2 border rounded flex items-center justify-between">
                        <div className="text-sm">
                          <div>From: {h.previousDriver || '—'}</div>
                          <div>To: {h.reassignedDriver}</div>
                          <div className="text-xs text-gray-500">{new Date(h.timestamp).toLocaleString()}</div>
                        </div>
                        <div className="text-xs text-gray-600">{h.assignedByAdmin ? 'By Admin' : 'Auto'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end"><Button variant="ghost" onClick={()=>setAssignDrawerOpen(false)}>Close</Button></div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </AdminLayout>
  );
}
