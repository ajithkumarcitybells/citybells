import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Car } from "lucide-react";
import { AdminLayout } from "./index";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const rideStatusColors: Record<string, string> = {
  searching: "bg-yellow-100 text-yellow-800",
  driver_assigned: "bg-blue-100 text-blue-800",
  arriving: "bg-cyan-100 text-cyan-800",
  in_ride: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const tabs = ["Vehicle Types", "Rides", "Drivers"] as const;
type Tab = (typeof tabs)[number];

export default function AdminTaxiPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Vehicle Types");

  const { data: vehicleTypes, isLoading: loadingTypes } = useQuery<any[]>({
    queryKey: ["/api/admin/taxi/vehicle-types"],
  });

  const { data: rides, isLoading: loadingRides } = useQuery<any[]>({
    queryKey: ["/api/admin/taxi/rides"],
  });

  const { data: drivers, isLoading: loadingDrivers } = useQuery<any[]>({
    queryKey: ["/api/admin/taxi/drivers"],
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Car className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-taxi-title">
            Taxi Management
          </h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover-elevate"
              }`}
              data-testid={`tab-${tab.toLowerCase().replace(/\s+/g, "-")}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "Vehicle Types" && (
          <div data-testid="section-vehicle-types">
            {loadingTypes ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-5">
                      <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
                      <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-24 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : vehicleTypes && vehicleTypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleTypes.map((vt: any) => (
                  <Card key={vt.id} data-testid={`card-vehicle-type-${vt.id}`}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg" data-testid={`text-vehicle-name-${vt.id}`}>
                        {vt.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      {vt.description && (
                        <p className="text-gray-500" data-testid={`text-vehicle-desc-${vt.id}`}>
                          {vt.description}
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div>
                          <span className="text-gray-500">Base Fare</span>
                          <p className="font-semibold" data-testid={`text-base-fare-${vt.id}`}>
                            ₹{vt.baseFare}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Per km</span>
                          <p className="font-semibold" data-testid={`text-per-km-${vt.id}`}>
                            ₹{vt.perKmRate}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Per min</span>
                          <p className="font-semibold" data-testid={`text-per-min-${vt.id}`}>
                            ₹{vt.perMinRate}
                          </p>
                        </div>
                        <div>
                          <span className="text-gray-500">Capacity</span>
                          <p className="font-semibold" data-testid={`text-capacity-${vt.id}`}>
                            {vt.capacity}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <Car className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No vehicle types found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Rides" && (
          <div data-testid="section-rides">
            {loadingRides ? (
              <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ) : rides && rides.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-rides">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Ride ID</th>
                      <th className="px-5 py-3 font-medium">Pickup</th>
                      <th className="px-5 py-3 font-medium">Drop</th>
                      <th className="px-5 py-3 font-medium">Est. Fare</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rides.map((ride: any) => (
                      <tr
                        key={ride.id}
                        className="border-b border-gray-50 last:border-0"
                        data-testid={`row-ride-${ride.id}`}
                      >
                        <td className="px-5 py-3 font-mono text-gray-700" data-testid={`text-ride-id-${ride.id}`}>
                          {ride.id?.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-ride-pickup-${ride.id}`}>
                          {ride.pickupAddress || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-ride-drop-${ride.id}`}>
                          {ride.dropAddress || "N/A"}
                        </td>
                        <td className="px-5 py-3 font-medium" data-testid={`text-ride-fare-${ride.id}`}>
                          {ride.estimatedFare ? `₹${ride.estimatedFare}` : "N/A"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`${rideStatusColors[ride.status] || "bg-gray-100 text-gray-800"} no-default-hover-elevate no-default-active-elevate`}
                            data-testid={`badge-ride-status-${ride.id}`}
                          >
                            {(ride.status || "unknown").replace(/_/g, " ")}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-gray-500" data-testid={`text-ride-date-${ride.id}`}>
                          {ride.createdAt
                            ? new Date(ride.createdAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <Car className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No rides found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Drivers" && (
          <div data-testid="section-drivers">
            {loadingDrivers ? (
              <div className="bg-white rounded-xl border border-gray-100 p-6 animate-pulse">
                <div className="h-6 w-40 bg-gray-200 rounded mb-4" />
                <div className="space-y-3">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-10 bg-gray-100 rounded" />
                  ))}
                </div>
              </div>
            ) : drivers && drivers.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-drivers">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Phone</th>
                      <th className="px-5 py-3 font-medium">Vehicle Number</th>
                      <th className="px-5 py-3 font-medium">License</th>
                      <th className="px-5 py-3 font-medium">Online</th>
                      <th className="px-5 py-3 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver: any) => (
                      <tr
                        key={driver.id}
                        className="border-b border-gray-50 last:border-0"
                        data-testid={`row-driver-${driver.id}`}
                      >
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-driver-name-${driver.id}`}>
                          {driver.name || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-driver-phone-${driver.id}`}>
                          {driver.phone || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-driver-vehicle-${driver.id}`}>
                          {driver.vehicleNumber || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-driver-license-${driver.id}`}>
                          {driver.licenseNumber || "N/A"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`${
                              driver.isOnline
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-600"
                            } no-default-hover-elevate no-default-active-elevate`}
                            data-testid={`badge-driver-online-${driver.id}`}
                          >
                            {driver.isOnline ? "Online" : "Offline"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-driver-rating-${driver.id}`}>
                          {driver.rating ?? "N/A"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-400 py-10">
                <Car className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No drivers found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
