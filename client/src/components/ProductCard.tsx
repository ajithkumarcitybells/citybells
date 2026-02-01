import { Heart, Eye, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: wishlistItems = [] } = useQuery<{ productId: string }[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const isInWishlist = wishlistItems.some(item => item.productId === product.id);

  const addToCartMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/cart", { productId: product.id, quantity: 1 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: `${product.name} has been added to your cart.`,
      });
    },
    onError: () => {
      if (!user) {
        setLocation("/auth");
        toast({
          title: "Please login",
          description: "You need to login to add items to cart.",
          variant: "destructive",
        });
      }
    },
  });

  const toggleWishlistMutation = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        await apiRequest("DELETE", `/api/wishlist/${product.id}`);
      } else {
        await apiRequest("POST", "/api/wishlist", { productId: product.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: isInWishlist ? "Removed from wishlist" : "Added to wishlist",
        description: isInWishlist 
          ? `${product.name} has been removed from your wishlist.`
          : `${product.name} has been added to your wishlist.`,
      });
    },
    onError: () => {
      if (!user) {
        setLocation("/auth");
        toast({
          title: "Please login",
          description: "You need to login to manage your wishlist.",
          variant: "destructive",
        });
      }
    },
  });

  const originalPrice = parseFloat(product.originalPrice);
  const currentPrice = parseFloat(product.price);
  const rating = parseFloat(product.rating || "4.0");

  return (
    <div 
      className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm"
      data-testid={`card-product-${product.id}`}
    >
      <div className="relative aspect-square bg-gray-50 p-2">
        <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
          <button 
            onClick={() => toggleWishlistMutation.mutate()}
            className="p-1.5 bg-white rounded-full shadow-md hover-elevate active-elevate-2"
            disabled={toggleWishlistMutation.isPending}
            data-testid={`button-wishlist-${product.id}`}
          >
            <Heart 
              className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
            />
          </button>
          <button 
            className="p-1.5 bg-white rounded-full shadow-md hover-elevate active-elevate-2"
            data-testid={`button-view-${product.id}`}
          >
            <Eye className="h-4 w-4 text-gray-400" />
          </button>
        </div>
        
        {product.image ? (
          <img 
            src={product.image} 
            alt={product.name}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 rounded-lg" />
        )}
      </div>
      
      <div className="p-3">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-medium text-sm text-gray-800 line-clamp-1 flex-1">
            {product.name}
          </h3>
          <div className="flex items-center gap-0.5 ml-2">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg font-bold text-primary">
            ₹{currentPrice.toFixed(2)}
          </span>
          {product.discountPercent && product.discountPercent > 0 && (
            <>
              <span className="text-sm text-gray-400 line-through">
                ₹{originalPrice.toFixed(2)}
              </span>
              <span className="text-xs font-medium text-green-600">
                {product.discountPercent}% off
              </span>
            </>
          )}
        </div>
        
        <Button
          onClick={() => addToCartMutation.mutate()}
          disabled={addToCartMutation.isPending}
          className="w-full bg-primary hover:bg-primary/90 text-white font-medium"
          size="sm"
          data-testid={`button-add-cart-${product.id}`}
        >
          {addToCartMutation.isPending ? "Adding..." : "Add to Cart"}
        </Button>
      </div>
    </div>
  );
}
