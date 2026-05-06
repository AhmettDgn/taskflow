import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export const metadata: Metadata = { title: 'Şifre Sıfırla' };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold">Şifrenizi sıfırlayın</h1>
        <p className="mt-1 text-muted-foreground">
          E-posta adresinizi girin, sıfırlama bağlantısı gönderelim
        </p>
      </div>
      <ForgotPasswordForm />
    </div>
  );
}
