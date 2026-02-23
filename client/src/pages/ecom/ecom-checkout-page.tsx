import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapPin, CreditCard, Banknote, Check, Shield, Home, Briefcase, MapPinned, Plus } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { EcomCartItemWithProduct, Address } from "@shared/schema";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function EcomCheckoutPage() {
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
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [showNewAddress, setShowNewAddress] = useState(false);

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

  const { data: cartItems = [] } = useQuery<EcomCartItemWithProduct[]>({
    queryKey: ["/api/ecom/cart"],
    enabled: !!user,
  });

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

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.price) * (item.quantity || 1);
  }, 0);

  const originalTotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.originalPrice) * (item.quantity || 1);
  }, 0);

  const savings = originalTotal - subtotal;
  const deliveryFee = subtotal > 999 ? 0 : 49;
  const total = subtotal + deliveryFee;

  const createRazorpayOrderMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/payment/create-order", { amount: total });
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
        price: item.product.price,
        quantity: item.quantity || 1,
        image: item.product.images && (item.product.images as string[]).length > 0
          ? (item.product.images as string[])[0]
          : undefined,
        variant: item.variant || undefined,
        vendorId: item.product.vendorId || undefined,
      }));

      let deliveryAddr = address;
      if (showNewAddress || savedAddresses.length === 0) {
        deliveryAddr = [address, addressLine2, checkoutCity, checkoutState, checkoutCountry, checkoutPincode].filter(Boolean).join(", ");
      }

      const res = await apiRequest("POST", "/api/ecom/orders", {
        items: orderItems,
        totalAmount: total.toString(),
        deliveryAddress: deliveryAddr,
        paymentMethod: paymentId ? "razorpay" : "cod",
        paymentId,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/ecom/orders"] });
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
        description: "E-Commerce Order Payment",
        order_id: orderData.orderId,
        handler: async (response: any) => {
          try {
            await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            await placeOrderMutation.mutateAsync(response.razorpay_payment_id);
          } catch {
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
        theme: { color: "#22C543" },
        modal: {
          ondismiss: () => setIsProcessingPayment(false),
        },
      };

      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch {
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
      <div className="min-h-screen bg-background pb-20">
        <Header />
        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center">
            <div className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold mb-2" data-testid="text-order-success">Order Placed!</h2>
            <p className="text-muted-foreground mb-6">
              Your order has been placed successfully. You can track it from your orders page.
            </p>
            <div className="space-y-3">
              <Button
                onClick={() => setLocation("/ecommerce/orders")}
                className="w-full"
                data-testid="button-view-orders"
              >
                View Orders
              </Button>
              <Button
                onClick={() => setLocation("/ecommerce")}
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
    setLocation("/ecommerce/cart");
    return null;
  }

  const isFormValid = address && phone && (
    (!showNewAddress && savedAddresses.length > 0) ||
    (checkoutCity && checkoutState && checkoutPincode)
  );

  return (
    <div className="min-h-screen bg-background pb-36">
      <Header />

      <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <h1 className="text-xl font-bold" data-testid="text-page-title">Checkout</h1>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Delivery Address</h2>
          </div>

          {savedAddresses.length > 0 && (
            <div className="space-y-2 mb-4">
              <Label className="text-muted-foreground">Saved Addresses</Label>
              <div className="space-y-2">
                {savedAddresses.map((addr) => {
                  const LabelIcon = getLabelIcon(addr.label || 'other');
                  return (
                    <div
                      key={addr.id}
                      onClick={() => handleSelectAddress(addr)}
                      className={`flex items-start gap-3 p-3 rounded-md border-2 cursor-pointer transition-colors ${
                        selectedAddressId === addr.id && !showNewAddress
                          ? 'border-primary bg-primary/5'
                          : 'border-border'
                      }`}
                      data-testid={`address-${addr.id}`}
                    >
                      <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center flex-shrink-0">
                        <LabelIcon className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm capitalize">{addr.label || 'Other'}</span>
                          {addr.isDefault && (
                            <Badge variant="secondary" className="text-xs">Default</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground truncate">
                          {addr.addressLine1
                            ? [addr.addressLine1, addr.city, addr.state, addr.pincode].filter(Boolean).join(", ")
                            : addr.fullAddress}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedAddressId === addr.id && !showNewAddress
                            ? 'border-primary bg-primary'
                            : 'border-muted-foreground/40'
                        }`}>
                          {selectedAddressId === addr.id && !showNewAddress && (
                            <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div
                  onClick={handleNewAddress}
                  className={`flex items-center gap-3 p-3 rounded-md border-2 cursor-pointer transition-colors ${
                    showNewAddress
                      ? 'border-primary bg-primary/5'
                      : 'border-dashed border-muted-foreground/30'
                  }`}
                  data-testid="add-new-address"
                >
                  <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                    <Plus className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm font-medium">Use a different address</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <Label htmlFor="ecom-phone">Phone Number</Label>
              <Input
                id="ecom-phone"
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
                  <Label htmlFor="ecom-addr1">Address Line 1 *</Label>
                  <Input
                    id="ecom-addr1"
                    placeholder="House/Flat No, Street, Area"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="mt-1"
                    data-testid="input-address"
                  />
                </div>
                <div>
                  <Label htmlFor="ecom-addr2">Address Line 2</Label>
                  <Input
                    id="ecom-addr2"
                    placeholder="Landmark, Colony (Optional)"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="mt-1"
                    data-testid="input-address-line2"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="ecom-city">City *</Label>
                    <Input
                      id="ecom-city"
                      placeholder="City"
                      value={checkoutCity}
                      onChange={(e) => setCheckoutCity(e.target.value)}
                      className="mt-1"
                      data-testid="input-city"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ecom-state">State *</Label>
                    <Input
                      id="ecom-state"
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
                    <Label htmlFor="ecom-country">Country *</Label>
                    <Input
                      id="ecom-country"
                      placeholder="Country"
                      value={checkoutCountry}
                      onChange={(e) => setCheckoutCountry(e.target.value)}
                      className="mt-1"
                      data-testid="input-country"
                    />
                  </div>
                  <div>
                    <Label htmlFor="ecom-pincode">Pincode *</Label>
                    <Input
                      id="ecom-pincode"
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
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <CreditCard className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold">Payment Method</h2>
          </div>

          <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
            <div className="space-y-3">
              <div
                className={`flex items-center space-x-3 p-3 rounded-md border-2 transition-colors cursor-pointer ${
                  paymentMethod === 'cod' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setPaymentMethod('cod')}
                data-testid="payment-cod"
              >
                <RadioGroupItem value="cod" id="ecom-cod" />
                <Banknote className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="ecom-cod" className="flex-1 cursor-pointer">
                  <span className="font-medium">Cash on Delivery</span>
                </Label>
              </div>
              <div
                className={`flex items-center space-x-3 p-3 rounded-md border-2 transition-colors cursor-pointer ${
                  paymentMethod === 'online' ? 'border-primary bg-primary/5' : 'border-border'
                }`}
                onClick={() => setPaymentMethod('online')}
                data-testid="payment-online"
              >
                <RadioGroupItem value="online" id="ecom-online" />
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <Label htmlFor="ecom-online" className="flex-1 cursor-pointer">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium">Pay Online</span>
                    <Shield className="h-4 w-4 text-green-600" />
                  </div>
                  <span className="text-xs text-muted-foreground block">UPI, Cards, Net Banking, Wallets</span>
                </Label>
              </div>
            </div>
          </RadioGroup>
        </Card>

        <Card className="p-4">
          <h2 className="font-semibold mb-3">Order Summary</h2>
          <div className="space-y-2 text-sm">
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between gap-2">
                <span className="text-muted-foreground truncate flex-1">
                  {item.product.name}
                  {item.variant ? ` (${item.variant})` : ''}
                  {' x '}{item.quantity || 1}
                </span>
                <span className="font-medium flex-shrink-0">
                  ₹{(parseFloat(item.product.price) * (item.quantity || 1)).toFixed(0)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-medium">₹{subtotal.toFixed(0)}</span>
              </div>
              {savings > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Savings</span>
                  <span className="font-medium">-₹{savings.toFixed(0)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery Fee</span>
                <span className={deliveryFee === 0 ? "text-green-600 font-medium" : "font-medium"}>
                  {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
                </span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base font-bold">
                <span>Total</span>
                <span className="text-primary" data-testid="text-total">₹{total.toFixed(0)}</span>
              </div>
            </div>
          </div>
        </Card>
      </main>

      <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-4 safe-area-pb z-40">
        <div className="max-w-lg mx-auto">
          <Button
            onClick={handlePlaceOrder}
            disabled={!isFormValid || placeOrderMutation.isPending || isProcessingPayment}
            className="w-full font-semibold"
            data-testid="button-place-order"
          >
            {isProcessingPayment
              ? "Processing Payment..."
              : placeOrderMutation.isPending
                ? "Placing Order..."
                : paymentMethod === 'online'
                  ? `Pay ₹${total.toFixed(0)}`
                  : `Place Order - ₹${total.toFixed(0)}`
            }
          </Button>
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
