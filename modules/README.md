# Avelro Paket Satış Sistemi Modülleri

Avelro Paket Satış Sistemi'nin ödeme, bildirim, SMS doğrulama, e-fatura, yapay zekâ ve SEO entegrasyonları ile özellik modülleri. Her modül `modules/` altında kendi klasöründedir; sistem
yönetim panelindeki Entegrasyon Ayarları ekranından bu depodan indirir, doğrular ve kurar. Modüller ana sistem olmadan çalışmaz.

| Tür | Modüller |
| --- | --- |
| Ödeme | `paytr`, `shopier`, `stripe`, `cryptomus`, `heleket` |
| Bildirim | `telegram`, `whatsapp` |
| SMS ve doğrulama | `netgsm`, `iletimerkezi`, `twilio`, `firebase` |
| E-fatura | `parasut`, `bizimhesap`, `logo`, `uyumsoft` |
| Yapay zekâ | `gemini` |
| SEO | `dataforseo`, `searchconsole` |
| Özellik | `reklam` |

## Modül Klasörü

- `avelro-module.json`: kimlik, ad, sürüm (X.Y.Z), Host API sürümü, tür, giriş dosyası ve izinli ağ adresleri
- `config.schema.json`: panelde istenen bağlantı ayarları
- `src/server.ts`: sağlayıcı kodu; yalıtılmış ortamda çalışır ve yalnızca izinli alan adlarına istek gönderebilir
- `README.md`: modülün açıklaması ve Türkçe sürüm notları

Bağlantı ayarları (API anahtarları, şifreler) bu depoda değil, her sitenin kendi veritabanında şifreli olarak saklanır.

## Güncelleme

`modules/<id>/` klasöründe kodu değiştirin, `avelro-module.json` sürümünü artırın, README'deki Sürüm Notları bölümüne Türkçe not ekleyin ve
`main` dalına gönderin. Yönetim paneli yeni sürümü gösterir; güncelleme başarısız olursa kurulu sürüm korunur.
