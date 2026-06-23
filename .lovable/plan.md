# IDM ERP — Final Plan (v6)

## Mimari

```text
[Web · Mobil tarayıcı · Android APK (Capacitor) · PWA]
        │ HTTPS
        ▼
erp.idmmuhendislik.com (Nginx)
        ├─► Static dist/                (Lovable build)
        ├─► /api/  → Node.js Mini-API :3000  (auth, dosya, mail, push, cron, PDF)
        └─► /noco/ → NocoDB :8443             (ERP - LOVE 1 base)

Mail:  Mini-API → SMTP (kişisel veya ortak)
Push:  Mini-API → FCM → APK/PWA
Kur:   TCMB XML cron + manuel override
Dosya: /uploads/{company_id}/{folder}/  +  /uploads/_expenses/{yıl-ay}/
```

## Çoklu Para Birimi + Snapshot Kur **(netleştirildi)**

### Temel kural — fiyat dondurma
Bir belge (teklif, fatura, sipariş, ödeme, gider, üretim aşaması, kasa hareketi) kaydedildiğinde:
- `amount` (orijinal tutar) + `currency` (TRY/USD/EUR) + **`fx_rate_to_try`** (o anki kur) snapshot olarak kayda yazılır
- Sonradan TCMB kuru değişse bile **bu belgenin TL karşılığı asla otomatik güncellenmez**
- Örnek: 10 EUR'luk sipariş bugün 1 EUR=35 ₺ iken kaydedildi → snapshot=35, TL karşılığı 350 ₺ olarak donar. Yarın kur 40 ₺ olsa bile fatura/sipariş 350 ₺ kalır
- Müşteriden EUR olarak tahsilat geldiğinde de aynı mantık: tahsilat satırı **kendi tarihindeki** kurla snapshot alır; bakiye eşleştirme **belge para biriminde** yapılır (10 EUR fatura ↔ 10 EUR tahsilat = kapalı), kur farkı bilinçli rapor sütununda gösterilir

### Kur kaynakları (öncelik sırasıyla)
1. **Manuel override** (`exchange_rates.source = 'manual'`) — varsa daima öncelikli
2. **TCMB günlük** (`source = 'tcmb'`) — node-cron 15:30 sonrası
3. **Son bilinen kur** (fallback)

### Manuel kur düzenleme **(YENİ)**
`/settings/exchange-rates` sayfası:
- Tablo: tarih · USD/TRY · EUR/TRY · kaynak (TCMB/Manuel) · giren · saat
- **"Bugünün kurunu düzenle"** butonu → modal: USD ve EUR için TL değeri + neden alanı (opsiyonel) → onay → `audit_log`'a yazılır
- **"Geçmiş tarih için kur ekle/düzelt"** → yetkili rol (admin/muhasebe) — uyarı: "Bu tarihten sonraki yeni kayıtlar etkilenecek; mevcut belgelerin snapshot'ı değişmez"
- "TCMB'ye geri dön" butonu — manuel override'ı silip otomatik kura döner
- **Mevcut belgelere etki yok** — sadece bu tarihten sonra oluşturulacak yeni kayıtların snapshot'ını besler

### Belge oluştururken kur seçimi
Yeni teklif/fatura/gider formunda para birimi seçildiğinde TL kuru otomatik dolar (manuel veya TCMB), ancak **o belgeye özel olarak düzenlenebilir** ("Bu işleme özel kur: ___"). Düzenlenirse snapshot bu değerle yazılır, `fx_rate_source = 'document_override'` işaretlenir.

### Görüntüleme
- Üst bar: `USD 32.45 ₺ · EUR 35.10 ₺ · TCMB · 16:00`  (manuelse rozet: `MANUEL`)
- Liste/rapor para birimi seçici (TRY/USD/EUR) — snapshot'tan çevirir
- Belge detayında: "Orijinal: 10 EUR @ 35 ₺ = 350 ₺ (kayıt tarihi 23.06.2026)" — kur farkı satırı opsiyonel

## NocoDB Tabloları

`users` (+SMTP) · `user_roles` · `role_notification_prefs` · `device_tokens` · `shared_mail_accounts` · `email_log` · `companies` · `company_contacts` · `products` · `stock_movements` · `productions` · `production_stages` · `quotes` · `quote_items` · `quote_status_history` · `invoices` · `invoice_payments` · `expenses` · `expense_categories` · `account_movements` · `cash_accounts` · `cash_movements` · `actions` · `tasks` · `files` · **`exchange_rates`** (date, currency, rate, source: tcmb|manual, created_by, note) · `notifications` · `audit_log` · `reports_saved`

Parasal alan şablonu: `amount` + `currency` + `fx_rate_to_try` + `fx_rate_source` (tcmb|manual|document_override) + `fx_snapshot_date`.

## Bildirimler (v5'ten)
14 bildirim türü · rol+kullanıcı bazlı tercih matrisi (in-app/push/mail) · FCM push · `kur_manuel_degistirildi` türü eklenir (admin'lere gider).

## Mobil — Capacitor → Android APK (v5'ten)
Kamera · dosya seçici · FCM push izinleri · `@capacitor/{camera,filesystem,file-picker,push-notifications,preferences}`.

## Diğer Modüller (v4'ten korunur)

**Firmalar** (otomatik klasör, yetkililer) · **Dosyalar** (ağaç, sipariş↔fatura çift link, şirket giderleri otomatik klasör) · **E-posta** (kişisel SMTP + ortak hesap, ek seçimi) · **Ürün & Stok** (otomatik düşüm) · **Üretim/DOM** (aşama-firma-maliyet → otomatik cari, cascade) · **Teklif/Sipariş/Fatura** (stepper, vade) · **Şirket Giderleri** · **Cari Hareketler** · **Kasa** (çoklu kasa, çoklu döviz) · **Raporlar** (PDF+Excel, döviz seçimi) · **Aksiyon/Görev** · **Audit log**

## Çapraz Kurallar
- Her aksiyonda onay modalı · her şey düzenlenebilir (audit'li) · "kim • ne zaman" rozeti · mobil-öncelikli · tüm parasal alanlarda TRY/USD/EUR + snapshot kur (donmuş)

## Roller
admin · muhasebe · üretim · satış · depo · izleyici (kur düzenleme: admin + muhasebe)

## Build Sırası
1. `server-audit.sh` (sen çalıştırırsın)
2. Sunucu temizlik + Node.js 20 + PM2 + Nginx + certbot
3. Firebase (FCM) projesi
4. Design system + AppShell + üst kur barı (manuel/TCMB rozeti) + döviz seçici utility
5. NocoDB Meta API → tüm tablolar (currency/fx_rate/fx_source alanları dahil)
6. **TCMB kur cron + manuel override sayfası + audit**
7. Auth + roller + bildirim tercih matrisi
8. Firmalar + otomatik klasör
9. Dosyalar (ağaç + çift bağlantı)
10. Ürün + stok
11. Üretim/DOM + otomatik cari (snapshot kur)
12. Teklif + PDF + döviz + belge-içi kur override
13. Fatura + vade + döviz + stok düşüm + sipariş↔fatura
14. Şirket giderleri + fiş→dosyalar
15. Kasa (çoklu kasa/döviz)
16. E-posta modülü
17. Bildirim merkezi + fan-out (in-app/push/mail)
18. Raporlar (PDF+Excel, döviz çevirici)
19. PWA manifest + Web Push
20. Capacitor → Android APK
21. Nginx + PM2 + SSL + `deploy.sh`

## Kapsam Dışı
E-fatura/e-arşiv · SMS · IMAP cevap takibi · iOS native · 2FA · Çoklu şirket

## Onaydan Sonra İlk Adım
`server-audit.sh` scriptini hazırlarım, sen SSH'tan çalıştırıp çıktıyı paylaşırsın → temizlik/kurulum adımlarını onayınla uygularız → sonra Lovable tarafında kodlamaya başlarız.