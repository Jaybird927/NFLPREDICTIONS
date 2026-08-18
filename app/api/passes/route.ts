import { NextResponse } from 'next/server';
import { getUserByToken } from '@/lib/repositories/users';
import { getUserPassSummary, getActiveDesignation } from '@/lib/repositories/passes';
import { CURRENT_SEASON } from '@/lib/constants';

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ summary: null });
  }

  const user = getUserByToken(authHeader.substring(7));
  if (!user) return NextResponse.json({ summary: null });

  const summary = getUserPassSummary(user.id, CURRENT_SEASON);
  const designation = getActiveDesignation(user.id, CURRENT_SEASON);

  return NextResponse.json({
    summary: {
      ...summary,
      designatedGameId: designation?.designatedGameId ?? null,
    },
  });
}
