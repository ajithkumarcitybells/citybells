import type { Express } from "express";
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";
import { foodStorage } from "./food-storage";
import { getDb } from "./db";
import { requireAuth, requireAdmin, requirePartner } from "./auth";
import { insertFoodRestaurantSchema, insertFoodMenuItemSchema, insertFoodOrderSchema } from "@shared/schema";

const foodOrderCreateSchema = z.object({
  restaurantId: z.string().min(1),
  items: z.array(z.object({
    menuItemId: z.string(),
    name: z.string(),
    price: z.string(),
    quantity: z.number().int().positive(),
    isVeg: z.boolean().optional(),
  })).min(1),
  totalAmount: z.string().min(1),
  deliveryFee: z.string().optional(),
  deliveryAddress: z.string().min(1),
});

const updateFoodOrderStatusSchema = z.object({
  status: z.enum(["placed", "accepted", "preparing", "out_for_delivery", "delivered", "cancelled"]),
});

const restaurantFormSchema = z.object({
  name: z.string().min(1),
  image: z.string().optional().nullable(),
  cuisine: z.array(z.string()).optional(),
  rating: z.string().optional(),
  deliveryTime: z.string().optional(),
  minOrder: z.string().optional(),
  isActive: z.boolean().optional(),
  address: z.string().optional().nullable(),
  ownerId: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  openingTime: z.string().optional(),
  closingTime: z.string().optional(),
});

const menuItemFormSchema = z.object({
  restaurantId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional().nullable(),
  price: z.string().min(1),
  image: z.string().optional().nullable(),
  category: z.string().optional(),
  cuisineType: z.string().optional().nullable(),
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

const mealPlanSchema = z.object({
  name: z.string().min(1, "Plan name is required"),
  title: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  mealType: z.enum(["breakfast", "lunch", "dinner", "full_day", "weekly", "monthly"]),
  cuisine: z.string().min(1, "Cuisine is required"),
  calories: z.coerce.number().int().positive().optional().nullable(),
  dietType: z.enum(["veg", "non_veg", "egg"]),
  pricePerDay: z.coerce.number().positive(),
  pricePerWeek: z.coerce.number().positive(),
  pricePerMonth: z.coerce.number().positive(),
  rating: z.coerce.number().min(0).max(5).optional().nullable(),
  includedMeals: z.array(z.string().min(1)).default([]),
  duration: z.enum(["daily", "weekly", "monthly"]).default("weekly"),
  menuCalendar: z.any().optional(),
  dietaryTags: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

const mealPlanQuerySchema = z.object({
  mealType: z.string().optional(),
  dietType: z.string().optional(),
  cuisine: z.string().optional(),
  duration: z.string().optional(),
  maxBudget: z.coerce.number().positive().optional(),
  maxCalories: z.coerce.number().positive().optional(),
});

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use date format YYYY-MM-DD");
const weekdaySchema = z.enum(["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);
const mealSlotSchema = z.enum(["breakfast", "lunch", "dinner"]);

const subscriptionCreateSchema = z.object({
  planId: z.string().min(1),
  paymentCycle: z.enum(["weekly", "monthly"]).default("weekly"),
  preferences: z.object({
    dietType: z.enum(["veg", "non_veg", "egg"]),
    spiceLevel: z.string().min(1),
    allergies: z.array(z.string()).default([]),
    dislikedIngredients: z.array(z.string()).default([]),
    calorieTarget: z.coerce.number().positive().optional().nullable(),
    cuisinePreference: z.string().optional().nullable(),
    deliveryInstructions: z.string().optional().nullable(),
  }),
  schedule: z.object({
    startDate: dateStringSchema,
    endDate: dateStringSchema,
    daysOfWeek: z.array(weekdaySchema).min(1, "Select at least one delivery day"),
    mealSlots: z.array(mealSlotSchema).min(1, "Select at least one meal slot"),
    deliveryWindow: z.string().min(1, "Delivery time window is required"),
    addressId: z.string().optional().nullable(),
    addressText: z.string().min(1, "Delivery address is required"),
  }),
  customerName: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
}).refine((data) => data.schedule.endDate > data.schedule.startDate, {
  path: ["schedule", "endDate"],
  message: "End date must be after start date",
});

const pauseSchema = z.object({
  startDate: dateStringSchema,
  endDate: dateStringSchema,
  reason: z.string().optional().nullable(),
}).refine((data) => data.endDate >= data.startDate, {
  path: ["endDate"],
  message: "Pause end date must be after or equal to pause start date",
});

const cancelSchema = z.object({ reason: z.string().optional().nullable() });
const skipSchema = z.object({
  date: dateStringSchema,
  mealSlot: mealSlotSchema,
  reason: z.string().optional().nullable(),
});
const adminSubscriptionStatusSchema = z.object({
  status: z.enum(["active", "paused", "cancelled", "expired"]).optional(),
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  refundNote: z.string().optional().nullable(),
}).refine((data) => Boolean(data.status || data.paymentStatus || data.refundNote), {
  message: "Provide a status, payment status, or refund note",
});

const calendarBulkSchema = z.object({
  entries: z.array(z.object({
    date: dateStringSchema,
    breakfast: z.string().optional().nullable(),
    lunch: z.string().optional().nullable(),
    dinner: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })).min(1),
});
const calendarDateSchema = calendarBulkSchema.shape.entries.element.omit({ date: true });

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret",
});

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(date: string) {
  return new Date(`${date}T00:00:00`);
}

function weekdayOf(date: string) {
  return parseDateOnly(date).toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
}

function scheduleContainsDate(schedule: any, date: string) {
  return date >= schedule.startDate && date <= schedule.endDate && schedule.daysOfWeek?.includes(weekdayOf(date));
}

function countRemainingDays(schedule: any) {
  const start = parseDateOnly(schedule.startDate);
  const end = parseDateOnly(schedule.endDate);
  let count = 0;
  for (let d = start.getTime(); d <= end.getTime(); d += DAY_MS) {
    const iso = new Date(d).toISOString().slice(0, 10);
    if (schedule.daysOfWeek?.includes(weekdayOf(iso))) count += 1;
  }
  return count;
}

function nextDeliveryDate(schedule: any, status = "active", pause?: any) {
  if (status !== "active") return undefined;
  const today = new Date().toISOString().slice(0, 10);
  const start = parseDateOnly(today > schedule.startDate ? today : schedule.startDate);
  const end = parseDateOnly(schedule.endDate);
  for (let d = start.getTime(); d <= end.getTime(); d += DAY_MS) {
    const iso = new Date(d).toISOString().slice(0, 10);
    if (pause?.startDate && iso >= pause.startDate && iso <= pause.endDate) continue;
    if (scheduleContainsDate(schedule, iso)) return iso;
  }
  return undefined;
}

function subscriptionAmount(plan: any, cycle: "weekly" | "monthly") {
  return cycle === "monthly" ? Number(plan.pricePerMonth) : Number(plan.pricePerWeek);
}

async function ensureDemoMealPlans() {
  const db = getDb();
  const existing = await db.collection("food_meal_plans").estimatedDocumentCount();
  if (existing > 0) return;
  const plans = [
    ["Sunrise South Breakfast", "breakfast", "South Indian", "veg", 360, 129, 799, 2899, ["Idli", "Dosa", "Upma", "Fresh fruit"]],
    ["Lean Lunch Bowl", "lunch", "North Indian", "veg", 520, 179, 1099, 3999, ["Dal", "Rice", "Sabzi", "Salad"]],
    ["Protein Dinner Club", "dinner", "Continental", "non_veg", 680, 229, 1399, 4999, ["Grilled protein", "Soup", "Veg sides"]],
    ["Full Day Balanced Thali", "full_day", "Indian", "egg", 1550, 449, 2799, 9999, ["Breakfast", "Lunch", "Dinner", "Snack"]],
    ["Weekly Homestyle Plan", "weekly", "Multi Cuisine", "veg", 1400, 399, 2499, 8999, ["Rotating weekly menu", "Dessert twice a week"]],
    ["Monthly Fitness Meal Pack", "monthly", "Healthy", "veg", 1300, 369, 2299, 7999, ["Calorie-counted meals", "Low-oil prep"]],
  ];
  for (const [name, mealType, cuisine, dietType, calories, pricePerDay, pricePerWeek, pricePerMonth, includedMeals] of plans as any[]) {
    await foodStorage.createMealPlan({
      name,
      title: name,
      description: `${cuisine} ${mealType.replace("_", " ")} subscription with rotating fresh meals.`,
      image: "https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&w=900&q=80",
      mealType,
      cuisine,
      dietType,
      calories,
      pricePerDay,
      pricePerWeek,
      pricePerMonth,
      rating: 4.6,
      includedMeals,
      duration: mealType === "monthly" ? "monthly" : mealType === "weekly" ? "weekly" : "daily",
      dietaryTags: dietType === "non_veg" ? ["high-protein"] : ["fresh", "home-style"],
      isActive: true,
    });
  }
}

export function registerFoodRoutes(app: Express) {
  // ==================== PUBLIC ROUTES ====================
  ensureDemoMealPlans().catch((err) => console.error("Failed to seed demo meal plans:", err));

  app.get("/api/food/restaurants", async (req, res) => {
    try {
      const { cuisine, search, rating } = req.query;
      const restaurants = await foodStorage.getRestaurants({
        cuisine: cuisine as string | undefined,
        search: search as string | undefined,
        rating: rating ? parseFloat(rating as string) : undefined,
      });
      res.json(restaurants);
    } catch (err) {
      console.error("Error fetching restaurants:", err);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.get("/api/food/meal-plans", async (req, res) => {
    try {
      await ensureDemoMealPlans();
      const parsed = mealPlanQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid filters" });
      }
      const plans = await foodStorage.getMealPlans(parsed.data, false);
      res.json(plans);
    } catch (err) {
      console.error("Error fetching meal plans:", err);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.get("/api/food/meal-plans/:id", async (req, res) => {
    try {
      const plan = await foodStorage.getMealPlan(req.params.id);
      if (!plan || plan.isActive === false) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      res.json(plan);
    } catch (err) {
      console.error("Error fetching meal plan:", err);
      res.status(500).json({ message: "Failed to fetch meal plan" });
    }
  });

  app.get("/api/food/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const menu = await foodStorage.getMenuItems(req.params.id);
      // attach review summary (averageRating, totalReviews) for each menu item
      try {
        const db = getDb();
        const ids = menu.map((m: any) => String(m.id));
        if (ids.length > 0) {
          const agg = await db.collection('reviews').aggregate([
            { $match: { productId: { $in: ids } } },
            { $group: { _id: "$productId", avg: { $avg: "$rating" }, count: { $sum: 1 } } }
          ]).toArray();
          const map: Record<string, any> = {};
          for (const a of agg) map[String(a._id)] = { averageRating: a.avg, totalReviews: a.count };
          for (const m of menu) {
            const v = map[String(m.id)];
            if (v) {
              (m as any).averageRating = Number((v.averageRating || 0).toFixed(2));
              (m as any).totalReviews = v.totalReviews || 0;
            } else {
              (m as any).averageRating = 0;
              (m as any).totalReviews = 0;
            }
          }
        }
      } catch (e) {
        console.error('Failed to attach review summary to menu', e);
      }
      res.json({ ...restaurant, menu });
    } catch (err) {
      console.error("Error fetching restaurant:", err);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // ==================== CUSTOMER ROUTES ====================

  app.post("/api/food/subscriptions", requireAuth, async (req, res) => {
    try {
      const parsed = subscriptionCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid subscription data" });
      }
      const plan = await foodStorage.getMealPlan(parsed.data.planId);
      if (!plan || plan.isActive === false) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      const existing = await foodStorage.getUserSubscriptions(req.user!.id);
      const duplicate = existing.find((sub: any) => sub.planId === plan.id && ["active", "paused"].includes(sub.status));
      if (duplicate) {
        return res.status(409).json({ message: "You already have an active subscription for this plan" });
      }

      const amount = subscriptionAmount(plan, parsed.data.paymentCycle);
      const subscription = await foodStorage.createSubscription({
        userId: req.user!.id,
        planId: plan.id,
        planSnapshot: plan,
        preferences: parsed.data.preferences,
        schedule: parsed.data.schedule,
        paymentCycle: parsed.data.paymentCycle,
        status: "active",
        paymentStatus: "pending",
        amount,
        remainingDays: countRemainingDays(parsed.data.schedule),
        nextDeliveryDate: nextDeliveryDate(parsed.data.schedule),
        customerName: parsed.data.customerName || req.user!.name || req.user!.username || "Customer",
        phone: parsed.data.phone || req.user!.phone || "",
      });
      await foodStorage.addSubscriptionEvent(subscription.id, req.user!.id, "created", { paymentCycle: parsed.data.paymentCycle, amount });
      res.status(201).json(subscription);
    } catch (err) {
      console.error("Error creating food subscription:", err);
      res.status(500).json({ message: "Failed to create subscription" });
    }
  });

  app.get("/api/food/subscriptions", requireAuth, async (req, res) => {
    try {
      const subscriptions = await foodStorage.getUserSubscriptions(req.user!.id);
      res.json(subscriptions);
    } catch (err) {
      console.error("Error fetching subscriptions:", err);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.get("/api/food/subscriptions/:id", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      res.json(subscription);
    } catch (err) {
      console.error("Error fetching subscription:", err);
      res.status(500).json({ message: "Failed to fetch subscription" });
    }
  });

  app.patch("/api/food/subscriptions/:id/pause", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      if (["cancelled", "expired"].includes(subscription.status)) {
        return res.status(400).json({ message: "Only active subscriptions can be paused" });
      }
      const parsed = pauseSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid pause dates" });
      }
      if (parsed.data.endDate < subscription.schedule.startDate || parsed.data.startDate > subscription.schedule.endDate) {
        return res.status(400).json({ message: "Pause range must overlap subscription dates" });
      }
      const updated = await foodStorage.updateSubscription(subscription.id, {
        status: "paused",
        pause: parsed.data,
        nextDeliveryDate: undefined,
      });
      await foodStorage.addSubscriptionEvent(subscription.id, req.user!.id, "paused", parsed.data);
      res.json(updated);
    } catch (err) {
      console.error("Error pausing subscription:", err);
      res.status(500).json({ message: "Failed to pause subscription" });
    }
  });

  app.patch("/api/food/subscriptions/:id/resume", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      if (subscription.status !== "paused") {
        return res.status(400).json({ message: "Only paused subscriptions can be resumed" });
      }
      const updated = await foodStorage.updateSubscription(subscription.id, {
        status: "active",
        pause: null,
        nextDeliveryDate: nextDeliveryDate(subscription.schedule, "active"),
      });
      await foodStorage.addSubscriptionEvent(subscription.id, req.user!.id, "resumed", {});
      res.json(updated);
    } catch (err) {
      console.error("Error resuming subscription:", err);
      res.status(500).json({ message: "Failed to resume subscription" });
    }
  });

  app.patch("/api/food/subscriptions/:id/cancel", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      const parsed = cancelSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid cancellation" });
      }
      const updated = await foodStorage.updateSubscription(subscription.id, {
        status: "cancelled",
        cancellationReason: parsed.data.reason || "Cancelled by customer",
        nextDeliveryDate: undefined,
      });
      await foodStorage.addSubscriptionEvent(subscription.id, req.user!.id, "cancelled", parsed.data);
      res.json(updated);
    } catch (err) {
      console.error("Error cancelling subscription:", err);
      res.status(500).json({ message: "Failed to cancel subscription" });
    }
  });

  app.post("/api/food/subscriptions/:id/skip", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      const parsed = skipSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid skip data" });
      }
      if (!scheduleContainsDate(subscription.schedule, parsed.data.date) || !subscription.schedule.mealSlots?.includes(parsed.data.mealSlot)) {
        return res.status(400).json({ message: "Skip must be within your subscription schedule" });
      }
      const db = getDb();
      const exists = await db.collection("food_subscription_skips").findOne({
        subscriptionId: subscription.id,
        date: parsed.data.date,
        mealSlot: parsed.data.mealSlot,
      });
      if (exists) {
        return res.status(409).json({ message: "This meal is already skipped" });
      }
      const skip = await foodStorage.addSubscriptionSkip(subscription.id, req.user!.id, parsed.data);
      res.status(201).json(skip);
    } catch (err) {
      console.error("Error skipping subscription meal:", err);
      res.status(500).json({ message: "Failed to skip meal" });
    }
  });

  app.post("/api/food/subscriptions/:id/payment/create-order", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      const amountPaise = Math.round(Number(subscription.amount) * 100);
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: "INR",
        receipt: `meal_sub_${subscription.id.slice(-12)}`,
        notes: { subscriptionId: subscription.id, userId: req.user!.id },
      });
      await foodStorage.createSubscriptionPayment({
        subscriptionId: subscription.id,
        userId: req.user!.id,
        razorpayOrderId: order.id,
        amount: subscription.amount,
        currency: "INR",
        paymentCycle: subscription.paymentCycle,
      });
      await foodStorage.updateSubscription(subscription.id, { razorpayOrderId: order.id, paymentStatus: "pending" });
      res.json({
        orderId: order.id,
        amount: amountPaise,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID || "",
        name: "City Bell Meal Subscription",
        description: subscription.planSnapshot?.name || "Meal subscription",
      });
    } catch (err) {
      console.error("Error creating subscription payment order:", err);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  app.post("/api/food/subscriptions/:id/payment/verify", requireAuth, async (req, res) => {
    try {
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription || subscription.userId !== req.user!.id) {
        return res.status(404).json({ message: "Subscription not found" });
      }
      const parsed = z.object({
        orderId: z.string().min(1),
        paymentId: z.string().min(1),
        signature: z.string().min(1),
      }).safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid payment verification" });
      }
      const expected = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret")
        .update(`${parsed.data.orderId}|${parsed.data.paymentId}`)
        .digest("hex");
      if (expected !== parsed.data.signature) {
        await foodStorage.updateSubscriptionPaymentByOrder(parsed.data.orderId, { status: "failed" });
        return res.status(400).json({ message: "Invalid payment signature" });
      }
      await foodStorage.updateSubscriptionPaymentByOrder(parsed.data.orderId, {
        status: "paid",
        razorpayPaymentId: parsed.data.paymentId,
        razorpaySignature: parsed.data.signature,
      });
      const updated = await foodStorage.updateSubscription(subscription.id, {
        paymentStatus: "paid",
        razorpayOrderId: parsed.data.orderId,
        razorpayPaymentId: parsed.data.paymentId,
      });
      await foodStorage.addSubscriptionEvent(subscription.id, req.user!.id, "payment_paid", { orderId: parsed.data.orderId, paymentId: parsed.data.paymentId });
      res.json({ success: true, subscription: updated });
    } catch (err) {
      console.error("Error verifying subscription payment:", err);
      res.status(500).json({ message: "Failed to verify payment" });
    }
  });

  app.post("/api/food/orders", requireAuth, async (req, res) => {
    try {
      const parsed = foodOrderCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid order data" });
      }

      const order = await foodStorage.createFoodOrder({
        userId: req.user!.id,
        restaurantId: parsed.data.restaurantId,
        items: parsed.data.items,
        totalAmount: parsed.data.totalAmount,
        deliveryFee: parsed.data.deliveryFee || "30",
        deliveryAddress: parsed.data.deliveryAddress,
        status: "placed",
      });

      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating food order:", err);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  app.get("/api/food/orders", requireAuth, async (req, res) => {
    try {
      const orders = await foodStorage.getFoodOrders(req.user!.id);
      res.json(orders);
    } catch (err) {
      console.error("Error fetching food orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  // ==================== RESTAURANT OWNER ROUTES ====================

  app.get("/api/food/my-restaurant", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found for this owner" });
      }
      res.json(restaurant);
    } catch (err) {
      console.error("Error fetching own restaurant:", err);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  app.patch("/api/food/my-restaurant", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found for this owner" });
      }
      const parsed = restaurantFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await foodStorage.updateRestaurant(restaurant.id, parsed.data as any);
      res.json(updated);
    } catch (err) {
      console.error("Error updating restaurant:", err);
      res.status(500).json({ message: "Failed to update restaurant" });
    }
  });

  app.get("/api/food/my-restaurant/menu", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found" });
      }
      const menu = await foodStorage.getMenuItems(restaurant.id);
      res.json(menu);
    } catch (err) {
      console.error("Error fetching menu:", err);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.post("/api/food/my-restaurant/menu", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found" });
      }
      const parsed = menuItemFormSchema.safeParse({ ...req.body, restaurantId: restaurant.id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid menu item data" });
      }
      // Validate cuisineType against restaurant cuisines when provided
      const cuisineType = (parsed.data as any).cuisineType;
      if (cuisineType) {
        const allowed = restaurant.cuisine || [];
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(cuisineType)) {
          return res.status(400).json({ message: "Cuisine type must be one of the restaurant's cuisines" });
        }
      }
      const item = await foodStorage.createMenuItem(parsed.data as any);
      res.status(201).json(item);
    } catch (err) {
      console.error("Error creating menu item:", err);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.patch("/api/food/my-restaurant/menu/:id", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found" });
      }
      const existing = await foodStorage.getMenuItem(req.params.id);
      if (!existing || existing.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      const parsed = menuItemFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      // Validate cuisineType against restaurant cuisines when provided
      const cuisineType = (parsed.data as any).cuisineType;
      if (cuisineType) {
        const allowed = restaurant.cuisine || [];
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(cuisineType)) {
          return res.status(400).json({ message: "Cuisine type must be one of the restaurant's cuisines" });
        }
      }
      const updated = await foodStorage.updateMenuItem(req.params.id, parsed.data as any);
      res.json(updated);
    } catch (err) {
      console.error("Error updating menu item:", err);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/food/my-restaurant/menu/:id", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found" });
      }
      const existing = await foodStorage.getMenuItem(req.params.id);
      if (!existing || existing.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      await foodStorage.deleteMenuItem(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting menu item:", err);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });

  app.get("/api/food/my-restaurant/orders", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found" });
      }
      const orders = await foodStorage.getRestaurantOrders(restaurant.id);
      res.json(orders);
    } catch (err) {
      console.error("Error fetching restaurant orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/food/my-restaurant/orders/:id/status", requireAuth, async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurantByOwner(req.user!.id);
      if (!restaurant) {
        return res.status(404).json({ message: "No restaurant found" });
      }
      const order = await foodStorage.getFoodOrder(req.params.id);
      if (!order || order.restaurantId !== restaurant.id) {
        return res.status(404).json({ message: "Order not found" });
      }
      const parsed = updateFoodOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const updated = await foodStorage.updateFoodOrderStatus(req.params.id, parsed.data.status);
      res.json(updated);
    } catch (err) {
      console.error("Error updating order status:", err);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  app.get("/api/admin/food/meal-plans", requireAdmin, async (req, res) => {
    try {
      await ensureDemoMealPlans();
      const parsed = mealPlanQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid filters" });
      }
      const plans = await foodStorage.getMealPlans(parsed.data, true);
      res.json(plans);
    } catch (err) {
      console.error("Error fetching admin meal plans:", err);
      res.status(500).json({ message: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/admin/food/meal-plans", requireAdmin, async (req, res) => {
    try {
      const parsed = mealPlanSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid meal plan data" });
      }
      const plan = await foodStorage.createMealPlan(parsed.data);
      res.status(201).json(plan);
    } catch (err) {
      console.error("Error creating meal plan:", err);
      res.status(500).json({ message: "Failed to create meal plan" });
    }
  });

  app.patch("/api/admin/food/meal-plans/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = mealPlanSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid meal plan data" });
      }
      const updated = await foodStorage.updateMealPlan(req.params.id, parsed.data);
      if (!updated) return res.status(404).json({ message: "Meal plan not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating meal plan:", err);
      res.status(500).json({ message: "Failed to update meal plan" });
    }
  });

  app.delete("/api/admin/food/meal-plans/:id", requireAdmin, async (req, res) => {
    try {
      await foodStorage.deleteMealPlan(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting meal plan:", err);
      res.status(500).json({ message: "Failed to delete meal plan" });
    }
  });

  app.get("/api/admin/food/subscriptions", requireAdmin, async (req, res) => {
    try {
      const subscriptions = await foodStorage.getAllSubscriptions({
        status: req.query.status as string | undefined,
        paymentStatus: req.query.paymentStatus as string | undefined,
      });
      res.json(subscriptions);
    } catch (err) {
      console.error("Error fetching admin subscriptions:", err);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  app.patch("/api/admin/food/subscriptions/:id/status", requireAdmin, async (req, res) => {
    try {
      const parsed = adminSubscriptionStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid subscription update" });
      }
      const subscription = await foodStorage.getSubscription(req.params.id);
      if (!subscription) return res.status(404).json({ message: "Subscription not found" });
      const patch: any = { ...parsed.data };
      if (parsed.data.status === "active") {
        patch.pause = null;
        patch.nextDeliveryDate = nextDeliveryDate(subscription.schedule, "active");
      }
      if (parsed.data.status && parsed.data.status !== "active") {
        patch.nextDeliveryDate = undefined;
      }
      const updated = await foodStorage.updateSubscription(req.params.id, patch);
      await foodStorage.addSubscriptionEvent(req.params.id, req.user!.id, "admin_status_update", parsed.data);
      res.json(updated);
    } catch (err) {
      console.error("Error updating subscription status:", err);
      res.status(500).json({ message: "Failed to update subscription" });
    }
  });

  app.get("/api/admin/food/subscriptions/delivery-list", requireAdmin, async (req, res) => {
    try {
      const date = String(req.query.date || new Date().toISOString().slice(0, 10));
      if (!dateStringSchema.safeParse(date).success) {
        return res.status(400).json({ message: "Use date format YYYY-MM-DD" });
      }
      const rows = await foodStorage.getDeliveryList(date);
      const grouped = rows.reduce((acc: any, row: any) => {
        const slot = row.mealSlot || "unscheduled";
        const area = row.area || "Unassigned";
        acc[slot] ||= {};
        acc[slot][area] ||= [];
        acc[slot][area].push(row);
        return acc;
      }, {});
      res.json({ date, rows, grouped });
    } catch (err) {
      console.error("Error generating delivery list:", err);
      res.status(500).json({ message: "Failed to generate delivery list" });
    }
  });

  app.get("/api/admin/food/subscriptions/payments", requireAdmin, async (req, res) => {
    try {
      const payments = await foodStorage.getSubscriptionPayments({ status: req.query.status as string | undefined });
      res.json(payments);
    } catch (err) {
      console.error("Error fetching subscription payments:", err);
      res.status(500).json({ message: "Failed to fetch payments" });
    }
  });

  app.post("/api/admin/food/meal-plans/:id/calendar", requireAdmin, async (req, res) => {
    try {
      const plan = await foodStorage.getMealPlan(req.params.id);
      if (!plan) return res.status(404).json({ message: "Meal plan not found" });
      const parsed = calendarBulkSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid calendar data" });
      }
      const entries = await foodStorage.upsertMealPlanCalendar(req.params.id, parsed.data.entries);
      res.status(201).json(entries);
    } catch (err) {
      console.error("Error updating meal calendar:", err);
      res.status(500).json({ message: "Failed to update meal calendar" });
    }
  });

  app.patch("/api/admin/food/meal-plans/:id/calendar/:date", requireAdmin, async (req, res) => {
    try {
      const plan = await foodStorage.getMealPlan(req.params.id);
      if (!plan) return res.status(404).json({ message: "Meal plan not found" });
      if (!dateStringSchema.safeParse(req.params.date).success) {
        return res.status(400).json({ message: "Use date format YYYY-MM-DD" });
      }
      const parsed = calendarDateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid calendar data" });
      }
      const entry = await foodStorage.updateMealPlanCalendarDate(req.params.id, req.params.date, parsed.data);
      res.json(entry);
    } catch (err) {
      console.error("Error updating meal calendar date:", err);
      res.status(500).json({ message: "Failed to update meal calendar date" });
    }
  });

  app.get("/api/admin/food/restaurants", requireAdmin, async (req, res) => {
    try {
      const restaurants = await foodStorage.getAllRestaurants();
      res.json(restaurants);
    } catch (err) {
      console.error("Error fetching all restaurants:", err);
      res.status(500).json({ message: "Failed to fetch restaurants" });
    }
  });

  app.post("/api/admin/food/restaurants", requireAdmin, async (req, res) => {
    try {
      const parsed = restaurantFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid restaurant data" });
      }
      const restaurant = await foodStorage.createRestaurant(parsed.data as any);
      res.status(201).json(restaurant);
    } catch (err) {
      console.error("Error creating restaurant:", err);
      res.status(500).json({ message: "Failed to create restaurant" });
    }
  });

  app.patch("/api/admin/food/restaurants/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = restaurantFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await foodStorage.updateRestaurant(req.params.id, parsed.data as any);
      if (!updated) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating restaurant:", err);
      res.status(500).json({ message: "Failed to update restaurant" });
    }
  });

  app.delete("/api/admin/food/restaurants/:id", requireAdmin, async (req, res) => {
    try {
      await foodStorage.deleteRestaurant(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting restaurant:", err);
      res.status(500).json({ message: "Failed to delete restaurant" });
    }
  });

  app.get("/api/admin/food/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await foodStorage.getAllFoodOrders();
      res.json(orders);
    } catch (err) {
      console.error("Error fetching all food orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/admin/food/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const parsed = updateFoodOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      const updated = await foodStorage.updateFoodOrderStatus(req.params.id, parsed.data.status);
      if (!updated) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating food order status:", err);
      res.status(500).json({ message: "Failed to update order status" });
    }
  });

  app.get("/api/admin/food/menu/:restaurantId", requireAdmin, async (req, res) => {
    try {
      const menu = await foodStorage.getMenuItems(req.params.restaurantId);
      res.json(menu);
    } catch (err) {
      console.error("Error fetching menu:", err);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.post("/api/admin/food/menu", requireAdmin, async (req, res) => {
    try {
      const parsed = menuItemFormSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid menu item' });
      const restaurantId = (parsed.data as any).restaurantId;
      const restaurant = await foodStorage.getRestaurant(String(restaurantId));
      if (!restaurant) return res.status(400).json({ message: 'Invalid restaurantId' });
      const cuisineType = (parsed.data as any).cuisineType;
      if (cuisineType) {
        const allowed = restaurant.cuisine || [];
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(cuisineType)) {
          return res.status(400).json({ message: "Cuisine type must be one of the restaurant's cuisines" });
        }
      }
      const item = await foodStorage.createMenuItem(parsed.data as any);
      res.status(201).json(item);
    } catch (err) {
      console.error('Error creating menu item (admin):', err);
      res.status(500).json({ message: 'Failed to create menu item' });
    }
  });

  app.patch('/api/admin/food/menu/:id', requireAdmin, async (req, res) => {
    try {
      const parsed = menuItemFormSchema.partial().safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid data' });
      const existing = await foodStorage.getMenuItem(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Menu item not found' });
      const restaurant = await foodStorage.getRestaurant(existing.restaurantId);
      if (!restaurant) return res.status(400).json({ message: 'Invalid restaurant for menu item' });
      const cuisineType = (parsed.data as any).cuisineType;
      if (cuisineType) {
        const allowed = restaurant.cuisine || [];
        if (Array.isArray(allowed) && allowed.length > 0 && !allowed.includes(cuisineType)) {
          return res.status(400).json({ message: "Cuisine type must be one of the restaurant's cuisines" });
        }
      }
      const updated = await foodStorage.updateMenuItem(req.params.id, parsed.data as any);
      if (!updated) return res.status(404).json({ message: 'Menu item not found' });
      res.json(updated);
    } catch (err) {
      console.error('Error updating menu item (admin):', err);
      res.status(500).json({ message: 'Failed to update menu item' });
    }
  });

  app.delete('/api/admin/food/menu/:id', requireAdmin, async (req, res) => {
    try {
      await foodStorage.deleteMenuItem(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error('Error deleting menu item (admin):', err);
      res.status(500).json({ message: 'Failed to delete menu item' });
    }
  });

  // Admin: fetch all food menu items
  app.get("/api/admin/food/menu", requireAdmin, async (req, res) => {
    try {
      const menu = await foodStorage.getAllMenuItems();
      res.json(menu);
    } catch (err) {
      console.error("Error fetching all menu items:", err);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  // Public: fetch food menu items (all or by restaurantId)
  app.get("/api/food/menu", async (req, res) => {
    try {
      const restaurantId = (req.query && (req.query as any).restaurantId) || undefined;
      if (restaurantId) {
        const menu = await foodStorage.getMenuItems(String(restaurantId));
        return res.json(menu);
      }
      const menu = await foodStorage.getAllMenuItems();
      res.json(menu);
    } catch (err) {
      console.error("Error fetching public menu items:", err);
      res.status(500).json({ message: "Failed to fetch menu" });
    }
  });

  app.post("/api/admin/food/menu", requireAdmin, async (req, res) => {
    try {
      const parsed = menuItemFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid menu item data" });
      }
      const item = await foodStorage.createMenuItem(parsed.data as any);
      res.status(201).json(item);
    } catch (err) {
      console.error("Error creating menu item:", err);
      res.status(500).json({ message: "Failed to create menu item" });
    }
  });

  app.patch("/api/admin/food/menu/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = menuItemFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      const updated = await foodStorage.updateMenuItem(req.params.id, parsed.data as any);
      if (!updated) {
        return res.status(404).json({ message: "Menu item not found" });
      }
      res.json(updated);
    } catch (err) {
      console.error("Error updating menu item:", err);
      res.status(500).json({ message: "Failed to update menu item" });
    }
  });

  app.delete("/api/admin/food/menu/:id", requireAdmin, async (req, res) => {
    try {
      await foodStorage.deleteMenuItem(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting menu item:", err);
      res.status(500).json({ message: "Failed to delete menu item" });
    }
  });
}
