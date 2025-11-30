import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: Request) {
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

    const body = await request.json();
    const { users, predictions } = body;

    console.log(`Importing ${users?.length || 0} users and ${predictions?.length || 0} predictions...`);

    let usersImported = 0;
    let predictionsImported = 0;

    // Import users
    if (users && Array.isArray(users)) {
      const userStmt = db.prepare(`
        INSERT OR IGNORE INTO users (id, name, display_name)
        VALUES (?, ?, ?)
      `);

      for (const user of users) {
        userStmt.run(user.id, user.name, user.display_name);
        usersImported++;
      }
    }

    // Import predictions
    if (predictions && Array.isArray(predictions)) {
      const predStmt = db.prepare(`
        INSERT OR IGNORE INTO predictions (user_id, game_id, predicted_winner_team_id)
        VALUES (?, ?, ?)
      `);

      for (const pred of predictions) {
        predStmt.run(pred.user_id, pred.game_id, pred.predicted_winner_team_id);
        predictionsImported++;
      }
    }

    console.log(`Import complete: ${usersImported} users, ${predictionsImported} predictions`);

    return NextResponse.json({
      success: true,
      usersImported,
      predictionsImported,
    });
  } catch (error) {
    console.error('Import failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
