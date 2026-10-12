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

### 1.0.2

- Denenen üç alt bilgi düzeni kaldırıldı; alt bilgi sekmeli düzende kalır. Bölüm boşlukları 1.0.1’deki gibi.

### 1.0.1

- Bileşenler arası boşluk bütün sayfalarda aynı: masaüstünde 80 px, tablette 64 px, telefonda 48 px (ana sayfa, araçlar ve
  ücretsiz hizmetler daha geniş, iletişim sayfası daha geniş aralık kullanıyordu). Son bileşenle alt bilgi arası da aynı.
- Alt bilgi için üç yeni düzen: Klasik Sütunlar, Koyu Bant (çağrı kartıyla) ve Sade. Düzen yönetimden seçilir (sistem 1.0.30+);
  varsayılan sekmeli düzen değişmedi.

### 1.0.0

- Pulse teması sistemden ayrıldı ve ayrı depoda yayınlandı. Görünüm sistemdeki yerleşik Pulse ile aynıdır; iletişim
  sayfası stilleri de temaya dahildir.
