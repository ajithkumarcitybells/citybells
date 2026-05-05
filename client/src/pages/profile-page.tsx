import { Link } from "wouter";
import { 
  User, 
  Package, 
  Heart, 
  MapPin, 
  Phone, 
  Mail, 
  LogOut,
  ChevronRight,
  Settings,
  Shield,
  MessageCircle,
  Store
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProfileEditor from "@/components/ProfileEditor";

export default function ProfilePage() {
  const { user, logoutMutation } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
              <User className="h-10 w-10 text-gray-400" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Welcome to City Bell</h2>
            <p className="text-gray-500 mb-6">Login to access your profile and orders</p>
            <Link href="/auth">
              <Button className="bg-primary text-white" data-testid="button-login">
                Login / Sign Up
              </Button>
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  const menuItems = [
    { icon: Package, label: "My Orders", href: "/orders" },
    { icon: Heart, label: "Wishlist", href: "/wishlist" },
    { icon: MapPin, label: "Saved Addresses", href: "/addresses" },
    { icon: Settings, label: "Settings", href: "/settings" },
    { icon: MessageCircle, label: "Help & Support", href: "/support" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="bg-white rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center overflow-hidden">
              {(user as any).avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(user as any).avatar} alt="avatar" className="w-full h-full object-cover" />
              ) : (
                <User className="h-8 w-8 text-primary" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold text-gray-800">
                {user.name || user.username}
              </h2>
              <p className="text-gray-500 text-sm">@{user.username}</p>
            </div>
          </div>
          
          <div className="mt-4 space-y-2">
            {user.email && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user.email}</span>
              </div>
            )}
            {user.phone && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <Phone className="h-4 w-4 text-gray-400" />
                <span>{user.phone}</span>
              </div>
            )}
            {user.address && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <MapPin className="h-4 w-4 text-gray-400" />
                <span className="line-clamp-1">{user.address}</span>
              </div>
            )}
          </div>
        </div>

        {/* Profile editor */}
        <ProfileEditor user={user} />

        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {menuItems.map((item, index) => (
            <Link key={item.label} href={item.href}>
              <div 
                className={`flex items-center gap-4 p-4 hover-elevate ${
                  index < menuItems.length - 1 ? 'border-b border-gray-100' : ''
                }`}
                data-testid={`link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  <item.icon className="h-5 w-5 text-gray-600" />
                </div>
                <span className="flex-1 font-medium text-gray-800">{item.label}</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          ))}
        </div>

        {user.isVendor && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Link href={
              user.partnerType === "restaurant" ? "/food/restaurant-dashboard" :
              user.partnerType === "driver" ? "/moving/driver" :
              user.partnerType === "hotel" ? "/hotels/manager" :
              user.partnerType === "service_provider" ? "/services/provider" :
              "/seller/dashboard"
            }>
              <div 
                className="flex items-center gap-4 p-4 hover-elevate bg-orange-50 border border-orange-200"
                data-testid="link-seller-dashboard"
              >
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                  <Store className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1">
                  <span className="font-semibold text-orange-700">
                    {user.partnerType === "restaurant" ? "Restaurant Dashboard" :
                     user.partnerType === "driver" ? "Driver Dashboard" :
                     user.partnerType === "hotel" ? "Hotel Dashboard" :
                     user.partnerType === "service_provider" ? "Service Provider Dashboard" :
                     "Seller Dashboard"}
                  </span>
                  <p className="text-xs text-orange-500">
                    {user.partnerType === "restaurant" ? "Manage menu, orders & restaurant" :
                     user.partnerType === "driver" ? "Manage rides & bookings" :
                     user.partnerType === "hotel" ? "Manage rooms & bookings" :
                     user.partnerType === "service_provider" ? "Manage services & bookings" :
                     "Manage products, orders & earnings"}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-orange-400" />
              </div>
            </Link>
          </div>
        )}

        {user.isAdmin && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <Link href="/admin">
              <div 
                className="flex items-center gap-4 p-4 hover-elevate"
                data-testid="link-admin-panel"
              >
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Shield className="h-5 w-5 text-red-600" />
                </div>
                <span className="flex-1 font-medium text-gray-800">Admin Panel</span>
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </Link>
          </div>
        )}

        <Button
          onClick={() => logoutMutation.mutate()}
          variant="outline"
          className="w-full border-red-200 text-red-600 hover:bg-red-50"
          disabled={logoutMutation.isPending}
          data-testid="button-logout"
        >
          <LogOut className="h-4 w-4 mr-2" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </main>
      
      <BottomNav />
    </div>
  );
}
