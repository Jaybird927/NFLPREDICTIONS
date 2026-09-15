import db from '../db';
import { getCumulativeStandings, getWeekSequence } from '../repositories/leaderboard';
import { wasRecapSent, logRecapSent } from '../repositories/weekRecapLogs';
import { sendPushToUser } from './push.service';
import { getWeekLabel, isSeasonFinale, ordinal } from '../utils/season';

export async function sendWeeklyRecapNotifications(
  seasonYear: number,
  seasonType: number,
  week: number,
  weeklyWinnerUserIds: number[]
): Promise<void> {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || '';
  const weekLabel = getWeekLabel(seasonType, week);
  const finale = isSeasonFinale(seasonType, week);

  const sequence = getWeekSequence(seasonYear);
  const idx = sequence.findIndex((s) => s.seasonType === seasonType && s.week === week);
  const prevEntry = idx > 0 ? sequence[idx - 1] : null;

  const currentStandings = getCumulativeStandings(seasonYear, seasonType, week);
  const prevStandings = prevEntry ? getCumulativeStandings(seasonYear, prevEntry.seasonType, prevEntry.week) : null;

  const users = db.prepare('SELECT id, auth_token FROM users').all() as Array<{ id: number; auth_token: string | null }>;

  for (const user of users) {
    if (wasRecapSent(user.id, seasonYear, seasonType, week)) continue;

    const current = currentStandings.find((s) => s.userId === user.id);
    if (!current) {
      logRecapSent(user.id, seasonYear, seasonType, week);
      continue;
    }

    const userUrl = user.auth_token ? `${appUrl}/user/${user.auth_token}` : appUrl;
    let title: string;
    let body: string;

    if (finale) {
      title = 'Season Complete!';
      const championLine = current.rank === 1 ? ` You're the champion — check out your certificate! 🏆` : '';
      body = `Congrats! You finished in ${ordinal(current.rank)} place!${championLine} Can't wait to see you next year!`;
    } else {
      title = `${weekLabel} Recap`;
      const passLine = weeklyWinnerUserIds.includes(user.id) ? ` You're in 1st place in the weekly standings and earned a 15-minute pass! 🎉` : '';
      const recapLine = ' See why your teams won or lost according to excerpts from ESPN.';

      const prev = prevStandings?.find((s) => s.userId === user.id);
      if (!prev) {
        body = `You're in ${ordinal(current.rank)} place!${passLine}${recapLine}`;
      } else if (prev.rank === current.rank) {
        body = `You stayed at ${ordinal(current.rank)} place!${passLine}${recapLine}`;
      } else {
        body = `You went from ${ordinal(prev.rank)} to ${ordinal(current.rank)} place!${passLine}${recapLine}`;
      }
    }

    try {
      await sendPushToUser(user.id, { title, body, url: userUrl });
    } catch (err) {
      console.error('Failed to send weekly recap to user', user.id, err);
    }
    logRecapSent(user.id, seasonYear, seasonType, week);
  }
}
