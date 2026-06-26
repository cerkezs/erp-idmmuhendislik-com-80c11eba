## Repo artık Public — VPS kurulumuna geçiyoruz

Repo: `https://github.com/cerkezs/erp-idmmuhendislik-com-80c11eba`

### Adım 1 — VPS'te clone + build (sen çalıştıracaksın)

```bash
ssh root@104.247.163.120

# Bun + PM2 kurulu değilse:
curl -fsSL https://bun.sh/install | bash
source ~/.bashrc
npm i -g pm2

# Kod
mkdir -p /opt && cd /opt
rm -rf idm-erp 2>/dev/null
git clone https://github.com/cerkezs/erp-idmmuhendislik-com-80c11eba.git idm-erp
cd /opt/idm-erp
bun install
bun run build
```

Build başarılı olursa `.output/server/index.mjs` oluşacak.

### Adım 2 — `.env` (ben üreteceğim, sen yapıştıracaksın)

`/opt/idm-erp/.env` içeriğini sana vereceğim:
- `SESSION_SECRET` (64 hex — yeni üretirim)
- `CRON_TOKEN` (yeni üretirim)
- `NOCODB_URL`, `NOCODB_TOKEN` (mevcut)
- `HEALTH_API_URL`, `HEALTH_API_TOKEN` (mevcut)
- `PORT=3000`

### Adım 3 — PM2 ile çalıştır

```bash
cd /opt/idm-erp
pm2 start ".output/server/index.mjs" --name idm-erp --update-env
pm2 save
pm2 startup systemd -u root --hp /root   # çıkan komutu çalıştır
```

`curl http://127.0.0.1:3000` → HTML dönmeli.

### Adım 4 — Nginx reverse proxy (`erp.idmmuhendislik.com` → 127.0.0.1:3000)

Vhost dosyası + Certbot komutlarını vereceğim. Mevcut vhost varsa onu güncelleyeceğiz (duplicate listen olmasın).

### Adım 5 — DNS cutover

`erp.idmmuhendislik.com` A kaydı şu an Lovable IP'sinde. TürkTicaret panelinden **`104.247.163.120`** olarak güncelleyeceksin. 5–30 dk propagasyon. Bu adım **mesai sonrası** önerilir, çünkü bu süre içinde site açılmayabilir.

### Adım 6 — Cron

```bash
crontab -e
*/15 * * * * curl -s -H "x-cron-token: SENIN_CRON_TOKEN" https://erp.idmmuhendislik.com/api/public/cron-scan >/dev/null
```

### Adım 7 — Lovable yayınını kapat + rozet

DNS cutover doğrulandıktan sonra Lovable Project Settings → Unpublish. Self-host'ta "Edit with Lovable" rozeti zaten görünmez.

### Riskler

- **Build hatası:** Cloudflare Worker → Node geçişinde bir pakette sorun çıkarsa düzelteceğim (yeni commit → VPS'te `git pull && bun install && bun run build && pm2 restart idm-erp`).
- **DNS kesintisi:** Sadece cutover anında. App önce VPS'te 3000 portunda ayakta olmalı.

### Onayın gereken tek şey

**Adım 1'i çalıştırıp `bun run build` çıktısını yapıştır.** Hata olursa düzeltirim, olmazsa Adım 2'deki `.env`'i üretip veririm.
