# IDM ERP — Final Plan (v6 + Navy Trust)

## Görsel Kimlik

**Renk paleti:** Navy Trust — derin lacivert (#0f1b3d, #1e3a5f) üzerine temiz açık yüzey (#e8edf3), vurgu mavi (#3b6fa0). Finans/ERP alanında güven ve kurumsallık veren bir yön.

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

## Çoklu Para Birimi + Snapshot Kur

### Temel kural — fiyat dondurma
Bir belge kaydedildiğinde `amount` + `currency` + `fx_rate_to_try` snapshot olarak yazılır. Sonradan TCMB kuru değişse bile bu belgenin TL karşılığı asla otomatik güncellenmez. Tahsilat da kendi tarihindeki kurla snapshot alır.

### Kur kaynakları (öncelik)
1. Manuel override (`source = 'manual'`)
2. TCMB günlük (`source = 'tcmb'`)
3. Son bilinen kur (fallback)

### Manuel kur düzenleme
`/settings/exchange-rates`: bugünün kurunu düzenle, geçmiş tarih için kur ekle, TCMB'ye geri dön. Mevcut belgelere etki yok — sadece yeni kayıtlar etkilenir.

### Belge-içi kur override
Yeni formda TL kuru otomatik gelir ama "bu işleme özel kur" ile düzenlenebilir. Snapshot bu değerle yazılır, `fx_rate_source = 'document_override'`.

## NocoDB Tabloları

`users` · `user_roles` · `role_notification_prefs` · `device_tokens` · `shared_mail_accounts` · `email_log` · `companies` · `company_contacts` · `products` · `stock_movements` · `productions` · `production_stages` · `quotes` · `quote_items` · `quote_status_history` · `invoices` · `invoice_payments` · `expenses` · `expense_categories` · `account_movements` · `cash_accounts` · `cash_movements` · `actions` · `tasks` · `files` · `exchange_rates` · `notifications` · `audit_log` · `reports_saved`

Parasal alan: `amount` + `currency` + `fx_rate_to_try` + `fx_rate_source` + `fx_snapshot_date`

## Bildirimler
14 bildirim türü · rol+kullanıcı bazlı tercih matrisi (in-app/push/mail) · FCM push

## Mobil — Capacitor → Android APK
Kamera · dosya · FCM push · `@capacitor/{camera,filesystem,file-picker,push-notifications,preferences}`

## Modüller
Firmalar · Dosyalar · Ürün&Stok · Üretim/DOM · Teklif/Sipariş/Fatura · Şirket Giderleri · Cari Hareketler · Kasa · E-posta · Bildirimler · Raporlar · Aksiyon/Görev · Audit log

## Roller
admin · muhasebe · üretim · satış · depo · izleyici

## Çapraz Kurallar
- Her aksiyonda onay modalı
- Her şey düzenlenebilir (audit'li)
- "kim • ne zaman" rozeti
- Mobil-öncelikli
- Tüm parasal alanlarda TRY/USD/EUR + snapshot kur

## Build Sırası
1. `server-audit.sh`
2. Sunucu temizlik + Node.js 20 + PM2 + Nginx + certbot
3. Firebase (FCM) projesi
4. Design system (Navy Trust) + AppShell + döviz seçici
5. NocoDB Meta API → tüm tablolar
6. TCMB kur cron + manuel override + audit
7. Auth + roller + bildirim tercih matrisi
8. Firmalar
9. Dosyalar
10. Ürün + stok
11. Üretim/DOM + otomatik cari
12. Teklif + PDF + döviz
13. Fatura + vade + stok düşüm
14. Şirket giderleri
15. Kasa
16. E-posta
17. Bildirim merkezi
18. Raporlar
19. PWA manifest + Web Push
20. Capacitor → Android APK
21. Nginx + PM2 + SSL + `deploy.sh`

## Kapsam Dışı
E-fatura/e-arşiv · SMS · IMAP cevap takibi · iOS native · 2FA · Çoklu şirket

## Onaydan Sonra İlk Adım
`server-audit.sh` scriptini çalıştırırsın, çıktıyı paylaşırsın → temizlik/kurulumu onaylarız → sonra kodlamaya başlarız.