## Hedef
Sekiz maddeyi tek build oturumunda uygula. Tüm backend NocoDB üzerinde kalır — Lovable Cloud kullanılmaz. Auth, NocoDB'deki `kullanicilar` tablosu + bcrypt parola + Google Authenticator (TOTP) ile yapılır.

---

### 1) Panel'i gerçek verilere bağla
- Yeni `src/lib/dashboard.functions.ts` → `getDashboardSummary()`:
  - Kasa bakiyesi = `kasa_hareketleri` (giriş − çıkış) tüm kasalar
  - Bekleyen alacak = `faturalar` (durum ≠ "ödendi") toplamı + vadesi geçmiş sayısı
  - Bu ay tahsilat = ay içi kasa girişleri
  - Bu ay gider = `giderler` ay içi toplamı
  - Son hareketler = bildirim + son fatura/gider/üretim olayları (8 satır)
- `src/routes/index.tsx`: sabit `SUMMARY` / `RECENT` kaldırılır, `useSuspenseQuery` ile bağlanır.

### 2) Teklif → Fatura → Kasa otomasyonu
- Yeni `src/lib/automation.functions.ts`:
  - `convertQuoteToInvoice(quoteId)` → fatura + `fatura_kalemleri` oluşturur, teklif `durum`="faturalandı".
  - `markInvoicePaid(invoiceId, kasaId, tarih)` → fatura `durum`="ödendi", `kasa_hareketleri`'ne giriş satırı (tip="tahsilat", `kaynak_tip`="fatura", `kaynak_id`).
- `src/routes/quotes.tsx`: satıra "Faturaya çevir" butonu + onay dialog.
- `src/routes/invoices.tsx`: "Tahsil et" butonu + kasa seçim dialog.
- `kasa_hareketleri` şemasına gerekiyorsa `kaynak_tip`, `kaynak_id` eklenir.

### 3) Gider → Kasa otomasyonu
- `src/routes/expenses.tsx` formuna "Kasadan öde" switch + kasa seçim.
- `automation.functions.ts` → `createExpenseWithCash(...)` & `deleteExpenseCascade(...)` (bağlı kasa hareketini de siler).

### 4) Bildirim tetikleyicileri + zil sayacı
- Yeni `src/lib/notifications.functions.ts`:
  - `scanAndCreateNotifications()` — vadesi geçen/yaklaşan fatura, `urunler.stok < 5`, geciken görev, tamamlanan üretim aşaması için `bildirimler`'e **idempotent** kayıt (`kaynak_tip+kaynak_id+tur` unique).
  - `getUnreadCount()`, `markRead(id)`, `markAllRead()`.
- `app-shell.tsx` TopBar'a `Bell` + badge, 60 sn poll. Tıklama `/notifications`.
- `/notifications` sayfasına "Tara" butonu + okuma işaretleme.

### 5) Üretim → Stok bağlantısı
- `uretim_emirleri` şemasına `urun_id`, `miktar` (idempotent setup ekler).
- `uretim_asamalari`'na `sarf_urun_id`, `sarf_miktar` (opsiyonel).
- `automation.functions.ts` → `completeProduction(orderId)`: üretilen ürün stoku artar, aşama sarfları düşer.
- `/productions` "Tamamla" akışı bu fn'i çağırır.

### 6) Kullanıcı girişi + rol (NocoDB + Google Authenticator)
**Yeni tablolar / kolonlar** (`/setup`'a eklenir):
- `kullanicilar`: ad, eposta (unique), parola_hash, rol (`admin`|`muhasebe`|`uretim`|`viewer`), aktif, totp_secret, totp_aktif, son_giris.
- `oturum_loglari`: kullanici_id, tarih, ip, basarili.

**Paketler**: `bcryptjs`, `otplib` (TOTP — Google Authenticator uyumlu), `qrcode` (kurulum QR'ı).

**Akış**:
- Yeni `/auth` sayfası: e-posta + parola + (TOTP aktifse) 6 haneli kod.
- `src/lib/auth.functions.ts`:
  - `login(email, password, totp?)` → bcrypt karşılaştırır, TOTP doğrularsa imzalı session cookie yazar (`@tanstack/react-start/server`'ın `useSession`, `SESSION_SECRET` ile).
  - `logout()`, `me()`.
  - `setupTotp()` → yeni secret + `otpauth://` URI + QR data URL döner.
  - `confirmTotp(code)` → ilk kod doğruysa `totp_aktif=true`.
- Yeni `_authenticated` layout (NocoDB versiyonu, Cloud'la karıştırılmaz): `beforeLoad` cookie session okur, yoksa `/auth`'a redirect; user objesini router context'e koyar.
- Mevcut tüm rotalar dosya rename ile `_authenticated.<isim>.tsx` formatına alınır. (route ID'leri otomatik güncellenir.)
- `src/lib/modules.ts` `MODULES`'a `roles?: string[]` alanı; sidebar role göre filtreler. `admin` her şeyi görür.
- `/settings/kullanicilar`: admin için tam CRUD + parola sıfırla butonu + "TOTP'yi sıfırla" butonu. Kendi hesabı için "Google Authenticator kur" butonu (QR gösterir).

**Gizli değerler**:
- `SESSION_SECRET` (32+ char) — `generate_secret` ile otomatik oluşturulur, kullanıcıdan istenmez.
- İlk admin: setup sırasında otomatik oluşturulur (`admin@idmmuhendislik.com` + geçici parola, ilk girişte zorla değiştirilir).

### 7) Raporlar genişletme
`src/routes/reports.tsx`'e sekmeler:
1. Gider (mevcut)
2. Ciro / Kar-Zarar — aylık fatura − gider bar grafik
3. Cari Yaşlandırma — firma bazında 0-30/30-60/60-90/90+ gün bekleyen alacak
4. Üretim Verimliliği — planlanan vs gerçek süre
5. Kasa Hareket Özeti — kasa bazında dönemsel giriş/çıkış/bakiye
Her sekme kendi server-fn'i + CSV export.

### 8) Dosya gerçek upload
- `dosyalar` şemasına `attachment` (uidt: `Attachment`) eklenir; `url` korunur.
- Yeni `src/lib/files.functions.ts` → `uploadFile(formData)`: NocoDB `POST /api/v2/storage/upload`'a proxy, dönen path `dosyalar`'a kaydedilir.
- `/files`: "Dosya yükle" butonu + dropzone, firma seçimi zorunlu. İndirme link gerçek attachment URL'ine bağlanır.

---

## Sıralama
Build sırasında şu sırayla yapılır (bağımlılıklar nedeniyle):
1. Şema güncellemeleri + `/setup` listesi (1, 2, 3, 5, 6, 8 için yeni alanlar)
2. Auth (madde 6) — diğer rotalar bunun altına taşınır
3. Otomasyon fn'leri (madde 2, 3, 5)
4. Panel (madde 1)
5. Bildirim + zil (madde 4)
6. Raporlar (madde 7)
7. Dosya upload (madde 8)
8. Smoke test + build doğrulama

## Doğrulama
- Build başarılı.
- `/setup` çalıştırılınca yeni kolonlar/tablolar eklenir.
- `/auth` ile giriş yapılır, TOTP kurulduktan sonra sonraki girişlerde 6 haneli kod istenir.
- Panel canlı sayılar, /quotes "Faturaya çevir", /invoices "Tahsil et", /expenses "Kasadan öde", TopBar zil sayacı, /productions "Tamamla" → stok güncellenir, /reports yeni sekmeler, /files gerçek upload görünür.

## Notlar
- Tek paylaşılan parola istemediğinizi söylerseniz tek satır farkla buna çevirebilirim (TOTP de tek olur).
- Google "Sign in with Google" değil — burada **Google Authenticator** uygulamasından 6 haneli kod (TOTP). Sunucu tarafında hiçbir Google API'sine gitmiyoruz.