/* ==========================================================
   Faro Perform — ana akış: yükleme, kaydırma sahneleri, arayüz
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO;
  const P = F.perfumes;
  const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.min.js';

  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b === undefined ? 1 : b, Math.max(a === undefined ? 0 : a, v));
  const range = (v, a, b) => clamp((v - a) / (b - a));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isMobile = () => window.innerWidth <= 860;
  const fmtTime = (m) => {
    const mm = Math.max(0, Math.round(m));
    return String(Math.floor(mm / 60)).padStart(2, '0') + ':' + String(mm % 60).padStart(2, '0');
  };

  /* DOM'a yalnızca değer değiştiğinde yaz — her karede aynı stili yazmak
     tarayıcıya gereksiz stil/düzen hesabı yaptırıyordu. */
  const styleCache = new WeakMap();
  function setStyle(node, prop, val) {
    let c = styleCache.get(node);
    if (!c) styleCache.set(node, (c = {}));
    if (c[prop] === val) return;
    c[prop] = val;
    if (prop.charCodeAt(0) === 45) node.style.setProperty(prop, val);
    else node.style[prop] = val;
  }
  function setText(node, val) {
    if (node.__txt === val) return;
    node.__txt = val;
    node.textContent = val;
  }

  /* ---------- Elemanlar ---------- */
  const el = {
    body: document.body,
    root: document.documentElement,
    loader: $('#loader'),
    loaderBar: $('#loaderBar'),
    loaderPct: $('#loaderPct'),
    gl: $('#gl'),
    fx: $('#fx'),
    hdr: $('#hdr'),
    nav: $('#nav'),
    navPill: $('#navPill'),
    navLinks: $$('#nav a'),
    skinTime: $('#skinTime'),
    skinRing: $('#skinRing'),
    menuBtn: $('#menuBtn'),
    mmenu: $('#mmenu'),
    hero: $('#top'),
    heroCopy: $('#heroCopy'),
    heroScroll: $('#heroScroll'),
    heroSpray: $('#heroSpray'),
    heroDim: $('#heroDim'),
    heroVeil: $('#heroVeil'),
    notes: $('#notalar'),
    notesSticky: $('#notesSticky'),
    notesBg: $('#notesBg'),
    noteEls: $$('.note'),
    noteSteps: $$('.notes__steps span'),
    archCanvas: $('#archCanvas'),
    notesTimer: $('#notesTimer'),
    coll: $('#koleksiyon'),
    collSticky: $('.collection__sticky'),
    collPanel: $('#collPanel'),
    collIndex: $('#collIndex'),
    collName: $('#collName'),
    collDesc: $('#collDesc'),
    collRows: $('#collRows'),
    collTop: $('#collTop'),
    collHeart: $('#collHeart'),
    collBase: $('#collBase'),
    collBar: $('#collBar'),
    collHours: $('#collHours'),
    collDots: $('#collDots'),
    collPrev: $('#collPrev'),
    collNext: $('#collNext'),
    cards: $('#cards'),
    lighthouse: $('#lighthouse'),
    drawer: $('#drawer'),
    news: $('#news'),
    newsMsg: $('#newsMsg')
  };

  /* ---------- Yükleme göstergesi ---------- */
  let loadTarget = 0, loadShown = 0;
  const setLoad = (v) => { loadTarget = Math.max(loadTarget, v); };
  (function tickLoader() {
    loadShown += (loadTarget - loadShown) * 0.12;
    if (loadTarget - loadShown < 0.002) loadShown = loadTarget;
    el.loaderBar.style.transform = 'scaleX(' + loadShown.toFixed(4) + ')';
    el.loaderPct.textContent = String(Math.round(loadShown * 100)).padStart(2, '0');
    if (!el.loader.classList.contains('is-done')) requestAnimationFrame(tickLoader);
  })();

  /* ---------- Yumuşak kaydırma ---------- */
  let lenis = null;
  if (window.Lenis && !reduced) {
    try {
      lenis = new window.Lenis({ lerp: 0.12, wheelMultiplier: 1.1, smoothWheel: true });
      lenis.stop();
    } catch (e) { lenis = null; }
  }
  window.scrollTo(0, 0);
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  function scrollToY(y, immediate) {
    if (lenis) lenis.scrollTo(y, { duration: immediate ? 0 : 2.2, immediate: !!immediate, easing: easeInOut, force: true });
    else window.scrollTo({ top: y, behavior: immediate || reduced ? 'auto' : 'smooth' });
  }
  function sectionY(id) {
    const s = document.getElementById(id);
    if (!s) return 0;
    let y = s.getBoundingClientRect().top + window.scrollY;
    if (id === 'notalar') y += window.innerHeight * 0.25;
    if (id === 'top') y = 0;
    return y;
  }

  /* ---------- Bölüm ölçüleri ----------
     Konumlar yalnızca boyut değişince ölçülür; her karede getBoundingClientRect
     çağırmak (stiller yazıldıktan sonra) zorunlu düzen hesabına yol açıyordu. */
  const metrics = { vh: window.innerHeight, sy: 0, map: new Map() };
  function measure() {
    metrics.vh = window.innerHeight;
    const sy = window.scrollY;
    document.querySelectorAll('main > section, main > footer').forEach((s) => {
      const r = s.getBoundingClientRect();
      metrics.map.set(s, { top: r.top + sy, h: r.height });
    });
    metrics.docH = document.documentElement.scrollHeight;
  }
  measure();
  // içerik yüksekliği değişirse (yazı tipi, kartlar, görseller) yeniden ölç
  if ('ResizeObserver' in window) new ResizeObserver(() => measure()).observe(document.querySelector('main'));
  function prog(section) {
    const m = metrics.map.get(section) || { top: 0, h: 1 };
    const top = m.top - metrics.sy;
    const bottom = top + m.h;
    const total = Math.max(1, m.h - metrics.vh);
    return { p: clamp(-top / total), top, bottom, visible: bottom > 0 && top < metrics.vh };
  }

  /* ---------- Sahne değişkenleri ---------- */
  let stage = null;
  let stageLost = false;
  let snapshots = [];
  let fx = null, notesBg = null, arch = null, lighthouse = null;
  let mode = 'hero';
  let collIdx = 0;
  let accent = '#e7a04a';
  const pointer = { x: 0, y: 0 };

  function setAccent(hex) {
    if (hex === accent) return;
    accent = hex;
    el.root.style.setProperty('--accent', hex);
    if (fx) fx.setColor(hex);
  }

  /* ==========================================================
     HERO
     ========================================================== */
  // dar/kare pencerelerde şişe metinle çakışmasın diye kamerayı geri çek
  const fitK = () => Math.max(1, 1.5 / (window.innerWidth / window.innerHeight));

  function heroTargets(p) {
    const m = easeInOut(range(p, 0.1, 0.52));
    const c = easeInOut(range(p, 0.36, 0.62));
    const B = F.BOTTLE;
    const k = fitK();
    if (isMobile()) {
      return {
        shiftX: lerp(0, -0.04, m),
        shiftY: lerp(-0.2, -0.04, m),
        camZ: lerp(12.8, 4.4, m),
        camY: lerp(1.9, B.BH + 0.7, m),
        lookY: lerp(1.05, B.BH + 0.25, m),
        rotY: lerp(-0.42, -0.14, m),
        cap: c,
        beam: 1 - m * 0.75
      };
    }
    return {
      shiftX: lerp(0.2, -0.12, m),
      shiftY: lerp(0, 0.02, m),
      camZ: lerp(9.6 * k, 3.5 * Math.sqrt(k), m),
      camY: lerp(1.75, B.BH + 0.62, m),
      lookY: lerp(1.08, B.BH + 0.22, m),
      rotY: lerp(-0.42, -0.12, m),
      cap: c,
      beam: 1 - m * 0.7
    };
  }

  function updateHero(H, t, dt) {
    const p = H.p;
    if (!H.visible) return;
    const out = range(p, 0.03, 0.26);
    setStyle(el.heroCopy, '--ho', (1 - out).toFixed(2));
    setStyle(el.heroCopy, '--hy', (-out * 70).toFixed(0) + 'px');
    setStyle(el.heroCopy, 'visibility', out >= 1 ? 'hidden' : '');
    setStyle(el.heroScroll, 'opacity', (1 - range(p, 0, 0.05)).toFixed(2));

    const sIn = range(p, 0.56, 0.68), sOut = range(p, 0.88, 0.97);
    setStyle(el.heroSpray, 'opacity', (sIn * (1 - sOut)).toFixed(2));
    setStyle(el.heroSpray, 'transform', 'translate(-50%,' + ((1 - easeOut(sIn)) * 24 - sOut * 20).toFixed(0) + 'px)');
    const dim = smooth(range(p, 0.83, 0.92));
    setStyle(el.heroDim, 'opacity', dim.toFixed(3));
    setStyle(el.heroVeil, 'opacity', smooth(range(p, 0.9, 1)).toFixed(3));
    if (fx) fx.setSprayAlpha(1 - dim);

    if (stage && mode === 'hero') {
      stage.setTarget(heroTargets(p));
      updateSpray(H.visible && p > 0.6 && p < 0.88, dt);
    }
  }

  /* Sprey: parmak basar → başlık aşağı iner → bol buğu → bırakır.
     Bölgeye girer girmez ilk basış başlar, sonra her ~2.4 sn'de bir tekrarlanır. */
  const SPRAY = { period: 2.4, down: 0.16, hold: 0.62, up: 0.86 };
  let sprayClock = -1;
  function updateSpray(active, dt) {
    if (!active) {
      if (sprayClock >= 0) stage.setPress(0);
      sprayClock = -1;
      return;
    }
    sprayClock = sprayClock < 0 ? 0 : sprayClock + dt;
    const s = sprayClock % SPRAY.period;

    // başlığın hareketi: hızlı iniş, kısa bekleme, yaylanarak geri dönüş
    let press = 0;
    if (s < SPRAY.down) press = easeInOut(s / SPRAY.down);
    else if (s < SPRAY.hold) press = 1;
    else if (s < SPRAY.up) {
      const k = (s - SPRAY.hold) / (SPRAY.up - SPRAY.hold);
      press = 1 - easeOut(k) + Math.sin(k * Math.PI) * 0.08 * (1 - k);
    }
    stage.setPress(press);

    // püskürtme: başlık dibe vurduğu an patlama, basılı kaldıkça devam, bırakınca kesilir
    let amount = 0;
    if (s >= SPRAY.down * 0.75 && s < SPRAY.up) {
      if (s < SPRAY.down + 0.06) amount = 2.4;                       // ilk patlama
      else if (s < SPRAY.hold) amount = lerp(1.3, 0.8, range(s, SPRAY.down + 0.06, SPRAY.hold));
      else amount = 0.6 * (1 - range(s, SPRAY.hold, SPRAY.hold + 0.12));
    }
    if (amount > 0 && fx) {
      const n = stage.nozzleScreen();
      fx.spray(n.x, n.y, 1, -0.16, amount, dt);
    }
  }

  /* ==========================================================
     NOTALAR
     ========================================================== */
  let noteActive = 0, notesExit = false;
  const timer = { from: 15, to: 15, t: 1, val: 15 };

  function switchNote(i) {
    const prev = el.noteEls[noteActive];
    prev.classList.remove('is-active');
    prev.classList.add('is-leaving');
    setTimeout(() => prev.classList.remove('is-leaving'), 600);
    noteActive = i;
    el.noteEls[i].classList.add('is-active');
    el.noteSteps.forEach((s, k) => s.classList.toggle('is-active', k === i));
    timer.from = timer.val;
    timer.to = F.notes[i].minutes;
    timer.t = 0;
  }

  function updateNotes(N, dt, t) {
    const f = N.p * 3;
    const tt = clamp(f - 0.5, 0, 2);
    const i0 = Math.min(2, Math.floor(tt)), i1 = Math.min(2, i0 + 1);
    const k = i0 === i1 ? 0 : smooth(range(tt - i0, 0.3, 0.7));
    const w = [0, 0, 0];
    w[i0] += 1 - k;
    w[i1] += k;

    const a = F.notes[i0], b = F.notes[i1];
    if (!N.visible) return;

    // çıkış: bölüm yukarı kayarken alt kenarı arkadaki koleksiyon rengine doğru erisin (sert çizgi kalmasın);
    // içerik girişte belirsin, çıkışta sönsün
    const vh = metrics.vh;
    const enter = clamp(N.top / vh), exit = clamp((vh - N.bottom) / vh);
    if ((exit > 0) !== notesExit) el.notesSticky.classList.toggle('is-exit', (notesExit = exit > 0));
    setStyle(el.notesSticky, '--fe', (Math.min(vh * 0.42, N.bottom * 0.8) * smooth(range(exit, 0, 0.22))).toFixed(0) + 'px');
    setStyle(el.notesSticky, '--nx', ((1 - smooth(range(enter, 0.02, 0.5))) * (1 - smooth(range(exit, 0.02, 0.5)))).toFixed(3));

    setStyle(el.notesSticky, '--n1', F.mixHex(a.c1, b.c1, k));
    setStyle(el.notesSticky, '--n2', F.mixHex(a.c2, b.c2, k));
    setStyle(el.notesSticky, '--na', F.mixHex(a.accent, b.accent, k));

    const active = k > 0.5 ? i1 : i0;
    if (active !== noteActive) switchNote(active);

    if (timer.t < 1) {
      timer.t = Math.min(1, timer.t + dt / 1.2);
      timer.val = lerp(timer.from, timer.to, easeOut(timer.t));
      setText(el.notesTimer, fmtTime(timer.val));
    }

    {
      if (notesBg) notesBg.render(dt, t, w);
      if (arch) arch.render(dt, t, w);
      if (N.top <= 0 && N.bottom >= window.innerHeight) setAccent(k > 0.5 ? b.accent : a.accent);
    }
  }

  function skinMinutes(N) {
    const f = N.p * 3;
    if (f <= 0) return 0;
    if (f <= 0.6) return lerp(0, 15, range(f, 0, 0.6));
    if (f <= 1.6) return lerp(15, 240, range(f, 0.6, 1.6));
    return lerp(240, 480, range(f, 1.6, 2.6));
  }

  /* ==========================================================
     KOLEKSİYON
     ========================================================== */
  let prevCollTop = null;
  el.collDots.innerHTML = P.map((p, i) =>
    '<button class="dot' + (i === 0 ? ' is-active' : '') + '" style="--c:' + p.accent + '" data-i="' + i + '" aria-label="' + p.name + '"></button>'
  ).join('');
  const dots = $$('.dot', el.collDots);

  let swapTimer = 0;
  function fillColl(i) {
    const p = P[i];
    el.collName.textContent = p.name;
    el.collDesc.textContent = p.desc;
    el.collTop.textContent = p.top;
    el.collHeart.textContent = p.heart;
    el.collBase.textContent = p.base;
  }
  function setColl(i, instant) {
    const p = P[i];
    collIdx = i;
    el.collIndex.textContent = String(i + 1).padStart(2, '0');
    dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    el.collBar.style.transform = 'scaleX(' + (p.hours / 8).toFixed(3) + ')';
    el.collHours.textContent = p.hours + ' saat';
    $('#collPrice').textContent = F.formatPrice(p.price);
    if (mode === 'coll') setAccent(p.accent);
    if (stage) {
      stage.setPerfume(i, instant);
      if (mode === 'coll') stage.setColors(p.bg, p.glow, instant);
    }
    const swaps = [el.collName, el.collDesc, el.collRows];
    clearTimeout(swapTimer);
    if (instant) { fillColl(i); swaps.forEach((s) => s.classList.remove('is-out', 'is-pre')); return; }
    swaps.forEach((s, k) => { s.style.transitionDelay = (k * 0.05) + 's'; s.classList.add('is-out'); });
    swapTimer = setTimeout(() => {
      fillColl(i);
      swaps.forEach((s) => { s.classList.remove('is-out'); s.classList.add('is-pre'); });
      void el.collPanel.offsetWidth;
      swaps.forEach((s, k) => { s.style.transitionDelay = (k * 0.07) + 's'; s.classList.remove('is-pre'); });
    }, 420);
  }
  fillColl(0);
  setColl(0, true);

  function collScrollTo(i) {
    const s = el.coll;
    const top = s.getBoundingClientRect().top + window.scrollY;
    const total = s.offsetHeight - window.innerHeight;
    scrollToY(top + total * ((i + 0.5) / P.length));
  }
  el.collDots.addEventListener('click', (e) => {
    const b = e.target.closest('.dot');
    if (b) collScrollTo(+b.dataset.i);
  });
  el.collPrev.addEventListener('click', () => collScrollTo((collIdx + P.length - 1) % P.length));
  el.collNext.addEventListener('click', () => collScrollTo((collIdx + 1) % P.length));

  function collTargets() {
    if (isMobile()) return { shiftX: 0, shiftY: 0.21, camZ: 16, camY: 1.7, lookY: 1.0, rotY: -0.32, cap: 0, beam: 0 };
    return { shiftX: -0.2, shiftY: 0, camZ: 9 * fitK(), camY: 1.5, lookY: 0.92, rotY: -0.32, cap: 0, beam: 0 };
  }

  function updateCollection(C) {
    const idx = clamp(Math.floor(C.p * P.length * 0.9999), 0, P.length - 1);
    if (idx !== collIdx) setColl(idx);
    const vh = metrics.vh;
    if (stage && mode === 'coll') {
      stage.setTarget(collTargets());
      // bölüm yapışık değilken (giriş ya da çıkış) şişe de paneliyle birlikte sayfayla kaysın
      stage.setScrollShift(C.top > 0 ? -C.top / vh : C.bottom < vh ? (vh - C.bottom) / vh : 0);
    }
    // panel yerine otururken yumuşakça belirsin
    const arrive = smooth(range(C.top, vh * 0.75, vh * 0.12));
    setStyle(el.collPanel, '--ca', arrive.toFixed(3));
    setStyle(el.collPanel, '--cy', ((1 - arrive) * 40).toFixed(1) + 'px');
    // ürünler bölümü yaklaştıkça alt kenar sayfa zeminine doğru kararsın
    setStyle(el.collSticky, '--cf', smooth(range(C.bottom, vh * 1.4, vh)).toFixed(3));
    prevCollTop = C.top;
  }

  /* ==========================================================
     ÜRÜN KARTLARI + SİPARİŞ ÇEKMECESİ
     ========================================================== */
  function mediaHTML(i) {
    return snapshots[i]
      ? '<img src="' + snapshots[i] + '" alt="' + P[i].name + ' parfüm şişesi — kodla çizildi" decoding="async">'
      : F.bottleSVG(P[i]);
  }

  function buildCards() {
    el.cards.innerHTML = P.map((p, i) => {
      const low = p.stock < 20;
      return '<article class="card" data-reveal style="--c:' + p.cardBg + ';--accent-c:' + p.accent + ';--stock:' + (p.stock / 200 * 100).toFixed(1) + '%;--d:' + (i * 0.08).toFixed(2) + 's">' +
        '<button class="card__media" data-buy="' + i + '" aria-label="' + p.name + ' — sipariş ver">' + mediaHTML(i) +
        (low ? '<span class="card__tag">Son ' + p.stock + ' şişe</span>' : '') + '</button>' +
        '<div class="card__info">' +
        '<p class="card__fam"><b>' + String(i + 1).padStart(2, '0') + '</b>' + p.family + '</p>' +
        '<h3 class="card__name">' + p.name + '</h3>' +
        '<div class="card__stock"><i></i></div>' +
        '<p class="card__left' + (low ? ' is-low' : '') + '">' + (low ? 'Son ' + p.stock + ' şişe' : p.stock + ' şişe kaldı') + '</p>' +
        '<div class="card__row"><span class="card__price">' + F.formatPrice(p.price) + '</span>' +
        '<button class="card__buy" data-add="' + i + '">Sepete ekle <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 1v10M1 6h10"/></svg></button></div>' +
        '</div></article>';
    }).join('');
    $$('.card', el.cards).forEach((c) => revealObs.observe(c));
  }

  /* ---------- Çekmeceler (ürün detayı + sepet) ---------- */
  const cartEl = $('#cart');
  let openPanelEl = null;
  function openPanel(panel) {
    if (openPanelEl && openPanelEl !== panel) closePanel(openPanelEl, true);
    openPanelEl = panel;
    $('#toast').classList.remove('is-on');
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    if (lenis) lenis.stop();
    setTimeout(() => { const c = $('.drawer__close', panel); if (c) c.focus(); }, 60);
  }
  function closePanel(panel, keepScrollLock) {
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    if (openPanelEl === panel) openPanelEl = null;
    if (lenis && !keepScrollLock) lenis.start();
  }

  const drawerState = { i: 0, q: 1 };
  function updateDrawer() {
    const p = P[drawerState.i];
    $('#drawerQty').textContent = drawerState.q;
    $('#drawerTotal').textContent = F.formatPrice(p.price * drawerState.q);
  }
  function openDrawer(i) {
    const p = P[i];
    drawerState.i = i;
    drawerState.q = 1;
    const media = $('#drawerMedia');
    media.style.setProperty('--c', p.cardBg);
    media.innerHTML = mediaHTML(i);
    $('#drawerFam').textContent = String(i + 1).padStart(2, '0') + ' · ' + p.family;
    $('#drawerName').textContent = p.name;
    $('#drawerMeta').textContent = '50 ml · Eau de Parfum · No. ' + p.no + ' · Tende ' + p.hours + ' saat';
    updateDrawer();
    openPanel(el.drawer);
  }
  el.drawer.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) closePanel(el.drawer);
    const q = e.target.closest('[data-q]');
    if (q) {
      drawerState.q = clamp(drawerState.q + +q.dataset.q, 1, maxQty(drawerState.i));
      updateDrawer();
    }
  });
  $('#drawerAdd').addEventListener('click', (e) => {
    if (addToCart(drawerState.i, drawerState.q, e.currentTarget, true)) {
      closePanel(el.drawer, true);
      setTimeout(() => openPanel(cartEl), 380);
    }
  });

  /* ---------- Sepet ---------- */
  const CART_KEY = 'faro-cart-v1';
  const maxQty = (i) => Math.min(5, P[i].stock);
  let cart = (function load() {
    try {
      const a = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
      return Array.isArray(a) ? a.filter((x) => P[x.i] && x.q > 0).map((x) => ({ i: x.i, q: Math.min(x.q, maxQty(x.i)) })) : [];
    } catch (err) { return []; }
  })();
  function saveCart() {
    try { localStorage.setItem(CART_KEY, JSON.stringify(cart)); } catch (err) { /* gizli sekme vb. */ }
  }
  const cartCountTotal = () => cart.reduce((s, x) => s + x.q, 0);

  function cartItemHTML(x) {
    const p = P[x.i];
    return '<li class="citem" data-i="' + x.i + '">' +
      '<div class="citem__img" style="--c:' + p.cardBg + '">' + mediaHTML(x.i) + '</div>' +
      '<div><p class="citem__name">' + p.name + '</p><p class="citem__meta">50 ml · No. ' + p.no + '</p>' +
      '<div class="qty qty--sm"><button data-cq="-1" aria-label="Azalt">−</button><span>' + x.q + '</span><button data-cq="1" aria-label="Arttır">+</button></div></div>' +
      '<div class="citem__end"><strong>' + F.formatPrice(p.price * x.q) + '</strong><button class="citem__rm" data-rm>Kaldır</button></div>' +
      '</li>';
  }

  function renderCart(bump) {
    const n = cartCountTotal();
    const btn = $('#cartBtn');
    $('#cartCount').textContent = n;
    $('#cartHeadCount').textContent = n;
    btn.classList.toggle('has-items', n > 0);
    btn.setAttribute('aria-label', 'Sepet, ' + n + ' ürün');
    if (bump) { btn.classList.remove('is-bump'); void btn.offsetWidth; btn.classList.add('is-bump'); }
    cartEl.classList.toggle('is-empty', n === 0);
    $('#cartList').innerHTML = cart.map(cartItemHTML).join('');
    const total = cart.reduce((s, x) => s + P[x.i].price * x.q, 0);
    $('#cartSubtotal').textContent = F.formatPrice(total);
    const lines = cart.map((x) => '• ' + P[x.i].name + ' (No. ' + P[x.i].no + ') × ' + x.q + ' — ' + F.formatPrice(P[x.i].price * x.q)).join('\n');
    const body = 'Merhaba Faro Perform,\n\nŞu kokuları sipariş etmek istiyorum:\n' + lines +
      '\n\nToplam: ' + F.formatPrice(total) + '\n\nAd soyad:\nTelefon:\nTeslimat adresi:\n';
    $('#cartCheckout').href = 'mailto:merhaba@faroperform.com?subject=' + encodeURIComponent('Sipariş — ' + n + ' şişe') + '&body=' + encodeURIComponent(body);
  }

  function addToCart(i, q, fromEl, quiet) {
    const it = cart.find((x) => x.i === i);
    const cur = it ? it.q : 0;
    const next = Math.min(maxQty(i), cur + q);
    if (next === cur) {
      toast('Bu kokudan sipariş başına en fazla ' + maxQty(i) + ' şişe alınabiliyor.', P[i].accent, true);
      return false;
    }
    if (it) it.q = next; else cart.push({ i, q: next });
    saveCart();
    flyToCart(fromEl, P[i].accent, () => renderCart(true));
    if (!quiet) toast(P[i].name + ' sepete eklendi', P[i].accent);
    return true;
  }

  cartEl.addEventListener('click', (e) => {
    if (e.target.closest('[data-close]')) { closePanel(cartEl); return; }
    const row = e.target.closest('.citem');
    if (!row) return;
    const i = +row.dataset.i;
    const it = cart.find((x) => x.i === i);
    if (!it) return;
    const cq = e.target.closest('[data-cq]');
    if (cq) {
      it.q = clamp(it.q + +cq.dataset.cq, 0, maxQty(i));
      if (it.q === 0) cart = cart.filter((x) => x !== it);
      saveCart();
      renderCart();
      return;
    }
    if (e.target.closest('[data-rm]')) {
      row.classList.add('is-removing');
      setTimeout(() => { cart = cart.filter((x) => x !== it); saveCart(); renderCart(); }, 320);
    }
  });
  $('#cartBtn').addEventListener('click', () => openPanel(cartEl));
  $('#collBuy').addEventListener('click', (e) => addToCart(collIdx, 1, e.currentTarget));

  el.cards.addEventListener('click', (e) => {
    const add = e.target.closest('[data-add]');
    if (add) { addToCart(+add.dataset.add, 1, add); return; }
    const b = e.target.closest('[data-buy]');
    if (b) openDrawer(+b.dataset.buy);
  });

  /* Eklenen ürün: butondan sepet ikonuna kavisli uçan nokta */
  function flyToCart(fromEl, color, done) {
    const target = $('#cartBtn').getBoundingClientRect();
    if (!fromEl || reduced) { done(); return; }
    const a = fromEl.getBoundingClientRect();
    const x0 = a.left + a.width / 2, y0 = a.top + a.height / 2;
    const x1 = target.left + target.width / 2, y1 = target.top + target.height / 2;
    const dot = document.createElement('span');
    dot.className = 'fly-dot';
    dot.style.background = color;
    dot.style.color = color;
    document.body.appendChild(dot);
    const mx = (x0 + x1) / 2, my = Math.min(y0, y1) - 120;
    const anim = dot.animate([
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(.6)', opacity: 0 },
      { transform: 'translate(' + x0 + 'px,' + y0 + 'px) scale(1.2)', opacity: 1, offset: 0.12 },
      { transform: 'translate(' + mx + 'px,' + my + 'px) scale(1)', opacity: 1, offset: 0.55 },
      { transform: 'translate(' + x1 + 'px,' + y1 + 'px) scale(.4)', opacity: 0.9 }
    ], { duration: 800, easing: 'cubic-bezier(.5,0,.3,1)' });
    anim.onfinish = () => { dot.remove(); done(); };
  }

  /* Bildirim */
  let toastT = 0;
  function toast(text, color, plain) {
    const t = $('#toast');
    $('#toastText').textContent = text;
    $('#toastDot').style.background = color || 'var(--accent)';
    t.classList.toggle('is-plain', !!plain);
    t.classList.add('is-on');
    clearTimeout(toastT);
    toastT = setTimeout(() => t.classList.remove('is-on'), 2800);
  }
  $('#toastView').addEventListener('click', () => { $('#toast').classList.remove('is-on'); openPanel(cartEl); });

  renderCart();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (openPanelEl) closePanel(openPanelEl);
      if (el.body.classList.contains('menu-open')) toggleMenu(false);
    }
    if (!openPanelEl && mode === 'coll' && prevCollTop !== null && prevCollTop <= 0) {
      if (e.key === 'ArrowRight') collScrollTo(Math.min(P.length - 1, collIdx + 1));
      if (e.key === 'ArrowLeft') collScrollTo(Math.max(0, collIdx - 1));
    }
  });

  /* ==========================================================
     GÖRÜNÜNCE BELİREN ÖĞELER + SAYAÇLAR
     ========================================================== */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      en.target.classList.add('is-in');
      revealObs.unobserve(en.target);
      const n = en.target.querySelector('[data-count]');
      if (n) countUp(n);
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -6% 0px' });
  $$('[data-reveal]').forEach((n) => revealObs.observe(n));

  // alt bilgideki ışık ve kayan yazı yalnızca görünürken çalışsın
  const liveObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => en.target.classList.toggle('is-live', en.isIntersecting));
  });
  $$('.foot, .marquee').forEach((n) => liveObs.observe(n));

  function countUp(node) {
    const to = +node.dataset.count, pre = node.dataset.prefix || '';
    const t0 = performance.now(), dur = 1700;
    (function step(now) {
      const k = easeOut(Math.min(1, (now - t0) / dur));
      node.textContent = pre + Math.round(to * k);
      if (k < 1) requestAnimationFrame(step);
    })(t0);
  }

  /* ==========================================================
     MENÜ
     ========================================================== */
  const sectionIds = ['top', 'notalar', 'koleksiyon', 'urunler', 'atolye', 'iletisim'];
  const sectionEls = sectionIds.map((id) => document.getElementById(id));
  let activeSection = 'top';

  function movePill() {
    const a = el.navLinks.find((l) => l.dataset.section === activeSection);
    if (!a) return;
    el.navPill.style.width = a.offsetWidth + 'px';
    el.navPill.style.transform = 'translateX(' + a.offsetLeft + 'px)';
  }
  function updateNav() {
    let cur = 'top';
    const line = metrics.sy + metrics.vh * 0.45;
    sectionEls.forEach((s, i) => { const m = metrics.map.get(s); if (m && m.top <= line) cur = sectionIds[i]; });
    if (metrics.vh + metrics.sy >= metrics.docH - 4) cur = 'iletisim';
    if (cur !== activeSection) {
      activeSection = cur;
      el.hdr.classList.toggle('is-solid', cur === 'urunler' || cur === 'atolye' || cur === 'iletisim');
      el.navLinks.forEach((l) => l.classList.toggle('is-active', l.dataset.section === cur));
      movePill();
    }
  }

  function toggleMenu(open) {
    el.body.classList.toggle('menu-open', open);
    el.menuBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    el.mmenu.setAttribute('aria-hidden', open ? 'false' : 'true');
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  el.menuBtn.addEventListener('click', () => toggleMenu(!el.body.classList.contains('menu-open')));

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-scroll]');
    if (!a) return;
    const id = (a.getAttribute('href') || '').slice(1);
    if (!id) return;
    e.preventDefault();
    if (el.body.classList.contains('menu-open')) toggleMenu(false);
    if (openPanelEl) closePanel(openPanelEl);
    scrollToY(sectionY(id));
  });

  /* ==========================================================
     BÜLTEN
     ========================================================== */
  el.news.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = $('#newsEmail');
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.value.trim());
    el.newsMsg.classList.toggle('is-error', !ok);
    if (!ok) {
      el.newsMsg.textContent = 'Lütfen geçerli bir e-posta adresi yazın.';
      el.news.classList.remove('is-shake');
      void el.news.offsetWidth;
      el.news.classList.add('is-shake');
      return;
    }
    el.newsMsg.textContent = 'Teşekkürler — yeni parti çıktığında ilk siz duyacaksınız.';
    input.value = '';
  });

  /* ==========================================================
     İMLEÇ
     ========================================================== */
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (stage) stage.pointer(pointer.x, pointer.y);
  }, { passive: true });

  /* ==========================================================
     BOYUTLANDIRMA
     ========================================================== */
  function resizeAll() {
    measure();
    if (stage) stage.resize();
    if (fx) fx.resize();
    if (notesBg) notesBg.resize();
    if (arch) arch.resize();
    if (lighthouse) lighthouse.resize();
    movePill();
  }
  let rzT = 0;
  window.addEventListener('resize', () => { clearTimeout(rzT); rzT = setTimeout(resizeAll, 120); });

  /* ==========================================================
     WebGL yoksa: SVG yedek şişe
     ========================================================== */
  function fallbackBottles() {
    el.gl.style.display = 'none';
    const mk = (parent, cls) => {
      const d = document.createElement('div');
      d.className = cls;
      d.style.cssText = 'position:absolute;width:min(34vw,420px);aspect-ratio:400/520;top:50%;transform:translateY(-50%);overflow:hidden;border-radius:4px;';
      parent.appendChild(d);
      return d;
    };
    const h = mk($('.hero__sticky'), 'fb-hero');
    h.style.right = '8vw';
    h.innerHTML = F.bottleSVG(Object.assign({}, P[0], { cardBg: F.hero.bg, cardGlow: F.hero.glow }));
    const c = mk($('.collection__sticky'), 'fb-coll');
    c.style.left = '8vw';
    const paint = () => { c.innerHTML = F.bottleSVG(P[collIdx]); };
    paint();
    const orig = setColl;
    setColl = function (i, inst) { orig(i, inst); paint(); };
  }

  /* ==========================================================
     ANA DÖNGÜ
     ========================================================== */
  let last = performance.now(), time = 0, lighthouseVisible = false;
  const lhObs = new IntersectionObserver((en) => { lighthouseVisible = en[0].isIntersecting; }, { threshold: 0 });
  lhObs.observe(el.lighthouse);

  /* Otomatik kalite: 3B sahne çizilirken kareler uzun sürüyorsa çözünürlüğü kademeli düşür.
     Güçlü ekran kartlarında tam kalite kalır, zayıflarda akıcılık öncelikli olur. */
  const QUALITY = [1.5, 1.25, 1, 0.8];
  const perf = { level: 0, acc: 0, n: 0, warm: 90 };
  function governQuality(dt) {
    if (!stage || document.hidden) return;
    if (perf.warm > 0) { perf.warm--; return; }
    perf.acc += dt;
    perf.n++;
    if (perf.n < 40) return;
    const avg = perf.acc / perf.n;
    perf.acc = perf.n = 0;
    if (avg > 1 / 45 && perf.level < QUALITY.length - 1) {
      perf.level++;
      stage.setQuality(QUALITY[perf.level]);
      perf.warm = 30;
    }
  }

  let glOn = true;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    time += dt;
    if (lenis) lenis.raf(now);

    // tek okuma: bu karedeki kaydırma konumu (sonrasında yalnızca yazma yapılıyor)
    metrics.sy = window.scrollY;
    const H = prog(el.hero), N = prog(el.notes), C = prog(el.coll);

    // sahne modu: koleksiyon görünür olunca şişe oraya geçer
    const newMode = C.top < metrics.vh ? 'coll' : 'hero';
    if (newMode !== mode) {
      mode = newMode;
      sprayClock = -1;
      if (stage) {
        stage.setPress(0);
        if (mode === 'coll') {
          stage.setPerfume(collIdx, true);
          stage.setColors(P[collIdx].bg, P[collIdx].glow, true);
          stage.setTarget(collTargets());
          setAccent(P[collIdx].accent);
        } else {
          stage.setPerfume(0, true);
          stage.setColors(F.hero.bg, F.hero.glow, true);
          stage.setTarget(heroTargets(H.p));
          stage.setScrollShift(0);
        }
        stage.snap();
      }
    }

    updateHero(H, time, dt);
    updateNotes(N, dt, time);
    updateCollection(C);
    if (H.visible && H.p < 0.9) setAccent('#e7a04a');

    // tende süre
    const mins = skinMinutes(N);
    setText(el.skinTime, fmtTime(mins));
    setStyle(el.skinRing, 'strokeDashoffset', (47.12 * (1 - mins / 480)).toFixed(1));

    updateNav();

    const glVisible = !stageLost && (H.visible || C.visible);
    if (glVisible !== glOn) { glOn = glVisible; el.gl.classList.toggle('is-off', !glVisible); }
    if (stage && glVisible) {
      stage.update(dt, time);
      stage.render();
      governQuality(dt);
    }
    if (lighthouse && lighthouseVisible) lighthouse.render(dt, time);
    if (fx) fx.render(dt);

    requestAnimationFrame(frame);
  }

  /* ==========================================================
     BAŞLATMA
     ========================================================== */
  async function boot() {
    const t0 = performance.now();
    setLoad(0.08);

    // 3B motoru yazı tipleriyle aynı anda indirilmeye başlasın (eskiden sırayla bekliyordu)
    const threeLoad = Promise.race([
      import(THREE_URL),
      wait(12000).then(() => { throw new Error('three zaman aşımı'); })
    ]);
    threeLoad.catch(() => {});

    // yazı tipleri (etiketler canvas'a çizildiği için önce yüklenmeli)
    try {
      await Promise.race([
        Promise.all([
          document.fonts.load('400 80px Newsreader'),
          document.fonts.load('italic 400 80px Newsreader'),
          document.fonts.load('300 80px Newsreader'),
          document.fonts.load('italic 300 80px Newsreader'),
          document.fonts.load('600 26px Inter'),
          document.fonts.load('500 20px Inter')
        ]),
        wait(2500)
      ]);
    } catch (e) { /* yedek yazı tipiyle devam */ }
    setLoad(0.3);

    // 2B canvas sanatları
    fx = new F.CursorFX(el.fx, { reduced });
    notesBg = new F.NotesBG(el.notesBg);
    arch = new F.ArchArt(el.archCanvas);
    lighthouse = new F.Lighthouse(el.lighthouse);
    fx.resize(); notesBg.resize(); arch.resize(); lighthouse.resize();
    fx.setColor(accent);
    // önbellekli çizimleri yükleme ekranındayken hazırla; bölüme ilk girişte takılma olmasın
    arch.render(0, 0, [0, 0, 1]);
    arch.render(0, 0, [0, 1, 0]);
    arch.render(0, 0, [1, 0, 0]);
    lighthouse.render(0, 0);
    setLoad(0.42);

    // 3B şişe
    try {
      const THREE = await threeLoad;
      setLoad(0.62);
      stage = F.createStage(THREE, el.gl, P);
      setLoad(0.72);
      for (let i = 0; i < P.length; i++) {
        snapshots[i] = stage.snapshot(i, 440, 572);
        setLoad(0.72 + (i + 1) * 0.045);
        await Promise.race([new Promise((r) => requestAnimationFrame(r)), wait(60)]);
      }
      stage.setPerfume(0, true);
      stage.setColors(F.hero.bg, F.hero.glow, true);
      stage.setTarget(heroTargets(0));
      stage.snap();
      stage.setTarget({ intro: 1 });
      stage.update(0.016, 0);
      stage.render();

      // GPU bağlamı düşerse (sekme uzun süre arka planda kalınca olabiliyor) sahneyi yeniden kur
      el.gl.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        stageLost = true;
      });
      el.gl.addEventListener('webglcontextrestored', () => {
        stage = F.createStage(THREE, el.gl, P);
        stage.setPerfume(mode === 'coll' ? collIdx : 0, true);
        if (mode === 'coll') stage.setColors(P[collIdx].bg, P[collIdx].glow, true);
        stage.setTarget(Object.assign(mode === 'coll' ? collTargets() : heroTargets(prog(el.hero).p), { intro: 1 }));
        stage.snap();
        stageLost = false;
      });
    } catch (err) {
      console.warn('[Faro] WebGL sahnesi başlatılamadı, SVG yedeğe geçiliyor:', err);
      stage = null;
      snapshots = [];
      fallbackBottles();
    }

    buildCards();
    renderCart(); // sepetteki ürünler artık 3B çekilmiş görselleriyle görünsün
    setLoad(1);
    const elapsed = performance.now() - t0;
    await wait(Math.max(250, 1000 - elapsed));

    el.loader.classList.add('is-done');
    el.body.classList.remove('is-loading');
    el.body.classList.add('is-ready');
    if (lenis) lenis.start();
    movePill();
    requestAnimationFrame((n) => { last = n; requestAnimationFrame(frame); });
  }

  boot();
})();
