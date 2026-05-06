import { Crown, Gift, RotateCcw, ShieldCheck, Sparkles, WalletCards } from "lucide-react";
import { Product } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function SubscriberBadge({ compact = false }: { compact?: boolean }) {
  return (
    <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
      <Crown className={compact ? "h-3 w-3 mr-1" : "h-3.5 w-3.5 mr-1"} />
      {compact ? "Member" : "Grocery Subscriber"}
    </Badge>
  );
}

export function SubscriberDealBadge({ discount }: { discount?: number | null }) {
  return (
    <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">
      <Sparkles className="h-3 w-3 mr-1" />
      Subscriber Deal{discount ? ` ${discount}%` : ""}
    </Badge>
  );
}

export function SubscriberPlanCard({ plan, onSubscribe, loading }: { plan: any; onSubscribe: (plan: any) => void; loading?: boolean }) {
  return (
    <Card className="border-amber-100 shadow-sm">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{plan.name}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{plan.description}</p>
          </div>
          {plan.priorityDelivery ? <SubscriberBadge compact /> : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <span className="text-3xl font-bold">Rs {Number(plan.price || 0).toFixed(0)}</span>
          <span className="text-sm text-muted-foreground"> / {plan.durationDays} days</span>
        </div>
        <SubscriberBenefitsList benefits={plan.benefits || []} />
        <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={() => onSubscribe(plan)} disabled={loading}>
          {loading ? "Processing..." : "Subscribe"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function SubscriberBenefitsList({ benefits }: { benefits: string[] }) {
  const list = benefits.length ? benefits : ["Free delivery", "Subscriber deals", "Rewards", "Recurring orders"];
  return (
    <div className="grid gap-2">
      {list.map((benefit) => (
        <div key={benefit} className="flex items-center gap-2 text-sm">
          <ShieldCheck className="h-4 w-4 text-emerald-600" />
          <span>{benefit}</span>
        </div>
      ))}
    </div>
  );
}

export function RewardsWalletCard({ rewards }: { rewards: any }) {
  const wallet = rewards?.wallet || {};
  return (
    <Card className="border-emerald-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <WalletCards className="h-5 w-5 text-emerald-600" />
          Rewards Wallet
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <div className="rounded-lg bg-emerald-50 p-3">
          <p className="text-xs text-emerald-700">Points</p>
          <p className="text-2xl font-bold text-emerald-900">{wallet.pointsBalance || 0}</p>
        </div>
        <div className="rounded-lg bg-amber-50 p-3">
          <p className="text-xs text-amber-700">Cashback</p>
          <p className="text-2xl font-bold text-amber-900">Rs {Number(wallet.cashbackBalance || 0).toFixed(0)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

export function RecurringOrderScheduler({ onSubmit, products = [] }: { onSubmit: (data: any) => void; products?: Product[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <RotateCcw className="h-5 w-5 text-primary" />
          Schedule Repeat Order
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            onSubmit({
              name: form.get("name"),
              frequency: form.get("frequency"),
              startDate: form.get("startDate"),
              deliveryAddress: form.get("deliveryAddress"),
              deliverySlot: form.get("deliverySlot"),
              items: [{ productId: form.get("productId"), quantity: Number(form.get("quantity") || 1) }],
            });
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input name="name" defaultValue="Daily essentials" />
            </div>
            <div>
              <Label>Frequency</Label>
              <Select name="frequency" defaultValue="weekly">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Start Date</Label>
              <Input name="startDate" type="date" required />
            </div>
            <div>
              <Label>Delivery Slot</Label>
              <Input name="deliverySlot" placeholder="7 AM - 9 AM" />
            </div>
          </div>
          <div>
            <Label>Product</Label>
            <Select name="productId" defaultValue={products[0]?.id}>
              <SelectTrigger><SelectValue placeholder="Choose product" /></SelectTrigger>
              <SelectContent>
                {products.slice(0, 30).map(product => <SelectItem key={product.id} value={product.id}>{product.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Qty</Label>
              <Input name="quantity" type="number" min="1" defaultValue="1" />
            </div>
            <div className="col-span-2">
              <Label>Address</Label>
              <Input name="deliveryAddress" required placeholder="Saved address or full address" />
            </div>
          </div>
          <Button className="w-full" type="submit">Create Schedule</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SubscriptionBoxCard({ box }: { box: any }) {
  return (
    <Card className="overflow-hidden">
      <div className="h-28 bg-gradient-to-br from-amber-100 to-emerald-100">
        {box.image ? <img src={box.image} alt={box.name} className="h-full w-full object-cover" /> : null}
      </div>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-semibold">{box.name}</p>
            <p className="text-xs text-muted-foreground">{box.description}</p>
          </div>
          <Badge variant="secondary">{box.cadence}</Badge>
        </div>
        <p className="mt-3 text-lg font-bold">Rs {Number(box.price || 0).toFixed(0)}</p>
      </CardContent>
    </Card>
  );
}

export function DailyEssentialsSubscriptionForm(props: { onSubmit: (data: any) => void; products?: Product[] }) {
  return <RecurringOrderScheduler {...props} />;
}

export function EarlyAccessProductsRail({ products }: { products: Product[] }) {
  const early = products.filter((product: any) => product.earlyAccess).slice(0, 10);
  if (!early.length) return null;
  return (
    <section className="space-y-3">
      <h2 className="flex items-center gap-2 text-lg font-semibold"><Gift className="h-5 w-5 text-amber-600" /> Early Access</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {early.map(product => (
          <div key={product.id} className="w-40 shrink-0 rounded-xl border bg-white p-3">
            <p className="line-clamp-2 text-sm font-semibold">{product.name}</p>
            <SubscriberDealBadge discount={(product as any).subscriberDiscountPercent} />
            <p className="mt-2 font-bold text-primary">Rs {Number(product.price || 0).toFixed(0)}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
