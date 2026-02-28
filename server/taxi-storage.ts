import {
  taxiVehicleTypes,
  taxiDrivers,
  taxiRides,
  users,
  type TaxiVehicleType,
  type InsertTaxiVehicleType,
  type TaxiDriver,
  type InsertTaxiDriver,
  type TaxiRide,
  type InsertTaxiRide,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, sql, count, sum } from "drizzle-orm";

export interface ITaxiStorage {
  getTaxiVehicleTypes(): Promise<TaxiVehicleType[]>;
  getTaxiVehicleType(id: string): Promise<TaxiVehicleType | undefined>;
  createTaxiVehicleType(vt: InsertTaxiVehicleType): Promise<TaxiVehicleType>;
  updateTaxiVehicleType(id: string, vt: Partial<InsertTaxiVehicleType>): Promise<TaxiVehicleType | undefined>;
  deleteTaxiVehicleType(id: string): Promise<void>;

  getTaxiDrivers(): Promise<TaxiDriver[]>;
  getTaxiDriver(id: string): Promise<TaxiDriver | undefined>;
  getTaxiDriverByUserId(userId: string): Promise<TaxiDriver | undefined>;
  createTaxiDriver(driver: InsertTaxiDriver): Promise<TaxiDriver>;
  updateTaxiDriver(id: string, driver: Partial<InsertTaxiDriver>): Promise<TaxiDriver | undefined>;
  deleteTaxiDriver(id: string): Promise<void>;
  toggleTaxiDriverOnline(userId: string, isOnline: boolean): Promise<TaxiDriver | undefined>;

  getTaxiRides(userId: string): Promise<TaxiRide[]>;
  getAllTaxiRides(): Promise<TaxiRide[]>;
  getTaxiRide(id: string): Promise<TaxiRide | undefined>;
  getDriverTaxiRides(driverId: string): Promise<TaxiRide[]>;
  createTaxiRide(ride: InsertTaxiRide): Promise<TaxiRide>;
  updateTaxiRideStatus(id: string, status: string): Promise<TaxiRide | undefined>;
  updateTaxiRide(id: string, data: Partial<InsertTaxiRide>): Promise<TaxiRide | undefined>;
  assignTaxiDriver(rideId: string, driverId: string): Promise<TaxiRide | undefined>;
  rateTaxiRide(id: string, rating: number): Promise<TaxiRide | undefined>;

  getTaxiDriverEarnings(driverId: string): Promise<string>;
  getTaxiDriverStats(driverId: string): Promise<{ totalRides: number; todayRides: number; earnings: string; rating: string }>;
}

export class TaxiStorage implements ITaxiStorage {
  async getTaxiVehicleTypes(): Promise<TaxiVehicleType[]> {
    return db.select().from(taxiVehicleTypes);
  }

  async getTaxiVehicleType(id: string): Promise<TaxiVehicleType | undefined> {
    const [vt] = await db.select().from(taxiVehicleTypes).where(eq(taxiVehicleTypes.id, id));
    return vt || undefined;
  }

  async createTaxiVehicleType(vt: InsertTaxiVehicleType): Promise<TaxiVehicleType> {
    const [created] = await db.insert(taxiVehicleTypes).values(vt).returning();
    return created;
  }

  async updateTaxiVehicleType(id: string, vt: Partial<InsertTaxiVehicleType>): Promise<TaxiVehicleType | undefined> {
    const [updated] = await db.update(taxiVehicleTypes).set(vt).where(eq(taxiVehicleTypes.id, id)).returning();
    return updated || undefined;
  }

  async deleteTaxiVehicleType(id: string): Promise<void> {
    await db.delete(taxiVehicleTypes).where(eq(taxiVehicleTypes.id, id));
  }

  async getTaxiDrivers(): Promise<TaxiDriver[]> {
    return db.select().from(taxiDrivers);
  }

  async getTaxiDriver(id: string): Promise<TaxiDriver | undefined> {
    const [driver] = await db.select().from(taxiDrivers).where(eq(taxiDrivers.id, id));
    return driver || undefined;
  }

  async getTaxiDriverByUserId(userId: string): Promise<TaxiDriver | undefined> {
    const [driver] = await db.select().from(taxiDrivers).where(eq(taxiDrivers.userId, userId));
    return driver || undefined;
  }

  async createTaxiDriver(driver: InsertTaxiDriver): Promise<TaxiDriver> {
    const [created] = await db.insert(taxiDrivers).values(driver).returning();
    return created;
  }

  async updateTaxiDriver(id: string, driver: Partial<InsertTaxiDriver>): Promise<TaxiDriver | undefined> {
    const [updated] = await db.update(taxiDrivers).set(driver).where(eq(taxiDrivers.id, id)).returning();
    return updated || undefined;
  }

  async deleteTaxiDriver(id: string): Promise<void> {
    await db.delete(taxiDrivers).where(eq(taxiDrivers.id, id));
  }

  async toggleTaxiDriverOnline(userId: string, isOnline: boolean): Promise<TaxiDriver | undefined> {
    const [updated] = await db.update(taxiDrivers).set({ isOnline }).where(eq(taxiDrivers.userId, userId)).returning();
    return updated || undefined;
  }

  async getTaxiRides(userId: string): Promise<TaxiRide[]> {
    return db.select().from(taxiRides).where(eq(taxiRides.userId, userId)).orderBy(desc(taxiRides.createdAt));
  }

  async getAllTaxiRides(): Promise<TaxiRide[]> {
    return db.select().from(taxiRides).orderBy(desc(taxiRides.createdAt));
  }

  async getTaxiRide(id: string): Promise<TaxiRide | undefined> {
    const [ride] = await db.select().from(taxiRides).where(eq(taxiRides.id, id));
    return ride || undefined;
  }

  async getDriverTaxiRides(driverId: string): Promise<TaxiRide[]> {
    return db.select().from(taxiRides).where(eq(taxiRides.driverId, driverId)).orderBy(desc(taxiRides.createdAt));
  }

  async createTaxiRide(ride: InsertTaxiRide): Promise<TaxiRide> {
    const [created] = await db.insert(taxiRides).values(ride).returning();
    return created;
  }

  async updateTaxiRideStatus(id: string, status: string): Promise<TaxiRide | undefined> {
    const [updated] = await db.update(taxiRides).set({ status }).where(eq(taxiRides.id, id)).returning();
    return updated || undefined;
  }

  async updateTaxiRide(id: string, data: Partial<InsertTaxiRide>): Promise<TaxiRide | undefined> {
    const [updated] = await db.update(taxiRides).set(data).where(eq(taxiRides.id, id)).returning();
    return updated || undefined;
  }

  async assignTaxiDriver(rideId: string, driverId: string): Promise<TaxiRide | undefined> {
    const driver = await this.getTaxiDriver(driverId);
    if (!driver) return undefined;

    const [updated] = await db.update(taxiRides).set({
      driverId,
      driverName: driver.name,
      driverPhone: driver.phone,
      vehicleNumber: driver.vehicleNumber,
      status: "driver_assigned",
    }).where(eq(taxiRides.id, rideId)).returning();
    return updated || undefined;
  }

  async rateTaxiRide(id: string, rating: number): Promise<TaxiRide | undefined> {
    const [updated] = await db.update(taxiRides).set({ rating }).where(eq(taxiRides.id, id)).returning();
    return updated || undefined;
  }

  async getTaxiDriverEarnings(driverId: string): Promise<string> {
    const [result] = await db
      .select({ total: sum(taxiRides.actualFare) })
      .from(taxiRides)
      .where(and(eq(taxiRides.driverId, driverId), eq(taxiRides.status, "completed")));
    return result?.total || "0";
  }

  async getTaxiDriverStats(driverId: string): Promise<{ totalRides: number; todayRides: number; earnings: string; rating: string }> {
    const [totalResult] = await db
      .select({ count: count() })
      .from(taxiRides)
      .where(and(eq(taxiRides.driverId, driverId), eq(taxiRides.status, "completed")));

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [todayResult] = await db
      .select({ count: count() })
      .from(taxiRides)
      .where(and(
        eq(taxiRides.driverId, driverId),
        eq(taxiRides.status, "completed"),
        sql`${taxiRides.createdAt} >= ${today}`
      ));

    const [earningsResult] = await db
      .select({ total: sum(taxiRides.actualFare) })
      .from(taxiRides)
      .where(and(eq(taxiRides.driverId, driverId), eq(taxiRides.status, "completed")));

    const driver = await this.getTaxiDriver(driverId);

    return {
      totalRides: totalResult?.count || 0,
      todayRides: todayResult?.count || 0,
      earnings: earningsResult?.total || "0",
      rating: driver?.rating || "4.5",
    };
  }
}

export const taxiStorage = new TaxiStorage();
