import { describe, it, beforeAll, afterAll, expect } from "vitest";
import { connectDb, getDb } from "../db";
import { hotelStorage } from "../hotel-storage";

let createdHotelIds: string[] = [];
let createdRoomIds: string[] = [];

beforeAll(async () => {
  await connectDb();
  // cleanup any previous leftover test docs
  const db = getDb();
  await db.collection('hotel_bookings').deleteMany({});
});

afterAll(async () => {
  const db = getDb();
  if (createdRoomIds.length) await db.collection('hotel_rooms').deleteMany({ _id: { $in: createdRoomIds.map(id => new (require('mongodb').ObjectId)(id)) } });
  if (createdHotelIds.length) await db.collection('hotels').deleteMany({ _id: { $in: createdHotelIds.map(id => new (require('mongodb').ObjectId)(id)) } });
});

describe('Hotel filtering', () => {
  it('filters by minimum stars (>=)', async () => {
    const h1 = await hotelStorage.createHotel({ name: `hf-test-high-${Date.now()}`, city: 'TestCity', starRating: 5 } as any);
    const h2 = await hotelStorage.createHotel({ name: `hf-test-low-${Date.now()}`, city: 'TestCity', starRating: 3 } as any);
    createdHotelIds.push(h1.id, h2.id);

    const res = await hotelStorage.getHotels({ stars: 4 });
    const ids = res.map(r => r.id);
    expect(ids.includes(h1.id)).toBe(true);
    expect(ids.includes(h2.id)).toBe(false);
  });

  it('filters by price range using hotel rooms', async () => {
    const hotelA = await hotelStorage.createHotel({ name: `hf-price-a-${Date.now()}`, city: 'PriceCity', starRating: 4 } as any);
    const hotelB = await hotelStorage.createHotel({ name: `hf-price-b-${Date.now()}`, city: 'PriceCity', starRating: 4 } as any);
    createdHotelIds.push(hotelA.id, hotelB.id);

    const roomA = await hotelStorage.createHotelRoom({ hotelId: hotelA.id, type: 'Deluxe', name: 'A1', price: '1000', availableRooms: 5 } as any);
    const roomB = await hotelStorage.createHotelRoom({ hotelId: hotelB.id, type: 'Deluxe', name: 'B1', price: '5000', availableRooms: 5 } as any);
    createdRoomIds.push(roomA.id, roomB.id);

    const res = await hotelStorage.getHotels({ minPrice: 2000 });
    const ids = res.map(r => r.id);
    expect(ids.includes(hotelB.id)).toBe(true);
    expect(ids.includes(hotelA.id)).toBe(false);
  });

  it('filters by amenities', async () => {
    const hotel = await hotelStorage.createHotel({ name: `hf-amenity-${Date.now()}`, city: 'AmenCity', amenities: ['Free WiFi', 'AC'] } as any);
    createdHotelIds.push(hotel.id);

    const res = await hotelStorage.getHotels({ amenities: ['Free WiFi'] });
    const ids = res.map(r => r.id);
    expect(ids.includes(hotel.id)).toBe(true);
  });

  it('filters by availability (availableOnly)', async () => {
    const hotelX = await hotelStorage.createHotel({ name: `hf-avail-x-${Date.now()}`, city: 'AvailCity' } as any);
    const hotelY = await hotelStorage.createHotel({ name: `hf-avail-y-${Date.now()}`, city: 'AvailCity' } as any);
    createdHotelIds.push(hotelX.id, hotelY.id);

    const roomX = await hotelStorage.createHotelRoom({ hotelId: hotelX.id, type: 'Single', name: 'X1', price: '1200', availableRooms: 0 } as any);
    const roomY = await hotelStorage.createHotelRoom({ hotelId: hotelY.id, type: 'Single', name: 'Y1', price: '1200', availableRooms: 2 } as any);
    createdRoomIds.push(roomX.id, roomY.id);

    const res = await hotelStorage.getHotels({ availableOnly: true });
    const ids = res.map(r => r.id);
    expect(ids.includes(hotelY.id)).toBe(true);
    expect(ids.includes(hotelX.id)).toBe(false);
  });
});
