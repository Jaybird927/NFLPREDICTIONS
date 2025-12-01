import { redirect } from 'next/navigation';
import { validateAdminToken } from '@/lib/utils/tokens';
import { getAllUsers } from '@/lib/repositories/users';
import TokenLinksTable from '@/components/admin/TokenLinksTable';

interface AdminLinksPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function AdminLinksPage({ params }: AdminLinksPageProps) {
  // Await params
  const { token } = await params;

  // Validate admin token
  if (!validateAdminToken(token)) {
    redirect('/');
  }

  const users = getAllUsers();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">User Links</h1>
          <p className="text-gray-600">Share these links with each participant</p>
        </div>
        <TokenLinksTable users={users} baseUrl={baseUrl} />
      </div>
    </div>
  );
}
