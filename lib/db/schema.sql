-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  auth_token TEXT UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  espn_event_id TEXT NOT NULL UNIQUE,
  season_year INTEGER NOT NULL,
  season_type INTEGER NOT NULL,
  week INTEGER NOT NULL,

  home_team_id TEXT NOT NULL,
  home_team_name TEXT NOT NULL,
  home_team_abbreviation TEXT NOT NULL,
  home_team_logo TEXT,

  away_team_id TEXT NOT NULL,
  away_team_name TEXT NOT NULL,
  away_team_abbreviation TEXT NOT NULL,
  away_team_logo TEXT,

  game_date TIMESTAMP NOT NULL,
  game_status TEXT NOT NULL,

  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,

  winner_team_id TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_game_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_season_week ON games(season_year, season_type, week);
CREATE INDEX IF NOT EXISTS idx_status ON games(game_status);

-- Predictions table
CREATE TABLE IF NOT EXISTS predictions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  game_id INTEGER NOT NULL,
  predicted_winner_team_id TEXT NOT NULL,
  is_correct BOOLEAN DEFAULT NULL,
  is_late_pass BOOLEAN DEFAULT 0,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE,
  UNIQUE(user_id, game_id)
);

CREATE INDEX IF NOT EXISTS idx_user_predictions ON predictions(user_id);
CREATE INDEX IF NOT EXISTS idx_game_predictions ON predictions(game_id);

-- Leaderboard stats table
CREATE TABLE IF NOT EXISTS leaderboard_stats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  season_type INTEGER NOT NULL,

  total_predictions INTEGER DEFAULT 0,
  correct_predictions INTEGER DEFAULT 0,
  incorrect_predictions INTEGER DEFAULT 0,
  pending_predictions INTEGER DEFAULT 0,
  win_percentage REAL DEFAULT 0.0,

  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, season_year, season_type)
);

CREATE INDEX IF NOT EXISTS idx_season_stats ON leaderboard_stats(season_year, season_type);
CREATE INDEX IF NOT EXISTS idx_win_percentage ON leaderboard_stats(win_percentage DESC);

-- Push notification subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);

-- Notification send log (prevents duplicate notifications per window)
CREATE TABLE IF NOT EXISTS notification_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  season_year INTEGER NOT NULL,
  season_type INTEGER NOT NULL,
  week INTEGER NOT NULL,
  notification_type TEXT NOT NULL CHECK(notification_type IN ('2days','1day','2hours','1hour')),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, season_year, season_type, week, notification_type)
);

CREATE INDEX IF NOT EXISTS idx_notif_log ON notification_logs(season_year, season_type, week);

-- Special passes (thirty_minute and late)
CREATE TABLE IF NOT EXISTS special_passes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  pass_type TEXT NOT NULL CHECK(pass_type IN ('thirty_minute', 'late')),
  season_year INTEGER NOT NULL,
  season_type INTEGER NOT NULL,
  used_game_id INTEGER,        -- thirty_minute: game it was used on
  applied_week INTEGER,        -- late: week it was applied to
  awarded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (used_game_id) REFERENCES games(id)
);

CREATE INDEX IF NOT EXISTS idx_passes_user ON special_passes(user_id, season_year, season_type);
