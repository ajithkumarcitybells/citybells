import { useState } from "react";
import { Link, useLocation } from "wouter";
import { 
  Package, 
  LayoutGrid, 
  ShoppingCart, 
  Image, 
  Settings,
  ChevronLeft,
  Menu,
  MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/use-auth";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";

const adminMenuItems = [
  { icon: Package, label: "Products", href: "/admin/products" },
  { icon: LayoutGrid, label: "Categories", href: "/admin/categories" },
  { icon: ShoppingCart, label: "Orders", href: "/admin/orders" },
  { icon: Image, label: "Banners", href: "/admin/banners" },
  { icon: Settings, label: "Services", href: "/admin/services" },
  { icon: MessageCircle, label: "Support", href: "/admin/support" },
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
            const isActive = location === item.href;
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
      
      <div className="lg:hidden fixed top-0 left-0 right-0 bg-white border-b z-50 px-4 py-3 flex items-center gap-3">
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

export default function AdminDashboard() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <p className="text-gray-500">Welcome to the City Bell Admin Panel</p>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {adminMenuItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <div className="bg-white rounded-xl p-6 shadow-sm hover-elevate border border-gray-100">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <item.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold text-gray-800">{item.label}</h3>
              <p className="text-sm text-gray-500 mt-1">Manage {item.label.toLowerCase()}</p>
            </div>
          </Link>
        ))}
      </div>
    </AdminLayout>
  );
}
