import { 
  users, 
  categories, 
  products, 
  cartItems, 
  wishlistItems, 
  orders, 
  banners, 
  services,
  addresses,
  categoryAds,
  type User, 
  type InsertUser,
  type Category,
  type InsertCategory,
  type Product,
  type InsertProduct,
  type CartItem,
  type InsertCartItem,
  type CartItemWithProduct,
  type WishlistItem,
  type InsertWishlistItem,
  type WishlistItemWithProduct,
  type Order,
  type InsertOrder,
  type Banner,
  type InsertBanner,
  type Service,
  type InsertService,
  type Address,
  type InsertAddress,
  type CategoryAd,
  type InsertCategoryAd,
  supportTickets,
  ticketMessages,
  type SupportTicket,
  type InsertSupportTicket,
  type SupportTicketWithMessages,
  type TicketMessage,
  type InsertTicketMessage,
  vendorApplications,
  type VendorApplication,
  type InsertVendorApplication,
  ecomCategories,
  ecomProducts,
  ecomReviews,
  sellerProfiles,
  ecomCartItems,
  ecomWishlistItems,
  ecomOrders,
  type EcomCategory,
  type InsertEcomCategory,
  type EcomProduct,
  type InsertEcomProduct,
  type EcomReview,
  type InsertEcomReview,
  type EcomReviewWithUser,
  type SellerProfile,
  type InsertSellerProfile,
  type EcomCartItem,
  type InsertEcomCartItem,
  type EcomCartItemWithProduct,
  type EcomWishlistItem,
  type InsertEcomWishlistItem,
  type EcomWishlistItemWithProduct,
  type EcomOrder,
  type InsertEcomOrder,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, ilike, gte, lte, count, sum, avg } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { pool } from "./db";

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  sessionStore: session.Store;
  
  // Users
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByPhone(phone: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserProfile(id: string, data: { name?: string; email?: string; phone?: string }): Promise<User | undefined>;
  updateUserPassword(id: string, password: string): Promise<void>;
  
  // Categories
  getCategories(): Promise<Category[]>;
  getAllCategories(): Promise<Category[]>;
  getCategory(id: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined>;
  deleteCategory(id: string): Promise<void>;
  
  // Products
  getProducts(): Promise<Product[]>;
  getAllProducts(): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  getProductsByCategory(categoryId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<void>;
  
  // Cart
  getCartItems(userId: string): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem | undefined>;
  updateCartItemForUser(id: string, userId: string, quantity: number): Promise<CartItem | undefined>;
  removeFromCart(id: string): Promise<void>;
  removeFromCartForUser(id: string, userId: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
  
  // Wishlist
  getWishlistItems(userId: string): Promise<WishlistItemWithProduct[]>;
  addToWishlist(item: InsertWishlistItem): Promise<WishlistItem>;
  removeFromWishlist(userId: string, productId: string): Promise<void>;
  
  // Orders
  getOrders(userId: string): Promise<Order[]>;
  getAllOrders(): Promise<Order[]>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderWithCustomer(id: string): Promise<(Order & { customerName?: string; customerEmail?: string; customerPhone?: string; customerUsername?: string }) | undefined>;
  createOrder(order: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, status: string): Promise<Order | undefined>;
  
  // Banners
  getBanners(): Promise<Banner[]>;
  createBanner(banner: InsertBanner): Promise<Banner>;
  updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined>;
  deleteBanner(id: string): Promise<void>;
  
  // Services
  getServices(): Promise<Service[]>;
  updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined>;
  initializeServices(): Promise<void>;
  
  // Addresses
  getAddresses(userId: string): Promise<Address[]>;
  getAddress(id: string, userId: string): Promise<Address | undefined>;
  createAddress(address: InsertAddress): Promise<Address>;
  updateAddress(id: string, userId: string, address: Partial<InsertAddress>): Promise<Address | undefined>;
  deleteAddress(id: string, userId: string): Promise<void>;
  setDefaultAddress(id: string, userId: string): Promise<Address | undefined>;
  
  // Category Ads
  getCategoryAds(categoryId?: string): Promise<CategoryAd[]>;
  getAllCategoryAds(): Promise<CategoryAd[]>;
  createCategoryAd(ad: InsertCategoryAd): Promise<CategoryAd>;
  updateCategoryAd(id: string, ad: Partial<InsertCategoryAd>): Promise<CategoryAd | undefined>;
  deleteCategoryAd(id: string): Promise<void>;
  
  // Support Tickets
  getTickets(userId: string): Promise<SupportTicket[]>;
  getAllTickets(): Promise<(SupportTicket & { username?: string; userName?: string })[]>;
  getTicket(id: string): Promise<SupportTicketWithMessages | undefined>;
  createTicket(ticket: InsertSupportTicket): Promise<SupportTicket>;
  updateTicketStatus(id: string, status: string): Promise<SupportTicket | undefined>;
  addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage>;
  getTicketMessages(ticketId: string): Promise<TicketMessage[]>;

  // Vendor Applications
  getVendorApplications(): Promise<VendorApplication[]>;
  getVendorApplication(id: string): Promise<VendorApplication | undefined>;
  createVendorApplication(application: InsertVendorApplication): Promise<VendorApplication>;
  updateVendorApplicationStatus(id: string, status: string, adminNote?: string): Promise<VendorApplication | undefined>;

  // Vendor Products
  getVendorProducts(vendorId: string): Promise<Product[]>;

  // E-Commerce Categories
  getEcomCategories(): Promise<EcomCategory[]>;
  getAllEcomCategories(): Promise<EcomCategory[]>;
  getEcomCategory(id: string): Promise<EcomCategory | undefined>;
  createEcomCategory(category: InsertEcomCategory): Promise<EcomCategory>;
  updateEcomCategory(id: string, category: Partial<InsertEcomCategory>): Promise<EcomCategory | undefined>;
  deleteEcomCategory(id: string): Promise<void>;

  // E-Commerce Products
  getEcomProducts(filters?: { categoryId?: string; search?: string; minPrice?: number; maxPrice?: number; vendorId?: string; brand?: string; isFeatured?: boolean; sortBy?: string }): Promise<EcomProduct[]>;
  getAllEcomProducts(): Promise<EcomProduct[]>;
  getEcomProduct(id: string): Promise<EcomProduct | undefined>;
  createEcomProduct(product: InsertEcomProduct): Promise<EcomProduct>;
  updateEcomProduct(id: string, product: Partial<InsertEcomProduct>): Promise<EcomProduct | undefined>;
  deleteEcomProduct(id: string): Promise<void>;
  getVendorEcomProducts(vendorId: string): Promise<EcomProduct[]>;

  // E-Commerce Reviews
  getEcomReviews(productId: string): Promise<EcomReviewWithUser[]>;
  createEcomReview(review: InsertEcomReview): Promise<EcomReview>;

  // Seller Profiles
  getSellerProfile(userId: string): Promise<SellerProfile | undefined>;
  getSellerProfileById(id: string): Promise<SellerProfile | undefined>;
  getAllSellerProfiles(): Promise<(SellerProfile & { username?: string; name?: string })[]>;
  createSellerProfile(profile: InsertSellerProfile): Promise<SellerProfile>;
  updateSellerProfile(userId: string, profile: Partial<InsertSellerProfile>): Promise<SellerProfile | undefined>;

  // E-Commerce Cart
  getEcomCartItems(userId: string): Promise<EcomCartItemWithProduct[]>;
  addToEcomCart(item: InsertEcomCartItem): Promise<EcomCartItem>;
  updateEcomCartItem(id: string, userId: string, quantity: number): Promise<EcomCartItem | undefined>;
  removeFromEcomCart(id: string, userId: string): Promise<void>;
  clearEcomCart(userId: string): Promise<void>;

  // E-Commerce Wishlist
  getEcomWishlistItems(userId: string): Promise<EcomWishlistItemWithProduct[]>;
  addToEcomWishlist(item: InsertEcomWishlistItem): Promise<EcomWishlistItem>;
  removeFromEcomWishlist(userId: string, productId: string): Promise<void>;

  // E-Commerce Orders
  getEcomOrders(userId: string): Promise<EcomOrder[]>;
  getAllEcomOrders(): Promise<EcomOrder[]>;
  getVendorEcomOrders(vendorId: string): Promise<EcomOrder[]>;
  getEcomOrder(id: string): Promise<EcomOrder | undefined>;
  createEcomOrder(order: InsertEcomOrder): Promise<EcomOrder>;
  updateEcomOrderStatus(id: string, status: string): Promise<EcomOrder | undefined>;

  // Seller Analytics
  getSellerStats(vendorId: string): Promise<{ totalProducts: number; totalOrders: number; totalRevenue: string; pendingOrders: number }>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true 
    });
  }

  // Users
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByPhone(phone: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.phone, phone));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserProfile(id: string, data: { name?: string; email?: string; phone?: string }): Promise<User | undefined> {
    const updateData: Partial<User> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phone !== undefined) updateData.phone = data.phone;
    
    const [user] = await db.update(users).set(updateData).where(eq(users.id, id)).returning();
    return user || undefined;
  }

  async updateUserPassword(id: string, password: string): Promise<void> {
    await db.update(users).set({ password }).where(eq(users.id, id));
  }

  // Categories
  async getCategories(): Promise<Category[]> {
    return db.select().from(categories).where(eq(categories.isActive, true)).orderBy(categories.sortOrder);
  }

  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories).orderBy(categories.sortOrder);
  }

  async getCategory(id: string): Promise<Category | undefined> {
    const [category] = await db.select().from(categories).where(eq(categories.id, id));
    return category || undefined;
  }

  async createCategory(category: InsertCategory): Promise<Category> {
    const [created] = await db.insert(categories).values(category).returning();
    return created;
  }

  async updateCategory(id: string, category: Partial<InsertCategory>): Promise<Category | undefined> {
    const [updated] = await db.update(categories).set(category).where(eq(categories.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategory(id: string): Promise<void> {
    await db.delete(categories).where(eq(categories.id, id));
  }

  // Products
  async getProducts(): Promise<Product[]> {
    return db.select().from(products).where(eq(products.isActive, true));
  }

  async getAllProducts(): Promise<Product[]> {
    return db.select().from(products);
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product || undefined;
  }

  async getProductsByCategory(categoryId: string): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.categoryId, categoryId), eq(products.isActive, true))
    );
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, product: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(product).where(eq(products.id, id)).returning();
    return updated || undefined;
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // Cart
  async getCartItems(userId: string): Promise<CartItemWithProduct[]> {
    const items = await db.select().from(cartItems)
      .innerJoin(products, eq(cartItems.productId, products.id))
      .where(eq(cartItems.userId, userId));
    
    return items.map(item => ({
      ...item.cart_items,
      product: item.products,
    }));
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    const conditions = [
      eq(cartItems.userId, item.userId),
      eq(cartItems.productId, item.productId),
    ];
    if (item.variant) {
      conditions.push(eq(cartItems.variant, item.variant));
    } else {
      conditions.push(sql`${cartItems.variant} IS NULL`);
    }
    const existing = await db.select().from(cartItems).where(and(...conditions));
    
    if (existing.length > 0) {
      const [updated] = await db.update(cartItems)
        .set({ quantity: (existing[0].quantity || 1) + (item.quantity || 1) })
        .where(eq(cartItems.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(cartItems).values(item).returning();
    return created;
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem | undefined> {
    const [updated] = await db.update(cartItems).set({ quantity }).where(eq(cartItems.id, id)).returning();
    return updated || undefined;
  }

  async updateCartItemForUser(id: string, userId: string, quantity: number): Promise<CartItem | undefined> {
    // Only update if the cart item belongs to the user (IDOR prevention)
    const [updated] = await db.update(cartItems)
      .set({ quantity })
      .where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.id, id));
  }

  async removeFromCartForUser(id: string, userId: string): Promise<void> {
    // Only delete if the cart item belongs to the user (IDOR prevention)
    await db.delete(cartItems).where(and(eq(cartItems.id, id), eq(cartItems.userId, userId)));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cartItems).where(eq(cartItems.userId, userId));
  }

  // Wishlist
  async getWishlistItems(userId: string): Promise<WishlistItemWithProduct[]> {
    const items = await db.select().from(wishlistItems)
      .innerJoin(products, eq(wishlistItems.productId, products.id))
      .where(eq(wishlistItems.userId, userId));
    
    return items.map(item => ({
      ...item.wishlist_items,
      product: item.products,
    }));
  }

  async addToWishlist(item: InsertWishlistItem): Promise<WishlistItem> {
    const existing = await db.select().from(wishlistItems).where(
      and(eq(wishlistItems.userId, item.userId), eq(wishlistItems.productId, item.productId))
    );
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    const [created] = await db.insert(wishlistItems).values(item).returning();
    return created;
  }

  async removeFromWishlist(userId: string, productId: string): Promise<void> {
    await db.delete(wishlistItems).where(
      and(eq(wishlistItems.userId, userId), eq(wishlistItems.productId, productId))
    );
  }

  // Orders
  async getOrders(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async getAllOrders(): Promise<(Order & { customerName?: string; customerEmail?: string; customerPhone?: string })[]> {
    const result = await db
      .select({
        order: orders,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .orderBy(desc(orders.createdAt));
    
    return result.map(r => ({
      ...r.order,
      customerName: r.customerName || undefined,
      customerEmail: r.customerEmail || undefined,
      customerPhone: r.customerPhone || undefined,
    }));
  }

  async getOrder(id: string): Promise<Order | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order || undefined;
  }

  async getOrderWithCustomer(id: string): Promise<(Order & { customerName?: string; customerEmail?: string; customerPhone?: string; customerUsername?: string }) | undefined> {
    const result = await db
      .select({
        order: orders,
        customerName: users.name,
        customerEmail: users.email,
        customerPhone: users.phone,
        customerUsername: users.username,
      })
      .from(orders)
      .leftJoin(users, eq(orders.userId, users.id))
      .where(eq(orders.id, id));
    
    if (result.length === 0) return undefined;
    const r = result[0];
    return {
      ...r.order,
      customerName: r.customerName || undefined,
      customerEmail: r.customerEmail || undefined,
      customerPhone: r.customerPhone || undefined,
      customerUsername: r.customerUsername || undefined,
    };
  }

  private generateOrderNumber(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = 'CB';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async createOrder(order: InsertOrder): Promise<Order> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const orderNumber = this.generateOrderNumber();
        const [created] = await db.insert(orders).values({ ...order, orderNumber }).returning();
        return created;
      } catch (err: any) {
        if (err?.code === '23505' && attempt < 4) continue;
        throw err;
      }
    }
    throw new Error("Failed to generate unique order number");
  }

  async updateOrderStatus(id: string, status: string): Promise<Order | undefined> {
    const [updated] = await db.update(orders).set({ status }).where(eq(orders.id, id)).returning();
    return updated || undefined;
  }

  // Banners
  async getBanners(): Promise<Banner[]> {
    return db.select().from(banners).where(eq(banners.isActive, true)).orderBy(banners.sortOrder);
  }

  async createBanner(banner: InsertBanner): Promise<Banner> {
    const [created] = await db.insert(banners).values(banner).returning();
    return created;
  }

  async updateBanner(id: string, banner: Partial<InsertBanner>): Promise<Banner | undefined> {
    const [updated] = await db.update(banners).set(banner).where(eq(banners.id, id)).returning();
    return updated || undefined;
  }

  async deleteBanner(id: string): Promise<void> {
    await db.delete(banners).where(eq(banners.id, id));
  }

  // Category Ads
  async getCategoryAds(categoryId?: string): Promise<CategoryAd[]> {
    if (categoryId) {
      return db.select().from(categoryAds)
        .where(and(eq(categoryAds.isActive, true), eq(categoryAds.categoryId, categoryId)))
        .orderBy(categoryAds.sortOrder);
    }
    return db.select().from(categoryAds)
      .where(eq(categoryAds.isActive, true))
      .orderBy(categoryAds.sortOrder);
  }

  async getAllCategoryAds(): Promise<CategoryAd[]> {
    return db.select().from(categoryAds).orderBy(categoryAds.sortOrder);
  }

  async createCategoryAd(ad: InsertCategoryAd): Promise<CategoryAd> {
    const [created] = await db.insert(categoryAds).values(ad).returning();
    return created;
  }

  async updateCategoryAd(id: string, ad: Partial<InsertCategoryAd>): Promise<CategoryAd | undefined> {
    const [updated] = await db.update(categoryAds).set(ad).where(eq(categoryAds.id, id)).returning();
    return updated || undefined;
  }

  async deleteCategoryAd(id: string): Promise<void> {
    await db.delete(categoryAds).where(eq(categoryAds.id, id));
  }

  // Services
  async getServices(): Promise<Service[]> {
    return db.select().from(services).orderBy(services.sortOrder);
  }

  async updateService(id: string, service: Partial<InsertService>): Promise<Service | undefined> {
    const [updated] = await db.update(services).set(service).where(eq(services.id, id)).returning();
    return updated || undefined;
  }

  async initializeServices(): Promise<void> {
    const existingServices = await db.select().from(services);
    if (existingServices.length > 0) return;

    const defaultServices = [
      { name: "Grocery", description: "Fresh & Local Delivered Fast", image: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=400", isActive: true, sortOrder: 0 },
      { name: "E-Commerce", description: "Essentials & Elegance", image: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400", isActive: false, sortOrder: 1 },
      { name: "Food", description: "Delicious Meals Delivered", image: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400", isActive: false, sortOrder: 2 },
      { name: "City Move", description: "Instant Delivery", image: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=400", isActive: false, sortOrder: 3 },
      { name: "Hotel", description: "Book Your Stay", image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400", isActive: false, sortOrder: 4 },
      { name: "Taxi", description: "Ride With Comfort", image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?w=400", isActive: false, sortOrder: 5 },
    ];

    await db.insert(services).values(defaultServices);
  }

  // Addresses
  async getAddresses(userId: string): Promise<Address[]> {
    return db.select().from(addresses).where(eq(addresses.userId, userId)).orderBy(desc(addresses.isDefault));
  }

  async getAddress(id: string, userId: string): Promise<Address | undefined> {
    const [address] = await db.select().from(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
    return address || undefined;
  }

  async createAddress(address: InsertAddress): Promise<Address> {
    // If this is the first address or marked as default, clear other defaults
    if (address.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, address.userId));
    }
    const [created] = await db.insert(addresses).values(address).returning();
    return created;
  }

  async updateAddress(id: string, userId: string, address: Partial<InsertAddress>): Promise<Address | undefined> {
    // If setting as default, clear other defaults first
    if (address.isDefault) {
      await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    }
    const [updated] = await db.update(addresses).set(address).where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning();
    return updated || undefined;
  }

  async deleteAddress(id: string, userId: string): Promise<void> {
    await db.delete(addresses).where(and(eq(addresses.id, id), eq(addresses.userId, userId)));
  }

  async setDefaultAddress(id: string, userId: string): Promise<Address | undefined> {
    // Clear all defaults for user
    await db.update(addresses).set({ isDefault: false }).where(eq(addresses.userId, userId));
    // Set the specified address as default
    const [updated] = await db.update(addresses).set({ isDefault: true }).where(and(eq(addresses.id, id), eq(addresses.userId, userId))).returning();
    return updated || undefined;
  }
  // Support Tickets
  async getTickets(userId: string): Promise<SupportTicket[]> {
    return db.select().from(supportTickets).where(eq(supportTickets.userId, userId)).orderBy(desc(supportTickets.createdAt));
  }

  async getAllTickets(): Promise<(SupportTicket & { username?: string; userName?: string })[]> {
    const tickets = await db.select().from(supportTickets).orderBy(desc(supportTickets.createdAt));
    const result = [];
    for (const ticket of tickets) {
      const user = await this.getUser(ticket.userId);
      result.push({
        ...ticket,
        username: user?.username,
        userName: user?.name || user?.username,
      });
    }
    return result;
  }

  async getTicket(id: string): Promise<SupportTicketWithMessages | undefined> {
    const [ticket] = await db.select().from(supportTickets).where(eq(supportTickets.id, id));
    if (!ticket) return undefined;
    const messages = await db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, id)).orderBy(ticketMessages.createdAt);
    const user = await this.getUser(ticket.userId);
    return { ...ticket, messages, username: user?.username, userName: user?.name || user?.username };
  }

  async createTicket(ticket: InsertSupportTicket): Promise<SupportTicket> {
    const [created] = await db.insert(supportTickets).values(ticket).returning();
    return created;
  }

  async updateTicketStatus(id: string, status: string): Promise<SupportTicket | undefined> {
    const [updated] = await db.update(supportTickets).set({ status, updatedAt: new Date() }).where(eq(supportTickets.id, id)).returning();
    return updated || undefined;
  }

  async addTicketMessage(message: InsertTicketMessage): Promise<TicketMessage> {
    const [created] = await db.insert(ticketMessages).values(message).returning();
    await db.update(supportTickets).set({ updatedAt: new Date() }).where(eq(supportTickets.id, message.ticketId));
    return created;
  }

  async getTicketMessages(ticketId: string): Promise<TicketMessage[]> {
    return db.select().from(ticketMessages).where(eq(ticketMessages.ticketId, ticketId)).orderBy(ticketMessages.createdAt);
  }

  // Vendor Applications
  async getVendorApplications(): Promise<VendorApplication[]> {
    return db.select().from(vendorApplications).orderBy(desc(vendorApplications.createdAt));
  }

  async getVendorApplication(id: string): Promise<VendorApplication | undefined> {
    const [app] = await db.select().from(vendorApplications).where(eq(vendorApplications.id, id));
    return app || undefined;
  }

  async createVendorApplication(application: InsertVendorApplication): Promise<VendorApplication> {
    const [created] = await db.insert(vendorApplications).values(application).returning();
    return created;
  }

  async updateVendorApplicationStatus(id: string, status: string, adminNote?: string): Promise<VendorApplication | undefined> {
    const updateData: Partial<VendorApplication> = { status };
    if (adminNote !== undefined) updateData.adminNote = adminNote;
    const [updated] = await db.update(vendorApplications).set(updateData).where(eq(vendorApplications.id, id)).returning();
    return updated || undefined;
  }

  // Vendor Products
  async getVendorProducts(vendorId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.vendorId, vendorId));
  }

  // E-Commerce Categories
  async getEcomCategories(): Promise<EcomCategory[]> {
    return db.select().from(ecomCategories).where(eq(ecomCategories.isActive, true)).orderBy(ecomCategories.sortOrder);
  }

  async getAllEcomCategories(): Promise<EcomCategory[]> {
    return db.select().from(ecomCategories).orderBy(ecomCategories.sortOrder);
  }

  async getEcomCategory(id: string): Promise<EcomCategory | undefined> {
    const [cat] = await db.select().from(ecomCategories).where(eq(ecomCategories.id, id));
    return cat || undefined;
  }

  async createEcomCategory(category: InsertEcomCategory): Promise<EcomCategory> {
    const [created] = await db.insert(ecomCategories).values(category).returning();
    return created;
  }

  async updateEcomCategory(id: string, category: Partial<InsertEcomCategory>): Promise<EcomCategory | undefined> {
    const [updated] = await db.update(ecomCategories).set(category).where(eq(ecomCategories.id, id)).returning();
    return updated || undefined;
  }

  async deleteEcomCategory(id: string): Promise<void> {
    await db.delete(ecomCategories).where(eq(ecomCategories.id, id));
  }

  // E-Commerce Products
  async getEcomProducts(filters?: { categoryId?: string; search?: string; minPrice?: number; maxPrice?: number; vendorId?: string; brand?: string; isFeatured?: boolean; sortBy?: string }): Promise<EcomProduct[]> {
    const conditions = [eq(ecomProducts.isActive, true), eq(ecomProducts.isApproved, true)];
    
    if (filters?.categoryId) conditions.push(eq(ecomProducts.categoryId, filters.categoryId));
    if (filters?.vendorId) conditions.push(eq(ecomProducts.vendorId, filters.vendorId));
    if (filters?.brand) conditions.push(eq(ecomProducts.brand, filters.brand));
    if (filters?.isFeatured) conditions.push(eq(ecomProducts.isFeatured, true));
    if (filters?.search) conditions.push(ilike(ecomProducts.name, `%${filters.search}%`));
    if (filters?.minPrice) conditions.push(gte(ecomProducts.price, String(filters.minPrice)));
    if (filters?.maxPrice) conditions.push(lte(ecomProducts.price, String(filters.maxPrice)));

    let query = db.select().from(ecomProducts).where(and(...conditions));

    if (filters?.sortBy === 'price_asc') {
      return query.orderBy(ecomProducts.price);
    } else if (filters?.sortBy === 'price_desc') {
      return query.orderBy(desc(ecomProducts.price));
    } else if (filters?.sortBy === 'rating') {
      return query.orderBy(desc(ecomProducts.rating));
    } else if (filters?.sortBy === 'newest') {
      return query.orderBy(desc(ecomProducts.createdAt));
    }
    return query.orderBy(desc(ecomProducts.createdAt));
  }

  async getAllEcomProducts(): Promise<EcomProduct[]> {
    return db.select().from(ecomProducts).orderBy(desc(ecomProducts.createdAt));
  }

  async getEcomProduct(id: string): Promise<EcomProduct | undefined> {
    const [product] = await db.select().from(ecomProducts).where(eq(ecomProducts.id, id));
    return product || undefined;
  }

  async createEcomProduct(product: InsertEcomProduct): Promise<EcomProduct> {
    const [created] = await db.insert(ecomProducts).values(product).returning();
    return created;
  }

  async updateEcomProduct(id: string, product: Partial<InsertEcomProduct>): Promise<EcomProduct | undefined> {
    const [updated] = await db.update(ecomProducts).set(product).where(eq(ecomProducts.id, id)).returning();
    return updated || undefined;
  }

  async deleteEcomProduct(id: string): Promise<void> {
    await db.delete(ecomProducts).where(eq(ecomProducts.id, id));
  }

  async getVendorEcomProducts(vendorId: string): Promise<EcomProduct[]> {
    return db.select().from(ecomProducts).where(eq(ecomProducts.vendorId, vendorId)).orderBy(desc(ecomProducts.createdAt));
  }

  // E-Commerce Reviews
  async getEcomReviews(productId: string): Promise<EcomReviewWithUser[]> {
    const reviews = await db.select({
      review: ecomReviews,
      username: users.username,
      name: users.name,
    }).from(ecomReviews)
      .leftJoin(users, eq(ecomReviews.userId, users.id))
      .where(eq(ecomReviews.productId, productId))
      .orderBy(desc(ecomReviews.createdAt));
    
    return reviews.map(r => ({
      ...r.review,
      username: r.username || undefined,
      name: r.name || undefined,
    }));
  }

  async createEcomReview(review: InsertEcomReview): Promise<EcomReview> {
    const [created] = await db.insert(ecomReviews).values(review).returning();
    const allReviews = await db.select({ rating: ecomReviews.rating }).from(ecomReviews).where(eq(ecomReviews.productId, review.productId));
    const avgRating = allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length;
    await db.update(ecomProducts).set({
      rating: avgRating.toFixed(1),
      reviewCount: allReviews.length,
    }).where(eq(ecomProducts.id, review.productId));
    return created;
  }

  // Seller Profiles
  async getSellerProfile(userId: string): Promise<SellerProfile | undefined> {
    const [profile] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.userId, userId));
    return profile || undefined;
  }

  async getSellerProfileById(id: string): Promise<SellerProfile | undefined> {
    const [profile] = await db.select().from(sellerProfiles).where(eq(sellerProfiles.id, id));
    return profile || undefined;
  }

  async getAllSellerProfiles(): Promise<(SellerProfile & { username?: string; name?: string })[]> {
    const profiles = await db.select({
      profile: sellerProfiles,
      username: users.username,
      name: users.name,
    }).from(sellerProfiles)
      .leftJoin(users, eq(sellerProfiles.userId, users.id))
      .orderBy(desc(sellerProfiles.createdAt));
    
    return profiles.map(p => ({
      ...p.profile,
      username: p.username || undefined,
      name: p.name || undefined,
    }));
  }

  async createSellerProfile(profile: InsertSellerProfile): Promise<SellerProfile> {
    const [created] = await db.insert(sellerProfiles).values(profile).returning();
    return created;
  }

  async updateSellerProfile(userId: string, profile: Partial<InsertSellerProfile>): Promise<SellerProfile | undefined> {
    const [updated] = await db.update(sellerProfiles).set(profile).where(eq(sellerProfiles.userId, userId)).returning();
    return updated || undefined;
  }

  // E-Commerce Cart
  async getEcomCartItems(userId: string): Promise<EcomCartItemWithProduct[]> {
    const items = await db.select().from(ecomCartItems)
      .innerJoin(ecomProducts, eq(ecomCartItems.productId, ecomProducts.id))
      .where(eq(ecomCartItems.userId, userId));
    
    return items.map(item => ({
      ...item.ecom_cart_items,
      product: item.ecom_products,
    }));
  }

  async addToEcomCart(item: InsertEcomCartItem): Promise<EcomCartItem> {
    const conditions = [
      eq(ecomCartItems.userId, item.userId),
      eq(ecomCartItems.productId, item.productId),
    ];
    if (item.variant) {
      conditions.push(eq(ecomCartItems.variant, item.variant));
    } else {
      conditions.push(sql`${ecomCartItems.variant} IS NULL`);
    }
    const existing = await db.select().from(ecomCartItems).where(and(...conditions));
    
    if (existing.length > 0) {
      const [updated] = await db.update(ecomCartItems)
        .set({ quantity: (existing[0].quantity || 1) + (item.quantity || 1) })
        .where(eq(ecomCartItems.id, existing[0].id))
        .returning();
      return updated;
    }
    
    const [created] = await db.insert(ecomCartItems).values(item).returning();
    return created;
  }

  async updateEcomCartItem(id: string, userId: string, quantity: number): Promise<EcomCartItem | undefined> {
    const [updated] = await db.update(ecomCartItems)
      .set({ quantity })
      .where(and(eq(ecomCartItems.id, id), eq(ecomCartItems.userId, userId)))
      .returning();
    return updated || undefined;
  }

  async removeFromEcomCart(id: string, userId: string): Promise<void> {
    await db.delete(ecomCartItems).where(and(eq(ecomCartItems.id, id), eq(ecomCartItems.userId, userId)));
  }

  async clearEcomCart(userId: string): Promise<void> {
    await db.delete(ecomCartItems).where(eq(ecomCartItems.userId, userId));
  }

  // E-Commerce Wishlist
  async getEcomWishlistItems(userId: string): Promise<EcomWishlistItemWithProduct[]> {
    const items = await db.select().from(ecomWishlistItems)
      .innerJoin(ecomProducts, eq(ecomWishlistItems.productId, ecomProducts.id))
      .where(eq(ecomWishlistItems.userId, userId));
    
    return items.map(item => ({
      ...item.ecom_wishlist_items,
      product: item.ecom_products,
    }));
  }

  async addToEcomWishlist(item: InsertEcomWishlistItem): Promise<EcomWishlistItem> {
    const existing = await db.select().from(ecomWishlistItems).where(
      and(eq(ecomWishlistItems.userId, item.userId), eq(ecomWishlistItems.productId, item.productId))
    );
    if (existing.length > 0) return existing[0];
    const [created] = await db.insert(ecomWishlistItems).values(item).returning();
    return created;
  }

  async removeFromEcomWishlist(userId: string, productId: string): Promise<void> {
    await db.delete(ecomWishlistItems).where(
      and(eq(ecomWishlistItems.userId, userId), eq(ecomWishlistItems.productId, productId))
    );
  }

  // E-Commerce Orders
  async getEcomOrders(userId: string): Promise<EcomOrder[]> {
    return db.select().from(ecomOrders).where(eq(ecomOrders.userId, userId)).orderBy(desc(ecomOrders.createdAt));
  }

  async getAllEcomOrders(): Promise<EcomOrder[]> {
    return db.select().from(ecomOrders).orderBy(desc(ecomOrders.createdAt));
  }

  async getVendorEcomOrders(vendorId: string): Promise<EcomOrder[]> {
    return db.select().from(ecomOrders).where(eq(ecomOrders.vendorId, vendorId)).orderBy(desc(ecomOrders.createdAt));
  }

  async getEcomOrder(id: string): Promise<EcomOrder | undefined> {
    const [order] = await db.select().from(ecomOrders).where(eq(ecomOrders.id, id));
    return order || undefined;
  }

  async createEcomOrder(order: InsertEcomOrder): Promise<EcomOrder> {
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        const orderNumber = 'EC' + this.generateOrderNumber().slice(2);
        const [created] = await db.insert(ecomOrders).values({ ...order, orderNumber }).returning();
        return created;
      } catch (err: any) {
        if (err?.code === '23505' && attempt < 4) continue;
        throw err;
      }
    }
    throw new Error("Failed to generate unique order number");
  }

  async updateEcomOrderStatus(id: string, status: string): Promise<EcomOrder | undefined> {
    const [updated] = await db.update(ecomOrders).set({ status }).where(eq(ecomOrders.id, id)).returning();
    return updated || undefined;
  }

  // Seller Analytics
  async getSellerStats(vendorId: string): Promise<{ totalProducts: number; totalOrders: number; totalRevenue: string; pendingOrders: number }> {
    const [productCount] = await db.select({ count: count() }).from(ecomProducts).where(eq(ecomProducts.vendorId, vendorId));
    const [orderCount] = await db.select({ count: count() }).from(ecomOrders).where(eq(ecomOrders.vendorId, vendorId));
    const [revenue] = await db.select({ total: sum(ecomOrders.totalAmount) }).from(ecomOrders).where(and(eq(ecomOrders.vendorId, vendorId), eq(ecomOrders.status, "delivered")));
    const [pendingCount] = await db.select({ count: count() }).from(ecomOrders).where(and(eq(ecomOrders.vendorId, vendorId), eq(ecomOrders.status, "pending")));
    
    return {
      totalProducts: productCount.count,
      totalOrders: orderCount.count,
      totalRevenue: revenue.total || "0",
      pendingOrders: pendingCount.count,
    };
  }
}

export const storage = new DatabaseStorage();
