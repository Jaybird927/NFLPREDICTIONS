import { notFound } from 'next/navigation';
import { validateUserToken } from '@/lib/utils/tokens';
import UserPredictionView from '@/components/user/UserPredictionView';

interface UserPageProps {
  params: Promise<{
    token: string;
  }>;
}

export default async function UserPage({ params }: UserPageProps) {
  // Await params
  const { token } = await params;

  // Validate user token
  const userAuth = validateUserToken(token);

  if (!userAuth) {
    notFound();
  }

  return <UserPredictionView userId={userAuth.userId} displayName={userAuth.displayName} authToken={token} />;
}
