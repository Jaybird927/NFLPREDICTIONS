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

  // Relax predictions.predicted_winner_team_id to allow NULL — the "missing
  // pick counts as a loss" scoring step inserts NULL rows for users who never
  // picked, which used to violate a NOT NULL constraint and abort scoring for
  // the entire game. SQLite can't ALTER a column's NOT NULL, so recreate the
  // table if it still has the old constraint, preserving existing rows.
  try {
    const predCols = db.prepare('PRAGMA table_info(predictions)').all() as any[];
    const winnerCol = predCols.find((c: any) => c.name === 'predicted_winner_team_id');
    if (winnerCol && winnerCol.notnull) {
      const migratePredictions = db.transaction(() => {
        db.exec(`ALTER TABLE predictions RENAME TO predictions_old`);
        db.exec(`
          CREATE TABLE predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            game_id INTEGER NOT NULL,
            predicted_winner_team_id TEXT,
            is_correct BOOLEAN DEFAULT NULL,
            is_late_pass BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
            UNIQUE(user_id, game_id)
          )
        `);
        db.exec(`
          INSERT INTO predictions (id, user_id, game_id, predicted_winner_team_id, is_correct, is_late_pass, created_at, updated_at)
          SELECT id, user_id, game_id, predicted_winner_team_id, is_correct, is_late_pass, created_at, updated_at FROM predictions_old
        `);
        db.exec(`DROP TABLE predictions_old`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_user_predictions ON predictions(user_id)`);
        db.exec(`CREATE INDEX IF NOT EXISTS idx_game_predictions ON predictions(game_id)`);
      });
      migratePredictions();
      console.log('Migrated predictions table to allow NULL predicted_winner_team_id');
    }
  } catch (error) {
    console.error('Failed to migrate predictions.predicted_winner_team_id constraint:', error);
  }

  console.log('Database initialized successfully');
}

export default db;
