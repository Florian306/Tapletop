// Organic, stylized 28-territory SVG world map with realistic coastlines
const RISK_CONTINENTS = {
    na: { name: 'Nordamerika', bonus: 5, color: '#eab308' },
    sa: { name: 'Südamerika', bonus: 2, color: '#ef4444' },
    eu: { name: 'Europa', bonus: 5, color: '#3b82f6' },
    af: { name: 'Afrika', bonus: 3, color: '#f97316' },
    as: { name: 'Asien', bonus: 7, color: '#22c55e' },
    au: { name: 'Australien', bonus: 2, color: '#a855f7' }
};

const RISK_TERRITORIES = [
    // North America (6)
    { id: 'alaska', name: 'Alaska', cont: 'na', x: 94, y: 105,
      d: 'M38,95 L58,72 L95,64 L138,72 L144,126 L112,134 L82,146 L52,138 L34,116 Z',
      adj: ['canada', 'kamtschatka'] },
    { id: 'canada', name: 'Kanada', cont: 'na', x: 210, y: 112,
      d: 'M138,72 L185,56 L245,58 L286,78 L294,118 L272,148 L215,152 L144,142 Z',
      adj: ['alaska', 'groenland', 'usa_west', 'usa_ost'] },
    { id: 'groenland', name: 'Grönland', cont: 'na', x: 350, y: 74,
      d: 'M302,52 L338,26 L388,30 L404,64 L384,106 L346,120 L314,102 L298,74 Z',
      adj: ['canada', 'nord_eu'] },
    { id: 'usa_west', name: 'USA West', cont: 'na', x: 152, y: 186,
      d: 'M110,142 L205,148 L204,228 L156,232 L122,216 L102,184 Z',
      adj: ['canada', 'usa_ost', 'mexiko'] },
    { id: 'usa_ost', name: 'USA Ost', cont: 'na', x: 252, y: 186,
      d: 'M205,148 L298,144 L310,174 L286,214 L268,242 L252,226 L204,228 Z',
      adj: ['canada', 'usa_west', 'mexiko'] },
    { id: 'mexiko', name: 'Mexiko', cont: 'na', x: 196, y: 268,
      d: 'M134,224 L204,228 L244,236 L252,268 L234,302 L198,304 L164,284 L142,254 Z',
      adj: ['usa_west', 'usa_ost', 'kolumbien'] },

    // South America (4)
    { id: 'kolumbien', name: 'Kolumbien', cont: 'sa', x: 248, y: 344,
      d: 'M202,318 L242,306 L286,316 L300,348 L280,378 L212,374 L196,346 Z',
      adj: ['mexiko', 'brasilien', 'peru'] },
    { id: 'brasilien', name: 'Brasilien', cont: 'sa', x: 332, y: 396,
      d: 'M286,334 L348,342 L392,374 L388,414 L356,456 L306,450 L282,420 L280,378 Z',
      adj: ['kolumbien', 'peru', 'argentinien', 'westafrika'] },
    { id: 'peru', name: 'Peru', cont: 'sa', x: 244, y: 416,
      d: 'M204,374 L280,378 L286,448 L246,456 L214,434 L198,402 Z',
      adj: ['kolumbien', 'brasilien', 'argentinien'] },
    { id: 'argentinien', name: 'Argentinien', cont: 'sa', x: 282, y: 504,
      d: 'M242,454 L326,454 L334,492 L302,542 L274,558 L254,528 L240,486 Z',
      adj: ['peru', 'brasilien'] },

    // Europe (5)
    { id: 'nord_eu', name: 'Nordeuropa', cont: 'eu', x: 520, y: 100,
      d: 'M468,94 L498,58 L544,50 L580,68 L576,126 L538,142 L484,136 L464,116 Z',
      adj: ['groenland', 'west_eu', 'mitteleuropa', 'russland'] },
    { id: 'west_eu', name: 'Westeuropa', cont: 'eu', x: 454, y: 186,
      d: 'M418,158 L466,140 L500,148 L496,216 L454,234 L416,222 L408,190 Z',
      adj: ['nord_eu', 'mitteleuropa', 'sued_eu', 'westafrika'] },
    { id: 'mitteleuropa', name: 'Mitteleuropa', cont: 'eu', x: 546, y: 174,
      d: 'M500,144 L594,138 L596,204 L548,212 L496,204 Z',
      adj: ['nord_eu', 'west_eu', 'sued_eu', 'russland'] },
    { id: 'sued_eu', name: 'Südeuropa', cont: 'eu', x: 546, y: 238,
      d: 'M496,204 L596,204 L608,244 L582,268 L544,264 L526,274 L494,248 Z',
      adj: ['west_eu', 'mitteleuropa', 'russland', 'aegypten', 'nahost'] },
    { id: 'russland', name: 'Russland', cont: 'eu', x: 646, y: 142,
      d: 'M586,68 L652,58 L704,70 L698,218 L638,224 L596,204 L592,138 Z',
      adj: ['nord_eu', 'mitteleuropa', 'sued_eu', 'ural', 'nahost'] },

    // Africa (4)
    { id: 'westafrika', name: 'Westafrika', cont: 'af', x: 482, y: 344,
      d: 'M434,296 L484,284 L544,294 L540,398 L482,404 L440,382 L420,336 Z',
      adj: ['brasilien', 'west_eu', 'aegypten', 'ostafrika', 'suedafrika'] },
    { id: 'aegypten', name: 'Ägypten', cont: 'af', x: 590, y: 326,
      d: 'M544,290 L628,292 L646,336 L632,366 L542,364 Z',
      adj: ['sued_eu', 'westafrika', 'ostafrika', 'nahost'] },
    { id: 'ostafrika', name: 'Ostafrika', cont: 'af', x: 604, y: 412,
      d: 'M542,364 L636,366 L666,396 L646,454 L594,458 L540,442 Z',
      adj: ['westafrika', 'aegypten', 'suedafrika', 'nahost'] },
    { id: 'suedafrika', name: 'Südafrika', cont: 'af', x: 556, y: 498,
      d: 'M494,442 L594,452 L620,478 L592,538 L552,552 L516,526 L496,478 Z',
      adj: ['westafrika', 'ostafrika'] },

    // Asia (7)
    { id: 'ural', name: 'Ural', cont: 'as', x: 760, y: 120,
      d: 'M704,70 L772,58 L822,70 L816,174 L754,180 L698,172 Z',
      adj: ['russland', 'sibirien', 'china', 'nahost'] },
    { id: 'sibirien', name: 'Sibirien', cont: 'as', x: 876, y: 114,
      d: 'M822,70 L888,58 L938,70 L932,168 L872,176 L816,174 Z',
      adj: ['ural', 'kamtschatka', 'china'] },
    { id: 'kamtschatka', name: 'Kamtschatka', cont: 'as', x: 990, y: 114,
      d: 'M938,70 L1006,66 L1056,88 L1046,138 L1018,176 L978,166 L932,168 Z',
      adj: ['sibirien', 'china', 'japan', 'alaska'] },
    { id: 'nahost', name: 'Naher Osten', cont: 'as', x: 696, y: 264,
      d: 'M638,224 L704,216 L754,228 L748,308 L702,324 L652,306 L634,264 Z',
      adj: ['sued_eu', 'russland', 'ural', 'aegypten', 'ostafrika', 'indien'] },
    { id: 'indien', name: 'Indien', cont: 'as', x: 800, y: 294,
      d: 'M754,234 L824,236 L856,274 L832,334 L798,366 L766,330 L748,278 Z',
      adj: ['nahost', 'china', 'indonesien'] },
    { id: 'china', name: 'China', cont: 'as', x: 892, y: 224,
      d: 'M816,174 L932,168 L966,192 L960,254 L924,288 L856,282 L822,238 Z',
      adj: ['ural', 'sibirien', 'kamtschatka', 'indien', 'japan'] },
    { id: 'japan', name: 'Japan', cont: 'as', x: 1024, y: 234,
      d: 'M1006,194 L1038,198 L1052,232 L1036,272 L1004,274 L992,246 L1004,218 Z',
      adj: ['kamtschatka', 'china'] },

    // Australia (2)
    { id: 'indonesien', name: 'Indonesien', cont: 'au', x: 896, y: 390,
      d: 'M836,374 L886,356 L948,364 L966,394 L934,418 L866,416 L838,396 Z',
      adj: ['indien', 'australien'] },
    { id: 'australien', name: 'Australien', cont: 'au', x: 946, y: 490,
      d: 'M884,452 L944,436 L1004,448 L1032,486 L1014,536 L964,548 L904,534 L868,502 Z',
      adj: ['indonesien'] }
];

const SEA_ROUTES = [
    ['alaska', 'kamtschatka'],
    ['groenland', 'nord_eu'],
    ['brasilien', 'westafrika'],
    ['west_eu', 'westafrika'],
    ['sued_eu', 'aegypten'],
    ['indien', 'indonesien'],
    ['indonesien', 'australien'],
    ['china', 'japan']
];

const RISK_MISSIONS = [
    { id: 'eu_au', text: 'Erobere ganz Europa und Australien!', check: (st, pid) => ownsCont(st, pid, 'eu') && ownsCont(st, pid, 'au') },
    { id: 'na_af', text: 'Erobere ganz Nordamerika und Afrika!', check: (st, pid) => ownsCont(st, pid, 'na') && ownsCont(st, pid, 'af') },
    { id: '18_terr', text: 'Kontrolliere mindestens 18 Gebiete gleichzeitig!', check: (st, pid) => Object.values(st.board).filter(b => b.ownerId === pid).length >= 18 },
    { id: 'as_sa', text: 'Erobere ganz Asien und Südamerika!', check: (st, pid) => ownsCont(st, pid, 'as') && ownsCont(st, pid, 'sa') }
];

function ownsCont(state, pid, contId) {
    return RISK_TERRITORIES.filter(t => t.cont === contId).every(t => state.board[t.id]?.ownerId === pid);
}
