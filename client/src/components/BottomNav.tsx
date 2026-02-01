import { Home, LayoutGrid, ShoppingCart, Heart, User, ChevronLeft } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CartItemWithProduct, WishlistItemWithProduct } from "@shared/schema";

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const { data: wishlistItems = [] } = useQuery<WishlistItemWithProduct[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
  const wishlistCount = wishlistItems.length;

  const navItems = [
    { 
      icon: ChevronLeft, 
      label: "Back", 
      path: null, 
      action: () => window.history.back(),
      showBadge: false,
      badge: 0
    },
    { 
      icon: Home, 
      label: "Home", 
      path: "/",
      showBadge: false,
      badge: 0
    },
    { 
      icon: ShoppingCart, 
      label: "Cart", 
      path: "/cart",
      showBadge: cartCount > 0,
      badge: cartCount
    },
    { 
      icon: Heart, 
      label: "Wishlist", 
      path: "/wishlist",
      showBadge: wishlistCount > 0,
      badge: wishlistCount
    },
    { 
      icon: User, 
      label: "Profile", 
      path: "/profile",
      showBadge: false,
      badge: 0
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-area-pb">
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          const isActive = item.path === location;
          const Icon = item.icon;
          
          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-0.5 p-2 min-w-[60px]"
                data-testid={`button-nav-${item.label.toLowerCase()}`}
              >
                <div className="relative">
                  <Icon className="h-6 w-6 text-gray-500" />
                </div>
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.path!}>
              <div 
                className="flex flex-col items-center gap-0.5 p-2 min-w-[60px]"
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                <div className="relative">
                  <Icon 
                    className={`h-6 w-6 ${isActive ? 'text-primary' : 'text-gray-500'}`} 
                  />
                  {item.showBadge && item.badge > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold rounded-full h-4 w-4 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
