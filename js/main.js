/* =========================================================================
   Jurkovičova Tepláreň — Cowork  |  Interactions
   ========================================================================= */
(function () {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Hero preloader: cascade the hero containers in top → bottom ------ */
  (function heroPreloader() {
    const root = document.documentElement;
    if (reduceMotion) { root.classList.add("is-loaded"); return; }
    // let the hidden initial state paint once, then trigger the staggered reveal
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { root.classList.add("is-loaded"); });
    });
  })();

  /* ---- Dynamic year + ALTO logo links (language-aware) ----------------- */
  (function siteChrome() {
    function apply() {
      var year = String(new Date().getFullYear());
      document.querySelectorAll(".js-year").forEach(function (el) { el.textContent = year; });
      var en = localStorage.getItem("jt-lang") === "en";
      var url = en ? "https://www.altorealestate.sk/en/" : "https://www.altorealestate.sk";
      document.querySelectorAll(".about__brand, .contact__brand").forEach(function (a) { a.href = url; });
    }
    apply();
    // re-apply after a language switch (i18n re-renders the footer copy + clears the year)
    document.addEventListener("langchanged", apply);
  })();

  /* ---- Welcome pop-up: first visit only (Figma 498:418) ----------------- */
  (function welcomePopup() {
    if (!document.getElementById("heroSlider")) return; // homepage only
    var KEY = "jt-welcome-seen";
    try { if (localStorage.getItem(KEY)) return; } catch (e) {}

    var STR = {
      sk: {
        title: '<span class="muted">Cowork koncept<br>Base4Work.sk </span>sa mení na Jurkovičovu tepláreň',
        desc: "Mení sa názov, nie to, čo máte radi. Coworkingové priestory, služby aj každodenný život komunity pokračujú ďalej.",
        cta: "Vitajte v Jurkovičovej teplárni",
        close: "Zavrieť"
      },
      en: {
        title: '<span class="muted">The cowork concept<br>Base4Work.sk </span>is becoming Jurkovičova Tepláreň',
        desc: "The name is changing — not what you love. The coworking spaces, services and everyday community life carry on.",
        cta: "Welcome to Jurkovičova Tepláreň",
        close: "Close"
      }
    };
    function lang() { try { return localStorage.getItem("jt-lang") === "en" ? "en" : "sk"; } catch (e) { return "sk"; } }

    var el = document.createElement("div");
    el.className = "welcome";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-modal", "true");

    function render() {
      var t = STR[lang()];
      el.setAttribute("aria-label", t.cta);
      el.innerHTML =
        '<div class="welcome__overlay" data-welcome-close></div>' +
        '<div class="welcome__dialog">' +
          '<div class="welcome__text">' +
            '<div class="welcome__copy">' +
              '<h2 class="welcome__title">' + t.title + "</h2>" +
              '<p class="welcome__desc">' + t.desc + "</p>" +
            "</div>" +
            '<button type="button" class="welcome__cta" data-welcome-close>' + t.cta + "</button>" +
          "</div>" +
          '<div class="welcome__img"><img src="images/offer/cowork-1.jpg" alt="" /></div>' +
          '<button type="button" class="welcome__x" data-welcome-close aria-label="' + t.close + '">' +
            '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>' +
          "</button>" +
        "</div>";
    }
    render();
    document.addEventListener("langchanged", function () { if (el.isConnected) render(); });

    function close() {
      try { localStorage.setItem(KEY, "1"); } catch (e) {}
      el.classList.remove("is-open");
      document.body.classList.remove("welcome-open");
      if (window.__lenis) window.__lenis.start();
      setTimeout(function () { el.remove(); }, reduceMotion ? 0 : 560);
      document.removeEventListener("keydown", onKey);
    }
    function onKey(e) { if (e.key === "Escape") close(); }

    el.addEventListener("click", function (e) {
      if (e.target.closest("[data-welcome-close]")) close();
    });
    document.addEventListener("keydown", onKey);

    document.body.appendChild(el);
    document.body.classList.add("welcome-open");
    if (window.__lenis) window.__lenis.stop();
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add("is-open"); }); });
  })();

  /* ---- iOS status-bar tint: match the section under the status bar ------ *
   * Safari paints the top status-bar area with the page background colour;
   * we keep <meta name="theme-color"> in sync with the section on screen so
   * the hero's terracotta (and every other section) bleeds up behind it.    */
  (function themeColorSync() {
    const meta = document.querySelector('meta[name="theme-color"]');
    const sections = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
    if (!meta || !sections.length) return;
    const bodyBg = getComputedStyle(document.body).backgroundColor;

    function toHex(c) {
      const m = c && c.match(/\d+/g);
      if (!m) return null;
      return "#" + m.slice(0, 3).map(function (n) {
        return ("0" + parseInt(n, 10).toString(16)).slice(-2);
      }).join("");
    }
    function hexOf(el) {
      const c = getComputedStyle(el).backgroundColor;
      return toHex((!c || c === "rgba(0, 0, 0, 0)" || c === "transparent") ? bodyBg : c);
    }

    // Cache each section's document-top offset + its (static) colour ONCE, so
    // the scroll handler does ZERO layout/style reads per frame. The old code
    // ran 11× getBoundingClientRect + getComputedStyle every frame — the main
    // cause of the choppy scroll.
    // authoritative scroll offset — Lenis when present (correct in both its
    // real-scroll and transform modes), else the native window scroll
    function scrollPos() { return window.__lenis ? window.__lenis.scroll : window.scrollY; }

    let tops = [], hexes = [];
    function measure() {
      const sy = scrollPos();
      tops = sections.map(function (el) { return el.getBoundingClientRect().top + sy; });
      hexes = sections.map(hexOf);
    }

    let last = "", lastIdx = -1;
    function update() {
      const y = scrollPos() + 1;
      let idx = 0;
      for (let i = 0; i < tops.length; i++) { if (tops[i] <= y) idx = i; else break; }
      if (idx === lastIdx) return;
      lastIdx = idx;
      const hex = hexes[idx];
      if (hex && hex !== last) { last = hex; meta.setAttribute("content", hex); }
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(function () { update(); ticking = false; });
      }
    }
    function remeasure() { measure(); lastIdx = -1; update(); }
    measure();
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", remeasure, { passive: true });
    window.addEventListener("load", remeasure);
  })();

  /* ---- Shared: directional image-wipe transition ----------------------- *
   * Reveals a new image over the current one with a clip-path wipe + a
   * subtle zoom-settle. dir: "next" | "prev" | "up".                       */
  function wipeSwap(container, baseImg, newSrc, dir) {
    if (!baseImg) return;
    if (reduceMotion || !container) { baseImg.src = newSrc; return; }
    // cancel an in-flight wipe so rapid clicks stay clean
    const prev = container.querySelector(".gallery-wipe");
    if (prev) {
      if (prev._anim) prev._anim.cancel();
      prev.remove();
    }

    const layer = document.createElement("img");
    layer.className = "gallery-wipe";
    layer.alt = "";
    layer.src = newSrc;
    container.appendChild(layer);

    const fromClip =
      dir === "prev" ? "inset(0 100% 0 0)" :
      dir === "up"   ? "inset(100% 0 0 0)" :
                       "inset(0 0 0 100%)";

    const DURATION = 1150;
    let done = false;
    function finish() {
      if (done) return;
      done = true;
      // base already has the (decoded) image, so swapping src shows no flash
      baseImg.src = newSrc;
      layer.remove();
    }

    const anim = layer.animate(
      [
        { clipPath: fromClip, transform: "scale(1.06)" },
        { clipPath: "inset(0 0 0 0)", transform: "scale(1)" }
      ],
      { duration: DURATION, easing: "cubic-bezier(0.16, 1, 0.3, 1)", fill: "both" }
    );
    layer._anim = anim;
    anim.onfinish = finish;
    // safety net: complete the swap even if the animation is throttled/paused
    setTimeout(finish, DURATION + 80);
  }

  /* ---- Shared: smooth accordion (true-height, bydiorama-style) ----------- *
   * accSwitch(items, openItem, bodySel, activeClass) opens `openItem` (none
   * when null) and closes the rest. Every body that changes is tweened from
   * its current on-screen height to its height in the FINAL layout:
   *  - the end-state classes are applied first and measured in one layout
   *    pass, so a flex-fill row lands exactly where it will stay (no snap);
   *  - the inner content is frozen at its final size while the body clips
   *    it, so nothing reflows or slides during the tween (a pure reveal);
   *  - the start value is the on-screen height, so re-toggling mid-tween
   *    simply continues from where it is.                                    */
  const ACC_DUR = 850;
  const ACC_EASE = "cubic-bezier(.4, 0, .2, 1)";
  function accSwitch(items, openItem, bodySel, activeClass) {
    const rows = items.map(function (it) {
      const body = it.querySelector(bodySel);
      return body ? { it: it, body: body, inner: body.firstElementChild,
                      cur: body.offsetHeight, op: getComputedStyle(body).opacity } : null;
    }).filter(Boolean);

    // 1) every row → its final state, no inline overrides (kill in-flight tweens)
    rows.forEach(function (r) {
      if (r.body._accEnd) { r.body.removeEventListener("transitionend", r.body._accEnd); clearTimeout(r.body._accTimer); r.body._accEnd = null; }
      r.it.classList.remove("is-animating");
      r.it.classList.toggle(activeClass, r.it === openItem);
      r.body.style.transition = "none";
      r.body.style.height = "";
      r.body.style.opacity = "";
      if (r.inner) r.inner.style.height = "";
    });
    if (reduceMotion) { rows.forEach(function (r) { r.body.style.transition = ""; }); return; }

    // 2) measure the final heights (one layout pass); only rows that move animate
    rows.forEach(function (r) { r.target = r.body.offsetHeight; });
    const moving = rows.filter(function (r) { return Math.abs(r.target - r.cur) > 0.5; });
    rows.forEach(function (r) { if (moving.indexOf(r) < 0) r.body.style.transition = ""; });
    if (!moving.length) return;

    // 3) freeze: body back at its on-screen height, content held at its larger
    //    (final when opening / current when closing) size so it never reflows
    moving.forEach(function (r) {
      r.it.classList.add("is-animating");
      if (r.inner) r.inner.style.height = Math.max(r.target, r.cur) + "px";
      r.body.style.height = r.cur + "px";
      r.body.style.opacity = r.op;
    });
    void document.body.offsetHeight;

    // 4) tween to the final heights
    moving.forEach(function (r) {
      const opening = r.target > r.cur;
      r.body.style.transition = "height " + ACC_DUR + "ms " + ACC_EASE + ", opacity " +
        (opening ? Math.round(ACC_DUR * 0.6) + "ms ease " + Math.round(ACC_DUR * 0.15) + "ms"
                 : Math.round(ACC_DUR * 0.45) + "ms ease");
      r.body.style.height = r.target + "px";
      r.body.style.opacity = opening ? "1" : "0";
      const end = function (e) {
        if (e && e.propertyName && e.propertyName !== "height") return;
        if (r.body._accEnd !== end) return;
        r.body.removeEventListener("transitionend", end);
        clearTimeout(r.body._accTimer);
        r.body._accEnd = null;
        r.it.classList.remove("is-animating");
        r.body.style.height = ""; r.body.style.transition = ""; r.body.style.opacity = "";
        if (r.inner) r.inner.style.height = "";
      };
      r.body._accEnd = end;
      r.body.addEventListener("transitionend", end);
      r.body._accTimer = setTimeout(end, ACC_DUR + 120);   // safety net (throttled tabs)
    });
  }

  /* ---- Shared: smooth anchor scroll (slow, eased) ---------------------- */
  (function () {
    const headerEl = document.querySelector(".site-header");
    // soft ease-in-out (gentle at BOTH ends) → an elegant glide into the anchor
    function easeInOutQuart(t) {
      return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
    }
    function scrollToY(targetY) {
      const startY = window.scrollY;
      const dist = targetY - startY;
      if (Math.abs(dist) < 2) return;
      // slower, distance-scaled, eased at both ends
      const duration = Math.min(2400, Math.max(1400, Math.abs(dist) * 0.9));
      let startTime = null;
      function step(now) {
        if (startTime === null) startTime = now;
        const p = Math.min(1, (now - startTime) / duration);
        window.scrollTo(0, startY + dist * easeInOutQuart(p));
        if (p < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    }
    document.addEventListener("click", function (e) {
      const link = e.target.closest('a[href^="#"]');
      if (!link) return;
      const id = link.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      const offset = headerEl ? headerEl.offsetHeight : 0;
      const y = target.getBoundingClientRect().top + window.scrollY - offset;
      if (reduceMotion) { window.scrollTo(0, y); }
      else if (window.__lenis) { window.__lenis.scrollTo(y, { duration: 2.2, easing: easeInOutQuart }); }
      else { scrollToY(y); }
      if (history.replaceState) history.replaceState(null, "", id);
    });
  })();

  /* ---- Smooth momentum scroll (Lenis) — desktop pointers only ---------- *
   * Gives the page a light, eased "weight" on wheel/trackpad. Mobile keeps
   * native momentum (smoothTouch is jittery); reduced-motion opts out.      */
  (function smoothScroll() {
    if (reduceMotion || typeof Lenis === "undefined") return;
    if (window.matchMedia("(pointer: coarse)").matches) return; // touch → native
    const lenis = new Lenis({
      // lerp (frame-rate-independent exponential smoothing) tracks the wheel far
      // more smoothly than duration+easing, which re-tweens on every discrete
      // wheel tick and reads as choppy. A low lerp gives an elegant, weighted glide.
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1
    });
    window.__lenis = lenis;
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
  })();

  /* ---- Scroll reveal: text & blocks ease up into view, once -------------- *
   * Slow expo-out fade + rise (CSS), triggered by IntersectionObserver.
   * Only below-the-fold elements are hidden, so nothing flashes on load.    */
  (function scrollReveal() {
    if (reduceMotion || !("IntersectionObserver" in window)) return;
    const SELECTORS = [
      ".pricing__title",
      ".events__title", ".events__lead", ".events__inc-title", ".inc-card",
      ".about__kicker", ".about__para",
      ".tour__title", ".tour__sub",
      ".faq__title", ".faq-item",
      ".contact__title", ".contact__lead",
      ".offer-item__title"
    ];
    const els = [];
    SELECTORS.forEach(function (sel) {
      document.querySelectorAll(sel).forEach(function (el) { els.push(el); });
    });
    if (!els.length) return;

    // stagger siblings that reveal together (title+lead, faq items, inc cards)
    els.forEach(function (el) { el.dataset.revealPending = "1"; });
    els.forEach(function (el) {
      const sibs = Array.prototype.slice.call(el.parentNode.children)
        .filter(function (c) { return c.dataset && c.dataset.revealPending; });
      const idx = sibs.indexOf(el);
      if (idx > 0) el.style.setProperty("--rd", (idx * 126) + "ms");
    });

    const io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.1 });

    const vh = window.innerHeight;
    els.forEach(function (el) {
      delete el.dataset.revealPending;
      // leave first-viewport elements visible (no hide → no flash)
      if (el.getBoundingClientRect().top < vh * 0.85) return;
      el.classList.add("reveal");
      io.observe(el);
    });

    // accordion divider lines draw in left→right (bydiorama-style): rows get
    // .line-reveal now (hidden, instant) and .line-in once scrolled into view,
    // staggered top→bottom within each list via --ld
    const lineItems = Array.prototype.slice.call(document.querySelectorAll(".offer-item, .evrow, .faq-item"));
    if (lineItems.length) {
      const lio = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (e.isIntersecting) { e.target.classList.add("line-in"); lio.unobserve(e.target); }
        });
      }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
      lineItems.forEach(function (el) {
        if (el.getBoundingClientRect().top < vh * 0.85) return;
        const sibs = Array.prototype.slice.call(el.parentNode.children);
        el.style.setProperty("--ld", (sibs.indexOf(el) * 110) + "ms");
        el.classList.add("line-reveal");
        lio.observe(el);
      });
    }
  })();

  /* ---- Header glass: off at the very top, fades in after first scroll --- */
  (function () {
    const THRESHOLD = 200;
    let ticking = false;
    function apply() {
      ticking = false;
      document.body.classList.toggle("hdr-glass", window.scrollY > THRESHOLD);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; window.requestAnimationFrame(apply); }
    }, { passive: true });
    apply();
  })();

  /* ---- Header: expanded menu dropdown ---------------------------------- */
  const menuToggle = document.getElementById("menuToggle");
  const menuClose = document.getElementById("menuClose");
  const navPanel = document.getElementById("navPanel");
  if (menuToggle && navPanel) {
    function setMenu(open) {
      document.body.classList.toggle("menu-open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
    }
    // stagger index for the roll-down — CSS delays each item by --i × 50ms
    navPanel.querySelectorAll(".nav-panel__link, .nav-panel__lang, .nav-panel__client").forEach(function (el, i) {
      el.style.setProperty("--i", i);
    });
    menuToggle.addEventListener("click", function (e) {
      e.stopPropagation();
      setMenu(!document.body.classList.contains("menu-open"));
    });
    if (menuClose) menuClose.addEventListener("click", function () { setMenu(false); });

    // close when a nav link is chosen
    navPanel.querySelectorAll("[data-nav], .nav-panel__link").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false); });
    });
    // close on Escape and outside click
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") setMenu(false);
    });
    document.addEventListener("click", function (e) {
      if (
        document.body.classList.contains("menu-open") &&
        !navPanel.contains(e.target) &&
        !menuToggle.contains(e.target)
      ) {
        setMenu(false);
      }
    });

    // language switch: active-state styling only — the actual SK/EN swap lives in js/i18n.js
    navPanel.querySelectorAll(".lang-btn").forEach(function (b) {
      b.addEventListener("click", function () {
        navPanel.querySelectorAll(".lang-btn").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
      });
    });
  }

  /* ---- Hero slider: autorotating expanding panels ---------------------- */
  const heroSlider = document.getElementById("heroSlider");
  if (heroSlider) {
    const cards = Array.prototype.slice.call(
      heroSlider.querySelectorAll(".hero-card")
    );
    let active = cards.findIndex((c) => c.classList.contains("is-active"));
    if (active < 0) active = 0;
    const INTERVAL = 4000;
    let timer = null;

    function setActive(i) {
      active = (i + cards.length) % cards.length;
      cards.forEach((c, idx) => c.classList.toggle("is-active", idx === active));
    }
    function next() { setActive(active + 1); }
    function play() {
      if (reduceMotion) return;   // §14: no auto-rotation under reduced motion
      stop();
      timer = setInterval(next, INTERVAL);
    }
    function stop() {
      if (timer) { clearInterval(timer); timer = null; }
    }

    // Click / hover to focus a panel
    cards.forEach((card, idx) => {
      card.addEventListener("mouseenter", function () {
        stop();
        setActive(idx);
      });
      card.addEventListener("mouseleave", play);
      card.addEventListener("click", function (e) {
        // let real links inside work normally
        if (e.target.closest("a")) return;
        setActive(idx);
      });
    });

    // Pause when the hero is off-screen
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((en) => (en.isIntersecting ? play() : stop()));
        },
        { threshold: 0.2 }
      );
      io.observe(heroSlider);
    } else {
      play();
    }

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      play();
    }
  }

  /* ---- Building section: scroll-linked headline reveal ----------------- */
  const building = document.getElementById("building");
  if (building) {
    const img = building.querySelector(".building__img");
    const overlay = building.querySelector(".building__overlay");
    const headline = building.querySelector(".building__headline");
    let ticking = false;

    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

    function update() {
      ticking = false;
      const rect = building.getBoundingClientRect();
      const vh = window.innerHeight;
      // progress: 0 when section top is near bottom of viewport,
      // 1 once it has scrolled up to ~25% from the top
      const start = vh * 0.9;
      const end = vh * 0.25;
      const p = clamp((start - rect.top) / (start - end), 0, 1);

      overlay.style.opacity = p;
      headline.style.opacity = p;
      headline.style.transform = "translateY(" + (1 - p) * 48 + "px)";
      // gentle zoom-out on the image as the headline appears
      img.style.transform =
        "translate(-50%, -50%) scale(" + (1.08 - p * 0.08).toFixed(4) + ")";
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---- Amenities headline: slides in from the sides to centre ---------- */
  const amHeading = document.getElementById("amenitiesHeading");
  if (amHeading && !reduceMotion) {
    const lineTop = amHeading.querySelector(".amenities__line--top");
    const lineBottom = amHeading.querySelector(".amenities__line--bottom");
    let ticking = false;
    function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
    function update() {
      ticking = false;
      const rect = amHeading.getBoundingClientRect();
      const vh = window.innerHeight;
      const start = vh * 0.95;
      const end = vh * 0.4;
      const p = clamp((start - rect.top) / (start - end), 0, 1);
      const e = 1 - Math.pow(1 - p, 3); // easeOutCubic
      const offset = Math.min(window.innerWidth * 0.22, 300) * (1 - e);
      lineTop.style.transform = "translateX(" + -offset + "px)";
      lineBottom.style.transform = "translateX(" + offset + "px)";
    }
    function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(update); } }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
  }

  /* ---- Amenities: floating thumbnail when hovering an amenity row ------- */
  const amHover = document.getElementById("amenitiesHover");
  if (amHover && window.matchMedia("(hover: hover)").matches) {
    const amHoverImg = amHover.querySelector("img");
    const amRows = document.querySelectorAll(".amenities__row[data-hover]");
    function moveHover(e) {
      // transform-based follow (no left/top layout thrash) — §11
      amHover.style.setProperty("--hx", e.clientX + "px");
      amHover.style.setProperty("--hy", e.clientY + "px");
    }
    amRows.forEach(function (row) {
      row.addEventListener("mouseenter", function () {
        const src = row.getAttribute("data-hover");
        if (amHoverImg.getAttribute("src") !== src) amHoverImg.setAttribute("src", src);
        amHover.classList.add("is-visible");
      });
      row.addEventListener("mousemove", moveHover);
      row.addEventListener("mouseleave", function () {
        amHover.classList.remove("is-visible");
      });
    });
  }

  /* ---- Offer section: accordion + per-category gallery ----------------- */
  const offerAccordion = document.getElementById("offerAccordion");
  const offerImg = document.getElementById("offerImg");
  if (offerAccordion && offerImg) {
    // 3 dedicated images per category
    const galleries = {
      cowork:  ["images/offer/cowork-1.jpg",  "images/offer/cowork-2.jpg",  "images/offer/cowork-3.jpg"],
      offices: ["images/offer/offices-1.jpg", "images/offer/offices-2.jpg", "images/offer/offices-3.jpg"],
      events:  ["images/offer/events-1.jpg",  "images/offer/events-2.jpg",  "images/offer/events-3.jpg"]
    };
    const items = Array.prototype.slice.call(
      offerAccordion.querySelectorAll(".offer-item")
    );
    let cat = "cowork";
    let idx = 0;

    const offerStage = offerImg.parentElement;

    function showImage(dir) {
      wipeSwap(offerStage, offerImg, galleries[cat][idx], dir || "up");
    }

    function selectCat(newCat) {
      cat = newCat;
      idx = 0;
      const target = items.filter(function (it) { return it.dataset.cat === cat; })[0];
      accSwitch(items, target, ".offer-item__body", "is-active");
      items.forEach(function (it) {
        it.querySelector(".offer-item__head").setAttribute("aria-expanded", String(it.dataset.cat === cat));
      });
      showImage("up");
    }

    items.forEach(function (it) {
      it.querySelector(".offer-item__head").addEventListener("click", function () {
        if (it.dataset.cat !== cat) selectCat(it.dataset.cat);
      });
    });

    // hero cards that link to #offer (anchor handler scrolls) also open their
    // category; the Events card now goes straight to #events, so it is skipped
    document.querySelectorAll(".hero-card[data-card]").forEach(function (card) {
      card.addEventListener("click", function () {
        if (card.getAttribute("href") !== "#offer") return;
        var c = card.dataset.card;
        if (galleries[c] && c !== cat) selectCat(c);
      });
    });

    offerAccordion
      .closest(".offer")
      .querySelectorAll(".offer__ctrl")
      .forEach(function (btn) {
        btn.addEventListener("click", function () {
          const dir = parseInt(btn.dataset.dir, 10);
          const len = galleries[cat].length;
          idx = (idx + dir + len) % len;
          showImage(dir > 0 ? "next" : "prev");
        });
      });
  }

  /* ---- Pricing: tabbed plan cards -------------------------------------- */
  const pricingCards = document.getElementById("pricingCards");
  if (pricingCards) {
    // Plan data + CTA strings come from js/i18n.js (per current language).
    function pdata() {
      return (window.JT_pricing && window.JT_pricing()) ||
        { cowork: [], offices: [], ctaInterested: "I am interested", ctaQuote: "Get a quote", ctaVR: "Explore in VR" };
    }
    let DATA = pdata();

    function coworkCard(c) {
      const tag = c.tag ? '<span class="price-card__tag">' + c.tag + "</span>" : "";
      const fromLine = c.from ? '<span class="price-card__from">' + c.from + "</span>" : "";
      const unit = c.unit ? '<span class="price-card__unit">' + c.unit + "</span>" : "";
      const items = c.features.map(function (f, i) {
        return (
          '<div class="price-card__item' + (i === 0 ? " price-card__item--strong" : "") + '">' +
          '<img src="images/icons/check-mark.svg" alt="" /><span>' + f + "</span></div>"
        );
      }).join("");
      const amen = (c.amen || []).map(function (a) {
        return (
          '<span class="price-card__amen-item" tabindex="0" aria-label="' + a.t + '">' +
          '<img src="images/icons/amen-' + a.i + '.svg" alt="" width="20" height="20" />' +
          '<span class="price-card__tip" role="tooltip">' + a.t + "</span></span>"
        );
      }).join("");
      const amenRow = amen ? '<div class="price-card__amen">' + amen + "</div>" : "";
      const pos = c.imgPos ? ' style="object-position:' + c.imgPos + '"' : "";
      // Figma 614:2724 — cover photo with the plan name on it, description,
      // desk-includes icons, price, then "I am interested" + "Explore in VR"
      return (
        '<article class="price-card">' +
          '<div class="price-card__cover">' +
            '<img src="' + c.image + '" alt="" width="1200" height="800" loading="lazy" decoding="async"' + pos + ' />' +
            '<div class="price-card__cover-row"><span class="price-card__name">' + c.name + "</span>" + tag + "</div>" +
          "</div>" +
          '<p class="price-card__desc">' + c.sub + "</p>" +
          amenRow +
          '<div class="price-card__price-block">' + fromLine +
            '<div class="price-card__price"><span class="price-card__amount">' + c.amount + "</span>" + unit + "</div>" +
          "</div>" +
          '<div class="price-card__actions">' +
            '<a class="price-card__cta" href="#contact" data-interest="coworking">' + DATA.ctaInterested + "</a>" +
            '<a class="price-card__vr" href="' + c.vr + '" target="_blank" rel="noopener"><span>' + DATA.ctaVR + '</span>' +
              '<svg class="ic-3d" viewBox="0 0 16 16" aria-hidden="true"><use href="#ic-3d"/></svg></a>' +
          "</div>" +
          '<div class="price-card__list">' + items + "</div>" +
        "</article>"
      );
    }

    function officeCard(c) {
      const specs = c.specs.map(function (s) {
        return '<div class="price-card__spec"><span>' + s[0] + "</span><span>" + s[1] + "</span></div>";
      }).join("");
      return (
        '<article class="price-card price-card--office">' +
          '<div class="price-card__office-head">' +
            '<span class="price-card__name">' + c.name + "</span>" +
            '<p class="price-card__sub price-card__sub--office">' + c.sub + "</p>" +
            '<span class="price-card__bestfor">' + c.bestFor + "</span>" +
          "</div>" +
          '<div class="price-card__image"><img src="' + c.image + '" alt="' + c.name + '" width="1200" height="800" loading="lazy" decoding="async" /></div>' +
          '<div class="price-card__specs">' + specs + "</div>" +
          '<p class="price-card__por">' + c.price + "</p>" +
          '<a class="price-card__cta" href="#contact" data-interest="office">' + DATA.ctaQuote + "</a>" +
        "</article>"
      );
    }

    function render(tab) {
      DATA = pdata();
      pricingCards.classList.toggle("pricing__cards--offices", tab === "offices");
      pricingCards.innerHTML = (tab === "offices" ? DATA.offices.map(officeCard) : DATA.cowork.map(coworkCard)).join("");
    }

    // staggered card entrance — used on first scroll-in and on every tab switch
    function hideCards() {
      if (reduceMotion) return;
      pricingCards.querySelectorAll(".price-card").forEach(function (card) {
        card.style.transition = "none";
        card.style.opacity = "0";
        card.style.transform = "translateX(-28px)";
      });
    }
    function revealCards() {
      if (reduceMotion) return;
      const cards = pricingCards.querySelectorAll(".price-card");
      void pricingCards.offsetWidth; // flush the hidden state before animating
      requestAnimationFrame(function () {
        cards.forEach(function (card, i) {
          const delay = i * 119;
          card.style.transition =
            "opacity .7s ease " + delay + "ms, transform .84s cubic-bezier(.16, 1, .3, 1) " + delay + "ms";
          card.style.opacity = "1";
          card.style.transform = "none";
        });
      });
    }

    let current = "cowork";
    render(current);

    // reveal the first set of cards one-by-one when they scroll into view
    if (!reduceMotion) {
      hideCards();
      if ("IntersectionObserver" in window) {
        const pio = new IntersectionObserver(
          function (entries) {
            entries.forEach(function (en) {
              if (en.isIntersecting) { revealCards(); pio.disconnect(); }
            });
          },
          { threshold: 0.15, rootMargin: "0px 0px -8% 0px" }
        );
        pio.observe(pricingCards);
      } else {
        revealCards();
      }
    }

    function setTab(tab) {
      if (tab === current) return;
      current = tab;
      render(current);
      hideCards();
      revealCards();
      document.querySelectorAll(".pricing__tab").forEach(function (t) {
        t.classList.toggle("is-active", t.dataset.tab === tab);
      });
      document.querySelectorAll(".pricing__ctrl").forEach(function (ct) {
        ct.setAttribute("aria-disabled", String(ct.dataset.tab === tab));
      });
    }

    document.querySelectorAll(".pricing__tab, .pricing__ctrl").forEach(function (el) {
      el.addEventListener("click", function () { setTab(el.dataset.tab); });
    });
    // "Small / Medium / Large office" links in the Offer section: the anchor
    // handler scrolls to #pricing, this switches to the Offices tab
    document.addEventListener("click", function (e) {
      const l = e.target.closest("[data-pricing-tab]");
      if (l) setTab(l.getAttribute("data-pricing-tab"));
    });
    // left arrow disabled on first tab initially
    document.querySelectorAll(".pricing__ctrl").forEach(function (ct) {
      ct.setAttribute("aria-disabled", String(ct.dataset.tab === current));
    });

    // re-render the cards in the new language when the SK / EN toggle fires
    document.addEventListener("langchanged", function () { render(current); });
  }

  /* ---- Events: space-type accordion + image ---------------------------- */
  const eventsAccordion = document.getElementById("eventsAccordion");
  const eventsImg = document.getElementById("eventsImg");
  if (eventsAccordion && eventsImg) {
    // one dedicated image per room type
    const IMAGES = {
      "event-hall": "images/events/event-hall.jpg",
      "main-event-hall": "images/events/main-event-hall.jpg",
      "networking-lobby": "images/events/networking-lobby.jpg",
      "workshop-room": "images/events/workshop-room.jpg",
      "meeting-room": "images/events/meeting-room.jpg"
    };
    const rows = Array.prototype.slice.call(eventsAccordion.querySelectorAll(".evrow"));
    let active = rows.findIndex(function (r) { return r.classList.contains("is-active"); });
    if (active < 0) active = 0;

    const eventsStage = eventsImg.parentElement;
    // the "What's in the price" block applies only to the two big halls
    const eventsSection = eventsAccordion.closest(".events");
    const inclusion = eventsSection.querySelector(".events__inclusion");
    const WITH_INCLUSION = { "event-hall": true, "main-event-hall": true };
    // the 3-image gallery (Figma 622:6481 / 624:6596) exists only for the two halls too
    const gallery = eventsSection.querySelector(".events__gallery");
    const galleryImgs = gallery ? Array.prototype.slice.call(gallery.querySelectorAll("img[data-slot]")) : [];
    const GALLERY = {
      "event-hall": ["images/events/gallery/event-hall-1.jpg", "images/events/gallery/event-hall-2.jpg", "images/events/gallery/event-hall-3.jpg"],
      "main-event-hall": ["images/events/gallery/main-event-hall-1.jpg", "images/events/gallery/main-event-hall-2.jpg", "images/events/gallery/main-event-hall-3.jpg"]
    };
    function syncInclusion() {
      const space = rows[active].dataset.space;
      if (inclusion) inclusion.hidden = !WITH_INCLUSION[space];
      if (!gallery) return;
      const set = GALLERY[space];
      if (!set) { gallery.hidden = true; return; }
      const wasHidden = gallery.hidden;
      gallery.hidden = false;
      galleryImgs.forEach(function (img) {
        const src = set[Number(img.dataset.slot) - 1];
        if (!src || img.getAttribute("src") === src) return;
        // hidden → shown: plain swap; hall → hall: same wipe as the main image
        if (wasHidden) img.src = src; else wipeSwap(img.parentElement, img, src, "up");
      });
    }

    function setActive(i, dir) {
      if (i === active) return;
      active = (i + rows.length) % rows.length;
      accSwitch(rows, rows[active], ".evrow__body", "is-active");
      rows.forEach(function (r, idx) {
        r.querySelector(".evrow__head").setAttribute("aria-expanded", String(idx === active));
      });
      // the gallery follows the accordion (the arrows that used to page it are gone)
      wipeSwap(eventsStage, eventsImg, IMAGES[rows[active].dataset.space], dir || "up");
      syncInclusion();
    }
    syncInclusion();
    rows.forEach(function (r, idx) {
      r.querySelector(".evrow__head").setAttribute("aria-expanded", String(idx === active));
    });

    rows.forEach(function (r, idx) {
      r.querySelector(".evrow__head").addEventListener("click", function () { setActive(idx, "up"); });
    });
  }

  /* ---- About: horizontal gallery --------------------------------------- */
  const aboutGallery = document.getElementById("aboutGallery");
  const aboutTrack = document.getElementById("aboutTrack");
  if (aboutGallery && aboutTrack) {
    const ctrls = aboutGallery.querySelectorAll(".about__ctrl");
    const originals = Array.prototype.slice.call(aboutTrack.querySelectorAll(".about__slide"));
    const n = originals.length;
    const loop = n > 1;

    // seamless infinite loop: clone a full set before AND after the originals,
    // then keep the translate inside the middle band, jumping by one set-width
    // (invisible — the clones are identical) whenever it drifts out
    if (loop) {
      const before = document.createDocumentFragment();
      const after = document.createDocumentFragment();
      originals.forEach(function (s) {
        const a = s.cloneNode(true); a.setAttribute("aria-hidden", "true"); before.appendChild(a);
        const b = s.cloneNode(true); b.setAttribute("aria-hidden", "true"); after.appendChild(b);
      });
      aboutTrack.insertBefore(before, aboutTrack.firstChild);
      aboutTrack.appendChild(after);
    }

    function step() {
      const slide = aboutTrack.querySelector(".about__slide");
      const gap = parseFloat(getComputedStyle(aboutTrack).columnGap) || 24;
      return slide.getBoundingClientRect().width + gap;
    }
    function setW() { return step() * n; }

    let tx = loop ? setW() : 0; // start on the first original (middle band)

    function paint() { aboutTrack.style.transform = "translateX(" + -tx + "px)"; }
    function jump(t) { // move without animating, then re-enable transitions
      tx = t;
      aboutTrack.style.transition = "none";
      paint();
      void aboutTrack.offsetWidth;
      aboutTrack.style.transition = "";
    }
    function normalize() {
      if (!loop) return;
      const sw = setW();
      let t = tx;
      while (t >= 2 * sw) t -= sw;
      while (t < sw) t += sw;
      if (t !== tx) jump(t);
    }
    aboutTrack.addEventListener("transitionend", function (e) {
      if (e.propertyName === "transform") normalize();
    });

    // arrows — always step one slide (infinite both ways, no end stops)
    ctrls.forEach(function (c) {
      c.addEventListener("click", function () {
        aboutTrack.style.transition = "";
        tx += parseInt(c.dataset.dir, 10) * step();
        paint();
      });
    });

    // finger / pointer drag with velocity → momentum projection (touch-action:
    // pan-y keeps vertical page-scroll). Apple §2 direct manipulation, §3
    // interruptible re-grab, §5 velocity handoff, §6 project the flick's
    // landing point instead of snapping from the release point.
    let dragging = false, startX = 0, startTx = 0;
    let vel = 0, lastX = 0, lastT = 0;

    function liveTx() { // current ON-SCREEN x (presentation value), not the target
      const m = new DOMMatrixReadOnly(getComputedStyle(aboutTrack).transform);
      return -m.m41;
    }
    // exponential-decay projection from the release velocity (Apple's formula)
    function project(v, decel) { return (v / 1000) * decel / (1 - decel); }

    aboutGallery.addEventListener("pointerdown", function (e) {
      if (e.target.closest(".about__ctrl")) return;
      dragging = true;
      tx = liveTx();                      // §3: grab mid-glide → continue from
      startX = e.clientX; startTx = tx;   //     the on-screen spot, no jump
      lastX = e.clientX; lastT = e.timeStamp; vel = 0;
      aboutTrack.style.transition = "none";
      paint();
      aboutGallery.classList.add("is-dragging");
      try { aboutGallery.setPointerCapture(e.pointerId); } catch (err) {}
    });
    aboutGallery.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      tx = startTx - (e.clientX - startX);
      paint();
      const dt = e.timeStamp - lastT;
      if (dt > 0) {
        const inst = (e.clientX - lastX) / dt * 1000; // px/s of the finger
        vel = vel * 0.6 + inst * 0.4;                 // smoothed, recent-weighted
        lastX = e.clientX; lastT = e.timeStamp;
      }
    });
    function endDrag() {
      if (!dragging) return;
      dragging = false;
      aboutGallery.classList.remove("is-dragging");
      // content moves opposite the finger → invert the velocity, then project
      const projected = tx + project(-vel, 0.997);
      const target = Math.round(projected / step()) * step(); // snap to the throw
      const dist = Math.abs(target - tx);
      if (reduceMotion) {
        aboutTrack.style.transition = "none";
      } else {
        // distance-aware glide so a hard flick travels longer (momentum feel)
        const dur = Math.max(0.4, Math.min(1.3, (dist / step()) * 0.31));
        aboutTrack.style.transition = "transform " + dur + "s cubic-bezier(.16, 1, .3, 1)";
      }
      tx = target;
      paint();
      if (dist < 1) normalize(); // no transitionend fires when nothing moves
    }
    aboutGallery.addEventListener("pointerup", endDrag);
    aboutGallery.addEventListener("pointercancel", endDrag);
    aboutGallery.addEventListener("dragstart", function (e) { e.preventDefault(); });

    window.addEventListener("resize", function () { jump(loop ? setW() : 0); });
    jump(tx); // position without an initial slide-in
  }

  /* ---- FAQ accordion --------------------------------------------------- */
  const faqList = document.getElementById("faqList");
  if (faqList) {
    const items = Array.prototype.slice.call(faqList.querySelectorAll(".faq-item"));
    function syncFaqAria() {
      items.forEach(function (i) {
        i.querySelector(".faq-item__head").setAttribute("aria-expanded", String(i.classList.contains("is-open")));
      });
    }
    items.forEach(function (item) {
      item.querySelector(".faq-item__head").addEventListener("click", function () {
        const willOpen = !item.classList.contains("is-open");
        accSwitch(items, willOpen ? item : null, ".faq-item__body", "is-open");
        syncFaqAria();
      });
    });
    syncFaqAria();
  }

  /* ---- Contact form (no backend — graceful confirmation) --------------- */
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", function (e) {
      e.preventDefault();
      const btn = contactForm.querySelector(".contact__submit");
      const consent = contactForm.querySelector('input[name="consent"]');
      if (consent && !consent.checked) {
        consent.focus();
        return;
      }
      btn.style.width = "auto";
      btn.disabled = true;
      btn.style.opacity = ".85";
      var sk = localStorage.getItem("jt-lang") !== "en";
      var MSG = {
        ok: sk ? "Ďakujeme — ozveme sa vám" : "Thank you — we'll be in touch",
        err: sk ? "Niečo sa pokazilo — skúste to znova" : "Something went wrong — please try again"
      };
      // capture the e-mail before reset() clears it (for the dataLayer event)
      var emailField = contactForm.querySelector('input[name="email"]');
      var emailVal = emailField ? emailField.value.trim() : "";
      // POST to the PHP handler (contact.php) which e-mails info@jurkovicovateplaren.sk
      var body = new URLSearchParams(new FormData(contactForm)).toString();
      fetch(contactForm.getAttribute("action") || "contact.php", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body
      }).then(function (res) {
        if (!res.ok) throw new Error("bad status");
        return res.json().catch(function () { return { ok: true }; });
      }).then(function (data) {
        if (data && data.ok === false) throw new Error("server");
        // GTM: fire a conversion event with the submitted e-mail
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push({ event: "form_submission", form_name: "contact", email: emailVal });
        btn.textContent = MSG.ok;
        contactForm.reset();
      }).catch(function () {
        btn.textContent = MSG.err;
        btn.disabled = false;
        btn.style.opacity = "1";
      });
    });
  }

  /* ---- Contact: event-only fields (date + specific-hall switch) -------- */
  const interestSel = document.getElementById("contactInterest");
  const whenField = document.querySelector(".contact__when");
  const hallBlock = document.getElementById("contactHall");
  const hallBtns = hallBlock ? Array.prototype.slice.call(hallBlock.querySelectorAll(".hall-btn")) : [];
  const hallInput = hallBlock ? hallBlock.querySelector('input[name="hall"]') : null;
  function selectHall(value) {
    hallBtns.forEach(function (b) {
      const on = b.dataset.hall === value;
      b.classList.toggle("is-active", on);
      if (on && hallInput) hallInput.value = value;
    });
  }
  hallBtns.forEach(function (b) {
    b.addEventListener("click", function () { selectHall(b.dataset.hall); });
  });
  function syncEventFields() {
    const isEvent = interestSel && interestSel.value === "event";
    if (whenField) whenField.hidden = !isEvent;
    if (hallBlock) hallBlock.hidden = !isEvent;
    if (!isEvent && hallBtns.length) selectHall(hallBtns[0].dataset.hall); // reset to default
  }
  if (interestSel) {
    interestSel.addEventListener("change", syncEventFields);
    syncEventFields();
  }

  /* ---- Custom date picker (shadcn-style, in brand colours) ------------- */
  initDatePicker(document.getElementById("contactDate"));
  function initDatePicker(root) {
    if (!root) return;
    const trigger = root.querySelector(".datepicker__trigger");
    const valueEl = root.querySelector(".datepicker__value");
    const hidden = root.querySelector('input[type="hidden"]');
    const STR = {
      sk: { months: ["Január", "Február", "Marec", "Apríl", "Máj", "Jún", "Júl", "August", "September", "Október", "November", "December"],
            dow: ["Po", "Ut", "St", "Št", "Pi", "So", "Ne"], ph: "Vyberte dátum" },
      en: { months: ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"],
            dow: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"], ph: "Select a date" }
    };
    const lang = function () { return localStorage.getItem("jt-lang") === "en" ? "en" : "sk"; };
    const today = new Date(); today.setHours(0, 0, 0, 0);
    let view = new Date(today.getFullYear(), today.getMonth(), 1);
    let selected = null;
    let pop = null;

    function pad(n) { return String(n).padStart(2, "0"); }
    function iso(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
    function sameDay(a, b) { return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate(); }

    function paintValue() {
      const s = STR[lang()];
      if (selected) {
        valueEl.textContent = pad(selected.getDate()) + ". " + pad(selected.getMonth() + 1) + ". " + selected.getFullYear();
        valueEl.classList.remove("is-placeholder");
      } else {
        valueEl.textContent = s.ph;
        valueEl.classList.add("is-placeholder");
      }
    }

    function buildGrid() {
      const s = STR[lang()];
      const y = view.getFullYear(), m = view.getMonth();
      const head =
        '<div class="datepicker__head">' +
          '<button type="button" class="datepicker__nav" data-step="-1" aria-label="Previous month"><svg viewBox="0 0 16 16" fill="none"><path d="M10 3 5 8l5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
          '<span class="datepicker__month">' + s.months[m] + " " + y + "</span>" +
          '<button type="button" class="datepicker__nav" data-step="1" aria-label="Next month"><svg viewBox="0 0 16 16" fill="none"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg></button>' +
        "</div>";
      const dow = '<div class="datepicker__dow">' + s.dow.map(function (d) { return "<span>" + d + "</span>"; }).join("") + "</div>";
      const firstDow = (new Date(y, m, 1).getDay() + 6) % 7; // Monday-first
      const days = new Date(y, m + 1, 0).getDate();
      let cells = "";
      for (let i = 0; i < firstDow; i++) cells += '<span class="datepicker__cell datepicker__cell--empty"></span>';
      for (let d = 1; d <= days; d++) {
        const date = new Date(y, m, d);
        const past = date < today;
        const cls = "datepicker__cell datepicker__day" +
          (sameDay(date, selected) ? " is-selected" : "") +
          (sameDay(date, today) ? " is-today" : "") +
          (past ? " is-disabled" : "");
        cells += '<button type="button" class="' + cls + '" data-day="' + d + '"' + (past ? " disabled" : "") + ">" + d + "</button>";
      }
      return head + dow + '<div class="datepicker__grid">' + cells + "</div>";
    }

    function render() { if (pop) pop.innerHTML = buildGrid(); }

    function open() {
      if (pop) return;
      pop = document.createElement("div");
      pop.className = "datepicker__pop";
      pop.setAttribute("role", "dialog");
      pop.innerHTML = buildGrid();
      root.appendChild(pop);
      // materialize from the trigger origin (§7/§12) — paint hidden state first
      requestAnimationFrame(function () {
        requestAnimationFrame(function () { if (pop) pop.classList.add("is-open"); });
      });
      trigger.setAttribute("aria-expanded", "true");
      document.addEventListener("click", onOutside, true);
    }
    function close() {
      if (!pop) return;
      pop.remove(); pop = null;
      trigger.setAttribute("aria-expanded", "false");
      document.removeEventListener("click", onOutside, true);
    }
    function onOutside(e) { if (!root.contains(e.target)) close(); }

    trigger.addEventListener("click", function () { pop ? close() : open(); });
    root.addEventListener("click", function (e) {
      const nav = e.target.closest(".datepicker__nav");
      if (nav) { view.setMonth(view.getMonth() + parseInt(nav.dataset.step, 10)); render(); return; }
      const day = e.target.closest(".datepicker__day");
      if (day && !day.disabled) {
        selected = new Date(view.getFullYear(), view.getMonth(), parseInt(day.dataset.day, 10));
        hidden.value = iso(selected);
        paintValue();
        close();
      }
    });
    document.addEventListener("langchanged", function () { paintValue(); render(); });
    paintValue();
  }

  /* ---- Preset the contact "interested in" field from the clicked CTA --- */
  document.addEventListener("click", function (e) {
    const link = e.target.closest("[data-interest]");
    if (!link) return;
    const sel = document.getElementById("contactInterest");
    if (!sel) return;
    sel.value = link.getAttribute("data-interest");
    sel.dispatchEvent(new Event("change")); // reveal/hide event-only fields
    // came from a specific hall → preselect it in the hall switcher
    const evrow = link.closest("[data-space]");
    if (sel.value === "event" && evrow && hallBtns.some(function (b) { return b.dataset.hall === evrow.getAttribute("data-space"); })) {
      selectHall(evrow.getAttribute("data-space"));
    }
  });
})();
