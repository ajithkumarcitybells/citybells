import { getDb } from "./db";
import { storage } from "./storage";
import { foodStorage } from "./food-storage";
import { getRedis } from "./redis";

type RecItem = { id: string; name: string; image?: string | null; price?: any; score?: number; rating?: number | string | null };

const sseClients: Map<string, Set<import('http').ServerResponse>> = new Map();

export async function getTrendingItems(limit = 12, service?: string): Promise<RecItem[]> {
  const db = getDb();
  const redis = getRedis();
  const scope = service || 'global';
  const cacheKey = `recs:trending:${scope}:${limit}`;
  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as RecItem[];
    }
  } catch (e) {
    // ignore redis errors
  }
  const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 7); // 7 days
  const pipeline = [
    { $match: { createdAt: { $gte: since } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.productId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];
  const rows = await db.collection("orders").aggregate(pipeline).toArray();
  const out: RecItem[] = [];
  for (const r of rows) {
    let prod: any = null;
    try {
      if (service === 'ecom') prod = await storage.getEcomProduct(r._id);
      else prod = await storage.getProduct(r._id);
    } catch (e) {
      prod = null;
    }
    if (prod && (prod as any).stock > 0) out.push({ id: prod.id, name: prod.name, image: (prod as any).image || ((prod as any).images && (prod as any).images[0]) || null, price: prod.price, score: r.count, rating: (prod as any).rating || null });
  }
  try {
    if (redis) await redis.setex(cacheKey, 60, JSON.stringify(out));
  } catch (e) {}
  return out;
}

export async function getTrendingFood(limit = 12): Promise<RecItem[]> {
  const db = getDb();
  const redis = getRedis();
  const cacheKey = `recs:trending:food:${limit}`;
  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as RecItem[];
    }
  } catch (e) {}
  const pipeline = [
    { $unwind: "$items" },
    { $group: { _id: "$items.menuItemId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];
  const rows = await db.collection("food_orders").aggregate(pipeline).toArray();
  const out: RecItem[] = [];
  for (const r of rows) {
    try {
      const item = await foodStorage.getMenuItem(String(r._id));
      if (item) out.push({ id: item.id, name: item.name, image: item.image || null, price: item.price, score: r.count });
    } catch (e) {}
  }
  try { if (redis) await redis.setex(cacheKey, 60, JSON.stringify(out)); } catch (e) {}
  return out;
}

export async function getPopularFoodInLocation(city: string, limit = 12): Promise<RecItem[]> {
  const db = getDb();
  const redis = getRedis();
  const cacheKey = `recs:popular:food:city:${city}:${limit}`;
  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as RecItem[];
    }
  } catch (e) {}
  const esc = city.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&');
  const regex = new RegExp(esc, 'i');
  // find restaurants matching city/address
  const restaurants = await db.collection('food_restaurants').find({ address: { $regex: regex } }).toArray();
  const restIds = restaurants.map((r: any) => (r._id as any).toString());
  if (restIds.length === 0) return [];
  const pipeline = [
    { $match: { restaurantId: { $in: restIds } } },
    { $unwind: "$items" },
    { $group: { _id: "$items.menuItemId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];
  const rows = await db.collection("food_orders").aggregate(pipeline).toArray();
  const out: RecItem[] = [];
  for (const r of rows) {
    try {
      const item = await foodStorage.getMenuItem(String(r._id));
      if (item) out.push({ id: item.id, name: item.name, image: item.image || null, price: item.price, score: r.count, /*restaurantId: item.restaurantId*/ });
    } catch (e) {}
  }
  try { if (redis) await redis.setex(cacheKey, 60, JSON.stringify(out)); } catch (e) {}
  return out;
}

export async function getFrequentlyBoughtTogether(productId: string, limit = 8): Promise<RecItem[]> {
  const db = getDb();
  // find orders containing the product and count co-occurring product ids
  const pipeline = [
    { $match: { "items.productId": productId } },
    { $unwind: "$items" },
    { $match: { "items.productId": { $ne: productId } } },
    { $group: { _id: "$items.productId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: limit }
  ];
  const rows = await db.collection("orders").aggregate(pipeline).toArray();
  const out: RecItem[] = [];
  for (const r of rows) {
    const prod = await storage.getProduct(r._id);
    if (prod) out.push({ id: prod.id, name: prod.name, image: (prod as any).image || ((prod as any).images && (prod as any).images[0]) || null, price: prod.price, score: r.count, rating: (prod as any).rating || null });
  }
  return out;
}

export async function getSimilarProducts(productId: string, limit = 12): Promise<RecItem[]> {
  const prod = await storage.getProduct(productId);
  if (!prod) return [];
  const tags = Array.isArray((prod as any).tags) ? (prod as any).tags : [];
  const db = getDb();
  const q: any = { _id: { $ne: productId as any }, isActive: true };
  if (prod.categoryId) q.categoryId = prod.categoryId;
  if (tags.length > 0) q.tags = { $in: tags };
  const rows = await db.collection("products").find(q).limit(limit).toArray();
  return rows.map((p: any) => ({ id: (p._id as any).toString(), name: p.name, image: (p as any).image || ((p as any).images && (p as any).images[0]) || null, price: p.price, rating: (p as any).rating || null }));
}

export async function getRecommendationsForUser(userId: string, opts?: { city?: string }): Promise<{ recommended: RecItem[]; frequentlyBoughtTogether: RecItem[]; similar: RecItem[]; trending: RecItem[] }>{
  // Build simple hybrid: use user's past orders to pick categories, then recommend trending within them + co-occurrence
  const db = getDb();
  const redis = getRedis();
  const cacheKey = `recs:user:${userId}`;
  try {
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }
  } catch (e) {
    // ignore redis errors
  }
  const orders = await db.collection('orders').find({ userId }).sort({ createdAt: -1 }).toArray();
  const purchasedIds = new Set<string>();
  const categoryCounts: Record<string, number> = {};
  for (const o of orders) {
    for (const it of o.items || []) {
      purchasedIds.add(it.productId);
      try {
        const p = await storage.getProduct(it.productId);
        if (p && p.categoryId) categoryCounts[p.categoryId] = (categoryCounts[p.categoryId] || 0) + 1;
      } catch (e) {}
    }
  }

  const topCategories = Object.entries(categoryCounts).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  const recommended: RecItem[] = [];
  for (const cat of topCategories) {
    const prods = await storage.getProductsByCategory(cat);
    for (const p of prods) {
      if (!p) continue;
      if (p.id && !purchasedIds.has(p.id) && (p as any).stock > 0) recommended.push({ id: p.id, name: p.name, image: (p as any).image || (p as any).images?.[0] || null, price: p.price });
      if (recommended.length >= 12) break;
    }
    if (recommended.length >= 12) break;
  }

  // If still empty, use trending
  if (recommended.length === 0) {
    if (opts && opts.city) {
      const popularLocal = await getPopularFoodInLocation(opts.city, 12);
      if (popularLocal && popularLocal.length) {
        recommended.push(...popularLocal);
      }
    }
    if (recommended.length === 0) {
      const trending = await getTrendingItems(12);
      recommended.push(...trending);
    }
  }

  // Frequently bought together for last purchased product
  const lastProductId = orders.length ? orders[0].items && orders[0].items.length ? orders[0].items[0].productId : null : null;
  const fbt = lastProductId ? await getFrequentlyBoughtTogether(lastProductId, 8) : [];

  // Similar products for first purchased product or first recommended
  const seedId = lastProductId || (recommended[0] && recommended[0].id) || null;
  const similar = seedId ? await getSimilarProducts(seedId, 12) : [];

  const trending = await getTrendingItems(12);

  const result = { recommended: recommended.slice(0,12), frequentlyBoughtTogether: fbt, similar: similar.slice(0,12), trending };
  try {
    if (redis) await redis.setex(cacheKey, 30, JSON.stringify(result));
  } catch (e) {}
  return result;
}

export function sseSubscribe(userId: string, res: import('http').ServerResponse) {
  res.writeHead(200, {
    Connection: 'keep-alive',
    'Cache-Control': 'no-cache',
    'Content-Type': 'text/event-stream',
  });
  res.write('\n');
  const set = sseClients.get(userId) || new Set();
  set.add(res);
  sseClients.set(userId, set);
  const cleanup = () => {
    set.delete(res);
  };
  res.on('close', cleanup);
}

export async function notifyRecommendationUpdate(userId: string) {
  const clients = sseClients.get(userId);
  if (!clients) return;
  try {
    const data = await getRecommendationsForUser(userId);
    const payload = JSON.stringify(data);
    clients.forEach((res) => {
      try {
        res.write(`event: recommendations\ndata: ${payload}\n\n`);
      } catch (e) {}
    });
  } catch (e) {
    console.error('Failed to notify recommendation update', e);
  }
}

export default { getRecommendationsForUser, getTrendingItems, getFrequentlyBoughtTogether, getSimilarProducts, sseSubscribe, notifyRecommendationUpdate };
