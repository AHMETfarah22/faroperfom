/* ==========================================================
   Faro Perform — kodla çizilmiş 3D parfüm şişesi (Three.js)
   Fotoğraf ya da hazır model yok: cam, sıvı, etiket, kapak ve
   kaide tamamen burada üretiliyor.
   ========================================================== */
(function () {
  'use strict';
  const F = window.FARO = window.FARO || {};
  const TAU = Math.PI * 2;

  /* Şişe ölçüleri (dünya birimi) */
  const BW = 1.34, BH = 1.62, BD = 0.66;      // gövde
  const PR = 1.2, PH = 0.3;                   // kaide
  const LABEL_W = BW * 0.64, LABEL_H = BH * 0.64;
  F.BOTTLE = { BW, BH, BD, PR, PH };

  /* ---------- Etiket (canvas) ---------- */
  function spaced(x, text, cx, y, spacing) {
    if ('letterSpacing' in x) {
      x.letterSpacing = spacing + 'px';
      x.fillText(text, cx + spacing / 2, y);
      x.letterSpacing = '0px';
    } else {
      x.fillText(text, cx, y);
    }
  }

  function rr(x, px, py, w, h, r) {
    x.beginPath();
    x.moveTo(px + r, py);
    x.arcTo(px + w, py, px + w, py + h, r);
    x.arcTo(px + w, py + h, px, py + h, r);
    x.arcTo(px, py + h, px, py, r);
    x.arcTo(px, py, px + w, py, r);
    x.closePath();
  }

  function drawMonogram(x, cx, cy, s, gold) {
    x.save();
    x.translate(cx, cy);
    x.strokeStyle = gold;
    x.lineWidth = s * 0.05;
    x.lineCap = 'round';
    // halkanın arka yarısı
    x.save(); x.rotate(-0.28); x.beginPath(); x.ellipse(0, s * 0.06, s * 1.08, s * 0.32, 0, Math.PI, TAU); x.stroke(); x.restore();
    // harf
    x.fillStyle = gold;
    x.font = 'italic 400 ' + Math.round(s * 1.55) + 'px Newsreader, Georgia, serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('F', -s * 0.04, s * 0.04);
    // halkanın ön yarısı
    x.save(); x.rotate(-0.28); x.beginPath(); x.ellipse(0, s * 0.06, s * 1.08, s * 0.32, 0, 0, Math.PI); x.stroke(); x.restore();
    x.restore();
  }
  F.drawMonogram = drawMonogram;

  F.drawLabel = function (p) {
    const W = 640, H = Math.round(640 * (LABEL_H / LABEL_W));
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const x = c.getContext('2d');

    // buzlu etiket alanı
    const fg = x.createLinearGradient(0, 0, 0, H);
    fg.addColorStop(0, 'rgba(255,240,226,0.10)');
    fg.addColorStop(1, 'rgba(255,240,226,0.04)');
    x.fillStyle = fg;
    rr(x, 6, 6, W - 12, H - 12, 12);
    x.fill();
    x.strokeStyle = 'rgba(255,232,200,0.24)';
    x.lineWidth = 2.5;
    x.stroke();

    const gold = x.createLinearGradient(W * 0.25, 0, W * 0.75, 0);
    gold.addColorStop(0, '#b4843a');
    gold.addColorStop(0.5, '#f7dfa2');
    gold.addColorStop(1, '#b4843a');

    x.textAlign = 'center';
    x.textBaseline = 'alphabetic';

    x.fillStyle = 'rgba(246,236,222,0.9)';
    x.font = '600 26px Inter, sans-serif';
    spaced(x, 'FARO', W / 2, 96, 12);
    x.fillStyle = 'rgba(246,236,222,0.55)';
    x.font = '500 13px Inter, sans-serif';
    spaced(x, 'PERFORM', W / 2, 122, 8);

    drawMonogram(x, W / 2, 262, 96, gold);

    // isim — sığmazsa iki satır
    x.fillStyle = '#f6ecdc';
    let fs = 82;
    x.font = '400 ' + fs + 'px Newsreader, Georgia, serif';
    const words = p.name.split(' ');
    if (x.measureText(p.name).width > W * 0.84 && words.length > 1) {
      fs = 64;
      x.font = '400 ' + fs + 'px Newsreader, Georgia, serif';
      const half = Math.ceil(words.length / 2);
      x.fillText(words.slice(0, half).join(' '), W / 2, 432);
      x.fillText(words.slice(half).join(' '), W / 2, 500);
    } else {
      while (x.measureText(p.name).width > W * 0.84 && fs > 36) {
        fs -= 2;
        x.font = '400 ' + fs + 'px Newsreader, Georgia, serif';
      }
      x.fillText(p.name, W / 2, 462);
    }

    x.fillStyle = 'rgba(246,236,222,0.6)';
    x.font = '500 19px Inter, sans-serif';
    spaced(x, 'No. ' + p.no, W / 2, 566, 5);

    x.fillStyle = 'rgba(246,236,222,0.85)';
    x.font = 'italic 400 30px Newsreader, Georgia, serif';
    x.fillText('Eau de Parfum', W / 2, 622);

    x.fillStyle = 'rgba(246,236,222,0.5)';
    x.font = '500 15px Inter, sans-serif';
    spaced(x, '50 ML', W / 2, H - 46, 7);

    return c;
  };

  /* ---------- Sahne ---------- */
  F.createStage = function (THREE, canvas, perfumes) {
    const lerp = (a, b, t) => a + (b - a) * t;
    const damp = (a, b, k, dt) => lerp(a, b, 1 - Math.exp(-k * dt));
    const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Yüksek yoğunluklu ekranlarda (1.5x ve üstü) pikseller zaten küçük; ayrıca kenar yumuşatma (MSAA) gereksiz yük
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: (window.devicePixelRatio || 1) < 1.5, powerPreference: 'high-performance' });
    // çözünürlük: başta en fazla 1.5x; kare süresi uzarsa main.js setQuality ile düşürür
    let DPR = Math.min(window.devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(DPR);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 80);
    const size = { w: 1, h: 1 };

    /* Stüdyo ortam ışığı — yansımalar için sanal softbox'lar */
    (function buildEnvironment() {
      const env = new THREE.Scene();
      env.add(new THREE.Mesh(
        new THREE.BoxGeometry(24, 14, 24),
        new THREE.MeshBasicMaterial({ color: 0x0b0908, side: THREE.BackSide })
      ));
      const panel = (w, h, pos, rot, intensity, tint) => {
        const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(tint).multiplyScalar(intensity), side: THREE.DoubleSide });
        const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
        mesh.position.set(pos[0], pos[1], pos[2]);
        mesh.rotation.set(rot[0], rot[1], rot[2]);
        env.add(mesh);
      };
      panel(1.6, 9, [-6.5, 1, 1.5], [0, Math.PI / 2, 0], 7, 0xffffff);   // sol şerit
      panel(1.1, 9, [6.5, 1, -0.5], [0, -Math.PI / 2, 0], 4.5, 0xfff0dd); // sağ şerit
      panel(9, 5, [0, 6.9, 0.5], [Math.PI / 2, 0, 0], 2.6, 0xffffff);     // tavan
      panel(7, 4, [0, 1.5, -11.5], [0, 0, 0], 1.4, 0xffb27a);             // sıcak arka
      panel(5, 2.5, [1.5, 0.5, 11.5], [0, Math.PI, 0], 1.6, 0xffffff);    // ön dolgu
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(env, 0.03).texture;
      pmrem.dispose();
    })();

    /* Arka plan (shader) — cam içinde kırılsın diye WebGL'de çiziliyor */
    const bgU = {
      uBg: { value: new THREE.Color(F.hero.bg) },
      uGlow: { value: new THREE.Color(F.hero.glow) },
      uGlowPos: { value: new THREE.Vector2(0.7, 0.6) },
      uFloorPos: { value: new THREE.Vector2(0.7, 0.2) },
      uBeamPos: { value: new THREE.Vector2(0.7, 0.75) },
      uHorizon: { value: 0.3 },
      uAspect: { value: 1.6 },
      uTime: { value: 0 },
      uBeam: { value: 1 },
      uDim: { value: 1 }
    };
    const bgMat = new THREE.ShaderMaterial({
      uniforms: bgU,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
      vertexShader: /* glsl */`
        varying vec2 vUv;
        void main() { vUv = uv; gl_Position = vec4(position.xy, 0.9999, 1.0); }
      `,
      fragmentShader: /* glsl */`
        uniform vec3 uBg; uniform vec3 uGlow;
        uniform vec2 uGlowPos; uniform vec2 uFloorPos; uniform vec2 uBeamPos;
        uniform float uHorizon; uniform float uAspect; uniform float uTime; uniform float uBeam; uniform float uDim;
        varying vec2 vUv;
        float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
        void main() {
          vec2 uv = vUv;
          vec2 asp = vec2(uAspect, 1.0);
          vec3 col = uBg * (0.45 + 0.7 * smoothstep(-0.1, 1.1, uv.y));

          vec2 d = (uv - uGlowPos) * asp;
          col += uGlow * exp(-dot(d, d) * 1.45) * 0.95;
          vec2 d2 = (uv - vec2(0.12, 0.98)) * asp;
          col += uGlow * 0.14 * exp(-dot(d2, d2) * 1.1);

          // zemin
          float fm = smoothstep(uHorizon + 0.015, uHorizon - 0.04, uv.y);
          vec2 fd = (uv - uFloorPos) * vec2(uAspect * 0.5, 3.0);
          float pool = exp(-dot(fd, fd) * 2.0);
          vec3 floorCol = uBg * (0.28 + 0.3 * smoothstep(0.0, uHorizon, uv.y)) + uGlow * pool * 0.8;
          col = mix(col, floorCol, fm);
          col += uGlow * 0.12 * exp(-pow((uv.y - uHorizon) * 50.0, 2.0)) * exp(-pow((uv.x - uFloorPos.x) * 1.4, 2.0));

          // deniz feneri huzmesi
          if (uBeam > 0.001) {
            vec2 b = (uv - uBeamPos) * asp;
            float r = length(b);
            float ang = atan(b.y, b.x);
            float a0 = 1.5708 + sin(uTime * 0.3) * 1.15;
            float da = mod(ang - a0 + 3.14159, 6.28318) - 3.14159;
            float beam = exp(-da * da * 16.0) * smoothstep(0.03, 0.3, r) * exp(-r * 0.7);
            col += mix(uGlow, vec3(1.0, 0.85, 0.62), 0.6) * beam * 0.26 * uBeam * step(uHorizon, uv.y);
          }

          vec2 q = (uv - 0.5) * vec2(1.0, 1.1);
          col *= 1.0 - dot(q, q) * 0.9;
          col *= uDim;
          gl_FragColor = vec4(max(col, 0.0), 1.0);
          #include <colorspace_fragment>
          gl_FragColor.rgb += (hash(uv * vec2(1931.0, 1087.0) + fract(uTime * 7.13)) - 0.5) * 0.022;
        }
      `
    });
    const bg = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bgMat);
    bg.frustumCulled = false;
    bg.renderOrder = -100;
    scene.add(bg);

    /* ---------- Geometri yardımcıları ---------- */
    // Pürüzsüz köşeli kutu (RoundedBox mantığı)
    function roundedBox(w, h, d, r, seg) {
      const segments = (seg || 4) * 2 + 1;
      const geo = new THREE.BoxGeometry(1, 1, 1, segments, segments, segments);
      const pos = geo.attributes.position, nor = geo.attributes.normal;
      const box = new THREE.Vector3(w, h, d).multiplyScalar(0.5).subScalar(r);
      const half = 0.5 / segments;
      const p = new THREE.Vector3(), n = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        n.copy(p);
        n.x -= Math.sign(n.x) * half;
        n.y -= Math.sign(n.y) * half;
        n.z -= Math.sign(n.z) * half;
        n.normalize();
        pos.setXYZ(i,
          box.x * Math.sign(p.x) + n.x * r,
          box.y * Math.sign(p.y) + n.y * r,
          box.z * Math.sign(p.z) + n.z * r);
        nor.setXYZ(i, n.x, n.y, n.z);
      }
      pos.needsUpdate = true;
      nor.needsUpdate = true;
      return geo;
    }

    // Dalga için bol bölmeli, köşeleri yumuşatılmış kutu (sıvı)
    function softBox(w, h, d, r) {
      const geo = new THREE.BoxGeometry(w, h, d, 40, 24, 14);
      const pos = geo.attributes.position;
      const p = new THREE.Vector3(), inner = new THREE.Vector3(), n = new THREE.Vector3();
      const hx = w / 2 - r, hy = h / 2 - r, hz = d / 2 - r;
      const cl = (v, a) => Math.max(-a, Math.min(a, v));
      for (let i = 0; i < pos.count; i++) {
        p.fromBufferAttribute(pos, i);
        inner.set(cl(p.x, hx), cl(p.y, hy), cl(p.z, hz));
        n.subVectors(p, inner);
        const len = n.length();
        if (len > 1e-6) { n.multiplyScalar(r / len); p.copy(inner).add(n); }
        pos.setXYZ(i, p.x, p.y, p.z);
      }
      geo.computeVertexNormals();
      geo.translate(0, h / 2, 0);
      return geo;
    }

    function radialTexture(stops, sx, sy) {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.save();
      x.translate(128, 128);
      x.scale(sx || 1, sy || 1);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, 128);
      stops.forEach((s) => g.addColorStop(s[0], s[1]));
      x.fillStyle = g;
      x.fillRect(-128 / (sx || 1), -128 / (sy || 1), 256 / (sx || 1), 256 / (sy || 1));
      x.restore();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    }

    /* ---------- Malzemeler ---------- */
    const p0 = perfumes[0];

    // Not: Physical + clearcoat yerine Standard malzeme — piksel başına neredeyse yarı maliyet,
    // yansımalar ortam ışığı yoğunluğu artırılarak telafi ediliyor.
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      metalness: 0,
      roughness: 0.03,
      envMapIntensity: 4.2,
      transparent: true,
      depthWrite: false
    });
    glassMat.onBeforeCompile = (sh) => {
      sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
        float fres = pow(1.0 - clamp(abs(dot(normalize(vViewPosition), normal)), 0.0, 1.0), 2.4);
        float lum = dot(gl_FragColor.rgb, vec3(0.3, 0.59, 0.11));
        gl_FragColor.a = clamp(0.04 + fres * 0.6 + lum * 0.9, 0.0, 0.96);`);
    };

    /* Sıvı: gerçek ışık geçirgenliği (transmission) sahneyi her karede iki kez çizdiriyordu.
       Yerine tek geçişte "arkadan aydınlanan sıvı" görünümü veren hafif bir shader kullanıyoruz:
       ortası ve üstü parlak, kenarları koyu, yüzeyi parlak. */
    const liqU = { uWave: { value: 0.12 }, uTime: { value: 0 }, uTop: { value: 1 } };
    const liqCur = new THREE.Color(p0.liquid);
    const liquidMat = new THREE.MeshStandardMaterial({
      color: liqCur.clone().multiplyScalar(0.55),
      metalness: 0,
      roughness: 0.1,
      emissive: liqCur.clone(),
      emissiveIntensity: 0.62,
      envMapIntensity: 1.25,
      transparent: true,
      opacity: 0.94
    });
    const WHITE = new THREE.Color(1, 1, 1);
    function applyLiquid() {
      liquidMat.color.copy(liqCur).multiplyScalar(0.55);
      liquidMat.emissive.copy(liqCur);
    }
    liquidMat.onBeforeCompile = (sh) => {
      sh.uniforms.uWave = liqU.uWave;
      sh.uniforms.uTime = liqU.uTime;
      sh.uniforms.uTop = liqU.uTop;
      sh.vertexShader = 'uniform float uWave;\nuniform float uTime;\nuniform float uTop;\nvarying float vLiqY;\n' +
        sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          float wTop = smoothstep(uTop - 0.24, uTop, position.y);
          transformed.y += wTop * uWave * (
            sin(position.x * 4.2 + uTime * 3.1) * 0.07 +
            sin(position.z * 6.0 - uTime * 2.3) * 0.035 +
            sin(position.x * 9.5 - uTime * 5.4) * 0.016);
          vLiqY = position.y / uTop;`);
      sh.fragmentShader = 'varying float vLiqY;\n' +
        sh.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          float facing = clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0);
          float body = mix(0.22, 1.0, pow(facing, 1.3)) * mix(0.5, 1.3, smoothstep(0.0, 0.95, vLiqY));
          float band = exp(-pow((vLiqY - 0.8) * 7.0, 2.0)) * facing * 0.35;
          totalEmissiveRadiance *= body + band;`);
    };
    liquidMat.customProgramCacheKey = () => 'faro-liquid';

    const capMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(p0.cap),
      metalness: 0.1,
      roughness: 0.12,
      envMapIntensity: 2.2
    });
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xd9ae62, metalness: 1, roughness: 0.2, envMapIntensity: 1.7 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x0a0807, metalness: 0.3, roughness: 0.4 });
    // sıvının içinden görünsün diye derinlik testi kapalı, sıvıdan sonra çizilir
    const tubeMat = new THREE.MeshBasicMaterial({ color: 0xf2e6dc, transparent: true, opacity: 0.5, depthTest: false, depthWrite: false });
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0xefe9e1,
      roughness: 0.4,
      envMapIntensity: 1.05,
      side: THREE.DoubleSide
    });

    /* Etiket dokuları */
    const labelTextures = perfumes.map((p) => {
      const t = new THREE.CanvasTexture(F.drawLabel(p));
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return t;
    });
    const labelMat = new THREE.MeshStandardMaterial({
      map: labelTextures[0],
      emissive: 0xffffff,
      emissiveMap: labelTextures[0],
      emissiveIntensity: 0.42,
      roughness: 0.4,
      metalness: 0.15,
      transparent: true,
      depthWrite: false
    });

    /* ---------- Model ---------- */
    const root = new THREE.Group();
    scene.add(root);

    // kaide
    const pts = [];
    const e = 0.04;
    pts.push(new THREE.Vector2(0, -PH));
    for (let i = 0; i <= 8; i++) {
      const a = -Math.PI / 2 + (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(PR - e + Math.cos(a) * e, -PH + e + Math.sin(a) * e));
    }
    for (let i = 0; i <= 8; i++) {
      const a = (i / 8) * (Math.PI / 2);
      pts.push(new THREE.Vector2(PR - e + Math.cos(a) * e, -e + Math.sin(a) * e));
    }
    pts.push(new THREE.Vector2(0, 0));
    const pedestal = new THREE.Mesh(new THREE.LatheGeometry(pts, 120), pedMat);
    root.add(pedestal);

    // gölge + renkli ışık yansıması (kaide üstü)
    const shadowTex = (function () {
      const c = document.createElement('canvas');
      c.width = 256; c.height = 256;
      const x = c.getContext('2d');
      x.filter = 'blur(18px)';
      x.fillStyle = 'rgba(0,0,0,0.9)';
      rr(x, 56, 74, 144, 108, 20);
      x.fill();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      return t;
    })();
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(BW * 1.85, BD * 2.7),
      new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.75, toneMapped: false })
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.002;
    root.add(shadow);

    const causticMat = new THREE.MeshBasicMaterial({
      map: radialTexture([[0, 'rgba(255,255,255,0.9)'], [0.35, 'rgba(255,255,255,0.35)'], [1, 'rgba(255,255,255,0)']], 1, 1),
      color: new THREE.Color(p0.accent),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
      opacity: 0.55
    });
    const caustic = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 1.1), causticMat);
    caustic.rotation.x = -Math.PI / 2;
    caustic.position.set(0.05, 0.004, BD / 2 + 0.42);
    root.add(caustic);

    // şişe
    const bottle = new THREE.Group();
    root.add(bottle);

    const glass = new THREE.Mesh(roundedBox(BW, BH, BD, 0.13, 6), glassMat);
    glass.position.y = BH / 2;
    glass.renderOrder = 3;
    bottle.add(glass);

    const LIN = 0.075, LBASE = 0.17;
    const liqH = BH * 0.86 - LBASE;
    liqU.uTop.value = liqH;
    const liquid = new THREE.Mesh(softBox(BW - LIN * 2, liqH, BD - LIN * 2, 0.07), liquidMat);
    liquid.position.y = LBASE;
    bottle.add(liquid);

    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.011, BH - 0.12, 10), tubeMat);
    tube.position.set(0, (BH - 0.12) / 2 + 0.1, -0.02);
    tube.renderOrder = 1;
    bottle.add(tube);

    const label = new THREE.Mesh(new THREE.PlaneGeometry(LABEL_W, LABEL_H), labelMat);
    label.position.set(0, BH * 0.5, BD / 2 - 0.012);
    label.renderOrder = 2;
    bottle.add(label);

    // altın boyun + sprey başlığı
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.08, 64), goldMat);
    collar.position.y = BH + 0.04;
    bottle.add(collar);
    const collarRing = new THREE.Mesh(new THREE.TorusGeometry(0.235, 0.012, 12, 64), goldMat);
    collarRing.rotation.x = Math.PI / 2;
    collarRing.position.y = BH + 0.004;
    bottle.add(collarRing);
    // basılabilen sprey başlığı (sap + düğme + püskürtme deliği tek grup)
    const PRESS_DEPTH = 0.085;
    const actuator = new THREE.Group();
    bottle.add(actuator);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 24), goldMat);
    stem.position.y = BH + 0.13;
    actuator.add(stem);
    const button = new THREE.Mesh(new THREE.CylinderGeometry(0.165, 0.165, 0.13, 64), goldMat);
    button.position.y = BH + 0.24;
    actuator.add(button);
    const buttonTop = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.016, 12, 64), goldMat);
    buttonTop.rotation.x = Math.PI / 2;
    buttonTop.position.y = BH + 0.305;
    actuator.add(buttonTop);
    const nozzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.02, 20), darkMat);
    nozzle.rotation.z = Math.PI / 2;
    nozzle.position.set(0.165, BH + 0.25, 0);
    actuator.add(nozzle);
    let press = 0;

    // kapak
    const capGroup = new THREE.Group();
    const CAP_Y = BH + 0.08;
    capGroup.position.y = CAP_Y;
    const CAP_H = 0.64;
    const cap = new THREE.Mesh(roundedBox(0.6, CAP_H, 0.48, 0.07, 5), capMat);
    cap.position.y = CAP_H / 2;
    capGroup.add(cap);
    const capBand = new THREE.Mesh(roundedBox(0.61, 0.035, 0.49, 0.015, 2), goldMat);
    capBand.position.y = 0.03;
    capGroup.add(capBand);
    bottle.add(capGroup);

    /* ---------- Işıklar ---------- */
    scene.add(new THREE.HemisphereLight(0xfff3e6, 0x1a0d08, 0.4));
    // ayrı tepe spot ışığı kaldırıldı (bir ışık daha = her pikselde bir hesap daha); anahtar ışık güçlendirildi
    const key = new THREE.DirectionalLight(0xfff6ec, 2.3);
    key.position.set(-2.5, 7, 4.5);
    scene.add(key);
    const rimL = new THREE.PointLight(0xffffff, 14, 14, 2);
    rimL.position.set(-2.8, 2.6, -2.4);
    scene.add(rimL);
    const rimR = new THREE.PointLight(0xffffff, 18, 14, 2);
    rimR.position.set(2.9, 2.1, -2.2);
    scene.add(rimR);

    /* ---------- Durum ---------- */
    const target = { shiftX: 0.2, shiftY: 0, camZ: 9.6, camY: 1.75, lookY: 1.08, rotY: -0.42, cap: 0, beam: 1, intro: 0 };
    const cur = Object.assign({}, target);
    let scrollShift = 0;

    const colT = { bg: new THREE.Color(F.hero.bg), glow: new THREE.Color(F.hero.glow) };
    const liqTarget = new THREE.Color(p0.liquid);
    const capTarget = new THREE.Color(p0.cap);
    const accTarget = new THREE.Color(p0.accent);
    const mouse = { x: 0, y: 0, sx: 0, sy: 0 };

    let perfIdx = 0, desired = 0, spinT = 1, spinAngle = 0, swapped = true;

    function applyPerfumeInstant(i) {
      const p = perfumes[i];
      perfIdx = desired = i;
      spinT = 1; spinAngle = 0; swapped = true;
      labelMat.map = labelMat.emissiveMap = labelTextures[i];
      labelMat.needsUpdate = true;
      liqTarget.set(p.liquid); liqCur.copy(liqTarget); applyLiquid();
      capTarget.set(p.cap); capMat.color.copy(capTarget);
      accTarget.set(p.accent); causticMat.color.copy(accTarget);
    }

    function startSpin() {
      spinT = 0;
      swapped = false;
      const p = perfumes[desired];
      liqTarget.set(p.liquid);
      capTarget.set(p.cap);
      accTarget.set(p.accent);
    }

    function setPerfume(i, instant) {
      if (instant) { applyPerfumeInstant(i); return; }
      if (i === desired) return;
      desired = i;
      if (spinT >= 1) startSpin();
      else if (!swapped) {
        const p = perfumes[desired];
        liqTarget.set(p.liquid); capTarget.set(p.cap); accTarget.set(p.accent);
      }
    }

    function setColors(bgHex, glowHex, instant) {
      colT.bg.set(bgHex);
      colT.glow.set(glowHex);
      if (instant) { bgU.uBg.value.copy(colT.bg); bgU.uGlow.value.copy(colT.glow); }
    }

    function setTarget(o) { Object.assign(target, o); }
    function snap() { Object.assign(cur, target); }

    /* ---------- Projeksiyon yardımcıları ---------- */
    const v3 = new THREE.Vector3();
    function toUv(x, y, z, out) {
      v3.set(x, y, z);
      root.localToWorld(v3);
      v3.project(camera);
      out.set((v3.x + 1) / 2, (v3.y + 1) / 2);
      return out;
    }
    const tmp2 = new THREE.Vector2();
    function updateBgProjection(aspect) {
      bgU.uAspect.value = aspect;
      toUv(0, 1.15, -1.6, bgU.uGlowPos.value);
      toUv(0, -PH, 0.15, bgU.uFloorPos.value);
      toUv(0, BH + 0.55, -1.4, bgU.uBeamPos.value);
      bgU.uHorizon.value = toUv(0, -PH, -2.4, tmp2).y;
    }

    function resize() {
      size.w = window.innerWidth;
      size.h = window.innerHeight;
      renderer.setPixelRatio(DPR);
      renderer.setSize(size.w, size.h, false);
      camera.aspect = size.w / size.h;
      camera.updateProjectionMatrix();
    }
    resize();

    /* ---------- Kare güncelleme ---------- */
    function update(dt, time) {
      for (const k in target) cur[k] = damp(cur[k], target[k], k === 'intro' ? 1.4 : 4.5, dt);
      mouse.sx = damp(mouse.sx, mouse.x, 2.5, dt);
      mouse.sy = damp(mouse.sy, mouse.y, 2.5, dt);

      const kc = 1 - Math.exp(-3 * dt);
      bgU.uBg.value.lerp(colT.bg, kc);
      bgU.uGlow.value.lerp(colT.glow, kc);
      rimL.color.copy(bgU.uGlow.value).lerp(WHITE, 0.35);
      rimR.color.copy(rimL.color);

      const kl = 1 - Math.exp(-2.4 * dt);
      liqCur.lerp(liqTarget, kl);
      applyLiquid();
      capMat.color.lerp(capTarget, kl);
      causticMat.color.lerp(accTarget, kl);

      // dönüş + etiket değişimi
      let wavePulse = 0;
      if (spinT < 1) {
        spinT = Math.min(1, spinT + dt / 1.25);
        spinAngle = easeInOut(spinT) * TAU;
        wavePulse = Math.sin(spinT * Math.PI) * 0.9;
        if (!swapped && spinT >= 0.5) {
          labelMat.map = labelMat.emissiveMap = labelTextures[desired];
          labelMat.needsUpdate = true;
          perfIdx = desired;
          swapped = true;
        }
        if (spinT >= 1) {
          spinAngle = 0;
          if (desired !== perfIdx) startSpin();
        }
      }
      liqU.uTime.value = time;
      liqU.uWave.value = 0.1 + wavePulse;

      root.position.y = (1 - cur.intro) * -0.4;
      bottle.rotation.y = cur.rotY + Math.sin(time * 0.45) * 0.06 + mouse.sx * 0.2 + spinAngle;
      capGroup.position.set(-cur.cap * 0.4, CAP_Y + cur.cap * 2.0, cur.cap * 0.1);
      capGroup.rotation.set(cur.cap * 0.15, cur.cap * 0.7, -cur.cap * 0.35);
      actuator.position.y = -press * PRESS_DEPTH;
      // basınca şişe hafifçe kaideye çöker
      bottle.position.y = -press * 0.012;
      bottle.scale.set(1 + press * 0.004, 1 - press * 0.006, 1 + press * 0.004);

      camera.position.set(mouse.sx * 0.28, cur.camY - mouse.sy * 0.16, cur.camZ);
      camera.lookAt(0, cur.lookY, 0);
      camera.setViewOffset(size.w, size.h, -cur.shiftX * size.w, (cur.shiftY + scrollShift) * size.h, size.w, size.h);
      camera.updateMatrixWorld();
      root.updateMatrixWorld();

      renderer.toneMappingExposure = 0.25 + 0.8 * cur.intro;
      bgU.uDim.value = 0.2 + 0.8 * cur.intro;
      bgU.uBeam.value = cur.beam;
      bgU.uTime.value = time;
      updateBgProjection(size.w / size.h);
    }

    function render() { renderer.render(scene, camera); }

    /* Sprey ağzının ekran konumu (CSS px) */
    function nozzleScreen() {
      v3.set(0.18, BH + 0.25 - press * PRESS_DEPTH, 0);
      bottle.localToWorld(v3);
      v3.project(camera);
      return { x: (v3.x + 1) / 2 * size.w, y: (1 - v3.y) / 2 * size.h };
    }

    /* Ürün kartları için tek kare görüntü */
    function snapshot(i, w, h) {
      const keepIdx = perfIdx;
      renderer.setPixelRatio(1);
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.clearViewOffset();
      camera.updateProjectionMatrix();

      applyPerfumeInstant(i);
      const p = perfumes[i];
      root.position.y = 0;
      bottle.rotation.y = -0.34;
      capGroup.position.set(0, CAP_Y, 0);
      capGroup.rotation.set(0, 0, 0);
      liqU.uWave.value = 0.08;
      camera.position.set(0, 1.45, 8.9);
      camera.lookAt(0, 0.9, 0);
      camera.updateMatrixWorld();
      root.updateMatrixWorld(true);

      bgU.uBg.value.set(p.cardBg);
      bgU.uGlow.value.set(p.cardGlow);
      bgU.uBeam.value = 0;
      bgU.uDim.value = 1;
      rimL.color.copy(bgU.uGlow.value).lerp(new THREE.Color(1, 1, 1), 0.35);
      rimR.color.copy(rimL.color);
      renderer.toneMappingExposure = 1.05;
      updateBgProjection(w / h);

      renderer.render(scene, camera);
      const url = canvas.toDataURL('image/jpeg', 0.9);

      applyPerfumeInstant(keepIdx);
      bgU.uBg.value.copy(colT.bg);
      bgU.uGlow.value.copy(colT.glow);
      resize();
      return url;
    }

    return {
      renderer,
      update,
      render,
      resize,
      snapshot,
      setTarget,
      setColors,
      setPerfume,
      snap,
      nozzleScreen,
      setScrollShift(v) { scrollShift = v; },
      setPress(v) { press = v; },
      setQuality(pr) {
        const next = Math.min(pr, window.devicePixelRatio || 1);
        if (Math.abs(next - DPR) < 0.01) return;
        DPR = next;
        resize();
      },
      get quality() { return DPR; },
      pointer(x, y) { mouse.x = x; mouse.y = y; },
      get perfume() { return perfIdx; }
    };
  };
})();
