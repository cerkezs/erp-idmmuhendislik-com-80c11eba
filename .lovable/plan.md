## Üretim Emirleri (`/productions`) iyileştirmeleri

### 1. Duruma göre renklendirme
Her satır için `status` değerine göre sol kenar şeridi + rozet rengi:
- **Planlandı** → mavi (`border-l-blue-500`, badge `bg-blue-500/15 text-blue-600`)
- **Üretimde** → amber/turuncu
- **Beklemede** → gri
- **Tamamlandı** → yeşil
- **İptal** → kırmızı

Şu anki düz `bg-muted` rozet bu `statusStyles` haritasıyla değişecek.

### 2. İki bölümlü liste: Aktif & Tamamlanan
- `rows` ikiye ayrılır: `active = status !== "Tamamlandı"`, `done = status === "Tamamlandı"`.
- Üstte **"Aktif Üretim Emirleri"** tablosu (Planlandı / Üretimde / Beklemede / İptal).
- Altında ayrı kart olarak **"Tamamlanan Emirler"** tablosu — varsayılan kapalı (collapsible), başlığında sayaç (`{done.length}`).
- Bir emrin durumu "Tamamlandı" yapıldığında otomatik üstten çıkıp alt bölüme düşer (zaten aynı `rows` üzerinden filtre).

### 3. Her iki bölüm için gelişmiş arama & sıralama
Üst toolbar (her iki tabloya ayrı state):
- **Arama kutusu**: no / firma / ürün / not alanlarında case-insensitive arama.
- **Durum filtresi** (multi-select chips — aktif tablo için).
- **Firma filtresi** (select, mevcut firmalar listesinden).
- **Tarih aralığı**: başlangıç ve bitiş için "şundan / şuna" date inputları.
- **Sıralama**: dropdown — Tarih (yeni→eski / eski→yeni), Emir No, Firma A-Z, Maliyet (artan/azalan), Miktar.
- Sütun başlıklarına tıklayınca da sıralama (ok ikonuyla).
- Sağda **"Temizle"** butonu ve aktif filtre sayısı rozeti.

Filtre + sıralama hafif `useMemo` ile client-side. URL search params'a yazmak opsiyonel (şu an yapmıyoruz, sade tutulacak).

### 4. Diğer sayfalardaki benzer ihtiyaç
Aynı arama/sıralama/filtre paterninden fayda görecek mevcut listeler:

| Sayfa | Önerilen filtreler | Sıralama |
|---|---|---|
| `/products` | Arama (ad/sku), kategori, döviz | Ad, fiyat, stok |
| `/companies` | Arama (ad/vergi no), tür (müşteri/tedarikçi), şehir | Ad, oluşturma |
| `/invoices` | Arama, durum (ödendi/bekliyor), firma, tarih aralığı | Tarih, tutar, vade |
| `/quotes` | Arama, durum, firma, tarih aralığı | Tarih, tutar |
| `/expenses` | Arama, kategori, firma, tarih aralığı | Tarih, tutar |
| `/kasa` | Arama, hesap, tür (gelir/gider), tarih aralığı | Tarih, tutar |
| `/files` | Arama (ad), tür, klasör | Ad, boyut, tarih |
| `/mail` | Arama (konu/gönderen), klasör, okundu/okunmadı | Tarih |

Yaygın bir desen olduğu için ortak bir `<ListToolbar>` (arama + filtre slotu + sıralama dropdown'u) ve `useListFilters` hook'u oluşturulabilir — ilk olarak `/productions`'a uygulanır, sonra diğer sayfalara aynı bileşenle taşınır.

### Teknik notlar
- Sadece `src/routes/productions.tsx` düzenlenecek (UI).
- Tip yapısı / nocodb fonksiyonları değişmeyecek; filtre + sıralama client-side, mevcut `useQuery` aynı kalır.
- Renkler için Tailwind utility'leri yeterli; design token'a gerek yok (durum renkleri evrensel semantik).

### Bu plan sonrası
Onaylarsan önce **sadece `/productions`** üzerinde uygulayacağım (renk + iki bölüm + toolbar). Diğer sayfalar için arama/sıralama'yı **istediğin sırayla ayrı turlarda** ekleyebiliriz — hepsini birden yaparsak bu PR çok büyük olur.

**Soru**: Diğer sayfalardan hangilerine de bu turda aynı toolbar'ı eklemememi istersin? (Yoksa önce sadece üretim, sonra tek tek mi gidelim?)
