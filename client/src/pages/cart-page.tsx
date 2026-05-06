import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CartItemWithProduct } from "@shared/schema";
import { FastDeliveryBadge, FastDeliveryCartNotice, isFastDeliveryProduct } from "@/components/FastDelivery";
import { SubscriberDealBadge } from "@/components/GrocerySubscription";

export default function CartPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: cartItems = [], isLoading } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiRequest("PATCH", `/api/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      });
    },
  });

  const getVariantMultiplier = (variant: string | null | undefined): number => {
    if (!variant) return 1;
    switch (variant) {
      case "250g": return 0.25;
      case "500g": return 0.5;
      case "1kg": return 1;
      default: return 1;
    }
  };

  const getItemPrice = (item: CartItemWithProduct): number => {
    const basePrice = parseFloat(item.product.price);
    const multiplier = getVariantMultiplier(item.variant);
    return Math.round(basePrice * multiplier * 100) / 100;
  };

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + getItemPrice(item) * (item.quantity || 1);
  }, 0);

  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Please login to view your cart</p>
            <Link href="/auth">
              <Button className="bg-primary text-white" data-testid="button-login">
                Login to Continue
              </Button>
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-4">Shopping Cart</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your cart is empty</h2>
            <p className="text-gray-500 mb-6">Add some items to get started</p>
            <Link href="/grocery">
              <Button className="bg-primary text-white" data-testid="button-shop">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <FastDeliveryCartNotice items={cartItems} />
            {cartItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl p-4 flex gap-4 shadow-sm"
                data-testid={`cart-item-${item.id}`}
              >
                <div className="w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <img 
                      src={item.product.image} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800 truncate">
                    {item.product.name}
                    {item.variant && <span className="text-sm text-gray-500 ml-1">- {item.variant}</span>}
                  </h3>
                  {isFastDeliveryProduct(item.product) && (
                    <div className="mt-1">
                      <FastDeliveryBadge compact />
                    </div>
                  )}
                  {(item.product as any).subscriberDeal && (
                    <div className="mt-1">
                      <SubscriberDealBadge discount={(item.product as any).subscriberDiscountPercent} />
                    </div>
                  )}
                  <p className="text-lg font-bold text-primary mt-1">
                    ₹{getItemPrice(item).toFixed(2)}
                  </p>
                  
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-2 bg-gray-100 rounded-lg">
                      <button
                        onClick={() => {
                          if ((item.quantity || 1) > 1) {
                            updateQuantityMutation.mutate({
                              itemId: item.id,
                              quantity: (item.quantity || 1) - 1,
                            });
                          }
                        }}
                        className="p-2 hover-elevate"
                        disabled={updateQuantityMutation.isPending}
                        data-testid={`button-decrease-${item.id}`}
                      >
                        <Minus className="h-4 w-4" />
                      </button>
                      <span className="w-8 text-center font-medium">
                        {item.quantity || 1}
                      </span>
                      <button
                        onClick={() => {
                          updateQuantityMutation.mutate({
                            itemId: item.id,
                            quantity: (item.quantity || 1) + 1,
                          });
                        }}
                        className="p-2 hover-elevate"
                        disabled={updateQuantityMutation.isPending}
                        data-testid={`button-increase-${item.id}`}
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>
                    
                    <button
                      onClick={() => removeItemMutation.mutate(item.id)}
                      className="p-2 text-red-500 hover-elevate"
                      disabled={removeItemMutation.isPending}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-bold text-gray-800">
                    ₹{(getItemPrice(item) * (item.quantity || 1)).toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
          <div className="max-w-lg mx-auto">
            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Fee</span>
                <span className="font-medium">
                  {deliveryFee === 0 ? (
                    <span className="text-green-600">FREE</span>
                  ) : (
                    `₹${deliveryFee.toFixed(2)}`
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Delivery Estimate</span>
                <span className="font-medium text-emerald-700">
                  {cartItems.some(item => isFastDeliveryProduct(item.product)) ? "10 min eligible" : "Standard slot"}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2">
                <span>Total</span>
                <span className="text-primary">₹{total.toFixed(2)}</span>
              </div>
            </div>
            
            <Link href="/checkout">
              <Button 
                className="w-full bg-primary text-white font-semibold py-6"
                data-testid="button-checkout"
              >
                Proceed to Checkout
              </Button>
            </Link>
          </div>
        </div>
      )}
      
      <BottomNav />
    </div>
  );
}
