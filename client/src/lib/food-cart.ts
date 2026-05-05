import type { FoodMenuItem } from "@shared/schema";

export type FoodCartEntry = {
  item: FoodMenuItem;
  quantity: number;
};

export const FOOD_CART_KEY = "citybell_food_cart";
export const FOOD_CART_UPDATED_EVENT = "citybell:food-cart-updated";

function dispatchFoodCartUpdated() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new Event(FOOD_CART_UPDATED_EVENT));
}

export function loadFoodCart() {
  if (typeof window === "undefined") {
    return [] as FoodCartEntry[];
  }

  try {
    const raw = window.localStorage.getItem(FOOD_CART_KEY);
    return raw ? (JSON.parse(raw) as FoodCartEntry[]) : [];
  } catch {
    return [] as FoodCartEntry[];
  }
}

export function saveFoodCart(entries: FoodCartEntry[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(FOOD_CART_KEY, JSON.stringify(entries));
  dispatchFoodCartUpdated();
}

export function addFoodCartItem(item: FoodMenuItem) {
  const currentCart = loadFoodCart();
  const existingRestaurantId = currentCart[0]?.item.restaurantId;
  const shouldReplaceRestaurant = Boolean(existingRestaurantId && existingRestaurantId !== item.restaurantId);
  const baseCart = shouldReplaceRestaurant ? [] : currentCart;
  const existingEntry = baseCart.find((entry) => entry.item.id === item.id);

  const nextCart = existingEntry
    ? baseCart.map((entry) =>
        entry.item.id === item.id ? { ...entry, quantity: entry.quantity + 1 } : entry,
      )
    : [...baseCart, { item, quantity: 1 }];

  saveFoodCart(nextCart);

  return {
    cart: nextCart,
    replacedRestaurant: shouldReplaceRestaurant,
  };
}

export function snapshotFoodCartItem(item: FoodMenuItem, livePrice: number) {
  return {
    ...item,
    price: livePrice.toFixed(2),
  } as FoodMenuItem;
}

export function updateFoodCartQuantity(itemId: string, delta: number) {
  const nextCart = loadFoodCart()
    .map((entry) => (entry.item.id === itemId ? { ...entry, quantity: entry.quantity + delta } : entry))
    .filter((entry) => entry.quantity > 0);

  saveFoodCart(nextCart);
  return nextCart;
}

export function clearFoodCart() {
  saveFoodCart([]);
}