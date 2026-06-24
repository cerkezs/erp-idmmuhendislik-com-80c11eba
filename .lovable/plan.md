## Firma dosyaları + sistem yedekleme

### 1) Firma kaydedildiğinde Dosyalar'da otomatik klasör

Şu an `Dosyalar` sayfası firmaları, **sadece dosya kaydı olan** firmaları sol ağaçta gösteriyor. Yeni davranış:

- Sol ağaç `companies` listesinden üretilecek (dosya olmasa da). Her firma için "klasör" satırı görünür.
- Dosya sayacı her firma için ayrıca hesaplanır (`0` olabilir).
- Hiçbir veri tabanı kaydı eklenmez (boş klasör = sanal). Bu, ek migration veya yer israfı yapmaz; firma silindiğinde klasör doğal olarak kaybolur.
- "— Genel —" (firmasız) klasörü en üstte kalır.
- Bir firma satırına tıklayınca o firmanın bütün dosyaları sağda listelenir (mevcut filtre mantığı).

### 2) Dosya işlemleri (görüntüle / sil / indir)

Şu an satırda sadece "düzenle" ve "sil" var, dosya adı `url` varsa yeni sekmede açılıyor. Aşağıdaki değişiklikler:

- **Görüntüle**: göz ikonu → `url`'yi yeni sekmede açar (PDF/IMG/HTML tarayıcıda önizlenir).
- **İndir**: download ikonu → `<a href={url} download>` ile direkt indirme tetikler. `url` boşsa buton disabled.
- **Sil**: zaten var, korunur (kayıt silinir; sunucudaki dosyayı silmez — kullanıcı not bilsin).
- **Düzenle**: zaten var.
- URL alanı için form alanı zaten var; "kendi sunucunda" tutulan dosyanın HTTP linkini buraya yapıştırınca tüm aksiyonlar çalışır.

> Not: Dosyalar fiziksel olarak sizin sunucunuzda durduğu için "indir/görüntüle" tarayıcı tarafından doğrudan o linke gider — bu en doğru yaklaşım, ek köprü/proxy gerekmez. Kayıt sadece metadata (ad, kategori, firma, link, notlar) tutar.

### 3) Ayarlar > Yedekleme

Yeni sayfa: `src/routes/settings.backup.tsx` (route: `/settings/backup`). Ayarlar grid'inden yeni bir kart ile bağlanır ("Yedekleme").

Sayfa UI:
- Checkbox listesi (bölümler): Firmalar, Ürünler, Teklifler (+ kalemler), Faturalar (+ kalemler), Üretim Emirleri (+ aşamalar), Giderler, Kasa (hesaplar + hareketler), Dosyalar (metadata), Mail Log, Bildirimler.
- "Tümünü seç / Hiçbiri" tek tıkla.
- "Firma bazlı kategorize et" checkbox'ı (varsayılan açık): seçili ise ZIP içinde her firma için ayrı klasör + içinde o firmanın CSV'leri; kapalı ise düz CSV (her tablo için bir dosya).
- Opsiyonel: tarih aralığı (başlangıç/bitiş) — sadece tarih içeren tabloları filtreler.
- "Yedeği indir" butonu → server function ZIP üretir, indirme tetiklenir.

ZIP yapısı (firma bazlı modda):
```
idm-erp-backup-2026-06-24.zip
├── _meta.json                  (sürüm, tarih, içerilen bölümler)
├── firmalar.csv                (tüm firmalar düz liste)
├── firmasiz/                   (firma bağı olmayan kayıtlar)
│   ├── giderler.csv
│   └── ...
├── ACME Ltd/                   (her firma için bir klasör; ad slugify edilir)
│   ├── teklifler.csv
│   ├── teklif_kalemleri.csv
│   ├── faturalar.csv
│   ├── fatura_kalemleri.csv
│   ├── uretim_emirleri.csv
│   ├── uretim_asamalari.csv
│   ├── giderler.csv
│   ├── dosyalar.csv
│   └── mail_log.csv
└── ...
```

Düz modda: yalnızca tablo başına bir CSV.

### Teknik notlar

- ZIP üretimi: `fflate` (Workers-uyumlu, salt-JS, küçük) — `bun add fflate`. JSZip de uyumlu ama fflate daha hafif.
- Yeni server route: `src/routes/api/backup.ts` (POST). Body: seçili bölüm/filtre. NocoDB'den `listRecords` ile çekilir, CSV'ye dönülür (özel karakterler için tırnak/kaçış), fflate ile ZIP, `Response` ile `application/zip` döner.
- "RAR" tarayıcıda üretilemez; ZIP standartı kullanılıyor (kullanıcı talebi onaylandı).
- Dosyalar (binary) yedeğe **dahil edilmez** — sadece metadata/URL listesi (`dosyalar.csv`). Fiziksel dosyalar zaten sizin sunucunuzda; oraya ayrıca rsync/backup önerilir (yedeğin içine sadece URL'ler ve notlar girer).
- CSV: UTF-8 BOM ile başlar (Excel TR için), `;` veya `,` seçimi varsayılan `,`.

### Etkilenen dosyalar

- `src/routes/files.tsx` — sol ağaç firmalar listesinden, görüntüle/indir butonları, sayaçlar.
- `src/routes/settings.tsx` — "Yedekleme" kartı eklenir, link `/settings/backup`'a.
- `src/routes/settings.backup.tsx` — **yeni** sayfa (UI + indirme tetikleyici).
- `src/routes/api/backup.ts` — **yeni** server route, ZIP üretimi.
- `package.json` — `fflate` eklenir.

### Sırada
Onaylarsan bunu uygularım. Sonraki adımlar (ayrı tur): üretim/teklif/fatura sayfalarına aynı `ListToolbar` paterni.
