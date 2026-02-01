import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, ListFilter } from "lucide-react";
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
import { Category, Product, Banner } from "@shared/schema";

export default function GroceryPage() {
  const [location] = useLocation();
  const searchParams = new URLSearchParams(location.split('?')[1] || '');
  const categoryParam = searchParams.get('category');
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(categoryParam);
  const [showAllCategories, setShowAllCategories] = useState(false);

  const { data: categories = [], isLoading: categoriesLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: banners = [] } = useQuery<Banner[]>({
    queryKey: ["/api/banners"],
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
  }, [products, searchQuery, selectedCategory, sortBy]);

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
            <p className="text-gray-500">No products found</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </main>
      
      <BottomNav />
    </div>
  );
}
