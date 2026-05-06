import { Zap, AlertTriangle, Clock, PackageCheck } from "lucide-react";
import { Product, CartItemWithProduct, Order } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Link } from "wouter";

export function isFastDeliveryProduct(product?: Partial<Product> | null): boolean {
  if (!product) return false;
  return product.fastDelivery === true
    && product.fastDeliveryEnabled !== false
    && Number(product.stock ?? 0) > 0
    && Number(product.fastDeliveryStock ?? product.stock ?? 0) > 0;
}

export function FastDeliveryBadge({ compact = false, checkAvailability = false }: { compact?: boolean; checkAvailability?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 font-semibold ${compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-xs"}`}>
      <Zap className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      {checkAvailability ? "Check availability" : compact ? "10 min" : "10 min delivery"}
    </span>
  );
}

export function FastDeliveryFilterChip({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium whitespace-nowrap transition-colors ${
        active ? "bg-emerald-600 text-white" : "bg-white text-gray-700 border border-emerald-200"
      }`}
      aria-pressed={active}
      data-testid="chip-fast-delivery"
    >
      <Zap className="h-3.5 w-3.5" />
      10 min delivery
    </button>
  );
}

export function FastDeliveryProductRail({
  products,
  isLoading,
}: {
  products: Product[];
  isLoading?: boolean;
}) {
  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="h-5 w-44 rounded bg-gray-200 animate-pulse" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-56 w-44 shrink-0 rounded-xl bg-gray-200 animate-pulse" />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3" data-testid="fast-delivery-rail">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">10 Minutes Delivery</h2>
          <p className="text-xs text-gray-500">Quick picks from nearby stock</p>
        </div>
        <FastDeliveryBadge />
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          No 10-minute products available near you.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4">
          {products.slice(0, 12).map((product) => (
            <Link key={product.id} href={`/product/${product.id}`}>
              <div className="w-44 shrink-0 rounded-xl border border-emerald-100 bg-white p-3 shadow-sm">
                <div className="mb-2 aspect-square overflow-hidden rounded-lg bg-emerald-50">
                  {product.image ? (
                    <img src={product.image} alt={product.name} className="h-full w-full object-contain" loading="lazy" />
                  ) : null}
                </div>
                <FastDeliveryBadge compact />
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-gray-800">{product.name}</p>
                <p className="mt-1 text-base font-bold text-primary">Rs {parseFloat(product.price).toFixed(0)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function FastDeliveryCartNotice({ items, pincode }: { items: CartItemWithProduct[]; pincode?: string }) {
  const quickCount = items.filter(item => isFastDeliveryProduct(item.product)).length;
  const normalCount = items.length - quickCount;
  if (items.length === 0) return null;

  const hasMixed = quickCount > 0 && normalCount > 0;
  const hasQuick = quickCount > 0;
  return (
    <div className={`rounded-xl border p-3 text-sm ${hasQuick ? "border-emerald-200 bg-emerald-50 text-emerald-900" : "border-gray-200 bg-white text-gray-600"}`} data-testid="fast-delivery-cart-notice">
      <div className="flex items-start gap-2">
        {hasMixed ? <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" /> : hasQuick ? <Zap className="h-4 w-4 mt-0.5 text-emerald-700" /> : <Clock className="h-4 w-4 mt-0.5" />}
        <div>
          <p className="font-semibold">
            {hasMixed ? "Mixed delivery cart" : hasQuick ? "10-minute delivery available" : "Standard delivery"}
          </p>
          <p className="text-xs mt-0.5">
            {hasMixed
              ? `${quickCount} item${quickCount === 1 ? "" : "s"} can arrive in 10 min. Remaining items follow the selected slot.`
              : hasQuick
                ? pincode ? "Eligible items will be rechecked for your pincode at checkout." : "Add a pincode at checkout to confirm area availability."
                : "No quick-delivery items in this cart."}
          </p>
        </div>
      </div>
    </div>
  );
}

export function FastDeliveryOrderBadge({ order }: { order: Partial<Order> }) {
  if (!order.quickDelivery) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
      <PackageCheck className="h-3 w-3" />
      10 min delivery
    </span>
  );
}

export function AdminFastDeliveryToggle({
  product,
  disabled,
  onToggle,
}: {
  product: Product;
  disabled?: boolean;
  onToggle: (enabled: boolean) => void;
}) {
  const enabled = isFastDeliveryProduct(product);
  return (
    <div className="flex items-center gap-2">
      <Switch
        checked={product.fastDelivery === true && product.fastDeliveryEnabled !== false}
        onCheckedChange={onToggle}
        disabled={disabled || Number(product.stock ?? 0) <= 0}
        aria-label={`Toggle 10 minute delivery for ${product.name}`}
      />
      <span className={enabled ? "text-xs font-medium text-emerald-700" : "text-xs text-gray-500"}>
        {enabled ? "10 min" : "Standard"}
      </span>
    </div>
  );
}

export function AdminFastDeliveryBulkActions({
  count,
  disabled,
  onEnable,
  onDisable,
}: {
  count: number;
  disabled?: boolean;
  onEnable: () => void;
  onDisable: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" onClick={onEnable} disabled={disabled || count === 0}>
        Enable 10-min for selected
      </Button>
      <Button size="sm" variant="outline" onClick={onDisable} disabled={disabled || count === 0}>
        Disable 10-min for selected
      </Button>
    </div>
  );
}
