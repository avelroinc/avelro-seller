# ChatGPT Entegrasyonu

Avelro Packet Seller System için yapay zekâ modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/openai/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresi
- `config.schema.json`: istenen bağlantı ayarı (API anahtarı)
- `src/server.ts`: sağlayıcı kodu (`complete`: yazı, `search`: internette araştırma, `image`: görsel, `models`: hesabın erişebildiği modeller)

## Ne İşe Yarar

- Work/Bot çalışanları ChatGPT ile çalışabilir; Sağlayıcı Kâşifi internette aramayı ChatGPT ile yapar.
- Görsel Üretimi'nde OpenAI seçiliyse blog kapakları ve sitedeki yapay zekâ görselleri ChatGPT ile üretilir.
- Harcama Work/Bot'taki aylık yapay zekâ bütçesine sayılır ve çalışanın karnesine yazılır; hesapta bakiye bitince Work/Bot uyarır.

## Kurulum

1. Modüller › Yapay Zekâ › ChatGPT'dan modülü kurun.
2. API anahtarını girin ve modeli seçin. Anahtar platform.openai.com › API keys bölümünden alınır.
3. Bağlantıyı Dene ile kısa bir yanıt isteyerek anahtarı doğrulayın.

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `api.openai.com` adresine istek gönderebilir. Veritabanına, müşteri verisine ve gizli
anahtarlara doğrudan erişmez; API anahtarı işlem sırasında sistem tarafından verilir. Kaldırma bağlantı ayarlarını siler.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.

## Sürüm Notları

### 1.0.0

- İlk sürüm: ChatGPT artık sistemle gömülü gelmiyor, Gemini gibi ayrı modül olarak kurulup kaldırılıyor. Daha önce anahtarı kayıtlı siteler güncellemeden sonra modülü kendiliğinden kurar. Sistem 1.0.178 ve üzeri gerekir.
