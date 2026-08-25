/* =========================================================================
   Jurkovičova Tepláreň — cookie consent (GTM Consent Mode v2)
   Self-contained: injects the banner, gates analytics/ads cookies until the
   visitor chooses. Works on every page (no dependency on main.js).
   ========================================================================= */
(function () {
  "use strict";

  var STORE = "jt-consent";
  function gtag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  function getLang() { try { return localStorage.getItem("jt-lang") === "en" ? "en" : "sk"; } catch (e) { return "sk"; } }
  function stored() { try { return localStorage.getItem(STORE); } catch (e) { return null; } }
  function save(v) { try { localStorage.setItem(STORE, v); } catch (e) {} }

  var STR = {
    sk: {
      title: "Používame cookies",
      text: "Nevyhnutné cookies používame vždy. So súhlasom aj analytické a marketingové — na meranie návštevnosti a zlepšovanie webu.",
      accept: "Prijať všetko",
      reject: "Iba nevyhnutné",
      more: "Viac v zásadách cookies"
    },
    en: {
      title: "We use cookies",
      text: "We always use necessary cookies. With your consent we also use analytics and marketing cookies — to measure traffic and improve the site.",
      accept: "Accept all",
      reject: "Only necessary",
      more: "More in the cookie policy"
    }
  };

  function setConsent(granted) {
    gtag("consent", "update", granted
      ? { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" }
      : { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    if (granted) window.dataLayer.push({ event: "cookie_consent_granted" });
  }

  var el = null;

  function render() {
    var t = STR[getLang()];
    if (!el) {
      el = document.createElement("div");
      el.className = "cookie-banner";
      el.setAttribute("role", "dialog");
      el.setAttribute("aria-live", "polite");
      document.body.appendChild(el);
    }
    el.setAttribute("aria-label", t.title);
    el.innerHTML =
      '<div class="cookie-banner__inner">' +
        '<div class="cookie-banner__text">' +
          '<p class="cookie-banner__title">' + t.title + "</p>" +
          '<p class="cookie-banner__desc">' + t.text + ' <a href="cookies.html">' + t.more + "</a></p>" +
        "</div>" +
        '<div class="cookie-banner__actions">' +
          '<button type="button" class="cookie-banner__btn cookie-banner__btn--ghost" data-consent="reject">' + t.reject + "</button>" +
          '<button type="button" class="cookie-banner__btn cookie-banner__btn--primary" data-consent="accept">' + t.accept + "</button>" +
        "</div>" +
      "</div>";
    Array.prototype.forEach.call(el.querySelectorAll("[data-consent]"), function (b) {
      b.addEventListener("click", function () { choose(b.getAttribute("data-consent") === "accept"); });
    });
  }

  function show() { if (!el) render(); requestAnimationFrame(function () { el.classList.add("is-open"); }); }
  function hide() { if (el) el.classList.remove("is-open"); }
  function choose(granted) { save(granted ? "granted" : "denied"); setConsent(granted); hide(); }

  // apply a previous choice; on first visit show the banner
  var s = stored();
  if (s === "granted") setConsent(true);
  else if (s !== "denied") { render(); show(); }

  // keep the banner text in sync if the language toggles while it's visible
  document.addEventListener("langchanged", function () { if (el) render(); });

  // footer "Cookie settings" (or any [data-cookie-settings]) reopens the banner
  document.addEventListener("click", function (e) {
    var l = e.target.closest("[data-cookie-settings]");
    if (l) { e.preventDefault(); render(); show(); }
  });
})();
