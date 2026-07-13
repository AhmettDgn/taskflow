import { Providers } from '@/app/providers';
import { createClient } from '@/lib/supabase/server';
import type { UserSummary } from '@/lib/types';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { LazyCommandPalette } from '@/components/ui/LazyCommandPalette';

export const dynamic = 'force-dynamic';

function getUserSummary(user: {
  email?: string | null;
  user_metadata?: { full_name?: string | null };
} | null): UserSummary | null {
  if (!user) return null;

  return {
    email: user.email ?? null,
    fullName:
      typeof user.user_metadata?.full_name === 'string'
        ? user.user_metadata.full_name
        : null,
  };
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  // Middleware bu istek için getUser() ile oturumu zaten doğruladı; burada yalnızca
  // görüntülenecek ad/e-posta gerekiyor — ikinci bir auth network turu yapma.
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userSummary = getUserSummary(session?.user ?? null);

  return (
    <Providers>
      <div className="flex min-h-[100dvh] bg-gray-50 md:h-screen md:overflow-hidden">
        <Sidebar user={userSummary} />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar user={userSummary} />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
        <LazyCommandPalette />
      </div>
    </Providers>
  );
}
