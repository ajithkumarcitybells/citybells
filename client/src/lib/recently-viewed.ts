export const RECENTLY_VIEWED_STORAGE_KEY = "city-bell-recently-viewed-products";
export const RECENTLY_VIEWED_PRODUCTS_UPDATED_EVENT = "city-bell:recently-viewed-updated";
export const MAX_RECENTLY_VIEWED_PRODUCTS = 8;

export type RecentlyViewedProduct = {
  id: string;
  name: string;
  image: string;
  price: string;
  path: string;
  viewedAt: number;
};

type RecentlyViewedProductInput = {
  id?: string | null;
  name?: string | null;
  image?: string | null;
  price?: string | number | null;
  path?: string | null;
};

function isBrowser() {
  return typeof window !== "undefined";
}

function normalizeRecentlyViewedProduct(item: unknown): RecentlyViewedProduct | null {
  if (!item || typeof item !== "object") {
    return null;
  }

  const record = item as Record<string, unknown>;
  const id = typeof record.id === "string" ? record.id : null;
  const name = typeof record.name === "string" ? record.name : null;
  const image = typeof record.image === "string" ? record.image : "";
  const price = record.price == null ? "" : String(record.price);
  const path = typeof record.path === "string" ? record.path : id ? `/product/${id}` : null;
  const viewedAt = typeof record.viewedAt === "number" ? record.viewedAt : 0;

  if (!id || !name || !path) {
    return null;
  }

  return {
    id,
    name,
    image,
    price,
    path,
    viewedAt,
  };
}

function persistRecentlyViewedProducts(items: RecentlyViewedProduct[]) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(RECENTLY_VIEWED_STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_PRODUCTS_UPDATED_EVENT));
}

export function getRecentlyViewedProducts(): RecentlyViewedProduct[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(RECENTLY_VIEWED_STORAGE_KEY);
    if (!rawValue) {
      return [];
    }

    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeRecentlyViewedProduct(item))
      .filter((item): item is RecentlyViewedProduct => item !== null)
      .sort((left, right) => right.viewedAt - left.viewedAt)
      .slice(0, MAX_RECENTLY_VIEWED_PRODUCTS);
  } catch {
    return [];
  }
}

export function addRecentlyViewedProduct(product: RecentlyViewedProductInput) {
  const normalizedProduct = normalizeRecentlyViewedProduct({
    ...product,
    path: product.path || (product.id ? `/product/${product.id}` : null),
    viewedAt: Date.now(),
  });

  if (!normalizedProduct) {
    return [] as RecentlyViewedProduct[];
  }

  const nextProducts = [
    normalizedProduct,
    ...getRecentlyViewedProducts().filter((item) => item.id !== normalizedProduct.id),
  ].slice(0, MAX_RECENTLY_VIEWED_PRODUCTS);

  persistRecentlyViewedProducts(nextProducts);
  return nextProducts;
}

export function clearRecentlyViewedProducts() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(RECENTLY_VIEWED_STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(RECENTLY_VIEWED_PRODUCTS_UPDATED_EVENT));
}