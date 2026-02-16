import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X as XIcon, LogOut, Package, AlertCircle } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { useAuth } from "@/hooks/use-auth";
import { useUpload } from "@/hooks/use-upload";
import { Product, Category } from "@shared/schema";
import logoPath from "@assets/citybells-logo_1769903304782.png";

const vendorProductSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
  originalPrice: z.coerce.number().min(0.01, "Original price is required"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  price: z.coerce.number().min(0.01, "Price is required"),
  stock: z.coerce.number().min(0).default(100),
  unit: z.string().default("Kg"),
  isActive: z.boolean().default(true),
});

type VendorProductFormData = z.infer<typeof vendorProductSchema>;

export default function VendorDashboardPage() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { uploadFile, isUploading } = useUpload({
    onError: (err) => toast({ title: "Upload failed", description: err.message, variant: "destructive" }),
  });

  useEffect(() => {
    if (user && !user.isVendor) {
      setLocation("/");
    }
  }, [user, setLocation]);

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/vendor/products"],
    enabled: !!user?.isVendor,
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/vendor/categories"],
    enabled: !!user?.isVendor,
  });

  const form = useForm<VendorProductFormData>({
    resolver: zodResolver(vendorProductSchema),
    defaultValues: {
      name: "",
      description: "",
      image: "",
      categoryId: "",
      originalPrice: 0,
      discountPercent: 0,
      price: 0,
      stock: 100,
      unit: "Kg",
      isActive: true,
    },
  });

  const watchOriginalPrice = form.watch("originalPrice");
  const watchDiscountPercent = form.watch("discountPercent");

  useEffect(() => {
    const original = Number(watchOriginalPrice) || 0;
    const discount = Number(watchDiscountPercent) || 0;
    if (original > 0) {
      const calculated = original * (1 - discount / 100);
      form.setValue("price", Math.round(calculated * 100) / 100);
    }
  }, [watchOriginalPrice, watchDiscountPercent, form]);

  const createMutation = useMutation({
    mutationFn: async (data: VendorProductFormData) => {
      const payload = {
        ...data,
        originalPrice: String(data.originalPrice),
        price: String(data.price),
      };
      const res = await apiRequest("POST", "/api/vendor/products", payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      setIsDialogOpen(false);
      form.reset();
      setImagePreview("");
      toast({ title: "Product created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: VendorProductFormData }) => {
      const payload = {
        ...data,
        originalPrice: String(data.originalPrice),
        price: String(data.price),
      };
      const res = await apiRequest("PATCH", `/api/vendor/products/${id}`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      setImagePreview("");
      toast({ title: "Product updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/vendor/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/vendor/products"] });
      setDeleteProductId(null);
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete product", description: error.message, variant: "destructive" });
    },
  });

  const openCreateDialog = () => {
    setEditingProduct(null);
    setImagePreview("");
    form.reset({
      name: "",
      description: "",
      image: "",
      categoryId: "",
      originalPrice: 0,
      discountPercent: 0,
      price: 0,
      stock: 100,
      unit: "Kg",
      isActive: true,
    });
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    setImagePreview(product.image || "");
    form.reset({
      name: product.name,
      description: product.description || "",
      image: product.image || "",
      categoryId: product.categoryId || "",
      originalPrice: parseFloat(product.originalPrice),
      discountPercent: product.discountPercent || 0,
      price: parseFloat(product.price),
      stock: product.stock || 100,
      unit: product.unit || "Kg",
      isActive: product.isActive ?? true,
    });
    setIsDialogOpen(true);
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
      form.setValue("image", result.objectPath);
      setImagePreview(result.objectPath);
      toast({ title: "Image uploaded successfully" });
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const clearImage = () => {
    form.setValue("image", "");
    setImagePreview("");
  };

  const onSubmit = (data: VendorProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find((c) => c.id === categoryId)?.name || "Unknown";
  };

  if (!user || !user.isVendor) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleImageUpload}
        className="hidden"
        data-testid="input-image-upload"
      />

      <header className="sticky top-0 z-50 bg-green-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <img src={logoPath} alt="City Bell" className="h-8 w-auto rounded" data-testid="img-logo" />
            <div>
              <h1 className="text-lg font-semibold leading-tight" data-testid="text-vendor-title">Vendor Dashboard</h1>
              <p className="text-sm text-green-100" data-testid="text-vendor-name">{user.name || user.username}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-white/30 text-white"
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            data-testid="button-logout"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <h2 className="text-xl font-bold" data-testid="text-products-heading">My Products</h2>
            <p className="text-sm text-muted-foreground">{products.length} product{products.length !== 1 ? "s" : ""}</p>
          </div>
          <Button onClick={openCreateDialog} data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>

        {productsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
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
        ) : products.length === 0 ? (
          <Card>
            <CardContent className="p-12 flex flex-col items-center justify-center text-center">
              <Package className="h-16 w-16 text-muted-foreground/40 mb-4" />
              <h3 className="text-lg font-semibold mb-1" data-testid="text-empty-state">No products yet</h3>
              <p className="text-sm text-muted-foreground mb-4">Start by adding your first product to your catalog.</p>
              <Button onClick={openCreateDialog} data-testid="button-add-product-empty">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((product) => (
              <Card key={product.id} className={product.isActive ? "" : "opacity-60"} data-testid={`card-product-${product.id}`}>
                <CardContent className="p-4">
                  <div className="w-full h-40 bg-muted rounded-md overflow-hidden mb-3">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        data-testid={`img-product-${product.id}`}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-sm truncate" data-testid={`text-product-name-${product.id}`}>
                      {product.name}
                    </h3>
                    <Badge variant={product.isActive ? "default" : "secondary"} className="shrink-0" data-testid={`badge-status-${product.id}`}>
                      {product.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mb-1" data-testid={`text-category-${product.id}`}>
                    {getCategoryName(product.categoryId)}
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-base" data-testid={`text-price-${product.id}`}>
                      Rs.{parseFloat(product.price).toFixed(0)}
                    </span>
                    {product.discountPercent && product.discountPercent > 0 && (
                      <>
                        <span className="text-xs text-muted-foreground line-through">
                          Rs.{parseFloat(product.originalPrice).toFixed(0)}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {product.discountPercent}% off
                        </Badge>
                      </>
                    )}
                  </div>
                  <div className="flex items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span data-testid={`text-stock-${product.id}`}>Stock: {product.stock}</span>
                      <span>|</span>
                      <span>{product.unit}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(product)}
                        data-testid={`button-edit-${product.id}`}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteProductId(product.id)}
                        data-testid={`button-delete-${product.id}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-product-form">
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              {editingProduct ? "Edit Product" : "Add Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct ? "Update the product details below." : "Fill in the details to add a new product."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Product name" {...field} data-testid="input-product-name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Product description (optional)" {...field} data-testid="input-product-description" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div>
                <Label>Image</Label>
                <div className="mt-1">
                  {imagePreview ? (
                    <div className="relative w-full h-40 bg-muted rounded-md overflow-hidden">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" data-testid="img-preview" />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2"
                        onClick={clearImage}
                        data-testid="button-clear-image"
                      >
                        <XIcon className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full h-24 border-dashed"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploading}
                      data-testid="button-upload-image"
                    >
                      {isUploading ? (
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                      ) : (
                        <div className="flex flex-col items-center gap-1">
                          <Upload className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Click to upload image</span>
                        </div>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-category">
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id} data-testid={`option-category-${cat.id}`}>
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
                  control={form.control}
                  name="originalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Original Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-original-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountPercent"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount %</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" max="100" placeholder="0" {...field} data-testid="input-discount-percent" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Selling Price (auto-calculated)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.01" min="0" placeholder="0.00" {...field} data-testid="input-price" readOnly className="bg-muted" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="100" {...field} data-testid="input-stock" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-unit">
                            <SelectValue placeholder="Select unit" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="Kg">Kg</SelectItem>
                          <SelectItem value="Pieces">Pieces</SelectItem>
                          <SelectItem value="Bunch">Bunch</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <FormLabel className="text-sm font-medium">Active</FormLabel>
                      <p className="text-xs text-muted-foreground">Product will be visible to customers</p>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                        data-testid="switch-is-active"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                  data-testid="button-cancel"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-submit-product"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingProduct
                      ? "Update Product"
                      : "Add Product"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteProductId} onOpenChange={(open) => !open && setDeleteProductId(null)}>
        <AlertDialogContent data-testid="dialog-delete-confirm">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteProductId && deleteMutation.mutate(deleteProductId)}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
