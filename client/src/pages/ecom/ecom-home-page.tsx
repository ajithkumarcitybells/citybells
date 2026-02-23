import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Search, ChevronRight, Star, ShoppingBag, Zap, TrendingUp, Award } from "lucide-react";
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
    <div className="relative rounded-2xl overflow-hidden" data-testid="ecom-hero-banner">
      <div
        className="flex transition-transform duration-500 ease-out"
        style={{ transform: `translateX(-${current * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div
            key={i}
            className={`min-w-full aspect-[2/1] bg-gradient-to-r ${s.bg} flex flex-col justify-center px-6`}
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

function CategoryGrid({ categories }: { categories: EcomCategory[] }) {
  const [, setLocation] = useLocation();

  if (categories.length === 0) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-gray-800" data-testid="text-categories-heading">Shop by Category</h2>
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
            <div className="w-full aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-100">
              {cat.image ? (
                <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" loading="lazy" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                  <ShoppingBag className="h-6 w-6 text-indigo-400" />
                </div>
              )}
            </div>
            <span className="text-[11px] font-medium text-gray-700 text-center leading-tight line-clamp-2">{cat.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductHorizontalCard({ product }: { product: EcomProduct }) {
  const [, setLocation] = useLocation();
  const price = parseFloat(product.price);
  const origPrice = parseFloat(product.originalPrice);
  const rating = parseFloat(product.rating || "0");
  const firstImage = (product.images as string[])?.[0];

  return (
    <Card
      className="flex-shrink-0 w-40 overflow-hidden cursor-pointer border-gray-100"
      onClick={() => setLocation(`/ecommerce/product/${product.id}`)}
      data-testid={`card-ecom-product-${product.id}`}
    >
      <div className="aspect-square bg-gray-50 p-2 relative">
        {firstImage ? (
          <img src={firstImage} alt={product.name} className="w-full h-full object-contain" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 rounded-md" />
        )}
        {product.discountPercent && product.discountPercent > 0 && (
          <Badge variant="destructive" className="absolute top-1 left-1 text-[10px] px-1.5 py-0" data-testid={`badge-discount-${product.id}`}>
            {product.discountPercent}% OFF
          </Badge>
        )}
      </div>
      <div className="p-2">
        <p className="text-xs font-medium text-gray-800 line-clamp-2 leading-tight mb-1" data-testid={`text-product-name-${product.id}`}>{product.name}</p>
        {rating > 0 && (
          <div className="flex items-center gap-0.5 mb-1">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-[10px] text-gray-500">{rating.toFixed(1)}</span>
          </div>
        )}
        <div className="flex items-center gap-1 flex-wrap">
          <span className="text-sm font-bold text-gray-900" data-testid={`text-price-${product.id}`}>₹{price.toFixed(0)}</span>
          {product.discountPercent && product.discountPercent > 0 && (
            <span className="text-[10px] text-gray-400 line-through">₹{origPrice.toFixed(0)}</span>
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
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <h2 className="text-base font-semibold text-gray-800">{title}</h2>
        </div>
        <Link href={linkHref} className="text-sm font-medium text-primary flex items-center gap-0.5" data-testid={`link-${title.toLowerCase().replace(/\s+/g, "-")}`}>
          {linkText} <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
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

  const featuredProducts = allProducts.filter((p) => p.isFeatured && p.isActive && p.isApproved);
  const dealProducts = allProducts
    .filter((p) => p.isActive && p.isApproved && (p.discountPercent || 0) > 0)
    .sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0))
    .slice(0, 10);
  const topRated = allProducts
    .filter((p) => p.isActive && p.isApproved && parseFloat(p.rating || "0") > 0)
    .sort((a, b) => parseFloat(b.rating || "0") - parseFloat(a.rating || "0"))
    .slice(0, 10);
  const newest = allProducts
    .filter((p) => p.isActive && p.isApproved)
    .slice(0, 10);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/ecommerce/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-5">
        <form onSubmit={handleSearch} className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search products, brands..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white border-gray-200"
            data-testid="input-ecom-search"
          />
        </form>

        <HeroBanner />

        {catLoading ? (
          <div className="grid grid-cols-4 gap-3">
            {Array(8).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <Skeleton className="w-full aspect-square rounded-xl" />
                <Skeleton className="w-12 h-3" />
              </div>
            ))}
          </div>
        ) : (
          <CategoryGrid categories={categories} />
        )}

        {prodLoading ? (
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
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
            <ProductSection
              title="Deal of the Day"
              icon={Zap}
              products={dealProducts}
              linkHref="/ecommerce/products?sort=discount"
            />

            <ProductSection
              title="Trending Now"
              icon={TrendingUp}
              products={featuredProducts.length > 0 ? featuredProducts : newest}
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
