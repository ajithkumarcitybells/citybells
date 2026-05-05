import {
  type HotelPriceCalculation,
  type HotelPricingRule,
  type InsertHotel,
  type InsertHotelBooking,
  type InsertHotelPricingRule,
  type InsertHotelRoom,
} from "@shared/schema";
import { getDb, toDoc, toDocs, toObjectId } from "./db";

export interface IHotelStorage {
  getHotels(filters?: HotelListFilters): Promise<any[]>;
  getHotel(id: string): Promise<any | undefined>;
  createHotel(hotel: InsertHotel): Promise<any>;
  updateHotel(id: string, hotel: Partial<InsertHotel>): Promise<any | undefined>;
  deleteHotel(id: string): Promise<void>;
  getAllHotels(): Promise<any[]>;
  getHotelsByManager(managerId: string): Promise<any[]>;

  getHotelRooms(hotelId: string): Promise<any[]>;
  getHotelRoom(id: string): Promise<any | undefined>;
  createHotelRoom(room: InsertHotelRoom): Promise<any>;
  updateHotelRoom(id: string, room: Partial<InsertHotelRoom>): Promise<any | undefined>;
  deleteHotelRoom(id: string): Promise<void>;

  getHotelPricingRules(): Promise<HotelPricingRule[]>;
  createHotelPricingRule(rule: InsertHotelPricingRule): Promise<HotelPricingRule>;
  updateHotelPricingRule(id: string, rule: Partial<InsertHotelPricingRule>): Promise<HotelPricingRule | undefined>;
  deleteHotelPricingRule(id: string): Promise<void>;
  getHotelDynamicPricingEnabled(): Promise<boolean>;
  setHotelDynamicPricingEnabled(enabled: boolean): Promise<boolean>;
  calculateHotelRoomPrice(input: { hotelId: string; roomId: string; checkIn: string; checkOut: string }): Promise<HotelPriceCalculation>;

  getHotelBookings(hotelId: string): Promise<any[]>;
  getUserHotelBookings(userId: string): Promise<(any & { hotelName?: string; roomName?: string })[]>;
  getHotelBooking(id: string): Promise<any | undefined>;
  createHotelBooking(booking: InsertHotelBooking): Promise<any>;
  updateHotelBookingStatus(id: string, status: string): Promise<any | undefined>;
  getAllHotelBookings(): Promise<(any & { hotelName?: string; roomName?: string; guestUsername?: string })[]>;
}

type HotelListFilters = {
  city?: string;
  stars?: number | number[];
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  locations?: string[];
  amenities?: string[];
  propertyTypes?: string[];
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  availableOnly?: boolean;
  sortBy?: string;
};

function getHotelSort(sortBy?: string): Record<string, 1 | -1> {
  switch (sortBy) {
    case "rating-high":
      return { rating: -1, starRating: -1 };
    case "stars-high":
      return { starRating: -1, rating: -1 };
    case "newest":
      return { createdAt: -1 };
    case "name":
      return { name: 1 };
    case "popularity":
    case "recommended":
    default:
      return { rating: -1, starRating: -1 };
  }
}

function normalizeDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function getOverlappingBookingCounts(filters: HotelListFilters | undefined, roomIds: string[]) {
  const counts = new Map<string, number>();
  const checkIn = normalizeDate(filters?.checkIn);
  const checkOut = normalizeDate(filters?.checkOut);
  if (!checkIn || !checkOut || checkOut <= checkIn || roomIds.length === 0) {
    return counts;
  }

  const db = getDb();
  const bookings = await db.collection('hotel_bookings').find({
    roomId: { $in: roomIds },
    status: { $nin: ["cancelled", "checked_out"] },
    checkIn: { $lt: filters!.checkOut },
    checkOut: { $gt: filters!.checkIn },
  }).project({ roomId: 1 }).toArray();

  bookings.forEach((booking: any) => {
    const roomId = String(booking.roomId);
    counts.set(roomId, (counts.get(roomId) || 0) + 1);
  });

  return counts;
}

function parsePrice(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : Number.MAX_SAFE_INTEGER;
}

function sortHotelsInMemory(hotels: any[], sortBy?: string) {
  const sorted = [...hotels];
  switch (sortBy) {
    case "price-low":
      return sorted.sort((left, right) => parsePrice(left.bestRoomPrice || left.price) - parsePrice(right.bestRoomPrice || right.price));
    case "price-high":
      return sorted.sort((left, right) => parsePrice(right.bestRoomPrice || right.price) - parsePrice(left.bestRoomPrice || left.price));
    case "rating-high":
      return sorted.sort((left, right) => Number(right.rating || 0) - Number(left.rating || 0));
    case "stars-high":
      return sorted.sort((left, right) => Number(right.starRating || 0) - Number(left.starRating || 0));
    case "newest":
      return sorted.sort((left, right) => new Date(right.createdAt || 0).getTime() - new Date(left.createdAt || 0).getTime());
    case "name":
      return sorted.sort((left, right) => String(left.name || "").localeCompare(String(right.name || "")));
    case "popularity":
    case "recommended":
    default:
      return sorted.sort((left, right) => (Number(right.rating || 0) * 100 + Number(right.reviewCount || 0)) - (Number(left.rating || 0) * 100 + Number(left.reviewCount || 0)));
  }
}

function byMongoId(id: string) {
  const filters: any[] = [{ _id: id }];
  try {
    filters.unshift({ _id: toObjectId(id) });
  } catch {
    // Some older seeded rows use string ids. Keep the string lookup.
  }
  return filters.length === 1 ? filters[0] : { $or: filters };
}

function byHotelRef(hotelId: string) {
  const ids: any[] = [hotelId];
  try {
    ids.unshift(toObjectId(hotelId));
  } catch {
    // Keep string id only for non-ObjectId values.
  }
  return { hotelId: { $in: ids } };
}

function dateOnly(value: string) {
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function rangesOverlap(startA: string, endA: string, startB?: string | null, endB?: string | null) {
  if (!startB || !endB) return true;
  return startA <= endB && endA >= startB;
}

function ruleMatchesScope(rule: any, hotelId: string, roomId: string) {
  return (!rule.hotelId || String(rule.hotelId) === hotelId) && (!rule.roomId || String(rule.roomId) === roomId);
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

function formatMoney(value: number) {
  return roundMoney(value).toFixed(2);
}

export class HotelStorage implements IHotelStorage {
  private generateOrderNumber(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "HB";
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  async getHotels(filters?: HotelListFilters): Promise<any[]> {
    try {
      const db = getDb();
      const query: any = { isActive: true };

      if (filters?.city) query.city = { $regex: filters.city, $options: "i" };

      if (filters?.locations && filters.locations.length > 0) {
        const locationRegexes = filters.locations.map((location) => new RegExp(location.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
        query.$or = [
          { city: { $in: locationRegexes } },
          { address: { $in: locationRegexes } },
          { landmark: { $in: locationRegexes } },
        ];
      }

      if (filters?.search) {
        query.$text = { $search: filters.search };
      }

      if (Array.isArray(filters?.stars) && filters.stars.length > 0) {
        query.starRating = { $in: filters.stars };
      } else if (typeof filters?.stars === 'number') {
        query.starRating = { $gte: filters.stars };
      }

      if (filters?.amenities && filters.amenities.length > 0) {
        query.amenities = {
          $all: filters.amenities.map((amenity) => new RegExp(amenity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")),
        };
      }

      if (filters?.propertyTypes && filters.propertyTypes.length > 0) query.propertyType = { $in: filters.propertyTypes };

      let hotels: any[] = [];
      try {
        hotels = await db.collection('hotels').find(query).sort(getHotelSort(filters?.sortBy)).toArray();
      } catch (error: any) {
        if (!filters?.search) throw error;
        const fallbackQuery = { ...query };
        delete fallbackQuery.$text;
        fallbackQuery.$or = [
          { name: { $regex: filters.search, $options: "i" } },
          { city: { $regex: filters.search, $options: "i" } },
          { address: { $regex: filters.search, $options: "i" } },
        ];
        hotels = await db.collection('hotels').find(fallbackQuery).sort(getHotelSort(filters?.sortBy)).toArray();
      }

      // price and availability filters rely on rooms
      if (filters?.minPrice != null || filters?.maxPrice != null || filters?.availableOnly || filters?.checkIn || filters?.checkOut || filters?.guests || filters?.rooms) {
        const hotelIds = hotels.map((h: any) => String(h._id));
        const roomQuery: any = { hotelId: { $in: hotelIds }, isAvailable: { $ne: false } };
        const roomsRaw = await db.collection('hotel_rooms').find(roomQuery).toArray();
        const roomIds = roomsRaw.map((room: any) => String(room._id));
        const overlapCounts = await getOverlappingBookingCounts(filters, roomIds);
        const requiredRooms = Math.max(1, Number(filters?.rooms || 1));
        const requiredGuests = Math.max(1, Number(filters?.guests || 1));

        const rooms = roomsRaw.filter((r: any) => {
          const priceNum = r.price != null ? Number(r.price) : NaN;
          if (filters?.minPrice != null && Number.isFinite(priceNum) && priceNum < Number(filters.minPrice)) return false;
          if (filters?.maxPrice != null && Number.isFinite(priceNum) && priceNum > Number(filters.maxPrice)) return false;

          const totalRooms = Number(r.totalRooms || r.availableRooms || 0);
          const baseAvailableRooms = Number(r.availableRooms ?? totalRooms);
          const overlappingBookings = overlapCounts.get(String(r._id)) || 0;
          const availableForDates = Math.max(0, Math.min(baseAvailableRooms, totalRooms || baseAvailableRooms) - overlappingBookings);
          const capacity = Number(r.maxGuests || 2) * requiredRooms;
          if ((filters?.availableOnly || filters?.checkIn || filters?.checkOut) && availableForDates < requiredRooms) return false;
          if (capacity < requiredGuests) return false;
          return true;
        });
        const pricedRooms: any[] = [];
        for (const room of rooms) {
          if (filters?.checkIn && filters?.checkOut) {
            try {
              const priced = await this.calculateHotelRoomPrice({
                hotelId: String(room.hotelId),
                roomId: String(room._id),
                checkIn: filters.checkIn,
                checkOut: filters.checkOut,
              });
              room.dynamicPrice = priced.dynamicPrice;
              room.priceBadge = priced.badge;
              room.priceChanged = priced.dynamicPrice !== Number(room.price);
            } catch (error) {
              console.error("Error calculating hotel list room price:", error);
            }
          }
          pricedRooms.push(room);
        }

        const bestRoomByHotel = new Map<string, any>();
        pricedRooms.forEach((room: any) => {
          const hotelId = String(room.hotelId);
          const current = bestRoomByHotel.get(hotelId);
          const roomPrice = Number(room.dynamicPrice ?? room.price ?? Infinity);
          const currentPrice = Number(current?.dynamicPrice ?? current?.price ?? Infinity);
          if (!current || roomPrice < currentPrice) {
            bestRoomByHotel.set(hotelId, room);
          }
        });
        hotels = hotels
          .filter((h: any) => bestRoomByHotel.has(String(h._id)))
          .map((hotel: any) => {
            const bestRoom = bestRoomByHotel.get(String(hotel._id));
            const bestPrice = bestRoom?.dynamicPrice ?? bestRoom?.price ?? null;
            return {
              ...hotel,
              priceRange: bestRoom?.price ? `₹${bestRoom.price}` : hotel.priceRange,
              bestRoomPrice: bestPrice,
              priceBadge: bestRoom?.priceBadge ?? null,
              priceChanged: bestRoom?.priceChanged ?? false,
              availableRooms: bestRoom?.availableRooms ?? hotel.availableRooms ?? null,
              roomType: bestRoom?.type || bestRoom?.name || hotel.roomType || null,
            };
          });
      }

      hotels = sortHotelsInMemory(hotels, filters?.sortBy);

      return toDocs<any>(hotels);
    } catch (error) {
      console.error("Error fetching hotels:", error);
      return [];
    }
  }

  async getHotel(id: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const doc = await db.collection('hotels').findOne(byMongoId(id));
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching hotel:", error);
      return undefined;
    }
  }

  async createHotel(hotel: InsertHotel): Promise<any> {
    try {
      const db = getDb();
      const res = await db.collection('hotels').insertOne({ ...hotel, createdAt: new Date(), isActive: hotel.isActive ?? true });
      const inserted = await db.collection('hotels').findOne({ _id: res.insertedId });
      return toDoc<any>(inserted);
    } catch (error) {
      console.error("Error creating hotel:", error);
      throw error;
    }
  }

  async updateHotel(id: string, hotel: Partial<InsertHotel>): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('hotels').findOneAndUpdate(byMongoId(id), { $set: hotel }, { returnDocument: 'after' });
      return toDoc<any>((res as any)?.value ?? res);
    } catch (error) {
      console.error("Error updating hotel:", error);
      return undefined;
    }
  }

  async deleteHotel(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection('hotel_rooms').deleteMany(byHotelRef(id));
      await db.collection('hotel_bookings').deleteMany(byHotelRef(id));
      await db.collection('hotels').deleteOne(byMongoId(id));
    } catch (error) {
      console.error("Error deleting hotel:", error);
      throw error;
    }
  }

  async getAllHotels(): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('hotels').find().sort({ rating: -1 }).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching all hotels:", error);
      return [];
    }
  }

  async getHotelsByManager(managerId: string): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('hotels').find({ managerId }).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching hotels by manager:", error);
      return [];
    }
  }

  async getHotelRooms(hotelId: string): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('hotel_rooms').find(byHotelRef(hotelId)).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching hotel rooms:", error);
      return [];
    }
  }

  async getHotelPricingRules(): Promise<HotelPricingRule[]> {
    try {
      const db = getDb();
      const docs = await db.collection('hotel_pricing_rules').find().sort({ priority: 1, createdAt: -1 }).toArray();
      return toDocs<HotelPricingRule>(docs);
    } catch (error) {
      console.error("Error fetching hotel pricing rules:", error);
      return [];
    }
  }

  async createHotelPricingRule(rule: InsertHotelPricingRule): Promise<HotelPricingRule> {
    const db = getDb();
    const now = new Date();
    const res = await db.collection('hotel_pricing_rules').insertOne({ ...rule, createdAt: now, updatedAt: now });
    const inserted = await db.collection('hotel_pricing_rules').findOne({ _id: res.insertedId });
    return toDoc<HotelPricingRule>(inserted);
  }

  async updateHotelPricingRule(id: string, rule: Partial<InsertHotelPricingRule>): Promise<HotelPricingRule | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('hotel_pricing_rules').findOneAndUpdate(
        byMongoId(id),
        { $set: { ...rule, updatedAt: new Date() } },
        { returnDocument: 'after' },
      );
      return toDoc<HotelPricingRule>((res as any)?.value ?? res);
    } catch (error) {
      console.error("Error updating hotel pricing rule:", error);
      return undefined;
    }
  }

  async deleteHotelPricingRule(id: string): Promise<void> {
    const db = getDb();
    await db.collection('hotel_pricing_rules').deleteOne(byMongoId(id));
  }

  async getHotelDynamicPricingEnabled(): Promise<boolean> {
    const db = getDb();
    const doc = await db.collection('hotel_pricing_settings').findOne({ _id: 'global' as any });
    return doc?.enabled !== false;
  }

  async setHotelDynamicPricingEnabled(enabled: boolean): Promise<boolean> {
    const db = getDb();
    await db.collection('hotel_pricing_settings').updateOne(
      { _id: 'global' as any },
      { $set: { enabled, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    return enabled;
  }

  async calculateHotelRoomPrice(input: { hotelId: string; roomId: string; checkIn: string; checkOut: string }): Promise<HotelPriceCalculation> {
    const db = getDb();
    const room = await db.collection('hotel_rooms').findOne({ $and: [byMongoId(input.roomId), byHotelRef(input.hotelId)] });
    if (!room) throw new Error("Room not found");

    const checkIn = dateOnly(input.checkIn);
    const checkOut = dateOnly(input.checkOut);
    if (!checkIn || !checkOut || checkOut <= checkIn) throw new Error("Check-out date must be after check-in date");

    const nights = Math.max(1, Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)));
    const basePrice = Number(room.price || 0);
    const totalRooms = Math.max(0, Number(room.totalRooms || room.availableRooms || 0));
    const baseAvailableRooms = Math.max(0, Number(room.availableRooms ?? totalRooms));
    const bookedRooms = await db.collection('hotel_bookings').countDocuments({
      hotelId: input.hotelId,
      roomId: input.roomId,
      status: { $nin: ["cancelled", "checked_out"] },
      checkIn: { $lt: input.checkOut },
      checkOut: { $gt: input.checkIn },
    });
    const availableRooms = Math.max(0, Math.min(baseAvailableRooms, totalRooms || baseAvailableRooms) - bookedRooms);
    const enabled = await this.getHotelDynamicPricingEnabled();
    const rulesRaw = await db.collection('hotel_pricing_rules').find({
      enabled: true,
      $and: [
        { $or: [{ hotelId: null }, { hotelId: { $exists: false } }, { hotelId: input.hotelId }] },
        { $or: [{ roomId: null }, { roomId: { $exists: false } }, { roomId: input.roomId }] },
      ],
    }).sort({ priority: 1, createdAt: 1 }).toArray();

    const matchingRules = rulesRaw.filter((rule: any) => ruleMatchesScope(rule, input.hotelId, input.roomId) && rangesOverlap(input.checkIn, input.checkOut, rule.startDate, rule.endDate));
    const appliedRules: HotelPriceCalculation["appliedRules"] = [];
    let dynamicPrice = basePrice;
    let fixedOverride = false;

    const manualOverride = matchingRules.find((rule: any) => rule.type === "manual_override" && rule.fixedPrice != null);
    if (manualOverride) {
      fixedOverride = true;
      const before = dynamicPrice;
      dynamicPrice = Number(manualOverride.fixedPrice);
      appliedRules.push({
        id: String(manualOverride._id),
        name: manualOverride.name,
        type: "manual_override",
        fixedPrice: Number(manualOverride.fixedPrice),
        amountBefore: roundMoney(before),
        amountAfter: roundMoney(dynamicPrice),
      });
    } else if (enabled) {
      const stayDates: string[] = [];
      for (let day = checkIn; day < checkOut; day = addDays(day, 1)) stayDates.push(toDateString(day));
      const hasWeekend = stayDates.some((date) => {
        const day = new Date(`${date}T00:00:00.000Z`).getUTCDay();
        return day === 0 || day === 5 || day === 6;
      });
      const bookedRatio = totalRooms > 0 ? bookedRooms / totalRooms : 0;
      const availableRatio = totalRooms > 0 ? availableRooms / totalRooms : 1;

      for (const rule of matchingRules) {
        if (rule.type === "manual_override") continue;
        if (rule.type === "weekend" && !hasWeekend) continue;
        if ((rule.type === "holiday" || rule.type === "season") && !rule.startDate) continue;
        if (rule.type === "demand" && bookedRatio < 0.7) continue;
        if (rule.type === "availability" && availableRatio > 0.25) continue;

        const before = dynamicPrice;
        if (rule.multiplier != null) dynamicPrice *= Number(rule.multiplier);
        if (rule.minPrice != null) dynamicPrice = Math.max(dynamicPrice, Number(rule.minPrice));
        if (rule.maxPrice != null) dynamicPrice = Math.min(dynamicPrice, Number(rule.maxPrice));
        dynamicPrice = roundMoney(dynamicPrice);
        if (dynamicPrice !== before) {
          appliedRules.push({
            id: String(rule._id),
            name: rule.name,
            type: rule.type,
            multiplier: rule.multiplier == null ? null : Number(rule.multiplier),
            amountBefore: roundMoney(before),
            amountAfter: dynamicPrice,
          });
        }
      }
    }

    const badge = fixedOverride
      ? "Admin fixed price"
      : appliedRules.find((rule) => rule.type === "weekend") ? "Weekend price"
      : appliedRules.find((rule) => rule.type === "demand") ? "High demand"
      : appliedRules.find((rule) => rule.type === "availability") ? "Low availability"
      : appliedRules.find((rule) => rule.type === "holiday") ? "Holiday price"
      : appliedRules.find((rule) => rule.type === "season") ? "Seasonal price"
      : null;

    return {
      enabled,
      hotelId: input.hotelId,
      roomId: input.roomId,
      checkIn: input.checkIn,
      checkOut: input.checkOut,
      nights,
      basePrice: roundMoney(basePrice),
      dynamicPrice: roundMoney(dynamicPrice),
      totalPrice: roundMoney(dynamicPrice * nights),
      availableRooms,
      totalRooms,
      bookedRooms,
      appliedRules,
      badge,
      fixedOverride,
    };
  }

  async getHotelRoom(id: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const doc = await db.collection('hotel_rooms').findOne(byMongoId(id));
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching hotel room:", error);
      return undefined;
    }
  }

  async createHotelRoom(room: InsertHotelRoom): Promise<any> {
    try {
      const db = getDb();
      const res = await db.collection('hotel_rooms').insertOne({ ...room, createdAt: new Date() });
      const inserted = await db.collection('hotel_rooms').findOne({ _id: res.insertedId });
      return toDoc<any>(inserted);
    } catch (error) {
      console.error("Error creating hotel room:", error);
      throw error;
    }
  }

  async updateHotelRoom(id: string, room: Partial<InsertHotelRoom>): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('hotel_rooms').findOneAndUpdate(byMongoId(id), { $set: room }, { returnDocument: 'after' });
      return toDoc<any>((res as any)?.value ?? res);
    } catch (error) {
      console.error("Error updating hotel room:", error);
      return undefined;
    }
  }

  async deleteHotelRoom(id: string): Promise<void> {
    try {
      const db = getDb();
      await db.collection('hotel_rooms').deleteOne(byMongoId(id));
    } catch (error) {
      console.error("Error deleting hotel room:", error);
      throw error;
    }
  }

  async getHotelBookings(hotelId: string): Promise<any[]> {
    try {
      const db = getDb();
      const docs = await db.collection('hotel_bookings').find(byHotelRef(hotelId)).sort({ createdAt: -1 }).toArray();
      return toDocs<any>(docs);
    } catch (error) {
      console.error("Error fetching hotel bookings:", error);
      return [];
    }
  }

  async getUserHotelBookings(userId: string): Promise<(any & { hotelName?: string; roomName?: string })[]> {
    try {
      const db = getDb();
      const rows = await db.collection('hotel_bookings').find({ userId }).sort({ createdAt: -1 }).toArray();
      const hotelIds = Array.from(new Set(rows.map((r: any) => r.hotelId))).filter(Boolean);
      const roomIds = Array.from(new Set(rows.map((r: any) => r.roomId))).filter(Boolean);
      const hotels = hotelIds.length ? await db.collection('hotels').find({ _id: { $in: hotelIds.map((id: string) => new (require('mongodb').ObjectId)(id)) } }).toArray() : [];
      const rooms = roomIds.length ? await db.collection('hotel_rooms').find({ _id: { $in: roomIds.map((id: string) => new (require('mongodb').ObjectId)(id)) } }).toArray() : [];
      const hotelMap: Record<string, any> = {}; for (const h of hotels) hotelMap[String(h._id)] = h;
      const roomMap: Record<string, any> = {}; for (const r of rooms) roomMap[String(r._id)] = r;

      return rows.map((booking: any) => ({ id: String(booking._id), ...booking, hotelName: hotelMap[booking.hotelId]?.name, roomName: roomMap[booking.roomId]?.name }));
    } catch (error) {
      console.error("Error fetching user hotel bookings:", error);
      return [];
    }
  }

  async getHotelBooking(id: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const doc = await db.collection('hotel_bookings').findOne(byMongoId(id));
      return toDoc<any>(doc);
    } catch (error) {
      console.error("Error fetching hotel booking:", error);
      return undefined;
    }
  }

  async createHotelBooking(booking: InsertHotelBooking): Promise<any> {
    try {
      const db = getDb();
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          const orderNumber = this.generateOrderNumber();
          const res = await db.collection('hotel_bookings').insertOne({ orderNumber, ...booking, createdAt: new Date() });
          const created = await db.collection('hotel_bookings').findOne({ _id: res.insertedId });
          return toDoc<any>(created);
        } catch (err: any) {
          if (err && err.code === 11000 && attempt < 4) continue;
          throw err;
        }
      }
    } catch (error) {
      console.error("Error creating hotel booking:", error);
      throw error;
    }
  }

  async updateHotelBookingStatus(id: string, status: string): Promise<any | undefined> {
    try {
      const db = getDb();
      const res = await db.collection('hotel_bookings').findOneAndUpdate(byMongoId(id), { $set: { status } }, { returnDocument: 'after' });
      return toDoc<any>((res as any)?.value ?? res);
    } catch (error) {
      console.error("Error updating hotel booking status:", error);
      return undefined;
    }
  }

  async getAllHotelBookings(): Promise<(any & { hotelName?: string; roomName?: string; guestUsername?: string })[]> {
    try {
      const db = getDb();
      const rows = await db.collection('hotel_bookings').find().sort({ createdAt: -1 }).toArray();
      const hotelIds = Array.from(new Set(rows.map((r: any) => r.hotelId))).filter(Boolean);
      const roomIds = Array.from(new Set(rows.map((r: any) => r.roomId))).filter(Boolean);
      const userIds = Array.from(new Set(rows.map((r: any) => r.userId))).filter(Boolean);

      const hotels = hotelIds.length ? await db.collection('hotels').find({ _id: { $in: hotelIds.map((id: string) => new (require('mongodb').ObjectId)(id)) } }).toArray() : [];
      const rooms = roomIds.length ? await db.collection('hotel_rooms').find({ _id: { $in: roomIds.map((id: string) => new (require('mongodb').ObjectId)(id)) } }).toArray() : [];
      const users = userIds.length ? await db.collection('users').find({ _id: { $in: userIds.map((id: string) => new (require('mongodb').ObjectId)(id)) } }).project({ username: 1 }).toArray() : [];

      const hotelMap: Record<string, any> = {}; for (const h of hotels) hotelMap[String(h._id)] = h;
      const roomMap: Record<string, any> = {}; for (const r of rooms) roomMap[String(r._id)] = r;
      const userMap: Record<string, any> = {}; for (const u of users) userMap[String(u._id)] = u;

      return rows.map((booking: any) => ({ id: String(booking._id), ...booking, hotelName: hotelMap[booking.hotelId]?.name, roomName: roomMap[booking.roomId]?.name, guestUsername: userMap[booking.userId]?.username }));
    } catch (error) {
      console.error("Error fetching all hotel bookings:", error);
      return [];
    }
  }
}

export const hotelStorage = new HotelStorage();
