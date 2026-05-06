import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapPin, Clock, CreditCard, Banknote, Check, Shield, Home, Briefcase, MapPinned, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CartItemWithProduct, Address } from "@shared/schema";
import { FastDeliveryBadge, FastDeliveryCartNotice, isFastDeliveryProduct } from "@/components/FastDelivery";
import { SubscriberBadge } from "@/components/GrocerySubscription";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const deliverySlots = [
  { id: "morning", label: "Morning", time: "9:00 AM - 12:00 PM" },
  { id: "afternoon", label: "Afternoon", time: "12:00 PM - 4:00 PM" },
  { id: "evening", label: "Evening", time: "4:00 PM - 8:00 PM" },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [address, setAddress] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [checkoutCity, setCheckoutCity] = useState("");
  const [checkoutState, setCheckoutState] = useState("");
  const [checkoutCountry, setCheckoutCountry] = useState("India");
  const [checkoutPincode, setCheckoutPincode] = useState("");
  const [phone, setPhone] = useState(user?.phone || "");
  const [selectedSlot, setSelectedSlot] = useState("morning");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);
  const [rewardPointsToRedeem, setRewardPointsToRedeem] = useState(0);

  const { data: savedAddresses = [] } = useQuery<Address[]>({
    queryKey: ["/api/addresses"],
    enabled: !!user,
  });

  useEffect(() => {
    if (savedAddresses.length > 0 && !selectedAddressId && !showNewAddress) {
      const defaultAddr = savedAddresses.find(a => a.isDefault) || savedAddresses[0];
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
        setAddress(defaultAddr.fullAddress);
      }
    }
  }, [savedAddresses, selectedAddressId, showNewAddress]);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });
  const { data: membership } = useQuery<any>({ queryKey: ["/api/grocery/subscription/me"], enabled: !!user });
  const { data: rewards } = useQuery<any>({ queryKey: ["/api/grocery/rewards"], enabled: !!user });

  const handleSelectAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setAddress(addr.fullAddress);
    setShowNewAddress(false);
  };

  const handleNewAddress = () => {
    setSelectedAddressId(null);
    setAddress("");
    setShowNewAddress(true);
  };

  const getLabelIcon = (label: string) => {
    switch (label?.toLowerCase()) {
      case 'home': return Home;
      case 'work': return Briefcase;
      default: return MapPinned;
    }
  };

  const getVariantMultiplier = (variant: string | null | undefined): number => {
    if (!variant) return 1;
    switch (variant) {
      case "250g": return 0.25;
      case "500g": return 0.5;
      case "1kg": return 1;
      default: return 1;
    }
  };

  const getItemPrice = (item: CartItemWithProduct): number => {
    const basePrice = parseFloat(item.product.price);
    const multiplier = getVariantMultiplier(item.variant);
    return Math.round(basePrice * multiplier * 100) / 100;
  };

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + getItemPrice(item) * (item.quantity || 1);
  }, 0);

  const isSubscriber = !!membership?.active;
  const subscriberDiscount = isSubscriber ? cartItems.reduce((sum, item) => {
    const discount = (item.product as any).subscriberDeal ? Number((item.product as any).subscriberDiscountPercent || 0) : 0;
    return sum + getItemPrice(item) * (item.quantity || 1) * discount / 100;
  }, 0) : 0;
  const baseDeliveryFee = subtotal > 500 ? 0 : 40;
  const deliveryFee = isSubscriber ? 0 : baseDeliveryFee;
  const savedDeliveryFee = isSubscriber ? baseDeliveryFee : 0;
  const availablePoints = Number(rewards?.wallet?.pointsBalance || 0);
  const redeemValue = Math.min(rewardPointsToRedeem, availablePoints, Math.floor(Math.max(0, subtotal - subscriberDiscount)));
  const total = Math.max(0, subtotal + deliveryFee - subscriberDiscount - redeemValue);
  const quickItemsCount = cartItems.filter(item => isFastDeliveryProduct(item.product)).length;
  const hasQuickItems = quickItemsCount > 0;
  const hasMixedQuickCart = hasQuickItems && quickItemsCount < cartItems.length;

  const createRazorpayOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payment/create-order", {
        amount: total,
      });
      return res.json();
    },
  });

  const verifyPaymentMutation = useMutation({
    mutationFn: async (paymentData: {
      razorpay_order_id: string;
      razorpay_payment_id: string;
      razorpay_signature: string;
    }) => {
      const res = await apiRequest("POST", "/api/payment/verify", paymentData);
      return res.json();
    },
  });

  const placeOrderMutation = useMutation({
    mutationFn: async (paymentId?: string) => {
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        name: item.variant ? `${item.product.name} - ${item.variant}` : item.product.name,
        price: getItemPrice(item).toString(),
        quantity: item.quantity || 1,
        image: item.product.image,
      }));

      let deliveryAddr = address;
      if (showNewAddress || savedAddresses.length === 0) {
        deliveryAddr = [address, addressLine2, checkoutCity, checkoutState, checkoutCountry, checkoutPincode].filter(Boolean).join(", ");
      }

      const res = await apiRequest("POST", "/api/orders", {
        items: orderItems,
        totalAmount: total.toString(),
        deliveryAddress: deliveryAddr,
        deliverySlot: deliverySlots.find(s => s.id === selectedSlot)?.time,
        paymentMethod: paymentId ? "razorpay" : "cod",
        paymentId,
        rewardPointsToRedeem: redeemValue,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setOrderPlaced(true);
      setIsProcessingPayment(false);
    },
    onError: (error: Error) => {
      setIsProcessingPayment(false);
      toast({
        title: "Order failed",
        description: error.message || "Could not place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleRazorpayPayment = async () => {
    if (!window.Razorpay) {
      toast({
        title: "Payment Error",
        description: "Payment gateway not loaded. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);

    try {
      const orderData = await createRazorpayOrderMutation.mutateAsync();

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "City Bell",
        description: "Order Payment",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });

            await placeOrderMutation.mutateAsync(response.razorpay_payment_id);
          } catch (err) {
            setIsProcessingPayment(false);
            toast({
              title: "Payment Failed",
              description: "Payment verification failed. Please try again.",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user?.name || user?.username || "",
          email: user?.email || "",
          contact: phone,
        },
        theme: {
          color: "#22C543",
        },
        modal: {
          ondismiss: () => {
            setIsProcessingPayment(false);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setIsProcessingPayment(false);
      toast({
        title: "Payment Error",
        description: "Could not initiate payment. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePlaceOrder = () => {
    if (paymentMethod === "online") {
      handleRazorpayPayment();
    } else {
      placeOrderMutation.mutate(undefined);
    }
  };

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Order Placed!</h2>
            <p className="text-gray-500 mb-6">
              Your order has been placed successfully. We'll deliver it to you soon.
            </p>
            <div className="space-y-3">
              <Button 
                onClick={() => setLocation("/orders")}
                className="w-full bg-primary text-white"
                data-testid="button-view-orders"
              >
                View Orders
              </Button>
              <Button 
                onClick={() => setLocation("/grocery")}
                variant="outline"
                className="w-full"
                data-testid="button-continue-shopping"
              >
                Continue Shopping
              </Button>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }

  if (cartItems.length === 0) {
    setLocation("/cart");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-36">
      <Header />
      
      <main className="px-4 py-4 max-w-lg mx-auto space-y-6">
        <h1 className="text-xl font-bold text-gray-800">Checkout</h1>
        <FastDeliveryCartNotice items={cartItems} pincode={checkoutPincode} />
        {isSubscriber && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <div className="flex items-center gap-2">
              <SubscriberBadge />
              <span className="font-semibold">You saved Rs {(subscriberDiscount + savedDeliveryFee + redeemValue).toFixed(2)} with subscription</span>
            </div>
            <p className="mt-1 text-xs">Free delivery, subscriber deals, reward redemption, and priority delivery are rechecked on the server.</p>
          </div>
        )}

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-gray-800">Delivery Address</h2>
          </div>
          
          {savedAddresses.length > 0 && (
            <div className="space-y-2 mb-4">
              <Label className="text-gray-600">Saved Addresses</Label>
              <div className="space-y-2">
                {savedAddresses.map((addr) => {
                  const LabelIcon = getLabelIcon(addr.label || 'other');
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                        selectedAddressId === addr.id && !showNewAddress
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      data-testid={`address-${addr.id}`}
                    >
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <LabelIcon className="h-4 w-4 text-gray-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm capitalize">{addr.label || 'Other'}</span>
                          {addr.isDefault && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">
                          {addr.addressLine1 
                            ? [addr.addressLine1, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
                            : addr.fullAddress}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === addr.id && !showNewAddress
                            ? 'border-primary bg-primary'
                            : 'border-gray-300'
                        }`}>
                          {selectedAddressId === addr.id && !showNewAddress && (
                            <div className="w-2 h-2 bg-white rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div
                  onClick={handleNewAddress}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                    showNewAddress
                      ? 'border-primary bg-primary/5'
                      : 'border-dashed border-gray-300 hover:border-gray-400'
                  }`}
                  data-testid="add-new-address"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Use a different address</span>
                </div>
              </div>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1"
                data-testid="input-phone"
              />
            </div>
            {(showNewAddress || savedAddresses.length === 0) && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="addressLine1">Address Line 1 *</Label>
                  <Input
                    id="addressLine1"
                    placeholder="House/Flat No, Street, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                    data-testid="input-address"
                  />
                </div>
                <div>
                  <Label htmlFor="addressLine2">Address Line 2</Label>
                  <Input
                    id="addressLine2"
                    placeholder="Landmark, Colony, Sector (Optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="mt-1"
                    data-testid="input-address-line2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="checkoutCity">City *</Label>
                    <Input
                      id="checkoutCity"
                      placeholder="City"
                      value={checkoutCity}
                      onChange={(e) => setCheckoutCity(e.target.value)}
                      className="mt-1"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkoutState">State *</Label>
                    <Input
                      id="checkoutState"
                      placeholder="State"
                      value={checkoutState}
                      onChange={(e) => setCheckoutState(e.target.value)}
                      className="mt-1"
                      data-testid="input-state"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="checkoutCountry">Country *</Label>
                    <Input
                      id="checkoutCountry"
                      placeholder="Country"
                      value={checkoutCountry}
                      onChange={(e) => setCheckoutCountry(e.target.value)}
                      className="mt-1"
                      data-testid="input-country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkoutPincode">Pincode *</Label>
                    <Input
                      id="checkoutPincode"
                      placeholder="Pincode"
                      value={checkoutPincode}
                      onChange={(e) => setCheckoutPincode(e.target.value)}
                      className="mt-1"
                      data-testid="input-pincode"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-gray-800">Delivery Slot</h2>
          </div>
          {hasQuickItems && (
            <div className="mb-3 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-900">
              <div className="flex items-center gap-2 font-semibold">
                <FastDeliveryBadge compact />
                <span>{hasMixedQuickCart ? "Some items qualify for 10-minute delivery" : "This cart qualifies for 10-minute delivery"}</span>
              </div>
              <p className="mt-1 text-xs">
                {hasMixedQuickCart ? "Normal items will follow your selected delivery slot." : "Final availability is checked again when the order is placed."}
              </p>
            </div>
          )}
          
          <RadioGroup value={selectedSlot} onValueChange={setSelectedSlot}>
            <div className="space-y-3">
              {deliverySlots.map((slot) => (
                <div 
                  key={slot.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                    selectedSlot === slot.id ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}
                  onClick={() => setSelectedSlot(slot.id)}
                  data-testid={`slot-${slot.id}`}
                >
                  <RadioGroupItem value={slot.id} id={slot.id} />
                  <Label htmlFor={slot.id} className="flex-1 cursor-pointer">
                    <span className="font-medium">{slot.label}</span>
                    <span className="text-gray-500 ml-2 text-sm">{slot.time}</span>
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-gray-800">Payment Method</h2>
          </div>
          
          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="space-y-3">
              <div 
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                  paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('cod')}
                data-testid="payment-cod"
              >
                <RadioGroupItem value="cod" id="cod" />
                <Banknote className="h-5 w-5 text-gray-600" />
                <Label htmlFor="cod" className="flex-1 cursor-pointer">
                  <span className="font-medium">Cash on Delivery</span>
                </Label>
              </div>
              <div 
                className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${
                  paymentMethod === 'online' ? 'border-primary bg-primary/5' : 'border-gray-200'
                }`}
                onClick={() => setPaymentMethod('online')}
                data-testid="payment-online"
              >
                <RadioGroupItem value="online" id="online" />
                <CreditCard className="h-5 w-5 text-gray-600" />
                <Label htmlFor="online" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Pay Online</span>
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xs text-gray-500 block">UPI, Cards, Net Banking, Wallets</span>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Items ({cartItems.length})</span>
              <span className="font-medium">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Fee</span>
              <span className={deliveryFee === 0 ? "text-green-600 font-medium" : "font-medium"}>
                {deliveryFee === 0 ? "FREE" : `₹${deliveryFee.toFixed(2)}`}
              </span>
            </div>
            {isSubscriber && subscriberDiscount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Subscriber Discount</span>
                <span className="font-medium text-purple-700">- Rs {subscriberDiscount.toFixed(2)}</span>
              </div>
            )}
            {isSubscriber && savedDeliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Delivery Fee Waived</span>
                <span className="font-medium text-emerald-700">- Rs {savedDeliveryFee.toFixed(2)}</span>
              </div>
            )}
            {isSubscriber && (
              <div className="rounded-lg bg-gray-50 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Rewards Balance</span>
                  <span className="font-medium">{availablePoints} points</span>
                </div>
                <Input
                  type="number"
                  min="0"
                  max={availablePoints}
                  value={rewardPointsToRedeem}
                  onChange={(e) => setRewardPointsToRedeem(Number(e.target.value || 0))}
                  className="mt-2"
                  placeholder="Redeem points"
                />
                {redeemValue > 0 && <p className="mt-1 text-xs text-emerald-700">Redeeming Rs {redeemValue.toFixed(2)}</p>}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">Delivery Estimate</span>
              <span className="font-medium text-emerald-700">
                {isSubscriber ? "Priority delivery" : hasMixedQuickCart ? "10 min + standard slot" : hasQuickItems ? "10 min delivery" : "Standard slot"}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t text-base font-bold">
              <span>Total</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </main>
      
      <div className="fixed bottom-16 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
        <div className="max-w-lg mx-auto">
          <Button 
            onClick={handlePlaceOrder}
            disabled={!address || !phone || ((showNewAddress || savedAddresses.length === 0) && (!checkoutCity || !checkoutState || !checkoutPincode)) || placeOrderMutation.isPending || isProcessingPayment}
            className="w-full bg-primary text-white font-semibold py-6"
            data-testid="button-place-order"
          >
            {isProcessingPayment 
              ? "Processing Payment..." 
              : placeOrderMutation.isPending 
                ? "Placing Order..." 
                : paymentMethod === 'online'
                  ? `Pay ₹${total.toFixed(2)}`
                  : `Place Order • ₹${total.toFixed(2)}`
            }
          </Button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
