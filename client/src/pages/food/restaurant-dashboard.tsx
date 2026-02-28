import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  LayoutDashboard, UtensilsCrossed, ClipboardList, Store,
  Plus, Pencil, Trash2, ChevronLeft, LogOut,
  Clock, CheckCircle2, ChefHat, Truck, Package, XCircle,
  TrendingUp, DollarSign, AlertCircle, CircleDot
} from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { FoodRestaurant, FoodMenuItem, FoodOrder, FoodOrderItem } from "@shared/schema";
import logoPath from "@assets/citybells-logo_1769903304782.png";

const menuItemSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  price: z.coerce.number().min(1, "Price is required"),
  image: z.string().optional(),
  category: z.string().default("Main Course"),
  isVeg: z.boolean().default(false),
  isAvailable: z.boolean().default(true),
});

type MenuItemFormData = z.infer<typeof menuItemSchema>;

const restaurantProfileSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  image: z.string().optional(),
  cuisine: z.string().optional(),
  deliveryTime: z.string().optional(),
  minOrder: z.coerce.number().min(0).optional(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
  address: z.string().optional(),
});

type RestaurantProfileFormData = z.infer<typeof restaurantProfileSchema>;

type SectionId = "overview" | "menu" | "orders" | "profile";

const sidebarItems: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "menu", label: "Menu", icon: UtensilsCrossed },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "profile", label: "Restaurant", icon: Store },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  placed: { label: "Placed", color: "bg-blue-100 text-blue-700 border-blue-200", icon: Clock },
  accepted: { label: "Accepted", color: "bg-indigo-100 text-indigo-700 border-indigo-200", icon: CheckCircle2 },
  preparing: { label: "Preparing", color: "bg-yellow-100 text-yellow-700 border-yellow-200", icon: ChefHat },
  out_for_delivery: { label: "Out for Delivery", color: "bg-orange-100 text-orange-700 border-orange-200", icon: Truck },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 border-green-200", icon: Package },
  cancelled: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-200", icon: XCircle },
};

const statusTransitions: Record<string, string[]> = {
  placed: ["accepted", "cancelled"],
  accepted: ["preparing", "cancelled"],
  preparing: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
};

const menuCategories = ["Starters", "Main Course", "Desserts", "Drinks", "Snacks", "Sides"];

export default function RestaurantDashboard() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isMenuDialogOpen, setIsMenuDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<FoodMenuItem | null>(null);
  const [deleteItemId, setDeleteItemId] = useState<string | null>(null);

  const { data: restaurant, isLoading: restLoading } = useQuery<FoodRestaurant>({
    queryKey: ["/api/food/my-restaurant"],
  });

  const { data: menuItems = [], isLoading: menuLoading } = useQuery<FoodMenuItem[]>({
    queryKey: ["/api/food/my-restaurant/menu"],
    enabled: !!restaurant,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<FoodOrder[]>({
    queryKey: ["/api/food/my-restaurant/orders"],
    enabled: !!restaurant,
  });

  const todayOrders = orders.filter((o) => {
    const d = new Date(o.createdAt || 0);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  });

  const todayRevenue = todayOrders
    .filter((o) => o.status !== "cancelled")
    .reduce((s, o) => s + parseFloat(o.totalAmount), 0);

  const pendingOrders = orders.filter((o) => ["placed", "accepted", "preparing"].includes(o.status || ""));

  const menuForm = useForm<MenuItemFormData>({
    resolver: zodResolver(menuItemSchema),
    defaultValues: { name: "", description: "", price: 0, image: "", category: "Main Course", isVeg: false, isAvailable: true },
  });

  const profileForm = useForm<RestaurantProfileFormData>({
    resolver: zodResolver(restaurantProfileSchema),
    defaultValues: {
      name: restaurant?.name || "",
      description: restaurant?.description || "",
      image: restaurant?.image || "",
      cuisine: ((restaurant?.cuisine as string[]) || []).join(", "),
      deliveryTime: restaurant?.deliveryTime || "",
      minOrder: parseFloat(restaurant?.minOrder || "99"),
      openingTime: restaurant?.openingTime || "09:00",
      closingTime: restaurant?.closingTime || "22:00",
      address: restaurant?.address || "",
    },
  });

  const createMenuItemMutation = useMutation({
    mutationFn: async (data: MenuItemFormData) => {
      const res = await apiRequest("POST", "/api/food/my-restaurant/menu", {
        ...data,
        price: data.price.toString(),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food/my-restaurant/menu"] });
      setIsMenuDialogOpen(false);
      menuForm.reset();
      toast({ title: "Menu item added" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<MenuItemFormData> }) => {
      const payload: any = { ...data };
      if (data.price !== undefined) payload.price = data.price.toString();
      const res = await apiRequest("PATCH", `/api/food/my-restaurant/menu/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food/my-restaurant/menu"] });
      setIsMenuDialogOpen(false);
      setEditingItem(null);
      menuForm.reset();
      toast({ title: "Menu item updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/food/my-restaurant/menu/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food/my-restaurant/menu"] });
      setDeleteItemId(null);
      toast({ title: "Menu item deleted" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/food/my-restaurant/orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food/my-restaurant/orders"] });
      toast({ title: "Order status updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const updateRestaurantMutation = useMutation({
    mutationFn: async (data: RestaurantProfileFormData) => {
      const payload: any = {
        ...data,
        cuisine: data.cuisine ? data.cuisine.split(",").map((s: string) => s.trim()).filter(Boolean) : [],
        minOrder: data.minOrder?.toString(),
      };
      const res = await apiRequest("PATCH", "/api/food/my-restaurant", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food/my-restaurant"] });
      toast({ title: "Restaurant updated" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed", description: err.message, variant: "destructive" });
    },
  });

  const openAddMenu = () => {
    setEditingItem(null);
    menuForm.reset({ name: "", description: "", price: 0, image: "", category: "Main Course", isVeg: false, isAvailable: true });
    setIsMenuDialogOpen(true);
  };

  const openEditMenu = (item: FoodMenuItem) => {
    setEditingItem(item);
    menuForm.reset({
      name: item.name,
      description: item.description || "",
      price: parseFloat(item.price),
      image: item.image || "",
      category: item.category || "Main Course",
      isVeg: item.isVeg || false,
      isAvailable: item.isAvailable !== false,
    });
    setIsMenuDialogOpen(true);
  };

  const handleMenuSubmit = (data: MenuItemFormData) => {
    if (editingItem) {
      updateMenuItemMutation.mutate({ id: editingItem.id, data });
    } else {
      createMenuItemMutation.mutate(data);
    }
  };

  if (restLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <img src={logoPath} alt="City Bell" className="h-12 mx-auto" />
          <Skeleton className="h-4 w-40 mx-auto" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <Card className="max-w-sm w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <h2 className="font-semibold text-gray-800 mb-2">No Restaurant Assigned</h2>
            <p className="text-sm text-gray-500 mb-4">
              Your restaurant hasn't been set up yet. Please contact the admin.
            </p>
            <Button variant="outline" onClick={() => setLocation("/")} data-testid="button-go-home">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => setLocation("/profile")} data-testid="button-back">
              <ChevronLeft className="h-5 w-5 text-gray-600" />
            </button>
            <div>
              <h1 className="text-base font-bold text-gray-800" data-testid="text-dashboard-title">
                {restaurant.name}
              </h1>
              <p className="text-xs text-gray-500">Restaurant Dashboard</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              logoutMutation.mutate();
              setLocation("/");
            }}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex overflow-x-auto border-b border-gray-100 bg-white px-2 scrollbar-hide">
        {sidebarItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-1.5 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                isActive
                  ? "border-orange-500 text-orange-600"
                  : "border-transparent text-gray-500"
              }`}
              data-testid={`tab-${item.id}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
      </div>

      <main className="px-4 py-4 max-w-3xl mx-auto">
        {activeSection === "overview" && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Today's Orders</p>
                  <p className="text-2xl font-bold text-gray-800" data-testid="text-today-orders">
                    {todayOrders.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Today's Revenue</p>
                  <p className="text-2xl font-bold text-green-600" data-testid="text-today-revenue">
                    ₹{todayRevenue.toFixed(0)}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Pending Orders</p>
                  <p className="text-2xl font-bold text-orange-600" data-testid="text-pending-orders">
                    {pendingOrders.length}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-gray-500 mb-1">Menu Items</p>
                  <p className="text-2xl font-bold text-gray-800" data-testid="text-menu-count">
                    {menuItems.length}
                  </p>
                </CardContent>
              </Card>
            </div>

            {pendingOrders.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Pending Orders</h3>
                <div className="space-y-2">
                  {pendingOrders.slice(0, 5).map((order) => {
                    const items = (order.items as unknown as FoodOrderItem[]) || [];
                    const sc = statusConfig[order.status || "placed"];
                    const StatusIcon = sc.icon;
                    const nextStatuses = statusTransitions[order.status || "placed"] || [];

                    return (
                      <Card key={order.id} data-testid={`pending-order-${order.id}`}>
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge className={`${sc.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {sc.label}
                            </Badge>
                            <span className="text-xs text-gray-400">
                              {new Date(order.createdAt || 0).toLocaleTimeString("en-IN", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">
                            {items.map((i) => `${i.quantity}x ${i.name}`).join(", ")}
                          </p>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm font-semibold">₹{parseFloat(order.totalAmount).toFixed(0)}</span>
                            <div className="flex gap-1 flex-wrap">
                              {nextStatuses.map((ns) => (
                                <Button
                                  key={ns}
                                  size="sm"
                                  variant={ns === "cancelled" ? "outline" : "default"}
                                  className={ns !== "cancelled" ? "bg-orange-500 border-orange-600 text-white" : ""}
                                  onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: ns })}
                                  disabled={updateOrderStatusMutation.isPending}
                                  data-testid={`button-status-${ns}-${order.id}`}
                                >
                                  {statusConfig[ns]?.label || ns}
                                </Button>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === "menu" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-800">Menu Items</h2>
              <Button
                size="sm"
                className="bg-orange-500 border-orange-600 text-white"
                onClick={openAddMenu}
                data-testid="button-add-menu-item"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            {menuLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : menuItems.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No menu items yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {menuItems.map((item) => (
                  <Card key={item.id} data-testid={`menu-item-card-${item.id}`}>
                    <CardContent className="p-3 flex items-center gap-3">
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {item.isVeg ? (
                          <div className="w-4 h-4 border-2 border-green-600 rounded-sm flex items-center justify-center">
                            <CircleDot className="h-2.5 w-2.5 text-green-600" />
                          </div>
                        ) : (
                          <div className="w-4 h-4 border-2 border-red-600 rounded-sm flex items-center justify-center">
                            <CircleDot className="h-2.5 w-2.5 text-red-600" />
                          </div>
                        )}
                      </div>
                      {item.image && (
                        <div className="w-12 h-12 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                          <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{item.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-sm font-semibold text-gray-700">₹{parseFloat(item.price).toFixed(0)}</span>
                          <Badge variant="outline" className="text-[10px]">{item.category}</Badge>
                          {!item.isAvailable && (
                            <Badge variant="secondary" className="text-[10px]">Unavailable</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button size="icon" variant="ghost" onClick={() => openEditMenu(item)} data-testid={`button-edit-${item.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setDeleteItemId(item.id)} data-testid={`button-delete-${item.id}`}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeSection === "orders" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">All Orders</h2>
            {ordersLoading ? (
              <div className="space-y-3">
                {Array(5).fill(0).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <ClipboardList className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No orders yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {[...orders]
                  .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                  .map((order) => {
                    const items = (order.items as unknown as FoodOrderItem[]) || [];
                    const sc = statusConfig[order.status || "placed"];
                    const StatusIcon = sc.icon;
                    const nextStatuses = statusTransitions[order.status || "placed"] || [];

                    return (
                      <Card key={order.id} data-testid={`order-card-${order.id}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="text-xs text-gray-400">
                              {new Date(order.createdAt || 0).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <Badge className={`${sc.color} gap-1`}>
                              <StatusIcon className="h-3 w-3" />
                              {sc.label}
                            </Badge>
                          </div>
                          <div className="space-y-1 mb-2">
                            {items.map((item, idx) => (
                              <p key={idx} className="text-sm text-gray-600">
                                {item.quantity}x {item.name}
                              </p>
                            ))}
                          </div>
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-sm font-bold text-gray-800">₹{parseFloat(order.totalAmount).toFixed(0)}</span>
                            {nextStatuses.length > 0 && (
                              <div className="flex gap-1 flex-wrap">
                                {nextStatuses.map((ns) => (
                                  <Button
                                    key={ns}
                                    size="sm"
                                    variant={ns === "cancelled" ? "outline" : "default"}
                                    className={ns !== "cancelled" ? "bg-orange-500 border-orange-600 text-white" : ""}
                                    onClick={() => updateOrderStatusMutation.mutate({ id: order.id, status: ns })}
                                    disabled={updateOrderStatusMutation.isPending}
                                    data-testid={`button-order-status-${ns}-${order.id}`}
                                  >
                                    {statusConfig[ns]?.label || ns}
                                  </Button>
                                ))}
                              </div>
                            )}
                          </div>
                          {order.deliveryAddress && (
                            <p className="text-xs text-gray-400 mt-2 line-clamp-1">{order.deliveryAddress}</p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {activeSection === "profile" && (
          <div className="space-y-4">
            <h2 className="text-base font-semibold text-gray-800">Restaurant Profile</h2>
            <Card>
              <CardContent className="p-4">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const values = profileForm.getValues();
                    updateRestaurantMutation.mutate(values);
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Label>Restaurant Name</Label>
                    <Input {...profileForm.register("name")} data-testid="input-restaurant-name" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea {...profileForm.register("description")} data-testid="input-restaurant-description" />
                  </div>
                  <div>
                    <Label>Image URL</Label>
                    <Input {...profileForm.register("image")} data-testid="input-restaurant-image" />
                  </div>
                  <div>
                    <Label>Cuisines (comma separated)</Label>
                    <Input {...profileForm.register("cuisine")} placeholder="North Indian, Chinese" data-testid="input-restaurant-cuisine" />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Delivery Time</Label>
                      <Input {...profileForm.register("deliveryTime")} placeholder="30-40 min" data-testid="input-delivery-time" />
                    </div>
                    <div>
                      <Label>Min Order (₹)</Label>
                      <Input type="number" {...profileForm.register("minOrder")} data-testid="input-min-order" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Opening Time</Label>
                      <Input type="time" {...profileForm.register("openingTime")} data-testid="input-opening-time" />
                    </div>
                    <div>
                      <Label>Closing Time</Label>
                      <Input type="time" {...profileForm.register("closingTime")} data-testid="input-closing-time" />
                    </div>
                  </div>
                  <div>
                    <Label>Address</Label>
                    <Textarea {...profileForm.register("address")} data-testid="input-restaurant-address" />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-orange-500 border-orange-600 text-white"
                    disabled={updateRestaurantMutation.isPending}
                    data-testid="button-save-profile"
                  >
                    {updateRestaurantMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      <Dialog open={isMenuDialogOpen} onOpenChange={setIsMenuDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "Edit Menu Item" : "Add Menu Item"}</DialogTitle>
          </DialogHeader>
          <Form {...menuForm}>
            <form onSubmit={menuForm.handleSubmit(handleMenuSubmit)} className="space-y-4">
              <FormField
                control={menuForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-menu-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={menuForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea {...field} data-testid="input-menu-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={menuForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} data-testid="input-menu-price" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={menuForm.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Image URL</FormLabel>
                    <FormControl>
                      <Input {...field} data-testid="input-menu-image" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={menuForm.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-menu-category">
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {menuCategories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex items-center gap-6">
                <FormField
                  control={menuForm.control}
                  name="isVeg"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-veg" />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Vegetarian</FormLabel>
                    </FormItem>
                  )}
                />
                <FormField
                  control={menuForm.control}
                  name="isAvailable"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 space-y-0">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-is-available" />
                      </FormControl>
                      <FormLabel className="cursor-pointer">Available</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="submit"
                  className="w-full bg-orange-500 border-orange-600 text-white"
                  disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}
                  data-testid="button-save-menu-item"
                >
                  {createMenuItemMutation.isPending || updateMenuItemMutation.isPending
                    ? "Saving..."
                    : editingItem
                    ? "Update Item"
                    : "Add Item"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteItemId} onOpenChange={() => setDeleteItemId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Menu Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this menu item? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteItemId && deleteMenuItemMutation.mutate(deleteItemId)}
              className="bg-red-500 text-white"
              data-testid="button-confirm-delete"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
