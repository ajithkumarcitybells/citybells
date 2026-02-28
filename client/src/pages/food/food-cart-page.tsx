import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Plus, Minus, Trash2, MapPin, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { FoodMenuItem, FoodRestaurant, Address } from "@shared/schema";

interface CartEntry {
  item: FoodMenuItem;
  quantity: number;
}

const FOOD_CART_KEY = "citybell_food_cart";

function loadCart(): CartEntry[] {
  try {
    const raw = localStorage.getItem(FOOD_CART_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveCart(cart: CartEntry[]) {
  localStorage.setItem(FOOD_CART_KEY, JSON.stringify(cart));
}

export default function FoodCartPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [cart, setCart] = useState<CartEntry[]>(loadCart);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  const { data: addresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  useEffect(() => {
    if (addresses.length > 0 && !selectedAddressId) {
      const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(defaultAddr.id);
    }
  }, [addresses, selectedAddressId]);

  const restaurantId = cart.length > 0 ? cart[0].item.restaurantId : null;
  const cartItems = restaurantId
    ? cart.filter((c) => c.item.restaurantId === restaurantId)
    : [];

  const subtotal = cartItems.reduce(
    (sum, c) => sum + parseFloat(c.item.price) * c.quantity,
    0
  );
  const deliveryFee = subtotal > 0 ? 30 : 0;
  const taxes = Math.round(subtotal * 0.05 * 100) / 100;
  const total = subtotal + deliveryFee + taxes;
  const totalItems = cartItems.reduce((s, c) => s + c.quantity, 0);

  const updateQty = (itemId: string, delta: number) => {
    setCart((prev) => {
      const next = prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity + delta } : c))
        .filter((c) => c.quantity > 0);
      saveCart(next);
      return next;
    });
  };

  const clearCart = () => {
    setCart([]);
    saveCart([]);
  };

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const selectedAddress = addresses.find((a) => a.id === selectedAddressId);
      if (!selectedAddress) throw new Error("Please select a delivery address");
      if (!restaurantId) throw new Error("Cart is empty");

      const orderItems = cartItems.map((c) => ({
        menuItemId: c.item.id,
        name: c.item.name,
        price: c.item.price,
        quantity: c.quantity,
        isVeg: c.item.isVeg,
      }));

      const res = await apiRequest("POST", "/api/food/orders", {
        restaurantId,
        items: orderItems,
        totalAmount: total.toFixed(2),
        deliveryFee: deliveryFee.toFixed(2),
        deliveryAddress: selectedAddress.fullAddress,
      });
      return res.json();
    },
    onSuccess: () => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/food/orders"] });
      toast({ title: "Order placed!", description: "Your food order has been placed successfully." });
      setLocation("/food/orders");
    },
    onError: (err: Error) => {
      toast({ title: "Failed to place order", description: err.message, variant: "destructive" });
    },
  });

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
          <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => setLocation("/food")} data-testid="button-back">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800">Food Cart</h1>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center py-20 px-4">
          <ShoppingBag className="h-16 w-16 text-gray-300 mb-4" />
          <p className="text-gray-500 font-medium" data-testid="text-empty-cart">Your food cart is empty</p>
          <p className="text-gray-400 text-sm mt-1">Add items from a restaurant to get started</p>
          <Button
            className="mt-4 bg-orange-500 border-orange-600 text-white"
            onClick={() => setLocation("/food")}
            data-testid="button-browse-restaurants"
          >
            Browse Restaurants
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-44">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} data-testid="button-back">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Food Cart</h1>
          </div>
          <button onClick={clearCart} className="text-red-500 text-sm font-medium" data-testid="button-clear-cart">
            Clear
          </button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <Card>
          <CardContent className="p-4 space-y-3">
            {cartItems.map((entry) => {
              const price = parseFloat(entry.item.price);
              return (
                <div
                  key={entry.item.id}
                  className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0"
                  data-testid={`cart-item-${entry.item.id}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{entry.item.name}</p>
                    <p className="text-sm text-gray-600">₹{price.toFixed(0)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 border border-gray-200 rounded-md">
                      <button
                        onClick={() => updateQty(entry.item.id, -1)}
                        className="p-1.5 text-gray-500"
                        data-testid={`button-minus-${entry.item.id}`}
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="text-sm font-medium min-w-[20px] text-center">{entry.quantity}</span>
                      <button
                        onClick={() => updateQty(entry.item.id, 1)}
                        className="p-1.5 text-gray-500"
                        data-testid={`button-plus-${entry.item.id}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-sm font-semibold text-gray-800 min-w-[60px] text-right">
                      ₹{(price * entry.quantity).toFixed(0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-orange-500" />
              Delivery Address
            </h3>
            {!user ? (
              <div>
                <p className="text-sm text-gray-500 mb-2">Please login to select an address</p>
                <Button size="sm" onClick={() => setLocation("/auth")} data-testid="button-login">
                  Login
                </Button>
              </div>
            ) : addresses.length === 0 ? (
              <div>
                <p className="text-sm text-gray-500 mb-2">No saved addresses</p>
                <Button size="sm" variant="outline" onClick={() => setLocation("/addresses")} data-testid="button-add-address">
                  Add Address
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    onClick={() => setSelectedAddressId(addr.id)}
                    className={`p-3 rounded-md border cursor-pointer transition-colors ${
                      selectedAddressId === addr.id
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                    data-testid={`address-option-${addr.id}`}
                  >
                    <p className="text-xs font-semibold text-gray-700">{addr.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{addr.fullAddress}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Bill Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Item Total ({totalItems} items)</span>
                <span className="text-gray-700" data-testid="text-subtotal">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Delivery Fee</span>
                <span className="text-gray-700" data-testid="text-delivery-fee">₹{deliveryFee.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Taxes (5%)</span>
                <span className="text-gray-700" data-testid="text-taxes">₹{taxes.toFixed(2)}</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-gray-100 font-semibold">
                <span className="text-gray-800">To Pay</span>
                <span className="text-gray-900" data-testid="text-total">₹{total.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-white border-t border-gray-200">
        <div className="max-w-lg mx-auto">
          <Button
            className="w-full bg-orange-500 border-orange-600 text-white"
            disabled={!user || addresses.length === 0 || placeOrderMutation.isPending}
            onClick={() => placeOrderMutation.mutate()}
            data-testid="button-place-order"
          >
            {placeOrderMutation.isPending ? "Placing Order..." : `Place Order  ₹${total.toFixed(0)}`}
          </Button>
        </div>
      </div>
    </div>
  );
}
