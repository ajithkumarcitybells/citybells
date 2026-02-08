import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { ArrowLeft, Package, Clock, CheckCircle, Truck, XCircle, User, MapPin, CreditCard, Calendar, Hash } from "lucide-react";
import { AdminLayout } from "./index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem } from "@shared/schema";

type OrderWithCustomer = Order & {
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerUsername?: string;
};

const statusConfig: Record<string, { icon: typeof Package; color: string; label: string }> = {
  pending: { icon: Clock, color: "bg-yellow-100 text-yellow-700", label: "Pending" },
  confirmed: { icon: CheckCircle, color: "bg-blue-100 text-blue-700", label: "Confirmed" },
  processing: { icon: Package, color: "bg-purple-100 text-purple-700", label: "Processing" },
  shipped: { icon: Truck, color: "bg-indigo-100 text-indigo-700", label: "Shipped" },
  delivered: { icon: CheckCircle, color: "bg-green-100 text-green-700", label: "Delivered" },
  cancelled: { icon: XCircle, color: "bg-red-100 text-red-700", label: "Cancelled" },
};

const statusOptions = [
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "processing", label: "Processing" },
  { value: "shipped", label: "Shipped" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrderDetailPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/admin/orders/:id");
  const orderId = params?.id;

  const { data: order, isLoading } = useQuery<OrderWithCustomer>({
    queryKey: ["/api/admin/orders", orderId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/orders/${orderId}`);
      if (!res.ok) throw new Error("Failed to fetch order");
      return res.json();
    },
    enabled: !!orderId,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${orderId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders", orderId] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-60 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!order) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Order not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/orders")} data-testid="button-back-orders">
            Back to Orders
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const items = order.items as OrderItem[];
  const status = statusConfig[order.status || "pending"];
  const StatusIcon = status.icon;
  const displayOrderNumber = order.orderNumber || `CB${order.id.slice(0, 6).toUpperCase()}`;

  return (
    <AdminLayout>
      <div className="mb-6">
        <button
          onClick={() => navigate("/admin/orders")}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
          data-testid="button-back-orders"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="font-medium">Back to Orders</span>
        </button>

        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800" data-testid="text-order-number">
              {displayOrderNumber}
            </h1>
            <Badge className={`${status.color} flex items-center gap-1`}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </Badge>
          </div>
          <Select
            value={order.status || "pending"}
            onValueChange={(value) =>
              updateStatusMutation.mutate({ orderId: order.id, status: value })
            }
          >
            <SelectTrigger className="w-40" data-testid="select-order-status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Package className="h-4 w-4" />
              Order Items ({items.length})
            </h2>
            <div className="divide-y">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-3 py-3" data-testid={`order-item-${i}`}>
                  <div className="w-14 h-14 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 truncate">{item.name}</p>
                    <p className="text-sm text-gray-500">
                      Qty: {item.quantity} x ₹{parseFloat(item.price).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold text-gray-800" data-testid={`text-item-total-${i}`}>
                    ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
            <div className="border-t pt-3 mt-1 flex items-center justify-between">
              <p className="font-semibold text-gray-800">Total</p>
              <p className="font-bold text-lg text-primary" data-testid="text-order-total">
                ₹{parseFloat(order.totalAmount).toFixed(2)}
              </p>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Customer
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-gray-500" />
                </div>
                <div>
                  <p className="font-medium text-gray-800" data-testid="text-customer-name">
                    {order.customerName || order.customerUsername || "Unknown"}
                  </p>
                  {order.customerEmail && (
                    <p className="text-gray-500" data-testid="text-customer-email">{order.customerEmail}</p>
                  )}
                  {order.customerPhone && (
                    <p className="text-gray-500" data-testid="text-customer-phone">{order.customerPhone}</p>
                  )}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Delivery Address
            </h2>
            <p className="text-sm text-gray-700" data-testid="text-delivery-address">
              {order.deliveryAddress || "-"}
            </p>
          </Card>

          <Card className="p-4">
            <h2 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Hash className="h-4 w-4" />
              Order Info
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  Date
                </span>
                <span className="text-gray-800" data-testid="text-order-date">
                  {order.createdAt
                    ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </span>
              </div>
              {order.deliverySlot && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500 flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    Slot
                  </span>
                  <span className="text-gray-800" data-testid="text-delivery-slot">{order.deliverySlot}</span>
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-gray-500 flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5" />
                  Payment
                </span>
                <span className="text-gray-800 capitalize" data-testid="text-payment-method">
                  {order.paymentMethod === "cod" ? "Cash on Delivery" : order.paymentMethod || "-"}
                </span>
              </div>
              {order.paymentId && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-gray-500">Payment ID</span>
                  <span className="text-gray-800 font-mono text-xs" data-testid="text-payment-id">
                    {order.paymentId}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
