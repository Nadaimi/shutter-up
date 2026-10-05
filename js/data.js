/* ------------------------------------------------------------------
   MOCK DATA — demo listings (prices in USD).
   `blocked` = booked date ranges, as day offsets from today, so the
   calendars always show some taken dates whenever the demo is opened.
   `look` = colours used to draw the placeholder facade illustrations.
   ------------------------------------------------------------------ */
window.USES = {
  popup: "Pop-up shop",
  exhibition: "Exhibition",
  workshop: "Workshop",
  event: "Community event"
};

window.AREAS = {
  gemmayzeh: {
    name: "Gemmayzeh",
    center: [33.8953, 35.5158],
    streets: ["Gouraud Street", "Pasteur Street", "Saint Nicolas Stairs"]
  },
  marmikhael: {
    name: "Mar Mikhael",
    center: [33.8978, 35.5235],
    streets: ["Armenia Street", "Vendôme Stairs", "Nahr Street"]
  }
};

window.LISTINGS = [
  {
    id: "arched-atelier",
    title: "The Arched Atelier",
    area: "gemmayzeh", street: "Gouraud Street",
    lat: 33.89505, lng: 35.51640,
    size: 45, frontage: 6, priceDay: 90, priceWeek: 480, minStay: 2,
    uses: ["popup", "exhibition", "workshop"],
    amenities: { power: "24h — EDL + building generator (10A)", water: true, shutter: "Manual rolling shutter", toilet: true, wifi: true, storage: false },
    owner: "Rita K.",
    note: "My grandfather ran a tailoring shop here for forty years. I'd love to see it full of makers again — ceramicists and textile people especially welcome.",
    description: "A high-ceilinged ground-floor room behind three sandstone arches, on the busiest stretch of Gouraud Street. Freshly whitewashed walls, original cement tiles and a deep window ledge that works as a display shelf.",
    featured: true,
    blocked: [[4, 7], [18, 24]],
    look: { wall: "#dcc6a2", shutter: "#4f6b52", accent: "#b5643c", num: "112" }
  },
  {
    id: "pasteur-corner",
    title: "Pasteur Corner Shop",
    area: "gemmayzeh", street: "Pasteur Street",
    lat: 33.89600, lng: 35.51330,
    size: 28, frontage: 4, priceDay: 55, priceWeek: 300, minStay: 1,
    uses: ["popup", "workshop"],
    amenities: { power: "20h — EDL + generator (5A)", water: true, shutter: "Manual rolling shutter", toilet: false, wifi: false, storage: true },
    owner: "Georges H.",
    note: "Small but on a corner, so you get two windows. Perfect for a first pop-up — I can lend a couple of tables and a clothes rail.",
    description: "A compact corner unit with windows on two sides and lots of passing foot traffic from the stairs. Concrete floor, white walls, a small back storage room.",
    featured: true,
    blocked: [[2, 3], [10, 12], [30, 36]],
    look: { wall: "#e6c873", shutter: "#3f5f7a", accent: "#2f4b63", num: "47" }
  },
  {
    id: "stairs-studio",
    title: "Saint Nicolas Stairs Studio",
    area: "gemmayzeh", street: "Saint Nicolas Stairs",
    lat: 33.89390, lng: 35.51720,
    size: 38, frontage: 5, priceDay: 70, priceWeek: 380, minStay: 3,
    uses: ["exhibition", "workshop", "event"],
    amenities: { power: "24h — private generator (15A)", water: true, shutter: "Electric rolling shutter", toilet: true, wifi: true, storage: false },
    owner: "Maya S.",
    note: "The steps outside become an amphitheatre in the evening. Great for talks, small screenings or a reading — just keep the neighbours in the loop.",
    description: "A studio opening directly onto the famous stairs. Soft north light, a painted timber ceiling and a wide double door that lets the event spill outside.",
    featured: true,
    blocked: [[6, 9], [21, 22]],
    look: { wall: "#e3b7a8", shutter: "#6d3b3b", accent: "#8a4b3c", num: "9" }
  },
  {
    id: "white-box-gouraud",
    title: "White Box on Gouraud",
    area: "gemmayzeh", street: "Gouraud Street",
    lat: 33.89570, lng: 35.51850,
    size: 85, frontage: 8, priceDay: 160, priceWeek: 900, minStay: 3,
    uses: ["exhibition", "popup", "event"],
    amenities: { power: "24h — EDL + building generator (20A)", water: true, shutter: "Electric rolling shutter", toilet: true, wifi: true, storage: true },
    owner: "Karim A.",
    note: "Previously a gallery, so the track lighting and hanging system are already in place. Ideal for exhibitions and launches.",
    description: "A clean, gallery-grade space with track lighting, a picture-hanging rail and an eight-metre glass frontage. One of the largest open floors in Gemmayzeh.",
    featured: false,
    blocked: [[0, 2], [12, 16], [40, 45]],
    look: { wall: "#ece2cf", shutter: "#7a7a72", accent: "#222222", num: "205" }
  },
  {
    id: "armenia-garage",
    title: "Former Garage, Armenia Street",
    area: "marmikhael", street: "Armenia Street",
    lat: 33.89760, lng: 35.52280,
    size: 120, frontage: 7, priceDay: 210, priceWeek: 1150, minStay: 2,
    uses: ["event", "exhibition", "popup", "workshop"],
    amenities: { power: "24h — 3-phase generator (32A)", water: true, shutter: "Large manual roller door", toilet: true, wifi: false, storage: true },
    owner: "Hagop M.",
    note: "It used to be my father's mechanic workshop. Raw and big — bring your own vision. Markets, launches and community dinners have all worked here.",
    description: "A raw former car workshop with exposed steel beams, a polished concrete floor and a full-width roller door that opens the whole room onto Armenia Street.",
    featured: true,
    blocked: [[5, 6], [13, 14], [27, 30]],
    look: { wall: "#b9b2a4", shutter: "#5a5a55", accent: "#c4532d", num: "318" }
  },
  {
    id: "small-window",
    title: "The Small Window",
    area: "marmikhael", street: "Armenia Street",
    lat: 33.89810, lng: 35.52450,
    size: 18, frontage: 3, priceDay: 40, priceWeek: 220, minStay: 1,
    uses: ["popup"],
    amenities: { power: "12h — EDL only", water: false, shutter: "Manual rolling shutter", toilet: false, wifi: false, storage: false },
    owner: "Nour D.",
    note: "Tiny, cheap and right by the bars — great for coffee, books, vintage or a weekend test run.",
    description: "A narrow kiosk-style shop with a hatch window to the street. Small, but the cheapest way to test an idea in Mar Mikhael.",
    featured: false,
    blocked: [[1, 1], [8, 9], [15, 16], [22, 23]],
    look: { wall: "#a9c6b5", shutter: "#2f4f45", accent: "#2f4f45", num: "61" }
  },
  {
    id: "vendome-steps",
    title: "Vendôme Steps Shopfront",
    area: "marmikhael", street: "Vendôme Stairs",
    lat: 33.89680, lng: 35.52120,
    size: 52, frontage: 5, priceDay: 95, priceWeek: 520, minStay: 2,
    uses: ["popup", "workshop", "event"],
    amenities: { power: "24h — EDL + building generator (10A)", water: true, shutter: "Manual rolling shutter", toilet: true, wifi: true, storage: false },
    owner: "Lina F.",
    note: "Lovely morning light and a small courtyard at the back. Please no amplified music after 10pm — the building is residential.",
    description: "A bright shopfront at the foot of the Vendôme stairs, with a small shaded courtyard at the back that's ideal for workshops or a coffee corner.",
    featured: false,
    blocked: [[3, 5], [19, 25]],
    look: { wall: "#c98b4a", shutter: "#3d4a3a", accent: "#7b3f1d", num: "23" }
  },
  {
    id: "nahr-warehouse",
    title: "Nahr Street Warehouse",
    area: "marmikhael", street: "Nahr Street",
    lat: 33.89900, lng: 35.52620,
    size: 160, frontage: 9, priceDay: 240, priceWeek: 1350, minStay: 3,
    uses: ["event", "exhibition", "workshop"],
    amenities: { power: "24h — 3-phase generator (40A)", water: true, shutter: "Electric roller door", toilet: true, wifi: true, storage: true },
    owner: "Fadi R.",
    note: "Big enough for a festival, a design week or a neighbourhood assembly. Loading access from the side street.",
    description: "A double-height warehouse near the old train station. Huge open floor, steel trusses, side loading door and space for up to 150 people standing.",
    featured: true,
    blocked: [[9, 12], [33, 38]],
    look: { wall: "#a7bfd0", shutter: "#55606b", accent: "#1f4e8c", num: "4" }
  },
  {
    id: "old-bakery",
    title: "The Old Bakery",
    area: "gemmayzeh", street: "Pasteur Street",
    lat: 33.89660, lng: 35.51450,
    size: 60, frontage: 5, priceDay: 110, priceWeek: 600, minStay: 2,
    uses: ["workshop", "popup", "event"],
    amenities: { power: "24h — EDL + generator (15A)", water: true, shutter: "Manual rolling shutter", toilet: true, wifi: false, storage: true },
    owner: "Samir T.",
    note: "The old stone oven is still there (not working) and people love it. Great for food pop-ups that bring their own equipment, or cooking workshops.",
    description: "A former man'oushe bakery with a vaulted stone ceiling, the original oven alcove and a long marble counter that stays with the space.",
    featured: false,
    blocked: [[2, 4], [14, 17], [28, 29]],
    look: { wall: "#d9b48f", shutter: "#5b4636", accent: "#a0522d", num: "88" }
  },
  {
    id: "twin-arches",
    title: "Twin Arches, Armenia Street",
    area: "marmikhael", street: "Armenia Street",
    lat: 33.89710, lng: 35.52360,
    size: 70, frontage: 6, priceDay: 130, priceWeek: 700, minStay: 2,
    uses: ["popup", "exhibition"],
    amenities: { power: "24h — EDL + building generator (10A)", water: true, shutter: "Two manual rolling shutters", toilet: true, wifi: true, storage: false },
    owner: "Rania B.",
    note: "Two arched bays that can be rented together or used as two zones. Works beautifully for fashion and design pop-ups.",
    description: "Two matching arched bays joined by an internal opening, with terrazzo floors and tall windows. Restored after 2020 with care for the original stonework.",
    featured: false,
    blocked: [[7, 10], [24, 26]],
    look: { wall: "#e8d6c0", shutter: "#4a5d6e", accent: "#4a5d6e", num: "150" }
  }
];
