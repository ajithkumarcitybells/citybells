import {
  hotels,
  hotelRooms,
  hotelBookings,
  users,
  type Hotel,
  type InsertHotel,
  type HotelRoom,
  type InsertHotelRoom,
  type HotelBooking,
  type InsertHotelBooking,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, gte, lte, count, sum } from "drizzle-orm";

export interface IHotelStorage {
  getHotels(filters?: { city?: string; stars?: number; minPrice?: number; maxPrice?: number; search?: string }): Promise<Hotel[]>;
  getHotel(id: string): Promise<Hotel | undefined>;
  createHotel(hotel: InsertHotel): Promise<Hotel>;
  updateHotel(id: string, hotel: Partial<InsertHotel>): Promise<Hotel | undefined>;
  deleteHotel(id: string): Promise<void>;
  getAllHotels(): Promise<Hotel[]>;
  getHotelsByManager(managerId: string): Promise<Hotel[]>;

  getHotelRooms(hotelId: string): Promise<HotelRoom[]>;
  getHotelRoom(id: string): Promise<HotelRoom | undefined>;
  createHotelRoom(room: InsertHotelRoom): Promise<HotelRoom>;
  updateHotelRoom(id: string, room: Partial<InsertHotelRoom>): Promise<HotelRoom | undefined>;
  deleteHotelRoom(id: string): Promise<void>;

  getHotelBookings(hotelId: string): Promise<HotelBooking[]>;
  getUserHotelBookings(userId: string): Promise<(HotelBooking & { hotelName?: string; roomName?: string })[]>;
  getHotelBooking(id: string): Promise<HotelBooking | undefined>;
  createHotelBooking(booking: InsertHotelBooking): Promise<HotelBooking>;
  updateHotelBookingStatus(id: string, status: string): Promise<HotelBooking | undefined>;
  getAllHotelBookings(): Promise<(HotelBooking & { hotelName?: string; roomName?: string; guestUsername?: string })[]>;
}

export class HotelStorage implements IHotelStorage {
  async getHotels(filters?: { city?: string; stars?: number; minPrice?: number; maxPrice?: number; search?: string }): Promise<Hotel[]> {
    const conditions = [eq(hotels.isActive, true)];

    if (filters?.city) {
      conditions.push(ilike(hotels.city, `%${filters.city}%`));
    }
    if (filters?.stars) {
      conditions.push(eq(hotels.starRating, filters.stars));
    }
    if (filters?.search) {
      conditions.push(ilike(hotels.name, `%${filters.search}%`));
    }

    return db.select().from(hotels).where(and(...conditions)).orderBy(desc(hotels.rating));
  }

  async getHotel(id: string): Promise<Hotel | undefined> {
    const [hotel] = await db.select().from(hotels).where(eq(hotels.id, id));
    return hotel || undefined;
  }

  async createHotel(hotel: InsertHotel): Promise<Hotel> {
    const [created] = await db.insert(hotels).values(hotel).returning();
    return created;
  }

  async updateHotel(id: string, hotel: Partial<InsertHotel>): Promise<Hotel | undefined> {
    const [updated] = await db.update(hotels).set(hotel).where(eq(hotels.id, id)).returning();
    return updated || undefined;
  }

  async deleteHotel(id: string): Promise<void> {
    await db.delete(hotels).where(eq(hotels.id, id));
  }

  async getAllHotels(): Promise<Hotel[]> {
    return db.select().from(hotels).orderBy(desc(hotels.rating));
  }

  async getHotelsByManager(managerId: string): Promise<Hotel[]> {
    return db.select().from(hotels).where(eq(hotels.managerId, managerId));
  }

  async getHotelRooms(hotelId: string): Promise<HotelRoom[]> {
    return db.select().from(hotelRooms).where(eq(hotelRooms.hotelId, hotelId));
  }

  async getHotelRoom(id: string): Promise<HotelRoom | undefined> {
    const [room] = await db.select().from(hotelRooms).where(eq(hotelRooms.id, id));
    return room || undefined;
  }

  async createHotelRoom(room: InsertHotelRoom): Promise<HotelRoom> {
    const [created] = await db.insert(hotelRooms).values(room).returning();
    return created;
  }

  async updateHotelRoom(id: string, room: Partial<InsertHotelRoom>): Promise<HotelRoom | undefined> {
    const [updated] = await db.update(hotelRooms).set(room).where(eq(hotelRooms.id, id)).returning();
    return updated || undefined;
  }

  async deleteHotelRoom(id: string): Promise<void> {
    await db.delete(hotelRooms).where(eq(hotelRooms.id, id));
  }

  async getHotelBookings(hotelId: string): Promise<HotelBooking[]> {
    return db.select().from(hotelBookings).where(eq(hotelBookings.hotelId, hotelId)).orderBy(desc(hotelBookings.createdAt));
  }

  async getUserHotelBookings(userId: string): Promise<(HotelBooking & { hotelName?: string; roomName?: string })[]> {
    const result = await db
      .select({
        booking: hotelBookings,
        hotelName: hotels.name,
        roomName: hotelRooms.name,
      })
      .from(hotelBookings)
      .leftJoin(hotels, eq(hotelBookings.hotelId, hotels.id))
      .leftJoin(hotelRooms, eq(hotelBookings.roomId, hotelRooms.id))
      .where(eq(hotelBookings.userId, userId))
      .orderBy(desc(hotelBookings.createdAt));

    return result.map(r => ({
      ...r.booking,
      hotelName: r.hotelName || undefined,
      roomName: r.roomName || undefined,
    }));
  }

  async getHotelBooking(id: string): Promise<HotelBooking | undefined> {
    const [booking] = await db.select().from(hotelBookings).where(eq(hotelBookings.id, id));
    return booking || undefined;
  }

  async createHotelBooking(booking: InsertHotelBooking): Promise<HotelBooking> {
    const [created] = await db.insert(hotelBookings).values(booking).returning();
    if (created.roomId) {
      const room = await this.getHotelRoom(created.roomId);
      if (room && room.availableRooms !== null && room.availableRooms > 0) {
        await db.update(hotelRooms)
          .set({ availableRooms: room.availableRooms - 1 })
          .where(eq(hotelRooms.id, created.roomId));
      }
    }
    return created;
  }

  async updateHotelBookingStatus(id: string, status: string): Promise<HotelBooking | undefined> {
    const [updated] = await db.update(hotelBookings).set({ status }).where(eq(hotelBookings.id, id)).returning();
    if (updated && status === "cancelled" && updated.roomId) {
      const room = await this.getHotelRoom(updated.roomId);
      if (room) {
        await db.update(hotelRooms)
          .set({ availableRooms: (room.availableRooms || 0) + 1 })
          .where(eq(hotelRooms.id, updated.roomId));
      }
    }
    return updated || undefined;
  }

  async getAllHotelBookings(): Promise<(HotelBooking & { hotelName?: string; roomName?: string; guestUsername?: string })[]> {
    const result = await db
      .select({
        booking: hotelBookings,
        hotelName: hotels.name,
        roomName: hotelRooms.name,
        guestUsername: users.username,
      })
      .from(hotelBookings)
      .leftJoin(hotels, eq(hotelBookings.hotelId, hotels.id))
      .leftJoin(hotelRooms, eq(hotelBookings.roomId, hotelRooms.id))
      .leftJoin(users, eq(hotelBookings.userId, users.id))
      .orderBy(desc(hotelBookings.createdAt));

    return result.map(r => ({
      ...r.booking,
      hotelName: r.hotelName || undefined,
      roomName: r.roomName || undefined,
      guestUsername: r.guestUsername || undefined,
    }));
  }
}

export const hotelStorage = new HotelStorage();
