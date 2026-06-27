## Amaç
`https://erp.idmmuhendislik.com` adresindeki canlı sistemi (VPS üzerindeki yeni kurulum) baştan sona kontrol edip Lovable yayınını kapatmadan önce eksik/bozuk bir şey kalıp kalmadığını doğrulamak.

## Kontrol Listesi

### 1. Altyapı sağlığı
- PM2 process durumu (`idm-erp` online mu, restart sayısı, memory)
- `.env` tüm değişkenleri dolu mu (özellikle `MAIL_ENC_KEY`, `HEALTH_API_TOKEN`)
- Nginx vhost doğru sertifika ile çalışıyor mu (zaten doğrulandı, tekrar bakılacak)
- Cron job ekli mi (`crontab -l`)
- Disk/RAM kullanımı

### 2. Uygulama fonksiyonları (Playwright ile canlı test)
Admin olarak giriş yapıp her modülün **listelenme + 1 kayıt ekleme** akışını dener:
- Dashboard (özet kartları, bildirim çanı)
- Firmalar (CRUD)
- Ürünler (CRUD, kur sembolleri)
- Teklifler → Fatura dönüşümü
- Faturalar
- Üretim Emirleri (durum renklendirme, aktif/tamamlanan ayrımı, filtre)
- Görevler
- Kasa / Giderler
- Dosyalar (firma ağacı otomatik)
- Mail (Roundcube iframe)
- Raporlar (CSV export, TCMB kuru)
- Bildirimler
- Ayarlar (Kategoriler, Kullanıcılar, Health, Yedek/ZIP)
- Cron-scan endpoint manuel test (`curl` + Bearer token)
- Health endpoint çalışıyor mu

### 3. Entegrasyonlar
- NocoDB bağlantısı (tüm tablolar oluşmuş mu — `/setup` 15 tablo)
- TCMB kur servisi (gerçek değerler dönüyor mu)
- Health API (VPS metrikleri)
- Mail SMTP (test gönderim — opsiyonel)
- Backup ZIP (`/api/backup` indirilebiliyor mu)

### 4. UI / UX
- "Geri" butonu tüm alt sayfalarda görünüyor mu
- Sembol gösterimi (₺ € $) doğru mu
- Mobile responsive
- Console error / network 4xx-5xx var mı

### 5. Güvenlik
- Auth zorunluluğu (logout sonrası protected route'lar `/auth`'a redirect ediyor mu)
- TOTP setup akışı (Ayarlar → Güvenlik)
- Cron endpoint Bearer token olmadan reddediyor mu

## Çıktı
Her madde için **OK / Eksik / Bozuk** etiketi ve eksik olanların listesi. Sonunda iki seçenek:
- Hepsi OK ise → Lovable unpublish + DNS doğrulama adımları
- Eksik varsa → öncelik sırasına göre düzeltme planı (build mode'a geçince tek tek yapılır)

## Yöntem
Plan onaylandıktan sonra build mode'da:
1. Sandbox'tan Playwright ile `https://erp.idmmuhendislik.com` üzerinde headless tarama
2. Gerekli yerlerde sana ek VPS komutu (PM2/cron kontrolü) verilir
3. Sonuçlar tablo halinde raporlanır
