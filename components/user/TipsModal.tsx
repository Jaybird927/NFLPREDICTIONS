'use client';

interface TipsModalProps {
  onClose: () => void;
}

export function TipsModal({ onClose }: TipsModalProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Tips & How to Play</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
            >
              ×
            </button>
          </div>

          <div className="space-y-6 text-gray-700">
            <section>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Making Predictions</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Click on a team logo to predict they will win that game</li>
                <li>Click the team again to deselect if you want to change your pick</li>
                <li>Make sure to submit your picks before the game starts!</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Game Status</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Pre-game:</strong> Games not yet started - you can still change your picks</li>
                <li><strong>In Progress:</strong> Game is currently being played - picks are locked</li>
                <li><strong>Final:</strong> Game is over - your prediction is scored</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Scoring</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Correct predictions are shown with a green checkmark ✓</li>
                <li>Incorrect predictions are shown with a red X ✗</li>
                <li>W-L-P stands for Win-Loss-Pending (games not yet finished)</li>
                <li className="text-red-600 font-semibold">⚠️ If you don't make a pick and the game finishes, it counts as a LOSS</li>
                <li>Win percentage is calculated from completed games only</li>
                <li>The leaderboard shows your ranking against other participants</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Navigation</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li>Use the week selector to view different weeks</li>
                <li>Click "Sync Scores Now" to get the latest game results</li>
                <li>The page auto-refreshes every minute to show updated scores</li>
                <li>Check the leaderboard at the bottom to see where you stand</li>
              </ul>
            </section>

            <section>
              <h3 className="text-xl font-semibold mb-2 text-gray-900">Tips</h3>
              <ul className="list-disc pl-5 space-y-2">
                <li className="text-orange-600 font-semibold">📅 It's recommended to submit all your picks before Thursday Night Football</li>
                <li>Make your picks early in the week for all games</li>
                <li>You can come back and update picks before games start</li>
                <li>Your row in the leaderboard is highlighted in blue</li>
                <li>Bookmark this page to easily access your picks</li>
              </ul>
            </section>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
