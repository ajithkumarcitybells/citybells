import { Link } from "wouter";
import { Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/grocery?category=${category.id}`}>
      <div 
        className="flex flex-col items-center gap-1.5 cursor-pointer"
        data-testid={`card-category-${category.id}`}
      >
        <div className="w-full aspect-square rounded-lg bg-gray-50 overflow-hidden flex items-center justify-center p-2">
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
        <span className="text-xs font-medium text-center text-gray-700 leading-tight line-clamp-2">
          {category.name}
        </span>
      </div>
    </Link>
  );
}
