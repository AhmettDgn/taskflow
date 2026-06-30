import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Giriş Yap' };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <img src="/logo.svg" alt="TaskFlow Logo" className="mb-4 h-12 w-12 rounded-xl shadow-md" />
        <h1 className="text-2xl font-bold">Tekrar hoş geldiniz</h1>
        <p className="mt-1 text-muted-foreground">TaskFlow hesabınıza giriş yapın</p>
      </div>
      <LoginForm />
    </div>
  );
}
