import { Link } from "wouter";
import { Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/grocery?category=${category.id}`}>
      <div 
        className="flex flex-col items-center gap-2 p-3 min-w-[110px] hover-elevate active-elevate-2"
        data-testid={`card-category-${category.id}`}
      >
        <div className="w-24 h-24 rounded-2xl bg-white border border-gray-200 shadow-sm overflow-hidden flex items-center justify-center p-3">
          {category.image ? (
            <img 
              src={category.image} 
              alt={category.name}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200 rounded-lg" />
          )}
        </div>
        <span className="text-xs font-medium text-center text-gray-700 line-clamp-2 max-w-[90px]">
          {category.name}
        </span>
      </div>
    </Link>
  );
}
