import { useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { LocationProvider } from "@/hooks/use-location";
import { ProtectedRoute, AdminRoute, VendorRoute } from "@/lib/protected-route";
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
import AdminOrderDetailPage from "@/pages/admin/order-detail-page";
import AdminBannersPage from "@/pages/admin/banners-page";
import AdminCategoryAdsPage from "@/pages/admin/category-ads-page";
import AdminServicesPage from "@/pages/admin/services-page";
import ProductDetailPage from "@/pages/product-detail-page";
import AddressesPage from "@/pages/addresses-page";
import SettingsPage from "@/pages/settings-page";
import SupportPage from "@/pages/support-page";
import AdminSupportPage from "@/pages/admin/support-page";
import AdminVendorsPage from "@/pages/admin/vendors-page";
import VendorApplicationPage from "@/pages/vendor-application-page";
import VendorDashboardPage from "@/pages/vendor-dashboard-page";
import AdminEcomDashboardPage from "@/pages/admin/ecom-dashboard-page";
import AdminEcomCategoriesPage from "@/pages/admin/ecom-categories-page";
import AdminEcomProductsPage from "@/pages/admin/ecom-products-page";
import AdminEcomOrdersPage from "@/pages/admin/ecom-orders-page";
import AdminEcomSellersPage from "@/pages/admin/ecom-sellers-page";
import AdminFoodPage from "@/pages/admin/admin-food-page";
import AdminMovingPage from "@/pages/admin/admin-moving-page";
import AdminHotelsPage from "@/pages/admin/admin-hotels-page";
import AdminTaxiPage from "@/pages/admin/admin-taxi-page";
import AdminCityServicesPage from "@/pages/admin/admin-city-services-page";
import EcomHomePage from "@/pages/ecom/ecom-home-page";
import EcomProductsPage from "@/pages/ecom/ecom-products-page";
import EcomProductDetailPage from "@/pages/ecom/ecom-product-detail-page";
import EcomCartPage from "@/pages/ecom/ecom-cart-page";
import EcomCheckoutPage from "@/pages/ecom/ecom-checkout-page";
import EcomOrdersPage from "@/pages/ecom/ecom-orders-page";
import SellerDashboard from "@/pages/seller/seller-dashboard";
import ServicesHomePage from "@/pages/services/services-home-page";
import ServicesCategoryPage from "@/pages/services/services-category-page";
import ServiceBookingPage from "@/pages/services/service-booking-page";
import ServicesBookingsPage from "@/pages/services/services-bookings-page";
import ProviderDashboard from "@/pages/services/provider-dashboard";
import TaxiHomePage from "@/pages/taxi/taxi-home-page";
import TaxiBookingPage from "@/pages/taxi/taxi-booking-page";
import TaxiRidesPage from "@/pages/taxi/taxi-rides-page";
import TaxiDriverDashboard from "@/pages/taxi/taxi-driver-dashboard";
import MovingHomePage from "@/pages/moving/moving-home-page";
import MovingVehiclesPage from "@/pages/moving/moving-vehicles-page";
import MovingBookingsPage from "@/pages/moving/moving-bookings-page";
import DriverDashboard from "@/pages/moving/driver-dashboard";
import FoodHomePage from "@/pages/food/food-home-page";
import FoodRestaurantPage from "@/pages/food/food-restaurant-page";
import FoodCartPage from "@/pages/food/food-cart-page";
import FoodOrdersPage from "@/pages/food/food-orders-page";
import RestaurantDashboard from "@/pages/food/restaurant-dashboard";
import HotelHomePage from "@/pages/hotel/hotel-home-page";
import HotelSearchPage from "@/pages/hotel/hotel-search-page";
import HotelDetailPage from "@/pages/hotel/hotel-detail-page";
import HotelBookingsPage from "@/pages/hotel/hotel-bookings-page";
import HotelDashboard from "@/pages/hotel/hotel-dashboard";

function AppRouter() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/grocery" component={GroceryPage} />
      <Route path="/product/:id" component={ProductDetailPage} />
      <Route path="/cart" component={CartPage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/profile" component={ProfilePage} />
      <Route path="/vendors" component={VendorApplicationPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/register" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <ProtectedRoute path="/checkout" component={CheckoutPage} />
      <ProtectedRoute path="/orders" component={OrdersPage} />
      <ProtectedRoute path="/addresses" component={AddressesPage} />
      <ProtectedRoute path="/settings" component={SettingsPage} />
      <ProtectedRoute path="/support" component={SupportPage} />
      <AdminRoute path="/admin/support" component={AdminSupportPage} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <AdminRoute path="/admin/products" component={AdminProductsPage} />
      <AdminRoute path="/admin/categories" component={AdminCategoriesPage} />
      <AdminRoute path="/admin/orders/:id" component={AdminOrderDetailPage} />
      <AdminRoute path="/admin/orders" component={AdminOrdersPage} />
      <AdminRoute path="/admin/banners" component={AdminBannersPage} />
      <AdminRoute path="/admin/category-ads" component={AdminCategoryAdsPage} />
      <AdminRoute path="/admin/services" component={AdminServicesPage} />
      <AdminRoute path="/admin/vendors" component={AdminVendorsPage} />
      <AdminRoute path="/admin/ecom" component={AdminEcomDashboardPage} />
      <AdminRoute path="/admin/ecom/categories" component={AdminEcomCategoriesPage} />
      <AdminRoute path="/admin/ecom/products" component={AdminEcomProductsPage} />
      <AdminRoute path="/admin/ecom/orders" component={AdminEcomOrdersPage} />
      <AdminRoute path="/admin/ecom/sellers" component={AdminEcomSellersPage} />
      <AdminRoute path="/admin/food" component={AdminFoodPage} />
      <AdminRoute path="/admin/moving" component={AdminMovingPage} />
      <AdminRoute path="/admin/hotels" component={AdminHotelsPage} />
      <AdminRoute path="/admin/taxi" component={AdminTaxiPage} />
      <AdminRoute path="/admin/city-services" component={AdminCityServicesPage} />
      <VendorRoute path="/vendor/dashboard" component={VendorDashboardPage} />
      <VendorRoute path="/seller/dashboard" component={SellerDashboard} />
      <Route path="/ecommerce" component={EcomHomePage} />
      <Route path="/ecommerce/products" component={EcomProductsPage} />
      <Route path="/ecommerce/product/:id" component={EcomProductDetailPage} />
      <Route path="/ecommerce/cart" component={EcomCartPage} />
      <ProtectedRoute path="/ecommerce/checkout" component={EcomCheckoutPage} />
      <ProtectedRoute path="/ecommerce/orders" component={EcomOrdersPage} />
      <Route path="/moving" component={MovingHomePage} />
      <Route path="/moving/vehicles" component={MovingVehiclesPage} />
      <ProtectedRoute path="/moving/bookings" component={MovingBookingsPage} />
      <VendorRoute path="/moving/driver" component={DriverDashboard} />
      <Route path="/taxi" component={TaxiHomePage} />
      <ProtectedRoute path="/taxi/booking/:id" component={TaxiBookingPage} />
      <ProtectedRoute path="/taxi/rides" component={TaxiRidesPage} />
      <VendorRoute path="/taxi/driver" component={TaxiDriverDashboard} />
      <Route path="/services" component={ServicesHomePage} />
      <Route path="/services/category/:id" component={ServicesCategoryPage} />
      <Route path="/services/book/:id" component={ServiceBookingPage} />
      <ProtectedRoute path="/services/bookings" component={ServicesBookingsPage} />
      <VendorRoute path="/services/provider" component={ProviderDashboard} />
      <Route path="/food" component={FoodHomePage} />
      <Route path="/food/restaurant/:id" component={FoodRestaurantPage} />
      <Route path="/food/cart" component={FoodCartPage} />
      <ProtectedRoute path="/food/orders" component={FoodOrdersPage} />
      <VendorRoute path="/food/restaurant-dashboard" component={RestaurantDashboard} />
      <Route path="/hotels" component={HotelHomePage} />
      <Route path="/hotels/search" component={HotelSearchPage} />
      <ProtectedRoute path="/hotels/bookings" component={HotelBookingsPage} />
      <VendorRoute path="/hotels/manager" component={HotelDashboard} />
      <Route path="/hotels/:id" component={HotelDetailPage} />
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
