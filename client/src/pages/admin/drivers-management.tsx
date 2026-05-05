import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, Phone, MapPin, Truck, CheckCircle, XCircle, X } from "lucide-react";

interface Driver {
  _id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  approvalStatus: string;
  status: string;
  rating: number;
  totalRides: number;
  earnings: number;
  user?: { email: string };
  vehicle?: { type: string; registrationNumber: string; model: string };
  createdAt: string;
}

interface DriversData {
  drivers: Driver[];
  totalCount: number;
}

export default function DriversManagement() {
  const { user } = useAuth();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [approvalFilter, setApprovalFilter] = useState<string>("all");
  const [skip, setSkip] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);

  const limit = 20;

  // Fetch drivers
  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        setLoading(true);
        const query = new URLSearchParams({
          approvalStatus: approvalFilter,
          limit: limit.toString(),
          skip: skip.toString(),
        });
        const res = await fetch(`/api/admin/drivers?${query}`);
        if (!res.ok) throw new Error("Failed to fetch drivers");
        const data: DriversData = await res.json();
        setDrivers(data.drivers);
        setTotalCount(data.totalCount);
      } catch (err) {
        console.error("Error fetching drivers:", err);
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchDrivers();
  }, [user, approvalFilter, skip]);

  // Approve driver
  const handleApproveDriver = useCallback(
    async (driver: Driver) => {
      try {
        const res = await fetch(`/api/admin/drivers/${driver._id}/approve`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
        });

        if (!res.ok) throw new Error("Failed to approve driver");

        setDrivers((prev) =>
          prev.map((d) => (d._id === driver._id ? { ...d, approvalStatus: "approved" } : d))
        );
        setSelectedDriver(null);
        alert("Driver approved successfully");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to approve driver");
      }
    },
    []
  );

  // Suspend driver
  const handleSuspendDriver = useCallback(
    async (driver: Driver) => {
      const reason = prompt("Enter suspension reason:");
      if (!reason) return;

      try {
        const res = await fetch(`/api/admin/drivers/${driver._id}/suspend`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        });

        if (!res.ok) throw new Error("Failed to suspend driver");

        setDrivers((prev) =>
          prev.map((d) => (d._id === driver._id ? { ...d, approvalStatus: "suspended" } : d))
        );
        setSelectedDriver(null);
        alert("Driver suspended successfully");
      } catch (err) {
        alert(err instanceof Error ? err.message : "Failed to suspend driver");
      }
    },
    []
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      case "suspended":
        return "bg-orange-100 text-orange-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getOnlineStatusColor = (status: string) => {
    switch (status) {
      case "online":
        return "bg-green-100 text-green-800";
      case "offline":
        return "bg-gray-100 text-gray-800";
      case "on_ride":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold mb-4">Drivers Management</h1>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            {["all", "pending", "approved", "rejected", "suspended"].map((status) => (
              <Button
                key={status}
                onClick={() => {
                  setApprovalFilter(status);
                  setSkip(0);
                }}
                variant={approvalFilter === status ? "default" : "outline"}
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
        ) : drivers.length === 0 ? (
          <Card className="p-12 text-center text-gray-500">No drivers found</Card>
        ) : (
          <>
            {/* Drivers Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {drivers.map((driver) => (
                <Card
                  key={driver._id}
                  onClick={() => setSelectedDriver(driver)}
                  className="cursor-pointer hover:shadow-lg transition-shadow p-4"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-bold text-lg">{driver.name}</h3>
                      <p className="text-xs text-gray-500">{driver.licenseNumber}</p>
                    </div>
                    <Badge className={getStatusColor(driver.approvalStatus)}>
                      {driver.approvalStatus.charAt(0).toUpperCase() + driver.approvalStatus.slice(1)}
                    </Badge>
                  </div>

                  {/* Stats */}
                  <div className="space-y-2 text-sm mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-semibold">{driver.rating.toFixed(1)}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Trips</span>
                      <span className="font-semibold">{driver.totalRides}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Earnings</span>
                      <span className="font-semibold">₹{driver.earnings.toFixed(0)}</span>
                    </div>
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between pt-3 border-t">
                    <Badge variant="outline" className={getOnlineStatusColor(driver.status)}>
                      {driver.status.charAt(0).toUpperCase() + driver.status.slice(1)}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      View Details
                    </Button>
                  </div>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">
                Showing {skip + 1} to {Math.min(skip + limit, totalCount)} of {totalCount} drivers
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

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold">Driver Details</h2>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Personal Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 mb-2">PERSONAL INFO</h3>
                <p className="font-bold text-lg">{selectedDriver.name}</p>
                <p className="text-sm text-gray-600 flex items-center gap-1">
                  <Phone className="w-4 h-4" />
                  {selectedDriver.phone}
                </p>
                <p className="text-sm text-gray-600">{selectedDriver.user?.email}</p>
              </div>

              {/* License Info */}
              <div>
                <h3 className="font-semibold text-sm text-gray-500 mb-2">LICENSE</h3>
                <p className="text-sm font-mono">{selectedDriver.licenseNumber}</p>
              </div>

              {/* Vehicle Info */}
              {selectedDriver.vehicle && (
                <div>
                  <h3 className="font-semibold text-sm text-gray-500 mb-2">VEHICLE</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <span className="text-gray-600">Type:</span> {selectedDriver.vehicle.type}
                    </p>
                    <p>
                      <span className="text-gray-600">Model:</span> {selectedDriver.vehicle.model}
                    </p>
                    <p>
                      <span className="text-gray-600">Registration:</span>{" "}
                      {selectedDriver.vehicle.registrationNumber}
                    </p>
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-2 bg-gray-50 p-3 rounded">
                <div>
                  <p className="text-xs text-gray-600">Rating</p>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-bold">{selectedDriver.rating.toFixed(1)}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Trips</p>
                  <span className="font-bold text-lg">{selectedDriver.totalRides}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Earnings</p>
                  <span className="font-bold">₹{selectedDriver.earnings.toFixed(0)}</span>
                </div>
                <div>
                  <p className="text-xs text-gray-600">Status</p>
                  <Badge variant="outline" className={getOnlineStatusColor(selectedDriver.status)}>
                    {selectedDriver.status.charAt(0).toUpperCase() + selectedDriver.status.slice(1)}
                  </Badge>
                </div>
              </div>

              {/* Approval Status */}
              <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <span className="text-sm text-gray-600">Approval Status</span>
                <Badge className={getStatusColor(selectedDriver.approvalStatus)}>
                  {selectedDriver.approvalStatus.toUpperCase()}
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-2 pt-4">
                {selectedDriver.approvalStatus === "pending" && (
                  <Button
                    onClick={() => handleApproveDriver(selectedDriver)}
                    className="bg-green-600 hover:bg-green-700 w-full"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Approve Driver
                  </Button>
                )}
                {selectedDriver.approvalStatus !== "suspended" && (
                  <Button
                    onClick={() => handleSuspendDriver(selectedDriver)}
                    variant="destructive"
                    className="w-full"
                  >
                    <XCircle className="w-4 h-4 mr-2" />
                    Suspend Driver
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
