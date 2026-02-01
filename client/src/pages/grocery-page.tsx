import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Search, ListFilter, ChevronRight } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { CategoryCard } from "@/components/CategoryCard";
import { ProductCard } from "@/components/ProductCard";
import { BannerSlider } from "@/components/BannerSlider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
            className="text-sm font-medium text-primary flex items-center gap-1"
            data-testid="button-show-more-categories"
          >
            {showAllCategories ? "Show less" : "Show more"}
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {categoriesLoading ? (
            Array(4).fill(0).map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-2 min-w-[100px]">
                <Skeleton className="w-20 h-20 rounded-xl" />
                <Skeleton className="w-16 h-3" />
              </div>
            ))
          ) : (
            displayCategories.map((category) => (
              <CategoryCard key={category.id} category={category} />
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
          <Button variant="outline" size="icon" className="bg-primary text-white hover:bg-primary/90 border-0">
            <ListFilter className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-32 bg-white" data-testid="select-sort">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default</SelectItem>
              <SelectItem value="price-low">Price: Low to High</SelectItem>
              <SelectItem value="price-high">Price: High to Low</SelectItem>
              <SelectItem value="rating">Popularity</SelectItem>
            </SelectContent>
          </Select>
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
