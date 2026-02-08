import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, X, ImageIcon } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AdminLayout } from "./index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CategoryAd, Category, insertCategoryAdSchema } from "@shared/schema";

const categoryAdSchema = insertCategoryAdSchema.extend({
  title: z.string().min(1, "Title is required"),
  sortOrder: z.coerce.number().default(0),
});

type CategoryAdFormData = z.infer<typeof categoryAdSchema>;

export default function AdminCategoryAdsPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAd, setEditingAd] = useState<CategoryAd | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: ads = [], isLoading } = useQuery<CategoryAd[]>({
    queryKey: ["/api/admin/category-ads"],
  });

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const form = useForm<CategoryAdFormData>({
    resolver: zodResolver(categoryAdSchema),
    defaultValues: {
      title: "",
      image: "",
      categoryId: null,
      linkUrl: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CategoryAdFormData) => {
      const res = await apiRequest("POST", "/api/admin/category-ads", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-ads"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && (query.queryKey[0] as string).startsWith('/api/category-ads')
      });
      setIsDialogOpen(false);
      form.reset();
      setImagePreview(null);
      toast({ title: "Ad created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create ad", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryAdFormData }) => {
      const res = await apiRequest("PATCH", `/api/admin/category-ads/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-ads"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && (query.queryKey[0] as string).startsWith('/api/category-ads')
      });
      setIsDialogOpen(false);
      setEditingAd(null);
      form.reset();
      setImagePreview(null);
      toast({ title: "Ad updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update ad", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/category-ads/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-ads"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        typeof query.queryKey[0] === 'string' && (query.queryKey[0] as string).startsWith('/api/category-ads')
      });
      toast({ title: "Ad deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete ad", description: error.message, variant: "destructive" });
    },
  });

  const handleImageUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file type", description: "Please upload an image file", variant: "destructive" });
      return;
    }
    setIsUploading(true);
    try {
      const res = await apiRequest("POST", "/api/uploads/request-url", {
        name: file.name,
        size: file.size,
        contentType: file.type,
      });
      const { uploadURL, objectPath } = await res.json();
      await fetch(uploadURL, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      form.setValue("image", objectPath);
      setImagePreview(objectPath);
      toast({ title: "Image uploaded successfully" });
    } catch (error) {
      toast({ title: "Upload failed", description: "Please try again", variant: "destructive" });
    } finally {
      setIsUploading(false);
    }
  };

  const clearImage = () => {
    form.setValue("image", "");
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCreateDialog = () => {
    setEditingAd(null);
    form.reset();
    setImagePreview(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (ad: CategoryAd) => {
    setEditingAd(ad);
    form.reset({
      title: ad.title,
      image: ad.image || "",
      categoryId: ad.categoryId || null,
      linkUrl: ad.linkUrl || "",
      isActive: ad.isActive ?? true,
      sortOrder: ad.sortOrder || 0,
    });
    setImagePreview(ad.image || null);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: CategoryAdFormData) => {
    if (editingAd) {
      updateMutation.mutate({ id: editingAd.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getCategoryName = (categoryId: string | null) => {
    if (!categoryId) return "All Categories";
    const cat = categories.find(c => c.id === categoryId);
    return cat?.name || "Unknown";
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between gap-2 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-800" data-testid="text-page-title">Category Ads</h1>
          <p className="text-gray-500">Manage promotional ads shown per category</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary" data-testid="button-add-ad">
          <Plus className="h-4 w-4 mr-2" />
          Add Ad
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array(6).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      ) : ads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">No category ads yet. Create your first ad!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ads.map((ad) => (
            <div
              key={ad.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              data-testid={`ad-card-${ad.id}`}
            >
              <div className="aspect-[2/1] bg-gray-50 relative">
                {ad.image ? (
                  <img
                    src={ad.image}
                    alt={ad.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-gray-300" />
                  </div>
                )}
                {!ad.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white px-3 py-1 rounded-full text-sm font-medium">Inactive</span>
                  </div>
                )}
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-gray-800 text-sm truncate">{ad.title}</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Category: {getCategoryName(ad.categoryId)}
                </p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">Order: {ad.sortOrder}</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(ad)} data-testid={`button-edit-ad-${ad.id}`}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(ad.id)} data-testid={`button-delete-ad-${ad.id}`}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAd ? "Edit Ad" : "Add New Ad"}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ad title" data-testid="input-ad-title" />
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
                    <Select
                      value={field.value || "all"}
                      onValueChange={(val) => field.onChange(val === "all" ? null : val)}
                    >
                      <FormControl>
                        <SelectTrigger data-testid="select-ad-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="all">All Categories (Global)</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="image"
                render={() => (
                  <FormItem>
                    <FormLabel>Ad Image</FormLabel>
                    <FormControl>
                      <div>
                        {imagePreview ? (
                          <div className="relative rounded-lg overflow-hidden border border-gray-200">
                            <img src={imagePreview} alt="Preview" className="w-full h-32 object-cover" />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-1 right-1 bg-white/80"
                              onClick={clearImage}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center cursor-pointer hover:border-gray-300"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                            <p className="text-sm text-gray-500">
                              {isUploading ? "Uploading..." : "Click to upload image (max 5MB)"}
                            </p>
                          </div>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(file);
                          }}
                          data-testid="input-ad-image"
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="linkUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link URL (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="https://..." data-testid="input-ad-link" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="sortOrder"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Sort Order</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} data-testid="input-ad-sort" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex items-center gap-2 mt-8">
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} data-testid="switch-ad-active" />
                      </FormControl>
                      <FormLabel className="!mt-0">Active</FormLabel>
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending || updateMutation.isPending}
                data-testid="button-submit-ad"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingAd ? "Update Ad" : "Create Ad"}
              </Button>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
