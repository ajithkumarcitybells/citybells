import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, SlidersHorizontal, Grid3X3, List, Star, Heart, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar } from "@/components/ui/avatar";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import type { EcomCategory, EcomProduct } from "@shared/schema";

const ITEMS_PER_PAGE = 12;

export default function EcomProductsPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [minRating, setMinRating] = useState(0);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [filterOpen, setFilterOpen] = useState(false);
  const [instantOnly, setInstantOnly] = useState(false);
  const [compareSelection, setCompareSelection] = useState<string[]>([]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cat = params.get("category");
    const search = params.get("search");
    const sort = params.get("sort");
    const instant = params.get("instant");
    if (cat) setSelectedCategories([cat]);
    if (search) setSearchQuery(search);
    if (sort) setSortBy(sort);
    if (instant === "true") setInstantOnly(true);
  }, []);

  const { data: categories = [] } = useQuery<EcomCategory[]>({
    queryKey: ["/api/ecom/categories"],
  });

  const { data: products = [], isLoading } = useQuery<EcomProduct[]>({
    queryKey: ["/api/ecom/products"],
  });

  const { data: wishlistItems = [] } = useQuery<{ productId: string }[]>({
    queryKey: ["/api/ecom/wishlist"],
    enabled: !!user,
  });

  const toggleWishlist = useMutation({
    mutationFn: async (productId: string) => {
      const inWishlist = wishlistItems.some((w) => w.productId === productId);
      if (inWishlist) {
        await apiRequest("DELETE", `/api/ecom/wishlist/${productId}`);
      } else {
        await apiRequest("POST", "/api/ecom/wishlist", { productId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/wishlist"] });
    },
    onError: () => {
      if (!user) {
        setLocation("/auth");
        toast({ title: "Please login", description: "Login to manage your wishlist.", variant: "destructive" });
      }
    },
  });

  const addToCart = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("POST", "/api/ecom/cart", { productId, quantity: 1 });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/cart"] });
      toast({ title: "Added to cart", description: "Item added to your cart." });
    },
    onError: () => {
      if (!user) {
        setLocation("/auth");
        toast({ title: "Please login", description: "Login to add items to cart.", variant: "destructive" });
      }
    },
  });

  const brands = useMemo(() => {
    const brandSet = new Set<string>();
    products.forEach((p) => {
      if (p.brand) brandSet.add(p.brand);
    });
    return Array.from(brandSet).sort();
  }, [products]);

  const filteredProducts = useMemo(() => {
    let result = products.filter((p) => p.isActive && p.isApproved);

    if (instantOnly) {
      result = result.filter((p) => p.isInstantDelivery);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description?.toLowerCase().includes(q) ||
          p.brand?.toLowerCase().includes(q)
      );
    }

    if (selectedCategories.length > 0) {
      result = result.filter((p) => p.categoryId && selectedCategories.includes(p.categoryId));
    }

    result = result.filter((p) => {
      const price = parseFloat(p.price);
      return price >= priceRange[0] && price <= priceRange[1];
    });

    if (minRating > 0) {
      result = result.filter((p) => parseFloat(p.rating || "0") >= minRating);
    }

    switch (sortBy) {
      case "price-low":
        result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
        break;
      case "price-high":
        result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
        break;
      case "rating":
        result.sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"));
        break;
      case "newest":
        result.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
        break;
      case "discount":
        result.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
        break;
    }

    return result;
  }, [products, searchQuery, selectedCategories, priceRange, minRating, sortBy, instantOnly]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = filteredProducts.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategories, priceRange, minRating, sortBy]);

  const toggleCategory = (catId: string) => {
    setSelectedCategories((prev) =>
      prev.includes(catId) ? prev.filter((c) => c !== catId) : [...prev, catId]
    );
  };

  const clearFilters = () => {
    setSelectedCategories([]);
    setPriceRange([0, 100000]);
    setMinRating(0);
    setSearchQuery("");
    setSortBy("default");
  };

  const activeFilterCount = selectedCategories.length + (minRating > 0 ? 1 : 0) + (priceRange[0] > 0 || priceRange[1] < 100000 ? 1 : 0);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
              data-testid="input-ecom-product-search"
            />
          </div>
          <Sheet open={filterOpen} onOpenChange={setFilterOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="relative" data-testid="button-filters">
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-white text-[9px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="space-y-6 mt-4">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Categories</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {categories.map((cat) => (
                      <div key={cat.id} className="flex items-center gap-2">
                        <Checkbox
                          id={`cat-${cat.id}`}
                          checked={selectedCategories.includes(cat.id)}
                          onCheckedChange={() => toggleCategory(cat.id)}
                          data-testid={`checkbox-category-${cat.id}`}
                        />
                        <Label htmlFor={`cat-${cat.id}`} className="text-sm text-gray-700 cursor-pointer">{cat.name}</Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Price Range</h3>
                  <div className="px-1">
                    <Slider
                      value={priceRange}
                      onValueChange={(v) => setPriceRange(v as [number, number])}
                      min={0}
                      max={100000}
                      step={100}
                      data-testid="slider-price-range"
                    />
                    <div className="flex justify-between mt-1 text-xs text-gray-500">
                      <span>₹{priceRange[0].toLocaleString()}</span>
                      <span>₹{priceRange[1].toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-800 mb-2">Minimum Rating</h3>
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map((r) => (
                      <Button
                        key={r}
                        variant={minRating === r ? "default" : "outline"}
                        size="sm"
                        onClick={() => setMinRating(r)}
                        data-testid={`button-rating-${r}`}
                      >
                        {r === 0 ? "All" : `${r}+`}
                        {r > 0 && <Star className="h-3 w-3 ml-0.5 fill-current" />}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearFilters} className="flex-1" data-testid="button-clear-filters">
                    Clear All
                  </Button>
                  <Button onClick={() => setFilterOpen(false)} className="flex-1" data-testid="button-apply-filters">
                    Apply
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-40 bg-white" data-testid="select-sort">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Relevance</SelectItem>
                <SelectItem value="price-low">Price: Low to High</SelectItem>
                <SelectItem value="price-high">Price: High to Low</SelectItem>
                <SelectItem value="rating">Top Rated</SelectItem>
                <SelectItem value="newest">Newest</SelectItem>
                <SelectItem value="discount">Biggest Discount</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-xs text-gray-500 whitespace-nowrap" data-testid="text-result-count">
              {filteredProducts.length} results
            </span>
          </div>
          <div className="flex gap-1">
            <Button
              variant={viewMode === "grid" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("grid")}
              data-testid="button-grid-view"
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "outline"}
              size="icon"
              onClick={() => setViewMode("list")}
              data-testid="button-list-view"
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {selectedCategories.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {selectedCategories.map((catId) => {
              const cat = categories.find((c) => c.id === catId);
              return (
                <Badge key={catId} variant="secondary" className="gap-1" data-testid={`badge-filter-${catId}`}>
                  {cat?.name || catId}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => toggleCategory(catId)} />
                </Badge>
              );
            })}
            <button onClick={clearFilters} className="text-xs text-primary font-medium" data-testid="button-clear-all-filters">
              Clear all
            </button>
          </div>
        )}

        {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-2 gap-3" : "space-y-3"}>
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : paginatedProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-2" data-testid="text-no-results">No products found</p>
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-search">Clear filters</Button>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-2 gap-3">
            {paginatedProducts.map((product) => (
              <GridProductCard
                key={product.id}
                product={product}
                isInWishlist={wishlistItems.some((w) => w.productId === product.id)}
                onToggleWishlist={() => toggleWishlist.mutate(product.id)}
                onAddToCart={() => addToCart.mutate(product.id)}
                onNavigate={() => setLocation(`/ecommerce/product/${product.id}`)}
                compareSelected={compareSelection.includes(product.id)}
                onToggleCompare={() => {
                  setCompareSelection((prev) => {
                    const exists = prev.includes(product.id);
                    if (exists) return prev.filter((p) => p !== product.id);
                    if (prev.length >= 2) {
                      toast({ title: "Compare limit", description: "You can compare up to 2 products." });
                      return prev;
                    }
                    return [...prev, product.id];
                  });
                }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {paginatedProducts.map((product) => (
              <ListProductCard
                key={product.id}
                product={product}
                isInWishlist={wishlistItems.some((w) => w.productId === product.id)}
                onToggleWishlist={() => toggleWishlist.mutate(product.id)}
                onAddToCart={() => addToCart.mutate(product.id)}
                onNavigate={() => setLocation(`/ecommerce/product/${product.id}`)}
                compareSelected={compareSelection.includes(product.id)}
                onToggleCompare={() => {
                  setCompareSelection((prev) => {
                    const exists = prev.includes(product.id);
                    if (exists) return prev.filter((p) => p !== product.id);
                    if (prev.length >= 2) {
                      toast({ title: "Compare limit", description: "You can compare up to 2 products." });
                      return prev;
                    }
                    return [...prev, product.id];
                  });
                }}
              />
            ))}
          </div>
        )}

        {/* Floating compare bar */}
        {compareSelection.length > 0 && (
          <div className="fixed left-1/2 transform -translate-x-1/2 bottom-20 w-full max-w-lg px-4">
            <div className="bg-white shadow-lg rounded-xl border border-gray-100 p-3 flex items-center gap-3">
              <div className="flex items-center gap-2 flex-1">
                {compareSelection.map((id) => {
                  const p = products.find((x) => x.id === id);
                  return (
                    <div key={id} className="flex items-center gap-2 bg-gray-50 rounded-md px-2 py-1">
                      <Avatar className="h-8 w-8 bg-white">
                        <img src={(p?.images as string[])?.[0] || ""} alt={p?.name || ""} />
                      </Avatar>
                      <div className="text-xs">
                        <div className="font-medium line-clamp-1">{p?.name}</div>
                        <div className="text-[11px] text-gray-500">₹{p ? parseFloat(p.price).toFixed(0) : ""}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setCompareSelection([])}
                  data-testid="button-clear-compare"
                >
                  Clear
                </Button>
                <Button
                  onClick={() => {
                    // persist compare list and navigate
                    try { localStorage.setItem("compareProducts", JSON.stringify(compareSelection)); } catch {}
                    if (compareSelection.length === 1) {
                      setLocation(`/compare?ids=${compareSelection[0]}`);
                    } else {
                      setLocation(`/compare?ids=${compareSelection.join(",")}`);
                    }
                  }}
                  disabled={compareSelection.length === 0}
                  data-testid="button-compare-now"
                >
                  Compare ({compareSelection.length}/2)
                </Button>
              </div>
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-4">
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => p - 1)}
              data-testid="button-prev-page"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm text-gray-600" data-testid="text-page-info">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => p + 1)}
              data-testid="button-next-page"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function GridProductCard({
  product,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onNavigate,
  compareSelected,
  onToggleCompare,
}: {
  product: EcomProduct;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
  onNavigate: () => void;
  compareSelected?: boolean;
  onToggleCompare?: () => void;
}) {
  const price = parseFloat(product.price);
  const origPrice = parseFloat(product.originalPrice);
  const rating = parseFloat(product.rating || "0");
  const firstImage = (product.images as string[])?.[0];

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm flex flex-col h-full" data-testid={`card-ecom-product-${product.id}`}>
      <div className="relative aspect-square p-2 cursor-pointer bg-white" onClick={onNavigate}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare && onToggleCompare(); }}
          className="absolute top-2 left-2 p-1.5 bg-white rounded-full shadow-md z-10 hover-elevate active-elevate-2"
          data-testid={`button-compare-toggle-${product.id}`}
          aria-pressed={compareSelected}
        >
          <Checkbox checked={!!compareSelected} onCheckedChange={onToggleCompare} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleWishlist(); }}
          className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md z-10 hover-elevate active-elevate-2"
          data-testid={`button-wishlist-${product.id}`}
        >
          <Heart className={`h-4 w-4 ${isInWishlist ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
        </button>
        {product.discountPercent && product.discountPercent > 0 && (
          <Badge variant="destructive" className="absolute top-2 left-2 text-[10px] px-1.5 py-0 z-10">
            {product.discountPercent}% OFF
          </Badge>
        )}
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg" />
        )}
      </div>
      <div className="p-3 flex flex-col flex-1">
        <h3 className="font-medium text-sm text-gray-800 line-clamp-2 leading-tight mb-1 cursor-pointer" onClick={onNavigate} data-testid={`text-name-${product.id}`}>
          {product.name}
        </h3>
        {product.brand && (
          <span className="text-[10px] text-gray-400 mb-1">{product.brand}</span>
        )}
        <div className="flex items-center gap-1 mb-1">
          {rating > 0 && (
            <div className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
              {product.reviewCount && product.reviewCount > 0 && (
                <span className="text-[10px] text-gray-400">({product.reviewCount})</span>
              )}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <span className="text-lg font-bold text-gray-900">₹{price.toFixed(0)}</span>
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="text-sm text-gray-400 line-through">₹{origPrice.toFixed(0)}</span>
          )}
        </div>
        <div className="mt-auto" />
        <Button onClick={onAddToCart} className="w-full" size="sm" data-testid={`button-add-cart-${product.id}`}>
          Add to Cart
        </Button>
      </div>
    </div>
  );
}

function ListProductCard({
  product,
  isInWishlist,
  onToggleWishlist,
  onAddToCart,
  onNavigate,
  compareSelected,
  onToggleCompare,
}: {
  product: EcomProduct;
  isInWishlist: boolean;
  onToggleWishlist: () => void;
  onAddToCart: () => void;
  onNavigate: () => void;
  compareSelected?: boolean;
  onToggleCompare?: () => void;
}) {
  const price = parseFloat(product.price);
  const origPrice = parseFloat(product.originalPrice);
  const rating = parseFloat(product.rating || "0");
  const firstImage = (product.images as string[])?.[0];

  return (
    <Card className="flex overflow-hidden border-gray-100" data-testid={`card-ecom-product-list-${product.id}`}>
      <div className="w-28 flex-shrink-0 aspect-square bg-gray-50 p-2 cursor-pointer relative" onClick={onNavigate}>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleCompare && onToggleCompare(); }}
          className="absolute top-1 left-1 p-1 bg-white rounded-full shadow z-10"
          data-testid={`button-compare-toggle-list-${product.id}`}
          aria-pressed={compareSelected}
        >
          <Checkbox checked={!!compareSelected} onCheckedChange={onToggleCompare} />
        </button>
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-md" />
        )}
        {product.discountPercent && product.discountPercent > 0 && (
          <Badge variant="destructive" className="absolute top-1 left-1 text-[9px] px-1 py-0">
            {product.discountPercent}%
          </Badge>
        )}
      </div>
      <div className="flex-1 p-3 flex flex-col min-w-0">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-medium text-sm text-gray-800 line-clamp-2 leading-tight cursor-pointer flex-1" onClick={onNavigate}>
            {product.name}
          </h3>
          <button onClick={onToggleWishlist} className="flex-shrink-0 p-1" data-testid={`button-wishlist-list-${product.id}`}>
            <Heart className={`h-4 w-4 ${isInWishlist ? "fill-red-500 text-red-500" : "text-gray-400"}`} />
          </button>
        </div>
        {product.brand && <span className="text-[10px] text-gray-400">{product.brand}</span>}
        {rating > 0 && (
          <div className="flex items-center gap-0.5 mt-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-gray-600">{rating.toFixed(1)}</span>
            {product.reviewCount && product.reviewCount > 0 && (
              <span className="text-[10px] text-gray-400">({product.reviewCount})</span>
            )}
          </div>
        )}
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className="text-base font-bold text-gray-900">₹{price.toFixed(0)}</span>
          {product.discountPercent && product.discountPercent > 0 && (
            <>
              <span className="text-xs text-gray-400 line-through">₹{origPrice.toFixed(0)}</span>
              <span className="text-xs text-green-600 font-medium">{product.discountPercent}% off</span>
            </>
          )}
        </div>
        <div className="mt-auto pt-2">
          <Button onClick={onAddToCart} size="sm" data-testid={`button-add-cart-list-${product.id}`}>
            Add to Cart
          </Button>
        </div>
      </div>
    </Card>
  );
}
