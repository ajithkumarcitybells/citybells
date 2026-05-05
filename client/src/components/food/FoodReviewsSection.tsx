import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, Pencil, Star, Trash2 } from "lucide-react";
import { useLocation } from "wouter";
import type { FoodReviewSummary, FoodReviewWithUser } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { FoodRatingStars } from "./FoodRatingStars";

const PAGE_SIZE = 5;

type FoodReviewSort = "newest" | "highest" | "lowest";

type FoodReviewsSectionProps = {
  foodId: string;
  restaurantId: string;
  itemName: string;
};

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return typeof data?.message === "string" ? data.message : "Request failed";
  } catch {
    const text = await response.text();
    return text || "Request failed";
  }
}

async function fetchFoodReviews(foodId: string, sort: FoodReviewSort, pageParam: number) {
  const response = await fetch(`/api/food/reviews/${foodId}?sort=${sort}&page=${pageParam}&limit=${PAGE_SIZE}`, {
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  return response.json() as Promise<FoodReviewSummary>;
}

function getDisplayName(review: FoodReviewWithUser) {
  return review.name || review.username || "Food lover";
}

function getInitials(review: FoodReviewWithUser) {
  return getDisplayName(review)
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "FL";
}

function InteractiveStarRating({
  rating,
  previewRating,
  onChange,
  onPreviewChange,
}: {
  rating: number;
  previewRating: number;
  onChange: (value: number) => void;
  onPreviewChange: (value: number) => void;
}) {
  const activeRating = previewRating || rating;

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, index) => {
        const starValue = index + 1;

        return (
          <button
            key={starValue}
            type="button"
            className="rounded-full p-1 transition-transform hover:scale-110"
            onClick={() => onChange(starValue)}
            onMouseEnter={() => onPreviewChange(starValue)}
            onMouseLeave={() => onPreviewChange(0)}
            data-testid={`button-food-review-rating-${starValue}`}
          >
            <Star
              className={`h-6 w-6 ${starValue <= activeRating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`}
            />
          </button>
        );
      })}
    </div>
  );
}

export function FoodReviewsSection({ foodId, restaurantId, itemName }: FoodReviewsSectionProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const formRef = useRef<HTMLDivElement | null>(null);
  const [sort, setSort] = useState<FoodReviewSort>("newest");
  const [rating, setRating] = useState(0);
  const [previewRating, setPreviewRating] = useState(0);
  const [comment, setComment] = useState("");

  const reviewsQuery = useInfiniteQuery({
    queryKey: ["food-reviews", foodId, sort],
    queryFn: ({ pageParam }) => fetchFoodReviews(foodId, sort, Number(pageParam)),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.page + 1 : undefined),
    enabled: Boolean(foodId),
  });

  const summary = reviewsQuery.data?.pages[0] ?? null;
  const reviews = useMemo(
    () => reviewsQuery.data?.pages.flatMap((page) => page.reviews) ?? [],
    [reviewsQuery.data?.pages],
  );
  const viewerReview = summary?.viewerReview ?? null;

  useEffect(() => {
    setRating(viewerReview?.rating ?? 0);
    setComment(viewerReview?.comment ?? "");
    setPreviewRating(0);
  }, [viewerReview?.id, viewerReview?._id]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("Login required");
      }

      if (viewerReview) {
        const response = await apiRequest("PUT", `/api/food/reviews/${viewerReview.id ?? viewerReview._id}`, {
          rating,
          comment: comment.trim(),
        });
        return response.json();
      }

      const response = await apiRequest("POST", "/api/food/reviews", {
        foodId,
        rating,
        comment: comment.trim(),
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["food-reviews", foodId] });
      queryClient.invalidateQueries({ queryKey: ["/api/food/restaurants", restaurantId] });
      toast({
        title: viewerReview ? "Review updated" : "Review submitted",
        description: viewerReview
          ? `Your review for ${itemName} has been updated.`
          : `Your review for ${itemName} is now live.`,
      });
    },
    onError: (error: Error) => {
      if (error.message === "Login required") {
        setLocation("/auth");
        toast({ title: "Please login", description: "Login to write a review.", variant: "destructive" });
        return;
      }

      toast({ title: "Review failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      if (!viewerReview) {
        throw new Error("Review not found");
      }

      await apiRequest("DELETE", `/api/food/reviews/${viewerReview.id ?? viewerReview._id}`);
    },
    onSuccess: () => {
      setRating(0);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["food-reviews", foodId] });
      queryClient.invalidateQueries({ queryKey: ["/api/food/restaurants", restaurantId] });
      toast({ title: "Review deleted", description: `Your review for ${itemName} has been removed.` });
    },
    onError: (error: Error) => {
      toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    },
  });

  const handleDelete = () => {
    if (!viewerReview) {
      return;
    }

    if (!window.confirm("Delete your review for this item?")) {
      return;
    }

    deleteMutation.mutate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Ratings & Reviews</h3>
          <p className="text-sm text-gray-500">See what other customers said before you order.</p>
        </div>
        <div className="w-full sm:w-48">
          <Select value={sort} onValueChange={(value) => setSort(value as FoodReviewSort)}>
            <SelectTrigger data-testid="select-food-review-sort">
              <SelectValue placeholder="Sort reviews" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest</SelectItem>
              <SelectItem value="highest">Highest Rating</SelectItem>
              <SelectItem value="lowest">Lowest Rating</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="border-orange-100 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5">
          {reviewsQuery.isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-5 w-32" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Skeleton key={index} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3">
                <p className="text-4xl font-bold text-gray-900" data-testid="text-food-average-rating">
                  {(summary?.averageRating ?? 0).toFixed(1)}
                </p>
                <div className="pb-1">
                  <FoodRatingStars rating={summary?.averageRating ?? 0} sizeClassName="h-5 w-5" />
                  <p className="mt-1 text-sm text-gray-500">{summary?.totalReviews ?? 0} reviews</p>
                </div>
              </div>

              <div className="mt-5 space-y-3">
                {(summary?.breakdown ?? [5, 4, 3, 2, 1].map((value) => ({ rating: value, count: 0, percentage: 0 }))).map((entry) => (
                  <div key={entry.rating} className="grid grid-cols-[36px_minmax(0,1fr)_32px] items-center gap-3">
                    <span className="text-sm font-medium text-gray-700">{entry.rating}★</span>
                    <Progress value={entry.percentage} className="h-2.5 bg-orange-100" />
                    <span className="text-right text-xs text-gray-500">{entry.count}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>

        <Card ref={formRef} className="border-gray-100 p-5">
          {!user ? (
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h4 className="text-base font-semibold text-gray-900">Write a Review</h4>
                <p className="mt-1 text-sm text-gray-500">Login to rate this item and share your experience.</p>
              </div>
              <Button onClick={() => setLocation("/auth")} data-testid="button-login-food-review">
                Login
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-base font-semibold text-gray-900">
                    {viewerReview ? "Edit Your Review" : "Write a Review"}
                  </h4>
                  <p className="mt-1 text-sm text-gray-500">
                    {viewerReview
                      ? "You can update or remove your existing review for this food item."
                      : "Rate the taste, quality, and overall value."}
                  </p>
                </div>
                {viewerReview ? <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">Your review</Badge> : null}
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Your rating</p>
                <InteractiveStarRating
                  rating={rating}
                  previewRating={previewRating}
                  onChange={setRating}
                  onPreviewChange={setPreviewRating}
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">Your review</p>
                <Textarea
                  value={comment}
                  onChange={(event) => setComment(event.target.value)}
                  rows={5}
                  className="resize-none"
                  placeholder="Tell others what stood out about this dish."
                  data-testid="textarea-food-review-comment"
                />
              </div>

              <div className="flex items-center justify-end gap-2 flex-wrap">
                {viewerReview ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={deleteMutation.isPending}
                    data-testid="button-delete-food-review"
                  >
                    {deleteMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Delete
                  </Button>
                ) : null}
                <Button
                  type="button"
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending || rating < 1 || comment.trim().length < 3}
                  data-testid="button-submit-food-review"
                >
                  {submitMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {viewerReview ? "Update Review" : "Submit Review"}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>

      <div className="space-y-3">
        {reviewsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
              <Skeleton className="h-16 w-full" />
            </Card>
          ))
        ) : reviewsQuery.isError ? (
          <Card className="border-red-100 bg-red-50 p-4 text-sm text-red-700">
            Unable to load reviews right now. Please try again.
          </Card>
        ) : reviews.length === 0 ? (
          <Card className="border-dashed border-gray-200 p-8 text-center">
            <p className="text-base font-medium text-gray-800">No reviews yet</p>
            <p className="mt-1 text-sm text-gray-500">Be the first person to rate this food item.</p>
          </Card>
        ) : (
          reviews.map((review) => {
            const isOwnReview = user?._id === String(review.userId);

            return (
              <Card key={review.id ?? review._id} className="border-gray-100 p-4">
                <div className="flex items-start gap-3">
                  <Avatar className="h-11 w-11 border border-orange-100">
                    {review.avatar ? <AvatarImage src={review.avatar} alt={getDisplayName(review)} /> : null}
                    <AvatarFallback className="bg-orange-50 text-orange-700">{getInitials(review)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold text-gray-900" data-testid={`text-food-review-user-${review.id ?? review._id}`}>
                            {getDisplayName(review)}
                          </p>
                          {review.verified ? (
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50">
                              Verified order
                            </Badge>
                          ) : null}
                          {isOwnReview ? (
                            <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                              Your review
                            </Badge>
                          ) : null}
                        </div>
                        <div className="mt-1 flex items-center gap-2 flex-wrap">
                          <FoodRatingStars rating={review.rating} />
                          <span className="text-xs text-gray-400">
                            {review.createdAt ? format(new Date(review.createdAt), "dd MMM yyyy") : ""}
                          </span>
                        </div>
                      </div>

                      {isOwnReview ? (
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setRating(review.rating);
                              setComment(review.comment);
                              formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                            }}
                            data-testid="button-edit-food-review"
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-600 hover:text-red-700"
                            onClick={handleDelete}
                            data-testid="button-delete-food-review-inline"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      ) : null}
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-600" data-testid={`text-food-review-comment-${review.id ?? review._id}`}>
                      {review.comment}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })
        )}

        {reviewsQuery.hasNextPage ? (
          <div className="flex justify-center pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => reviewsQuery.fetchNextPage()}
              disabled={reviewsQuery.isFetchingNextPage}
              data-testid="button-load-more-food-reviews"
            >
              {reviewsQuery.isFetchingNextPage ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {reviewsQuery.isFetchingNextPage ? "Loading..." : "Load More Reviews"}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}