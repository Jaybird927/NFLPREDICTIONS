import { NextResponse } from 'next/server';
import { grantPass, getUnusedPasses } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';
import db from '@/lib/db';

// Users who start with a pass for winning last year
const INITIAL_PASS_USERS = ['jack', 'grandpa'];

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  for (const name of INITIAL_PASS_USERS) {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as any;
    if (!user) { results.push(`${name}: not found`); continue; }

    const existing = getUnusedPasses(user.id, CURRENT_SEASON);
    if (existing.length > 0) {
      results.push(`${user.display_name}: already has ${existing.length} pass(es)`);
    } else {
      grantPass(user.id, CURRENT_SEASON, null);
      results.push(`${user.display_name}: granted starting pass`);
    }
  }

  return NextResponse.json({ success: true, results });
}
