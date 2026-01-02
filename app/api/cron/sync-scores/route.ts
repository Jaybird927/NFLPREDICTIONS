import { NextResponse } from 'next/server';
import { syncCurrentWeek, syncGamesFromESPN } from '@/lib/services/game.service';
import { validateUserToken, validateAdminToken } from '@/lib/utils/tokens';

export async function GET(request: Request) {
  try {
    // Verify cron secret, admin token, or user token
    const authHeader = request.headers.get('authorization');
    const expectedCronAuth = `Bearer ${process.env.CRON_SECRET}`;

    let isAuthorized = false;

    if (authHeader === expectedCronAuth) {
      isAuthorized = true;
    } else if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // Check if it's admin token or valid user token
      if (validateAdminToken(token) || validateUserToken(token)) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting score sync...');

    // Check if specific week/season params are provided
    const { searchParams } = new URL(request.url);
    const week = searchParams.get('week');
    const seasonYear = searchParams.get('seasonYear');
    const seasonType = searchParams.get('seasonType');

    let result;
    if (week && seasonYear && seasonType) {
      // Sync specific week
      result = await syncGamesFromESPN(
        parseInt(seasonType),
        parseInt(week),
        parseInt(seasonYear),
        true // bypass cache
      );
    } else {
      // Sync current week
      result = await syncCurrentWeek(true); // Pass true to bypass cache
    }

    console.log('Score sync complete:', result);

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error) {
    console.error('Score sync failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
