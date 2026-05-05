import { useLocation } from "wouter";
import { Category } from "@shared/schema";

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const [, setLocation] = useLocation();

  const handleClick = () => {
    setLocation(`/grocery?category=${category.id}`);
  };

  return (
    <div 
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleClick(); } }}
      onClick={handleClick}
      aria-label={`${category.name} category`}
      className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer hover-elevate focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
      <div className="p-2 h-10 flex items-center justify-center">
        <span className="text-xs font-medium text-center text-gray-700 leading-tight line-clamp-2">
          {category.name}
        </span>
      </div>
    </div>
  );
}
