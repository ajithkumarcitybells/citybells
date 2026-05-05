import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X as XIcon, ToggleLeft, ToggleRight, Download, FileSpreadsheet, ArrowLeft, Search, CheckSquare, Square } from "lucide-react";
import ExcelJS from "exceljs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
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
import { Product, Category } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  image: z.string().optional(),
  categoryId: z.string().optional(),
  originalPrice: z.string().min(1, "Original price is required"),
  discountPercent: z.coerce.number().min(0).max(100).default(0),
  price: z.string().min(1, "Price is required"),
  rating: z.string().default("4.0"),
  stock: z.coerce.number().min(0).default(100),
  unit: z.string().default("1 pc"),
  fastDelivery: z.boolean().optional().default(false),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showFastOnly, setShowFastOnly] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
  const [isDeletingBulk, setIsDeletingBulk] = useState(false);
  const [bulkResults, setBulkResults] = useState<{ id: string; success: boolean; reason?: string }[] | null>(null);
  const [isBulkResultsOpen, setIsBulkResultsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/admin/categories"],
  });

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      image: "",
      categoryId: "",
      originalPrice: "",
      discountPercent: 0,
      price: "",
      rating: "4.0",
      stock: 100,
      unit: "1 pc",
      fastDelivery: false,
    },
  });

  const watchOriginalPrice = form.watch("originalPrice");
  const watchPrice = form.watch("price");
  const watchStock = form.watch("stock");

  useEffect(() => {
    const original = parseFloat(watchOriginalPrice);
    const selling = parseFloat(watchPrice);
    
    if (original > 0 && selling > 0 && selling < original) {
      const discount = Math.round(((original - selling) / original) * 100);
      form.setValue("discountPercent", discount);
    } else if (original > 0 && selling >= original) {
      form.setValue("discountPercent", 0);
    }
  }, [watchOriginalPrice, watchPrice, form]);

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const res = await apiRequest("POST", "/api/admin/products", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Product created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create product", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProductFormData }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      toast({ title: "Product updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update product", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: "Product deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete product", description: error.message, variant: "destructive" });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { isActive });
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: variables.isActive ? "Product activated" : "Product deactivated" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update status", description: error.message, variant: "destructive" });
    },
  });

  const toggleFastMutation = useMutation({
    mutationFn: async ({ id, fastDelivery }: { id: string; fastDelivery: boolean }) => {
      const res = await apiRequest("PATCH", `/api/admin/products/${id}`, { fastDelivery });
      if (!res.ok) throw new Error('Failed to update fastDelivery');
      return res.json();
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ title: (vars as any).fastDelivery ? "10-min delivery enabled" : "10-min delivery disabled" });
    },
    onError: (err: Error) => {
      toast({ title: "Failed to update 10-min delivery", description: err.message, variant: "destructive" });
    }
  });

  const filteredProductsList = products
    .filter(p => p.categoryId === selectedCategoryId)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter(p => !showFastOnly || !!p.fastDelivery);

  const toggleProductSelection = (productId: string) => {
    setSelectedProductIds(prev => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProductIds.size === filteredProductsList.length && filteredProductsList.length > 0) {
      setSelectedProductIds(new Set());
    } else {
      setSelectedProductIds(new Set(filteredProductsList.map(p => p.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProductIds.size === 0) return;
    setIsDeletingBulk(true);
    let successCount = 0;
    let errorCount = 0;
    for (const id of Array.from(selectedProductIds)) {
      try {
        await apiRequest("DELETE", `/api/admin/products/${id}`);
        successCount++;
      } catch {
        errorCount++;
      }
    }
    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
    setSelectedProductIds(new Set());
    setIsDeletingBulk(false);
    toast({
      title: `${successCount} product${successCount !== 1 ? 's' : ''} deleted`,
      description: errorCount > 0 ? `${errorCount} failed to delete` : undefined,
    });
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setImagePreview("");
    form.reset();
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
      originalPrice: product.originalPrice,
      discountPercent: product.discountPercent || 0,
      price: product.price,
      rating: product.rating || "4.0",
      stock: product.stock || 100,
      unit: product.unit || "1 pc",
      fastDelivery: !!(product as any).fastDelivery,
    });
    setIsDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image size must be less than 5MB", variant: "destructive" });
      return;
    }

    setIsUploading(true);
    try {
      // Step 1: Request presigned URL
      const urlRes = await fetch("/api/uploads/request-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          contentType: file.type,
        }),
      });

      if (!urlRes.ok) throw new Error("Failed to get upload URL");
      const { uploadURL, objectPath } = await urlRes.json();

      // Step 2: Upload file directly to presigned URL
      const uploadRes = await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      if (!uploadRes.ok) throw new Error("Failed to upload image");

      // Set the image URL in the form
      const imageUrl = objectPath;
      form.setValue("image", imageUrl);
      setImagePreview(imageUrl);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      console.error("Upload error:", error);
      toast({ title: "Failed to upload image", variant: "destructive" });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const clearImage = () => {
    form.setValue("image", "");
    setImagePreview("");
  };

  const handleExportExcel = async () => {
    const exportData = products.map((product) => ({
      Name: product.name,
      Description: product.description || "",
      Category: categories.find(c => c.id === product.categoryId)?.name || "",
      "Original Price": product.originalPrice,
      "Selling Price": product.price,
      "Discount %": product.discountPercent || 0,
      Stock: product.stock,
      Unit: product.unit,
      Image: product.image || "",
      "Fast Delivery": product.fastDelivery ? "Yes" : "No",
      Active: product.isActive ? "Yes" : "No",
    }));
    try {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Products");

      if (exportData.length > 0) {
        // Set headers from keys of first object
        const headers = Object.keys(exportData[0]);
        worksheet.addRow(headers);
        for (const row of exportData) {
          worksheet.addRow(headers.map(h => (row as any)[h]));
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `products_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: "Products exported successfully" });
    } catch (error) {
      console.error("Export error:", error);
      toast({ title: "Export failed", variant: "destructive" });
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(data);
      const worksheet = workbook.worksheets[0];

      const headerRow = worksheet.getRow(1).values as any[];
      const jsonData: Record<string, unknown>[] = [];
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // skip header
        const obj: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headerRow[colNumber];
          if (header) obj[String(header)] = cell.value as unknown;
        });
        jsonData.push(obj);
      });

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        const categoryName = String(row["Category"] || "");
        const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        
        const originalPrice = parseFloat(String(row["Original Price"] || "0"));
        const sellingPrice = parseFloat(String(row["Selling Price"] || "0"));
        let discountPercent = Number(row["Discount %"]) || 0;
        if (discountPercent === 0 && originalPrice > 0 && sellingPrice > 0 && sellingPrice < originalPrice) {
          discountPercent = Math.round(((originalPrice - sellingPrice) / originalPrice) * 100);
        }

        const productData = {
          name: String(row["Name"] || ""),
          description: String(row["Description"] || ""),
          categoryId: category?.id || "",
          originalPrice: String(originalPrice),
          price: String(sellingPrice),
          discountPercent,
          stock: Number(row["Stock"]) || 100,
          unit: String(row["Unit"] || "1 pc"),
          image: String(row["Image"] || ""),
          fastDelivery: (() => {
            const v = String(row["Fast Delivery"] || "").toLowerCase();
            return v === "yes" || v === "true" || v === "1";
          })(),
          isActive: String(row["Active"]).toLowerCase() === "yes",
        };

        if (!productData.name) continue;

        try {
          await apiRequest("POST", "/api/admin/products", productData);
          successCount++;
        } catch {
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
      toast({ 
        title: "Import completed", 
        description: `${successCount} products added, ${errorCount} failed` 
      });
    } catch (error) {
      toast({ title: "Import failed", description: "Invalid Excel file", variant: "destructive" });
    } finally {
      setIsImporting(false);
      if (excelInputRef.current) excelInputRef.current.value = "";
    }
  };

  const onSubmit = (data: ProductFormData) => {
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <AdminLayout>
      <input
        type="file"
        ref={excelInputRef}
        accept=".xlsx,.xls"
        onChange={handleImportExcel}
        className="hidden"
      />
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Products</h1>
          <p className="text-gray-500">Manage your product catalog</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={handleExportExcel}
            disabled={products.length === 0}
            data-testid="button-export-excel"
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline" 
            onClick={() => excelInputRef.current?.click()}
            disabled={isImporting}
            data-testid="button-import-excel"
          >
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            {isImporting ? "Importing..." : "Import"}
          </Button>
          <Button onClick={openCreateDialog} className="bg-primary" data-testid="button-add-product">
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array(8).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : selectedCategoryId === null ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {categories.map((category) => {
            const count = products.filter(p => p.categoryId === category.id).length;
            return (
              <div
                key={category.id}
                onClick={() => setSelectedCategoryId(category.id)}
                className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-shadow"
                data-testid={`category-card-${category.id}`}
              >
                <div className="w-full h-20 bg-gray-100 rounded-lg overflow-hidden mb-3">
                  {category.image ? (
                    <img src={category.image} alt={category.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                  )}
                </div>
                <p className="font-semibold text-gray-800">{category.name}</p>
                <p className="text-sm text-gray-500">{count} product{count !== 1 ? 's' : ''}</p>
              </div>
            );
          })}
        </div>
      ) : (
        <div>
          <button
            onClick={() => { setSelectedCategoryId(null); setSearchQuery(""); setSelectedProductIds(new Set()); }}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
            data-testid="button-back-categories"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="font-medium">Back to Categories</span>
          </button>
          <div className="flex items-center gap-2 mb-4">
            {categories.find(c => c.id === selectedCategoryId)?.image && (
              <img src={categories.find(c => c.id === selectedCategoryId)!.image!} alt="" className="w-6 h-6 rounded object-cover" />
            )}
            <h2 className="text-lg font-semibold text-gray-800">
              {categories.find(c => c.id === selectedCategoryId)?.name}
            </h2>
            <span className="text-sm text-gray-400">
              ({products.filter(p => p.categoryId === selectedCategoryId).length})
            </span>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-search-products"
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={showFastOnly} onCheckedChange={setShowFastOnly} aria-label="Show only 10 minute delivery products" />
              <span className="text-sm text-gray-600">Only 10 min delivery</span>
            </div>
          </div>
          {filteredProductsList.length > 0 && (
            <div className="flex items-center justify-between mb-3 px-1">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
                data-testid="button-select-all"
              >
                {selectedProductIds.size === filteredProductsList.length && filteredProductsList.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-primary" />
                ) : (
                  <Square className="h-4 w-4" />
                )}
                <span>
                  {selectedProductIds.size > 0
                    ? `${selectedProductIds.size} selected`
                    : "Select All"}
                </span>
              </button>
              {selectedProductIds.size > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleBulkDelete}
                  disabled={isDeletingBulk}
                  data-testid="button-bulk-delete"
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  {isDeletingBulk ? "Deleting..." : `Delete ${selectedProductIds.size}`}
                </Button>
              )}
            </div>
          )}
          {selectedProductIds.size > 0 && (
            <div className="flex items-center gap-2 mb-3">
              <Button
                size="sm"
                onClick={async () => {
                  const ids = Array.from(selectedProductIds);
                  try {
                    const res = await apiRequest('PATCH', '/api/admin/products/bulk-fast-delivery', { ids, fastDelivery: true });
                    if (!res.ok) throw new Error('Bulk enable failed');
                    const body = await res.json();
                    const results = Array.isArray(body.results) ? body.results : [];
                    setBulkResults(results);
                    setIsBulkResultsOpen(true);
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
                    setSelectedProductIds(new Set());
                    toast({ title: `Bulk operation completed for ${ids.length} products` });
                  } catch (err: any) {
                    toast({ title: 'Bulk update failed', description: err.message, variant: 'destructive' });
                  }
                }}
              >
                Enable 10-min for selected
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  const ids = Array.from(selectedProductIds);
                  try {
                    const res = await apiRequest('PATCH', '/api/admin/products/bulk-fast-delivery', { ids, fastDelivery: false });
                    if (!res.ok) throw new Error('Bulk disable failed');
                    const body = await res.json();
                    const results = Array.isArray(body.results) ? body.results : [];
                    setBulkResults(results);
                    setIsBulkResultsOpen(true);
                    queryClient.invalidateQueries({ queryKey: ["/api/admin/products"] });
                    setSelectedProductIds(new Set());
                    toast({ title: `Bulk operation completed for ${ids.length} products` });
                  } catch (err: any) {
                    toast({ title: 'Bulk update failed', description: err.message, variant: 'destructive' });
                  }
                }}
              >
                Disable 10-min for selected
              </Button>
            </div>
          )}

          <Dialog open={isBulkResultsOpen} onOpenChange={setIsBulkResultsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Bulk Update Results</DialogTitle>
              </DialogHeader>
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {bulkResults && bulkResults.length > 0 ? (
                  bulkResults.map((r) => {
                    const prod = products.find(p => p.id === r.id);
                    return (
                      <div key={r.id} className="flex items-center justify-between p-2 border-b">
                        <div className="flex items-center gap-3">
                          <div className="text-sm font-medium">{prod ? prod.name : r.id}</div>
                          {prod && prod.image && <img src={prod.image} alt="" className="w-8 h-8 object-cover rounded" />}
                        </div>
                        <div className="text-sm">
                          {r.success ? (
                            <span className="text-green-600">Updated</span>
                          ) : (
                            <span className="text-red-600">Failed: {r.reason || 'unknown'}</span>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-sm text-gray-500 p-2">No results to display</div>
                )}
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline" onClick={() => { setIsBulkResultsOpen(false); setBulkResults(null); }}>Close</Button>
              </div>
            </DialogContent>
          </Dialog>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
              {filteredProductsList.map((product) => (
                  <div
                    key={product.id}
                    className={`relative border rounded-lg p-3 ${selectedProductIds.has(product.id) ? 'border-primary bg-primary/5' : product.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
                    data-testid={`product-card-${product.id}`}
                  >
                    <button
                      onClick={() => toggleProductSelection(product.id)}
                      className="absolute top-2 left-2 z-10"
                      data-testid={`checkbox-product-${product.id}`}
                    >
                      {selectedProductIds.has(product.id) ? (
                        <CheckSquare className="h-5 w-5 text-primary" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-300 hover:text-gray-500" />
                      )}
                    </button>
                    <div className="w-full h-24 bg-gray-100 rounded-md overflow-hidden mb-2">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm truncate">{product.name}</p>
                      <div className="flex items-center gap-2">
                        {product.fastDelivery && (
                          <div className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 flex items-center gap-1" aria-label="10 minute delivery enabled">
                            <span className="text-xs">⚡</span>
                            <span>10m</span>
                          </div>
                        )}
                        <div className="text-xs font-medium text-gray-600">{product.fastDelivery ? "Fast" : "Standard"}</div>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{product.unit}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <p className="font-semibold text-sm text-primary">₹{parseFloat(product.price).toFixed(0)}</p>
                      {product.discountPercent && product.discountPercent > 0 && (
                        <p className="text-xs text-gray-400 line-through">₹{parseFloat(product.originalPrice).toFixed(0)}</p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <button
                        onClick={() => toggleStatusMutation.mutate({ id: product.id, isActive: !product.isActive })}
                        disabled={toggleStatusMutation.isPending}
                        className="flex items-center gap-0.5"
                        data-testid={`button-toggle-status-${product.id}`}
                      >
                        {product.isActive ? (
                          <ToggleRight className="h-5 w-5 text-green-500" />
                        ) : (
                          <ToggleLeft className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                      <div className="flex gap-1 items-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => toggleFastMutation.mutate({ id: product.id, fastDelivery: !product.fastDelivery })}
                          disabled={toggleFastMutation.isPending || Number(product.stock) <= 0}
                          title={product.fastDelivery ? "Disable 10 minute delivery" : "Enable 10 minute delivery"}
                          aria-label={`Toggle 10 minute delivery for ${product.name}`}
                          data-testid={`button-toggle-fast-${product.id}`}
                        >
                          {product.fastDelivery ? <span className="text-yellow-500">⚡</span> : <span className="text-gray-400">⚡</span>}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditDialog(product)}
                          data-testid={`button-edit-${product.id}`}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-red-500"
                          onClick={() => deleteMutation.mutate(product.id)}
                          data-testid={`button-delete-${product.id}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Edit Product" : "Add Product"}</DialogTitle>
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
                      <Input placeholder="Product name" {...field} />
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
                      <Textarea placeholder="Product description" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="image"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product Image</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {imagePreview ? (
                          <div className="relative w-full h-40 bg-gray-100 rounded-lg overflow-hidden border">
                            <img 
                              src={imagePreview} 
                              alt="Product preview" 
                              className="w-full h-full object-contain"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 h-7 w-7"
                              onClick={clearImage}
                              data-testid="button-clear-image"
                            >
                              <XIcon className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div 
                            className="w-full h-40 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <ImageIcon className="h-10 w-10 text-gray-400 mb-2" />
                            <p className="text-sm text-gray-500">Click to upload image</p>
                            <p className="text-xs text-gray-400 mt-1">Max 5MB</p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          data-testid="input-product-image"
                        />
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isUploading}
                            className="flex-1"
                            data-testid="button-upload-image"
                          >
                            {isUploading ? (
                              <>Uploading...</>
                            ) : (
                              <>
                                <Upload className="h-4 w-4 mr-2" />
                                {imagePreview ? "Change Image" : "Upload Image"}
                              </>
                            )}
                          </Button>
                        </div>
                        <Input 
                          placeholder="Or enter image URL..." 
                          {...field} 
                          onChange={(e) => {
                            field.onChange(e);
                            setImagePreview(e.target.value);
                          }}
                          className="text-xs"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
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
                      <FormLabel>Original Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
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
                      <FormLabel>Discount (%) <span className="text-xs text-gray-400">Auto</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0" 
                          max="100" 
                          placeholder="0" 
                          {...field} 
                          readOnly
                          className="bg-gray-50"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Selling Price (₹)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="stock"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stock</FormLabel>
                      <FormControl>
                        <Input type="number" min="0" placeholder="100" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="unit"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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
                <FormField
                  control={form.control}
                  name="rating"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rating</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.1" min="0" max="5" placeholder="4.0" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="mt-2">
                <FormField
                  control={form.control}
                  name="fastDelivery"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={(v) => field.onChange(v)}
                              aria-label="Enable 10 minute delivery for this product"
                              data-testid="switch-fast-delivery"
                              disabled={Number(watchStock) <= 0}
                            />
                          </FormControl>
                          <div>
                            <FormLabel className="!mt-0">Enable 10 Min Delivery</FormLabel>
                            <div className="text-xs text-gray-500">Mark this product as available for fast (10-minute) delivery</div>
                          </div>
                        </div>
                        {Number(watchStock) <= 0 && (
                          <div className="text-xs text-red-500">Cannot enable — product out of stock</div>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="bg-primary"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
