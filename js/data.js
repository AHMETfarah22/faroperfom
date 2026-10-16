/* Faro Perform — koku verileri */
window.FARO = window.FARO || {};

FARO.perfumes = [
  {
    id: 'kuru-gul',
    name: 'Kuru Gül',
    no: '214',
    family: 'Çiçeksi, baharatlı',
    desc: 'Tatlı bir gül değil. Kuru, baharatlı, hafif dumanlı.',
    top: 'Pembe biber, safran',
    heart: 'Şam gülü, iris',
    base: 'Paçuli, amber',
    hours: 6,
    price: 4800,
    stock: 112,
    accent: '#e0483f',
    liquid: '#a3101d',
    cap: '#3b0a12',
    bg: '#4c070c',
    glow: '#b8261f',
    cardBg: '#93160f',
    cardGlow: '#e5382a'
  },
  {
    id: 'narenciye-bahcesi',
    name: 'Narenciye Bahçesi',
    no: '102',
    family: 'Taze, narenciye',
    desc: 'Taze, yeşil, biraz acımsı. Gündüz için yaptık; tene yakın kalır, odayı doldurmaz.',
    top: 'Bergamot, limon kabuğu',
    heart: 'Neroli, portakal çiçeği',
    base: 'Vetiver, beyaz misk',
    hours: 4,
    price: 4200,
    stock: 38,
    accent: '#e3b23c',
    liquid: '#c0600f',
    cap: '#0d0c0b',
    bg: '#2a330a',
    glow: '#8d9a1d',
    cardBg: '#6c7a0e',
    cardGlow: '#d8d63a'
  },
  {
    id: 'tuz-ve-incir',
    name: 'Tuz ve İncir',
    no: '327',
    family: 'Yeşil, tuzlu',
    desc: 'Denizden yeni çıkmış ten gibi: serin, yeşil, hafif tuzlu. Yaz için yaptık.',
    top: 'İncir yaprağı, deniz tuzu',
    heart: 'İncir sütü, yasemin',
    base: 'Beyaz misk, sahil odunu',
    hours: 5,
    price: 4400,
    stock: 9,
    accent: '#22b597',
    liquid: '#0f6b3a',
    cap: '#0b0c0c',
    bg: '#06291f',
    glow: '#0f7a62',
    cardBg: '#0b6655',
    cardGlow: '#2cc9a8'
  },
  {
    id: 'sedir-yolu',
    name: 'Sedir Yolu',
    no: '408',
    family: 'Kuru, odunsu',
    desc: 'Kuru ve odunsu. Kumaşta uzun kalır; ceketinizde ertesi gün de duyarsınız.',
    top: 'Kakule, selvi',
    heart: 'Sedir, tütsü',
    base: 'Sandal ağacı, misk',
    hours: 7,
    price: 4600,
    stock: 71,
    accent: '#a9bccb',
    liquid: '#1d3a46',
    cap: '#0a0b0d',
    bg: '#18222c',
    glow: '#566f82',
    cardBg: '#4b6172',
    cardGlow: '#adc4d4'
  },
  {
    id: 'gece-amberi',
    name: 'Gece Amberi',
    no: '505',
    family: 'Amber, reçineli',
    desc: 'Koleksiyonun en koyu ve en kalıcı kokusu. Sıcak, reçineli; akşam için.',
    top: 'Tarçın, karanfil',
    heart: 'Labdanum, vanilya',
    base: 'Amber, tonka',
    hours: 8,
    price: 5200,
    stock: 54,
    accent: '#f0702a',
    liquid: '#1c0e09',
    cap: '#0b0a0a',
    bg: '#2c0e06',
    glow: '#93330f',
    cardBg: '#8c2909',
    cardGlow: '#f2661e'
  }
];

/* Hero ve nota bölümleri için renkler */
FARO.hero = { bg: '#2b0f05', glow: '#c4581b' };

FARO.notes = [
  { c1: '#16461a', c2: '#071b09', accent: '#b9e26a', minutes: 15 },
  { c1: '#6a0d1f', c2: '#22030b', accent: '#ff6f86', minutes: 240 },
  { c1: '#120c0a', c2: '#040303', accent: '#ff8a3a', minutes: 480 }
];

FARO.formatPrice = function (n) {
  return n.toLocaleString('tr-TR') + ' TL';
};
