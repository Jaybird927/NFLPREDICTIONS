'use client';

interface LeaderboardEntry {
  id: number;
  display_name: string;
  total_predictions: number;
  correct_predictions: number;
  incorrect_predictions: number;
  pending_predictions: number;
  win_percentage: number;
  rank: number;
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  highlightUserId?: number;
}

export function LeaderboardTable({ entries, highlightUserId }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No predictions yet - start making picks to see the leaderboard!
      </div>
    );
  }

  // Find highlighted user's entry and position info
  const userEntry = entries.find(e => e.id === highlightUserId);
  let feedbackMessage = '';

  if (userEntry && highlightUserId) {
    const userRank = userEntry.rank;
    const lastRank = entries[entries.length - 1]?.rank || 1;

    // Check if tied for first
    const tiedForFirst = entries.filter(e => e.rank === 1).length > 1 && userRank === 1;
    // Check if tied for last
    const tiedForLast = entries.filter(e => e.rank === lastRank).length > 1 && userRank === lastRank;
    // Check if alone in first
    const isFirst = userRank === 1 && !tiedForFirst;
    // Check if alone in last
    const isLast = userRank === lastRank && !tiedForLast && entries.length > 1;

    if (isFirst) {
      feedbackMessage = "🏆 1st place - You're doing great!";
    } else if (tiedForFirst) {
      feedbackMessage = "🏆 T-1st - You're doing great!";
    } else if (isLast) {
      feedbackMessage = "💪 You can do this!";
    } else if (tiedForLast) {
      feedbackMessage = "💪 You can do this!";
    } else if (userRank === 2) {
      feedbackMessage = "🥈 2nd place - Keep pushing!";
    } else if (userRank === 3) {
      feedbackMessage = "🥉 3rd place - Nice work!";
    } else {
      feedbackMessage = `📊 ${userRank}${getOrdinalSuffix(userRank)} place - Keep it up!`;
    }
  }

  function getOrdinalSuffix(num: number): string {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
      <table className="min-w-full border-collapse bg-white">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-sm">
              Rank
            </th>
            <th className="border border-gray-300 px-4 py-2 text-left font-semibold text-sm">
              Name
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-sm">
              W-L-P
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-sm">
              Win %
            </th>
            <th className="border border-gray-300 px-4 py-2 text-center font-semibold text-sm">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => {
            const displayWinPercentage =
              entry.correct_predictions + entry.incorrect_predictions > 0
                ? entry.win_percentage.toFixed(1)
                : '-';

            const isHighlighted = highlightUserId === entry.id;

            return (
              <tr
                key={entry.id}
                className={isHighlighted ? "bg-blue-100 hover:bg-blue-200" : "hover:bg-gray-50"}
              >
                <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                  {entry.rank}
                </td>
                <td className={`border border-gray-300 px-4 py-2 ${isHighlighted ? "font-bold" : ""}`}>
                  {entry.display_name}
                  {isHighlighted && " (You)"}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center font-mono text-sm">
                  {entry.correct_predictions}-{entry.incorrect_predictions}-
                  {entry.pending_predictions}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                  {displayWinPercentage}
                  {displayWinPercentage !== '-' && '%'}
                </td>
                <td className="border border-gray-300 px-4 py-2 text-center text-sm text-gray-600">
                  {entry.total_predictions}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>

      {/* Feedback Message */}
      {feedbackMessage && (
        <div className="text-center p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <p className="text-lg font-semibold text-blue-900">{feedbackMessage}</p>
        </div>
      )}
    </div>
  );
}
