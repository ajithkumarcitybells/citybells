import React, { useEffect, useState, useRef } from 'react';
import { io as socketClient } from 'socket.io-client';

type EtaState = {
  driverArrivalMinutes?: number;
  tripSeconds?: number;
  distanceMeters?: number;
  arrival?: string | Date;
};

export default function ETAWidget({ rideId, driver, pickup, dest }: any) {
  const [eta, setEta] = useState<EtaState>({});
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // initial calculate via API
    async function calc() {
      try {
        const r = await fetch('/api/eta/calculate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ driver, pickup, dest }) });
        if (!r.ok) return;
        const j = await r.json();
        const out: any = {};
        if (j.driverArrival) out.driverArrivalMinutes = j.driverArrival.humanMinutes;
        if (j.trip) { out.tripSeconds = j.trip.seconds; out.distanceMeters = j.trip.distanceMeters; out.arrival = j.trip.arrival; }
        setEta(out);
      } catch (e) {
        // ignore
      }
    }
    calc();

    // socket for live updates
    socketRef.current = socketClient(undefined as any, { transports: ['websocket'], autoConnect: true });
    socketRef.current.on('eta_update', (data: any) => {
      if (data.rideId && rideId && data.rideId !== rideId) return;
      if (data.eta) {
        setEta({ tripSeconds: data.eta.seconds, distanceMeters: data.eta.distanceMeters, arrival: data.eta.arrival });
      }
    });

    return () => {
      try { socketRef.current?.disconnect(); } catch (e) {}
    };
  }, [rideId, driver?.lat, driver?.lon, pickup?.lat, pickup?.lon, dest?.lat, dest?.lon]);

  return (
    <div className="p-3 border rounded bg-white shadow-sm">
      <div className="text-sm text-gray-600">Driver arriving in</div>
      <div className="text-2xl font-semibold">{eta.driverArrivalMinutes ?? '—'} mins</div>
      <div className="mt-2 text-sm">Trip ETA: {eta.tripSeconds ? Math.round(eta.tripSeconds / 60) + ' mins' : '—'}</div>
      <div className="text-sm">Distance left: {eta.distanceMeters ? (eta.distanceMeters/1000).toFixed(1) + ' km' : '—'}</div>
      <div className="text-xs text-gray-500">Arrival: {eta.arrival ? (new Date(eta.arrival as any)).toLocaleTimeString() : '—'}</div>
    </div>
  );
}
