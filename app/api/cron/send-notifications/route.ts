import { NextResponse } from 'next/server';
import webpush from 'web-push';
import { validateAdminToken } from '@/lib/utils/tokens';
import {
  getAllSubscriptions,
  wasNotificationSent,
  logNotificationSent,
  getUserPickCountForWeek,
  NotificationType,
} from '@/lib/repositories/notifications';
import { getUserById } from '@/lib/repositories/users';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';
import db from '@/lib/db';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

const THRESHOLDS: Array<{ type: NotificationType; hoursBeforeGame: number; label: string }> = [
  { type: '2days',  hoursBeforeGame: 48, label: '2 days' },
  { type: '1day',   hoursBeforeGame: 24, label: '1 day' },
  { type: '2hours', hoursBeforeGame: 2,  label: '2 hours' },
  { type: '1hour',  hoursBeforeGame: 1,  label: '1 hour' },
];

function getFirstGameOfCurrentWeek(
  seasonYear: number,
  seasonType: number,
  week: number
): { gameDate: Date; week: number } | null {
  // Find the next game in this week that hasn't kicked off yet, by actual
  // kickoff time rather than game_status — game_status only updates when
  // someone presses "Sync Scores Now", so relying on it here meant a game
  // that kicked off while nobody had synced recently would stay 'scheduled'
  // forever, permanently anchoring "current week" to a week that already
  // started and blocking every reminder for the real current week.
  const rows = db.prepare(`
    SELECT game_date, week
    FROM games
    WHERE season_year = ? AND season_type = ? AND week = ?
    ORDER BY game_date ASC
  `).all(seasonYear, seasonType, week) as { game_date: string; week: number }[];

  const now = Date.now();
  const upcoming = rows.find((r) => new Date(r.game_date).getTime() > now);
  if (!upcoming) return null;
  return { gameDate: new Date(upcoming.game_date), week: upcoming.week };
}

function getCurrentWeekNumber(seasonYear: number, seasonType: number): number | null {
  // Same reasoning as getFirstGameOfCurrentWeek: pick the week of the next
  // game by actual kickoff time, not by the manually-synced game_status.
  const rows = db.prepare(`
    SELECT week, game_date FROM games
    WHERE season_year = ? AND season_type = ?
    ORDER BY game_date ASC
  `).all(seasonYear, seasonType) as { week: number; game_date: string }[];

  const now = Date.now();
  const upcoming = rows.find((r) => new Date(r.game_date).getTime() > now);
  return upcoming?.week ?? null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    (authHeader?.startsWith('Bearer ') && validateAdminToken(authHeader.substring(7)));

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const isTest = searchParams.get('test') === 'true';

  const seasonYear = CURRENT_SEASON;
  const seasonType = CURRENT_SEASON_TYPE;
  const week = getCurrentWeekNumber(seasonYear, seasonType);

  if (isTest) {
    const filterUserId = searchParams.get('userId') ? parseInt(searchParams.get('userId')!) : null;
    const customTitle = searchParams.get('title');
    const customBody = searchParams.get('body');
    let subscriptions = getAllSubscriptions();
    if (filterUserId) subscriptions = subscriptions.filter((s) => s.userId === filterUserId);
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
    let sent = 0;
    for (const sub of subscriptions) {
      const user = getUserById(sub.userId);
      const userUrl = user?.authToken ? `${appUrl}/user/${user.authToken}` : appUrl;
      const payload = JSON.stringify({
        title: customTitle || 'NFL Picks — Test Notification',
        body: customBody || 'Notifications are working! You\'ll be reminded before picks lock each week.',
        url: userUrl,
      });
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        sent++;
      } catch (err) {
        console.error('Test push failed for', sub.endpoint, err);
      }
    }
    return NextResponse.json({ success: true, test: true, sent });
  }

  if (week === null) {
    return NextResponse.json({ message: 'No upcoming games found', sent: 0 });
  }

  const firstGame = getFirstGameOfCurrentWeek(seasonYear, seasonType, week);
  if (!firstGame) {
    return NextResponse.json({ message: 'No scheduled games this week', sent: 0 });
  }

  const now = new Date();
  const hoursUntilGame = (firstGame.gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);

  // Game already started — nothing to notify
  if (hoursUntilGame <= 0) {
    return NextResponse.json({ message: 'First game already started', sent: 0 });
  }

  const subscriptions = getAllSubscriptions();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  let sent = 0;
  let skipped = 0;

  for (const threshold of THRESHOLDS) {
    // Past this threshold window
    if (hoursUntilGame > threshold.hoursBeforeGame) continue;

    for (const sub of subscriptions) {
      const { picks, total } = getUserPickCountForWeek(sub.userId, seasonYear, seasonType, week);

      // User has completed all their picks — skip remaining notifications
      if (total > 0 && picks >= total) {
        skipped++;
        continue;
      }

      // Already sent this notification type for this week
      if (wasNotificationSent(sub.userId, seasonYear, seasonType, week, threshold.type)) continue;

      const playoffWeekLabels: Record<number, string> = {
        1: 'Wild Card',
        2: 'Divisional',
        3: 'Conference',
        5: 'Super Bowl',
      };
      const weekLabel = seasonType === 3
        ? playoffWeekLabels[week] ?? `Playoff Week ${week}`
        : `Week ${week}`;

      const user = getUserById(sub.userId);
      const userUrl = user?.authToken ? `${appUrl}/user/${user.authToken}` : appUrl;

      const payload = JSON.stringify({
        title: 'NFL Picks Reminder',
        body: `${threshold.label} left to make your picks for ${weekLabel}! ${picks}/${total} done.`,
        url: userUrl,
      });

      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          payload
        );
        logNotificationSent(sub.userId, seasonYear, seasonType, week, threshold.type);
        sent++;
      } catch (err: unknown) {
        // Subscription expired — remove it
        if (err && typeof err === 'object' && 'statusCode' in err && (err as { statusCode: number }).statusCode === 410) {
          const { deletePushSubscription } = await import('@/lib/repositories/notifications');
          deletePushSubscription(sub.endpoint);
        } else {
          console.error('Failed to send push to', sub.endpoint, err);
        }
      }
    }
  }

  return NextResponse.json({ success: true, sent, skipped, week, hoursUntilGame: Math.round(hoursUntilGame * 10) / 10 });
}
