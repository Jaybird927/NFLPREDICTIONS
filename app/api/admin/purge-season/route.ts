import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const seasonYear = parseInt(searchParams.get('seasonYear') || '0');
  if (!seasonYear) {
    return NextResponse.json({ error: 'seasonYear required' }, { status: 400 });
  }

  const deletedStats = db.prepare('DELETE FROM leaderboard_stats WHERE season_year = ?').run(seasonYear);
  const deletedGames = db.prepare('DELETE FROM games WHERE season_year = ?').run(seasonYear);

  return NextResponse.json({
    success: true,
    seasonYear,
    deletedGames: deletedGames.changes,
    deletedStats: deletedStats.changes,
  });
}
