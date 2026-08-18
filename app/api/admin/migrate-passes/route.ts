import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { grantPass, getUnusedPasses } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  db.exec('DROP TABLE IF EXISTS special_passes');
  db.exec(`
    CREATE TABLE special_passes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      season_year INTEGER NOT NULL,
      designated_game_id INTEGER,
      used_game_id INTEGER,
      awarded_week INTEGER,
      awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (used_game_id) REFERENCES games(id)
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_passes_user ON special_passes(user_id, season_year)');

  // Seed starting passes for Jack and Grandpa
  const starters = ['jack', 'grandpa'];
  const results: string[] = [];
  for (const name of starters) {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as any;
    if (!user) { results.push(`${name}: not found`); continue; }
    const existing = getUnusedPasses(user.id, CURRENT_SEASON);
    if (existing.length === 0) {
      grantPass(user.id, CURRENT_SEASON, null);
      results.push(`${user.display_name}: granted starting pass`);
    } else {
      results.push(`${user.display_name}: already has pass`);
    }
  }

  return NextResponse.json({ success: true, results });
}
