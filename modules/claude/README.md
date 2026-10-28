# Claude Entegrasyonu

Avelro Packet Seller System için yapay zekâ modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/claude/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresi
- `config.schema.json`: istenen bağlantı ayarı (API anahtarı)
- `src/server.ts`: sağlayıcı kodu (`complete`: yazı (akışla alınır, uzun yazılar zaman aşımına düşmez), `models`: hesabın erişebildiği modeller)

## Ne İşe Yarar

- Work/Bot çalışanları Claude ile çalışabilir (İçerik Editörü yazarı, Denetçi ve diğer birimler).
- Harcama Work/Bot'taki aylık yapay zekâ bütçesine sayılır ve çalışanın karnesine yazılır; hesapta bakiye bitince Work/Bot uyarır.

## Kurulum

1. Modüller › Yapay Zekâ › Claude'dan modülü kurun.
2. API anahtarını girin ve modeli seçin. Anahtar console.anthropic.com › API Keys (`sk-ant-` ile başlar) bölümünden alınır.
3. Bağlantıyı Dene ile kısa bir yanıt isteyerek anahtarı doğrulayın.

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `api.anthropic.com` adresine istek gönderebilir. Veritabanına, müşteri verisine ve gizli
anahtarlara doğrudan erişmez; API anahtarı işlem sırasında sistem tarafından verilir. Kaldırma bağlantı ayarlarını siler.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.

## Sürüm Notları

### 1.0.0

- İlk sürüm: Claude artık sistemle gömülü gelmiyor, Gemini gibi ayrı modül olarak kurulup kaldırılıyor. Daha önce anahtarı kayıtlı siteler güncellemeden sonra modülü kendiliğinden kurar. Sistem 1.0.178 ve üzeri gerekir.
