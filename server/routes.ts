import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
declare const require: any;
import { z } from "zod";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import multer from "multer";
import Razorpay from "razorpay";
import { storage } from "./storage";
import { getDb, newId } from "./db";
import { setupAuth, requireAuth, requireAdmin, requireVendor } from "./auth";
import getRedis from "./redis";
import { createAndDispatchNotification } from './notifications';
import { registerObjectStorageRoutes } from "./replit_integrations/object_storage";
import { registerTaxiRoutes } from "./taxi-routes";
import { registerTaxiPricingRoutes } from "./api/taxi-pricing-routes";
import { registerSurgeRoutes } from "./api/surge-routes";
import { registerEtaRoutes } from "./api/eta-routes";
import { registerHotelRoutes } from "./hotel-routes";
import { registerMovingRoutes } from "./moving-routes";
import { registerFoodRoutes } from "./food-routes";
import { registerCityServicesRoutes } from "./city-services-routes";
import { registerMapRoutes } from "./map-routes";
import { registerRideRoutes } from "./api/ride-routes";
import { registerDriverRoutes } from "./api/driver-routes";
import { registerAdminRoutes } from "./api/admin-routes";
import { registerPaymentRoutes } from "./api/payment-routes";
import { registerDriverAuthRoutes } from "./api/driver-auth-routes";
import { getRecommendationsForUser, getTrendingItems, getTrendingFood, getPopularFoodInLocation, sseSubscribe } from './recommendations';

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

const productFormSchema = insertProductSchema.extend({
  name: z.string().min(1, "Name is required"),
  originalPrice: z.string().min(1, "Original price is required"),
  price: z.string().min(1, "Price is required"),
  isTrending: z.boolean().optional().nullable(),
});

const categoryFormSchema = insertCategorySchema.extend({
  name: z.string().min(1, "Name is required"),
});

const bannerFormSchema = insertBannerSchema.extend({
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

  // Register food delivery routes
  registerFoodRoutes(app);
  registerMovingRoutes(app);
  registerCityServicesRoutes(app);
  registerHotelRoutes(app);
  registerTaxiRoutes(app);
  registerTaxiPricingRoutes(app as any);
  registerSurgeRoutes(app as any);
  registerEtaRoutes(app as any);
  registerMapRoutes(app);
  
  // Register Uber/Taxi app routes
  registerRideRoutes(app);
  registerDriverRoutes(app);
  registerAdminRoutes(app);
  registerPaymentRoutes(app);
  registerDriverAuthRoutes(app);

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

  // Recommendations endpoints
  app.get('/api/recommendations/personalized', async (req, res) => {
    try {
      const city = typeof req.query.city === 'string' ? req.query.city : undefined;
      if (req.isAuthenticated && req.isAuthenticated()) {
        const data = await getRecommendationsForUser(req.user!.id, city ? { city } : undefined as any);
        const popularNearby = city ? await getPopularFoodInLocation(city, 12) : await getTrendingItems(12);
        res.json({ ...data, popularNearby });
      } else {
        // anonymous user: try location-based fallback then trending
        if (city) {
          const popular = await getPopularFoodInLocation(city, 12);
          if (popular && popular.length) return res.json({ recommended: [], frequentlyBoughtTogether: [], similar: [], trending: await getTrendingItems(12), popularNearby: popular });
        }
        const trending = await getTrendingItems(12);
        res.json({ recommended: [], frequentlyBoughtTogether: [], similar: [], trending, popularNearby: trending });
      }
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
  });

  app.get('/api/recommendations/food/trending', async (req, res) => {
    try {
      const limit = Math.min(50, parseInt((req.query.limit as string) || '12', 10) || 12);
      const data = await getTrendingFood(limit);
      res.json(data);
    } catch (err) {
      console.error('Failed to fetch food trending', err);
      res.status(500).json({ message: 'Failed to fetch trending' });
    }
  });

  app.get('/api/recommendations/food/popular', async (req, res) => {
    try {
      const city = typeof req.query.city === 'string' ? req.query.city : undefined;
      const limit = Math.min(50, parseInt((req.query.limit as string) || '12', 10) || 12);
      if (!city) return res.status(400).json({ message: 'city query param required' });
      const data = await getPopularFoodInLocation(city, limit);
      res.json(data);
    } catch (err) {
      console.error('Failed to fetch food popular by city', err);
      res.status(500).json({ message: 'Failed to fetch popular items' });
    }
  });

  app.get('/api/recommendations/stream', requireAuth, async (req, res) => {
    try {
      sseSubscribe(req.user!.id, res as any);
    } catch (err) {
      console.error('Failed to subscribe to recommendations stream', err);
      res.status(500).end();
    }
  });

  app.post('/api/recommendations/events', async (req, res) => {
    try {
      const { type, productId } = req.body || {};
      const db = getDb();
      await db.collection('recommendation_events').insertOne({ _id: newId() as any, userId: req.isAuthenticated && req.isAuthenticated() ? req.user!.id : null, type, productId, createdAt: new Date() });
      res.status(201).json({ success: true });
    } catch (err) {
      console.error('Failed to record recommendation event', err);
      res.status(500).json({ message: 'Failed to record event' });
    }
  });

  // Combos API
  const comboSchema = z.object({ name: z.string().min(1), items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive().default(1) })), totalPrice: z.string(), discount: z.number().min(0).max(100).optional() });

  app.get('/api/combos', async (req, res) => {
    try {
      const combos = await getDb().collection('combos').find().toArray();
      res.json(combos.map((c: any) => ({ id: (c._id as any).toString(), ...c })));
    } catch (err) {
      console.error('Failed to fetch combos', err);
      res.status(500).json({ message: 'Failed to fetch combos' });
    }
  });

  app.post('/api/combos', requireAdmin, async (req, res) => {
    try {
      const parsed = comboSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || 'Invalid combo' });
      const doc = { _id: newId() as any, ...parsed.data, createdAt: new Date() };
      await getDb().collection('combos').insertOne(doc);
      res.status(201).json({ id: doc._id, ...doc });
    } catch (err) {
      console.error('Failed to create combo', err);
      res.status(500).json({ message: 'Failed to create combo' });
    }
  });

  app.post('/api/combos/:id/add-to-cart', requireAuth, async (req, res) => {
    try {
      const id = req.params.id;
      const combo = await getDb().collection('combos').findOne({ _id: id as any });
      if (!combo) return res.status(404).json({ message: 'Combo not found' });
      const items = combo.items || [];
      const added: any[] = [];
      for (const it of items) {
        const item = await storage.addToCart({ userId: req.user!.id, productId: it.productId, quantity: it.quantity || 1 });
        added.push(item);
      }
      res.json({ success: true, items: added });
    } catch (err) {
      console.error('Failed to add combo to cart', err);
      res.status(500).json({ message: 'Failed to add combo to cart' });
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

  // Public: products marked as trending
  app.get('/api/products/trending', async (req, res) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10) || 1;
      const limit = Math.min(100, parseInt((req.query.limit as string) || '24', 10) || 24);
      const service = typeof req.query.service === 'string' ? req.query.service : undefined;
      const products = await storage.getTrendingProducts(page, limit, service);
      res.json(products);
    } catch (err) {
      console.error('Error fetching products trending:', err);
      res.status(500).json({ message: 'Failed to fetch trending products' });
    }
  });

  // Simple search endpoint for food items
  app.get('/api/search', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();
      const limit = Math.min(20, Math.max(1, parseInt((req.query.limit as string) || '8', 10)));
      if (!q) return res.json([]);
      // escape regex
      const esc = q.replace(/[.*+?^${}()|[\\]\\]/g, '\\\\$&');
      const regex = new RegExp(esc, 'i');
      const db = getDb();

      // search restaurants and menu items, prefer restaurants first
      const restColl = db.collection('food_restaurants');
      const itemColl = db.collection('food_menu_items');

      const [rests, items] = await Promise.all([
        restColl.find({ name: { $regex: regex } }).limit(limit).toArray(),
        itemColl.find({ $or: [{ name: { $regex: regex } }, { category: { $regex: regex } }] }).limit(limit).toArray(),
      ]);

      const restResults = (rests || []).map((r: any) => ({ id: String(r._id), name: r.name, image: r.image || null, type: 'restaurant' }));
      const itemResults = (items || []).map((d: any) => ({ id: String(d._id), name: d.name, price: d.price, image: d.image || null, category: d.category, restaurantId: d.restaurantId ? String(d.restaurantId) : null, type: 'item' }));

      // merge, restaurants first, cap to limit
      const results = [...restResults, ...itemResults].slice(0, limit);
      res.json(results);
    } catch (err) {
      console.error('Search endpoint error', err);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  // Reviews API
  app.post('/api/reviews', requireAuth, async (req, res) => {
    try {
      const { productId, rating, comment } = req.body || {};
      if (!productId || typeof productId !== 'string') return res.status(400).json({ message: 'productId required' });
      const r = Number(rating);
      if (!r || r < 1 || r > 5) return res.status(400).json({ message: 'rating must be 1-5' });
      const db = getDb();
      const existing = await db.collection('reviews').findOne({ productId, userId: req.user!.id });
      if (existing) {
        await db.collection('reviews').updateOne({ _id: existing._id }, { $set: { rating: r, comment: comment || '', updatedAt: new Date() } });
      } else {
        await db.collection('reviews').insertOne({ _id: newId() as any, productId, userId: req.user!.id, rating: r, comment: comment || '', createdAt: new Date() });
      }
      // return updated summary
      const agg = await db.collection('reviews').aggregate([
        { $match: { productId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]).toArray();
      const summary = agg && agg[0] ? { averageRating: Number((agg[0].avg || 0).toFixed(2)), totalReviews: agg[0].count || 0 } : { averageRating: 0, totalReviews: 0 };
      res.json({ success: true, ...summary });
    } catch (err) {
      console.error('Failed to submit review', err);
      res.status(500).json({ message: 'Failed to submit review' });
    }
  });

  app.get('/api/reviews/:productId', async (req, res) => {
    try {
      const productId = req.params.productId;
      const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
      const limit = Math.min(50, parseInt((req.query.limit as string) || '5', 10));
      const sort = (req.query.sort as string) || 'latest';
      const db = getDb();
      const agg = await db.collection('reviews').aggregate([
        { $match: { productId } },
        { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } }
      ]).toArray();
      const summary = agg && agg[0] ? { averageRating: Number((agg[0].avg || 0).toFixed(2)), totalReviews: agg[0].count || 0 } : { averageRating: 0, totalReviews: 0 };
      const sortObj: any = sort === 'highest' ? { rating: -1, createdAt: -1 } : { createdAt: -1 };
      const cursor = db.collection('reviews').find({ productId }).sort(sortObj).skip((page - 1) * limit).limit(limit);
      const rows = await cursor.toArray();
      // attach user display name where possible
      const users = await db.collection('users').find({ _id: { $in: rows.map((r:any) => r.userId) } }).toArray();
      const userMap: Record<string, any> = {};
      for (const u of users) userMap[String(u._id)] = u;
      const out = rows.map((r: any) => ({ id: String(r._id), userId: r.userId, userName: userMap[String(r.userId)] ? (userMap[String(r.userId)].name || userMap[String(r.userId)].username) : null, rating: r.rating, comment: r.comment, createdAt: r.createdAt }));
      res.json({ summary, reviews: out, page, limit });
    } catch (err) {
      console.error('Failed to fetch reviews', err);
      res.status(500).json({ message: 'Failed to fetch reviews' });
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

  // Multer setup for avatar uploads
  const avatarsDir = path.resolve(__dirname, "..", "uploads", "avatars");
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });

  const storageDisk = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, avatarsDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || "";
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
      cb(null, name);
    },
  });

  const fileFilter = (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowed = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files are allowed"));
  };

  const upload = multer({ storage: storageDisk, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

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

  // Direct avatar upload (multipart/form-data)
  app.post("/api/profile/upload-avatar-file", requireAuth, upload.single("avatar"), async (req, res) => {
    try {
      const file = req.file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ message: "No file uploaded" });

      // Build public path for serving via /uploads
      const avatarPath = `/uploads/avatars/${file.filename}`;

      await storage.updateUserProfile(req.user!.id, { avatar: avatarPath } as any);

      res.json({ avatar: avatarPath });
    } catch (err) {
      console.error("Error uploading avatar file:", err);
      res.status(500).json({ message: "Failed to upload avatar" });
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

  // ==================== PROFILE ROUTES ====================

  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.user!.id);
      res.json(profile || {});
    } catch (err) {
      console.error("Error fetching profile:", err);
      res.status(500).json({ message: "Failed to fetch profile" });
    }
  });

  const updateProfileSchema = z.object({
    name: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    avatar: z.string().optional().nullable(),
  });

  app.put("/api/profile/update", requireAuth, async (req, res) => {
    try {
      const parsed = updateProfileSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });
      const user = await storage.updateUserProfile(req.user!.id, parsed.data as any);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json(user);
    } catch (err) {
      console.error("Error updating profile:", err);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.post("/api/profile/upload-avatar", requireAuth, async (req, res) => {
    try {
      const schema = z.object({ objectPath: z.string().min(1) });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid data" });

      // objectPath should be a path like /objects/<id> or an absolute URL returned by object storage
      const avatarPath = parsed.data.objectPath;
      const user = await storage.updateUserProfile(req.user!.id, { avatar: avatarPath } as any);
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ avatar: avatarPath });
    } catch (err) {
      console.error("Error uploading avatar:", err);
      res.status(500).json({ message: "Failed to upload avatar" });
    }
  });

  // Profile-scoped orders and tickets (convenience endpoints)
  app.get("/api/profile/orders", requireAuth, async (req, res) => {
    try {
      const orders = await storage.getOrders(req.user!.id);
      res.json(orders);
    } catch (err) {
      console.error("Error fetching profile orders:", err);
      res.status(500).json({ message: "Failed to fetch orders" });
    }
  });

  app.get("/api/profile/tickets", requireAuth, async (req, res) => {
    try {
      const tickets = await storage.getTickets(req.user!.id);
      res.json(tickets);
    } catch (err) {
      console.error("Error fetching profile tickets:", err);
      res.status(500).json({ message: "Failed to fetch tickets" });
    }
  });

  // Notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getNotifications(req.user!.id);
      res.json(notifs);
    } catch (err) {
      console.error("Error fetching notifications:", err);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/notifications/read", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.user!.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking notifications read:", err);
      res.status(500).json({ message: "Failed to mark notifications read" });
    }
  });

  app.patch("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.markNotificationRead(id, req.user!.id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error marking notification read:", err);
      res.status(500).json({ message: "Failed to mark notification read" });
    }
  });

  // Recommendations - personalized and streaming
  app.get('/api/recommendations', requireAuth, async (req, res) => {
    try {
      const { getRecommendationsForUser } = await import('./recommendations');
      const data = await getRecommendationsForUser(req.user!.id);
      res.json(data);
    } catch (err) {
      console.error('Error fetching recommendations:', err);
      res.status(500).json({ message: 'Failed to fetch recommendations' });
    }
  });

  app.get('/api/recommendations/stream', requireAuth, async (req, res) => {
    try {
      const { sseSubscribe, getRecommendationsForUser } = await import('./recommendations');
      // send initial payload
      const initial = await getRecommendationsForUser(req.user!.id);
      res.writeHead(200, {
        Connection: 'keep-alive',
        'Cache-Control': 'no-cache',
        'Content-Type': 'text/event-stream',
      });
      res.write(`event: recommendations\ndata: ${JSON.stringify(initial)}\n\n`);
      // subscribe for updates
      sseSubscribe(req.user!.id, res as any);
    } catch (err) {
      console.error('Error opening recommendations stream:', err);
      res.status(500).json({ message: 'Failed to open stream' });
    }
  });

  // REST recommendation endpoints (modular)
  app.get('/api/recommendations/personalized', requireAuth, async (req, res) => {
    try {
      const { getRecommendationsForUser } = await import('./recommendations');
      const data = await getRecommendationsForUser(req.user!.id);
      res.json(data);
    } catch (err) {
      console.error('Error fetching personalized recommendations:', err);
      res.status(500).json({ message: 'Failed to fetch personalized recommendations' });
    }
  });

  app.get('/api/recommendations/similar/:productId', async (req, res) => {
    try {
      const { getSimilarProducts } = await import('./recommendations');
      const list = await getSimilarProducts(req.params.productId, 12);
      res.json(list);
    } catch (err) {
      console.error('Error fetching similar products:', err);
      res.status(500).json({ message: 'Failed to fetch similar products' });
    }
  });

  app.get('/api/recommendations/frequently-bought/:productId', async (req, res) => {
    try {
      const { getFrequentlyBoughtTogether } = await import('./recommendations');
      const list = await getFrequentlyBoughtTogether(req.params.productId, 12);
      res.json(list);
    } catch (err) {
      console.error('Error fetching frequently bought together:', err);
      res.status(500).json({ message: 'Failed to fetch frequently bought together' });
    }
  });

  app.get('/api/recommendations/trending', async (req, res) => {
    try {
      const { getTrendingItems } = await import('./recommendations');
      const service = typeof req.query.service === 'string' ? req.query.service : undefined;
      const list = await getTrendingItems(24, service);
      res.json(list);
    } catch (err) {
      console.error('Error fetching trending items:', err);
      res.status(500).json({ message: 'Failed to fetch trending items' });
    }
  });

  // Public trending endpoint (paginated, cached)
  app.get('/api/trending', async (req, res) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10) || 1;
      const limit = Math.min(100, parseInt((req.query.limit as string) || '24', 10) || 24);
      const service = typeof req.query.service === 'string' ? req.query.service : undefined;
      const redis = await import('./redis').then(m => m.getRedis ? m.getRedis() : null).catch(() => null);
      const cacheKey = `trending:service:${service || 'global'}:page:${page}:limit:${limit}`;
      if (redis) {
        try {
          const cached = await redis.get(cacheKey);
          if (cached) return res.json(JSON.parse(cached));
        } catch (e) {}
      }

      const products = await storage.getTrendingProducts(page, limit, service);
      if (redis) {
        try { await redis.setex(cacheKey, 60, JSON.stringify(products)); } catch (e) {}
      }
      res.json(products);
    } catch (err) {
      console.error('Error fetching trending products:', err);
      res.status(500).json({ message: 'Failed to fetch trending products' });
    }
  });

  // Admin: list/manage trending flags
  app.get('/api/admin/trending', requireAdmin, async (req, res) => {
    try {
      const page = parseInt((req.query.page as string) || '1', 10) || 1;
      const limit = Math.min(200, parseInt((req.query.limit as string) || '50', 10) || 50);
      const service = typeof req.query.service === 'string' ? req.query.service : undefined;
      const products = await storage.getTrendingProducts(page, limit, service);
      res.json(products);
    } catch (err) {
      console.error('Error listing trending products (admin):', err);
      res.status(500).json({ message: 'Failed to list trending products' });
    }
  });

  app.post('/api/admin/trending/:productId', requireAdmin, async (req, res) => {
    try {
      const { isTrending, score } = req.body || {};
      if (typeof isTrending !== 'boolean') return res.status(400).json({ message: 'isTrending (boolean) is required' });
      await storage.setProductTrending(req.params.productId, isTrending, score !== undefined ? Number(score) : undefined);
      res.json({ success: true });
    } catch (err) {
      console.error('Error updating product trending flag:', err);
      res.status(500).json({ message: 'Failed to update trending flag' });
    }
  });

  // Event capture endpoint for user interactions (views, clicks, cart-add)
  app.post('/api/recommendations/events', async (req, res) => {
    try {
      const { type, productId, meta, userId: bodyUserId } = req.body || {};
      if (!type) return res.status(400).json({ message: 'type is required' });
      // prefer authenticated user if present
      const uid = (req as any).user ? (req as any).user.id : (bodyUserId || null);
      await storage.addUserEvent(uid, type, productId || null, meta || {});
      res.json({ success: true });
    } catch (err) {
      console.error('Error recording recommendation event:', err);
      res.status(500).json({ message: 'Failed to record event' });
    }
  });

  // Restock subscriptions
  app.post("/api/restock/subscribe", requireAuth, async (req, res) => {
    try {
      const { productId } = req.body;
      if (!productId) return res.status(400).json({ message: "productId is required" });
      await storage.addRestockSubscription(req.user!.id, productId);
      res.json({ success: true });
    } catch (err) {
      console.error("Error subscribing to restock:", err);
      res.status(500).json({ message: "Failed to subscribe to restock" });
    }
  });

  app.get("/api/restock/subscriptions", requireAuth, async (req, res) => {
    try {
      const subs = await storage.getRestockSubscriptionsByUser(req.user!.id);
      res.json(subs);
    } catch (err) {
      console.error("Error fetching restock subscriptions:", err);
      res.status(500).json({ message: "Failed to fetch subscriptions" });
    }
  });

  // Register/unregister push tokens
  app.post("/api/notifications/register-token", requireAuth, async (req, res) => {
    try {
      const { token } = req.body as any;
      if (!token) return res.status(400).json({ message: "token is required" });
      await getDb().collection("users").updateOne({ _id: req.user!.id as any }, { $addToSet: { pushTokens: token } });
      res.json({ success: true });
    } catch (err) {
      console.error("Error registering push token:", err);
      res.status(500).json({ message: "Failed to register token" });
    }
  });

  // Return VAPID public key for web push subscription (if configured)
  app.get('/api/notifications/vapid', async (req, res) => {
    try {
      const publicKey = process.env.VAPID_PUBLIC_KEY || '';
      res.json({ publicKey });
    } catch (err) {
      console.error('Error fetching VAPID key:', err);
      res.status(500).json({ message: 'Failed to fetch VAPID key' });
    }
  });

  app.post("/api/notifications/unregister-token", requireAuth, async (req, res) => {
    try {
      const { token } = req.body as any;
      if (!token) return res.status(400).json({ message: "token is required" });
      await getDb().collection("users").updateOne({ _id: req.user!.id as any }, { $pull: { pushTokens: token } });
      res.json({ success: true });
    } catch (err) {
      console.error("Error unregistering push token:", err);
      res.status(500).json({ message: "Failed to unregister token" });
    }
  });

  // Update notification preferences
  app.patch("/api/notifications/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = req.body as any;
      const allowed: any = {};
      if (prefs.inApp !== undefined) allowed["notificationPreferences.inApp"] = !!prefs.inApp;
      if (prefs.push !== undefined) allowed["notificationPreferences.push"] = !!prefs.push;
      if (prefs.sms !== undefined) allowed["notificationPreferences.sms"] = !!prefs.sms;
      await getDb().collection("users").updateOne({ _id: req.user!.id as any }, { $set: allowed });
      res.json({ success: true });
    } catch (err) {
      console.error("Error updating notification preferences:", err);
      res.status(500).json({ message: "Failed to update preferences" });
    }
  });

  app.delete("/api/restock/subscriptions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      await storage.removeRestockSubscription(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error removing restock subscription:", err);
      res.status(500).json({ message: "Failed to remove subscription" });
    }
  });

  // Admin: list subscribers for a product
  app.get("/api/admin/restock/subscribers/:productId", requireAdmin, async (req, res) => {
    try {
      const { productId } = req.params;
      const subs = await storage.getRestockSubscriptionsByProduct(productId);
      res.json(subs);
    } catch (err) {
      console.error("Error fetching subscribers for product:", err);
      res.status(500).json({ message: "Failed to fetch subscribers" });
    }
  });

  // Admin: bulk notify subscribers for multiple products
  app.post("/api/admin/restock/bulk-notify", requireAdmin, async (req, res) => {
    try {
      const { productIds, title, description, removeSubscriptions = true } = req.body as any;
      if (!Array.isArray(productIds) || productIds.length === 0) {
        return res.status(400).json({ message: "productIds (array) is required" });
      }

      const db = getDb();
      // fetch all subscriptions for these products
      const subs = await db.collection("restock_subscriptions").find({ productId: { $in: productIds } }).toArray();

      const notifications: any[] = [];
      for (const s of subs) {
        const prod = await storage.getProduct(s.productId);
        const prodName = prod?.name || "Item";
        notifications.push({
          _id: newId() as any,
          userId: s.userId,
          title: title || `${prodName} is back in stock!`,
          description: description || `${prodName} is now available — order now!`,
          createdAt: new Date(),
          read: false,
        });
      }

      if (notifications.length > 0) {
        await db.collection("notifications").insertMany(notifications);
      }

      if (removeSubscriptions) {
        await db.collection("restock_subscriptions").deleteMany({ productId: { $in: productIds } });
      }

      res.json({ success: true, notified: notifications.length });
    } catch (err) {
      console.error("Error bulk notifying restock subscribers:", err);
      res.status(500).json({ message: "Failed to notify subscribers" });
    }
  });

  // Admin: list notifications with optional filters
  app.get("/api/admin/notifications", requireAdmin, async (req, res) => {
    try {
      const { status, type, limit } = req.query as any;
      const filter: any = {};
      if (status) filter.status = status;
      if (type) filter.type = type;
      const cursor = getDb().collection("notifications").find(filter).sort({ createdAt: -1 });
      if (limit) cursor.limit(parseInt(limit, 10));
      const list = await cursor.toArray();
      res.json(list.map((d: any) => ({ id: d._id.toString(), ...d })));
    } catch (err) {
      console.error("Error listing notifications:", err);
      res.status(500).json({ message: "Failed to list notifications" });
    }
  });

  // Admin: retry a notification by id
  app.post("/api/admin/notifications/:id/retry", requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const doc = await getDb().collection("notifications").findOne({ _id: id as any });
      if (!doc) return res.status(404).json({ message: "Notification not found" });
      // re-dispatch
      const result = await createAndDispatchNotification(doc.userId, doc.type || 'manual', doc.relatedId || null, doc.title, doc.description, doc.meta || {});
      // update original doc retryCount/lastRetriedAt
      await getDb().collection("notifications").updateOne({ _id: id as any }, { $set: { lastRetriedAt: new Date(), lastRetryResult: result.status }, $inc: { retryCount: 1 } });
      res.json({ success: true, result });
    } catch (err) {
      console.error("Error retrying notification:", err);
      res.status(500).json({ message: "Failed to retry notification" });
    }
  });

  // Admin: send arbitrary notification to user (order events, etc.)
  app.post("/api/admin/notifications/send", requireAdmin, async (req, res) => {
    try {
      const { userId, type, relatedId, title, description, meta } = req.body as any;
      if (!userId || !title) return res.status(400).json({ message: "userId and title are required" });
      const result = await createAndDispatchNotification(userId, type || 'manual', relatedId || null, title, description || null, meta || {});
      res.json({ success: true, result });
    } catch (err) {
      console.error("Error sending admin notification:", err);
      res.status(500).json({ message: "Failed to send notification" });
    }
  });

  // Admin: send test notification to any user
  app.post('/api/admin/notifications/test', requireAdmin, async (req, res) => {
    try {
      const { userId, title = 'Admin test', description = 'This is an admin-initiated test notification', meta = {} } = req.body || {};
      if (!userId) return res.status(400).json({ message: 'userId is required' });
      const user = await storage.getUser(userId as any);
      if (!user) return res.status(404).json({ message: 'User not found' });
      const result = await createAndDispatchNotification(userId, 'admin.test', null, title, description, meta);
      res.json({ success: true, result });
    } catch (err) {
      console.error('Error sending admin test notification:', err);
      res.status(500).json({ message: 'Failed to send admin test notification' });
    }
  });

  // Authenticated: send a test notification to the current user (useful for manual testing)
  app.post('/api/notifications/test', requireAuth, async (req, res) => {
    try {
      const { title = 'Test notification', description = 'This is a test notification from City Serve Hub', meta = {} } = req.body || {};
      const result = await createAndDispatchNotification(req.user!.id as any, 'test', null, title, description, meta);
      res.json({ success: true, result });
    } catch (err) {
      console.error('Error sending test notification:', err);
      res.status(500).json({ message: 'Failed to send test notification' });
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
      const { getDb } = await import("./db");
      const db = getDb();

      const totalUsers = await db.collection("users").countDocuments({ isAdmin: { $ne: true } });
      const totalProducts = await db.collection("products").countDocuments();
      const totalCategories = await db.collection("categories").countDocuments();
      const totalOrders = await db.collection("orders").countDocuments();
      const openTickets = await db.collection("support_tickets").countDocuments({ status: "open" });

      const revAgg = await db.collection("orders").aggregate([
        { $group: { _id: null, total: { $sum: { $toDouble: "$totalAmount" } } } }
      ]).toArray();
      const totalRevenue = revAgg[0]?.total?.toFixed(2) || "0";

      const statusAgg = await db.collection("orders").aggregate([
        { $group: { _id: "$status", count: { $sum: 1 } } }
      ]).toArray();
      const orderStatusBreakdown = statusAgg.map(s => ({ status: s._id, count: s.count }));

      const recentOrdersDocs = await db.collection("orders").find().sort({ createdAt: -1 }).limit(10).toArray();
      const recentOrders = [];
      for (const o of recentOrdersDocs) {
        const user = await db.collection("users").findOne({ _id: o.userId as any });
        recentOrders.push({
          id: (o._id as any).toString(),
          orderNumber: o.orderNumber,
          totalAmount: o.totalAmount,
          status: o.status,
          paymentMethod: o.paymentMethod,
          createdAt: o.createdAt,
          username: user?.username,
          name: user?.name,
        });
      }

      res.json({
        totalUsers,
        totalProducts,
        totalCategories,
        totalOrders,
        totalRevenue,
        openTickets,
        orderStatusBreakdown,
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

  // Admin: reindex all products to Typesense (if enabled)
  app.post('/api/admin/search/reindex', requireAdmin, async (req, res) => {
    try {
      const { typesenseEnabled, indexProduct } = await import('./search');
      if (!typesenseEnabled) return res.status(400).json({ message: 'Typesense not configured' });
      const products = await storage.getAllProducts();
      for (const p of products) {
        // fire-and-forget
        indexProduct({ _id: p.id, name: p.name, categoryId: p.categoryId, tags: (p as any).tags, price: p.price, stock: p.stock, image: (p as any).image || (p as any).images?.[0] || '' }).catch(() => {});
      }
      res.json({ success: true, reindexed: products.length });
    } catch (err) {
      console.error('Error reindexing products:', err);
      res.status(500).json({ message: 'Reindex failed' });
    }
  });

  // Public product search: prefer Typesense if configured, otherwise fallback to DB-based search
  app.get('/api/search/products', async (req, res) => {
    try {
      const q = (req.query.q as string || '').trim();
      if (!q) return res.json([]);
      try {
        const { typesenseEnabled, searchProductsTypesense } = await import('./search');
        if (typesenseEnabled) {
          const ts = await searchProductsTypesense(q, 50);
          if (ts && ts.length > 0) return res.json(ts);
        }
      } catch (e) {
        // ignore typesense errors and fallback
      }

      // fallback: DB search across grocery and ecom products
      const db = getDb();
      const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
      const regex = new RegExp(escapeRegex(q), 'i');

      const groceryPipeline = [
        { $lookup: { from: 'categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
        { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, name: 1, tags: 1, price: 1, stock: 1, image: 1, categoryName: '$categoryDoc.name' } },
        { $match: { $or: [ { name: regex }, { categoryName: regex }, { tags: regex } ] } },
        { $limit: 50 }
      ];

      const ecomPipeline = [
        { $lookup: { from: 'ecom_categories', localField: 'categoryId', foreignField: '_id', as: 'categoryDoc' } },
        { $unwind: { path: '$categoryDoc', preserveNullAndEmptyArrays: true } },
        { $project: { _id: 1, name: 1, tags: 1, price: 1, stock: 1, image: 1, categoryName: '$categoryDoc.name' } },
        { $match: { $or: [ { name: regex }, { categoryName: regex }, { tags: regex } ] } },
        { $limit: 50 }
      ];

      const [groceryResults, ecomResults] = await Promise.all([
        db.collection('products').aggregate(groceryPipeline).toArray(),
        db.collection('ecom_products').aggregate(ecomPipeline).toArray(),
      ]);

      const lowerQ = q.toLowerCase();
      const scoreItem = (p: any, source: string) => {
        let score = 0;
        if (p.name && p.name.toLowerCase().startsWith(lowerQ)) score += 5;
        else if (p.name && p.name.toLowerCase().includes(lowerQ)) score += 3;
        if (p.categoryName && p.categoryName.toLowerCase().startsWith(lowerQ)) score += 4;
        else if (p.categoryName && p.categoryName.toLowerCase().includes(lowerQ)) score += 2;
        if (p.tags && Array.isArray(p.tags)) {
          for (const t of p.tags) {
            if (typeof t === 'string' && t.toLowerCase().startsWith(lowerQ)) score += 2;
            else if (typeof t === 'string' && t.toLowerCase().includes(lowerQ)) score += 1;
          }
        }
        return { ...p, score, source };
      };

      let combined = [] as any[];
      combined.push(...groceryResults.map((p: any) => scoreItem(p, 'grocery')));
      combined.push(...ecomResults.map((p: any) => scoreItem(p, 'ecom')));
      // prioritize fastDelivery items when present
      const fastOnly = req.query.fastDelivery === '1' || req.query.fastDelivery === 'true';
      if (fastOnly) {
        combined = combined.filter(p => p.fastDelivery === true).sort((a,b) => b.score - a.score).slice(0,50);
      } else {
        combined = combined.sort((a,b) => {
          const aFast = !!a.fastDelivery ? 1 : 0;
          const bFast = !!b.fastDelivery ? 1 : 0;
          if (aFast !== bFast) return bFast - aFast; // fastDelivery first
          return b.score - a.score;
        }).slice(0, 50);
      }

      // fuzzy fallback across both collections when no direct matches
      if (combined.length === 0) {
        const allGrocery = await db.collection('products').find({}, { projection: { name: 1, tags: 1, price: 1, stock: 1, image: 1 } }).toArray();
        const allEcom = await db.collection('ecom_products').find({}, { projection: { name: 1, tags: 1, price: 1, stock: 1, image: 1 } }).toArray();
        const all = allGrocery.map((p: any) => ({ ...p, source: 'grocery' })).concat(allEcom.map((p: any) => ({ ...p, source: 'ecom' })));

        const levenshtein = (a: string, b: string) => {
          const m = a.length, n = b.length;
          const dp = Array.from({ length: m+1 }, () => new Array(n+1).fill(0));
          for (let i=0;i<=m;i++) dp[i][0]=i;
          for (let j=0;j<=n;j++) dp[0][j]=j;
          for (let i=1;i<=m;i++){
            for (let j=1;j<=n;j++){
              const cost = a[i-1]===b[j-1] ? 0 : 1;
              dp[i][j] = Math.min(dp[i-1][j]+1, dp[i][j-1]+1, dp[i-1][j-1]+cost);
            }
          }
          return dp[m][n];
        };

        const scored = all.map((p: any) => {
          const name = (p.name || '').toLowerCase();
          const dist = levenshtein(name, q.toLowerCase());
          const score = Math.max(0, Math.floor((Math.max(0, name.length - dist))));
          return { ...p, score, dist };
        }).filter(p => p.dist <= Math.max(2, Math.floor(p.name?.length * 0.4))).sort((a,b) => b.score - a.score).slice(0, 50);

        combined = scored;
      }

      const out = combined.map((p: any) => ({ id: (p._id as any)?.toString() || p.id, name: p.name, category: p.categoryName || null, tags: (p as any).tags || [], price: p.price, stock: p.stock, image: (p as any).image || (p as any).images?.[0] || null, score: p.score || 0, source: p.source || 'grocery', fastDelivery: !!p.fastDelivery }));
      res.json(out);
    } catch (err) {
      console.error('Error searching products:', err);
      res.status(500).json({ message: 'Search failed' });
    }
  });

  app.post("/api/admin/products", requireAdmin, async (req, res) => {
    try {
      const parsed = productFormSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid product data" });
      }
      // Enforce server-side rule: cannot enable fastDelivery if product stock is zero or less
      const requestedFast = !!(parsed.data as any).fastDelivery;
      const requestedStock = (parsed.data as any).stock !== undefined ? (parsed.data as any).stock : 100;
      if (requestedFast && Number(requestedStock) <= 0) {
        return res.status(400).json({ message: "Cannot enable fastDelivery for out-of-stock products" });
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
      // Server-side validation: if enabling fastDelivery, ensure resulting stock > 0
      if ((parsed.data as any).fastDelivery === true) {
        // Determine new stock: prefer provided stock, otherwise check existing product
        let newStock = (parsed.data as any).stock;
        if (newStock === undefined || newStock === null) {
          const existing = await storage.getProduct(req.params.id);
          newStock = existing?.stock ?? 0;
        }
        if (Number(newStock) <= 0) {
          return res.status(400).json({ message: "Cannot enable fastDelivery for out-of-stock products" });
        }
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

  // Bulk update fastDelivery for multiple products with per-id validation and reporting
  app.patch('/api/admin/products/bulk-fast-delivery', requireAdmin, async (req, res) => {
    try {
      const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
      const fastDelivery = !!req.body.fastDelivery;
      if (!ids || !ids.length) return res.status(400).json({ message: 'No product ids provided' });

      const db = getDb();
      const results: { id: string; success: boolean; reason?: string }[] = [];

      for (const id of ids) {
        try {
          const existing = await db.collection('products').findOne({ _id: id as any });
          if (!existing) {
            results.push({ id, success: false, reason: 'not_found' });
            continue;
          }

          // validation: cannot enable fastDelivery if out of stock
          if (fastDelivery && (existing.stock === undefined || existing.stock === null || Number(existing.stock) <= 0)) {
            results.push({ id, success: false, reason: 'out_of_stock' });
            continue;
          }

          // perform update per id
          const r = await db.collection('products').updateOne({ _id: id as any }, { $set: { fastDelivery, updatedAt: new Date() } });
          if (r.modifiedCount && r.modifiedCount > 0) {
            results.push({ id, success: true });
            // try to reindex this product asynchronously
            (async () => {
              try {
                const { indexProduct, typesenseEnabled } = await import('./search');
                if (typesenseEnabled) {
                  const p = await db.collection('products').findOne({ _id: id as any });
                  if (p) indexProduct({ _id: p._id, name: p.name, categoryId: p.categoryId, tags: p.tags, price: p.price, stock: p.stock, image: p.image || (p.images && p.images[0]) || '', fastDelivery: !!p.fastDelivery }).catch(() => {});
                }
              } catch (e) {}
            })();
          } else {
            // no change (maybe same value)
            results.push({ id, success: false, reason: 'no_change' });
          }
        } catch (err) {
          console.error('Error updating product', id, err);
          results.push({ id, success: false, reason: 'error' });
        }
      }

      res.json({ success: true, results });
    } catch (err) {
      console.error('Error bulk updating fastDelivery:', err);
      res.status(500).json({ message: 'Failed to bulk update products' });
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
  const categoryAdFormSchema = insertCategoryAdSchema.extend({
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
        const { getDb, newId } = await import("./db");
        const serviceTypeToPartnerType: Record<string, string> = {
          "E-commerce": "seller",
          "Food": "restaurant",
          "City Moving": "driver",
          "Hotel": "hotel",
          "City Services": "service_provider",
          "Taxi": "driver",
        };
        await getDb().collection("users").insertOne({
          _id: newId() as any,
          username: application.username,
          password: hashedPassword,
          name: application.ownerName,
          email: application.email,
          phone: application.phone,
          isAdmin: false,
          isVendor: true,
          partnerType: serviceTypeToPartnerType[application.serviceType] || "seller",
          createdAt: new Date(),
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

  // DEV helper: fetch recommendations for a username (no auth) — only in non-production
  if (process.env.NODE_ENV !== 'production') {
    app.get('/api/_dev/recommendations-by-username', async (req, res) => {
      try {
        const username = req.query.username as string | undefined;
        if (!username) return res.status(400).json({ message: 'username query required' });
        const user = await storage.getUserByUsername(username);
        if (!user) return res.status(404).json({ message: 'user not found' });
        const { getRecommendationsForUser } = await import('./recommendations');
        const data = await getRecommendationsForUser(user.id);
        res.json({ userId: user.id, ...data });
      } catch (err) {
        console.error('DEV recs error:', err);
        res.status(500).json({ message: 'failed' });
      }
    });
  }

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

  app.post("/api/admin/ecom/products", requireAdmin, async (req, res) => {
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
        isApproved: z.boolean().default(true),
      });
      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0]?.message });

      // Admin-created products are created without a vendorId
      const product = await storage.createEcomProduct({ ...parsed.data, vendorId: null });
      res.status(201).json(product);
    } catch (err) {
      console.error("Error creating admin ecom product:", err);
      res.status(500).json({ message: "Failed to create product" });
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
      const { getDb } = await import("./db");
      const database = getDb();

      const totalProducts = await database.collection("ecom_products").countDocuments();
      const totalOrders = await database.collection("ecom_orders").countDocuments();
      const totalCategories = await database.collection("ecom_categories").countDocuments();
      const totalSellers = await database.collection("seller_profiles").countDocuments();
      const revAgg = await database.collection("ecom_orders").aggregate([
        { $group: { _id: null, total: { $sum: { $toDouble: "$totalAmount" } } } }
      ]).toArray();
      const totalRevenue = revAgg[0]?.total?.toFixed(2) || "0";

      res.json({
        totalProducts,
        totalOrders,
        totalCategories,
        totalSellers,
        totalRevenue,
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

  // Accept local PUT uploads from fallback presigned URLs
  // Use express.raw middleware directly so req.body is a Buffer
  app.put(
    "/api/uploads/local/:filename",
    express.raw({ type: "*/*", limit: "50mb" }),
    async (req, res) => {
      try {
        const filenameRaw = req.params.filename;
        if (!filenameRaw) return res.status(400).json({ error: "Missing filename" });
        // sanitize filename to avoid path traversal
        const filename = path.basename(filenameRaw);
        const filePath = path.join(uploadsDir, filename);

        // req.body should be a Buffer because of express.raw
        const data = req.body as Buffer | undefined;
        if (!data || !Buffer.isBuffer(data) || data.length === 0) {
          return res.status(400).json({ error: "Empty body" });
        }

        // validate extension (allow common image types)
        const ext = path.extname(filename).toLowerCase();
        const allowed = new Set([".jpg", ".jpeg", ".png", ".webp"]);
        if (!allowed.has(ext)) {
          return res.status(400).json({ error: "Unsupported file type" });
        }

        fs.writeFileSync(filePath, data);

        // public URL to access the uploaded file
        const publicUrl = `${req.protocol}://${req.get("host")}/uploads/${encodeURIComponent(filename)}`;

        return res.json({ objectPath: `/uploads/${filename}`, fileName: filename, url: publicUrl });
      } catch (err) {
        console.error("Local PUT upload failed:", err);
        return res.status(500).json({ error: "Failed to upload file" });
      }
    }
  );

  const httpServer = createServer(app);
  // Initialize Socket.IO (moved to server/socket.ts)
  try {
    const { initSocket } = await import('./socket');
    await initSocket(httpServer, app as any);
  } catch (e) {
    console.error('Socket.IO wrapper error', e);
  }

  return httpServer;
}
