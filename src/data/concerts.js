// Every announced Jakarta show from 11 Nov 2026 on, and the simulation settings for the twelve
// the engine can draw. Facts and sources: docs/research/jakarta-concerts-2026-2027.md.
//
// To add a show, add one entry. A show at a venue that is not modelled uses `venueName` and
// `sim: null`. Prices are before tax and fees; `null` means "not announced" and is shown as such.
// Where a show's categories sit is an estimate unless `accuracy` says 'official'.

import { VENUES } from './venues/index.js';

export const DATA_CHECKED = '2026-11-11';

// Category colours, handed out from the most expensive category down
export const PALETTE = ['#e5484d', '#f76b15', '#ffc53d', '#46a758', '#12a594', '#0090ff', '#8e4ec6', '#d6409f', '#978365', '#6e56cf'];

const SRC = {
  novDec: 'https://katadata.co.id/lifestyle/varia/6af1eaf8ad120/jadwal-konser-november-desember-2026-ada-bts-dan-mcr',
  nov: 'https://www.medcom.id/hiburan/konserphoria/0k8d2Z2k-daftar-konser-dan-festival-musik-di-jakarta-november-2026-ada-mcr-hingga-guns-n-roses',
  novCnn: 'https://www.cnnindonesia.com/gaya-hidup/20261102084130-269-1422157/catat-tanggalnya-11-event-di-jakarta-november-2026-siap-hibur-kamu',
  intl: 'https://www.medcom.id/hiburan/indis/GKdGGgXk-daftar-konser-internasional-di-jakarta-bulan-juli-desember-2026-udah-siap-belom',
  list: 'https://jadwalkonser.id/',
  gbk: 'https://www.beritasatu.com/lifestyle/3038798/15-konser-internasional-di-gbk-hingga-april-2027-bts-hingga-westlife',
  y2027: 'https://kumparan.com/kabar-harian/jadwal-konser-indonesia-2027-yang-wajib-masuk-daftar-nonton-27xmbb7i9DR',
  soompi: 'https://www.soompi.com/article/1880039wpp/2027-k-pop-tour-masterlist-concerts-fan-meetings-and-more',
  kpop27: 'https://www.jawapos.com/music-movie/2610240191/konser-k-pop-2027-mulai-terungkap-sejumlah-artis-dijadwalkan-tampil-di-jakarta',
  pk: 'https://www.pk-ent.com/'
};

/** Hands the palette out in the order given: list categories from the most expensive down. */
const cats = (...list) => list.map((c, i) => ({ kind: 'seat', ...c, color: PALETTE[i % PALETTE.length] }));

/**
 * For a show whose category names are not published yet: one floor category and one per tier,
 * all without a price, so the venue and the stage can still be explored.
 */
function fallback(venueId, standingFloor) {
  const tiers = VENUES[venueId].tiers;
  return {
    categories: cats(
      { id: 'FLOOR', name: { id: 'Lantai', en: 'Floor' }, price: null, kind: standingFloor ? 'standing' : 'seat' },
      ...tiers.map((t) => ({ id: `T-${t.id}`, name: t.name, price: null }))
    ),
    floor: [{ depth: 1, blocks: ['FLOOR'], standing: standingFloor }],
    stands: tiers.map((t) => ({ tier: t.id, cat: `T-${t.id}` }))
  };
}

const PHONE = { lights: 'phone', accent: '#f1eef0' };
const stick = (color, accent = color) => ({ lights: 'stick', stick: color, accent });

export const CONCERTS = [
  {
    id: 'men-i-trust-tennis-indoor-2026', artist: 'Men I Trust', tour: 'Asia Tour 2026',
    dates: ['2026-11-12'], venueName: 'Tennis Indoor Senayan', promoter: null,
    genre: 'international', confidence: 'confirmed', sources: [SRC.list, SRC.intl], sim: null
  },
  {
    id: '5sos-indonesia-arena-2026', artist: '5 Seconds of Summer', tour: "Everyone's A Star! World Tour",
    dates: ['2026-11-14', '2026-12-06'], venue: 'indonesia-arena', promoter: 'Chakra Live Asia',
    genre: 'international', confidence: 'confirmed', priceFrom: 910000, priceTo: 5000000,
    sources: ['https://www.cnnindonesia.com/hiburan/20260617125301-227-1369986/tambah-jadwal-5sos-konser-lagi-di-indonesia-arena-6-desember', SRC.novCnn],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 4, stage: { preset: 'end' },
      categories: cats(
        { id: 'CAT1VIP', name: 'CAT 1 VIP', price: 4140000 },
        { id: 'GAVIP', name: 'GA VIP', price: 3950000, kind: 'standing' },
        { id: 'FLOOR', name: { id: 'Lantai', en: 'Floor' }, price: null, kind: 'standing' },
        { id: 'T-L', name: { id: 'Tribune Bawah', en: 'Lower Tier' }, price: null },
        { id: 'T-U', name: { id: 'Tribune Atas', en: 'Upper Tier' }, price: null }
      ),
      floor: [{ depth: 0.35, blocks: ['GAVIP'], standing: true }, { depth: 0.65, blocks: ['FLOOR'], standing: true }],
      stands: [
        { tier: 'L', zone: ['sideNear', 'sideMid'], cat: 'CAT1VIP' },
        { tier: 'L', cat: 'T-L' },
        { tier: 'U', cat: 'T-U' }
      ]
    }
  },
  {
    id: 'bol4-balai-sarbini-2026', artist: 'BOL4', tour: '2026-27 Concert Tour "Red Square"',
    dates: ['2026-11-14'], venueName: 'Balai Sarbini', promoter: null,
    genre: 'kpop', confidence: 'confirmed', sources: [SRC.nov, SRC.list], sim: null
  },
  {
    id: 'woodz-tennis-indoor-2026', artist: 'WOODZ', tour: 'World Tour 2026',
    dates: ['2026-11-15'], venueName: 'Tennis Indoor Senayan', promoter: null,
    genre: 'kpop', confidence: 'single-source',
    sources: ['https://www.indonesia.travel/my-zh-cn/events/event-detail/woodz-world-tour'], sim: null
  },
  {
    id: 'gnr-madya-2026', artist: "Guns N' Roses", tour: 'Live in Jakarta',
    dates: ['2026-11-21'], venue: 'madya', promoter: 'Rajawali Indonesia',
    genre: 'international', confidence: 'confirmed', priceFrom: 1750000, priceTo: 7500000,
    sources: ['https://www.rctiplus.com/news/detail/inews/5416783/harga-tiket-konser-guns-n--roses-di-gbk-jakarta--mulai-rp1-jutaan-', SRC.novCnn],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 7, stage: { preset: 'end' },
      categories: cats(
        { id: 'VIP', name: 'VIP', price: 7500000, kind: 'standing' },
        { id: 'TRIBA', name: 'Tribune A', price: 4250000 },
        { id: 'FESTA', name: 'Festival A', price: 3750000, kind: 'standing' },
        { id: 'FESTB', name: 'Festival B', price: 2750000, kind: 'standing' },
        { id: 'TRIBB', name: 'Tribune B', price: 2250000 },
        { id: 'FESTC', name: 'Festival C', price: 1750000, kind: 'standing' }
      ),
      floor: [
        { depth: 0.18, blocks: ['VIP'], standing: true },
        { depth: 0.3, blocks: ['FESTA'], standing: true },
        { depth: 0.26, blocks: ['FESTB'], standing: true },
        { depth: 0.26, blocks: ['FESTC'], standing: true }
      ],
      stands: [{ tier: 'A', cat: 'TRIBA' }, { tier: 'B', cat: 'TRIBB' }]
    }
  },
  {
    id: 'do-istora-2026', artist: 'Doh Kyung Soo (D.O.)', tour: 'DAY OFF',
    dates: ['2026-11-21', '2026-11-22'], venue: 'istora', promoter: 'Lit Xperience',
    genre: 'kpop', confidence: 'confirmed',
    sources: ['https://www.kapanlagi.com/korea/doh-kyung-soo-bawa-tur-day-off-ke-istora-senayan-november-2026-72a1bad2.html', SRC.nov],
    sim: {
      accuracy: 'estimated', theme: stick('#fff8e7'), performers: 1,
      stage: { preset: 'end', runway: 'straight' }, ...fallback('istora', false)
    }
  },
  {
    id: 'lomba-sihir-jakarta-2026', artist: 'Lomba Sihir', tour: 'Konser Ujung Dunia',
    dates: ['2026-11-21'], venueName: null, promoter: null,
    genre: 'indonesia', confidence: 'single-source', sources: [SRC.list], sim: null
  },
  {
    id: 'mcr-jis-2026', artist: 'My Chemical Romance', tour: 'The Black Parade',
    dates: ['2026-11-22'], venue: 'jis', promoter: 'Ravel Entertainment',
    genre: 'international', confidence: 'confirmed', priceFrom: 1059000, priceTo: 3299000,
    sources: ['https://www.idxchannel.com/ecotainment/daftar-harga-tiket-konser-my-chemical-romance-pembelian-dibuka-7-februari-2026/all', 'https://tirto.id/kapan-penjualan-tiket-mcr-2026-cek-harga-tiket-layout-seating-hqyG'],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 5, stage: { preset: 'end' },
      categories: cats(
        { id: 'C1C', name: 'CAT 1 Center', price: 3299000 },
        { id: 'C1S', name: 'CAT 1 Left / Right', price: null },
        { id: 'C2C', name: 'CAT 2 Center', price: 2399000 },
        { id: 'C2S', name: 'CAT 2 Left / Right', price: 2099000 },
        { id: 'C3C', name: 'CAT 3 Center', price: 1299000 },
        { id: 'C3S', name: 'CAT 3 Left / Right', price: 1059000 },
        { id: 'FLOOR', name: { id: 'Lantai', en: 'Floor' }, price: null, kind: 'standing' }
      ),
      floor: [{ depth: 1, blocks: ['FLOOR'], standing: true }],
      stands: [
        { tier: 'L', zone: ['end', 'cornerFar'], cat: 'C1C' }, { tier: 'L', cat: 'C1S' },
        { tier: 'M', zone: ['end', 'cornerFar'], cat: 'C2C' }, { tier: 'M', cat: 'C2S' },
        { tier: 'U', zone: ['end', 'cornerFar'], cat: 'C3C' }, { tier: 'U', cat: 'C3S' }
      ]
    }
  },
  {
    id: 'simple-plan-tennis-indoor-2026', artist: 'Simple Plan', tour: 'Live in Jakarta',
    dates: ['2026-11-27'], venueName: 'Tennis Indoor Senayan', promoter: null,
    genre: 'international', confidence: 'confirmed', sources: [SRC.novCnn, SRC.list], sim: null
  },
  {
    id: 'jamc-bali-united-studio-2026', artist: 'The Jesus and Mary Chain', tour: 'Live in Jakarta',
    dates: ['2026-11-27'], venueName: 'Bali United Studio, Jakarta Barat', promoter: null,
    genre: 'international', confidence: 'single-source', sources: [SRC.intl], sim: null
  },
  {
    id: 'joyland-sessions-gbk-2026', artist: 'Joyland Sessions 2026', tour: 'Festival',
    dates: ['2026-11-28', '2026-11-29'], venueName: 'GBK Senayan', promoter: 'Plainsong Live',
    genre: 'festival', confidence: 'confirmed', sources: [SRC.novDec, SRC.list], sim: null
  },
  {
    id: 'kings-of-convenience-jiexpo-2026', artist: 'Kings of Convenience', tour: 'Live in Jakarta',
    dates: ['2026-11-28', '2026-11-29'], venueName: 'JIExpo Convention Centre & Theatre', promoter: null,
    genre: 'international', confidence: 'single-source', sources: [SRC.novCnn], sim: null
  },
  {
    id: 'xodiac-kasablanka-2026', artist: 'XODIAC', tour: 'Fan Concert',
    dates: ['2026-11-28'], venueName: 'The Kasablanka Hall', promoter: null,
    genre: 'kpop', confidence: 'single-source', sources: [SRC.novDec], sim: null
  },
  {
    id: 'syahrini-tennis-indoor-2026', artist: 'Syahrini', tour: 'Aku Kembali',
    dates: ['2026-12-01'], venueName: 'Tennis Indoor Senayan', promoter: null,
    genre: 'indonesia', confidence: 'confirmed', priceFrom: 500000,
    sources: ['https://www.medcom.id/hiburan/indis/Wb7dv86k-syahrini-ungkap-alasan-konser-tunggalnya-digelar-1-desember-2026'], sim: null
  },
  {
    id: 'boynextdoor-ice-2026', artist: 'BOYNEXTDOOR', tour: "TOUR 'KNOCK ON Vol.2'",
    dates: ['2026-12-05'], venue: 'ice-bsd-5-6', promoter: 'PK Entertainment',
    genre: 'kpop', confidence: 'confirmed', sources: [SRC.pk, 'https://www.kapanlagi.com/korea/konser-boynextdoor-knock-on-vol2-bakal-mampir-jakarta-ac1dac.html'],
    sim: {
      accuracy: 'estimated', theme: stick('#ffe9b8'), performers: 6,
      stage: { preset: 'end', runway: 'straight', bStage: true }, ...fallback('ice-bsd-5-6', true)
    }
  },
  {
    id: 'dmasiv-tennis-indoor-2026', artist: "D'Masiv", tour: 'Asia Home Run - Indonesia',
    dates: ['2026-12-05'], venueName: 'Tennis Indoor Senayan', promoter: null,
    genre: 'indonesia', confidence: 'single-source', priceFrom: 325000,
    sources: ['https://www.loket.com/blog/event-dmasiv'], sim: null
  },
  {
    id: 'boyz2men-dewa19-indonesia-arena-2026', artist: 'Boyz II Men + Dewa 19', tour: 'feat. Ari Lasso & Virzha',
    dates: ['2026-12-09'], venue: 'indonesia-arena', promoter: 'Rajawali Indonesia',
    genre: 'international', confidence: 'confirmed',
    sources: ['https://www.loket.com/blog/event-boyz-ii-men', 'https://seasia.co/2026/09/23/get-ready-jakarta-set-to-host-boyz-ii-men-and-dewa-19-this-december'],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 4, stage: { preset: 'end' },
      ...fallback('indonesia-arena', false)
    }
  },
  {
    id: 'dwp-jiexpo-2026', artist: 'Djakarta Warehouse Project 2026', tour: 'Festival',
    dates: ['2026-12-11', '2026-12-12', '2026-12-13'], venueName: 'JIExpo Kemayoran', promoter: 'Ismaya Live',
    genre: 'festival', confidence: 'confirmed',
    sources: ['https://m.jpnn.com/news/dwp-2026-kembali-ke-jakarta-ini-jadwal-terbarunya', 'https://djmag.com/news/djakarta-warehouse-project-unveils-first-names-2026-festival'], sim: null
  },
  {
    id: 'malcolm-todd-basket-hall-2026', artist: 'Malcolm Todd', tour: 'Do That Again Tour',
    dates: ['2026-12-12'], venueName: 'GBK Basket Hall', promoter: null,
    genre: 'international', confidence: 'confirmed',
    sources: ['https://themusicuniverse.com/malcolm-todd-announces-2026-2027-international-tour-dates/', SRC.gbk], sim: null
  },
  {
    id: 'bts-gbk-2026', artist: 'BTS', tour: "WORLD TOUR 'ARIRANG'",
    dates: ['2026-12-26', '2026-12-27', '2026-12-29'], venue: 'gbk-main', promoter: 'iMe Indonesia',
    genre: 'kpop', confidence: 'confirmed', priceFrom: 1800000, priceTo: 4500000, soldOut: true,
    sources: [SRC.novDec, SRC.gbk], sim: { external: 'https://jn1xia.github.io/bts/' }
  },
  {
    id: 'nflying-basket-hall-2027', artist: 'N.Flying', tour: '&CON5 : into REM',
    dates: ['2027-01-10'], venueName: 'GBK Basket Hall', promoter: null,
    genre: 'kpop', confidence: 'confirmed', sources: [SRC.gbk, SRC.soompi], sim: null
  },
  {
    id: 'bigbang-jis-2027', artist: 'BIGBANG', tour: '2026-2027 World Tour XX : COSMOS',
    dates: ['2027-01-16', '2027-01-17'], venue: 'jis', promoter: 'PK Entertainment',
    genre: 'kpop', confidence: 'confirmed', priceFrom: 1550000, priceTo: 6500000,
    sources: ['https://www.cnnindonesia.com/hiburan/20260920161025-227-1406072/konser-bigbang-di-jakarta-tambah-hari-tiket-dijual-21-september', SRC.pk],
    sim: { external: 'https://jn1xia.github.io/bigbang/' }
  },
  {
    id: 'lalala-ice-2027', artist: 'LaLaLa Festival Jakarta 2027', tour: 'Olivia Dean · Jungle · St. Vincent',
    dates: ['2027-01-17'], venueName: 'ICE BSD City', promoter: 'PK Entertainment',
    genre: 'festival', confidence: 'confirmed',
    sources: ['https://www.idntimes.com/hype/entertainment/daftar-lineup-lalala-festival-2027-di-ice-bsd-olivia-dean-headliner-00-syg99-7sp81c', SRC.pk], sim: null
  },
  {
    id: 'westlife-gbk-2027', artist: 'Westlife', tour: 'Westlife 25: The Anniversary World Tour',
    dates: ['2027-01-23'], venue: 'gbk-main', promoter: 'Folagopro · Sound Rhythm',
    genre: 'international', confidence: 'confirmed', priceFrom: 850000, priceTo: 2750000, soldOut: true,
    sources: ['https://katadata.co.id/lifestyle/varia/6a029806b6112/harga-tiket-konser-westlife-2027-termurah-850-ribu', 'https://www.socialexpat.net/westlife-jakarta-2027-tickets-go-on-sale-today-prices-start-from-idr-850000/'],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 4, stage: { preset: 'end' },
      // Only the top and bottom prices agree between outlets; CAT 1-5 differ, so they carry none
      categories: cats(
        { id: 'VIP', name: 'VIP Package', price: 2750000 },
        { id: 'CAT1', name: 'CAT 1', price: null, ab: true },
        { id: 'CAT2', name: 'CAT 2', price: null, ab: true },
        { id: 'CAT3', name: 'CAT 3', price: null },
        { id: 'CAT4', name: 'CAT 4', price: null },
        { id: 'CAT5', name: 'CAT 5', price: null, ab: true },
        { id: 'CAT6', name: 'CAT 6', price: 850000 }
      ),
      floor: [{ depth: 0.3, blocks: ['VIP'] }, { depth: 0.7, blocks: ['CAT1', 'CAT1'] }],
      stands: [
        { tier: 'L', zone: ['sideNear', 'sideMid'], cat: 'CAT2' },
        { tier: 'L', cat: 'CAT3' },
        { tier: 'U', rows: [15, 26], cat: 'CAT6' },
        { tier: 'U', zone: ['sideNear', 'sideMid'], cat: 'CAT4' },
        { tier: 'U', cat: 'CAT5' }
      ]
    }
  },
  {
    id: 'enhypen-jis-2027', artist: 'ENHYPEN', tour: "WORLD TOUR 'BLOOD SAGA'",
    dates: ['2027-01-23'], time: '19:00', venue: 'jis', promoter: 'PK Entertainment',
    genre: 'kpop', confidence: 'confirmed', priceFrom: 1450000, priceTo: 3650000,
    sources: ['https://www.gebrak.id/2026/07/harga-tiket-konser-enhypen-di-jakarta.html', SRC.pk],
    sim: {
      accuracy: 'estimated', theme: stick('#ffe9b8', '#f76b15'), performers: 7,
      stage: { preset: 'end', runway: 'straight', bStage: true },
      categories: cats(
        { id: 'VIPA', name: 'VIP A', price: 3650000, kind: 'standing' },
        { id: 'VIPB', name: 'VIP B', price: 3650000, kind: 'standing' },
        { id: 'CAT1', name: 'CAT 1', price: 3450000 },
        { id: 'CAT2', name: 'CAT 2', price: 3250000 },
        { id: 'CAT3', name: 'CAT 3', price: 2950000 },
        { id: 'CAT4', name: 'CAT 4', price: 2750000 },
        { id: 'CAT5', name: 'CAT 5', price: 2250000 },
        { id: 'CAT6', name: 'CAT 6', price: 1850000, ab: true },
        { id: 'CAT7', name: 'CAT 7', price: 1450000, ab: true }
      ),
      floor: [{ depth: 1, blocks: ['VIPA', 'VIPB'], standing: true }],
      stands: [
        { tier: 'L', zone: 'beside', cat: 'CAT6' },
        { tier: 'M', zone: 'beside', cat: 'CAT6' },
        { tier: 'U', zone: 'beside', cat: 'CAT7' },
        { tier: 'L', zone: ['sideNear', 'sideMid'], cat: 'CAT1' },
        { tier: 'L', cat: 'CAT2' },
        { tier: 'M', cat: 'CAT3' },
        { tier: 'U', zone: ['sideNear', 'sideMid'], cat: 'CAT5' },
        { tier: 'U', cat: 'CAT4' }
      ]
    }
  },
  {
    id: 'akmu-kasablanka-2027', artist: 'AKMU', tour: 'Asia Tour 2027 AKDONGDEUL',
    dates: ['2027-01-23'], venueName: 'The Kasablanka Hall', promoter: null,
    genre: 'kpop', confidence: 'confirmed',
    sources: ['https://www.medcom.id/hiburan/indis/VNxAyq1b-akmu-bakal-konser-di-jakarta-2027-ini-jadwal-dan-lokasinya', SRC.kpop27], sim: null
  },
  {
    id: 'nancyajram-istora-2027', artist: 'Nancy Ajram', tour: 'Live in Jakarta 2027',
    dates: ['2027-01-30'], venue: 'istora', promoter: null,
    genre: 'international', confidence: 'confirmed', priceTo: 5000000,
    sources: ['https://www.indonesia.travel/us/en/events/event-detail/nancy-ajram-jakarta', SRC.y2027],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 1, stage: { preset: 'end' },
      // Gold is quoted at both Rp1.000.000 and Rp1.150.000, so it carries no price
      categories: cats(
        { id: 'VIP', name: 'VIP', price: 5000000 },
        { id: 'DIAMOND', name: 'Diamond', price: 3250000 },
        { id: 'FESTIVAL', name: 'Festival', price: 1500000, kind: 'standing' },
        { id: 'PLATINUM', name: 'Platinum', price: 1250000 },
        { id: 'GOLD', name: 'Gold', price: null }
      ),
      floor: [
        { depth: 0.2, blocks: ['VIP'] },
        { depth: 0.35, blocks: ['DIAMOND'] },
        { depth: 0.45, blocks: ['FESTIVAL'], standing: true }
      ],
      stands: [
        { tier: 'T', zone: ['beside', 'sideNear', 'sideMid'], cat: 'PLATINUM' },
        { tier: 'T', cat: 'GOLD' }
      ]
    }
  },
  {
    id: 'jeff-bernat-tim-2027', artist: 'Jeff Bernat', tour: 'Luv Language Tour 2027',
    dates: ['2027-02-02'], venueName: 'Teater Besar, Taman Ismail Marzuki', promoter: null,
    genre: 'international', confidence: 'single-source',
    sources: ['https://www.liputan6.com/showbiz/read/8328248/jeff-bernat-umumkan-jakarta-masuk-luv-language-tour-2027-siap-konser-februari-mendatang'], sim: null
  },
  {
    id: 'maroon5-jis-2027', artist: 'Maroon 5', tour: 'Asia 2027',
    dates: ['2027-02-05'], time: '19:00', venue: 'jis', promoter: 'Live Nation · TEM Presents',
    genre: 'international', confidence: 'confirmed', priceFrom: 1250000, priceTo: 4900000,
    sources: ['https://www.livenation.asia/event/maroon-5-asia-2027-in-jakarta-jakarta-ticket-edp1690841', 'https://www.popbela.com/lifestyle/news/harga-tiket-konser-maroon-5-jakarta-2027-n3v01-00-fzpls-4qkdfx'],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 6, stage: { preset: 'end' },
      ...fallback('jis', true)
    }
  },
  {
    id: 'txt-jakarta-2027', artist: 'TXT (TOMORROW X TOGETHER)', tour: "WORLD TOUR 'STEAL THE WIND'",
    dates: ['2027-03-20'], venueName: null, promoter: 'iMe Indonesia',
    genre: 'kpop', confidence: 'confirmed',
    sources: ['https://www.cnnindonesia.com/hiburan/20261110182817-227-1425554/txt-konser-di-jakarta-20-maret-2027', SRC.kpop27], sim: null
  },
  {
    id: 'thescript-indonesia-arena-2027', artist: 'The Script', tour: 'Man in the Arena Tour 2027',
    dates: ['2027-04-03'], venue: 'indonesia-arena', promoter: 'Color Asia Live',
    genre: 'international', confidence: 'confirmed', priceFrom: 750000,
    sources: ['https://jatim.antaranews.com/berita/1091933/simak-harga-dan-cara-beli-tiket-konser-the-script', 'https://www.cnnindonesia.com/hiburan/20260814112937-227-1392238/the-script-akan-konser-di-indonesia-arena-3-april-2027'],
    sim: {
      accuracy: 'estimated', theme: PHONE, performers: 3, stage: { preset: 'end' },
      categories: cats(
        { id: 'DVIP', name: 'Diamond VIP', price: 2950000 },
        { id: 'GFP', name: 'Golden Festival Priority', price: 1850000, kind: 'standing' },
        { id: 'GF', name: 'Golden Festival', price: 1300000, kind: 'standing' },
        { id: 'FEST', name: 'Festival', price: 950000, kind: 'standing' },
        { id: 'RED', name: 'Red (Restricted View)', price: 750000 },
        { id: 'OTHER', name: { id: 'Kursi bernomor lainnya', en: 'Other numbered seats' }, price: null }
      ),
      floor: [
        { depth: 0.25, blocks: ['GFP'], standing: true },
        { depth: 0.35, blocks: ['GF'], standing: true },
        { depth: 0.4, blocks: ['FEST'], standing: true }
      ],
      stands: [
        { zone: 'beside', cat: 'RED' },
        { tier: 'L', zone: ['sideNear', 'sideMid'], cat: 'DVIP' },
        { cat: 'OTHER' }
      ]
    }
  },
  {
    id: 'm2m-tennis-indoor-2027', artist: 'M2M', tour: 'M2M TWO Tour 2027',
    dates: ['2027-04-10'], venueName: 'Tennis Indoor Senayan', promoter: 'Akselerasi Entertainment',
    genre: 'international', confidence: 'confirmed', priceFrom: 1250000, priceTo: 1850000,
    sources: ['https://hot.detik.com/celeb/d-8709363/m2m-konser-di-jakarta-10-april-2027-segini-harga-tiketnya'], sim: null
  },
  {
    id: 'nctwish-ice-2027', artist: 'NCT WISH', tour: 'INTO THE WISH : Face Our WISH',
    dates: ['2027-04-10'], venue: 'ice-bsd-5', promoter: 'Dyandra Global',
    genre: 'kpop', confidence: 'confirmed',
    sources: ['https://voi.id/en/musik/598273', 'https://www.kapanlagi.com/korea/nct-wish-bakal-gelar-konser-face-our-wish-di-jakarta-catat-tanggalnya-a0724a225b.html'],
    sim: {
      accuracy: 'estimated', theme: stick('#c7f000'), performers: 6,
      stage: { preset: 'end', runway: 'straight', bStage: true }, ...fallback('ice-bsd-5', true)
    }
  }
];

export const CONCERT_BY_ID = Object.fromEntries(CONCERTS.map((c) => [c.id, c]));
