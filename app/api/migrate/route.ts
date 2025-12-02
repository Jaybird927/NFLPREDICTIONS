import { NextResponse } from 'next/server';
import db from '@/lib/db';
import crypto from 'crypto';

// Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

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

    const results: string[] = [];
    results.push('Starting token migration...\n');

    // Check if auth_token column exists
    try {
      const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
      const hasAuthToken = tableInfo.some(col => col.name === 'auth_token');

      if (!hasAuthToken) {
        results.push('Adding auth_token column to users table...');
        db.prepare('ALTER TABLE users ADD COLUMN auth_token TEXT').run();
        results.push('Column added successfully.');

        // Create unique index
        try {
          db.prepare('CREATE UNIQUE INDEX idx_users_auth_token ON users(auth_token)').run();
          results.push('Unique index created successfully.\n');
        } catch (error: any) {
          if (!error.message?.includes('already exists')) {
            throw error;
          }
        }
      } else {
        results.push('auth_token column already exists.\n');
      }
    } catch (error) {
      results.push(`Error checking/adding column: ${error}`);
      return NextResponse.json({ error: results.join('\n') }, { status: 500 });
    }

    // Get all users
    const users = db.prepare('SELECT id, name, display_name, auth_token FROM users').all() as any[];

    if (users.length === 0) {
      results.push('No users found in database.');
      return NextResponse.json({ message: results.join('\n') });
    }

    results.push(`Found ${users.length} users. Generating tokens...\n`);
    results.push('='.repeat(80));
    results.push('USER TOKENS - Save these and distribute to users');
    results.push('='.repeat(80));

    const updateStmt = db.prepare('UPDATE users SET auth_token = ? WHERE id = ?');
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    users.forEach((user: any) => {
      if (!user.auth_token) {
        const token = generateToken();
        updateStmt.run(token, user.id);
        results.push(`\n${user.display_name} (${user.name}):`);
        results.push(`${baseUrl}/user/${token}`);
      } else {
        results.push(`\n${user.display_name} (${user.name}): [Already has token]`);
        results.push(`${baseUrl}/user/${user.auth_token}`);
      }
    });

    results.push('\n' + '='.repeat(80));
    results.push('ADMIN TOKEN - Save this securely!');
    results.push('='.repeat(80));

    const adminToken = generateToken();
    results.push(`\nAdmin URL: ${baseUrl}/admin/${adminToken}`);
    results.push(`\nADMIN_AUTH_TOKEN=${adminToken}`);
    results.push('\nAdd this to your Railway environment variables');

    results.push('\n' + '='.repeat(80));
    results.push('Migration complete!');
    results.push('='.repeat(80));

    return NextResponse.json({
      success: true,
      output: results.join('\n'),
    });
  } catch (error) {
    console.error('Migration failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
