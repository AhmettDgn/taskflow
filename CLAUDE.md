# TaskFlow – Notion-benzeri Görev Yönetim Uygulaması

## Proje Özeti

Ekiplerin görev alışverişi yapabildiği, görev durumlarını gerçek zamanlı takip edebildiği,
Notion benzeri sade bir web uygulaması. Tamamen ücretsiz servislerle çalışır.

## Teknoloji Yığını

- **Framework:** Next.js 14 (App Router)
- **Dil:** TypeScript (strict)
- **Stil:** Tailwind CSS 3
- **UI Kütüphanesi:** shadcn/ui (Radix UI tabanlı) + Lucide Icons
- **Veritabanı + Auth + Realtime:** Supabase (PostgreSQL)
- **State Yönetimi:**
  - Sunucu state: TanStack Query v5 (@tanstack/react-query)
  - İstemci state: Zustand
- **Form Yönetimi:** React Hook Form + Zod
- **Sürükle Bırak:** @hello-pangea/dnd
- **Hosting:** Vercel
- **Paket Yöneticisi:** pnpm (tercihen)


## Veritabanı Şeması (Supabase / PostgreSQL)

### `auth.users` (Supabase tarafından yönetilir)
Ek alanlar `public.profiles` tablosunda saklanır.

### `public.profiles`
- `id` uuid PK -> references auth.users(id)
- `email` text not null
- `full_name` text
- `avatar_url` text

### `public.teams`
- `id` uuid PK default gen_random_uuid()
- `name` text not null
- `created_by` uuid FK -> profiles(id)
- `invite_code` text unique default encode(gen_random_bytes(6), 'base64')
- `created_at` timestamptz default now()

### `public.team_members`
- `id` uuid PK
- `team_id` uuid FK -> teams(id) on delete cascade
- `user_id` uuid FK -> profiles(id)
- `role` text not null default 'member' check (role in ('admin', 'member'))
- `joined_at` timestamptz default now()
- unique(team_id, user_id)

### `public.tasks`
- `id` uuid PK default gen_random_uuid()
- `team_id` uuid FK -> teams(id) on delete cascade
- `title` text not null
- `description` text
- `status` text not null default 'todo' check (status in ('todo', 'in_progress', 'done', 'on_hold'))
- `priority` text not null default 'medium' check (priority in ('low', 'medium', 'high'))
- `due_date` timestamptz
- `created_by` uuid FK -> profiles(id)
- `created_at` timestamptz default now()
- `updated_at` timestamptz default now()

### `public.task_assignees`
- `id` uuid PK
- `task_id` uuid FK -> tasks(id) on delete cascade
- `user_id` uuid FK -> profiles(id)
- unique(task_id, user_id)

### `public.comments`
- `id` uuid PK
- `task_id` uuid FK -> tasks(id) on delete cascade
- `user_id` uuid FK -> profiles(id)
- `content` text not null
- `created_at` timestamptz default now()

### `public.notifications`
- `id` uuid PK
- `user_id` uuid FK -> profiles(id) on delete cascade
- `type` text not null (task_assigned, status_changed, comment_added vb.)
- `content` text
- `task_id` uuid FK -> tasks(id) on delete cascade
- `is_read` boolean default false
- `created_at` timestamptz default now()

## Row Level Security (RLS) Prensipleri

Tüm tablolar RLS ile korunur:
- `profiles`: Kullanıcı sadece kendi profilini güncelleyebilir, herkes okuyabilir.
- `teams`: Takım üyeleri okuyabilir, sadece admin güncelleyebilir.
- `team_members`: Takım üyeleri okuyabilir, sadece admin ekle/çıkar.
- `tasks`: Sadece takımın üyeleri okuyabilir, oluşturan veya admin güncelleyebilir.
- `task_assignees`: Takım üyeleri okuyabilir, admin veya atayan yönetebilir.
- `comments`: Takım üyeleri okuyabilir, sadece yorum sahibi düzenle/sil.
- `notifications`: Sadece bildirimin sahibi okuyabilir, güncelleyebilir.

## State Yönetimi Detayları

### Sunucu State (TanStack Query)
- Tüm Supabase sorguları `useQuery` ile sarılır: görevler, ekipler, yorumlar...
- Mutasyonlar `useMutation` ile yapılır.
- Optimistic update: Board sürükle-bırakta anında UI güncellemesi, hata durumunda rollback.
- Stale time: 30 saniye (realtime ile taze kalır).
- Query key yapısı: `['tasks', teamId, filters]`, `['task', taskId]`, `['team', teamId]`...

### İstemci State (Zustand)
- `useUIStore`: sidebarOpen, activeModal
- `useTaskFilterStore`: selectedStatuses, selectedAssignees, searchQuery, sortBy
- Filtreler URL search params ile senkronize edilir (`nuqs` kütüphanesi opsiyonel).

### Gerçek Zamanlı (Supabase Realtime)
- Her ekip sayfasında `tasks` kanalına abone olunur.
- `useRealtimeTasks(teamId)` hook'u:
  - INSERT, UPDATE, DELETE olaylarını dinler.
  - React Query cache'ini günceller (`queryClient.setQueryData`).
  - Kendi yaptığın değişiklikler için mükerrer güncelleme yapmaz (sender kontrolü).

## Sayfa-Yetkilendirme Haritası

| Rota | Yetki |
|------|-------|
| `/`, `(auth)/*` | Herkese açık, oturum açmamışsa |
| `(dashboard)/dashboard` | Oturum açmış kullanıcı |
| `(dashboard)/teams/*` | Oturum açmış + o ekibe üye |
| `(dashboard)/tasks/*` | Oturum açmış + görevin ekibine üye |
| `/api/*` | Route handler içinde yetki kontrolü |

## Tasarım Sistemi (Tailwind Config)

- **Arka plan:** gray-50
- **İkonlar:** Lucide React

## Hata ve Boş Durum Yönetimi

Her sayfa ve veri çeken bileşen şunları ele alır:
1. **Loading:** Skeleton ekran (Tailwind animate-pulse)
2. **Empty:** `EmptyState` bileşeni (ikon + mesaj + aksiyon butonu)
3. **Error:** Toast bildirimi (Sonner) + varsa fallback UI
4. **404:** Özel not-found sayfası

## Önemli Notlar

- Next.js middleware ile oturum kontrolü yapılır.
- Supabase Auth PKCE flow kullanılır (güvenli tarayıcı auth).
- shadcn/ui bileşenleri `npx shadcn-ui@latest add <component>` ile eklenir.
- Tüm formlar React Hook Form + Zod ile yönetilir.
- Supabase tipleri `supabase gen types typescript --linked > src/lib/types.ts` ile oluşturulur.
- Vercel deploy için `NEXT_PUBLIC_SUPABASE_URL` ve `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` ortam değişkenleri tanımlanır.
- Mutation hook'larında `getAuthContext()` kullan (`src/lib/supabase/auth-helpers.ts`) — tek client instance + profile upsert garantisi.

## Aktif Planlar

- **Front-End Yenileme Planı:** [`docs/frontend-redesign.md`](docs/frontend-redesign.md)
  - CSS animasyon felsefesi (framer-motion yok)
  - @dnd-kit board mimarisi (@hello-pangea/dnd → @dnd-kit migration)
  - Sidebar collapse, ⌘K komut paleti, dark mode toggle
  - shadcn/ui ek bileşenler: Tooltip, Popover, Command, Sheet