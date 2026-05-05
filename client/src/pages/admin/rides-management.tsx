import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Clock, DollarSign, X } from "lucide-react";

interface Ride {
  _id: string;
  status: string;
  pickupAddress: string;
  dropAddress: string;
  fare: number;
  actualFare?: number;
  user?: { name: string; phone: string };
  driver?: { name: string; phone: string };
  createdAt: string;
  startTime?: string;
  endTime?: string;
}

interface RidesData {
  rides: Ride[];
  totalCount: number;
}

export default function RidesManagement() {
  const { user } = useAuth();
  const [rides, setRides] = useState<Ride[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);

  const limit = 20;

  // Fetch rides
  useEffect(() => {
    const fetchRides = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          status: statusFilter,
          limit: limit.toString(),
          skip: skip.toString(),
        });
        const res = await fetch(`/api/admin/rides?${query}`);
        if (!res.ok) throw new Error("Failed to fetch rides");
        const data: RidesData = await res.json();
        setRides(data.rides);
        setTotalCount(data.totalCount);
      } catch (err) {
        console.error("Error fetching rides:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchRides();
  }, [user, statusFilter, skip]);

  // Cancel ride
  const handleCancelRide = useCallback(
    async (ride: Ride) => {
      const reason = prompt("Enter cancellation reason:");
      if (!reason) return;

      try {
        const res = await fetch(`/api/admin/rides/${ride._id}/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });

        if (!res.ok) throw new Error("Failed to cancel ride");

        setRides((prev) => prev.map((r) => (r._id === ride._id ? { ...r, status: "cancelled" } : r)));
        setSelectedRide(null);
        alert("Ride cancelled successfully");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to cancel ride");
      }
    },
    []
  );

  // Assign driver
  const handleAssignDriver = useCallback(
    async (ride: Ride) => {
      const driverId = prompt("Enter driver ID:");
      if (!driverId) return;

      try {
        const res = await fetch(`/api/admin/rides/${ride._id}/assign`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ driverId }),
        });

        if (!res.ok) throw new Error("Failed to assign driver");

        setRides((prev) => prev.map((r) => (r._id === ride._id ? { ...r, status: "accepted" } : r)));
        setSelectedRide(null);
        alert("Driver assigned successfully");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to assign driver");
      }
    },
    []
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      case "ongoing":
        return "bg-blue-100 text-blue-800";
      case "accepted":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-4">Rides Management</h1>

          {/* Status Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "accepted", "ongoing", "completed", "cancelled"].map((status) => (
              <Button
                key={status}
                onClick={() => {
                  setStatusFilter(status);
                  setSkip(0);
                }}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {loading ? (
          <Card className="p-12 text-center">Loading...</Card>
        ) : rides.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">No rides found</Card>
        ) : (
          <>
            {/* Rides Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">ID</th>
                    <th className="px-4 py-3 text-left font-semibold">Passenger</th>
                    <th className="px-4 py-3 text-left font-semibold">Driver</th>
                    <th className="px-4 py-3 text-left font-semibold">Route</th>
                    <th className="px-4 py-3 text-left font-semibold">Fare</th>
                    <th className="px-4 py-3 text-left font-semibold">Status</th>
                    <th className="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rides.map((ride) => (
                    <tr key={ride._id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-500">{ride._id.substring(0, 8)}...</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-semibold text-sm">{ride.user?.name}</p>
                          <p className="text-xs text-gray-500">{ride.user?.phone}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {ride.driver ? (
                          <div>
                            <p className="font-semibold text-sm">{ride.driver.name}</p>
                            <p className="text-xs text-gray-500">{ride.driver.phone}</p>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-500">No driver</span>
                        )}
                      </td>
                      <td className="px-4 py-3 max-w-xs">
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-1">
                            <span className="text-green-600">↓</span>
                            <span className="line-clamp-1">{ride.pickupAddress}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-red-600">↓</span>
                            <span className="line-clamp-1">{ride.dropAddress}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        ₹{(ride.actualFare || ride.fare).toFixed(0)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={getStatusColor(ride.status)}>
                          {ride.status.charAt(0).toUpperCase() + ride.status.slice(1)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          onClick={() => setSelectedRide(ride)}
                          variant="outline"
                          size="sm"
                        >
                          Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center mt-6">
              <p className="text-sm text-gray-600">
                Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount} rides
              </p>
              <div className="flex gap-2">
                <Button
                  onClick={() => setSkip(Math.max(0, skip - limit))}
                  disabled={skip === 0}
                  variant="outline"
                >
                  Previous
                </Button>
                <Button
                  onClick={() => setSkip(skip + limit)}
                  disabled={skip + limit >= totalCount}
                  variant="outline"
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Ride Details Modal */}
      {selectedRide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Ride Details</h2>
              <button
                onClick={() => setSelectedRide(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Passenger Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 mb-2">PASSENGER</h3>
                <p className="font-semibold">{selectedRide.user?.name}</p>
                <p className="text-sm text-gray-600">{selectedRide.user?.phone}</p>
              </div>

              {/* Driver Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 mb-2">DRIVER</h3>
                {selectedRide.driver ? (
                  <>
                    <p className="font-semibold">{selectedRide.driver.name}</p>
                    <p className="text-sm text-gray-600">{selectedRide.driver.phone}</p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">No driver assigned</p>
                )}
              </div>

              {/* Route */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 mb-2">ROUTE</h3>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0" />
                    <span className="text-sm">{selectedRide.pickupAddress}</span>
                  </div>
                  <div className="flex gap-2">
                    <MapPin className="w-4 h-4 text-red-600 flex-shrink-0" />
                    <span className="text-sm">{selectedRide.dropAddress}</span>
                  </div>
                </div>
              </div>

              {/* Fare */}
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded">
                <span className="text-gray-600">Fare</span>
                <span className="font-bold text-lg">₹{(selectedRide.actualFare || selectedRide.fare).toFixed(0)}</span>
              </div>

              {/* Status */}
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Status</span>
                <Badge className={getStatusColor(selectedRide.status)}>
                  {selectedRide.status.toUpperCase()}
                </Badge>
              </div>

              {/* Timestamps */}
              <div className="text-xs text-gray-500 space-y-1">
                <p>Created: {new Date(selectedRide.createdAt).toLocaleString()}</p>
                {selectedRide.startTime && (
                  <p>Started: {new Date(selectedRide.startTime).toLocaleString()}</p>
                )}
                {selectedRide.endTime && (
                  <p>Ended: {new Date(selectedRide.endTime).toLocaleString()}</p>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                {selectedRide.status === "pending" && !selectedRide.driver && (
                  <Button
                    onClick={() => handleAssignDriver(selectedRide)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    Assign Driver
                  </Button>
                )}
                {!["completed", "cancelled"].includes(selectedRide.status) && (
                  <Button
                    onClick={() => handleCancelRide(selectedRide)}
                    variant="destructive"
                    className="flex-1"
                  >
                    Cancel Ride
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
