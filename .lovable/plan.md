
# Ayarlar'\u0131 Tamamlama + Sunucu Komutlar\u0131

\u0130ki par\u00e7a halinde ilerleyece\u011fiz: (A) uygulama i\u00e7i ayar sayfalar\u0131, (B) senin sunucuda \u00e7al\u0131\u015ft\u0131raca\u011f\u0131n haz\u0131r kom\u0131tlar.

---

## A) Uygulama \u2014 Ayarlar alt sayfalar\u0131

T\u00fcm sayfalar `/settings/...` alt\u0131nda a\u00e7\u0131lacak, `settings.tsx` \u00fczerindeki kartlar do\u011fru rotalara y\u00f6nlendirilecek.

### 1. Kasa Hesaplar\u0131 \u2014 `/settings/kasa`
- NocoDB `kasalar` tablosuna ba\u011fl\u0131 CRUD listesi.
- Alanlar: ad, para birimi (TRY/USD/EUR), a\u00e7\u0131l\u0131\u015f bakiyesi, banka/IBAN, aktif/pasif.
- Liste + ekle/d\u00fczenle/sil modal\u0131. `ListToolbar` (arama + s\u0131ralama) ile.

### 2. Kategoriler \u2014 `/settings/kategoriler`
- Yeni NocoDB tablosu: `kategoriler` (alanlar: ad, tip = `gider`|`urun`|`teklif`, renk, aktif).
- Tek sayfada sekmeli (Gider / \u00dcr\u00fcn / Teklif) liste + ekle/sil.
- Giderler/\u00fcr\u00fcnler sayfalar\u0131ndaki kategori dropdown'lar\u0131 buradan beslenecek (UI g\u00fcncellemesi).

### 3. D\u00f6viz Kurlar\u0131 \u2014 `/settings/kur`
- Mevcut `rates.functions.ts` TCMB yard\u0131mc\u0131s\u0131 kullan\u0131lacak.
- "Manuel kur giri\u015fi" formu (tarih + USD/EUR de\u011feri) \u2192 `kur_log` tablosuna yaz\u0131l\u0131r.
- "TCMB'den \u015eimdi \u00c7ek" butonu (server fn).
- Son 30 g\u00fcnl\u00fck mini tablo + s\u0131ralama.
- Sunucu cron'u i\u00e7in haz\u0131r endpoint: `/api/public/rates/sync` (HMAC sign).

### 4. Bildirim T\u00fcrleri \u2014 `/settings/bildirimler`
- Yeni tablo: `bildirim_ayarlari` (kullanici_id, tur, mail_aktif, push_aktif).
- T\u00fcrler: vade yakla\u015fan, stok kritik, \u00fcretim gecikti, kasa hareket.
- Matris UI (sat\u0131r = t\u00fcr, s\u00fctun = kanal) toggle'lar\u0131.

### 5. Kullan\u0131c\u0131lar \u2014 `/settings/kullanicilar` (hafif)
- NocoDB tablosu: `kullanicilar` (ad, email, rol = admin/operator/viewer, aktif). \u015eifreleme yok.
- CRUD listesi. (Ger\u00e7ek auth ileride Lovable Cloud ile.)

### 6. Mail/SMTP \u2014 `/settings/mail`
- SMTP de\u011ferleri sunucu `.env`'inden gelir (host, port, user, pass, from).
- Sayfa: mevcut SMTP'yi (mask'l\u0131) g\u00f6r\u00fcnt\u00fcler, "test maili g\u00f6nder" butonu.
- Server fn: `sendTestMail({to, subject, body})` \u2014 nodemailer ile SMTP \u00fczerinden g\u00f6nderir.
- "Ortak g\u00f6nderici hesaplar" tablosu (`mail_hesaplari`): isim, from-adres, imza. Teklif/fatura PDF mailinde dropdown.

### 7. Sunucu Durumu \u2014 `/settings/sunucu`
- Sunucudaki mini health-endpoint'i pollar (a\u015fa\u011f\u0131da B/3).
- G\u00f6sterir: disk %, RAM %, uptime, NocoDB up/down, son yedek tarihi.

### Yedekleme zaten haz\u0131r \u2192 `/settings/backup` (sadece kart linki d\u00fczeltilecek).

---

## B) Sunucu \u2014 sana yap\u0131\u015ft\u0131r-\u00e7al\u0131\u015ft\u0131r komutlar

Hi\u00e7bir \u015fey \u015fimdi \u00e7al\u0131\u015ft\u0131r\u0131lmayacak; uygulama PR'\u0131 bitince a\u015fa\u011f\u0131dakileri tek tek senin sunucunda \u00e7al\u0131\u015ft\u0131rman i\u00e7in chat'e d\u00f6kece\u011fim:

1. **`.env` g\u00fcncelleme (SMTP)** \u2014 `nano /opt/idm-erp/.env` ile eklenecek sat\u0131rlar: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `MAIL_FROM`. \u00d6rnek bloklar dahil.
2. **Mini health-API (Node, ~50 sat\u0131r)** \u2014 `/opt/idm-erp/health-api/` alt\u0131na `server.js` + `systemd` unit. `:9099/health` JSON d\u00f6ner (disk/RAM/uptime/NocoDB ping). Token (`HEALTH_TOKEN`) ile korunur.
3. **Nginx reverse-proxy bloku** \u2014 `health.idmmuhendislik.com` \u2192 `127.0.0.1:9099` (SSL: certbot komutu dahil).
4. **G\u00fcnl\u00fck yedek cron'u** \u2014 NocoDB veri klas\u00f6r\u00fc + dosya klas\u00f6r\u00fc `rsync` + 7 g\u00fcnl\u00fck retention; `/etc/cron.daily/idm-backup`.
5. **NocoDB metadata yede\u011fi** \u2014 `docker exec` ile sqlite/postgres dump al\u0131p `/backups/nocodb/` alt\u0131na yazar.
6. **TCMB kur cron'u** \u2014 her sabah 09:30 \u2192 `curl -H "X-Sign: ..." https://erp.idmmuhendislik.com/api/public/rates/sync`.

Her komut bloku \u015fu \u015fekilde verilecek:
```text
+++ KOPYALA: /opt/idm-erp/health-api/server.js
... dosya i\u00e7eri\u011fi ...
+++ \u00c7ALI\u015eTIR:
mkdir -p /opt/idm-erp/health-api && nano /opt/idm-erp/health-api/server.js
```
Sen \u00e7\u0131kt\u0131y\u0131 yap\u0131\u015ft\u0131racaks\u0131n, ben hata varsa d\u00fczeltece\u011fim.

---

## S\u0131ra

**Bu turda (build mode'a ge\u00e7ince) sadece A blo\u011fu kodu yaz\u0131lacak.** B blo\u011fundaki sunucu komutlar\u0131 PR bitince ayr\u0131 mesajda parag\u00f6raflar halinde verece\u011fim \u2014 sen yap\u0131\u015ft\u0131r\u0131p \u00e7\u0131kt\u0131lar\u0131 atacaks\u0131n.

## Etkilenen / yeni dosyalar (A)
- yeni: `src/routes/settings_.kasa.tsx`, `settings_.kategoriler.tsx`, `settings_.kur.tsx`, `settings_.bildirimler.tsx`, `settings_.kullanicilar.tsx`, `settings_.mail.tsx`, `settings_.sunucu.tsx`
- yeni: `src/routes/api/public/rates.sync.ts`, `src/routes/api/public/health-proxy.ts`
- d\u00fczenle: `src/routes/settings.tsx` (kart linkleri), `src/lib/nocodb.functions.ts` (yeni tablolar i\u00e7in CRUD), `src/lib/rates.functions.ts` (manuel kur ekleme)
- yeni migration/seed: `kategoriler`, `bildirim_ayarlari`, `kullanicilar`, `mail_hesaplari`, `kur_log` tablolar\u0131 (NocoDB UI'dan otomatik olu\u015fturma fn).

Onaylarsan A blo\u011funu uygulamaya ge\u00e7iyorum.
