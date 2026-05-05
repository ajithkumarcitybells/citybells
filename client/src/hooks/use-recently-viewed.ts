import { useEffect, useState } from "react";
import {
  clearRecentlyViewedProducts,
  getRecentlyViewedProducts,
  RECENTLY_VIEWED_PRODUCTS_UPDATED_EVENT,
  type RecentlyViewedProduct,
} from "@/lib/recently-viewed";

export function useRecentlyViewedProducts() {
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<RecentlyViewedProduct[]>(() => getRecentlyViewedProducts());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const syncRecentlyViewedProducts = () => {
      setRecentlyViewedProducts(getRecentlyViewedProducts());
    };

    window.addEventListener("storage", syncRecentlyViewedProducts);
    window.addEventListener(RECENTLY_VIEWED_PRODUCTS_UPDATED_EVENT, syncRecentlyViewedProducts as EventListener);

    return () => {
      window.removeEventListener("storage", syncRecentlyViewedProducts);
      window.removeEventListener(RECENTLY_VIEWED_PRODUCTS_UPDATED_EVENT, syncRecentlyViewedProducts as EventListener);
    };
  }, []);

  return {
    recentlyViewedProducts,
    clearAllRecentlyViewedProducts: () => {
      clearRecentlyViewedProducts();
      setRecentlyViewedProducts([]);
    },
  };
}