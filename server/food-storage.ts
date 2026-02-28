import {
  foodRestaurants,
  foodMenuItems,
  foodOrders,
  users,
  type FoodRestaurant,
  type InsertFoodRestaurant,
  type FoodMenuItem,
  type InsertFoodMenuItem,
  type FoodOrder,
  type InsertFoodOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, sql, count, sum, inArray } from "drizzle-orm";

export interface IFoodStorage {
  getRestaurants(filters?: { cuisine?: string; search?: string; rating?: number }): Promise<FoodRestaurant[]>;
  getRestaurant(id: string): Promise<FoodRestaurant | undefined>;
  getRestaurantByOwner(ownerId: string): Promise<FoodRestaurant | undefined>;
  getAllRestaurants(): Promise<FoodRestaurant[]>;
  createRestaurant(restaurant: InsertFoodRestaurant): Promise<FoodRestaurant>;
  updateRestaurant(id: string, restaurant: Partial<InsertFoodRestaurant>): Promise<FoodRestaurant | undefined>;
  deleteRestaurant(id: string): Promise<void>;

  getMenuItems(restaurantId: string): Promise<FoodMenuItem[]>;
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
}

export class FoodStorage implements IFoodStorage {
  async getRestaurants(filters?: { cuisine?: string; search?: string; rating?: number }): Promise<FoodRestaurant[]> {
    const conditions = [eq(foodRestaurants.isActive, true)];

    if (filters?.search) {
      conditions.push(ilike(foodRestaurants.name, `%${filters.search}%`));
    }

    const results = await db.select().from(foodRestaurants).where(and(...conditions));

    let filtered = results;
    if (filters?.cuisine) {
      filtered = filtered.filter(r => r.cuisine && r.cuisine.includes(filters.cuisine!));
    }
    if (filters?.rating) {
      filtered = filtered.filter(r => r.rating && parseFloat(r.rating) >= filters.rating!);
    }

    return filtered;
  }

  async getRestaurant(id: string): Promise<FoodRestaurant | undefined> {
    const [restaurant] = await db.select().from(foodRestaurants).where(eq(foodRestaurants.id, id));
    return restaurant || undefined;
  }

  async getRestaurantByOwner(ownerId: string): Promise<FoodRestaurant | undefined> {
    const [restaurant] = await db.select().from(foodRestaurants).where(eq(foodRestaurants.ownerId, ownerId));
    return restaurant || undefined;
  }

  async getAllRestaurants(): Promise<FoodRestaurant[]> {
    return db.select().from(foodRestaurants);
  }

  async createRestaurant(restaurant: InsertFoodRestaurant): Promise<FoodRestaurant> {
    const [created] = await db.insert(foodRestaurants).values(restaurant).returning();
    return created;
  }

  async updateRestaurant(id: string, restaurant: Partial<InsertFoodRestaurant>): Promise<FoodRestaurant | undefined> {
    const [updated] = await db.update(foodRestaurants).set(restaurant).where(eq(foodRestaurants.id, id)).returning();
    return updated || undefined;
  }

  async deleteRestaurant(id: string): Promise<void> {
    await db.delete(foodMenuItems).where(eq(foodMenuItems.restaurantId, id));
    await db.delete(foodRestaurants).where(eq(foodRestaurants.id, id));
  }

  async getMenuItems(restaurantId: string): Promise<FoodMenuItem[]> {
    return db.select().from(foodMenuItems).where(eq(foodMenuItems.restaurantId, restaurantId));
  }

  async getMenuItem(id: string): Promise<FoodMenuItem | undefined> {
    const [item] = await db.select().from(foodMenuItems).where(eq(foodMenuItems.id, id));
    return item || undefined;
  }

  async createMenuItem(item: InsertFoodMenuItem): Promise<FoodMenuItem> {
    const [created] = await db.insert(foodMenuItems).values(item).returning();
    return created;
  }

  async updateMenuItem(id: string, item: Partial<InsertFoodMenuItem>): Promise<FoodMenuItem | undefined> {
    const [updated] = await db.update(foodMenuItems).set(item).where(eq(foodMenuItems.id, id)).returning();
    return updated || undefined;
  }

  async deleteMenuItem(id: string): Promise<void> {
    await db.delete(foodMenuItems).where(eq(foodMenuItems.id, id));
  }

  async getFoodOrders(userId: string): Promise<FoodOrder[]> {
    return db.select().from(foodOrders).where(eq(foodOrders.userId, userId)).orderBy(desc(foodOrders.createdAt));
  }

  async getRestaurantOrders(restaurantId: string): Promise<FoodOrder[]> {
    return db.select().from(foodOrders).where(eq(foodOrders.restaurantId, restaurantId)).orderBy(desc(foodOrders.createdAt));
  }

  async getAllFoodOrders(): Promise<FoodOrder[]> {
    return db.select().from(foodOrders).orderBy(desc(foodOrders.createdAt));
  }

  async getFoodOrder(id: string): Promise<FoodOrder | undefined> {
    const [order] = await db.select().from(foodOrders).where(eq(foodOrders.id, id));
    return order || undefined;
  }

  async createFoodOrder(order: InsertFoodOrder): Promise<FoodOrder> {
    const [created] = await db.insert(foodOrders).values(order).returning();
    return created;
  }

  async updateFoodOrderStatus(id: string, status: string): Promise<FoodOrder | undefined> {
    const [updated] = await db.update(foodOrders).set({ status }).where(eq(foodOrders.id, id)).returning();
    return updated || undefined;
  }
}

export const foodStorage = new FoodStorage();
