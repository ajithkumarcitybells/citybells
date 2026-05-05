# Objective
Fix the cart so it works correctly across all services (grocery, e-commerce, food delivery). Currently, the Header and BottomNav are hardcoded to the grocery cart (`/api/cart` and `/cart`), so when users add items to the e-commerce cart, the cart icon shows 0 items and links to the wrong (grocery) cart page.

# Tasks

### T001: Make Header cart context-aware based on current section
- **Blocked By**: []
- **Details**:
  - In `client/src/components/Header.tsx`, detect the current route using `useLocation` from wouter
  - If the user is in an e-commerce section (route starts with `/ecommerce`), query `/api/ecom/cart` and link to `/ecommerce/cart`
  - If the user is in a food delivery section (route starts with `/food`), query `/api/food/cart` and link to `/food/cart`
  - Otherwise (grocery/default), keep existing behavior: query `/api/cart` and link to `/cart`
  - The cart count badge should reflect the correct cart for the current section
  - Files: `client/src/components/Header.tsx`
  - Acceptance: Cart icon in header shows the correct count and links to the correct cart page based on which service the user is browsing

### T002: Make BottomNav cart context-aware based on current section
- **Blocked By**: []
- **Details**:
  - In `client/src/components/BottomNav.tsx`, apply the same context-aware logic as T001
  - Detect route, switch cart query and link path accordingly (grocery `/cart`, e-commerce `/ecommerce/cart`, food `/food/cart`)
  - Files: `client/src/components/BottomNav.tsx`
  - Acceptance: Bottom nav cart button shows correct count and navigates to correct cart page for the current section
