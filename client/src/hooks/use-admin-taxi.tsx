import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "@/lib/queryClient";

export default function useAdminTaxi() {
  const [rides, setRides] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // ✅ fetch rides (stable)
  const fetchRides = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiRequest("GET", "/api/admin/taxi/rides");
      const data = await res.json();
      setRides(data || []);
    } catch (err) {
      console.error("Failed to fetch rides", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ fetch drivers (stable)
  const fetchDrivers = useCallback(async () => {
    try {
      const res = await apiRequest("GET", "/api/admin/taxi/drivers");
      const data = await res.json();
      setDrivers(data || []);
    } catch (err) {
      console.error("Failed to fetch drivers", err);
    }
  }, []);

  // ✅ assign driver (stable)
  const assignDriver = useCallback(async (rideId: string, driverId: string) => {
    try {
      await apiRequest("PATCH", `/api/admin/taxi/rides/${rideId}/assign`, {
        driverId,
      });

      // optional: refresh rides after assign
      await fetchRides();
    } catch (err) {
      console.error("Assign driver failed", err);
      throw err;
    }
  }, [fetchRides]);

  // ✅ INITIAL LOAD (only once)
  useEffect(() => {
    fetchRides();
    fetchDrivers();
  }, [fetchRides, fetchDrivers]);

  return {
    rides,
    drivers,
    loading,
    fetchRides,
    assignDriver,
    setRides,     // used by socket updates
    setDrivers,   // used by socket updates
  };
}