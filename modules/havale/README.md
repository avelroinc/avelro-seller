# Havale / EFT Entegrasyonu

Avelro Packet Seller System için ödeme modülü. Kaynak: `avelroinc/avelro-seller` deposundaki `modules/havale/` klasörü.

- `avelro-module.json`: modül kimliği, sürüm ve Host API (3, özellik modülü)
- `config.schema.json`: boş (banka hesapları sitenin kendi veritabanında saklanır)
- `src/server.ts`: özellik modülü; kod çalıştırmaz, kurulu ve açık olması Havale / EFT yöntemini açar

## Ne İşe Yarar

- Müşteri ödeme adımında ve bakiye yüklemede Havale / EFT'yi seçince sitenin banka hesaplarını (en çok 5) ve ödeme açıklamasını görür.
- Banka hesapları Modüller › Ödeme › Havale / EFT kartından girilir.

## Kurulum

1. Modüller › Ödeme › Havale / EFT'den modülü kurun.
2. En az bir banka hesabı girin, Ödeme Sayfasında Göster'i açıp kaydedin.

Kaldırma Havale / EFT yöntemini kapatır ve banka hesaplarını siler.

## Sürüm Notları

### 1.0.0

- İlk sürüm: Havale / EFT artık sistemle gömülü gelmiyor, ayrı modül olarak kurulup kaldırılıyor. Banka hesabı kayıtlı siteler güncellemeden sonra modülü kendiliğinden kurar. Sistem 1.0.180 ve üzeri gerekir.
