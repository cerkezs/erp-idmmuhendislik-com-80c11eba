## Amaç
`https://erp.idmmuhendislik.com` üzerinde her modülü tek tek çalıştırıp gerçekten işlevsel mi yoksa hata mı veriyor görmek.

## Önkoşul
Bir önceki denetimde PM2 `.env`'i okumamıştı (`NOCODB_URL veya NOCODB_API_TOKEN eksik` hatası). VPS'te şu komutu çalıştırdığını varsayıyorum:

```bash
cd /opt/idm-app
pm2 delete idm-erp
set -a; source .env; set +a
pm2 start ".output/server/index.mjs" --name idm-erp --update-env
pm2 save
```

Çalıştırmadıysan, test başlamadan önce yapmalısın — yoksa tüm modüller "NOCODB eksik" diye düşer.

## Test Yöntemi
Playwright headless ile admin (`admin@idmmuhendislik.com` / `Admin8832`) olarak giriş yap, sonra her modülde şu adımları uygula:

1. **Listele**: sayfaya gir, hata var mı?
2. **Form aç**: "Ekle/Yeni" butonu çalışıyor mu?
3. **Boş kayıt dene**: validation çalışıyor mu?
4. **Konsol & network hataları**: 4xx/5xx yakala
5. **Screenshot**: her modül için

## Modül Listesi (15 modül)
| # | Rota | Test |
|---|---|---|
| 1 | `/` Dashboard | Kartlar dolu mu, bildirim çanı |
| 2 | `/companies` | Liste + form + dosya ağacı senkron |
| 3 | `/products` | Liste + form + ₺€$ sembolleri |
| 4 | `/quotes` | Liste + kalem ekleme + faturaya dönüştür |
| 5 | `/invoices` | Liste + PDF yazdırma |
| 6 | `/productions` | Aktif/Tamamlanan ayrımı, renk, filtre |
| 7 | `/actions` | Görev CRUD |
| 8 | `/expenses` | Liste + form |
| 9 | `/kasa` | Liste + giriş/çıkış |
| 10 | `/files` | Firma ağacı, upload picker |
| 11 | `/mail` | Roundcube iframe yükleniyor mu |
| 12 | `/reports` | TCMB kuru gerçek değer, CSV export |
| 13 | `/notifications` | Liste, okundu işaretle |
| 14 | `/setup` | 15 tablo + "Sağlık" |
| 15 | `/settings` | Kategoriler, Kullanıcılar, TOTP, Health, Backup ZIP |

## Endpoint Testleri
- `GET /api/public/cron-scan` (Bearer'sız → 401, Bearer'lı → 200)
- `GET /api/backup` (admin oturumuyla ZIP dönüyor mu)
- `GET /__health` proxy (varsa)

## Çıktı
Her modül için **✅ Çalışıyor / ⚠️ Kısmi / ❌ Bozuk** + sebep. Bozuk modüller için build mode'a geçtikten sonra düzeltme yapacağım.

## Yöntem
Plan onaylanınca build mode'da Playwright scripti sandbox'tan çalıştırılır, sonuçlar tek tabloda raporlanır.
