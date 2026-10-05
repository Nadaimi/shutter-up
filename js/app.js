/* ------------------------------------------------------------------
   SHUTTER UP PROTOTYPE — single-page app with hash routing.
   Routes:
     #/                 home
     #/search?...       search results + map
     #/space/:id        listing page
     #/book/:id         booking request form
     #/sent/:ref        booking confirmation
     #/list/1..5        owner: list your space (steps)
     #/list/preview     owner: listing preview
     #/listed/:id       owner: success
   ------------------------------------------------------------------ */
(function () {
  "use strict";
  const C = window.APP_CONFIG, USES = window.USES, AREAS = window.AREAS;
  const app = document.getElementById("app");
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));

  /* ---------- helpers ---------- */
  const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = n => "$" + Math.round(n).toLocaleString("en-US");
  const pad = n => String(n).padStart(2, "0");
  const iso = d => d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  const parse = s => { if (!s) return null; const p = s.split("-").map(Number); if (p.length !== 3 || !p[0] || !p[1] || !p[2]) return null; return new Date(p[0], p[1] - 1, p[2]); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); };
  const todayIso = () => iso(today());
  const dayCount = (a, b) => Math.round((parse(b) - parse(a)) / 86400000) + 1;
  const fmt = s => parse(s).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const fmtShort = s => parse(s).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const plural = (n, w) => n + " " + w + (n === 1 ? "" : "s");

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("show");
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 2600);
  }

  /* ---------- session storage (owner listings + draft live for this browser tab only) ---------- */
  const SKEY = "shutterup-session-listings", DKEY = "shutterup-draft";
  function sGet(k, fb) { try { const v = sessionStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function sSet(k, v) { try { sessionStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }

  /* ---------- state ---------- */
  function prepare(l) {
    const set = new Set();
    const t = today();
    (l.blocked || []).forEach(([a, b]) => { for (let i = a; i <= b; i++) set.add(iso(addDays(t, i))); });
    (l.blockedDates || []).forEach(d => set.add(d));
    l._blocked = set;
    return l;
  }
  const state = {
    listings: sGet(SKEY, []).concat(window.LISTINGS).map(prepare),
    search: { area: "all", start: "", end: "", size: "any", priceMax: "", unit: "day", uses: [] },
    sel: {},
    requests: {},
    draft: sGet(DKEY, null)
  };
  const findListing = id => state.listings.find(l => l.id === id);
  const imagesOf = l => (l.photos && l.photos.length ? l.photos.concat(Facade.gallery(l.look).slice(1)) : Facade.gallery(l.look)).slice(0, 4);
  function saveUserListings() {
    const mine = state.listings.filter(l => l.isNew).map(l => { const c = Object.assign({}, l); delete c._blocked; return c; });
    if (!sSet(SKEY, mine)) {
      // photos too big for storage: keep listing without uploaded photos for reload
      sSet(SKEY, mine.map(l => Object.assign({}, l, { photos: [] })));
    }
  }

  /* ---------- pricing + availability ---------- */
  function rentFor(l, days) {
    const w = Math.floor(days / 7), r = days % 7;
    return Math.min(w * l.priceWeek + r * l.priceDay, Math.ceil(days / 7) * l.priceWeek);
  }
  function quote(l, start, end) {
    const days = dayCount(start, end);
    const rent = rentFor(l, days), fee = Math.round(rent * C.serviceFeeRate);
    return { days, rent, fee, total: rent + fee, weekly: days >= 7 };
  }
  function isDayAvailable(l, d) {
    if (l._blocked.has(d)) return false;
    if (l.availFrom && d < l.availFrom) return false;
    if (l.availTo && d > l.availTo) return false;
    return true;
  }
  function isRangeFree(l, start, end) {
    for (let d = parse(start); iso(d) <= end; d = addDays(d, 1)) if (!isDayAvailable(l, iso(d))) return false;
    return true;
  }
  // returns an error string or "" if the range is bookable
  function checkRange(l, start, end) {
    if (!start || !end) return "Choose a start and end date.";
    if (!parse(start) || !parse(end)) return "Those dates don't look right.";
    if (start < todayIso()) return "The start date is in the past.";
    if (end < start) return "The end date must be after the start date.";
    const days = dayCount(start, end);
    if (days < l.minStay) return "This space has a minimum stay of " + plural(l.minStay, "day") + ".";
    if (days > 90) return "Requests are limited to 90 days in this prototype.";
    if (!isRangeFree(l, start, end)) return "Some of those dates are already booked.";
    return "";
  }

  /* ---------- shared UI pieces ---------- */
  function areaOptions(sel, withAll) {
    return (withAll ? '<option value="all"' + (sel === "all" ? " selected" : "") + ">All neighbourhoods</option>" : "") +
      Object.keys(AREAS).map(k => '<option value="' + k + '"' + (sel === k ? " selected" : "") + ">" + AREAS[k].name + "</option>").join("");
  }
  function searchBar(s) {
    s = s || {};
    return '<form class="searchbar" id="searchbar" autocomplete="off">' +
      '<label class="sb-field"><span>Where</span><select name="area">' + areaOptions(s.area || "all", true) + "</select></label>" +
      '<label class="sb-field"><span>From</span><input type="date" name="start" min="' + todayIso() + '" value="' + esc(s.start || "") + '"></label>' +
      '<label class="sb-field"><span>Until</span><input type="date" name="end" min="' + todayIso() + '" value="' + esc(s.end || "") + '"></label>' +
      '<button class="btn sb-btn" type="submit">Search spaces</button></form>';
  }
  function bindSearchBar() {
    const f = $("#searchbar"); if (!f) return;
    f.start.addEventListener("change", () => { if (f.start.value) { f.end.min = f.start.value; if (f.end.value && f.end.value < f.start.value) f.end.value = f.start.value; } });
    f.addEventListener("submit", e => {
      e.preventDefault();
      const p = new URLSearchParams();
      if (f.area.value !== "all") p.set("area", f.area.value);
      if (f.start.value) p.set("start", f.start.value);
      if (f.end.value) p.set("end", f.end.value);
      location.hash = "#/search" + (p.toString() ? "?" + p : "");
    });
  }
  function priceLabel(l, unit) {
    return money(unit === "week" ? l.priceWeek : l.priceDay) + '<small>/' + unit + "</small>";
  }
  function card(l, unit) {
    unit = unit || "day";
    return '<a class="card" href="#/space/' + esc(l.id) + '" data-id="' + esc(l.id) + '">' +
      '<div class="card-img"><img src="' + imagesOf(l)[0] + '" alt="' + esc(l.title) + '" loading="lazy">' +
      (l.isNew ? '<span class="badge">Your listing</span>' : "") + "</div>" +
      '<div class="card-body"><div class="card-top"><h3>' + esc(l.title) + '</h3><span class="price">' + priceLabel(l, unit) + "</span></div>" +
      '<p class="muted">' + esc(l.street) + ", " + AREAS[l.area].name + "</p>" +
      '<p class="meta">' + l.size + " m² · " + l.frontage + " m frontage · min " + plural(l.minStay, "day") + "</p>" +
      '<div class="tags">' + l.uses.map(u => '<span class="tag">' + USES[u] + "</span>").join("") + "</div></div></a>";
  }
  function amenityList(l) {
    const a = l.amenities, yes = '<span class="ok">✓</span>', no = '<span class="no">–</span>';
    return '<ul class="amen">' +
      '<li><b>Electricity</b><span>' + esc(a.power) + "</span></li>" +
      "<li><b>Water</b><span>" + (a.water ? yes + " Running water" : no + " No water connection") + "</span></li>" +
      "<li><b>Shutter</b><span>" + esc(a.shutter) + "</span></li>" +
      "<li><b>Street frontage</b><span>" + l.frontage + " m of shopfront onto " + esc(l.street) + "</span></li>" +
      "<li><b>Toilet</b><span>" + (a.toilet ? yes + " On site" : no + " None (nearby café access)") + "</span></li>" +
      "<li><b>Wi-Fi</b><span>" + (a.wifi ? yes + " Included" : no + " Not included") + "</span></li>" +
      "<li><b>Storage</b><span>" + (a.storage ? yes + " Back room / storage" : no + " No storage") + "</span></li></ul>";
  }

  /* ---------- map ---------- */
  let maps = [];
  function cleanupMaps() { maps.forEach(m => { try { m.remove(); } catch (e) { } }); maps = []; }
  function makeMap(el, center, zoom) {
    if (!window.L) { el.innerHTML = '<div class="map-fallback">Map could not load (are you offline?)</div>'; return null; }
    const m = L.map(el, { scrollWheelZoom: false, zoomControl: true }).setView(center, zoom);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "&copy; OpenStreetMap contributors" }).addTo(m);
    m.on("focus", () => m.scrollWheelZoom.enable());
    maps.push(m);
    return m;
  }
  const pinIcon = (label, cls) => L.divIcon({ className: "pin-wrap", html: '<div class="pin ' + (cls || "") + '">' + label + "</div>", iconSize: null });

  /* =================================================================
     HOME
     ================================================================= */
  function renderHome(q) {
    const featured = state.listings.filter(l => l.featured).slice(0, 4);
    const hero = Facade.street([window.LISTINGS[0].look, window.LISTINGS[4].look, window.LISTINGS[2].look]);
    const gem = state.listings.filter(l => l.area === "gemmayzeh"), mar = state.listings.filter(l => l.area === "marmikhael");
    app.innerHTML =
      '<section class="hero"><img class="hero-img" src="' + hero + '" alt="Illustration of Beirut shopfronts">' +
      '<div class="hero-shade"></div><div class="container hero-inner">' +
      '<p class="eyebrow light">Gemmayzeh · Mar Mikhael · Beirut</p>' +
      "<h1>Give an empty shopfront<br>a second life.</h1>" +
      '<p class="lede">Rent a ground-floor space by the day or the week for a pop-up shop, an exhibition, a workshop or a neighbourhood event.</p>' +
      searchBar(state.search) + "</div></section>" +

      '<section class="section container intro"><h2 class="big">Behind many of Beirut\'s rolled-down shutters are shops waiting for a story.</h2>' +
      "<div><p>" + esc(C.brand) + " connects owners of vacant ground-floor shops with the people who want to use them for a short time: young brands testing an idea, artists who need a wall, and organisers who need a room facing the street.</p>" +
      "<p>Owners earn from a space that would otherwise sit empty. Renters skip long leases and key money. The street gets some life back.</p></div></section>" +

      '<section class="section container"><div class="section-head"><h2>Featured spaces</h2><a class="link-arrow" href="#/search">See all ' + state.listings.length + " spaces →</a></div>" +
      '<div class="grid grid-4">' + featured.map(l => card(l)).join("") + "</div></section>" +

      '<section class="section container"><div class="section-head"><h2>Two neighbourhoods, one long street</h2></div><div class="hoods">' +
      '<a class="hood" href="#/search?area=gemmayzeh"><img src="' + Facade.exterior(window.LISTINGS[1].look) + '" alt=""><div><h3>Gemmayzeh</h3><p>Stairs, arcades and old workshops along Gouraud and Pasteur Streets. ' + gem.length + " spaces</p></div></a>" +
      '<a class="hood" href="#/search?area=marmikhael"><img src="' + Facade.exterior(window.LISTINGS[7].look) + '" alt=""><div><h3>Mar Mikhael</h3><p>Garages, studios and late-night foot traffic around Armenia Street. ' + mar.length + " spaces</p></div></a></div></section>" +

      '<section class="section section-soft" id="how"><div class="container"><div class="section-head"><h2>How it works</h2>' +
      '<div class="seg" role="tablist"><button class="on" data-how="rent">I need a space</button><button data-how="own">I have a space</button></div></div>' +
      '<div class="steps" data-panel="rent">' +
      step(1, "Find a space", "Search by neighbourhood and dates, then compare size, price and what each space is allowed to host.") +
      step(2, "Send a request", "Tell the owner about your project, pick your dates and see the estimated total before you send.") +
      step(3, "Open your doors", "Once the owner accepts, sign a short agreement, pay through " + esc(C.brand) + ", collect the keys and roll up the shutter.") + "</div>" +
      '<div class="steps" data-panel="own" hidden>' +
      step(1, "List it for free", "Add the location, size, a few photos, your price and the dates you're open to.") +
      step(2, "Choose who comes in", "Read each request and accept only the projects that suit your space and your neighbours.") +
      step(3, "Get paid", "You receive the rent after each booking. Your space stays yours. No long lease, no key money.") + "</div></div></section>" +

      '<section class="section container"><div class="cta"><div class="cta-text"><p class="eyebrow light">For owners</p><h2>Is your shop sitting empty?</h2>' +
      "<p>Turn a closed shutter into income and bring life back to your street. Listing takes about five minutes.</p>" +
      '<a class="btn btn-light" href="#/list/1">List your space</a></div><img src="' + Facade.interior(window.LISTINGS[3].look) + '" alt=""></div></section>';

    bindSearchBar();
    $$("[data-how]").forEach(b => b.addEventListener("click", () => {
      $$("[data-how]").forEach(x => x.classList.toggle("on", x === b));
      $$("[data-panel]").forEach(p => p.hidden = p.dataset.panel !== b.dataset.how);
    }));
    if (q.get("s") === "how") setTimeout(() => $("#how").scrollIntoView({ behavior: "smooth" }), 50);
  }
  function step(n, t, d) { return '<div class="step"><span class="step-n">0' + n + "</span><h3>" + t + "</h3><p>" + d + "</p></div>"; }

  /* =================================================================
     SEARCH
     ================================================================= */
  const SIZES = { any: "Any size", s: "Under 30 m²", m: "30–60 m²", l: "60–100 m²", xl: "100 m² +" };
  const sizeOk = (v, k) => k === "any" || (k === "s" && v < 30) || (k === "m" && v >= 30 && v < 60) || (k === "l" && v >= 60 && v < 100) || (k === "xl" && v >= 100);
  let searchMap = null, markers = {};

  function renderSearch(q) {
    const s = state.search;
    {
      s.area = AREAS[q.get("area")] ? q.get("area") : "all";
      s.start = q.get("start") || ""; s.end = q.get("end") || "";
      s.uses = (q.get("use") || "").split(",").filter(u => USES[u]);
      s.size = SIZES[q.get("size")] ? q.get("size") : "any";
      s.priceMax = q.get("max") || ""; s.unit = q.get("unit") === "week" ? "week" : "day";
    }
    app.innerHTML =
      '<div class="search-page"><div class="filterbar"><div class="filters">' +
      '<label class="f"><span>Neighbourhood</span><select id="f-area">' + areaOptions(s.area, true) + "</select></label>" +
      '<label class="f"><span>From</span><input type="date" id="f-start" min="' + todayIso() + '" value="' + esc(s.start) + '"></label>' +
      '<label class="f"><span>Until</span><input type="date" id="f-end" min="' + todayIso() + '" value="' + esc(s.end) + '"></label>' +
      '<label class="f"><span>Size</span><select id="f-size">' + Object.keys(SIZES).map(k => '<option value="' + k + '"' + (s.size === k ? " selected" : "") + ">" + SIZES[k] + "</option>").join("") + "</select></label>" +
      '<div class="f f-price"><span>Max price (USD)</span><div class="price-row"><input type="number" id="f-price" min="0" step="10" placeholder="Any" value="' + esc(s.priceMax) + '">' +
      '<div class="seg seg-sm"><button type="button" data-unit="day" class="' + (s.unit === "day" ? "on" : "") + '">/day</button><button type="button" data-unit="week" class="' + (s.unit === "week" ? "on" : "") + '">/week</button></div></div></div>' +
      '<div class="f f-uses"><span>Use type</span><div class="chips">' + Object.keys(USES).map(u => '<button type="button" class="chip' + (s.uses.includes(u) ? " on" : "") + '" data-use="' + u + '">' + USES[u] + "</button>").join("") + "</div></div>" +
      '<button type="button" class="link-btn" id="f-reset">Clear all</button></div></div>' +
      '<div class="split" id="split"><div class="results"><div class="results-head"><h1 id="r-count"></h1><p class="muted" id="r-sub"></p></div><div class="grid grid-2" id="r-grid"></div></div>' +
      '<div class="mapcol"><div id="map"></div></div></div>' +
      '<button class="btn map-toggle" id="map-toggle">Show map</button></div>';

    const upd = () => { syncSearchUrl(); updateResults(); };
    $("#f-area").addEventListener("change", e => { s.area = e.target.value; upd(); });
    $("#f-start").addEventListener("change", e => { s.start = e.target.value; $("#f-end").min = s.start || todayIso(); if (s.end && s.start && s.end < s.start) { s.end = s.start; $("#f-end").value = s.end; } upd(); });
    $("#f-end").addEventListener("change", e => { s.end = e.target.value; upd(); });
    $("#f-size").addEventListener("change", e => { s.size = e.target.value; upd(); });
    $("#f-price").addEventListener("input", e => { s.priceMax = e.target.value; upd(); });
    $$("[data-unit]").forEach(b => b.addEventListener("click", () => { s.unit = b.dataset.unit; $$("[data-unit]").forEach(x => x.classList.toggle("on", x === b)); upd(); }));
    $$("[data-use]").forEach(b => b.addEventListener("click", () => {
      const u = b.dataset.use; s.uses = s.uses.includes(u) ? s.uses.filter(x => x !== u) : s.uses.concat(u);
      b.classList.toggle("on"); upd();
    }));
    $("#f-reset").addEventListener("click", () => { const t = "#/search?area=all"; if (location.hash === t) route(); else location.hash = t; });
    $("#map-toggle").addEventListener("click", () => {
      const sp = $("#split"); const on = sp.classList.toggle("show-map");
      $("#map-toggle").textContent = on ? "Show list" : "Show map";
      if (searchMap) setTimeout(() => { searchMap.invalidateSize(); fitMarkers(); }, 50);
    });

    searchMap = makeMap($("#map"), [33.8965, 35.5195], 16);
    updateResults();
  }
  function syncSearchUrl() {
    const s = state.search, p = new URLSearchParams();
    if (s.area !== "all") p.set("area", s.area);
    if (s.start) p.set("start", s.start);
    if (s.end) p.set("end", s.end);
    if (s.uses.length) p.set("use", s.uses.join(","));
    if (s.size !== "any") p.set("size", s.size);
    if (s.priceMax) p.set("max", s.priceMax);
    if (s.unit === "week") p.set("unit", "week");
    history.replaceState(null, "", "#/search" + (p.toString() ? "?" + p : "?area=all"));
  }
  function filtered() {
    const s = state.search;
    const datesOk = s.start && s.end && s.end >= s.start;
    return state.listings.filter(l =>
      (s.area === "all" || l.area === s.area) &&
      sizeOk(l.size, s.size) &&
      (!s.priceMax || (s.unit === "week" ? l.priceWeek : l.priceDay) <= Number(s.priceMax)) &&
      (!s.uses.length || s.uses.some(u => l.uses.includes(u))) &&
      (!datesOk || isRangeFree(l, s.start, s.end)));
  }
  function updateResults() {
    const s = state.search, list = filtered();
    const where = s.area === "all" ? "Gemmayzeh & Mar Mikhael" : AREAS[s.area].name;
    $("#r-count").textContent = plural(list.length, "space") + " in " + where;
    $("#r-sub").textContent = s.start && s.end && s.end >= s.start
      ? "Available " + fmtShort(s.start) + " – " + fmtShort(s.end) + " (" + plural(dayCount(s.start, s.end), "day") + ")"
      : "Add dates to see only spaces that are free.";
    $("#r-grid").innerHTML = list.length ? list.map(l => card(l, s.unit)).join("")
      : '<div class="empty"><h3>No spaces match those filters.</h3><p class="muted">Try other dates, a bigger price range or fewer use types.</p><button class="btn btn-ghost" id="empty-reset">Clear filters</button></div>';
    const er = $("#empty-reset"); if (er) er.addEventListener("click", () => $("#f-reset").click());

    // map markers
    if (!searchMap) return;
    Object.values(markers).forEach(m => m.remove()); markers = {};
    list.forEach(l => {
      const m = L.marker([l.lat, l.lng], { icon: pinIcon(money(s.unit === "week" ? l.priceWeek : l.priceDay), l.isNew ? "pin-new" : ""), riseOnHover: true }).addTo(searchMap);
      m.bindPopup('<a class="pop" href="#/space/' + esc(l.id) + '"><img src="' + imagesOf(l)[0] + '" alt=""><b>' + esc(l.title) + "</b><span>" + esc(l.street) + " · " + l.size + " m²</span><span class=\"pop-price\">" + priceLabel(l, s.unit) + "</span></a>", { closeButton: false, minWidth: 220 });
      m.on("click", () => highlight(l.id, true));
      markers[l.id] = m;
    });
    fitMarkers();
    $$("#r-grid .card").forEach(c => {
      c.addEventListener("mouseenter", () => highlight(c.dataset.id, false));
      c.addEventListener("mouseleave", () => highlight(null, false));
    });
  }
  function fitMarkers() {
    const ms = Object.values(markers);
    if (!searchMap || !ms.length) return;
    searchMap.fitBounds(L.featureGroup(ms).getBounds(), { padding: window.innerWidth < 600 ? [24, 24] : [50, 50], maxZoom: 17 });
  }
  function highlight(id, scroll) {
    Object.keys(markers).forEach(k => { const el = markers[k].getElement(); if (el) { el.firstChild.classList.toggle("active", k === id); markers[k].setZIndexOffset(k === id ? 1000 : 0); } });
    $$("#r-grid .card").forEach(c => c.classList.toggle("active", c.dataset.id === id));
    if (scroll && id && !$("#split").classList.contains("show-map")) { const c = $('#r-grid .card[data-id="' + id + '"]'); if (c) c.scrollIntoView({ behavior: "smooth", block: "center" }); }
  }

  /* =================================================================
     LISTING PAGE
     ================================================================= */
  let calMonth = 0;
  function renderSpace(id) {
    const l = findListing(id); if (!l) return renderNotFound();
    const sel = state.sel[id] = state.sel[id] || { start: "", end: "" };
    if (!sel.start && state.search.start && state.search.end && !checkRange(l, state.search.start, state.search.end)) { sel.start = state.search.start; sel.end = state.search.end; }
    calMonth = 0;
    const imgs = imagesOf(l);
    app.innerHTML =
      '<div class="container listing">' +
      '<a class="back" href="#/search">← All spaces</a>' +
      '<div class="listing-head"><div><p class="eyebrow">' + AREAS[l.area].name + " · " + esc(l.street) + "</p><h1>" + esc(l.title) + "</h1></div>" +
      '<button class="btn btn-ghost btn-sm" id="share">Copy link</button></div>' +
      '<div class="gallery">' + imgs.map((src, i) => '<button class="g g' + i + '" data-i="' + i + '" aria-label="Open photo ' + (i + 1) + '"><img src="' + src + '" alt=""></button>').join("") +
      '<button class="btn btn-light btn-sm g-all" data-i="0">View all photos</button></div>' +
      '<div class="listing-body"><div class="listing-main">' +
      '<div class="facts">' +
      fact("Size", l.size + " m²") + fact("Price", money(l.priceDay) + " / day") + fact("Weekly", money(l.priceWeek) + " / week") + fact("Minimum stay", plural(l.minStay, "day")) + "</div>" +
      '<section><h2>About this space</h2><p class="body-lg">' + esc(l.description) + "</p></section>" +
      '<section><h2>Allowed uses</h2><div class="tags tags-lg">' + l.uses.map(u => '<span class="tag">' + USES[u] + "</span>").join("") + "</div></section>" +
      "<section><h2>Amenities</h2>" + amenityList(l) + "</section>" +
      '<section class="owner-note"><div class="avatar">' + esc(l.owner.charAt(0)) + '</div><div><h3>A note from ' + esc(l.owner) + '</h3><p>“' + esc(l.note) + '”</p><p class="muted small">Owner · usually replies within 24 hours</p></div></section>' +
      '<section><h2>Availability</h2><p class="muted">Click a start date, then an end date. Crossed-out dates are already booked.</p><div id="cal" class="cal"></div></section>' +
      '<section><h2>Location</h2><div id="mini-map" class="mini-map"></div><p class="muted small">' + esc(l.street) + ", " + AREAS[l.area].name + ", Beirut. The exact address is shared once your request is accepted.</p></section>" +
      '</div><aside class="bookcol"><div class="bookbox" id="bookbox"></div></aside></div></div>' +
      '<div class="mobile-bar"><div><b>' + money(l.priceDay) + '</b> / day<br><span class="muted small" id="mb-dates"></span></div><a class="btn" id="mb-btn" href="#/book/' + esc(l.id) + '">Request to book</a></div>';

    $("#share").addEventListener("click", () => {
      const done = () => toast("Link copied");
      if (navigator.clipboard) navigator.clipboard.writeText(location.href).then(done, () => toast(location.href)); else toast(location.href);
    });
    $$(".gallery [data-i]").forEach(b => b.addEventListener("click", () => openLightbox(imgs, +b.dataset.i)));
    renderCal(l); renderBookbox(l);
    const m = makeMap($("#mini-map"), [l.lat, l.lng], 16);
    if (m) {
      L.circle([l.lat, l.lng], { radius: 60, color: "#111", weight: 1, fillColor: "#c4532d", fillOpacity: .25 }).addTo(m);
      L.marker([l.lat, l.lng], { icon: pinIcon(money(l.priceDay)) }).addTo(m);
    }
  }
  function fact(k, v) { return '<div class="fact"><span>' + k + "</span><b>" + v + "</b></div>"; }

  function renderCal(l) {
    const sel = state.sel[l.id], t = today();
    let html = '<div class="cal-nav"><button class="icon-btn" id="cal-prev" ' + (calMonth <= 0 ? "disabled" : "") + ' aria-label="Previous month">‹</button><button class="icon-btn" id="cal-next" ' + (calMonth >= 10 ? "disabled" : "") + ' aria-label="Next month">›</button></div><div class="cal-months">';
    for (let k = 0; k < 2; k++) {
      const first = new Date(t.getFullYear(), t.getMonth() + calMonth + k, 1);
      const days = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const lead = (first.getDay() + 6) % 7; // Monday first
      html += '<div class="cal-month"><h4>' + first.toLocaleDateString("en-GB", { month: "long", year: "numeric" }) + '</h4><div class="cal-grid">' +
        ["M", "T", "W", "T", "F", "S", "S"].map(d => '<span class="dow">' + d + "</span>").join("");
      for (let i = 0; i < lead; i++) html += "<span></span>";
      for (let d = 1; d <= days; d++) {
        const ds = iso(new Date(first.getFullYear(), first.getMonth(), d));
        const past = ds < todayIso(), taken = !past && !isDayAvailable(l, ds);
        let cls = "day";
        if (past) cls += " past"; else if (taken) cls += " taken";
        if (sel.start && ds === sel.start) cls += " sel start";
        if (sel.end && ds === sel.end) cls += " sel end";
        if (sel.start && sel.end && ds > sel.start && ds < sel.end) cls += " inrange";
        html += '<button class="' + cls + '" data-d="' + ds + '"' + (past || taken ? " disabled" : "") + ">" + d + "</button>";
      }
      html += "</div></div>";
    }
    html += '</div><div class="cal-legend"><span><i class="lg lg-free"></i>Available</span><span><i class="lg lg-taken"></i>Booked</span><span><i class="lg lg-sel"></i>Your dates</span>' +
      (sel.start ? '<button class="link-btn" id="cal-clear">Clear dates</button>' : "") + "</div>";
    const el = $("#cal"); el.innerHTML = html;
    $("#cal-prev").addEventListener("click", () => { calMonth--; renderCal(l); });
    $("#cal-next").addEventListener("click", () => { calMonth++; renderCal(l); });
    const clr = $("#cal-clear"); if (clr) clr.addEventListener("click", () => { sel.start = sel.end = ""; renderCal(l); renderBookbox(l); });
    $$(".day:not([disabled])", el).forEach(b => b.addEventListener("click", () => {
      const d = b.dataset.d;
      if (!sel.start || sel.end || d < sel.start) { sel.start = d; sel.end = ""; }
      else {
        if (!isRangeFree(l, sel.start, d)) { toast("That range includes booked dates, so we started a new selection from this day."); sel.start = d; sel.end = ""; }
        else sel.end = d;
      }
      renderCal(l); renderBookbox(l);
    }));
  }

  function renderBookbox(l) {
    const sel = state.sel[l.id];
    const err = sel.start && sel.end ? checkRange(l, sel.start, sel.end) : "";
    let summary = "";
    if (sel.start && sel.end && !err) {
      const qt = quote(l, sel.start, sel.end);
      summary = '<div class="sum">' +
        "<div><span>" + (qt.weekly ? "Rent (" + plural(qt.days, "day") + ", weekly rate applied)" : money(l.priceDay) + " × " + plural(qt.days, "day")) + "</span><span>" + money(qt.rent) + "</span></div>" +
        "<div><span>" + esc(C.brand) + " service fee</span><span>" + money(qt.fee) + "</span></div>" +
        '<div class="sum-total"><span>Estimated total</span><span>' + money(qt.total) + "</span></div></div>";
    }
    $("#bookbox").innerHTML =
      '<div class="bb-price"><b>' + money(l.priceDay) + "</b> / day <span class=\"muted\">· " + money(l.priceWeek) + " / week</span></div>" +
      '<div class="bb-dates"><label><span>From</span><input type="date" id="bb-start" min="' + todayIso() + '" value="' + esc(sel.start) + '"></label>' +
      '<label><span>Until</span><input type="date" id="bb-end" min="' + esc(sel.start || todayIso()) + '" value="' + esc(sel.end) + '"></label></div>' +
      (err ? '<p class="error">' + esc(err) + "</p>" : "") +
      (!sel.start || !sel.end ? '<p class="muted small">Pick dates here or on the calendar. Minimum stay ' + plural(l.minStay, "day") + ".</p>" : "") +
      summary +
      '<a class="btn btn-block" id="bb-go" href="' + bookHref(l, sel) + '">Request to book</a>' +
      '<p class="muted small center">You won\'t be charged yet. The owner reviews your request first.</p>';
    $("#bb-start").addEventListener("change", e => { sel.start = e.target.value; if (sel.end && sel.end < sel.start) sel.end = ""; renderCal(l); renderBookbox(l); });
    $("#bb-end").addEventListener("change", e => { sel.end = e.target.value; renderCal(l); renderBookbox(l); });
    const mb = $("#mb-dates"); if (mb) mb.textContent = sel.start && sel.end ? fmtShort(sel.start) + " – " + fmtShort(sel.end) : "Min. " + plural(l.minStay, "day");
    const mbb = $("#mb-btn"); if (mbb) mbb.href = bookHref(l, sel);
  }
  function bookHref(l, sel) {
    const p = new URLSearchParams();
    if (sel.start) p.set("start", sel.start);
    if (sel.end) p.set("end", sel.end);
    return "#/book/" + l.id + (p.toString() ? "?" + p : "");
  }

  /* lightbox */
  let lb = null;
  function openLightbox(imgs, i) {
    closeLightbox();
    lb = document.createElement("div"); lb.className = "lightbox"; lb.setAttribute("role", "dialog");
    lb.innerHTML = '<button class="lb-close" aria-label="Close">×</button><button class="lb-prev" aria-label="Previous">‹</button><img alt=""><button class="lb-next" aria-label="Next">›</button><div class="lb-count"></div>';
    document.body.appendChild(lb); document.body.style.overflow = "hidden";
    const show = n => { i = (n + imgs.length) % imgs.length; $("img", lb).src = imgs[i]; $(".lb-count", lb).textContent = (i + 1) + " / " + imgs.length; };
    lb._show = d => show(i + d);
    $(".lb-close", lb).onclick = closeLightbox;
    $(".lb-prev", lb).onclick = () => show(i - 1);
    $(".lb-next", lb).onclick = () => show(i + 1);
    lb.addEventListener("click", e => { if (e.target === lb) closeLightbox(); });
    show(i);
  }
  function closeLightbox() { if (lb) { lb.remove(); lb = null; document.body.style.overflow = ""; } }
  document.addEventListener("keydown", e => {
    if (!lb) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") lb._show(1);
    if (e.key === "ArrowLeft") lb._show(-1);
  });

  /* =================================================================
     BOOKING REQUEST
     ================================================================= */
  function renderBook(id, q) {
    const l = findListing(id); if (!l) return renderNotFound();
    const sel = state.sel[id] = state.sel[id] || { start: "", end: "" };
    if (q.get("start")) sel.start = q.get("start");
    if (q.get("end")) sel.end = q.get("end");
    const f = state.bookForm && state.bookForm.id === id ? state.bookForm : { id: id, use: l.uses[0], project: "", desc: "", people: "Under 30", name: "", email: "" };
    state.bookForm = f;
    app.innerHTML =
      '<div class="container narrow-page"><a class="back" href="#/space/' + esc(id) + '">← Back to ' + esc(l.title) + "</a>" +
      '<h1 class="page-title">Request to book</h1><p class="muted">Tell ' + esc(l.owner) + " about your project. Owners accept the requests that fit their space best.</p>" +
      '<div class="book-layout"><form class="form" id="book-form" novalidate>' +
      '<fieldset><legend>1. Your dates</legend><div class="row2">' +
      '<label class="field"><span>From</span><input type="date" name="start" min="' + todayIso() + '" value="' + esc(sel.start) + '" required></label>' +
      '<label class="field"><span>Until</span><input type="date" name="end" min="' + todayIso() + '" value="' + esc(sel.end) + '" required></label></div>' +
      '<p class="error" data-err="dates" hidden></p></fieldset>' +
      '<fieldset><legend>2. What will you use it for?</legend><div class="radio-cards">' +
      Object.keys(USES).map(u => {
        const allowed = l.uses.includes(u);
        return '<label class="rcard' + (allowed ? "" : " disabled") + '"><input type="radio" name="use" value="' + u + '"' + (f.use === u ? " checked" : "") + (allowed ? "" : " disabled") + "><span>" + USES[u] + "</span>" + (allowed ? "" : "<small>Not allowed here</small>") + "</label>";
      }).join("") + '</div><p class="error" data-err="use" hidden></p></fieldset>' +
      '<fieldset><legend>3. Your project</legend>' +
      '<label class="field"><span>Project or brand name</span><input name="project" maxlength="80" placeholder="e.g. Sakker Ceramics winter pop-up" value="' + esc(f.project) + '"></label><p class="error" data-err="project" hidden></p>' +
      '<label class="field"><span>Describe your project</span><textarea name="desc" rows="5" maxlength="1200" placeholder="What will happen in the space, who is it for, and how will you set it up?">' + esc(f.desc) + "</textarea></label><p class=\"error\" data-err=\"desc\" hidden></p>" +
      '<label class="field"><span>Expected visitors per day</span><select name="people">' + ["Under 30", "30–100", "100–300", "300 +"].map(o => "<option" + (f.people === o ? " selected" : "") + ">" + o + "</option>").join("") + "</select></label></fieldset>" +
      '<fieldset><legend>4. About you</legend><div class="row2">' +
      '<label class="field"><span>Your name</span><input name="fullname" maxlength="60" value="' + esc(f.name) + '" placeholder="First and last name"></label>' +
      '<label class="field"><span>Email</span><input name="email" type="email" maxlength="80" value="' + esc(f.email) + '" placeholder="you@example.com"></label></div>' +
      '<p class="error" data-err="contact" hidden></p><p class="muted small">Prototype: these details are not stored or sent anywhere.</p></fieldset>' +
      '<button class="btn btn-lg" type="submit">Send request</button></form>' +
      '<aside class="book-summary" id="book-summary"></aside></div></div>';

    const form = $("#book-form");
    const readForm = () => {
      sel.start = form.start.value; sel.end = form.end.value;
      const u = form.querySelector('input[name="use"]:checked');
      Object.assign(f, { use: u ? u.value : "", project: form.project.value.trim(), desc: form.desc.value.trim(), people: form.people.value, name: form.fullname.value.trim(), email: form.email.value.trim() });
    };
    const refresh = () => { readForm(); form.end.min = sel.start || todayIso(); renderBookSummary(l); };
    form.addEventListener("input", refresh);
    form.addEventListener("change", refresh);
    renderBookSummary(l);
    form.addEventListener("submit", e => {
      e.preventDefault(); readForm();
      const errs = {};
      const dErr = checkRange(l, sel.start, sel.end); if (dErr) errs.dates = dErr;
      if (!f.use) errs.use = "Choose how you'll use the space.";
      if (f.project.length < 2) errs.project = "Give your project a name.";
      if (f.desc.length < 20) errs.desc = "Add a few more words (at least 20 characters) so the owner understands your project.";
      if (f.name.length < 2 || !/^\S+@\S+\.\S+$/.test(f.email)) errs.contact = "Add your name and a valid email address.";
      $$("[data-err]", form).forEach(p => { p.hidden = !errs[p.dataset.err]; p.textContent = errs[p.dataset.err] || ""; });
      const firstErr = $("[data-err]:not([hidden])", form);
      if (firstErr) { firstErr.closest("fieldset").scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      const ref = "VT-" + Math.random().toString(36).slice(2, 7).toUpperCase();
      state.requests[ref] = { ref, listingId: l.id, start: sel.start, end: sel.end, use: f.use, project: f.project, name: f.name, quote: quote(l, sel.start, sel.end) };
      state.bookForm = null; state.sel[id] = { start: "", end: "" };
      location.hash = "#/sent/" + ref;
    });
  }
  function renderBookSummary(l) {
    const sel = state.sel[l.id], err = sel.start && sel.end ? checkRange(l, sel.start, sel.end) : "Choose your dates to see the estimated total.";
    let body = "";
    if (!err) {
      const qt = quote(l, sel.start, sel.end);
      body = '<p class="bs-dates">' + fmt(sel.start) + " → " + fmt(sel.end) + "<br><span class=\"muted\">" + plural(qt.days, "day") + "</span></p>" +
        '<div class="sum"><div><span>' + (qt.weekly ? "Rent (weekly rate applied)" : money(l.priceDay) + " × " + plural(qt.days, "day")) + "</span><span>" + money(qt.rent) + "</span></div>" +
        "<div><span>Service fee (" + Math.round(C.serviceFeeRate * 100) + "%)</span><span>" + money(qt.fee) + "</span></div>" +
        '<div class="sum-total"><span>Estimated total</span><span>' + money(qt.total) + "</span></div></div>" +
        '<p class="muted small">Nothing is charged until ' + esc(l.owner) + " accepts.</p>";
    } else body = '<p class="' + (sel.start && sel.end ? "error" : "muted") + '">' + esc(err) + "</p>";
    $("#book-summary").innerHTML = '<div class="bs-card"><img src="' + imagesOf(l)[0] + '" alt=""><div class="bs-body"><h3>' + esc(l.title) + '</h3><p class="muted small">' + esc(l.street) + ", " + AREAS[l.area].name + " · " + l.size + " m²</p>" + body + "</div></div>";
  }

  function renderSent(ref) {
    const r = state.requests[ref];
    if (!r) { app.innerHTML = '<div class="container narrow-page center-page"><h1 class="page-title">This request has expired</h1><p class="muted">Confirmation pages only exist for the session in which a request was made.</p><a class="btn" href="#/search">Browse spaces</a></div>'; return; }
    const l = findListing(r.listingId);
    app.innerHTML =
      '<div class="container narrow-page center-page"><div class="check">✓</div>' +
      '<p class="eyebrow">Request ' + esc(r.ref) + '</p><h1 class="page-title">Your request is on its way to ' + esc(l.owner) + "</h1>" +
      '<p class="lede-dark">We\'ve shared <b>' + esc(r.project) + "</b> with the owner of <b>" + esc(l.title) + "</b>. You'll usually hear back within 24 hours.</p>" +
      '<div class="confirm-card"><img src="' + imagesOf(l)[0] + '" alt=""><div>' +
      "<p><b>" + esc(l.title) + '</b><br><span class="muted">' + esc(l.street) + ", " + AREAS[l.area].name + "</span></p>" +
      "<p>" + fmt(r.start) + " → " + fmt(r.end) + " · " + plural(r.quote.days, "day") + "<br>" + USES[r.use] + "</p>" +
      '<p class="big-total">Estimated total ' + money(r.quote.total) + "</p></div></div>" +
      '<div class="next-steps"><h2>What happens next</h2><ol>' +
      "<li><b>The owner reviews your request.</b> They may message you with questions about your setup.</li>" +
      "<li><b>You agree on the details.</b> Opening hours, deposit and what can go on the walls.</li>" +
      "<li><b>You pay and collect the keys.</b> Payment is held until your first day.</li></ol></div>" +
      '<p class="muted small">Prototype: nothing was actually sent. This is a demonstration screen.</p>' +
      '<div class="btn-row center-row"><a class="btn" href="#/search">Browse more spaces</a><a class="btn btn-ghost" href="#/">Back to home</a></div></div>';
  }

  /* =================================================================
     LIST YOUR SPACE (owner)
     ================================================================= */
  const STEPS = ["Location", "The space", "Photos", "Price & dates", "Uses & note"];
  const POWER = ["24h — EDL + building generator", "24h — private generator", "20h — EDL + generator", "12h — EDL only"];
  const SHUTTERS = ["Manual rolling shutter", "Electric rolling shutter", "Glass door, no shutter"];
  const LOOKS = window.LISTINGS.map(l => l.look).slice(0, 8);
  function newDraft() {
    return {
      area: "gemmayzeh", street: "Gouraud Street", streetOther: "", lat: null, lng: null,
      title: "", size: "", frontage: "", description: "",
      power: POWER[0], water: true, shutter: SHUTTERS[0], toilet: false, wifi: false, storage: false,
      photos: [], look: 0,
      priceDay: "", priceWeek: "", minStay: 1, availFrom: todayIso(), availTo: iso(addDays(today(), 90)),
      uses: [], note: "", owner: ""
    };
  }
  function draft() { if (!state.draft) state.draft = newDraft(); return state.draft; }
  function saveDraft() { const d = Object.assign({}, state.draft); if (!sSet(DKEY, d)) sSet(DKEY, Object.assign(d, { photos: [] })); }
  const streetOf = d => d.street === "__other" ? (d.streetOther || "Unnamed street") : d.street;

  function renderList(stepArg) {
    if (stepArg === "preview") return renderListPreview();
    const n = Math.min(5, Math.max(1, parseInt(stepArg, 10) || 1));
    const d = draft();
    const stepper = '<ol class="stepper">' + STEPS.map((s, i) => '<li class="' + (i + 1 < n ? "done" : i + 1 === n ? "on" : "") + '"><span>' + (i + 1) + "</span>" + s + "</li>").join("") + "</ol>";
    let body = "", tip = "";
    if (n === 1) {
      tip = "Renters search by neighbourhood first. Drop the pin roughly; the exact address is only shared after you accept a booking.";
      const streets = AREAS[d.area].streets;
      body = '<h1 class="page-title">Where is your space?</h1>' +
        '<div class="radio-cards two">' + Object.keys(AREAS).map(k => '<label class="rcard"><input type="radio" name="area" value="' + k + '"' + (d.area === k ? " checked" : "") + "><span>" + AREAS[k].name + "</span></label>").join("") + "</div>" +
        '<label class="field"><span>Street</span><select name="street">' + streets.map(s => "<option" + (d.street === s ? " selected" : "") + ">" + s + "</option>").join("") + '<option value="__other"' + (d.street === "__other" ? " selected" : "") + ">Other street…</option></select></label>" +
        '<label class="field" id="street-other"' + (d.street === "__other" ? "" : " hidden") + '><span>Street name</span><input name="streetOther" maxlength="60" value="' + esc(d.streetOther) + '"></label>' +
        '<div class="field"><span>Click the map to place your pin</span><div id="pick-map" class="pick-map"></div></div>';
    } else if (n === 2) {
      tip = "Be specific about electricity. In Beirut, generator hours and amperage are one of the first things renters ask about.";
      body = '<h1 class="page-title">Tell us about the space</h1>' +
        '<label class="field"><span>Listing title</span><input name="title" maxlength="60" placeholder="e.g. Sunny corner shop on Gouraud" value="' + esc(d.title) + '"></label>' +
        '<div class="row2"><label class="field"><span>Floor area (m²)</span><input name="size" type="number" min="5" max="2000" value="' + esc(d.size) + '"></label>' +
        '<label class="field"><span>Street frontage (m)</span><input name="frontage" type="number" min="1" max="50" value="' + esc(d.frontage) + '"></label></div>' +
        '<label class="field"><span>Short description</span><textarea name="description" rows="4" maxlength="600" placeholder="Ceilings, floors, light, what makes it special…">' + esc(d.description) + "</textarea></label>" +
        '<div class="row2"><label class="field"><span>Electricity</span><select name="power">' + POWER.map(p => "<option" + (d.power === p ? " selected" : "") + ">" + p + "</option>").join("") + "</select></label>" +
        '<label class="field"><span>Shutter</span><select name="shutter">' + SHUTTERS.map(p => "<option" + (d.shutter === p ? " selected" : "") + ">" + p + "</option>").join("") + "</select></label></div>" +
        '<div class="field"><span>Amenities</span><div class="checks">' +
        [["water", "Running water"], ["toilet", "Toilet"], ["wifi", "Wi-Fi"], ["storage", "Storage / back room"]].map(([k, t]) => '<label class="check-item"><input type="checkbox" name="' + k + '"' + (d[k] ? " checked" : "") + "> " + t + "</label>").join("") + "</div></div>";
    } else if (n === 3) {
      tip = "Photos taken in daylight with the shutter fully up get the most requests. This prototype keeps photos only in your browser.";
      body = '<h1 class="page-title">Add photos</h1>' +
        '<label class="upload"><input type="file" name="photos" accept="image/*" multiple><b>Upload photos</b><span class="muted small">JPG or PNG, up to 4. They stay on this device and are not uploaded.</span></label>' +
        '<div class="thumbs" id="thumbs"></div>' +
        '<div class="field"><span>No photos to hand? Pick a placeholder facade</span><div class="looks">' +
        LOOKS.map((k, i) => '<button type="button" class="look' + (d.look === i ? " on" : "") + '" data-look="' + i + '"><img src="' + Facade.exterior(k) + '" alt="Placeholder style ' + (i + 1) + '"></button>').join("") + "</div></div>";
    } else if (n === 4) {
      tip = "Similar spaces in these neighbourhoods list for about $2–3 per m² per day. A weekly price of around 5 × the daily rate encourages longer bookings.";
      body = '<h1 class="page-title">Set your price and dates</h1>' +
        '<div class="row2"><label class="field"><span>Price per day (USD)</span><input name="priceDay" type="number" min="5" max="5000" value="' + esc(d.priceDay) + '"></label>' +
        '<label class="field"><span>Price per week (USD)</span><input name="priceWeek" type="number" min="5" max="30000" value="' + esc(d.priceWeek) + '" placeholder="' + (d.priceDay ? "Suggested: " + Math.round(d.priceDay * 5.3) : "") + '"></label></div>' +
        '<label class="field"><span>Minimum stay</span><select name="minStay">' + [1, 2, 3, 5, 7, 14].map(v => '<option value="' + v + '"' + (+d.minStay === v ? " selected" : "") + ">" + plural(v, "day") + "</option>").join("") + "</select></label>" +
        '<div class="row2"><label class="field"><span>Available from</span><input name="availFrom" type="date" min="' + todayIso() + '" value="' + esc(d.availFrom) + '"></label>' +
        '<label class="field"><span>Available until</span><input name="availTo" type="date" min="' + todayIso() + '" value="' + esc(d.availTo) + '"></label></div>';
    } else {
      tip = "A personal note builds trust. Say why you're opening the space and what kind of projects you'd love to host.";
      body = '<h1 class="page-title">What can happen in your space?</h1>' +
        '<div class="field"><span>Allowed uses (choose at least one)</span><div class="radio-cards">' + Object.keys(USES).map(u => '<label class="rcard"><input type="checkbox" name="uses" value="' + u + '"' + (d.uses.includes(u) ? " checked" : "") + "><span>" + USES[u] + "</span></label>").join("") + "</div></div>" +
        '<label class="field"><span>Your first name and initial</span><input name="owner" maxlength="40" placeholder="e.g. Rita K." value="' + esc(d.owner) + '"></label>' +
        '<label class="field"><span>A note to renters</span><textarea name="note" rows="4" maxlength="400" placeholder="The story of the space, house rules, what you\'d love to see here…">' + esc(d.note) + "</textarea></label>";
    }
    app.innerHTML = '<div class="container list-page">' + stepper +
      '<div class="list-layout"><form class="form" id="list-form" novalidate>' + body +
      '<p class="error" id="step-err" hidden></p>' +
      '<div class="btn-row">' + (n > 1 ? '<a class="btn btn-ghost" href="#/list/' + (n - 1) + '">Back</a>' : '<a class="btn btn-ghost" href="#/">Cancel</a>') +
      '<button class="btn" type="submit">' + (n < 5 ? "Continue" : "Preview listing") + "</button></div></form>" +
      '<aside class="tip"><p class="eyebrow">Tip</p><p>' + tip + '</p><p class="muted small">Step ' + n + " of 5 · your progress is saved for this session.</p></aside></div></div>";

    const form = $("#list-form");
    const read = () => {
      $$("input, select, textarea", form).forEach(el => {
        if (!el.name || el.type === "file") return;
        if (el.name === "uses") return;
        if (el.type === "radio") { if (el.checked) d[el.name] = el.value; return; }
        if (el.type === "checkbox") { d[el.name] = el.checked; return; }
        d[el.name] = el.value;
      });
      if (n === 5) d.uses = $$('input[name="uses"]:checked', form).map(x => x.value);
      saveDraft();
    };
    form.addEventListener("change", read);
    form.addEventListener("input", read);

    if (n === 1) {
      const m = makeMap($("#pick-map"), d.lat ? [d.lat, d.lng] : AREAS[d.area].center, 16);
      let mk = null;
      const place = (lat, lng) => {
        d.lat = lat; d.lng = lng; saveDraft();
        if (!m) return;
        if (mk) mk.setLatLng([lat, lng]); else mk = L.marker([lat, lng], { icon: pinIcon("Your space", "pin-new") }).addTo(m);
      };
      if (m) {
        if (d.lat) place(d.lat, d.lng);
        m.on("click", e => place(+e.latlng.lat.toFixed(5), +e.latlng.lng.toFixed(5)));
      }
      $$('input[name="area"]', form).forEach(r => r.addEventListener("change", () => {
        d.area = r.value; d.street = AREAS[d.area].streets[0]; d.lat = d.lng = null; saveDraft(); renderList(1);
      }));
      form.street.addEventListener("change", () => { $("#street-other").hidden = form.street.value !== "__other"; });
    }
    if (n === 4) {
      form.priceDay.addEventListener("input", () => { form.priceWeek.placeholder = +form.priceDay.value > 0 ? "Suggested: " + Math.round(form.priceDay.value * 5.3) : ""; });
    }
    if (n === 3) {
      const drawThumbs = () => {
        $("#thumbs").innerHTML = d.photos.map((p, i) => '<div class="thumb"><img src="' + p + '" alt=""><button type="button" data-rm="' + i + '" aria-label="Remove photo">×</button></div>').join("");
        $$("[data-rm]").forEach(b => b.addEventListener("click", () => { d.photos.splice(+b.dataset.rm, 1); saveDraft(); drawThumbs(); }));
      };
      drawThumbs();
      form.photos.addEventListener("change", e => {
        const files = Array.from(e.target.files).filter(f => f.type.startsWith("image/")).slice(0, 4 - d.photos.length);
        if (!files.length && e.target.files.length) toast("You can add up to 4 photos.");
        files.forEach(file => shrink(file, url => { if (d.photos.length < 4) { d.photos.push(url); saveDraft(); drawThumbs(); } }));
        e.target.value = "";
      });
      $$("[data-look]").forEach(b => b.addEventListener("click", () => { d.look = +b.dataset.look; $$("[data-look]").forEach(x => x.classList.toggle("on", x === b)); saveDraft(); }));
    }

    form.addEventListener("submit", e => {
      e.preventDefault(); read();
      const err = validateStep(n, d);
      const el = $("#step-err");
      if (err) { el.textContent = err; el.hidden = false; el.scrollIntoView({ behavior: "smooth", block: "center" }); return; }
      if (n === 4 && !d.priceWeek) d.priceWeek = String(Math.round(d.priceDay * 5.3));
      saveDraft();
      location.hash = n < 5 ? "#/list/" + (n + 1) : "#/list/preview";
    });
  }
  function validateStep(n, d) {
    if (n === 1) {
      if (d.street === "__other" && !d.streetOther.trim()) return "Type the street name.";
      if (!d.lat) {
        // no pin dropped: place it near the neighbourhood centre
        const c = AREAS[d.area].center; d.lat = +(c[0] + (Math.random() - .5) * .002).toFixed(5); d.lng = +(c[1] + (Math.random() - .5) * .003).toFixed(5);
      }
    }
    if (n === 2) {
      if (d.title.trim().length < 3) return "Give your listing a title.";
      if (!(+d.size >= 5)) return "Enter the floor area in m² (at least 5).";
      if (!(+d.frontage >= 1)) return "Enter the street frontage in metres.";
    }
    if (n === 4) {
      if (!(+d.priceDay >= 5)) return "Enter a daily price of at least $5.";
      if (d.priceWeek && +d.priceWeek < 5) return "Enter a valid weekly price.";
      if (!d.availFrom || !d.availTo || d.availTo < d.availFrom) return "Check your availability dates.";
      if (dayCount(d.availFrom, d.availTo) < +d.minStay) return "Your availability window is shorter than the minimum stay.";
    }
    if (n === 5) {
      if (!d.uses.length) return "Choose at least one allowed use.";
      if (d.owner.trim().length < 2) return "Add your name so renters know who they're talking to.";
    }
    return "";
  }
  function firstInvalidStep(d) { for (let i = 1; i <= 5; i++) if (validateStep(i, d)) return i; return 0; }
  function shrink(file, cb) {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1000, k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        cb(c.toDataURL("image/jpeg", .78));
      };
      img.onerror = () => toast("That file couldn't be read as an image.");
      img.src = r.result;
    };
    r.readAsDataURL(file);
  }
  function draftToListing(d, id) {
    return prepare({
      id: id, title: d.title.trim(), area: d.area, street: streetOf(d), lat: d.lat, lng: d.lng,
      size: +d.size, frontage: +d.frontage, priceDay: +d.priceDay, priceWeek: +(d.priceWeek || Math.round(d.priceDay * 5.3)), minStay: +d.minStay,
      uses: d.uses.slice(), owner: d.owner.trim(),
      amenities: { power: d.power, water: d.water, shutter: d.shutter, toilet: d.toilet, wifi: d.wifi, storage: d.storage },
      note: d.note.trim() || "Happy to show you around before you book.",
      description: d.description.trim() || "A ground-floor space with direct street access in " + AREAS[d.area].name + ".",
      photos: d.photos.slice(), look: LOOKS[d.look] || LOOKS[0],
      availFrom: d.availFrom, availTo: d.availTo, blocked: [], isNew: true, featured: false
    });
  }
  function renderListPreview() {
    const d = draft(), bad = firstInvalidStep(d);
    if (bad) { location.replace("#/list/" + bad); return; }
    const l = draftToListing(d, "preview");
    const edit = n => '<a class="link-btn" href="#/list/' + n + '">Edit</a>';
    app.innerHTML = '<div class="container list-page"><a class="back" href="#/list/5">← Back to editing</a>' +
      '<h1 class="page-title">Preview your listing</h1><p class="muted">This is how renters will see your space. Check everything, then publish.</p>' +
      '<div class="preview-layout"><div><p class="eyebrow">Search result card</p><div class="preview-card">' + card(l).replace('href="#/space/preview"', 'href="javascript:void(0)"') + "</div></div>" +
      '<div class="preview-sheet">' +
      '<div class="pv-row"><div><p class="eyebrow">Location</p><p>' + esc(l.street) + ", " + AREAS[l.area].name + "</p></div>" + edit(1) + "</div>" +
      '<div class="pv-row"><div><p class="eyebrow">The space</p><h3>' + esc(l.title) + "</h3><p>" + l.size + " m² · " + l.frontage + " m frontage</p><p class=\"muted\">" + esc(l.description) + "</p></div>" + edit(2) + "</div>" +
      '<div class="pv-row"><div><p class="eyebrow">Amenities</p>' + amenityList(l) + "</div>" + edit(2) + "</div>" +
      '<div class="pv-row"><div><p class="eyebrow">Photos</p><div class="pv-photos">' + imagesOf(l).map(s => '<img src="' + s + '" alt="">').join("") + '</div><p class="muted small">' + (d.photos.length ? plural(d.photos.length, "uploaded photo") + " + placeholder interiors" : "Placeholder illustrations") + "</p></div>" + edit(3) + "</div>" +
      '<div class="pv-row"><div><p class="eyebrow">Price & availability</p><p>' + money(l.priceDay) + " / day · " + money(l.priceWeek) + " / week · min " + plural(l.minStay, "day") + "</p><p>" + fmt(l.availFrom) + " → " + fmt(l.availTo) + "</p></div>" + edit(4) + "</div>" +
      '<div class="pv-row"><div><p class="eyebrow">Allowed uses & note</p><div class="tags">' + l.uses.map(u => '<span class="tag">' + USES[u] + "</span>").join("") + '</div><p>“' + esc(l.note) + '” — ' + esc(l.owner) + "</p></div>" + edit(5) + "</div>" +
      '<div class="btn-row"><button class="btn btn-lg" id="publish">Publish listing</button><a class="btn btn-ghost btn-lg" href="#/list/5">Keep editing</a></div>' +
      '<p class="muted small">Prototype: your listing will appear in search for this browser session only.</p></div></div></div>';
    $("#publish").addEventListener("click", () => {
      const nl = draftToListing(d, "my-" + Date.now().toString(36));
      state.listings.unshift(nl); saveUserListings();
      state.draft = null; try { sessionStorage.removeItem(DKEY); } catch (e) { }
      location.hash = "#/listed/" + nl.id;
    });
  }
  function renderListed(id) {
    const l = findListing(id); if (!l) return renderNotFound();
    app.innerHTML = '<div class="container narrow-page center-page"><div class="check">✓</div><p class="eyebrow">Listing published</p>' +
      '<h1 class="page-title">' + esc(l.title) + " is live</h1>" +
      '<p class="lede-dark">Renters can now find your space in ' + AREAS[l.area].name + " search results and send you booking requests. We'll notify you as soon as the first one arrives.</p>" +
      '<div class="success-card">' + card(l) + "</div>" +
      '<p class="muted small">Prototype: the listing is stored in this browser tab only and disappears when you close it.</p>' +
      '<div class="btn-row center-row"><a class="btn" href="#/space/' + esc(l.id) + '">View your listing</a><a class="btn btn-ghost" href="#/search?area=' + l.area + '">See it on the map</a><a class="btn btn-ghost" href="#/list/1">List another space</a></div></div>';
  }

  function renderNotFound() {
    app.innerHTML = '<div class="container narrow-page center-page"><h1 class="page-title">We couldn\'t find that page</h1><p class="muted">It may have been a listing from an earlier session.</p><a class="btn" href="#/">Go to home</a></div>';
  }

  /* =================================================================
     ROUTER
     ================================================================= */
  function route() {
    closeLightbox(); cleanupMaps(); searchMap = null; markers = {};
    const h = location.hash.replace(/^#/, "") || "/";
    const qi = h.indexOf("?");
    const path = qi >= 0 ? h.slice(0, qi) : h, q = new URLSearchParams(qi >= 0 ? h.slice(qi + 1) : "");
    const parts = path.split("/").filter(Boolean);
    document.body.dataset.page = parts[0] || "home";
    $$("[data-nav]").forEach(a => a.classList.toggle("current", a.dataset.nav === parts[0]));
    window.scrollTo(0, 0);
    switch (parts[0]) {
      case undefined: renderHome(q); break;
      case "search": renderSearch(q); break;
      case "space": renderSpace(decodeURIComponent(parts[1] || "")); break;
      case "book": renderBook(decodeURIComponent(parts[1] || ""), q); break;
      case "sent": renderSent(parts[1]); break;
      case "list": renderList(parts[1]); break;
      case "listed": renderListed(parts[1]); break;
      default: renderNotFound();
    }
    const titles = { home: C.tagline, search: "Find a space", space: "Space", book: "Request to book", sent: "Request sent", list: "List your space", listed: "Listing published" };
    document.title = C.brand + " – " + (titles[document.body.dataset.page] || "Beirut shopfronts");
  }

  // brand name everywhere
  $$("[data-brand]").forEach(el => el.textContent = C.brand);
  $$("[data-tagline]").forEach(el => el.textContent = C.tagline);
  $$("[data-course]").forEach(el => el.textContent = C.course);
  window.addEventListener("hashchange", route);
  route();
})();
