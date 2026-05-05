import React, { useState, useEffect } from "react";
import {
  Power,
  MapPin,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  PhoneCall,
  Navigation,
  Star,
  LogOut,
  Settings,
  FileCheck,
  Home,
  DollarSign,
  Users,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  approvalStatus: "pending" | "approved" | "rejected";
  status: "active" | "pending_approval" | "suspended";
  stats: {
    totalRides: number;
    rating: number;
    earnings: number;
    totalEarnings: number;
    acceptanceRate: number;
    cancellationRate: number;
  };
  documents?: {
    license?: string;
    aadhaar?: string;
    profilePhoto?: string;
    rc?: string;
    insurance?: string;
  };
  vehicle?: {
    type: string;
    number: string;
    model: string;
  };
}

interface RideRequest {
  id: string;
  userId: string;
  passengerName: string;
  pickupLocation: string;
  dropLocation: string;
  distance: number;
  estimatedFare: number;
  rating: number;
  createdAt: string;
}

export function DriverDashboard() {
  const [isOnline, setIsOnline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"home" | "requests" | "earnings" | "profile">("home");
  const [profile, setProfile] = useState<DriverProfile | null>(null);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<RideRequest | null>(null);
  const { toast } = useToast();

  // Fetch driver profile
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("driverToken");
      const response = await fetch("/api/driver/profile", {
        headers: {
          Authorization: `Bearer ${token}`,
          "x-driver-id": localStorage.getItem("driverId") || "",
        },
      });

      if (!response.ok) throw new Error("Failed to fetch profile");
      const data = await response.json();
      setProfile(data.driver);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const handleToggleOnline = async () => {
    const newStatus = !isOnline;
    setIsOnline(newStatus);

    try {
      const token = localStorage.getItem("driverToken");
      const response = await fetch("/api/driver/status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-driver-id": localStorage.getItem("driverId") || "",
        },
        body: JSON.stringify({ isOnline: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      toast({
        title: newStatus ? "You're online!" : "You're offline",
        description: newStatus
          ? "Start accepting ride requests"
          : "You won't receive new requests",
      });
    } catch (error: any) {
      setIsOnline(!newStatus);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const token = localStorage.getItem("driverToken");
      const response = await fetch(`/api/driver/accept-ride`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "x-driver-id": localStorage.getItem("driverId") || "",
        },
        body: JSON.stringify({ requestId }),
      });

      if (!response.ok) throw new Error("Failed to accept request");

      toast({
        title: "Request accepted!",
        description: "Navigate to pickup location",
      });

      setSelectedRequest(null);
      setRideRequests(rideRequests.filter((r) => r.id !== requestId));
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setRideRequests(rideRequests.filter((r) => r.id !== requestId));
    setSelectedRequest(null);
    toast({
      title: "Request rejected",
      description: "Looking for more rides for you",
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your profile...</p>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Driver Dashboard</h1>
            <p className="text-gray-600 text-sm">Welcome, {profile.fullName}</p>
          </div>

          {/* Status Toggle */}
          <button
            onClick={handleToggleOnline}
            className={`flex items-center gap-3 px-6 py-3 rounded-full font-bold text-white transition ${
              isOnline
                ? "bg-green-500 hover:bg-green-600"
                : "bg-gray-400 hover:bg-gray-500"
            }`}
          >
            <Power className="w-5 h-5" />
            {isOnline ? "Online" : "Offline"}
          </button>
        </div>
      </div>

      {/* Approval Status Banner */}
      {profile.approvalStatus !== "approved" && (
        <div
          className={`bg-${
            profile.approvalStatus === "pending" ? "yellow" : "red"
          }-50 border-l-4 border-${profile.approvalStatus === "pending" ? "yellow" : "red"}-500 p-4 max-w-7xl mx-auto mt-4`}
        >
          <div className="flex items-center gap-3">
            {profile.approvalStatus === "pending" ? (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600" />
            )}
            <div>
              <p className="font-semibold text-gray-900">
                {profile.approvalStatus === "pending"
                  ? "Pending Approval"
                  : "Application Rejected"}
              </p>
              <p className="text-sm text-gray-600">
                {profile.approvalStatus === "pending"
                  ? "Your documents are being reviewed by our admin team. This usually takes 24-48 hours."
                  : "Your application was rejected. Please contact support for more information."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 border-b">
          {[
            { id: "home", label: "Home", icon: Home },
            { id: "requests", label: "Requests", icon: PhoneCall },
            { id: "earnings", label: "Earnings", icon: DollarSign },
            { id: "profile", label: "Profile", icon: Settings },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition ${
                activeTab === id
                  ? "text-orange-600 border-b-2 border-orange-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {/* HOME TAB */}
        {activeTab === "home" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Stats Cards */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Today's Earnings
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    ₹{profile.stats.earnings}
                  </p>
                </div>
                <DollarSign className="w-10 h-10 text-green-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Total Rides</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {profile.stats.totalRides}
                  </p>
                </div>
                <Navigation className="w-10 h-10 text-blue-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                    <p className="text-2xl font-bold text-gray-900">
                      {profile.stats.rating.toFixed(1)}
                    </p>
                  </div>
                </div>
                <Star className="w-10 h-10 text-yellow-500 opacity-20" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm font-medium">
                    Acceptance Rate
                  </p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {profile.stats.acceptanceRate}%
                  </p>
                </div>
                <TrendingUp className="w-10 h-10 text-purple-500 opacity-20" />
              </div>
            </div>
          </div>
        )}

        {/* REQUESTS TAB */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {!isOnline && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-900 text-sm">
                  You're currently offline. Go online to receive ride requests.
                </p>
              </div>
            )}

            {rideRequests.length === 0 ? (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <PhoneCall className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">
                  {isOnline
                    ? "No incoming requests at the moment"
                    : "Go online to receive requests"}
                </p>
              </div>
            ) : (
              rideRequests.map((request) => (
                <div
                  key={request.id}
                  className="bg-white rounded-lg shadow p-6 cursor-pointer hover:shadow-lg transition"
                  onClick={() => setSelectedRequest(request)}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                        {request.passengerName[0]}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {request.passengerName}
                        </p>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                          {request.rating}
                        </p>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-orange-600">
                      ₹{request.estimatedFare}
                    </p>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-green-600 mt-0.5" />
                      <p className="text-sm text-gray-700">
                        {request.pickupLocation}
                      </p>
                    </div>
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-red-600 mt-0.5" />
                      <p className="text-sm text-gray-700">
                        {request.dropLocation}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAcceptRequest(request.id);
                      }}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-lg transition"
                    >
                      <CheckCircle className="w-4 h-4 inline mr-2" />
                      Accept
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRejectRequest(request.id);
                      }}
                      className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-2 rounded-lg transition"
                    >
                      Decline
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* EARNINGS TAB */}
        {activeTab === "earnings" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">
                  Today's Earnings
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ₹{profile.stats.earnings}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">
                  Weekly Earnings
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ₹{(profile.stats.earnings * 7).toLocaleString()}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-6">
                <p className="text-gray-600 text-sm font-medium">
                  Total Earnings
                </p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  ₹{profile.stats.totalEarnings.toLocaleString()}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Earnings Breakdown
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Net Earnings</p>
                  <p className="font-semibold text-gray-900">
                    ₹{(profile.stats.earnings * 0.8).toFixed(2)}
                  </p>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-gray-600">Platform Commission (20%)</p>
                  <p className="font-semibold text-gray-900">
                    ₹{(profile.stats.earnings * 0.2).toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE TAB */}
        {activeTab === "profile" && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Personal Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 text-sm">Full Name</p>
                  <p className="font-semibold text-gray-900">
                    {profile.fullName}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Email</p>
                  <p className="font-semibold text-gray-900">{profile.email}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Phone</p>
                  <p className="font-semibold text-gray-900">{profile.phone}</p>
                </div>
                <div>
                  <p className="text-gray-600 text-sm">Status</p>
                  <p className="font-semibold text-gray-900">
                    <span
                      className={`px-3 py-1 rounded-full text-sm ${
                        profile.approvalStatus === "approved"
                          ? "bg-green-100 text-green-800"
                          : profile.approvalStatus === "pending"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {profile.approvalStatus.charAt(0).toUpperCase() +
                        profile.approvalStatus.slice(1)}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {profile.vehicle && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">
                  Vehicle Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm">Vehicle Type</p>
                    <p className="font-semibold text-gray-900">
                      {profile.vehicle.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Registration Number</p>
                    <p className="font-semibold text-gray-900">
                      {profile.vehicle.number}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm">Model</p>
                    <p className="font-semibold text-gray-900">
                      {profile.vehicle.model}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">
                Document Status
              </h3>
              <div className="space-y-2">
                {[
                  { name: "License", key: "license" },
                  { name: "Aadhaar", key: "aadhaar" },
                  { name: "RC Book", key: "rc" },
                  { name: "Insurance", key: "insurance" },
                ].map(({ name, key }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between py-2 border-b"
                  >
                    <p className="text-gray-700">{name}</p>
                    <FileCheck className="w-5 h-5 text-green-500" />
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                localStorage.removeItem("driverToken");
                window.location.href = "/";
              }}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                {selectedRequest.passengerName[0]}
              </div>
              <div>
                <p className="font-bold text-lg text-gray-900">
                  {selectedRequest.passengerName}
                </p>
                <p className="text-gray-600 flex items-center gap-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                  {selectedRequest.rating} • {selectedRequest.distance}km away
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-6">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pickup Location</p>
                <p className="font-semibold text-gray-900">
                  {selectedRequest.pickupLocation}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Drop Location</p>
                <p className="font-semibold text-gray-900">
                  {selectedRequest.dropLocation}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-1">Estimated Fare</p>
                <p className="text-2xl font-bold text-orange-600">
                  ₹{selectedRequest.estimatedFare}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setSelectedRequest(null)}
                className="flex-1 border border-gray-300 text-gray-700 hover:bg-gray-50 font-bold py-3 rounded-lg transition"
              >
                Decline
              </button>
              <button
                onClick={() => handleAcceptRequest(selectedRequest.id)}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition"
              >
                Accept Ride
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
