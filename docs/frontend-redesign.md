# TaskFlow — Front-End Yenileme Planı

> **Felsefe:** CSS önce, JavaScript sonra.
> Bir geçiş animasyonunu CSS ile yapabiliyorsan JavaScript kullanma.
> Sürükle-bırak mimarisini `@dnd-kit` üzerine kur — tarayıcı native transform'larını kullanır, React re-render'ı minimize eder.
> Hedef: Linear.app hız ve kalitesi.

---

## Paket Değişiklikleri

```bash
# Ekle
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
pnpm add @radix-ui/react-tooltip @radix-ui/react-popover @radix-ui/react-progress cmdk

# Kaldır
pnpm remove @hello-pangea/dnd
```

| Paket | Neden |
|-------|-------|
| `@dnd-kit/core` | @hello-pangea/dnd yerine — CSS transform tabanlı, pointer/touch/keyboard erişilebilirlik |
| `@dnd-kit/sortable` | Sürüklenebilir liste/kart için `useSortable` hook'u |
| `@dnd-kit/utilities` | `CSS.Transform.toString()` — inline style ile sıfır DOM mutasyonu |
| `@radix-ui/react-tooltip` | Icon butonlarda erişilebilir tooltip |
| `@radix-ui/react-popover` | Bildirim dropdown, filtre paneli |
| `@radix-ui/react-progress` | Dashboard ilerleme bar'ı |
| `cmdk` | ⌘K komut paleti |

**`framer-motion` eklenmez.** Tüm animasyonlar CSS `transition` + Tailwind `animate-*` ile yapılır.

---

## Bölüm 1 — Animasyon Sistemi (CSS)

### 1.1 `tailwind.config.ts` — Özel Keyframe'ler

```ts
theme: {
  extend: {
    keyframes: {
      'fade-in':     { from: { opacity: '0' },                          to: { opacity: '1' } },
      'slide-up':    { from: { opacity: '0', transform: 'translateY(6px)' },  to: { opacity: '1', transform: 'translateY(0)' } },
      'slide-down':  { from: { opacity: '0', transform: 'translateY(-6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
      'scale-in':    { from: { opacity: '0', transform: 'scale(0.96)' }, to: { opacity: '1', transform: 'scale(1)' } },
      'slide-left':  { from: { opacity: '0', transform: 'translateX(-8px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
    },
    animation: {
      'fade-in':    'fade-in 0.15s ease-out',
      'slide-up':   'slide-up 0.2s ease-out',
      'slide-down': 'slide-down 0.2s ease-out',
      'scale-in':   'scale-in 0.15s ease-out',
      'slide-left': 'slide-left 0.15s ease-out',
    },
    transitionTimingFunction: {
      'spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    },
  }
}
```

### 1.2 Stagger Animasyonu (CSS, JS değil)

```tsx
// Her liste elemanında data attribute ile delay
{items.map((item, i) => (
  <div
    key={item.id}
    className="animate-slide-left"
    style={{ animationDelay: `${i * 30}ms`, animationFillMode: 'both' }}
  />
))}
```

### 1.3 globals.css Eklemeleri

```css
/* Smooth scrollbar */
* { scrollbar-width: thin; scrollbar-color: hsl(var(--border)) transparent; }
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 999px; }
::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground)); }

/* Selection */
::selection { background: hsl(var(--primary) / 0.15); color: hsl(var(--primary)); }

/* Font rendering */
body { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
```

---

## Bölüm 2 — @dnd-kit Board Mimarisi

### 2.1 Neden @dnd-kit?

| Özellik | @hello-pangea/dnd | @dnd-kit |
|---------|-------------------|---------|
| Transform yöntemi | DOM position | CSS `transform` (GPU) |
| Bundle boyutu | ~28 kB | ~12 kB core |
| Keyboard erişilebilirlik | Sınırlı | Tam (ARIA) |
| Touch desteği | Var | Var + Pointer Events |
| Animasyon | JS | CSS transition |
| Overlay/Portal | Zorunlu | Opsiyonel |

### 2.2 `BoardView.tsx` Yeni Mimarisi

```tsx
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';

// Her kolon ayrı SortableContext
// DragOverEvent: kart kolonlar arası geçişte optimistic state günceller
// DragEndEvent: Supabase mutation çağrılır
```

### 2.3 `TaskCard.tsx` Draggable

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function TaskCard({ task, teamId }: TaskCardProps) {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {/* kart içeriği — isDragging için CSS class */}
    </div>
  );
}
```

**CSS ile drag efekti:**
```css
.task-card[data-dragging="true"] {
  @apply opacity-50 scale-95 shadow-lg ring-2 ring-primary/30 rotate-1;
  /* CSS transition — JS gerekmez */
}
```

### 2.4 Kolonlar Arası Taşıma Stratejisi

```tsx
// Optimistic UI: DragOverEvent'te local state'i güncelle
// Hata durumunda onDragCancel ile geri al
// DragEndEvent'te Supabase mutation çağır

const handleDragOver = (event: DragOverEvent) => {
  const { active, over } = event;
  if (!over) return;

  const activeColumn = findColumnOf(active.id);
  const overColumn = over.id as TaskStatus;

  if (activeColumn !== overColumn) {
    // Local state optimistic update
    setOptimisticTasks(prev => moveTask(prev, active.id, overColumn));
  }
};
```

---

## Bölüm 3 — Sidebar Yenileme

### Dosya: `src/components/layout/Sidebar.tsx`

**Yeni özellikler (tümü CSS):**
- Collapsible: `w-64` ↔ `w-14` — `transition-[width] duration-200 ease-spring`
- Aktif nav item: filled `bg-primary/10` pill — `transition-colors duration-150`
- Hover: left border highlight — `border-l-2 border-transparent hover:border-primary/50`
- User section: altta avatar + isim + logout

```tsx
// Sidebar genişliği Zustand'da: sidebarOpen → w-64, kapalı → w-14
// CSS transition ile: className={cn('transition-[width] duration-200', open ? 'w-64' : 'w-14')}
// Icon-only modda Radix Tooltip ile label
```

---

## Bölüm 4 — Topbar Yenileme

### Dosya: `src/components/layout/Topbar.tsx`

**Yeni özellikler:**
- Breadcrumb: `Ekipler > notion > Board` — dinamik, `usePathname` ile
- ⌘K butonu → `CommandPalette` açar
- Avatar dropdown (Radix `Popover`): Profil + Çıkış

---

## Bölüm 5 — TaskCard Yenileme

### Dosya: `src/components/tasks/TaskCard.tsx`

**Görsel değişiklikler (tümü CSS):**

```tsx
<div className={cn(
  // Base
  'group relative rounded-lg bg-white border border-border p-3',
  'cursor-grab active:cursor-grabbing',
  // Hover — CSS transition
  'transition-all duration-150',
  'hover:border-primary/30 hover:shadow-[0_2px_8px_hsl(var(--primary)/0.08)]',
  'hover:-translate-y-0.5',
  // Drag state
  isDragging && 'opacity-50 scale-[0.97] rotate-1 shadow-xl ring-2 ring-primary/20',
)}>
  {/* Priority stripe — sol kenarda renkli çizgi */}
  <div className={cn('absolute left-0 top-2 bottom-2 w-0.5 rounded-full', priorityStripe[task.priority])} />
  ...
</div>
```

**Priority stripe renkleri:**
```ts
const priorityStripe = {
  low: 'bg-gray-300',
  medium: 'bg-amber-400',
  high: 'bg-red-500',
};
```

---

## Bölüm 6 — Komut Paleti (`cmdk`)

### Dosya: `src/components/ui/CommandPalette.tsx`

```tsx
'use client';
import { Command } from 'cmdk';

// Global ⌘K / Ctrl+K listener → useUIStore'da isCommandOpen state
// Kategoriler: Sayfalara Git, Ekipler, Son Görevler
// CSS animate-scale-in ile açılır
// Radix Dialog veya custom overlay
```

**Özellikler:**
- Fuzzy search across tüm ekipler + son görevler
- Keyboard navigation: ↑↓ navigate, Enter seç, Esc kapat
- `providers.tsx`'e global eklenir

---

## Bölüm 7 — Dashboard Stat Animasyonu

### CSS Counter Animasyonu (JS değil)

```css
@keyframes count-up {
  from { content: "0"; }  /* CSS counter — sayıyı göstermez */
}
```

Sayı animasyonu için minimal JS hook (sadece bu için):
```tsx
function useCountUp(target: number, duration = 600) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}
```

Bu 20 satırlık hook framer-motion'ın 40 kB'ından çok daha hafif.

---

## Bölüm 8 — shadcn/ui Ek Bileşenler

```bash
pnpm dlx shadcn-ui@latest add tooltip popover progress command sheet collapsible
```

| Bileşen | Kullanım |
|---------|---------|
| `Tooltip` | Icon butonlarda erişilebilir label |
| `Popover` | Bildirim dropdown, filter paneli |
| `Progress` | Dashboard task ilerleme bar'ı |
| `Command` | ⌘K paleti base |
| `Sheet` | Mobil sidebar + görev detay side panel |
| `Collapsible` | Sidebar collapse |

---

## Bölüm 9 — Dark Mode

CSS variable sistemi zaten hazır (`globals.css`'deki `.dark` bloğu). Eklenmesi gereken:

```tsx
// src/store/useUIStore.ts — theme alanı ekle
theme: 'light' | 'dark' | 'system';
setTheme: (theme) => void;

// src/components/layout/Topbar.tsx — theme toggle butonu
```

`document.documentElement.classList.toggle('dark')` — JavaScript, ama DOM mutasyonu sıfır render.

---

## Uygulama Sırası

| # | Bölüm | Dosyalar | Süre |
|---|-------|----------|------|
| 1 | Paket kurulumu + config | `tailwind.config.ts`, `globals.css` | Hızlı |
| 2 | @dnd-kit migration | `BoardView.tsx`, `TaskCard.tsx` | Ana iş |
| 3 | Sidebar yenileme | `Sidebar.tsx`, `useUIStore.ts` | Orta |
| 4 | TaskCard polish | `TaskCard.tsx` | Hızlı |
| 5 | Topbar + breadcrumb | `Topbar.tsx` | Orta |
| 6 | Komut paleti | `CommandPalette.tsx`, `providers.tsx` | Orta |
| 7 | Dashboard animasyonları | `dashboard/page.tsx` | Hızlı |
| 8 | shadcn ek bileşenler | `ui/` klasörü | Hızlı |
| 9 | Dark mode toggle | `Topbar.tsx`, `useUIStore.ts` | Hızlı |

---

## Performans Kontrol Listesi

- [ ] `pnpm build` — bundle size artışı < 15 kB
- [ ] @dnd-kit board — drag sırasında 0 layout thrash
- [ ] CSS animasyonlar — `will-change: transform` sadece drag sırasında
- [ ] `cmdk` — lazy import ile ilk yüklemeye etkisi yok
- [ ] Sidebar collapse — CSS `transition` tek başına, JS state sadece toggle için
