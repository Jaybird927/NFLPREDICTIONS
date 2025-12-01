'use client';

import { useState } from 'react';
import { User } from '@/types';

interface TokenLinksTableProps {
  users: User[];
  baseUrl: string;
}

export default function TokenLinksTable({ users, baseUrl }: TokenLinksTableProps) {
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const copyToClipboard = async (text: string, userId: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(userId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      alert('Failed to copy to clipboard');
    }
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <table className="min-w-full">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Name
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Link
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {users.map((user) => {
            if (!user.authToken) return null;

            const userLink = `${baseUrl}/user/${user.authToken}`;

            return (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{user.displayName}</div>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-500 truncate max-w-md" title={userLink}>
                    {userLink}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => copyToClipboard(userLink, user.id)}
                    className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    {copiedId === user.id ? '✓ Copied!' : 'Copy Link'}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
