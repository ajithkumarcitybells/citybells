import {
  type FoodRestaurant,
  type InsertFoodRestaurant,
  type FoodMenuItem,
  type InsertFoodMenuItem,
  type FoodOrder,
  type InsertFoodOrder,
  type FoodMealPlan,
  type FoodSubscription,
} from "@shared/schema";
import { getDb, toDoc, toDocs, newId } from "./db";

function col(name: string) {
  return getDb().collection(name);
}

export interface IFoodStorage {
  getRestaurants(filters?: { cuisine?: string; search?: string; rating?: number }): Promise<FoodRestaurant[]>;
  getRestaurant(id: string): Promise<FoodRestaurant | undefined>;
  getRestaurantByOwner(ownerId: string): Promise<FoodRestaurant | undefined>;
  getAllRestaurants(): Promise<FoodRestaurant[]>;
  createRestaurant(restaurant: InsertFoodRestaurant): Promise<FoodRestaurant>;
  updateRestaurant(id: string, restaurant: Partial<InsertFoodRestaurant>): Promise<FoodRestaurant | undefined>;
  deleteRestaurant(id: string): Promise<void>;
  getMenuItems(restaurantId: string): Promise<FoodMenuItem[]>;
  getAllMenuItems(): Promise<FoodMenuItem[]>;
  getMenuItem(id: string): Promise<FoodMenuItem | undefined>;
  createMenuItem(item: InsertFoodMenuItem): Promise<FoodMenuItem>;
  updateMenuItem(id: string, item: Partial<InsertFoodMenuItem>): Promise<FoodMenuItem | undefined>;
  deleteMenuItem(id: string): Promise<void>;
  getFoodOrders(userId: string): Promise<FoodOrder[]>;
  getRestaurantOrders(restaurantId: string): Promise<FoodOrder[]>;
  getAllFoodOrders(): Promise<FoodOrder[]>;
  getFoodOrder(id: string): Promise<FoodOrder | undefined>;
  createFoodOrder(order: InsertFoodOrder): Promise<FoodOrder>;
  updateFoodOrderStatus(id: string, status: string): Promise<FoodOrder | undefined>;
  getMealPlans(filters?: any, admin?: boolean): Promise<FoodMealPlan[]>;
  getMealPlan(id: string): Promise<FoodMealPlan | undefined>;
  createMealPlan(plan: any): Promise<FoodMealPlan>;
  updateMealPlan(id: string, plan: any): Promise<FoodMealPlan | undefined>;
  deleteMealPlan(id: string): Promise<void>;
  upsertMealPlanCalendar(planId: string, entries: any[]): Promise<any[]>;
  updateMealPlanCalendarDate(planId: string, date: string, data: any): Promise<any>;
  getUserSubscriptions(userId: string): Promise<FoodSubscription[]>;
  getSubscription(id: string): Promise<FoodSubscription | undefined>;
  getAllSubscriptions(filters?: any): Promise<FoodSubscription[]>;
  createSubscription(subscription: any): Promise<FoodSubscription>;
  updateSubscription(id: string, patch: any): Promise<FoodSubscription | undefined>;
  addSubscriptionEvent(subscriptionId: string, userId: string, type: string, data: any): Promise<void>;
  addSubscriptionSkip(subscriptionId: string, userId: string, data: any): Promise<any>;
  createSubscriptionPayment(payment: any): Promise<any>;
  updateSubscriptionPaymentByOrder(orderId: string, patch: any): Promise<any>;
  getSubscriptionPayments(filters?: any): Promise<any[]>;
  getDeliveryList(date: string): Promise<any[]>;
}

export class FoodStorage implements IFoodStorage {
  async getRestaurants(filters?: { cuisine?: string; search?: string; rating?: number }): Promise<FoodRestaurant[]> {
    const query: any = { isActive: true };
    if (filters?.search) query.name = { $regex: filters.search, $options: "i" };
    let results = toDocs<FoodRestaurant>(await col("food_restaurants").find(query).toArray());
    if (filters?.cuisine) results = results.filter(r => r.cuisine && r.cuisine.includes(filters.cuisine!));
    if (filters?.rating) results = results.filter(r => r.rating && parseFloat(r.rating) >= filters.rating!);
    return results;
  }
  async getRestaurant(id: string): Promise<FoodRestaurant | undefined> {
    const doc = await col("food_restaurants").findOne({ _id: id as any });
    return doc ? toDoc<FoodRestaurant>(doc) : undefined;
  }
  async getRestaurantByOwner(ownerId: string): Promise<FoodRestaurant | undefined> {
    const doc = await col("food_restaurants").findOne({ ownerId });
    return doc ? toDoc<FoodRestaurant>(doc) : undefined;
  }
  async getAllRestaurants(): Promise<FoodRestaurant[]> {
    return toDocs<FoodRestaurant>(await col("food_restaurants").find().toArray());
  }
  async createRestaurant(restaurant: InsertFoodRestaurant): Promise<FoodRestaurant> {
    const id = newId();
    const doc = { _id: id as any, isActive: true, ownerId: null, openingTime: null, closingTime: null, ...restaurant };
    await col("food_restaurants").insertOne(doc);
    return toDoc<FoodRestaurant>(doc);
  }
  async updateRestaurant(id: string, restaurant: Partial<InsertFoodRestaurant>): Promise<FoodRestaurant | undefined> {
    const r = await col("food_restaurants").findOneAndUpdate({ _id: id as any }, { $set: restaurant }, { returnDocument: "after" });
    return r ? toDoc<FoodRestaurant>(r) : undefined;
  }
  async deleteRestaurant(id: string): Promise<void> {
    await col("food_menu_items").deleteMany({ restaurantId: id });
    await col("food_restaurants").deleteOne({ _id: id as any });
  }
  async getMenuItems(restaurantId: string): Promise<FoodMenuItem[]> {
    return toDocs<FoodMenuItem>(await col("food_menu_items").find({ restaurantId }).toArray());
  }
  async getAllMenuItems(): Promise<FoodMenuItem[]> {
    return toDocs<FoodMenuItem>(await col("food_menu_items").find().toArray());
  }
  async getMenuItem(id: string): Promise<FoodMenuItem | undefined> {
    const doc = await col("food_menu_items").findOne({ _id: id as any });
    return doc ? toDoc<FoodMenuItem>(doc) : undefined;
  }
  async createMenuItem(item: InsertFoodMenuItem): Promise<FoodMenuItem> {
    const id = newId();
    const doc = { _id: id as any, image: null, isAvailable: true, ...item };
    await col("food_menu_items").insertOne(doc);
    return toDoc<FoodMenuItem>(doc);
  }
  async updateMenuItem(id: string, item: Partial<InsertFoodMenuItem>): Promise<FoodMenuItem | undefined> {
    const r = await col("food_menu_items").findOneAndUpdate({ _id: id as any }, { $set: item }, { returnDocument: "after" });
    return r ? toDoc<FoodMenuItem>(r) : undefined;
  }
  async deleteMenuItem(id: string): Promise<void> {
    await col("food_menu_items").deleteOne({ _id: id as any });
  }
  async getFoodOrders(userId: string): Promise<FoodOrder[]> {
    return toDocs<FoodOrder>(await col("food_orders").find({ userId }).sort({ createdAt: -1 }).toArray());
  }
  async getRestaurantOrders(restaurantId: string): Promise<FoodOrder[]> {
    return toDocs<FoodOrder>(await col("food_orders").find({ restaurantId }).sort({ createdAt: -1 }).toArray());
  }
  async getAllFoodOrders(): Promise<FoodOrder[]> {
    return toDocs<FoodOrder>(await col("food_orders").find().sort({ createdAt: -1 }).toArray());
  }
  async getFoodOrder(id: string): Promise<FoodOrder | undefined> {
    const doc = await col("food_orders").findOne({ _id: id as any });
    return doc ? toDoc<FoodOrder>(doc) : undefined;
  }
  async createFoodOrder(order: InsertFoodOrder): Promise<FoodOrder> {
    const id = newId();
    const doc = { _id: id as any, status: "pending", createdAt: new Date(), ...order };
    await col("food_orders").insertOne(doc);
    return toDoc<FoodOrder>(doc);
  }
  async updateFoodOrderStatus(id: string, status: string): Promise<FoodOrder | undefined> {
    const r = await col("food_orders").findOneAndUpdate({ _id: id as any }, { $set: { status } }, { returnDocument: "after" });
    return r ? toDoc<FoodOrder>(r) : undefined;
  }

  async getMealPlans(filters?: any, admin = false): Promise<FoodMealPlan[]> {
    const query: any = admin ? {} : { isActive: { $ne: false } };
    if (filters?.mealType) query.mealType = filters.mealType;
    if (filters?.dietType) query.dietType = filters.dietType;
    if (filters?.cuisine) query.cuisine = { $regex: filters.cuisine, $options: "i" };
    if (filters?.duration) query.duration = filters.duration;
    if (filters?.maxBudget) query.pricePerDay = { $lte: Number(filters.maxBudget) };
    if (filters?.maxCalories) query.calories = { $lte: Number(filters.maxCalories) };
    return toDocs<FoodMealPlan>(await col("food_meal_plans").find(query).sort({ isActive: -1, createdAt: -1 }).toArray());
  }

  async getMealPlan(id: string): Promise<FoodMealPlan | undefined> {
    const doc = await col("food_meal_plans").findOne({ _id: id as any });
    return doc ? toDoc<FoodMealPlan>(doc) : undefined;
  }

  async createMealPlan(plan: any): Promise<FoodMealPlan> {
    const id = newId();
    const doc = { _id: id as any, isActive: true, rating: 4.5, includedMeals: [], dietaryTags: [], createdAt: new Date(), updatedAt: new Date(), ...plan };
    await col("food_meal_plans").insertOne(doc);
    return toDoc<FoodMealPlan>(doc);
  }

  async updateMealPlan(id: string, plan: any): Promise<FoodMealPlan | undefined> {
    const r = await col("food_meal_plans").findOneAndUpdate({ _id: id as any }, { $set: { ...plan, updatedAt: new Date() } }, { returnDocument: "after" });
    return r ? toDoc<FoodMealPlan>(r) : undefined;
  }

  async deleteMealPlan(id: string): Promise<void> {
    await col("food_meal_plans").updateOne({ _id: id as any }, { $set: { isActive: false, updatedAt: new Date() } });
  }

  async upsertMealPlanCalendar(planId: string, entries: any[]): Promise<any[]> {
    const docs = entries.map((entry) => ({ _id: newId() as any, planId, ...entry, updatedAt: new Date(), createdAt: new Date() }));
    if (docs.length) {
      await col("food_meal_plan_calendar").deleteMany({ planId, date: { $in: docs.map((d) => d.date) } });
      await col("food_meal_plan_calendar").insertMany(docs);
    }
    return toDocs<any>(docs);
  }

  async updateMealPlanCalendarDate(planId: string, date: string, data: any): Promise<any> {
    await col("food_meal_plan_calendar").updateOne(
      { planId, date },
      { $set: { ...data, planId, date, updatedAt: new Date() }, $setOnInsert: { _id: newId() as any, createdAt: new Date() } },
      { upsert: true },
    );
    return toDoc<any>(await col("food_meal_plan_calendar").findOne({ planId, date }));
  }

  async getUserSubscriptions(userId: string): Promise<FoodSubscription[]> {
    return toDocs<FoodSubscription>(await col("food_subscriptions").find({ userId }).sort({ createdAt: -1 }).toArray());
  }

  async getSubscription(id: string): Promise<FoodSubscription | undefined> {
    const doc = await col("food_subscriptions").findOne({ _id: id as any });
    return doc ? toDoc<FoodSubscription>(doc) : undefined;
  }

  async getAllSubscriptions(filters?: any): Promise<FoodSubscription[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    if (filters?.paymentStatus) query.paymentStatus = filters.paymentStatus;
    return toDocs<FoodSubscription>(await col("food_subscriptions").find(query).sort({ createdAt: -1 }).toArray());
  }

  async createSubscription(subscription: any): Promise<FoodSubscription> {
    const id = newId();
    const doc = { _id: id as any, status: "active", paymentStatus: "pending", createdAt: new Date(), updatedAt: new Date(), ...subscription };
    await col("food_subscriptions").insertOne(doc);
    return toDoc<FoodSubscription>(doc);
  }

  async updateSubscription(id: string, patch: any): Promise<FoodSubscription | undefined> {
    const r = await col("food_subscriptions").findOneAndUpdate({ _id: id as any }, { $set: { ...patch, updatedAt: new Date() } }, { returnDocument: "after" });
    return r ? toDoc<FoodSubscription>(r) : undefined;
  }

  async addSubscriptionEvent(subscriptionId: string, userId: string, type: string, data: any): Promise<void> {
    await col("food_subscription_events").insertOne({ _id: newId() as any, subscriptionId, userId, type, data, createdAt: new Date() });
  }

  async addSubscriptionSkip(subscriptionId: string, userId: string, data: any): Promise<any> {
    const doc = { _id: newId() as any, subscriptionId, userId, ...data, createdAt: new Date() };
    await col("food_subscription_skips").insertOne(doc);
    await this.addSubscriptionEvent(subscriptionId, userId, "skip", data);
    return toDoc<any>(doc);
  }

  async createSubscriptionPayment(payment: any): Promise<any> {
    const doc = { _id: newId() as any, status: "pending", createdAt: new Date(), ...payment };
    await col("food_subscription_payments").insertOne(doc);
    return toDoc<any>(doc);
  }

  async updateSubscriptionPaymentByOrder(orderId: string, patch: any): Promise<any> {
    const r = await col("food_subscription_payments").findOneAndUpdate({ razorpayOrderId: orderId }, { $set: { ...patch, updatedAt: new Date() } }, { returnDocument: "after" });
    return r ? toDoc<any>(r) : undefined;
  }

  async getSubscriptionPayments(filters?: any): Promise<any[]> {
    const query: any = {};
    if (filters?.status) query.status = filters.status;
    return toDocs<any>(await col("food_subscription_payments").find(query).sort({ createdAt: -1 }).toArray());
  }

  async getDeliveryList(date: string): Promise<any[]> {
    const day = new Date(`${date}T00:00:00`);
    const weekday = day.toLocaleDateString("en-US", { weekday: "long" }).toLowerCase();
    const subs = await col("food_subscriptions").find({
      status: "active",
      "schedule.startDate": { $lte: date },
      "schedule.endDate": { $gte: date },
      "schedule.daysOfWeek": weekday,
    }).toArray();
    const skips = await col("food_subscription_skips").find({ date, subscriptionId: { $in: subs.map((s) => String(s._id)) } }).toArray();
    const skipSet = new Set(skips.map((s) => `${s.subscriptionId}:${s.mealSlot}`));
    return toDocs<any>(subs).flatMap((sub: any) => (sub.schedule?.mealSlots || []).filter((slot: string) => !skipSet.has(`${sub.id}:${slot}`)).map((slot: string) => ({
      subscriptionId: sub.id,
      userId: sub.userId,
      customerName: sub.customerName || sub.guestName || sub.userName || "Customer",
      phone: sub.phone || "",
      area: String(sub.schedule?.addressText || "").split(",").slice(-2, -1)[0]?.trim() || "Unassigned",
      address: sub.schedule?.addressText,
      mealSlot: slot,
      planName: sub.planSnapshot?.name,
      preferences: sub.preferences,
      allergies: sub.preferences?.allergies || [],
      notes: sub.preferences?.deliveryInstructions || "",
    })));
  }
}

export const foodStorage = new FoodStorage();
