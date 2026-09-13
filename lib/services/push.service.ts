import webpush from 'web-push';
import { getSubscriptionsByUserId, deletePushSubscription } from '../repositories/notifications';

let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
  );
  configured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url: string;
}

export async function sendPushToUser(userId: number, payload: PushPayload): Promise<number> {
  ensureConfigured();

  const subscriptions = getSubscriptionsByUserId(userId);
  const data = JSON.stringify(payload);
  let sent = 0;

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        data
      );
      sent++;
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
        deletePushSubscription(sub.endpoint);
      } else {
        console.error('Failed to send push to', sub.endpoint, err);
      }
    }
  }

  return sent;
}
