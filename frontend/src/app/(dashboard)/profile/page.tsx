'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2, Mail, ShieldCheck, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { getInitials } from '@/lib/utils';

function getProviderLabel(provider?: string) {
  if (provider === 'google') return 'Google';
  if (provider === 'email') return 'E-posta ve sifre';
  return 'Standart hesap';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const fallbackName = useMemo(
    () => profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '',
    [profile?.full_name, user?.email, user?.user_metadata]
  );

  const provider = user?.app_metadata?.provider ?? user?.identities?.[0]?.provider;
  const [fullName, setFullName] = useState('');
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    setFullName(fallbackName);
  }, [fallbackName]);

  const handleSave = async () => {
    const trimmed = fullName.trim();
    if (!trimmed) return;
    await updateProfile({ fullName: trimmed });
    setEditing(false);
  };

  const handleCancel = () => {
    setFullName(fallbackName);
    setEditing(false);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="profile-heading">Profil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Hesap bilgilerinizi ve giris yonteminizi buradan yonetin.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-xl font-bold text-primary">
              {isLoading ? (
                <User className="h-7 w-7 text-muted-foreground" />
              ) : (
                getInitials(fallbackName || null)
              )}
            </div>
            <div className="space-y-1">
              {isLoading ? (
                <Skeleton className="h-5 w-40" />
              ) : (
                <p className="text-lg font-semibold">{fallbackName || 'Kullanici'}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{user?.email ?? ''}</span>
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary/40 px-3 py-1.5 text-sm text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <span>{getProviderLabel(provider)}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Ad Soyad</Label>
            {editing ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleSave();
                    if (e.key === 'Escape') handleCancel();
                  }}
                  autoFocus
                  disabled={isPending}
                />
                <div className="flex gap-2">
                  <Button onClick={() => void handleSave()} disabled={isPending || !fullName.trim()}>
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
                  </Button>
                  <Button variant="ghost" onClick={handleCancel} disabled={isPending}>
                    Iptal
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-3 sm:flex-row">
                <Input
                  id="fullName"
                  value={fallbackName}
                  readOnly
                  className="bg-gray-50"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    setFullName(fallbackName);
                    setEditing(true);
                  }}
                >
                  Duzenle
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input id="email" value={user?.email ?? ''} readOnly disabled className="bg-gray-50" />
            <p className="text-xs text-muted-foreground">
              E-posta adresiniz Supabase hesabinizdan yonetilir.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Giris Yontemi</Label>
            <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              Bu hesap su anda <span className="font-medium text-foreground">{getProviderLabel(provider)}</span>{' '}
              ile bagli.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
