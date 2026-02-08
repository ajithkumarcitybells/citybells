import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Product } from "@shared/schema";

interface WeightOption {
  label: string;
  multiplier: number;
  popular?: boolean;
}

const WEIGHT_OPTIONS: WeightOption[] = [
  { label: "250g", multiplier: 0.25 },
  { label: "500g", multiplier: 0.5, popular: true },
  { label: "1kg", multiplier: 1 },
];

const LAST_WEIGHT_KEY = "citybell_last_fruit_weight";

interface WeightPickerModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAddToCart: (variant: string) => void;
  isPending?: boolean;
}

export function WeightPickerModal({ product, open, onClose, onAddToCart, isPending }: WeightPickerModalProps) {
  const [selectedWeight, setSelectedWeight] = useState<string>(() => {
    const saved = localStorage.getItem(LAST_WEIGHT_KEY);
    return saved || "500g";
  });

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(LAST_WEIGHT_KEY);
      setSelectedWeight(saved || "500g");
    }
  }, [open]);

  if (!open) return null;

  const basePrice = parseFloat(product.price);
  const baseOriginalPrice = parseFloat(product.originalPrice);

  const getPrice = (multiplier: number) => Math.round(basePrice * multiplier * 100) / 100;
  const getOriginalPrice = (multiplier: number) => Math.round(baseOriginalPrice * multiplier * 100) / 100;

  const selectedOption = WEIGHT_OPTIONS.find(o => o.label === selectedWeight)!;
  const currentPrice = getPrice(selectedOption.multiplier);
  const currentOriginalPrice = getOriginalPrice(selectedOption.multiplier);

  const handleAdd = () => {
    localStorage.setItem(LAST_WEIGHT_KEY, selectedWeight);
    onAddToCart(selectedWeight);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom duration-300 safe-area-pb"
        data-testid="modal-weight-picker"
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-full bg-gray-100"
          data-testid="button-close-weight-picker"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex items-center gap-4 mb-5">
          <div className="w-20 h-20 bg-gray-50 rounded-xl overflow-hidden flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-lg">{product.name}</h3>
            <p className="text-sm text-gray-500">Select weight</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-5">
          {WEIGHT_OPTIONS.map((option) => {
            const isSelected = selectedWeight === option.label;
            const price = getPrice(option.multiplier);
            return (
              <button
                key={option.label}
                onClick={() => setSelectedWeight(option.label)}
                className={`relative rounded-xl border-2 p-3 text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200"
                }`}
                data-testid={`option-weight-${option.label}`}
              >
                {option.popular && (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-white text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap">
                    Popular
                  </span>
                )}
                <p className={`font-bold text-base ${isSelected ? "text-primary" : "text-gray-800"}`}>
                  {option.label}
                </p>
                <p className={`text-sm font-medium mt-1 ${isSelected ? "text-primary" : "text-gray-600"}`}>
                  ₹{price.toFixed(0)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-xl p-4 mb-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">
                {product.name} - {selectedWeight}
              </p>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold text-primary">₹{currentPrice.toFixed(0)}</span>
              {product.discountPercent && product.discountPercent > 0 && (
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-xs text-gray-400 line-through">₹{currentOriginalPrice.toFixed(0)}</span>
                  <span className="text-xs font-medium text-green-600">{product.discountPercent}% off</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={onClose}
            data-testid="button-cancel-weight"
          >
            Cancel
          </Button>
          <Button
            className="flex-1 bg-primary text-white"
            onClick={handleAdd}
            disabled={isPending}
            data-testid="button-confirm-add-cart"
          >
            {isPending ? "Adding..." : "Add to Cart"}
          </Button>
        </div>
      </div>
    </div>
  );
}
