/* =========================================================================
   Jurkovičova Tepláreň — Bilingual (SK / EN) toggle
   -------------------------------------------------------------------------
   The page markup is authored in English. On load we snapshot that English
   straight from the DOM (so EN is always faithful) and only the Slovak is
   authored here. The SK / EN buttons in the menu swap the text live, persist
   the choice in localStorage and re-render the JS-built pricing cards.
   Loaded BEFORE js/main.js so window.JT_pricing() is ready for the first render.
   ========================================================================= */
(function () {
  "use strict";

  var STORE = "jt-lang";
  var DEFAULT_LANG = "sk";

  /* ---- static text targets: [selector, mode, slovak] ------------------- *
   * mode: "text" → first text node (keeps trailing icons)
   *       "html" → innerHTML (translation may contain <br>, <a>, <sup>…)
   *       "ph"   → input placeholder
   * `list: true` → selector matches many; slovak is an array in DOM order.   */
  var TARGETS = [
    /* header / menu */
    { sel: ".header-actions a.btn--primary", mode: "text", sk: "Kontakt" },
    { sel: ".nav-panel__contact", mode: "text", sk: "Kontakt" },
    { sel: ".nav-panel__client span", mode: "text", sk: "Klientská zóna" },
    { sel: ".skip-link", mode: "text", sk: "Preskočiť na obsah" },
    { sel: ".nav-panel__link", mode: "text", list: true,
      sk: ["Budova", "Ponuka", "Cenník", "Eventy", "O nás", "Okolie", "FAQ"] },

    /* hero */
    { sel: ".hero__title", mode: "html", sk: "Miesto s charakterom,<br>práca na inej úrovni." },
    { sel: ".hero__headline a.btn--primary", mode: "text", sk: "Zistiť viac" },
    { sel: ".hero__sub p", mode: "html",
      sk: "<span>Jedinečný pracovný priestor v Jurkovičovej Teplárni v SKY PARKu </span>" +
          "<span class=\"muted\">— tam, kde sa sústredená práca prelína s kultúrou, komunitou a každodenným pulzom mesta.</span>" },
    { sel: ".hero__vr-title", mode: "html", sk: "Preskúmajte priestor<br>vo virtuálnej realite" },
    { sel: ".hero__vr-floors .vr-btn", mode: "text", list: true, sk: ["Prízemie", "1. poschodie"] },
    { sel: ".hero-card__title", mode: "text", list: true, sk: ["Cowork", "Kancelárie", "Eventy"] },
    { sel: ".hero-card__desc-text", mode: "html", list: true,
      sk: ["Flexibilný priestor na prácu", "Priestory, kde<br>rastú nápady", "Priestor pre<br>nezabudnuteľné chvíle"] },
    { sel: ".hero-card .link-arrow", mode: "text", list: true,
      sk: ["Zistiť viac", "Zistiť viac", "Zistiť viac"] },

    /* 02 building */
    { sel: ".building__headline", mode: "text",
      sk: "Národná kultúrna pamiatka, Jurkovičova Tepláreň ako jedinečný coworking v novom downtowne Bratislavy." },

    /* 03 offer */
    { sel: ".offer-item__title", mode: "text", list: true, sk: ["Cowork", "Kancelárie", "Eventy"] },
    { sel: ".offer-item__desc", mode: "text", list: true, sk: [
      "Fix Desk alebo Hot Desk — priestor, ktorý je len váš. Plne zariadené, s prístupom do spoločných zón vždy, keď sa vám to hodí. ",
      "Uzamykateľný priestor pre tých, čo potrebujú väčšie súkromie a pokoj na prácu. Zariadený a pripravený na nasťahovanie — nič nestaviate ani nedofinancúvate, jednoducho prídete a pracujete.",
      "Moderné priestory pre spoločenské, kultúrne aj networkingové podujatia — školenia, workshopy, semináre, otvorenia či recepcie. K dispozícii členom aj verejnosti, s kompletným vybavením, aby všetko prebehlo hladko a profesionálne."
    ] },
    { sel: ".offer-item[data-cat=\"cowork\"] .chip > span", mode: "html", list: true,
      sk: ["Pracovné vybavenie", "Prístup 24/7", "Spoločné priestory", "Nápoje", "Úschovňa bicyklov", "Wi-Fi pripojenie"] },
    { sel: ".offer-item[data-cat=\"offices\"] .chip > span", mode: "html", list: true,
      sk: ["Rôzne veľkosti", "Zasadačky", "Firemné logo", "Služby recepcie", "Wi-Fi pripojenie", "Sídlo firmy"] },
    { sel: ".offer-item[data-cat=\"events\"] .chip > span", mode: "html", list: true,
      sk: ["Klienti aj verejnosť", "Až do 200 osôb", "Plocha 130 m<sup>2</sup>", "Projektor/plátno", "Audio vybavenie", "Voliteľný catering"] },
    { sel: ".offer-link span", mode: "text", list: true, sk: ["Malá kancelária", "Stredná kancelária", "Veľká kancelária"] },

    /* 04 pricing (static parts; cards are rendered by main.js) */
    { sel: ".pricing__title", mode: "html", sk: "Vyberte si riešenie,<br>ktoré vám najviac vyhovuje." },
    { sel: ".pricing__tab", mode: "text", list: true, sk: ["Cowork", "Kancelárie"] },

    /* 05 events */
    { sel: ".events__title", mode: "text", sk: "Eventové priestory a zasadačky" },
    { sel: ".events__lead", mode: "text", sk: "Jedinečné priestory vhodné na súkromné aj verejné podujatia." },
    { sel: ".evrow__name", mode: "text", list: true,
      sk: ["Eventová sála", "Hlavná eventová sála", "Networking lobby", "Workshopová miestnosť", "Zasadačky"] },
    { sel: ".evrow__desc", mode: "html", list: true, sk: [
      "Univerzálna sála pre semináre a stredne veľké podujatia, s kapacitou 100 osôb. V cene: nábytok, projekcia, ozvučenie, 2× ručný mikrofón a internet.",
      "Výnimočný priestor pre väčšie spoločenské, kultúrne aj biznis podujatia. Je ideálna na networkingové eventy, vernisáže, recepcie či vzdelávacie formáty, ktoré si vyžadujú atmosféru aj profesionálne zázemie.<br>• Priestor je dostupný pre členov coworkingu aj verejnosť.<br>• Kapacita do 200 osôb.",
      "Otvorená, presvetlená lobby v srdci budovy — prirodzené miesto na recepcie, coffee breaky a neformálny networking pred podujatím či po ňom. Variabilné sedenie, komunitný bar a priamy prístup do eventových sál.",
      "Workshopová miestnosť na druhom podlaží s variabilným usporiadaním a priamym prístupom ku komunitnej zóne coworkingu. Ideálne miesto na školenia, workshopy, či prezentácie.",
      "Komorné, dobre vybavené miestnosti pre porady vedenia, pohovory a menšie stretnutia s klientmi."
    ] },
    { sel: ".evrow__unit", mode: "text", list: true,
      sk: ["/ hodina, bez DPH", "/ hodina, bez DPH", "/ hodina, bez DPH"] },
    { sel: ".evrow[data-space=\"main-event-hall\"] .evrow__amount", mode: "text", sk: "Na vyžiadanie" },
    { sel: ".evrow__cta", mode: "text", list: true,
      sk: ["Nezáväzný dopyt", "Nezáväzný dopyt", "Nezáväzný dopyt", "Nezáväzný dopyt"] },
    { sel: ".evrow__vr span", mode: "text", list: true,
      sk: ["Pozrieť priestor vo VR", "Pozrieť priestor vo VR", "Pozrieť priestor vo VR", "Pozrieť priestor vo VR", "Pozrieť priestor vo VR"] },
    { sel: ".events__inc-title", mode: "text", sk: "Čo je v cene" },
    { sel: ".inc-card__label", mode: "text", list: true, sk: ["V cene", "Voliteľné", "Externé"] },
    { sel: ".inc-card__title", mode: "text", list: true, sk: ["V prenájme", "Doplnky cez nás", "Partneri tretích strán"] },
    { sel: ".inc-card__item", mode: "text", list: true, sk: [
      "Samotný priestor", "Zvukový systém", "Projektor + plátno, mikrofóny (okrem Workshopovej miestnosti)", "Stoly a sedenie", "Internetové pripojenie",
      "Catering a obslužný personál", "Podpora počas podujatia", "Usporiadanie priestoru", "Doplnkový nábytok", "Upratovanie (pred/po podujatí)", "Podzemné parkovanie",
      "Catering a obslužný personál", "LED obrazovky / videosteny", "Hostesky", "Stavba pódia", "Produkcia live streamu", "Špecializované osvetlenie"
    ] },

    /* 06 about */
    { sel: ".about__kicker", mode: "text", sk: "Pracovný priestor, ktorý inšpiruje" },
    { sel: ".about__para", mode: "text",
      sk: "Priestor, ktorý spája profesionálne kancelárske zázemie s bezstarostnosťou coworkingu. Vhodný pre jednotlivcov, startupy aj etablované firmy. Nejedná sa len o bežnú kancelársku budovu. Nájdete tu kaviareň, galériu a eventové priestory na rôzne stretnutia aj podujatia. Unikátne prostredie národnej kultúrnej pamiatky kombinované s najmodernejšími technológiami a vysokým štandardom, dostupnosťou verejnou dopravou a blízkosťou dunajského nábrežia a historického centra. Nájdite si svoje miesto v budove, ktorá prináša novú kultúru práce." },

    /* 07 tour */
    { sel: ".tour__title", mode: "text", sk: "Nazrite dovnútra." },
    { sel: ".tour__sub", mode: "text", sk: "Prejdite si naše priestory v 3D" },
    { sel: ".tour__btn", mode: "text", list: true, sk: ["Prízemie", "1. poschodie"] },

    /* 08 amenities */
    { sel: ".amenities__line--top", mode: "text", sk: "Minulosť sa stáva " },
    { sel: ".amenities__line--bottom", mode: "text", sk: "centrom budúcnosti" },
    { sel: ".amenities__card-text", mode: "text",
      sk: "Zeleň, reštaurácie, služby aj oddychové zóny máte na pár minút chôdze. A ste len na skok od hlavných spojov MHD, mestského okruhu, Dunaja, historického centra i dvoch nákupných centier." },
    { sel: ".amenities__list-head", mode: "text", sk: "V blízkom okolí:" },
    { sel: ".amenities__row > span:first-child", mode: "text", list: true, sk: ["Kaviareň", "Potraviny", "Reštaurácia", "Fitness", "Galéria"] },

    /* 09 faq */
    { sel: ".faq-item__q", mode: "text", list: true, sk: [
      "Čo zahŕňa cena cowork desku?",
      "Aké služby poskytujeme našim členom?",
      "Ako nás nájdete?",
      "Čo všetko môžete u nás využívať?",
      "Čím sa líšime od iných coworkingov?",
      "Môžem si coworking vyskúšať pred zakúpením členstva?"
    ] },
    { sel: ".faq-item__list li", mode: "html", list: true, sk: [
      "<strong>Fix Desk —</strong> vlastný stôl s nonstop prístupom, všetkými spoločnými zónami, internetom, občerstvením a mesačným kreditom na zasadačky a tlač.",
      "<strong>Fix Desk Premium —</strong> všetko z Fix Desku, navyše stôl v uzamykateľnej kancelárii a príjem pošty a balíkov.",
      "<strong>Hot Desk —</strong> voľné sadnutie kdekoľvek v spoločných priestoroch počas otváracích hodín, s prístupom do všetkých spoločných zón a členskými službami."
    ] },
    { sel: ".faq-map-btn", mode: "text", sk: "Zobraziť mapu" },
    { sel: ".faq-item__body p", mode: "text", list: true, sk: [
      "Členom poskytujeme každodenný prevádzkový servis — pravidelné upratovanie, starostlivosť o zeleň, servis kávovarov a tlačiarní, dopĺňanie spotrebného materiálu, služby recepcie a podporu coworkingového tímu. Súčasťou členstva sú aj komunitné aktivity a vybrané benefity.",
      "Jurkovičova Tepláreň sa nachádza v areáli SKY PARKu. Prísť môžete pešo, autom alebo verejnou dopravou. V prípade príchodu autom je možné parkovať v podzemnej garáži za 3 € / hod. Pre jednoduchšiu orientáciu si môžete pozrieť navigačné mapky alebo krátke videá s trasou autom aj pešo.",
      "Členovia majú k dispozícii kompletne vybavené komunitné kuchynky, lounge zóny, telefónne búdky, sprchu, cyklozázemie, meeting roomy rôznych veľkostí aj priestory na workshopy, školenia a eventy. Po dohode je možné zabezpečiť aj skladové priestory a parkovanie.",
      "Jurkovičova Tepláreň nie je len coworking. Je to pracovný priestor s charakterom, ktorý spája prémiové vybavenie, dizajnový interiér, moderné technológie a jedinečnú atmosféru národnej kultúrnej pamiatky. Okrem flexibilných pracovných miest, kancelárií a zasadačiek získate aj profesionálny servis, smart prístup cez aplikáciu a zázemie etablovanej biznis komunity. Za priestorom stojí Alto Real Estate, vďaka čomu môžete očakávať stabilitu, kvalitu a štandard, ktorý presahuje bežný coworking.",
      "Áno. Radi vám umožníme zažiť atmosféru Jurkovičovej Teplárne osobne. Testovací deň je možný po predchádzajúcej dohode — stačí nás kontaktovať e-mailom alebo telefonicky."
    ] },

    /* contact */
    { sel: ".contact__title", mode: "html", sk: "Ostaňme<br>v kontakte!" },
    { sel: ".contact__lead", mode: "text",
      sk: "Napíšte nám a spolu nájdeme riešenie, ktoré bude sedieť vám aj vášmu tímu." },
    { sel: ".contact__address", mode: "html",
      sk: "Jurkovičova Tepláreň<br>Bottova 1/1<br>811 09 Bratislava<br>Slovensko" },
    { sel: ".contact__person-name", mode: "html", list: true,
      sk: ["Veronika Žiaranová<br>Manažérka coworku"] },
    { sel: ".contact__inputs .field__label", mode: "text", list: true,
      sk: ["Meno", "Priezvisko", "E-mail", "Telefónne číslo", "Odkiaľ ste sa o nás dozvedeli?", "O čo máte záujem?", "Preferovaný dátum", "Vaša správa"] },
    { sel: ".hall-btn", mode: "text", list: true, sk: ["Eventová hala", "Hlavná eventová hala"] },
    { sel: ".contact__inputs [placeholder]", mode: "ph", list: true,
      sk: ["Vaše meno", "Vaše priezvisko", "Váš e-mail", "+421 0", "Napíšte nám pár slov…"] },
    { sel: "select[name=\"source\"] option", mode: "text", list: true,
      sk: ["Internet", "Odporúčanie známeho", "Sociálne siete", "Podujatie", "Iné"] },
    { sel: "select[name=\"interest\"] option", mode: "text", list: true,
      sk: ["Cowork miesto", "Súkromná kancelária", "Eventový priestor", "Zasadačka", "Denný vstup"] },
    { sel: ".contact__consent-text", mode: "html",
      sk: "Súhlasím s kontaktovaním a so spracovaním mojich údajov podľa <a href=\"privacy.html\">zásad ochrany osobných údajov</a>." },
    { sel: ".contact__submit", mode: "text", sk: "Odoslať dopyt" },

    /* footer */
    { sel: ".site-footer__copy", mode: "html", sk: "<span class=\"js-year\">2026</span> © ALTO Real Estate. Všetky práva vyhradené." },
    { sel: ".site-footer__links a", mode: "text", list: true, sk: ["Nastavenia cookies", "Zásady ochrany osobných údajov"] }
  ];

  /* ---- pricing cards: full data per language (main.js renders these) ---- */
  var COWORK_FULL_EN = [
    "Access 24/7", "Access to all common areas", "Internet connection",
    "Reception, community services", "Drinks and basic refreshments",
    "Bicycle storage and facilities",
    "Meeting rooms - credit allowance", "Printing credit allowance",
    "Selected events and workshops"
  ];
  var COWORK_FULL_SK = [
    "Prístup 24/7", "Prístup do všetkých spoločných priestorov", "Internetové pripojenie",
    "Recepcia a komunitné služby", "Nápoje a základné občerstvenie",
    "Úschovňa bicyklov a zázemie",
    "Zasadačky – kreditový limit", "Kredit na tlač",
    "Vybrané podujatia a workshopy"
  ];

  /* cowork cards: cover photos + the Matterport tour behind "Explore in VR" */
  var VR_FIX = "https://my.matterport.com/show/?m=ro2yLGBB8oc&play=1&ss=120&sr=-2.86,-.02";   /* Fix Desk + Fix Desk Premium */
  var VR_HOT = "https://my.matterport.com/show/?m=ro2yLGBB8oc&play=1&ss=132&sr=-1.34,-1.18"; /* Hot Desk */
  var IMG_FIX = "images/pricing/cowork-fixdesk.jpg";
  var IMG_HOT = "images/pricing/cowork-hotdesk.jpg";

  var PRICING = {
    en: {
      ctaInterested: "I am interested",
      ctaQuote: "Get a quote",
      ctaVR: "Explore in VR",
      cowork: [
        { name: "Fix Desk", sub: "A space of your own with a dedicated desk.", icon: "desk",
          image: IMG_FIX, vr: VR_FIX,
          amen: [{ i: "chair", t: "High-quality VITRA chair" }, { i: "table", t: "Table" }, { i: "cabinet", t: "File cabinet" }],
          from: "From", amount: "299€", unit: "/ month, excl. VAT", features: COWORK_FULL_EN },
        { name: "Fix Desk", tag: "Premium", sub: "A space of your own with a dedicated desk in a shared lockable office.", icon: "desk",
          image: IMG_FIX, vr: VR_FIX,
          amen: [{ i: "chair", t: "High-quality VITRA chair" }, { i: "table", t: "Table" }, { i: "cabinet", t: "File cabinet" }, { i: "office", t: "Lockable office" }],
          from: "From", amount: "319€", unit: "/ month, excl. VAT",
          features: COWORK_FULL_EN.concat(["Reception of mail and parcels"]) },
        { name: "Hot Desk", sub: "Feel free to drop in anywhere within communal areas.", icon: "laptop",
          image: IMG_HOT, imgPos: "50% 58%", vr: VR_HOT,
          amen: [{ i: "laptop", t: "Table by your preferences in any of the community zones" }],
          from: "From", amount: "199€", unit: "/ month, excl. VAT", features: [
            "Access during opening hours", "Access to all common areas", "Internet connection",
            "Reception, community services", "Bicycle storage and facilities",
            "Meeting rooms - credit allowance", "Printing credit allowance", "Selected events and workshops"
          ] }
      ],
      offices: [
        { name: "Small Office",
          sub: "A quiet, lockable room for a founder, a duo or a tight team that's outgrown the shared desks. One enclosed space, your name on the door.",
          bestFor: "Best for: Solo founders or small teams", image: "images/pricing/office-s.jpg",
          specs: [["Workstations", "3 – 7"], ["Approx. area", "12 – 20 m<sup>2</sup>"], ["Fit-Out", "Furnished"]],
          price: "Price on request" },
        { name: "Medium Office",
          sub: "Room for a growing team to sit together, with space to add desks as you hire. Keep your setup behind a closed door and still tap into the community floor.",
          bestFor: "Best for: Scaling teams, Start-up hirings", image: "images/pricing/office-m.jpg",
          specs: [["Workstations", "7 – 30"], ["Approx. area", "25 – 50 m<sup>2</sup>"], ["Fit-Out", "Furnished"]],
          price: "Price on request" },
        { name: "Large Office",
          sub: "A self-contained suite for an established team or a branch office — your own zone within the building, configurable to your needs, even up to the whole floor. Entire-floor rental is also available.",
          bestFor: "Best for: Established companies or branch offices", image: "images/pricing/office-l.jpg",
          specs: [["Workstations", "30+"], ["Approx. area", "50+ m<sup>2</sup>"], ["Fit-Out", "Furnished"]],
          price: "Price on request" }
      ]
    },
    sk: {
      ctaInterested: "Mám záujem",
      ctaQuote: "Získať ponuku",
      ctaVR: "Pozrieť vo VR",
      cowork: [
        { name: "Fix Desk", sub: "Vlastný priestor s vyhradeným pracovným stolom.", icon: "desk",
          image: IMG_FIX, vr: VR_FIX,
          amen: [{ i: "chair", t: "Kvalitná stolička značky VITRA" }, { i: "table", t: "Stôl" }, { i: "cabinet", t: "Kartotéka" }],
          from: "Od", amount: "299€", unit: "/ mesiac, bez DPH", features: COWORK_FULL_SK },
        { name: "Fix Desk", tag: "Premium", sub: "Vlastný priestor s vyhradeným stolom v zdieľanej uzamykateľnej kancelárii.", icon: "desk",
          image: IMG_FIX, vr: VR_FIX,
          amen: [{ i: "chair", t: "Kvalitná stolička značky VITRA" }, { i: "table", t: "Stôl" }, { i: "cabinet", t: "Kartotéka" }, { i: "office", t: "Uzamykateľná kancelária" }],
          from: "Od", amount: "319€", unit: "/ mesiac, bez DPH",
          features: COWORK_FULL_SK.concat(["Príjem pošty a balíkov"]) },
        { name: "Hot Desk", sub: "Sadnite si, kde je práve voľné — celé spoločné priestory sú vám k dispozícii.", icon: "laptop",
          image: IMG_HOT, imgPos: "50% 58%", vr: VR_HOT,
          amen: [{ i: "laptop", t: "Stôl podľa vašich preferencií v ktorejkoľvek z komunitných zón" }],
          from: "Od", amount: "199€", unit: "/ mesiac, bez DPH", features: [
            "Prístup počas otváracích hodín", "Prístup do všetkých spoločných priestorov", "Internetové pripojenie",
            "Recepcia a komunitné služby", "Úschovňa bicyklov a zázemie",
            "Zasadačky – kreditový limit", "Kredit na tlač", "Vybrané podujatia a workshopy"
          ] }
      ],
      offices: [
        { name: "Malá kancelária",
          sub: "Tichá, uzamykateľná miestnosť pre zakladateľa, dvojicu či zohratý tím, ktorý prerástol zdieľané stoly. Jeden uzavretý priestor a vaše meno na dverách.",
          bestFor: "Ideálne pre: samostatných zakladateľov a malé tímy", image: "images/pricing/office-s.jpg",
          specs: [["Pracovné miesta", "3 – 7"], ["Približná plocha", "12 – 20 m<sup>2</sup>"], ["Vybavenie", "Zariadené"]],
          price: "Cena na vyžiadanie" },
        { name: "Stredná kancelária",
          sub: "Priestor pre rastúci tím, ktorý chce sedieť pokope — s možnosťou pridať stoly, ako priberáte ľudí. Vlastné zázemie za zatvorenými dverami a zároveň ostávate súčasťou komunity.",
          bestFor: "Ideálne pre: rastúce tímy a nábor v start-upoch", image: "images/pricing/office-m.jpg",
          specs: [["Pracovné miesta", "7 – 30"], ["Približná plocha", "25 – 50 m<sup>2</sup>"], ["Vybavenie", "Zariadené"]],
          price: "Cena na vyžiadanie" },
        { name: "Veľká kancelária",
          sub: "Samostatný priestor pre zabehnutý tím alebo pobočku — vlastná zóna v budove, ktorú si prispôsobíte svojim potrebám, pokojne až po celé poschodie. K dispozícii je aj prenájom celého poschodia.",
          bestFor: "Ideálne pre: zabehnuté firmy a pobočky", image: "images/pricing/office-l.jpg",
          specs: [["Pracovné miesta", "30+"], ["Približná plocha", "50+ m<sup>2</sup>"], ["Vybavenie", "Zariadené"]],
          price: "Cena na vyžiadanie" }
      ]
    }
  };

  /* ---- engine ---------------------------------------------------------- */
  var lang = localStorage.getItem(STORE) || DEFAULT_LANG;
  if (lang !== "sk" && lang !== "en") lang = DEFAULT_LANG;

  function qsa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }

  function firstTextNode(el) {
    for (var i = 0; i < el.childNodes.length; i++) {
      var n = el.childNodes[i];
      if (n.nodeType === 3 && n.textContent.trim()) return n;
    }
    return null;
  }
  function readVal(el, mode) {
    if (mode === "html") return el.innerHTML;
    if (mode === "ph") return el.getAttribute("placeholder");
    var n = firstTextNode(el);
    return n ? n.nodeValue : el.textContent;
  }
  function writeVal(el, mode, val) {
    if (val == null) return;
    if (mode === "html") { el.innerHTML = val; return; }
    if (mode === "ph") { el.setAttribute("placeholder", val); return; }
    var n = firstTextNode(el);
    if (n) n.nodeValue = val; else el.textContent = val;
  }

  // snapshot the English straight from the DOM, once
  TARGETS.forEach(function (tg) {
    var els = qsa(tg.sel);
    tg.en = els.map(function (el) { return readVal(el, tg.mode); });
  });

  function applyStatic() {
    TARGETS.forEach(function (tg) {
      var els = qsa(tg.sel);
      els.forEach(function (el, i) {
        var val = lang === "sk"
          ? (tg.list ? tg.sk[i] : tg.sk)
          : tg.en[i];
        writeVal(el, tg.mode, val);
      });
    });
  }

  function updateButtons() {
    qsa(".lang-btn").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-lang") === lang);
    });
  }

  function apply() {
    document.documentElement.lang = lang;
    applyStatic();
    updateButtons();
  }

  function setLang(next) {
    if (next !== "sk" && next !== "en") return;
    if (next === lang) return;
    lang = next;
    try { localStorage.setItem(STORE, lang); } catch (e) {}
    apply();
    document.dispatchEvent(new CustomEvent("langchanged", { detail: { lang: lang } }));
  }

  /* exposed for main.js (pricing render reads the current-language data) */
  window.JT_lang = function () { return lang; };
  window.JT_pricing = function () { return PRICING[lang]; };

  /* wire the SK / EN buttons + apply the initial language now (DOM is parsed
     because this script sits at the end of <body>, before main.js) */
  qsa(".lang-btn").forEach(function (b) {
    b.addEventListener("click", function () { setLang(b.getAttribute("data-lang")); });
  });
  apply();
})();
