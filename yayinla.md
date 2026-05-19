# TaskFlow Yayin Plani

Bu dosya, TaskFlow projesinin diger yayinlarla cakismadan `https://taskflow.arslanyusuf.com` altinda yayina alinmasi icin tek kaynak checklist olarak tutulur.

## Sabit Topoloji

- Primary public host: `taskflow.arslanyusuf.com`
- Primary public ports: `80` / `443`
- Transition public port: `3006`
- Local frontend bind: `127.0.0.1:3021`
- Local backend bind: `127.0.0.1:5021`
- PM2 process names: `taskflow-frontend`, `taskflow-backend`
- Yayin modeli: `pnpm workspace` icinde `frontend` + `backend`
- Public erisim yalniz Nginx uzerinden olacak

## Cakisma Kurallari

- Kullanilmayacak portlar: `3000`, `3001`, `3010`, `3005`, `5001`, `5002`, `8000`, `18110`
- TaskFlow servisleri public bind yapmayacak
- Nginx `taskflow.arslanyusuf.com` icin `80/443` dinleyecek
- `3006` gecis suresince korunabilir, fakat ana erisim domain uzerinden olacak
- Mevcut `default`, `financialproject`, `monad`, `isiklar`, `arya` tanimlarina dokunulmayacak
- PM2'de mevcut isimler yeniden kullanilmayacak; sadece `taskflow-frontend` ve `taskflow-backend` olacak

## Yayin Sirasi Checklist

- [x] `yayinla.md` olusturuldu
- [x] `pnpm` ve Node surumu dogrulandi
- [x] Workspace bagimliliklari kuruldu
- [x] `pnpm --filter frontend build` calisti
- [x] `pnpm --filter backend build` veya no-op build dogrulandi
- [x] `pnpm --filter frontend start` production komutu dogrulandi
- [x] `pnpm --filter backend start` production komutu dogrulandi
- [ ] Frontend ve backend PM2 ile local portlarda kaldirildi
- [x] Local saglik kontrolleri dogrulandi
- [x] Nginx config eklendi
- [ ] `nginx -t` basarili gecti
- [ ] `taskflow.arslanyusuf.com` uzerinden HTTP/HTTPS dogrulamasi yapildi
- [ ] Gerekirse `3006` gecis erisimi dogrulandi
- [ ] `pm2 save` calistirildi
- [x] Tamamlanan maddeler bu dosyada isaretlendi

## Gerekli Dosyalar

- [x] `pnpm-workspace.yaml`
- [x] `package.json` root workspace tanimi
- [x] `frontend/package.json`
- [x] `backend/package.json`
- [x] `backend/server.js`
- [x] `deploy/scripts/run-frontend-pm2.sh`
- [x] `deploy/scripts/run-backend-pm2.sh`
- [x] `ecosystem.config.cjs`
- [x] `etc/nginx/sites-available/taskflow.conf`

## Env Anahtarlari

### Frontend

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL`
- `NEXT_PUBLIC_API_BASE_PATH`
- `FRONTEND_HOST`
- `FRONTEND_PORT`

### Backend

- `HOST`
- `PORT`
- `FRONTEND_HOST`
- `FRONTEND_PORT`

## Beklenen Komut Sozlesmesi

```bash
pnpm install
pnpm --filter frontend build
pnpm --filter frontend start
pnpm --filter backend build
pnpm --filter backend start
```

## Beklenen Dogrulamalar

```bash
ss -ltnp
pm2 describe taskflow-frontend
pm2 describe taskflow-backend
curl http://127.0.0.1:3021
curl http://127.0.0.1:5021/health
nginx -t
curl -I http://taskflow.arslanyusuf.com
curl -I https://taskflow.arslanyusuf.com
curl https://taskflow.arslanyusuf.com/api/health
curl http://127.0.0.1:3006
curl http://127.0.0.1:3006/api/health
```
