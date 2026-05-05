import React from "react";

interface Props {
  distanceMeters: number;
  durationSec: number;
  onConfirm: () => void;
  onUseCurrentLocation?: () => void;
  confirmDisabled?: boolean;
}

function formatDistance(m: number) {
  if (m >= 1000) return `${(m / 1000).toFixed(2)} km`;
  return `${Math.round(m)} m`;
}

function formatDuration(s: number) {
  if (s >= 3600) return `${Math.floor(s / 3600)} h ${Math.round((s % 3600) / 60)} m`;
  if (s >= 60) return `${Math.round(s / 60)} min`;
  return `${Math.round(s)} sec`;
}

export default function RideSummary({
  distanceMeters,
  durationSec,
  onConfirm,
  onUseCurrentLocation,
  confirmDisabled,
}: Props) {
  const km = distanceMeters / 1000;
  const baseFare = 40;
  const perKm = 12;
  const fare = Math.max(59, baseFare + perKm * km);

  return (
    <div className="p-3 border rounded bg-white">
      <div className="mb-2">
        <div className="text-sm text-muted">Distance</div>
        <div className="font-medium">{formatDistance(distanceMeters)}</div>
      </div>

      <div className="mb-2">
        <div className="text-sm text-muted">Estimated time</div>
        <div className="font-medium">{formatDuration(durationSec)}</div>
      </div>

      <div className="mb-3">
        <div className="text-sm text-muted">Fare estimate</div>
        <div className="text-lg font-semibold">₹{fare.toFixed(0)}</div>
      </div>

      <div className="flex gap-2">
        <button className="flex-1 px-3 py-2 rounded border" onClick={onUseCurrentLocation}>
          Use Current Location
        </button>
        <button
          className="flex-1 px-3 py-2 rounded bg-primary text-white disabled:opacity-50"
          onClick={onConfirm}
          disabled={confirmDisabled}
        >
          Confirm Ride
        </button>
      </div>
    </div>
  );
}
