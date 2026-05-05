import { Db, ObjectId } from "mongodb";
import { IRide, RideStatus, PaymentMethod, IAdminSettings } from "../schemas/uber-schemas";
import dynamicPricing from "../lib/dynamic-pricing";

export class RideService {
  constructor(private db: Db) {}

  /**
   * Calculate fare based on distance, duration, and surge pricing
   */
  async calculateFare(distanceMeters: number, durationSec: number): Promise<{ fare: number; breakdown: Record<string, number> }> {
    // Use the dynamic pricing engine which combines time-slot, peak, demand and weather
    try {
      const res = await dynamicPricing.calculateDynamicFare(this.db, distanceMeters, durationSec, {} as any);
      return { fare: res.fare, breakdown: { ...res.breakdown, totalMultiplier: res.multipliers.totalMultiplier } };
    } catch (e) {
      // fallback to simple fixed rates
      const settings = await this.db.collection<IAdminSettings>("admin_settings").findOne({});
      if (!settings) return this.calculateFareWithRates(distanceMeters, durationSec, 50, 15, 0.5, 1);
      const { baseFare, perKmRate, perMinRate, surgeFactor } = settings;
      return this.calculateFareWithRates(distanceMeters, durationSec, baseFare, perMinRate, perKmRate, surgeFactor);
    }
  }

  private calculateFareWithRates(
    distanceMeters: number,
    durationSec: number,
    baseFare: number,
    perMinRate: number,
    perKmRate: number,
    surgeFactor: number
  ): { fare: number; breakdown: Record<string, number> } {
    const distanceKm = distanceMeters / 1000;
    const durationMin = durationSec / 60;

    const distanceFare = distanceKm * perKmRate;
    const timeFare = durationMin * perMinRate;
    const subtotal = baseFare + distanceFare + timeFare;
    const surgeFee = subtotal * (surgeFactor - 1); // surge multiplier is 1.0 normally, 1.5 during peak, etc.
    const totalFare = subtotal + surgeFee;

    return {
      fare: Math.round(totalFare * 100) / 100, // round to 2 decimals
      breakdown: {
        baseFare,
        distanceFare: Math.round(distanceFare * 100) / 100,
        timeFare: Math.round(timeFare * 100) / 100,
        surgeFee: Math.round(surgeFee * 100) / 100,
        totalFare: Math.round(totalFare * 100) / 100,
      },
    };
  }

  /**
   * Create a new ride request
   */
  async createRide(
    userId: string,
    pickup: { lat: number; lng: number; address: string },
    drop: { lat: number; lng: number; address: string },
    distanceMeters: number,
    durationSec: number,
    paymentMethod: PaymentMethod,
    vehicleType?: string,
    scheduledTime?: Date
  ): Promise<any> {
    // Gather live supply/demand data to compute demand surge
    let availableDriversCount = 0;
    try {
      const drivers = await this.getAvailableDrivers(pickup.lat, pickup.lng, 5);
      availableDriversCount = Array.isArray(drivers) ? drivers.length : 0;
    } catch (e) {
      availableDriversCount = 0;
    }

    let pendingRequests = 0;
    try {
      pendingRequests = await this.db.collection('rides').countDocuments({ status: { $in: ['pending', 'searching'] } });
    } catch (e) {
      pendingRequests = 0;
    }

    // If frontend passed a taxi vehicle-type document id, resolve it to the vehicle name
    let vehicleTypeName = vehicleType;
    if (vehicleTypeName) {
      try {
        if (/^[a-fA-F0-9]{24}$/.test(vehicleTypeName)) {
          const vt = await this.db.collection('taxi_vehicle_types').findOne({ _id: new ObjectId(vehicleTypeName) });
          if (vt && (vt as any).name) vehicleTypeName = (vt as any).name;
        }
      } catch (e) {
        // ignore conversion errors and fall back to provided string
      }
    }

    const pricingResult = await dynamicPricing.calculateDynamicFare(this.db, distanceMeters, durationSec, { vehicleType: vehicleTypeName, requests: pendingRequests, availableDrivers: availableDriversCount, lat: pickup.lat, lon: pickup.lng });
    const { fare, breakdown, multipliers } = pricingResult;

    const subtotal = (breakdown.baseFare || 0) + (breakdown.distanceCharge || 0) + (breakdown.timeCharge || 0);
    const peakAdd = Math.round(subtotal * ((multipliers?.peak || 1) - 1));
    const weatherAdd = Math.round(subtotal * ((multipliers?.weather || 1) - 1));
    const demandAdd = Math.round(subtotal * ((multipliers?.demand || 1) - 1));

    const ride = {
      userId: new ObjectId(userId),
      pickupLocation: pickup,
      dropLocation: drop,
      distanceMeters,
      durationSec,
      fare,
      baseFare: breakdown.baseFare,
      surgeMultiplier: multipliers?.totalMultiplier || 1,
      surgeBreakdown: { peakAdd, weatherAdd, demandAdd, totalMultiplier: multipliers?.totalMultiplier || 1 },
      status: RideStatus.PENDING,
      paymentMethod,
      vehicleType: vehicleTypeName || vehicleType || "sedan",
      scheduledTime,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db.collection("rides").insertOne(ride);
    return { ...ride, _id: result.insertedId };
  }

  /**
   * Get available drivers within a radius
   */
  async getAvailableDrivers(
    pickupLat: number,
    pickupLng: number,
    radiusKm: number = 5
  ): Promise<any[]> {
    const drivers = await this.db
      .collection("driver_locations")
      .aggregate([
        {
          $geoNear: {
            near: { type: "Point", coordinates: [pickupLng, pickupLat] },
            distanceField: "distance",
            maxDistance: radiusKm * 1000, // convert to meters
            spherical: true,
          },
        },
        {
          $lookup: {
            from: "drivers",
            localField: "driverId",
            foreignField: "_id",
            as: "driverInfo",
          },
        },
        { $unwind: "$driverInfo" },
        {
          $match: {
            "driverInfo.status": "online",
            "driverInfo.approvalStatus": "approved",
          },
        },
        { $limit: 20 },
      ])
      .toArray();

    return drivers.map((d) => ({
      driverId: d.driverId,
      lat: d.latitude,
      lng: d.longitude,
      distance: d.distance / 1000, // convert back to km
      driver: d.driverInfo,
    }));
  }

  /**
   * Assign driver to ride
   */
  async assignDriver(rideId: string, driverId: string): Promise<any> {
    const result = await this.db.collection("rides").updateOne(
      { _id: new ObjectId(rideId) },
      {
        $set: {
          driverId: new ObjectId(driverId),
          status: RideStatus.ACCEPTED,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Cancel a ride
   */
  async cancelRide(rideId: string, cancelledBy: "user" | "driver" | "admin", reason?: string): Promise<any> {
    const result = await this.db.collection("rides").updateOne(
      { _id: new ObjectId(rideId) },
      {
        $set: {
          status: RideStatus.CANCELLED,
          cancelledBy,
          cancelReason: reason,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Update ride status
   */
  async updateRideStatus(rideId: string, status: RideStatus): Promise<any> {
    const result = await this.db.collection("rides").updateOne(
      { _id: new ObjectId(rideId) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      }
    );

    return result.modifiedCount > 0;
  }

  /**
   * Get ride history for user
   */
  async getRideHistory(userId: string, limit: number = 10): Promise<any[]> {
    const rides = await this.db
      .collection("rides")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return rides;
  }

  /**
   * Get active rides (not completed/cancelled)
   */
  async getActiveRides(limit: number = 50): Promise<any[]> {
    const rides = await this.db
      .collection("rides")
      .find({
        status: {
          $in: [
            RideStatus.PENDING,
            RideStatus.SEARCHING,
            RideStatus.ACCEPTED,
            RideStatus.ARRIVING,
            RideStatus.ONGOING,
          ],
        },
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return rides;
  }

  /**
   * Get analytics for admin dashboard
   */
  async getAnalytics(startDate: Date, endDate: Date): Promise<any> {
    const rides = await this.db
      .collection("rides")
      .find({
        createdAt: { $gte: startDate, $lte: endDate },
        status: RideStatus.COMPLETED,
      })
      .toArray();

    const totalRides = rides.length;
    const totalRevenue = rides.reduce((sum: number, ride: any) => sum + (ride.fare || 0), 0);
    const avgRideValue = totalRides > 0 ? totalRevenue / totalRides : 0;

    const ridesByHour = new Map<number, number>();
    rides.forEach((ride: any) => {
      const hour = new Date(ride.createdAt).getHours();
      ridesByHour.set(hour, (ridesByHour.get(hour) || 0) + 1);
    });

    return {
      totalRides,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgRideValue: Math.round(avgRideValue * 100) / 100,
      ridesByHour: Object.fromEntries(ridesByHour),
      dateRange: { startDate, endDate },
    };
  }
}
