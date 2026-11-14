# Firebase Telefon Doğrulama

Avelro Packet Seller System için telefon numarası doğrulama modülü (Firebase Authentication › Phone). Kaynak: `avelroinc/avelro-seller` deposundaki `modules/firebase/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: yönetim panelinde istenen bağlantı ayarları
- `src/server.ts`: sağlayıcı kodu

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca izinli alan adlarına (`identitytoolkit.googleapis.com`) istek gönderebilir. Veritabanına,
müşteri verisine ve gizli anahtarlara doğrudan erişmez; bağlantı ayarları işlem sırasında sistem tarafından verilir. Kurulum devre
dışı başlar; güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler, işlem geçmişi sistemde kalır.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli Entegrasyon Ayarları ekranında güncellemeyi gösterir.

## Sürüm Notları

### 2.0.1

- Firebase hata mesajının ayrıntısı da gösterilir; SMS bölge politikası engeli ayrıca belirtilir.

### 2.0.0

- Firebase E-posta (bağlantıyla giriş) kaldırıldı; modül artık Firebase Telefon Doğrulama: müşterinin telefon numarasını Firebase'in gönderdiği SMS koduyla doğrular.
- Firebase Authentication'da Phone girişini açın ve site alan adını Authorized domains'e ekleyin.

### 1.0.0

- Paket satış sistemi için ilk sürüm. Kod, SMM panelindeki Firebase Entegrasyonu modülünün 1.0.0 sürümünden ayrıldı; davranış aynıdır.
