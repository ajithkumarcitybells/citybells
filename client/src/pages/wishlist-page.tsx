import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { Heart, Trash2, ShoppingCart } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { WishlistItemWithProduct } from "@shared/schema";

export default function WishlistPage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: wishlistItems = [], isLoading } = useQuery<WishlistItemWithProduct[]>({
    queryKey: ["/api/wishlist"],
    enabled: !!user,
  });

  const removeFromWishlistMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("DELETE", `/api/wishlist/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wishlist"] });
      toast({
        title: "Removed from wishlist",
        description: "Item has been removed from your wishlist.",
      });
    },
  });

  const addToCartMutation = useMutation({
    mutationFn: async (productId: string) => {
      await apiRequest("POST", "/api/cart", { productId, quantity: 1 });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      toast({
        title: "Added to cart",
        description: "Item has been added to your cart.",
      });
    },
  });

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Please login to view your wishlist</p>
            <Link href="/auth">
              <Button className="bg-primary text-white" data-testid="button-login">
                Login to Continue
              </Button>
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto">
        <h1 className="text-xl font-bold text-gray-800 mb-4">My Wishlist</h1>

        {isLoading ? (
          <div className="space-y-4">
            {Array(3).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 flex gap-4">
                <Skeleton className="w-24 h-24 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/4" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Your wishlist is empty</h2>
            <p className="text-gray-500 mb-6">Save items you love for later</p>
            <Link href="/grocery">
              <Button className="bg-primary text-white" data-testid="button-shop">
                Browse Products
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {wishlistItems.map((item) => (
              <div 
                key={item.id} 
                className="bg-white rounded-xl p-4 flex gap-4 shadow-sm"
                data-testid={`wishlist-item-${item.id}`}
              >
                <div className="w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                  {item.product.image ? (
                    <img 
                      src={item.product.image} 
                      alt={item.product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-gray-800">{item.product.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-lg font-bold text-primary">
                      ₹{parseFloat(item.product.price).toFixed(2)}
                    </span>
                    {item.product.discountPercent && item.product.discountPercent > 0 && (
                      <>
                        <span className="text-sm text-gray-400 line-through">
                          ₹{parseFloat(item.product.originalPrice).toFixed(2)}
                        </span>
                        <span className="text-xs font-medium text-green-600">
                          {item.product.discountPercent}% off
                        </span>
                      </>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2 mt-3">
                    <Button
                      onClick={() => addToCartMutation.mutate(item.product.id)}
                      size="sm"
                      className="bg-primary text-white flex-1"
                      disabled={addToCartMutation.isPending}
                      data-testid={`button-add-cart-${item.id}`}
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Add to Cart
                    </Button>
                    <Button
                      onClick={() => removeFromWishlistMutation.mutate(item.product.id)}
                      size="sm"
                      variant="outline"
                      className="text-red-500 border-red-200 hover:bg-red-50"
                      disabled={removeFromWishlistMutation.isPending}
                      data-testid={`button-remove-${item.id}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
