import {
  type CityServiceCategory,
  type InsertCityServiceCategory,
  type CityService,
  type InsertCityService,
  type CityServiceProvider,
  type InsertCityServiceProvider,
  type CityServiceBooking,
  type InsertCityServiceBooking,
} from "@shared/schema";
import { getDb, toDoc, toDocs, newId } from "./db";

function col(name: string) {
  return getDb().collection(name);
}

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
    return toDocs<CityServiceCategory>(await col("city_service_categories").find().toArray());
  }
  async getServiceCategory(id: string): Promise<CityServiceCategory | undefined> {
    const doc = await col("city_service_categories").findOne({ _id: id as any });
    return doc ? toDoc<CityServiceCategory>(doc) : undefined;
  }
  async getAllServiceCategories(): Promise<CityServiceCategory[]> {
    return toDocs<CityServiceCategory>(await col("city_service_categories").find().toArray());
  }
  async createServiceCategory(category: InsertCityServiceCategory): Promise<CityServiceCategory> {
    const id = newId();
    const doc = { _id: id as any, ...category };
    await col("city_service_categories").insertOne(doc);
    return toDoc<CityServiceCategory>(doc);
  }
  async updateServiceCategory(id: string, category: Partial<InsertCityServiceCategory>): Promise<CityServiceCategory | undefined> {
    const r = await col("city_service_categories").findOneAndUpdate({ _id: id as any }, { $set: category }, { returnDocument: "after" });
    return r ? toDoc<CityServiceCategory>(r) : undefined;
  }
  async deleteServiceCategory(id: string): Promise<void> {
    await col("city_services").deleteMany({ categoryId: id });
    await col("city_service_categories").deleteOne({ _id: id as any });
  }
  async getCityServices(filters?: { categoryId?: string; search?: string }): Promise<CityService[]> {
    const query: any = { isActive: true };
    if (filters?.categoryId) query.categoryId = filters.categoryId;
    if (filters?.search) query.name = { $regex: filters.search, $options: "i" };
    return toDocs<CityService>(await col("city_services").find(query).toArray());
  }
  async getCityService(id: string): Promise<CityService | undefined> {
    const doc = await col("city_services").findOne({ _id: id as any });
    return doc ? toDoc<CityService>(doc) : undefined;
  }
  async getAllCityServices(): Promise<CityService[]> {
    return toDocs<CityService>(await col("city_services").find().toArray());
  }
  async createCityService(service: InsertCityService): Promise<CityService> {
    const id = newId();
    const doc = { _id: id as any, image: null, reviewCount: 0, isActive: true, ...service };
    await col("city_services").insertOne(doc);
    return toDoc<CityService>(doc);
  }
  async updateCityService(id: string, service: Partial<InsertCityService>): Promise<CityService | undefined> {
    const r = await col("city_services").findOneAndUpdate({ _id: id as any }, { $set: service }, { returnDocument: "after" });
    return r ? toDoc<CityService>(r) : undefined;
  }
  async deleteCityService(id: string): Promise<void> {
    await col("city_services").deleteOne({ _id: id as any });
  }
  async getProviders(): Promise<CityServiceProvider[]> {
    return toDocs<CityServiceProvider>(await col("city_service_providers").find().toArray());
  }
  async getProvider(id: string): Promise<CityServiceProvider | undefined> {
    const doc = await col("city_service_providers").findOne({ _id: id as any });
    return doc ? toDoc<CityServiceProvider>(doc) : undefined;
  }
  async getProviderByUserId(userId: string): Promise<CityServiceProvider | undefined> {
    const doc = await col("city_service_providers").findOne({ userId });
    return doc ? toDoc<CityServiceProvider>(doc) : undefined;
  }
  async createProvider(provider: InsertCityServiceProvider): Promise<CityServiceProvider> {
    const id = newId();
    const doc = { _id: id as any, isAvailable: true, ...provider };
    await col("city_service_providers").insertOne(doc);
    return toDoc<CityServiceProvider>(doc);
  }
  async updateProvider(id: string, provider: Partial<InsertCityServiceProvider>): Promise<CityServiceProvider | undefined> {
    const r = await col("city_service_providers").findOneAndUpdate({ _id: id as any }, { $set: provider }, { returnDocument: "after" });
    return r ? toDoc<CityServiceProvider>(r) : undefined;
  }
  async deleteProvider(id: string): Promise<void> {
    await col("city_service_providers").deleteOne({ _id: id as any });
  }
  async getBookings(userId: string): Promise<CityServiceBooking[]> {
    return toDocs<CityServiceBooking>(await col("city_service_bookings").find({ userId }).sort({ createdAt: -1 }).toArray());
  }
  async getProviderBookings(providerId: string): Promise<CityServiceBooking[]> {
    return toDocs<CityServiceBooking>(await col("city_service_bookings").find({ providerId }).sort({ createdAt: -1 }).toArray());
  }
  async getAllBookings(): Promise<CityServiceBooking[]> {
    return toDocs<CityServiceBooking>(await col("city_service_bookings").find().sort({ createdAt: -1 }).toArray());
  }
  async getBooking(id: string): Promise<CityServiceBooking | undefined> {
    const doc = await col("city_service_bookings").findOne({ _id: id as any });
    return doc ? toDoc<CityServiceBooking>(doc) : undefined;
  }
  async createBooking(booking: InsertCityServiceBooking): Promise<CityServiceBooking> {
    const id = newId();
    const doc = { _id: id as any, status: "pending", createdAt: new Date(), ...booking };
    await col("city_service_bookings").insertOne(doc);
    return toDoc<CityServiceBooking>(doc);
  }
  async updateBookingStatus(id: string, status: string): Promise<CityServiceBooking | undefined> {
    const r = await col("city_service_bookings").findOneAndUpdate({ _id: id as any }, { $set: { status } }, { returnDocument: "after" });
    return r ? toDoc<CityServiceBooking>(r) : undefined;
  }
  async rateBooking(id: string, rating: number): Promise<CityServiceBooking | undefined> {
    const r = await col("city_service_bookings").findOneAndUpdate({ _id: id as any }, { $set: { rating } }, { returnDocument: "after" });
    return r ? toDoc<CityServiceBooking>(r) : undefined;
  }
  async assignProvider(bookingId: string, providerId: string): Promise<CityServiceBooking | undefined> {
    const r = await col("city_service_bookings").findOneAndUpdate(
      { _id: bookingId as any },
      { $set: { providerId, status: "provider_assigned" } },
      { returnDocument: "after" }
    );
    return r ? toDoc<CityServiceBooking>(r) : undefined;
  }
}

export const cityServicesStorage = new CityServicesStorage();
