# Uyumsoft Entegrasyonu

Avelro Packet Seller System için e-fatura modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/uyumsoft/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: yönetim panelinde istenen bağlantı ayarları
- `src/server.ts`: sağlayıcı kodu

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca izinli alan adlarına (`efatura.uyumsoft.com.tr`) istek gönderebilir. Veritabanına,
müşteri verisine ve gizli anahtarlara doğrudan erişmez; bağlantı ayarları işlem sırasında sistem tarafından verilir. Kurulum devre
dışı başlar; güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler, işlem geçmişi sistemde kalır.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli Entegrasyon Ayarları ekranında güncellemeyi gösterir.

## Sürüm Notları

### 1.0.0

- Paket satış sistemi için ilk sürüm. Kod, SMM panelindeki Uyumsoft Entegrasyonu modülünün 1.0.1 sürümünden ayrıldı; davranış aynıdır.
