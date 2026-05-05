import { getDb } from "./db";
import { getRedis } from "./redis";

type WorkerOptions = {
  intervalMs?: number;
  recentHours?: number;
  userLimit?: number;
};

let _timer: NodeJS.Timeout | null = null;

export function stopRecommendationWorker() {
  if (_timer) {
    clearInterval(_timer);
    _timer = null;
  }
}

export function startRecommendationWorker(opts: WorkerOptions = {}) {
  const intervalMs = opts.intervalMs ?? 60_000; // default 60s
  const recentHours = opts.recentHours ?? 72; // look back window for active users
  const userLimit = opts.userLimit ?? 500; // max users to precompute per tick

  const job = async () => {
    try {
      const db = getDb();
      const redis = getRedis();

      // 1) compute trending items and cache per-service
      try {
        const { getTrendingItems } = await import("./recommendations");
        const servicesToCompute = ['grocery', 'ecom'];
        for (const svc of servicesToCompute) {
          try {
            const trending = await getTrendingItems(24, svc === 'grocery' ? 'grocery' : 'ecom');
            if (redis) {
              try { await redis.setex(`recs:trending:${svc}:24`, 300, JSON.stringify(trending)); } catch (e) {}
            }
            // Update product documents to reflect trending flag and score for the correct collection
            try {
              const topIds = trending.map((t: any) => t.id).filter(Boolean);
              if (topIds.length > 0) {
                const bulkOps: any[] = [];
                for (const t of trending) {
                  const filter = { _id: t.id as any };
                  const update = { $set: { isTrending: true, trendingScore: t.score || 0, updatedAt: new Date() } };
                  bulkOps.push({ updateOne: { filter, update } });
                }
                // unset isTrending for items not in topIds within the same collection
                if (svc === 'ecom') {
                  bulkOps.push({ updateMany: { filter: { isTrending: true, _id: { $nin: topIds } }, update: { $set: { isTrending: false, trendingScore: null, updatedAt: new Date() } } } });
                  if (bulkOps.length > 0) {
                    try { await db.collection('ecom_products').bulkWrite(bulkOps, { ordered: false }); } catch (e) {}
                  }
                } else {
                  bulkOps.push({ updateMany: { filter: { isTrending: true, _id: { $nin: topIds } }, update: { $set: { isTrending: false, trendingScore: null, updatedAt: new Date() } } } });
                  if (bulkOps.length > 0) {
                    try { await db.collection('products').bulkWrite(bulkOps, { ordered: false }); } catch (e) {}
                  }
                }
              }
            } catch (e) {
              console.error('Worker: failed to update product trending flags for service', svc, e);
            }
          } catch (e) {
            console.error('Worker: failed to compute trending for service', svc, e);
          }
        }
      } catch (e) {
        console.error('Worker: failed to compute trending', e);
      }

      // 2) find active users from events/orders in recent window
      const since = new Date(Date.now() - recentHours * 60 * 60 * 1000);
      const userIds = await db.collection('events').distinct('userId', { createdAt: { $gte: since }, userId: { $ne: null } });
      // fallback: include recent order users if no events
      if ((!userIds || userIds.length === 0) && db) {
        const orderUsers = await db.collection('orders').distinct('userId', { createdAt: { $gte: since } });
        for (const u of orderUsers) if (u) userIds.push(u);
      }

      const slice = Array.isArray(userIds) ? userIds.slice(0, userLimit) : [];
      for (const uid of slice) {
        try {
          const { getRecommendationsForUser } = await import("./recommendations");
          const recs = await getRecommendationsForUser(uid as string);
          if (redis) {
            try { await redis.setex(`recs:user:${uid}`, 300, JSON.stringify(recs)); } catch (e) {}
          }
        } catch (e) {
          // don't let a single user failure stop the loop
        }
      }
    } catch (e) {
      console.error('Recommendation worker error', e);
    }
  };

  // run immediately, then schedule
  job().catch(() => {});
  stopRecommendationWorker();
  _timer = setInterval(() => { job().catch(() => {}); }, intervalMs);
  console.log('Recommendation worker started', { intervalMs, recentHours, userLimit });
  return { stop: stopRecommendationWorker };
}

export default { startRecommendationWorker, stopRecommendationWorker };
