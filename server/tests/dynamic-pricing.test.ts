import { describe, it, expect } from 'vitest';
import { getDemandMultiplier, getPeakMultiplier, calculateDynamicFare } from '../lib/dynamic-pricing';

function makeFakeDb(map: Record<string, any>) {
  return {
    collection(name: string) {
      const entry = map[name] || {};
      return {
        findOne: async () => entry.findOne ?? null,
        find: (_q?: any) => ({ toArray: async () => entry.toArray ?? [] }),
        deleteMany: async () => ({}),
        insertMany: async () => ({}),
        insertOne: async () => ({}),
      };
    },
  } as any;
}

describe('dynamic-pricing', () => {
  it('calculates demand multiplier using config', async () => {
    const cfg = { low: { maxRatio: 1.0, multiplier: 1.0 }, medium: { maxRatio: 1.5, multiplier: 1.3 }, high: { maxRatio: 2.5, multiplier: 1.8 }, extreme: { multiplier: 2.5 } };
    const db = makeFakeDb({ demand_surge_config: { findOne: cfg } });

    const m1 = await getDemandMultiplier(db, 5, 10); // ratio 0.5
    expect(m1).toBe(1);

    const m2 = await getDemandMultiplier(db, 15, 10); // ratio 1.5 -> medium
    expect(m2).toBeCloseTo(1.3);

    const m3 = await getDemandMultiplier(db, 30, 10); // ratio 3 -> extreme
    expect(m3).toBeCloseTo(2.5);
  });

  it('finds peak multiplier for time windows including overnight', async () => {
    const peaks = [
      { name: 'Morning Rush', startTime: '07:00', endTime: '10:00', multiplier: 1.5, enabled: true },
      { name: 'Night Slot', startTime: '22:00', endTime: '04:00', multiplier: 2.0, enabled: true },
    ];
    const db = makeFakeDb({ peak_surge_rules: { toArray: peaks } });

    const morning = new Date();
    morning.setHours(8, 30, 0, 0);
    const m1 = await getPeakMultiplier(db, morning);
    expect(m1).toBe(1.5);

    const night = new Date();
    night.setHours(23, 0, 0, 0);
    const m2 = await getPeakMultiplier(db, night);
    expect(m2).toBe(2.0);
  });

  it('calculates combined fare using active time-slot pricing', async () => {
    // create an active time-slot pricing that covers current time
    const now = new Date();
    const start = new Date(now.getTime()); start.setHours(now.getHours()-1,0,0,0);
    const end = new Date(now.getTime()); end.setHours(now.getHours()+1,0,0,0);
    const startStr = ('0' + start.getHours()).slice(-2) + ':00';
    const endStr = ('0' + end.getHours()).slice(-2) + ':00';

    const pricing = [{ startTime: startStr, endTime: endStr, baseFare: 120, perKmRate: 10, perMinuteRate: 1, bookingFee: 0, isActive: true }];
    const db = makeFakeDb({ taxi_pricing: { toArray: pricing } });

    // 9 km, 10 min => base 120 + 9*10 + 10*1 = 120 + 90 + 10 = 220
    const res = await calculateDynamicFare(db as any, 9000, 600, {});
    expect(res.fare).toBe(220);
    expect(res.multipliers.totalMultiplier).toBeGreaterThanOrEqual(1);
  });
});
