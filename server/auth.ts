import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import type { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { z } from "zod";
import { storage } from "./storage";
import { taxiStorage } from "./taxi-storage";
import { User as SelectUser } from "@shared/schema";
import { createPhoneOtp, normalizeIndianPhone, phoneRoleSchema, verifyPhoneOtp } from "./phone-otp";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, loginPin, ...safeUser } = user;
  return safeUser;
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user || null);
    } catch (err) {
      done(err);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const { username, password, name, email, phone } = req.body;

      if (!username || !password) {
        return res.status(400).json({ message: "Username and password are required" });
      }

      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters" });
      }

      if (password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      const existingUser = await storage.getUserByUsername(username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser({
        username,
        password: await hashPassword(password),
        name,
        email,
        phone,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (err) {
      console.error("Registration error:", err);
      res.status(500).json({ message: "Registration failed. Please try again." });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: SelectUser | false) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ message: "Login failed. Please try again." });
      }
      if (!user) {
        return res.status(401).json({ message: "Invalid username or password" });
      }
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Session error:", loginErr);
          return res.status(500).json({ message: "Login failed. Please try again." });
        }
        res.status(200).json(sanitizeUser(user));
      });
    })(req, res, next);
  });

  // Driver registration
  app.post("/api/driver/register", async (req, res, next) => {
    try {
      const body = req.body || {};
      const name = body.name;
      const phone = normalizeIndianPhone(body.phone);
      const pin = body.pin;
      const password = body.password;
      const email = body.email;
      // Accept both camelCase and snake_case from clients
      const licenseNumber = (body.licenseNumber || body.license_number || "").toString().trim();
      const vehicleTypeId = (body.vehicleTypeId || body.vehicle_type_id || "").toString().trim();
      const vehicleNumber = (body.vehicleNumber || body.vehicle_number || "").toString().trim();

      // Debug: log which keys arrived and basic presence/length for non-sensitive fields
      try {
        const receivedKeys = Object.keys(body || {});
        console.debug(`[debug] /api/driver/register keys: ${receivedKeys.join(', ')}`);
        console.debug(`[debug] /api/driver/register sample: namePresent=${!!name}, phonePresent=${!!phone}, licenseProvided=${!!licenseNumber}, licenseLen=${licenseNumber.length}, vehicleTypeProvided=${!!vehicleTypeId}, vehicleNumberLen=${vehicleNumber.length}`);
      } catch (e) {
        // ignore debug logging errors
      }

      // TEMP: Log masked raw request body to help debug missing fields (remove after investigation)
      try {
        const maskKeys = ["pin", "password", "loginPin", "token"];
        const maskedBody: any = {};
        for (const k of Object.keys(body || {})) {
          const v = (body as any)[k];
          if (maskKeys.some(mk => k.toLowerCase().includes(mk))) {
            maskedBody[k] = "<masked>";
          } else if (typeof v === 'string') {
            maskedBody[k] = v.length > 200 ? `${v.slice(0, 200)}...` : v;
          } else {
            maskedBody[k] = v;
          }
        }
        console.debug('[debug] /api/driver/register raw body (masked):', maskedBody);
      } catch (e) {
        // ignore
      }

      try {
        console.log("Driver payload:", { phone, licenseNumber, vehicleTypeId });
      } catch (e) {}

      if (!phone || phone.length !== 10) return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
      if (!licenseNumber) return res.status(400).json({ message: "License number is required" });
      if (!vehicleTypeId) return res.status(400).json({ message: "Vehicle type is required" });

      const existingUser = await storage.getUserByPhone(phone, 'driver');
      if (existingUser) return res.status(400).json({ message: "Phone number already registered as a driver. Please login instead." });

      const toHash = pin || password || Math.random().toString(36).slice(-8);
      const hashed = await hashPassword(toHash);
      const user = await storage.createUser({ username: phone, password: hashed, name, email, phone, address: null, role: 'driver' } as any);
      if (pin) await storage.updateUserLoginPin(user.id, hashed);

      // create taxi driver profile
      try {
        await taxiStorage.createTaxiDriver({ userId: user.id, name: name || phone, phone, licenseNumber, vehicleTypeId, vehicleNumber });
      } catch (e) {
        console.error('Failed to create taxi driver profile', e);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const userWithoutPassword = sanitizeUser(user) as any;
        // attach role to response
        (userWithoutPassword as any).role = 'driver';
        res.status(201).json(userWithoutPassword);
      });
    } catch (err) {
      console.error('Driver registration error:', err);
      const message = err instanceof Error && err.message.includes("phone number") ? err.message : 'Registration failed. Please try again.';
      res.status(message.includes("phone number") ? 400 : 500).json({ message });
    }
  });

  // Driver login (phone+pin OR username+password)
  app.post("/api/driver/login", async (req, res, next) => {
    try {
      const { pin, username, password } = req.body;
      const phone = req.body?.phone ? normalizeIndianPhone(req.body.phone) : undefined;
      let user = null as any;
      if (phone && pin) {
        user = await storage.getUserByPhone(phone, 'driver');
        if (!user) return res.status(401).json({ message: 'No account found with this phone number' });
        if (!user.loginPin) return res.status(400).json({ message: 'PIN not set for this account' });
        const ok = await comparePasswords(pin, user.loginPin);
        if (!ok) return res.status(401).json({ message: 'Incorrect PIN' });
      } else if (username && password) {
        user = await storage.getUserByUsername(username);
        if (!user) return res.status(401).json({ message: 'Invalid credentials' });
        const ok = await comparePasswords(password, user.password);
        if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
        if (user.role !== 'driver') {
          return res.status(403).json({ message: 'This account is not registered as a driver' });
        }
      } else {
        return res.status(400).json({ message: 'Invalid login payload' });
      }

      // optional: ensure driver has taxi profile
      const driverProfile = await taxiStorage.getTaxiDriverByUserId(user.id);
      if (!driverProfile) {
        return res.status(403).json({ message: 'Driver profile not found. Please complete driver registration first.' });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        const userWithoutPassword = sanitizeUser(user) as any;
        (userWithoutPassword as any).role = 'driver';
        res.status(200).json(userWithoutPassword);
      });
    } catch (err) {
      console.error('Driver login error:', err);
      res.status(500).json({ message: 'Login failed. Please try again.' });
    }
  });

  app.post("/api/check-phone", async (req, res) => {
    try {
      const phone = normalizeIndianPhone(req.body?.phone);
      // return existence across both roles so UI can decide; include flags per role
      const customer = await storage.getUserByPhone(phone, 'customer');
      const driver = await storage.getUserByPhone(phone, 'driver');
      res.json({ exists: !!(customer || driver), name: (customer?.name || driver?.name) || null, hasPinSet: !!(customer?.loginPin || driver?.loginPin), isCustomer: !!customer, isDriver: !!driver });
    } catch (err) {
      console.error("Phone check error:", err);
      const message = err instanceof Error && err.message.includes("phone number") ? err.message : "Something went wrong. Please try again.";
      res.status(message.includes("phone number") ? 400 : 500).json({ message });
    }
  });

  const requestOtpSchema = z.object({
    phone: z.string(),
    role: phoneRoleSchema.optional(),
  });

  app.post("/api/auth/request-otp", async (req, res) => {
    try {
      const parsed = requestOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Phone number is required" });
      }
      const phone = normalizeIndianPhone(parsed.data.phone);
      const role = parsed.data.role || "customer";

      await createPhoneOtp(phone, role);
      res.json({ success: true, message: "OTP sent" });
    } catch (err: any) {
      const message = err?.message || "Could not send OTP. Please try again.";
      const status = message.includes("Too many") ? 429 : 400;
      res.status(status).json({ message });
    }
  });

  const verifyOtpSchema = z.object({
    phone: z.string(),
    otp: z.string().regex(/^\d{6}$/, "Please enter the 6-digit OTP"),
    role: phoneRoleSchema.optional(),
  });

  app.post("/api/auth/verify-otp", async (req, res, next) => {
    try {
      const parsed = verifyOtpSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid OTP request" });
      }

      const phone = normalizeIndianPhone(parsed.data.phone);
      const role = parsed.data.role || "customer";
      const otpResult = await verifyPhoneOtp(phone, role, parsed.data.otp);
      if (!otpResult.success) {
        return res.status(400).json({ message: otpResult.message || "OTP verification failed" });
      }

      let user = await storage.getUserByPhone(phone, role);
      if (!user && role === "driver") {
        return res.status(404).json({ message: "No driver account found with this phone number. Please register first." });
      }

      if (!user) {
        user = await storage.createUser({
          username: phone,
          password: await hashPassword(randomBytes(24).toString("hex")),
          name: phone,
          phone,
          role: "customer",
        } as any);
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(sanitizeUser(user));
      });
    } catch (err: any) {
      console.error("OTP verification error:", err);
      res.status(500).json({ message: "Login failed. Please try again." });
    }
  });

  app.post("/api/register-phone", async (req, res, next) => {
    try {
      const { pin, name } = req.body;
      const phone = normalizeIndianPhone(req.body?.phone);

      if (!phone || phone.length !== 10) {
        return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
      }
      if (!pin || pin.length < 4 || pin.length > 6) {
        return res.status(400).json({ message: "PIN must be 4-6 digits" });
      }
      if (!/^\d+$/.test(pin)) {
        return res.status(400).json({ message: "PIN must contain only digits" });
      }
      if (!name || name.length < 2) {
        return res.status(400).json({ message: "Name is required" });
      }

      const existingUser = await storage.getUserByPhone(phone, 'customer');
      if (existingUser) {
        return res.status(400).json({ message: "Phone number already registered. Please login instead." });
      }

      const existingUsername = await storage.getUserByUsername(phone);
      if (existingUsername) {
        return res.status(400).json({ message: "Phone number already registered. Please login instead." });
      }

      const hashedPin = await hashPassword(pin);
      const user = await storage.createUser({
        username: phone,
        password: hashedPin,
        name,
        phone,
        role: 'customer',
      });
      await storage.updateUserLoginPin(user.id, hashedPin);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(sanitizeUser(user));
      });
    } catch (err) {
      console.error("Phone registration error:", err);
      const message = err instanceof Error && err.message.includes("phone number") ? err.message : "Registration failed. Please try again.";
      res.status(message.includes("phone number") ? 400 : 500).json({ message });
    }
  });

  app.post("/api/login-phone", async (req, res, next) => {
    try {
      const { pin } = req.body;
      const phone = normalizeIndianPhone(req.body?.phone);

      if (!phone || phone.length !== 10) {
        return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
      }
      if (!pin) {
        return res.status(400).json({ message: "Please enter your PIN" });
      }

      const user = await storage.getUserByPhone(phone, 'customer');
      if (!user) {
        return res.status(401).json({ message: "No account found with this phone number" });
      }

      if (!user.loginPin) {
        return res.status(400).json({ message: "You haven't set a login PIN yet. Please set one first." });
      }

      const isValid = await comparePasswords(pin, user.loginPin);
      if (!isValid) {
        return res.status(401).json({ message: "Incorrect PIN. Please try again." });
      }

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(sanitizeUser(user));
      });
    } catch (err) {
      console.error("Phone login error:", err);
      const message = err instanceof Error && err.message.includes("phone number") ? err.message : "Login failed. Please try again.";
      res.status(message.includes("phone number") ? 400 : 500).json({ message });
    }
  });

  app.post("/api/set-pin", async (req, res, next) => {
    try {
      const { pin } = req.body;
      const phone = normalizeIndianPhone(req.body?.phone);

      if (!phone || phone.length !== 10) {
        return res.status(400).json({ message: "Please enter a valid 10-digit phone number" });
      }
      if (!pin || pin.length < 4 || pin.length > 6) {
        return res.status(400).json({ message: "PIN must be 4-6 digits" });
      }
      if (!/^\d+$/.test(pin)) {
        return res.status(400).json({ message: "PIN must contain only digits" });
      }

      const user = await storage.getUserByPhone(phone, 'customer');
      if (!user) {
        return res.status(404).json({ message: "No account found with this phone number" });
      }

      if (user.loginPin) {
        return res.status(400).json({ message: "PIN already set. Please login with your PIN." });
      }

      const hashedPin = await hashPassword(pin);
      await storage.updateUserLoginPin(user.id, hashedPin);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json(sanitizeUser(user));
      });
    } catch (err) {
      console.error("Set PIN error:", err);
      const message = err instanceof Error && err.message.includes("phone number") ? err.message : "Failed to set PIN. Please try again.";
      res.status(message.includes("phone number") ? 400 : 500).json({ message });
    }
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    res.json(sanitizeUser(req.user!));
  });

  app.patch("/api/user/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Please login to continue" });
    }
    try {
      const { name, email, phone } = req.body;
      const updatedUser = await storage.updateUserProfile(req.user!.id, { name, email, phone });
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(sanitizeUser(updatedUser));
    } catch (error) {
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  app.patch("/api/user/password", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Please login to continue" });
    }
    try {
      const { currentPassword, newPassword } = req.body;
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const isValid = await comparePasswords(currentPassword, user.password);
      if (!isValid) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const hashedPassword = await hashPassword(newPassword);
      await storage.updateUserPassword(req.user!.id, hashedPassword);
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to change password" });
    }
  });
}

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Please login to continue" });
  }
  next();
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Please login to continue" });
  }
  if (!req.user?.isAdmin) {
    return res.status(403).json({ message: "Access denied" });
  }
  next();
}

export function requireVendor(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: "Please login to continue" });
  }
  if (!req.user?.isVendor) {
    return res.status(403).json({ message: "Vendor access required" });
  }
  next();
}

export function requirePartner(type: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Please login to continue" });
    }
    if (!req.user?.isVendor || req.user?.partnerType !== type) {
      return res.status(403).json({ message: `${type} partner access required` });
    }
    next();
  };
}
