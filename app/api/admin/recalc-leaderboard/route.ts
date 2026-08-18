import { NextResponse } from 'next/server';
import { recalculateLeaderboard } from '@/lib/repositories/leaderboard';
import { CURRENT_SEASON } from '@/lib/constants';
import db from '@/lib/db';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Delete orphaned predictions (game no longer exists)
  const deleted = db.prepare(`
    DELETE FROM predictions WHERE game_id NOT IN (SELECT id FROM games)
  `).run();

  await recalculateLeaderboard(CURRENT_SEASON, 2);
  await recalculateLeaderboard(CURRENT_SEASON, 3);
  return NextResponse.json({ success: true, orphansDeleted: deleted.changes });
}
