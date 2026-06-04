'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
  User,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import {
  useSaveTelegramConfig,
  useTelegramConfig,
  useTelegramLink,
  useTelegramUnlink,
} from '@/hooks/useTelegram';
import { getInitials } from '@/lib/utils';

function getProviderLabel(provider?: string) {
  if (provider === 'google') return 'Google';
  if (provider === 'email') return 'E-posta ve sifre';
  return 'Standart hesap';
}

// While waiting for the user to press Start in Telegram, poll the profile so the
// UI flips to "linked" automatically. Stop polling after this many ms.
const LINK_POLL_TIMEOUT_MS = 120_000;

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: profile, isLoading, refetch } = useProfile();
  const { mutateAsync: updateProfile, isPending } = useUpdateProfile();

  const fallbackName = useMemo(
    () => profile?.full_name ?? user?.user_metadata?.full_name ?? user?.email?.split('@')[0] ?? '',
    [profile?.full_name, user?.email, user?.user_metadata]
  );

  const provider = user?.app_metadata?.provider ?? user?.identities?.[0]?.provider;
  const [fullName, setFullName] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [editing, setEditing] = useState(false);
  const [editingTelegram, setEditingTelegram] = useState(false);

  useEffect(() => {
    setFullName(fallbackName);
  }, [fallbackName]);

  useEffect(() => {
    setTelegramChatId(profile?.telegram_chat_id ?? '');
  }, [profile?.telegram_chat_id]);

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

  const handleTelegramSave = async () => {
    await updateProfile({ telegramChatId: telegramChatId.trim() || null });
    setEditingTelegram(false);
  };

  const handleTelegramCancel = () => {
    setTelegramChatId(profile?.telegram_chat_id ?? '');
    setEditingTelegram(false);
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

      <TelegramConnectionCard
        isLinked={!!profile?.telegram_chat_id}
        chatId={profile?.telegram_chat_id ?? null}
        refetchProfile={() => void refetch()}
        editingTelegram={editingTelegram}
        telegramChatId={telegramChatId}
        setTelegramChatId={setTelegramChatId}
        setEditingTelegram={setEditingTelegram}
        onTelegramSave={() => void handleTelegramSave()}
        onTelegramCancel={handleTelegramCancel}
        savedChatId={profile?.telegram_chat_id ?? ''}
        isPending={isPending}
      />

      <TelegramBotSetupCard />
    </div>
  );
}

interface TelegramConnectionCardProps {
  isLinked: boolean;
  chatId: string | null;
  refetchProfile: () => void;
  editingTelegram: boolean;
  telegramChatId: string;
  setTelegramChatId: (value: string) => void;
  setEditingTelegram: (value: boolean) => void;
  onTelegramSave: () => void;
  onTelegramCancel: () => void;
  savedChatId: string;
  isPending: boolean;
}

function TelegramConnectionCard({
  isLinked,
  chatId,
  refetchProfile,
  editingTelegram,
  telegramChatId,
  setTelegramChatId,
  setEditingTelegram,
  onTelegramSave,
  onTelegramCancel,
  savedChatId,
  isPending,
}: TelegramConnectionCardProps) {
  const { mutateAsync: createLink, isPending: isLinking } = useTelegramLink();
  const { mutateAsync: unlink, isPending: isUnlinking } = useTelegramUnlink();
  const [waiting, setWaiting] = useState(false);

  // Poll the profile while waiting for the Telegram Start tap to land.
  useEffect(() => {
    if (!waiting) return;
    if (isLinked) {
      setWaiting(false);
      toast.success('Telegram hesabiniz baglandi');
      return;
    }
    const interval = setInterval(refetchProfile, 3000);
    const timeout = setTimeout(() => setWaiting(false), LINK_POLL_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [waiting, isLinked, refetchProfile]);

  const handleConnect = async () => {
    try {
      const { deepLink } = await createLink();
      setWaiting(true);
      window.open(deepLink, '_blank', 'noopener,noreferrer');
    } catch {
      // Error toast is handled inside the hook.
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-100 text-sky-600">
          <Send className="h-5 w-5" />
        </span>
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Telegram Baglantisi</h2>
          <p className="text-sm text-muted-foreground">
            Gorev atandiginda ve panolar guncellendiginde Telegram&apos;dan bildirim alin.
          </p>
        </div>
      </div>

      {isLinked ? (
        <div className="mt-5 flex flex-col gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Bagli</span>
            <span className="text-green-600/80">Chat ID: {chatId}</span>
          </div>
          <Button
            variant="outline"
            onClick={() => void unlink()}
            disabled={isUnlinking}
            data-testid="telegram-unlink"
          >
            {isUnlinking ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Baglantiyi Kaldir'}
          </Button>
        </div>
      ) : (
        <div className="mt-5 space-y-4">
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">1.</span>
              <span>Asagidaki <span className="font-medium text-foreground">Telegram&apos;a Baglan</span> butonuna tiklayin.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">2.</span>
              <span>Acilan TaskFlow botunda <span className="font-medium text-foreground">Start</span> (Basla) butonuna basin.</span>
            </li>
            <li className="flex gap-2">
              <span className="font-semibold text-foreground">3.</span>
              <span>Hesabiniz otomatik baglanir; bu sayfa kendini gunceller.</span>
            </li>
          </ol>

          <Button onClick={() => void handleConnect()} disabled={isLinking || waiting} data-testid="telegram-connect">
            {isLinking || waiting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {waiting ? 'Baglanti bekleniyor...' : 'Hazirlaniyor...'}
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Telegram&apos;a Baglan
              </>
            )}
          </Button>

          {waiting && (
            <p className="text-xs text-muted-foreground">
              Telegram&apos;da Start&apos;a bastiktan sonra burasi otomatik guncellenecek. Telegram acilmadiysa pencereyi kontrol edin.
            </p>
          )}
        </div>
      )}

      <Collapsible className="mt-5 border-t border-border pt-4">
        <CollapsibleTrigger className="group flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground">
          <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          Gelismis: Chat ID&apos;yi elle gir
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-2">
          <Label htmlFor="telegramChatId">Telegram Chat ID</Label>
          {editingTelegram ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="telegramChatId"
                data-testid="profile-telegram-chat-id"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onTelegramSave();
                  if (e.key === 'Escape') onTelegramCancel();
                }}
                placeholder="Ornek: 123456789 veya -1001234567890"
                autoFocus
                disabled={isPending}
              />
              <div className="flex gap-2">
                <Button onClick={onTelegramSave} disabled={isPending}>
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Kaydet'}
                </Button>
                <Button variant="ghost" onClick={onTelegramCancel} disabled={isPending}>
                  Iptal
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                id="telegramChatId"
                value={savedChatId}
                readOnly
                className="bg-gray-50"
                placeholder="Telegram chat ID baglanmadi"
              />
              <Button
                variant="outline"
                onClick={() => {
                  setTelegramChatId(savedChatId);
                  setEditingTelegram(true);
                }}
              >
                Duzenle
              </Button>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            Otomatik baglama calismazsa, bota /start yazip aldiginiz Chat ID&apos;yi buraya elle kaydedebilirsiniz.
          </p>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

function TelegramBotSetupCard() {
  const { data: config, isLoading } = useTelegramConfig();
  const { mutateAsync: saveConfig, isPending } = useSaveTelegramConfig();
  const [botToken, setBotToken] = useState('');

  // Hidden entirely for non-admins (and while we don't yet know).
  if (isLoading || !config?.isAdmin) return null;

  const handleSave = async () => {
    const trimmed = botToken.trim();
    if (!trimmed) return;
    try {
      await saveConfig(trimmed);
      setBotToken('');
    } catch {
      // Error toast handled in the hook.
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Telegram Bot Kurulumu</h2>
          <p className="text-sm text-muted-foreground">
            Uygulamanin ortak botunu BotFather&apos;dan olusturup buradan baglayin.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {config.configured && config.botUsername ? (
            <Badge variant="secondary">@{config.botUsername}</Badge>
          ) : (
            <Badge variant="outline">Yapilandirilmadi</Badge>
          )}
          {config.webhookRegistered ? (
            <Badge className="bg-green-600 hover:bg-green-600">Webhook aktif</Badge>
          ) : (
            <Badge variant="destructive">Webhook yok</Badge>
          )}
        </div>
      </div>

      <ol className="mt-4 space-y-2 text-sm text-muted-foreground">
        <li className="flex gap-2">
          <span className="font-semibold text-foreground">1.</span>
          <span>
            Telegram&apos;da{' '}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary underline-offset-2 hover:underline"
            >
              @BotFather
            </a>{' '}
            ile <span className="font-medium text-foreground">/newbot</span> komutunu calistirin.
          </span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-foreground">2.</span>
          <span>Bot adi ve kullanici adini belirleyin; BotFather size bir <span className="font-medium text-foreground">token</span> verir.</span>
        </li>
        <li className="flex gap-2">
          <span className="font-semibold text-foreground">3.</span>
          <span>Token&apos;i asagiya yapistirip <span className="font-medium text-foreground">Botu Bagla</span> deyin; webhook otomatik kurulur.</span>
        </li>
      </ol>

      <div className="mt-4 space-y-2">
        <Label htmlFor="botToken">Bot Token</Label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <Input
            id="botToken"
            data-testid="telegram-bot-token"
            type="password"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void handleSave();
            }}
            placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyz"
            disabled={isPending}
            autoComplete="off"
          />
          <Button onClick={() => void handleSave()} disabled={isPending || !botToken.trim()}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Botu Bagla & Webhook Kur'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Token guvenli sekilde saklanir ve hicbir zaman geri gosterilmez.
        </p>
      </div>
    </div>
  );
}
