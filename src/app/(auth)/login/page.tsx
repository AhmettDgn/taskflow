import type { Metadata } from 'next';
import { LoginForm } from '@/components/auth/LoginForm';

export const metadata: Metadata = { title: 'Giriş Yap' };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Tekrar hoş geldiniz</h1>
        <p className="mt-1 text-muted-foreground">TaskFlow hesabınıza giriş yapın</p>
      </div>
      <LoginForm />
    </div>
  );
}
