import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, CheckCircle, XCircle, Search, Star, Trash2, Eye, Zap, Award } from "lucide-react";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { EcomProduct, EcomCategory } from "@shared/schema";

const filterTabs = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending Approval" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Not Approved" },
];

export default function AdminEcomProductsPage() {
  const { toast } = useToast();
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState<EcomProduct | null>(null);

  const { data: products = [], isLoading } = useQuery<EcomProduct[]>({
    queryKey: ["/api/admin/ecom/products"],
  });

  const { data: categories = [] } = useQuery<EcomCategory[]>({
    queryKey: ["/api/admin/ecom/categories"],
  });

  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newImageUrl, setNewImageUrl] = useState("");
  const [newImages, setNewImages] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState<string | null>(categories?.[0]?.id || null);
  const [newOriginalPrice, setNewOriginalPrice] = useState("");
  const [newDiscountPercent, setNewDiscountPercent] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newStock, setNewStock] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [newRating, setNewRating] = useState("");

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<EcomProduct> }) => {
      const res = await apiRequest("PATCH", `/api/admin/ecom/products/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecom/products"] });
      toast({ title: "Product updated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/ecom/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecom/products"] });
      setSelectedProduct(null);
      toast({ title: "Product deleted" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete product", description: error.message, variant: "destructive" });
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/admin/ecom/products", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/ecom/products"] });
      setAddOpen(false);
      // reset form
      setNewName(""); setNewDescription(""); setNewImageUrl(""); setNewImages([]);
      setNewCategory(categories?.[0]?.id || null); setNewOriginalPrice(""); setNewDiscountPercent(""); setNewPrice(""); setNewStock(""); setNewUnit(""); setNewRating("");
      toast({ title: "Product created" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to create product", description: err.message, variant: "destructive" });
    },
  });

  const filteredProducts = products
    .filter((p) => {
      if (filter === "pending") return !p.isApproved && p.isActive;
      if (filter === "approved") return p.isApproved;
      if (filter === "rejected") return !p.isApproved && !p.isActive;
      return true;
    })
    .filter((p) => categoryFilter === "all" || p.categoryId === categoryFilter)
    .filter((p) => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || (p.brand && p.brand.toLowerCase().includes(searchQuery.toLowerCase())));

  const filterCounts = filterTabs.map((tab) => ({
    ...tab,
    count: tab.key === "all" ? products.length :
      tab.key === "pending" ? products.filter(p => !p.isApproved && p.isActive).length :
      tab.key === "approved" ? products.filter(p => p.isApproved).length :
      products.filter(p => !p.isApproved && !p.isActive).length,
  }));

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "Uncategorized";
    return categories.find(c => c.id === categoryId)?.name || "Unknown";
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
  };

  return (
    <AdminLayout>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-ecom-products-title">E-Commerce Products</h1>
          <p className="text-gray-500">Moderate and manage vendor products</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setAddOpen(true)} data-testid="button-add-ecom-product">Add Product</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap">
        {filterCounts.map((tab) => (
          <Button
            key={tab.key}
            variant={filter === tab.key ? "default" : "outline"}
            onClick={() => setFilter(tab.key)}
            data-testid={`button-filter-${tab.key}`}
          >
            {tab.label}
            <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
              {tab.count}
            </Badge>
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search products or brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-ecom-products"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48" data-testid="select-category-filter">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-16">
          <Package className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600" data-testid="text-empty-products">No products found</h3>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl shadow-sm border p-4 ${product.isApproved ? 'border-gray-100' : 'border-yellow-200'}`}
              data-testid={`ecom-product-card-${product.id}`}
            >
              <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden mb-3">
                {product.images && (product.images as string[]).length > 0 ? (
                  <img src={(product.images as string[])[0]} alt={product.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-blue-100 to-indigo-200 flex items-center justify-center">
                    <Package className="h-8 w-8 text-blue-300" />
                  </div>
                )}
              </div>

              <div className="flex items-start justify-between gap-1 mb-1">
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
                  {product.isInstantDelivery && (
                    <Zap className="h-3.5 w-3.5 text-yellow-500 flex-shrink-0" data-testid={`icon-instant-${product.id}`} />
                  )}
                  {product.isFeatured && (
                    <Award className="h-3.5 w-3.5 text-blue-500 flex-shrink-0" data-testid={`icon-featured-${product.id}`} />
                  )}
                </div>
                {product.isApproved ? (
                  <Badge className="bg-green-100 text-green-700 no-default-hover-elevate no-default-active-elevate text-xs">Approved</Badge>
                ) : (
                  <Badge className="bg-yellow-100 text-yellow-700 no-default-hover-elevate no-default-active-elevate text-xs">Pending</Badge>
                )}
              </div>

              {product.brand && <p className="text-xs text-gray-500 mb-1">{product.brand}</p>}
              <p className="text-xs text-gray-400 mb-2">{getCategoryName(product.categoryId)}</p>

              <div className="flex items-center gap-2 mb-2">
                <p className="font-semibold text-sm text-primary">{formatCurrency(product.price)}</p>
                {product.discountPercent && product.discountPercent > 0 && (
                  <p className="text-xs text-gray-400 line-through">{formatCurrency(product.originalPrice)}</p>
                )}
              </div>

              <div className="flex items-center gap-1 mb-3 text-xs text-gray-500">
                <Star className="h-3 w-3 text-yellow-500" />
                <span>{product.rating || "0"}</span>
                <span className="mx-1">|</span>
                <span>Stock: {product.stock}</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedProduct(product)}
                  data-testid={`button-view-product-${product.id}`}
                >
                  <Eye className="h-3.5 w-3.5 mr-1" />
                  View
                </Button>
                {!product.isApproved && (
                  <Button
                    size="sm"
                    onClick={() => updateMutation.mutate({ id: product.id, data: { isApproved: true } })}
                    disabled={updateMutation.isPending}
                    className="bg-green-600 text-white"
                    data-testid={`button-approve-product-${product.id}`}
                  >
                    <CheckCircle className="h-3.5 w-3.5 mr-1" />
                    Approve
                  </Button>
                )}
                {product.isApproved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => updateMutation.mutate({ id: product.id, data: { isApproved: false } })}
                    disabled={updateMutation.isPending}
                    data-testid={`button-unapprove-product-${product.id}`}
                  >
                    <XCircle className="h-3.5 w-3.5 mr-1" />
                    Unapprove
                  </Button>
                )}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 hidden sm:inline">Trending</span>
                  <Switch
                    checked={!!product.isTrending}
                    onCheckedChange={(checked) => {
                      updateMutation.mutate({ id: product.id, data: { isTrending: checked } });
                      queryClient.setQueryData(["/api/admin/ecom/products"], (old: any) =>
                        old ? (old as EcomProduct[]).map((p) => p.id === product.id ? { ...p, isTrending: checked } : p) : old
                      );
                    }}
                    disabled={updateMutation.isPending}
                    data-testid={`switch-trending-card-${product.id}`}
                  />
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-500 ml-auto"
                  onClick={() => deleteMutation.mutate(product.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-product-${product.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={(open) => setAddOpen(open)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add E-Commerce Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} data-testid="input-new-name" />
              <Select value={newCategory ?? "uncategorized"} onValueChange={(v) => setNewCategory(v === "uncategorized" ? null : v)}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="uncategorized">Uncategorized</SelectItem>
                  {categories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <Textarea placeholder="Description" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} data-testid="input-new-description" />

            <div className="grid grid-cols-2 gap-3">
              <Input placeholder="Image URL" value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)} data-testid="input-new-image-url" />
              <div>
                <label className="text-xs text-gray-500">Or upload photo</label>
                <input type="file" accept="image/*" className="w-full mt-1" onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const data = String(reader.result || "");
                    setNewImages((cur) => [...cur, data]);
                  };
                  reader.readAsDataURL(f);
                }} data-testid="input-new-image-file" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Original Price" value={newOriginalPrice} onChange={(e) => setNewOriginalPrice(e.target.value)} data-testid="input-new-original-price" />
              <Input placeholder="Discount %" value={newDiscountPercent} onChange={(e) => setNewDiscountPercent(e.target.value)} data-testid="input-new-discount" />
              <Input placeholder="Selling Price" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} data-testid="input-new-price" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Input placeholder="Stock" value={newStock} onChange={(e) => setNewStock(e.target.value)} data-testid="input-new-stock" />
              <Input placeholder="Unit (e.g. kg, pcs)" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} data-testid="input-new-unit" />
              <Input placeholder="Rating" value={newRating} onChange={(e) => setNewRating(e.target.value)} data-testid="input-new-rating" />
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => {
                // prepare images array
                const images = [...newImages];
                if (newImageUrl) images.unshift(newImageUrl);
                const payload = {
                  name: newName,
                  description: newDescription,
                  images,
                  categoryId: newCategory,
                  originalPrice: newOriginalPrice,
                  discountPercent: newDiscountPercent ? parseFloat(newDiscountPercent) : 0,
                  price: newPrice,
                  stock: newStock ? parseInt(newStock + "", 10) : 0,
                  unit: newUnit,
                  rating: newRating ? parseFloat(newRating) : 0,
                  isActive: true,
                };
                createMutation.mutate(payload);
              }} disabled={createMutation.isPending}>Save</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={!!selectedProduct} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <div className="space-y-4">
              {selectedProduct.images && (selectedProduct.images as string[]).length > 0 && (
                <div className="flex gap-2 overflow-x-auto">
                  {(selectedProduct.images as string[]).map((img, i) => (
                    <img key={i} src={img} alt={`${selectedProduct.name} ${i + 1}`} className="h-32 w-32 object-cover rounded-lg flex-shrink-0" />
                  ))}
                </div>
              )}
              <div>
                <h3 className="font-semibold text-lg" data-testid="text-detail-product-name">{selectedProduct.name}</h3>
                {selectedProduct.brand && <p className="text-sm text-gray-500">{selectedProduct.brand}</p>}
                {selectedProduct.sku && <p className="text-xs text-gray-400">SKU: {selectedProduct.sku}</p>}
              </div>
              {selectedProduct.description && <p className="text-sm text-gray-600">{selectedProduct.description}</p>}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-500">Price</p>
                  <p className="font-semibold">{formatCurrency(selectedProduct.price)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Original Price</p>
                  <p className="font-semibold">{formatCurrency(selectedProduct.originalPrice)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Stock</p>
                  <p className="font-semibold">{selectedProduct.stock}</p>
                </div>
                <div>
                  <p className="text-gray-500">Category</p>
                  <p className="font-semibold">{getCategoryName(selectedProduct.categoryId)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Rating</p>
                  <p className="font-semibold flex items-center gap-1">
                    <Star className="h-3.5 w-3.5 text-yellow-500" />
                    {selectedProduct.rating || "0"} ({selectedProduct.reviewCount || 0} reviews)
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Status</p>
                  <p className="font-semibold">{selectedProduct.isApproved ? "Approved" : "Pending"}</p>
                </div>
              </div>
              <div className="flex items-center justify-between py-3 border-t border-b">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Instant Delivery</span>
                </div>
                <Switch
                  checked={!!selectedProduct.isInstantDelivery}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({ id: selectedProduct.id, data: { isInstantDelivery: checked } });
                    setSelectedProduct({ ...selectedProduct, isInstantDelivery: checked });
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="switch-instant-delivery"
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-2">
                  <Award className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium">Featured</span>
                </div>
                <Switch
                  checked={!!selectedProduct.isFeatured}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({ id: selectedProduct.id, data: { isFeatured: checked } });
                    setSelectedProduct({ ...selectedProduct, isFeatured: checked });
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="switch-featured"
                />
              </div>
              <div className="flex items-center justify-between py-3 border-b">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Trending</span>
                </div>
                <Switch
                  checked={!!selectedProduct.isTrending}
                  onCheckedChange={(checked) => {
                    updateMutation.mutate({ id: selectedProduct.id, data: { isTrending: checked } });
                    setSelectedProduct({ ...selectedProduct, isTrending: checked });
                  }}
                  disabled={updateMutation.isPending}
                  data-testid="switch-trending"
                />
              </div>
              <div className="flex gap-2 pt-2">
                {!selectedProduct.isApproved ? (
                  <Button
                    onClick={() => {
                      updateMutation.mutate({ id: selectedProduct.id, data: { isApproved: true } });
                      setSelectedProduct(null);
                    }}
                    className="bg-green-600 text-white"
                    data-testid="button-detail-approve"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Approve Product
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      updateMutation.mutate({ id: selectedProduct.id, data: { isApproved: false } });
                      setSelectedProduct(null);
                    }}
                    data-testid="button-detail-unapprove"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Unapprove
                  </Button>
                )}
                <Button
                  variant="destructive"
                  onClick={() => deleteMutation.mutate(selectedProduct.id)}
                  data-testid="button-detail-delete"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
