# DataForSEO Entegrasyonu

Avelro Packet Seller System için SEO modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/dataforseo/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresi
- `config.schema.json`: istenen bağlantı ayarları (API girişi ve şifresi)
- `src/server.ts`: sağlayıcı kodu (`searchVolume`: kelimelerin aylık arama sayısı, `account`: bağlantı denemesi ve bakiye)

## Ne İşe Yarar

- Yapay zekâ bir yazıyı planlarken sistem, ana anahtar kelime için Google'ın arama önerilerini toplar. Bu modül açıksa her önerinin
  Türkiye'deki aylık ortalama arama sayısı Google Ads (Anahtar Kelime Planlayıcı) verisinden alınır.
- Ara başlıklar en çok aranan sorulardan seçilir; hiç aranmayan öneriler atılır. Yazıda kalın yazılan kısa anahtar kelimeler de
  arama sayısı yüksek olanlardan seçilir.
- Modül kapalıysa ya da ayar yoksa yazılar yine yazılır; öneriler Google'ın kendi sırasıyla kullanılır.

## Ücret

DataForSEO kullandıkça ücretlendirir; ücret istek başınadır, kelime sayısına göre değişmez. Her yazı planı tek istek gönderir (yaklaşık
0,075 USD). Aynı kelimelerin sonuçları 7 gün saklanır, aynı konuda yeniden yazıda tekrar ücret ödenmez. Güncel fiyatlar:
dataforseo.com/pricing.

## Kurulum

1. app.dataforseo.com'da hesap açın ve bakiye yükleyin (yeni hesaba deneme kredisi verilir).
2. app.dataforseo.com › API Access bölümünden API girişini (e-posta) ve API şifresini kopyalayın. API şifresi, hesabın giriş
   şifresinden farklıdır.
3. Modüller › SEO › DataForSEO Entegrasyonu'ndan modülü kurun, bilgileri girip kaydedin ve Kullan'ı açın. Bilgiler kaydedilmeden önce
   denenir; yanlışsa saklanmaz.

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `api.dataforseo.com` adresine istek gönderebilir. Veritabanına, müşteri
verisine ve gizli anahtarlara doğrudan erişmez; giriş bilgileri işlem sırasında sistem tarafından verilir. Kurulum devre dışı başlar;
güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

## Sürüm Notları

### 1.0.0

- İlk sürüm: Google Ads verisiyle anahtar kelimelerin Türkiye'deki aylık arama sayısı. Yazı planında ara başlıklar ve kalın yazılan
  kısa kelimeler çok arananlardan seçilir. Sistem 1.0.87 ve üzeri gerekir.
