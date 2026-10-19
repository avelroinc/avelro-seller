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

### 1.0.22

- Ana sayfa hızlı sipariş kutusunun üstünde ürün türü sekmeleri (büyük harfle): SOSYAL MEDYA, E-PİN, LİSANS, SMS ONAY (yalnızca satıştaki türler). E-Pin, Lisans ve SMS Onay sekmesinde iki seçim, fiyat ve Satın Al düğmesi.
- Başlık yenilendi: tek satır; Ürünler paneli (Sosyal Medya, E-Pin, Lisans, SMS Onay sütunları; ilk altı öğe ve Tümü bağlantısı), sığan kadar bağlantı, sığmayanlar Diğer menüsünde.
- Telefon menüsü yenilendi: üstte ürün türü kutucukları, altında sayfalar iki sütun, en altta Sipariş Sorgula, Hesabım ve koyu mod.

### 1.0.21

- İç sayfaların giriş alanı tek satır: solda konum kartı (Ana Sayfa › sayfa), yanında başlık ve açıklama, en sağda sayfanın simgesi; bant yüksekliği üçte bire indi. Telefonda konum üstte ince şerit, altında başlık ve simge. İletişim, Hakkımızda, Kampanyalar, Duyurular, Sıkça Sorulan Sorular, Fırsat Köşesi, Ücretsiz Hizmetler ve kendi sayfalar.
- E-Pin bölümü: /e-pin sayfasında oyun kartları (kapak, paket sayısı, en düşük fiyat); oyun sayfasında paket kutucukları ve yanında satın alma kutusu (adet ya da Oyuncu ID alanları), altında Nasıl Kullanılır adımları; ana sayfada Popüler Oyunlar bölümü.
- E-Pin oyun görünümü: oyuna giriş bandı görseli, logo ve vurgu rengi verilebilir; oyun sayfası sitenin temasında kalır, giriş alanı oyunun görseliyle (karakterler iki yanda) çizilir, düğme ve seçili paket oyunun rengini alır. Paketler üç sütun.
- E-Pin paket kutucukları yenilendi: büyük miktar ve birim (2.500 EP), paket büyüklüğüne göre 1-3 taş, indirim oranı, birim fiyat (₺0,10 / EP), seçim düğmesi; seçili paket oyunun rengiyle parlar.
- SMS Onay sayfası: uygulama seçimi, bayraklı ülke listesi (teslim oranı, stok, fiyat, Numara Al), sağda Numaralarım (numara, geri sayım, gelen onay kodu, İptal Et ve İade Al, Tamamla).

### 1.0.20

- Makale bölümleri (ana sayfa ve bütün sayfalar) kutu içinde kaydırılmaz: uzun metin kesilip soluklaşır, Devamını Oku ile tamamı açılır; kısa metin olduğu gibi görünür. Metin görselle dikeyde ortalanır.
- Ana sayfadaki Öne Çıkan Hizmetler: platform süzgeci kalktı; telefonda kartlar sayfadan taşmaz, her kaydırmada bir kart gelir, altta kart noktaları.
- Blog yazısının bilgi şeridinde Paylaş düğmeleri telefonda taşmaz: Paylaş satırı tam genişlikte, düğmeler biraz küçüldü.

### 1.0.19

- Blog yazısı giriş alanı: solda konum, kategori, başlık, özet ve yazar; sağda kapak görseli; altında okuma süresi, bölüm sayısı, yayın tarihi ve paylaş şeridi.
- İçindekiler yeni düzende: tek çerçeveli kutu, bölüm sayısı, iki sütunlu hücreler ve ara başlıklarla aynı numara kutuları.
- Blog yazısında ilk harfin büyük yazılması, ara başlıkların üstündeki çizgiler ve ayraç çizgileri kaldırıldı; başlık aralıkları daraldı.
- Sıkça Sorulan Sorular yazının altında ayrı bölümde.
- Yazı arasındaki Ücretsiz Hizmet ve Ücretsiz Araç kartları afiş görünümünde; yan sütunda Ücretsiz Araçlar afişi.
- Hakkımızda sayfası sadeleşti: metin ve yanında tek kutuda Neden Biz, altında çağrı.
- Telefonda ve tablette makale bölümleri ve hızlı lisans listesi kendi içinde kaymaz; sayfa kaydırması takılmaz.

### 1.0.18

- Tema içindeki çakışmalar temizlendi: 118 !important satırından 100+ tanesi kaldırıldı (gereksiz olanlar atıldı, gerekenlerde seçici özgülleşti, hep ezilen rakip satırlar silindi). Kalanlar bilerek: sayfa aralık düzeni ve hareketi azalt ayarları. Görünüm değişmedi (24 sayfa, 3 genişlik, açık ve koyu temada hesaplanmış stiller karşılaştırıldı).
- Ana sayfa yorum kartlarında ürün satırı kesilmeden iki satıra kadar görünür; Hızlı Sipariş › Takip Et tablette iki alan yan yana, Sorgula altında; yönetici girişliyken İşlem Seç etiketi düzgün görünür.
- Sistem 1.0.83 ve üzeri gerekir.

### 1.0.17

- Tema dosyası temizlendi: 23 parça tek dosyada (src/pulse.css) birleşti; hiçbir sayfada eşleşmeyen 120 seçici ve sonradan ezildiği için hiç uygulanmayan 130 kural satırı atıldı. Görünüm değişmedi (24 sayfa, 3 genişlik, açık ve koyu temada bütün öğelerin hesaplanmış stilleri önce ve sonra karşılaştırıldı).
- Sistem 1.0.83 ve üzeri gerekir.

### 1.0.16

- Ana sayfa Hızlı Sipariş kartı: soldaki başlık ve simge kaldırıldı; Sipariş Ver / Takip Et seçimi solda, alanların kutularıyla aynı hizada ve aynı yükseklikte, üstünde 1. adım etiketi (İşlem Seç); alanlar 2–4 olarak numaralanır (telefonda kartın üstünde).
- Sistem 1.0.83 ve üzeri gerekir.

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
