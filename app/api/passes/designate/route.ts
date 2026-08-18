import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getGameById } from '@/lib/repositories/games';
import { getPassForWeek, designateThirtyMinutePass, undesignateThirtyMinutePass, isEligibleForPass } from '@/lib/repositories/passes';
import { syncCurrentWeek } from '@/lib/services/game.service';
import { CURRENT_SEASON } from '@/lib/constants';

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user || !isEligibleForPass(user.name)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { gameId } = await request.json();
  const game = getGameById(gameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (new Date() >= game.gameDate) {
    return NextResponse.json({ error: 'Game has already started — designate before kickoff' }, { status: 400 });
  }

  const pass = getPassForWeek(user.id, CURRENT_SEASON, game.seasonType, game.week);
  if (!pass || pass.usedGameId !== null) {
    return NextResponse.json({ error: 'No available pass for this week' }, { status: 400 });
  }

  designateThirtyMinutePass(pass.id, gameId);
  return NextResponse.json({ success: true });
}

export async function DELETE(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user || !isEligibleForPass(user.name)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { week, seasonType } = await request.json();
  const pass = getPassForWeek(user.id, CURRENT_SEASON, seasonType, week);
  if (!pass || !pass.designatedGameId) {
    return NextResponse.json({ error: 'No designated pass found' }, { status: 400 });
  }

  // Sync scores first to confirm game hasn't started
  await syncCurrentWeek(true);

  const game = getGameById(pass.designatedGameId);
  if (!game) return NextResponse.json({ error: 'Game not found' }, { status: 404 });

  if (game.gameStatus !== 'scheduled' || new Date() >= game.gameDate) {
    return NextResponse.json({ error: 'Game has already started — pass cannot be removed' }, { status: 400 });
  }

  undesignateThirtyMinutePass(pass.id);
  return NextResponse.json({ success: true });
}
