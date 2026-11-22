// Real Natural Earth World Map (GeoJSON via world-atlas) mapped to 28 RISIKO territories
const RISK_CONTINENTS = {
    na: { name: 'Nordamerika', bonus: 5, color: '#eab308' },
    sa: { name: 'Südamerika', bonus: 2, color: '#ef4444' },
    eu: { name: 'Europa', bonus: 5, color: '#3b82f6' },
    af: { name: 'Afrika', bonus: 3, color: '#f97316' },
    as: { name: 'Asien', bonus: 7, color: '#22c55e' },
    au: { name: 'Australien', bonus: 2, color: '#a855f7' }
};

// lon/lat anchor points for each of the 28 RISIKO territories
const RISK_TERRITORIES = [
    // North America (6)
    { id: 'alaska', name: 'Alaska', cont: 'na', lon: -152, lat: 64, adj: ['canada', 'kamtschatka'] },
    { id: 'canada', name: 'Kanada', cont: 'na', lon: -102, lat: 57, adj: ['alaska', 'groenland', 'usa_west', 'usa_ost'] },
    { id: 'groenland', name: 'Grönland', cont: 'na', lon: -42, lat: 72, adj: ['canada', 'nord_eu'] },
    { id: 'usa_west', name: 'USA West', cont: 'na', lon: -114, lat: 40, adj: ['canada', 'usa_ost', 'mexiko'] },
    { id: 'usa_ost', name: 'USA Ost', cont: 'na', lon: -84, lat: 38, adj: ['canada', 'usa_west', 'mexiko'] },
    { id: 'mexiko', name: 'Neuspanien', cont: 'na', lon: -100, lat: 21, adj: ['usa_west', 'usa_ost', 'kolumbien'] },

    // South America (4)
    { id: 'kolumbien', name: 'Kolumbien', cont: 'sa', lon: -72, lat: 4, adj: ['mexiko', 'brasilien', 'peru'] },
    { id: 'brasilien', name: 'Brasilien', cont: 'sa', lon: -51, lat: -12, adj: ['kolumbien', 'peru', 'argentinien', 'westafrika'] },
    { id: 'peru', name: 'Peru', cont: 'sa', lon: -74, lat: -13, adj: ['kolumbien', 'brasilien', 'argentinien'] },
    { id: 'argentinien', name: 'Argentinien', cont: 'sa', lon: -65, lat: -36, adj: ['peru', 'brasilien'] },

    // Europe (5)
    { id: 'nord_eu', name: 'Nordeuropa', cont: 'eu', lon: 15, lat: 62, adj: ['groenland', 'west_eu', 'mitteleuropa', 'russland'] },
    { id: 'west_eu', name: 'Westeuropa', cont: 'eu', lon: -2, lat: 46, adj: ['nord_eu', 'mitteleuropa', 'sued_eu', 'westafrika'] },
    { id: 'mitteleuropa', name: 'Preußen', cont: 'eu', lon: 16, lat: 51, adj: ['nord_eu', 'west_eu', 'sued_eu', 'russland'] },
    { id: 'sued_eu', name: 'Römisches Reich', cont: 'eu', lon: 17, lat: 42, adj: ['west_eu', 'mitteleuropa', 'russland', 'aegypten', 'nahost'] },
    { id: 'russland', name: 'Zarenreich', cont: 'eu', lon: 46, lat: 57, adj: ['nord_eu', 'mitteleuropa', 'sued_eu', 'ural', 'nahost'] },

    // Africa (4)
    { id: 'westafrika', name: 'Westafrika', cont: 'af', lon: 0, lat: 14, adj: ['brasilien', 'west_eu', 'aegypten', 'ostafrika', 'suedafrika'] },
    { id: 'aegypten', name: 'Ägypten', cont: 'af', lon: 27, lat: 25, adj: ['sued_eu', 'westafrika', 'ostafrika', 'nahost'] },
    { id: 'ostafrika', name: 'Ostafrika', cont: 'af', lon: 36, lat: 2, adj: ['westafrika', 'aegypten', 'suedafrika', 'nahost'] },
    { id: 'suedafrika', name: 'Südafrika', cont: 'af', lon: 24, lat: -24, adj: ['westafrika', 'ostafrika'] },

    // Asia (7)
    { id: 'ural', name: 'Ural', cont: 'as', lon: 74, lat: 56, adj: ['russland', 'sibirien', 'china', 'nahost'] },
    { id: 'sibirien', name: 'Sibirien', cont: 'as', lon: 105, lat: 62, adj: ['ural', 'kamtschatka', 'china'] },
    { id: 'kamtschatka', name: 'Kamtschatka', cont: 'as', lon: 146, lat: 62, adj: ['sibirien', 'china', 'japan', 'alaska'] },
    { id: 'nahost', name: 'Osmanisches Reich', cont: 'as', lon: 48, lat: 28, adj: ['sued_eu', 'russland', 'ural', 'aegypten', 'ostafrika', 'indien'] },
    { id: 'indien', name: 'Britisch-Indien', cont: 'as', lon: 79, lat: 21, adj: ['nahost', 'china', 'indonesien'] },
    { id: 'china', name: 'Qing-Reich', cont: 'as', lon: 105, lat: 34, adj: ['ural', 'sibirien', 'kamtschatka', 'indien', 'japan'] },
    { id: 'japan', name: 'Shogunat Japan', cont: 'as', lon: 138, lat: 36, adj: ['kamtschatka', 'china'] },

    // Australia (2)
    { id: 'indonesien', name: 'Indonesien', cont: 'au', lon: 116, lat: -2, adj: ['indien', 'australien'] },
    { id: 'australien', name: 'Australien', cont: 'au', lon: 134, lat: -25, adj: ['indonesien'] }
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

// Loaded Natural Earth GeoJSON features grouped by territory id
window.RISK_GEO = { loaded: false, byTerritory: {} };

async function loadRealWorldMap() {
    if (window.RISK_GEO.loaded || typeof d3 === 'undefined' || typeof topojson === 'undefined') return false;
    try {
        let res = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json');
        if (!res.ok) res = await fetch('https://unpkg.com/world-atlas@2/countries-110m.json');
        const world = await res.json();
        const countries = topojson.feature(world, world.objects.countries).features;

        const projection = d3.geoNaturalEarth1().scale(205).translate([545, 315]);
        const pathGen = d3.geoPath(projection);

        // Project territory label centers
        RISK_TERRITORIES.forEach(t => {
            const [px, py] = projection([t.lon, t.lat]);
            t.x = Math.round(px);
            t.y = Math.round(py);
            window.RISK_GEO.byTerritory[t.id] = [];
        });

        // Map every real country polygon (except Antarctica id 010) to its nearest territory
        for (const feat of countries) {
            if (String(feat.id) === '010') continue; // skip Antarctica
            const [cx, cy] = pathGen.centroid(feat);
            if (!isFinite(cx) || !isFinite(cy)) continue;

            let bestId = RISK_TERRITORIES[0].id;
            let bestDist = Infinity;
            for (const t of RISK_TERRITORIES) {
                const dist = Math.hypot(cx - t.x, cy - t.y);
                if (dist < bestDist) {
                    bestDist = dist;
                    bestId = t.id;
                }
            }
            const dStr = pathGen(feat);
            if (dStr) window.RISK_GEO.byTerritory[bestId].push(dStr);
        }

        window.RISK_GEO.loaded = true;
        return true;
    } catch {
        return false;
    }
}
