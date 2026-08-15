import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { grantPass, getUnusedThirtyMinutePass } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';
import db from '@/lib/db';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const seasonYear = CURRENT_SEASON;
  const seasonType = 2; // Regular season

  // Grant thirty_minute passes to Jack and Grandpa if they don't already have one
  const recipients = ['jack', 'grandpa'];
  const results: string[] = [];

  for (const name of recipients) {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as any;
    if (!user) {
      results.push(`${name}: not found`);
      continue;
    }
    const existing = getUnusedThirtyMinutePass(user.id, seasonYear);
    if (existing) {
      results.push(`${user.display_name}: already has a thirty-minute pass`);
    } else {
      grantPass(user.id, 'thirty_minute', seasonYear, seasonType);
      results.push(`${user.display_name}: granted thirty-minute pass`);
    }
  }

  return NextResponse.json({ success: true, results });
}
