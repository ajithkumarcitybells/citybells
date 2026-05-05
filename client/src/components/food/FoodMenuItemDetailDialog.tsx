import { CircleDot, Flame, Minus, Plus, Star } from "lucide-react";
import type { FoodMenuItem } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FoodReviewsSection } from "./FoodReviewsSection";
import { FoodDynamicPrice } from "./FoodDynamicPrice";
import { FoodRatingStars } from "./FoodRatingStars";

type FoodMenuItemDetailDialogProps = {
  item: FoodMenuItem;
  quantity: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: () => void;
  onRemove: () => void;
  lat?: number | null;
  lng?: number | null;
};

export function FoodMenuItemDetailDialog({
  item,
  quantity,
  open,
  onOpenChange,
  onAdd,
  onRemove,
  lat,
  lng,
}: FoodMenuItemDetailDialogProps) {
  const rating = Number(item.rating ?? 0);
  const reviewCount = Number(item.reviewCount ?? 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto rounded-3xl p-0">
        <div className="grid gap-0 lg:grid-cols-[360px_minmax(0,1fr)]">
          <div className="bg-gradient-to-br from-orange-50 via-amber-50 to-white p-6">
            <div className="overflow-hidden rounded-3xl bg-white shadow-sm">
              {item.image ? (
                <img src={item.image} alt={item.name} className="h-72 w-full object-cover" loading="lazy" />
              ) : (
                <div className="h-72 w-full bg-gradient-to-br from-orange-100 to-amber-100" />
              )}
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Badge className={item.isVeg ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-50" : "bg-rose-50 text-rose-700 hover:bg-rose-50"}>
                <CircleDot className="mr-1 h-3.5 w-3.5" />
                {item.isVeg ? "Veg" : "Non-Veg"}
              </Badge>
              {item.isSpicy ? (
                <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                  <Flame className="mr-1 h-3.5 w-3.5" />
                  Spicy
                </Badge>
              ) : null}
              {!item.isAvailable ? <Badge variant="destructive">Currently unavailable</Badge> : null}
            </div>

            <div className="mt-5 rounded-3xl bg-white p-4 shadow-sm">
              <p className="text-sm text-gray-500">Price</p>
              <div className="mt-1">
                <FoodDynamicPrice
                  itemId={item.id}
                  fallbackBasePrice={parseFloat(String(item.price))}
                  lat={lat}
                  lng={lng}
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <FoodRatingStars rating={rating} />
                    <span className="text-sm font-semibold text-gray-700">{rating.toFixed(1)}</span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">{reviewCount} reviews</p>
                </div>
                {quantity === 0 ? (
                  <Button onClick={onAdd} disabled={!item.isAvailable} data-testid={`button-dialog-add-${item.id}`}>
                    Add to cart
                  </Button>
                ) : (
                  <div className="flex items-center gap-2 rounded-full bg-orange-500 px-2 py-1 text-white">
                    <button onClick={onRemove} className="rounded-full p-1 hover:bg-white/15" data-testid={`button-dialog-remove-${item.id}`}>
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-6 text-center text-sm font-semibold">{quantity}</span>
                    <button onClick={onAdd} className="rounded-full p-1 hover:bg-white/15" data-testid={`button-dialog-plus-${item.id}`}>
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6">
            <DialogHeader className="text-left">
              <DialogTitle className="text-2xl font-bold text-gray-900">{item.name}</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-gray-500">
                {item.description || "Freshly prepared and ready to order."}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-6 flex items-center gap-3 flex-wrap rounded-2xl bg-orange-50 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                <span>{rating.toFixed(1)} average rating</span>
              </div>
              <div className="h-4 w-px bg-orange-200" />
              <p className="text-sm text-gray-600">{reviewCount} customer reviews</p>
              {item.calories ? (
                <>
                  <div className="h-4 w-px bg-orange-200" />
                  <p className="text-sm text-gray-600">{item.calories} cal</p>
                </>
              ) : null}
            </div>

            <div className="mt-8">
              <FoodReviewsSection foodId={item.id} restaurantId={item.restaurantId} itemName={item.name} />
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}