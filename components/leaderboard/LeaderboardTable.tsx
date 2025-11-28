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
}

export function LeaderboardTable({ entries }: LeaderboardTableProps) {
  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No predictions yet - start making picks to see the leaderboard!
      </div>
    );
  }

  return (
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

            return (
              <tr key={entry.id} className="hover:bg-gray-50">
                <td className="border border-gray-300 px-4 py-2 text-center font-semibold">
                  {entry.rank}
                </td>
                <td className="border border-gray-300 px-4 py-2">
                  {entry.display_name}
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
  );
}
