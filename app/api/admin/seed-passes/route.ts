import { NextResponse } from 'next/server';
import { grantPass, getUnusedPasses } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';
import db from '@/lib/db';

// Jack and Grandpa start with a correction pass for winning last year
const CORRECTION_PASS_STARTERS = ['jack', 'grandpa'];

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: string[] = [];

  for (const name of CORRECTION_PASS_STARTERS) {
    const user = db.prepare('SELECT * FROM users WHERE name = ?').get(name) as any;
    if (!user) { results.push(`${name}: not found`); continue; }

    const existing = getUnusedPasses(user.id, CURRENT_SEASON, 'correction');
    if (existing.length > 0) {
      results.push(`${user.display_name}: already has correction pass`);
    } else {
      grantPass(user.id, CURRENT_SEASON, 'correction', null);
      results.push(`${user.display_name}: granted correction pass`);
    }
  }

  return NextResponse.json({ success: true, results });
}
