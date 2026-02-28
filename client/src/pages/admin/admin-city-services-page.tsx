import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wrench } from "lucide-react";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const tabs = ["Categories", "Services", "Bookings", "Providers"] as const;
type Tab = typeof tabs[number];

const bookingStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  provider_assigned: "bg-cyan-100 text-cyan-800",
  in_progress: "bg-orange-100 text-orange-800",
  completed: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminCityServicesPage() {
  const [activeTab, setActiveTab] = useState<Tab>("Categories");

  const { data: categories = [], isLoading: loadingCategories } = useQuery<any[]>({
    queryKey: ["/api/admin/city-services/categories"],
    enabled: activeTab === "Categories",
  });

  const { data: services = [], isLoading: loadingServices } = useQuery<any[]>({
    queryKey: ["/api/admin/city-services/services"],
    enabled: activeTab === "Services",
  });

  const { data: bookings = [], isLoading: loadingBookings } = useQuery<any[]>({
    queryKey: ["/api/admin/city-services/bookings"],
    enabled: activeTab === "Bookings",
  });

  const { data: providers = [], isLoading: loadingProviders } = useQuery<any[]>({
    queryKey: ["/api/admin/city-services/providers"],
    enabled: activeTab === "Providers",
  });

  const isLoading =
    (activeTab === "Categories" && loadingCategories) ||
    (activeTab === "Services" && loadingServices) ||
    (activeTab === "Bookings" && loadingBookings) ||
    (activeTab === "Providers" && loadingProviders);

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <Wrench className="h-6 w-6 text-gray-700" />
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-city-services-title">
            City Services Management
          </h1>
        </div>

        <div className="flex gap-2 mb-6 flex-wrap">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${
                activeTab === tab
                  ? "bg-primary text-white"
                  : "bg-white text-gray-600 border border-gray-200 hover-elevate"
              }`}
              data-testid={`tab-${tab.toLowerCase()}`}
            >
              {tab}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-lg p-5 border border-gray-100 animate-pulse">
                <div className="h-5 w-40 bg-gray-200 rounded mb-3" />
                <div className="h-4 w-64 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <>
            {activeTab === "Categories" && (
              <div>
                <p className="text-sm text-gray-500 mb-4" data-testid="text-categories-count">
                  {categories.length} {categories.length === 1 ? "category" : "categories"}
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.map((cat: any) => (
                    <Card key={cat.id} className="p-5" data-testid={`card-category-${cat.id}`}>
                      <div className="flex items-center gap-3 mb-2">
                        {cat.icon && <span className="text-2xl">{cat.icon}</span>}
                        <h3 className="font-semibold text-gray-800" data-testid={`text-category-name-${cat.id}`}>
                          {cat.name}
                        </h3>
                      </div>
                      {cat.description && (
                        <p className="text-sm text-gray-500" data-testid={`text-category-desc-${cat.id}`}>
                          {cat.description}
                        </p>
                      )}
                    </Card>
                  ))}
                  {categories.length === 0 && (
                    <p className="text-gray-400 col-span-full text-center py-8">No categories found</p>
                  )}
                </div>
              </div>
            )}

            {activeTab === "Services" && (
              <div>
                <p className="text-sm text-gray-500 mb-4" data-testid="text-services-count">
                  {services.length} {services.length === 1 ? "service" : "services"}
                </p>
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-services">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Category</th>
                        <th className="px-5 py-3 font-medium">Price</th>
                        <th className="px-5 py-3 font-medium">Duration</th>
                        <th className="px-5 py-3 font-medium">Rating</th>
                        <th className="px-5 py-3 font-medium">Active</th>
                      </tr>
                    </thead>
                    <tbody>
                      {services.map((svc: any) => (
                        <tr key={svc.id} className="border-b border-gray-50 last:border-0" data-testid={`row-service-${svc.id}`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{svc.name}</td>
                          <td className="px-5 py-3 text-gray-600">{svc.categoryId}</td>
                          <td className="px-5 py-3 text-gray-700">{svc.price}</td>
                          <td className="px-5 py-3 text-gray-600">{svc.duration || "N/A"}</td>
                          <td className="px-5 py-3 text-gray-600">{svc.rating || "N/A"}</td>
                          <td className="px-5 py-3">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate ${
                                svc.isActive !== false
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                              data-testid={`badge-service-active-${svc.id}`}
                            >
                              {svc.isActive !== false ? "Active" : "Inactive"}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {services.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                            No services found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "Bookings" && (
              <div>
                <p className="text-sm text-gray-500 mb-4" data-testid="text-bookings-count">
                  {bookings.length} {bookings.length === 1 ? "booking" : "bookings"}
                </p>
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-bookings">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-3 font-medium">Booking ID</th>
                        <th className="px-5 py-3 font-medium">Service</th>
                        <th className="px-5 py-3 font-medium">Address</th>
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Time</th>
                        <th className="px-5 py-3 font-medium">Price</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking: any) => (
                        <tr key={booking.id} className="border-b border-gray-50 last:border-0" data-testid={`row-booking-${booking.id}`}>
                          <td className="px-5 py-3 font-mono text-gray-700" data-testid={`text-booking-id-${booking.id}`}>
                            {booking.id.slice(0, 8)}...
                          </td>
                          <td className="px-5 py-3 text-gray-700">{booking.serviceId}</td>
                          <td className="px-5 py-3 text-gray-600">{booking.address || "N/A"}</td>
                          <td className="px-5 py-3 text-gray-600">{booking.scheduledDate || "N/A"}</td>
                          <td className="px-5 py-3 text-gray-600">{booking.scheduledTime || "N/A"}</td>
                          <td className="px-5 py-3 text-gray-700">{booking.totalPrice || "N/A"}</td>
                          <td className="px-5 py-3">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate ${
                                bookingStatusColors[booking.status] || "bg-gray-100 text-gray-800"
                              }`}
                              data-testid={`badge-booking-status-${booking.id}`}
                            >
                              {(booking.status || "unknown").replace(/_/g, " ")}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                      {bookings.length === 0 && (
                        <tr>
                          <td colSpan={7} className="px-5 py-8 text-center text-gray-400">
                            No bookings found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "Providers" && (
              <div>
                <p className="text-sm text-gray-500 mb-4" data-testid="text-providers-count">
                  {providers.length} {providers.length === 1 ? "provider" : "providers"}
                </p>
                <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
                  <table className="w-full text-sm" data-testid="table-providers">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Phone</th>
                        <th className="px-5 py-3 font-medium">Specializations</th>
                        <th className="px-5 py-3 font-medium">Experience</th>
                        <th className="px-5 py-3 font-medium">Available</th>
                        <th className="px-5 py-3 font-medium">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {providers.map((prov: any) => (
                        <tr key={prov.id} className="border-b border-gray-50 last:border-0" data-testid={`row-provider-${prov.id}`}>
                          <td className="px-5 py-3 font-medium text-gray-800">{prov.name}</td>
                          <td className="px-5 py-3 text-gray-600">{prov.phone || "N/A"}</td>
                          <td className="px-5 py-3 text-gray-600">
                            {Array.isArray(prov.specializations)
                              ? prov.specializations.join(", ")
                              : prov.specializations || "N/A"}
                          </td>
                          <td className="px-5 py-3 text-gray-600">{prov.experience || "N/A"}</td>
                          <td className="px-5 py-3">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate ${
                                prov.isAvailable !== false
                                  ? "bg-green-100 text-green-800"
                                  : "bg-gray-100 text-gray-600"
                              }`}
                              data-testid={`badge-provider-available-${prov.id}`}
                            >
                              {prov.isAvailable !== false ? "Available" : "Unavailable"}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-gray-600">{prov.rating || "N/A"}</td>
                        </tr>
                      ))}
                      {providers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                            No providers found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AdminLayout>
  );
}
