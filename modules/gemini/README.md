# Gemini Entegrasyonu

Avelro Packet Seller System için yapay zekâ modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/gemini/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresi
- `config.schema.json`: istenen bağlantı ayarı (API anahtarı)
- `src/server.ts`: sağlayıcı kodu (`complete`: yazı, `image`: görsel, `models`: hesabın erişebildiği modeller)

## Ne İşe Yarar

- Work/Bot › İçerik Editörü'nde Gemini yazar ya da editör olarak işe alınabilir. Diğer birimler ChatGPT ve Claude ile çalışır.
- "Görselleri Gemini Üretsin" açıksa blog kapakları ve sitedeki yapay zekâ görselleri Gemini'yle üretilir.
- Harcama Work/Bot'taki aylık yapay zekâ bütçesine sayılır ve çalışanın karnesine yazılır.

## Kurulum

1. Modüller › Yapay Zekâ › Gemini Entegrasyonu'ndan modülü kurun ve etkinleştirin.
2. Gemini Ayarları'nda API anahtarını girin. Anahtar Google AI Studio'dan (aistudio.google.com › Get API key) alınır; yeni anahtarlar
   `AQ.` ile, eski anahtarlar `AIza` ile başlar, ikisi de kabul edilir.
3. Kaydedince hesabın erişebildiği en uygun yazı ve görsel modeli kendiliğinden seçilir; sonra değiştirilebilir.

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca `generativelanguage.googleapis.com` adresine istek gönderebilir. Veritabanına,
müşteri verisine ve gizli anahtarlara doğrudan erişmez; API anahtarı işlem sırasında sistem tarafından verilir. Kurulum devre dışı başlar;
güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler; Gemini çalışanları ChatGPT ya da Claude ile,
görseller OpenAI ile devam eder.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

## Sürüm Notları

### 1.0.1

- Kurulumdaki "Paket çalışma yetkileri uyumsuz" hatası giderildi: paket, sağlayıcı modüllerinin çalışma sözleşmesine (Host API 2) göre düzenlendi. Davranış değişmedi.

### 1.0.0

- İlk sürüm: Gemini ile yazı (İçerik Editörü çalışanı), görsel üretimi ve model listesi. Yeni (`AQ.`) ve eski (`AIza`) API anahtarları
  desteklenir. Sistem 1.0.72 ve üzeri gerekir.
