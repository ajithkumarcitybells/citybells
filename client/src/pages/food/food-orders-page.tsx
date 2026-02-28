import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ChevronLeft, Clock, CheckCircle2, Truck, ChefHat, Package, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BottomNav } from "@/components/BottomNav";
import { useAuth } from "@/hooks/use-auth";
import type { FoodOrder, FoodOrderItem } from "@shared/schema";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  placed: { label: "Placed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  accepted: { label: "Accepted", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: ChefHat },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-200", icon: Package },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

function OrderCard({ order }: { order: FoodOrder }) {
  const items = (order.items as unknown as FoodOrderItem[]) || [];
  const total = parseFloat(order.totalAmount);
  const deliveryFee = parseFloat(order.deliveryFee || "0");
  const status = statusConfig[order.status || "placed"] || statusConfig.placed;
  const StatusIcon = status.icon;
  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();

  return (
    <Card className="overflow-hidden" data-testid={`order-card-${order.id}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <p className="text-xs text-gray-400">
              {createdAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
          <Badge className={`${status.color} gap-1`} data-testid={`badge-status-${order.id}`}>
            <StatusIcon className="h-3 w-3" />
            {status.label}
          </Badge>
        </div>

        <div className="space-y-1 mb-3">
          {items.map((item, idx) => (
            <div key={idx} className="flex justify-between text-sm">
              <span className="text-gray-600">
                {item.quantity}x {item.name}
              </span>
              <span className="text-gray-700">₹{(parseFloat(item.price) * item.quantity).toFixed(0)}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-between pt-2 border-t border-gray-100">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-sm font-bold text-gray-900" data-testid={`text-order-total-${order.id}`}>
            ₹{(total + deliveryFee).toFixed(0)}
          </span>
        </div>

        {order.deliveryAddress && (
          <p className="text-xs text-gray-400 mt-2 line-clamp-1">{order.deliveryAddress}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function FoodOrdersPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery<FoodOrder[]>({
    queryKey: ["/api/food/orders"],
    enabled: !!user,
  });

  const sortedOrders = [...orders].sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center gap-3 px-4 py-3 max-w-lg mx-auto">
          <button onClick={() => setLocation("/food")} data-testid="button-back">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <h1 className="text-lg font-bold text-gray-800" data-testid="text-page-title">Food Orders</h1>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array(3)
              .fill(0)
              .map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-5 w-20" />
                    </div>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                </Card>
              ))}
          </div>
        ) : sortedOrders.length === 0 ? (
          <div className="text-center py-16">
            <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium" data-testid="text-no-orders">No orders yet</p>
            <p className="text-gray-400 text-sm mt-1">Your food orders will appear here</p>
          </div>
        ) : (
          sortedOrders.map((order) => <OrderCard key={order.id} order={order} />)
        )}
      </main>

      <BottomNav />
    </div>
  );
}
