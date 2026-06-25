# Roundcube kurulum hatasını çözme planı

**Hata:** `ERROR 2002 (HY000): Can't connect to local server through socket '/run/mysqld/mysqld.sock'`

Bu hata, Roundcube veritabanını kurmaya çalışırken MySQL/MariaDB sunucusunun çalışmadığını (veya hiç kurulu olmadığını) gösteriyor. `dbconfig-common` bağlanacak bir DB bulamadığı için patlıyor.

## Çözüm adımları (VPS'te SSH ile sırayla)

### 1) Şu anki diyaloğu kapat
Ekrandaki menüde **`abort`** seçip Enter'a bas. (retry işe yaramaz çünkü MariaDB hâlâ kapalı olacak.)

### 2) MariaDB'yi kur ve başlat
```bash
sudo apt update
sudo apt install -y mariadb-server
sudo systemctl enable --now mariadb
sudo systemctl status mariadb     # "active (running)" görmelisin
```
Soket kontrolü:
```bash
ls -l /run/mysqld/mysqld.sock
```

### 3) Root parolasını ayarla (opsiyonel ama önerilir)
```bash
sudo mysql_secure_installation
```
- Root parolası belirle
- Anonymous users → Y
- Disallow root login remotely → Y
- Remove test database → Y
- Reload privileges → Y

### 4) Roundcube için DB ve kullanıcı oluştur
```bash
sudo mysql -u root -p <<'SQL'
CREATE DATABASE roundcube CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
CREATE USER 'roundcube'@'localhost' IDENTIFIED BY 'GÜÇLÜ_BİR_ŞİFRE_KOY';
GRANT ALL PRIVILEGES ON roundcube.* TO 'roundcube'@'localhost';
FLUSH PRIVILEGES;
SQL
```
> `GÜÇLÜ_BİR_ŞİFRE_KOY` kısmını gerçek bir şifre ile değiştir ve bir yere not et.

### 5) Roundcube kurulumunu yeniden tetikle
```bash
sudo dpkg --configure -a
# veya kuruluma kaldığı yerden devam:
sudo apt install -y --reinstall roundcube roundcube-core roundcube-mysql
```
Bu sefer `dbconfig-common` sorduğunda:
- **Yes** → veritabanını yapılandır
- Database type: **MySQL** (MariaDB için bunu seç)
- Yukarıda oluşturduğun roundcube kullanıcı şifresini gir

### 6) Doğrulama
```bash
sudo systemctl status mariadb php8.3-fpm nginx
mysql -u roundcube -p -e "SHOW TABLES;" roundcube
```
Tablolar listelenmeli (users, sessions, cache, vb.).

Ardından önceki plandaki **Nginx vhost + SSL + Roundcube config** adımlarına devam edebilirsin.

## Olası ek sorunlar

- **PHP sürümü uyuşmazlığı** → `php -v` ile kontrol et, vhost'taki `php8.3-fpm.sock` yolunu kurulu sürüme göre düzelt.
- **MariaDB başlamıyor** → `sudo journalctl -u mariadb -n 50` ile log bak. Genelde disk dolu veya `/var/lib/mysql` izinleri bozuk olur:
  ```bash
  sudo chown -R mysql:mysql /var/lib/mysql
  sudo systemctl restart mariadb
  ```
- **Port 3306 dış dünyaya açık olmasın** → UFW kullanıyorsan sadece localhost: MariaDB varsayılan olarak `bind-address = 127.0.0.1`, dokunma.

Onaylarsan bu adımları sırayla uygulayıp sonuçlarını birlikte değerlendirelim. Şu an SSH konsoluna senin yazman gerekiyor (Lovable VPS'ine bağlanamıyor) — ben her adımın çıktısına göre yönlendiririm.
