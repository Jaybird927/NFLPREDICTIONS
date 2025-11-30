import { NextResponse } from 'next/server';
import { syncEntireSeason } from '@/lib/services/game.service';
import { CURRENT_SEASON, CURRENT_SEASON_TYPE } from '@/lib/constants';

export async function GET(request: Request) {
  try {
    // Verify secret for security
    const authHeader = request.headers.get('authorization');
    const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

    if (authHeader !== expectedAuth) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('Starting game seeding...');
    const result = await syncEntireSeason(CURRENT_SEASON, CURRENT_SEASON_TYPE);

    console.log('Game seeding complete:', result);

    return NextResponse.json({
      success: true,
      message: 'Games seeded successfully',
      result,
    });
  } catch (error) {
    console.error('Game seeding failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
