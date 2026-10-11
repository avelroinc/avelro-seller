# Avelro Paket Satış Sistemi

Avelro Paket Satış Sistemi'nin herkese açık parçaları: kurulum betiği, entegrasyon modülleri ve mağaza temaları. Ana sistem gizlidir
ve hazır Docker imajı olarak dağıtılır; kurulum betiği imajı bir kez verilen GitHub okuma tokenıyla indirir.

## Kurulum

Ubuntu / Debian sunucuda root olarak:

```sh
curl -fsSL https://raw.githubusercontent.com/avelroinc/avelro-seller/main/install.sh | sudo bash
```

Betik Docker'ı kurar (yoksa), alan adını ve GitHub tokenını (yalnızca `read:packages` izni) sorar, güvenlik anahtarlarını üretir,
sistemi başlatır ve **Kurulum Anahtarı**'nı ekrana yazar. Ardından alan adını açın; Kurulum Sihirbazı anahtarı ister, yönetici
hesabını, mağazayı ve temayı kurar. Sunucuda Plesk varsa uygulama yalnızca 127.0.0.1 üzerinde çalışır ve Plesk'in nginx ayarı
yapılır; yoksa HTTPS'i Caddy sağlar (80 ve 443 portları açık olmalı).

Ayarlar ve veriler `/opt/avelro-seller` klasöründe ve Docker volume'lerindedir. **Güncelleme** mobil uygulamanın Sistem ekranından yapılır (gece kendiliğinden güncelleme de açılabilir); kurulumun yanındaki küçük güncelleyici container yeni imajı indirip sistemi yeniden başlatır. Aynı kurulum komutunu yeniden çalıştırmak da sistemi günceller.

`system.json`: son sistem sürümü ve Türkçe notları; kurulu sistemler yeni sürümü buradan öğrenir.

## İçerik

- `install.sh`: kurulum ve güncelleme betiği
- `modules/`: ödeme, bildirim, SMS doğrulama ve e-fatura modülleri (her biri kendi klasöründe; bkz. `modules/README.md`)
- `themes/`: mağaza temaları ve `catalog.json` (bkz. `themes/README.md`)

Modüller ve temalar ana sistem olmadan çalışmaz; sistem bunları yönetim panelinden ve Kurulum Sihirbazı'ndan bu depodan indirir.
