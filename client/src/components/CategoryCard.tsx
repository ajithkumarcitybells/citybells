import { Link } from "wouter";
import { Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/grocery?category=${category.id}`}>
      <div 
        className="flex flex-col items-center gap-2 p-2 min-w-[100px] hover-elevate active-elevate-2 rounded-lg"
        data-testid={`card-category-${category.id}`}
      >
        <div className="w-20 h-20 rounded-xl bg-gray-50 border border-gray-100 overflow-hidden flex items-center justify-center p-2">
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
        <span className="text-xs font-medium text-center text-gray-700 line-clamp-2 max-w-[80px]">
          {category.name}
        </span>
      </div>
    </Link>
  );
}
