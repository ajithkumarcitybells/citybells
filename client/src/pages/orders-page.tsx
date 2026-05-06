import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Package, Clock, CheckCircle, Truck, XCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { Order, OrderItem } from "@shared/schema";
import { SubscriberBadge } from "@/components/GrocerySubscription";

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "bg-blue-100 text-blue-700", label: "Confirmed" },
  processing: { icon: Package, color: "bg-purple-100 text-purple-700", label: "Processing" },
  shipped: { icon: Truck, color: "bg-indigo-100 text-indigo-700", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Delivered" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Cancelled" },
};

export default function OrdersPage() {
  const { user } = useAuth();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Data is fresh for 10 seconds
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Please login to view your orders</p>
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
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-4">My Orders</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4">
                <Skeleton className="h-5 w-32 mb-3" />
                <div className="flex gap-3 mb-3">
                  <Skeleton className="w-16 h-16 rounded-lg" />
                  <Skeleton className="w-16 h-16 rounded-lg" />
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-24" />
              </div>
            ))}
          </div>
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">No orders yet</h2>
            <p className="text-gray-500 mb-6">Start shopping to see your orders here</p>
            <Link href="/grocery">
              <Button className="bg-primary text-white" data-testid="button-shop">
                Start Shopping
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => {
              const items = order.items as OrderItem[];
              const status = statusConfig[order.status || 'pending'];
              const StatusIcon = status.icon;
              
              return (
                <div 
                  key={order.id} 
                  className="bg-white rounded-xl p-4 shadow-sm"
                  data-testid={`order-${order.id}`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-xs text-gray-500">Order ID</p>
                      <p className="font-medium text-gray-800 text-sm">
                        {order.orderNumber || `CB${order.id.slice(0, 6).toUpperCase()}`}
                      </p>
                    </div>
                    <Badge className={`${status.color} flex items-center gap-1`}>
                      <StatusIcon className="h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                  {order.priorityDelivery && (
                    <div className="mb-3">
                      <SubscriberBadge compact />
                    </div>
                  )}
                  
                  <div className="flex gap-2 mb-3 overflow-x-auto">
                    {items.slice(0, 4).map((item, index) => (
                      <div 
                        key={index}
                        className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0"
                      >
                        {item.image ? (
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                        )}
                      </div>
                    ))}
                    {items.length > 4 && (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-medium text-gray-500">
                          +{items.length - 4}
                        </span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div>
                      <p className="text-gray-500">
                        {items.length} item{items.length > 1 ? 's' : ''} • {order.deliverySlot}
                      </p>
                      <p className="text-xs text-gray-400">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        }) : ''}
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      ₹{parseFloat(order.totalAmount).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
