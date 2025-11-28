import { NextResponse } from 'next/server';
import { getGamesByWeek } from '@/lib/repositories/games';
import { getPredictionsByWeek } from '@/lib/repositories/predictions';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const week = parseInt(searchParams.get('week') || '1');
    const seasonYear = parseInt(searchParams.get('seasonYear') || String(CURRENT_SEASON));
    const seasonType = parseInt(searchParams.get('seasonType') || String(CURRENT_SEASON_TYPE));

    const games = getGamesByWeek(seasonYear, seasonType, week);
    const predictions = getPredictionsByWeek(seasonYear, seasonType, week);

    // Convert predictions Map to array for JSON serialization
    const predictionsArray = Array.from(predictions.values());

    return NextResponse.json({
      games,
      predictions: predictionsArray,
    });
  } catch (error) {
    console.error('Failed to get games:', error);
    return NextResponse.json(
      { error: 'Failed to get games' },
      { status: 500 }
    );
  }
}
