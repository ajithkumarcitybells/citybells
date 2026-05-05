import type { Express } from "express";
import { z } from "zod";
import { requireAdmin } from "./auth";
import { storage } from "./storage";
import { invalidateHubCache, resolveDeliveryLocation } from "./location-service";
import { insertDeliveryHubSchema, generateId } from "@shared/schema";

const locationValidationSchema = z.union([
  z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  z.object({
    pincode: z.string(),
  }),
]);

const updateDeliveryHubSchema = insertDeliveryHubSchema.partial();

export function registerLocationRoutes(app: Express) {
  app.post("/api/location/validate", async (req, res) => {
    try {
      const parsed = locationValidationSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Provide either lat/lng or a pincode" });
      }

      const validation = await resolveDeliveryLocation(parsed.data);
      if ("pincode" in parsed.data && !validation.pincode) {
        return res.status(400).json({ message: "Pincode must be 6 digits" });
      }

      res.json(validation);
    } catch (error) {
      console.error("Location validation error:", error);
      res.status(500).json({ message: "Failed to validate delivery location" });
    }
  });

  app.get("/api/admin/delivery-hubs", requireAdmin, async (_req, res) => {
    try {
      const hubs = await storage.getDeliveryHubs();
      res.json(hubs);
    } catch (error) {
      console.error("Fetch delivery hubs error:", error);
      res.status(500).json({ message: "Failed to fetch delivery hubs" });
    }
  });

  app.post("/api/admin/delivery-hubs", requireAdmin, async (req, res) => {
    try {
      const parsed = insertDeliveryHubSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid delivery hub" });
      }

      const existingHub = await storage.getDeliveryHubByPincode(parsed.data.pincode);
      if (existingHub) {
        return res.status(400).json({ message: "Hub already exists for this pincode" });
      }

      const hub = await storage.createDeliveryHub({
        _id: generateId("hub"),
        ...parsed.data,
      });

      await invalidateHubCache(hub.pincode);
      res.status(201).json(hub);
    } catch (error) {
      console.error("Create delivery hub error:", error);
      res.status(500).json({ message: "Failed to create delivery hub" });
    }
  });

  app.patch("/api/admin/delivery-hubs/:id", requireAdmin, async (req, res) => {
    try {
      const parsed = updateDeliveryHubSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.errors[0]?.message || "Invalid delivery hub update" });
      }

      const existingHub = await storage.getDeliveryHub(req.params.id);
      if (!existingHub) {
        return res.status(404).json({ message: "Delivery hub not found" });
      }

      if (parsed.data.pincode && parsed.data.pincode !== existingHub.pincode) {
        const duplicateHub = await storage.getDeliveryHubByPincode(parsed.data.pincode);
        if (duplicateHub) {
          return res.status(400).json({ message: "Hub already exists for this pincode" });
        }
      }

      const updatedHub = await storage.updateDeliveryHub(req.params.id, parsed.data);
      if (!updatedHub) {
        return res.status(404).json({ message: "Delivery hub not found" });
      }

      await invalidateHubCache(existingHub.pincode);
      await invalidateHubCache(updatedHub.pincode);
      res.json(updatedHub);
    } catch (error) {
      console.error("Update delivery hub error:", error);
      res.status(500).json({ message: "Failed to update delivery hub" });
    }
  });

  app.delete("/api/admin/delivery-hubs/:id", requireAdmin, async (req, res) => {
    try {
      const existingHub = await storage.getDeliveryHub(req.params.id);
      if (!existingHub) {
        return res.status(404).json({ message: "Delivery hub not found" });
      }

      await storage.deleteDeliveryHub(req.params.id);
      await invalidateHubCache(existingHub.pincode);
      res.sendStatus(204);
    } catch (error) {
      console.error("Delete delivery hub error:", error);
      res.status(500).json({ message: "Failed to delete delivery hub" });
    }
  });
}