const FOOD_VIEWED_ITEMS_KEY = "citybell_food_viewed_items";
const FOOD_FAVORITE_ITEMS_KEY = "citybell_food_favorite_items";
const FOOD_SEARCH_HISTORY_KEY = "citybell_food_search_history";
const MAX_TRACKED_ITEMS = 24;
const MAX_SEARCH_HISTORY = 12;

export const FOOD_PERSONALIZATION_UPDATED_EVENT = "citybell:food-personalization-updated";

export type TrackedFoodItem = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  name: string;
  image?: string;
  price: number;
  rating: number;
  reviewCount?: number;
  category?: string;
  cuisine?: string[];
  isVeg?: boolean;
  isSpicy?: boolean;
  viewedAt?: string;
  favoritedAt?: string;
};

function dispatchUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(FOOD_PERSONALIZATION_UPDATED_EVENT));
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") {
    return fallback;
  }

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, JSON.stringify(value));
  dispatchUpdated();
}

export function getViewedFoodItems() {
  return readJson<TrackedFoodItem[]>(FOOD_VIEWED_ITEMS_KEY, []);
}

export function getFavoriteFoodItems() {
  return readJson<TrackedFoodItem[]>(FOOD_FAVORITE_ITEMS_KEY, []);
}

export function getFoodSearchHistory() {
  return readJson<string[]>(FOOD_SEARCH_HISTORY_KEY, []);
}

export function recordViewedFoodItem(item: TrackedFoodItem) {
  const current = getViewedFoodItems();
  const next = [
    { ...item, viewedAt: new Date().toISOString() },
    ...current.filter((entry) => entry.id !== item.id),
  ].slice(0, MAX_TRACKED_ITEMS);

  writeJson(FOOD_VIEWED_ITEMS_KEY, next);
}

export function toggleFavoriteFoodItem(item: TrackedFoodItem) {
  const current = getFavoriteFoodItems();
  const exists = current.some((entry) => entry.id === item.id);

  const next = exists
    ? current.filter((entry) => entry.id !== item.id)
    : [{ ...item, favoritedAt: new Date().toISOString() }, ...current].slice(0, MAX_TRACKED_ITEMS);

  writeJson(FOOD_FAVORITE_ITEMS_KEY, next);
  return !exists;
}

export function isFavoriteFoodItem(itemId: string) {
  return getFavoriteFoodItems().some((entry) => entry.id === itemId);
}

export function recordFoodSearch(query: string) {
  const normalized = query.trim();
  if (normalized.length < 2) {
    return;
  }

  const current = getFoodSearchHistory();
  const next = [normalized, ...current.filter((entry) => entry.toLowerCase() !== normalized.toLowerCase())].slice(0, MAX_SEARCH_HISTORY);
  writeJson(FOOD_SEARCH_HISTORY_KEY, next);
}

export function getFoodBehaviorSnapshot() {
  const viewedItems = getViewedFoodItems();
  const favoriteItems = getFavoriteFoodItems();
  const searchHistory = getFoodSearchHistory();

  return {
    viewedItems,
    favoriteItems,
    searchHistory,
    recentItemIds: viewedItems.map((item) => item.id),
    favoriteItemIds: favoriteItems.map((item) => item.id),
    searchTerms: searchHistory,
  };
}