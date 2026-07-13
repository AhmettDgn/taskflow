# LCP Optimizasyonu Notlari

## Uygulanan degisiklikler

### 1. Kritik render yolundan gereksiz client isi kaldirildi
- `frontend/src/app/providers.tsx`
  - Mount aninda calisan service worker unregister, cache temizleme ve `window.location.reload()` akisi kaldirildi.
  - `Toaster` render'i mounted state arkasindan alinip dogrudan render edilir hale getirildi.
- `frontend/src/components/ui/CommandPalette.tsx`
  - Komut paleti artik ilk boyamada mount olmuyor.
  - Ekip verisi sadece palet acikken cekiliyor.
- `frontend/src/components/ui/LazyCommandPalette.tsx`
  - `Cmd/Ctrl + K` ile lazy mount edilen yeni sarmalayi eklendi.
- `frontend/src/components/notifications/NotificationBell.tsx`
  - Bildirim sorgusu ve realtime aboneligi ilk render'da zorunlu olmaktan cikarildi.
  - Bildirim verisi artik bell acildiginda veya browser idle oldugunda yukleniyor.
- `frontend/src/components/layout/MobileNav.tsx`
  - Mobile alt menudeki ikinci bildirim sorgusu kaldirildi.

### 2. Dashboard server-first render'a tasindi
- `frontend/src/app/(dashboard)/dashboard/page.tsx`
  - Sayfa client component olmaktan cikarildi.
  - Kullanici selamlama metni, ekip listesi ve ilk ekip gorev istatistikleri ilk HTML cevabina tasindi.
  - `useAuth`, `useProfile`, `useTeams`, `useTasks`, `useCountUp` zinciri dashboard ilk boyamasindan cikarildi.
- `frontend/src/app/(dashboard)/layout.tsx`
  - Shell seviyesinde server tarafinda kullanici ozeti alinip `Sidebar` ve `Topbar` komponentlerine prop olarak geciliyor.
- `frontend/src/components/layout/Sidebar.tsx`
- `frontend/src/components/layout/Topbar.tsx`
  - Tekrar eden `useAuth().getUser()` maliyeti kaldirildi.
  - Sadece sign-out davranisi client'ta tutuldu.

### 3. Team basligi server tarafina tasindi
- `frontend/src/app/(dashboard)/teams/[teamId]/layout.tsx`
  - Takim adi artik server tarafinda cozuluyor.
- `frontend/src/components/teams/TeamTabs.tsx`
  - Sadece aktif tab belirleme icin kucuk bir client component ayrildi.

### 4. Render-blocking ve ilk cevap iyilestirmeleri
- `frontend/src/app/(auth)/layout.tsx`
  - `force-dynamic` kaldirildi; auth sayfalari static teslimata uygun hale geldi.
- `frontend/src/middleware.ts`
  - Middleware matcher tum site yerine sadece korumali ve auth ile ilgili route'lara daraltildi.
  - Runtime auth kontrolu gereksiz statik/public trafikte calismaz hale geldi.

### 5. Font optimizasyonu
- `frontend/src/app/layout.tsx`
  - Kritik olmayan mono font icin global preload kapatildi.
  - Sans font preload korunarak ilk ekrandaki metin boyamasi korunmus oldu.

## Olcum notlari

### LCP adaylari
- `/login`: ust baslik + login form blogu
- `/dashboard`: "Merhaba, ..." basligi + istatistik kartlari
- `/teams/[teamId]/board`: takim basligi + ustteki gorev sayaci/aksiyon alani

### Before / after bundle olcumu
Bu degerler `pnpm.cmd --filter frontend build` production ciktilarindan alindi.

| Route | Onceki First Load JS | Sonraki First Load JS | Not |
| --- | ---: | ---: | --- |
| `/login` | 88.7 kB | 88.7 kB | Route boyutu sabit, ama artik auth layout static |
| `/dashboard` | 196 kB | 97.0 kB | Yaklasik 99 kB azaldi |
| `/teams/[teamId]/board` | 257 kB | 258 kB | Bundle boyutu neredeyse sabit; bu route halen agir interaktif board kodu tasiyor |

### Sonraki TTFB olcumu
Asagidaki degerler production build sonrasinda lokal `next start` + `curl` ile olculdu.

| Route | TTFB | HTTP | Not |
| --- | ---: | ---: | --- |
| `/login` | 117 ms | 200 | Public route gercek sayfa cevabi |
| `/dashboard` | 4 ms | 307 | Oturumsuz durumda login'e redirect cevabi |
| `/teams/test-team-id/board` | 10 ms | 307 | Oturumsuz durumda login'e redirect cevabi |

### LCP/Web Vitals kisiti
- Bu shell oturumunda tarayici icinden Lighthouse/Web Vitals otomasyonu kurulamadigi icin sayfa-ici gercek LCP milisaniye degerleri otomatik toplanamadi.
- Auth isteyen route'lar icin gercek LCP ve authenticated TTFB olcumu, aktif bir oturumla browser uzerinden manuel Lighthouse calistirilarak tamamlanmali.
- Buna ragmen dashboard icin bundle ve hydration maliyeti ciddi bicimde dusuruldu; en net repo-ici kazanc burada alindi.

## Beklenen etkiler
- Ilk yuklemede zorunlu reload olmadigi icin LCP ve genel kullanici algisi dogrudan iyilesecek.
- Dashboard artik veri gelmesini client hydration sonrasi beklemek yerine server HTML ile aciliyor.
- Bildirimler ve komut paleti gibi kritik olmayan ozellikler ilk boya yolundan cikarildi.
- Auth sayfalarinin static teslimata uygun hale gelmesi login acilisini daha istikrarli yapacak.

## Test ve release gate notlari

### Eklenen test kapsamı
- `Vitest + Testing Library` ile birim ve entegrasyon testleri eklendi.
- `Playwright` ile smoke, fonksiyonel ve regresyon akislari eklendi.
- Seed edilen Supabase test kullanicisi ile authenticated browser testleri calisiyor.
- Dashboard shell'in etkiledigi route'lar icin ek fonksiyonel sweep eklendi:
  - `/dashboard`
  - `/teams`
  - `/teams/create`
  - `/teams/join`
  - `/tasks`
  - `/notifications`
  - `/profile`
  - `/teams/[teamId]/board`
  - `/teams/[teamId]/list`
  - `/teams/[teamId]/members`
  - `/teams/[teamId]/settings`
  - `/teams/[teamId]/tasks/new`
  - `/teams/[teamId]/tasks/[taskId]`

### Calistirilan komutlar
- `pnpm.cmd --filter frontend lint`
- `pnpm.cmd --filter frontend test:vitest`
- `pnpm.cmd --filter frontend test:smoke`
- `pnpm.cmd --filter frontend test:functional`
- `pnpm.cmd test:predeploy`

### Son durum
- `pnpm.cmd test:predeploy` basarili.
- Gecen otomatik testler:
  - 28 birim + entegrasyon testi
  - 11 Playwright smoke + fonksiyonel testi
- Test yazimi sirasinda duzeltilenler:
  - `LoginForm` icin native HTML validation devre disi birakildi, boylece custom hata senaryolari testlenebilir oldu.
  - Logout sonrasi ayni seeded session'i kullanan fonksiyonel test sirasi duzeltildi.
  - Realtime sayfalarda `networkidle` yerine daha dogru bekleme kriteri kullanildi.

### Acik not
- Production benzeri Playwright kosusunda Next.js tarafindan tekrar eden `Element type is invalid ... digest: 3571718725` logu goruluyor.
- Buna ragmen kapsama alinan route'larda kullaniciya yansiyan bir render hatasi, redirect bozulmasi veya HTTP basarisizligi yeniden uretilmedi.
- Bu nedenle release gate'i bloklayan bir failure kalmadi; ancak log kaynagi sonraki iterasyonda ayrica izlenmeli.

## Kalan takip maddeleri
- Auth ile giris yapilmis tarayicida `/dashboard` ve `/teams/[teamId]/board` icin Lighthouse calistirip gercek LCP/TTFB sayilarini ekle.
- Board sayfasi halen agir; bir sonraki iterasyonda `BoardView` icindeki drag-and-drop ve veri akisinin daha ince parcali ayrilmasi dusunulebilir.
- CDN/origin TTFB optimizasyonu repo disi oldugu icin bu turda uygulanmadi.

---

# 2. Tur: Server Prefetch + HydrationBoundary (Temmuz 2026)

## Kritik bulgu: SSR'i bozan config
- Onceki turda not edilen `Element type is invalid ... digest: 3571718725` hatasinin kok nedeni bulundu:
  `next.config.mjs` icindeki `experimental.serverComponentsExternalPackages: ['@supabase/supabase-js']`.
- Bu ayar, supabase client'i import eden TUM client bileşenlerin (Sidebar, Topbar, hook kullanan sayfalar)
  SSR modul cozumlemesini bozuyor, React shell render'ini iptal edip sayfayi tamamen client render'a dusuruyordu.
- Ayar kaldirildi; artik tum dashboard route'lari gercek SSR HTML donduruyor (aside/main/gorev icerigi ilk yanitta).

## Uygulanan degisiklikler
1. **Ortak query fonksiyonlari** — `src/lib/queries/team-data.ts`: `fetchTasks/fetchTask/fetchTeams/fetchTeam/fetchTeamMembers/fetchBoards/fetchTaskStatuses/fetchDocuments`, SupabaseClient parametreli. Hook'lar (`useTasks`, `useTeam`, `useBoards`) ayni fonksiyonlari kullanir — query key/sekil sunucu-istemci birebir ayni.
2. **Server prefetch** — `src/lib/server/prefetch.ts` (`createServerQueryClient`, istek basina). Board, list, members, boards, task detail sayfalari server component oldu; veriyi `prefetchQuery` + `HydrationBoundary` ile ilk HTML'e gomuyor. Sayfa govdeleri `*PageClient.tsx` bilesenlerine tasindi.
3. **/tasks N+1 cozumu** — Ekip basina 2 client istegi yerine sunucuda 3 sorgu (teams + tek `in()` tasks + tek `in()` statuses), ekip bazinda cache seed.
4. **Bundle** — `optimizePackageImports: ['lucide-react']`; `TaskDetailSheet` board/list'te `next/dynamic { ssr:false }`.
5. **Auth hop azaltma** — dashboard layout ve `getAuthContext` `getUser()` yerine `getSession()` (middleware zaten `getUser()` ile dogruluyor; guvenlik siniri middleware + RLS). API route'lari `getUser()`'da kaldi.
6. **Route-level loading.tsx** — board/list/members/boards/documents/tasks/task-detail icin skeleton fallback'ler.
7. **`task-statuses` route'unda `listStatuses`** `src/lib/server/task-status-data.ts`'e tasindi (route + prefetch ortak kullanim).

## Dogrulama (JS kapali tarayici ile SSR HTML kontrolu)
- `/teams/[teamId]/board`: gorev sayaci + gorev basligi ilk HTML'de, spinner yok.
- `/tasks`: seed gorev basligi ilk HTML'de, ekip basina skeleton kaskadi yok.
- `Element type is invalid` logu tamamen kayboldu.
- 84 vitest + 11 Playwright smoke/functional yesil.
