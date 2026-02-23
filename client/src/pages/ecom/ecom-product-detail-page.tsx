import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute, useLocation, Link } from "wouter";
import {
  Star,
  Heart,
  ShoppingCart,
  ChevronLeft,
  ChevronRight,
  Truck,
  Shield,
  RotateCcw,
  Store,
  Minus,
  Plus,
} from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { EcomProduct, EcomReviewWithUser, SellerProfile } from "@shared/schema";

export default function EcomProductDetailPage() {
  const [, params] = useRoute("/ecommerce/product/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const productId = params?.id;

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewTitle, setReviewTitle] = useState("");
  const [reviewComment, setReviewComment] = useState("");

  const { data: product, isLoading } = useQuery<EcomProduct>({
    queryKey: ["/api/ecom/products", productId],
    enabled: !!productId,
  });

  const { data: reviews = [] } = useQuery<EcomReviewWithUser[]>({
    queryKey: ["/api/ecom/products", productId, "reviews"],
    enabled: !!productId,
  });

  const { data: sellerProfile } = useQuery<SellerProfile>({
    queryKey: ["/api/ecom/seller", product?.vendorId],
    enabled: !!product?.vendorId,
  });

  const { data: allProducts = [] } = useQuery<EcomProduct[]>({
    queryKey: ["/api/ecom/products"],
  });

  const { data: wishlistItems = [] } = useQuery<{ productId: string }[]>({
    queryKey: ["/api/ecom/wishlist"],
    enabled: !!user,
  });

  const isInWishlist = wishlistItems.some((w) => w.productId === productId);

  const relatedProducts = allProducts
    .filter((p) => p.id !== productId && p.categoryId === product?.categoryId && p.isActive && p.isApproved)
    .slice(0, 6);

  const addToCart = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ecom/cart", {
        productId,
        quantity,
        variant: selectedVariant,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/cart"] });
      toast({ title: "Added to cart", description: `${product?.name} added to your cart.` });
    },
    onError: () => {
      if (!user) {
        setLocation("/auth");
        toast({ title: "Please login", description: "Login to add items to cart.", variant: "destructive" });
      }
    },
  });

  const toggleWishlist = useMutation({
    mutationFn: async () => {
      if (isInWishlist) {
        await apiRequest("DELETE", `/api/ecom/wishlist/${productId}`);
      } else {
        await apiRequest("POST", "/api/ecom/wishlist", { productId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/wishlist"] });
      toast({
        title: isInWishlist ? "Removed from wishlist" : "Added to wishlist",
        description: isInWishlist ? "Removed from your wishlist." : "Added to your wishlist.",
      });
    },
    onError: () => {
      if (!user) {
        setLocation("/auth");
        toast({ title: "Please login", description: "Login to manage wishlist.", variant: "destructive" });
      }
    },
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/ecom/reviews", {
        productId,
        rating: reviewRating,
        title: reviewTitle,
        comment: reviewComment,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/products", productId, "reviews"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/products", productId] });
      setReviewTitle("");
      setReviewComment("");
      setReviewRating(5);
      toast({ title: "Review submitted", description: "Thank you for your review!" });
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          <Skeleton className="aspect-square rounded-xl" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-20 w-full" />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-gray-500 mb-4" data-testid="text-not-found">Product not found</p>
          <Link href="/ecommerce">
            <Button variant="outline" data-testid="button-back-to-shop">Back to Shop</Button>
          </Link>
        </div>
        <BottomNav />
      </div>
    );
  }

  const images = (product.images as string[]) || [];
  const price = parseFloat(product.price);
  const origPrice = parseFloat(product.originalPrice);
  const rating = parseFloat(product.rating || "0");
  const variants = (product.variants as Array<{ type: string; options: string[] }>) || [];
  const specs = (product.specifications as Record<string, string>) || {};

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="relative rounded-xl overflow-hidden bg-white" data-testid="product-image-gallery">
          <div className="aspect-square bg-white p-4">
            {images.length > 0 ? (
              <img
                src={images[selectedImage]}
                alt={product.name}
                className="w-full h-full object-contain"
                data-testid="img-product-main"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg" />
            )}
          </div>

          {images.length > 1 && (
            <>
              <button
                onClick={() => setSelectedImage((p) => (p - 1 + images.length) % images.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full shadow-md"
                data-testid="button-prev-image"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setSelectedImage((p) => (p + 1) % images.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-white/80 rounded-full shadow-md"
                data-testid="button-next-image"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </>
          )}

          {product.discountPercent && product.discountPercent > 0 && (
            <Badge variant="destructive" className="absolute top-3 left-3" data-testid="badge-discount">
              {product.discountPercent}% OFF
            </Badge>
          )}
        </div>

        {images.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {images.map((img, i) => (
              <button
                key={i}
                onClick={() => setSelectedImage(i)}
                className={`flex-shrink-0 w-16 h-16 rounded-md overflow-hidden border-2 ${
                  i === selectedImage ? "border-primary" : "border-gray-200"
                }`}
                data-testid={`button-thumbnail-${i}`}
              >
                <img src={img} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl p-4 space-y-3">
          {product.brand && (
            <span className="text-xs text-gray-400 uppercase font-medium" data-testid="text-brand">{product.brand}</span>
          )}
          <h1 className="text-lg font-semibold text-gray-900 leading-tight" data-testid="text-product-name">
            {product.name}
          </h1>

          {rating > 0 && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-0.5 bg-green-600 text-white px-1.5 py-0.5 rounded text-xs font-medium">
                <span>{rating.toFixed(1)}</span>
                <Star className="h-3 w-3 fill-current" />
              </div>
              <span className="text-xs text-gray-500" data-testid="text-review-count">
                {product.reviewCount || 0} reviews
              </span>
            </div>
          )}

          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl font-bold text-gray-900" data-testid="text-price">₹{price.toFixed(0)}</span>
            {product.discountPercent && product.discountPercent > 0 && (
              <>
                <span className="text-base text-gray-400 line-through">₹{origPrice.toFixed(0)}</span>
                <span className="text-sm font-medium text-green-600" data-testid="text-savings">
                  Save ₹{(origPrice - price).toFixed(0)}
                </span>
              </>
            )}
          </div>

          {product.stock !== null && product.stock !== undefined && product.stock <= 10 && product.stock > 0 && (
            <Badge variant="secondary" className="text-orange-600 bg-orange-50" data-testid="badge-low-stock">
              Only {product.stock} left in stock
            </Badge>
          )}
          {product.stock === 0 && (
            <Badge variant="destructive" data-testid="badge-out-of-stock">Out of Stock</Badge>
          )}
        </div>

        {variants.length > 0 && (
          <div className="bg-white rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-800">Select Variant</h3>
            {variants.map((v, vi) => (
              <div key={vi}>
                <span className="text-xs text-gray-500 mb-1.5 block">{v.type}</span>
                <div className="flex gap-2 flex-wrap">
                  {v.options.map((opt) => (
                    <Button
                      key={opt}
                      variant={selectedVariant === `${v.type}:${opt}` ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedVariant(`${v.type}:${opt}`)}
                      data-testid={`button-variant-${v.type}-${opt}`}
                    >
                      {opt}
                    </Button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="bg-white rounded-xl p-4">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Quantity</span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                disabled={quantity <= 1}
                data-testid="button-qty-minus"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="w-8 text-center font-medium" data-testid="text-quantity">{quantity}</span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setQuantity((q) => q + 1)}
                disabled={product.stock !== null && product.stock !== undefined && quantity >= product.stock}
                data-testid="button-qty-plus"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => toggleWishlist.mutate()}
            disabled={toggleWishlist.isPending}
            data-testid="button-toggle-wishlist"
          >
            <Heart className={`h-4 w-4 ${isInWishlist ? "fill-red-500 text-red-500" : ""}`} />
            {isInWishlist ? "Wishlisted" : "Wishlist"}
          </Button>
          <Button
            className="flex-1 gap-2"
            onClick={() => addToCart.mutate()}
            disabled={addToCart.isPending || product.stock === 0}
            data-testid="button-add-to-cart"
          >
            <ShoppingCart className="h-4 w-4" />
            {addToCart.isPending ? "Adding..." : "Add to Cart"}
          </Button>
        </div>

        <div className="bg-white rounded-xl p-4">
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="flex flex-col items-center gap-1">
              <Truck className="h-5 w-5 text-gray-500" />
              <span className="text-[10px] text-gray-500">Free Delivery</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <Shield className="h-5 w-5 text-gray-500" />
              <span className="text-[10px] text-gray-500">Genuine Product</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <RotateCcw className="h-5 w-5 text-gray-500" />
              <span className="text-[10px] text-gray-500">Easy Returns</span>
            </div>
          </div>
        </div>

        {product.description && (
          <div className="bg-white rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Description</h3>
            <p className="text-sm text-gray-600 leading-relaxed" data-testid="text-description">{product.description}</p>
          </div>
        )}

        {Object.keys(specs).length > 0 && (
          <div className="bg-white rounded-xl p-4 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Specifications</h3>
            <div className="space-y-2">
              {Object.entries(specs).map(([key, val]) => (
                <div key={key} className="flex justify-between text-sm py-1.5 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{key}</span>
                  <span className="text-gray-800 font-medium text-right">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {sellerProfile && (
          <Card className="p-4 border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Store className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800" data-testid="text-seller-name">{sellerProfile.storeName}</p>
                {sellerProfile.storeDescription && (
                  <p className="text-xs text-gray-500 line-clamp-1">{sellerProfile.storeDescription}</p>
                )}
              </div>
              <Link href={`/ecommerce/products?seller=${product.vendorId}`}>
                <Button variant="outline" size="sm" data-testid="button-visit-store">Visit Store</Button>
              </Link>
            </div>
          </Card>
        )}

        <div className="bg-white rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Reviews ({reviews.length})</h3>
            {rating > 0 && (
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="text-sm font-medium">{rating.toFixed(1)}</span>
              </div>
            )}
          </div>

          {user && (
            <div className="space-y-3 border-t border-gray-100 pt-3">
              <h4 className="text-xs font-medium text-gray-600">Write a Review</h4>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    onClick={() => setReviewRating(s)}
                    data-testid={`button-review-star-${s}`}
                  >
                    <Star
                      className={`h-5 w-5 ${
                        s <= reviewRating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Input
                placeholder="Review title (optional)"
                value={reviewTitle}
                onChange={(e) => setReviewTitle(e.target.value)}
                className="text-sm"
                data-testid="input-review-title"
              />
              <Textarea
                placeholder="Write your review..."
                value={reviewComment}
                onChange={(e) => setReviewComment(e.target.value)}
                className="text-sm resize-none"
                rows={3}
                data-testid="input-review-comment"
              />
              <Button
                size="sm"
                onClick={() => submitReview.mutate()}
                disabled={submitReview.isPending || !reviewComment.trim()}
                data-testid="button-submit-review"
              >
                {submitReview.isPending ? "Submitting..." : "Submit Review"}
              </Button>
            </div>
          )}

          {reviews.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4" data-testid="text-no-reviews">No reviews yet</p>
          ) : (
            <div className="space-y-3">
              {reviews.map((review) => (
                <div key={review.id} className="border-t border-gray-100 pt-3" data-testid={`review-${review.id}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback className="text-[10px]">
                        {(review.name || review.username || "U").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium text-gray-700">{review.name || review.username || "User"}</span>
                    <div className="flex items-center gap-0.5 ml-auto">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3 w-3 ${i < review.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"}`}
                        />
                      ))}
                    </div>
                  </div>
                  {review.title && <p className="text-sm font-medium text-gray-800">{review.title}</p>}
                  {review.comment && <p className="text-xs text-gray-600 mt-0.5">{review.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {relatedProducts.length > 0 && (
          <div>
            <h3 className="text-base font-semibold text-gray-800 mb-3">Related Products</h3>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
              {relatedProducts.map((p) => {
                const pPrice = parseFloat(p.price);
                const pOrig = parseFloat(p.originalPrice);
                const pRating = parseFloat(p.rating || "0");
                const pImg = (p.images as string[])?.[0];
                return (
                  <Card
                    key={p.id}
                    className="flex-shrink-0 w-36 overflow-hidden cursor-pointer border-gray-100"
                    onClick={() => setLocation(`/ecommerce/product/${p.id}`)}
                    data-testid={`card-related-${p.id}`}
                  >
                    <div className="aspect-square bg-gray-50 p-2">
                      {pImg ? (
                        <img src={pImg} alt={p.name} className="w-full h-full object-contain" loading="lazy" />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-md" />
                      )}
                    </div>
                    <div className="p-2">
                      <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight mb-1">{p.name}</p>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-sm font-bold text-gray-900">₹{pPrice.toFixed(0)}</span>
                        {p.discountPercent && p.discountPercent > 0 && (
                          <span className="text-[10px] text-gray-400 line-through">₹{pOrig.toFixed(0)}</span>
                        )}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

