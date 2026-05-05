import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ChevronLeft, Search, Share2, Heart, Zap, RotateCcw, Truck, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Product } from "@shared/schema";
import { WeightPickerModal } from "@/components/WeightPickerModal";
import { useEffect } from "react";

export default function ProductDetailPage() {
  const [, params] = useRoute("/product/:id");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [showHighlights, setShowHighlights] = useState(true);
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  const { data: product, isLoading } = useQuery<Product>({
    queryKey: ["/api/products", params?.id],
    queryFn: async () => {
      const res = await fetch(`/api/products/${params?.id}`);
      if (!res.ok) throw new Error("Product not found");
      return res.json();
    },
    enabled: !!params?.id,
  });
  useEffect(() => {
  if (!product) return;

  const existing: Product[] = JSON.parse(
    localStorage.getItem("recentlyViewedProducts") || "[]"
  );

  const filtered = existing.filter((p) => p.id !== product.id);

  const updated = [product, ...filtered].slice(0, 10);

  localStorage.setItem(
    "recentlyViewedProducts",
    JSON.stringify(updated)
  );
}, [product]);

  const { data: wishlistItems = [] } = useQuery<{ productId: string }[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const isInWishlist = wishlistItems.some((item) => item.productId === params?.id);

  const addToCartMutation = useMutation({
    mutationFn: async (variant: string | undefined) => {
      return apiRequest("POST", "/api/cart", {
        productId: params?.id,
        quantity: 1,
        variant: variant || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({ title: "Added to cart", description: `${product?.name} added to your cart` });
      setShowWeightPicker(false);
    },
    onError: () => {
      toast({ title: "Please login", description: "You need to login to add items to cart", variant: "destructive" });
    },
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        return apiRequest("DELETE", `/api/wishlist/${params?.id}`);
      }
      return apiRequest("POST", "/api/wishlist", { productId: params?.id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: isInWishlist ? "Removed from wishlist" : "Added to wishlist",
        description: isInWishlist ? `${product?.name} removed from wishlist` : `${product?.name} added to wishlist`,
      });
    },
    onError: () => {
      toast({ title: "Please login", description: "You need to login to manage wishlist", variant: "destructive" });
    },
  });

  const handleAddToCart = () => {
    if (!user) {
      toast({ title: "Please login", description: "You need to login to add items to cart", variant: "destructive" });
      setLocation("/auth");
      return;
    }
    setShowWeightPicker(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-pulse text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <p className="text-gray-500 mb-4">Product not found</p>
        <Button onClick={() => setLocation("/grocery")}>Back to Grocery</Button>
      </div>
    );
  }

  const discount = product.originalPrice && product.discountPercent 
    ? Math.round(parseFloat(product.originalPrice) - parseFloat(product.price))
    : 0;

  return (
    <div className="min-h-screen bg-white pb-24">
      <div className="relative">
        <div className="absolute top-4 left-4 z-20">
          <button 
            onClick={() => setLocation("/grocery")}
            className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center"
            data-testid="button-back"
          >
            <ChevronLeft className="h-5 w-5 text-gray-700" />
          </button>
        </div>
        
        <div className="absolute top-4 right-4 z-20 flex gap-2">
          <button className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
            <Search className="h-5 w-5 text-gray-700" />
          </button>
          <button className="w-10 h-10 bg-white rounded-full shadow-md flex items-center justify-center">
            <Share2 className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        <div className="w-full aspect-square bg-gray-100 relative">
          <img 
            src={product.image || "https://via.placeholder.com/400"} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-gray-800" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
            <div className="w-2 h-2 rounded-full bg-gray-300" />
          </div>
        </div>
      </div>

      <div className="px-4 py-4">
        <div className="flex items-center gap-1 text-gray-500 text-sm mb-2">
          <Zap className="h-4 w-4 text-yellow-500 fill-yellow-500" />
          <span>6 mins</span>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-xl font-semibold text-gray-900" data-testid="text-product-name">
              {product.name}
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              Net quantity: {product.unit}
            </p>
          </div>
          <button 
            onClick={() => toggleWishlistMutation.mutate()}
            className="p-2"
            data-testid="button-wishlist"
          >
            <Heart
              className={`h-6 w-6 ${isInWishlist ? 'text-red-500 fill-red-500' : 'text-gray-400'}`}
            />
          </button>
        </div>

        <div className="mt-4">
          <div className="inline-block bg-green-600 text-white px-3 py-1 rounded text-lg font-bold">
            ₹{Math.round(parseFloat(product.price))}
          </div>
          <span className="text-xs text-gray-400 ml-2">per kg</span>
          {discount > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400 line-through text-sm">
                MRP ₹{Math.round(parseFloat(product.originalPrice || "0"))}
              </span>
              <span className="text-gray-500 text-sm">(incl. of all taxes)</span>
              <span className="text-green-600 font-semibold text-sm">
                ₹{discount} OFF
              </span>
            </div>
          )}
        </div>

        <div className="flex gap-3 mt-6">
          <div className="flex-1 border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <RotateCcw className="h-6 w-6 text-gray-600" />
            </div>
            <span className="text-sm text-gray-700 font-medium">Easy Refunds</span>
          </div>
          <div className="flex-1 border border-gray-200 rounded-xl p-4 flex flex-col items-center gap-2">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Truck className="h-6 w-6 text-gray-600" />
            </div>
            <span className="text-sm text-gray-700 font-medium">Fast Delivery</span>
          </div>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-4">
          <button 
            onClick={() => setShowHighlights(!showHighlights)}
            className="w-full flex items-center justify-between py-2"
          >
            <span className="text-lg font-semibold text-gray-900">Highlights</span>
            {showHighlights ? (
              <ChevronUp className="h-5 w-5 text-gray-500" />
            ) : (
              <ChevronDown className="h-5 w-5 text-gray-500" />
            )}
          </button>
          {showHighlights && (
            <div className="py-2 text-gray-600 text-sm space-y-2">
              <p>{product.description || "Fresh and high-quality product delivered to your doorstep."}</p>
              <ul className="list-disc list-inside space-y-1 text-gray-500">
                <li>100% Fresh & Organic</li>
                <li>Carefully handpicked</li>
                <li>No preservatives added</li>
                <li>Farm to table in 24 hours</li>
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4 flex gap-3">
        <Button
          onClick={handleAddToCart}
          disabled={addToCartMutation.isPending}
          className="flex-1 bg-primary text-white py-6 rounded-xl text-lg font-semibold"
          data-testid="button-add-to-cart"
        >
          {addToCartMutation.isPending && !showWeightPicker
            ? "Adding..."
            : "Add to Cart"
          }
        </Button>
      </div>

      {product && (
        <WeightPickerModal
          product={product}
          open={showWeightPicker}
          onClose={() => setShowWeightPicker(false)}
          onAddToCart={(variant) => addToCartMutation.mutate(variant)}
          isPending={addToCartMutation.isPending}
        />
      )}
    </div>
  );
}