import { Providers } from '@/app/providers';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { MobileNav } from '@/components/layout/MobileNav';
import { CommandPalette } from '@/components/ui/CommandPalette';

// Dashboard pages are always dynamic — they require authentication
export const dynamic = 'force-dynamic';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-[100dvh] bg-gray-50 md:h-screen md:overflow-hidden">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
            {children}
          </main>
        </div>
        <MobileNav />
        <CommandPalette />
      </div>
    </Providers>
  );
}
