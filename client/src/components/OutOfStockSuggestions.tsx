import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

type SuggestedProduct = {
  id: string;
  name: string;
  image?: string;
  price: number | string;
  stock: number;
  href: string;
  addToCartLabel?: string;
  isAdding?: boolean;
  onAddToCart: () => void;
};

interface OutOfStockSuggestionsProps {
  products: SuggestedProduct[];
  isLoading: boolean;
  title?: string;
  emptyMessage?: string;
}

function formatPrice(price: number | string) {
  const numericPrice = typeof price === "number" ? price : Number.parseFloat(price);
  if (!Number.isFinite(numericPrice)) {
    return "0";
  }

  return numericPrice.toFixed(0);
}

export function OutOfStockSuggestions({
  products,
  isLoading,
  title = "You may also like",
  emptyMessage = "No similar items available",
}: OutOfStockSuggestionsProps) {
  return (
    <section className="space-y-3" data-testid="section-out-of-stock-suggestions">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
        <p className="text-sm text-gray-500">Similar alternatives ready to order now.</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="overflow-hidden border-gray-100 p-0">
              <Skeleton className="h-36 w-full rounded-none" />
              <div className="space-y-3 p-3">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-9 w-full" />
              </div>
            </Card>
          ))}
        </div>
      ) : products.length === 0 ? (
        <Card className="border-dashed border-gray-200 p-4 text-sm text-gray-500">{emptyMessage}</Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {products.map((product) => {
            const isInStock = product.stock > 0;

            return (
              <Card key={product.id} className="overflow-hidden border-gray-100 p-0">
                <Link href={product.href}>
                  <button className="block w-full text-left" data-testid={`link-suggested-product-${product.id}`}>
                    <div className="aspect-[4/3] bg-gray-50 p-4">
                      <img
                        src={product.image || "https://via.placeholder.com/320x240?text=Product"}
                        alt={product.name}
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </button>
                </Link>

                <div className="space-y-3 p-3">
                  <Link href={product.href}>
                    <button className="block text-left" data-testid={`text-suggested-product-name-${product.id}`}>
                      <p className="line-clamp-2 text-sm font-medium text-gray-900">{product.name}</p>
                    </button>
                  </Link>
                  <p className="text-base font-semibold text-primary" data-testid={`text-suggested-product-price-${product.id}`}>
                    ₹{formatPrice(product.price)}
                  </p>
                  <Button
                    onClick={product.onAddToCart}
                    disabled={!isInStock || product.isAdding}
                    className="w-full"
                    data-testid={`button-suggested-add-to-cart-${product.id}`}
                  >
                    {!isInStock ? "Out of Stock" : product.isAdding ? "Adding..." : product.addToCartLabel || "Add to Cart"}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}