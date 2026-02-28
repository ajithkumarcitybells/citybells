import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Star } from "lucide-react";

interface Hotel {
  id: string;
  name: string;
  city: string;
  starRating?: number | null;
  rating?: string | null;
  amenities?: string[] | null;
  isActive?: boolean | null;
}

interface HotelBooking {
  id: string;
  hotelId: string;
  guestName?: string | null;
  checkIn: string;
  checkOut: string;
  totalPrice: string;
  status: string | null;
}

const bookingStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  checked_in: "bg-orange-100 text-orange-800",
  checked_out: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

function formatCurrency(amount: string | number) {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
}

export default function AdminHotelsPage() {
  const [activeTab, setActiveTab] = useState<"hotels" | "bookings">("hotels");

  const { data: hotels, isLoading: hotelsLoading } = useQuery<Hotel[]>({
    queryKey: ["/api/admin/hotels"],
  });

  const { data: bookings, isLoading: bookingsLoading } = useQuery<HotelBooking[]>({
    queryKey: ["/api/admin/hotel-bookings"],
  });

  const tabs = [
    { key: "hotels" as const, label: "Hotels" },
    { key: "bookings" as const, label: "Bookings" },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="w-10 h-10 bg-blue-50 text-blue-700 rounded-lg flex items-center justify-center">
            <Building2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800" data-testid="text-admin-hotels-title">Hotel Management</h1>
            <p className="text-sm text-gray-500">Manage hotels and bookings</p>
          </div>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover-elevate"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "hotels" && (
          <Card className="overflow-visible">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-800" data-testid="text-hotels-heading">Hotels</h2>
              {hotels && (
                <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-hotels-count">
                  {hotels.length} hotels
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              {hotelsLoading ? (
                <div className="p-10 text-center text-gray-400">Loading hotels...</div>
              ) : hotels && hotels.length > 0 ? (
                <table className="w-full text-sm" data-testid="table-hotels">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">City</th>
                      <th className="px-5 py-3 font-medium">Star Rating</th>
                      <th className="px-5 py-3 font-medium">Rating</th>
                      <th className="px-5 py-3 font-medium">Amenities</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hotels.map((hotel) => (
                      <tr key={hotel.id} className="border-b border-gray-50 last:border-0" data-testid={`row-hotel-${hotel.id}`}>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-hotel-name-${hotel.id}`}>
                          {hotel.name}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-hotel-city-${hotel.id}`}>
                          {hotel.city}
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-0.5" data-testid={`stars-hotel-${hotel.id}`}>
                            {Array.from({ length: hotel.starRating || 0 }).map((_, i) => (
                              <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            ))}
                            {(hotel.starRating || 0) === 0 && <span className="text-gray-400">--</span>}
                          </div>
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-hotel-rating-${hotel.id}`}>
                          {hotel.rating || "--"}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-hotel-amenities-${hotel.id}`}>
                          {hotel.amenities?.length || 0}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              hotel.isActive !== false ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
                            }`}
                            data-testid={`badge-hotel-status-${hotel.id}`}
                          >
                            {hotel.isActive !== false ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No hotels found</p>
                </div>
              )}
            </div>
          </Card>
        )}

        {activeTab === "bookings" && (
          <Card className="overflow-visible">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2 flex-wrap">
              <h2 className="font-semibold text-gray-800" data-testid="text-bookings-heading">Hotel Bookings</h2>
              {bookings && (
                <Badge className="no-default-hover-elevate no-default-active-elevate" data-testid="badge-bookings-count">
                  {bookings.length} bookings
                </Badge>
              )}
            </div>
            <div className="overflow-x-auto">
              {bookingsLoading ? (
                <div className="p-10 text-center text-gray-400">Loading bookings...</div>
              ) : bookings && bookings.length > 0 ? (
                <table className="w-full text-sm" data-testid="table-hotel-bookings">
                  <thead>
                    <tr className="text-left text-gray-500 border-b border-gray-100">
                      <th className="px-5 py-3 font-medium">Booking ID</th>
                      <th className="px-5 py-3 font-medium">Hotel</th>
                      <th className="px-5 py-3 font-medium">Guest Name</th>
                      <th className="px-5 py-3 font-medium">Check-in</th>
                      <th className="px-5 py-3 font-medium">Check-out</th>
                      <th className="px-5 py-3 font-medium">Total Price</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((booking) => (
                      <tr key={booking.id} className="border-b border-gray-50 last:border-0" data-testid={`row-booking-${booking.id}`}>
                        <td className="px-5 py-3 font-mono text-gray-600" data-testid={`text-booking-id-${booking.id}`}>
                          {booking.id.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-booking-hotel-${booking.id}`}>
                          {booking.hotelId.slice(0, 8)}...
                        </td>
                        <td className="px-5 py-3 text-gray-700" data-testid={`text-booking-guest-${booking.id}`}>
                          {booking.guestName || "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-booking-checkin-${booking.id}`}>
                          {new Date(booking.checkIn).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 text-gray-600" data-testid={`text-booking-checkout-${booking.id}`}>
                          {new Date(booking.checkOut).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </td>
                        <td className="px-5 py-3 font-medium text-gray-800" data-testid={`text-booking-price-${booking.id}`}>
                          {formatCurrency(booking.totalPrice)}
                        </td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              bookingStatusColors[booking.status || "pending"] || "bg-gray-100 text-gray-800"
                            }`}
                            data-testid={`badge-booking-status-${booking.id}`}
                          >
                            {(booking.status || "pending").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-10 text-center text-gray-400">
                  <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No bookings found</p>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
