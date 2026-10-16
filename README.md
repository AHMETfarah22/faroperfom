# Faro Perform — Niş Parfüm Evi

**Canlı site: https://ahmetfarah22.github.io/faroperfom/**

Her kokudan yalnızca 200 şişe üreten hayali bir niş parfüm markası için tek sayfalık, animasyonlu web sitesi.
Sitedeki şişelerin hiçbiri fotoğraf ya da hazır 3D model değil — **hepsi kodla çiziliyor.**

## Öne çıkanlar

- **Kodla çizilmiş 3D şişe** (Three.js): cam, renkli sıvı, sıvı yüzeyindeki dalga, altın sprey başlığı, kapak ve kaide.
- **Sprey anı:** kaydırdıkça şişe yakınlaşır, kapak kalkar, başlık basılır ve parfüm buğusu çıkar.
- **Notalar:** üst / kalp / dip nota bölümleri; yağmur, gül yaprağı ve kor parçacıkları, kemer içinde kodla çizilmiş limon dilimi, gül ve ateş, tende geçen süreyi gösteren sayaç.
- **Koleksiyon:** 5 koku arasında geçiş; şişe döner, sıvının rengi ve etiket değişir.
- **Ürünler + sepet:** ürün kartları, ürün detayı, tarayıcıda saklanan sepet ve e-posta ile sipariş.
- **Atölye:** dönen ışığıyla kodla çizilmiş bir deniz feneri.
- Mobil uyumlu, `prefers-reduced-motion` desteği, düşük güçlü cihazlarda otomatik kalite ayarı.

## Çalıştırma

Derleme adımı yok. İki yol:

1. `index.html` dosyasını tarayıcıda açın, ya da
2. klasörde basit bir yerel sunucu başlatın:

   ```bash
   npx serve .
   ```

> İnternet bağlantısı gerekir: Three.js ve Lenis CDN'den, yazı tipleri Google Fonts'tan yüklenir.
> WebGL kullanılamazsa site otomatik olarak SVG şişe çizimlerine geçer.

## Dosya yapısı

```
index.html        Sayfa iskeleti
css/style.css     Tüm stiller (mobil dahil)
js/data.js        Kokular, fiyatlar, renkler
js/bottle.js      3D şişe sahnesi (Three.js)
js/art.js         Canvas çizimleri: nota görselleri, deniz feneri, imleç izi, sprey buğusu
js/main.js        Kaydırma animasyonları, menü, sepet, yükleme
```

## Düzenleme

- Koku isimleri, açıklamalar, fiyatlar ve stok: `js/data.js`
- İletişim bilgileri (e-posta, Instagram, adres) şu an örnek değerdir: `index.html` ve `js/main.js` içindeki `merhaba@faroperform.com` adresini kendi adresinizle değiştirin.
