import { getDb, newId } from "./db";
import { storage } from "./storage";
import webpush from 'web-push';

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@example.com';
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC, VAPID_PRIVATE);
  } catch (err) {
    console.error('Failed to set VAPID details for web-push', err);
  }
}

type NotificationPayload = {
  title: string;
  description?: string;
  meta?: Record<string, any>;
};

async function insertNotification(userId: string, payload: NotificationPayload & { type?: string; relatedId?: string }) {
  const db = getDb();
  const doc: any = {
    _id: newId() as any,
    userId,
    title: payload.title,
    description: payload.description || null,
    type: payload.type || null,
    relatedId: payload.relatedId || null,
    meta: payload.meta || null,
    createdAt: new Date(),
    read: false,
    status: 'pending',
    lastAttemptAt: null,
    retryCount: 0,
  };
  await db.collection("notifications").insertOne(doc);
  return doc;
}

async function sendPush(userId: string, payload: any) {
  // Prefer FCM if server key provided and user has push tokens
  try {
    const user = await storage.getUser(userId);
    if (!user) return;
    const prefs = (user as any).notificationPreferences || {};
    if (prefs.push === false) return;
    const tokens: string[] = (user as any).pushTokens || [];

    // Try Web Push (VAPID) for browser subscriptions stored as JSON
    if (VAPID_PRIVATE && tokens.length > 0) {
      let anySent = false;
      for (const token of tokens) {
        let subObj: any = null;
        if (typeof token === 'string') {
          try { subObj = JSON.parse(token); } catch (e) { subObj = null; }
        } else {
          subObj = token;
        }

        if (subObj && subObj.endpoint) {
          try {
            await webpush.sendNotification(subObj, JSON.stringify({ title: payload.title || 'Notification', description: payload.description || '', meta: payload.meta || {} }));
            anySent = true;
          } catch (err: any) {
            console.error('webpush send error:', err);
            // remove stale subscriptions
            const status = err?.statusCode || err?.status;
            if (status === 410 || status === 404) {
              try {
                await getDb().collection('users').updateOne({ _id: (user as any)._id as any }, { $pull: { pushTokens: token } } as any);
              } catch (e) {
                console.error('Failed to remove stale push token', e);
              }
            }
          }
        }
      }
      if (anySent) return true;
    }

    // Fallbacks: try FCM if configured and tokens look like FCM tokens
    const fcmKey = process.env.FCM_SERVER_KEY;
    const fcmTokens = tokens.filter(t => typeof t === 'string' && !t.startsWith('{')) as string[];
    if (fcmTokens.length > 0 && fcmKey) {
      const body = {
        registration_ids: fcmTokens,
        notification: { title: payload.title || 'Notification', body: payload.description || undefined },
        data: payload.meta || {},
      };
      try {
        const res = await fetch('https://fcm.googleapis.com/fcm/send', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `key=${fcmKey}` }, body: JSON.stringify(body) });
        return res.ok;
      } catch (err) {
        console.error('FCM send error:', err);
      }
    }

    // Last-resort: generic webhook
    const url = process.env.PUSH_WEBHOOK_URL;
    if (url) {
      try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId, payload }) });
        return res.ok;
      } catch (err) {
        console.error('push webhook error:', err);
      }
    }
    return false;
  } catch (err) {
    console.error("sendPush error:", err);
    return false;
  }
}

async function sendSms(phone: string | null, message: string) {
  if (!phone) return;

  // If Twilio configured, use it. Otherwise fallback to SMS_WEBHOOK_URL if provided.
  const TW_SID = process.env.TWILIO_ACCOUNT_SID;
  const TW_TOKEN = process.env.TWILIO_AUTH_TOKEN;
  const TW_FROM = process.env.TWILIO_FROM;
  if (TW_SID && TW_TOKEN && TW_FROM) {
    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`;
      const body = new URLSearchParams({ From: TW_FROM, To: phone, Body: message });
      const res = await fetch(url, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${TW_SID}:${TW_TOKEN}`).toString("base64")}` }, body });
      return res.ok;
    } catch (err) {
      console.error("Twilio send error:", err);
    }
  }

  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) return;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: phone, message }),
    });
    return res.ok;
  } catch (err) {
    console.error("sendSms error:", err);
    return false;
  }
}

export async function createAndDispatchNotification(userId: string, type: string, relatedId: string | null, title: string, description?: string, meta?: Record<string, any>) {
  const db = getDb();
  const doc = await insertNotification(userId, { type, relatedId: relatedId || undefined, title, description, meta });

  let anySuccess = false;
  let lastError: any = null;

  try {
    const okPush = await sendPush(userId, { title, description, meta });
    if (okPush) anySuccess = true;
  } catch (err) {
    lastError = err;
  }

  try {
    const user = await storage.getUser(userId);
    if (user && user.phone && ((user as any).notificationPreferences?.sms !== false)) {
      const okSms = await sendSms(user.phone, description || title);
      if (okSms) anySuccess = true;
    }
  } catch (err) {
    lastError = lastError || err;
  }

  const status = anySuccess ? 'sent' : 'failed';
  await db.collection('notifications').updateOne({ _id: doc._id as any }, { $set: { status, lastAttemptAt: new Date(), lastError: lastError ? String(lastError) : null }, $inc: { retryCount: 1 } });

  return { ...doc, status };
}

export default { createAndDispatchNotification };
