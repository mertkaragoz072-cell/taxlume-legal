# Harita temaları (bölüm başına ayrı arka plan + dekor)
Kaynak: kullanıcının "harita assetleri" sayfası (5 harita). Her klasörde:
- `backdrop.png` — haritanın panorama görseli (≈310×80 px, etiket kısmı kesildi). Düşük çözünürlüklü olduğundan UZAK katman olarak çizilir: aynalı döşeme, üst kenarı gökyüzüne solar, ufuk sisi eklenir.
- `pNN.png` — sayfadan kesilmiş dekor sprite'ları (ağaç, kaya, çalı, çit, kalıntı, kristal, fener, varil/sandık…). Pivot: alt orta. Platform blokları ve parçalı/bitişik kümeler ayıklandı.
Temalar: `forest` (DARK FOREST), `frozen` (FROZEN PEAKS), `meadow2` (MEADOWLANDS II), `forest2` (DARK FOREST II).
**MEADOWLANDS (1. bölüm)** mevcut varsayılan arka plan/dekoru kullanır (yüksek çözünürlüklü; tema tanımı yok). Sayfadaki 1. harita eklenmek istenirse `world_props.json → themes.meadow` ile aynı biçimde tanımlanır.
Veri: `data/world_props.json → themes.<id>` (gökyüzü renkleri `sky`, sis `haze`, `sun/clouds`, zemin rengi + ton `ground`, `props`, `decor`, `backdrop`); bölüm→tema eşlemesi `data/chapters.json`.
