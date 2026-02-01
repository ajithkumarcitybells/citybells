import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { LocationProvider } from "@/hooks/use-location";
import { ProtectedRoute, AdminRoute } from "@/lib/protected-route";
import SplashScreen from "@/components/SplashScreen";
import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home-page";
import GroceryPage from "@/pages/grocery-page";
import CartPage from "@/pages/cart-page";
import WishlistPage from "@/pages/wishlist-page";
import CheckoutPage from "@/pages/checkout-page";
import OrdersPage from "@/pages/orders-page";
import ProfilePage from "@/pages/profile-page";
import AuthPage from "@/pages/auth-page";
import AdminDashboard from "@/pages/admin/index";
import AdminProductsPage from "@/pages/admin/products-page";
import AdminCategoriesPage from "@/pages/admin/categories-page";
import AdminOrdersPage from "@/pages/admin/orders-page";
import AdminBannersPage from "@/pages/admin/banners-page";
import AdminServicesPage from "@/pages/admin/services-page";
import ProductDetailPage from "@/pages/product-detail-page";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/grocery" component={GroceryPage} />
      <Route path="/product/:id" component={ProductDetailPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <AdminRoute path="/admin/products" component={AdminProductsPage} />
      <AdminRoute path="/admin/categories" component={AdminCategoriesPage} />
      <AdminRoute path="/admin/orders" component={AdminOrdersPage} />
      <AdminRoute path="/admin/banners" component={AdminBannersPage} />
      <AdminRoute path="/admin/services" component={AdminServicesPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LocationProvider>
          <TooltipProvider>
            {showSplash && (
              <SplashScreen onComplete={() => setShowSplash(false)} duration={2500} />
            )}
            <Toaster />
            <AppRouter />
          </TooltipProvider>
        </LocationProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
