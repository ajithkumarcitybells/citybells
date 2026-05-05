import type { Request } from "express";
import { createClient, type RedisClientType } from "redis";
import { DeliveryHub } from "@shared/schema";

const HUB_CACHE_PREFIX = "hub:pincode:";
const HUB_CACHE_TTL_SECONDS = 300;

type CachedHubValue = {
  allowed: boolean;
  city: string | null;
  state: string | null;
};

type MemoryCacheEntry = {
  value: CachedHubValue;
  expiresAt: number;
};

const memoryCache = new Map<string, MemoryCacheEntry>();

let redisClient: RedisClientType | null = null;
let redisConnectPromise: Promise<RedisClientType | null> | null = null;

function getCacheKey(pincode: string) {
  return `${HUB_CACHE_PREFIX}${pincode}`;
}

function normalizePincode(input: string | null | undefined) {
  const digits = (input ?? "").replace(/\D/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

function getMemoryCache(pincode: string): CachedHubValue | null {
  const entry = memoryCache.get(pincode);
  if (!entry) {
    return null;
  }

  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(pincode);
    return null;
  }

  return entry.value;
}

function setMemoryCache(pincode: string, value: CachedHubValue) {
  memoryCache.set(pincode, {
    value,
    expiresAt: Date.now() + HUB_CACHE_TTL_SECONDS * 1000,
  });
}

async function getRedisClient() {
  if (redisClient?.isOpen) {
    return redisClient;
  }

  if (redisConnectPromise) {
    return redisConnectPromise;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return null;
  }

  const client = createClient({
    url: redisUrl,
    socket: {
      reconnectStrategy: false,
    },
  });

  client.on("error", (error) => {
    console.error("Redis client error:", error);
  });

  redisConnectPromise = client.connect()
    .then(() => {
      redisClient = client;
      return client;
    })
    .catch((error) => {
      console.error("Failed to connect to Redis:", error);
      redisConnectPromise = null;
      return null;
    });

  return redisConnectPromise;
}

async function getCachedHub(pincode: string): Promise<CachedHubValue | null> {
  const redis = await getRedisClient();
  if (redis?.isOpen) {
    const cached = await redis.get(getCacheKey(pincode));
    if (cached) {
      return JSON.parse(cached) as CachedHubValue;
    }
  }

  return getMemoryCache(pincode);
}

async function setCachedHub(pincode: string, value: CachedHubValue) {
  const redis = await getRedisClient();
  if (redis?.isOpen) {
    await redis.set(getCacheKey(pincode), JSON.stringify(value), {
      EX: HUB_CACHE_TTL_SECONDS,
    });
  }

  setMemoryCache(pincode, value);
}

export async function invalidateHubCache(pincode: string) {
  const normalizedPincode = normalizePincode(pincode);
  if (!normalizedPincode) {
    return;
  }

  const redis = await getRedisClient();
  if (redis?.isOpen) {
    await redis.del(getCacheKey(normalizedPincode));
  }

  memoryCache.delete(normalizedPincode);
}

export async function reverseGeocodePincode(lat: number, lng: number) {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("addressdetails", "1");

  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/json",
      "User-Agent": "CityBell/1.0 delivery-validation",
    },
  });

  if (!response.ok) {
    throw new Error("Reverse geocoding failed");
  }

  const payload = await response.json() as {
    address?: {
      postcode?: string;
      city?: string;
      town?: string;
      state?: string;
    };
    display_name?: string;
  };

  const pincode = normalizePincode(payload.address?.postcode ?? null);
  if (!pincode) {
    throw new Error("Could not determine a valid pincode for this location");
  }

  return {
    pincode,
    city: payload.address?.city || payload.address?.town || null,
    state: payload.address?.state || null,
    label: payload.display_name || null,
  };
}

export async function validateDeliveryPincode(input: string | null | undefined) {
  const pincode = normalizePincode(input);
  if (!pincode) {
    return {
      allowed: false,
      pincode: null,
      hub: null,
    };
  }

  const cached = await getCachedHub(pincode);
  if (cached) {
    return {
      allowed: cached.allowed,
      pincode,
      hub: cached.city && cached.state ? { city: cached.city, state: cached.state } : null,
    };
  }

  const hub = await DeliveryHub.findOne({ pincode, active: true }).lean();
  const cacheValue: CachedHubValue = hub
    ? { allowed: true, city: hub.city, state: hub.state }
    : { allowed: false, city: null, state: null };

  await setCachedHub(pincode, cacheValue);

  return {
    allowed: cacheValue.allowed,
    pincode,
    hub: cacheValue.city && cacheValue.state ? { city: cacheValue.city, state: cacheValue.state } : null,
  };
}

export async function resolveDeliveryLocation(payload: { pincode?: string; lat?: number; lng?: number }) {
  if (payload.pincode) {
    return validateDeliveryPincode(payload.pincode);
  }

  if (typeof payload.lat === "number" && typeof payload.lng === "number") {
    const geocoded = await reverseGeocodePincode(payload.lat, payload.lng);
    const validation = await validateDeliveryPincode(geocoded.pincode);
    return {
      ...validation,
      resolvedAddress: geocoded.label,
    };
  }

  return {
    allowed: false,
    pincode: null,
    hub: null,
  };
}

export async function getDeliveryValidationFromRequest(req: Request) {
  const rawPincode = req.header("x-delivery-pincode") || req.header("deliverypincode") || "";
  return validateDeliveryPincode(rawPincode);
}