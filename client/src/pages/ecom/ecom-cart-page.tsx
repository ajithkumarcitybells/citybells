import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Minus, Plus, Trash2, ShoppingBag, Store, Tag } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { EcomCartItemWithProduct } from "@shared/schema";

export default function EcomCartPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: cartItems = [], isLoading } = useQuery<EcomCartItemWithProduct[]>({
    queryKey: ["/api/ecom/cart"],
    enabled: !!user,
  });

  const updateQuantityMutation = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      await apiRequest("PATCH", `/api/ecom/cart/${itemId}`, { quantity });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/cart"] });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      await apiRequest("DELETE", `/api/ecom/cart/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/cart"] });
      toast({
        title: "Item removed",
        description: "Item has been removed from your cart.",
      });
    },
  });

  const itemsBySeller = cartItems.reduce<Record<string, EcomCartItemWithProduct[]>>((acc, item) => {
    const sellerId = item.product.vendorId || "unknown";
    if (!acc[sellerId]) acc[sellerId] = [];
    acc[sellerId].push(item);
    return acc;
  }, {});

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.price) * (item.quantity || 1);
  }, 0);

  const originalTotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.originalPrice) * (item.quantity || 1);
  }, 0);

  const savings = originalTotal - subtotal;
  const deliveryFee = subtotal > 999 ? 0 : 49;
  const total = subtotal + deliveryFee;

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-cart">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Please login to view your cart</p>
            <Link href="/auth">
              <Button data-testid="button-login">Login to Continue</Button>
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-36">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4" data-testid="text-page-title">Shopping Cart</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4 flex gap-4">
                <Skeleton className="w-20 h-20 rounded-md" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-8 w-24" />
                </div>
              </Card>
            ))}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-empty-cart">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some items to get started</p>
            <Link href="/ecommerce">
              <Button data-testid="button-shop">Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(itemsBySeller).map(([sellerId, items]) => (
              <Card key={sellerId} className="p-4" data-testid={`seller-group-${sellerId}`}>
                <div className="flex items-center gap-2 mb-3 pb-2 border-b">
                  <Store className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-muted-foreground">
                    Seller #{sellerId.slice(0, 6)}
                  </span>
                </div>

                <div className="space-y-3">
                  {items.map((item) => {
                    const price = parseFloat(item.product.price);
                    const originalPrice = parseFloat(item.product.originalPrice);
                    const qty = item.quantity || 1;
                    const hasDiscount = (item.product.discountPercent || 0) > 0;
                    const mainImage = item.product.images && (item.product.images as string[]).length > 0
                      ? (item.product.images as string[])[0]
                      : null;

                    return (
                      <div
                        key={item.id}
                        className="flex gap-3"
                        data-testid={`cart-item-${item.id}`}
                      >
                        <div className="w-20 h-20 bg-muted rounded-md overflow-hidden flex-shrink-0">
                          {mainImage ? (
                            <img
                              src={mainImage}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                              data-testid={`img-product-${item.id}`}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-sm truncate" data-testid={`text-product-name-${item.id}`}>
                            {item.product.name}
                          </h3>
                          {item.variant && (
                            <Badge variant="secondary" className="text-xs mt-0.5" data-testid={`badge-variant-${item.id}`}>
                              {item.variant}
                            </Badge>
                          )}
                          {item.product.brand && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.product.brand}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-bold text-primary" data-testid={`text-price-${item.id}`}>
                              ₹{price.toFixed(0)}
                            </span>
                            {hasDiscount && (
                              <>
                                <span className="text-xs text-muted-foreground line-through">
                                  ₹{originalPrice.toFixed(0)}
                                </span>
                                <span className="text-xs text-green-600 font-medium">
                                  {item.product.discountPercent}% off
                                </span>
                              </>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-2">
                            <div className="flex items-center gap-1 border rounded-md">
                              <button
                                onClick={() => {
                                  if (qty > 1) {
                                    updateQuantityMutation.mutate({ itemId: item.id, quantity: qty - 1 });
                                  }
                                }}
                                className="p-1.5 hover-elevate"
                                disabled={updateQuantityMutation.isPending}
                                data-testid={`button-decrease-${item.id}`}
                              >
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-7 text-center text-sm font-medium" data-testid={`text-qty-${item.id}`}>
                                {qty}
                              </span>
                              <button
                                onClick={() => {
                                  updateQuantityMutation.mutate({ itemId: item.id, quantity: qty + 1 });
                                }}
                                className="p-1.5 hover-elevate"
                                disabled={updateQuantityMutation.isPending}
                                data-testid={`button-increase-${item.id}`}
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <button
                              onClick={() => removeItemMutation.mutate(item.id)}
                              className="p-1.5 text-destructive hover-elevate"
                              disabled={removeItemMutation.isPending}
                              data-testid={`button-remove-${item.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm" data-testid={`text-total-${item.id}`}>
                            ₹{(price * qty).toFixed(0)}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>

      {cartItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4 safe-area-pb z-40">
          <div className="max-w-lg mx-auto">
            <div className="space-y-1.5 mb-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({cartItems.length} items)</span>
                <span className="font-medium">₹{subtotal.toFixed(0)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-green-600 flex items-center gap-1">
                    <Tag className="h-3 w-3" /> You save
                  </span>
                  <span className="text-green-600 font-medium" data-testid="text-savings">
                    -₹{savings.toFixed(0)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className={deliveryFee === 0 ? "text-green-600 font-medium" : "font-medium"}>
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base font-bold">
                <span>Total</span>
                <span className="text-primary" data-testid="text-total">₹{total.toFixed(0)}</span>
              </div>
            </div>

            <Button
              onClick={() => setLocation("/ecommerce/checkout")}
              className="w-full font-semibold"
              data-testid="button-checkout"
            >
              Proceed to Checkout
            </Button>
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
