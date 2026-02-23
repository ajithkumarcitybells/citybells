import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import Razorpay from "razorpay";
import { storage } from "./storage";
import { setupAuth, requireAuth, requireAdmin, requireVendor } from "./auth";
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});
import { 
  insertProductSchema, 
  insertCategorySchema, 
  insertBannerSchema,
  insertOrderSchema,
  insertAddressSchema,
  insertSupportTicketSchema,
  insertCategoryAdSchema,
  insertVendorApplicationSchema,
  users,
} from "@shared/schema";

// Validation schemas for API endpoints
const addToCartSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  quantity: z.number().int().positive().default(1),
  variant: z.string().nullable().optional(),
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
  paymentMethod: z.enum(["cod", "online", "razorpay"]).default("cod"),
  paymentId: z.string().optional(),
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

  // Category Ads
  app.get("/api/category-ads", async (req, res) => {
    try {
      const categoryId = req.query.category as string | undefined;
      const ads = await storage.getCategoryAds(categoryId);
      res.json(ads);
    } catch (err) {
      console.error("Error fetching category ads:", err);
      res.status(500).json({ message: "Failed to fetch category ads" });
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
      
      const { productId, quantity, variant } = parsed.data;
      const item = await storage.addToCart({
        userId: req.user!.id,
        productId,
        quantity,
        variant: variant || null,
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

  // Razorpay Payment Routes
  const createRazorpayOrderSchema = z.object({
    amount: z.number().positive("Amount must be positive"),
  });

  app.post("/api/payment/create-order", requireAuth, async (req, res) => {
    try {
      const parsed = createRazorpayOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { amount } = parsed.data;
      const currency = process.env.RAZORPAY_CURRENCY || "INR";

      const options = {
        amount: Math.round(amount * 100), // Razorpay expects amount in paise
        currency,
        receipt: `order_${Date.now()}`,
      };

      const order = await razorpay.orders.create(options);
      res.json({
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID,
      });
    } catch (err) {
      console.error("Error creating Razorpay order:", err);
      res.status(500).json({ message: "Failed to create payment order" });
    }
  });

  const verifyPaymentSchema = z.object({
    razorpay_order_id: z.string(),
    razorpay_payment_id: z.string(),
    razorpay_signature: z.string(),
  });

  app.post("/api/payment/verify", requireAuth, async (req, res) => {
    try {
      const parsed = verifyPaymentSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

      // Verify signature
      const body = razorpay_order_id + "|" + razorpay_payment_id;
      const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
        .update(body)
        .digest("hex");

      if (expectedSignature !== razorpay_signature) {
        return res.status(400).json({ message: "Payment verification failed" });
      }

      res.json({ 
        success: true, 
        paymentId: razorpay_payment_id,
        message: "Payment verified successfully" 
      });
    } catch (err) {
      console.error("Error verifying payment:", err);
      res.status(500).json({ message: "Payment verification failed" });
    }
  });

  app.post("/api/orders", requireAuth, async (req, res) => {
    try {
      const parsed = createOrderSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid request" });
      }

      const { items, totalAmount, deliveryAddress, deliverySlot, paymentMethod, paymentId } = parsed.data;

      const order = await storage.createOrder({
        userId: req.user!.id,
        items,
        totalAmount,
        deliveryAddress,
        deliverySlot,
        paymentMethod,
        paymentId,
        status: paymentId ? "confirmed" : "pending", // Auto-confirm paid orders
      });

      // Clear cart after order
      await storage.clearCart(req.user!.id);

      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating order:", err);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // Addresses - using shared schema with required fields extended
  const addressFormSchema = z.object({
    label: z.string().min(1, "Label is required"),
    addressLine1: z.string().min(1, "Address Line 1 is required"),
    addressLine2: z.string().optional().default(""),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    pincode: z.string().min(1, "Pincode is required"),
    flatHouseNo: z.string().optional(),
    landmark: z.string().optional(),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    isDefault: z.boolean().optional(),
  });

  app.get("/api/addresses", requireAuth, async (req, res) => {
    try {
      const addressList = await storage.getAddresses(req.user!.id);
      res.json(addressList);
    } catch (err) {
      console.error("Error fetching addresses:", err);
      res.status(500).json({ message: "Failed to fetch addresses" });
    }
  });

  app.post("/api/addresses", requireAuth, async (req, res) => {
    try {
      const parsed = addressFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid address data" });
      }

      const parts = [parsed.data.addressLine1, parsed.data.addressLine2, parsed.data.city, parsed.data.state, parsed.data.country, parsed.data.pincode].filter(Boolean);
      const fullAddress = parts.join(", ");

      const address = await storage.createAddress({
        userId: req.user!.id,
        ...parsed.data,
        fullAddress,
      });
      res.status(201).json(address);
    } catch (err) {
      console.error("Error creating address:", err);
      res.status(500).json({ message: "Failed to create address" });
    }
  });

  app.patch("/api/addresses/:id", requireAuth, async (req, res) => {
    try {
      const parsed = addressFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid address data" });
      }

      const updateData: any = { ...parsed.data };
      if (parsed.data.addressLine1 || parsed.data.city || parsed.data.state || parsed.data.country || parsed.data.pincode) {
        const existing = await storage.getAddress(req.params.id, req.user!.id);
        if (existing) {
          const line1 = parsed.data.addressLine1 ?? existing.addressLine1 ?? "";
          const line2 = parsed.data.addressLine2 ?? existing.addressLine2 ?? "";
          const c = parsed.data.city ?? existing.city ?? "";
          const s = parsed.data.state ?? existing.state ?? "";
          const co = parsed.data.country ?? existing.country ?? "";
          const p = parsed.data.pincode ?? existing.pincode ?? "";
          updateData.fullAddress = [line1, line2, c, s, co, p].filter(Boolean).join(", ");
        }
      }

      const address = await storage.updateAddress(req.params.id, req.user!.id, updateData);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.json(address);
    } catch (err) {
      console.error("Error updating address:", err);
      res.status(500).json({ message: "Failed to update address" });
    }
  });

  app.delete("/api/addresses/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteAddress(req.params.id, req.user!.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting address:", err);
      res.status(500).json({ message: "Failed to delete address" });
    }
  });

  app.patch("/api/addresses/:id/default", requireAuth, async (req, res) => {
    try {
      const address = await storage.setDefaultAddress(req.params.id, req.user!.id);
      if (!address) {
        return res.status(404).json({ message: "Address not found" });
      }
      res.json(address);
    } catch (err) {
      console.error("Error setting default address:", err);
      res.status(500).json({ message: "Failed to set default address" });
    }
  });

  // ==================== ADMIN ROUTES ====================

  // Admin Dashboard Stats
  app.get("/api/admin/stats", requireAdmin, async (req, res) => {
    try {
      const { db } = await import("./db");
      const { users, products, orders, categories, supportTickets } = await import("@shared/schema");
      const { count, sum, eq, sql, desc } = await import("drizzle-orm");

      const [userCount] = await db.select({ count: count() }).from(users).where(eq(users.isAdmin, false));
      const [productCount] = await db.select({ count: count() }).from(products);
      const [categoryCount] = await db.select({ count: count() }).from(categories);
      const [orderCount] = await db.select({ count: count() }).from(orders);
      const [revenueResult] = await db.select({ total: sum(orders.totalAmount) }).from(orders);
      const [openTicketCount] = await db.select({ count: count() }).from(supportTickets).where(eq(supportTickets.status, "open"));

      const statusBreakdown = await db
        .select({ status: orders.status, count: count() })
        .from(orders)
        .groupBy(orders.status);

      const recentOrders = await db
        .select({
          id: orders.id,
          orderNumber: orders.orderNumber,
          totalAmount: orders.totalAmount,
          status: orders.status,
          paymentMethod: orders.paymentMethod,
          createdAt: orders.createdAt,
          username: users.username,
          name: users.name,
        })
        .from(orders)
        .leftJoin(users, eq(orders.userId, users.id))
        .orderBy(desc(orders.createdAt))
        .limit(10);

      res.json({
        totalUsers: userCount.count,
        totalProducts: productCount.count,
        totalCategories: categoryCount.count,
        totalOrders: orderCount.count,
        totalRevenue: revenueResult.total || "0",
        openTickets: openTicketCount.count,
        orderStatusBreakdown: statusBreakdown,
        recentOrders,
      });
    } catch (err) {
      console.error("Error fetching admin stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  // Admin Products
  app.get("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const products = await storage.getAllProducts();
      res.json(products);
    } catch (err) {
      console.error("Error fetching all products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

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
  app.get("/api/admin/categories", requireAdmin, async (req, res) => {
    try {
      const categories = await storage.getAllCategories();
      res.json(categories);
    } catch (err) {
      console.error("Error fetching all categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

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

  app.get("/api/admin/orders/:id", requireAdmin, async (req, res) => {
    try {
      const order = await storage.getOrderWithCustomer(req.params.id);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (err) {
      console.error("Error fetching order:", err);
      res.status(500).json({ message: "Failed to fetch order" });
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

  // Admin Category Ads
  const categoryAdFormSchema = insertCategoryAdSchema.omit({ id: true }).extend({
    title: z.string().min(1, "Title is required"),
  });

  app.get("/api/admin/category-ads", requireAdmin, async (req, res) => {
    try {
      const ads = await storage.getAllCategoryAds();
      res.json(ads);
    } catch (err) {
      console.error("Error fetching category ads:", err);
      res.status(500).json({ message: "Failed to fetch category ads" });
    }
  });

  app.post("/api/admin/category-ads", requireAdmin, async (req, res) => {
    try {
      const parsed = categoryAdFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid ad data" });
      }
      const categories = await storage.getAllCategories();
      if (!categories.find(c => c.id === parsed.data.categoryId)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      const ad = await storage.createCategoryAd(parsed.data);
      res.status(201).json(ad);
    } catch (err) {
      console.error("Error creating category ad:", err);
      res.status(500).json({ message: "Failed to create category ad" });
    }
  });

  app.patch("/api/admin/category-ads/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = categoryAdFormSchema.partial().safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid ad data" });
      }
      const ad = await storage.updateCategoryAd(req.params.id, parsed.data);
      if (!ad) {
        return res.status(404).json({ message: "Category ad not found" });
      }
      res.json(ad);
    } catch (err) {
      console.error("Error updating category ad:", err);
      res.status(500).json({ message: "Failed to update category ad" });
    }
  });

  app.delete("/api/admin/category-ads/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteCategoryAd(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting category ad:", err);
      res.status(500).json({ message: "Failed to delete category ad" });
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

  // Support Tickets - User routes
  app.get("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getTickets(req.user!.id);
      res.json(tickets);
    } catch (err) {
      console.error("Error fetching tickets:", err);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.get("/api/support/tickets/:id", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (ticket.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      res.json(ticket);
    } catch (err) {
      console.error("Error fetching ticket:", err);
      res.status(500).json({ message: "Failed to fetch ticket" });
    }
  });

  app.post("/api/support/tickets", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        subject: z.string().min(1, "Subject is required"),
        message: z.string().min(1, "Message is required"),
        image: z.string().nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      
      const ticket = await storage.createTicket({
        userId: req.user!.id,
        subject: parsed.data.subject,
        status: "open",
      });
      
      await storage.addTicketMessage({
        ticketId: ticket.id,
        senderId: req.user!.id,
        message: parsed.data.message,
        image: parsed.data.image || null,
        isAdmin: false,
      });
      
      res.status(201).json(ticket);
    } catch (err) {
      console.error("Error creating ticket:", err);
      res.status(500).json({ message: "Failed to create ticket" });
    }
  });

  app.post("/api/support/tickets/:id/messages", requireAuth, async (req, res) => {
    try {
      const ticket = await storage.getTicket(req.params.id);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      if (ticket.userId !== req.user!.id && !req.user!.isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }
      
      const schema = z.object({
        message: z.string().min(1, "Message is required"),
        image: z.string().nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      }
      
      const ticketMessage = await storage.addTicketMessage({
        ticketId: req.params.id,
        senderId: req.user!.id,
        message: parsed.data.message,
        image: parsed.data.image || null,
        isAdmin: !!req.user!.isAdmin,
      });
      
      res.status(201).json(ticketMessage);
    } catch (err) {
      console.error("Error adding message:", err);
      res.status(500).json({ message: "Failed to add message" });
    }
  });

  // Admin support ticket routes
  app.get("/api/admin/support/tickets", requireAdmin, async (req, res) => {
    try {
      const tickets = await storage.getAllTickets();
      res.json(tickets);
    } catch (err) {
      console.error("Error fetching all tickets:", err);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  app.patch("/api/admin/support/tickets/:id/status", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        status: z.enum(["open", "in_progress", "resolved", "closed"]),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const ticket = await storage.updateTicketStatus(req.params.id, parsed.data.status);
      if (!ticket) return res.status(404).json({ message: "Ticket not found" });
      res.json(ticket);
    } catch (err) {
      console.error("Error updating ticket status:", err);
      res.status(500).json({ message: "Failed to update ticket status" });
    }
  });

  // ==================== VENDOR APPLICATION ROUTES ====================

  // Public - Submit vendor application (no login required)
  app.post("/api/vendor-applications", async (req, res) => {
    try {
      const parsed = insertVendorApplicationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid application data" });
      }
      const existing = await storage.getUserByUsername(parsed.data.username);
      if (existing) {
        return res.status(400).json({ message: "Username already taken. Please choose a different username." });
      }
      const application = await storage.createVendorApplication(parsed.data);
      res.status(201).json(application);
    } catch (err) {
      console.error("Error creating vendor application:", err);
      res.status(500).json({ message: "Failed to submit application" });
    }
  });

  // Admin - Get all vendor applications
  app.get("/api/admin/vendor-applications", requireAdmin, async (req, res) => {
    try {
      const applications = await storage.getVendorApplications();
      res.json(applications);
    } catch (err) {
      console.error("Error fetching vendor applications:", err);
      res.status(500).json({ message: "Failed to fetch applications" });
    }
  });

  // Admin - Get single vendor application
  app.get("/api/admin/vendor-applications/:id", requireAdmin, async (req, res) => {
    try {
      const application = await storage.getVendorApplication(req.params.id);
      if (!application) return res.status(404).json({ message: "Application not found" });
      res.json(application);
    } catch (err) {
      console.error("Error fetching vendor application:", err);
      res.status(500).json({ message: "Failed to fetch application" });
    }
  });

  // Admin - Approve/Reject vendor application
  app.patch("/api/admin/vendor-applications/:id", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        status: z.enum(["approved", "rejected"]),
        adminNote: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid status" });
      }

      const application = await storage.getVendorApplication(req.params.id);
      if (!application) return res.status(404).json({ message: "Application not found" });

      if (parsed.data.status === "approved") {
        const existing = await storage.getUserByUsername(application.username);
        if (existing) {
          return res.status(400).json({ message: "Username already exists. Cannot create vendor account." });
        }
        const { hashPassword } = await import("./auth");
        const hashedPassword = await hashPassword(application.password);
        const { db } = await import("./db");
        await db.insert(users).values({
          username: application.username,
          password: hashedPassword,
          name: application.ownerName,
          email: application.email,
          phone: application.phone,
          isAdmin: false,
          isVendor: true,
        });
      }

      const updated = await storage.updateVendorApplicationStatus(req.params.id, parsed.data.status, parsed.data.adminNote);
      res.json(updated);
    } catch (err) {
      console.error("Error updating vendor application:", err);
      res.status(500).json({ message: "Failed to update application" });
    }
  });

  // ==================== VENDOR ROUTES ====================

  // Vendor - Get own products
  app.get("/api/vendor/products", requireVendor, async (req, res) => {
    try {
      const vendorProducts = await storage.getVendorProducts(req.user!.id);
      res.json(vendorProducts);
    } catch (err) {
      console.error("Error fetching vendor products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  // Vendor - Create product
  app.post("/api/vendor/products", requireVendor, async (req, res) => {
    try {
      const parsed = insertProductSchema.safeParse({ ...req.body, vendorId: req.user!.id });
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid product data" });
      }
      const product = await storage.createProduct(parsed.data);
      res.status(201).json(product);
    } catch (err) {
      console.error("Error creating vendor product:", err);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  // Vendor - Update own product
  app.patch("/api/vendor/products/:id", requireVendor, async (req, res) => {
    try {
      const existing = await storage.getProduct(req.params.id);
      if (!existing || existing.vendorId !== req.user!.id) {
        return res.status(404).json({ message: "Product not found" });
      }
      const product = await storage.updateProduct(req.params.id, req.body);
      res.json(product);
    } catch (err) {
      console.error("Error updating vendor product:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  // Vendor - Delete own product
  app.delete("/api/vendor/products/:id", requireVendor, async (req, res) => {
    try {
      const existing = await storage.getProduct(req.params.id);
      if (!existing || existing.vendorId !== req.user!.id) {
        return res.status(404).json({ message: "Product not found" });
      }
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (err) {
      console.error("Error deleting vendor product:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Vendor - Get categories (for product creation dropdown)
  app.get("/api/vendor/categories", requireVendor, async (req, res) => {
    try {
      const allCategories = await storage.getCategories();
      res.json(allCategories);
    } catch (err) {
      console.error("Error fetching categories for vendor:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // ==================== E-COMMERCE PUBLIC ROUTES ====================

  app.get("/api/ecom/categories", async (req, res) => {
    try {
      const cats = await storage.getEcomCategories();
      res.json(cats);
    } catch (err) {
      console.error("Error fetching ecom categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.get("/api/ecom/products", async (req, res) => {
    try {
      const { category, search, minPrice, maxPrice, vendor, brand, featured, sort } = req.query;
      const filters: any = {};
      if (category) filters.categoryId = category as string;
      if (search) filters.search = search as string;
      if (minPrice) filters.minPrice = Number(minPrice);
      if (maxPrice) filters.maxPrice = Number(maxPrice);
      if (vendor) filters.vendorId = vendor as string;
      if (brand) filters.brand = brand as string;
      if (featured === 'true') filters.isFeatured = true;
      if (sort) filters.sortBy = sort as string;
      const prods = await storage.getEcomProducts(filters);
      res.json(prods);
    } catch (err) {
      console.error("Error fetching ecom products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/ecom/products/:id", async (req, res) => {
    try {
      const product = await storage.getEcomProduct(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (err) {
      console.error("Error fetching ecom product:", err);
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.get("/api/ecom/products/:id/reviews", async (req, res) => {
    try {
      const reviews = await storage.getEcomReviews(req.params.id);
      res.json(reviews);
    } catch (err) {
      console.error("Error fetching reviews:", err);
      res.status(500).json({ message: "Failed to fetch reviews" });
    }
  });

  app.get("/api/ecom/seller/:userId", async (req, res) => {
    try {
      const profile = await storage.getSellerProfile(req.params.userId);
      if (!profile) return res.status(404).json({ message: "Seller not found" });
      res.json(profile);
    } catch (err) {
      console.error("Error fetching seller:", err);
      res.status(500).json({ message: "Failed to fetch seller" });
    }
  });

  // ==================== E-COMMERCE PROTECTED ROUTES ====================

  app.post("/api/ecom/reviews", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        productId: z.string().min(1),
        rating: z.number().int().min(1).max(5),
        title: z.string().optional(),
        comment: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const review = await storage.createEcomReview({ ...parsed.data, userId: req.user!.id });
      res.status(201).json(review);
    } catch (err) {
      console.error("Error creating review:", err);
      res.status(500).json({ message: "Failed to create review" });
    }
  });

  app.get("/api/ecom/cart", requireAuth, async (req, res) => {
    try {
      const items = await storage.getEcomCartItems(req.user!.id);
      res.json(items);
    } catch (err) {
      console.error("Error fetching ecom cart:", err);
      res.status(500).json({ message: "Failed to fetch cart" });
    }
  });

  app.post("/api/ecom/cart", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        productId: z.string().min(1),
        quantity: z.number().int().positive().default(1),
        variant: z.string().nullable().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const item = await storage.addToEcomCart({
        userId: req.user!.id,
        productId: parsed.data.productId,
        quantity: parsed.data.quantity,
        variant: parsed.data.variant || null,
      });
      res.status(201).json(item);
    } catch (err) {
      console.error("Error adding to ecom cart:", err);
      res.status(500).json({ message: "Failed to add to cart" });
    }
  });

  app.patch("/api/ecom/cart/:id", requireAuth, async (req, res) => {
    try {
      const schema = z.object({ quantity: z.number().int().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const item = await storage.updateEcomCartItem(req.params.id, req.user!.id, parsed.data.quantity);
      if (!item) return res.status(404).json({ message: "Cart item not found" });
      res.json(item);
    } catch (err) {
      console.error("Error updating ecom cart:", err);
      res.status(500).json({ message: "Failed to update cart" });
    }
  });

  app.delete("/api/ecom/cart/:id", requireAuth, async (req, res) => {
    try {
      await storage.removeFromEcomCart(req.params.id, req.user!.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error removing from ecom cart:", err);
      res.status(500).json({ message: "Failed to remove from cart" });
    }
  });

  app.get("/api/ecom/wishlist", requireAuth, async (req, res) => {
    try {
      const items = await storage.getEcomWishlistItems(req.user!.id);
      res.json(items);
    } catch (err) {
      console.error("Error fetching ecom wishlist:", err);
      res.status(500).json({ message: "Failed to fetch wishlist" });
    }
  });

  app.post("/api/ecom/wishlist", requireAuth, async (req, res) => {
    try {
      const schema = z.object({ productId: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const item = await storage.addToEcomWishlist({ userId: req.user!.id, productId: parsed.data.productId });
      res.status(201).json(item);
    } catch (err) {
      console.error("Error adding to ecom wishlist:", err);
      res.status(500).json({ message: "Failed to add to wishlist" });
    }
  });

  app.delete("/api/ecom/wishlist/:productId", requireAuth, async (req, res) => {
    try {
      await storage.removeFromEcomWishlist(req.user!.id, req.params.productId);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error removing from ecom wishlist:", err);
      res.status(500).json({ message: "Failed to remove from wishlist" });
    }
  });

  app.get("/api/ecom/orders", requireAuth, async (req, res) => {
    try {
      const ecomOrdrs = await storage.getEcomOrders(req.user!.id);
      res.json(ecomOrdrs);
    } catch (err) {
      console.error("Error fetching ecom orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.post("/api/ecom/orders", requireAuth, async (req, res) => {
    try {
      const schema = z.object({
        items: z.array(z.object({
          productId: z.string(),
          name: z.string(),
          price: z.string(),
          quantity: z.number().int().positive(),
          image: z.string().optional(),
          variant: z.string().optional(),
          vendorId: z.string().optional(),
        })).min(1),
        totalAmount: z.string(),
        deliveryAddress: z.string().min(1),
        paymentMethod: z.enum(["cod", "online", "razorpay"]).default("cod"),
        paymentId: z.string().optional(),
        vendorId: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });

      const order = await storage.createEcomOrder({
        userId: req.user!.id,
        items: parsed.data.items,
        totalAmount: parsed.data.totalAmount,
        deliveryAddress: parsed.data.deliveryAddress,
        paymentMethod: parsed.data.paymentMethod,
        paymentId: parsed.data.paymentId,
        vendorId: parsed.data.vendorId,
        status: parsed.data.paymentId ? "confirmed" : "pending",
      });

      await storage.clearEcomCart(req.user!.id);
      res.status(201).json(order);
    } catch (err) {
      console.error("Error creating ecom order:", err);
      res.status(500).json({ message: "Failed to create order" });
    }
  });

  // ==================== E-COMMERCE VENDOR ROUTES ====================

  app.get("/api/ecom/vendor/products", requireVendor, async (req, res) => {
    try {
      const prods = await storage.getVendorEcomProducts(req.user!.id);
      res.json(prods);
    } catch (err) {
      console.error("Error fetching vendor ecom products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.post("/api/ecom/vendor/products", requireVendor, async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        images: z.array(z.string()).optional(),
        categoryId: z.string().optional(),
        brand: z.string().optional(),
        sku: z.string().optional(),
        originalPrice: z.string().min(1),
        discountPercent: z.coerce.number().min(0).max(100).default(0),
        price: z.string().min(1),
        variants: z.any().optional(),
        specifications: z.any().optional(),
        stock: z.coerce.number().min(0).default(100),
        isActive: z.boolean().default(true),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const product = await storage.createEcomProduct({ ...parsed.data, vendorId: req.user!.id });
      res.status(201).json(product);
    } catch (err) {
      console.error("Error creating vendor ecom product:", err);
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.patch("/api/ecom/vendor/products/:id", requireVendor, async (req, res) => {
    try {
      const existing = await storage.getEcomProduct(req.params.id);
      if (!existing || existing.vendorId !== req.user!.id) {
        return res.status(404).json({ message: "Product not found" });
      }
      const product = await storage.updateEcomProduct(req.params.id, req.body);
      res.json(product);
    } catch (err) {
      console.error("Error updating vendor ecom product:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/ecom/vendor/products/:id", requireVendor, async (req, res) => {
    try {
      const existing = await storage.getEcomProduct(req.params.id);
      if (!existing || existing.vendorId !== req.user!.id) {
        return res.status(404).json({ message: "Product not found" });
      }
      await storage.deleteEcomProduct(req.params.id);
      res.json({ message: "Product deleted" });
    } catch (err) {
      console.error("Error deleting vendor ecom product:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/ecom/vendor/orders", requireVendor, async (req, res) => {
    try {
      const vendorOrders = await storage.getVendorEcomOrders(req.user!.id);
      res.json(vendorOrders);
    } catch (err) {
      console.error("Error fetching vendor ecom orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/ecom/vendor/orders/:id/status", requireVendor, async (req, res) => {
    try {
      const schema = z.object({ status: z.enum(["processing", "shipped", "delivered", "cancelled"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const order = await storage.getEcomOrder(req.params.id);
      if (!order || order.vendorId !== req.user!.id) {
        return res.status(404).json({ message: "Order not found" });
      }
      const updated = await storage.updateEcomOrderStatus(req.params.id, parsed.data.status);
      res.json(updated);
    } catch (err) {
      console.error("Error updating vendor order status:", err);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.get("/api/ecom/vendor/stats", requireVendor, async (req, res) => {
    try {
      const stats = await storage.getSellerStats(req.user!.id);
      res.json(stats);
    } catch (err) {
      console.error("Error fetching vendor stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  app.get("/api/ecom/vendor/profile", requireVendor, async (req, res) => {
    try {
      const profile = await storage.getSellerProfile(req.user!.id);
      res.json(profile || null);
    } catch (err) {
      console.error("Error fetching seller profile:", err);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  app.post("/api/ecom/vendor/profile", requireVendor, async (req, res) => {
    try {
      const schema = z.object({
        storeName: z.string().min(1),
        storeDescription: z.string().optional(),
        logo: z.string().optional(),
        banner: z.string().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const existing = await storage.getSellerProfile(req.user!.id);
      if (existing) {
        const updated = await storage.updateSellerProfile(req.user!.id, parsed.data);
        return res.json(updated);
      }
      const profile = await storage.createSellerProfile({ ...parsed.data, userId: req.user!.id });
      res.status(201).json(profile);
    } catch (err) {
      console.error("Error saving seller profile:", err);
      res.status(500).json({ message: "Failed to save profile" });
    }
  });

  app.get("/api/ecom/vendor/categories", requireVendor, async (req, res) => {
    try {
      const cats = await storage.getEcomCategories();
      res.json(cats);
    } catch (err) {
      console.error("Error fetching ecom categories for vendor:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  // ==================== E-COMMERCE ADMIN ROUTES ====================

  app.get("/api/admin/ecom/categories", requireAdmin, async (req, res) => {
    try {
      const cats = await storage.getAllEcomCategories();
      res.json(cats);
    } catch (err) {
      console.error("Error fetching ecom categories:", err);
      res.status(500).json({ message: "Failed to fetch categories" });
    }
  });

  app.post("/api/admin/ecom/categories", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({
        name: z.string().min(1),
        image: z.string().optional(),
        parentId: z.string().optional(),
        isActive: z.boolean().optional(),
        sortOrder: z.number().optional(),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const cat = await storage.createEcomCategory(parsed.data);
      res.status(201).json(cat);
    } catch (err) {
      console.error("Error creating ecom category:", err);
      res.status(500).json({ message: "Failed to create category" });
    }
  });

  app.patch("/api/admin/ecom/categories/:id", requireAdmin, async (req, res) => {
    try {
      const cat = await storage.updateEcomCategory(req.params.id, req.body);
      if (!cat) return res.status(404).json({ message: "Category not found" });
      res.json(cat);
    } catch (err) {
      console.error("Error updating ecom category:", err);
      res.status(500).json({ message: "Failed to update category" });
    }
  });

  app.delete("/api/admin/ecom/categories/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteEcomCategory(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting ecom category:", err);
      res.status(500).json({ message: "Failed to delete category" });
    }
  });

  app.get("/api/admin/ecom/products", requireAdmin, async (req, res) => {
    try {
      const prods = await storage.getAllEcomProducts();
      res.json(prods);
    } catch (err) {
      console.error("Error fetching ecom products:", err);
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.patch("/api/admin/ecom/products/:id", requireAdmin, async (req, res) => {
    try {
      const product = await storage.updateEcomProduct(req.params.id, req.body);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (err) {
      console.error("Error updating ecom product:", err);
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/admin/ecom/products/:id", requireAdmin, async (req, res) => {
    try {
      await storage.deleteEcomProduct(req.params.id);
      res.sendStatus(204);
    } catch (err) {
      console.error("Error deleting ecom product:", err);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  app.get("/api/admin/ecom/orders", requireAdmin, async (req, res) => {
    try {
      const allOrders = await storage.getAllEcomOrders();
      res.json(allOrders);
    } catch (err) {
      console.error("Error fetching ecom orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.patch("/api/admin/ecom/orders/:id/status", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({ status: z.enum(["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateEcomOrderStatus(req.params.id, parsed.data.status);
      if (!updated) return res.status(404).json({ message: "Order not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating ecom order:", err);
      res.status(500).json({ message: "Failed to update order" });
    }
  });

  app.get("/api/admin/ecom/sellers", requireAdmin, async (req, res) => {
    try {
      const sellers = await storage.getAllSellerProfiles();
      res.json(sellers);
    } catch (err) {
      console.error("Error fetching sellers:", err);
      res.status(500).json({ message: "Failed to fetch sellers" });
    }
  });

  app.patch("/api/admin/ecom/sellers/:userId/commission", requireAdmin, async (req, res) => {
    try {
      const schema = z.object({ commissionRate: z.string() });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });
      const updated = await storage.updateSellerProfile(req.params.userId, { commissionRate: parsed.data.commissionRate });
      if (!updated) return res.status(404).json({ message: "Seller not found" });
      res.json(updated);
    } catch (err) {
      console.error("Error updating commission:", err);
      res.status(500).json({ message: "Failed to update commission" });
    }
  });

  app.get("/api/admin/ecom/stats", requireAdmin, async (req, res) => {
    try {
      const { db: database } = await import("./db");
      const { ecomProducts: ep, ecomOrders: eo, sellerProfiles: sp, ecomCategories: ec } = await import("@shared/schema");
      const { count: cnt, sum: sm } = await import("drizzle-orm");

      const [productCount] = await database.select({ count: cnt() }).from(ep);
      const [orderCount] = await database.select({ count: cnt() }).from(eo);
      const [categoryCount] = await database.select({ count: cnt() }).from(ec);
      const [sellerCount] = await database.select({ count: cnt() }).from(sp);
      const [revenue] = await database.select({ total: sm(eo.totalAmount) }).from(eo);

      res.json({
        totalProducts: productCount.count,
        totalOrders: orderCount.count,
        totalCategories: categoryCount.count,
        totalSellers: sellerCount.count,
        totalRevenue: revenue.total || "0",
      });
    } catch (err) {
      console.error("Error fetching ecom stats:", err);
      res.status(500).json({ message: "Failed to fetch stats" });
    }
  });

  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  app.get("/uploads/:filename", (req, res) => {
    const filePath = path.join(uploadsDir, req.params.filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "File not found" });
    }
    res.sendFile(filePath);
  });

  app.post("/api/uploads/direct", async (req, res) => {
    try {
      const { fileName, fileData, contentType } = req.body;
      if (!fileName || !fileData) {
        return res.status(400).json({ error: "fileName and fileData are required" });
      }

      const ext = path.extname(fileName) || ".bin";
      const uniqueName = `${crypto.randomUUID()}${ext}`;
      const buffer = Buffer.from(fileData, "base64");
      const filePath = path.join(uploadsDir, uniqueName);
      fs.writeFileSync(filePath, buffer);

      const objectPath = `/uploads/${uniqueName}`;
      res.json({ objectPath, fileName: uniqueName, originalName: fileName });
    } catch (err) {
      console.error("Direct upload error:", err);
      res.status(500).json({ error: "Failed to upload file" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
