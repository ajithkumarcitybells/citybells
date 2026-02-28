import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Star } from "lucide-react";

interface VehicleType {
  id: string;
  name: string;
  description?: string;
  image?: string;
  basePrice: string;
  pricePerKm: string;
  capacity?: string;
  icon?: string;
}

interface MovingBooking {
  id: string;
  userId: string;
  vehicleTypeId: string;
  pickupAddress: string;
  dropAddress: string;
  scheduledDate?: string;
  scheduledTime?: string;
  estimatedPrice?: string;
  status: string;
  driverId?: string;
  createdAt?: string;
}

interface MovingDriver {
  id: string;
  userId: string;
  name: string;
  phone?: string;
  vehicleTypeId?: string;
  vehicleNumber?: string;
  isAvailable: boolean;
  rating?: string;
}

const tabs = ["Vehicle Types", "Bookings", "Drivers"] as const;
type Tab = typeof tabs[number];

const bookingStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  picked_up: "bg-orange-100 text-orange-800",
  in_transit: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminMovingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Vehicle Types");

  const { data: vehicleTypes, isLoading: loadingVehicles } = useQuery<VehicleType[]>({
    queryKey: ["/api/admin/moving/vehicle-types"],
  });

  const { data: bookings, isLoading: loadingBookings } = useQuery<MovingBooking[]>({
    queryKey: ["/api/admin/moving/bookings"],
  });

  const { data: drivers, isLoading: loadingDrivers } = useQuery<MovingDriver[]>({
    queryKey: ["/api/admin/moving/drivers"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    if (isNaN(num)) return "--";
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  const formatStatus = (status: string) =>
    status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="w-10 h-10 bg-orange-50 text-orange-700 rounded-lg flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800" data-testid="text-moving-title">City Moving Management</h1>
            <p className="text-gray-500 text-sm">Manage vehicle types, bookings, and drivers</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
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
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-800">Vehicle Types</h2>
              {vehicleTypes && (
                <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-vehicle-count">
                  {vehicleTypes.length}
                </Badge>
              )}
            </div>
            {loadingVehicles ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-5 animate-pulse">
                      <div className="h-5 w-32 bg-gray-200 rounded mb-3" />
                      <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-24 bg-gray-200 rounded mb-2" />
                      <div className="h-4 w-28 bg-gray-200 rounded" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : vehicleTypes && vehicleTypes.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicleTypes.map((vt) => (
                  <Card key={vt.id} data-testid={`card-vehicle-${vt.id}`}>
                    <CardContent className="p-5">
                      <h3 className="font-semibold text-gray-800 mb-2" data-testid={`text-vehicle-name-${vt.id}`}>{vt.name}</h3>
                      {vt.description && (
                        <p className="text-sm text-gray-500 mb-3" data-testid={`text-vehicle-desc-${vt.id}`}>{vt.description}</p>
                      )}
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Base Price</span>
                          <span className="font-medium text-gray-800" data-testid={`text-vehicle-base-price-${vt.id}`}>{formatCurrency(vt.basePrice)}</span>
                        </div>
                        <div className="flex justify-between gap-2">
                          <span className="text-gray-500">Price/km</span>
                          <span className="font-medium text-gray-800" data-testid={`text-vehicle-price-km-${vt.id}`}>{formatCurrency(vt.pricePerKm)}</span>
                        </div>
                        {vt.capacity && (
                          <div className="flex justify-between gap-2">
                            <span className="text-gray-500">Capacity</span>
                            <span className="font-medium text-gray-800" data-testid={`text-vehicle-capacity-${vt.id}`}>{vt.capacity}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No vehicle types found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Bookings" && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-800">Bookings</h2>
              {bookings && (
                <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-booking-count">
                  {bookings.length}
                </Badge>
              )}
            </div>
            {loadingBookings ? (
              <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded mb-2" />
                ))}
              </div>
            ) : bookings && bookings.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-moving-bookings">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Booking ID</th>
                      <th className="px-5 py-3 font-medium">Pickup</th>
                      <th className="px-5 py-3 font-medium">Drop</th>
                      <th className="px-5 py-3 font-medium">Vehicle Type</th>
                      <th className="px-5 py-3 font-medium">Price</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-50 last:border-0" data-testid={`row-booking-${booking.id}`}>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-booking-id-${booking.id}`}>
                          {booking.id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-gray-700 max-w-[200px] truncate" data-testid={`text-booking-pickup-${booking.id}`}>
                          {booking.pickupAddress}
                        </td>
                        <td className="px-5 py-3 text-gray-700 max-w-[200px] truncate" data-testid={`text-booking-drop-${booking.id}`}>
                          {booking.dropAddress}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-booking-vehicle-${booking.id}`}>
                          {booking.vehicleTypeId.slice(0, 8)}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-booking-price-${booking.id}`}>
                          {booking.estimatedPrice ? formatCurrency(booking.estimatedPrice) : "--"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`${bookingStatusColors[booking.status] || "bg-gray-100 text-gray-800"} no-default-hover-elevate no-default-active-elevate`}
                            data-testid={`badge-booking-status-${booking.id}`}
                          >
                            {formatStatus(booking.status)}
                          </Badge>
                        </td>
                        <td className="px-5 py-3 text-gray-500" data-testid={`text-booking-date-${booking.id}`}>
                          {booking.createdAt
                            ? new Date(booking.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                            : booking.scheduledDate || "--"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No bookings found</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "Drivers" && (
          <div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <h2 className="text-lg font-semibold text-gray-800">Drivers</h2>
              {drivers && (
                <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-driver-count">
                  {drivers.length}
                </Badge>
              )}
            </div>
            {loadingDrivers ? (
              <div className="bg-white rounded-xl border border-gray-100 p-5 animate-pulse">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded mb-2" />
                ))}
              </div>
            ) : drivers && drivers.length > 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-moving-drivers">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Phone</th>
                      <th className="px-5 py-3 font-medium">Vehicle Number</th>
                      <th className="px-5 py-3 font-medium">Available</th>
                      <th className="px-5 py-3 font-medium">Rating</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((driver) => (
                      <tr key={driver.id} className="border-b border-gray-50 last:border-0" data-testid={`row-driver-${driver.id}`}>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-driver-name-${driver.id}`}>
                          {driver.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-driver-phone-${driver.id}`}>
                          {driver.phone || "--"}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-driver-vehicle-${driver.id}`}>
                          {driver.vehicleNumber || "--"}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`${driver.isAvailable ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"} no-default-hover-elevate no-default-active-elevate`}
                            data-testid={`badge-driver-available-${driver.id}`}
                          >
                            {driver.isAvailable ? "Available" : "Unavailable"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3" data-testid={`text-driver-rating-${driver.id}`}>
                          {driver.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                              <span className="text-gray-800">{driver.rating}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400">
                <Truck className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No drivers found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
