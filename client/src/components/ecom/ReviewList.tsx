import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, Star, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { EcomReviewSummary, EcomReviewWithUser } from "@shared/schema";

interface ReviewListProps {
  productId: string;
}

function ReviewStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-3.5 w-3.5 ${index < rating ? "fill-amber-400 text-amber-400" : "text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function ReviewGallery({ review, onOpenImage }: { review: EcomReviewWithUser; onOpenImage: (imageUrl: string) => void }) {
  if (!review.images || review.images.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
      {review.images.map((imageUrl, index) => (
        <button
          key={`${review.id ?? review._id}-image-${index}`}
          type="button"
          onClick={() => onOpenImage(imageUrl)}
          className="rounded-xl overflow-hidden bg-gray-100 aspect-square"
          data-testid={`review-image-${review.id ?? review._id}-${index}`}
        >
          <img src={imageUrl} alt="Review upload" className="w-full h-full object-cover" loading="lazy" />
        </button>
      ))}
    </div>
  );
}

export function ReviewList({ productId }: ReviewListProps) {
  const [activeImage, setActiveImage] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<EcomReviewSummary>({
    queryKey: ["/api/reviews", productId],
    enabled: !!productId,
  });

  const averageRating = data?.averageRating ?? 0;
  const totalReviews = data?.totalReviews ?? 0;
  const reviews = data?.reviews ?? [];

  return (
    <div className="space-y-4">
      <Card className="p-4 border-gray-100">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Customer reviews</h3>
            <p className="text-xs text-gray-500 mt-1">Ratings, comments, and uploaded product photos.</p>
          </div>
          <div className="flex items-center gap-3 bg-gray-50 rounded-2xl px-4 py-2">
            <div>
              <p className="text-xl font-bold text-gray-900" data-testid="text-average-review-rating">{averageRating.toFixed(1)}</p>
              <ReviewStars rating={Math.round(averageRating)} />
            </div>
            <div className="w-px self-stretch bg-gray-200" />
            <div>
              <p className="text-sm font-semibold text-gray-900" data-testid="text-total-review-count">{totalReviews}</p>
              <p className="text-xs text-gray-500">reviews</p>
            </div>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4 border-gray-100 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
              <Skeleton className="h-16 w-full" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="aspect-square w-full rounded-xl" />
                <Skeleton className="aspect-square w-full rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card className="p-4 border-red-100 bg-red-50">
          <p className="text-sm font-medium text-red-700">Unable to load reviews right now.</p>
          <p className="text-xs text-red-600 mt-1">Please try refreshing the page.</p>
        </Card>
      ) : reviews.length === 0 ? (
        <Card className="p-6 border-dashed border-gray-200 text-center">
          <p className="text-sm font-medium text-gray-700">No reviews yet</p>
          <p className="text-xs text-gray-500 mt-1">Be the first person to rate this product and upload photos.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => {
            const reviewDate = review.createdAt ? format(new Date(review.createdAt), "dd MMM yyyy") : "";
            const displayName = review.name || review.username || "Verified customer";
            const initials = displayName.slice(0, 2).toUpperCase();

            return (
              <Card key={review.id ?? review._id} className="p-4 border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="text-sm font-semibold text-gray-900" data-testid={`text-review-user-${review.id ?? review._id}`}>{displayName}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <ReviewStars rating={review.rating} />
                          {reviewDate ? (
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <CalendarDays className="h-3.5 w-3.5" />
                              <span>{reviewDate}</span>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {review.title ? <p className="text-sm font-medium text-gray-900 mt-3">{review.title}</p> : null}
                    <p className="text-sm text-gray-600 mt-2 leading-relaxed" data-testid={`text-review-comment-${review.id ?? review._id}`}>
                      {review.comment}
                    </p>

                    <ReviewGallery review={review} onOpenImage={setActiveImage} />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {activeImage ? (
        <div className="fixed inset-0 z-[100] bg-black/80 p-4 flex items-center justify-center" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => setActiveImage(null)}
            className="absolute top-4 right-4 rounded-full bg-white/10 text-white p-2"
            data-testid="button-close-review-lightbox"
          >
            <X className="h-5 w-5" />
          </button>
          <img src={activeImage} alt="Expanded review upload" className="max-w-full max-h-full rounded-2xl object-contain" />
        </div>
      ) : null}
    </div>
  );
}
