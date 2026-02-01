import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MapPin, Clock, CreditCard, Banknote, Check } from "lucide-react";
import { Header } from "@/components/Header";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { CartItemWithProduct } from "@shared/schema";

const deliverySlots = [
  { id: "morning", label: "Morning", time: "9:00 AM - 12:00 PM" },
  { id: "afternoon", label: "Afternoon", time: "12:00 PM - 4:00 PM" },
  { id: "evening", label: "Evening", time: "4:00 PM - 8:00 PM" },
];

export default function CheckoutPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  const [address, setAddress] = useState(user?.address || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [selectedSlot, setSelectedSlot] = useState("morning");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [orderPlaced, setOrderPlaced] = useState(false);

  const { data: cartItems = [] } = useQuery<CartItemWithProduct[]>({
    queryKey: ["/api/cart"],
    enabled: !!user,
  });

  const subtotal = cartItems.reduce((sum, item) => {
    return sum + parseFloat(item.product.price) * (item.quantity || 1);
  }, 0);

  const deliveryFee = subtotal > 500 ? 0 : 40;
  const total = subtotal + deliveryFee;

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderItems = cartItems.map(item => ({
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity || 1,
        image: item.product.image,
      }));

      const res = await apiRequest("POST", "/api/orders", {
        items: orderItems,
        totalAmount: total.toString(),
        deliveryAddress: address,
        deliverySlot: deliverySlots.find(s => s.id === selectedSlot)?.time,
        paymentMethod,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cart"] });
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      setOrderPlaced(true);
    },
    onError: (error: Error) => {
      toast({
        title: "Order failed",
        description: error.message || "Could not place order. Please try again.",
        variant: "destructive",
      });
    },
  });

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

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-gray-800">Delivery Address</h2>
          </div>
          
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
            <div>
              <Label htmlFor="address">Full Address</Label>
              <Textarea
                id="address"
                placeholder="Enter your delivery address"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="mt-1 resize-none"
                rows={3}
                data-testid="input-address"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <h2 className="font-semibold text-gray-800">Delivery Slot</h2>
          </div>
          
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
                  <span className="font-medium">Online Payment</span>
                  <span className="text-xs text-gray-500 ml-2">(Coming Soon)</span>
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
            onClick={() => placeOrderMutation.mutate()}
            disabled={!address || !phone || placeOrderMutation.isPending}
            className="w-full bg-primary text-white font-semibold py-6"
            data-testid="button-place-order"
          >
            {placeOrderMutation.isPending ? "Placing Order..." : `Place Order • ₹${total.toFixed(2)}`}
          </Button>
        </div>
      </div>
      
      <BottomNav />
    </div>
  );
}
