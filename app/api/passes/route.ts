import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { isEligibleForPass } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';
import db from '@/lib/db';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user || !isEligibleForPass(user.name)) {
    return NextResponse.json({ passes: [] });
  }

  const passes = db.prepare(`
    SELECT id, week, designated_game_id as designatedGameId, used_game_id as usedGameId
    FROM special_passes
    WHERE user_id = ? AND season_year = ?
    ORDER BY week ASC
  `).all(user.id, CURRENT_SEASON);

  return NextResponse.json({ passes });
}
