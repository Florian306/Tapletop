// Classic 40-tile German Monopoly board + Chance & Community cards
const MONO_BOARD = [
    { id: 0, name: 'LOS', type: 'go' },
    { id: 1, name: 'Badstraße', type: 'street', group: 'brown', color: '#8B4513', price: 60, houseCost: 50, rent: [2, 10, 30, 90, 160, 250] },
    { id: 2, name: 'Gemeinschaft', type: 'community' },
    { id: 3, name: 'Turmstraße', type: 'street', group: 'brown', color: '#8B4513', price: 60, houseCost: 50, rent: [4, 20, 60, 180, 320, 450] },
    { id: 4, name: 'Einkommensteuer', type: 'tax', amount: 200 },
    { id: 5, name: 'Südbahnhof', type: 'railroad', group: 'rail', color: '#222', price: 200, rent: [25, 50, 100, 200] },
    { id: 6, name: 'Chausseestraße', type: 'street', group: 'lightblue', color: '#38bdf8', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
    { id: 7, name: 'Ereignisfeld', type: 'chance' },
    { id: 8, name: 'Elisenstraße', type: 'street', group: 'lightblue', color: '#38bdf8', price: 100, houseCost: 50, rent: [6, 30, 90, 270, 400, 550] },
    { id: 9, name: 'Poststraße', type: 'street', group: 'lightblue', color: '#38bdf8', price: 120, houseCost: 50, rent: [8, 40, 100, 300, 450, 600] },
    { id: 10, name: 'Gefängnis', type: 'jail' },
    { id: 11, name: 'Seestraße', type: 'street', group: 'pink', color: '#ec4899', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
    { id: 12, name: 'E-Werk', type: 'utility', group: 'util', color: '#64748b', price: 150 },
    { id: 13, name: 'Hafenstraße', type: 'street', group: 'pink', color: '#ec4899', price: 140, houseCost: 100, rent: [10, 50, 150, 450, 625, 750] },
    { id: 14, name: 'Neue Straße', type: 'street', group: 'pink', color: '#ec4899', price: 160, houseCost: 100, rent: [12, 60, 180, 500, 700, 900] },
    { id: 15, name: 'Westbahnhof', type: 'railroad', group: 'rail', color: '#222', price: 200, rent: [25, 50, 100, 200] },
    { id: 16, name: 'Münchner Str.', type: 'street', group: 'orange', color: '#f97316', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
    { id: 17, name: 'Gemeinschaft', type: 'community' },
    { id: 18, name: 'Wiener Str.', type: 'street', group: 'orange', color: '#f97316', price: 180, houseCost: 100, rent: [14, 70, 200, 550, 750, 950] },
    { id: 19, name: 'Berliner Str.', type: 'street', group: 'orange', color: '#f97316', price: 200, houseCost: 100, rent: [16, 80, 220, 600, 800, 1000] },
    { id: 20, name: 'Frei Parken', type: 'parking' },
    { id: 21, name: 'Theaterstraße', type: 'street', group: 'red', color: '#ef4444', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
    { id: 22, name: 'Ereignisfeld', type: 'chance' },
    { id: 23, name: 'Museumstraße', type: 'street', group: 'red', color: '#ef4444', price: 220, houseCost: 150, rent: [18, 90, 250, 700, 875, 1050] },
    { id: 24, name: 'Opernplatz', type: 'street', group: 'red', color: '#ef4444', price: 240, houseCost: 150, rent: [20, 100, 300, 750, 925, 1100] },
    { id: 25, name: 'Nordbahnhof', type: 'railroad', group: 'rail', color: '#222', price: 200, rent: [25, 50, 100, 200] },
    { id: 26, name: 'Lessingstraße', type: 'street', group: 'yellow', color: '#eab308', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
    { id: 27, name: 'Schillerstraße', type: 'street', group: 'yellow', color: '#eab308', price: 260, houseCost: 150, rent: [22, 110, 330, 800, 975, 1150] },
    { id: 28, name: 'Wasserwerk', type: 'utility', group: 'util', color: '#64748b', price: 150 },
    { id: 29, name: 'Goethestraße', type: 'street', group: 'yellow', color: '#eab308', price: 280, houseCost: 150, rent: [24, 120, 360, 850, 1025, 1200] },
    { id: 30, name: 'Ins Gefängnis', type: 'gotojail' },
    { id: 31, name: 'Rathausplatz', type: 'street', group: 'green', color: '#22c55e', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
    { id: 32, name: 'Hauptstraße', type: 'street', group: 'green', color: '#22c55e', price: 300, houseCost: 200, rent: [26, 130, 390, 900, 1100, 1275] },
    { id: 33, name: 'Gemeinschaft', type: 'community' },
    { id: 34, name: 'Bahnhofstraße', type: 'street', group: 'green', color: '#22c55e', price: 320, houseCost: 200, rent: [28, 150, 450, 1000, 1200, 1400] },
    { id: 35, name: 'Hauptbahnhof', type: 'railroad', group: 'rail', color: '#222', price: 200, rent: [25, 50, 100, 200] },
    { id: 36, name: 'Ereignisfeld', type: 'chance' },
    { id: 37, name: 'Parkstraße', type: 'street', group: 'darkblue', color: '#1d4ed8', price: 350, houseCost: 200, rent: [35, 175, 500, 1100, 1300, 1500] },
    { id: 38, name: 'Zusatzsteuer', type: 'tax', amount: 100 },
    { id: 39, name: 'Schlossallee', type: 'street', group: 'darkblue', color: '#1d4ed8', price: 400, houseCost: 200, rent: [50, 200, 600, 1400, 1700, 2000] }
];

const CHANCE_CARDS = [
    { text: 'Rücke vor bis auf LOS! Du erhältst 200 €.', action: 'move', target: 0 },
    { text: 'Rücke vor bis zur Schlossallee!', action: 'move', target: 39 },
    { text: 'Die Bank zahlt dir eine Dividende von 100 €.', action: 'money', amount: 100 },
    { text: 'Strafzettel wegen zu schnellen Fahrens: Zahle 50 €.', action: 'tax', amount: 50 },
    { text: 'Gehe direkt ins Gefängnis! Ziehe nicht über LOS.', action: 'jail' },
    { text: 'Du hast im Kreuzworträtsel gewonnen: Erhalte 150 €.', action: 'money', amount: 150 },
    { text: 'Gehe 3 Felder zurück.', action: 'back', steps: 3 }
];

const COMMUNITY_CARDS = [
    { text: 'Bankirrtum zu deinen Gunsten: Erhalte 200 €!', action: 'money', amount: 200 },
    { text: 'Arztkosten: Zahle 50 €.', action: 'tax', amount: 50 },
    { text: 'Steuerrückzahlung: Erhalte 100 €.', action: 'money', amount: 100 },
    { text: 'Schulgebühren: Zahle 100 €.', action: 'tax', amount: 100 },
    { text: 'Erbschaft! Du erhältst 150 €.', action: 'money', amount: 150 },
    { text: 'Gehe direkt ins Gefängnis!', action: 'jail' },
    { text: 'Rücke vor bis auf LOS!', action: 'move', target: 0 }
];
