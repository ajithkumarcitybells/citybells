import { useQuery, useMutation } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Package, Clock, CheckCircle, Truck, XCircle, RefreshCw, ChevronDown, ChevronUp, MapPin, CreditCard } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { EcomOrder, EcomOrderItem } from "@shared/schema";
import { useState } from "react";

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string; step: number }> = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400", label: "Pending", step: 0 },
  confirmed: { icon: CheckCircle, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", label: "Confirmed", step: 1 },
  processing: { icon: Package, color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", label: "Processing", step: 2 },
  shipped: { icon: Truck, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400", label: "Shipped", step: 3 },
  delivered: { icon: CheckCircle, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", label: "Delivered", step: 4 },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", label: "Cancelled", step: -1 },
};

const trackingSteps = ["Pending", "Confirmed", "Processing", "Shipped", "Delivered"];

export default function EcomOrdersPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<EcomOrder[]>({
    queryKey: ["/api/ecom/orders"],
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 10000,
  });

  const reorderMutation = useMutation({
    mutationFn: async (order: EcomOrder) => {
      const items = order.items as EcomOrderItem[];
      for (const item of items) {
        await apiRequest("POST", "/api/ecom/cart", {
          userId: user!.id,
          productId: item.productId,
          quantity: item.quantity,
          variant: item.variant || null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/cart"] });
      toast({
        title: "Items added to cart",
        description: "All items from this order have been added to your cart.",
      });
      setLocation("/ecommerce/cart");
    },
    onError: (error: Error) => {
      toast({
        title: "Reorder failed",
        description: error.message || "Some items could not be added. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleExpand = (orderId: string) => {
    setExpandedOrder(prev => prev === orderId ? null : orderId);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Please login to view your orders</p>
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
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-4" data-testid="text-page-title">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="flex gap-3 mb-3 flex-wrap">
                  <Skeleton className="w-14 h-14 rounded-md" />
                  <Skeleton className="w-14 h-14 rounded-md" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </Card>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground/40 mb-4" />
            <h2 className="text-xl font-semibold mb-2" data-testid="text-no-orders">No orders yet</h2>
            <p className="text-muted-foreground mb-6">Start shopping to see your orders here</p>
            <Link href="/ecommerce">
              <Button data-testid="button-shop">Browse Products</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items as EcomOrderItem[];
              const status = statusConfig[order.status || 'pending'];
              const StatusIcon = status.icon;
              const isExpanded = expandedOrder === order.id;
              const currentStep = status.step;

              return (
                <Card
                  key={order.id}
                  className="p-4"
                  data-testid={`order-${order.id}`}
                >
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Order ID</p>
                      <p className="font-medium text-sm" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber || `EC${order.id.slice(0, 6).toUpperCase()}`}
                      </p>
                    </div>
                    <Badge className={`${status.color} flex items-center gap-1 no-default-active-elevate`} data-testid={`badge-status-${order.id}`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>

                  <div className="flex gap-2 mb-3 overflow-x-auto scrollbar-hide flex-wrap">
                    {items.slice(0, 4).map((item, index) => (
                      <div
                        key={index}
                        className="w-14 h-14 bg-muted rounded-md overflow-hidden flex-shrink-0"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20" />
                        )}
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="w-14 h-14 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-muted-foreground">
                          +{items.length - 4}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-sm mb-2">
                    <div>
                      <p className="text-muted-foreground">
                        {items.length} item{items.length > 1 ? 's' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) : ''}
                      </p>
                    </div>
                    <p className="font-bold text-primary" data-testid={`text-total-${order.id}`}>
                      ₹{parseFloat(order.totalAmount).toFixed(0)}
                    </p>
                  </div>

                  <button
                    onClick={() => toggleExpand(order.id)}
                    className="w-full flex items-center justify-center gap-1 text-sm text-muted-foreground py-1 hover-elevate rounded-md"
                    data-testid={`button-expand-${order.id}`}
                  >
                    {isExpanded ? (
                      <>Hide Details <ChevronUp className="h-4 w-4" /></>
                    ) : (
                      <>View Details <ChevronDown className="h-4 w-4" /></>
                    )}
                  </button>

                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t space-y-4">
                      {order.status !== 'cancelled' && (
                        <div className="space-y-2" data-testid={`tracking-${order.id}`}>
                          <p className="text-sm font-medium">Order Tracking</p>
                          <div className="flex items-center gap-1">
                            {trackingSteps.map((step, index) => {
                              const isActive = index <= currentStep;
                              return (
                                <div key={step} className="flex-1 flex flex-col items-center">
                                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    isActive
                                      ? 'bg-primary text-primary-foreground'
                                      : 'bg-muted text-muted-foreground'
                                  }`}>
                                    {index + 1}
                                  </div>
                                  <span className={`text-[10px] mt-1 text-center ${
                                    isActive ? 'text-primary font-medium' : 'text-muted-foreground'
                                  }`}>{step}</span>
                                  {index < trackingSteps.length - 1 && (
                                    <div className={`h-0.5 w-full absolute ${
                                      isActive ? 'bg-primary' : 'bg-muted'
                                    }`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {order.trackingNumber && (
                            <p className="text-xs text-muted-foreground">
                              Tracking: {order.trackingNumber}
                            </p>
                          )}
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-sm font-medium">Items</p>
                        {items.map((item, index) => (
                          <div key={index} className="flex items-center gap-3 text-sm">
                            <div className="w-10 h-10 bg-muted rounded-md overflow-hidden flex-shrink-0">
                              {item.image ? (
                                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gradient-to-br from-primary/10 to-primary/20" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-medium">{item.name}</p>
                              {item.variant && (
                                <p className="text-xs text-muted-foreground">Variant: {item.variant}</p>
                              )}
                              <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                            </div>
                            <span className="font-medium flex-shrink-0">
                              ₹{(parseFloat(item.price) * item.quantity).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="font-medium text-xs text-muted-foreground">Delivery Address</p>
                          <p className="text-sm" data-testid={`text-address-${order.id}`}>{order.deliveryAddress}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-sm">
                        <CreditCard className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">Payment:</span>
                        <span className="font-medium capitalize" data-testid={`text-payment-${order.id}`}>
                          {order.paymentMethod === 'cod' ? 'Cash on Delivery' : order.paymentMethod}
                        </span>
                      </div>

                      {(order.status === 'delivered' || order.status === 'cancelled') && (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => reorderMutation.mutate(order)}
                          disabled={reorderMutation.isPending}
                          data-testid={`button-reorder-${order.id}`}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {reorderMutation.isPending ? "Adding to cart..." : "Reorder"}
                        </Button>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
