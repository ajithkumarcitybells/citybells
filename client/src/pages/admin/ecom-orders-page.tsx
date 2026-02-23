import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, Clock, CheckCircle, Truck, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import { AdminLayout } from "./index";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EcomOrder, EcomOrderItem } from "@shared/schema";

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

export default function AdminEcomOrdersPage() {
  const { toast } = useToast();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: orders = [], isLoading } = useQuery<EcomOrder[]>({
    queryKey: ["/api/admin/ecom/orders"],
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/ecom/orders/${orderId}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecom/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    },
  });

  const filteredOrders = statusFilter === "all" ? orders : orders.filter(o => o.status === statusFilter);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-ecom-orders-title">E-Commerce Orders</h1>
          <p className="text-gray-500">Monitor and manage e-commerce orders</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40" data-testid="select-status-filter">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {statusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Auto-refresh</span>
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="p-4 space-y-4">
            {Array(5).fill(0).map((_, i) => (
              <div key={i} className="flex gap-4">
                <Skeleton className="h-12 w-24" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500" data-testid="text-empty-ecom-orders">No e-commerce orders yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Payment</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Update</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => {
                const items = order.items as EcomOrderItem[];
                const status = statusConfig[order.status || "pending"];
                const StatusIcon = status?.icon || Clock;

                return (
                  <TableRow key={order.id} data-testid={`ecom-order-row-${order.id}`}>
                    <TableCell>
                      <span className="font-mono text-sm text-blue-600" data-testid={`text-order-number-${order.id}`}>
                        {order.orderNumber || `EC${order.id.slice(0, 6).toUpperCase()}`}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Collapsible
                        open={expandedOrder === order.id}
                        onOpenChange={(open) => setExpandedOrder(open ? order.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-1 gap-2" data-testid={`button-expand-${order.id}`}>
                            <span className="text-sm text-gray-500">
                              {items.length} item{items.length > 1 ? "s" : ""}
                            </span>
                            {expandedOrder === order.id ? (
                              <ChevronUp className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                            {items.map((item, i) => (
                              <div key={i} className="flex items-center gap-3 text-sm">
                                <div className="w-8 h-8 bg-white rounded overflow-hidden flex-shrink-0">
                                  {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-blue-100 to-blue-200" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                  <p className="text-gray-500">Qty: {item.quantity} x {formatCurrency(item.price)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-primary">{formatCurrency(order.totalAmount)}</p>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600 capitalize">
                        {order.paymentMethod === "cod" ? "COD" : order.paymentMethod || "N/A"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-500">
                        {order.createdAt
                          ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short" })
                          : "-"}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status?.color || "bg-gray-100 text-gray-700"} flex items-center gap-1 w-fit no-default-hover-elevate no-default-active-elevate`}>
                        <StatusIcon className="h-3 w-3" />
                        {status?.label || order.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={order.status || "pending"}
                        onValueChange={(value) => updateStatusMutation.mutate({ orderId: order.id, status: value })}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-update-status-${order.id}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </AdminLayout>
  );
}
