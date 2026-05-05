import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";

export default function useTaxiSocket() {
  const socketRef = useRef<Socket | null>(null);

  const [connected, setConnected] = useState(false);
  const [lastDriverLocation, setLastDriverLocation] = useState<any>(null);
  const [lastRideUpdate, setLastRideUpdate] = useState<any>(null);

  // ✅ Create socket ONLY once
  useEffect(() => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('driverToken') || undefined : undefined;
    const socket = io(import.meta.env.VITE_API_URL || "/", {
      transports: ["websocket"],
      auth: token ? { token } : undefined,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setConnected(true);
      console.log("✅ Socket connected");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("❌ Socket disconnected");
    });

    // ✅ Listen for updates
    socket.on("driver:location", (data) => {
      setLastDriverLocation(data);
    });

    socket.on("ride:update", (data) => {
      setLastRideUpdate(data);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // ✅ FIX: stable function (VERY IMPORTANT)
  const joinAdmin = useCallback(() => {
    if (!socketRef.current) return;

    console.log("📡 Joining admin room");
    socketRef.current.emit("join-admin");
  }, []);

  return {
    connected,
    lastDriverLocation,
    lastRideUpdate,
    joinAdmin,
  };
}