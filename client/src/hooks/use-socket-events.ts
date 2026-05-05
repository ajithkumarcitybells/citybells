import { useEffect, useRef, useCallback, useState } from "react";
import { io, Socket } from "socket.io-client";

export interface UseSocketEventsOptions {
  url?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useSocketEvents(options: UseSocketEventsOptions = {}) {
  const {
    url = typeof window !== "undefined" && window.location.origin ? window.location.origin : "http://localhost:3000",
    autoConnect = true,
    onConnect,
    onDisconnect,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Initialize socket connection
  useEffect(() => {
    if (!autoConnect) return;

    if (!socketRef.current) {
      socketRef.current = io(url, {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      socketRef.current.on("connect", () => {
        console.log("[Socket] Connected");
        setIsConnected(true);
        setConnectionError(null);
        onConnect?.();
      });

      socketRef.current.on("disconnect", () => {
        console.log("[Socket] Disconnected");
        setIsConnected(false);
        onDisconnect?.();
      });

      socketRef.current.on("connect_error", (error: any) => {
        console.error("[Socket] Connection error:", error);
        setConnectionError(error.message || "Connection error");
      });
    }

    return () => {
      // Don't disconnect on unmount - keep connection alive
    };
  }, [url, autoConnect]);

  // Helper to emit events
  const emit = useCallback((event: string, data?: any, callback?: (response: any) => void) => {
    if (socketRef.current && socketRef.current.connected) {
      if (callback) {
        socketRef.current.emit(event, data, callback);
      } else {
        socketRef.current.emit(event, data);
      }
    } else {
      console.warn(`[Socket] Not connected, cannot emit: ${event}`);
    }
  }, []);

  // Helper to listen for events
  const on = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) return;
    socketRef.current.on(event, callback);
    return () => {
      socketRef.current?.off(event, callback);
    };
  }, []);

  // Helper to listen for events once
  const once = useCallback((event: string, callback: (data: any) => void) => {
    if (!socketRef.current) return;
    socketRef.current.once(event, callback);
  }, []);

  // Join a specific ride room. Supports (rideId, userId, role) and (rideId, role)
  const joinRide = useCallback((rideId: string, userIdOrRole?: string, roleMaybe?: string) => {
    let userId: string | undefined;
    let role: string | undefined;
    if (!userIdOrRole) {
      userId = undefined;
      role = undefined;
    } else if (roleMaybe) {
      userId = userIdOrRole;
      role = roleMaybe;
    } else {
      role = userIdOrRole;
      userId = undefined;
    }
    emit("join_ride", { rideId, userId, role });
  }, [emit]);

  // Leave a ride room
  const leaveRide = useCallback((rideId: string) => {
    if (!socketRef.current) return;
    // The client socket.io type doesn't expose a `leave` method; server-side sockets do.
    // Try calling `leave` if present (some environments may polyfill), otherwise emit a leave event.
    const s: any = socketRef.current;
    if (typeof s.leave === "function") {
      s.leave(`ride-${rideId}`);
    } else {
      s.emit?.("leave_ride", { rideId });
    }
  }, []);

  // Send driver location update
  const updateDriverLocation = useCallback(
    (driverId: string, rideId: string, lat: number, lng: number, heading?: number, speed?: number) => {
      emit("driver_location_update", { driverId, rideId, lat, lng, heading, speed });
    },
    [emit]
  );

  // Driver accepts ride
  const acceptRide = useCallback((driverId: string, rideId: string, vehicleId: string) => {
    emit("driver_accept_ride", { driverId, rideId, vehicleId });
  }, [emit]);

  // Driver starts trip
  const startTrip = useCallback((driverId: string, rideId: string) => {
    emit("driver_start_trip", { driverId, rideId });
  }, [emit]);

  // Driver ends trip
  const endTrip = useCallback(
    (driverId: string, rideId: string, actualDistance: number, actualDuration: number, actualFare: number) => {
      emit("driver_end_trip", { driverId, rideId, actualDistance, actualDuration, actualFare });
    },
    [emit]
  );

  // User cancels ride
  const cancelRide = useCallback((rideId: string, userId: string, reason?: string) => {
    emit("user_cancel_ride", { rideId, userId, reason });
  }, [emit]);

  // Request new ride (broadcast to nearby drivers)
  const requestRide = useCallback(
    (rideId: string, pickupLat: number, pickupLng: number, dropLat: number, dropLng: number, estimatedFare: number, distance: number) => {
      emit("new_ride_request", { rideId, pickupLat, pickupLng, dropLat, dropLng, estimatedFare, distance });
    },
    [emit]
  );

  // Driver goes online. Supports (lat, lng) or (driverId, lat, lng)
  const goOnline = useCallback((a: string | number, b?: number, c?: number) => {
    let driverId: string | undefined;
    let lat: number | undefined;
    let lng: number | undefined;
    if (typeof a === "string" && typeof b === "number" && typeof c === "number") {
      driverId = a as string;
      lat = b;
      lng = c;
    } else if (typeof a === "number" && typeof b === "number") {
      lat = a as number;
      lng = b as number;
    }
    emit("driver_go_online", { driverId, lat, lng });
  }, [emit]);

  // Driver goes offline. Accepts optional driverId.
  const goOffline = useCallback((driverId?: string) => {
    emit("driver_go_offline", { driverId });
  }, [emit]);

  return {
    socket: socketRef.current,
    isConnected,
    connectionError,
    emit,
    on,
    once,
    joinRide,
    leaveRide,
    updateDriverLocation,
    acceptRide,
    startTrip,
    endTrip,
    cancelRide,
    requestRide,
    goOnline,
    goOffline,
  };
}
