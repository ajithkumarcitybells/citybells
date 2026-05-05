import React, { useState } from "react";
import useTaxiSocket from "../hooks/use-taxi-socket";

export default function TaxiSocketDemo() {
  const { connected, lastDriverLocation, lastRideUpdate, joinRide, leaveRide, joinAdmin, sendDriverLocation } = useTaxiSocket();
  const [rideId, setRideId] = useState("");
  const [driverId, setDriverId] = useState("");
  const [lat, setLat] = useState(0);
  const [lng, setLng] = useState(0);

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="text-lg font-medium">Taxi Socket Demo</h3>
      <div className="mt-2">Status: {connected ? "connected" : "disconnected"}</div>

      <div className="mt-3">
        <input placeholder="Ride ID" value={rideId} onChange={(e) => setRideId(e.target.value)} className="border p-1 mr-2" />
        <button onClick={() => joinRide(rideId)} className="btn mr-2">Join Ride</button>
        <button onClick={() => leaveRide(rideId)} className="btn">Leave Ride</button>
      </div>

      <div className="mt-3">
        <button onClick={() => joinAdmin()} className="btn">Join Admin Feed</button>
      </div>

      <div className="mt-3">
        <input placeholder="Driver ID" value={driverId} onChange={(e) => setDriverId(e.target.value)} className="border p-1 mr-2" />
        <input type="number" placeholder="lat" value={lat} onChange={(e) => setLat(parseFloat(e.target.value) || 0)} className="border p-1 mr-2 w-28" />
        <input type="number" placeholder="lng" value={lng} onChange={(e) => setLng(parseFloat(e.target.value) || 0)} className="border p-1 mr-2 w-28" />
        <button onClick={() => sendDriverLocation({ driverId, lat, lng, rideId: rideId || undefined })} className="btn">Send Driver Location</button>
      </div>

      <div className="mt-3">
        <strong>Last Driver Location:</strong>
        <pre className="bg-gray-50 p-2 mt-1">{lastDriverLocation ? JSON.stringify(lastDriverLocation, null, 2) : "—"}</pre>
      </div>

      <div className="mt-3">
        <strong>Last Ride Update:</strong>
        <pre className="bg-gray-50 p-2 mt-1">{lastRideUpdate ? JSON.stringify(lastRideUpdate, null, 2) : "—"}</pre>
      </div>
    </div>
  );
}
