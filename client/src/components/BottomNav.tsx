import { Home, LayoutGrid, ShoppingCart, Heart, User, ChevronLeft, Store } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { CartItemWithProduct, EcomCartItemWithProduct, WishlistItemWithProduct } from "@shared/schema";

function useCartContext(location: string) {
  if (location.startsWith("/ecommerce")) {
    return { queryKey: "/api/ecom/cart" as const, cartPath: "/ecommerce/cart" };
  }
  if (location.startsWith("/food")) {
    return { queryKey: null, cartPath: "/food/cart" };
  }
  return { queryKey: "/api/cart" as const, cartPath: "/cart" };
}

export function BottomNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { queryKey, cartPath } = useCartContext(location);

  const { data: groceryCart = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user && queryKey === "/api/cart",
  });

  const { data: ecomCart = [] } = useQuery<EcomCartItemWithProduct[]>({
    queryKey: ["/api/ecom/cart"],
    enabled: !!user && queryKey === "/api/ecom/cart",
  });

  const { data: wishlistItems = [] } = useQuery<WishlistItemWithProduct[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const cartCount = queryKey === "/api/ecom/cart"
    ? ecomCart.reduce((sum, item) => sum + (item.quantity || 0), 0)
    : queryKey === "/api/cart"
      ? groceryCart.reduce((sum, item) => sum + (item.quantity || 0), 0)
      : 0;

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
    ...(user?.isVendor ? [{
      icon: Store,
      label: "Dashboard",
      path: "/seller/dashboard",
      showBadge: false,
      badge: 0
    }] : [{
      icon: ShoppingCart,
      label: "Cart",
      path: cartPath,
      showBadge: cartCount > 0,
      badge: cartCount
    }]),
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
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-1" style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 4px))' }}>
      <div className="flex items-center justify-around pt-1.5 pb-0.5">
        {navItems.map((item) => {
          const isActive = item.path === location;
          const Icon = item.icon;
          
          if (item.action) {
            return (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px]"
                data-testid={`button-nav-${item.label.toLowerCase()}`}
              >
                <div className="relative">
                  <Icon className="h-5 w-5 text-gray-500" />
                </div>
                <span className="text-[10px] text-gray-500">{item.label}</span>
              </button>
            );
          }

          return (
            <Link key={item.label} href={item.path!}>
              <div 
                className="flex flex-col items-center gap-0.5 px-2 py-1 min-w-[48px]"
                data-testid={`link-nav-${item.label.toLowerCase()}`}
              >
                <div className="relative">
                  <Icon 
                    className={`h-5 w-5 ${isActive ? 'text-primary' : 'text-gray-500'}`} 
                  />
                  {item.showBadge && item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-bold rounded-full h-3.5 w-3.5 flex items-center justify-center">
                      {item.badge > 9 ? '9+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] ${isActive ? 'text-primary font-medium' : 'text-gray-500'}`}>{item.label}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
