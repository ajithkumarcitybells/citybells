export type MealPlanCategory = "weekly" | "monthly" | "custom";
export type MealType = "Veg" | "Non-Veg" | "Mixed";

export interface MealDeliverySlot {
  id: string;
  label: string;
  window: string;
}

export interface MealSubscriptionPlan {
  id: string;
  category: MealPlanCategory;
  name: string;
  subtitle: string;
  description: string;
  price: number;
  priceLabel: string;
  badge: string;
  accentClassName: string;
  mealTypes: MealType[];
  mealsPerCycle: string;
  deliverySlots: MealDeliverySlot[];
  features: string[];
}

export interface MealSubscriptionSection {
  id: MealPlanCategory;
  title: string;
  description: string;
  plans: MealSubscriptionPlan[];
}

export const mealSubscriptionSections: MealSubscriptionSection[] = [
  {
    id: "weekly",
    title: "Weekly Plan",
    description: "Compact plans for weekday convenience and quick repeat orders.",
    plans: [
      {
        id: "weekly-veg-balance",
        category: "weekly",
        name: "Weekly Veg Balance",
        subtitle: "Fresh lunches for busy weekdays",
        description: "Five curated veg meals with rotating regional menus and light add-ons.",
        price: 799,
        priceLabel: "per week",
        badge: "Most Popular",
        accentClassName: "from-amber-400 via-fuchsia-500 to-violet-600",
        mealTypes: ["Veg"],
        mealsPerCycle: "5 meals / week",
        deliverySlots: [
          { id: "wl-1", label: "Lunch", window: "12:00 PM - 2:00 PM" },
          { id: "wl-2", label: "Dinner", window: "7:00 PM - 9:00 PM" },
        ],
        features: ["Chef-rotated menu", "Skip or pause anytime", "Auto-applied free delivery"],
      },
    ],
  },
  {
    id: "monthly",
    title: "Monthly Plan",
    description: "Better savings for regular meals with flexible time slots through the month.",
    plans: [
      {
        id: "monthly-family-feast",
        category: "monthly",
        name: "Monthly Family Feast",
        subtitle: "Balanced mixed menu with premium savings",
        description: "Twenty-two meal credits with vegetarian and non-vegetarian rotation built in.",
        price: 2899,
        priceLabel: "per month",
        badge: "Best Value",
        accentClassName: "from-yellow-400 via-orange-500 to-rose-500",
        mealTypes: ["Veg", "Non-Veg", "Mixed"],
        mealsPerCycle: "22 meals / month",
        deliverySlots: [
          { id: "mf-1", label: "Breakfast", window: "7:30 AM - 9:30 AM" },
          { id: "mf-2", label: "Dinner", window: "7:00 PM - 9:30 PM" },
        ],
        features: ["Priority delivery batching", "One free dessert drop weekly", "Meal swap support"],
      },
    ],
  },
  {
    id: "custom",
    title: "Custom Plan",
    description: "Build a subscription around your diet, schedule, and preferred delivery windows.",
    plans: [
      {
        id: "custom-fit-flex",
        category: "custom",
        name: "Custom Fit Flex",
        subtitle: "Tailor meals to your work, fitness, or family routine",
        description: "Choose meal type mix, weekly frequency, and preferred delivery slot combination.",
        price: 1299,
        priceLabel: "starting price",
        badge: "Flexible",
        accentClassName: "from-emerald-400 via-cyan-500 to-blue-600",
        mealTypes: ["Veg", "Non-Veg"],
        mealsPerCycle: "Custom frequency",
        deliverySlots: [
          { id: "cf-1", label: "Morning", window: "8:00 AM - 10:00 AM" },
          { id: "cf-2", label: "Afternoon", window: "1:00 PM - 3:00 PM" },
          { id: "cf-3", label: "Evening", window: "7:30 PM - 10:00 PM" },
        ],
        features: ["Pause, resume, or reschedule", "Diet preference notes", "Ready for API-backed customization"],
      },
    ],
  },
];

export const mealSubscriptionPlans = mealSubscriptionSections.flatMap((section) => section.plans);
