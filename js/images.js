/* ------------------------------------------------------------------
   PLACEHOLDER IMAGES — drawn in SVG so the prototype needs no photos.
   Swap any listing's images for real photos later by giving it an
   `photos: ["url1", "url2", ...]` array in data.js.
   ------------------------------------------------------------------ */
window.Facade = (function () {
  function uri(inner, vb) {
    return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '" preserveAspectRatio="xMidYMid slice">' + inner + "</svg>");
  }
  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, c + amt));
    const r = f(n >> 16), g = f((n >> 8) & 255), b = f(n & 255);
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // A Beirut-style two-storey facade: triple arch above, shop with rolling shutter below.
  function exteriorInner(k) {
    const wall = k.wall, sh = k.shutter;
    let s = '<rect width="800" height="600" fill="' + wall + '"/>';
    for (let y = 40; y < 290; y += 34) s += '<rect x="0" y="' + y + '" width="800" height="1.5" fill="#000" opacity=".05"/>';
    // side windows with louvred shutters
    [80, 650].forEach(x => {
      s += '<path d="M' + x + ',230 V130 A35,35 0 0 1 ' + (x + 70) + ',130 V230 Z" fill="#2c3b45" opacity=".85"/>';
      s += '<rect x="' + (x - 22) + '" y="110" width="22" height="120" fill="' + sh + '"/><rect x="' + (x + 70) + '" y="110" width="22" height="120" fill="' + sh + '"/>';
      for (let y = 116; y < 228; y += 8) s += '<rect x="' + (x - 20) + '" y="' + y + '" width="18" height="2" fill="#000" opacity=".2"/><rect x="' + (x + 72) + '" y="' + y + '" width="18" height="2" fill="#000" opacity=".2"/>';
    });
    // central triple arch
    for (let i = 0; i < 3; i++) {
      const x = 251 + i * 104;
      s += '<path d="M' + x + ',232 V125 A45,45 0 0 1 ' + (x + 90) + ',125 V232 Z" fill="#33454f"/>';
      s += '<path d="M' + x + ',232 V125 A45,45 0 0 1 ' + (x + 90) + ',125 V232" fill="none" stroke="' + shade(wall, 30) + '" stroke-width="6"/>';
      s += '<rect x="' + (x + 43) + '" y="85" width="4" height="147" fill="' + shade(wall, 30) + '" opacity=".8"/>';
      s += '<path d="M' + (x + 8) + ',120 A37,37 0 0 1 ' + (x + 40) + ',90" fill="none" stroke="#fff" stroke-width="3" opacity=".25"/>';
    }
    // balcony
    s += '<rect x="225" y="232" width="350" height="12" fill="' + shade(wall, -35) + '"/>';
    s += '<rect x="230" y="196" width="340" height="3" fill="#2b2b2b" opacity=".75"/>';
    for (let x = 234; x < 570; x += 12) s += '<rect x="' + x + '" y="198" width="2" height="34" fill="#2b2b2b" opacity=".6"/>';
    // cornice
    s += '<rect x="0" y="278" width="800" height="16" fill="' + shade(wall, -22) + '"/><rect x="0" y="294" width="800" height="4" fill="#000" opacity=".12"/>';
    // sign band + shopfront
    s += '<rect x="150" y="306" width="500" height="26" fill="' + shade(wall, -45) + '"/>';
    s += '<rect x="150" y="336" width="500" height="204" fill="#2a2522"/>';
    s += '<rect x="160" y="440" width="480" height="100" fill="#f3d9a8" opacity=".35"/>';
    s += '<rect x="370" y="465" width="60" height="75" fill="' + k.accent + '" opacity=".85"/>';
    // rolling shutter, half raised
    s += '<rect x="150" y="336" width="500" height="112" fill="' + sh + '"/>';
    for (let y = 342; y < 446; y += 7) s += '<rect x="150" y="' + y + '" width="500" height="1.6" fill="#000" opacity=".22"/>';
    s += '<rect x="150" y="444" width="500" height="6" fill="' + shade(sh, -40) + '"/>';
    [316, 483].forEach(x => { s += '<rect x="' + x + '" y="450" width="6" height="90" fill="' + shade(sh, -20) + '"/>'; });
    // blue enamel house-number plaque
    s += '<rect x="96" y="356" width="38" height="26" rx="4" fill="#1f4e8c" stroke="#fff" stroke-width="2"/>';
    s += '<text x="115" y="374" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#fff" text-anchor="middle">' + k.num + '</text>';
    // pavement + plant
    s += '<rect x="0" y="540" width="800" height="60" fill="#c3bcb0"/><rect x="0" y="540" width="800" height="5" fill="#9e978b"/>';
    s += '<rect x="676" y="500" width="40" height="40" fill="#b5643c"/><circle cx="696" cy="488" r="22" fill="#5d7d4f"/><circle cx="682" cy="476" r="14" fill="#6f9160"/><circle cx="710" cy="474" r="13" fill="#4f6d43"/>';
    s += '<rect x="40" y="380" width="6" height="160" fill="#2b2b2b"/><rect x="28" y="372" width="30" height="12" rx="3" fill="#2b2b2b"/>';
    return s;
  }

  function interiorInner(k, flip) {
    const wall = shade(k.wall, 28);
    let s = '<g' + (flip ? ' transform="translate(800,0) scale(-1,1)"' : '') + '>';
    s += '<rect width="800" height="600" fill="' + wall + '"/>';
    s += '<polygon points="0,0 800,0 630,110 170,110" fill="' + shade(wall, 12) + '"/>';
    s += '<polygon points="0,0 170,110 170,430 0,600" fill="' + shade(wall, -18) + '"/>';
    s += '<polygon points="800,0 630,110 630,430 800,600" fill="' + shade(wall, -10) + '"/>';
    s += '<polygon points="0,600 800,600 630,430 170,430" fill="#cfc6b8"/>';
    for (let i = 1; i < 8; i++) { const x = 170 + i * 57.5; s += '<line x1="' + x + '" y1="430" x2="' + i * 100 + '" y2="600" stroke="#000" opacity=".06"/>'; }
    // arched back window with daylight
    s += '<path d="M330,430 V230 A70,70 0 0 1 470,230 V430 Z" fill="#fdf3dc"/>';
    s += '<path d="M330,430 V230 A70,70 0 0 1 470,230 V430" fill="none" stroke="' + shade(wall, -30) + '" stroke-width="8"/>';
    s += '<polygon points="330,430 470,430 560,600 250,600" fill="#fff6dd" opacity=".55"/>';
    // pendant lamps
    [260, 400, 540].forEach(x => { s += '<line x1="' + x + '" y1="70" x2="' + x + '" y2="160" stroke="#222" stroke-width="2"/><path d="M' + (x - 18) + ',175 A18,18 0 0 1 ' + (x + 18) + ',175 Z" fill="' + k.accent + '"/>'; });
    // a simple display table
    s += '<rect x="520" y="440" width="150" height="14" fill="' + shade(k.accent, -10) + '"/><rect x="530" y="454" width="8" height="70" fill="#333"/><rect x="652" y="454" width="8" height="70" fill="#333"/>';
    s += '<rect x="545" y="418" width="30" height="22" fill="#fff"/><rect x="590" y="408" width="22" height="32" fill="' + k.shutter + '"/>';
    return s + "</g>";
  }

  return {
    exterior: k => uri(exteriorInner(k), "0 0 800 600"),
    detail: k => uri(exteriorInner(k), "60 260 420 315"),
    interior: (k, flip) => uri(interiorInner(k, flip), "0 0 800 600"),
    street: looks => uri(looks.map((k, i) => '<g transform="translate(' + i * 800 + ',0)">' + exteriorInner(k) + "</g>").join(""), "0 0 " + looks.length * 800 + " 600"),
    gallery: k => [uri(exteriorInner(k), "0 0 800 600"), uri(interiorInner(k), "0 0 800 600"), uri(exteriorInner(k), "60 260 420 315"), uri(interiorInner(k, true), "0 0 800 600")]
  };
})();
