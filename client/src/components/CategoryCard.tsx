import { Link } from "wouter";
import { Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  return (
    <Link href={`/grocery?category=${category.id}`}>
      <div 
        className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover-elevate"
        data-testid={`card-category-${category.id}`}
      >
        <div className="w-full aspect-square overflow-hidden">
          {category.image ? (
            <img 
              src={category.image} 
              alt={category.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
          )}
        </div>
        <div className="p-2">
          <span className="text-xs font-medium text-center text-gray-700 leading-tight line-clamp-2 block">
            {category.name}
          </span>
        </div>
      </div>
    </Link>
  );
}
