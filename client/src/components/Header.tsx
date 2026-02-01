import { ShoppingCart } from "lucide-react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { AddressPicker } from "./AddressPicker";
import { CartItemWithProduct } from "@shared/schema";
import cityBellLogo from "@assets/citybells-logo_1769903304782.png";

export function Header() {
  const { user } = useAuth();

  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between px-4 py-2">
        <Link href="/" data-testid="link-home">
          <div className="flex items-center gap-2">
            <img 
              src={cityBellLogo} 
              alt="City Bell" 
              className="h-10 w-auto"
              data-testid="img-logo"
            />
            <span className="font-bold text-lg text-red-600 hidden sm:block">CITY BELL</span>
          </div>
        </Link>
        
        <AddressPicker />

        <Link href="/cart" data-testid="link-cart">
          <div className="relative p-2">
            <ShoppingCart className="h-6 w-6 text-gray-700" />
            {cartCount > 0 && (
              <span 
                className="absolute -top-1 -right-1 bg-primary text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center"
                data-testid="text-cart-count"
              >
                {cartCount}
              </span>
            )}
          </div>
        </Link>
      </div>
    </header>
  );
}
