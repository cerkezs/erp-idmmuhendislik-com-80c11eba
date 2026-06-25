
## Düzeltilmiş Mimari

```
[Tarayıcı]
    ↓
[Lovable Frontend + Backend (ERP)]
    ↓ (1) SMTP/TLS                    ↓ (2) HTTPS
[mail.idmmuhendislik.com]      [noco.idmmuhendislik.com]
   TürkTicaret mail              VPS'inizdeki NocoDB
    ↓                              (veritabanı)
[Alıcının inbox'ı]
```

VPS'iniz yalnızca NocoDB barındırıyor. Mail için VPS'e **hiçbir şey kurmaya gerek yok**.

## Yapılacaklar

### 1. `MAIL_ENC_KEY`'i Lovable secret olarak ekle (otomatik)
- 64 karakterlik rastgele AES anahtarı üretilir ve Lovable backend'de `process.env.MAIL_ENC_KEY` olarak hazır olur.
- Şifreleri NocoDB'ye yazmadan önce AES-256-GCM ile şifrelemek için kullanılır.
- VPS'e dokunulmaz, sizden komut çalıştırmanız istenmez.

### 2. Mevcut kod zaten hazır
- `src/lib/mail.functions.ts` → şifre kasası (encrypt/decrypt) + `sendMail` + `testMailAccount`
- `src/routes/settings_.mail.tsx` → çoklu hesap yönetimi, varsayılan seçme, test butonu
- `mail_hesaplari` tablosu NocoDB'de ilk hesap eklenince otomatik oluşacak

### 3. TürkTicaret'te no-reply hesabı (siz açacaksınız)
Panel → Kurumsal E-posta → **Yönet** → **+ E-posta Hesabı Ekle**
- Adres: `no-reply@idmmuhendislik.com`
- Şifre: güçlü (not edin)
- Kota: 100-500 MB

### 4. Uygulama içinde 4 hesabı ekleme
`Ayarlar → Mail Hesapları` sayfasında "Şifreleme anahtarı: Tanımlı ✓" göründükten sonra **Yeni Hesap** ile:

| İsim | From Adres | SMTP Host | Port | Varsayılan |
|---|---|---|---|---|
| IDM Bilgi | info@idmmuhendislik.com | mail.idmmuhendislik.com | 587 | ✓ |
| Erdoğan Öztürk | erdogan@... | aynı | 587 | |
| Serdar | serdar@... | aynı | 587 | |
| Otomatik Bildirim | no-reply@... | aynı | 587 | |

Her satırın ✈️ butonu ile test maili gönderip "✓ Gönderildi" mesajını görün.

### 5. (Sonraki adım — bu plan onaylandıktan sonra)
Mail hesapları çalışınca diğer modüllere (teklif/fatura/bildirim) "Gönderici Hesap" seçicisi eklenir; varsayılan otomatik dolar, kullanıcı isterse değiştirir.

## Önemli not
"Kendi sunucumdan gönderelim" tercihiniz aslında **deliverability açısından fark yaratmaz**: mail her durumda TürkTicaret SMTP'sinden çıkar, SPF/DKIM TürkTicaret'i yetkilendirdiği için Lovable'dan bağlanmak da sizin VPS'inizden bağlanmak da alıcıya aynı görünür. Bu nedenle ekstra mail-relay servisi kurmaktan kaçınıyoruz.
