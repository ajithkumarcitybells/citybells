import { randomBytes, randomInt, scrypt, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { getDb, newId } from "./db";
import getRedis from "./redis";

const scryptAsync = promisify(scrypt);
const OTP_TTL_SECONDS = 5 * 60;
const REQUEST_WINDOW_SECONDS = 15 * 60;
const MAX_REQUESTS = 3;
const MAX_VERIFY_ATTEMPTS = 5;

export const phoneRoleSchema = z.enum(["customer", "driver"]).default("customer");

export function normalizeIndianPhone(phone: string) {
  const digits = String(phone || "").replace(/\D/g, "");
  const withoutCountry = digits.startsWith("91") && digits.length === 12 ? digits.slice(2) : digits;
  if (!/^[6-9]\d{9}$/.test(withoutCountry)) {
    throw new Error("Please enter a valid 10-digit Indian phone number");
  }
  return withoutCountry;
}

export function publicPhone(phone: string) {
  return `+91 ${phone.slice(0, 5)} ${phone.slice(5)}`;
}

export async function hashOtp(otp: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(otp, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function compareOtp(otp: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  if (!hashed || !salt) return false;
  const expected = Buffer.from(hashed, "hex");
  const supplied = (await scryptAsync(otp, salt, 64)) as Buffer;
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

export async function sendOtpSms(phone: string, otp: string) {
  if (process.env.NODE_ENV !== "production") {
    console.log(`[DEV OTP] Login OTP for ${publicPhone(phone)}: ${otp}`);
    return;
  }

  // Provider hook. Add Twilio/Fast2SMS/etc. here using env vars without changing auth routes.
  if (!process.env.SMS_PROVIDER) {
    console.warn("SMS_PROVIDER is not configured; OTP SMS was not sent.");
    return;
  }
}

export async function createPhoneOtp(phone: string, role: "customer" | "driver") {
  const redis = getRedis();
  const requestKey = `phone-otp:req:${role}:${phone}`;
  const now = new Date();

  if (redis) {
    const requests = await redis.incr(requestKey);
    if (requests === 1) await redis.expire(requestKey, REQUEST_WINDOW_SECONDS);
    if (requests > MAX_REQUESTS) {
      throw new Error("Too many OTP requests. Please try again after 15 minutes.");
    }

    const otp = randomInt(100000, 999999).toString();
    const otpHash = await hashOtp(otp);
    await redis.set(
      `phone-otp:${role}:${phone}`,
      JSON.stringify({ phone, role, otpHash, attempts: 0, createdAt: now.toISOString() }),
      "EX",
      OTP_TTL_SECONDS,
    );
    await sendOtpSms(phone, otp);
    return;
  }

  const db = getDb();
  const windowStart = new Date(Date.now() - REQUEST_WINDOW_SECONDS * 1000);
  const recentRequests = await db.collection("phone_otps").countDocuments({
    phone,
    role,
    createdAt: { $gte: windowStart },
  });
  if (recentRequests >= MAX_REQUESTS) {
    throw new Error("Too many OTP requests. Please try again after 15 minutes.");
  }

  const otp = randomInt(100000, 999999).toString();
  const otpHash = await hashOtp(otp);
  await db.collection("phone_otps").insertOne({
    _id: newId() as any,
    phone,
    role,
    otpHash,
    attempts: 0,
    consumedAt: null,
    expiresAt: new Date(Date.now() + OTP_TTL_SECONDS * 1000),
    createdAt: now,
  });
  await sendOtpSms(phone, otp);
}

export async function verifyPhoneOtp(phone: string, role: "customer" | "driver", otp: string) {
  const redis = getRedis();
  if (redis) {
    const key = `phone-otp:${role}:${phone}`;
    const raw = await redis.get(key);
    if (!raw) return { success: false, message: "OTP expired. Please request a new one." };
    const record = JSON.parse(raw) as { otpHash: string; attempts: number };
    if (record.attempts >= MAX_VERIFY_ATTEMPTS) {
      await redis.del(key);
      return { success: false, message: "Too many incorrect attempts. Please request a new OTP." };
    }
    const ok = await compareOtp(otp, record.otpHash);
    if (!ok) {
      record.attempts += 1;
      const ttl = await redis.ttl(key);
      if (ttl > 0) await redis.set(key, JSON.stringify(record), "EX", ttl);
      return { success: false, message: "Invalid OTP. Please check and try again." };
    }
    await redis.del(key);
    return { success: true };
  }

  const db = getDb();
  const record = await db.collection("phone_otps").findOne({
    phone,
    role,
    consumedAt: null,
    expiresAt: { $gt: new Date() },
  }, { sort: { createdAt: -1 } });

  if (!record) return { success: false, message: "OTP expired. Please request a new one." };
  if ((record.attempts || 0) >= MAX_VERIFY_ATTEMPTS) {
    return { success: false, message: "Too many incorrect attempts. Please request a new OTP." };
  }

  const ok = await compareOtp(otp, record.otpHash);
  if (!ok) {
    await db.collection("phone_otps").updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { success: false, message: "Invalid OTP. Please check and try again." };
  }

  await db.collection("phone_otps").updateOne({ _id: record._id }, { $set: { consumedAt: new Date() } });
  return { success: true };
}
