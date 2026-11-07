# Shopier Entegrasyonu

Avelro Packet Seller System için ödeme modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/shopier/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: yönetim panelinde istenen bağlantı ayarı (Shopier Kişisel Erişim Anahtarı)
- `src/server.ts`: sağlayıcı kodu
- `assets/odeme.png`: Shopier'de oluşturulan ödeme ürününün sabit görseli

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `api.shopier.com` adresine istek gönderebilir. Veritabanına, müşteri
verisine ve gizli anahtarlara doğrudan erişmez; bağlantı ayarları işlem sırasında sistem tarafından verilir. Kurulum devre dışı
başlar; güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler, işlem geçmişi sistemde kalır.

## Nasıl Çalışır

1. Shopier satıcı panelinin API bölümünden bir Kişisel Erişim Anahtarı (Personal Access Token) oluşturun ve modülün ayarına
   yapıştırın. Anahtarın ürün, sipariş ve webhook izinleri olmalıdır.
2. Müşteri Shopier ile ödemeyi seçtiğinde siparişe özel, mağazada listelenmeyen tek adetlik bir dijital ürün oluşturulur
   (başlığında sipariş referansı yazar, görseli bu paketteki sabit “Güvenli Sipariş Ödemesi” görselidir) ve müşteri bu ürünün Shopier ödeme sayfasına gönderilir.
3. İlk ödemede sitenin bildirim adresi (`/api/payments/callback/shopier`) Shopier'e `order.created` bildirimi olarak kendiliğinden
   kaydedilir; zaten kayıtlıysa tekrar eklenmez.
4. Shopier bildirim gönderdiğinde sipariş, Shopier API'sinden anahtarla yeniden okunur. Sipariş ödenmişse ve satırlarından biri bu
   referanslı ürünse sitedeki sipariş ya da bakiye yüklemesi onaylanır. Bildirimin kendisi tek başına ödeme kanıtı sayılmaz.

Shopier ödeme sayfası ödemeden sonra siteye geri yönlendirmez; müşteri siparişinin durumunu sitedeki Sipariş Sorgula sayfasından
görür.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli Entegrasyon Ayarları ekranında güncellemeyi gösterir.

## Sürüm Notları

### 1.0.1

- Ödeme ürününün görseli artık paketle gelen sabit görsel (`assets/odeme.png`); Shopier'de kırık görsel görünmez.

### 1.0.0

- İlk sürüm: Shopier REST API ile siparişe özel ödeme sayfası, bildirim adresinin kendiliğinden kaydı ve API ile ödeme doğrulama.
