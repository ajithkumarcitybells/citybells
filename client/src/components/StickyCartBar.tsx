import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { useLocation } from "wouter";

export default function StickyCartBar() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: cart = [] } = useQuery<any[]>({
    queryKey: ['/api/cart'],
    enabled: !!user,
  });

  const count = cart.reduce((s, i) => s + (i.quantity || 0), 0);
  const total = cart.reduce((s, i) => s + (parseFloat(i.product?.price || '0') * (i.quantity || 0)), 0);

  if (!user || count === 0) return null;

  return (
    <div className="fixed left-4 right-4 bottom-4 z-50">
      <div className="bg-white rounded-2xl shadow-lg p-3 flex items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">{count} item{count>1?'s':''}</div>
          <div className="text-sm text-gray-500">₹{total.toFixed(2)}</div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={() => setLocation('/cart')}>View Cart</Button>
          <Button onClick={() => setLocation('/checkout')} className="bg-primary text-white">Checkout</Button>
        </div>
      </div>
    </div>
  );
}
