import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { CURRENT_SEASON } from '@/lib/constants';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const {
    homeTeam, awayTeam, gameDate, week = 1, seasonType = 2,
  }: {
    homeTeam: { name: string; abbreviation: string };
    awayTeam: { name: string; abbreviation: string };
    gameDate: string;
    week?: number;
    seasonType?: number;
  } = await request.json();

  const id = `TEST-${awayTeam.abbreviation}-${homeTeam.abbreviation}-${Date.now()}`;

  db.prepare(`
    INSERT INTO games (
      espn_event_id, season_year, season_type, week,
      home_team_id, home_team_name, home_team_abbreviation,
      away_team_id, away_team_name, away_team_abbreviation,
      game_date, game_status, home_score, away_score
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', 0, 0)
  `).run(
    id, CURRENT_SEASON, seasonType, week,
    homeTeam.abbreviation, homeTeam.name, homeTeam.abbreviation,
    awayTeam.abbreviation, awayTeam.name, awayTeam.abbreviation,
    gameDate
  );

  return NextResponse.json({ success: true, espnEventId: id });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { espnEventId } = await request.json();
  db.prepare(`DELETE FROM games WHERE espn_event_id = ?`).run(espnEventId);
  return NextResponse.json({ success: true });
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const games = db.prepare(`SELECT id, espn_event_id, away_team_abbreviation, home_team_abbreviation, game_date, week FROM games WHERE espn_event_id LIKE 'TEST-%' ORDER BY game_date ASC`).all();
  return NextResponse.json({ games });
}
