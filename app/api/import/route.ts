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

    // Import predictions (matching by ESPN event ID and user name)
    if (predictions && Array.isArray(predictions)) {
      const predStmt = db.prepare(`
        INSERT OR IGNORE INTO predictions (user_id, game_id, predicted_winner_team_id)
        SELECT u.id, g.id, ?
        FROM users u, games g
        WHERE u.name = ? AND g.espn_event_id = ?
      `);

      for (const pred of predictions) {
        // Support both old format (user_id, game_id) and new format (user_name, espn_event_id)
        if (pred.user_name && pred.espn_event_id) {
          predStmt.run(pred.predicted_winner_team_id, pred.user_name, pred.espn_event_id);
          predictionsImported++;
        } else if (pred.user_id && pred.game_id) {
          // Legacy format support
          const directStmt = db.prepare(`
            INSERT OR IGNORE INTO predictions (user_id, game_id, predicted_winner_team_id)
            VALUES (?, ?, ?)
          `);
          directStmt.run(pred.user_id, pred.game_id, pred.predicted_winner_team_id);
          predictionsImported++;
        }
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
