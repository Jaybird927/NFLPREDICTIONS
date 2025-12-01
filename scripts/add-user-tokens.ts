import db from '@/lib/db';
import crypto from 'crypto';

// Generate secure random token
function generateToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

console.log('Starting token migration...\n');

// Check if auth_token column exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all() as any[];
  const hasAuthToken = tableInfo.some(col => col.name === 'auth_token');

  if (!hasAuthToken) {
    console.log('Adding auth_token column to users table...');
    db.prepare('ALTER TABLE users ADD COLUMN auth_token TEXT').run();
    console.log('Column added successfully.');

    // Create unique index
    try {
      db.prepare('CREATE UNIQUE INDEX idx_users_auth_token ON users(auth_token)').run();
      console.log('Unique index created successfully.\n');
    } catch (error: any) {
      if (!error.message?.includes('already exists')) {
        throw error;
      }
    }
  } else {
    console.log('auth_token column already exists.\n');
  }
} catch (error) {
  console.error('Error checking/adding column:', error);
  process.exit(1);
}

// Get all users
const users = db.prepare('SELECT id, name, display_name, auth_token FROM users').all() as any[];

if (users.length === 0) {
  console.log('No users found in database.');
  process.exit(0);
}

console.log(`Found ${users.length} users. Generating tokens...\n`);

const updateStmt = db.prepare('UPDATE users SET auth_token = ? WHERE id = ?');

console.log('='.repeat(80));
console.log('USER TOKENS - Save these and distribute to users');
console.log('='.repeat(80));

users.forEach((user: any) => {
  if (!user.auth_token) {
    const token = generateToken();
    updateStmt.run(token, user.id);
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log(`\n${user.display_name} (${user.name}):`);
    console.log(`${url}/user/${token}`);
  } else {
    const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    console.log(`\n${user.display_name} (${user.name}): [Already has token]`);
    console.log(`${url}/user/${user.auth_token}`);
  }
});

console.log('\n' + '='.repeat(80));
console.log('ADMIN TOKEN - Save this securely!');
console.log('='.repeat(80));

const adminToken = generateToken();
const url = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
console.log(`\nAdmin URL: ${url}/admin/${adminToken}`);
console.log(`\nADMIN_AUTH_TOKEN=${adminToken}`);
console.log('\nAdd this to your environment variables (.env.local or Railway)');

console.log('\n' + '='.repeat(80));
console.log('Migration complete!');
console.log('='.repeat(80));
