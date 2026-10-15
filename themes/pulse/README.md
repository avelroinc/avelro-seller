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

### 1.0.15

- Araç sayfaları yeniden düzenlendi: araç kutusu giriş alanına bitişik değil, altında boşlukla ayrı durur; solda araç (başlık satırında simge, ad ve not), sağda Nasıl Kullanılır? kartı (numaralı adımlar alt alta), dar ekranda alt alta. Adımların numaralarıyla yazılarının üst üste binmesi giderildi; yan yana alanlar aynı hizada başlar.
- Bütün sayfalarda giriş alanı ile içerik arası aynı: masaüstünde 48 px, tablet ve telefonda 32 px (bazı sayfalarda içerik giriş alanına bitişikti).
- Uzun sayfa başlıkları (ör. blog yazıları) giriş alanındaki görselin üstüne binmez.
- Satışa henüz açılmamış hizmet sayfasında düz yazı yerine kart: simge, açıklama ve platformun diğer hizmetlerine giden düğme.
- Telefonda dokunma alanları büyüdü: Fırsat Köşesi adet çubukları, kartlardaki ürün bağlantıları, Tüm Sorular ve giriş ekranı bağlantıları.
- Blog sayfasında yan sütun: arama kutusu ve yazı sayılarıyla kategoriler; hiçbir kategoriye bağlı olmayan yazılar Diğer kategorisinde listelenir.
- Hesabım: telefonda karşılama alanı ve cüzdan tek satırda daha az yer kaplar, sekme şeridi seçili bölümü ortaya kaydırır ve kenarda solarak kaydırılabildiğini gösterir; Kartla Öde / Fast ile Ödeme ve Bireysel / Kurumsal seçimleri yan yana; hızlı bağlantıların yazısı taşmaz. Telefon Doğrulama formun yanında Neden Doğrulamalısın? kartıyla geniş ekranı doldurur.
- Hesabım › Yönetim: yan kart uygulamada nelerin yönetildiğini anlatır (aynı Giriş Kodu Oluştur düğmesi iki kez görünmez); telefonda yan kart gizlenir.
- Sistem 1.0.80 ve üzeri gerekir.

### 1.0.14

- Ana sayfa giriş alanı: 761–1280 px genişlikteki ekranlarda Beğeni kartı açıklama yazısının üstüne biniyordu; bu genişliklerde gizlenir.

### 1.0.13

- Kaydırırken süs animasyonları durur (sistem 1.0.59 ile); telefonda alt bilgi zemini alt menünün arkasına kadar uzanır.

### 1.0.12

- Aralık düzeni: kutu ile başlayan bileşenler arası 20px, başlıklı bölümlerin üstü 48px (telefonda 32px), başlık ile içerik arası 14px (sistem 1.0.57 ile).
- Ana sayfa müşteri yorumları: fotoğraflı kademeli kartlar, ortalama puan ve kaydırılabilen yorum kartları.

### 1.0.11

- Sepet sayfası: giriş alanı diğer sayfalarla aynı (hareketsiz simge, köşede ürün sayısı); sepet listesi ve boş sepet kartı giriş alanının altında durur (sistem 1.0.55 ile).

### 1.0.10

- Sayfa giriş alanının sağındaki görsel hareketsiz: düz duran simge kartı, site renginde üst şerit, katmanlı ikinci kart ve noktalı zemin (sistem 1.0.54 ile).
- Araç penceresi, araç kartları ve Fırsat Köşesi kombinleri giriş alanına binmez; giriş alanının altında durur.

### 1.0.9

- Blog yazısı içerik blokları: bilgi kutuları (İpucu, Dikkat, Önemli, Bilgi), büyük rakamlı vurgular, Kısaca özeti, artı / eksi sütunları, kaynaklı alıntı, adım adım liste, açılır SSS ve düğmeli sonuç kutusu (sistem 1.0.52 ile).
- Okuma ilerleme çubuğu, büyük ilk harf, yazı sonunda faydalı oldu mu / paylaş / yazar kartı / Bunları da Okuyun.
- Yan sütun: hizmetler, son yazılar, ücretsiz araçlar ve yardım kartı.

### 1.0.8

- Blog yazısı okuma düzeni: bölüm başlıklarında site renginde numara kutusu (İçindekiler ile aynı numaralar), alt başlıklarda renkli dikey çizgi, rahat satır aralığı; liste, alıntı, tablo ve görsel stilleri yenilendi.
- İçindekiler yazının başında (ilk paragraftan önce) ayrı kutuda.
- Yazı arası öneriler: platform renginde panelli hizmet önerisi (Popüler miktar vurgulu), indirim kuponu (kopyalanabilir kod), kombin (çok al az öde), ücretsiz hizmet ve ücretsiz araç kartları (sistem 1.0.50 ile).
- Sayfa konumu (breadcrumb) tek satır; bulunulan sayfanın adı sığmazsa … ile kısalır.

### 1.0.7

- Hız: alt menüdeki sepet parlaması ve ana sayfa bildirim kartlarındaki halka efekti yalnızca ekran kartında çalışan yöntemle çizilir; görünüm aynı, sayfa boşta işlemciyi meşgul etmez.

### 1.0.6

- Alt menü (telefon): simgeler orantılı; yan simgeler 44 px, ortadaki sepet 56 px ve menünün biraz üstüne taşar (önceki büyük sepet ve küçük yan simgeler dengelendi). Parlama efekti korunur.

### 1.0.5

- Alt menü (telefon): sepet ortada büyük, yuvarlak ve menünün üstüne taşan düğme; birkaç saniyede bir yüzeyinden ışık geçer ve çevresindeki renkli ışık yavaşça nabız atar. Yan öğeler küçük, açık renk zeminli simgeler; bulunulan sayfanın simgesi dolu renkte (sistem 1.0.48 ile; Ana Sayfa düğmesi kaldırıldı).
- Favoriler ve sepet paneli sitenin içerik genişliğinde açılır: telefonda alt menüyle aynı genişlikte, bilgisayarda sağ kenarı içerik kenarıyla aynı çizgide.

### 1.0.4

- Sipariş Sorgula: sepetteki her tamamlanmış hizmetin altında Düşüş Bildir düğmesi (sistem 1.0.34 ile).

### 1.0.3

- Blog yazılarının arasındaki hizmet önerisi kartı: platform renginde şerit ve simge, üç miktar seçeneği ve Sipariş Ver.
- Uyarı ve onay pencereleri yenilendi: bulanık arka plan, türüne göre renkli simge, ortalanmış metin; telefonda alttan açılır. Duyuru penceresi de aynı görünümde.
- Hakkımızda: platformlar sağdan sola kayan şeritte, üzerine gelince durur.
- İletişim: tek kutuda solda destek bilgileri, sağda renkli kanal satırları; altta ipuçları ve dört hızlı işlem kartı.

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
