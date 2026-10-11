#!/usr/bin/env bash
# Avelro Paket Satış Sistemi kurulumu ve güncellemesi.
#
#   curl -fsSL https://raw.githubusercontent.com/avelroinc/avelro-seller/main/install.sh | sudo bash
#
# İlk çalıştırmada: Docker yoksa kurar, alan adını ve GitHub okuma tokenını sorar (token yalnızca gizli sistem imajını indirmek
# için, bir kez), güvenlik anahtarlarını üretir, hazır imajı indirip başlatır ve Kurulum Anahtarı'nı ekrana yazar. Sonra alan adı
# açılır ve Kurulum Sihirbazı tamamlanır. Plesk varsa uygulama yalnızca sunucunun içinde (127.0.0.1) çalışır ve Plesk'in nginx
# ayarı yapılır; yoksa HTTPS'i Caddy sağlar.
# Kurulu sunucuda tekrar çalıştırıldığında sistemi son sürüme günceller; ayarlar ve veriler korunur.
set -euo pipefail
# Betik "curl | bash" ile çalışır: bütün gövde main içindedir, böylece bash dosyanın tamamını okumadan çalıştırmaz ve stdin okuyan
# bir komut (docker compose exec gibi) betiğin geri kalanını yutamaz; main'in stdin'i ayrıca /dev/null'a bağlanır.
main(){

IMAGE="ghcr.io/avelroinc/avelro-packet-seller:latest"
DIR="${AVELRO_DIR:-/opt/avelro-seller}"

say(){ printf '\033[1;34m==>\033[0m %s\n' "$*"; }
ok(){ printf '\033[1;32m  ✓\033[0m %s\n' "$*"; }
warn(){ printf '\033[1;33m  !\033[0m %s\n' "$*"; }
die(){ printf '\033[1;31mHata:\033[0m %s\n' "$*" >&2; exit 1; }
ask(){ local value; read -r -p "$1" value </dev/tty; printf '%s' "$value"; }
ask_secret(){ local value; read -r -s -p "$1" value </dev/tty; printf '\n' >/dev/tty; printf '%s' "$value"; }
random(){ (set +o pipefail; LC_ALL=C tr -dc "$1" </dev/urandom | head -c "$2") || true; }
port_free(){ ! ss -ltnH 2>/dev/null | awk '{print $4}' | grep -qE "[:.]$1\$"; }

[ "$(id -u)" = "0" ] || die "Kurulumu root olarak çalıştırın (sudo bash)."
[ -r /dev/tty ] || die "Kurulum etkileşimli bir terminal gerektirir."

printf '\n\033[1mAvelro Paket Satış Sistemi\033[0m\n\n'

# 1. Docker
if ! command -v docker >/dev/null 2>&1; then
 say "Docker kuruluyor"
 curl -fsSL https://get.docker.com | sh >/dev/null || die "Docker kurulamadı."
 systemctl enable --now docker >/dev/null 2>&1 || true
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose eklentisi bulunamadı (docker-compose-plugin paketini kurun)."
ok "Docker hazır"

mkdir -p "$DIR"; cd "$DIR"

# 2. Güncelleme: kurulu sistemde imaj yenilenir, ayarlar ve veriler aynen kalır.
if [ -f app.env ] && [ -f compose.yaml ]; then
 say "Kurulu sistem bulundu ($DIR); son sürüme güncelleniyor"
 docker compose pull -q || die "İmaj indirilemedi. GitHub tokenının süresi dolmuş olabilir: docker login ghcr.io komutuyla yeniden giriş yapın."
 docker compose up -d --remove-orphans
 docker image prune -f >/dev/null 2>&1 || true
 ok "Güncelleme tamamlandı"
 exit 0
fi

# 3. Bilgiler
DOMAIN=""
while :; do
while ! printf '%s' "$DOMAIN" | grep -qE '^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$'; do
 DOMAIN="$(ask 'Alan adı (örnek: magaza.com): ' | tr '[:upper:]' '[:lower:]' | sed 's#^https\?://##; s#/.*##')"
done
 CONFIRM="$(ask "Alan adı $DOMAIN, doğru mu? [E/h]: ")"
 case "$CONFIRM" in h|H|hayir|hayır|n|N) DOMAIN="";; *) break;; esac
done
say "GitHub okuma tokenı (yalnızca read:packages izni; yazarken görünmez)"
TOKEN="$(ask_secret 'Token: ')"
[ -n "$TOKEN" ] || die "Token boş olamaz."
if ! printf '%s' "$TOKEN" | docker login ghcr.io -u avelro --password-stdin >/dev/null 2>&1; then
 GH_USER="$(ask 'GitHub kullanıcı adı (tokenı oluşturan hesap): ')"
 printf '%s' "$TOKEN" | docker login ghcr.io -u "$GH_USER" --password-stdin >/dev/null 2>&1 || die "GitHub girişi başarısız. Tokenın read:packages iznini ve süresini kontrol edin."
fi
unset TOKEN
ok "GitHub girişi yapıldı"

# 4. Plesk varsa uygulama sunucunun ağında, yalnızca 127.0.0.1'de çalışır (Plesk 80/443'ü kullanır; güvenlik duvarı yeniden
# yüklendiğinde Docker port yönlendirmesi koptuğu için ayrı ağ kullanılmaz).
PLESK=0; if [ -d /usr/local/psa ] || command -v plesk >/dev/null 2>&1; then PLESK=1; fi
if [ "$PLESK" = 1 ]; then
 PORT=3100; while ! { port_free "$PORT" && port_free $((PORT+1)) && port_free $((PORT+2)); }; do PORT=$((PORT+10)); done
 HOST=127.0.0.1; INTERNAL=$((PORT+1)); CONTROL=$((PORT+2))
 ok "Plesk bulundu; uygulama 127.0.0.1:$PORT adresinde çalışacak"
else
 HOST=0.0.0.0; PORT=3000; INTERNAL=3001; CONTROL=5174
fi

# 5. Ayarlar ve anahtarlar
SETUP_KEY="$(random 'A-HJ-NP-Z2-9' 24 | sed 's/.\{4\}/&-/g; s/-$//')"
umask 077
cat > app.env <<EOF
NODE_ENV=production
AVELRO_TARGET=node
AVELRO_DB_PATH=/data/avelro.sqlite
PUBLIC_ORIGIN=https://$DOMAIN
HOST=$HOST
PORT=$PORT
AVELRO_INTERNAL_PORT=$INTERNAL
AVELRO_CONTROL_PORT=$CONTROL
PROVIDER_ENCRYPTION_KEY=$(random 'A-Za-z0-9' 32)
ORDER_WORKER_TOKEN=$(random 'a-f0-9' 64)
MODULE_HOST_TOKEN=$(random 'a-f0-9' 64)
MODULE_HOST_URL=http://127.0.0.1:$CONTROL/module-host
SYSTEM_UPDATE_TOKEN=$(random 'a-f0-9' 64)
SYSTEM_UPDATE_URL=http://127.0.0.1:$CONTROL/system-update
AVELRO_RELEASE_DIR=/data/releases
AVELRO_SETUP_KEY=$SETUP_KEY
EOF
umask 022

if [ "$PLESK" = 1 ]; then
cat > compose.yaml <<EOF
services:
  app:
    image: $IMAGE
    restart: unless-stopped
    init: true
    network_mode: host
    env_file: ./app.env
    volumes:
      - avelro-data:/data
      - avelro-modules:/app/.module-packages
    stop_grace_period: 30s
volumes:
  avelro-data:
  avelro-modules:
EOF
else
cat > Caddyfile <<EOF
$DOMAIN {
  encode zstd gzip
  reverse_proxy app:3000 {
    header_up -CF-Connecting-IP
    header_up X-Forwarded-For {remote_host}
    header_up X-Forwarded-Proto {scheme}
  }
}
EOF
cat > compose.yaml <<EOF
services:
  app:
    image: $IMAGE
    restart: unless-stopped
    init: true
    env_file: ./app.env
    volumes:
      - avelro-data:/data
      - avelro-modules:/app/.module-packages
    expose: ["3000"]
    stop_grace_period: 30s
  proxy:
    image: caddy:2-alpine
    restart: unless-stopped
    depends_on: [app]
    ports: ["80:80", "443:443", "443:443/udp"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy-data:/data
      - caddy-config:/config
volumes:
  avelro-data:
  avelro-modules:
  caddy-data:
  caddy-config:
EOF
fi
ok "Ayarlar yazıldı ($DIR/app.env)"

# 6. Başlatma
say "Sistem indiriliyor ve başlatılıyor"
docker compose pull -q || die "Sistem imajı indirilemedi."
docker compose up -d
printf '  Uygulama açılıyor'
for _ in $(seq 1 90); do
 if docker compose exec -T app node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))" >/dev/null 2>&1; then READY=1; break; fi
 printf '.'; sleep 2
done
printf '\n'
[ "${READY:-0}" = 1 ] || die "Uygulama açılmadı. Kayıtlar için: cd $DIR && docker compose logs --tail 50 app"
ok "Uygulama çalışıyor"

# 7. Plesk: alan adının nginx ayarı (proxy mode kapalı, uygulamaya yönlendirme). Alan adı Plesk'te yoksa ya da komut desteklenmezse
# yapılacak ayar ekrana yazılır.
if [ "$PLESK" = 1 ]; then
 cat > nginx-directives.conf <<EOF
location ~ ^/ {
    proxy_pass http://127.0.0.1:$PORT;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For \$remote_addr;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection \$http_connection;
    proxy_read_timeout 300s;
    client_max_body_size 20m;
}
EOF
 if plesk bin site --info "$DOMAIN" >/dev/null 2>&1 && plesk bin site --update-web-server-settings "$DOMAIN" -nginx-proxy-mode false -additional-nginx-directives "$DIR/nginx-directives.conf" >/dev/null 2>&1; then
  ok "Plesk nginx ayarı yapıldı ($DOMAIN)"
  PLESK_DONE=1
 else
  warn "Plesk ayarı otomatik yapılamadı. Plesk › $DOMAIN › Apache ve nginx Ayarları: \"Proxy mode\" kapalı, \"Ek nginx yönergeleri\" alanına şu dosyanın içeriği:"
  printf '    %s\n' "$DIR/nginx-directives.conf"
 fi
fi

printf '\n\033[1;32mKurulum tamamlandı.\033[0m\n\n'
if [ "$PLESK" = 1 ]; then
 printf '  1. Plesk › %s › SSL/TLS Sertifikaları bölümünden Let'"'"'s Encrypt sertifikası alın (yoksa).\n' "$DOMAIN"
 [ "${PLESK_DONE:-0}" = 1 ] || printf '  2. Yukarıdaki nginx ayarını yapın.\n'
fi
printf '  Tarayıcıda açın:   \033[1mhttps://%s\033[0m\n' "$DOMAIN"
printf '  Kurulum Anahtarı:  \033[1m%s\033[0m\n\n' "$SETUP_KEY"
printf '  Anahtar sihirbazın ilk adımında istenir; tekrar görmek için: grep AVELRO_SETUP_KEY %s/app.env\n' "$DIR"
printf '  Güncellemek için aynı kurulum komutunu yeniden çalıştırın.\n\n'
}
main "$@" </dev/null
