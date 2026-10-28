# HikerAPI Entegrasyonu

Avelro Packet Seller System için Instagram veri modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/hikerapi/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresi
- `config.schema.json`: istenen bağlantı ayarı (API anahtarı)
- `src/server.ts`: sağlayıcı kodu (`user`: kullanıcı adına göre Instagram profili ve son gönderiler)

## Ne İşe Yarar

- Ücretsiz araçlardaki Instagram Profil Analizi ve sipariş adımındaki gönderi önizlemesi profil verisini HikerAPI'den okur.
- Aynı kullanıcı adı 30 dakika önbellekten verilir; sorgu ücreti ve bekleme azalır. Sonuç gelmezse Instagram'ın herkese açık adresi denenir.

## Kurulum

1. Modüller › Sosyal Medya › HikerAPI'den modülü kurun.
2. hikerapi.com hesabınızdaki API anahtarını girip kaydedin, Bağlantıyı Dene ile doğrulayın.

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `api.hikerapi.com` adresine istek gönderebilir. Kaldırma anahtarı siler.

## Sürüm Notları

### 1.0.0

- İlk sürüm: HikerAPI artık sistemle gömülü gelmiyor, ayrı modül olarak kurulup kaldırılıyor. Anahtarı kayıtlı siteler güncellemeden sonra modülü kendiliğinden kurar. Sistem 1.0.180 ve üzeri gerekir.
