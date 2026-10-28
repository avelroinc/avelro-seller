# Sosyal Giriş Entegrasyonu

Avelro Packet Seller System için giriş modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/social-login/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: istenen bağlantı ayarları (istemci kimliği, gizli anahtar)
- `src/server.ts`: sağlayıcı kodu (`profile`: yetkilendirme kodunu erişim anahtarıyla değiştirip Google ya da Facebook profilini okur)

## Ne İşe Yarar

- Müşteriler giriş ve kayıt sayfasında Google ya da Facebook hesaplarıyla siteye girebilir.
- Google ve Facebook ayrı ayrı açılıp kapatılır; her birinin uygulama bilgileri sitenin kendi veritabanında şifreli saklanır.

## Kurulum

1. Modüller › Sosyal Giriş › Google / Facebook Girişi'nden modülü kurun.
2. Google Cloud Console (OAuth istemcisi) ya da Meta for Developers'tan uygulama bilgilerini alın; kartta gösterilen yönlendirme adresini orada tanımlayın.
3. İstemci kimliğini ve gizli anahtarı girip Kullan'ı açın ve kaydedin.

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `oauth2.googleapis.com`, `openidconnect.googleapis.com` ve `graph.facebook.com`
adreslerine istek gönderebilir. State ve PKCE doğrulaması sistemdedir. Kaldırma uygulama bilgilerini siler.

## Sürüm Notları

### 1.0.0

- İlk sürüm: Google / Facebook ile giriş artık sistemle gömülü gelmiyor, ayrı modül olarak kurulup kaldırılıyor. Uygulama bilgileri kayıtlı siteler güncellemeden sonra modülü kendiliğinden kurar. Sistem 1.0.180 ve üzeri gerekir.
