import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, Image as ImageIcon, X as XIcon, ToggleLeft, ToggleRight, Download, FileSpreadsheet, ArrowLeft, Search } from "lucide-react";
import * as XLSX from "xlsx";
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
});

type ProductFormData = z.infer<typeof productSchema>;

export default function AdminProductsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/admin/products"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
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
    },
  });

  const watchOriginalPrice = form.watch("originalPrice");
  const watchPrice = form.watch("price");

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

  const handleExportExcel = () => {
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
      Active: product.isActive ? "Yes" : "No",
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, `products_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Products exported successfully" });
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet) as Record<string, unknown>[];

      let successCount = 0;
      let errorCount = 0;

      for (const row of jsonData) {
        const categoryName = String(row["Category"] || "");
        const category = categories.find(c => c.name.toLowerCase() === categoryName.toLowerCase());
        
        const productData = {
          name: String(row["Name"] || ""),
          description: String(row["Description"] || ""),
          categoryId: category?.id || "",
          originalPrice: String(row["Original Price"] || "0"),
          price: String(row["Selling Price"] || "0"),
          discountPercent: Number(row["Discount %"]) || 0,
          stock: Number(row["Stock"]) || 100,
          unit: String(row["Unit"] || "1 pc"),
          image: String(row["Image"] || ""),
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
            onClick={() => { setSelectedCategoryId(null); setSearchQuery(""); }}
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
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-products"
            />
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 p-4">
              {products
                .filter(p => p.categoryId === selectedCategoryId)
                .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()))
                .map((product) => (
                  <div
                    key={product.id}
                    className={`relative border rounded-lg p-3 ${product.isActive ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}
                    data-testid={`product-card-${product.id}`}
                  >
                    <div className="w-full h-24 bg-gray-100 rounded-md overflow-hidden mb-2">
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{product.name}</p>
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
                      <div className="flex gap-1">
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
                      <FormControl>
                        <Input placeholder="1 kg, 500g, 1 pc" {...field} />
                      </FormControl>
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
