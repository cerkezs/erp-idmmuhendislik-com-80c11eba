## Hedef
Tüm sistemi senin VPS'inde (104.247.163.120) çalıştırmak. Lovable sadece kod editörü olarak kalsın — yayın, çalışan uygulama ve veriler tamamen senin sunucunda olsun.

## Adımlar

### 1. GitHub bağlantısı (sen yapacaksın)
Lovable sol alttaki **+** menüsü → **GitHub** → **Connect project** → repo adı: `idm-erp`. Bağlandığında kod otomatik push olur, bundan sonra her Lovable değişikliği GitHub'a yansır.

### 2. Build configini Node'a çevir (ben yapacağım)
Şu an `@lovable.dev/vite-tanstack-config` Cloudflare Worker hedefli derliyor — VPS'inde çalışmaz. Değişiklikler:
- `vite.config.ts` — Lovable config paketini bırak, doğrudan `@tanstack/react-start/plugin/vite` + Nitro `node-server` preset kullan.
- `src/server.ts` — Cloudflare `fetch` shape'i yerine Node entry'ye uygun hale getir.
- `package.json` — `start` scripti ekle (`node .output/server/index.mjs`).

Bu değişiklikler Lovable preview'ında da çalışmaya devam edecek (Lovable Node build'i de destekliyor), ama artık `bun run build` çıktısı VPS'inde direkt çalışabilir hale gelecek.

### 3. Ortam değişkenleri (sen `.env` dosyana koyacaksın)
VPS'te `/opt/idm-erp/.env`:
```
SESSION_SECRET=<64 hex — ben üretip vereceğim>
NOCODB_URL=https://noco.idmmuhendislik.com
NOCODB_TOKEN=<mevcut>
CRON_TOKEN=<yeni — ben üretip vereceğim>
HEALTH_API_URL=https://webmail.idmmuhendislik.com/__health
HEALTH_API_TOKEN=<mevcut>
PORT=3000
```

### 4. VPS kurulum (SSH komutlarını ben vereceğim, sen çalıştıracaksın)
```bash
# Node 20 + bun + pm2
curl -fsSL https://bun.sh/install | bash
npm i -g pm2

# Repo
cd /opt && git clone https://github.com/<user>/idm-erp.git && cd idm-erp
bun install
bun run build

# .env oluştur (yukarıdaki içerikle)
nano .env

# Çalıştır
pm2 start ".output/server/index.mjs" --name idm-erp
pm2 save && pm2 startup
```

### 5. Nginx reverse proxy (komutları vereceğim)
`erp.idmmuhendislik.com` için yeni vhost: 127.0.0.1:3000'e proxy + Certbot ile Let's Encrypt SSL.

### 6. DNS cutover
`erp.idmmuhendislik.com` A kaydı şu an Lovable IP'sinde; VPS IP'sine (`104.247.163.120`) çevireceksin. 5-30 dk arası kesinti olur — **mesai sonrası** yapılması önerilir.

### 7. Cron (zaten hazır endpoint)
```bash
crontab -e
*/15 * * * * curl -s -H "x-cron-token: $CRON_TOKEN" https://erp.idmmuhendislik.com/api/public/cron-scan
```

### 8. Lovable yayınını kapat
DNS cutover sonrası Lovable Project Settings → Unpublish. `*.lovable.app` URL'i çöker, sadece `erp.idmmuhendislik.com` aktif kalır. Lovable hâlâ kod editörü olarak çalışır.

### 9. Rozet
Self-host'ta Lovable rozeti zaten enjekte edilmiyor — VPS'inde yayınladığında "Edit with Lovable" otomatik kaybolur. Pro plan'a gerek yok.

## Riskler
- **Build kırılabilir:** Cloudflare → Node geçişinde bazı bağımlılıklar (qrcode, fflate) sorun çıkarabilir; build hatalarını sırayla düzelteceğim.
- **DNS kesintisi:** 5-30 dk. Önce VPS'te app ayakta olmalı, sonra DNS değişir.
- **Veri:** NocoDB zaten senin sunucunda — kayıp riski yok.

## Senin onayın gerekenler
1. **GitHub repo adı `idm-erp` uygun mu?** Farklı isim istiyorsan söyle.
2. **DNS cutover ne zaman?** Bugün mü, hafta sonu mu, akşam mı?
3. **Plan onayı verir misin?** Onaylarsan sırayla başlarım: önce vite/server config Node'a çevrilir → sen GitHub bağlarsın → SSH komutlarını veririm → cutover.
