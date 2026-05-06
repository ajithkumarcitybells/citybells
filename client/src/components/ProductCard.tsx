import { useState } from "react";
import { Heart, Eye, Star, Plus, Columns } from "lucide-react";
import { toggleCompare, isCompared } from "@/lib/compare";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { WeightPickerModal } from "./WeightPickerModal";
import { FastDeliveryBadge, isFastDeliveryProduct } from "@/components/FastDelivery";
import { SubscriberDealBadge } from "@/components/GrocerySubscription";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showWeightPicker, setShowWeightPicker] = useState(false);

  const { data: wishlistItems = [] } = useQuery<{ productId: string }[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const outOfStock = (product.stock ?? 0) <= 0;
  const fastDeliveryEligible = isFastDeliveryProduct(product);

  const { data: similarProducts = [] } = useQuery({
    queryKey: ["similar", product.id],
    queryFn: async () => {
      if (!product.categoryId) return [];
      const res = await apiRequest("GET", `/api/products?category=${product.categoryId}`);
      const list = await res.json();
      return list;
    },
    enabled: !!product.categoryId && outOfStock,
  });

  const subscribeMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/restock/subscribe", { productId: product.id });
    },
    onSuccess: () => {
      toast({ title: "Subscribed", description: `We'll notify you when ${product.name} is back in stock.` });
    },
    onError: () => {
      if (!user) {
        setLocation('/auth');
        toast({ title: 'Please login', description: 'You need to login to subscribe.', variant: 'destructive' });
      } else {
        toast({ title: 'Error', description: 'Could not subscribe. Try again later.', variant: 'destructive' });
      }
    }
  });

  const isInWishlist = wishlistItems.some(item => item.productId === product.id);

  const addToCartMutation = useMutation({
    mutationFn: async (params: { variant?: string } | undefined) => {
      const res = await apiRequest("POST", "/api/cart", {
        productId: product.id,
        quantity: 1,
        variant: params?.variant || null,
      });
      return res.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      const variantText = variables?.variant ? ` - ${variables.variant}` : "";
      toast({
        title: "Added to cart",
        description: `${product.name}${variantText} has been added to your cart.`,
      });
      setShowWeightPicker(false);
      // announce to screen readers
      try { window.dispatchEvent(new CustomEvent('a11y-announcement', { detail: { message: `${product.name} added to cart` } })); } catch {}
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

  const handleAddToCart = () => {
    if (!user) {
      setLocation("/auth");
      toast({
        title: "Please login",
        description: "You need to login to add items to cart.",
        variant: "destructive",
      });
      return;
    }
    setShowWeightPicker(true);
  };

  const handleToggleCompare = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleCompare(product.id);
    // trigger react-query revalidation for UI lists
    queryClient.invalidateQueries({ queryKey: ["/api/products"] });
    // small toast feedback
    try { toast({ title: isCompared(product.id) ? 'Removed from compare' : 'Added to compare' }); } catch {}
  };

  const handleWeightAddToCart = (variant: string) => {
    addToCartMutation.mutate({ variant });
  };

  const originalPrice = parseFloat(product.originalPrice);
  const currentPrice = parseFloat(product.price);
  const rating = parseFloat(product.rating || "4.0");

  return (
    <>
      <div 
        role="group"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setLocation(`/product/${product.id}`); } }}
        aria-label={`${product.name} - ₹${parseFloat(product.price).toFixed(2)} per ${product.unit || 'unit'}`}
        className={`bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${outOfStock ? 'opacity-80' : ''}`}
        data-testid={`card-product-${product.id}`}
      >
        <div 
          className="relative aspect-square p-2 cursor-pointer bg-[#fff]"
          onClick={() => setLocation(`/product/${product.id}`)}
        >
            {outOfStock && (
              <div className="absolute left-2 top-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded z-20">Out of Stock</div>
            )}
            {!outOfStock && fastDeliveryEligible && (
              <div className="absolute left-2 top-2 z-20">
                <FastDeliveryBadge compact />
              </div>
            )}
            {!outOfStock && !fastDeliveryEligible && (product as any).subscriberDeal && (
              <div className="absolute left-2 top-2 z-20">
                <SubscriberDealBadge discount={(product as any).subscriberDiscountPercent} />
              </div>
            )}
            <div className="absolute top-2 right-2 flex flex-col gap-1 z-10">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleWishlistMutation.mutate(); }}
              className="p-1.5 bg-white rounded-full shadow-md hover-elevate active-elevate-2"
              disabled={toggleWishlistMutation.isPending}
              data-testid={`button-wishlist-${product.id}`}
            >
              <Heart 
                className={`h-4 w-4 ${isInWishlist ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} 
              />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); handleToggleCompare(e); }}
              className="p-1.5 bg-white rounded-full shadow-md hover-elevate active-elevate-2"
              data-testid={`button-compare-${product.id}`}
            >
              <Columns className={`h-4 w-4 ${isCompared(product.id) ? 'text-primary' : 'text-gray-400'}`} />
            </button>
            <button 
              onClick={(e) => { e.stopPropagation(); setLocation(`/product/${product.id}`); }}
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
        
        <div className="p-3 flex flex-col flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 
              className="font-medium text-sm text-gray-800 flex-1 cursor-pointer hover:text-primary leading-tight"
              onClick={() => setLocation(`/product/${product.id}`)}
            >
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
          
          <p className="text-xs text-gray-400 mb-1">per {product.unit || "Kg"} price</p>
          {fastDeliveryEligible && (
            <p className="text-xs font-medium text-emerald-700 mb-2">10 min delivery available</p>
          )}
          {(product as any).subscriberDeal && (
            <p className="text-xs font-medium text-purple-700 mb-2">Subscriber deal auto-applies at checkout</p>
          )}
          
            <div className="mt-auto" />
            <div className="flex items-center gap-2">
              <button
                onClick={() => addToCartMutation.mutate(undefined)}
                disabled={addToCartMutation.isPending || outOfStock}
                aria-label={`Quick add ${product.name} to cart`}
                className="p-2 bg-white rounded-lg shadow-sm hover-elevate active-elevate-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                data-testid={`button-quick-add-${product.id}`}
              >
                <Plus className="h-4 w-4 text-primary" />
              </button>
              {!outOfStock ? (
                <Button
                  onClick={handleAddToCart}
                  disabled={addToCartMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-white font-medium"
                  size="sm"
                  data-testid={`button-add-cart-${product.id}`}
                  aria-label={`Add ${product.name} to cart`}
                >
                  {addToCartMutation.isPending && !showWeightPicker ? "Adding..." : "Add to Cart"}
                </Button>
              ) : (
                <Button
                  onClick={() => subscribeMutation.mutate()}
                  disabled={subscribeMutation.isPending}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700 text-white font-medium"
                  size="sm"
                  data-testid={`button-notify-${product.id}`}
                  aria-label={`Notify when ${product.name} is back in stock`}
                >
                  {subscribeMutation.isPending ? 'Subscribing...' : "Notify Me"}
                </Button>
              )}
            </div>
            {/* Similar items suggestions */}
            {outOfStock && similarProducts.length > 0 && (
              <div className="mt-3">
                <div className="text-xs font-semibold text-gray-700 mb-2">Similar Items You Can Buy</div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {similarProducts.filter((p: Product) => p.id !== product.id && Math.abs(parseFloat(p.price) - currentPrice) / currentPrice <= 0.3).slice(0,8).map((s: Product) => (
                    <div key={s.id} onClick={() => setLocation(`/product/${s.id}`)} className="min-w-[120px] bg-white border rounded-lg p-2 flex-shrink-0 cursor-pointer">
                      <img src={s.image || ''} alt={s.name} className="h-16 w-full object-contain" />
                      <div className="text-xs font-medium mt-1">{s.name}</div>
                      <div className="text-xs text-gray-500">₹{parseFloat(s.price).toFixed(0)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
        </div>
      </div>
      <WeightPickerModal
        product={product}
        open={showWeightPicker}
        onClose={() => setShowWeightPicker(false)}
        onAddToCart={handleWeightAddToCart}
        isPending={addToCartMutation.isPending}
      />
    </>
  );
}
