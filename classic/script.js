/* ==========================================================
   IEEE TEMS — motion & interactions
   GSAP drives every transform; Lenis smooths scrolling on capable
   devices. A performance tier ("lite") switches off the costly
   extras on low-end hardware or when the frame rate drops.
   ========================================================== */
(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const gsap = window.gsap;
  const ST = window.ScrollTrigger;
  const root = document.documentElement;
  const canHover = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------- performance tier ---------- */
  const conn = navigator.connection || {};
  // ?lite in the URL forces the low-end tier (handy for testing)
  let lite = new URLSearchParams(location.search).has('lite') || (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4 || !!conn.saveData;
  if (lite) root.classList.add('lite');
  const liteHooks = [];
  function goLite() {
    if (lite) return;
    lite = true;
    root.classList.add('lite');
    liteHooks.forEach(fn => fn());
  }

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  // Broken image → let the media's colour layer show instead
  $$('img').forEach(img => {
    const hide = () => { img.style.visibility = 'hidden'; };
    if (img.complete && img.naturalWidth === 0) hide();
    img.addEventListener('error', hide);
  });

  /* ======================================================
     BACKGROUND — silk ribbons on a canvas (echoing the TEMS
     ring ribbons). 30 fps normally, 12 fps in lite mode.
     ====================================================== */
  const bg = (() => {
    const c = $('#bgCanvas');
    const ctx = c.getContext('2d');
    let w = 0, h = 0, grads = [], last = 0;
    const ribbons = [
      { cy: .64, amp: .075, n: 30, spread: 4.6, ph: .4, f: .8, speed: .16, x0: -.05, a: '47,134,255', b: '109,184,255' },
      { cy: .22, amp: .05, n: 18, spread: 3.4, ph: 2.2, f: 1.1, speed: -.12, x0: .42, a: '47,134,255', b: '109,184,255' },
    ];
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, lite ? 1 : 1.5);
      w = innerWidth; h = innerHeight;
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      grads = ribbons.map(r => {
        const g = ctx.createLinearGradient(r.x0 * w, 0, w, 0);
        g.addColorStop(0, `rgba(${r.a},0)`);
        g.addColorStop(.3, `rgba(${r.a},.75)`);
        g.addColorStop(.7, `rgba(${r.b},.55)`);
        g.addColorStop(1, `rgba(${r.b},0)`);
        return g;
      });
    };
    const draw = time => {
      const t = time / 1000;
      const shift = -Math.min(window.scrollY, 4000) * .05;
      ctx.clearRect(0, 0, w, h);
      ctx.lineWidth = 1;
      ribbons.forEach((r, k) => {
        const n = lite ? Math.round(r.n * .6) : r.n;
        const step = lite ? 28 : 18;
        for (let i = 0; i < n; i++) {
          const mid = 1 - Math.abs(i - n / 2) / (n / 2);
          const gold = k === 0 && (i === Math.round(n / 2) || i === Math.round(n / 2) + 3);
          ctx.strokeStyle = gold ? 'rgba(233,178,32,.55)' : grads[k];
          ctx.globalAlpha = gold ? .9 : .25 + .6 * mid;
          ctx.beginPath();
          for (let x = r.x0 * w; x <= w + step; x += step) {
            const tx = x / w;
            const y = r.cy * h + shift * (k ? .6 : 1) +
              r.amp * h * Math.sin(tx * Math.PI * 2 * r.f + r.ph + t * r.speed) +
              (i - n / 2) * r.spread * (.2 + .8 * Math.abs(Math.sin(tx * Math.PI * 1.3 + r.ph * .7 + t * r.speed * .7)));
            x === r.x0 * w ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
      });
      ctx.globalAlpha = 1;
    };
    const loop = now => {
      if (now - last >= (lite ? 83 : 33)) { last = now; draw(now); }
      requestAnimationFrame(loop);
    };
    resize();
    addEventListener('resize', resize);
    requestAnimationFrame(loop);
    liteHooks.push(resize);
  })();

  /* ---------- one globe across three panels: share the image frame ---------- */
  const panelBox = $('#panels');
  const syncPanels = () => {
    panelBox.style.setProperty('--pw', `${panelBox.clientWidth}px`);
    $$('.panel', panelBox).forEach(p => p.style.setProperty('--off', `${p.offsetLeft}px`));
  };
  syncPanels();
  addEventListener('resize', syncPanels);

  /* ---------- non-motion UI (works without GSAP) ---------- */
  const header = $('#header'), progress = $('#progress');
  const onScroll = y => {
    header.classList.toggle('is-scrolled', y > 40);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
  };

  const nav = $('#nav'), burger = $('#burger');
  const setNav = open => {
    nav.classList.toggle('is-open', open);
    burger.innerHTML = `<svg><use href="#i-${open ? 'close' : 'menu'}"/></svg>`;
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
  };
  burger.addEventListener('click', () => setNav(!nav.classList.contains('is-open')));
  $$('.nav .has-menu > a').forEach(a => a.addEventListener('click', e => {
    if (innerWidth > 1100) return;
    e.preventDefault();
    a.parentElement.classList.toggle('is-expanded');
  }));

  // trial build: placeholder links (official IEEE pages) do nothing
  $$('a[data-placeholder]').forEach(a => a.addEventListener('click', e => e.preventDefault()));

  const search = $('#searchOverlay'), modal = $('#modal');
  $('#searchBtn').addEventListener('click', () => { search.classList.add('is-open'); setTimeout(() => $('input', search).focus(), 50); });
  $('#searchClose').addEventListener('click', () => search.classList.remove('is-open'));
  search.addEventListener('click', e => { if (e.target === search) search.classList.remove('is-open'); });
  $('#storyBtn').addEventListener('click', () => modal.classList.add('is-open'));
  $('#modalClose').addEventListener('click', () => modal.classList.remove('is-open'));
  modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('is-open'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') { search.classList.remove('is-open'); modal.classList.remove('is-open'); } });

  // search this page: jump to the first matching heading or text and highlight it
  const searchMsg = $('#searchMsg');
  $('#searchForm').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('input', search).value.trim().toLowerCase();
    if (!q) return;
    const hit = $$('main h2, main h3, main p, main li, .event-body p').find(el => el.offsetParent !== null && el.textContent.toLowerCase().includes(q));
    if (!hit) { searchMsg.textContent = `No results for “${q}” on this page.`; return; }
    searchMsg.textContent = '';
    search.classList.remove('is-open');
    const ev = hit.closest('.event');
    if (ev && window.__showEvent) window.__showEvent(ev);
    const go = () => { hit.classList.add('search-hit'); setTimeout(() => hit.classList.remove('search-hit'), 2400); };
    // centre the whole card/tile the match sits in, not just the matching line
    const box = hit.closest('.event, .card, .slant, .pub, .news-card, .tile') || hit;
    const offset = -Math.max(90, (innerHeight - box.getBoundingClientRect().height) / 2);
    if (window.__lenis) window.__lenis.scrollTo(box, { offset, duration: 1.2, onComplete: go });
    else { box.scrollIntoView({ behavior: 'smooth', block: 'center' }); setTimeout(go, 600); }
  });
  $('#year').textContent = new Date().getFullYear();

  if (!gsap || !ST) {
    // Fallback: no motion libraries, show the static page.
    $('#intro').remove();
    document.body.classList.remove('is-loading');
    addEventListener('scroll', () => onScroll(scrollY), { passive: true });
    $$('[data-count]').forEach(n => { n.textContent = n.dataset.count; });
    return;
  }

  gsap.registerPlugin(ST);
  gsap.defaults({ ease: 'power3.out' });

  /* ---------- smooth scroll (capable devices only) ---------- */
  let lenis = null;
  const nativeScroll = () => onScroll(scrollY);
  if (window.Lenis && !lite) {
    lenis = new window.Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)), smoothWheel: true });
    lenis.on('scroll', e => { ST.update(); onScroll(e.scroll); });
    window.__lenis = lenis;
    gsap.ticker.add(t => lenis && lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  } else {
    addEventListener('scroll', nativeScroll, { passive: true });
  }
  liteHooks.push(() => {
    if (!lenis) return;
    lenis.destroy(); lenis = null; window.__lenis = null;
    gsap.ticker.lagSmoothing(500, 33);
    addEventListener('scroll', nativeScroll, { passive: true });
  });
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    const id = a.getAttribute('href');
    if (id.length < 2) { e.preventDefault(); return; }
    const target = $(id);
    if (!target) return;
    e.preventDefault();
    setNav(false);
    if (lenis) lenis.scrollTo(target, { offset: -80, duration: 1.3 });
    else target.scrollIntoView({ behavior: 'smooth' });
  }));

  /* ---------- background drift (transform-only, full tier) ---------- */
  const bgTweens = [];
  function startBackground() {
    if (lite) return;
    const drift = (el, x, y, s, d) => bgTweens.push(gsap.to(el, { x, y, scale: s, duration: d, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    drift('.b1', 160, 120, 1.15, 19);
    drift('.b2', -140, 160, .9, 23);
    drift('.b3', 120, -110, 1.2, 21);
    bgTweens.push(gsap.to('.bg-grid', { x: 64, y: 64, duration: 14, ease: 'none', repeat: -1 }));
  }
  liteHooks.push(() => bgTweens.forEach(t => t.kill()));

  /* ======================================================
     INTRO — ribbons from the corners coil into the rings,
     the wordmark slides out, the logo docks in the header
     ====================================================== */
  const RINGS = [ // matches #tems-rings (viewBox 0 0 108 160, rotated 8° about 50,80)
    { cx: 14, rx: 4.5, ry: 26, fi: 1.4, bi: 3.1, color: '#22a6e0', from: 'bl' },
    { cx: 31, rx: 8,   ry: 47, fi: 2.4, bi: 5.5, color: '#1b8ed3', from: 'tl' },
    { cx: 53, rx: 11,  ry: 63, fi: 3.3, bi: 7.6, color: '#1f9ddc', from: 'tr' },
    { cx: 80, rx: 14,  ry: 72, fi: 4.2, bi: 9.6, color: '#1466a8', from: 'br' },
  ];
  const CY = 80, ROT = 8, RCX = 50;
  const svgEl = (tag, attrs, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  function revealSite() {
    document.body.classList.remove('is-loading');
    const intro = $('#intro'); if (intro) intro.remove();
    if (lenis) lenis.start();
    ST.refresh();
    // once things settle, measure the real frame rate and drop to lite if it struggles
    setTimeout(() => {
      let frames = 0; const t0 = performance.now();
      const probe = now => {
        if (++frames < 60) return requestAnimationFrame(probe);
        if ((now - t0) / frames > 28) goLite();
      };
      requestAnimationFrame(probe);
    }, 1800);
  }

  function runIntro() {
    const intro = $('#intro'), svg = $('#introRings'), logo = $('#introLogo');
    const gs = svgEl('g', { transform: `rotate(${ROT} ${RCX} ${CY})` }, svg);
    const crescents = svgEl('g', { opacity: 0 });
    RINGS.forEach(r => svgEl('path', { fill: 'url(#ringBack)', d: `M${r.cx} ${CY - r.ry}A${r.rx} ${r.ry} 0 0 1 ${r.cx} ${CY + r.ry}A${r.bi} ${r.ry} 0 0 0 ${r.cx} ${CY - r.ry}Z` }, crescents));
    RINGS.forEach(r => svgEl('path', { fill: 'url(#ringFront)', d: `M${r.cx} ${CY - r.ry}A${r.rx} ${r.ry} 0 0 0 ${r.cx} ${CY + r.ry}A${r.fi} ${r.ry} 0 0 1 ${r.cx} ${CY - r.ry}Z` }, crescents));

    // rings start centred on screen on their own
    const rb = svg.getBoundingClientRect(), lb = logo.getBoundingClientRect();
    gsap.set(logo, { x: (lb.left + lb.width / 2) - (rb.left + rb.width / 2) });
    gsap.set('#introLogo .logo-title, #introLogo .logo-sub span', { xPercent: -110 });
    gsap.set('.intro-glow', { scale: 0, opacity: 0 });

    const box = svg.getBoundingClientRect();
    const s = box.height / 160, rad = -ROT * Math.PI / 180;
    const toLocal = (X, Y) => {
      const x = (X - box.left) / s - RCX, y = (Y - box.top) / s - CY;
      return { x: x * Math.cos(rad) - y * Math.sin(rad) + RCX, y: x * Math.sin(rad) + y * Math.cos(rad) + CY };
    };
    const W = innerWidth, H = innerHeight, pad = Math.max(W, H) * .08;
    const corners = { tl: [-pad, -pad], tr: [W + pad, -pad], bl: [-pad, H + pad], br: [W + pad, H + pad] };
    const sw = Math.max(1, 3 / s);

    const ribbons = RINGS.map((r, i) => {
      const grp = svgEl('g', {}, gs);
      const P = toLocal(...corners[r.from]);
      const E = { x: r.cx, y: CY - r.ry };
      const dx = E.x - P.x, dy = E.y - P.y, d = Math.hypot(dx, dy);
      const nx = -dy / d, ny = dx / d;
      const swirl = (i % 2 ? 1 : -1) * d * .2;
      const M = { x: P.x + dx * .55 + nx * swirl, y: P.y + dy * .55 + ny * swirl };
      const tx = (dx / d) * Math.cos(.9) - (dy / d) * Math.sin(.9), ty = (dx / d) * Math.sin(.9) + (dy / d) * Math.cos(.9);
      const tl = d * .22, k = r.ry * 1.3;
      const tail = `M${P.x} ${P.y}C${P.x + dx * .3 - nx * swirl * .6} ${P.y + dy * .3 - ny * swirl * .6} ${M.x - tx * tl} ${M.y - ty * tl} ${M.x} ${M.y}` +
                   `C${M.x + tx * tl} ${M.y + ty * tl} ${E.x + k} ${E.y - k * .25} ${E.x} ${E.y}`;
      const full = tail + `A${r.ry} ${r.ry} 0 1 0 ${r.cx} ${CY + r.ry}A${r.ry} ${r.ry} 0 1 0 ${E.x} ${E.y}`;
      const mk = (stroke, w, op) => svgEl('path', { class: 'ribbon', d: full, stroke, 'stroke-width': w, opacity: op }, grp);
      const halo = mk(r.color, Math.max(12, sw * 4), .12);
      const trail = mk('#f6c536', Math.max(2.4, sw * .8), .9);
      const main = mk(r.color, Math.max(5, sw * 1.6), 1);
      const hi = mk('#ffffff', Math.max(1.3, sw * .45), .75);
      const tmp = svgEl('path', { d: tail }, gs);
      const tailLen = tmp.getTotalLength(); tmp.remove();
      const total = main.getTotalLength(), loopLen = total - tailLen;
      [halo, main, hi].forEach(p => gsap.set(p, { strokeDasharray: `${loopLen} ${total * 2}`, strokeDashoffset: loopLen }));
      gsap.set(trail, { strokeDasharray: `${loopLen * .55} ${total * 2}`, strokeDashoffset: loopLen * .55 });
      return { grp, strokes: [halo, main, hi], trail, tailLen, loopLen, r };
    });
    gs.appendChild(crescents);

    const tl = gsap.timeline({ delay: .3 });
    ribbons.forEach((rb, i) => {
      const at = i * .16;
      tl.to(rb.strokes, { strokeDashoffset: -rb.tailLen, duration: 1.7, ease: 'power2.inOut' }, at)
        .to(rb.trail, { strokeDashoffset: -rb.tailLen - rb.loopLen * .45, duration: 1.85, ease: 'power2.inOut' }, at + .05)
        .to(rb.trail, { opacity: 0, duration: .5, ease: 'power1.out' }, at + 1.5)
        // full circles roll onto their edge → narrow rings
        .to(rb.grp, { scaleX: rb.r.rx / rb.r.ry, svgOrigin: `${rb.r.cx} ${CY}`, duration: .95, ease: 'power3.inOut' }, at + 1.6);
    });
    const coiled = 1.6 + .16 * 3 + .7;
    tl.to('.intro-glow', { scale: 1, opacity: 1, duration: 1.1, ease: 'power2.out' }, coiled - .35)
      .to(crescents, { opacity: 1, duration: .6, ease: 'power1.inOut' }, coiled)
      .to(ribbons.flatMap(r => r.strokes), { opacity: 0, duration: .6, ease: 'power1.inOut' }, coiled + .1)
      .to(logo, { x: 0, duration: 1.2, ease: 'power3.inOut' }, coiled + .55)
      .to('#introLogo .logo-title', { xPercent: 0, duration: 1.15, ease: 'power3.out' }, coiled + .75)
      .to('#introLogo .logo-sub span', { xPercent: 0, duration: 1.15, ease: 'power3.out', stagger: .1 }, coiled + .9)
      .to('.intro-glow', { opacity: .3, scale: .85, duration: 1.2, ease: 'sine.inOut' }, coiled + .9)
      .add(dock, coiled + 2.6);

    function dock() {
      const target = $('#siteLogo').getBoundingClientRect(), cur = logo.getBoundingClientRect();
      const subHidden = getComputedStyle($('#siteLogo .logo-sub')).display === 'none';
      const d = gsap.timeline({ onComplete: revealSite });
      d.to(logo, { x: gsap.getProperty(logo, 'x') + target.left - cur.left, y: target.top - cur.top, scale: target.height / cur.height, transformOrigin: '0 0', duration: 1.2, ease: 'power3.inOut' }, 0)
       .to('.intro-glow', { opacity: 0, duration: .5 }, 0)
       .to('#introLogo .logo-sub', { opacity: subHidden ? 0 : 1, duration: .5 }, 0)
       .to('.intro-bg', { opacity: 0, duration: 1, ease: 'power2.inOut' }, .2)
       .add(heroIn(), .45)
       .add(initReveals, 1.1);
    }
  }

  /* ======================================================
     HERO — copy, then panels: shell → colour → image → text
     ====================================================== */
  // split headline into masked words
  (() => {
    const h = $('#heroTitle');
    const wrap = node => [...node.childNodes].forEach(n => {
      if (n.nodeType === 3) {
        const frag = document.createDocumentFragment();
        n.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) { frag.append(' '); return; }
          const w = document.createElement('span'); w.className = 'w';
          const s = document.createElement('span'); s.textContent = part;
          w.append(s); frag.append(w);
        });
        n.replaceWith(frag);
      } else if (n.nodeType === 1) wrap(n);
    });
    wrap(h);
  })();

  const heroCopy = $('#heroCopy');
  const words = $$('#heroTitle .w > span');
  const heroBits = [$('.hero-eyebrow'), $('.hero-lead'), $('.hero-cta')];
  const panels = $$('.panel');
  const metaCards = $$('.meta-card');
  const noteSpans = $$('.script-note span');
  const notePath = $('.script-note path');
  const skew = innerWidth <= 760 ? 9 : 14;   // gentler slant on phones keeps the panels inside their column

  gsap.set(heroCopy, { clipPath: 'inset(8% 8% 8% 8% round 26px)', opacity: 0 });
  gsap.set(words, { yPercent: 115 });
  gsap.set(heroBits, { y: 22, opacity: 0 });
  panels.forEach(p => {
    gsap.set($('.panel-shape', p), { skewX: -skew, clipPath: 'inset(100% 0% 0% 0% round 12px)' });
    gsap.set($('.media', p), { skewX: skew, clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set($('.globe-frame', p), { scale: 1.5, yPercent: 6 });
    gsap.set($$('figcaption span', p), { y: 14, opacity: 0 });
  });
  gsap.set(metaCards, { y: 24, opacity: 0 });
  gsap.set(noteSpans, { clipPath: 'inset(0% 100% 0% 0%)' });
  const noteLen = notePath.getTotalLength();
  gsap.set(notePath, { strokeDasharray: noteLen, strokeDashoffset: noteLen });

  function heroIn() {
    const tl = gsap.timeline();
    tl.to(heroCopy, { clipPath: 'inset(0% 0% 0% 0% round 20px)', opacity: 1, duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' }, 0)
      .to(words, { yPercent: 0, duration: 1.2, ease: 'expo.out', stagger: .05 }, .2)
      .to(heroBits, { y: 0, opacity: 1, duration: 1, stagger: .09 }, .55);
    panels.forEach((p, i) => {
      const at = .15 + i * .13;
      tl.to($('.panel-shape', p), { clipPath: 'inset(0% 0% 0% 0% round 12px)', duration: 1.1, ease: 'expo.inOut' }, at)
        .to($('.media', p), { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'expo.inOut' }, at + .22)
        .to($('.globe-frame', p), { scale: 1.12, yPercent: 0, duration: 1.8, ease: 'expo.out' }, at + .4)
        .to($$('figcaption span', p), { y: 0, opacity: 1, duration: .8, stagger: .08 }, at + .95);
    });
    tl.to(metaCards, { y: 0, opacity: 1, duration: .9, stagger: .1 }, 1.1)
      .to(noteSpans, { clipPath: 'inset(0% 0% 0% 0%)', duration: .9, ease: 'power2.inOut', stagger: .16 }, 1.3)
      .to(notePath, { strokeDashoffset: 0, duration: 1, ease: 'power2.inOut' }, 1.95)
      .add(heroIdle, 2.2);
    return tl;
  }

  function heroIdle() {
    const idle = [];
    // slow breathing on the globe (same timing on all three so the slices stay aligned)
    idle.push(gsap.to(panels.map(p => $('.globe-frame', p)), { scale: 1.2, duration: 10, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    if (!lite) {
      // light pulses travel along the globe's arcs
      $$('.net-arcs path').forEach((p, i) => idle.push(gsap.fromTo(p, { strokeDashoffset: 1170 }, { strokeDashoffset: 0, duration: 3.2 + (i % 5) * .5, ease: 'none', repeat: -1, delay: (i % 7) * .45 })));
      idle.push(gsap.to('.net-dots circle', { opacity: .35, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1, stagger: { each: .2, from: 'random' } }));
      metaCards.forEach((c, i) => idle.push(gsap.to(c, { y: -6, duration: 3.2 + i * .6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * .4 })));
    } else {
      gsap.set('.net-arcs', { opacity: 0 });
    }
    // only run the loops while the hero is on screen
    ST.create({ trigger: '.hero', start: 'top bottom', end: 'bottom top', onToggle: self => idle.forEach(t => self.isActive ? t.resume() : t.pause()) });
    liteHooks.push(() => { idle.slice(1).forEach(t => t.kill()); gsap.to('.net-arcs', { opacity: 0, duration: .4 }); });
    countUp();

    if (!canHover) return;
    const hv = $('#heroVisual');
    const movers = panels.map((p, i) => ({
      px: gsap.quickTo($('.globe-frame', p), 'x', { duration: 1.2, ease: 'power3.out' }),
      py: gsap.quickTo($('.globe-frame', p), 'y', { duration: 1.2, ease: 'power3.out' }),
      sx: gsap.quickTo(p, 'x', { duration: 1, ease: 'power3.out' }),
      depth: 1 + i * .5,
    }));
    hv.addEventListener('pointermove', e => {
      if (lite) return;
      const r = hv.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      movers.forEach(m => { m.px(x * -22); m.py(y * -14); m.sx(x * 6 * m.depth); });
    });
    hv.addEventListener('pointerleave', () => movers.forEach(m => { m.px(0); m.py(0); m.sx(0); }));
    panels.forEach(p => {
      p.addEventListener('pointerenter', () => !lite && gsap.to(p, { y: -8, duration: .6 }));
      p.addEventListener('pointerleave', () => gsap.to(p, { y: 0, duration: .8 }));
    });
  }

  /* ======================================================
     BENTO REVEALS — tile shell → colour layer → image → content
     ====================================================== */
  const CONTENT = '.eyebrow, h2, h3, :scope > p, .pubs-intro > p, .history-intro > p, .card-body p, .btn, .link-arrow, .card-ic, .card-go, .pill, .stat-ic, .stat b, .stat small, .news-card, .newsletter, .event, .pub, .journal, .timeline li, .focus-wrap, .carousel-nav, .cta-copy p, .cta-copy .hero-cta, .cta-note';
  // slanted cards: counter-skew lives in GSAP so it composes with the reveal tweens
  $$('.slant .media, .slant .card-body, .slant .card-go').forEach(el => gsap.set(el, { skewX: 14 }));
  const bentoTl = new Map();
  $$('[data-bento]').forEach(tile => {
    const media = $(':scope > .media, :scope > .slant-shape > .media, :scope > .cta-panel > .media', tile);
    const img = media && $('img', media);
    let content = $$(CONTENT, tile);
    content = content.filter(el => !content.some(o => o !== el && o.contains(el)));
    const tl = gsap.timeline({ paused: true });
    tl.fromTo(tile, { clipPath: 'inset(7% 7% 7% 7% round 24px)', opacity: 0, y: 46 },
                    { clipPath: 'inset(0% 0% 0% 0% round 12px)', opacity: 1, y: 0, duration: 1.2, ease: 'expo.out', clearProps: 'clipPath' }, 0);
    if (media) {
      tl.fromTo(media, { clipPath: 'inset(100% 0% 0% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', duration: 1, ease: 'expo.inOut' }, .15);
      // CTA image is owned by its scroll parallax, so only reveal its layer
      if (img && !tile.classList.contains('cta')) tl.fromTo(img, { scale: 1.4, yPercent: 8, opacity: 0 }, { scale: 1, yPercent: 0, opacity: 1, duration: 1.6, ease: 'expo.out' }, .5);
    }
    if (content.length) tl.from(content, { y: 20, opacity: 0, duration: .85, stagger: .05, ease: 'power3.out' }, media ? .7 : .3);
    bentoTl.set(tile, tl);
  });
  // created once the intro hands over, so nothing plays hidden behind it
  const initReveals = () => ST.batch('[data-bento]', {
    start: 'top 98%', once: true,
    onEnter: batch => {
      let n = 0;
      batch.forEach(t => {
        // tiles already scrolled past (e.g. after a long jump) appear instantly; the rest stagger, capped
        if (t.getBoundingClientRect().bottom < 0) { bentoTl.get(t).progress(1); return; }
        gsap.delayedCall(Math.min(n++, 4) * .1, () => bentoTl.get(t).play());
      });
    },
  });

  /* ---------- counters ---------- */
  let counted = false;
  function countUp() {
    if (counted) return; counted = true;
    $$('[data-count]').forEach(n => {
      const o = { v: 0 }, end = +n.dataset.count;
      ST.create({ trigger: n, start: 'top 92%', once: true, onEnter: () => gsap.to(o, {
        v: end, duration: 2.2, ease: 'power3.out',
        onUpdate: () => { n.textContent = Math.round(o.v); },
      }) });
    });
  }

  /* ---------- subtle tilt on image tiles (fine pointer, full tier only) ---------- */
  if (canHover) {
    $$('.tilt').forEach(el => {
      gsap.set(el, { transformPerspective: 1000 });
      const rx = gsap.quickTo(el, 'rotationX', { duration: .8, ease: 'power3.out' });
      const ry = gsap.quickTo(el, 'rotationY', { duration: .8, ease: 'power3.out' });
      const img = $('.media img', el);
      el.addEventListener('pointermove', e => {
        if (lite) return;
        const r = el.getBoundingClientRect();
        rx(((e.clientY - r.top) / r.height - .5) * -6);
        ry(((e.clientX - r.left) / r.width - .5) * 6);
      });
      el.addEventListener('pointerenter', () => img && gsap.to(img, { scale: 1.06, duration: 1.1, overwrite: 'auto' }));
      el.addEventListener('pointerleave', () => {
        rx(0); ry(0);
        if (img) gsap.to(img, { scale: 1, duration: 1.1, overwrite: 'auto' });
      });
    });
  }

  /* ---------- magnetic buttons (fine pointer, full tier) ---------- */
  if (canHover) {
    $$('.magnetic').forEach(b => {
      const mx = gsap.quickTo(b, 'x', { duration: .6, ease: 'power3.out' });
      const my = gsap.quickTo(b, 'y', { duration: .6, ease: 'power3.out' });
      b.addEventListener('pointermove', e => {
        if (lite) return;
        const r = b.getBoundingClientRect();
        mx((e.clientX - r.left - r.width / 2) * .2);
        my((e.clientY - r.top - r.height / 2) * .3);
      });
      b.addEventListener('pointerleave', () => { mx(0); my(0); });
    });
  }

  /* ---------- parallax inside the CTA image ---------- */
  $$('.cta-media img').forEach(img => gsap.fromTo(img, { yPercent: -8, scale: 1.15 }, {
    yPercent: 8, ease: 'none', scrollTrigger: { trigger: img.closest('.cta'), start: 'top bottom', end: 'bottom top', scrub: 1 },
  }));

  /* ======================================================
     EVENTS CAROUSEL
     ====================================================== */
  (() => {
    const wrap = $('#carousel'), track = $('#track'), dotsEl = $('#dots');
    const cards = $$('.event', track);
    let page = 0, auto;
    const perView = () => innerWidth <= 520 ? 1 : innerWidth <= 760 ? 2 : 3;
    const pages = () => Math.ceil(cards.length / perView());
    const step = () => cards[1].offsetLeft - cards[0].offsetLeft;
    const xFor = p => -Math.min(p * perView(), cards.length - perView()) * step();
    const renderDots = () => {
      dotsEl.innerHTML = '';
      for (let i = 0; i < pages(); i++) {
        const b = document.createElement('button');
        b.setAttribute('aria-label', `Show events page ${i + 1}`);
        b.addEventListener('click', () => go(i));
        dotsEl.appendChild(b);
      }
    };
    const go = (i, instant) => {
      const n = pages();
      page = (i + n) % n;
      gsap.to(track, { x: xFor(page), duration: instant ? 0 : 1.1, ease: 'expo.inOut', overwrite: true });
      $$('button', dotsEl).forEach((d, k) => d.classList.toggle('is-active', k === page));
      schedule();
    };
    const schedule = () => { if (auto) auto.kill(); auto = gsap.delayedCall(5.5, () => go(page + 1)); };
    $('#prev').addEventListener('click', () => go(page - 1));
    $('#next').addEventListener('click', () => go(page + 1));
    wrap.addEventListener('pointerenter', () => auto && auto.pause());
    wrap.addEventListener('pointerleave', () => auto && auto.resume());

    // drag with live follow, then snap; a drag must not also open the card's link
    let sx = null, base = 0, dragged = false;
    wrap.addEventListener('click', e => { if (dragged) { e.preventDefault(); dragged = false; } }, true);
    wrap.addEventListener('dragstart', e => e.preventDefault());
    wrap.addEventListener('pointerdown', e => {
      sx = e.clientX; base = gsap.getProperty(track, 'x');
      gsap.killTweensOf(track); wrap.classList.add('is-dragging');
    });
    addEventListener('pointermove', e => { if (sx !== null) gsap.set(track, { x: base + (e.clientX - sx) * .9 }); });
    addEventListener('pointerup', e => {
      if (sx === null) return;
      const dx = e.clientX - sx; sx = null; wrap.classList.remove('is-dragging');
      dragged = Math.abs(dx) > 6;
      go(Math.abs(dx) > 60 ? page + (dx < 0 ? 1 : -1) : page);
    });

    let pv = perView();
    addEventListener('resize', () => { if (perView() !== pv) { pv = perView(); renderDots(); page = 0; } go(page, true); });
    renderDots(); go(0, true);
    // lets the page search bring a matching conference card into view
    window.__showEvent = card => go(Math.floor(cards.indexOf(card) / perView()));
  })();

  /* ---------- go ---------- */
  startBackground();
  let started = false;
  const start = () => { if (started) return; started = true; runIntro(); };
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('800 40px "Source Sans 3"'), document.fonts.load('400 40px "Source Sans 3"')]).then(start, start);
  }
  setTimeout(start, 900);
})();
