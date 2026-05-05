import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HTTPServer } from "http";
import { Db, ObjectId } from "mongodb";
import eta from "../lib/eta";

export interface RideUpdatePayload {
  rideId: string;
  driverId?: string;
  status: string;
  driverLocation?: { lat: number; lng: number };
  eta?: number;
  distanceToPickup?: number;
}

export class UberSocketManager {
  private io: SocketIOServer;
  private db: Db;
  private activeRides = new Map<string, Set<string>>(); // rideId -> socketIds
  private driverConnections = new Map<string, string>(); // driverId -> socketId
  private userConnections = new Map<string, string>(); // userId -> socketId

  constructor(httpServer: HTTPServer, db: Db) {
    this.io = new SocketIOServer(httpServer, {
      cors: { origin: "*", methods: ["GET", "POST"] },
      transports: ["websocket", "polling"],
    });
    this.db = db;
    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      // User joins tracking for a specific ride
      socket.on("join_ride", (data: { rideId: string; userId: string; role: string }) => {
        const { rideId, userId, role } = data;
        socket.join(`ride-${rideId}`);

        if (role === "user") {
          this.userConnections.set(userId, socket.id);
        } else if (role === "driver") {
          this.driverConnections.set(userId, socket.id);
        }

        if (!this.activeRides.has(rideId)) {
          this.activeRides.set(rideId, new Set());
        }
        this.activeRides.get(rideId)!.add(socket.id);

        console.log(`[Socket] User ${userId} (${role}) joined ride ${rideId}`);
        socket.emit("ride_joined", { success: true, rideId });
      });

      // Driver updates location (every 3-5 seconds)
      socket.on("driver_location_update", (data: { driverId: string; rideId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
        const { driverId, rideId, lat, lng, heading, speed } = data;

        // Save to database for history
        this.db.collection("driver_locations").insertOne({
          driverId: new ObjectId(driverId),
          latitude: lat,
          longitude: lng,
          heading,
          speed,
          rideId: rideId ? new ObjectId(rideId) : undefined,
          timestamp: new Date(),
        });

        // compute ETA for this ride (if rideId provided)
        if (rideId) {
          (async () => {
            try {
              const ride = await this.db.collection('rides').findOne({ _id: new ObjectId(rideId) });
              if (ride) {
                const pickup = ride.pickupLocation || ride.from || ride.pickup || null;
                const dest = ride.destination || ride.to || ride.dropoff || null;
                // driver -> pickup
                if (pickup) {
                  const drv = { lat, lon: lng, speedKmh: data.speed };
                  const dEta = await eta.calculateDriverArrivalETA(this.db, drv as any, { lat: pickup.lat, lon: pickup.lon } as any, {} as any);
                  // store brief telemetry
                  try { await this.db.collection('ride_telemetry').insertOne({ rideId: new ObjectId(rideId), time: new Date(), type: 'driver_arrival', etaSec: dEta.seconds, distanceMeters: dEta.distanceMeters }); } catch (e) {}
                  this.io.to(`ride-${rideId}`).emit('eta_update', { rideId, type: 'driver_arrival', eta: dEta });
                }
                // if trip ongoing, compute remaining trip ETA
                if (ride.status === 'ongoing' && dest) {
                  const tEta = await eta.calculateTripEta(this.db, { lat, lon: lng } as any, { lat: dest.lat, lon: dest.lon } as any, {} as any);
                  try { await this.db.collection('ride_telemetry').insertOne({ rideId: new ObjectId(rideId), time: new Date(), type: 'trip_eta', etaSec: tEta.seconds, distanceMeters: tEta.distanceMeters }); } catch (e) {}
                  this.io.to(`ride-${rideId}`).emit('eta_update', { rideId, type: 'trip_eta', eta: tEta });
                }
              }
            } catch (e) {
              // ignore ETA errors
            }
          })();
        }

        // Broadcast to all users watching this ride
        this.io.to(`ride-${rideId}`).emit("driver_location_update", {
          driverId,
          lat,
          lng,
          heading,
          speed,
          timestamp: Date.now(),
        });
      });

      // Driver accepts ride
      socket.on("driver_accept_ride", (data: { driverId: string; rideId: string; vehicleId: string }) => {
        const { driverId, rideId, vehicleId } = data;

        this.io.to(`ride-${rideId}`).emit("ride_accepted", {
          driverId,
          vehicleId,
          acceptedAt: new Date(),
        });

        this.db.collection("rides").updateOne({ _id: new ObjectId(rideId) }, {
          $set: { driverId: new ObjectId(driverId), vehicleId: new ObjectId(vehicleId), status: "driver_accepted" },
        });

        console.log(`[Socket] Driver ${driverId} accepted ride ${rideId}`);
      });

      // Driver starts trip
      socket.on("driver_start_trip", (data: { driverId: string; rideId: string }) => {
        const { driverId, rideId } = data;

        this.io.to(`ride-${rideId}`).emit("ride_started", {
          driverId,
          startTime: new Date(),
        });

        this.db.collection("rides").updateOne({ _id: new ObjectId(rideId) }, {
          $set: { status: "ongoing", startTime: new Date() },
        });

        console.log(`[Socket] Driver ${driverId} started ride ${rideId}`);
      });

      // Driver ends trip
      socket.on("driver_end_trip", (data: { driverId: string; rideId: string; actualDistance: number; actualDuration: number; actualFare: number }) => {
        const { driverId, rideId, actualDistance, actualDuration, actualFare } = data;

        this.io.to(`ride-${rideId}`).emit("ride_completed", {
          driverId,
          actualDistance,
          actualDuration,
          actualFare,
          endTime: new Date(),
        });

        this.db.collection("rides").updateOne({ _id: new ObjectId(rideId) }, {
          $set: {
            status: "completed",
            endTime: new Date(),
            actualDistance,
            actualDuration,
            actualFare,
          },
        });

        console.log(`[Socket] Ride ${rideId} completed`);
      });

      // User cancels ride
      socket.on("user_cancel_ride", (data: { rideId: string; userId: string; reason?: string }) => {
        const { rideId, userId, reason } = data;

        this.io.to(`ride-${rideId}`).emit("ride_cancelled", {
          cancelledBy: "user",
          reason,
          timestamp: new Date(),
        });

        this.db.collection("rides").updateOne({ _id: new ObjectId(rideId) }, {
          $set: { status: "cancelled", cancelledBy: "user", cancelReason: reason },
        });

        console.log(`[Socket] Ride ${rideId} cancelled by user ${userId}`);
      });

      // Broadcast new ride request to nearby drivers
      socket.on("new_ride_request", (data: {
        rideId: string;
        pickupLat: number;
        pickupLng: number;
        dropLat: number;
        dropLng: number;
        estimatedFare: number;
        distance: number;
      }) => {
        const { pickupLat, pickupLng, estimatedFare, distance } = data;

        // Find nearby drivers (within 5km) and emit
        this.db
          .collection("drivers")
          .find({ status: "online", approvalStatus: "approved" })
          .toArray()
          .then((drivers) => {
            drivers.forEach((driver: any) => {
              if (driver.currentLocation) {
                const distToDriver = this.haversineDistance(
                  pickupLat,
                  pickupLng,
                  driver.currentLocation.lat,
                  driver.currentLocation.lng
                );

                if (distToDriver <= 5) {
                  // within 5km
                  const driverSocketId = this.driverConnections.get(driver.userId.toString());
                  if (driverSocketId) {
                    this.io.to(driverSocketId).emit("incoming_ride_request", {
                      rideId: data.rideId,
                      pickupLat,
                      pickupLng,
                      estimatedFare,
                      distance,
                      distanceToDriver: distToDriver,
                      expiresIn: 15, // 15 second timer
                    });
                  }
                }
              }
            });
          });
      });

      // Driver goes online
      socket.on("driver_go_online", (data: { driverId: string; lat: number; lng: number }) => {
        const { driverId, lat, lng } = data;

        this.db.collection("drivers").updateOne({ _id: new ObjectId(driverId) }, {
          $set: { status: "online", currentLocation: { lat, lng } },
        });

        this.io.emit("driver_status_changed", { driverId, status: "online" });
        console.log(`[Socket] Driver ${driverId} is online`);
      });

      // Driver goes offline
      socket.on("driver_go_offline", (data: { driverId: string }) => {
        const { driverId } = data;

        this.db.collection("drivers").updateOne({ _id: new ObjectId(driverId) }, {
          $set: { status: "offline" },
        });

        this.io.emit("driver_status_changed", { driverId, status: "offline" });
        this.driverConnections.delete(driverId);
        console.log(`[Socket] Driver ${driverId} is offline`);
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);

        // Clean up connections
        this.driverConnections.forEach((socketId, driverId) => {
          if (socketId === socket.id) {
            this.db.collection("drivers").updateOne({ _id: new ObjectId(driverId) }, {
              $set: { status: "offline" },
            });
            this.driverConnections.delete(driverId);
          }
        });

        this.userConnections.forEach((socketId, userId) => {
          if (socketId === socket.id) {
            this.userConnections.delete(userId);
          }
        });

        // Clean up active rides
        this.activeRides.forEach((sockets, rideId) => {
          sockets.delete(socket.id);
          if (sockets.size === 0) {
            this.activeRides.delete(rideId);
          }
        });
      });
    });
  }

  // Helper: Calculate distance between two coordinates (Haversine)
  private haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth radius in km
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Public method to broadcast ride updates
  public broadcastRideUpdate(rideId: string, update: RideUpdatePayload) {
    this.io.to(`ride-${rideId}`).emit("ride_update", update);
  }

  // Get Socket.IO server instance
  public getIO(): SocketIOServer {
    return this.io;
  }
}
