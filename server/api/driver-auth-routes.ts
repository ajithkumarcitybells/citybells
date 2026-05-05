import type { Express, Request, Response } from "express";
import { getDb } from "../db";
import { hashPassword, comparePasswords } from "../auth";
import { z } from "zod";
import { ObjectId } from "mongodb";
import nodemailer from "nodemailer";

// Validation schemas
const driverRegisterSchema = z.object({
  fullName: z.string().min(2, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const driverLoginSchema = z.object({
  email: z.string().email("Invalid email").optional(),
  phone: z.string().regex(/^\d{10}$/, "Invalid phone").optional(),
  password: z.string().min(6, "Password required"),
}).refine((data) => data.email || data.phone, {
  message: "Email or phone is required",
});

const otpRequestSchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Invalid phone"),
});

const otpVerifySchema = z.object({
  phone: z.string().regex(/^\d{10}$/, "Invalid phone"),
  otp: z.string().length(6, "OTP must be 6 digits"),
});

const verificationSchema = z.object({
  licenseNumber: z.string().min(5, "License number required"),
  aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
  licenseUrl: z.string().url(),
  aadhaarUrl: z.string().url(),
  profilePhotoUrl: z.string().url(),
});

const vehicleDetailsSchema = z.object({
  vehicleType: z.enum(["auto", "sedan", "suv", "bike"]),
  vehicleNumber: z.string().min(5, "Vehicle number required"),
  vehicleModel: z.string().min(2, "Model required"),
  rcUrl: z.string().url(),
  insuranceUrl: z.string().url(),
});

const bankDetailsSchema = z.object({
  accountHolder: z.string().min(2, "Account holder name required"),
  accountNumber: z.string().regex(/^\d{9,18}$/, "Invalid account number"),
  ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
  upiId: z.string().regex(/^[a-zA-Z0-9._-]+@[a-zA-Z]{3,}$/, "Invalid UPI ID"),
});

// OTP storage (in production use Redis)
const otpStore: Record<string, { code: string; expiresAt: number }> = {};

// Helper to generate OTP
function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Helper to send OTP (mock - use actual SMS provider in production)
async function sendOTP(phone: string, otp: string): Promise<boolean> {
  console.log(`[OTP] Sending OTP ${otp} to ${phone}`);
  // In production: use Twilio, AWS SNS, etc.
  // For testing, just store and return true
  return true;
}

// Generate JWT token
function generateToken(driverId: string, email: string): string {
  const payload = {
    sub: driverId,
    email,
    role: "driver",
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days
  };
  // In production use jsonwebtoken library
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function registerDriverAuthRoutes(app: Express) {
  const db = getDb();

  // POST /api/driver/register - Driver Registration
  app.post("/api/driver/register", async (req: Request, res: Response) => {
    try {
      const data = driverRegisterSchema.parse(req.body);

      // Check if email or phone already exists
      const existingDriver = await db
        .collection("drivers")
        .findOne({
          $or: [{ email: data.email }, { phone: data.phone }],
        });

      if (existingDriver) {
        return res.status(400).json({
          error: "Email or phone number already registered",
        });
      }

      // Hash password
      const passwordHash = await hashPassword(data.password);

      // Create driver document
      const driver = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        passwordHash,
        role: "driver",
        status: "pending", // pending_verification, active, suspended
        approvalStatus: "pending", // pending, approved, rejected
        documents: {
          license: null,
          aadhaar: null,
          profilePhoto: null,
          rc: null,
          insurance: null,
        },
        verification: {
          licenseNumber: null,
          aadhaarNumber: null,
          step: 1, // Current step in multi-step registration
        },
        vehicle: null,
        bankDetails: null,
        location: { lat: null, lng: null },
        stats: {
          totalRides: 0,
          rating: 0,
          earnings: 0,
          totalEarnings: 0,
          acceptanceRate: 100,
          cancellationRate: 0,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await db.collection("drivers").insertOne(driver);

      // Generate token
      const token = generateToken(result.insertedId.toString(), data.email);

      res.status(201).json({
        success: true,
        message: "Registration successful. Please complete verification.",
        driver: {
          id: result.insertedId,
          email: driver.email,
          phone: driver.phone,
          fullName: driver.fullName,
        },
        token,
      });
    } catch (error: any) {
      console.error("Registration error:", error);
      if (error.issues) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Registration failed" });
    }
  });

  // POST /api/driver/login - Driver Login
  app.post("/api/driver/login", async (req: Request, res: Response) => {
    try {
      const data = driverLoginSchema.parse(req.body);

      const query = data.email
        ? { email: data.email }
        : { phone: data.phone };

      const driver = await db.collection("drivers").findOne(query);

      if (!driver) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const passwordMatch = await comparePasswords(
        data.password,
        driver.passwordHash
      );

      if (!passwordMatch) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (driver.status === "suspended") {
        return res.status(403).json({
          error: "Your account has been suspended",
        });
      }

      // Generate token
      const token = generateToken(driver._id.toString(), driver.email);

      // Update last login
      await db
        .collection("drivers")
        .updateOne(
          { _id: driver._id },
          { $set: { lastLogin: new Date() } }
        );

      res.json({
        success: true,
        message: "Login successful",
        driver: {
          id: driver._id,
          email: driver.email,
          phone: driver.phone,
          fullName: driver.fullName,
          approvalStatus: driver.approvalStatus,
          status: driver.status,
        },
        token,
      });
    } catch (error: any) {
      console.error("Login error:", error);
      if (error.issues) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Login failed" });
    }
  });

  // POST /api/driver/request-otp - Request OTP
  app.post("/api/driver/request-otp", async (req: Request, res: Response) => {
    try {
      const data = otpRequestSchema.parse(req.body);

      // Check if phone exists
      const driver = await db
        .collection("drivers")
        .findOne({ phone: data.phone });

      if (!driver) {
        return res.status(404).json({ error: "Phone number not registered" });
      }

      // Generate and send OTP
      const otp = generateOTP();
      const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

      otpStore[data.phone] = { code: otp, expiresAt };
      await sendOTP(data.phone, otp);

      res.json({
        success: true,
        message: "OTP sent successfully",
        // In production, don't return OTP. For testing only:
        otp: process.env.NODE_ENV === "development" ? otp : undefined,
      });
    } catch (error: any) {
      console.error("OTP request error:", error);
      if (error.issues) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "Failed to send OTP" });
    }
  });

  // POST /api/driver/verify-otp - Verify OTP
  app.post("/api/driver/verify-otp", async (req: Request, res: Response) => {
    try {
      const data = otpVerifySchema.parse(req.body);

      const storedOTP = otpStore[data.phone];

      if (!storedOTP) {
        return res
          .status(400)
          .json({ error: "OTP not found. Please request a new one." });
      }

      if (storedOTP.expiresAt < Date.now()) {
        delete otpStore[data.phone];
        return res.status(400).json({ error: "OTP has expired" });
      }

      if (storedOTP.code !== data.otp) {
        return res.status(400).json({ error: "Invalid OTP" });
      }

      // OTP verified, remove it
      delete otpStore[data.phone];

      // Find driver and generate token
      const driver = await db
        .collection("drivers")
        .findOne({ phone: data.phone });

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      const token = generateToken(driver._id.toString(), driver.email);

      res.json({
        success: true,
        message: "OTP verified successfully",
        driver: {
          id: driver._id,
          email: driver.email,
          phone: driver.phone,
          fullName: driver.fullName,
          approvalStatus: driver.approvalStatus,
          status: driver.status,
        },
        token,
      });
    } catch (error: any) {
      console.error("OTP verification error:", error);
      if (error.issues) {
        return res.status(400).json({ error: error.issues[0].message });
      }
      res.status(500).json({ error: "OTP verification failed" });
    }
  });

  // GET /api/driver/profile - Get driver profile
  app.get("/api/driver/profile", async (req: Request, res: Response) => {
    try {
      const driverId = (req as any).user?.id || req.headers["x-driver-id"];

      if (!driverId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const driver = await db
        .collection("drivers")
        .findOne({ _id: new ObjectId(driverId as string) });

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      res.json({
        success: true,
        driver,
      });
    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // POST /api/driver/verify-documents - Submit verification documents
  app.post(
    "/api/driver/verify-documents",
    async (req: Request, res: Response) => {
      try {
        const driverId = (req as any).user?.id || req.headers["x-driver-id"];

        if (!driverId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const data = verificationSchema.parse(req.body);

        const result = await db.collection("drivers").updateOne(
          { _id: new ObjectId(driverId as string) },
          {
            $set: {
              "verification.licenseNumber": data.licenseNumber,
              "verification.aadhaarNumber": data.aadhaarNumber,
              "documents.license": data.licenseUrl,
              "documents.aadhaar": data.aadhaarUrl,
              "documents.profilePhoto": data.profilePhotoUrl,
              "verification.step": 2,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Driver not found" });
        }

        res.json({
          success: true,
          message: "Documents submitted successfully",
        });
      } catch (error: any) {
        console.error("Document verification error:", error);
        if (error.issues) {
          return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(500).json({ error: "Document submission failed" });
      }
    }
  );

  // POST /api/driver/vehicle-details - Submit vehicle details
  app.post(
    "/api/driver/vehicle-details",
    async (req: Request, res: Response) => {
      try {
        const driverId = (req as any).user?.id || req.headers["x-driver-id"];

        if (!driverId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const data = vehicleDetailsSchema.parse(req.body);

        const result = await db.collection("drivers").updateOne(
          { _id: new ObjectId(driverId as string) },
          {
            $set: {
              vehicle: {
                type: data.vehicleType,
                number: data.vehicleNumber,
                model: data.vehicleModel,
                rcUrl: data.rcUrl,
                insuranceUrl: data.insuranceUrl,
              },
              "verification.step": 3,
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Driver not found" });
        }

        res.json({
          success: true,
          message: "Vehicle details saved successfully",
        });
      } catch (error: any) {
        console.error("Vehicle details error:", error);
        if (error.issues) {
          return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(500).json({ error: "Vehicle details submission failed" });
      }
    }
  );

  // POST /api/driver/bank-details - Submit bank details
  app.post(
    "/api/driver/bank-details",
    async (req: Request, res: Response) => {
      try {
        const driverId = (req as any).user?.id || req.headers["x-driver-id"];

        if (!driverId) {
          return res.status(401).json({ error: "Unauthorized" });
        }

        const data = bankDetailsSchema.parse(req.body);

        const result = await db.collection("drivers").updateOne(
          { _id: new ObjectId(driverId as string) },
          {
            $set: {
              bankDetails: {
                accountHolder: data.accountHolder,
                accountNumber: data.accountNumber,
                ifscCode: data.ifscCode,
                upiId: data.upiId,
              },
              "verification.step": 4,
              status: "pending_approval",
              updatedAt: new Date(),
            },
          }
        );

        if (result.matchedCount === 0) {
          return res.status(404).json({ error: "Driver not found" });
        }

        res.json({
          success: true,
          message: "Bank details saved. Awaiting admin approval.",
        });
      } catch (error: any) {
        console.error("Bank details error:", error);
        if (error.issues) {
          return res.status(400).json({ error: error.issues[0].message });
        }
        res.status(500).json({ error: "Bank details submission failed" });
      }
    }
  );

  // PATCH /api/driver/status - Update driver status (online/offline)
  app.patch("/api/driver/status", async (req: Request, res: Response) => {
    try {
      const driverId = (req as any).user?.id || req.headers["x-driver-id"];
      const { isOnline } = req.body;

      if (!driverId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      if (typeof isOnline !== "boolean") {
        return res.status(400).json({ error: "isOnline must be boolean" });
      }

      const result = await db.collection("drivers").updateOne(
        { _id: new ObjectId(driverId as string) },
        {
          $set: {
            onlineStatus: isOnline,
            updatedAt: new Date(),
          },
        }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Driver not found" });
      }

      res.json({
        success: true,
        message: `Driver ${isOnline ? "online" : "offline"}`,
      });
    } catch (error) {
      console.error("Status update error:", error);
      res.status(500).json({ error: "Failed to update status" });
    }
  });

  // GET /api/driver/documents - Get driver documents
  app.get("/api/driver/documents", async (req: Request, res: Response) => {
    try {
      const driverId = (req as any).user?.id || req.headers["x-driver-id"];

      if (!driverId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const driver = await db
        .collection("drivers")
        .findOne(
          { _id: new ObjectId(driverId as string) },
          { projection: { documents: 1, verification: 1 } }
        );

      if (!driver) {
        return res.status(404).json({ error: "Driver not found" });
      }

      res.json({
        success: true,
        documents: driver.documents || {},
        verification: driver.verification || {},
      });
    } catch (error) {
      console.error("Documents fetch error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });
}
