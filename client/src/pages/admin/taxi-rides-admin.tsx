import React, { useEffect, useMemo, useState } from "react";
import useAdminTaxi from "../../hooks/use-admin-taxi";
import useTaxiSocket from "../../hooks/use-taxi-socket";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// intentionally no local joinAdmin — use the one from `useTaxiSocket()` below

export default function TaxiRidesAdminPage() {
  const { rides, drivers, fetchRides, assignDriver, setRides, setDrivers } = useAdminTaxi();
  const { connected, lastDriverLocation, lastRideUpdate, joinAdmin } = useTaxiSocket();

  console.log("RENDER");

useEffect(() => {
  joinAdmin();
}, []); // run only once on mount

  // integrate realtime updates
  useEffect(() => {
    if (!lastRideUpdate) return;
    // replace or add
    setRides((rs) => {
      const idx = rs.findIndex(r => r._id === lastRideUpdate._id);
      if (idx >= 0) {
        const existing = rs[idx];
        // avoid unnecessary updates if nothing changed
        try {
          if (existing && existing._id === lastRideUpdate._id && existing.status === lastRideUpdate.status && JSON.stringify(existing) === JSON.stringify(lastRideUpdate)) {
            return rs;
          }
        } catch (e) {}
        const copy = [...rs]; copy[idx] = lastRideUpdate; return copy;
      }
      return [lastRideUpdate, ...rs];
    });
  }, [lastRideUpdate, setRides]);

  useEffect(() => {
    if (!lastDriverLocation) return;
    setDrivers((ds) => {
      const idx = ds.findIndex(d => d._id === lastDriverLocation.driverId || d.id === lastDriverLocation.driverId || d.userId === lastDriverLocation.driverId);
      if (idx >= 0) {
        const existing = ds[idx];
        if (existing && existing.currentLat === lastDriverLocation.lat && existing.currentLng === lastDriverLocation.lng) {
          return ds;
        }
        const copy = [...ds]; copy[idx] = { ...copy[idx], currentLat: lastDriverLocation.lat, currentLng: lastDriverLocation.lng }; return copy;
      }
      return ds;
    });
  }, [lastDriverLocation, setDrivers]);

  const [selectedDriver, setSelectedDriver] = useState<string | null>(null);

  const mapCenter = useMemo(() => {
    // center on first ride pickup or first driver
    const r = rides[0];
    if (r && r.pickupLat && r.pickupLng) return [parseFloat(r.pickupLat), parseFloat(r.pickupLng)];
    const d = drivers.find(x => x.currentLat && x.currentLng);
    if (d) return [parseFloat(d.currentLat), parseFloat(d.currentLng)];
    return [20.5937, 78.9629]; // fallback center (India)
  }, [rides, drivers]);

  return (
    <div className="p-4">
      <h2 className="text-2xl mb-4">Admin: Taxi Rides (Realtime)</h2>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="mb-2">Socket: {connected ? 'connected' : 'disconnected'}</div>
          <div className="space-y-3">
            {rides.map(r => (
              <div key={r._id} className="p-3 border rounded">
                <div className="font-medium">Ride: {r._id} — {r.status}</div>
                <div>Pickup: {r.pickupAddress} {r.pickupLat && r.pickupLng ? `(${r.pickupLat},${r.pickupLng})` : ''}</div>
                <div>Driver: {r.driverName || '—'}</div>
                <div className="mt-2">
                  <select onChange={(e) => setSelectedDriver(e.target.value)} value={selectedDriver || ''} className="border p-1 mr-2">
                    <option value="">Select driver</option>
                    {drivers.map(d => (<option key={d._id} value={d._id}>{d.name} ({d.vehicleNumber})</option>))}
                  </select>
                  <button className="btn" onClick={async () => { if (!selectedDriver) return alert('Pick a driver'); try { await assignDriver(r._id, selectedDriver!); alert('Assigned'); } catch (e) { alert('Assign failed'); } }}>Assign</button>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <MapContainer center={mapCenter as any} zoom={12} style={{ height: 500 }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {drivers.map(d => (d.currentLat && d.currentLng) ? (
              <Marker key={d._id} position={[parseFloat(d.currentLat), parseFloat(d.currentLng)] as any}>
                <Popup>{d.name} — {d.vehicleNumber}</Popup>
              </Marker>
            ) : null)}
            {rides.map(r => (r.pickupLat && r.pickupLng) ? (
              <Marker key={`p-${r._id}`} position={[parseFloat(r.pickupLat), parseFloat(r.pickupLng)] as any}>
                <Popup>Pickup: {r.pickupAddress}</Popup>
              </Marker>
            ) : null)}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}
