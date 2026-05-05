import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { ImagePlus, Loader2, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

const MAX_REVIEW_IMAGES = 5;
const MAX_REVIEW_IMAGE_SIZE = 5 * 1024 * 1024;
const allowedImageTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface ReviewFormProps {
  productId: string;
}

async function parseErrorMessage(response: Response) {
  try {
    const data = await response.json();
    return typeof data?.message === "string" ? data.message : "Failed to submit review";
  } catch {
    const text = await response.text();
    return text || "Failed to submit review";
  }
}

export function ReviewForm({ productId }: ReviewFormProps) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  useEffect(() => {
    const nextPreviewUrls = selectedFiles.map((file) => URL.createObjectURL(file));
    setPreviewUrls(nextPreviewUrls);

    return () => {
      for (const url of nextPreviewUrls) {
        URL.revokeObjectURL(url);
      }
    };
  }, [selectedFiles]);

  const submitReview = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append("productId", productId);
      formData.append("rating", String(rating));
      formData.append("comment", comment.trim());
      for (const file of selectedFiles) {
        formData.append("images", file);
      }

      const response = await fetch("/api/reviews", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(await parseErrorMessage(response));
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews", productId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/products", productId] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/products", productId, "reviews"] });
      setComment("");
      setRating(5);
      setSelectedFiles([]);
      toast({ title: "Review submitted", description: "Your review is now visible on this product." });
    },
    onError: (error: Error) => {
      toast({ title: "Review failed", description: error.message, variant: "destructive" });
    },
  });

  const handleFilesSelected = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) {
      return;
    }

    if (files.length > MAX_REVIEW_IMAGES) {
      toast({
        title: "Too many images",
        description: `You can upload up to ${MAX_REVIEW_IMAGES} images per review.`,
        variant: "destructive",
      });
      event.target.value = "";
      return;
    }

    for (const file of files) {
      if (!allowedImageTypes.has(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Only JPG, PNG, WEBP, and GIF images are allowed.",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }

      if (file.size > MAX_REVIEW_IMAGE_SIZE) {
        toast({
          title: "Image too large",
          description: "Each image must be 5MB or smaller.",
          variant: "destructive",
        });
        event.target.value = "";
        return;
      }
    }

    setSelectedFiles(files);
  };

  const removeSelectedFile = (index: number) => {
    setSelectedFiles((currentFiles) => currentFiles.filter((_, currentIndex) => currentIndex !== index));
  };

  if (!user) {
    return (
      <Card className="p-4 border-gray-100">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Share your review</h3>
            <p className="text-xs text-gray-500 mt-1">Log in to rate this product and upload review images.</p>
          </div>
          <Button size="sm" onClick={() => setLocation("/auth")} data-testid="button-login-to-review">
            Login
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-gray-100 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Write a review</h3>
          <p className="text-xs text-gray-500 mt-1">Add up to 5 photos to show the product in real use.</p>
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Your rating</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((starValue) => (
            <button
              key={starValue}
              type="button"
              onClick={() => setRating(starValue)}
              className="rounded-md p-1"
              data-testid={`button-review-rating-${starValue}`}
            >
              <Star className={`h-5 w-5 ${starValue <= rating ? "fill-amber-400 text-amber-400" : "text-gray-300"}`} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-600 mb-2">Your comment</p>
        <Textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="What did you like or dislike about this product?"
          rows={4}
          className="resize-none"
          data-testid="input-review-comment"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium text-gray-600">Review images</p>
            <p className="text-[11px] text-gray-400 mt-1">JPG, PNG, WEBP, or GIF. Max 5 images, 5MB each.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} data-testid="button-select-review-images">
            <ImagePlus className="h-4 w-4 mr-2" />
            Select Images
          </Button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          multiple
          onChange={handleFilesSelected}
          className="hidden"
          data-testid="input-review-images"
        />

        {previewUrls.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {previewUrls.map((previewUrl, index) => (
              <div key={previewUrl} className="relative rounded-xl overflow-hidden bg-gray-100 aspect-square">
                <img src={previewUrl} alt="Selected review upload" className="w-full h-full object-cover" loading="lazy" />
                <button
                  type="button"
                  onClick={() => removeSelectedFile(index)}
                  className="absolute top-2 right-2 rounded-full bg-black/65 text-white p-1"
                  data-testid={`button-remove-review-image-${index}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <Button
          onClick={() => submitReview.mutate()}
          disabled={submitReview.isPending || comment.trim().length < 3}
          data-testid="button-submit-review"
        >
          {submitReview.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
          {submitReview.isPending ? "Submitting..." : "Submit Review"}
        </Button>
      </div>
    </Card>
  );
}
