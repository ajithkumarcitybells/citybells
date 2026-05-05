import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, ChevronRight, Star, ShoppingBag, Zap, TrendingUp, Award, Timer, Tag } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { EcomCategory, EcomProduct } from "@shared/schema";

function HeroBanner() {
  const slides = [
    {
      title: "MEGA SALE",
      subtitle: "Up to 70% Off on Electronics",
      bg: "from-indigo-600 to-purple-700",
    },
    {
      title: "NEW ARRIVALS",
      subtitle: "Latest Fashion Collection",
      bg: "from-rose-500 to-pink-600",
    },
    {
      title: "HOME ESSENTIALS",
      subtitle: "Transform Your Living Space",
      bg: "from-emerald-500 to-teal-600",
    },
  ];

  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((p) => (p + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="relative overflow-hidden" data-testid="ecom-hero-banner">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className={`min-w-full aspect-[2.5/1] bg-gradient-to-r ${s.bg} flex flex-col justify-center px-6`}
          >
            <span className="text-xs font-semibold text-white/80 mb-1">CITY BELL E-COMMERCE</span>
            <h2 className="text-2xl font-bold text-white mb-1">{s.title}</h2>
            <p className="text-sm text-white/90">{s.subtitle}</p>
            <Link href="/ecommerce/products">
              <Button size="sm" className="mt-3 bg-white text-gray-900 border-white" data-testid="button-shop-now">
                Shop Now
              </Button>
            </Link>
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`w-2 h-2 rounded-full transition-colors ${i === current ? "bg-white" : "bg-white/40"}`}
              data-testid={`button-hero-dot-${i}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryStrip({ categories }: { categories: EcomCategory[] }) {
  const [, setLocation] = useLocation();

  return (
    <div className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide" data-testid="category-strip">
      <div
        onClick={() => setLocation("/ecommerce/products")}
        className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
        data-testid="category-strip-all"
      >
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center border border-gray-200 dark:border-gray-700">
          <ShoppingBag className="h-6 w-6 text-indigo-500" />
        </div>
        <span className="text-[10px] font-medium text-foreground/70 text-center leading-tight w-14 line-clamp-2">All</span>
      </div>
      {categories.filter(c => c.isActive).map((cat) => (
        <div
          key={cat.id}
          onClick={() => setLocation(`/ecommerce/products?category=${cat.id}`)}
          className="flex flex-col items-center gap-1 flex-shrink-0 cursor-pointer"
          data-testid={`category-strip-${cat.id}`}
        >
          <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
            {cat.image ? (
              <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-indigo-400" />
              </div>
            )}
          </div>
          <span className="text-[10px] font-medium text-foreground/70 text-center leading-tight w-14 line-clamp-2">{cat.name}</span>
        </div>
      ))}
    </div>
  );
}

function PromotionalDeals() {
  const deals = [
    {
      title: "From ₹1,799",
      subtitle: "Top Electronics Deals",
      gradient: "from-blue-500 to-blue-700",
      icon: Tag,
    },
    {
      title: "Up to 40% Off!",
      subtitle: "Fashion & Lifestyle",
      gradient: "from-orange-500 to-red-500",
      icon: Zap,
    },
    {
      title: "Free 75 Min Delivery",
      subtitle: "On Instant Items",
      gradient: "from-green-500 to-emerald-600",
      icon: Timer,
    },
  ];

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide" data-testid="promotional-deals">
      {deals.map((deal, i) => (
        <Link key={i} href="/ecommerce/products?sort=discount">
          <div
            className={`flex-shrink-0 w-44 rounded-md bg-gradient-to-r ${deal.gradient} p-3 cursor-pointer`}
            data-testid={`card-deal-${i}`}
          >
            <deal.icon className="h-5 w-5 text-white/80 mb-1.5" />
            <p className="text-sm font-bold text-white leading-tight">{deal.title}</p>
            <p className="text-[11px] text-white/80 mt-0.5">{deal.subtitle}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}

function InstantDeliverySection({ products }: { products: EcomProduct[] }) {
  const [, setLocation] = useLocation();

  if (products.length === 0) return null;

  return (
    <div data-testid="instant-delivery-section">
      <div className="flex items-center justify-between mb-3 px-4">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-green-500 text-white px-2 py-0.5 rounded-md">
            <Zap className="h-3.5 w-3.5" />
            <span className="text-xs font-bold">INSTANT</span>
          </div>
          <h2 className="text-base font-semibold text-foreground" data-testid="text-instant-delivery-heading">Instant Delivery</h2>
        </div>
        <Link href="/ecommerce/products?instant=true" className="text-sm font-medium text-primary flex items-center gap-0.5" data-testid="link-instant-see-all">
          See All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {products.map((p) => (
          <ProductHorizontalCard key={p.id} product={p} showInstantBadge />
        ))}
      </div>
    </div>
  );
}

function CategoryGrid({ categories }: { categories: EcomCategory[] }) {
  const [, setLocation] = useLocation();

  if (categories.length === 0) return null;

  return (
    <div className="px-4">
      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
        <h2 className="text-base font-semibold text-foreground" data-testid="text-categories-heading">Shop by Category</h2>
        <Link href="/ecommerce/products" className="text-sm font-medium text-primary flex items-center gap-0.5" data-testid="link-view-all-categories">
          View All <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-4 gap-3">
        {categories.slice(0, 8).map((cat) => (
          <div
            key={cat.id}
            onClick={() => setLocation(`/ecommerce/products?category=${cat.id}`)}
            className="flex flex-col items-center gap-1.5 cursor-pointer"
            data-testid={`card-ecom-category-${cat.id}`}
          >
            <div className="w-full aspect-square rounded-full overflow-hidden bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-indigo-400" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-foreground/70 text-center leading-tight line-clamp-2">{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductHorizontalCard({ product, showInstantBadge }: { product: EcomProduct; showInstantBadge?: boolean }) {
  const [, setLocation] = useLocation();
  const price = parseFloat(product.price);
  const origPrice = parseFloat(product.originalPrice);
  const rating = parseFloat(product.rating || "0");
  const firstImage = (product.images as string[])?.[0];

  return (
    <Card
      className="flex-shrink-0 w-40 overflow-hidden cursor-pointer"
      onClick={() => setLocation(`/ecommerce/product/${product.id}`)}
      data-testid={`card-ecom-product-${product.id}`}
    >
      <div className="aspect-square bg-gray-50 dark:bg-gray-800 p-2 relative">
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 rounded-md" />
        )}
        {product.discountPercent && product.discountPercent > 0 && (
          <Badge variant="destructive" className="absolute top-1 left-1 text-[10px] px-1.5 py-0" data-testid={`badge-discount-${product.id}`}>
            {product.discountPercent}% OFF
          </Badge>
        )}
        {showInstantBadge && (
          <div className="absolute bottom-1 right-1 bg-gradient-to-r from-yellow-400 to-green-500 text-white rounded-md px-1.5 py-0.5 flex items-center gap-0.5">
            <Zap className="h-2.5 w-2.5" />
            <span className="text-[9px] font-bold">INSTANT</span>
          </div>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-foreground line-clamp-2 leading-tight mb-1" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
        {rating > 0 && (
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] text-muted-foreground">{rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-sm font-bold text-foreground" data-testid={`text-price-${product.id}`}>₹{price.toFixed(0)}</span>
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="text-[10px] text-muted-foreground line-through">₹{origPrice.toFixed(0)}</span>
          )}
        </div>
      </div>
    </Card>
  );
}

function ProductSection({
  title,
  icon: Icon,
  products,
  linkHref,
  linkText = "See All",
}: {
  title: string;
  icon: typeof Zap;
  products: EcomProduct[];
  linkHref: string;
  linkText?: string;
}) {
  if (products.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between gap-2 mb-3 px-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
        </div>
        <Link href={linkHref} className="text-sm font-medium text-primary flex items-center gap-0.5" data-testid={`link-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {linkText} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 px-4 scrollbar-hide">
        {products.map((p) => (
          <ProductHorizontalCard key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}

export default function EcomHomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [, setLocation] = useLocation();

  const { data: categories = [], isLoading: catLoading } = useQuery<EcomCategory[]>({
    queryKey: ["/api/ecom/categories"],
  });

  const { data: allProducts = [], isLoading: prodLoading } = useQuery<EcomProduct[]>({
    queryKey: ["/api/ecom/products"],
  });

  const { data: trending = [], isLoading: trendingLoading } = useQuery<EcomProduct[]>({
    queryKey: ['/api/trending', 'ecom', 1, 12],
    queryFn: async () => {
      const res = await fetch('/api/trending?page=1&limit=12&service=ecom');
      if (!res.ok) throw new Error('Failed to fetch trending');
      return res.json();
    }
  });

  const activeProducts = allProducts.filter((p) => p.isActive && p.isApproved);
  const featuredProducts = allProducts.filter((p) => p.isFeatured && p.isActive && p.isApproved);
  const instantProducts = allProducts.filter((p) => p.isInstantDelivery && p.isActive && p.isApproved);
  const dealProducts = activeProducts
    .filter((p) => (p.discountPercent || 0) > 0)
    .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
    .slice(0, 10);
  const topRated = activeProducts
    .filter((p) => parseFloat(p.rating || "0") > 0)
    .sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"))
    .slice(0, 10);
  const newest = activeProducts.slice(0, 10);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/ecommerce/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <Header />

      <main className="max-w-lg mx-auto space-y-4">
        <div className="px-4 pt-3">
          <form onSubmit={handleSearch} className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products, brands..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              data-testid="input-ecom-search"
            />
          </form>
        </div>

        {catLoading ? (
          <div className="flex gap-4 overflow-x-auto pb-2 px-4">
            {Array(6).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
                <Skeleton className="w-14 h-14 rounded-full" />
                <Skeleton className="w-10 h-3" />
              </div>
            ))}
          </div>
        ) : (
          <CategoryStrip categories={categories} />
        )}

        <HeroBanner />

        <PromotionalDeals />

        {prodLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 px-4">
            {Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex-shrink-0 w-40">
                <Skeleton className="aspect-square rounded-t-md" />
                <div className="p-2 space-y-1">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            <InstantDeliverySection products={instantProducts} />

            {catLoading ? null : <CategoryGrid categories={categories} />}

            <ProductSection
              title="Deal of the Day"
              icon={Zap}
              products={dealProducts}
              linkHref="/ecommerce/products?sort=discount"
            />

            <ProductSection
              title="Trending Now"
              icon={TrendingUp}
              products={trending.length > 0 ? trending : (featuredProducts.length > 0 ? featuredProducts : newest)}
              linkHref="/ecommerce/products?sort=newest"
            />

            <ProductSection
              title="Top Rated"
              icon={Award}
              products={topRated}
              linkHref="/ecommerce/products?sort=rating"
            />
          </>
        )}
      </main>

      <BottomNav />
    </div>
  );
}
