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

const PIECE_OPTIONS: WeightOption[] = [
  { label: "1 Pc", multiplier: 1 },
  { label: "2 Pcs", multiplier: 2, popular: true },
  { label: "5 Pcs", multiplier: 5 },
];

const BUNCH_OPTIONS: WeightOption[] = [
  { label: "1 Bunch", multiplier: 1 },
  { label: "2 Bunch", multiplier: 2, popular: true },
  { label: "3 Bunch", multiplier: 3 },
];

function getOptionsForUnit(unit?: string): WeightOption[] {
  if (unit === "Pieces") return PIECE_OPTIONS;
  if (unit === "Bunch") return BUNCH_OPTIONS;
  return WEIGHT_OPTIONS;
}

function getDefaultForUnit(unit?: string): string {
  if (unit === "Pieces") return "2 Pcs";
  if (unit === "Bunch") return "2 Bunch";
  return "500g";
}

const LAST_WEIGHT_KEY = "citybell_last_fruit_weight";

interface WeightPickerModalProps {
  product: Product;
  open: boolean;
  onClose: () => void;
  onAddToCart: (variant: string) => void;
  isPending?: boolean;
}

export function WeightPickerModal({ product, open, onClose, onAddToCart, isPending }: WeightPickerModalProps) {
  const options = getOptionsForUnit(product.unit ?? undefined);
  const defaultOption = getDefaultForUnit(product.unit ?? undefined);
  const storageKey = `${LAST_WEIGHT_KEY}_${product.unit || "Kg"}`;

  const [selectedWeight, setSelectedWeight] = useState<string>(() => {
    const saved = localStorage.getItem(storageKey);
    return saved && options.some(o => o.label === saved) ? saved : defaultOption;
  });

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem(storageKey);
      setSelectedWeight(saved && options.some(o => o.label === saved) ? saved : defaultOption);
    }
  }, [open, storageKey, defaultOption, options]);

  if (!open) return null;

  const basePrice = parseFloat(product.price);
  const baseOriginalPrice = parseFloat(product.originalPrice);

  const getPrice = (multiplier: number) => Math.round(basePrice * multiplier * 100) / 100;
  const getOriginalPrice = (multiplier: number) => Math.round(baseOriginalPrice * multiplier * 100) / 100;

  const selectedOption = options.find(o => o.label === selectedWeight) || options[0];
  const currentPrice = getPrice(selectedOption.multiplier);
  const currentOriginalPrice = getOriginalPrice(selectedOption.multiplier);

  const handleAdd = () => {
    localStorage.setItem(storageKey, selectedWeight);
    onAddToCart(selectedWeight);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div
        className="relative bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl p-4 pb-3 animate-in slide-in-from-bottom duration-300"
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom, 12px))' }}
        data-testid="modal-weight-picker"
      >
        <div className="flex items-center gap-3 mb-3">
          <div className="w-14 h-14 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
            {product.image ? (
              <img src={product.image} alt={product.name} className="w-full h-full object-contain" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-green-100 to-green-200" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-800 text-base leading-tight">{product.name}</h3>
            <p className="text-xs text-gray-500">{product.unit === "Kg" || !product.unit ? "Select weight" : "Select quantity"}</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button
              size="sm"
              className="bg-primary text-white"
              onClick={handleAdd}
              disabled={isPending}
              data-testid="button-confirm-add-cart"
            >
              {isPending ? "Adding..." : "Add to Cart"}
            </Button>
            <button
              onClick={onClose}
              className="p-1 rounded-full bg-gray-100"
              data-testid="button-close-weight-picker"
            >
              <X className="h-4 w-4 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          {options.map((option) => {
            const isSelected = selectedWeight === option.label;
            const price = getPrice(option.multiplier);
            return (
              <button
                key={option.label}
                onClick={() => setSelectedWeight(option.label)}
                className={`relative rounded-lg border-2 py-2 px-2 text-center transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-gray-200"
                }`}
                data-testid={`option-weight-${option.label}`}
              >
                {option.popular && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap">
                    Popular
                  </span>
                )}
                <p className={`font-bold text-sm ${isSelected ? "text-primary" : "text-gray-800"}`}>
                  {option.label}
                </p>
                <p className={`text-xs font-medium ${isSelected ? "text-primary" : "text-gray-600"}`}>
                  ₹{price.toFixed(0)}
                </p>
              </button>
            );
          })}
        </div>

        <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 truncate mr-2">
              {product.name} - {selectedWeight}
            </p>
            <div className="text-right flex-shrink-0">
              <span className="text-lg font-bold text-primary">₹{currentPrice.toFixed(0)}</span>
              {product.discountPercent && product.discountPercent > 0 && (
                <div className="flex items-center gap-1 justify-end">
                  <span className="text-[10px] text-gray-400 line-through">₹{currentOriginalPrice.toFixed(0)}</span>
                  <span className="text-[10px] font-medium text-green-600">{product.discountPercent}% off</span>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
