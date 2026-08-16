import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getGameById } from '@/lib/repositories/games';
import {
  getUnusedThirtyMinutePass,
  designateThirtyMinutePass,
  undesignateThirtyMinutePass,
} from '@/lib/repositories/passes';
import { syncCurrentWeek } from '@/lib/services/game.service';
import { CURRENT_SEASON } from '@/lib/constants';

// POST: designate a game before kickoff
export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { gameId } = await request.json();
  const game = getGameById(gameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (new Date() >= game.gameDate) {
    return NextResponse.json({ error: 'Game has already started — designate before kickoff' }, { status: 400 });
  }

  const pass = getUnusedThirtyMinutePass(user.id, CURRENT_SEASON);
  if (!pass) return NextResponse.json({ error: 'No 30-minute pass available' }, { status: 400 });

  designateThirtyMinutePass(pass.id, gameId);
  return NextResponse.json({ success: true });
}

// DELETE: remove designation — syncs scores first to confirm game hasn't started
export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const pass = getUnusedThirtyMinutePass(user.id, CURRENT_SEASON);
  if (!pass || !pass.designatedGameId) {
    return NextResponse.json({ error: 'No designated pass found' }, { status: 400 });
  }

  // Sync scores to get latest game status before allowing removal
  await syncCurrentWeek(true);

  const game = getGameById(pass.designatedGameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (game.gameStatus !== 'scheduled' || new Date() >= game.gameDate) {
    return NextResponse.json(
      { error: 'Game has already started — pass cannot be removed' },
      { status: 400 }
    );
  }

  undesignateThirtyMinutePass(pass.id);
  return NextResponse.json({ success: true });
}
