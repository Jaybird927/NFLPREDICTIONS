import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

const leaderboardQuery = (extraWhere: string) => `
  SELECT
    u.id,
    u.display_name,
    COUNT(p.id) as total_predictions,
    SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) as correct_predictions,
    SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 0 THEN 1 ELSE 0 END) as incorrect_predictions,
    SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NULL THEN 1 ELSE 0 END) as pending_predictions,
    CASE
      WHEN SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
      THEN CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
           CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
      ELSE 0
    END as win_percentage,
    RANK() OVER (
      ORDER BY
        SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) DESC,
        CASE
          WHEN SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) > 0
          THEN CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct = 1 THEN 1 ELSE 0 END) AS REAL) /
               CAST(SUM(CASE WHEN p.id IS NOT NULL AND p.is_correct IS NOT NULL THEN 1 ELSE 0 END) AS REAL) * 100
          ELSE 0
        END DESC
    ) as rank
  FROM users u
  LEFT JOIN (
    SELECT p.* FROM predictions p
    JOIN games g ON p.game_id = g.id
    WHERE ${extraWhere}
  ) p ON u.id = p.user_id
  GROUP BY u.id
  ORDER BY
    correct_predictions DESC,
    win_percentage DESC,
    u.display_name ASC
`;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const seasonYear = parseInt(searchParams.get('seasonYear') || String(CURRENT_SEASON));
    const seasonType = parseInt(searchParams.get('seasonType') || String(CURRENT_SEASON_TYPE));
    const week = searchParams.get('week') ? parseInt(searchParams.get('week')!) : null;

    if (week !== null) {
      const sql = leaderboardQuery(`g.season_year = ${seasonYear} AND g.season_type = ${seasonType} AND g.week = ${week}`);
      return NextResponse.json(db.prepare(sql).all());
    }

    const sql = leaderboardQuery(`g.season_year = ${seasonYear} AND g.season_type = ${seasonType}`);
    return NextResponse.json(db.prepare(sql).all());
  } catch (error) {
    console.error('Failed to get leaderboard:', error);
    return NextResponse.json({ error: 'Failed to get leaderboard' }, { status: 500 });
  }
}
