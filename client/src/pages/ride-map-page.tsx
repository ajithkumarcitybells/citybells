import React, { useMemo, useState } from "react";
import MapComponent from "../components/MapComponent";
import LocationSearchInput from "../components/LocationSearchInput";
import RideSummary from "../components/RideSummary";

type LatLng = { lat: number; lng: number } | null;

export default function RideMapPage() {
  const [pickup, setPickup] = useState<LatLng>(null);
  const [drop, setDrop] = useState<LatLng>(null);
  const [pickupAddress, setPickupAddress] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [mapTheme, setMapTheme] = useState<"light" | "dark">("light");
  const [driverSim, setDriverSim] = useState(true);

  const onRoute = (distance: number, duration: number) => {
    setDistanceMeters(distance);
    setDurationSec(duration);
  };

  async function useCurrentLocation() {
    if (!navigator.geolocation) return alert("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setPickup(coords);
        // reverse geocode (Google when available, else fallback)
        try {
          if ((window as any)?.google?.maps?.Geocoder) {
            const geocoder = new (window as any).google.maps.Geocoder();
            geocoder.geocode({ location: coords }, (results: any, status: any) => {
              if (status === "OK" && results?.[0]) setPickupAddress(results[0].formatted_address || "");
              else setPickupAddress("");
            });
          } else {
            const r = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.lat}&lon=${coords.lng}`,
            );
            const j = await r.json();
            setPickupAddress(j.display_name || "");
          }
        } catch {
          setPickupAddress("");
        }
      },
      (err) => {
        alert("Geolocation error: " + err.message);
      }
    );
  }

  async function confirmRide() {
    const payload = {
      pickup: { coords: pickup, address: pickupAddress },
      drop: { coords: drop, address: dropAddress },
      distanceMeters,
      durationSec,
      fare: calculateFare(distanceMeters, durationSec),
    };

    try {
      // Optional: post to your backend
      await fetch("/api/rides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      alert("Ride confirmed (saved to server if endpoint registered)");
    } catch (e) {
      alert("Ride confirmed locally (server unavailable)");
    }
  }

  function calculateFare(distanceMeters: number, durationSec: number) {
    const km = distanceMeters / 1000;
    const base = 40; // simple estimate (₹)
    const perKm = 12;
    return Math.max(59, base + perKm * km);
  }

  const canConfirm = useMemo(() => !!pickup && !!drop && distanceMeters > 0, [pickup, drop, distanceMeters]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h2 className="text-xl font-semibold">Book a Ride</h2>
        <div className="flex items-center gap-2">
          <button
            className="px-3 py-2 rounded border text-sm"
            onClick={() => setMapTheme((t) => (t === "light" ? "dark" : "light"))}
          >
            {mapTheme === "light" ? "Dark map" : "Light map"}
          </button>
          <button
            className={`px-3 py-2 rounded border text-sm ${driverSim ? "bg-muted" : ""}`}
            onClick={() => setDriverSim((v) => !v)}
          >
            Driver sim
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1 space-y-3">
          <div>
            <label className="block text-sm text-muted">Pickup Location</label>
            <LocationSearchInput
              value={pickupAddress}
              placeholder="Search pickup"
              onSelect={(coords, name) => {
                setPickup(coords);
                setPickupAddress(name);
              }}
            />
          </div>

          <div>
            <label className="block text-sm text-muted">Drop Location</label>
            <LocationSearchInput
              value={dropAddress}
              placeholder="Search drop"
              onSelect={(coords, name) => {
                setDrop(coords);
                setDropAddress(name);
              }}
            />
          </div>

          <RideSummary
            distanceMeters={distanceMeters}
            durationSec={durationSec}
            onConfirm={confirmRide}
            onUseCurrentLocation={useCurrentLocation}
            confirmDisabled={!canConfirm}
          />
        </div>

        <div className="md:col-span-2">
          <MapComponent
            pickup={pickup}
            drop={drop}
            setPickup={setPickup}
            setDrop={setDrop}
            setPickupAddress={setPickupAddress}
            setDropAddress={setDropAddress}
            onRoute={onRoute}
            height="70vh"
            tileTheme={mapTheme}
            enableDriverSim={driverSim}
          />
        </div>
      </div>
    </div>
  );
}
