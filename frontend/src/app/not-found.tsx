import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex h-screen flex-col items-center justify-center gap-4">
      <h2 className="text-2xl font-bold">404 — Sayfa Bulunamadı</h2>
      <p className="text-muted-foreground">Aradığınız sayfa mevcut değil.</p>
      <Link
        href="/dashboard"
        className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
      >
        Dashboard&apos;a Git
      </Link>
    </div>
  );
}
