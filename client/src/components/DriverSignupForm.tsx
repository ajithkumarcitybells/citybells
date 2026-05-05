import React, { useState } from "react";
import {
  ChevronRight,
  Upload,
  Loader2,
  FileText,
  Car,
  CreditCard,
  User,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverSignupProps {
  onSuccess: (driver: any, token: string) => void;
}

type SignupStep = 1 | 2 | 3 | 4;

export function DriverSignupForm({ onSuccess }: DriverSignupProps) {
  const [step, setStep] = useState<SignupStep>(1);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Step 1: Personal Details
  const [personalData, setPersonalData] = useState({
    fullName: "",
    mobile: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  // Step 2: Verification Documents
  const [verificationData, setVerificationData] = useState({
    licenseNumber: "",
    licenseFile: null as File | null,
    aadhaarNumber: "",
    aadhaarFile: null as File | null,
    profilePhotoFile: null as File | null,
  });

  // Step 3: Vehicle Details
  const [vehicleData, setVehicleData] = useState({
    vehicleType: "",
    vehicleNumber: "",
    vehicleModel: "",
    rcFile: null as File | null,
    insuranceFile: null as File | null,
  });

  // Step 4: Bank Details
  const [bankData, setBankData] = useState({
    accountHolder: "",
    accountNumber: "",
    ifscCode: "",
    upiId: "",
  });

  const uploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch("/api/upload/driver-documents", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const data = await response.json();
      return data.url;
    } catch (error) {
      throw new Error("Failed to upload file");
    }
  };

  const handlePersonalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (personalData.password !== personalData.confirmPassword) {
      toast({
        title: "Error",
        description: "Passwords don't match",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/driver/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: personalData.fullName,
          phone: personalData.mobile,
          email: personalData.email,
          password: personalData.password,
          confirmPassword: personalData.confirmPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Registration failed");
      }

      localStorage.setItem("driverToken", data.token);
      localStorage.setItem("driverId", data.driver.id);

      toast({
        title: "Personal details saved!",
        description: "Let's verify your documents",
      });

      setStep(2);
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

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !verificationData.licenseFile ||
      !verificationData.aadhaarFile ||
      !verificationData.profilePhotoFile
    ) {
      toast({
        title: "Error",
        description: "Please upload all required documents",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const [licenseUrl, aadhaarUrl, profileUrl] = await Promise.all([
        uploadFile(verificationData.licenseFile),
        uploadFile(verificationData.aadhaarFile),
        uploadFile(verificationData.profilePhotoFile),
      ]);

      const token = localStorage.getItem("driverToken");
      const response = await fetch("/api/driver/verify-documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-driver-id": localStorage.getItem("driverId") || "",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          licenseNumber: verificationData.licenseNumber,
          aadhaarNumber: verificationData.aadhaarNumber,
          licenseUrl,
          aadhaarUrl,
          profilePhotoUrl: profileUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed");
      }

      toast({
        title: "Documents verified!",
        description: "Now let's add your vehicle details",
      });

      setStep(3);
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

  const handleVehicleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vehicleData.rcFile || !vehicleData.insuranceFile) {
      toast({
        title: "Error",
        description: "Please upload RC and Insurance documents",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const [rcUrl, insuranceUrl] = await Promise.all([
        uploadFile(vehicleData.rcFile),
        uploadFile(vehicleData.insuranceFile),
      ]);

      const token = localStorage.getItem("driverToken");
      const response = await fetch("/api/driver/vehicle-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-driver-id": localStorage.getItem("driverId") || "",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vehicleType: vehicleData.vehicleType,
          vehicleNumber: vehicleData.vehicleNumber,
          vehicleModel: vehicleData.vehicleModel,
          rcUrl,
          insuranceUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Vehicle details submission failed");
      }

      toast({
        title: "Vehicle details saved!",
        description: "Finally, let's add your bank details",
      });

      setStep(4);
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

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsLoading(true);

    try {
      const token = localStorage.getItem("driverToken");
      const response = await fetch("/api/driver/bank-details", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-driver-id": localStorage.getItem("driverId") || "",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bankData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Bank details submission failed");
      }

      toast({
        title: "Signup complete!",
        description: "Your application has been submitted for verification",
      });

      // Clear storage and redirect
      const driverId = localStorage.getItem("driverId");
      localStorage.removeItem("driverId");

      onSuccess(
        { id: driverId, ...personalData },
        token || ""
      );
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

  const FileUploadArea = ({
    label,
    file,
    onChange,
    accept = "image/*,.pdf",
    hint,
  }: {
    label: string;
    file: File | null;
    onChange: (file: File) => void;
    accept?: string;
    hint?: string;
  }) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-white/80">{label}</label>
      <div
        className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-white/40 transition"
        onClick={() => document.getElementById(`file-${label}`)?.click()}
      >
        <Upload className="w-8 h-8 text-white/40 mx-auto mb-2" />
        {file ? (
          <div>
            <p className="text-white font-medium">{file.name}</p>
            <p className="text-white/50 text-sm">Click to change</p>
          </div>
        ) : (
          <div>
            <p className="text-white/70">Drag and drop or click to upload</p>
            {hint && <p className="text-white/50 text-xs mt-1">{hint}</p>}
          </div>
        )}
      </div>
      <input
        id={`file-${label}`}
        type="file"
        accept={accept}
        onChange={(e) => e.target.files?.[0] && onChange(e.target.files[0])}
        className="hidden"
      />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-1 flex-1 rounded-full transition ${
              s <= step ? "bg-orange-500" : "bg-white/10"
            }`}
          />
        ))}
      </div>

      {/* Step Indicator */}
      <div>
        <h3 className="text-lg font-bold text-white">
          {step === 1 && "Personal Details"}
          {step === 2 && "Document Verification"}
          {step === 3 && "Vehicle Details"}
          {step === 4 && "Bank Details"}
        </h3>
        <p className="text-white/60 text-sm">Step {step} of 4</p>
      </div>

      {/* STEP 1: Personal Details */}
      {step === 1 && (
        <form onSubmit={handlePersonalSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={personalData.fullName}
              onChange={(e) =>
                setPersonalData({ ...personalData, fullName: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Mobile Number
            </label>
            <input
              type="tel"
              value={personalData.mobile}
              onChange={(e) =>
                setPersonalData({
                  ...personalData,
                  mobile: e.target.value.slice(0, 10),
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="9876543210"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={personalData.email}
              onChange={(e) =>
                setPersonalData({ ...personalData, email: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="john@example.com"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Password
            </label>
            <input
              type="password"
              value={personalData.password}
              onChange={(e) =>
                setPersonalData({ ...personalData, password: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Confirm Password
            </label>
            <input
              type="password"
              value={personalData.confirmPassword}
              onChange={(e) =>
                setPersonalData({
                  ...personalData,
                  confirmPassword: e.target.value,
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            Continue <ChevronRight className="w-4 h-4" />
          </button>
        </form>
      )}

      {/* STEP 2: Document Verification */}
      {step === 2 && (
        <form onSubmit={handleVerificationSubmit} className="space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-blue-200 text-sm">
              Upload clear, colored copies of your documents. Files must be
              under 5MB.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Driving License Number
            </label>
            <input
              type="text"
              value={verificationData.licenseNumber}
              onChange={(e) =>
                setVerificationData({
                  ...verificationData,
                  licenseNumber: e.target.value,
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="DL123456"
              required
            />
          </div>

          <FileUploadArea
            label="Driving License"
            file={verificationData.licenseFile}
            onChange={(file) =>
              setVerificationData({ ...verificationData, licenseFile: file })
            }
            accept="image/*,.pdf"
            hint="Front and back side of driving license"
          />

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Aadhaar Number
            </label>
            <input
              type="text"
              value={verificationData.aadhaarNumber}
              onChange={(e) =>
                setVerificationData({
                  ...verificationData,
                  aadhaarNumber: e.target.value.slice(0, 12),
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="123456789012"
              required
            />
          </div>

          <FileUploadArea
            label="Aadhaar Copy"
            file={verificationData.aadhaarFile}
            onChange={(file) =>
              setVerificationData({ ...verificationData, aadhaarFile: file })
            }
            accept="image/*,.pdf"
            hint="Front side of Aadhaar card"
          />

          <FileUploadArea
            label="Profile Photo"
            file={verificationData.profilePhotoFile}
            onChange={(file) =>
              setVerificationData({
                ...verificationData,
                profilePhotoFile: file,
              })
            }
            accept="image/*"
            hint="Clear headshot with white background"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 3: Vehicle Details */}
      {step === 3 && (
        <form onSubmit={handleVehicleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Vehicle Type
            </label>
            <select
              value={vehicleData.vehicleType}
              onChange={(e) =>
                setVehicleData({ ...vehicleData, vehicleType: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white outline-none focus:border-white/40"
              required
            >
              <option value="">Select vehicle type</option>
              <option value="auto">Auto Rickshaw</option>
              <option value="sedan">Sedan</option>
              <option value="suv">SUV</option>
              <option value="bike">Bike</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Vehicle Number
            </label>
            <input
              type="text"
              value={vehicleData.vehicleNumber}
              onChange={(e) =>
                setVehicleData({
                  ...vehicleData,
                  vehicleNumber: e.target.value.toUpperCase(),
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="KA01AB1234"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Vehicle Model
            </label>
            <input
              type="text"
              value={vehicleData.vehicleModel}
              onChange={(e) =>
                setVehicleData({ ...vehicleData, vehicleModel: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="2020 Honda City"
              required
            />
          </div>

          <FileUploadArea
            label="RC Book"
            file={vehicleData.rcFile}
            onChange={(file) =>
              setVehicleData({ ...vehicleData, rcFile: file })
            }
            accept="image/*,.pdf"
            hint="Registration Certificate"
          />

          <FileUploadArea
            label="Insurance Certificate"
            file={vehicleData.insuranceFile}
            onChange={(file) =>
              setVehicleData({ ...vehicleData, insuranceFile: file })
            }
            accept="image/*,.pdf"
            hint="Valid insurance document"
          />

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-1 border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-yellow-400 to-orange-500 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Continue <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      )}

      {/* STEP 4: Bank Details */}
      {step === 4 && (
        <form onSubmit={handleBankSubmit} className="space-y-4">
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 flex gap-3">
            <CreditCard className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-200 text-sm">
              Your earnings will be transferred to this bank account.
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Account Holder Name
            </label>
            <input
              type="text"
              value={bankData.accountHolder}
              onChange={(e) =>
                setBankData({ ...bankData, accountHolder: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="John Doe"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              Account Number
            </label>
            <input
              type="text"
              value={bankData.accountNumber}
              onChange={(e) =>
                setBankData({
                  ...bankData,
                  accountNumber: e.target.value,
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="1234567890"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              IFSC Code
            </label>
            <input
              type="text"
              value={bankData.ifscCode}
              onChange={(e) =>
                setBankData({
                  ...bankData,
                  ifscCode: e.target.value.toUpperCase(),
                })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="SBIN0001234"
              required
            />
          </div>

          <div>
            <label className="text-sm font-medium text-white/80 block mb-2">
              UPI ID
            </label>
            <input
              type="text"
              value={bankData.upiId}
              onChange={(e) =>
                setBankData({ ...bankData, upiId: e.target.value })
              }
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-white/40 outline-none focus:border-white/40"
              placeholder="john.doe@upi"
              required
            />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg p-4">
            <h4 className="text-white font-semibold mb-2">
              Terms & Conditions
            </h4>
            <p className="text-white/60 text-sm">
              I agree to the terms and conditions and privacy policy. I confirm
              that the information provided is accurate and complete.
            </p>
            <label className="flex items-center gap-3 mt-3 text-white/70">
              <input type="checkbox" required className="w-4 h-4 rounded" />
              I accept all terms and conditions
            </label>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 border border-white/20 text-white font-bold py-3 rounded-lg hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-green-400 to-green-600 text-white font-bold py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              Submit Application
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
