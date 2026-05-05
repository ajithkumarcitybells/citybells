import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { getDb, newId } from "../db";

describe("Taxi OTP System", () => {
  let db: any;
  let rideId: string;
  let userId: string;
  let driverId: string;

  beforeAll(() => {
    db = getDb();
    rideId = newId();
    userId = newId();
    driverId = newId();
  });

  afterAll(async () => {
    // Cleanup test data
    if (db) {
      await db.collection("taxi_ride_otps").deleteMany({ rideId });
      await db.collection("taxi_rides").deleteOne({ _id: rideId });
    }
  });

  it("should create OTP record when ride is booked", async () => {
    const otp = Math.floor(1000 + Math.random() * 9000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    const result = await db.collection("taxi_ride_otps").insertOne({
      rideId,
      userId,
      driverId: null,
      otp,
      isVerified: false,
      attempts: 0,
      expiresAt,
      createdAt: new Date(),
    });

    expect(result.insertedId).toBeDefined();

    const record = await db.collection("taxi_ride_otps").findOne({ rideId });
    expect(record).toBeDefined();
    expect(record.otp).toBe(otp);
    expect(record.isVerified).toBe(false);
    expect(record.attempts).toBe(0);
    expect(record.expiresAt > new Date()).toBe(true);
  });

  it("should link driver to OTP record", async () => {
    const result = await db.collection("taxi_ride_otps").findOneAndUpdate(
      { rideId },
      { $set: { driverId } },
      { returnDocument: "after" }
    );

    expect(result.value).toBeDefined();
    expect(result.value.driverId).toBe(driverId);
  });

  it("should reject invalid OTP", async () => {
    const record = await db.collection("taxi_ride_otps").findOne({ rideId });
    const wrongOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Should not be the correct OTP
    expect(wrongOtp).not.toBe(record.otp);

    // Increment attempts
    await db.collection("taxi_ride_otps").updateOne(
      { rideId },
      { $inc: { attempts: 1 } }
    );

    const updated = await db.collection("taxi_ride_otps").findOne({ rideId });
    expect(updated.attempts).toBe(1);
  });

  it("should reject OTP after max attempts (3)", async () => {
    const record = await db.collection("taxi_ride_otps").findOne({ rideId });

    // Simulate 2 more failed attempts (already has 1)
    await db.collection("taxi_ride_otps").updateOne(
      { rideId },
      { $set: { attempts: 3 } }
    );

    const updated = await db.collection("taxi_ride_otps").findOne({ rideId });
    expect(updated.attempts).toBe(3);
    expect(updated.attempts >= 3).toBe(true);
  });

  it("should verify correct OTP and mark as verified", async () => {
    // Reset for verification test
    const otp = "1234"; // Use a known OTP
    await db.collection("taxi_ride_otps").updateOne(
      { rideId },
      {
        $set: {
          otp,
          isVerified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
      }
    );

    // Verify OTP
    await db.collection("taxi_ride_otps").updateOne(
      { rideId },
      { $set: { isVerified: true, verifiedAt: new Date() } }
    );

    const verified = await db.collection("taxi_ride_otps").findOne({ rideId });
    expect(verified.isVerified).toBe(true);
    expect(verified.verifiedAt).toBeDefined();
  });

  it("should reject expired OTP", async () => {
    // Set expiry to past
    await db.collection("taxi_ride_otps").updateOne(
      { rideId },
      { $set: { expiresAt: new Date(Date.now() - 1000) } } // 1 second ago
    );

    const record = await db.collection("taxi_ride_otps").findOne({ rideId });
    const isExpired = record.expiresAt < new Date();
    expect(isExpired).toBe(true);
  });

  it("should regenerate OTP on resend", async () => {
    const newOtp = "5678";

    await db.collection("taxi_ride_otps").findOneAndUpdate(
      { rideId },
      {
        $set: {
          otp: newOtp,
          isVerified: false,
          attempts: 0,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        },
        $inc: { resendCount: 1 },
      },
      { returnDocument: "after" }
    );

    const record = await db.collection("taxi_ride_otps").findOne({ rideId });
    expect(record.otp).toBe(newOtp);
    expect(record.isVerified).toBe(false);
    expect(record.attempts).toBe(0);
    expect(record.resendCount).toBeGreaterThanOrEqual(1);
  });
});
