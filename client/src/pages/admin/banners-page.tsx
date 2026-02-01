import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Upload, X, ImageIcon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Banner } from "@shared/schema";

const bannerSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subtitle: z.string().optional(),
  image: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.coerce.number().default(0),
});

type BannerFormData = z.infer<typeof bannerSchema>;

export default function AdminBannersPage() {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Banner | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: banners = [], isLoading } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
  });

  const form = useForm<BannerFormData>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      title: "",
      subtitle: "",
      image: "",
      isActive: true,
      sortOrder: 0,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: BannerFormData) => {
      const res = await apiRequest("POST", "/api/admin/banners", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      setIsDialogOpen(false);
      form.reset();
      toast({ title: "Banner created successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to create banner", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: BannerFormData }) => {
      const res = await apiRequest("PATCH", `/api/admin/banners/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      setIsDialogOpen(false);
      setEditingBanner(null);
      form.reset();
      toast({ title: "Banner updated successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update banner", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/banners"] });
      toast({ title: "Banner deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Failed to delete banner", description: error.message, variant: "destructive" });
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
        filename: file.name,
        contentType: file.type,
      });
      const { uploadUrl, publicUrl } = await res.json();

      await fetch(uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });

      form.setValue("image", publicUrl);
      setImagePreview(publicUrl);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const openCreateDialog = () => {
    setEditingBanner(null);
    form.reset();
    setImagePreview(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (banner: Banner) => {
    setEditingBanner(banner);
    form.reset({
      title: banner.title,
      subtitle: banner.subtitle || "",
      image: banner.image || "",
      isActive: banner.isActive ?? true,
      sortOrder: banner.sortOrder || 0,
    });
    setImagePreview(banner.image || null);
    setIsDialogOpen(true);
  };

  const onSubmit = (data: BannerFormData) => {
    if (editingBanner) {
      updateMutation.mutate({ id: editingBanner.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Banners</h1>
          <p className="text-gray-500">Manage promotional banners</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-primary" data-testid="button-add-banner">
          <Plus className="h-4 w-4 mr-2" />
          Add Banner
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : banners.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-100">
          <p className="text-gray-500">No banners yet. Create your first banner!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {banners.map((banner) => (
            <div 
              key={banner.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
              data-testid={`banner-card-${banner.id}`}
            >
              <div className="aspect-[2/1] bg-gradient-to-r from-yellow-300 via-yellow-200 to-green-300 relative">
                {banner.image && (
                  <img 
                    src={banner.image} 
                    alt={banner.title}
                    className="absolute right-0 top-0 h-full w-1/2 object-contain"
                  />
                )}
                <div className="absolute inset-0 flex flex-col justify-center px-6">
                  <h3 className="text-xl font-bold text-green-800">{banner.title}</h3>
                  {banner.subtitle && (
                    <p className="text-sm text-gray-700">{banner.subtitle}</p>
                  )}
                </div>
                {!banner.isActive && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <span className="bg-white px-3 py-1 rounded-full text-sm font-medium">
                      Inactive
                    </span>
                  </div>
                )}
              </div>
              <div className="p-3 flex items-center justify-between">
                <span className="text-sm text-gray-500">Order: {banner.sortOrder}</span>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(banner)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(banner.id)}
                    className="text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingBanner ? "Edit Banner" : "Add Banner"}</DialogTitle>
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
                      <Input placeholder="CHOOSE FRESH" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="subtitle"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subtitle</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Fresh fruits and vegetables..." {...field} />
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
                    <FormLabel>Banner Image</FormLabel>
                    <FormControl>
                      <div className="space-y-3">
                        {imagePreview ? (
                          <div className="relative">
                            <img
                              src={imagePreview}
                              alt="Banner preview"
                              className="w-full h-32 object-cover rounded-lg border"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
                              onClick={clearImage}
                              data-testid="button-clear-banner-image"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div
                            className="w-full h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            {isUploading ? (
                              <div className="text-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
                                <p className="text-sm text-gray-500">Uploading...</p>
                              </div>
                            ) : (
                              <>
                                <ImageIcon className="h-8 w-8 text-gray-400 mb-2" />
                                <p className="text-sm text-gray-500">Click to upload image</p>
                                <p className="text-xs text-gray-400">Max 5MB</p>
                              </>
                            )}
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
                          data-testid="input-banner-image-upload"
                        />
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="Or paste image URL..."
                            value={field.value}
                            onChange={(e) => {
                              field.onChange(e);
                              setImagePreview(e.target.value || null);
                            }}
                            data-testid="input-banner-image-url"
                          />
                          {!imagePreview && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={isUploading}
                              data-testid="button-upload-banner-image"
                            >
                              <Upload className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="sortOrder"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sort Order</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="text-base">Active</FormLabel>
                      <p className="text-sm text-gray-500">Show this banner</p>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
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
