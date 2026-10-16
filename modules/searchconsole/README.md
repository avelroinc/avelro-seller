# Google Search Console Entegrasyonu

Avelro Packet Seller System için SEO modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/searchconsole/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: istenen bağlantı ayarı (hizmet hesabı anahtarı)
- `src/server.ts`: sağlayıcı kodu (`sites`: hizmet hesabının erişebildiği mülkler, `query`: arama performansı)

## Ne İşe Yarar

- Sitenin son 28 gündeki Google arama verisi (hangi sayfa hangi aramada kaç kez gösterildi, kaç kez tıklandı, ortalama kaçıncı sırada)
  Work/Bot › İçerik Editörü'ne gelir.
- İçerik Editörü Google başlığı, açıklama ve makale yazarken sayfanın gerçekten göründüğü aramaları kullanır.
- Google'da çok gösterilip az tıklanan sayfalar için ("Az Tıklanıyor") o aramalara göre yeni başlık ve açıklama önerir (ayda bir).
- Modül kapalıysa ya da ayar yoksa İçerik Editörü eskisi gibi çalışır.

## Kurulum

1. console.cloud.google.com'da bir proje açın ve Google Search Console API'yi etkinleştirin (API'ler ve Hizmetler › Kitaplık).
2. IAM ve Yönetici › Hizmet Hesapları'ndan bir hizmet hesabı oluşturun; rol vermeniz gerekmez.
3. Hizmet hesabında Anahtarlar › Anahtar Ekle › Yeni Anahtar Oluştur › JSON ile anahtar dosyasını indirin.
4. Search Console'da sitenizin mülkünde Ayarlar › Kullanıcılar ve İzinler › Kullanıcı Ekle'den dosyadaki `client_email` adresini
   "Kısıtlı" izinle ekleyin.
5. Modüller › SEO › Google Search Console Entegrasyonu'ndan modülü kurun, indirdiğiniz dosyanın tamamını yapıştırıp kaydedin ve
   Kullan'ı açın. Sistem Google'a bağlanır ve sitenin mülkünü (alan adı ya da adres öneki) kendisi seçer; bağlanamazsa anahtar saklanmaz.

Erişim salt okunurdur (`webmasters.readonly`); modül Search Console'da hiçbir ayarı değiştiremez. Modül yalıtılmış çalışma ortamında
yürütülür ve yalnızca `oauth2.googleapis.com` ile `searchconsole.googleapis.com` adreslerine istek gönderebilir. Anahtar her sitenin
kendi veritabanında şifreli saklanır ve işlem sırasında sistem tarafından verilir. Search Console API ücretsizdir. Kurulum devre dışı
başlar; güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

## Sürüm Notları

### 1.0.0

- İlk sürüm: hizmet hesabıyla salt okunur bağlantı, mülk listesi ve arama performansı. İçerik Editörü başlık, açıklama ve makaleleri
  sayfanın göründüğü gerçek aramalara göre yazar; çok gösterilip az tıklanan sayfalar için yeni başlık ve açıklama önerir. Sistem 1.0.87
  ve üzeri gerekir.
