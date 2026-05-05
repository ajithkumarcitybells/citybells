import { type Server as HttpServer } from 'http';
import type express from 'express';

import { getDb } from './db';
import getRedis from './redis';

// track connected sockets per driver to know when last socket disconnects
const driverSocketMap: Map<string, Set<string>> = new Map();

export async function initSocket(httpServer: HttpServer, app: express.Express) {
  try {
    const mod = await import('socket.io');
    const IOServer = (mod as any).Server || (mod as any).default || (mod as any);

    const io = new IOServer(httpServer, {
      cors: { origin: '*' },
      transports: ['websocket', 'polling'],
    });

    // Attach optional Redis adapter when REDIS_URL is configured
    try {
      const redisUrl = process.env.REDIS_URL;
      if (redisUrl) {
        // dynamic import to avoid runtime dependency when not configured
        // @ts-ignore
        const IORedis = (await import('ioredis')).default;
        const { createAdapter } = await import('@socket.io/redis-adapter');
        const pubClient = new IORedis(redisUrl);
        const subClient = pubClient.duplicate();
        io.adapter(createAdapter(pubClient, subClient));
        console.log('Socket.IO Redis adapter attached');
      }
    } catch (e) {
      console.error('Failed to attach Redis adapter for Socket.IO', e);
    }

    // Socket auth: accept JWT in handshake auth.token or Authorization header.
    io.use(async (socket: any, next: any) => {
      try {
        const authToken = socket.handshake?.auth?.token || (socket.handshake?.headers?.authorization ? String(socket.handshake.headers.authorization).split(' ')[1] : undefined);
        if (!authToken) return next();

        // Prefer real JWT verification when possible
        try {
          // @ts-ignore
          const jwt = await import('jsonwebtoken');
          const secret = process.env.JWT_SECRET || '';
          if (secret) {
            const decoded = jwt.verify(authToken, secret) as any;
            socket.data.user = decoded;
            return next();
          }
        } catch (e) {
          // fallthrough to base64 fallback
        }

        // fallback: some routes issue a base64-encoded payload (driver token generator). Decode safely.
        try {
          const json = Buffer.from(String(authToken), 'base64').toString('utf8');
          const parsed = JSON.parse(json);
          // basic expiry check if present
          if (parsed && parsed.exp && Date.now() / 1000 > parsed.exp) return next(new Error('token expired'));
          socket.data.user = parsed;
        } catch (e) {
          // ignore and allow unauthenticated socket
        }

        return next();
      } catch (err) {
        return next(err);
      }
    });

    // expose io via app.locals and make it available on req as well
    (app as any).locals.io = io;
    app.use((req: any, _res: any, next: any) => {
      req.io = io;
      next();
    });

    io.on('connection', (socket: any) => {
      // auto-join rooms based on authenticated user
      try {
        const user = socket.data?.user;
        if (user) {
          const id = user.sub || user.driverId || user.id;
          if (id) {
            socket.join(`driver:${id}`);
            // track socket for cleanup
            const set = driverSocketMap.get(String(id)) || new Set<string>();
            set.add(socket.id);
            driverSocketMap.set(String(id), set);
          }
          if (user.role === 'admin' || user.isAdmin) socket.join('admin:rides');
        }
      } catch (e) {}

      socket.on('joinRide', (rideId: string) => { if (rideId) socket.join(`ride:${rideId}`); });
      socket.on('leaveRide', (rideId: string) => { if (rideId) socket.leave(`ride:${rideId}`); });
      socket.on('joinAdminRides', () => socket.join('admin:rides'));
      socket.on('joinDriverRides', () => socket.join('drivers'));

      socket.on('driverLocationUpdate', async (data: any) => {
        try {
          // Enforce driver role
          const user = socket.data?.user;
          if (!user || user.role !== 'driver') {
            socket.emit('error', { code: 'not_authorized', message: 'Driver role required' });
            return;
          }

          const { driverId, lat, lng, rideId } = data || {};
          // ensure driverId matches authenticated user (if present)
          const authId = user.sub || user.driverId || user.id;
          if (authId && driverId && String(authId) !== String(driverId)) {
            socket.emit('error', { code: 'invalid_driver', message: 'driverId does not match authenticated token' });
            return;
          }

          const now = Date.now();
          try {
            const redis = getRedis();
            if (redis && driverId) {
              const key = `driver:${driverId}:location`;
              await redis.set(key, JSON.stringify({ lat, lng, timestamp: now }), 'EX', 15);
              await redis.zadd('active_drivers', now, String(driverId));
            }
          } catch (e) {
            console.warn('Redis unavailable for driver location update', e);
          }

          try {
            if (driverId) {
              const db = getDb();
              await db.collection('taxi_drivers').updateOne({ _id: driverId as any }, { $set: { currentLat: lat, currentLng: lng, updatedAt: new Date() } });
            }
          } catch (e) {
            console.error('Failed to persist driver location to DB', e);
          }

          if (rideId) io.to(`ride:${rideId}`).emit('driverLocationUpdate', data);
          if (driverId) io.to(`driver:${driverId}`).emit('driverLocationUpdate', data);
          io.to('admin:rides').emit('driverLocationUpdate', data);
        } catch (e) {
          console.error('driverLocationUpdate handler failed', e);
        }
      });

      socket.on('disconnect', async (reason: any) => {
        try {
          // cleanup tracking for driver sockets
          try {
            const user = socket.data?.user;
            const id = user?.sub || user?.driverId || user?.id;
            if (id) {
              const set = driverSocketMap.get(String(id));
              if (set) {
                set.delete(socket.id);
                if (set.size === 0) {
                  driverSocketMap.delete(String(id));
                  // remove from active_drivers zset and delete ephemeral location key
                  try {
                    const redis = getRedis();
                    if (redis) {
                      await redis.zrem('active_drivers', String(id));
                      await redis.del(`driver:${id}:location`);
                    }
                  } catch (e) {
                    console.warn('Failed to cleanup redis for disconnected driver', e);
                  }
                } else {
                  driverSocketMap.set(String(id), set);
                }
              }
            }
          } catch (e) {
            // ignore
          }
        } catch (e) {
          console.error('Error during socket disconnect cleanup', e);
        }
      });
    });

    return io;
  } catch (e) {
    console.error('Socket initialization failed', e);
    throw e;
  }
}

export default initSocket;
