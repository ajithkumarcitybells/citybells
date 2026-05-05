import { useRef, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { ServiceCard } from "@/components/ServiceCard";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { Store, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import StickyCartBar from "@/components/StickyCartBar";
import { Link } from "wouter";
import { Category, Product } from "@shared/schema";
import RecommendationSections from "@/components/RecommendationSections";

const services = [
  {
    name: "Grocery",
    description: "FRESH & LOCAL DELIVERED FAST",
    image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&q=80",
    isActive: true,
    href: "/grocery",
    isLarge: true,
  },
  {
    name: "E-Commerce",
    description: "ESSENTIALS & ELEGANCE",
    image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800&q=80",
    isActive: true,
    href: "/ecommerce",
  },
  {
    name: "Food",
    description: "DELICIOUS MEALS DELIVERED",
    image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
    isActive: true,
    href: "/food",
  },
  {
    name: "City Move",
    description: "SHIFT ANYTHING ANYWHERE",
    image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800&q=80",
    isActive: true,
    href: "/moving",
  },
  {
    name: "Hotel",
    description: "BOOK YOUR STAY",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    isActive: true,
    href: "/hotels",
  },
  {
    name: "Taxi",
    description: "RIDE WITH COMFORT",
    image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=800&q=80",
    isActive: true,
    href: "/taxi",
  },
  {
    name: "City Serve",
    description: "HOME SERVICES AT YOUR DOORSTEP",
    image: "https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=800&q=80",
    isActive: true,
    href: "/services",
  },
];
export default function HomePage() {
  const servicesRef = useRef<HTMLDivElement | null>(null);
  const categoriesRef = useRef<HTMLDivElement | null>(null);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({ queryKey: ['/api/categories'] });
  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({ queryKey: ['/api/products'] });
  const { data: trending = [], isLoading: trendingLoading } = useQuery<Product[]>({ queryKey: ['/api/trending', 1, 12], queryFn: async () => {
    const res = await fetch('/api/trending?page=1&limit=12');
    if (!res.ok) throw new Error('Failed to fetch trending');
    return res.json();
  } });

  const loading = categoriesLoading || productsLoading;

  const productsByCategory = useMemo(() => {
    return categories.map((c) => ({
      category: c,
      items: products.filter(p => p.categoryId === c.id).slice(0, 12),
    })).filter(g => g.items.length > 0);
  }, [categories, products]);

  const scroll = (el: HTMLDivElement | null, dir: 'left' | 'right') => {
    if (!el) return;
    const amount = el.clientWidth * 0.7;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Header />

      <main className="px-4 py-4 max-w-5xl mx-auto">
        {/* Trending moved to service-specific entry pages */}
        {/* Services - Horizontal scroll */}
        <section className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 id="services-heading" className="text-lg font-semibold text-gray-800">Explore Services</h2>
                <Link href="/auth?role=driver" className="text-sm text-primary flex items-center gap-2">🚖 Become a Driver</Link>
            </div>
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex">
              <button aria-label="Scroll services left" aria-controls="services-scroller" onClick={() => scroll(servicesRef.current, 'left')} className="p-2 bg-white rounded-full shadow-md mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <div ref={servicesRef} id="services-scroller" role="region" aria-roledescription="carousel" aria-labelledby="services-heading" tabIndex={0} onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') scroll(servicesRef.current, 'left');
              if (e.key === 'ArrowRight') scroll(servicesRef.current, 'right');
            }} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {loading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-72 snap-start">
                    <Skeleton className="h-40 rounded-2xl" />
                    <div className="mt-2">
                      <Skeleton className="h-4 w-3/4 rounded-full" />
                      <Skeleton className="h-3 w-1/2 mt-2 rounded-full" />
                    </div>
                  </div>
                ))
              ) : (
                services.map((s) => (
                  <div key={s.name} className="flex-shrink-0 w-72 snap-start">
                    <ServiceCard {...s} />
                  </div>
                ))
              )}
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex">
              <button aria-label="Scroll services right" aria-controls="services-scroller" onClick={() => scroll(servicesRef.current, 'right')} className="p-2 bg-white rounded-full shadow-md ml-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>
        </section>

        {/* Categories - Horizontal slider */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 id="categories-heading" className="text-lg font-semibold text-gray-800">Categories</h2>
          </div>
          <div className="relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex">
              <button aria-label="Scroll categories left" aria-controls="categories-scroller" onClick={() => scroll(categoriesRef.current, 'left')} className="p-2 bg-white rounded-full shadow-md mr-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ChevronLeft className="h-5 w-5 text-gray-700" />
              </button>
            </div>
            <div ref={categoriesRef} id="categories-scroller" role="region" aria-roledescription="carousel" aria-labelledby="categories-heading" tabIndex={0} onKeyDown={(e) => {
              if (e.key === 'ArrowLeft') scroll(categoriesRef.current, 'left');
              if (e.key === 'ArrowRight') scroll(categoriesRef.current, 'right');
            }} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory -mx-4 px-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {categoriesLoading ? (
                Array(6).fill(0).map((_, i) => (
                  <div key={i} className="flex-shrink-0 w-36 snap-start">
                    <Skeleton className="w-full aspect-square rounded-xl" />
                    <Skeleton className="h-3 w-20 mt-2" />
                  </div>
                ))
              ) : (
                categories.map((cat) => (
                  <div key={cat.id} className="flex-shrink-0 w-36 snap-start">
                    <CategoryCard category={cat} />
                  </div>
                ))
              )}
            </div>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 z-20 hidden md:flex">
              <button aria-label="Scroll categories right" aria-controls="categories-scroller" onClick={() => scroll(categoriesRef.current, 'right')} className="p-2 bg-white rounded-full shadow-md ml-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">
                <ChevronRight className="h-5 w-5 text-gray-700" />
              </button>
            </div>
          </div>
        </section>

        {/* Products - horizontal rows per category */}
        <section className="space-y-6">
          {productsLoading ? (
            Array(3).fill(0).map((_, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-5 w-40" />
                </div>
                <div className="relative">
                  <div className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide -mx-4 px-4">
                    {Array(5).fill(0).map((__, i) => (
                      <div key={i} className="flex-shrink-0 w-44">
                        <Skeleton className="aspect-square rounded-xl" />
                        <Skeleton className="h-3 w-32 mt-2" />
                        <Skeleton className="h-3 w-20 mt-1" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          ) : (
            productsByCategory.map(({ category, items }) => (
              <div key={category.id}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 id={`cat-${category.id}-heading`} className="text-md font-semibold text-gray-800">{category.name}</h3>
                    <Link href={`/grocery?category=${category.id}`} className="text-sm text-primary">See all</Link>
                  </div>
                <div className="relative">
                  <div tabIndex={0} onKeyDown={(e) => {
                    const el = e.currentTarget as HTMLDivElement;
                    if (e.key === 'ArrowLeft') el.scrollBy({ left: -el.clientWidth * 0.7, behavior: 'smooth' });
                    if (e.key === 'ArrowRight') el.scrollBy({ left: el.clientWidth * 0.7, behavior: 'smooth' });
                  }} className="flex gap-3 overflow-x-auto pb-3 scrollbar-hide snap-x snap-mandatory -mx-4 px-4">
                    {items.map((p) => (
                        <div key={p.id} className="flex-shrink-0 w-44 snap-start" role="group" aria-roledescription="item" aria-labelledby={`cat-${category.id}-heading`}>
                          <ProductCard product={p} />
                        </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>

        <Link href="/vendors">
          <div className="mt-6 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-4 flex items-center gap-4 cursor-pointer active:scale-[0.98] transition-transform" data-testid="link-sell-on-citybell">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-bold text-base">Sell on City Bell</h3>
              <p className="text-orange-100 text-xs">Start your online store and reach thousands of customers</p>
            </div>
            <ArrowRight className="h-5 w-5 text-white flex-shrink-0" />
          </div>
        </Link>
      </main>

      <BottomNav />
      <StickyCartBar />
    </div>
  );
}
