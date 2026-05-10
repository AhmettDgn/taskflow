# TaskFlow — Proje Belleği

## Proje Özeti
Küçük ekipler için Notion benzeri görev yönetim uygulaması.  
Gerçek zamanlı görev takibi, board/liste görünümü, takım iş birliği.

---

## Teknoloji Yığını

| Katman | Teknoloji | Versiyon |
|--------|-----------|---------|
| Framework | Next.js | 14.x (App Router) |
| Dil | TypeScript | 5.x (strict) |
| Stil | Tailwind CSS | 3.x |
| UI Kütüphanesi | shadcn/ui (Radix UI tabanlı) | latest |
| İkonlar | Lucide React | latest |
| Veritabanı | Supabase (PostgreSQL) | latest |
| Auth | Supabase Auth | PKCE flow |
| Realtime | Supabase Realtime | Postgres Changes |
| Sunucu State | TanStack Query | v5 |
| İstemci State | Zustand | v5 |
| Formlar | React Hook Form + Zod | latest |
| Sürükle-Bırak | @hello-pangea/dnd | latest |
| Toast | Sonner | latest |
| Hosting | Vercel | - |
| Paket Yöneticisi | pnpm | 10.x |

---

## Faz Takibi

### Faz 1 — Mimari Kurulum [TAMAMLANDI] ✅
- [x] Next.js 14 projesi başlatıldı
- [x] Tüm bağımlılıklar kuruldu
- [x] `next.config.mjs`, `tailwind.config.ts` yazıldı
- [x] `src/styles/globals.css` — shadcn/ui CSS değişkenleri, indigo-600 primary
- [x] Supabase clients: `lib/supabase/client.ts`, `server.ts`, `admin.ts`
- [x] Core tipler: `src/lib/types.ts`
- [x] Sabitler: `src/lib/constants.ts`
- [x] Yardımcı fonksiyonlar: `src/lib/utils.ts` (cn, formatDate, getInitials)
- [x] Zustand store'ları: `useUIStore`, `useTaskFilterStore`
- [x] Custom hook iskeletleri: `useAuth`, `useTeam`, `useTasks`, `useRealtimeTasks`, `useNotifications`, `useMediaQuery`
- [x] Middleware: auth guard, PKCE flow
- [x] App Router sayfaları: tüm rotalar iskelet olarak oluşturuldu
- [x] Bileşenler: layout, auth, tasks, teams, comments, notifications
- [x] Supabase migration SQL dosyaları
- [x] `.env.example`, `.env.local`
- [x] `memory.md`

### Faz 2 — Kimlik Doğrulama [TAMAMLANDI] ✅
- [x] LoginForm — React Hook Form + Zod + `signInWithPassword` + toast + yönlendirme
- [x] RegisterForm — `signUp` + email doğrulama bildirimi
- [x] ForgotPasswordForm — `resetPasswordForEmail` + başarı ekranı
- [x] PKCE callback: `src/app/auth/callback/route.ts`
- [x] Topbar: kullanıcı avatar, ad, çıkış butonu (`signOut` → `/login`)
- [x] `useAuth` hook: `user`, `loading`, `signOut`
- [x] Zod validation: `src/lib/validations/auth.ts`
- [x] Auth + Dashboard layout'ları `force-dynamic` (prerender bypass)
- [x] Supabase key: `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (yeni format)

### Faz 3 — Takım Yönetimi [TAMAMLANDI] ✅
- [x] `useTeams`, `useTeam`, `useTeamMembers` — gerçek Supabase sorguları
- [x] `useCreateTeam`, `useJoinTeam`, `useRemoveTeamMember` — TanStack Query mutations
- [x] `CreateTeamForm` — takım oluşturma + admin olarak atama
- [x] `JoinTeamForm` — davet kodu ile katılma, duplicate kontrolü
- [x] `TeamCard` — davet kodu gösterimi + InviteButton + board linki
- [x] `MemberList` — rol badge, admin ise üye çıkarma butonu
- [x] `[teamId]/layout.tsx` — board/liste/üyeler/ayarlar sekme navigasyonu
- [x] `teams/page.tsx` — ekip listesi + boş durum + oluştur/katıl butonları
- [x] `teams/[teamId]/members/page.tsx` — üye listesi, admin kontrolü

### Faz 4 — Görev CRUD [TAMAMLANDI] ✅
- [x] `useTasks`, `useTask` — Supabase sorguları (task_assignees + profiles join)
- [x] `useCreateTask`, `useUpdateTask`, `useUpdateTaskStatus` (optimistic), `useDeleteTask`
- [x] `useAssignUser`, `useUnassignUser` — atama mutations
- [x] `TaskForm` — başlık, açıklama, durum, öncelik, vade, atananlar
- [x] `TaskCard` — detay linki, öncelik badge, vade tarihi, atanan avatarlar
- [x] `BoardView` — kolonlar içinde inline form, "Görev Ekle" butonu
- [x] Board sayfası — filtre + TanStack Query veri
- [x] Liste sayfası — tablo görünümü, inline durum güncelleme
- [x] Yeni görev sayfası — form + board'a yönlendirme
- [x] Görev detay sayfası — inline title/desc düzenleme, durum/öncelik/vade/atananlar

### Faz 5 — Board Görünümü + Sürükle-Bırak [TAMAMLANDI] ✅
- [x] `DragDropContext` → board'un tamamını sarar
- [x] Her kolon `Droppable` (droppableId = TaskStatus değeri)
- [x] Her kart `Draggable` (draggableId = task.id)
- [x] `onDragEnd` → farklı kolon ise `useUpdateTaskStatus` optimistic mutation
- [x] Rollback: hata durumunda TanStack Query önceki cache'i geri yükler
- [x] `TaskCard` → `isDragging` prop: rotate + scale + ring efekti
- [x] Drop zone highlight: `isDraggingOver` → arka plan rengi değişir

### Faz 6 — Gerçek Zamanlı [TAMAMLANDI] ✅
- [x] INSERT → `invalidateQueries` (assignee join gerektiği için refetch)
- [x] UPDATE → `setQueryData` ile direkt cache patch (loading spinner yok)
- [x] DELETE → `setQueryData` ile kartı listeden anında kaldır
- [x] `markLocalMutation(taskId)` → kendi mutation'larımızı 3s boyunca takip et
- [x] `isOwnMutation(taskId)` → kendi değişikliklerimizi realtime callback'te atla
- [x] Board, List ve Task Detail sayfalarına `useRealtimeTasks(teamId)` eklendi
- [x] Supabase kanalı: `tasks:team:{teamId}`, filter: `team_id=eq.{teamId}`

### Faz 7 — Yorumlar [TAMAMLANDI] ✅
- [x] `useComments(taskId)` — profiles join ile fetch, created_at ASC sıralama
- [x] `useAddComment` — optimistic cache append (setQueryData, refetch yok)
- [x] `useDeleteComment` — setQueryData ile anında kaldır
- [x] `useRealtimeComments` — INSERT → invalidate (profiles gerekli), DELETE → setQueryData
- [x] `CommentSection` — liste + form (Ctrl+Enter kısayolu), loading skeleton
- [x] `CommentItem` — hover'da silme butonu (sadece kendi yorumları)
- [x] Görev detay sayfasına `CommentSection` entegre edildi

### Faz 8 — Bildirimler [TAMAMLANDI] ✅
- [x] `useNotifications` — kullanıcıya ait bildirimler, son 50, created_at DESC
- [x] `useMarkAsRead` + `useMarkAllAsRead` — setQueryData ile anında patch
- [x] `useRealtimeNotifications` — INSERT → setQueryData prepend (anlık)
- [x] `NotificationBell` — okunmamış badge, dropdown toggle, dışarı tıklama/ESC ile kapat
- [x] `NotificationDropdown` — okundu/okunmamış stili, tür badge, "Tümünü okundu" butonu
- [x] `Topbar` — plain bell yerine `NotificationBell` bileşeni
- [x] `/notifications` sayfası — tam liste, boş durum, skeleton

### Faz 9 — Son Rötuşlar + Dağıtım [TAMAMLANDI] ✅
- [x] `EmptyState` bileşeni — icon, title, description, action prop
- [x] `useProfile` + `useUpdateProfile` — ad soyad inline düzenleme
- [x] Profil sayfası — avatar, e-posta (readonly), ad soyad (düzenlenebilir)
- [x] Dashboard sayfası — hoşgeldin, görev istatistikleri, ekipler ve hızlı erişim
- [x] Global görevler sayfası — tüm ekiplerden arama ile filtreleme
- [x] `MobileNav` — pathname aktif stili, bildirim badge, `md:hidden`
- [x] Dashboard layout — MobileNav entegrasyonu, mobil padding (`pb-20`)
- [x] Dashboard error boundary (`src/app/(dashboard)/error.tsx`)
- [x] `README.md` — kurulum, Vercel deploy, env değişkenleri, Auth callback URL

### Supabase Hata Düzeltmeleri [TAMAMLANDI] ✅
- [x] **Sorun 1:** `@radix-ui/react-label` → `"use client"` direktifi hidrasyon hatası — `label.tsx` sade HTML `<label>`'a dönüştürüldü
- [x] **Sorun 2:** `ReactQueryDevtools` SSR hydration mismatch → `providers.tsx`'ten tamamen kaldırıldı
- [x] **Sorun 3:** RLS "violates row-level security" → Tüm mutation hook'larında çift `createClient()` sorunu
  - `getAuthContext()` helper'ı oluşturuldu: tek supabase instance + profile upsert garantisi
  - `useTeam`, `useTasks`, `useComments`, `useProfile`, `useNotifications` hook'ları güncellendi
- [x] **Sorun 4:** Eksik `profiles` satırı → `getAuthContext()` her mutation'da `upsert` yaparak garanti ediyor

### Front-End Yenileme [PLANLANMIŞ]
- Plan hazır, implementasyon bekliyor (bkz. aşağıda)

---

## Önemli Kararlar

| Karar | Neden |
|-------|-------|
| Üç ayrı Supabase client | `client.ts` (browser), `server.ts` (SSR cookie), `admin.ts` (service-role) — yanlışlıkla client-side service-role kullanımını önler |
| `@supabase/ssr` paketi | `auth-helpers-nextjs` deprecated; SSR paketi App Router PKCE flow'unu doğru yönetir |
| `providers.tsx` Client Component | `QueryClientProvider` context gerektirir; root `layout.tsx`'i Server Component olarak tutar |
| TanStack Query stale time = 30s | Realtime ile taze kalır, gereksiz istek atmaz |
| Zustand sadece UI state | Sunucu state TanStack Query'nin sorumluluğu |

---

## Ortam Değişkenleri

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
NEXT_PUBLIC_APP_URL
```

---

## Veritabanı Tabloları

`profiles` → `teams` → `team_members`  
`teams` → `tasks` → `task_assignees`  
`tasks` → `comments`  
`profiles` → `notifications`

---

## Son Guncellemeler

### Liste Gorunumu Genisletmeleri [TAMAMLANDI]
- [x] Ekip liste sayfasinda `Atanan` sutunu kalici gorunur olacak sekilde korundu
- [x] Liste sutun yapisi `useListColumnsStore` icinde takim bazli dinamik hale getirildi
- [x] Kullanici tanimli ozel sutun destegi eklendi: `text`, `select`, `date`
- [x] Sutun ekleme, sutun basligi duzenleme ve ozel sutun silme akisleri eklendi
- [x] Sutun basliklarinda hover ile gizli silme/gizleme butonu gosteriliyor
- [x] Ozel sutun hucreleri icin inline duzenleme bilesenleri eklendi
- [x] Liste gorunumu dogrulamasi `pnpm lint` ile temiz gecti

### Bildirim Realtime Kanal Duzeltmesi [TAMAMLANDI]
- [x] `useRealtimeNotifications` ayni anda birden fazla mount oldugunda kanal cakismasi yasiyordu
- [x] Her hook ornegi icin benzersiz kanal adi uretildi
- [x] Ayni bildirimin cache'e ikinci kez eklenmesini engelleyen merge kontrolu eklendi
- [x] `cannot add postgres_changes callbacks after subscribe()` runtime hatasi giderildi

### Profiles / Auth Akisi Guncellemeleri [TAMAMLANDI]
- [x] Client-side `getAuthContext()` icindeki `profiles.upsert(...)` kaldirildi
- [x] `profiles` tablosuna tarayicidan yapilan ve 403 donen gereksiz istekler temizlendi
- [x] Profil okuma/yazma akisi `GET /api/profile` ve `PATCH /api/profile` route'larina tasindi
- [x] Eksik `profiles` kaydi server-side admin client ile otomatik olusturuluyor
- [x] Profil guncellemede hem `profiles` tablosu hem auth `user_metadata.full_name` senkron tutuluyor
- [x] Dashboard karsilama metni profil adini da dikkate alacak sekilde guncellendi

### Google Giris / Kayit [TAMAMLANDI]
- [x] Login ekranina `Google ile Giris Yap` butonu eklendi
- [x] Register ekranina `Google ile Kayit Ol` butonu eklendi
- [x] Google OAuth akisi Supabase `signInWithOAuth({ provider: 'google' })` ile baglandi
- [x] OAuth redirect hedefi `/auth/callback?next=/dashboard` olarak ayarlandi
- [x] `NEXT_PUBLIC_APP_URL` yoksa `window.location.origin` fallback'i eklendi

### Google Auth ve Middleware Hata Duzeltmeleri [TAMAMLANDI]
- [x] `GoogleAuthButton` icinde gecersiz `lucide-react` ikon import'u runtime crash uretiyordu; tamamen kaldirildi
- [x] Google auth butonu artik harici ikon paketine bagli olmadan yerel SVG ile calisiyor
- [x] Middleware `/auth/callback` route'unu login sayfasina geri itiyordu; `/auth/*` callback route'lari whitelist'e alindi
- [x] Bu duzeltme ile Google hesap seciminden sonra tekrar `/login` ekranina donme sorunu giderildi

### Dev Ortam / Cache Temizligi [TAMAMLANDI]
- [x] Uygulama service worker kullanmamasina ragmen tarayicidaki eski kayitlar chunk 404/HMR hatasi uretiyordu
- [x] `providers.tsx` icine eski service worker registration'larini temizleyen koruma eklendi
- [x] Eski cache anahtarlari siliniyor ve gerekli durumda sayfa otomatik yenileniyor

---

## Canliya Alma Plani [BASLATILDI]

Bu plan adim adim uygulanacak ve her tamamlanan madde burada isaretlenecek.
Supabase kullanmaya devam edilebilir. Bu proje statik export degil; Next.js server runtime,
middleware, API routes ve Supabase SSR cookie akisi nedeniyle Node.js uzerinde calismalidir.

### 0. Mevcut Durum Tespiti [KISMEN TAMAMLANDI]
- [x] Repo, env ornegi, Supabase client yapisi ve API route gereksinimleri incelendi
- [x] Supabase kullaniminin canli ortamda devam edebilecegi dogrulandi
- [x] Projenin Node.js process gerektirdigi dogrulandi (salt static hosting uygun degil)
- [x] Canli oncesi production build denemesi yapildi
- [x] Production build temiz geciyor

Not:
- Google Fonts kaynakli build engeli sistem font stack'e gecilerek cozuldu
- `src/app/layout.tsx` icindeki `next/font/google` bagimliligi kaldirildi
- `src/styles/globals.css` icinde sistem font stack tanimlandi

### 1. Yayina Cikis Mimarisi [PLAN]
- [x] Sunucunun hazir oldugu bilgisi alindi
- [x] SSH key ile erisim oldugu bilgisi alindi
- [ ] SSH baglanti hedefi netlestirilecek (`kullanici@IP`)
- [ ] Sunucu isletim sistemi, Node kurulu mu, nginx var mi kesfedilecek
- [ ] Hedef sunucu tipi netlestirilecek: VPS / dedicated Linux server / panel hosting
- [ ] Sunucuda Node.js 20 LTS kurulacak
- [ ] Paket yoneticisi secilecek: `npm` veya `pnpm`
- [ ] Process manager secilecek: `pm2` veya `systemd`
- [ ] Reverse proxy kurulacak: `nginx`
- [ ] SSL sertifikasi kurulacak: `Let's Encrypt`

Karar notu:
- Eger sunucuya Node process acabiliyorsak mevcut Next.js yapisi direkt deploy edilir.
- Eger sadece PHP/static tarzinda bir hosting varsa bu proje o sekilde dogrudan calismaz; ayri Node sunucusu gerekir.

### 2. Supabase Devam Plani [PLAN]
- [ ] Mevcut Supabase projesi production icin kullanilacak mi karar verilecek
- [ ] Production `Site URL` ayarlanacak
- [ ] Production `Redirect URLs` ayarlanacak:
  - `https://alanadi.com/auth/callback`
  - gerekirse `https://www.alanadi.com/auth/callback`
- [ ] Google OAuth kullaniminda production redirect URL'leri Supabase ve Google Console tarafinda guncellenecek
- [ ] Realtime, Auth, Database ve RLS policy'lerin production ortaminda aynen calistigi dogrulanacak
- [ ] `SUPABASE_SERVICE_ROLE_KEY` sadece sunucu ortaminda tutulacak; istemciye cikmayacak

Supabase kullanimi neden devam edebilir:
- Auth, Postgres, Realtime ve API ihtiyaci zaten harici servis olarak Supabase tarafinda cozuluyor
- Uygulamanin kendi sunucusunda sadece Next.js app calisacak
- Ek bir veritabani tasimasi zorunlu degil

Eger Supabase'e erisim olmayacaksa alternatif plan:
- [ ] Yeni Supabase projesi ac
- [ ] `001_create_tables.sql` migration calistir
- [ ] `002_triggers_notifications.sql` migration calistir
- [ ] Production env degerlerini yeni proje ile degistir
- [ ] Auth provider ve callback URL'leri yeni projeye gore tekrar ayarla
- [ ] Test kullanicisi, ekip, gorev ve yorum akislariyla smoke test yap

### 3. Ortam Degiskenleri [PLAN]
- [ ] Production environment variables hazirlanacak
- [ ] Asagidaki degiskenler sunucuya tanimlanacak:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `NEXT_PUBLIC_APP_URL`
- [ ] `NEXT_PUBLIC_APP_URL` production domain ile birebir ayni olacak
- [ ] Gizli anahtarlar `.env.local` icinde repoya yazilmayacak
- [ ] Sunucuda env dosya izinleri kisitlanacak

### 4. Kod ve Build Kontrolleri [PLAN]
- [x] `npm run lint` daha once temiz gecti
- [x] `npm run build` temiz gecirildi
- [x] `npm run start` ile production mod lokal boot testi yapildi
- [x] Google Font engeli cozuldu
- [x] Placeholder API route'lar gozden gecirildi:
  - `src/app/api/tasks/route.ts`
  - `src/app/api/auth/route.ts`
- [ ] Kullanilmiyorsa bu route'lar kaldirilacak veya future stub oldugu acik sekilde not edilecek
- [ ] `README.md` production deploy adimlariyla eslenecek

Not:
- `npm run start` production modda basarili sekilde ayaga kalkti
- `src/app/api/tasks/route.ts` ve `src/app/api/auth/route.ts` icin aktif kullanim izi bulunmadi
- Bu iki route su an deploy blocker degil; ancak production oncesi ya kaldirilmali ya da bilincli placeholder olarak belgelenmeli

### 5. Sunucu Kurulum Adimlari [PLAN]
- [ ] Sunucuda proje klasoru olusturulacak
- [ ] Repo clone veya CI/CD checkout yapilacak
- [ ] `npm install` veya `pnpm install --frozen-lockfile` calistirilacak
- [ ] Environment dosyasi tanimlanacak
- [ ] `npm run build` calistirilacak
- [ ] `npm run start` veya PM2 config ile servis ayaga kaldirilacak
- [ ] `nginx` reverse proxy `127.0.0.1:3000` ya yonlendirilecek
- [ ] `domain` DNS A/AAAA kayitlari sunucuya yonlendirilecek
- [ ] SSL aktif edilip HTTP -> HTTPS redirect acilacak

Ornek runtime beklentisi:
- App portu: `3000`
- Public URL: `https://alanadi.com`
- Reverse proxy: `nginx -> localhost:3000`

### 6. Uygulama Duzeyi Smoke Testleri [PLAN]
- [ ] Login calisiyor
- [ ] Register calisiyor
- [ ] Google login calisiyor
- [ ] `/auth/callback` dogru donuyor
- [ ] Dashboard aciliyor
- [ ] Team olusturma calisiyor
- [ ] Team join calisiyor
- [ ] Task create/update/delete calisiyor
- [ ] Board drag-and-drop calisiyor
- [ ] List view aciliyor
- [ ] Comment create/delete calisiyor
- [ ] Notification realtime geliyor
- [ ] Profile update calisiyor
- [ ] Mobile nav ve responsive temel akislar kontrol ediliyor

### 7. Production Sertlestirme [PLAN]
- [ ] `NODE_ENV=production` ile calistigi dogrulanacak
- [ ] Sunucu firewall sadece gerekli portlari acacak
- [ ] SSH anahtar girisi kullanilacak, sifreli giris kisitlanacak
- [ ] Log toplama yontemi belirlenecek (`pm2 logs`, `journalctl`, panel logs)
- [ ] Otomatik restart politikasi ayarlanacak
- [ ] Yedekleme/plana uygun geri donus notlari yazilacak

### 8. Izleme ve Bakim [PLAN]
- [ ] Hata loglari duzenli takip edilecek
- [ ] Supabase Dashboard: Auth, Database, Realtime ve API usage kontrol edilecek
- [ ] Sunucu disk/RAM/CPU takibi kurulacak
- [ ] Deploy sonrasi 24 saatlik kontrol listesi uygulanacak

### 9. Bu Turda Tamamlananlar [ONAY]
- [x] Canliya alma icin teknik inceleme yapildi
- [x] Supabase ile devam edilebilecegi belirlendi
- [x] Node.js tabanli deployment gereksinimi netlestirildi
- [x] Ilk production build kontrolu yapildi
- [x] Build blocker tespit edildi: Google Fonts (`Inter`) fetch bagimliligi
- [x] Google Fonts bagimliligi kaldirildi
- [x] Production build basarili alindi
- [x] Production start testi basarili oldu
- [x] Placeholder API route incelemesi yapildi
- [x] Sunucunun hazir ve SSH ile erisilebilir oldugu bilgisi plana islendi
- [x] Plan `memory.md` icine yazildi

### 10. Sonraki Uygulama Sirasi [ONERILEN]
1. SSH ile sunucuya baglanip ortam kesfini yapalim
2. Sunucu deploy seklini netlestirelim (`pm2 + nginx` onerilir)
3. Production env degerlerini yerlestirelim
4. Domain + SSL + Supabase callback ayarlarini tamamlayalim
5. Placeholder API route'lari temizleyelim ya da netlestirelim
6. `README.md` production adimlariyla guncelleyelim
7. Smoke testleri gecip canliya cikis yapalim
