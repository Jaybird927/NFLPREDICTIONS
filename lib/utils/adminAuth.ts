export function isAdminAuthenticated(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('adminAuth') === 'true';
}

export function logoutAdmin(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('adminAuth');
}
