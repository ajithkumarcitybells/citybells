import React, { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useSocketEvents } from "@/hooks/use-socket-events";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, DollarSign, Clock, Star, Phone, AlertCircle } from "lucide-react";

interface IncomingRequest {
  _id: string;
  userId: string;
  pickupAddress: string;
  dropAddress: string;
  distance: number;
  fare: number;
  userRating: number;
  requestedAt: Date;
  expiresAt: Date;
}

interface DriverProfile {
  _id: string;
  name: string;
  phone: string;
  rating: number;
  totalRides: number;
  status: "online" | "offline" | "on_ride";
  currentLocation: { lat: number; lng: number };
  vehicle: {
    type: string;
    registrationNumber: string;
    model: string;
  };
}

interface Earnings {
  totalEarnings: number;
  totalRides: number;
  averagePerRide: number;
}

export default function DriverDashboard() {
  const { user } = useAuth();
  const { socket, joinRide, goOnline, goOffline } = useSocketEvents();

  const [driverProfile, setDriverProfile] = useState<DriverProfile | null>(null);
  const [earnings, setEarnings] = useState<Earnings | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<IncomingRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<IncomingRequest | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState<number>(15);

  // Fetch driver profile
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/drivers/profile");
        if (!res.ok) throw new Error("Failed to fetch profile");
        const data = await res.json();
        setDriverProfile(data);
        setIsOnline(data.status === "online");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch profile");
      } finally {
        setLoading(false);
      }
    };

    if (user) fetchProfile();
  }, [user]);

  // Fetch earnings
  useEffect(() => {
    const fetchEarnings = async () => {
      try {
        const res = await fetch("/api/drivers/earnings?period=daily");
        if (!res.ok) throw new Error("Failed to fetch earnings");
        const data = await res.json();
        setEarnings(data);
      } catch (err) {
        console.error("Error fetching earnings:", err);
      }
    };

    if (user) {
      fetchEarnings();
      const interval = setInterval(fetchEarnings, 30000); // Refresh every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  // Fetch incoming requests
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const res = await fetch("/api/drivers/incoming-requests");
        if (!res.ok) throw new Error("Failed to fetch requests");
        const data = await res.json();
        setIncomingRequests(data);
      } catch (err) {
        console.error("Error fetching requests:", err);
      }
    };

    if (isOnline) {
      fetchRequests();
      const interval = setInterval(fetchRequests, 5000); // Refresh every 5s
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // Request countdown timer
  useEffect(() => {
    if (!selectedRequest) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setSelectedRequest(null);
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [selectedRequest]);

  // Toggle online/offline status
  const handleToggleStatus = useCallback(async () => {
    try {
      if (!driverProfile) return;

      if (isOnline) {
        await goOffline();
        setIsOnline(false);
      } else {
        // Get current location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(async (position) => {
            await goOnline(position.coords.latitude, position.coords.longitude);
            setIsOnline(true);
          });
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update status");
    }
  }, [isOnline, driverProfile, goOnline, goOffline]);

  // Accept ride request
  const handleAcceptRequest = useCallback(
    async (request: IncomingRequest) => {
      try {
        const res = await fetch("/api/drivers/accept-ride", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            rideId: request._id,
            vehicleId: (driverProfile?.vehicle as any)?._id,
          }),
        });

        if (!res.ok) throw new Error("Failed to accept ride");

        // Join Socket room for this ride
        joinRide(request._id, "driver");

        setSelectedRequest(null);
        setCountdown(15);
        setIncomingRequests((prev) => prev.filter((r) => r._id !== request._id));

        // Show success notification
        alert("Ride accepted! Heading to pickup location.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to accept ride");
      }
    },
    [driverProfile, joinRide]
  );

  // Reject ride request
  const handleRejectRequest = useCallback(
    async (request: IncomingRequest) => {
      try {
        const res = await fetch("/api/drivers/reject-ride", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rideId: request._id }),
        });

        if (!res.ok) throw new Error("Failed to reject ride");

        setSelectedRequest(null);
        setCountdown(15);
        setIncomingRequests((prev) => prev.filter((r) => r._id !== request._id));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to reject ride");
      }
    },
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading driver dashboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{driverProfile?.name}</h1>
              <p className="text-gray-600">{driverProfile?.phone}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleToggleStatus}
                variant={isOnline ? "destructive" : "default"}
                size="lg"
                className="rounded-full"
              >
                {isOnline ? "Go Offline" : "Go Online"}
              </Button>
              <Badge variant={isOnline ? "default" : "secondary"}>
                {isOnline ? "Online" : "Offline"}
              </Badge>
            </div>
          </div>

          {/* Rating and Stats */}
          <div className="flex gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{driverProfile?.rating.toFixed(1)}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{driverProfile?.totalRides} Trips</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-gray-600">{driverProfile?.vehicle?.model}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="max-w-4xl mx-auto px-4 py-2 mt-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-red-900">Error</p>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Earnings Card */}
        {earnings && (
          <Card className="p-6 mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              Today's Earnings
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Earned</p>
                <p className="text-3xl font-bold text-green-600">₹{earnings.totalEarnings.toFixed(0)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Trips</p>
                <p className="text-3xl font-bold text-green-600">{earnings.totalRides}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average/Trip</p>
                <p className="text-3xl font-bold text-green-600">₹{earnings.averagePerRide.toFixed(0)}</p>
              </div>
            </div>
          </Card>
        )}

        {/* Incoming Requests */}
        <div className="mb-6">
          <h2 className="text-xl font-bold mb-4">Incoming Requests ({incomingRequests.length})</h2>

          {selectedRequest ? (
            // Selected Request - Full Popup
            <Card className="p-6 border-2 border-blue-500 bg-blue-50 mb-4">
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-semibold">New Ride Request</h3>
                  <div className="text-2xl font-bold text-red-600">{countdown}s</div>
                </div>
                <div className="w-full bg-gray-300 rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${(countdown / 15) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Passenger Info */}
              <div className="bg-white rounded-lg p-4 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-full bg-gray-300"></div>
                  <div>
                    <p className="font-semibold">Rating: {selectedRequest.userRating.toFixed(1)} ⭐</p>
                    <p className="text-sm text-gray-600">Regular Passenger</p>
                  </div>
                </div>

                {/* Route Info */}
                <div className="space-y-3 mb-4">
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Pickup Location</p>
                      <p className="font-semibold">{selectedRequest.pickupAddress}</p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <MapPin className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-gray-500">Dropoff Location</p>
                      <p className="font-semibold">{selectedRequest.dropAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Trip Details */}
                <div className="bg-gray-50 rounded p-3 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Distance</span>
                    <span className="font-semibold">{(selectedRequest.distance / 1000).toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Estimated Fare</span>
                    <span className="font-semibold text-green-600">₹{selectedRequest.fare.toFixed(0)}</span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => handleAcceptRequest(selectedRequest)}
                    className="bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Phone className="w-4 h-4 mr-2" />
                    Accept Ride
                  </Button>
                  <Button
                    onClick={() => handleRejectRequest(selectedRequest)}
                    variant="outline"
                    size="lg"
                  >
                    Decline
                  </Button>
                </div>
              </div>
            </Card>
          ) : incomingRequests.length > 0 ? (
            // List of Requests
            <div className="space-y-3">
              {incomingRequests.map((request) => (
                <Card
                  key={request._id}
                  onClick={() => {
                    setSelectedRequest(request);
                    setCountdown(15);
                  }}
                  className="p-4 cursor-pointer hover:shadow-lg transition-shadow hover:bg-blue-50"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-green-600" />
                        <span className="text-sm text-gray-600 line-clamp-1">{request.pickupAddress}</span>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        <MapPin className="w-4 h-4 text-red-600" />
                        <span className="text-sm text-gray-600 line-clamp-1">{request.dropAddress}</span>
                      </div>
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>{(request.distance / 1000).toFixed(1)} km</span>
                        <span>₹{request.fare.toFixed(0)}</span>
                        <span>⭐ {request.userRating.toFixed(1)}</span>
                      </div>
                    </div>
                    <Badge className="ml-4">Tap to View</Badge>
                  </div>
                </Card>
              ))}
            </div>
          ) : isOnline ? (
            <Card className="p-12 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No incoming requests</p>
              <p className="text-sm">You'll receive requests when riders in your area book rides.</p>
            </Card>
          ) : (
            <Card className="p-12 text-center text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Go online to receive ride requests</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
