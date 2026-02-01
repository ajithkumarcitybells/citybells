import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, Clock, CheckCircle, Truck, XCircle, User, MapPin, ChevronDown, ChevronUp } from "lucide-react";
import { AdminLayout } from "./index";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Order, OrderItem } from "@shared/schema";

type OrderWithCustomer = Order & { customerName?: string; customerEmail?: string };

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

export default function AdminOrdersPage() {
  const { toast } = useToast();
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);

  const { data: orders = [], isLoading } = useQuery<OrderWithCustomer[]>({
    queryKey: ["/api/admin/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/orders/${orderId}`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order", description: error.message, variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
        <p className="text-gray-500">Manage customer orders</p>
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
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No orders yet</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Delivery Address</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((order) => {
                const items = order.items as OrderItem[];
                const status = statusConfig[order.status || 'pending'];
                const StatusIcon = status.icon;
                
                return (
                  <TableRow key={order.id} data-testid={`order-row-${order.id}`}>
                    <TableCell>
                      <p className="font-mono text-sm">#{order.id.slice(0, 8).toUpperCase()}</p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{order.customerName || 'Unknown'}</p>
                          <p className="text-xs text-gray-500">{order.customerEmail || '-'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Collapsible 
                        open={expandedOrder === order.id}
                        onOpenChange={(open) => setExpandedOrder(open ? order.id : null)}
                      >
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-auto p-1 gap-2" data-testid={`button-expand-items-${order.id}`}>
                            <div className="flex -space-x-2">
                              {items.slice(0, 3).map((item, i) => (
                                <div 
                                  key={i}
                                  className="w-8 h-8 bg-gray-100 rounded-full border-2 border-white overflow-hidden"
                                >
                                  {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                                  )}
                                </div>
                              ))}
                            </div>
                            <span className="text-sm text-gray-500">
                              {items.length} item{items.length > 1 ? 's' : ''}
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
                                <div className="w-10 h-10 bg-white rounded-lg overflow-hidden flex-shrink-0">
                                  {item.image ? (
                                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-gray-800 truncate">{item.name}</p>
                                  <p className="text-gray-500">Qty: {item.quantity} × ₹{parseFloat(item.price).toFixed(2)}</p>
                                </div>
                                <p className="font-medium text-gray-700">
                                  ₹{(item.quantity * parseFloat(item.price)).toFixed(2)}
                                </p>
                              </div>
                            ))}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    </TableCell>
                    <TableCell>
                      <p className="font-semibold text-primary">
                        ₹{parseFloat(order.totalAmount).toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-start gap-2 max-w-xs">
                        <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {order.deliveryAddress || '-'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm text-gray-500">
                        {order.createdAt 
                          ? new Date(order.createdAt).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })
                          : '-'
                        }
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} flex items-center gap-1 w-fit`}>
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Select
                        value={order.status || 'pending'}
                        onValueChange={(value) => updateStatusMutation.mutate({ 
                          orderId: order.id, 
                          status: value 
                        })}
                      >
                        <SelectTrigger className="w-32" data-testid={`select-status-${order.id}`}>
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
