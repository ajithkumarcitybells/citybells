import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { UtensilsCrossed } from "lucide-react";
import { AdminLayout } from "./index";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { FoodRestaurant, FoodOrder } from "@shared/schema";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const orderStatusColors: Record<string, string> = {
  placed: "bg-yellow-100 text-yellow-800",
  accepted: "bg-blue-100 text-blue-800",
  preparing: "bg-orange-100 text-orange-800",
  out_for_delivery: "bg-purple-100 text-purple-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const formatStatus = (status: string) =>
  status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

export default function AdminFoodPage() {
  const [activeTab, setActiveTab] = useState<"restaurants" | "orders">("restaurants");

  const { data: restaurants = [], isLoading: loadingRestaurants } = useQuery<FoodRestaurant[]>({
    queryKey: ["/api/admin/food/restaurants"],
  });

  const { data: orders = [], isLoading: loadingOrders } = useQuery<FoodOrder[]>({
    queryKey: ["/api/admin/food/orders"],
  });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  const tabs = [
    { key: "restaurants" as const, label: "Restaurants", count: restaurants.length },
    { key: "orders" as const, label: "Orders", count: orders.length },
  ];

  const { toast } = useToast();
  const [addOpen, setAddOpen] = useState(false);
  const [menuDrawerOpen, setMenuDrawerOpen] = useState(false);
  const [currentRestaurantId, setCurrentRestaurantId] = useState<string | null>(null);
  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [foodForm, setFoodForm] = useState<any>({ name: '', description: '', price: '', category: '', cuisineType: '', image: null, isAvailable: true });
  const [name, setName] = useState("");
  const [cuisine, setCuisine] = useState("");
  const [rating, setRating] = useState<string>("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const createRestaurant = useMutation({
    mutationFn: async () => {
      const payload = {
        name: name.trim(),
        cuisine: cuisine.split(",").map((s) => s.trim()).filter(Boolean),
        rating: rating ? rating.trim() : undefined,
        deliveryTime: deliveryTime.trim() || undefined,
        isActive,
      };
      const res = await apiRequest("POST", "/api/admin/food/restaurants", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/food/restaurants"] });
      setAddOpen(false);
      setName("");
      setCuisine("");
      setRating("");
      setDeliveryTime("");
      setIsActive(true);
      toast({ title: "Restaurant created", description: "The restaurant was added successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Create failed", description: err?.message || "Failed to create restaurant.", variant: "destructive" });
    },
  });

  const updateRestaurant = useMutation({
    mutationFn: async (id: string) => {
      const payload = {
        name: name.trim(),
        cuisine: cuisine.split(",").map((s) => s.trim()).filter(Boolean),
        rating: rating ? rating.trim() : undefined,
        deliveryTime: deliveryTime.trim() || undefined,
        isActive,
      };
      const res = await apiRequest("PATCH", `/api/admin/food/restaurants/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/food/restaurants"] });
      setAddOpen(false);
      setSelectedId(null);
      setName("");
      setCuisine("");
      setRating("");
      setDeliveryTime("");
      setIsActive(true);
      toast({ title: "Restaurant updated", description: "The restaurant was updated successfully." });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err?.message || "Failed to update restaurant.", variant: "destructive" });
    },
  });

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3 mb-1">
            <div className="flex items-center gap-3">
              <UtensilsCrossed className="h-6 w-6 text-orange-500" />
              <h1 className="text-2xl font-bold text-gray-800" data-testid="text-food-admin-title">
                Food Delivery Management
              </h1>
            </div>
            <div>
              <Button onClick={() => setAddOpen(true)} data-testid="button-add-restaurant">Add Restaurant</Button>
            </div>
          </div>
          <p className="text-gray-500 ml-9">Manage restaurants and food orders</p>
        </div>

        <div className="flex gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.key
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-600 hover-elevate"
              }`}
              data-testid={`tab-${tab.key}`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>

        {activeTab === "restaurants" && (
          <Card className="overflow-hidden">
            {loadingRestaurants ? (
              <div className="p-4 space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : restaurants.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500" data-testid="text-empty-restaurants">No restaurants found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-restaurants">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                        <th className="px-5 py-3 font-medium">Name</th>
                        <th className="px-5 py-3 font-medium">Cuisine</th>
                        <th className="px-5 py-3 font-medium">Rating</th>
                        <th className="px-5 py-3 font-medium">Delivery Time</th>
                        <th className="px-5 py-3 font-medium">Active</th>
                        <th className="px-5 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {restaurants.map((restaurant) => (
                      <tr key={restaurant.id} className="border-b last:border-0" data-testid={`row-restaurant-${restaurant.id}`}>
                        <td className="px-5 py-3 font-medium text-gray-800">{restaurant.name}</td>
                        <td className="px-5 py-3 text-gray-600">
                          {restaurant.cuisine && restaurant.cuisine.length > 0
                            ? restaurant.cuisine.join(", ")
                            : "N/A"}
                        </td>
                        <td className="px-5 py-3 text-gray-700">{restaurant.rating || "N/A"}</td>
                        <td className="px-5 py-3 text-gray-600">{restaurant.deliveryTime || "N/A"}</td>
                        <td className="px-5 py-3">
                          <Badge
                            className={`no-default-hover-elevate no-default-active-elevate ${
                              restaurant.isActive
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                            data-testid={`badge-active-${restaurant.id}`}
                          >
                            {restaurant.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        <td className="px-5 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => {
                              // populate form and open dialog for edit
                              setSelectedId(restaurant.id);
                              setName(restaurant.name || "");
                              setCuisine((restaurant.cuisine || []).join(", ") || "");
                              setRating(restaurant.rating || "");
                              setDeliveryTime(restaurant.deliveryTime || "");
                              setIsActive(!!restaurant.isActive);
                              setAddOpen(true);
                            }} data-testid={`button-edit-restaurant-${restaurant.id}`}>Edit</Button>
                            <Button size="sm" variant="outline" onClick={async () => {
                              setCurrentRestaurantId(restaurant.id);
                              setMenuDrawerOpen(true);
                              try {
                                const res = await apiRequest('GET', `/api/admin/food/menu/${restaurant.id}`);
                                const data = await res.json();
                                setMenuItems(data || []);
                                // prefill cuisineType options from restaurant.cuisine
                                setFoodForm((f:any) => ({ ...f, cuisineOptions: restaurant.cuisine || [] }));
                              } catch (e) {
                                toast({ title: 'Failed to load menu', description: (e as Error).message, variant: 'destructive' });
                              }
                            }}>Manage Menu</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}

        <Dialog open={addOpen} onOpenChange={(v) => setAddOpen(v)}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Restaurant</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 mt-2">
              <div>
                <label className="text-sm text-gray-700">Name</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Restaurant name" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Cuisine (comma separated)</label>
                <Input value={cuisine} onChange={(e) => setCuisine(e.target.value)} placeholder="e.g. Indian, Chinese" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Rating</label>
                <Input value={rating} onChange={(e) => setRating(e.target.value)} placeholder="4.5" />
              </div>
              <div>
                <label className="text-sm text-gray-700">Delivery Time</label>
                <Input value={deliveryTime} onChange={(e) => setDeliveryTime(e.target.value)} placeholder="e.g. 30-40 mins" />
              </div>
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-700">Active</div>
                <Switch checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} data-testid="switch-restaurant-active" />
              </div>
              <div className="flex items-center gap-2 justify-end pt-2">
                <Button variant="ghost" onClick={() => { setAddOpen(false); setSelectedId(null); }}>Cancel</Button>
                <Button onClick={() => {
                  if (selectedId) {
                    updateRestaurant.mutate(selectedId);
                  } else {
                    createRestaurant.mutate();
                  }
                }} data-testid="button-save-restaurant">{selectedId ? "Update" : "Save"}</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

      <Drawer open={menuDrawerOpen} onOpenChange={(v) => { if (!v) { setCurrentRestaurantId(null); setMenuItems([]); } setMenuDrawerOpen(v); }}>
        <DrawerContent className="fixed right-0 top-0 h-full w-full max-w-lg bg-white dark:bg-gray-800 shadow-xl p-4">
          <div className="flex items-center justify-between">
            <DrawerHeader>
              <DrawerTitle>Manage Menu</DrawerTitle>
            </DrawerHeader>
            <DrawerClose asChild>
              <button aria-label="Close menu" onClick={() => setMenuDrawerOpen(false)} className="text-gray-600">✕</button>
            </DrawerClose>
          </div>

          <div className="mt-3 overflow-y-auto pb-20">
            <div className="mb-4">
              <h3 className="font-semibold">Menu Items</h3>
              <div className="mt-2 space-y-2">
                {menuItems.length === 0 ? <p className="text-sm text-gray-500">No items</p> : menuItems.map((m:any)=> (
                  <div key={m.id} className="flex items-center justify-between border p-2 rounded">
                    <div>
                      <div className="font-medium">{m.name}</div>
                      <div className="text-sm text-muted-foreground">{m.category} • {m.cuisineType}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setFoodForm({ ...m, cuisineOptions: foodForm.cuisineOptions || [] }); }}>Edit</Button>
                      <Button size="sm" variant="destructive" onClick={async ()=>{ if (!confirm('Delete item?')) return; try{ await apiRequest('DELETE', `/api/admin/food/menu/${m.id}`); const res = await apiRequest('GET', `/api/admin/food/menu/${currentRestaurantId}`); setMenuItems(await res.json()); toast({ title: 'Deleted' }); } catch(e){ toast({ title: 'Delete failed', description: (e as Error).message, variant:'destructive' }); } }}>Delete</Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold mb-2">Add / Edit Item</h3>
              <div className="space-y-3">
                <div>
                  <Label>Name</Label>
                  <Input value={foodForm.name || ''} onChange={(e:any)=>setFoodForm({...foodForm, name: e.target.value})} aria-label="Food name" />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea value={foodForm.description || ''} onChange={(e:any)=>setFoodForm({...foodForm, description: e.target.value})} aria-label="Food description" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Price</Label>
                    <Input type="number" value={foodForm.price || ''} onChange={(e:any)=>setFoodForm({...foodForm, price: e.target.value})} aria-label="Food price" />
                  </div>
                  <div>
                    <Label>Category</Label>
                    <Input value={foodForm.category || ''} onChange={(e:any)=>setFoodForm({...foodForm, category: e.target.value})} aria-label="Food category" />
                  </div>
                </div>
                <div>
                  <Label>Cuisine Type</Label>
                  <div className="flex gap-2 flex-wrap">
                    {(foodForm.cuisineOptions || []).map((c:string)=> (
                      <button key={c} type="button" className={`px-2 py-1 rounded ${foodForm.cuisineType===c? 'bg-primary text-white':'bg-gray-100'}`} onClick={()=>setFoodForm({...foodForm, cuisineType:c})}>{c}</button>
                    ))}
                    <Input placeholder="Custom" value={foodForm.cuisineTypeCustom||''} onChange={(e:any)=>setFoodForm({...foodForm, cuisineType: e.target.value, cuisineTypeCustom: e.target.value})} className="w-40" />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label>Available</Label>
                  <Checkbox checked={!!foodForm.isAvailable} onCheckedChange={(v:any)=>setFoodForm({...foodForm, isAvailable: !!v})} />
                </div>
                <div className="flex items-center gap-2">
                  <input type="file" accept="image/*" onChange={(e:any)=> setFoodForm({...foodForm, imageFile: e.target.files?.[0]})} />
                </div>
                <div className="pt-3 flex gap-2 justify-end">
                  <Button variant="ghost" onClick={()=>setFoodForm({ name: '', description:'', price: '', category:'', cuisineType:'', isAvailable:true, cuisineOptions: foodForm.cuisineOptions || [] })}>Reset</Button>
                  <Button onClick={async ()=>{
                    if (!currentRestaurantId) return toast({ title: 'Missing restaurant', variant:'destructive' });
                    if (!foodForm.name || !foodForm.price) return toast({ title: 'Name and price required', variant:'destructive' });
                    try {
                      let imagePath = foodForm.image || null;
                      if (foodForm.imageFile) {
                        const metaRes = await apiRequest('POST', '/api/uploads/request-url', { name: foodForm.imageFile.name, size: foodForm.imageFile.size, contentType: foodForm.imageFile.type });
                        const pres = await metaRes.json();
                        await fetch(pres.uploadURL, { method: 'PUT', body: foodForm.imageFile });
                        imagePath = pres.objectPath || pres.uploadURL;
                      }
                      const payload = { restaurantId: currentRestaurantId, name: foodForm.name, description: foodForm.description || '', price: String(foodForm.price), image: imagePath, category: foodForm.category || '', cuisineType: foodForm.cuisineType || '' , isAvailable: !!foodForm.isAvailable };
                      if (foodForm.id) {
                        await apiRequest('PATCH', `/api/admin/food/menu/${foodForm.id}`, payload);
                        toast({ title: 'Updated' });
                      } else {
                        await apiRequest('POST', '/api/admin/food/menu', payload);
                        toast({ title: 'Added' });
                      }
                      const res = await apiRequest('GET', `/api/admin/food/menu/${currentRestaurantId}`);
                      setMenuItems(await res.json());
                      setFoodForm({ name: '', description:'', price: '', category:'', cuisineType:'', isAvailable:true, cuisineOptions: foodForm.cuisineOptions || [] });
                    } catch (e) {
                      toast({ title: 'Save failed', description: (e as Error).message, variant:'destructive' });
                    }
                  }}>Save Item</Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

        {activeTab === "orders" && (
          <Card className="overflow-hidden">
            {loadingOrders ? (
              <div className="p-4 space-y-4">
                {Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex gap-4">
                    <Skeleton className="h-10 w-32" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-1/3" />
                      <Skeleton className="h-3 w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-12">
                <UtensilsCrossed className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500" data-testid="text-empty-orders">No food orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm" data-testid="table-orders">
                  <thead>
                    <tr className="text-left text-gray-500 border-b">
                      <th className="px-5 py-3 font-medium">Order ID</th>
                      <th className="px-5 py-3 font-medium">Restaurant</th>
                      <th className="px-5 py-3 font-medium">Total</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order) => {
                      const status = order.status || "placed";
                      return (
                        <tr key={order.id} className="border-b last:border-0" data-testid={`row-order-${order.id}`}>
                          <td className="px-5 py-3">
                            <span className="font-mono text-sm text-blue-600" data-testid={`text-order-id-${order.id}`}>
                              {order.id.slice(0, 8)}...
                            </span>
                          </td>
                          <td className="px-5 py-3 text-gray-700">{order.restaurantId}</td>
                          <td className="px-5 py-3 font-medium text-gray-800">{formatCurrency(order.totalAmount)}</td>
                          <td className="px-5 py-3">
                            <Badge
                              className={`no-default-hover-elevate no-default-active-elevate ${orderStatusColors[status] || "bg-gray-100 text-gray-800"}`}
                              data-testid={`badge-status-${order.id}`}
                            >
                              {formatStatus(status)}
                            </Badge>
                          </td>
                          <td className="px-5 py-3 text-gray-500">
                            {order.createdAt
                              ? new Date(order.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                              : "N/A"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
