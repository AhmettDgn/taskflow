import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Hesap Oluştur' };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center text-center">
        <img src="/logo.svg" alt="TaskFlow Logo" className="mb-4 h-12 w-12 rounded-xl shadow-md" />
        <h1 className="text-2xl font-bold">Hesap oluşturun</h1>
        <p className="mt-1 text-muted-foreground">Ekibinizle görev yönetimine başlayın</p>
      </div>
      <RegisterForm />
    </div>
  );
}
