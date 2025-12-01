import { redirect } from 'next/navigation';
import { validateAdminToken } from '@/lib/utils/tokens';
import MainPage from '@/components/admin/MainPage';

interface AdminPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function AdminPage({ params }: AdminPageProps) {
  // Await params
  const { token } = await params;

  // Validate admin token
  if (!validateAdminToken(token)) {
    redirect('/');
  }

  return <MainPage adminToken={token} />;
}
