# TaskFlow

Küçük ekipler için Notion benzeri görev yönetim uygulaması. Gerçek zamanlı görev takibi, board/liste görünümü ve takım iş birliği.

## Özellikler

- **Kimlik Doğrulama** — Supabase Auth (PKCE), e-posta + şifre
- **Takım Yönetimi** — Ekip oluşturma, davet kodu ile katılma, üye ve rol yönetimi
- **Görev CRUD** — Oluşturma, düzenleme, silme, atama, vade tarihi
- **Board Görünümü** — Sürükle-bırak ile kolon arası taşıma (optimistic update)
- **Liste Görünümü** — Tablo görünümü, inline durum güncelleme
- **Yorumlar** — Gerçek zamanlı yorum ekleme/silme
- **Bildirimler** — Görev atama, durum değişikliği ve yorum bildirimleri (gerçek zamanlı)
- **Gerçek Zamanlı** — Supabase Realtime ile tüm değişiklikler anlık yansır

## Teknoloji Yığını

| Katman | Teknoloji |
|--------|-----------|
| Framework | Next.js 14 (App Router) |
| Dil | TypeScript (strict) |
| Stil | Tailwind CSS 3 + shadcn/ui |
| Veritabanı | Supabase (PostgreSQL) |
| Auth | Supabase Auth (PKCE) |
| Realtime | Supabase Realtime |
| Sunucu State | TanStack Query v5 |
| İstemci State | Zustand |
| Formlar | React Hook Form + Zod |
| Sürükle-Bırak | @hello-pangea/dnd |
| Hosting | Vercel |

## Kurulum

### 1. Repoyu klonlayın

```bash
git clone <repo-url>
cd taskflow
```

### 2. Bağımlılıkları kurun

```bash
pnpm install
```

### 3. Supabase projesi oluşturun

1. [supabase.com](https://supabase.com) adresinde yeni proje oluşturun
2. SQL Editor'da `supabase/migrations/001_create_tables.sql` çalıştırın
3. SQL Editor'da `supabase/migrations/002_triggers_notifications.sql` çalıştırın

### 4. Ortam değişkenlerini ayarlayın

```bash
cp .env.example .env.local
```

`.env.local` dosyasını düzenleyin:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 5. Geliştirme sunucusunu başlatın

```bash
pnpm dev
```

[http://localhost:3000](http://localhost:3000) adresini açın.

## Vercel Deploy

### Otomatik Deploy

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

### Manuel Deploy

```bash
# Vercel CLI kurulumu
npm i -g vercel

# Deploy
vercel

# Production deploy
vercel --prod
```

### Vercel Ortam Değişkenleri

Vercel Dashboard → Project → Settings → Environment Variables bölümüne ekleyin:

| Değişken | Açıklama |
|----------|----------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase proje URL'i |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (gizli) |
| `NEXT_PUBLIC_APP_URL` | Production URL (ör: https://taskflow.vercel.app) |

### Supabase Auth Callback URL

Supabase Dashboard → Authentication → URL Configuration:

- **Site URL:** `https://your-app.vercel.app`
- **Redirect URLs:** `https://your-app.vercel.app/auth/callback`

## Proje Yapısı

```
src/
├── app/              # Next.js App Router sayfaları
├── components/       # React bileşenleri
│   ├── ui/          # shadcn/ui temel bileşenler
│   ├── layout/      # Sidebar, Topbar, MobileNav
│   ├── auth/        # Giriş/kayıt formları
│   ├── tasks/       # Görev bileşenleri (Board, Card, Form)
│   ├── teams/       # Takım bileşenleri
│   ├── comments/    # Yorum bileşenleri
│   └── notifications/ # Bildirim bileşenleri
├── hooks/           # Custom React hooks
├── lib/             # Supabase clients, types, utils
└── store/           # Zustand stores
```
