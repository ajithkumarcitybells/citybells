export function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    const reg = await navigator.serviceWorker.register('/sw.js');
    return reg;
  } catch (err) {
    console.error('SW register failed', err);
    return null;
  }
}

export async function subscribeForPush(registration: ServiceWorkerRegistration, vapidPublicKey: string) {
  if (!('pushManager' in registration)) return null;
  try {
    const sub = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });
    return sub;
  } catch (err) {
    console.error('Push subscribe failed', err);
    return null;
  }
}

export async function sendSubscriptionToServer(subscription: PushSubscription) {
  try {
    const res = await fetch('/api/notifications/register-token', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token: JSON.stringify(subscription) })
    });
    return res.ok;
  } catch (err) {
    console.error('sendSubscriptionToServer failed', err);
    return false;
  }
}
