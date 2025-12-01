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
