## Hedef
Sistemi tek yönlü (sadece bizim kestiğimiz faturalar) yapıdan çift yönlü cari yapıya çevirmek: müşteriler + tedarikçiler ayrımı, alış (gelen) faturaları, cari hareketler ve kur kilidi.

---

## 1) Firma Türü: Müşteri / Tedarikçi / İkisi

`companies` tablosuna `type` alanı (`musteri` | `tedarikci` | `ikisi`). Mevcut tüm kayıtlar varsayılan `musteri` olarak işaretlenir.

**Sol menü (sidebar) iki ayrı modül:**
- **Müşteriler** → `/musteriler` (type ∈ {musteri, ikisi})
- **Tedarikçiler** → `/tedarikciler` (type ∈ {tedarikci, ikisi})

Mevcut `/companies` listesi "Tüm Firmalar" olarak Sistem grubunda kalır (admin görünümü).

---

## 2) Firma Profil Sayfası — `/companies/$id`

Her firmaya tıklandığında açılan tek profil sayfası:

```text
┌─ Firma Künyesi (ad, vergi no, adres, mail, tel, etiket: müşteri/tedarikçi)
├─ Özet kartları:
│   • Toplam Alacak (bizim kestiğimiz açık faturalar)
│   • Toplam Borç   (tedarikçinin kestiği açık faturalar)
│   • Net Bakiye    (+ alacaklı / − borçlu)
├─ Sekmeler:
│   1. Cari Hareketler  (ledger — kronolojik, koşu bakiyeli)
│   2. Satış Faturaları (bizim kestiğimiz)
│   3. Alış Faturaları  (tedarikçinin kestiği)
│   4. Teklifler
│   5. Dosyalar         (mevcut Files modülü filtreli)
│   6. Notlar
```

---

## 3) Cari Hareketler — `cari_hareketler` tablosu

Tek ledger tablosu, her satır firmaya bağlı:

| Alan | Açıklama |
|---|---|
| company_id | FK |
| date | hareket tarihi |
| type | `fatura_satis`, `fatura_alis`, `tahsilat`, `odeme`, `iade`, `manuel` |
| ref_table / ref_id | varsa kaynak (invoice/purchase) |
| description | açıklama |
| currency | TRY / USD / EUR |
| rate | o tarihteki kur (1 birim = X TRY) |
| amount | orijinal para biriminde |
| amount_try | hesaplanmış TRY karşılığı (kilitli) |
| direction | `borc` (firma bize borçlu) / `alacak` (biz firmaya borçluyuz) |

**Manuel giriş örneği:** "Nature bize 50.000 TL ödeme yaptı" → type=`tahsilat`, direction=`alacak` (alacağımız azaldı), amount=50000, TRY.

Koşu bakiye hesabı: `SUM(borc - alacak)` kronolojik.

---

## 4) Alış Faturaları — `purchase_invoices` tablosu

Bize gelen (tedarikçinin kestiği) faturalar için yeni tablo, satış faturalarına çok yakın yapı:

- supplier_id (companies → tedarikçi)
- number (tedarikçinin fatura no)
- issue_date, due_date
- currency, rate, rate_source (`tcmb` | `manuel`), rate_locked_at
- subtotal, vat, total (orijinal döviz)
- total_try (kilit)
- status: `bekliyor` | `kismi_odendi` | `odendi` | `iptal`
- paid_amount, paid_amount_try
- pdf/attachment (NocoDB upload)

Liste sayfası: `/alis-faturalari` — filtre, sıralama, vade uyarısı.

Fatura kaydedildiğinde otomatik `cari_hareketler`'e `fatura_alis` satırı düşer (direction=`alacak`, yani biz borçluyuz).

---

## 5) Kur Kilidi (snapshot)

Mevcut `invoices` ve yeni `purchase_invoices` için ortak kural:

- Fatura formuna **3 alan** eklenir:
  - `currency` (₺ / $ / €)
  - `rate` (TRY karşılığı — döviz seçilince zorunlu)
  - `rate_source` radio: **Otomatik (TCMB)** / **Manuel**
- "Otomatik" seçilince **fatura tarihindeki** TCMB kuru çekilir (today.xml o günse bugün; geçmiş tarihler için tcmb arşivi `YYYYMM/DDMMYYYY.xml` endpointi). Bulunamazsa kullanıcıya uyarı + manuel giriş istenir.
- Kaydedildiğinde `total_try = total * rate` hesaplanır ve **veritabanına yazılır**. Sonradan kur değişse de bu alan değişmez.
- TRY seçiliyse `rate = 1`, source = `tl`.
- Listelerde ve raporlarda gösterim hep kilitli `total_try`'dan; orijinal döviz tutarı yanında küçük etiketle (`€ 1.200 · ₺ 52.080 @ 43,40 · 12.06.2026`).

Mevcut faturalar için migration: `rate = NULL` ise getRates anlık değerini bir kerelik yazıp kilitler (bilgi notu ile).

---

## 6) Dashboard güncellemesi

`Bekleyen Alacak` kartının yanına yeni kart:

- **Bekleyen Ödeme** — açık `purchase_invoices` toplamı (TRY kilidinden), kaç fatura, vadesi geçen sayısı
- İkon: `CreditCard`, tone uyarı: vadesi geçen > 0 ise

`dashboardSummary` server-fn'ine `bekleyenOdeme`, `openPurchaseCount`, `vadesiGecmisOdeme`, `openPurchases[]` eklenir. Aşağıdaki "Bekleyen Faturalar" bölümü iki sütuna bölünür: **Tahsil Edilecekler** | **Ödenecekler**.

---

## 7) Modül ve route değişiklikleri

```text
Yeni route'lar:
  /musteriler             (filtered companies list)
  /tedarikciler           (filtered companies list)
  /companies/$id          (profile + tabs)
  /alis-faturalari        (purchase invoice list)
  /alis-faturalari/$id    (detail/edit; print)
  /cari/$companyId        (full ledger view, profil tabından da erişilir)

Güncellenenler:
  src/lib/modules.ts            → menü grupları
  src/lib/nocodb.functions.ts   → yeni tablolar, ledger fn'leri, kur snapshot
  src/lib/rates.functions.ts    → tarih bazlı TCMB çağrısı
  src/routes/index.tsx          → yeni kart + iki sütun
  src/routes/invoices.tsx       → kur kilidi alanları
  src/routes/companies.tsx      → tip filtresi
  src/components/app-shell.tsx  → yeni menü öğeleri
```

---

## 8) Sırayla teslim
1. Şema: `companies.type`, `cari_hareketler`, `purchase_invoices` (setup.tsx + auto-create)
2. Kur snapshot mantığı (`invoices` formu + tarih-bazlı TCMB)
3. Alış Faturaları modülü (liste + form + ledger trigger)
4. Firma profil sayfası + sekmeler + cari ledger
5. Müşteriler/Tedarikçiler bölünmüş listeler + sidebar
6. Dashboard "Bekleyen Ödeme" kartı

---

### Onaylamadan önce 2 küçük soru
- **Cari hareket girişlerinde** çoklu kasa entegrasyonu istiyor musun? (Ör. "Nature 50.000 TL ödedi" derken hangi kasaya girdiğini de seçmek + otomatik kasa hareketi oluşturmak) — yoksa sadece cari ledger'a yazıp kasa hareketini ayrı mı tutalım?
- **Geçmiş tarihli TCMB kuru** bulunamazsa (hafta sonu/tatil) davranış: bir önceki iş gününün kurunu kullan mı, yoksa kullanıcıdan manuel giriş mi istesin?
