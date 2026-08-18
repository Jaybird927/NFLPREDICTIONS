import { NextResponse } from 'next/server';
import { grantWeeklyPass, getPassForWeek, THIRTY_MIN_PASS_USERS } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';
import db from '@/lib/db';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { week = 1, seasonType = 2 } = await request.json().catch(() => ({}));
  const results: string[] = [];

  for (const name of THIRTY_MIN_PASS_USERS) {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as any;
    if (!user) { results.push(`${name}: not found`); continue; }
    const existing = getPassForWeek(user.id, CURRENT_SEASON, seasonType, week);
    if (existing) {
      results.push(`${user.display_name}: already has pass for week ${week}`);
    } else {
      grantWeeklyPass(user.id, CURRENT_SEASON, seasonType, week);
      results.push(`${user.display_name}: granted pass for week ${week}`);
    }
  }

  return NextResponse.json({ success: true, results });
}
