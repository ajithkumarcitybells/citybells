import { Star } from "lucide-react";

type FoodRatingStarsProps = {
  rating: number;
  sizeClassName?: string;
};

export function FoodRatingStars({ rating, sizeClassName = "h-4 w-4" }: FoodRatingStarsProps) {
  const filledStars = Math.round(rating);

  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`${sizeClassName} ${index < filledStars ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}