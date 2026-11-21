// 28-territory SVG world map with 6 classic continents & sea routes
const RISK_CONTINENTS = {
    na: { name: 'Nordamerika', bonus: 5, color: '#eab308' },
    sa: { name: 'Südamerika', bonus: 2, color: '#ef4444' },
    eu: { name: 'Europa', bonus: 5, color: '#3b82f6' },
    af: { name: 'Afrika', bonus: 3, color: '#f97316' },
    as: { name: 'Asien', bonus: 7, color: '#22c55e' },
    au: { name: 'Australien', bonus: 2, color: '#a855f7' }
};

const RISK_TERRITORIES = [
    // North America (5)
    { id: 'alaska', name: 'Alaska', cont: 'na', x: 95, y: 105, d: 'M40,75 L145,70 L145,135 L50,140 Z', adj: ['canada', 'kamtschatka'] },
    { id: 'canada', name: 'Kanada', cont: 'na', x: 205, y: 110, d: 'M145,70 L285,65 L270,150 L145,135 Z', adj: ['alaska', 'groenland', 'usa_west', 'usa_ost'] },
    { id: 'groenland', name: 'Grönland', cont: 'na', x: 345, y: 78, d: 'M295,40 L395,38 L385,115 L300,115 Z', adj: ['canada', 'nord_eu'] },
    { id: 'usa_west', name: 'USA West', cont: 'na', x: 155, y: 185, d: 'M100,140 L205,145 L205,235 L115,225 Z', adj: ['canada', 'usa_ost', 'mexiko'] },
    { id: 'usa_ost', name: 'USA Ost', cont: 'na', x: 250, y: 185, d: 'M205,145 L300,150 L285,235 L205,235 Z', adj: ['canada', 'usa_west', 'mexiko'] },
    { id: 'mexiko', name: 'Mexiko', cont: 'na', x: 195, y: 268, d: 'M135,230 L255,235 L245,305 L165,300 Z', adj: ['usa_west', 'usa_ost', 'kolumbien'] },

    // South America (4)
    { id: 'kolumbien', name: 'Kolumbien', cont: 'sa', x: 245, y: 345, d: 'M195,310 L295,310 L290,378 L205,375 Z', adj: ['mexiko', 'brasilien', 'peru'] },
    { id: 'brasilien', name: 'Brasilien', cont: 'sa', x: 330, y: 395, d: 'M290,335 L385,355 L365,455 L285,435 Z', adj: ['kolumbien', 'peru', 'argentinien', 'westafrika'] },
    { id: 'peru', name: 'Peru', cont: 'sa', x: 245, y: 418, d: 'M205,375 L290,378 L285,455 L215,450 Z', adj: ['kolumbien', 'brasilien', 'argentinien'] },
    { id: 'argentinien', name: 'Argentinien', cont: 'sa', x: 285, y: 505, d: 'M235,455 L345,455 L310,550 L255,545 Z', adj: ['peru', 'brasilien'] },

    // Europe (5)
    { id: 'nord_eu', name: 'Nordeuropa', cont: 'eu', x: 515, y: 105, d: 'M460,65 L575,65 L565,145 L465,145 Z', adj: ['groenland', 'west_eu', 'mitteleuropa', 'russland'] },
    { id: 'west_eu', name: 'Westeuropa', cont: 'eu', x: 455, y: 185, d: 'M410,145 L500,145 L495,228 L415,225 Z', adj: ['nord_eu', 'mitteleuropa', 'sued_eu', 'westafrika'] },
    { id: 'mitteleuropa', name: 'Mitteleuropa', cont: 'eu', x: 545, y: 175, d: 'M500,145 L595,145 L590,210 L495,210 Z', adj: ['nord_eu', 'west_eu', 'sued_eu', 'russland'] },
    { id: 'sued_eu', name: 'Südeuropa', cont: 'eu', x: 545, y: 238, d: 'M495,210 L600,210 L595,268 L495,265 Z', adj: ['west_eu', 'mitteleuropa', 'russland', 'aegypten', 'nahost'] },
    { id: 'russland', name: 'Russland', cont: 'eu', x: 645, y: 145, d: 'M595,70 L700,70 L695,220 L595,215 Z', adj: ['nord_eu', 'mitteleuropa', 'sued_eu', 'ural', 'nahost'] },

    // Africa (4)
    { id: 'westafrika', name: 'Westafrika', cont: 'af', x: 485, y: 345, d: 'M425,295 L545,295 L540,400 L435,395 Z', adj: ['brasilien', 'west_eu', 'aegypten', 'ostafrika', 'suedafrika'] },
    { id: 'aegypten', name: 'Ägypten', cont: 'af', x: 590, y: 325, d: 'M545,288 L640,288 L635,365 L542,365 Z', adj: ['sued_eu', 'westafrika', 'ostafrika', 'nahost'] },
    { id: 'ostafrika', name: 'Ostafrika', cont: 'af', x: 605, y: 412, d: 'M542,365 L655,365 L645,455 L540,450 Z', adj: ['westafrika', 'aegypten', 'suedafrika', 'nahost'] },
    { id: 'suedafrika', name: 'Südafrika', cont: 'af', x: 555, y: 498, d: 'M485,445 L625,450 L595,545 L515,542 Z', adj: ['westafrika', 'ostafrika'] },

    // Asia (6)
    { id: 'ural', name: 'Ural', cont: 'as', x: 760, y: 120, d: 'M700,70 L820,68 L815,175 L698,175 Z', adj: ['russland', 'sibirien', 'china', 'nahost'] },
    { id: 'sibirien', name: 'Sibirien', cont: 'as', x: 875, y: 115, d: 'M820,68 L935,68 L930,170 L815,175 Z', adj: ['ural', 'kamtschatka', 'china'] },
    { id: 'kamtschatka', name: 'Kamtschatka', cont: 'as', x: 990, y: 115, d: 'M935,68 L1050,75 L1035,170 L930,170 Z', adj: ['sibirien', 'china', 'japan', 'alaska'] },
    { id: 'nahost', name: 'Naher Osten', cont: 'as', x: 695, y: 265, d: 'M638,220 L755,220 L748,315 L640,315 Z', adj: ['sued_eu', 'russland', 'ural', 'aegypten', 'ostafrika', 'indien'] },
    { id: 'indien', name: 'Indien', cont: 'as', x: 800, y: 295, d: 'M752,240 L855,240 L842,360 L755,345 Z', adj: ['nahost', 'china', 'indonesien'] },
    { id: 'china', name: 'China', cont: 'as', x: 885, y: 225, d: 'M815,175 L965,170 L955,285 L845,285 Z', adj: ['ural', 'sibirien', 'kamtschatka', 'indien', 'japan'] },
    { id: 'japan', name: 'Japan', cont: 'as', x: 1020, y: 235, d: 'M985,195 L1052,195 L1045,275 L985,270 Z', adj: ['kamtschatka', 'china'] },

    // Australia (2)
    { id: 'indonesien', name: 'Indonesien', cont: 'au', x: 895, y: 390, d: 'M835,360 L960,360 L950,420 L845,420 Z', adj: ['indien', 'australien'] },
    { id: 'australien', name: 'Australien', cont: 'au', x: 945, y: 490, d: 'M865,440 L1025,440 L1015,542 L875,540 Z', adj: ['indonesien'] }
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
