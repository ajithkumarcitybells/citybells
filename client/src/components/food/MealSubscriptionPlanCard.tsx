import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { MealSubscriptionPlan } from "@/Data/meal-subscription-plans";
import { CheckCircle2, Clock3, UtensilsCrossed } from "lucide-react";

interface MealSubscriptionPlanCardProps {
  plan: MealSubscriptionPlan;
  isSelected: boolean;
  isSubscribed: boolean;
  onSelect: (planId: string) => void;
  onSubscribe: (plan: MealSubscriptionPlan) => void;
}

export function MealSubscriptionPlanCard({
  plan,
  isSelected,
  isSubscribed,
  onSelect,
  onSubscribe,
}: MealSubscriptionPlanCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-gray-200 transition-all duration-200 active:scale-[0.99]",
        isSelected ? "ring-2 ring-orange-400 border-orange-200 shadow-lg" : "hover:shadow-md",
      )}
      data-testid={`card-meal-plan-${plan.id}`}
    >
      <button
        type="button"
        onClick={() => onSelect(plan.id)}
        className="w-full text-left"
        data-testid={`button-select-meal-plan-${plan.id}`}
      >
        <div className={cn("bg-gradient-to-r px-5 py-4", plan.accentClassName)}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-white/80">{plan.badge}</p>
              <h3 className="mt-1 text-xl font-bold text-white">{plan.name}</h3>
              <p className="mt-1 text-sm text-white/85">{plan.subtitle}</p>
            </div>
            <div className="rounded-2xl bg-white/18 px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-xl font-bold text-white">₹{plan.price}</p>
              <p className="text-xs text-white/80">{plan.priceLabel}</p>
            </div>
          </div>
        </div>
      </button>

      <CardContent className="space-y-4 p-5">
        <p className="text-sm leading-6 text-gray-600">{plan.description}</p>

        <div className="flex flex-wrap gap-2">
          {plan.mealTypes.map((mealType) => (
            <Badge
              key={mealType}
              variant="outline"
              className="rounded-full border-orange-200 bg-orange-50 text-orange-700"
            >
              <UtensilsCrossed className="mr-1 h-3.5 w-3.5" />
              {mealType}
            </Badge>
          ))}
          <Badge variant="outline" className="rounded-full border-slate-200 bg-slate-50 text-slate-700">
            {plan.mealsPerCycle}
          </Badge>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">Delivery time slots</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {plan.deliverySlots.map((slot) => (
              <div key={slot.id} className="rounded-2xl border border-gray-100 bg-gray-50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <Clock3 className="h-4 w-4 text-orange-500" />
                  {slot.label}
                </div>
                <p className="mt-1 text-xs text-gray-500">{slot.window}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {plan.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2 text-sm text-gray-600">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Button
          type="button"
          onClick={() => onSubscribe(plan)}
          className={cn(
            "w-full rounded-2xl transition-transform duration-150 active:scale-95",
            isSubscribed && "bg-emerald-600 border-emerald-600",
          )}
          data-testid={`button-subscribe-meal-plan-${plan.id}`}
        >
          {isSubscribed ? "Subscribed" : "Subscribe"}
        </Button>
      </CardContent>
    </Card>
  );
}
