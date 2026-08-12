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
  const row = db.prepare(`
    SELECT MIN(game_date) as first_game, week
    FROM games
    WHERE season_year = ? AND season_type = ? AND week = ? AND game_status = 'scheduled'
    GROUP BY week
  `).get(seasonYear, seasonType, week) as { first_game: string; week: number } | undefined;

  if (!row?.first_game) return null;
  return { gameDate: new Date(row.first_game), week: row.week };
}

function getCurrentWeekNumber(seasonYear: number, seasonType: number): number | null {
  const row = db.prepare(`
    SELECT week FROM games
    WHERE season_year = ? AND season_type = ? AND game_status = 'scheduled'
    ORDER BY game_date ASC LIMIT 1
  `).get(seasonYear, seasonType) as { week: number } | undefined;
  return row?.week ?? null;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const isAuthorized =
    authHeader === `Bearer ${process.env.CRON_SECRET}` ||
    (authHeader?.startsWith('Bearer ') && validateAdminToken(authHeader.substring(7)));

  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const seasonYear = CURRENT_SEASON;
  const seasonType = CURRENT_SEASON_TYPE;
  const week = getCurrentWeekNumber(seasonYear, seasonType);

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

      const weekLabel = seasonType === 3
        ? ['Wild Card', 'Divisional', 'Conference', 'Pro Bowl', 'Super Bowl'][week - 1] ?? `Playoff Week ${week}`
        : `Week ${week}`;

      const payload = JSON.stringify({
        title: 'NFL Picks Reminder',
        body: `${threshold.label} left to make your picks for ${weekLabel}! ${picks}/${total} done.`,
        url: `${appUrl}`,
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
