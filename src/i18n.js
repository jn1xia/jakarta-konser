// Every string the site shows, in Indonesian and English, and the helpers that format prices
// and dates. Artist, tour and category names come from the concert data and are never translated.
// This file also loads in Node for the tests, so browser globals are only touched inside functions.

export const STRINGS = {
  id: {
    'site.name': 'Jakarta Konser',
    'site.tagline': 'Cek view dari kursimu sebelum konser.',
    'site.sub': 'Simulasi 3D tidak resmi untuk konser-konser di Jakarta: pilih konser, pilih kursi, lihat panggungnya.',
    'lang.other': 'EN',
    'lang.label': 'Ganti bahasa ke Inggris',

    'badge.3d': '3D siap',
    'badge.list': 'Hanya jadwal',
    'badge.novenue': 'Venue belum diumumkan',
    'hub.filter3d': 'Hanya yang ada 3D',
    'hub.filterVenue': 'Venue',
    'hub.allVenues': 'Semua venue',
    'hub.empty': 'Belum ada konser yang diumumkan. Cek lagi nanti.',
    'hub.noMatch': 'Tidak ada konser yang cocok dengan filter ini.',
    'hub.open': 'Buka simulasi 3D',
    'hub.openExternal': 'Buka simulasi 3D (situs terpisah)',
    'hub.from': 'mulai {price}',
    'hub.today': 'Hari ini',
    'hub.dday': 'H-{n}',
    'hub.single': 'Baru satu sumber',
    'hub.checked': 'Data terakhir dicek {date}.',
    'hub.sources': 'Sumber data',
    'hub.visitors': '{n} pengunjung sejauh ini',
    'hub.count': '{n} konser',
    'fine.hub': 'Buatan penggemar dan tidak resmi; tidak berafiliasi dengan artis, label, promotor, atau venue mana pun. Situs ini tidak menjual tiket. Jadwal bisa berubah, jadi cek kanal resmi promotor sebelum membeli tiket.',

    'sim.eyebrow': 'Simulasi view kursi 3D tidak resmi',
    'sim.back': 'Semua konser',
    'sim.loading': 'Memuat venue…',
    'sim.nowebgl': 'Simulasi ini butuh WebGL. Buka di Chrome, Safari, Edge, atau Firefox versi terbaru.',
    'sim.toHub': 'Kembali ke daftar konser',
    'sim.canvas': 'Tampilan 3D {venue} dari kursi yang dipilih. Geser atau pakai tombol panah untuk melihat sekeliling.',
    'acc.official': 'Sesuai seat plan resmi',
    'acc.estimated': 'Estimasi',
    'fan.made': 'Buatan penggemar · tidak resmi',
    'err.link': 'Tautan rusak',
    'err.notfound': 'Konser tidak ditemukan',
    'err.data': 'Data konser ini bermasalah',

    'dock.label': 'Kontrol tampilan',
    'dock.view': 'Tampilan',
    'dock.seat': 'Kursiku',
    'dock.venue': 'Seluruh venue',
    'dock.zoom': 'Zoom',
    'dock.eyes': 'Mata',
    'dock.lights': 'Lampu',
    'dock.show': 'Konser',
    'dock.house': 'Terang',
    'dock.crowd': 'Penonton',
    'dock.sit': 'Duduk',
    'dock.stand': 'Berdiri',
    'dock.hint': 'Geser untuk melihat sekeliling · scroll atau cubit untuk zoom',
    'dock.hintVenue': 'Geser untuk memutar · klik satu bagian untuk duduk di sana',

    'panel.label': 'Detail kursi',
    'panel.toggle': 'Detail kursi',
    'panel.choose': 'Pilih kursi',
    'panel.section': 'Bagian',
    'panel.row': 'Baris',
    'panel.seat': 'Kursi',
    'panel.spot': 'Posisi',
    'panel.sub': 'Baris {r} · Kursi {s}',
    'panel.subStanding': 'Area berdiri · baris {r} dari depan',
    'panel.cats': 'Kategori tiket',
    'panel.places': '{n} tempat',
    'kind.seat': 'Kursi bernomor',
    'kind.standing': 'Berdiri',
    'sec.stand': '{tier} · Sektor {n}',
    'sec.front': 'depan',
    'sec.back': 'belakang',
    'sec.rows': 'baris {a}–{b}',
    'map.stage': 'PANGGUNG',
    'map.label': 'Denah venue. Klik satu bagian untuk duduk di sana.',

    'f.edge': 'Ke tepi panggung',
    'f.screen': 'Ke layar utama',
    'f.height': 'Tinggi mata',
    'f.angle': 'Sudut dari tengah',
    'f.vis': 'Layar terlihat',
    'f.tv': 'Layar terasa seperti',
    'f.perf': 'Tinggi artis',
    'f.metres': '{n} m',
    'f.tvValue': 'TV {n} inci dari 2,5 m',
    'f.perfValue': '{n} mm sejauh lengan',
    'f.visNone': 'Tidak terlihat',

    'v.close': 'Cukup dekat untuk melihat wajah dan kostum tanpa layar.',
    'v.clear': 'Artis dan koreografi terlihat jelas; wajah lebih enak dilihat lewat layar.',
    'v.small': 'Artis terlihat kecil dari sini, jadi layar utama yang jadi andalan.',
    'v.far': 'Sisi terjauh venue: kamu menonton lewat layar sambil melihat seluruh lautan cahaya.',
    'v.screenHidden': 'Layar utama membelakangi atau tertutup dari kursi ini.',
    'v.screenPart': 'Sebagian layar utama terhalang struktur panggung atau tribune di atasmu.',
    'v.screenAngle': 'Layar utama terlihat dari sudut yang tajam, jadi tampak sempit.',
    'v.pit': 'Kamu di barisan depan, tepat di pagar panggung.',
    'v.tower': 'Menara delay atau meja sound (FOH) ada di garis pandangmu.',

    'fine.sim': 'Buatan penggemar dan tidak resmi; tidak berafiliasi dengan {artist}, promotor, atau venue. Letak tiap kategori, ukuran panggung, dan jumlah baris adalah perkiraan. Selalu cocokkan kursimu dengan seat plan resmi.',
    'fine.estimated': 'Perkiraan untuk venue ini: {list}.',
    'fine.prices': 'Harga belum termasuk pajak dan biaya layanan.',
    'fine.sources': 'Sumber',
    'est.outline': 'bentuk tribune',
    'est.rows': 'jumlah baris',
    'est.depth': 'jarak antarbaris',
    'est.rake': 'kemiringan tribune',
    'est.roofEdge': 'tepi atap',
    'est.ceiling': 'tinggi plafon',
    'est.capacity': 'kapasitas',
    'price.none': 'Harga belum diumumkan'
  },
  en: {
    'site.name': 'Jakarta Konser',
    'site.tagline': 'See the view from your seat before the show.',
    'site.sub': 'Unofficial 3D seat views for concerts in Jakarta: pick a show, pick a seat, see the stage.',
    'lang.other': 'ID',
    'lang.label': 'Switch language to Indonesian',

    'badge.3d': '3D ready',
    'badge.list': 'Listing only',
    'badge.novenue': 'Venue not announced',
    'hub.filter3d': '3D only',
    'hub.filterVenue': 'Venue',
    'hub.allVenues': 'All venues',
    'hub.empty': 'No shows announced yet. Check back soon.',
    'hub.noMatch': 'No shows match these filters.',
    'hub.open': 'Open the 3D simulator',
    'hub.openExternal': 'Open the 3D simulator (separate site)',
    'hub.from': 'from {price}',
    'hub.today': 'Today',
    'hub.dday': 'D-{n}',
    'hub.single': 'One source so far',
    'hub.checked': 'Data last checked {date}.',
    'hub.sources': 'Data sources',
    'hub.visitors': '{n} visitors so far',
    'hub.count': '{n} shows',
    'fine.hub': 'Fan-made and unofficial; not affiliated with any artist, label, promoter or venue. This site sells no tickets. Schedules change, so check the promoter\'s official channels before buying tickets.',

    'sim.eyebrow': 'Unofficial 3D seat-view simulator',
    'sim.back': 'All concerts',
    'sim.loading': 'Loading the venue…',
    'sim.nowebgl': 'This simulator needs WebGL. Open it in a recent Chrome, Safari, Edge or Firefox.',
    'sim.toHub': 'Back to the concert list',
    'sim.canvas': '3D view of {venue} from the selected seat. Drag or use the arrow keys to look around.',
    'acc.official': 'Follows the official seat plan',
    'acc.estimated': 'Estimate',
    'fan.made': 'Fan-made · unofficial',
    'err.link': 'Broken link',
    'err.notfound': 'Concert not found',
    'err.data': 'This concert\'s data has a problem',

    'dock.label': 'View controls',
    'dock.view': 'View',
    'dock.seat': 'My seat',
    'dock.venue': 'Whole venue',
    'dock.zoom': 'Zoom',
    'dock.eyes': 'Eyes',
    'dock.lights': 'Lights',
    'dock.show': 'Show',
    'dock.house': 'House',
    'dock.crowd': 'Crowd',
    'dock.sit': 'Seated',
    'dock.stand': 'Standing',
    'dock.hint': 'Drag to look around · scroll or pinch to zoom',
    'dock.hintVenue': 'Drag to orbit · click a section to sit there',

    'panel.label': 'Seat details',
    'panel.toggle': 'Seat details',
    'panel.choose': 'Choose a seat',
    'panel.section': 'Section',
    'panel.row': 'Row',
    'panel.seat': 'Seat',
    'panel.spot': 'Spot',
    'panel.sub': 'Row {r} · Seat {s}',
    'panel.subStanding': 'Standing area · row {r} from the front',
    'panel.cats': 'Ticket categories',
    'panel.places': '{n} places',
    'kind.seat': 'Numbered seat',
    'kind.standing': 'Standing',
    'sec.stand': '{tier} · Sector {n}',
    'sec.front': 'front',
    'sec.back': 'back',
    'sec.rows': 'rows {a}–{b}',
    'map.stage': 'STAGE',
    'map.label': 'Venue map. Click a section to sit there.',

    'f.edge': 'Stage edge',
    'f.screen': 'Main screen',
    'f.height': 'Eye height',
    'f.angle': 'Angle off centre',
    'f.vis': 'Screen in view',
    'f.tv': 'Screen looks like',
    'f.perf': 'Performer size',
    'f.metres': '{n} m',
    'f.tvValue': 'a {n}-inch TV from 2.5 m',
    'f.perfValue': '{n} mm at arm\'s length',
    'f.visNone': 'Out of view',

    'v.close': 'Close enough to see faces and outfits without the screens.',
    'v.clear': 'A clear view of the performers and the choreography; faces come from the screens.',
    'v.small': 'The performers look small from here, so the main screen carries the close-ups.',
    'v.far': 'The far side of the venue: you watch the screens and take in the whole sea of lights.',
    'v.screenHidden': 'The main screen faces away or is hidden from this seat.',
    'v.screenPart': 'Part of the main screen is blocked by the stage structure or the tier above.',
    'v.screenAngle': 'You see the main screen at a steep angle, so it looks narrow.',
    'v.pit': 'You are at the front, right on the stage barrier.',
    'v.tower': 'A delay tower or the sound desk (FOH) is in your line of sight.',

    'fine.sim': 'Fan-made and unofficial; not affiliated with {artist}, the promoter or the venue. Where each category sits, the stage size and the row counts are estimates. Always check your seat against the official seat plan.',
    'fine.estimated': 'Estimated for this venue: {list}.',
    'fine.prices': 'Prices exclude tax and fees.',
    'fine.sources': 'Sources',
    'est.outline': 'bowl shape',
    'est.rows': 'row counts',
    'est.depth': 'row depth',
    'est.rake': 'rake',
    'est.roofEdge': 'roof edge',
    'est.ceiling': 'ceiling height',
    'est.capacity': 'capacity',
    'price.none': 'Price not announced'
  }
};

const LANGS = ['id', 'en'];
const STORE_KEY = 'jk.lang';
const DAYS = { id: ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] };
const MONTHS = {
  id: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
};
const MONTHS_LONG = {
  id: ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
};

let lang = 'id';

/** The language to use: the address's ?lang=, then the saved choice, then Indonesian. */
export function pickLang(query, stored) {
  if (LANGS.includes(query)) return query;
  if (LANGS.includes(stored)) return stored;
  return 'id';
}

export const getLang = () => lang;

/** Reads the address and the saved choice; call once when a page starts. */
export function initLang() {
  let query = null, stored = null;
  try { query = new URLSearchParams(location.search).get('lang'); } catch (e) { /* not in a browser */ }
  try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* storage blocked */ }
  setLang(pickLang(query, stored), false);
  return lang;
}

/** Switches language, remembers it, and tells the page to redraw its text. */
export function setLang(next, save = true) {
  lang = LANGS.includes(next) ? next : 'id';
  if (save) { try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* storage blocked or absent */ } }
  if (typeof document !== 'undefined') {
    document.documentElement.lang = lang;
    document.dispatchEvent(new Event('langchange'));
  }
}

/** The string for a key, with {name} parts filled in. An unknown key comes back as itself. */
export function t(key, vars) {
  const s = STRINGS[lang][key];
  if (s === undefined) return key;
  return vars ? s.replace(/\{(\w+)\}/g, (m, name) => (name in vars ? String(vars[name]) : m)) : s;
}

/** Picks the current language from { id, en }; a plain string passes through. */
export function tx(value) {
  if (value && typeof value === 'object') return value[lang] !== undefined ? value[lang] : value.id;
  return value === undefined || value === null ? '' : String(value);
}

const group = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

export const fmtRp = (n) => `Rp${group(n)}`;

/** A price, or the "not announced" line when it is unknown. */
export function fmtPrice(n) {
  return typeof n === 'number' && Number.isFinite(n) ? fmtRp(n) : t('price.none');
}

/** Whole numbers with thousands grouped the Indonesian or the English way. */
export function fmtCount(n) {
  const s = group(n);
  return lang === 'en' ? s.replace(/\./g, ',') : s;
}

const parts = (date) => {
  const d = new Date(`${date}T00:00:00Z`);
  return { day: d.getUTCDate(), dow: d.getUTCDay(), month: d.getUTCMonth(), year: d.getUTCFullYear() };
};

/** "Sab 23 Jan 2027"; several dates in one month read "26 · 27 · 29 Des 2026". */
export function fmtDates(dates) {
  const ps = dates.map(parts), last = ps[ps.length - 1];
  if (ps.length === 1) return `${DAYS[lang][last.dow]} ${last.day} ${MONTHS[lang][last.month]} ${last.year}`;
  const sameYear = ps.every((p) => p.year === last.year);
  const sameMonth = sameYear && ps.every((p) => p.month === last.month);
  if (sameMonth) return `${ps.map((p) => p.day).join(' · ')} ${MONTHS[lang][last.month]} ${last.year}`;
  if (sameYear) return `${ps.map((p) => `${p.day} ${MONTHS[lang][p.month]}`).join(' · ')} ${last.year}`;
  return ps.map((p) => `${p.day} ${MONTHS[lang][p.month]} ${p.year}`).join(' · ');
}

/** "Januari 2027" for a 'YYYY-MM' month. */
export function fmtMonth(month) {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS_LONG[lang][m - 1]} ${y}`;
}
