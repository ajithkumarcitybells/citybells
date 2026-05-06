import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Search, ListFilter } from "lucide-react";
import { Link } from "wouter";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { BannerSlider } from "@/components/BannerSlider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Category, Product, Banner, CategoryAd } from "@shared/schema";
import { FastDeliveryFilterChip, FastDeliveryProductRail, isFastDeliveryProduct } from "@/components/FastDelivery";
import { EarlyAccessProductsRail, SubscriberDealBadge } from "@/components/GrocerySubscription";
import { useAuth } from "@/hooks/use-auth";

export default function GroceryPage() {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [quickOnly, setQuickOnly] = useState(false);

  useEffect(() => {
    const syncCategory = () => {
      const params = new URLSearchParams(window.location.search);
      setSelectedCategory(params.get('category'));
    };
    syncCategory();

    window.addEventListener('popstate', syncCategory);
    const origPushState = history.pushState.bind(history);
    const origReplaceState = history.replaceState.bind(history);
    history.pushState = (...args: Parameters<typeof history.pushState>) => {
      origPushState(...args);
      syncCategory();
    };
    history.replaceState = (...args: Parameters<typeof history.replaceState>) => {
      origReplaceState(...args);
      syncCategory();
    };
    return () => {
      window.removeEventListener('popstate', syncCategory);
      history.pushState = origPushState;
      history.replaceState = origReplaceState;
    };
  }, []);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: fastDeliveryProducts = [], isLoading: fastDeliveryLoading } = useQuery<Product[]>({
    queryKey: ["/api/products?fastDelivery=true"],
  });

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
  });
  const { data: membership } = useQuery<any>({
    queryKey: ["/api/grocery/subscription/me"],
    enabled: !!user,
  });

  const { data: trending = [], isLoading: trendingLoading } = useQuery<any[]>({
    queryKey: ['/api/trending', 'grocery', 1, 12],
    queryFn: async () => {
      const res = await fetch('/api/trending?page=1&limit=12&service=grocery');
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    }
  });

  const categoryAdsUrl = selectedCategory 
    ? `/api/category-ads?category=${selectedCategory}`
    : `/api/category-ads`;
  const { data: categoryAds = [], isLoading: adsLoading } = useQuery<CategoryAd[]>({
    queryKey: [categoryAdsUrl],
  });

  const filteredProducts = useMemo(() => {
    let result = [...products];
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    if (selectedCategory) {
      result = result.filter(p => p.categoryId === selectedCategory);
    }

    if (quickOnly) {
      result = result.filter(p => isFastDeliveryProduct(p));
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
    }
    
    return result;
  }, [products, searchQuery, selectedCategory, quickOnly, sortBy]);

  const displayCategories = showAllCategories ? categories : categories.slice(0, 4);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-800">Shop by category</h2>
          <button 
            onClick={() => setShowAllCategories(!showAllCategories)}
            className="text-sm font-medium text-primary"
            data-testid="button-show-more-categories"
          >
            {showAllCategories ? "Show less" : "Show more"}
          </button>
        </div>
        
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
          {categoriesLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 flex-shrink-0" style={{ width: 'calc(33.333% - 8px)' }}>
                <Skeleton className="w-full aspect-square rounded-lg" />
                <Skeleton className="w-16 h-3" />
              </div>
            ))
          ) : (
            displayCategories.map((category) => (
              <div key={category.id} className="flex-shrink-0" style={{ width: 'calc(33.333% - 8px)' }}>
                <CategoryCard category={category} />
              </div>
            ))
          )}
        </div>

        <BannerSlider banners={banners} />

        <Link href="/grocery/subscription">
          <div className="rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 p-4 text-white shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-sm font-semibold"><Crown className="h-4 w-4" /> Grocery Membership</p>
                <p className="mt-1 text-xs text-white/90">{membership?.active ? "Free delivery, priority orders, and subscriber deals are active." : "Unlock free delivery, rewards, recurring essentials, and early access."}</p>
              </div>
              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">{membership?.active ? "Active" : "View plans"}</span>
            </div>
          </div>
        </Link>

        <FastDeliveryProductRail products={fastDeliveryProducts} isLoading={fastDeliveryLoading} />
        {membership?.active && <EarlyAccessProductsRail products={products} />}

        {/* Trending section scoped to Grocery */}
        <section className="mb-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-gray-800">Trending in Grocery</h2>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
            {trendingLoading ? (
              Array(6).fill(0).map((_, i) => (
                <div key={i} className="flex-shrink-0 w-44">
                  <Skeleton className="aspect-square rounded-xl" />
                  <Skeleton className="h-3 w-32 mt-2" />
                </div>
              ))
            ) : (
              (trending || []).map((p) => (
                <div key={p.id} className="flex-shrink-0 w-44 snap-start">
                  <ProductCard product={p} />
                </div>
              ))
            )}
          </div>
        </section>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white border-gray-200"
              data-testid="input-search"
            />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon" className="bg-primary text-white hover:bg-primary/90 border-0" data-testid="button-filter">
                <ListFilter className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem 
                onClick={() => setSortBy("default")}
                className={sortBy === "default" ? "bg-primary/10" : ""}
                data-testid="filter-default"
              >
                Default
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortBy("price-low")}
                className={sortBy === "price-low" ? "bg-primary/10" : ""}
                data-testid="filter-price-low"
              >
                Price: Low to High
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortBy("price-high")}
                className={sortBy === "price-high" ? "bg-primary/10" : ""}
                data-testid="filter-price-high"
              >
                Price: High to Low
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => setSortBy("rating")}
                className={sortBy === "rating" ? "bg-primary/10" : ""}
                data-testid="filter-popularity"
              >
                Popularity
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <FastDeliveryFilterChip active={quickOnly} onClick={() => setQuickOnly(v => !v)} />
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
              !selectedCategory 
                ? 'bg-primary text-white' 
                : 'bg-white text-gray-700 border border-gray-200'
            }`}
            data-testid="button-filter-all"
          >
            All Items
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(
                selectedCategory === category.id ? null : category.id
              )}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                selectedCategory === category.id 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-700 border border-gray-200'
              }`}
              data-testid={`button-filter-${category.id}`}
            >
              {category.name}
            </button>
          ))}
        </div>

        {adsLoading ? (
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4">
            {Array(3).fill(0).map((_, i) => (
              <Skeleton key={i} className="flex-shrink-0 w-44 h-24 rounded-lg" />
            ))}
          </div>
        ) : categoryAds.length > 0 ? (
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide" data-testid="category-ads-section">
            {categoryAds.map((ad) => (
              <a
                key={ad.id}
                href={ad.linkUrl || "#"}
                target={ad.linkUrl ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="flex-shrink-0 w-44 rounded-lg overflow-hidden border border-gray-100 shadow-sm bg-white snap-start"
                data-testid={`ad-box-${ad.id}`}
              >
                {ad.image ? (
                  <img
                    src={ad.image}
                    alt={ad.title}
                    className="w-full h-24 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-24 bg-gradient-to-r from-green-100 to-yellow-100 flex items-center justify-center p-2">
                    <span className="text-xs font-semibold text-green-800 text-center">{ad.title}</span>
                  </div>
                )}
              </a>
            ))}
          </div>
        ) : null}

        {productsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                <Skeleton className="aspect-square" />
                <div className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-8 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {quickOnly ? "No 10-minute products available near you." : "No products found"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="space-y-1">
                {(product as any).subscriberDeal && <SubscriberDealBadge discount={(product as any).subscriberDiscountPercent} />}
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
