# NFL Predictions App

A simple web app for tracking NFL game predictions across multiple people with live scoring from ESPN.

## Features

- **Grid Interface**: Single page where one person enters predictions for everyone
- **Click-to-Cycle**: Click each cell to cycle through: No Pick → Team 1 → Team 2 → No Pick
- **Live Scores**: Automatic syncing from ESPN API every 15 minutes
- **Leaderboard**: Track win percentages and rankings across the season
- **Week Navigation**: View and edit predictions for any week
- **Participant Management**: Add or remove people from the pool

## Getting Started

### Prerequisites

- Node.js 18+ installed
- npm

### Installation

1. Install dependencies:
```bash
npm install
```

2. Initialize the database:
```bash
npm run init-db
```

3. Seed games from ESPN (gets current week):
```bash
npm run seed-games current
```

Or seed the entire season:
```bash
npm run seed-games season
```

4. Start the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

### Admin Password

**Password required for locked games only:** `f00tball#1`

- **Future games (before kickoff):** Anyone can make/change predictions
- **Started/finished games:** Require admin password to change
- **Manage Participants:** Requires admin password

When prompted:
- Enter password: `f00tball#1`
- Password stored in browser (stays logged in)
- Click "Logout Admin" to clear authentication

### Adding Participants

1. Click "Manage Participants"
2. Enter a name and click "Add Person"
3. Repeat for each person in your pool

### Making Predictions

1. Select the week using the week navigation buttons
2. For each game, click the cell under each person's name
   - First click: Selects home team
   - Second click: Selects away team
   - Third click: Clears selection (no pick)
3. Predictions save automatically as you click

### How Predictions Work

- **Unlocked games** (before kickoff): Click to change picks
- **Locked games** (after kickoff): Cannot change picks
- **Finished games**:
  - Green background = correct prediction
  - Red background = incorrect prediction
  - Shows ✓ or ✗ indicator

### Viewing the Leaderboard

The leaderboard shows:
- **Rank**: Position based on win percentage
- **W-L-P**: Wins - Losses - Pending
- **Win %**: Percentage of correct predictions (excludes pending)
- **Total**: Total predictions made

## Automatic Score Syncing

Scores sync automatically via cron job when deployed to Vercel (every 15 minutes).

For local development, use the **"Sync Scores Now"** button in the UI (requires admin password), or manually trigger a sync:
```bash
curl -H "Authorization: Bearer dev-cron-secret-change-in-production" \
  http://localhost:3000/api/cron/sync-scores
```

## Deployment to Vercel

1. Push your code to GitHub

2. Import project in Vercel dashboard

3. Add environment variables in Vercel:
   ```
   DATABASE_PATH=./data/sports-picks.db
   SESSION_SECRET=your-random-32-char-string
   CRON_SECRET=your-random-secret
   ESPN_API_BASE_URL=https://site.api.espn.com/apis/site/v2/sports/football/nfl
   CURRENT_SEASON=2025
   CURRENT_SEASON_TYPE=2
   ```

4. Deploy

5. After first deploy, seed the games:
   - Use Vercel CLI or trigger the sync endpoint with your CRON_SECRET

## Database

The app uses SQLite with the following tables:
- **users**: Participants in the pool
- **games**: NFL games from ESPN
- **predictions**: User predictions for each game
- **leaderboard_stats**: Cached win/loss stats

Database file is stored at `./data/sports-picks.db` (gitignored).

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run init-db` - Initialize database schema
- `npm run seed-games` - Seed games from ESPN
- `npm run seed-games current` - Seed current week only

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: SQLite (better-sqlite3)
- **Session**: iron-session
- **API**: ESPN Public API

## File Structure

```
sports-picks/
├── app/
│   ├── api/              # API routes
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles
├── components/
│   ├── prediction/       # Prediction grid & cells
│   └── leaderboard/      # Leaderboard table
├── lib/
│   ├── db/              # Database setup
│   ├── repositories/    # Data access layer
│   ├── services/        # Business logic
│   ├── espn/            # ESPN API client
│   └── utils/           # Utilities
├── types/               # TypeScript types
├── scripts/             # Setup scripts
└── data/                # SQLite database (gitignored)
```

## License

MIT
