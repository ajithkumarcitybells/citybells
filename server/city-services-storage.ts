import {
  cityServiceCategories,
  cityServices,
  cityServiceProviders,
  cityServiceBookings,
  users,
  type CityServiceCategory,
  type InsertCityServiceCategory,
  type CityService,
  type InsertCityService,
  type CityServiceProvider,
  type InsertCityServiceProvider,
  type CityServiceBooking,
  type InsertCityServiceBooking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, sql } from "drizzle-orm";

export interface ICityServicesStorage {
  getServiceCategories(): Promise<CityServiceCategory[]>;
  getServiceCategory(id: string): Promise<CityServiceCategory | undefined>;
  getAllServiceCategories(): Promise<CityServiceCategory[]>;
  createServiceCategory(category: InsertCityServiceCategory): Promise<CityServiceCategory>;
  updateServiceCategory(id: string, category: Partial<InsertCityServiceCategory>): Promise<CityServiceCategory | undefined>;
  deleteServiceCategory(id: string): Promise<void>;

  getCityServices(filters?: { categoryId?: string; search?: string }): Promise<CityService[]>;
  getCityService(id: string): Promise<CityService | undefined>;
  getAllCityServices(): Promise<CityService[]>;
  createCityService(service: InsertCityService): Promise<CityService>;
  updateCityService(id: string, service: Partial<InsertCityService>): Promise<CityService | undefined>;
  deleteCityService(id: string): Promise<void>;

  getProviders(): Promise<CityServiceProvider[]>;
  getProvider(id: string): Promise<CityServiceProvider | undefined>;
  getProviderByUserId(userId: string): Promise<CityServiceProvider | undefined>;
  createProvider(provider: InsertCityServiceProvider): Promise<CityServiceProvider>;
  updateProvider(id: string, provider: Partial<InsertCityServiceProvider>): Promise<CityServiceProvider | undefined>;
  deleteProvider(id: string): Promise<void>;

  getBookings(userId: string): Promise<CityServiceBooking[]>;
  getProviderBookings(providerId: string): Promise<CityServiceBooking[]>;
  getAllBookings(): Promise<CityServiceBooking[]>;
  getBooking(id: string): Promise<CityServiceBooking | undefined>;
  createBooking(booking: InsertCityServiceBooking): Promise<CityServiceBooking>;
  updateBookingStatus(id: string, status: string): Promise<CityServiceBooking | undefined>;
  rateBooking(id: string, rating: number): Promise<CityServiceBooking | undefined>;
  assignProvider(bookingId: string, providerId: string): Promise<CityServiceBooking | undefined>;
}

export class CityServicesStorage implements ICityServicesStorage {
  async getServiceCategories(): Promise<CityServiceCategory[]> {
    return db.select().from(cityServiceCategories);
  }

  async getServiceCategory(id: string): Promise<CityServiceCategory | undefined> {
    const [category] = await db.select().from(cityServiceCategories).where(eq(cityServiceCategories.id, id));
    return category || undefined;
  }

  async getAllServiceCategories(): Promise<CityServiceCategory[]> {
    return db.select().from(cityServiceCategories);
  }

  async createServiceCategory(category: InsertCityServiceCategory): Promise<CityServiceCategory> {
    const [created] = await db.insert(cityServiceCategories).values(category).returning();
    return created;
  }

  async updateServiceCategory(id: string, category: Partial<InsertCityServiceCategory>): Promise<CityServiceCategory | undefined> {
    const [updated] = await db.update(cityServiceCategories).set(category).where(eq(cityServiceCategories.id, id)).returning();
    return updated || undefined;
  }

  async deleteServiceCategory(id: string): Promise<void> {
    await db.delete(cityServices).where(eq(cityServices.categoryId, id));
    await db.delete(cityServiceCategories).where(eq(cityServiceCategories.id, id));
  }

  async getCityServices(filters?: { categoryId?: string; search?: string }): Promise<CityService[]> {
    const conditions = [eq(cityServices.isActive, true)];

    if (filters?.categoryId) {
      conditions.push(eq(cityServices.categoryId, filters.categoryId));
    }

    if (filters?.search) {
      conditions.push(ilike(cityServices.name, `%${filters.search}%`));
    }

    return db.select().from(cityServices).where(and(...conditions));
  }

  async getCityService(id: string): Promise<CityService | undefined> {
    const [service] = await db.select().from(cityServices).where(eq(cityServices.id, id));
    return service || undefined;
  }

  async getAllCityServices(): Promise<CityService[]> {
    return db.select().from(cityServices);
  }

  async createCityService(service: InsertCityService): Promise<CityService> {
    const [created] = await db.insert(cityServices).values(service).returning();
    return created;
  }

  async updateCityService(id: string, service: Partial<InsertCityService>): Promise<CityService | undefined> {
    const [updated] = await db.update(cityServices).set(service).where(eq(cityServices.id, id)).returning();
    return updated || undefined;
  }

  async deleteCityService(id: string): Promise<void> {
    await db.delete(cityServices).where(eq(cityServices.id, id));
  }

  async getProviders(): Promise<CityServiceProvider[]> {
    return db.select().from(cityServiceProviders);
  }

  async getProvider(id: string): Promise<CityServiceProvider | undefined> {
    const [provider] = await db.select().from(cityServiceProviders).where(eq(cityServiceProviders.id, id));
    return provider || undefined;
  }

  async getProviderByUserId(userId: string): Promise<CityServiceProvider | undefined> {
    const [provider] = await db.select().from(cityServiceProviders).where(eq(cityServiceProviders.userId, userId));
    return provider || undefined;
  }

  async createProvider(provider: InsertCityServiceProvider): Promise<CityServiceProvider> {
    const [created] = await db.insert(cityServiceProviders).values(provider).returning();
    return created;
  }

  async updateProvider(id: string, provider: Partial<InsertCityServiceProvider>): Promise<CityServiceProvider | undefined> {
    const [updated] = await db.update(cityServiceProviders).set(provider).where(eq(cityServiceProviders.id, id)).returning();
    return updated || undefined;
  }

  async deleteProvider(id: string): Promise<void> {
    await db.delete(cityServiceProviders).where(eq(cityServiceProviders.id, id));
  }

  async getBookings(userId: string): Promise<CityServiceBooking[]> {
    return db.select().from(cityServiceBookings).where(eq(cityServiceBookings.userId, userId)).orderBy(desc(cityServiceBookings.createdAt));
  }

  async getProviderBookings(providerId: string): Promise<CityServiceBooking[]> {
    return db.select().from(cityServiceBookings).where(eq(cityServiceBookings.providerId, providerId)).orderBy(desc(cityServiceBookings.createdAt));
  }

  async getAllBookings(): Promise<CityServiceBooking[]> {
    return db.select().from(cityServiceBookings).orderBy(desc(cityServiceBookings.createdAt));
  }

  async getBooking(id: string): Promise<CityServiceBooking | undefined> {
    const [booking] = await db.select().from(cityServiceBookings).where(eq(cityServiceBookings.id, id));
    return booking || undefined;
  }

  async createBooking(booking: InsertCityServiceBooking): Promise<CityServiceBooking> {
    const [created] = await db.insert(cityServiceBookings).values(booking).returning();
    return created;
  }

  async updateBookingStatus(id: string, status: string): Promise<CityServiceBooking | undefined> {
    const [updated] = await db.update(cityServiceBookings).set({ status }).where(eq(cityServiceBookings.id, id)).returning();
    return updated || undefined;
  }

  async rateBooking(id: string, rating: number): Promise<CityServiceBooking | undefined> {
    const [updated] = await db.update(cityServiceBookings).set({ rating }).where(eq(cityServiceBookings.id, id)).returning();
    return updated || undefined;
  }

  async assignProvider(bookingId: string, providerId: string): Promise<CityServiceBooking | undefined> {
    const [updated] = await db.update(cityServiceBookings).set({ providerId, status: "provider_assigned" }).where(eq(cityServiceBookings.id, bookingId)).returning();
    return updated || undefined;
  }
}

export const cityServicesStorage = new CityServicesStorage();
