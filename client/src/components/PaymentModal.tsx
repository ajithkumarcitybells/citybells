import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Lock, AlertCircle } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  rideId: string;
  amount: number;
  onClose: () => void;
  onPaymentSuccess: (paymentId: string) => void;
  onPaymentError: (error: string) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function PaymentModal({
  isOpen,
  rideId,
  amount,
  onClose,
  onPaymentSuccess,
  onPaymentError,
}: PaymentModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("card");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods] = useState([
    { id: "card", label: "Credit/Debit Card", icon: "💳" },
    { id: "upi", label: "UPI", icon: "📱" },
    { id: "wallet", label: "Wallet", icon: "👛" },
    { id: "cash", label: "Cash on Delivery", icon: "💵" },
  ]);

  useEffect(() => {
    // Load Razorpay script
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  const handlePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      // For cash payment, skip Razorpay
      if (selectedMethod === "cash") {
        // Update ride payment status without actual payment
        const res = await fetch(`/api/rides/${rideId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentMethod: "cash",
            paymentStatus: "pending",
          }),
        });

        if (!res.ok) throw new Error("Failed to set payment method");
        onPaymentSuccess("cash_pending");
        onClose();
        return;
      }

      // Create payment order
      const orderRes = await fetch("/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rideId,
          amount,
          paymentMethod: selectedMethod,
        }),
      });

      if (!orderRes.ok) throw new Error("Failed to create payment order");

      const orderData = await orderRes.json();

      // Open Razorpay checkout
      const options = {
        key: orderData.key,
        amount: orderData.amount * 100, // Convert to paise
        currency: orderData.currency,
        name: "City Serve Hub",
        description: orderData.description,
        order_id: orderData.orderId,
        image: "/logo.png",
        handler: async (response: any) => {
          try {
            // Verify payment
            const verifyRes = await fetch("/api/payments/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                orderId: response.razorpay_order_id,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
              }),
            });

            if (!verifyRes.ok) throw new Error("Payment verification failed");

            const verifyData = await verifyRes.json();
            onPaymentSuccess(verifyData.paymentId);
            onClose();
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "Payment verification failed";
            setError(errorMsg);
            onPaymentError(errorMsg);
          }
        },
        prefill: {
          name: "",
          email: "",
          contact: "",
        },
        theme: {
          color: "#3b82f6",
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment cancelled");
          },
        },
      };

      if (!window.Razorpay) {
        throw new Error("Razorpay not loaded");
      }

      const razorpay = new window.Razorpay(options);
      razorpay.open();
      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Payment failed";
      setError(errorMsg);
      onPaymentError(errorMsg);
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold">Payment Method</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Amount */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-1">Total Amount</p>
            <p className="text-3xl font-bold text-blue-600">₹{amount.toFixed(0)}</p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-2">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Payment Methods */}
          <div className="space-y-2">
            {paymentMethods.map((method) => (
              <div
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedMethod === method.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{method.icon}</span>
                  <div className="flex-1">
                    <p className="font-semibold">{method.label}</p>
                    {method.id === "cash" && <p className="text-xs text-gray-500">Pay to driver</p>}
                  </div>
                  {selectedMethod === method.id && (
                    <Badge className="bg-blue-600">Selected</Badge>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Info */}
          {selectedMethod !== "cash" && (
            <div className="bg-gray-50 rounded-lg p-3 flex gap-2 text-xs text-gray-600">
              <Lock className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <p>
                Your payment is secured by Razorpay. You will be redirected to their secure payment gateway.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? "Processing..." : `Pay ₹${amount.toFixed(0)}`}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
