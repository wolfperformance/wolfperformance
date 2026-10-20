/* Wolf Performance — motion + UI (v4)
   GSAP + ScrollTrigger + SplitText + Lenis, vendored in assets/vendor.
   Everything degrades: no JS / no GSAP / reduced motion => fully visible static page. */
(function () {
  'use strict';
  var d = document, root = d.documentElement, w = window;
  w.__wolfMotion = 1;
  var reduce = w.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var REC = /[?&]rec=1/.test(location.search);
  var fine = w.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var mobileMQ = w.matchMedia('(max-width: 900px)');
  var hasGSAP = !!(w.gsap && w.ScrollTrigger);
  var motion = !reduce && !w.__wolfMotionFailsafe && hasGSAP;
  if (!motion) root.classList.remove('js-motion');
  var isHome = d.body.classList.contains('page-home');

  /* ---------- Buttons: wrap label for magnetic inner motion ---------- */
  d.querySelectorAll('.btn').forEach(function (b) {
    if (b.querySelector('.btn-label')) return;
    var s = d.createElement('span'); s.className = 'btn-label';
    while (b.firstChild) s.appendChild(b.firstChild);
    b.appendChild(s);
  });

  /* ---------- Nav ---------- */
  var header = d.querySelector('.site-header');
  var toggle = d.querySelector('.nav-toggle');
  var lenis = null;
  function setNav(open) {
    if (!header) return;
    header.classList.toggle('nav-open', open);
    root.classList.toggle('nav-is-open', open);
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    root.style.overflow = open ? 'hidden' : '';
    if (lenis) open ? lenis.stop() : lenis.start();
  }
  if (toggle) toggle.addEventListener('click', function () { setNav(!header.classList.contains('nav-open')); });
  d.querySelectorAll('.nav-links a').forEach(function (a) { a.addEventListener('click', function () { setNav(false); }); });
  d.addEventListener('keydown', function (e) { if (e.key === 'Escape') setNav(false); });
  var here = (location.pathname.split('/').pop() || 'index.html');
  d.querySelectorAll('.nav-links a').forEach(function (a) { if (a.getAttribute('href') === here) a.setAttribute('aria-current', 'page'); });

  /* ---------- Package cards preselect the quick-quote service ---------- */
  d.querySelectorAll('[data-pick]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = d.getElementById('q-want'); if (!sel) return;
      var v = a.getAttribute('data-pick');
      for (var i = 0; i < sel.options.length; i++) if (sel.options[i].text === v) { sel.selectedIndex = i; break; }
    });
  });

  /* ---------- City field: select of all areas + "Other city (type it)" -> text input.
     Without JS the text input (name="area") is the field. With JS exactly one enabled control carries name="area". ---------- */
  d.querySelectorAll('[data-area-field]').forEach(function (f) {
    var sel = f.querySelector('select'), selLabel = f.querySelector('.area-sel-label'),
        wrap = f.querySelector('.area-other'), txt = wrap && wrap.querySelector('input'), txtLabel = wrap && wrap.querySelector('label');
    if (!sel || !txt) return;
    sel.hidden = false; sel.disabled = false; if (selLabel) selLabel.hidden = false;
    if (txtLabel && txtLabel.getAttribute('data-js-label')) txtLabel.textContent = txtLabel.getAttribute('data-js-label');
    txt.removeAttribute('list');
    function sync(focus) {
      var other = sel.value === '__other';
      wrap.hidden = !other;
      sel.setAttribute('aria-expanded', other ? 'true' : 'false');
      if (other) { sel.removeAttribute('name'); sel.required = false; txt.name = 'area'; txt.required = true; txt.disabled = false; if (focus) txt.focus(); }
      else { sel.name = 'area'; sel.required = true; txt.removeAttribute('name'); txt.required = false; txt.disabled = true; }
    }
    sel.addEventListener('change', function () { sync(true); });
    sync(false);
  });

  /* ---------- Header state + mobile bar ---------- */
  var bar = d.querySelector('.mobile-cta-bar');
  var heroCtas = d.querySelector('.hero .hero-ctas');
  var lastY = w.scrollY || 0;
  function onScroll(y) {
    if (header) {
      header.classList.toggle('is-scrolled', y > 30);
      if (!header.classList.contains('nav-open')) {
        if (y > w.innerHeight * 0.9 && y > lastY + 6) header.classList.add('is-hidden');
        else if (y < lastY - 6 || y < 120) header.classList.remove('is-hidden');
      }
    }
    if (bar && heroCtas) {
      var r = heroCtas.getBoundingClientRect();
      bar.classList.toggle('is-tucked', r.bottom > 0);
    }
    lastY = y;
  }
  if (!motion) {
    w.addEventListener('scroll', function () { onScroll(w.scrollY); }, { passive: true });
    onScroll(w.scrollY);
  }

  /* ---------- Video helpers ----------
     Muted inline loops are allowed to autoplay everywhere, but the first play() can still be
     rejected or interrupted (iOS Low Power Mode, a pending load, DOM moves). So: retry on
     canplay/loadeddata, ~1.5s later, and on the first user interaction; a frame watchdog
     restarts playback if frames stop being presented. Reduced motion only disables
     parallax/pinning; Save-Data / 2G skips video entirely (poster stays). */
  var conn = navigator.connection || {};
  var saveData = !!conn.saveData || /(^|-)2g/.test(conn.effectiveType || '');
  var uaS = navigator.userAgent;
  var isWebKit = /iPhone|iPad|iPod|CriOS|FxiOS|EdgiOS/.test(uaS) ||
    (/Safari/.test(uaS) && !/Chrome|Chromium|Edg|OPR|Android|Firefox/.test(uaS)) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  function canWebm(v) { return !isWebKit && v.canPlayType('video/webm; codecs="vp9"') === 'probably'; }
  function prepMuted(v) {
    v.muted = true; v.defaultMuted = true; v.setAttribute('muted', '');
    v.playsInline = true; v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
  }
  function tryPlay(v) {
    if (!v || REC || d.hidden || !v.isConnected || v.__wantPause) return;
    if (!v.paused && !v.ended) return;
    prepMuted(v);
    try { var p = v.play(); if (p && p.catch) p.catch(function () { /* retried below */ }); } catch (e) {}
  }
  var interactQueue = [];
  function onFirstInteraction(v) {
    interactQueue.push(v);
    if (interactQueue.length > 1) return;
    var evs = ['touchstart', 'pointerdown', 'scroll', 'keydown'];
    var fire = function () {
      evs.forEach(function (n) { w.removeEventListener(n, fire, { passive: true, capture: true }); });
      interactQueue.forEach(tryPlay);
    };
    evs.forEach(function (n) { w.addEventListener(n, fire, { passive: true, capture: true, once: true }); });
  }
  function robustPlay(v) {
    if (v.__robust) { tryPlay(v); return; }
    v.__robust = true;
    var kick = function () { tryPlay(v); };
    v.addEventListener('canplay', kick); v.addEventListener('loadeddata', kick);
    onFirstInteraction(v);
    tryPlay(v);
    setTimeout(function () { if (v.paused || v.currentTime === 0) kick(); }, 1500);
    // Frame watchdog: if playback claims to run but no frame was presented for a while, restart it.
    if ('requestVideoFrameCallback' in v) {
      var last = 0, lastT = -1;
      var onFrame = function () { last = Date.now(); v.requestVideoFrameCallback(onFrame); };
      v.requestVideoFrameCallback(onFrame);
      setInterval(function () {
        if (d.hidden || v.paused || v.__wantPause || v.readyState < 1) { lastT = -1; return; }
        var r = v.getBoundingClientRect();
        if (r.bottom <= 0 || r.top >= (w.innerHeight || 800) || r.width === 0) { last = Date.now(); lastT = -1; return; }
        var noFrames = last && Date.now() - last > 2000 && v.readyState >= 3;
        var stalled = lastT >= 0 && lastT === v.currentTime;
        if (noFrames || stalled) {
          last = Date.now();
          // A decoder stuck on one frame: nudge the playhead a frame forward, then restart playback.
          if (stalled && v.duration && isFinite(v.duration)) { try { v.currentTime = (v.currentTime + 0.04) % v.duration; } catch (e) {} }
          v.pause(); tryPlay(v);
        }
        lastT = v.currentTime;
      }, 2000);
    }
  }
  w.__wolfVideo = { tryPlay: tryPlay };

  /* ---------- Hero video ---------- */
  var video = d.querySelector('.hero-media video');
  if (video) {
    if (saveData) {
      video.removeAttribute('autoplay'); video.pause();
      [].slice.call(video.querySelectorAll('source')).forEach(function (s) { s.remove(); });
      video.removeAttribute('src'); try { video.load(); } catch (e) {}
      video.remove(); video = null;
    } else {
      prepMuted(video);
      if (REC) { video.removeAttribute('autoplay'); video.autoplay = false; video.pause(); }
      // <source> order is mp4 first, so WebKit and most browsers start on H.264 straight from the HTML
      // (no src swap = no reload/abort). Only correct the source when it is wrong for this viewport
      // (old browsers that ignore media="" on <source>) or when the browser can't play H.264.
      var portrait = w.matchMedia('(max-aspect-ratio: 1/1)').matches;
      var base = video.getAttribute(portrait ? 'data-src-portrait' : 'data-src-landscape');
      var fixSrc = function () {
        var cur = video.currentSrc || '';
        if (cur && cur.indexOf(base.split('/').pop() + '.') === -1) {
          video.src = base + (canWebm(video) || !video.canPlayType('video/mp4') ? '.webm' : '.mp4');
          video.load();
        }
      };
      if (video.currentSrc) fixSrc(); else video.addEventListener('loadstart', fixSrc, { once: true });
      var markPlaying = function () { video.classList.add('is-playing'); };
      if (!video.paused && video.readyState > 2) markPlaying();
      video.addEventListener('playing', markPlaying, { once: true });
      if (!REC) robustPlay(video);
      d.addEventListener('visibilitychange', function () {
        if (!video || REC) return;
        if (d.hidden) video.pause(); else tryPlay(video);
      });
    }
  }

  /* ---------- In-page loops (process step, gallery): load + play only while on screen ---------- */
  var lazyVids = [].slice.call(d.querySelectorAll('video[data-lazy-video]'));
  if (lazyVids.length && !saveData && 'IntersectionObserver' in w) {
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        var v = e.target;
        if (e.isIntersecting) {
          v.__wantPause = false;
          if (!v.getAttribute('src')) {
            prepMuted(v);
            v.preload = 'auto';
            v.src = v.getAttribute('data-lazy-video') + (canWebm(v) ? '.webm' : '.mp4');
          }
          if (!REC) robustPlay(v);
        } else if (v.getAttribute('src')) { v.__wantPause = true; v.pause(); }
      });
    }, { rootMargin: '200px 0px' });
    lazyVids.forEach(function (v) { io.observe(v); });
    d.addEventListener('visibilitychange', function () {
      lazyVids.forEach(function (v) { if (d.hidden) { if (v.getAttribute('src')) v.pause(); } else if (v.getAttribute('src') && !v.__wantPause) tryPlay(v); });
    });
  }

  /* ---------- Static fallback (no GSAP / reduced motion) ---------- */
  function staticProcess() {
    var steps = d.querySelectorAll('.step');
    steps.forEach(function (s) { s.classList.add('is-active'); });
  }
  if (!motion) { staticProcess(); return; }

  /* ===================== MOTION ===================== */
  var gsap = w.gsap, ST = w.ScrollTrigger, Split = w.SplitText;
  gsap.registerPlugin(ST);
  if (Split) gsap.registerPlugin(Split);
  gsap.config({ nullTargetWarn: false });
  gsap.defaults({ ease: 'expo.out', duration: 0.9 });
  if (REC) gsap.ticker.lagSmoothing(0);

  if (!REC && fine && w.Lenis) {
    lenis = new w.Lenis({ duration: 1.05, easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); }, smoothWheel: true, wheelMultiplier: 1 });
    lenis.on('scroll', ST.update);
    gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
    gsap.ticker.lagSmoothing(0);
    d.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href'); if (id.length < 2) return;
        var t = d.querySelector(id); if (!t) return;
        e.preventDefault(); lenis.scrollTo(t, { offset: -80 });
      });
    });
  }

  // scroll progress hairline + header state
  var prog = d.createElement('div'); prog.className = 'scroll-progress'; prog.setAttribute('aria-hidden', 'true'); d.body.appendChild(prog);
  ST.create({ start: 0, end: 'max', onUpdate: function (self) { prog.style.transform = 'scaleX(' + self.progress.toFixed(4) + ')'; onScroll(self.scroll()); } });
  onScroll(w.scrollY);

  function splitLines(el) {
    if (!Split) return null;
    try { return new Split(el, { type: 'lines', mask: 'lines', linesClass: 'split-line' }); } catch (e) { return null; }
  }

  function start() {
    var mm = gsap.matchMedia();

    /* ---------- Home hero: entrance ---------- */
    var hero = d.querySelector('.hero');
    if (hero) {
      var h1 = hero.querySelector('h1');
      var inner = hero.querySelector('.hero-media-inner');
      var others = hero.querySelectorAll('[data-hero]:not(h1)');
      var hLines = h1.querySelectorAll('.li');
      var tl = gsap.timeline({ delay: REC ? 0.2 : 0.1 });
      tl.fromTo(inner, { opacity: 0, scale: 1.16 }, { opacity: 1, scale: 1, duration: 2.2, ease: 'power3.out' }, 0)
        .add(function () { hero.classList.add('is-in'); }, 0.15)
        .set(h1, { opacity: 1 }, 0.25);
      if (hLines.length) {
        tl.fromTo(hLines, { yPercent: 118 }, { yPercent: 0, duration: 1.15, stagger: 0.1, ease: 'expo.out', clearProps: 'transform' }, 0.3);
      } else {
        tl.fromTo(h1, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1 }, 0.3);
      }
      tl.fromTo(others, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1, stagger: 0.08, clearProps: 'transform' }, 0.62);
      if (header) tl.fromTo(header, { yPercent: -100, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1, clearProps: 'transform,opacity' }, 0.35);

      // Leaving the hero: pinned on desktop, light parallax on mobile
      var copy = hero.querySelector('.hero-inner');
      var shade = hero.querySelector('.hero-shade');
      mm.add('(min-width: 901px)', function () {
        var out = gsap.timeline({ defaults: { ease: 'none' } });
        out.to(inner, { scale: 0.86, yPercent: -4 }, 0)
           .to(copy, { yPercent: -28, opacity: 0 }, 0)
           .to(shade, { opacity: 0.6 }, 0);
        ST.create({ trigger: hero, start: 'top top', end: '+=70%', pin: true, pinSpacer: hero.parentNode.classList.contains('hero-pin') ? hero.parentNode : undefined, pinSpacing: true, scrub: 0.6, animation: out, anticipatePin: 1 });
      });
      mm.add('(max-width: 900px)', function () {
        gsap.to(inner, { yPercent: 16, scale: 1.04, ease: 'none', scrollTrigger: { trigger: hero, start: 'top top', end: 'bottom top', scrub: true } });
        gsap.to(copy, { opacity: 0.2, yPercent: -8, ease: 'none', scrollTrigger: { trigger: hero, start: '35% top', end: 'bottom top', scrub: true } });
      });
    }

    /* ---------- Sub-page hero: entrance + parallax ---------- */
    var ph = d.querySelector('.page-hero');
    if (ph) {
      var phMedia = ph.querySelector('.page-hero-media img');
      var phH1 = ph.querySelector('h1');
      var phRest = ph.querySelectorAll('.breadcrumbs, .container > p, .container > .cta-inline');
      var t2 = gsap.timeline({ delay: 0.05 });
      if (phMedia) t2.fromTo(phMedia, { scale: 1.14, opacity: 0 }, { scale: 1, opacity: 1, duration: 1.8, ease: 'power3.out' }, 0);
      var ps = phH1 ? splitLines(phH1) : null;
      if (phH1) t2.set(phH1, { opacity: 1 }, 0.15);
      if (ps && ps.lines.length) t2.fromTo(ps.lines, { yPercent: 112 }, { yPercent: 0, duration: 1.1, stagger: 0.09, onComplete: function () { ps.revert(); } }, 0.15);
      t2.fromTo(phRest, { opacity: 0, y: 22 }, { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, clearProps: 'transform' }, 0.35);
      if (phMedia) gsap.to(phMedia, { yPercent: 14, ease: 'none', scrollTrigger: { trigger: ph, start: 'top top', end: 'bottom top', scrub: true } });
    }

    /* ---------- Masked line reveals for headings ---------- */
    d.querySelectorAll('[data-split], .prose > h2, .section-head h2, .cta-band h2, .form-card h2').forEach(function (el) {
      if (el.closest('.hero') || el.closest('.page-hero')) return;
      var s = splitLines(el);
      if (!s || !s.lines.length) return;
      gsap.fromTo(s.lines, { yPercent: 110 }, {
        yPercent: 0, duration: 1.05, stagger: 0.09, ease: 'expo.out',
        scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        onComplete: function () { s.revert(); }
      });
    });

    /* ---------- Statement: words light up with scroll ---------- */
    d.querySelectorAll('[data-words]').forEach(function (el) {
      if (!Split) return;
      var s = new Split(el, { type: 'words' });
      gsap.fromTo(s.words, { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.12,
        scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: 0.4 }
      });
    });

    /* ---------- Fade-up reveals (batched, staggered) ---------- */
    var revealEls = gsap.utils.toArray('[data-reveal], .reveal').filter(function (el) { return !el.closest('.hero') && !el.closest('.page-hero'); });
    gsap.set(revealEls, { y: 34 });
    ST.batch(revealEls, {
      start: 'top 90%', once: true,
      onEnter: function (batch) { gsap.to(batch, { opacity: 1, y: 0, duration: 0.95, stagger: 0.08, ease: 'expo.out', overwrite: true, clearProps: 'transform' }); }
    });

    /* ---------- Image reveals: transform-only curtain + settle ---------- */
    gsap.utils.toArray('[data-img-reveal], .media-figure picture, .step-img, .g-frame').forEach(function (frame) {
      var img = frame.querySelector('img'); if (!img) return;
      gsap.fromTo(frame, { yPercent: 8, opacity: 0 }, { yPercent: 0, opacity: 1, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: frame, start: 'top 92%', once: true }, clearProps: 'transform' });
    });

    /* ---------- Parallax depth on bento + backgrounds ---------- */
    gsap.utils.toArray('.tile-media img').forEach(function (img) {
      gsap.fromTo(img, { yPercent: -14 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: img.closest('.tile'), start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.utils.toArray('.reviews-bg, .closing-bg').forEach(function (bg) {
      gsap.fromTo(bg, { yPercent: -8 }, { yPercent: 8, ease: 'none', scrollTrigger: { trigger: bg.parentElement, start: 'top bottom', end: 'bottom top', scrub: true } });
    });
    gsap.utils.toArray('.media-figure img').forEach(function (img) {
      gsap.fromTo(img, { scale: 1.12, yPercent: -4 }, { scale: 1.12, yPercent: 4, ease: 'none', scrollTrigger: { trigger: img, start: 'top bottom', end: 'bottom top', scrub: true } });
    });

    /* ---------- Process: sticky story with image swap ---------- */
    var steps = gsap.utils.toArray('.step');
    var figs = gsap.utils.toArray('.process-media figure');
    var count = d.querySelector('.process-count b');
    var barI = d.querySelector('.process-bar i');
    var active = -1;
    function setStep(i) {
      if (i === active) return;
      var prev = active; active = i;
      steps.forEach(function (s, k) { s.classList.toggle('is-active', k === i); });
      if (count) count.textContent = '0' + (i + 1);
      if (barI) gsap.to(barI, { scaleX: (i + 1) / steps.length, duration: 0.8, ease: 'expo.out' });
      figs.forEach(function (f, k) {
        if (k === i) gsap.fromTo(f, { opacity: 0, scale: 1.08 }, { opacity: 1, scale: 1, duration: 0.9, ease: 'expo.out', overwrite: true, zIndex: 2 });
        else if (k === prev) gsap.to(f, { opacity: 0, duration: 0.9, delay: 0.1, ease: 'power2.out', overwrite: true, zIndex: 1 });
        else gsap.set(f, { opacity: 0, zIndex: 0 });
      });
    }
    if (steps.length) {
      setStep(0);
      steps.forEach(function (s, i) {
        ST.create({ trigger: s, start: 'top 58%', end: 'bottom 58%', onToggle: function (self) { if (self.isActive) setStep(i); } });
      });
    }

    /* ---------- Gallery: pinned horizontal rail (desktop) ---------- */
    var rail = d.querySelector('.gallery-rail');
    var pinEl = d.querySelector('.gallery-pin');
    if (rail && pinEl) {
      mm.add('(min-width: 901px)', function () {
        var dist = function () { return Math.max(0, rail.scrollWidth - w.innerWidth); };
        var tw = gsap.to(rail, { x: function () { return -dist(); }, ease: 'none' });
        ST.create({ trigger: pinEl, start: 'top top', end: function () { return '+=' + dist(); }, pin: true, scrub: 0.7, animation: tw, invalidateOnRefresh: true, anticipatePin: 1 });
        gsap.utils.toArray('.g-frame img').forEach(function (img) {
          gsap.fromTo(img, { xPercent: -6 }, { xPercent: 6, ease: 'none', scrollTrigger: { trigger: img.closest('.g-item'), containerAnimation: tw, start: 'left right', end: 'right left', scrub: true } });
        });
      });
    }

    /* ---------- Magnetic CTAs (fine pointers only) ---------- */
    if (fine) {
      d.querySelectorAll('.btn-lg, .nav-cta .btn, .tile-arrow').forEach(function (b) {
        var label = b.querySelector('.btn-label') || b.firstElementChild;
        var xTo = gsap.quickTo(b, 'x', { duration: 0.6, ease: 'power3' }), yTo = gsap.quickTo(b, 'y', { duration: 0.6, ease: 'power3' });
        var lx = label ? gsap.quickTo(label, 'x', { duration: 0.6, ease: 'power3' }) : null, ly = label ? gsap.quickTo(label, 'y', { duration: 0.6, ease: 'power3' }) : null;
        var host = b.classList.contains('tile-arrow') ? b.closest('.tile') : b;
        host.addEventListener('pointermove', function (e) {
          var r = b.getBoundingClientRect(); var dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          var k = b.classList.contains('tile-arrow') ? 0.08 : 0.22;
          xTo(dx * k); yTo(dy * k * 1.3); if (lx) { lx(dx * k * 0.5); ly(dy * k * 0.6); }
        });
        host.addEventListener('pointerleave', function () { xTo(0); yTo(0); if (lx) { lx(0); ly(0); } });
      });
    }

    /* ---------- Safety nets ---------- */
    // Nothing may stay hidden: anything above the fold line that missed its trigger is shown.
    function sweep() {
      var vh = w.innerHeight;
      revealEls.forEach(function (el) {
        if (gsap.getProperty(el, 'opacity') < 1 && el.getBoundingClientRect().top < vh * 0.9 && !gsap.isTweening(el)) gsap.to(el, { opacity: 1, y: 0, duration: 0.6, clearProps: 'transform' });
      });
    }
    ST.addEventListener('scrollEnd', sweep);
    w.addEventListener('load', function () { ST.refresh(); });
    // Safety net: ~1s after every ScrollTrigger refresh, make sure the hero loop is still running.
    ST.addEventListener('refresh', function () { setTimeout(function () { var hv = d.querySelector('.hero-media video'); if (hv) tryPlay(hv); }, 1000); });
    d.querySelectorAll('img[loading="lazy"]').forEach(function (img) { if (!img.complete) img.addEventListener('load', function () { ST.refresh(); }, { once: true }); });
    if (!REC) setTimeout(function () { sweep(); }, 2500);
    w.__wolfReady = true;
  }

  var fontsReady = d.fonts && d.fonts.ready ? d.fonts.ready : Promise.resolve();
  var started = false;
  function go() { if (started) return; started = true; try { start(); } catch (e) { root.classList.remove('js-motion'); staticProcess(); if (w.console) console.error(e); } }
  fontsReady.then(go);
  setTimeout(go, 1200);
})();
