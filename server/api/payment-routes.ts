import { Application, Request, Response } from "express";
import { ObjectId } from "mongodb";
import { getDb } from "../db";
import { z } from "zod";
import Razorpay from "razorpay";
import crypto from "crypto";

const createOrderSchema = z.object({
  rideId: z.string(),
  amount: z.number().positive(),
  paymentMethod: z.enum(["card", "upi", "wallet", "cash"]),
});

const verifyPaymentSchema = z.object({
  orderId: z.string(),
  paymentId: z.string(),
  signature: z.string(),
});

const refundSchema = z.object({
  paymentId: z.string(),
  amount: z.number().positive().optional(),
  reason: z.string().optional(),
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_key",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret",
});

export async function registerPaymentRoutes(app: Application) {
  const db = getDb();

  // Middleware to check auth
  const requireAuth = (req: Request, res: Response, next: Function) => {
    const user = (req as any).user;
    if (!user || !user.id) {
      return res.status(401).json({ error: "Authentication required" });
    }
    next();
  };

  // Create payment order (Razorpay order)
  app.post("/api/payments/create-order", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const data = createOrderSchema.parse(req.body);

      // Verify ride exists and belongs to user
      const ride = await db.collection("rides").findOne({ _id: new ObjectId(data.rideId) });
      if (!ride) return res.status(404).json({ error: "Ride not found" });
      if (ride.userId.toString() !== userId) {
        return res.status(403).json({ error: "Unauthorized ride access" });
      }

      // Create Razorpay order
      const options = {
        amount: Math.round(data.amount * 100), // Convert to paise
        currency: "INR",
        receipt: `ride_${data.rideId}`,
        notes: {
          rideId: data.rideId,
          userId: userId,
          paymentMethod: data.paymentMethod,
        },
      };

      const order = await razorpay.orders.create(options);

      // Store payment order in DB
      const paymentOrder = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        rideId: new ObjectId(data.rideId),
        razorpayOrderId: order.id,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        status: "pending",
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiry
      };

      await db.collection("payment_orders").insertOne(paymentOrder);

      res.json({
        orderId: order.id,
        amount: data.amount,
        currency: "INR",
        key: process.env.RAZORPAY_KEY_ID,
        email: ride.userEmail || "",
        name: "Taxi Booking",
        description: `Ride from ${ride.pickupAddress} to ${ride.dropAddress}`,
      });
    } catch (err: any) {
      console.error("Error creating payment order:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Verify payment signature
  app.post("/api/payments/verify", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { orderId, paymentId, signature } = verifyPaymentSchema.parse(req.body);

      // Verify signature
      const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
      shasum.update(`${orderId}|${paymentId}`);
      const digest = shasum.digest("hex");

      if (digest !== signature) {
        return res.status(400).json({ error: "Invalid payment signature" });
      }

      // Get payment order
      const paymentOrder = await db
        .collection("payment_orders")
        .findOne({ razorpayOrderId: orderId });

      if (!paymentOrder) {
        return res.status(404).json({ error: "Payment order not found" });
      }

      if (paymentOrder.userId.toString() !== userId) {
        return res.status(403).json({ error: "Unauthorized payment" });
      }

      // Fetch payment details from Razorpay
      const payment: any = await (razorpay.payments as any).fetch(paymentId);

      // Create payment record
      const paymentRecord = {
        _id: new ObjectId(),
        userId: new ObjectId(userId),
        rideId: paymentOrder.rideId,
        paymentOrderId: paymentOrder._id,
        razorpayPaymentId: paymentId,
        razorpayOrderId: orderId,
        amount: paymentOrder.amount,
        currency: "INR",
        paymentMethod: paymentOrder.paymentMethod,
        status: payment.status === "captured" ? "completed" : payment.status,
        transactionId: paymentId,
        receiptId: payment.receipt,
        description: payment.description,
        gatewayResponse: payment,
        createdAt: new Date(),
      };

      await db.collection("payments").insertOne(paymentRecord);

      // Update payment order
      await db.collection("payment_orders").updateOne(
        { _id: paymentOrder._id },
        { $set: { status: "completed", completedAt: new Date() } }
      );

      // Update ride payment status
      await db.collection("rides").updateOne(
        { _id: paymentOrder.rideId },
        {
          $set: {
            paymentStatus: "completed",
            paymentId: paymentRecord._id,
            paidAt: new Date(),
          },
        }
      );

      res.json({
        success: true,
        paymentId: paymentRecord._id.toString(),
        message: "Payment verified successfully",
      });
    } catch (err: any) {
      console.error("Error verifying payment:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Get payment status
  app.get("/api/payments/:rideId", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { rideId } = req.params;

      const payment = await db.collection("payments").findOne({
        rideId: new ObjectId(rideId),
        userId: new ObjectId(userId),
      });

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      res.json(payment);
    } catch (err: any) {
      console.error("Error fetching payment:", err);
      res.status(500).json({ error: err.message });
    }
  });
  // Create refund
  app.post("/api/payments/refund", requireAuth, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user?.id;
      const { paymentId, amount, reason } = refundSchema.parse(req.body);

      // Get payment
      const payment = await db.collection("payments").findOne({
        razorpayPaymentId: paymentId,
        userId: new ObjectId(userId),
      });

      if (!payment) {
        return res.status(404).json({ error: "Payment not found" });
      }

      // Create refund in Razorpay
      const refundOptions: any = {
        amount: amount ? Math.round(amount * 100) : undefined,
        notes: {
          reason: reason || "",
          userId: userId,
        },
      };

      const refund: any = await (razorpay.payments as any).refund(paymentId, refundOptions);

      // Store refund record
      const refundRecord: any = {
        _id: new ObjectId(),
        paymentId: payment._id,
        rideId: payment.rideId,
        userId: payment.userId,
        razorpayRefundId: refund.id,
        amount: refund.amount ? refund.amount / 100 : amount,
        reason: reason,
        status: refund.status,
        gatewayResponse: refund,
        createdAt: new Date(),
      };

      await db.collection("refunds").insertOne(refundRecord);

      // Update payment status
      await db.collection("payments").updateOne(
        { _id: payment._id },
        {
          $set: {
            refunded: true,
            refundId: refundRecord._id,
            refundStatus: refund.status,
          },
        }
      );

      res.json({
        success: true,
        refundId: refund.id,
        amount: refund.amount ? refund.amount / 100 : amount,
      });
    } catch (err: any) {
      console.error("Error creating refund:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Webhook for Razorpay payment updates
  app.post("/api/payments/webhook", async (req: Request, res: Response) => {
    try {
      const signature = req.headers["x-razorpay-signature"] as string;
      const body = req.rawBody as string;

      // Verify webhook signature
      const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "");
      shasum.update(body);
      const digest = shasum.digest("hex");

      if (digest !== signature) {
        return res.status(400).json({ error: "Invalid webhook signature" });
      }

      const event = JSON.parse(body);

      switch (event.event) {
        case "payment.captured":
          // Payment captured successfully
          await db.collection("payments").updateOne(
            { razorpayPaymentId: event.payload.payment.entity.id },
            { $set: { status: "completed", capturedAt: new Date() } }
          );
          break;

        case "payment.failed":
          // Payment failed
          await db.collection("payments").updateOne(
            { razorpayPaymentId: event.payload.payment.entity.id },
            { $set: { status: "failed", failedAt: new Date() } }
          );
          break;

        case "refund.created":
          // Refund created
          await db.collection("refunds").updateOne(
            { razorpayRefundId: event.payload.refund.entity.id },
            { $set: { status: "initiated", initiatedAt: new Date() } }
          );
          break;

        case "refund.failed":
          // Refund failed
          await db.collection("refunds").updateOne(
            { razorpayRefundId: event.payload.refund.entity.id },
            { $set: { status: "failed", failedAt: new Date() } }
          );
          break;
      }

      res.json({ success: true });
    } catch (err: any) {
      console.error("Error processing webhook:", err);
      res.status(500).json({ error: err.message });
    }
  });

  console.log("[Routes] Payment routes registered");
}
