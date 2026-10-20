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

  /* ---------- Hero video ---------- */
  var video = d.querySelector('.hero-media video');
  if (video) {
    var conn = navigator.connection || {};
    var saveData = conn.saveData || /(^|-)2g/.test(conn.effectiveType || '');
    if (reduce || saveData) {
      video.remove(); video = null;
    } else {
      var portrait = w.matchMedia('(max-aspect-ratio: 1/1)').matches;
      var base = video.getAttribute(portrait ? 'data-src-portrait' : 'data-src-landscape');
      var ua = navigator.userAgent;
      var safari = /Safari/.test(ua) && !/Chrome|Chromium|Edg|Android/.test(ua);
      var webm = !safari && video.canPlayType('video/webm; codecs="vp9"') === 'probably';
      video.src = base + (webm ? '.webm' : '.mp4');
      video.muted = true; video.defaultMuted = true; video.setAttribute('muted', '');
      video.preload = 'auto';
      var markPlaying = function () { video.classList.add('is-playing'); };
      video.addEventListener('playing', markPlaying, { once: true });
      if (!REC) {
        var p = video.play();
        if (p && p.catch) p.catch(function () { /* autoplay blocked: poster stays */ });
      }
      d.addEventListener('visibilitychange', function () {
        if (!video || REC) return;
        if (d.hidden) video.pause(); else video.play().catch(function () {});
      });
    }
  }

  /* ---------- In-page loops (process step, gallery): load + play only while on screen ---------- */
  var lazyVids = [].slice.call(d.querySelectorAll('video[data-lazy-video]'));
  if (lazyVids.length) {
    var c2 = navigator.connection || {};
    var lite = reduce || c2.saveData || /(^|-)2g/.test(c2.effectiveType || '');
    var ua2 = navigator.userAgent, saf2 = /Safari/.test(ua2) && !/Chrome|Chromium|Edg|Android/.test(ua2);
    if (!lite && 'IntersectionObserver' in w) {
      var io = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          var v = e.target;
          if (e.isIntersecting) {
            if (!v.src) {
              var webm2 = !saf2 && v.canPlayType('video/webm; codecs="vp9"') === 'probably';
              v.src = v.getAttribute('data-lazy-video') + (webm2 ? '.webm' : '.mp4');
              v.muted = true; v.setAttribute('muted', '');
            }
            if (!REC) { var pp = v.play(); if (pp && pp.catch) pp.catch(function () {}); }
          } else if (v.src) { v.pause(); }
        });
      }, { rootMargin: '200px 0px' });
      lazyVids.forEach(function (v) { io.observe(v); });
    }
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
        ST.create({ trigger: hero, start: 'top top', end: '+=70%', pin: true, pinSpacing: true, scrub: 0.6, animation: out, anticipatePin: 1 });
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
