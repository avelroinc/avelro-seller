# Pulse Mağaza Teması

Avelro Packet Seller System için varsayılan mağaza teması: beyaz ve açık gri-mavi bölümler, marka renkli platform kartları
ve satış odaklı düzen. Yeni kurulumlarda mağaza bu temayla açılır.

## Dosyalar

- `theme.json`: tema kimliği, adı, sürümü, açıklaması ve önizleme görseli
- `preview.webp`: kurulum sihirbazında ve tema seçiminde gösterilen önizleme (960×600)
- `src/`: stil kaynakları; ad sırasıyla birleştirilir (temel, ana sayfa ve katalog, satın alma akışı, içerik, hesap,
  araçlar, kampanya, alt bilgi, hareket, iletişim)
- `theme.css`: sistemin indirdiği tek stil dosyası (`npm run build` ile üretilir, depoya eklenir)

Seçiciler `.shop-shell` ile başlar; mağaza rengi `--shop-accent` değişkenleriyle gelir. Stil dosyasında ters bölü kaçışı,
`@import` ve `data:` dışındaki `url()` adresleri kullanılamaz; derleme bunları denetler.

## Güncelleme

1. `src/` altındaki dosyaları düzenleyin.
2. `npm run build` ile `theme.css` dosyasını üretin.
3. `theme.json` içindeki sürümü artırın ve aşağıya sürüm notu ekleyin.
4. Değişiklikleri `avelro-seller` deposunun `main` dalına gönderin.

Yönetim paneli tema güncellemesini gösterir; sistem güncellemesi ve yeniden derleme gerekmez. Pulse ayrıca sistemle birlikte gelir: internete ulaşılamasa da yeni kurulumlar bu temayla açılır.

## Sürüm Notları

### 1.0.0

- Pulse teması sistemden ayrıldı ve ayrı depoda yayınlandı. Görünüm sistemdeki yerleşik Pulse ile aynıdır; iletişim
  sayfası stilleri de temaya dahildir.
