ERP'nin /mail rotasını Roundcube webmail paneli olarak yeniden tasarlayacağız.

## Yapılacaklar

1. `/mail` rotası değiştirilir
   - Mevcut "Mail Gönderim & Log" tablo/arayüzü kalır (alt sekme veya ayrı bölüm olarak).
   - Ana görünüm: tam boy iframe içinde `https://webmail.idmmuhendislik.com`.
   - Sidebar'daki "Mail" menüsü bu sayfaya yönlendirir.

2. iframe güvenlik & stil
   - `sandbox` ve `allow` attribute'ları doğru ayarlanır (allow-same-origin, allow-scripts, allow-forms, allow-popups).
   - iframe yüklenene kadar skeleton/loading spinner gösterilir.
   - Yükseklik: ekran boyutuna göre dinamik (`h-[calc(100vh-...)]`).

3. SSO / Otomatik Giriş (opsiyonel — ilk aşamada manuel)
   - Roundcube'nin IMAP auth'u zaten kendi başına çalışıyor.
   - ERP kullanıcısı ile mail kullanıcısı aynı değilse, otomatik giriş için Roundcube remote auth veya plugin gerekir; bu sunucu tarafı yapılandırma ister.
   - **İlk versiyonda kullanıcı iframe içinde kendi mail şifresiyle Roundcube'e manuel giriş yapar.** SSO daha sonra sunucu tarafı hazır olunca eklenebilir.

4. Ek:
   - Sayfa başlığı: "Webmail — IDM ERP"
   - Responsive: mobilde iframe alt alta kaydırmalı, sidebar daraltmalı.

## Teknik detaylar
- Dosya: `src/routes/mail.tsx` üzerinde değişiklik.
- Cross-origin iframe olacağı için `referrerPolicy` ve gerekirse `credentialless` değerlendirilir.
- Mevcut mail log tablosu (eski /mail içeriği) `src/routes/settings_.mail-log.tsx` gibi bir alt sayfaya taşınabilir VEYA aynı sayfada alt sekme (Tabs) olarak bırakılabilir. Henüz karar verilmedi.