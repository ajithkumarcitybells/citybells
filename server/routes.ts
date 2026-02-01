import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin } from "./auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { 
  insertProductSchema, 
  insertCategorySchema, 
  insertBannerSchema,
  insertOrderSchema 
} from "@shared/schema";

// Validation schemas for API endpoints
const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
});

const updateCartSchema = z.object({
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
});

const addToWishlistSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
});

const createOrderSchema = z.object({
  items: z.array(z.object({
    productId: z.string(),
    name: z.string(),
    price: z.string(),
    quantity: z.number().int().positive(),
    image: z.string().optional(),
  })).min(1, "Order must have at least one item"),
  totalAmount: z.string(),
  deliveryAddress: z.string().min(1, "Delivery address is required"),
  deliverySlot: z.string().optional(),
  paymentMethod: z.enum(["cod", "online"]).default("cod"),
});

const updateOrderStatusSchema = z.object({
  status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]),
});

const productFormSchema = insertProductSchema.omit({ id: true }).extend({
  name: z.string().min(1, "Name is required"),
  originalPrice: z.string().min(1, "Original price is required"),
  price: z.string().min(1, "Price is required"),
});

const categoryFormSchema = insertCategorySchema.omit({ id: true }).extend({
  name: z.string().min(1, "Name is required"),
});

const bannerFormSchema = insertBannerSchema.omit({ id: true }).extend({
  title: z.string().min(1, "Title is required"),
});

const updateServiceSchema = z.object({
  isActive: z.boolean().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  sortOrder: z.number().optional(),
});

export async function registerRoutes(
  app: Express
): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  // Setup object storage routes (public access for uploaded files)
  registerObjectStorageRoutes(app);

  // Initialize services in database
  await storage.initializeServices();

  // ==================== PUBLIC ROUTES ====================

  // Categories
  app.get("/api/categories", async (req, res) => {
    try {
      const categories = await storage.getCategories();
      res.json(categories);
    } catch (err) {
      console.error("Error fetching categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // Products
  app.get("/api/products", async (req, res) => {
    try {
      const { category } = req.query;
      let products;
      if (category && typeof category === "string") {
        products = await storage.getProductsByCategory(category);
      } else {
        products = await storage.getProducts();
      }
      res.json(products);
    } catch (err) {
      console.error("Error fetching products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (err) {
      console.error("Error fetching product:", err);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  // Banners
  app.get("/api/banners", async (req, res) => {
    try {
      const banners = await storage.getBanners();
      res.json(banners);
    } catch (err) {
      console.error("Error fetching banners:", err);
      res.status(500).json({ message: "Failed to fetch banners" });
    }
  });

  // Services
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (err) {
      console.error("Error fetching services:", err);
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  // ==================== PROTECTED ROUTES ====================

  // Cart
  app.get("/api/cart", requireAuth, async (req, res) => {
    try {
      const items = await storage.getCartItems(req.user!.id);
      res.json(items);
    } catch (err) {
      console.error("Error fetching cart:", err);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post("/api/cart", requireAuth, async (req, res) => {
    try {
      const parsed = addToCartSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      
      const { productId, quantity } = parsed.data;
      const item = await storage.addToCart({
        userId: req.user!.id,
        productId,
        quantity,
      });
      res.status(201).json(item);
    } catch (err) {
      console.error("Error adding to cart:", err);
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.patch("/api/cart/:id", requireAuth, async (req, res) => {
    try {
      const parsed = updateCartSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      
      const { quantity } = parsed.data;
      // Pass userId to ensure user can only update their own cart items (IDOR prevention)
      const item = await storage.updateCartItemForUser(req.params.id, req.user!.id, quantity);
      if (!item) {
        return res.status(404).json({ message: "Cart item not found" });
      }
      res.json(item);
    } catch (err) {
      console.error("Error updating cart:", err);
      res.status(500).json({ message: "Failed to update cart" });
    }
  });

  app.delete("/api/cart/:id", requireAuth, async (req, res) => {
    try {
      // Pass userId to ensure user can only delete their own cart items (IDOR prevention)
      await storage.removeFromCartForUser(req.params.id, req.user!.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error removing from cart:", err);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  // Wishlist
  app.get("/api/wishlist", requireAuth, async (req, res) => {
    try {
      const items = await storage.getWishlistItems(req.user!.id);
      res.json(items);
    } catch (err) {
      console.error("Error fetching wishlist:", err);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/wishlist", requireAuth, async (req, res) => {
    try {
      const parsed = addToWishlistSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }
      
      const { productId } = parsed.data;
      const item = await storage.addToWishlist({
        userId: req.user!.id,
        productId,
      });
      res.status(201).json(item);
    } catch (err) {
      console.error("Error adding to wishlist:", err);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/wishlist/:productId", requireAuth, async (req, res) => {
    try {
      await storage.removeFromWishlist(req.user!.id, req.params.productId);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error removing from wishlist:", err);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  // Orders
  app.get("/api/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getOrders(req.user!.id);
      res.json(orders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { items, totalAmount, deliveryAddress, deliverySlot, paymentMethod } = parsed.data;

      const order = await storage.createOrder({
        userId: req.user!.id,
        items,
        totalAmount,
        deliveryAddress,
        deliverySlot,
        paymentMethod,
        status: "pending",
      });

      // Clear cart after order
      await storage.clearCart(req.user!.id);

      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating order:", err);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Admin Products
  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const parsed = productFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid product data" });
      }
      
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (err) {
      console.error("Error creating product:", err);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = productFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid product data" });
      }
      
      const product = await storage.updateProduct(req.params.id, parsed.data);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (err) {
      console.error("Error updating product:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteProduct(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting product:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Admin Categories
  app.post("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const parsed = categoryFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid category data" });
      }
      
      const category = await storage.createCategory(parsed.data);
      res.status(201).json(category);
    } catch (err) {
      console.error("Error creating category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = categoryFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid category data" });
      }
      
      const category = await storage.updateCategory(req.params.id, parsed.data);
      if (!category) {
        return res.status(404).json({ message: "Category not found" });
      }
      res.json(category);
    } catch (err) {
      console.error("Error updating category:", err);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategory(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting category:", err);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  // Admin Orders
  app.get("/api/admin/orders", requireAdmin, async (req, res) => {
    try {
      const orders = await storage.getAllOrders();
      res.json(orders);
    } catch (err) {
      console.error("Error fetching orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = updateOrderStatusSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid status" });
      }
      
      const order = await storage.updateOrderStatus(req.params.id, parsed.data.status);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (err) {
      console.error("Error updating order:", err);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  // Admin Banners
  app.post("/api/admin/banners", requireAdmin, async (req, res) => {
    try {
      const parsed = bannerFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid banner data" });
      }
      
      const banner = await storage.createBanner(parsed.data);
      res.status(201).json(banner);
    } catch (err) {
      console.error("Error creating banner:", err);
      res.status(500).json({ message: "Failed to create banner" });
    }
  });

  app.patch("/api/admin/banners/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = bannerFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid banner data" });
      }
      
      const banner = await storage.updateBanner(req.params.id, parsed.data);
      if (!banner) {
        return res.status(404).json({ message: "Banner not found" });
      }
      res.json(banner);
    } catch (err) {
      console.error("Error updating banner:", err);
      res.status(500).json({ message: "Failed to update banner" });
    }
  });

  app.delete("/api/admin/banners/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteBanner(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting banner:", err);
      res.status(500).json({ message: "Failed to delete banner" });
    }
  });

  // Admin Services
  app.patch("/api/admin/services/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = updateServiceSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid service data" });
      }
      
      const service = await storage.updateService(req.params.id, parsed.data);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (err) {
      console.error("Error updating service:", err);
      res.status(500).json({ message: "Failed to update service" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
