import React, { useState, useEffect, useRef } from "react";
import { useLoadScript, GoogleMap, MarkerF, InfoWindowF } from "@react-google-maps/api";
import { useSocketEvents } from "../hooks/use-socket-events";
import { useAuth } from "../hooks/use-auth";
import RideSummary from "../components/RideSummary";

interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

interface RideData {
  rideId: string;
  userId: string;
  driverId?: string;
  status: string;
  pickupLat: number;
  pickupLng: number;
  dropLat: number;
  dropLng: number;
  fare: number;
  distance: number;
  durationSec: number;
  driverName?: string;
  vehicleNumber?: string;
  driverRating?: number;
  driverPhoto?: string;
  acceptedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export default function LiveTrackingPage({ rideId }: { rideId: string }) {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const { isLoaded } = useLoadScript({ googleMapsApiKey: apiKey || "" });
  const { user } = useAuth();

  const socketEvents = useSocketEvents();
  const mapRef = useRef<any>(null);

  const [ride, setRide] = useState<RideData | null>(null);
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [eta, setEta] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Searching for driver...");
  const [selectedInfoWindow, setSelectedInfoWindow] = useState<"driver" | "pickup" | "drop" | null>(null);
  const locationUpdateIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Join ride on mount
  useEffect(() => {
    if (socketEvents.isConnected && user && rideId) {
      socketEvents.joinRide(rideId, (user as any)?._id || (user as any)?.id || "", "user");
    }
  }, [socketEvents.isConnected, user, rideId]);

  // Listen for driver location updates
  useEffect(() => {
    const unsubscribe = socketEvents.on("driver_location_update", (data: any) => {
      setDriverLocation({ lat: data.lat, lng: data.lng, heading: data.heading, speed: data.speed });

      // Update map to show driver
      if (mapRef.current && ride) {
        const bounds = new window.google.maps.LatLngBounds();
        bounds.extend({ lat: ride.pickupLat, lng: ride.pickupLng });
        bounds.extend({ lat: ride.dropLat, lng: ride.dropLng });
        if (data.lat && data.lng) {
          bounds.extend({ lat: data.lat, lng: data.lng });
        }
        mapRef.current.fitBounds(bounds);
      }
    });

    return () => unsubscribe?.();
  }, [socketEvents, ride]);

  // Listen for ride accepted
  useEffect(() => {
    const unsubscribe = socketEvents.on("ride_accepted", (data: any) => {
      setRide((prev) => (prev ? { ...prev, status: "driver_accepted", driverId: data.driverId, acceptedAt: new Date(data.acceptedAt) } : null));
      setStatusMessage(`${data.driverId || "Driver"} accepted your ride. Coming to pick you up...`);
    });

    return () => unsubscribe?.();
  }, [socketEvents]);

  // Listen for ride started
  useEffect(() => {
    const unsubscribe = socketEvents.on("ride_started", (data: any) => {
      setRide((prev) => (prev ? { ...prev, status: "ongoing", startedAt: new Date(data.startTime) } : null));
      setStatusMessage("Trip started. Heading to destination...");
    });

    return () => unsubscribe?.();
  }, [socketEvents]);

  // Listen for ride completed
  useEffect(() => {
    const unsubscribe = socketEvents.on("ride_completed", (data: any) => {
      setRide((prev) =>
        prev
          ? {
              ...prev,
              status: "completed",
              completedAt: new Date(data.endTime),
              distance: data.actualDistance,
              durationSec: data.actualDuration,
              fare: data.actualFare,
            }
          : null
      );
      setStatusMessage("Ride completed! Please rate your experience.");
    });

    return () => unsubscribe?.();
  }, [socketEvents]);

  // Listen for ride cancelled
  useEffect(() => {
    const unsubscribe = socketEvents.on("ride_cancelled", (data: any) => {
      setRide((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      setStatusMessage(`Ride cancelled - ${data.reason || "by user"}`);
    });

    return () => unsubscribe?.();
  }, [socketEvents]);

  // Calculate ETA
  useEffect(() => {
    if (driverLocation && ride && window.google) {
      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: { lat: driverLocation.lat, lng: driverLocation.lng },
          destination: { lat: ride.pickupLat, lng: ride.pickupLng },
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result?.routes?.[0]?.legs?.[0]) {
            const durationSec = result.routes[0].legs[0].duration?.value;
            if (typeof durationSec === "number") setEta(durationSec);
          }
        }
      );
    }
  }, [driverLocation, ride]);

  const handleCancelRide = () => {
    if (ride && window.confirm("Are you sure you want to cancel this ride?")) {
      socketEvents.cancelRide(rideId, (user as any)?._id || (user as any)?.id || "", "User requested cancellation");
    }
  };

  const handleSOS = () => {
    alert("Emergency alert sent to driver and admin support");
    // In production, trigger actual emergency protocol
  };

  const formatDuration = (seconds: number | null) => {
    if (seconds === null) return "...";
    const mins = Math.floor(seconds / 60);
    return `${mins} min`;
  };

  if (!isLoaded || !ride) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="mb-4 text-2xl">📍</div>
          <p className="text-lg mb-2">Loading ride details...</p>
          <p className="text-sm text-muted">{statusMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-screen md:h-auto">
      {/* Map */}
      <div className="md:col-span-2 h-96 md:h-screen">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={ride.pickupLat ? { lat: ride.pickupLat, lng: ride.pickupLng } : { lat: 0, lng: 0 }}
          zoom={13}
          onLoad={(map) => { mapRef.current = map; }}
        >
          {/* Pickup marker */}
          <MarkerF position={{ lat: ride.pickupLat, lng: ride.pickupLng }} title="Pickup">
            {selectedInfoWindow === "pickup" && (
              <InfoWindowF>
                <div>
                  <h3 className="font-semibold">Pickup Location</h3>
                  <p className="text-sm">{ride.pickupLat.toFixed(4)}, {ride.pickupLng.toFixed(4)}</p>
                </div>
              </InfoWindowF>
            )}
          </MarkerF>

          {/* Drop marker */}
          <MarkerF position={{ lat: ride.dropLat, lng: ride.dropLng }} title="Drop">
            {selectedInfoWindow === "drop" && (
              <InfoWindowF>
                <div>
                  <h3 className="font-semibold">Drop Location</h3>
                  <p className="text-sm">{ride.dropLat.toFixed(4)}, {ride.dropLng.toFixed(4)}</p>
                </div>
              </InfoWindowF>
            )}
          </MarkerF>

          {/* Driver marker */}
            {driverLocation && (
              <MarkerF position={driverLocation} title="Driver">
                {selectedInfoWindow === "driver" && (
                  <InfoWindowF>
                    <div>
                      <h3 className="font-semibold">{ride.driverName || "Driver"}</h3>
                      <p className="text-sm">{ride.vehicleNumber || "Vehicle"}</p>
                      <p className="text-xs">⭐ {ride.driverRating || "N/A"}/5</p>
                    </div>
                  </InfoWindowF>
                )}
              </MarkerF>
            )}
        </GoogleMap>
      </div>

      {/* Sidebar */}
      <div className="md:col-span-1 p-4 space-y-4 overflow-y-auto">
        {/* Status */}
        <div className="p-4 rounded-lg border bg-white">
          <h2 className="text-lg font-semibold mb-2">{statusMessage}</h2>
          <div className="text-sm text-muted space-y-1">
            <p>Status: <span className="capitalize font-medium">{ride.status}</span></p>
            <p>Distance: {(ride.distance / 1000).toFixed(2)} km</p>
            <p>ETA: {formatDuration(eta)}</p>
          </div>
        </div>

        {/* Driver Info */}
        {ride.status !== "pending" && ride.status !== "searching_driver" && (
          <div className="p-4 rounded-lg border bg-white">
            <h3 className="font-semibold mb-3">Driver Details</h3>
            <div className="space-y-2">
              {ride.driverPhoto && <img src={ride.driverPhoto} alt="Driver" className="w-12 h-12 rounded-full" />}
              <p className="font-medium">{ride.driverName || "Driver Name"}</p>
              <p className="text-sm text-muted">{ride.vehicleNumber || "Vehicle"}</p>
              <div className="flex items-center gap-1">
                <span>⭐</span>
                <span className="text-sm">{ride.driverRating || "N/A"}/5.0</span>
              </div>
            </div>
          </div>
        )}

        {/* Fare Summary */}
        <div className="p-4 rounded-lg border bg-white">
          <p className="text-sm text-muted mb-2">Estimated Fare</p>
          <p className="text-2xl font-bold">${ride.fare.toFixed(2)}</p>
          <p className="text-xs text-muted mt-2">{ride.distance}m • {Math.ceil(ride.durationSec / 60)} mins</p>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          <button
            className="w-full px-4 py-2 rounded bg-red-500 text-white hover:bg-red-600 transition"
            onClick={handleSOS}
          >
            🚨 SOS - Emergency
          </button>
          {ride.status !== "completed" && ride.status !== "cancelled" && (
            <button className="w-full px-4 py-2 rounded border border-gray-300 hover:bg-gray-50 transition">
              💬 Chat Driver
            </button>
          )}
          {ride.status !== "completed" && ride.status !== "cancelled" && (
            <button className="w-full px-4 py-2 rounded border border-red-500 text-red-500 hover:bg-red-50 transition" onClick={handleCancelRide}>
              Cancel Ride
            </button>
          )}
          {ride.status === "completed" && (
            <button className="w-full px-4 py-2 rounded bg-primary text-white hover:bg-primary/90 transition">
              Rate Ride
            </button>
          )}
        </div>

        {/* Trip Details */}
        <div className="p-4 rounded-lg border bg-gray-50">
          <h4 className="font-semibold mb-2">Trip Details</h4>
          <div className="text-sm space-y-1">
            <p>Ride ID: {rideId.substring(0, 8)}...</p>
            <p>Payment: {ride.fare}</p>
            {ride.acceptedAt && <p>Accepted: {new Date(ride.acceptedAt).toLocaleTimeString()}</p>}
            {ride.startedAt && <p>Started: {new Date(ride.startedAt).toLocaleTimeString()}</p>}
            {ride.completedAt && <p>Completed: {new Date(ride.completedAt).toLocaleTimeString()}</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
