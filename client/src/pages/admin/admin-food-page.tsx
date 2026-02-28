import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FoodRestaurant, FoodOrder } from "@shared/schema";

const orderStatusColors: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminFoodPage() {
  const [activeTab, setActiveTab] = useState<"restaurants" | "orders">("restaurants");

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery<FoodRestaurant[]>({
    queryKey: ["/api/admin/food/restaurants"],
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<FoodOrder[]>({
    queryKey: ["/api/admin/food/orders"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  const tabs = [
    { key: "restaurants" as const, label: "Restaurants", count: restaurants.length },
    { key: "orders" as const, label: "Orders", count: orders.length },
  ];

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <UtensilsCrossed className="h-6 w-6 text-orange-500" />
            <h1 className="text-2xl font-bold text-gray-800" data-testid="text-food-admin-title">
              Food Delivery Management
            </h1>
          </div>
          <p className="text-gray-500 ml-9">Manage restaurants and food orders</p>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover-elevate"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {activeTab === "restaurants" && (
          <Card className="overflow-hidden">
            {loadingRestaurants ? (
              <div className="p-4 space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500" data-testid="text-empty-restaurants">No restaurants found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-restaurants">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Cuisine</th>
                      <th className="px-5 py-3 font-medium">Rating</th>
                      <th className="px-5 py-3 font-medium">Delivery Time</th>
                      <th className="px-5 py-3 font-medium">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((restaurant) => (
                      <tr key={restaurant.id} className="border-b last:border-0" data-testid={`row-restaurant-${restaurant.id}`}>
                        <td className="px-5 py-3 font-medium text-gray-800">{restaurant.name}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {restaurant.cuisine && restaurant.cuisine.length > 0
                            ? restaurant.cuisine.join(", ")
                            : "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{restaurant.rating || "N/A"}</td>
                        <td className="px-5 py-3 text-gray-600">{restaurant.deliveryTime || "N/A"}</td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              restaurant.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                            data-testid={`badge-active-${restaurant.id}`}
                          >
                            {restaurant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        {activeTab === "orders" && (
          <Card className="overflow-hidden">
            {loadingOrders ? (
              <div className="p-4 space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500" data-testid="text-empty-orders">No food orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-orders">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-5 py-3 font-medium">Order ID</th>
                      <th className="px-5 py-3 font-medium">Restaurant</th>
                      <th className="px-5 py-3 font-medium">Total</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const status = order.status || "placed";
                      return (
                        <tr key={order.id} className="border-b last:border-0" data-testid={`row-order-${order.id}`}>
                          <td className="px-5 py-3">
                            <span className="font-mono text-sm text-blue-600" data-testid={`text-order-id-${order.id}`}>
                              {order.id.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{order.restaurantId}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{formatCurrency(order.totalAmount)}</td>
                          <td className="px-5 py-3">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate ${orderStatusColors[status] || "bg-gray-100 text-gray-800"}`}
                              data-testid={`badge-status-${order.id}`}
                            >
                              {formatStatus(status)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
