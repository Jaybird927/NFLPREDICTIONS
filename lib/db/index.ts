import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const databasePath = process.env.DATABASE_PATH || './data/sports-picks.db';

// Ensure data directory exists
const dataDir = path.dirname(databasePath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Initialize database
const db = new Database(databasePath);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

// Initialize schema
export function initializeDatabase() {
  const schemaPath = path.join(process.cwd(), 'lib', 'db', 'schema.sql');
  const schema = fs.readFileSync(schemaPath, 'utf-8');

  db.exec(schema);

  // Recreate special_passes if it has the old schema (missing awarded_week column)
  try {
    const cols = db.prepare('PRAGMA table_info(special_passes)').all() as any[];
    const hasAwardedWeek = cols.some((c: any) => c.name === 'awarded_week');
    if (!hasAwardedWeek) {
      db.exec('DROP TABLE IF EXISTS special_passes');
      const tableSQL = schema.split('-- Special passes')[1]?.split('CREATE INDEX')[0]?.trim();
      if (tableSQL) db.exec(tableSQL);
      db.exec(`CREATE INDEX IF NOT EXISTS idx_passes_user ON special_passes(user_id, season_year)`);
    }
  } catch { /* table didn't exist yet */ }

  // Safe incremental migrations
  const migrations = [
    `ALTER TABLE predictions ADD COLUMN is_late_pass BOOLEAN DEFAULT 0`,
  ];
  for (const sql of migrations) {
    try { db.exec(sql); } catch { /* column already exists */ }
  }

  console.log('Database initialized successfully');
}

export default db;
