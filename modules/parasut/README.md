# Paraşüt Entegrasyonu

Avelro Packet Seller System için e-fatura modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/parasut/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: yönetim panelinde istenen bağlantı ayarları
- `src/server.ts`: sağlayıcı kodu

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca izinli alan adlarına (`api.parasut.com`) istek gönderebilir. Veritabanına,
müşteri verisine ve gizli anahtarlara doğrudan erişmez; bağlantı ayarları işlem sırasında sistem tarafından verilir. Kurulum devre
dışı başlar; güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler, işlem geçmişi sistemde kalır.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli Entegrasyon Ayarları ekranında güncellemeyi gösterir.

## Sürüm Notları

### 1.0.0

- Paket satış sistemi için ilk sürüm. Kod, SMM panelindeki Paraşüt Entegrasyonu modülünün 1.0.1 sürümünden ayrıldı; davranış aynıdır.

## Sürümler

- 1.0.1: İade faturası (createReturnInvoice): faturası kesilmiş siparişte iade yapılınca iade edilen tutar kadar, asıl faturaya bağlı iade belgesi.
- 1.1.0: Bağlantı denemesi (test): oturum açılır ve firmanın kişi listesi okunur. Modüller › Paraşüt › Bağlantıyı Test Et.
- 1.2.0: Paraşüt API v4 dokümanına (devhub.parasut.com, OpenAPI 4.1.0) uyum. Yetki OAuth2 Authorization Code + PKCE ile alınır
  (Modüller › Paraşüt › Paraşüt'e Bağlan; anahtarı sistem yeniler, modüle erişim anahtarı gelir; eski parola akışı yalnızca bağlanmamış
  eski kurulumlarda). Fatura: sabit external_reference_key ile tekrar denemede ikinci fatura açılmaz; e-belge türü alıcının e-fatura
  posta kutusuna göre seçilir (e_invoice_inbox_checks → e-Fatura senaryo TEMEL, yoksa e-Arşiv internet satışı bilgisiyle), e-belge işi
  (trackable_jobs) sonuçlanana kadar beklenir ve hata iletisi döner; fatura numarası e-belgeden alınır. İade kaydına net_total ve total_vat
  eklendi. İstekler application/vnd.api+json.
