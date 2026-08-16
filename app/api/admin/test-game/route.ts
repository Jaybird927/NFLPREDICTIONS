import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { CURRENT_SEASON } from '@/lib/constants';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameDate } = await request.json();

  db.prepare(`
    INSERT OR REPLACE INTO games (
      espn_event_id, season_year, season_type, week,
      home_team_id, home_team_name, home_team_abbreviation, home_team_logo,
      away_team_id, away_team_name, away_team_abbreviation, away_team_logo,
      game_date, game_status, home_score, away_score
    ) VALUES (
      'TEST-BEARS-EAGLES', ?, 2, 1,
      '3', 'Chicago Bears', 'CHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/chi.png',
      '21', 'Philadelphia Eagles', 'PHI', 'https://a.espncdn.com/i/teamlogos/nfl/500/phi.png',
      ?, 'scheduled', 0, 0
    )
  `).run(CURRENT_SEASON, gameDate);

  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  db.prepare(`DELETE FROM games WHERE espn_event_id = 'TEST-BEARS-EAGLES'`).run();
  return NextResponse.json({ success: true });
}
