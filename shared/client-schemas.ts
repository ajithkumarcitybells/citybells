import { z } from "zod";

export const insertCategoryAdSchema = z.object({
  categoryId: z.string(),
  image: z.string().url(),
  link: z.string().optional(),
  isActive: z.boolean().default(true),
  sortOrder: z.number().default(0),
});

export type InsertCategoryAd = z.infer<typeof insertCategoryAdSchema>;

export const insertVendorApplicationSchema = z.object({
  userId: z.string(),
  businessName: z.string().min(1),
  businessRegistration: z.string().min(1),
  businessCategory: z.string().min(1),
  description: z.string().min(10),
  phone: z.string().min(10),
  email: z.string().email(),
  address: z.string().min(5),
  lat: z.number(),
  lng: z.number(),
  documents: z.array(z.string()).min(1),
  status: z.enum(["pending", "approved", "rejected"]).default("pending"),
  adminNote: z.string().optional(),
});

export type InsertVendorApplication = z.infer<typeof insertVendorApplicationSchema>;