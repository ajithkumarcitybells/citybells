import React, { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  AlertCircle,
  Download,
  Search,
  Filter,
  Eye,
  User,
  Phone,
  Mail,
  Car,
  FileCheck,
  Clock,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverRegistration {
  _id: string;
  fullName: string;
  email: string;
  phone: string;
  approvalStatus: "pending" | "approved" | "rejected";
  documents: {
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
  verification?: {
    licenseNumber?: string;
    aadhaarNumber?: string;
  };
  createdAt: string;
}

export default function AdminDriverManagement() {
  const [drivers, setDrivers] = useState<DriverRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "approved" | "rejected">(
    "pending"
  );
  const [selectedDriver, setSelectedDriver] = useState<DriverRegistration | null>(null);
  const [showDocuments, setShowDocuments] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchDrivers();
  }, [filterStatus]);

  const fetchDrivers = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("adminToken");
      const response = await fetch(
        `/api/admin/drivers?status=${filterStatus}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) throw new Error("Failed to fetch drivers");
      const data = await response.json();
      setDrivers(data.drivers || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApprove = async (driverId: string) => {
    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/drivers/${driverId}/approve`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
      });

      if (!response.ok) throw new Error("Failed to approve driver");

      toast({
        title: "Driver approved!",
        description: "Approval email has been sent",
      });

      setSelectedDriver(null);
      fetchDrivers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleReject = async (driverId: string) => {
    if (!rejectReason) {
      toast({
        title: "Error",
        description: "Please provide a rejection reason",
        variant: "destructive",
      });
      return;
    }

    try {
      const token = localStorage.getItem("adminToken");
      const response = await fetch(`/api/admin/drivers/${driverId}/reject`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason: rejectReason }),
      });

      if (!response.ok) throw new Error("Failed to reject driver");

      toast({
        title: "Driver rejected",
        description: "Rejection reason has been sent",
      });

      setSelectedDriver(null);
      setRejectReason("");
      fetchDrivers();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone.includes(searchTerm)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading drivers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Driver Management</h2>
          <p className="text-gray-600 text-sm">
            Review and approve driver applications
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border">
          <Search className="w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="outline-none w-64"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2">
        {[
          { label: "Pending Review", value: "pending", color: "yellow" },
          { label: "Approved", value: "approved", color: "green" },
          { label: "Rejected", value: "rejected", color: "red" },
        ].map(({ label, value, color }) => (
          <button
            key={value}
            onClick={() =>
              setFilterStatus(value as "pending" | "approved" | "rejected")
            }
            className={`px-4 py-2 rounded-lg font-medium transition ${
              filterStatus === value
                ? `bg-${color}-500 text-white`
                : `bg-${color}-50 text-${color}-700 hover:bg-${color}-100`
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Drivers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDrivers.map((driver) => (
          <div
            key={driver._id}
            className="bg-white rounded-lg shadow hover:shadow-lg transition cursor-pointer overflow-hidden"
            onClick={() => setSelectedDriver(driver)}
          >
            {/* Status Badge */}
            <div
              className={`h-1 ${
                driver.approvalStatus === "pending"
                  ? "bg-yellow-500"
                  : driver.approvalStatus === "approved"
                  ? "bg-green-500"
                  : "bg-red-500"
              }`}
            ></div>

            <div className="p-6">
              {/* Avatar & Name */}
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold">
                  {driver.fullName[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900">{driver.fullName}</p>
                  <p className="text-xs text-gray-500">
                    {driver.approvalStatus.charAt(0).toUpperCase() +
                      driver.approvalStatus.slice(1)}
                  </p>
                </div>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Phone className="w-4 h-4" />
                  {driver.phone}
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Mail className="w-4 h-4" />
                  {driver.email}
                </div>
              </div>

              {/* Vehicle Info */}
              {driver.vehicle && (
                <div className="flex items-center gap-2 text-sm text-gray-600 mb-4">
                  <Car className="w-4 h-4" />
                  {driver.vehicle.type} - {driver.vehicle.number}
                </div>
              )}

              {/* Document Status */}
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                <FileCheck className="w-4 h-4" />
                Documents:
                {Object.values(driver.documents || {}).filter(Boolean).length} /
                5
              </div>

              {/* Action Button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedDriver(driver);
                }}
                className="w-full bg-orange-50 text-orange-600 hover:bg-orange-100 font-medium py-2 rounded-lg transition flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" />
                View Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredDrivers.length === 0 && (
        <div className="text-center py-12">
          <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600">No drivers found</p>
        </div>
      )}

      {/* Driver Details Modal */}
      {selectedDriver && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-screen overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-6 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900">
                {selectedDriver.fullName}
              </h3>
              <button
                onClick={() => setSelectedDriver(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Personal Info */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">
                  Personal Information
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Full Name</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.fullName}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Email</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.email}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.phone}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Applied On</p>
                    <p className="font-semibold text-gray-900">
                      {new Date(selectedDriver.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Verification Details */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">
                  Verification Details
                </h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">License Number</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.verification?.licenseNumber || "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Aadhaar Number</p>
                    <p className="font-semibold text-gray-900">
                      {selectedDriver.verification?.aadhaarNumber
                        ? `****${selectedDriver.verification.aadhaarNumber.slice(-4)}`
                        : "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vehicle Info */}
              {selectedDriver.vehicle && (
                <div>
                  <h4 className="font-bold text-gray-900 mb-3">
                    Vehicle Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-gray-600">Type</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDriver.vehicle.type}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Registration</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDriver.vehicle.number}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-600">Model</p>
                      <p className="font-semibold text-gray-900">
                        {selectedDriver.vehicle.model}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Documents */}
              <div>
                <h4 className="font-bold text-gray-900 mb-3">
                  Uploaded Documents
                </h4>
                <div className="space-y-2">
                  {[
                    { name: "Driving License", key: "license" },
                    { name: "Aadhaar", key: "aadhaar" },
                    { name: "Profile Photo", key: "profilePhoto" },
                    { name: "RC Book", key: "rc" },
                    { name: "Insurance", key: "insurance" },
                  ].map(({ name, key }) => {
                    const url =
                      selectedDriver.documents[
                        key as keyof typeof selectedDriver.documents
                      ];
                    return (
                      <div
                        key={key}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-gray-700">{name}</span>
                        {url ? (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-orange-600 hover:text-orange-700 flex items-center gap-1"
                          >
                            <Download className="w-4 h-4" />
                            View
                          </a>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Not uploaded
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              {selectedDriver.approvalStatus === "pending" && (
                <div className="space-y-4 pt-6 border-t">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Rejection Reason (if rejecting)
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Enter reason for rejection (optional)"
                      className="w-full mt-2 p-3 border border-gray-300 rounded-lg outline-none focus:border-orange-500"
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={() => handleReject(selectedDriver._id)}
                      className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <XCircle className="w-4 h-4" />
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(selectedDriver._id)}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Approve
                    </button>
                  </div>
                </div>
              )}

              {selectedDriver.approvalStatus !== "pending" && (
                <div
                  className={`p-4 rounded-lg ${
                    selectedDriver.approvalStatus === "approved"
                      ? "bg-green-50 border border-green-200"
                      : "bg-red-50 border border-red-200"
                  }`}
                >
                  <p
                    className={
                      selectedDriver.approvalStatus === "approved"
                        ? "text-green-700"
                        : "text-red-700"
                    }
                  >
                    Status:{" "}
                    <span className="font-bold">
                      {selectedDriver.approvalStatus === "approved"
                        ? "Approved"
                        : "Rejected"}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
