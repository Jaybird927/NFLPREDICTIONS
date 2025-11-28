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

  // Execute schema
  db.exec(schema);

  console.log('Database initialized successfully');
}

export default db;
