-- ============================================================
-- Eksik FK / sorgu indexleri
-- 001'deki çekirdek tablolar indexsiz kurulmuştu; RLS yardımcıları
-- (is_team_member) ve liste sorguları sekansiyel tarama yapıyordu.
-- Ölçüm: notifications listesi canlıda ~840ms TTFB veriyordu.
-- ============================================================

-- Board/list/tasks sayfalarının ana sorgusu: team_id filtresi + created_at desc sıralama
create index if not exists tasks_team_id_created_at_idx
  on public.tasks (team_id, created_at desc);

-- Bildirim zili: user_id filtresi + created_at desc sıralama (limit 50)
create index if not exists notifications_user_id_created_at_idx
  on public.notifications (user_id, created_at desc);

-- Görev detayındaki yorumlar
create index if not exists comments_task_id_created_at_idx
  on public.comments (task_id, created_at);

-- Kullanıcının ekiplerini bulma (fetchTeams / dashboard / tasks sayfası):
-- unique(team_id, user_id) yalnızca team_id önekini kapsıyor, user_id tek başına kapsanmıyordu.
create index if not exists team_members_user_id_idx
  on public.team_members (user_id);

-- Görev atamalarında kullanıcı bazlı erişimler (bildirim tetikleyicileri, RLS)
create index if not exists task_assignees_user_id_idx
  on public.task_assignees (user_id);

-- Bildirimlerin görev bazlı cascade/temizlik yolları
create index if not exists notifications_task_id_idx
  on public.notifications (task_id);
