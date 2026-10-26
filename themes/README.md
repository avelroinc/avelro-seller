# Avelro Paket Satış Sistemi Temaları

Mağaza teması. Sistem `catalog.json` dosyasını okur, temanın `theme.css` dosyasını indirir, doğrular ve kurar. Pulse sistemle
birlikte de gelir.

| Tema | Klasör | Açıklama |
| --- | --- | --- |
| Pulse | `pulse/` | Beyaz ve açık gri-mavi bölümler, marka renkli platform kartları ve satış odaklı düzen. |

## Tema Klasörü

- `theme.json`: kimlik, ad, sürüm (X.Y.Z), açıklama, yazar ve önizleme görseli
- `theme.css`: sistemin indirdiği tek stil dosyası (`npm run build` ile `src/` altından üretilir)
- `preview.webp`: 960×600 önizleme görseli
- `src/`, `build.mjs`: stil kaynakları ve derleme
- `README.md`: tema açıklaması ve Türkçe sürüm notları

Seçiciler `.shop-shell` ile başlar; mağaza rengi `--shop-accent` değişkenleriyle gelir. Stil dosyasında ters bölü kaçışı,
`@import` ve `data:` dışındaki `url()` adresleri kullanılamaz; derleme ve sistem bunları denetler. Boyut sınırı 1,5 MB.

## Tek Tema

Sistem yalnızca Pulse temasını kullanır; katalogdaki başka temalar listelenmez ve kurulmaz.
