import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Package, 
  LayoutGrid, 
  ShoppingCart, 
  Image, 
  Settings,
  Menu,
  MessageCircle,
  BarChart3,
  Users,
  IndianRupee,
  AlertCircle,
  TrendingUp,
  Clock,
  Megaphone,
  Store,
  ShoppingBag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";

const adminMenuItems = [
  { icon: BarChart3, label: "Dashboard", href: "/admin" },
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: LayoutGrid, label: "Categories", href: "/admin/categories" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: Image, label: "Banners", href: "/admin/banners" },
  { icon: Megaphone, label: "Category Ads", href: "/admin/category-ads" },
  { icon: Settings, label: "Services", href: "/admin/services" },
  { icon: Users, label: "Vendors", href: "/admin/vendors" },
  { icon: MessageCircle, label: "Support", href: "/admin/support" },
  { icon: ShoppingBag, label: "E-Com Dashboard", href: "/admin/ecom" },
  { icon: LayoutGrid, label: "E-Com Categories", href: "/admin/ecom/categories" },
  { icon: Package, label: "E-Com Products", href: "/admin/ecom/products" },
  { icon: ShoppingCart, label: "E-Com Orders", href: "/admin/ecom/orders" },
  { icon: Store, label: "E-Com Sellers", href: "/admin/ecom/sellers" },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const Sidebar = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <Link href="/">
          <div className="flex items-center gap-2">
            <img src={cityBellLogo} alt="City Bell" className="h-8 w-auto" />
            <div>
              <span className="font-bold text-red-600">CITY BELL</span>
              <span className="text-xs block text-gray-500">Admin Panel</span>
            </div>
          </div>
        </Link>
      </div>
      
      <nav className="flex-1 p-4">
        <div className="space-y-1">
          {adminMenuItems.map((item) => {
            const isActive = item.href === "/admin" 
              ? location === "/admin" 
              : location.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}>
                <div 
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-primary text-white' 
                      : 'text-gray-700 hover-elevate'
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  data-testid={`admin-nav-${item.label.toLowerCase()}`}
                >
                  <item.icon className="h-5 w-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </nav>
      
      <div className="p-4 border-t">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <span className="font-bold text-primary">
              {(user?.name || user?.username || 'A').charAt(0).toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-medium text-sm">{user?.name || user?.username}</p>
            <p className="text-xs text-gray-500">Administrator</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className="hidden lg:block w-64 bg-white border-r border-gray-200 fixed h-full">
        <Sidebar />
      </aside>
      
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3 flex items-center gap-3 safe-area-pt">
        <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>
        
        <Link href="/">
          <div className="flex items-center gap-2">
            <img src={cityBellLogo} alt="City Bell" className="h-8 w-auto" />
            <span className="font-bold text-red-600">Admin</span>
          </div>
        </Link>
      </div>
      
      <main className="flex-1 lg:ml-64 pt-16 lg:pt-0">
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}

interface AdminStats {
  totalUsers: number;
  totalProducts: number;
  totalCategories: number;
  totalOrders: number;
  totalRevenue: string;
  openTickets: number;
  orderStatusBreakdown: { status: string | null; count: number }[];
  recentOrders: {
    id: string;
    orderNumber: string | null;
    totalAmount: string;
    status: string | null;
    paymentMethod: string | null;
    createdAt: string | null;
    username: string | null;
    name: string | null;
  }[];
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  confirmed: "bg-blue-100 text-blue-800",
  processing: "bg-purple-100 text-purple-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  const statCards = [
    { label: "Total Revenue", value: stats ? formatCurrency(stats.totalRevenue) : "--", icon: IndianRupee, color: "bg-green-500", lightColor: "bg-green-50 text-green-700" },
    { label: "Total Orders", value: stats?.totalOrders ?? "--", icon: ShoppingCart, color: "bg-blue-500", lightColor: "bg-blue-50 text-blue-700" },
    { label: "Total Users", value: stats?.totalUsers ?? "--", icon: Users, color: "bg-purple-500", lightColor: "bg-purple-50 text-purple-700" },
    { label: "Total Products", value: stats?.totalProducts ?? "--", icon: Package, color: "bg-orange-500", lightColor: "bg-orange-50 text-orange-700" },
    { label: "Categories", value: stats?.totalCategories ?? "--", icon: LayoutGrid, color: "bg-teal-500", lightColor: "bg-teal-50 text-teal-700" },
    { label: "Open Tickets", value: stats?.openTickets ?? "--", icon: AlertCircle, color: "bg-red-500", lightColor: "bg-red-50 text-red-700" },
  ];

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-gray-500">Overview of your store performance</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 animate-pulse">
              <div className="h-10 w-10 bg-gray-200 rounded-lg mb-3" />
              <div className="h-4 w-20 bg-gray-200 rounded mb-2" />
              <div className="h-7 w-16 bg-gray-200 rounded" />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {statCards.map((card) => (
              <div
                key={card.label}
                className="bg-white rounded-xl p-5 shadow-sm border border-gray-100"
                data-testid={`stat-card-${card.label.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <div className={`w-10 h-10 ${card.lightColor} rounded-lg flex items-center justify-center mb-3`}>
                  <card.icon className="h-5 w-5" />
                </div>
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="text-2xl font-bold text-gray-800 mt-1">{card.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <Clock className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-800">Recent Orders</h2>
              </div>
              <div className="overflow-x-auto">
                {stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  <table className="w-full text-sm" data-testid="table-recent-orders">
                    <thead>
                      <tr className="text-left text-gray-500 border-b border-gray-100">
                        <th className="px-5 py-3 font-medium">Order</th>
                        <th className="px-5 py-3 font-medium">Customer</th>
                        <th className="px-5 py-3 font-medium">Amount</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium hidden md:table-cell">Payment</th>
                        <th className="px-5 py-3 font-medium hidden lg:table-cell">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.recentOrders.map((order) => (
                        <tr key={order.id} className="border-b border-gray-50 last:border-0">
                          <td className="px-5 py-3">
                            <Link href={`/admin/orders/${order.id}`}>
                              <span className="text-primary font-medium cursor-pointer" data-testid={`link-order-${order.id}`}>
                                {order.orderNumber || order.id.slice(0, 8)}
                              </span>
                            </Link>
                          </td>
                          <td className="px-5 py-3 text-gray-700">
                            {order.name || order.username || "N/A"}
                          </td>
                          <td className="px-5 py-3 font-medium text-gray-800">
                            {formatCurrency(order.totalAmount)}
                          </td>
                          <td className="px-5 py-3">
                            <Badge className={`${statusColors[order.status || "pending"] || "bg-gray-100 text-gray-800"} no-default-hover-elevate no-default-active-elevate`}>
                              {(order.status || "pending").charAt(0).toUpperCase() + (order.status || "pending").slice(1)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 hidden md:table-cell text-gray-600 capitalize">
                            {order.paymentMethod === "cod" ? "COD" : order.paymentMethod || "N/A"}
                          </td>
                          <td className="px-5 py-3 hidden lg:table-cell text-gray-500">
                            {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="px-5 py-10 text-center text-gray-400">
                    <ShoppingCart className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No orders yet</p>
                  </div>
                )}
              </div>
              {stats?.recentOrders && stats.recentOrders.length > 0 && (
                <div className="px-5 py-3 border-t border-gray-100">
                  <Link href="/admin/orders">
                    <span className="text-sm text-primary font-medium cursor-pointer" data-testid="link-view-all-orders">View all orders</span>
                  </Link>
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-100">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-gray-500" />
                <h2 className="font-semibold text-gray-800">Order Status</h2>
              </div>
              <div className="p-5 space-y-3" data-testid="order-status-breakdown">
                {stats?.orderStatusBreakdown && stats.orderStatusBreakdown.length > 0 ? (
                  stats.orderStatusBreakdown.map((item) => {
                    const status = item.status || "unknown";
                    const percentage = stats.totalOrders > 0 ? Math.round((item.count / stats.totalOrders) * 100) : 0;
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-sm text-gray-600 capitalize">{status}</span>
                          <span className="text-sm font-medium text-gray-800">{item.count}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full transition-all ${
                              status === "delivered" ? "bg-green-500" :
                              status === "confirmed" ? "bg-blue-500" :
                              status === "pending" ? "bg-yellow-500" :
                              status === "cancelled" ? "bg-red-500" :
                              status === "processing" ? "bg-purple-500" :
                              status === "shipped" ? "bg-indigo-500" :
                              "bg-gray-400"
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-400 py-6">
                    <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No data yet</p>
                  </div>
                )}
              </div>

              <div className="px-5 py-4 border-t border-gray-100">
                <h3 className="text-sm font-medium text-gray-500 mb-3">Quick Links</h3>
                <div className="space-y-2">
                  <Link href="/admin/products">
                    <div className="flex items-center gap-2 text-sm text-gray-700 hover-elevate px-2 py-1.5 rounded-md cursor-pointer">
                      <Package className="h-4 w-4" />
                      <span>Manage Products</span>
                    </div>
                  </Link>
                  <Link href="/admin/orders">
                    <div className="flex items-center gap-2 text-sm text-gray-700 hover-elevate px-2 py-1.5 rounded-md cursor-pointer">
                      <ShoppingCart className="h-4 w-4" />
                      <span>Manage Orders</span>
                    </div>
                  </Link>
                  <Link href="/admin/support">
                    <div className="flex items-center gap-2 text-sm text-gray-700 hover-elevate px-2 py-1.5 rounded-md cursor-pointer">
                      <MessageCircle className="h-4 w-4" />
                      <span>Support Tickets</span>
                    </div>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
