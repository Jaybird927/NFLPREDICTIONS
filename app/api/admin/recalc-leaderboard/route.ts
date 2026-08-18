import { NextResponse } from 'next/server';
import { recalculateLeaderboard } from '@/lib/repositories/leaderboard';
import { CURRENT_SEASON } from '@/lib/constants';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.ADMIN_AUTH_TOKEN}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await recalculateLeaderboard(CURRENT_SEASON, 2);
  await recalculateLeaderboard(CURRENT_SEASON, 3);
  return NextResponse.json({ success: true });
}
