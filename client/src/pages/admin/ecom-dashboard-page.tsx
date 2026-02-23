import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Package,
  ShoppingCart,
  LayoutGrid,
  Store,
  IndianRupee,
  TrendingUp,
} from "lucide-react";
import { AdminLayout } from "./index";
import { Skeleton } from "@/components/ui/skeleton";
import type { EcomOrder, EcomProduct, SellerProfile, EcomCategory } from "@shared/schema";

interface EcomStats {
  totalProducts: number;
  totalOrders: number;
  totalCategories: number;
  totalSellers: number;
  totalRevenue: string;
}

export default function AdminEcomDashboardPage() {
  const { data: stats, isLoading: statsLoading } = useQuery<EcomStats>({
    queryKey: ["/api/admin/ecom/stats"],
  });

  const { data: recentOrders = [] } = useQuery<EcomOrder[]>({
    queryKey: ["/api/admin/ecom/orders"],
  });

  const { data: products = [] } = useQuery<EcomProduct[]>({
    queryKey: ["/api/admin/ecom/products"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  const pendingApprovalCount = products.filter(p => !p.isApproved && p.isActive).length;
  const recentFive = recentOrders.slice(0, 5);

  const statCards = [
    { label: "Revenue", value: stats ? formatCurrency(stats.totalRevenue) : "--", icon: IndianRupee, lightColor: "bg-green-50 text-green-700" },
    { label: "Orders", value: stats?.totalOrders ?? "--", icon: ShoppingCart, lightColor: "bg-blue-50 text-blue-700" },
    { label: "Products", value: stats?.totalProducts ?? "--", icon: Package, lightColor: "bg-orange-50 text-orange-700" },
    { label: "Categories", value: stats?.totalCategories ?? "--", icon: LayoutGrid, lightColor: "bg-teal-50 text-teal-700" },
    { label: "Sellers", value: stats?.totalSellers ?? "--", icon: Store, lightColor: "bg-purple-50 text-purple-700" },
    { label: "Pending Approval", value: pendingApprovalCount, icon: TrendingUp, lightColor: "bg-yellow-50 text-yellow-700" },
  ];

  const statusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    confirmed: "bg-blue-100 text-blue-800",
    processing: "bg-purple-100 text-purple-800",
    shipped: "bg-indigo-100 text-indigo-800",
    delivered: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
  };

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800" data-testid="text-ecom-dashboard-title">E-Commerce Dashboard</h1>
        <p className="text-gray-500">Overview of e-commerce performance</p>
      </div>

      {statsLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                data-testid={`ecom-stat-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`w-10 h-10 ${card.lightColor} rounded-lg flex items-center justify-center mb-3`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800">Recent E-Com Orders</h2>
                <Link href="/admin/ecom/orders">
                  <span className="text-sm text-primary font-medium cursor-pointer" data-testid="link-view-all-ecom-orders">View all</span>
                </Link>
              </div>
              {recentFive.length > 0 ? (
                <div className="divide-y divide-gray-50">
                  {recentFive.map((order) => (
                    <div key={order.id} className="px-5 py-3 flex items-center justify-between gap-2" data-testid={`recent-ecom-order-${order.id}`}>
                      <div>
                        <p className="font-mono text-sm text-gray-700">
                          {order.orderNumber || `EC${order.id.slice(0, 6).toUpperCase()}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "-"}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-sm">{formatCurrency(order.totalAmount)}</p>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[order.status || "pending"] || "bg-gray-100 text-gray-700"}`}>
                          {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center text-gray-400">
                  <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No orders yet</p>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between gap-2">
                <h2 className="font-semibold text-gray-800">Products Pending Approval</h2>
                <Link href="/admin/ecom/products">
                  <span className="text-sm text-primary font-medium cursor-pointer" data-testid="link-view-all-ecom-products">View all</span>
                </Link>
              </div>
              {pendingApprovalCount > 0 ? (
                <div className="divide-y divide-gray-50">
                  {products.filter(p => !p.isApproved && p.isActive).slice(0, 5).map((product) => (
                    <div key={product.id} className="px-5 py-3 flex items-center gap-3" data-testid={`pending-product-${product.id}`}>
                      <div className="w-10 h-10 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                        {product.images && (product.images as string[]).length > 0 ? (
                          <img src={(product.images as string[])[0]} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-gray-500">{product.brand || "No brand"}</p>
                      </div>
                      <p className="font-semibold text-sm">{formatCurrency(product.price)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-5 py-10 text-center text-gray-400">
                  <Package className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No products pending approval</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-800 mb-4">Quick Links</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link href="/admin/ecom/categories">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover-elevate cursor-pointer">
                  <LayoutGrid className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Manage Categories</span>
                </div>
              </Link>
              <Link href="/admin/ecom/products">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover-elevate cursor-pointer">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Moderate Products</span>
                </div>
              </Link>
              <Link href="/admin/ecom/orders">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover-elevate cursor-pointer">
                  <ShoppingCart className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">View Orders</span>
                </div>
              </Link>
              <Link href="/admin/ecom/sellers">
                <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg hover-elevate cursor-pointer">
                  <Store className="h-4 w-4 text-gray-500" />
                  <span className="text-sm text-gray-700">Manage Sellers</span>
                </div>
              </Link>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
