import {
  type User, type InsertUser,
  type Category, type InsertCategory,
  type Product, type InsertProduct,
  type CartItem, type InsertCartItem, type CartItemWithProduct,
  type WishlistItem, type InsertWishlistItem, type WishlistItemWithProduct,
  type Order, type InsertOrder,
  type Banner, type InsertBanner,
  type Service, type InsertService,
  type Address, type InsertAddress,
  type CategoryAd, type InsertCategoryAd,
  type SupportTicket, type InsertSupportTicket, type SupportTicketWithMessages,
  type TicketMessage, type InsertTicketMessage,
  type VendorApplication, type InsertVendorApplication,
  type EcomCategory, type InsertEcomCategory,
  type EcomProduct, type InsertEcomProduct,
  type EcomReview, type InsertEcomReview, type EcomReviewWithUser,
  type SellerProfile, type InsertSellerProfile,
  type EcomCartItem, type InsertEcomCartItem, type EcomCartItemWithProduct,
  type EcomWishlistItem, type InsertEcomWishlistItem, type EcomWishlistItemWithProduct,
  type EcomOrder, type InsertEcomOrder,
} from "@shared/schema";
import { getDb, toDoc, toDocs, newId } from "./db";
import { createAndDispatchNotification } from "./notifications";
import session from "express-session";
import { RedisStore } from "connect-redis";
import { createClient } from "redis";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

function col(name: string) {
  return getDb().collection(name);
}

export interface IStorage {
  sessionStore: session.Store;
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string, role?: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { name?: string; email?: string; phone?: string; avatar?: string | null }): Promise<User | undefined>;
  getUserProfile(userId: string): Promise<import("@shared/schema").UserProfile | undefined>;
  updateUserPassword(id: string, password: string): Promise<void>;
  updateUserLoginPin(id: string, loginPin: string): Promise<void>;
  getCategories(): Promise<Category[]>;
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;
  getProducts(filters?: { category?: string; fastDelivery?: boolean; pincode?: string }): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  getCartItems(userId: string): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem | undefined>;
  updateCartItemForUser(id: string, userId: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  removeFromCartForUser(id: string, userId: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  getWishlistItems(userId: string): Promise<WishlistItemWithProduct[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: string, productId: string): Promise<void>;
  getOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<any[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderWithCustomer(id: string): Promise<any>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  getBanners(): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<void>;
  getServices(): Promise<Service[]>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  initializeServices(): Promise<void>;
  getAddresses(userId: string): Promise<Address[]>;
  getAddress(id: string, userId: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, userId: string, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: string, userId: string): Promise<void>;
  setDefaultAddress(id: string, userId: string): Promise<Address | undefined>;
  getCategoryAds(categoryId?: string): Promise<CategoryAd[]>;
  getAllCategoryAds(): Promise<CategoryAd[]>;
  createCategoryAd(ad: InsertCategoryAd): Promise<CategoryAd>;
  updateCategoryAd(id: string, ad: Partial<InsertCategoryAd>): Promise<CategoryAd | undefined>;
  deleteCategoryAd(id: string): Promise<void>;
  getTickets(userId: string): Promise<SupportTicket[]>;
  getAllTickets(): Promise<(SupportTicket & { username?: string; userName?: string })[]>;
  getTicket(id: string): Promise<SupportTicketWithMessages | undefined>;
  createTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateTicketStatus(id: string, status: string): Promise<SupportTicket | undefined>;
  addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;
  getVendorApplications(): Promise<VendorApplication[]>;
  getVendorApplication(id: string): Promise<VendorApplication | undefined>;
  createVendorApplication(application: InsertVendorApplication): Promise<VendorApplication>;
  updateVendorApplicationStatus(id: string, status: string, adminNote?: string): Promise<VendorApplication | undefined>;
  getVendorProducts(vendorId: string): Promise<Product[]>;
  getEcomCategories(): Promise<EcomCategory[]>;
  getAllEcomCategories(): Promise<EcomCategory[]>;
  getEcomCategory(id: string): Promise<EcomCategory | undefined>;
  createEcomCategory(category: InsertEcomCategory): Promise<EcomCategory>;
  updateEcomCategory(id: string, category: Partial<InsertEcomCategory>): Promise<EcomCategory | undefined>;
  deleteEcomCategory(id: string): Promise<void>;
  getEcomProducts(filters?: any): Promise<EcomProduct[]>;
  getAllEcomProducts(): Promise<EcomProduct[]>;
  getEcomProduct(id: string): Promise<EcomProduct | undefined>;
  createEcomProduct(product: InsertEcomProduct): Promise<EcomProduct>;
  updateEcomProduct(id: string, product: Partial<InsertEcomProduct>): Promise<EcomProduct | undefined>;
  deleteEcomProduct(id: string): Promise<void>;
  getVendorEcomProducts(vendorId: string): Promise<EcomProduct[]>;
  getEcomReviews(productId: string): Promise<EcomReviewWithUser[]>;
  createEcomReview(review: InsertEcomReview): Promise<EcomReview>;
  getSellerProfile(userId: string): Promise<SellerProfile | undefined>;
  getSellerProfileById(id: string): Promise<SellerProfile | undefined>;
  getAllSellerProfiles(): Promise<(SellerProfile & { username?: string; name?: string })[]>;
  createSellerProfile(profile: InsertSellerProfile): Promise<SellerProfile>;
  updateSellerProfile(userId: string, profile: Partial<InsertSellerProfile>): Promise<SellerProfile | undefined>;
  getEcomCartItems(userId: string): Promise<EcomCartItemWithProduct[]>;
  addToEcomCart(item: InsertEcomCartItem): Promise<EcomCartItem>;
  updateEcomCartItem(id: string, userId: string, quantity: number): Promise<EcomCartItem | undefined>;
  removeFromEcomCart(id: string, userId: string): Promise<void>;
  clearEcomCart(userId: string): Promise<void>;
  getEcomWishlistItems(userId: string): Promise<EcomWishlistItemWithProduct[]>;
  addToEcomWishlist(item: InsertEcomWishlistItem): Promise<EcomWishlistItem>;
  removeFromEcomWishlist(userId: string, productId: string): Promise<void>;
  getEcomOrders(userId: string): Promise<EcomOrder[]>;
  getAllEcomOrders(): Promise<EcomOrder[]>;
  getVendorEcomOrders(vendorId: string): Promise<EcomOrder[]>;
  getEcomOrder(id: string): Promise<EcomOrder | undefined>;
  createEcomOrder(order: InsertEcomOrder): Promise<EcomOrder>;
  updateEcomOrderStatus(id: string, status: string): Promise<EcomOrder | undefined>;
  getSellerStats(vendorId: string): Promise<{ totalProducts: number; totalOrders: number; totalRevenue: string; pendingOrders: number }>;
  // Event capture for recommendation signals
  addUserEvent(userId: string | null, type: string, productId?: string | null, meta?: any): Promise<void>;
  getUserEvents(userId: string, limit?: number): Promise<any[]>;
  // Trending management
  setProductTrending(productId: string, isTrending: boolean, score?: number): Promise<void>;
  getTrendingProducts(page?: number, limit?: number, service?: string): Promise<Product[]>;
  // Notifications
  getNotifications(userId: string): Promise<any[]>;
  markAllNotificationsRead(userId: string): Promise<void>;
  markNotificationRead(id: string, userId: string): Promise<void>;
  // Restock subscriptions
  addRestockSubscription(userId: string, productId: string): Promise<void>;
  getRestockSubscriptionsByUser(userId: string): Promise<any[]>;
  getRestockSubscriptionsByProduct(productId: string): Promise<any[]>;
  removeRestockSubscription(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    if (process.env.REDIS_URL) {
      const redisClient = createClient({
        url: process.env.REDIS_URL,
      });
      redisClient.on("error", (err) => console.error("Redis session error", err));
      void redisClient.connect().catch((err) => {
        console.error("Failed to connect Redis session store", err);
      });
      this.sessionStore = new RedisStore({
        client: redisClient as any,
        prefix: "sess:",
        ttl: 7 * 24 * 60 * 60,
      }) as unknown as session.Store;
      console.log("Using Redis for session storage");
    } else {
      this.sessionStore = new MemoryStore({ checkPeriod: 86400000 });
      console.log("Using MemoryStore for sessions (set REDIS_URL to use Redis)");
    }
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const doc = await col("users").findOne({ _id: id as any });
    return doc ? toDoc<User>(doc) : undefined;
  }
  async getUserByUsername(username: string): Promise<User | undefined> {
    const doc = await col("users").findOne({ username });
    return doc ? toDoc<User>(doc) : undefined;
  }
  async getUserByPhone(phone: string, role?: string): Promise<User | undefined> {
    const query: any = { phone };
    if (role) query.role = role;
    const doc = await col("users").findOne(query);
    return doc ? toDoc<User>(doc) : undefined;
  }
  async createUser(user: InsertUser): Promise<User> {
    const id = newId();
    const role = (user as any).role || 'customer';
    const doc = { _id: id as any, ...user, role, loginPin: null, isAdmin: false, isVendor: false, partnerType: null, notificationPreferences: { inApp: true, push: false, sms: false }, pushTokens: [] };
    await col("users").insertOne(doc);
    return toDoc<User>(doc);
  }
  async updateUserProfile(id: string, data: { name?: string; email?: string; phone?: string }): Promise<User | undefined> {
    const update: any = {};
    if ((data as any).name !== undefined) update.name = (data as any).name;
    if ((data as any).email !== undefined) update.email = (data as any).email;
    if ((data as any).phone !== undefined) update.phone = (data as any).phone;
    if ((data as any).avatar !== undefined) update.avatar = (data as any).avatar;
    update.updatedAt = new Date();
    const r = await col("users").findOneAndUpdate({ _id: id as any }, { $set: update }, { returnDocument: "after" });
    return r ? toDoc<User>(r) : undefined;
  }
  async updateUserPassword(id: string, password: string): Promise<void> {
    await col("users").updateOne({ _id: id as any }, { $set: { password } });
  }
  async updateUserLoginPin(id: string, loginPin: string): Promise<void> {
    await col("users").updateOne({ _id: id as any }, { $set: { loginPin } });
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return toDocs<Category>(await col("categories").find({ isActive: true }).sort({ sortOrder: 1 }).toArray());
  }
  async getAllCategories(): Promise<Category[]> {
    return toDocs<Category>(await col("categories").find().sort({ sortOrder: 1 }).toArray());
  }
  async getCategory(id: string): Promise<Category | undefined> {
    const doc = await col("categories").findOne({ _id: id as any });
    return doc ? toDoc<Category>(doc) : undefined;
  }
  async createCategory(category: InsertCategory): Promise<Category> {
    const id = newId();
    const doc = { _id: id as any, isActive: true, sortOrder: 0, ...category };
    await col("categories").insertOne(doc);
    return toDoc<Category>(doc);
  }
  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const r = await col("categories").findOneAndUpdate({ _id: id as any }, { $set: category }, { returnDocument: "after" });
    return r ? toDoc<Category>(r) : undefined;
  }
  async deleteCategory(id: string): Promise<void> {
    await col("categories").deleteOne({ _id: id as any });
  }

  // Products
  async getProducts(filters: { category?: string; fastDelivery?: boolean; pincode?: string } = {}): Promise<Product[]> {
    const query: any = { isActive: true };
    if (filters.category) query.categoryId = filters.category;
    if (filters.fastDelivery) {
      query.fastDelivery = true;
      query.fastDeliveryEnabled = { $ne: false };
      query.stock = { $gt: 0 };
      query.$or = [
        { fastDeliveryStock: { $exists: false } },
        { fastDeliveryStock: null },
        { fastDeliveryStock: { $gt: 0 } },
      ];
      if (filters.pincode) {
        query.$and = [{
          $or: [
            { fastDeliveryAreas: { $exists: false } },
            { fastDeliveryAreas: { $size: 0 } },
            { fastDeliveryAreas: filters.pincode },
          ],
        }];
      }
    }
    return toDocs<Product>(await col("products").find(query).sort({ fastDelivery: -1, fastDeliveryEnabled: -1, stock: -1, name: 1 }).toArray());
  }
  async getAllProducts(): Promise<Product[]> {
    return toDocs<Product>(await col("products").find().toArray());
  }
  async getProduct(id: string): Promise<Product | undefined> {
    const doc = await col("products").findOne({ _id: id as any });
    return doc ? toDoc<Product>(doc) : undefined;
  }
  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return toDocs<Product>(await col("products").find({ categoryId, isActive: true }).toArray());
  }
  async createProduct(product: InsertProduct): Promise<Product> {
    const id = newId();
    const fastDelivery = !!(product as any).fastDelivery;
    const stock = (product as any).stock ?? 100;
    const doc = {
      _id: id as any,
      isActive: true,
      stock,
      rating: "4.0",
      discountPercent: 0,
      unit: "1 pc",
      isTrending: !!(product as any).isTrending || false,
      fastDelivery,
      fastDeliveryEnabled: fastDelivery,
      fastDeliveryStock: fastDelivery ? stock : 0,
      fastDeliveryAreas: [],
      fastDeliveryStartTime: null,
      fastDeliveryEndTime: null,
      fastDeliveryMaxRadiusKm: null,
      subscriberDeal: false,
      subscriberDiscountPercent: 0,
      earlyAccess: false,
      earlyAccessUntil: null,
      ...product,
    };
    await col("products").insertOne(doc);
    try {
      const { indexProduct } = await import('./search');
      // index async, don't await
      indexProduct({ _id: doc._id, name: doc.name, categoryId: doc.categoryId, tags: (doc as any).tags, price: doc.price, stock: doc.stock, image: (doc as any).image || (doc as any).images?.[0] || '', fastDelivery: !!doc.fastDelivery }).catch(() => {});
    } catch (e) {}
    return toDoc<Product>(doc);
  }
  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    // fetch existing to detect restock
    const existing = await col("products").findOne({ _id: id as any });
    const prevStock = existing?.stock || 0;
    const r = await col("products").findOneAndUpdate({ _id: id as any }, { $set: product }, { returnDocument: "after" });
    const updated = r ? toDoc<Product>(r) : undefined;

    // if product was out of stock and now restocked, notify subscribers
    const newStock = (product.stock !== undefined && product.stock !== null) ? product.stock : updated?.stock || 0;
    if (prevStock <= 0 && newStock > 0) {
      try {
        const subs = await col("restock_subscriptions").find({ productId: id }).toArray();
        for (const s of subs) {
          const userId = s.userId;
          try {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            createAndDispatchNotification(userId, "product.restock", id as any, `${updated?.name || 'Item'} is back in stock!`, `${updated?.name || 'The item'} is now available — order now!`, { productId: id, productName: updated?.name });
          } catch (err) {
            console.error("Error dispatching restock notification for user", s.userId, err);
          }
        }
        // optionally remove subscriptions after notifying
        await col("restock_subscriptions").deleteMany({ productId: id });
      } catch (err) {
        console.error("Error notifying restock subscribers:", err);
      }
    }

    // update typesense index for the updated product
    try {
      const { indexProduct } = await import('./search');
      if (updated) indexProduct({ _id: updated.id, name: updated.name, categoryId: updated.categoryId, tags: (updated as any).tags, price: updated.price, stock: updated.stock, image: (updated as any).image || (updated as any).images?.[0] || '', fastDelivery: !!(product as any).fastDelivery || !!(updated as any).fastDelivery }).catch(() => {});
    } catch (e) {}

    return updated;
  }
  async deleteProduct(id: string): Promise<void> {
    await col("products").deleteOne({ _id: id as any });
    try {
      const { deleteProductFromIndex } = await import('./search');
      deleteProductFromIndex(id).catch(() => {});
    } catch (e) {}
  }

  // Trending management
  async setProductTrending(productId: string, isTrending: boolean, score?: number): Promise<void> {
    const update: any = { isTrending: !!isTrending, updatedAt: new Date() };
    if (score !== undefined) update.trendingScore = score;
    else if (!isTrending) update.trendingScore = null;
    // try updating grocery products collection
    await col('products').updateOne({ _id: productId as any }, { $set: update });
    // also try updating e-commerce products if present
    try {
      await col('ecom_products').updateOne({ _id: productId as any }, { $set: update });
    } catch (e) {
      // ignore if ecom_products doesn't exist or update fails
    }
  }

  async getTrendingProducts(page = 1, limit = 24, service?: string): Promise<Product[]> {
    const skip = Math.max(0, page - 1) * limit;
    if (service === 'ecom') {
      // return from ecom_products
      const docs = await col('ecom_products').find({ isTrending: true, isActive: true, stock: { $gt: 0 } }).sort({ trendingScore: -1, createdAt: -1 }).skip(skip).limit(limit).toArray();
      return toDocs<any>(docs);
    }
    const docs = await col('products').find({ isTrending: true, isActive: true, stock: { $gt: 0 } }).sort({ trendingScore: -1, createdAt: -1 }).skip(skip).limit(limit).toArray();
    return toDocs<Product>(docs);
  }

  // Cart
  async getCartItems(userId: string): Promise<CartItemWithProduct[]> {
    const items = await col("cart_items").find({ userId }).toArray();
    const result: CartItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (product) result.push({ ...toDoc<CartItem>(item), product });
    }
    return result;
  }
  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const filter: any = { userId: item.userId, productId: item.productId };
    if (item.variant) filter.variant = item.variant; else filter.variant = { $in: [null, undefined] };
    const existing = await col("cart_items").findOne(filter);
    if (existing) {
      const r = await col("cart_items").findOneAndUpdate(
        { _id: existing._id },
        { $set: { quantity: (existing.quantity || 1) + (item.quantity || 1) } },
        { returnDocument: "after" }
      );
      return toDoc<CartItem>(r);
    }
    const id = newId();
    const doc = { _id: id as any, quantity: 1, variant: null, ...item };
    await col("cart_items").insertOne(doc);
    return toDoc<CartItem>(doc);
  }
  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const r = await col("cart_items").findOneAndUpdate({ _id: id as any }, { $set: { quantity } }, { returnDocument: "after" });
    return r ? toDoc<CartItem>(r) : undefined;
  }
  async updateCartItemForUser(id: string, userId: string, quantity: number): Promise<CartItem | undefined> {
    const r = await col("cart_items").findOneAndUpdate({ _id: id as any, userId }, { $set: { quantity } }, { returnDocument: "after" });
    return r ? toDoc<CartItem>(r) : undefined;
  }
  async removeFromCart(id: string): Promise<void> {
    await col("cart_items").deleteOne({ _id: id as any });
  }
  async removeFromCartForUser(id: string, userId: string): Promise<void> {
    await col("cart_items").deleteOne({ _id: id as any, userId });
  }
  async clearCart(userId: string): Promise<void> {
    await col("cart_items").deleteMany({ userId });
  }

  // Wishlist
  async getWishlistItems(userId: string): Promise<WishlistItemWithProduct[]> {
    const items = await col("wishlist_items").find({ userId }).toArray();
    const result: WishlistItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getProduct(item.productId);
      if (product) result.push({ ...toDoc<WishlistItem>(item), product });
    }
    return result;
  }
  async addToWishlist(item: InsertWishlistItem): Promise<WishlistItem> {
    const existing = await col("wishlist_items").findOne({ userId: item.userId, productId: item.productId });
    if (existing) return toDoc<WishlistItem>(existing);
    const id = newId();
    const doc = { _id: id as any, ...item };
    await col("wishlist_items").insertOne(doc);
    return toDoc<WishlistItem>(doc);
  }
  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await col("wishlist_items").deleteOne({ userId, productId });
  }

  // Orders
  async getOrders(userId: string): Promise<Order[]> {
    return toDocs<Order>(await col("orders").find({ userId }).sort({ createdAt: -1 }).toArray());
  }
  async getAllOrders(): Promise<any[]> {
    const orders = await col("orders").find().sort({ createdAt: -1 }).toArray();
    const result = [];
    for (const o of orders) {
      const user = await this.getUser(o.userId);
      result.push({ ...toDoc<Order>(o), customerName: user?.name, customerEmail: user?.email, customerPhone: user?.phone });
    }
    return result;
  }
  async getOrder(id: string): Promise<Order | undefined> {
    const doc = await col("orders").findOne({ _id: id as any });
    return doc ? toDoc<Order>(doc) : undefined;
  }
  async getOrderWithCustomer(id: string): Promise<any> {
    const order = await this.getOrder(id);
    if (!order) return undefined;
    const user = await this.getUser(order.userId);
    return { ...order, customerName: user?.name, customerEmail: user?.email, customerPhone: user?.phone, customerUsername: user?.username };
  }
  private generateOrderNumber(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "CB";
    for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
  }
  async createOrder(order: InsertOrder): Promise<Order> {
    const id = newId();
    const orderNumber = this.generateOrderNumber();
    const doc = { _id: id as any, orderNumber, status: "pending", paymentMethod: "cod", createdAt: new Date(), ...order };
    await col("orders").insertOne(doc);
    // notify user: order placed
    try {
      const placedTitle = `Order ${orderNumber} placed`;
      const placedDesc = `Your order ${orderNumber} has been placed. Total: ${order.totalAmount}`;
      // dispatch notification (best-effort)
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      createAndDispatchNotification(order.userId, "order.placed", id as any, placedTitle, placedDesc, { orderNumber, totalAmount: order.totalAmount });
    } catch (err) {
      console.error("Error dispatching order placed notification:", err);
    }
    // notify recommendation subsystem (best-effort)
    try {
      // dynamic import to avoid circular dependency at module load
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      (async () => {
        try {
          const { notifyRecommendationUpdate } = await import('./recommendations');
          if (notifyRecommendationUpdate) notifyRecommendationUpdate(order.userId).catch(() => {});
        } catch (e) {
          // ignore
        }
      })();
    } catch (e) {
      // ignore failures
    }
    return toDoc<Order>(doc);
  }
  async addUserEvent(userId: string | null, type: string, productId?: string | null, meta?: any): Promise<void> {
    try {
      const doc: any = { type, createdAt: new Date(), meta: meta || {} };
      if (userId) doc.userId = userId;
      if (productId) doc.productId = productId;
      await col('events').insertOne(doc);
    } catch (e) {
      console.error('Failed to add user event', e);
    }
  }
  async getUserEvents(userId: string, limit = 50): Promise<any[]> {
    const docs = await col('events').find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray();
    return docs.map(d => ({ id: (d._id as any).toString(), ...d }));
  }
  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    // fetch existing to detect changes
    const existing = await col("orders").findOne({ _id: id as any });
    const prevStatus = existing?.status || null;
    const r = await col("orders").findOneAndUpdate({ _id: id as any }, { $set: { status, updatedAt: new Date() } }, { returnDocument: "after" });
    const updated = r ? toDoc<Order>(r) : undefined;

    if (updated && prevStatus !== status) {
      try {
        const userId = updated.userId;
        let title = `Order ${updated.orderNumber} status updated`;
        let desc = `Order ${updated.orderNumber} is now ${status}`;
        let type = `order.${status}`;

        // Map some statuses to friendlier messages
        if (status === "shipped" || status === "out_for_delivery") {
          title = `Order ${updated.orderNumber} is out for delivery`;
          desc = `Your order ${updated.orderNumber} is on the way.`;
          type = "order.out_for_delivery";
        } else if (status === "cancelled") {
          title = `Order ${updated.orderNumber} was cancelled`;
          desc = `Your order ${updated.orderNumber} has been cancelled.`;
          type = "order.cancelled";
        } else if (status === "delivered") {
          title = `Order ${updated.orderNumber} delivered`;
          desc = `Your order ${updated.orderNumber} was delivered successfully.`;
          type = "order.delivered";
        } else if (status === "processing" || status === "confirmed") {
          title = `Order ${updated.orderNumber} confirmed`;
          desc = `Your order ${updated.orderNumber} is being processed.`;
          type = "order.confirmed";
        }

        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        createAndDispatchNotification(userId, type, id as any, title, desc, { orderNumber: updated.orderNumber, status });
      } catch (err) {
        console.error("Error dispatching order status notification:", err);
      }
    }

    return updated;
  }

  // Banners
  async getBanners(): Promise<Banner[]> {
    return toDocs<Banner>(await col("banners").find({ isActive: true }).sort({ sortOrder: 1 }).toArray());
  }
  async createBanner(banner: InsertBanner): Promise<Banner> {
    const id = newId();
    const doc = { _id: id as any, isActive: true, sortOrder: 0, ...banner };
    await col("banners").insertOne(doc);
    return toDoc<Banner>(doc);
  }
  async updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined> {
    const r = await col("banners").findOneAndUpdate({ _id: id as any }, { $set: banner }, { returnDocument: "after" });
    return r ? toDoc<Banner>(r) : undefined;
  }
  async deleteBanner(id: string): Promise<void> {
    await col("banners").deleteOne({ _id: id as any });
  }

  // Category Ads
  async getCategoryAds(categoryId?: string): Promise<CategoryAd[]> {
    const filter: any = { isActive: true };
    if (categoryId) filter.categoryId = categoryId;
    return toDocs<CategoryAd>(await col("category_ads").find(filter).sort({ sortOrder: 1 }).toArray());
  }
  async getAllCategoryAds(): Promise<CategoryAd[]> {
    return toDocs<CategoryAd>(await col("category_ads").find().sort({ sortOrder: 1 }).toArray());
  }
  async createCategoryAd(ad: InsertCategoryAd): Promise<CategoryAd> {
    const id = newId();
    const doc = { _id: id as any, isActive: true, sortOrder: 0, ...ad };
    await col("category_ads").insertOne(doc);
    return toDoc<CategoryAd>(doc);
  }
  async updateCategoryAd(id: string, ad: Partial<InsertCategoryAd>): Promise<CategoryAd | undefined> {
    const r = await col("category_ads").findOneAndUpdate({ _id: id as any }, { $set: ad }, { returnDocument: "after" });
    return r ? toDoc<CategoryAd>(r) : undefined;
  }
  async deleteCategoryAd(id: string): Promise<void> {
    await col("category_ads").deleteOne({ _id: id as any });
  }

  // Services
  async getServices(): Promise<Service[]> {
    return toDocs<Service>(await col("services").find().sort({ sortOrder: 1 }).toArray());
  }
  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const r = await col("services").findOneAndUpdate({ _id: id as any }, { $set: service }, { returnDocument: "after" });
    return r ? toDoc<Service>(r) : undefined;
  }
  async initializeServices(): Promise<void> {
    const count = await col("services").countDocuments();
    if (count > 0) return;
    const defaults = [
      { name: "Grocery", description: "Fresh & Local Delivered Fast", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400", isActive: true, sortOrder: 0 },
      { name: "E-Commerce", description: "Essentials & Elegance", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400", isActive: false, sortOrder: 1 },
      { name: "Food", description: "Delicious Meals Delivered", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", isActive: false, sortOrder: 2 },
      { name: "City Move", description: "Instant Delivery", image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400", isActive: false, sortOrder: 3 },
      { name: "Hotel", description: "Book Your Stay", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", isActive: false, sortOrder: 4 },
      { name: "Taxi", description: "Ride With Comfort", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400", isActive: false, sortOrder: 5 },
    ];
    for (const s of defaults) {
      const id = newId();
      await col("services").insertOne({ _id: id as any, ...s });
    }
  }

  // Addresses
  async getAddresses(userId: string): Promise<Address[]> {
    return toDocs<Address>(await col("addresses").find({ userId }).sort({ isDefault: -1 }).toArray());
  }
  async getAddress(id: string, userId: string): Promise<Address | undefined> {
    const doc = await col("addresses").findOne({ _id: id as any, userId });
    return doc ? toDoc<Address>(doc) : undefined;
  }
  async createAddress(address: InsertAddress): Promise<Address> {
    if (address.isDefault) {
      await col("addresses").updateMany({ userId: address.userId }, { $set: { isDefault: false } });
    }
    const id = newId();
    const doc = { _id: id as any, isDefault: false, createdAt: new Date(), ...address };
    await col("addresses").insertOne(doc);
    return toDoc<Address>(doc);
  }
  async updateAddress(id: string, userId: string, address: Partial<InsertAddress>): Promise<Address | undefined> {
    if (address.isDefault) {
      await col("addresses").updateMany({ userId }, { $set: { isDefault: false } });
    }
    const r = await col("addresses").findOneAndUpdate({ _id: id as any, userId }, { $set: address }, { returnDocument: "after" });
    return r ? toDoc<Address>(r) : undefined;
  }
  async deleteAddress(id: string, userId: string): Promise<void> {
    await col("addresses").deleteOne({ _id: id as any, userId });
  }
  async setDefaultAddress(id: string, userId: string): Promise<Address | undefined> {
    await col("addresses").updateMany({ userId }, { $set: { isDefault: false } });
    const r = await col("addresses").findOneAndUpdate({ _id: id as any, userId }, { $set: { isDefault: true } }, { returnDocument: "after" });
    return r ? toDoc<Address>(r) : undefined;
  }

  // Support Tickets
  async getTickets(userId: string): Promise<SupportTicket[]> {
    return toDocs<SupportTicket>(await col("support_tickets").find({ userId }).sort({ createdAt: -1 }).toArray());
  }

  // User profile helper
  async getUserProfile(userId: string): Promise<import("@shared/schema").UserProfile | undefined> {
    const userDoc = await col("users").findOne({ _id: userId as any });
    if (!userDoc) return undefined;
    const user = toDoc<User>(userDoc);
    const addresses = await this.getAddresses(userId);
    const profile: import("@shared/schema").UserProfile = {
      userId: user.id,
      name: user.name ?? null,
      email: user.email ?? null,
      phone: user.phone ?? null,
      avatar: (user as any).avatar ?? null,
      addresses,
      createdAt: (user as any).createdAt ?? null,
      updatedAt: (user as any).updatedAt ?? null,
    };
    return profile;
  }
  async getAllTickets(): Promise<(SupportTicket & { username?: string; userName?: string })[]> {
    const tickets = await col("support_tickets").find().sort({ createdAt: -1 }).toArray();
    const result = [];
    for (const t of tickets) {
      const user = await this.getUser(t.userId);
      result.push({ ...toDoc<SupportTicket>(t), username: user?.username, userName: user?.name || user?.username });
    }
    return result;
  }
  async getTicket(id: string): Promise<SupportTicketWithMessages | undefined> {
    const doc = await col("support_tickets").findOne({ _id: id as any });
    if (!doc) return undefined;
    const messages = toDocs<TicketMessage>(await col("ticket_messages").find({ ticketId: id }).sort({ createdAt: 1 }).toArray());
    const user = await this.getUser(doc.userId);
    return { ...toDoc<SupportTicket>(doc), messages, username: user?.username, userName: user?.name || user?.username };
  }
  async createTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const id = newId();
    const doc = { _id: id as any, status: "open", createdAt: new Date(), updatedAt: new Date(), ...ticket };
    await col("support_tickets").insertOne(doc);
    return toDoc<SupportTicket>(doc);
  }
  async updateTicketStatus(id: string, status: string): Promise<SupportTicket | undefined> {
    const r = await col("support_tickets").findOneAndUpdate({ _id: id as any }, { $set: { status, updatedAt: new Date() } }, { returnDocument: "after" });
    return r ? toDoc<SupportTicket>(r) : undefined;
  }
  async addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const id = newId();
    const doc = { _id: id as any, createdAt: new Date(), ...message };
    await col("ticket_messages").insertOne(doc);
    await col("support_tickets").updateOne({ _id: message.ticketId as any }, { $set: { updatedAt: new Date() } });
    return toDoc<TicketMessage>(doc);
  }
  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return toDocs<TicketMessage>(await col("ticket_messages").find({ ticketId }).sort({ createdAt: 1 }).toArray());
  }

  // Vendor Applications
  async getVendorApplications(): Promise<VendorApplication[]> {
    return toDocs<VendorApplication>(await col("vendor_applications").find().sort({ createdAt: -1 }).toArray());
  }
  async getVendorApplication(id: string): Promise<VendorApplication | undefined> {
    const doc = await col("vendor_applications").findOne({ _id: id as any });
    return doc ? toDoc<VendorApplication>(doc) : undefined;
  }
  async createVendorApplication(app: InsertVendorApplication): Promise<VendorApplication> {
    const id = newId();
    const doc = { _id: id as any, status: "pending", adminNote: null, createdAt: new Date(), ...app };
    await col("vendor_applications").insertOne(doc);
    return toDoc<VendorApplication>(doc);
  }
  async updateVendorApplicationStatus(id: string, status: string, adminNote?: string): Promise<VendorApplication | undefined> {
    const update: any = { status };
    if (adminNote !== undefined) update.adminNote = adminNote;
    const r = await col("vendor_applications").findOneAndUpdate({ _id: id as any }, { $set: update }, { returnDocument: "after" });
    return r ? toDoc<VendorApplication>(r) : undefined;
  }

  // Vendor Products
  async getVendorProducts(vendorId: string): Promise<Product[]> {
    return toDocs<Product>(await col("products").find({ vendorId }).toArray());
  }

  // E-Commerce Categories
  async getEcomCategories(): Promise<EcomCategory[]> {
    return toDocs<EcomCategory>(await col("ecom_categories").find({ isActive: true }).sort({ sortOrder: 1 }).toArray());
  }
  async getAllEcomCategories(): Promise<EcomCategory[]> {
    return toDocs<EcomCategory>(await col("ecom_categories").find().sort({ sortOrder: 1 }).toArray());
  }
  async getEcomCategory(id: string): Promise<EcomCategory | undefined> {
    const doc = await col("ecom_categories").findOne({ _id: id as any });
    return doc ? toDoc<EcomCategory>(doc) : undefined;
  }
  async createEcomCategory(category: InsertEcomCategory): Promise<EcomCategory> {
    const id = newId();
    const doc = { _id: id as any, isActive: true, sortOrder: 0, ...category };
    await col("ecom_categories").insertOne(doc);
    return toDoc<EcomCategory>(doc);
  }
  async updateEcomCategory(id: string, category: Partial<InsertEcomCategory>): Promise<EcomCategory | undefined> {
    const r = await col("ecom_categories").findOneAndUpdate({ _id: id as any }, { $set: category }, { returnDocument: "after" });
    return r ? toDoc<EcomCategory>(r) : undefined;
  }
  async deleteEcomCategory(id: string): Promise<void> {
    await col("ecom_categories").deleteOne({ _id: id as any });
  }

  // E-Commerce Products
  async getEcomProducts(filters?: any): Promise<EcomProduct[]> {
    const query: any = { isActive: true, isApproved: true };
    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.vendorId) query.vendorId = filters.vendorId;
    if (filters?.brand) query.brand = filters.brand;
    if (filters?.isFeatured) query.isFeatured = true;
    if (filters?.search) query.name = { $regex: filters.search, $options: "i" };
    if (filters?.minPrice) query.price = { ...query.price, $gte: String(filters.minPrice) };
    if (filters?.maxPrice) query.price = { ...query.price, $lte: String(filters.maxPrice) };

    let sort: any = { createdAt: -1 };
    if (filters?.sortBy === "price_asc") sort = { price: 1 };
    else if (filters?.sortBy === "price_desc") sort = { price: -1 };
    else if (filters?.sortBy === "rating") sort = { rating: -1 };

    return toDocs<EcomProduct>(await col("ecom_products").find(query).sort(sort).toArray());
  }
  async getAllEcomProducts(): Promise<EcomProduct[]> {
    return toDocs<EcomProduct>(await col("ecom_products").find().sort({ createdAt: -1 }).toArray());
  }
  async getEcomProduct(id: string): Promise<EcomProduct | undefined> {
    const doc = await col("ecom_products").findOne({ _id: id as any });
    return doc ? toDoc<EcomProduct>(doc) : undefined;
  }
  async createEcomProduct(product: InsertEcomProduct): Promise<EcomProduct> {
    const id = newId();
    const doc = { _id: id as any, rating: "0", reviewCount: 0, isActive: true, isApproved: false, isFeatured: false, isInstantDelivery: false, isTrending: !!(product as any).isTrending || false, createdAt: new Date(), ...product };
    await col("ecom_products").insertOne(doc);
    try {
      const { indexProduct } = await import('./search');
      indexProduct({ _id: id, name: doc.name, categoryId: doc.categoryId, tags: (doc as any).tags, price: doc.price, stock: doc.stock, image: (doc as any).image || (doc as any).images?.[0] || '' }, { source: 'ecom', route: '/ecommerce/product/' }).catch(() => {});
    } catch (e) {}
    return toDoc<EcomProduct>(doc);
  }
  async updateEcomProduct(id: string, product: Partial<InsertEcomProduct>): Promise<EcomProduct | undefined> {
    const r = await col("ecom_products").findOneAndUpdate({ _id: id as any }, { $set: product }, { returnDocument: "after" });
    const updated = r ? toDoc<EcomProduct>(r) : undefined;
    try {
      const { indexProduct } = await import('./search');
      if (updated) indexProduct({ _id: updated.id, name: updated.name, categoryId: updated.categoryId, tags: (updated as any).tags, price: updated.price, stock: updated.stock, image: (updated as any).image || (updated as any).images?.[0] || '' }, { source: 'ecom', route: '/ecommerce/product/' }).catch(() => {});
    } catch (e) {}
    return updated;
  }
  async deleteEcomProduct(id: string): Promise<void> {
    await col("ecom_products").deleteOne({ _id: id as any });
    try {
      const { deleteProductFromIndex } = await import('./search');
      deleteProductFromIndex(`ecom:${id}`).catch(() => {});
    } catch (e) {}
  }
  async getVendorEcomProducts(vendorId: string): Promise<EcomProduct[]> {
    return toDocs<EcomProduct>(await col("ecom_products").find({ vendorId }).sort({ createdAt: -1 }).toArray());
  }

  // E-Commerce Reviews
  async getEcomReviews(productId: string): Promise<EcomReviewWithUser[]> {
    const reviews = await col("ecom_reviews").find({ productId }).sort({ createdAt: -1 }).toArray();
    const result: EcomReviewWithUser[] = [];
    for (const r of reviews) {
      const user = await this.getUser(r.userId);
      result.push({ ...toDoc<EcomReview>(r), username: user?.username, name: user?.name || undefined });
    }
    return result;
  }
  async createEcomReview(review: InsertEcomReview): Promise<EcomReview> {
    const id = newId();
    const doc = { _id: id as any, createdAt: new Date(), ...review };
    await col("ecom_reviews").insertOne(doc);
    const allReviews = await col("ecom_reviews").find({ productId: review.productId }).toArray();
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await col("ecom_products").updateOne({ _id: review.productId as any }, { $set: { rating: avgRating.toFixed(1), reviewCount: allReviews.length } });
    return toDoc<EcomReview>(doc);
  }

  // Seller Profiles
  async getSellerProfile(userId: string): Promise<SellerProfile | undefined> {
    const doc = await col("seller_profiles").findOne({ userId });
    return doc ? toDoc<SellerProfile>(doc) : undefined;
  }
  async getSellerProfileById(id: string): Promise<SellerProfile | undefined> {
    const doc = await col("seller_profiles").findOne({ _id: id as any });
    return doc ? toDoc<SellerProfile>(doc) : undefined;
  }
  async getAllSellerProfiles(): Promise<(SellerProfile & { username?: string; name?: string })[]> {
    const profiles = await col("seller_profiles").find().sort({ createdAt: -1 }).toArray();
    const result = [];
    for (const p of profiles) {
      const user = await this.getUser(p.userId);
      result.push({ ...toDoc<SellerProfile>(p), username: user?.username, name: user?.name || undefined });
    }
    return result;
  }
  async createSellerProfile(profile: InsertSellerProfile): Promise<SellerProfile> {
    const id = newId();
    const doc = { _id: id as any, walletBalance: "0.00", commissionRate: "10.00", isActive: true, createdAt: new Date(), ...profile };
    await col("seller_profiles").insertOne(doc);
    return toDoc<SellerProfile>(doc);
  }
  async updateSellerProfile(userId: string, profile: Partial<InsertSellerProfile>): Promise<SellerProfile | undefined> {
    const r = await col("seller_profiles").findOneAndUpdate({ userId }, { $set: profile }, { returnDocument: "after" });
    return r ? toDoc<SellerProfile>(r) : undefined;
  }

  // E-Commerce Cart
  async getEcomCartItems(userId: string): Promise<EcomCartItemWithProduct[]> {
    const items = await col("ecom_cart_items").find({ userId }).toArray();
    const result: EcomCartItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getEcomProduct(item.productId);
      if (product) result.push({ ...toDoc<EcomCartItem>(item), product });
    }
    return result;
  }
  async addToEcomCart(item: InsertEcomCartItem): Promise<EcomCartItem> {
    const filter: any = { userId: item.userId, productId: item.productId };
    if (item.variant) filter.variant = item.variant; else filter.variant = { $in: [null, undefined] };
    const existing = await col("ecom_cart_items").findOne(filter);
    if (existing) {
      const r = await col("ecom_cart_items").findOneAndUpdate(
        { _id: existing._id },
        { $set: { quantity: (existing.quantity || 1) + (item.quantity || 1) } },
        { returnDocument: "after" }
      );
      return toDoc<EcomCartItem>(r);
    }
    const id = newId();
    const doc = { _id: id as any, quantity: 1, variant: null, ...item };
    await col("ecom_cart_items").insertOne(doc);
    return toDoc<EcomCartItem>(doc);
  }
  async updateEcomCartItem(id: string, userId: string, quantity: number): Promise<EcomCartItem | undefined> {
    const r = await col("ecom_cart_items").findOneAndUpdate({ _id: id as any, userId }, { $set: { quantity } }, { returnDocument: "after" });
    return r ? toDoc<EcomCartItem>(r) : undefined;
  }
  async removeFromEcomCart(id: string, userId: string): Promise<void> {
    await col("ecom_cart_items").deleteOne({ _id: id as any, userId });
  }
  async clearEcomCart(userId: string): Promise<void> {
    await col("ecom_cart_items").deleteMany({ userId });
  }

  // E-Commerce Wishlist
  async getEcomWishlistItems(userId: string): Promise<EcomWishlistItemWithProduct[]> {
    const items = await col("ecom_wishlist_items").find({ userId }).toArray();
    const result: EcomWishlistItemWithProduct[] = [];
    for (const item of items) {
      const product = await this.getEcomProduct(item.productId);
      if (product) result.push({ ...toDoc<EcomWishlistItem>(item), product });
    }
    return result;
  }
  async addToEcomWishlist(item: InsertEcomWishlistItem): Promise<EcomWishlistItem> {
    const existing = await col("ecom_wishlist_items").findOne({ userId: item.userId, productId: item.productId });
    if (existing) return toDoc<EcomWishlistItem>(existing);
    const id = newId();
    const doc = { _id: id as any, ...item };
    await col("ecom_wishlist_items").insertOne(doc);
    return toDoc<EcomWishlistItem>(doc);
  }
  async removeFromEcomWishlist(userId: string, productId: string): Promise<void> {
    await col("ecom_wishlist_items").deleteOne({ userId, productId });
  }

  // E-Commerce Orders
  async getEcomOrders(userId: string): Promise<EcomOrder[]> {
    return toDocs<EcomOrder>(await col("ecom_orders").find({ userId }).sort({ createdAt: -1 }).toArray());
  }
  async getAllEcomOrders(): Promise<EcomOrder[]> {
    return toDocs<EcomOrder>(await col("ecom_orders").find().sort({ createdAt: -1 }).toArray());
  }
  async getVendorEcomOrders(vendorId: string): Promise<EcomOrder[]> {
    return toDocs<EcomOrder>(await col("ecom_orders").find({ vendorId }).sort({ createdAt: -1 }).toArray());
  }
  async getEcomOrder(id: string): Promise<EcomOrder | undefined> {
    const doc = await col("ecom_orders").findOne({ _id: id as any });
    return doc ? toDoc<EcomOrder>(doc) : undefined;
  }
  async createEcomOrder(order: InsertEcomOrder): Promise<EcomOrder> {
    const id = newId();
    const orderNumber = "EC" + this.generateOrderNumber().slice(2);
    const doc = { _id: id as any, orderNumber, status: "pending", paymentMethod: "cod", createdAt: new Date(), ...order };
    await col("ecom_orders").insertOne(doc);
    return toDoc<EcomOrder>(doc);
  }
  async updateEcomOrderStatus(id: string, status: string): Promise<EcomOrder | undefined> {
    const r = await col("ecom_orders").findOneAndUpdate({ _id: id as any }, { $set: { status } }, { returnDocument: "after" });
    return r ? toDoc<EcomOrder>(r) : undefined;
  }

  // Notifications
  async getNotifications(userId: string): Promise<any[]> {
    const docs = await col("notifications").find({ userId }).sort({ createdAt: -1 }).toArray();
    return toDocs<any>(docs.map((d: any) => ({ ...d })));
  }
  async markAllNotificationsRead(userId: string): Promise<void> {
    await col("notifications").updateMany({ userId, read: { $ne: true } }, { $set: { read: true } });
  }
  async markNotificationRead(id: string, userId: string): Promise<void> {
    await col("notifications").updateOne({ _id: id as any, userId }, { $set: { read: true } });
  }

  // Restock subscriptions
  async addRestockSubscription(userId: string, productId: string): Promise<void> {
    const existing = await col("restock_subscriptions").findOne({ userId, productId });
    if (existing) return;
    await col("restock_subscriptions").insertOne({ _id: newId() as any, userId, productId, createdAt: new Date() });
  }
  async getRestockSubscriptionsByUser(userId: string): Promise<any[]> {
    const docs = await col("restock_subscriptions").find({ userId }).sort({ createdAt: -1 }).toArray();
    return docs.map(d => toDoc<any>(d));
  }
  async getRestockSubscriptionsByProduct(productId: string): Promise<any[]> {
    const docs = await col("restock_subscriptions").find({ productId }).toArray();
    return docs.map(d => toDoc<any>(d));
  }
  async removeRestockSubscription(id: string): Promise<void> {
    await col("restock_subscriptions").deleteOne({ _id: id as any });
  }

  // Seller Analytics
  async getSellerStats(vendorId: string): Promise<{ totalProducts: number; totalOrders: number; totalRevenue: string; pendingOrders: number }> {
    const totalProducts = await col("ecom_products").countDocuments({ vendorId });
    const totalOrders = await col("ecom_orders").countDocuments({ vendorId });
    const pending = await col("ecom_orders").countDocuments({ vendorId, status: "pending" });
    const delivered = await col("ecom_orders").find({ vendorId, status: "delivered" }).toArray();
    const totalRevenue = delivered.reduce((sum, o) => sum + parseFloat(o.totalAmount || "0"), 0).toFixed(2);
    return { totalProducts, totalOrders, totalRevenue, pendingOrders: pending };
  }
}

export const storage = new DatabaseStorage();
