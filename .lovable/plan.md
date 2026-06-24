
## Hedef
Tek bir `.env` SMTP yerine, **birden fazla gönderici hesabı** (info@, erdogan@, serdar@, no-reply@) tanımlayıp mail gönderirken UI'dan seçilebilir hale getirmek.

## Yapılacaklar

### 1. TürkTicaret panelinde (siz yapacaksınız — adımları vereceğim)
- `no-reply@idmmuhendislik.com` hesabını oluşturma (Kurumsal E-posta → Yönet → Yeni hesap)
- Her 4 hesabın şifresini hazır etme

### 2. NocoDB `mail_hesaplari` tablosu (zaten scaffold edildi, kullanılır hale getirilecek)
Alanlar: `id, ad, eposta, smtp_host, smtp_port, smtp_user, smtp_pass_secret_ref, varsayilan_mi, aktif`

4 kayıt eklenir:
| Ad | E-posta | Varsayılan |
|---|---|---|
| IDM Bilgi | info@idmmuhendislik.com | ✓ |
| Erdoğan Öztürk | erdogan@... | |
| Serdar | serdar@... | |
| Otomatik Bildirim | no-reply@... | |

### 3. Ayarlar → Mail sayfası (`settings_.mail.tsx`) güncellemesi
- "SMTP Durumu" yerine **Hesap Listesi** (kart/tablo görünümü)
- Her satırda: Düzenle, Sil, Test Maili Gönder, Varsayılan Yap butonları
- "+ Yeni Hesap Ekle" modal: ad, eposta, smtp host, port, kullanıcı, şifre
- Şifreler `.env` yerine NocoDB'de **şifreli** saklanır (AES — anahtar `.env`'deki `MAIL_ENC_KEY`)

### 4. Mail gönderim mantığı (`system.functions.ts` → `sendMail`)
- Parametre: `{ from_hesap_id?, to, subject, html }`
- `from_hesap_id` verilmezse varsayılan hesap kullanılır
- nodemailer transport'u her çağrıda ilgili hesabın bilgileriyle kurulur

### 5. Diğer modüllerde "Gönderici" seçici
Teklif/fatura/bildirim gönderiminde dropdown ile hesap seçilebilir; varsayılan otomatik dolu.

### 6. Sunucu `.env`'e tek satır
```bash
MAIL_ENC_KEY=<32-karakterlik rastgele>   # şifre şifreleme anahtarı
```
SMTP_HOST/USER/PASS artık `.env`'de değil — DB'de.

## Teknik notlar
- Şifre alanı için `crypto.createCipheriv('aes-256-gcm', ...)` kullanılır
- UI'da şifre maskelenir (•••), sadece "değiştir" tıklanırsa input açılır
- Test maili: seçili hesabın kendisine atılır, başarı/hata UI'da gösterilir

## Sıralama
1. NocoDB tablo şemasını güncelleyip 4 kaydı seed edecek script
2. `mail.functions.ts` (CRUD + şifrele/çöz + sendMail)
3. `settings_.mail.tsx` yeni UI
4. Size verilecek tek komut: `.env`'e `MAIL_ENC_KEY` ekleme + no-reply hesabını TürkTicaret'te açma adımları
