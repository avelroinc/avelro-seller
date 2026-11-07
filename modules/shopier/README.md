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

Shopier ödeme sayfası ödemeden sonra siteye geri yönlendirmez. Ödeme sayfası yeni sekmede açılır; sitedeki bekleme ekranı ödemeyi
izler (bildirimi ve Shopier’e doğrudan sorarak) ve ödeme gelince sipariş sayfasına geçer.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli Entegrasyon Ayarları ekranında güncellemeyi gösterir.

## Sürüm Notları

### 1.0.4

- Ürün kimliği Shopier yanıtının id / productId / product_id / product.id alanından, yoksa ödeme adresinden alınır.
- Ürün kimliği bilinmeyen ödemelerde (eski ödemeler dahil) ürün, başlığındaki sipariş referansıyla Shopier ürün listesinden bulunur;
  sipariş bu ürünün kimliğiyle aranır.
- Eşleşme olmazsa kayda son siparişlerin kimliği, ödeme durumu ve satırlardaki ürün kimliği / adı yazılır (kişisel bilgi yazılmaz).

### 1.0.3

- Sipariş, ödeme için açılan Shopier ürününün kimliğiyle bulunur (sistem kimliği ödeme başlarken kaydeder); ürün başlığına bağlı
  kalınmaz. Satırlardaki ürün kimliği hem productId hem product_id biçiminde okunur.
- Ödeme durumu payment_status ve payment.status alanlarından da okunur.
- Her sorgu ve bildirim kısa bir açıklamayla döner (ör. “sipariş listesi okunamadı (HTTP 401)”); yönetimde sipariş sayfasındaki
  Shopier Kayıtları kartında görünür.

### 1.0.2

- Ödeme bildirimi gelmese de ödeme onaylanır: müşteri bekleme ekranındayken ve yönetici siparişi açtığında sistem Shopier’e
  siparişi sorar (son siparişlerde referansı taşıyan sipariş aranır, ödendiyse onaylanır).
- Bildirimin biçimi farklı olsa da (sipariş, { data } ya da { order } içinde) sipariş ve referans bulunur.

### 1.0.1

- Ödeme ürününün görseli artık paketle gelen sabit görsel (`assets/odeme.png`); Shopier'de kırık görsel görünmez.

### 1.0.0

- İlk sürüm: Shopier REST API ile siparişe özel ödeme sayfası, bildirim adresinin kendiliğinden kaydı ve API ile ödeme doğrulama.
