import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/RegisterForm';

export const metadata: Metadata = { title: 'Hesap Oluştur' };

export default function RegisterPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Hesap oluşturun</h1>
        <p className="mt-1 text-muted-foreground">Ekibinizle görev yönetimine başlayın</p>
      </div>
      <RegisterForm />
    </div>
  );
}
