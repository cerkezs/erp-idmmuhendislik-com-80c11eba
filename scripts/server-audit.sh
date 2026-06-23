#!/usr/bin/env bash
# =============================================================================
# IDM ERP — Sunucu Ön Denetim Scripti
# -----------------------------------------------------------------------------
# Bu script SUNUCUDA root olarak SSH üzerinden çalıştırılacak. HİÇBİR ŞEY
# silmez, kurmaz veya değiştirmez — sadece okur ve rapor üretir.
#
# Çalıştırma:
#   chmod +x server-audit.sh
#   sudo ./server-audit.sh | tee /tmp/server-audit-$(date +%F).txt
#
# Çıktıyı bana yapıştır → temizlik & kurulum planını ona göre hazırlayacağım.
# =============================================================================

set -u
RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[1;33m'; BLU='\033[0;34m'; NC='\033[0m'
ok()   { echo -e "${GRN}[OK]${NC} $*"; }
warn() { echo -e "${YLW}[!]${NC}  $*"; }
err()  { echo -e "${RED}[X]${NC}  $*"; }
hd()   { echo -e "\n${BLU}========== $* ==========${NC}"; }

run() { echo "+ $*"; eval "$@" 2>&1 | sed 's/^/  /'; echo; }

if [[ $EUID -ne 0 ]]; then
  warn "root değilsin — bazı kontroller boş dönebilir. sudo ile çalıştırman önerilir."
fi

hd "1) İŞLETİM SİSTEMİ"
run "cat /etc/os-release | head -n 10"
run "uname -a"
run "uptime"

hd "2) DONANIM / KAYNAK"
run "lscpu | grep -E 'Model name|CPU\(s\)|Architecture' | head -n 5"
run "free -h"
run "df -hT -x tmpfs -x devtmpfs"
run "lsblk"

hd "3) AĞ / PORTLAR"
run "ip -4 addr show | grep -E 'inet|^[0-9]'"
run "ss -tlnp 2>/dev/null || netstat -tlnp"
run "(command -v ufw >/dev/null && ufw status verbose) || echo 'ufw yok'"
run "(command -v firewall-cmd >/dev/null && firewall-cmd --list-all) || echo 'firewalld yok'"

hd "4) ÇALIŞAN SERVİSLER (top 30)"
run "systemctl list-units --type=service --state=running --no-pager --no-legend | awk '{print \$1}' | head -n 30"

hd "5) DOCKER"
if command -v docker >/dev/null; then
  ok "docker kurulu"
  run "docker --version"
  run "docker compose version 2>/dev/null || docker-compose --version 2>/dev/null"
  run "docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'"
  run "docker volume ls"
  run "docker network ls"
  run "docker system df"
else
  warn "docker kurulu DEĞİL"
fi

hd "6) NOCODB"
NOCO_CT=$(docker ps --format '{{.Names}} {{.Image}}' 2>/dev/null | grep -i 'nocodb' | head -n1 || true)
if [[ -n "${NOCO_CT}" ]]; then
  ok "NocoDB container: ${NOCO_CT}"
  CT_NAME=$(echo "${NOCO_CT}" | awk '{print $1}')
  run "docker inspect ${CT_NAME} --format '{{.Config.Image}} | restart={{.HostConfig.RestartPolicy.Name}} | volumes={{range .Mounts}}{{.Source}}:{{.Destination}} {{end}}'"
  run "docker logs --tail 20 ${CT_NAME}"
else
  warn "NocoDB container görünmüyor (belki başka yolla çalışıyor)"
fi

hd "7) NGINX"
if command -v nginx >/dev/null; then
  ok "nginx kurulu"
  run "nginx -v"
  run "nginx -t"
  run "ls -la /etc/nginx/sites-enabled/ 2>/dev/null || ls -la /etc/nginx/conf.d/"
else
  warn "nginx kurulu DEĞİL"
fi

hd "8) APACHE (varsa kaldırılması önerilir, port çakışması yapar)"
if command -v apache2 >/dev/null || command -v httpd >/dev/null; then
  warn "Apache kurulu — Nginx ile çakışabilir"
  run "systemctl status apache2 httpd 2>/dev/null | head -n 5"
else
  ok "Apache yok"
fi

hd "9) NODE.JS / NPM / PM2 / BUN"
for c in node npm pnpm yarn bun pm2; do
  if command -v $c >/dev/null; then
    ok "$c: $($c --version 2>&1 | head -n1)"
  else
    warn "$c yok"
  fi
done

hd "10) PYTHON / GIT / CURL"
for c in python3 git curl wget rsync unzip jq; do
  if command -v $c >/dev/null; then
    ok "$c: $($c --version 2>&1 | head -n1)"
  else
    warn "$c yok"
  fi
done

hd "11) SSL / CERTBOT"
if command -v certbot >/dev/null; then
  ok "certbot kurulu"
  run "certbot certificates 2>/dev/null | grep -E 'Certificate Name|Domains|Expiry' || echo 'sertifika yok'"
else
  warn "certbot yok"
fi
run "ls /etc/letsencrypt/live/ 2>/dev/null || echo 'letsencrypt klasörü yok'"

hd "12) DATABASE SUNUCULARI"
for svc in postgresql mysql mariadb mongodb redis-server; do
  if systemctl list-unit-files 2>/dev/null | grep -q "^${svc}.service"; then
    ST=$(systemctl is-active "$svc" 2>/dev/null)
    warn "$svc kurulu — durum: $ST  (NocoDB kendi DB'sini kullanıyorsa bu gereksiz olabilir)"
  fi
done

hd "13) CRON / ZAMANLANMIŞ GÖREVLER"
run "ls /etc/cron.d/ 2>/dev/null"
run "crontab -l 2>/dev/null || echo 'root crontab boş'"

hd "14) GEREKSİZ / RİSKLİ"
warn "Manuel inceleme önerilen klasörler:"
run "du -sh /var/log /var/cache /tmp /home/* 2>/dev/null | sort -h | tail -n 20"
run "ls /opt/ 2>/dev/null"

hd "15) PAKET YÖNETİCİSİ DURUMU"
if command -v apt >/dev/null; then
  run "apt list --upgradable 2>/dev/null | head -n 20"
elif command -v dnf >/dev/null; then
  run "dnf check-update 2>/dev/null | head -n 20"
elif command -v yum >/dev/null; then
  run "yum check-update 2>/dev/null | head -n 20"
fi

hd "16) ÖZET"
echo "Bu raporu kopyalayıp Lovable sohbete yapıştır."
echo "İhtiyaç duyacağımız hedef stack:"
echo "  - Node.js 20 + PM2  (Mini-API için)"
echo "  - Nginx              (reverse proxy + static)"
echo "  - certbot            (Let's Encrypt SSL)"
echo "  - NocoDB (mevcut)   :8443 üzerinde"
echo "  - /uploads/ klasörü (dosya depolama)"
echo "Eksik olanlar kurulacak, fazlalar (Apache vb.) onayınla kaldırılacak."

echo -e "\n${GRN}=== DENETİM TAMAMLANDI ===${NC}"
