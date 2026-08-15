import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonYear = parseInt(searchParams.get('seasonYear') || String(CURRENT_SEASON));
    const seasonType = parseInt(searchParams.get('seasonType') || String(CURRENT_SEASON_TYPE));
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : null;

    if (week !== null) {
      // Weekly leaderboard — query predictions directly for this week
      const stmt = db.prepare(`
        SELECT
          u.id,
          u.display_name,
          COUNT(p.id) as total_predictions,
          SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
          SUM(CASE WHEN p.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_predictions,
          SUM(CASE WHEN p.is_correct IS NULL THEN 1 ELSE 0 END) as pending_predictions,
          CASE
            WHEN SUM(CASE WHEN p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
            THEN CAST(SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
                 CAST(SUM(CASE WHEN p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
            ELSE 0
          END as win_percentage,
          RANK() OVER (
            ORDER BY
              SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) DESC,
              CASE
                WHEN SUM(CASE WHEN p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
                THEN CAST(SUM(CASE WHEN p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
                     CAST(SUM(CASE WHEN p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
                ELSE 0
              END DESC
          ) as rank
        FROM users u
        LEFT JOIN predictions p ON u.id = p.user_id
        LEFT JOIN games g ON p.game_id = g.id
          AND g.season_year = ? AND g.season_type = ? AND g.week = ?
        GROUP BY u.id
        ORDER BY
          correct_predictions DESC,
          win_percentage DESC,
          u.display_name ASC
      `);
      return NextResponse.json(stmt.all(seasonYear, seasonType, week));
    }

    // Season leaderboard from stats table
    const stmt = db.prepare(`
      SELECT
        u.id,
        u.display_name,
        COALESCE(ls.total_predictions, 0) as total_predictions,
        COALESCE(ls.correct_predictions, 0) as correct_predictions,
        COALESCE(ls.incorrect_predictions, 0) as incorrect_predictions,
        COALESCE(ls.pending_predictions, 0) as pending_predictions,
        COALESCE(ls.win_percentage, 0) as win_percentage,
        RANK() OVER (
          ORDER BY
            COALESCE(ls.win_percentage, 0) DESC,
            COALESCE(ls.correct_predictions, 0) DESC
        ) as rank
      FROM users u
      LEFT JOIN leaderboard_stats ls ON u.id = ls.user_id
        AND ls.season_year = ?
        AND ls.season_type = ?
      ORDER BY
        COALESCE(ls.win_percentage, 0) DESC,
        COALESCE(ls.correct_predictions, 0) DESC,
        u.display_name ASC
    `);

    return NextResponse.json(stmt.all(seasonYear, seasonType));
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to get leaderboard' },
      { status: 500 }
    );
  }
}
