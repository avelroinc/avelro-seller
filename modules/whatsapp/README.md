# WhatsApp Entegrasyonu

Avelro Packet Seller System için bildirim modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/whatsapp/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm, Host API (2) ve izinli ağ adresleri
- `config.schema.json`: yönetim panelinde istenen bağlantı ayarları
- `src/server.ts`: sağlayıcı kodu (`sendNotification`: yöneticiye bildirim, `sendMessage`: müşteriye mesaj)

Modül yalıtılmış çalışma ortamında yürütülür ve yalnızca izinli alan adlarına (`graph.facebook.com`) istek gönderebilir. Veritabanına,
müşteri verisine ve gizli anahtarlara doğrudan erişmez; bağlantı ayarları işlem sırasında sistem tarafından verilir. Kurulum devre
dışı başlar; güncelleme başarısız olursa kurulu sürüm korunur. Kaldırma bağlantı ayarlarını siler, işlem geçmişi sistemde kalır.

## Güncelleme

1. `src/server.ts` dosyasını düzenleyin.
2. `avelro-module.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
3. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli Entegrasyon Ayarları ekranında güncellemeyi gösterir.

## Sürüm Notları

### 1.1.0

- Müşteriye WhatsApp mesajı: sipariş SMS şablonları (Ödeme Onaylandı, Sipariş Tamamlandı) Modüller › WhatsApp › Müşteri Bildirimi açıksa WhatsApp’tan da gider (SMS yerine ya da SMS ile birlikte).
- Meta’da onaylı bir şablon adı girilirse mesaj o şablonla gönderilir (metin şablonun tek değişkenine yazılır); girilmezse düz metin gider ve yalnızca müşteri son 24 saatte işletme numaranıza yazdıysa ulaşır.
- Yönetici bildirimleri eskisi gibi çalışır. Sistem 1.0.183 ve üzeri gerekir.

### 1.0.0

- Paket satış sistemi için ilk sürüm. Kod, SMM panelindeki WhatsApp Entegrasyonu modülünün 1.0.0 sürümünden ayrıldı; davranış aynıdır.
