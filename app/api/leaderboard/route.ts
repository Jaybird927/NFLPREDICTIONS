import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonYear = parseInt(searchParams.get('seasonYear') || String(CURRENT_SEASON));
    const seasonType = parseInt(searchParams.get('seasonType') || String(CURRENT_SEASON_TYPE));

    // Get leaderboard from stats table
    const stmt = db.prepare(`
      SELECT
        u.id,
        u.display_name,
        COALESCE(ls.total_predictions, 0) as total_predictions,
        COALESCE(ls.correct_predictions, 0) as correct_predictions,
        COALESCE(ls.incorrect_predictions, 0) as incorrect_predictions,
        COALESCE(ls.pending_predictions, 0) as pending_predictions,
        COALESCE(ls.win_percentage, 0) as win_percentage,
        ROW_NUMBER() OVER (
          ORDER BY
            COALESCE(ls.win_percentage, 0) DESC,
            COALESCE(ls.correct_predictions, 0) DESC,
            u.display_name ASC
        ) as rank
      FROM users u
      LEFT JOIN leaderboard_stats ls ON u.id = ls.user_id
        AND ls.season_year = ?
        AND ls.season_type = ?
      ORDER BY rank
    `);

    const leaderboard = stmt.all(seasonYear, seasonType);

    return NextResponse.json(leaderboard);
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}
