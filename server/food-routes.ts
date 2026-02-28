import type { Express } from "express";
import { z } from "zod";
import { foodStorage } from "./food-storage";
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
  isVeg: z.boolean().optional(),
  isAvailable: z.boolean().optional(),
});

export function registerFoodRoutes(app: Express) {
  // ==================== PUBLIC ROUTES ====================

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

  app.get("/api/food/restaurants/:id", async (req, res) => {
    try {
      const restaurant = await foodStorage.getRestaurant(req.params.id);
      if (!restaurant) {
        return res.status(404).json({ message: "Restaurant not found" });
      }
      const menu = await foodStorage.getMenuItems(req.params.id);
      res.json({ ...restaurant, menu });
    } catch (err) {
      console.error("Error fetching restaurant:", err);
      res.status(500).json({ message: "Failed to fetch restaurant" });
    }
  });

  // ==================== CUSTOMER ROUTES ====================

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
