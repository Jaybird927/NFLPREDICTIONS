// User types
export interface User {
  id: number;
  name: string;
  displayName: string;
  authToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserRow {
  id: number;
  name: string;
  display_name: string;
  auth_token?: string;
  created_at: string;
  updated_at: string;
}

// Team types
export interface Team {
  id: string;
  name: string;
  abbreviation: string;
  logo?: string;
}

// Game types
export interface Game {
  id: number;
  espnEventId: string;
  seasonYear: number;
  seasonType: number;
  week: number;

  homeTeam: Team;
  awayTeam: Team;

  gameDate: Date;
  gameStatus: 'scheduled' | 'in_progress' | 'final';

  homeScore: number;
  awayScore: number;

  winnerTeamId?: string;

  createdAt: Date;
  updatedAt: Date;
}

export interface GameRow {
  id: number;
  espn_event_id: string;
  season_year: number;
  season_type: number;
  week: number;

  home_team_id: string;
  home_team_name: string;
  home_team_abbreviation: string;
  home_team_logo: string | null;

  away_team_id: string;
  away_team_name: string;
  away_team_abbreviation: string;
  away_team_logo: string | null;

  game_date: string;
  game_status: string;

  home_score: number;
  away_score: number;

  winner_team_id: string | null;

  created_at: string;
  updated_at: string;
}

// Prediction types
export interface Prediction {
  id: number;
  userId: number;
  gameId: number;
  predictedWinnerTeamId: string;
  isCorrect?: boolean | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PredictionRow {
  id: number;
  user_id: number;
  game_id: number;
  predicted_winner_team_id: string;
  is_correct: number | null; // SQLite stores boolean as 0/1
  created_at: string;
  updated_at: string;
}

// Leaderboard types
export interface LeaderboardEntry {
  user: User;
  totalPredictions: number;
  correctPredictions: number;
  incorrectPredictions: number;
  pendingPredictions: number;
  winPercentage: number;
  rank: number;
}

export interface LeaderboardStatsRow {
  id: number;
  user_id: number;
  season_year: number;
  season_type: number;
  total_predictions: number;
  correct_predictions: number;
  incorrect_predictions: number;
  pending_predictions: number;
  win_percentage: number;
  updated_at: string;
}

// Game with user prediction
export interface GameWithPrediction extends Game {
  userPrediction?: Prediction;
  isPredictionLocked: boolean;
}

// ESPN API types
export interface ESPNScoreboardResponse {
  leagues: Array<{
    season: { year: number; type: number };
  }>;
  week?: { number: number };
  events: ESPNEvent[];
}

export interface ESPNEvent {
  id: string;
  date: string;
  name: string;
  shortName: string;
  status: {
    type: {
      id: string;
      name: string;
      state: string;
      completed: boolean;
    };
  };
  competitions: Array<{
    id: string;
    competitors: Array<{
      id: string;
      homeAway: 'home' | 'away';
      team: {
        id: string;
        name: string;
        abbreviation: string;
        logo: string;
      };
      score: string;
      winner?: boolean;
    }>;
  }>;
}

// Session types
export interface SessionData {
  userId: number;
  name: string;
  displayName: string;
}
