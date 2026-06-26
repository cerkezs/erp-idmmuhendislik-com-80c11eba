Mail başlığı (#7) hariç tüm eksikleri sırayla tamamlayacağım. Çıktıyı **3 batch** halinde teslim edeceğim — her batch derleme/test sonrası bir sonrakine geçecek.

## Batch 1 — Liste araçları + Toast + Rol UI (#1, #5, #8 kısmi)

**Paylaşılan `ListToolbar`**
- `src/components/list-toolbar.tsx` oluştur — arama input'u, durum dropdown'u (opsiyonel), tarih aralığı (opsiyonel), sıralama (alan + asc/desc), sonuç sayacı.
- `src/hooks/use-list-filter.ts` — `{ query, status, from, to, sortKey, sortDir }` state'i + `filter+sort` memo helper'ı.

**Uygulanacak modüller** (her birinde aktif/tamamlanmış ayrımı uygun yerlerde):
- Firmalar — arama, sıralama (ad, eklenme), tür filtresi
- Ürünler — arama, döviz filtresi, stok < min filtresi
- Teklifler — durum filtresi + Aktif/Kapalı bölümlemesi, sıralama
- Faturalar — durum filtresi + Açık/Ödenmiş bölümlemesi, vadesi geçen vurgusu
- Giderler — kategori filtresi, tarih aralığı, sıralama
- Kasa — hesap filtresi, giriş/çıkış filtresi, tarih aralığı
- Aksiyon & Görev — durum filtresi + Açık/Tamamlanmış bölümlemesi
- Dosyalar — kategori filtresi (mevcut firma ağacına ek olarak)
- Bildirimler — tip filtresi, okundu filtresi
- Üretim — mevcut toolbar'ı paylaşılan bileşene refactor et

**Toast (Sonner)**
- `src/components/ui/sonner.tsx` zaten var. `src/routes/__root.tsx`'e `<Toaster />` ekle.
- Tüm mutation'larda `onSuccess`/`onError` ile `toast.success` / `toast.error`. Yardımcı: `src/lib/toast.ts` (`crudToast(action, name)`).

**Rol bazlı UI**
- `src/hooks/use-me.ts` — mevcut `me` server fn'ini React Query ile sarmalar.
- `MODULES`'a `roles?: ("admin"|"editor"|"viewer")[]` alanı; `AppShell`'de menü filtrelemesi.
- "Sil", "Düzenle", "Faturaya çevir", "Tahsil et", "Şifre sıfırla" gibi yazma butonları yalnız `admin`/`editor` için. `viewer` rolünde formlar read-only.

## Batch 2 — Bildirim tetikleyiciler + Üretim/Stok bağı (#3, #6)

**`scanTriggers` server fn** (`src/lib/nocodb.functions.ts`)
- Vadesi geçmiş açık faturalar → `bildirimler` tipinde 1 kayıt (gün+fatura no anahtarıyla idempotent).
- Stoğu `min_stock` altına düşen ürünler → `warning` bildirim.
- Bugünü geçen ve hâlâ açık görevler → `warning` bildirim.
- Aynı gün aynı kaynak için tekrar üretmemek üzere `kaynak_key` alanı kontrolü.

**Tetikleme yerleri**
- `AppShell` mount'unda + her 30 dakikada bir `useQuery` ile background çalıştır.
- `/api/public/cron-scan` server route — harici cron çağırırsa diye token korumalı.

**Üretim/Stok**
- `urunler` tablosuna `min_stock` (Decimal) alanı (setup.tsx + schema).
- `completeProduction` sonrasında, üretim BOM kalemleri stoğu düşürür; stok `min_stock` altına inerse `scanTriggers`'ı çağırır.
- Ürünler listesinde "stok altında" rozeti.

## Batch 3 — Teklif/Fatura yazdır + Gerçek dosya upload (#2, #4)

**Yazdır / PDF**
- `src/routes/quotes.$id.print.tsx` ve `src/routes/invoices.$id.print.tsx` — A4 yazdırılabilir görünüm (firma başlığı, kalemler tablosu, toplam, IBAN/şartlar). `@media print` ile temiz çıktı.
- Tarayıcının "Yazdır → PDF olarak kaydet" akışı; harici PDF kütüphanesi yok (Worker uyumlu olmayanları zaten kullanmıyoruz).
- Liste satırına "Yazdır" butonu (yeni sekmede açar).
- Faturada "Mail ile gönder" — mevcut `sendMail` ile, body'de yazdırma linki.

**Gerçek dosya upload**
- `dosyalar` tablosuna NocoDB Attachment alanı `file_att` + setup.tsx güncelle.
- `src/lib/nocodb.functions.ts` → `uploadFile` server fn: `FormData` alır, NocoDB `/api/v2/storage/upload` çağrısı yapar, dönen URL'i `dosyalar` kaydının `url` alanına yazar.
- `files.tsx` formuna `<input type="file">` + sürükle-bırak alanı. URL alanı geriye dönük uyumluluk için kalır.
- Firma kaydı formunda da "Bu firmaya dosya yükle" kısa yolu.

---

## Teknik notlar
- Hiçbir Node-only paket eklenmeyecek (Worker uyumu).
- DB değişiklikleri `src/routes/setup.tsx` üzerinden idempotent şekilde uygulanacak.
- Mevcut `productions.tsx` `ListToolbar`'ı paylaşılan bileşeni kullanacak şekilde refactor edilecek — davranış aynı.
- Mail (#7) bu plana dahil değil, sonra ele alınacak.

---

Onay verirseniz Batch 1 ile başlıyorum.