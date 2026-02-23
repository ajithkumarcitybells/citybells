import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  Plus, Pencil, Trash2, Upload, Image as ImageIcon, X as XIcon,
  LogOut, Package, AlertCircle, LayoutDashboard, ShoppingBag,
  ClipboardList, BarChart3, Store, Wallet, AlertTriangle,
  TrendingUp, DollarSign, Eye, ChevronDown, Search, Filter
} from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
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
import { useUpload } from "@/hooks/use-upload";
import { EcomProduct, EcomCategory, EcomOrder, SellerProfile } from "@shared/schema";
import logoPath from "@assets/citybells-logo_1769903304782.png";

const ecomProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  images: z.array(z.string()).default([]),
  categoryId: z.string().optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  originalPrice: z.coerce.number().min(0.01, "Original price is required"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  price: z.coerce.number().min(0.01, "Price is required"),
  variants: z.any().optional(),
  specifications: z.any().optional(),
  stock: z.coerce.number().min(0).default(100),
  isActive: z.boolean().default(true),
});

type EcomProductFormData = z.infer<typeof ecomProductSchema>;

const profileSchema = z.object({
  storeName: z.string().min(1, "Store name is required"),
  storeDescription: z.string().optional(),
  logo: z.string().optional(),
  banner: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

interface SellerStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
}

type SectionId = "overview" | "products" | "orders" | "inventory" | "earnings" | "store";

const sidebarItems: { id: SectionId; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard },
  { id: "products", label: "Products", icon: ShoppingBag },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "inventory", label: "Inventory", icon: Package },
  { id: "earnings", label: "Earnings", icon: Wallet },
  { id: "store", label: "Store Profile", icon: Store },
];

export default function SellerDashboard() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [activeSection, setActiveSection] = useState<SectionId>("overview");
  const [isProductDialogOpen, setIsProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<EcomProduct | null>(null);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [productImages, setProductImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const { uploadFile, isUploading } = useUpload({
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (user && !user.isVendor) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: products = [], isLoading: productsLoading } = useQuery<EcomProduct[]>({
    queryKey: ["/api/ecom/vendor/products"],
    enabled: !!user?.isVendor,
  });

  const { data: categories = [] } = useQuery<EcomCategory[]>({
    queryKey: ["/api/ecom/vendor/categories"],
    enabled: !!user?.isVendor,
  });

  const { data: orders = [], isLoading: ordersLoading } = useQuery<EcomOrder[]>({
    queryKey: ["/api/ecom/vendor/orders"],
    enabled: !!user?.isVendor,
  });

  const { data: stats } = useQuery<SellerStats>({
    queryKey: ["/api/ecom/vendor/stats"],
    enabled: !!user?.isVendor,
  });

  const { data: sellerProfile } = useQuery<SellerProfile | null>({
    queryKey: ["/api/ecom/vendor/profile"],
    enabled: !!user?.isVendor,
  });

  const productForm = useForm<EcomProductFormData>({
    resolver: zodResolver(ecomProductSchema),
    defaultValues: {
      name: "",
      description: "",
      images: [],
      categoryId: "",
      brand: "",
      sku: "",
      originalPrice: 0,
      discountPercent: 0,
      price: 0,
      stock: 100,
      isActive: true,
    },
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      storeName: sellerProfile?.storeName || "",
      storeDescription: sellerProfile?.storeDescription || "",
      logo: sellerProfile?.logo || "",
      banner: sellerProfile?.banner || "",
    },
  });

  useEffect(() => {
    if (sellerProfile) {
      profileForm.reset({
        storeName: sellerProfile.storeName || "",
        storeDescription: sellerProfile.storeDescription || "",
        logo: sellerProfile.logo || "",
        banner: sellerProfile.banner || "",
      });
    }
  }, [sellerProfile, profileForm]);

  const watchOriginalPrice = productForm.watch("originalPrice");
  const watchDiscountPercent = productForm.watch("discountPercent");

  useEffect(() => {
    const original = Number(watchOriginalPrice) || 0;
    const discount = Number(watchDiscountPercent) || 0;
    if (original > 0) {
      const calculated = original * (1 - discount / 100);
      productForm.setValue("price", Math.round(calculated * 100) / 100);
    }
  }, [watchOriginalPrice, watchDiscountPercent, productForm]);

  const createProductMutation = useMutation({
    mutationFn: async (data: EcomProductFormData) => {
      const payload = {
        ...data,
        originalPrice: String(data.originalPrice),
        price: String(data.price),
        images: productImages,
      };
      const res = await apiRequest("POST", "/api/ecom/vendor/products", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/stats"] });
      setIsProductDialogOpen(false);
      productForm.reset();
      setProductImages([]);
      toast({ title: "Product created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: EcomProductFormData }) => {
      const payload = {
        ...data,
        originalPrice: String(data.originalPrice),
        price: String(data.price),
        images: productImages,
      };
      const res = await apiRequest("PATCH", `/api/ecom/vendor/products/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/stats"] });
      setIsProductDialogOpen(false);
      setEditingProduct(null);
      productForm.reset();
      setProductImages([]);
      toast({ title: "Product updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/ecom/vendor/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/stats"] });
      setDeleteProductId(null);
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete product", description: error.message, variant: "destructive" });
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await apiRequest("PATCH", `/api/ecom/vendor/orders/${id}/status`, { status });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/stats"] });
      toast({ title: "Order status updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update order status", description: error.message, variant: "destructive" });
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const res = await apiRequest("POST", "/api/ecom/vendor/profile", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/vendor/profile"] });
      toast({ title: "Store profile saved" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to save profile", description: error.message, variant: "destructive" });
    },
  });

  const openCreateProductDialog = () => {
    setEditingProduct(null);
    setProductImages([]);
    productForm.reset({
      name: "", description: "", images: [], categoryId: "", brand: "", sku: "",
      originalPrice: 0, discountPercent: 0, price: 0, stock: 100, isActive: true,
    });
    setIsProductDialogOpen(true);
  };

  const openEditProductDialog = (product: EcomProduct) => {
    setEditingProduct(product);
    setProductImages((product.images as string[]) || []);
    productForm.reset({
      name: product.name,
      description: product.description || "",
      images: (product.images as string[]) || [],
      categoryId: product.categoryId || "",
      brand: product.brand || "",
      sku: product.sku || "",
      originalPrice: parseFloat(product.originalPrice),
      discountPercent: product.discountPercent || 0,
      price: parseFloat(product.price),
      stock: product.stock || 100,
      isActive: product.isActive ?? true,
    });
    setIsProductDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image size must be less than 5MB", variant: "destructive" });
      return;
    }
    const result = await uploadFile(file);
    if (result) {
      setProductImages(prev => [...prev, result.objectPath]);
      toast({ title: "Image uploaded successfully" });
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    const result = await uploadFile(file);
    if (result) {
      profileForm.setValue("logo", result.objectPath);
      toast({ title: "Logo uploaded successfully" });
    }
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const removeProductImage = (index: number) => {
    setProductImages(prev => prev.filter((_, i) => i !== index));
  };

  const onProductSubmit = (data: EcomProductFormData) => {
    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, data });
    } else {
      createProductMutation.mutate(data);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "pending": return "secondary";
      case "processing": return "default";
      case "shipped": return "default";
      case "delivered": return "default";
      case "cancelled": return "destructive";
      default: return "secondary";
    }
  };

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = orders.filter(o =>
    orderStatusFilter === "all" || o.status === orderStatusFilter
  );

  const lowStockProducts = products.filter(p => (p.stock || 0) <= 10);

  if (!user || !user.isVendor) return null;

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-testid="stat-total-products">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Total Products</p>
                <p className="text-2xl font-bold" data-testid="text-total-products">{stats?.totalProducts || products.length}</p>
              </div>
              <ShoppingBag className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-total-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold" data-testid="text-total-orders">{stats?.totalOrders || orders.length}</p>
              </div>
              <ClipboardList className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-revenue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Revenue</p>
                <p className="text-2xl font-bold" data-testid="text-revenue">
                  Rs.{(stats?.totalRevenue || 0).toLocaleString()}
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
        <Card data-testid="stat-pending-orders">
          <CardContent className="p-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div>
                <p className="text-sm text-muted-foreground">Pending Orders</p>
                <p className="text-2xl font-bold" data-testid="text-pending-orders">
                  {stats?.pendingOrders || orders.filter(o => o.status === "pending").length}
                </p>
              </div>
              <AlertCircle className="h-8 w-8 text-muted-foreground/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {lowStockProducts.length > 0 && (
        <Card data-testid="card-low-stock-alert">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Low Stock Alerts
            </CardTitle>
            <Badge variant="destructive">{lowStockProducts.length}</Badge>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {lowStockProducts.slice(0, 5).map(p => (
                <div key={p.id} className="flex items-center justify-between gap-2 flex-wrap text-sm" data-testid={`low-stock-item-${p.id}`}>
                  <span className="truncate">{p.name}</span>
                  <Badge variant="destructive">{p.stock} left</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card data-testid="card-recent-orders">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-base">Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {ordersLoading ? (
            <div className="space-y-3">
              {Array(3).fill(0).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : orders.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-recent-orders">No orders yet</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map(order => (
                <div key={order.id} className="flex items-center justify-between gap-2 flex-wrap text-sm" data-testid={`recent-order-${order.id}`}>
                  <div>
                    <p className="font-medium">#{order.orderNumber}</p>
                    <p className="text-xs text-muted-foreground">
                      {order.createdAt ? new Date(order.createdAt).toLocaleDateString() : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Rs.{parseFloat(order.totalAmount).toFixed(0)}</span>
                    <Badge variant={getStatusColor(order.status)}>{order.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderProducts = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-products"
            />
          </div>
        </div>
        <Button onClick={openCreateProductDialog} data-testid="button-add-ecom-product">
          <Plus className="h-4 w-4 mr-2" />
          Add Product
        </Button>
      </div>

      {productsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-40 w-full rounded-md mb-3" />
                <Skeleton className="h-5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2 mb-2" />
                <Skeleton className="h-4 w-1/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-products">
              {searchQuery ? "No products match your search" : "No products yet"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              {searchQuery ? "Try a different search term" : "Start by adding your first product."}
            </p>
            {!searchQuery && (
              <Button onClick={openCreateProductDialog} data-testid="button-add-product-empty">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className={product.isActive ? "" : "opacity-60"} data-testid={`card-ecom-product-${product.id}`}>
              <CardContent className="p-4">
                <div className="w-full h-40 bg-muted rounded-md overflow-hidden mb-3">
                  {(product.images as string[])?.length > 0 ? (
                    <img
                      src={(product.images as string[])[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                      data-testid={`img-ecom-product-${product.id}`}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-sm truncate" data-testid={`text-ecom-product-name-${product.id}`}>
                    {product.name}
                  </h3>
                  <div className="flex gap-1 shrink-0">
                    {product.isApproved ? (
                      <Badge variant="default">Approved</Badge>
                    ) : (
                      <Badge variant="secondary">Pending</Badge>
                    )}
                  </div>
                </div>
                {product.brand && (
                  <p className="text-xs text-muted-foreground mb-1">{product.brand}</p>
                )}
                <p className="text-xs text-muted-foreground mb-1" data-testid={`text-ecom-category-${product.id}`}>
                  {getCategoryName(product.categoryId)}
                </p>
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-bold text-base" data-testid={`text-ecom-price-${product.id}`}>
                    Rs.{parseFloat(product.price).toFixed(0)}
                  </span>
                  {product.discountPercent && product.discountPercent > 0 && (
                    <>
                      <span className="text-xs text-muted-foreground line-through">
                        Rs.{parseFloat(product.originalPrice).toFixed(0)}
                      </span>
                      <Badge variant="secondary">{product.discountPercent}% off</Badge>
                    </>
                  )}
                </div>
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span data-testid={`text-ecom-stock-${product.id}`}>
                      Stock: {product.stock}
                      {(product.stock || 0) <= 10 && (
                        <AlertTriangle className="inline h-3 w-3 text-destructive ml-1" />
                      )}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditProductDialog(product)} data-testid={`button-edit-ecom-${product.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteProductId(product.id)} data-testid={`button-delete-ecom-${product.id}`}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const renderOrders = () => (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
          <SelectTrigger className="w-[180px]" data-testid="select-order-status-filter">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Orders</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-sm text-muted-foreground">{filteredOrders.length} order{filteredOrders.length !== 1 ? "s" : ""}</p>
      </div>

      {ordersLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : filteredOrders.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <ClipboardList className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1" data-testid="text-no-orders">No orders found</h3>
            <p className="text-sm text-muted-foreground">
              {orderStatusFilter !== "all" ? "No orders with this status" : "Orders will appear here when customers buy your products"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map(order => {
            const items = (order.items as any[]) || [];
            return (
              <Card key={order.id} data-testid={`card-order-${order.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold" data-testid={`text-order-number-${order.id}`}>#{order.orderNumber}</p>
                        <Badge variant={getStatusColor(order.status)} data-testid={`badge-order-status-${order.id}`}>{order.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-IN", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        }) : ""}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {items.length} item{items.length !== 1 ? "s" : ""}
                      </p>
                      <div className="text-xs text-muted-foreground mt-1">
                        {items.slice(0, 3).map((item: any, i: number) => (
                          <span key={i}>{item.name}{i < Math.min(items.length, 3) - 1 ? ", " : ""}</span>
                        ))}
                        {items.length > 3 && <span> +{items.length - 3} more</span>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <p className="font-bold text-lg" data-testid={`text-order-total-${order.id}`}>
                        Rs.{parseFloat(order.totalAmount).toFixed(0)}
                      </p>
                      <p className="text-xs text-muted-foreground">{order.paymentMethod === "cod" ? "Cash on Delivery" : "Online"}</p>
                      {order.status !== "delivered" && order.status !== "cancelled" && (
                        <Select
                          value={order.status || "pending"}
                          onValueChange={(value) => updateOrderStatusMutation.mutate({ id: order.id, status: value })}
                        >
                          <SelectTrigger className="w-[140px]" data-testid={`select-order-action-${order.id}`}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="processing">Processing</SelectItem>
                            <SelectItem value="shipped">Shipped</SelectItem>
                            <SelectItem value="delivered">Delivered</SelectItem>
                            <SelectItem value="cancelled">Cancel</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h3 className="text-lg font-semibold" data-testid="text-inventory-heading">Inventory Management</h3>
        <Badge variant={lowStockProducts.length > 0 ? "destructive" : "default"}>
          {lowStockProducts.length} low stock
        </Badge>
      </div>

      {productsLoading ? (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="p-12 flex flex-col items-center justify-center text-center">
            <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-semibold mb-1">No products to manage</h3>
            <p className="text-sm text-muted-foreground">Add products first to manage inventory</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {products
            .sort((a, b) => (a.stock || 0) - (b.stock || 0))
            .map(product => (
              <Card key={product.id} className={`${(product.stock || 0) <= 10 ? "border-destructive/50" : ""}`} data-testid={`card-inventory-${product.id}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 bg-muted rounded-md overflow-hidden shrink-0">
                        {(product.images as string[])?.length > 0 ? (
                          <img src={(product.images as string[])[0]} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-muted-foreground/30" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {product.sku || "N/A"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold" data-testid={`text-inventory-stock-${product.id}`}>{product.stock}</p>
                        <p className="text-xs text-muted-foreground">in stock</p>
                      </div>
                      {(product.stock || 0) <= 10 && (
                        <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                      )}
                      <Button variant="ghost" size="icon" onClick={() => openEditProductDialog(product)} data-testid={`button-edit-inventory-${product.id}`}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );

  const renderEarnings = () => {
    const totalRevenue = stats?.totalRevenue || 0;
    const commissionRate = sellerProfile?.commissionRate ? parseFloat(sellerProfile.commissionRate) : 10;
    const commissionAmount = totalRevenue * (commissionRate / 100);
    const netEarnings = totalRevenue - commissionAmount;
    const walletBalance = sellerProfile?.walletBalance ? parseFloat(sellerProfile.walletBalance) : 0;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card data-testid="card-total-revenue">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Total Revenue</p>
              <p className="text-2xl font-bold" data-testid="text-total-revenue">Rs.{totalRevenue.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card data-testid="card-commission">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Commission ({commissionRate}%)</p>
              <p className="text-2xl font-bold text-muted-foreground" data-testid="text-commission">
                -Rs.{commissionAmount.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card data-testid="card-net-earnings">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-1">Net Earnings</p>
              <p className="text-2xl font-bold" data-testid="text-net-earnings">Rs.{netEarnings.toLocaleString()}</p>
            </CardContent>
          </Card>
        </div>

        <Card data-testid="card-wallet">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Wallet className="h-4 w-4" />
              Wallet Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold" data-testid="text-wallet-balance">Rs.{walletBalance.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">Available for withdrawal</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Earnings Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{stats?.totalOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Avg. Order Value</span>
                <span className="font-medium">
                  Rs.{(stats?.totalOrders ? totalRevenue / stats.totalOrders : 0).toFixed(0)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className="text-muted-foreground">Active Products</span>
                <span className="font-medium">{products.filter(p => p.isActive).length}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderStoreProfile = () => (
    <div className="space-y-6">
      <Card data-testid="card-store-profile">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Store Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...profileForm}>
            <form onSubmit={profileForm.handleSubmit((data) => saveProfileMutation.mutate(data))} className="space-y-4">
              <FormField
                control={profileForm.control}
                name="storeName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Your store name" {...field} data-testid="input-store-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={profileForm.control}
                name="storeDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Store Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describe your store..." {...field} data-testid="input-store-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label>Store Logo</Label>
                <input
                  type="file"
                  ref={logoInputRef}
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  data-testid="input-logo-upload"
                />
                <div className="mt-1 flex items-center gap-3">
                  {profileForm.watch("logo") ? (
                    <div className="relative w-16 h-16 bg-muted rounded-md overflow-hidden">
                      <img src={profileForm.watch("logo")} alt="Logo" className="w-full h-full object-cover" data-testid="img-store-logo" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute -top-1 -right-1 h-5 w-5"
                        onClick={() => profileForm.setValue("logo", "")}
                        data-testid="button-remove-logo"
                      >
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => logoInputRef.current?.click()}
                      disabled={isUploading}
                      data-testid="button-upload-logo"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  )}
                </div>
              </div>

              <Button type="submit" disabled={saveProfileMutation.isPending} data-testid="button-save-profile">
                {saveProfileMutation.isPending ? "Saving..." : "Save Profile"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case "overview": return renderOverview();
      case "products": return renderProducts();
      case "orders": return renderOrders();
      case "inventory": return renderInventory();
      case "earnings": return renderEarnings();
      case "store": return renderStoreProfile();
      default: return renderOverview();
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <input type="file" ref={fileInputRef} accept="image/*" onChange={handleImageUpload} className="hidden" data-testid="input-product-image-upload" />

      <header className="sticky top-0 z-50 bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={logoPath} alt="City Bell" className="h-8 w-auto rounded" data-testid="img-seller-logo" />
            <div>
              <h1 className="text-lg font-semibold leading-tight" data-testid="text-seller-title">Seller Dashboard</h1>
              <p className="text-sm text-green-100" data-testid="text-seller-name">
                {sellerProfile?.storeName || user.name || user.username}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className="border-white/30 text-white md:hidden"
              onClick={() => setMobileSidebarOpen(!mobileSidebarOpen)}
              data-testid="button-mobile-menu"
            >
              <ChevronDown className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="border-white/30 text-white"
              onClick={() => logoutMutation.mutate()}
              disabled={logoutMutation.isPending}
              data-testid="button-seller-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {mobileSidebarOpen && (
        <div className="md:hidden bg-card border-b px-4 py-2">
          <div className="flex flex-wrap gap-1">
            {sidebarItems.map(item => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                size="sm"
                onClick={() => { setActiveSection(item.id); setMobileSidebarOpen(false); }}
                data-testid={`button-mobile-nav-${item.id}`}
              >
                <item.icon className="h-4 w-4 mr-1" />
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex">
        <aside className="hidden md:block w-56 shrink-0 border-r bg-card min-h-[calc(100vh-56px)] p-3">
          <nav className="space-y-1">
            {sidebarItems.map(item => (
              <Button
                key={item.id}
                variant={activeSection === item.id ? "default" : "ghost"}
                className="w-full justify-start"
                onClick={() => setActiveSection(item.id)}
                data-testid={`button-nav-${item.id}`}
              >
                <item.icon className="h-4 w-4 mr-2" />
                {item.label}
              </Button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 p-4 md:p-6 min-w-0">
          <div className="mb-4">
            <h2 className="text-xl font-bold" data-testid="text-section-title">
              {sidebarItems.find(s => s.id === activeSection)?.label}
            </h2>
          </div>
          {renderContent()}
        </main>
      </div>

      <Dialog open={isProductDialogOpen} onOpenChange={setIsProductDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-ecom-product-form">
          <DialogHeader>
            <DialogTitle data-testid="text-ecom-dialog-title">
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update the product details below." : "Fill in the details to add a new product."}
            </DialogDescription>
          </DialogHeader>
          <Form {...productForm}>
            <form onSubmit={productForm.handleSubmit(onProductSubmit)} className="space-y-4">
              <FormField
                control={productForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} data-testid="input-ecom-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={productForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Product description (optional)" {...field} data-testid="input-ecom-product-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="brand"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Brand</FormLabel>
                      <FormControl>
                        <Input placeholder="Brand name" {...field} data-testid="input-ecom-brand" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="sku"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>SKU</FormLabel>
                      <FormControl>
                        <Input placeholder="SKU code" {...field} data-testid="input-ecom-sku" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div>
                <Label>Product Images</Label>
                <div className="mt-1 space-y-2">
                  {productImages.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {productImages.map((img, idx) => (
                        <div key={idx} className="relative w-20 h-20 bg-muted rounded-md overflow-hidden">
                          <img src={img} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" data-testid={`img-product-preview-${idx}`} />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-1 -right-1 h-5 w-5"
                            onClick={() => removeProductImage(idx)}
                            data-testid={`button-remove-image-${idx}`}
                          >
                            <XIcon className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full h-16 border-dashed"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                    data-testid="button-upload-product-image"
                  >
                    {isUploading ? (
                      <span className="text-sm text-muted-foreground">Uploading...</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Upload className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Add image</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>

              <FormField
                control={productForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-ecom-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} data-testid={`option-ecom-category-${cat.id}`}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={productForm.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-ecom-original-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={productForm.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" placeholder="0" {...field} data-testid="input-ecom-discount-percent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={productForm.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (auto-calculated)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-ecom-price" readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={productForm.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stock</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" placeholder="100" {...field} data-testid="input-ecom-stock" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={productForm.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between gap-2">
                    <FormLabel>Active</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ecom-active" />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button type="submit" disabled={createProductMutation.isPending || updateProductMutation.isPending} data-testid="button-save-ecom-product">
                  {(createProductMutation.isPending || updateProductMutation.isPending) ? "Saving..." : editingProduct ? "Update Product" : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProductId} onOpenChange={() => setDeleteProductId(null)}>
        <AlertDialogContent data-testid="dialog-confirm-delete">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && deleteProductMutation.mutate(deleteProductId)}
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
