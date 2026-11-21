// Realistic SVG UNO card renderer
const CardRenderer = (() => {
    const COLORS = {
        red: { main: '#E52521', dark: '#B31512' },
        blue: { main: '#0072CE', dark: '#004E91' },
        green: { main: '#3AA935', dark: '#247A20' },
        yellow: { main: '#F5C700', dark: '#C79B00' },
        wild: { main: '#18181E', dark: '#0B0B0F' }
    };

    function getCornerLabel(value) {
        switch (value) {
            case 'skip': return '⊘';
            case 'reverse': return '⇄';
            case 'draw2': return '+2';
            case 'wild': return 'W';
            case 'wild4': return '+4';
            default: return String(value);
        }
    }

    function renderCenterGraphic(card, colorHex) {
        const val = card.value;

        if (val === 'wild') {
            return `
                <g transform="translate(100,150)">
                    <path d="M0,0 L-56,-56 A78,78 0 0,1 56,-56 Z" fill="#E52521" stroke="#fff" stroke-width="3"/>
                    <path d="M0,0 L56,-56 A78,78 0 0,1 56,56 Z" fill="#0072CE" stroke="#fff" stroke-width="3"/>
                    <path d="M0,0 L56,56 A78,78 0 0,1 -56,56 Z" fill="#3AA935" stroke="#fff" stroke-width="3"/>
                    <path d="M0,0 L-56,56 A78,78 0 0,1 -56,-56 Z" fill="#F5C700" stroke="#fff" stroke-width="3"/>
                    <circle cx="0" cy="0" r="16" fill="#18181E" stroke="#fff" stroke-width="3"/>
                </g>
            `;
        }

        if (val === 'wild4') {
            return `
                <g transform="translate(100,150)">
                    <rect x="-46" y="-44" width="38" height="58" rx="6" fill="#E52521" stroke="#fff" stroke-width="3" transform="rotate(-14 -27 -15)"/>
                    <rect x="-22" y="-52" width="38" height="58" rx="6" fill="#0072CE" stroke="#fff" stroke-width="3" transform="rotate(-5 -3 -23)"/>
                    <rect x="4" y="-36" width="38" height="58" rx="6" fill="#F5C700" stroke="#fff" stroke-width="3" transform="rotate(6 23 -7)"/>
                    <rect x="20" y="-12" width="38" height="58" rx="6" fill="#3AA935" stroke="#fff" stroke-width="3" transform="rotate(15 39 17)"/>
                </g>
            `;
        }

        if (val === 'draw2') {
            return `
                <g transform="translate(100,150)">
                    <rect x="-34" y="-44" width="44" height="66" rx="7" fill="${colorHex}" stroke="#fff" stroke-width="4" transform="rotate(-10 -12 -11)"/>
                    <rect x="-8" y="-22" width="44" height="66" rx="7" fill="${colorHex}" stroke="#fff" stroke-width="4" transform="rotate(8 14 11)"/>
                </g>
            `;
        }

        if (val === 'skip') {
            return `
                <g transform="translate(100,150)">
                    <circle cx="0" cy="0" r="46" fill="none" stroke="#000" stroke-opacity="0.28" stroke-width="14" transform="translate(4,5)"/>
                    <line x1="-32" y1="-32" x2="32" y2="32" stroke="#000" stroke-opacity="0.28" stroke-width="14" transform="translate(4,5)"/>
                    <circle cx="0" cy="0" r="46" fill="none" stroke="${colorHex}" stroke-width="14"/>
                    <line x1="-32" y1="-32" x2="32" y2="32" stroke="${colorHex}" stroke-width="14"/>
                </g>
            `;
        }

        if (val === 'reverse') {
            return `
                <g transform="translate(100,150) rotate(-32)">
                    <path d="M-38,-14 L18,-14 L18,-30 L44,-4 L18,22 L18,6 L-38,6 Z" fill="#000" fill-opacity="0.28" transform="translate(4,5)"/>
                    <path d="M38,14 L-18,14 L-18,30 L-44,4 L-18,-22 L-18,-6 L38,-6 Z" fill="#000" fill-opacity="0.28" transform="translate(4,5)"/>
                    <path d="M-38,-14 L18,-14 L18,-30 L44,-4 L18,22 L18,6 L-38,6 Z" fill="${colorHex}" stroke="#fff" stroke-width="2.5"/>
                    <path d="M38,14 L-18,14 L-18,30 L-44,4 L-18,-22 L-18,-6 L38,-6 Z" fill="${colorHex}" stroke="#fff" stroke-width="2.5"/>
                </g>
            `;
        }

        // Standard number 0-9 with underline on 6 and 9
        const needsUnderline = val === '6' || val === '9';
        return `
            <g>
                <text x="105" y="185" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="112" font-weight="900" fill="#000" fill-opacity="0.32">${val}</text>
                <text x="100" y="180" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="112" font-weight="900" fill="${colorHex}" stroke="#000" stroke-width="3">${val}</text>
                ${needsUnderline ? `<rect x="66" y="192" width="68" height="9" rx="4" fill="${colorHex}" stroke="#000" stroke-width="2"/>` : ''}
            </g>
        `;
    }

    function createFrontSVG(card) {
        const palette = COLORS[card.color] || COLORS.wild;
        const corner = getCornerLabel(card.value);
        const cornerSize = corner.length > 1 ? 26 : 32;

        return `
            <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="bg-${card.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stop-color="${palette.main}"/>
                        <stop offset="100%" stop-color="${palette.dark}"/>
                    </linearGradient>
                </defs>
                <!-- White outer border -->
                <rect x="0" y="0" width="200" height="300" rx="18" fill="#FFFFFF"/>
                <!-- Colored inner body -->
                <rect x="11" y="11" width="178" height="278" rx="12" fill="url(#bg-${card.id})"/>
                <!-- Classic tilted white oval -->
                <ellipse cx="100" cy="150" rx="68" ry="104" transform="rotate(28 100 150)" fill="#FFFFFF" fill-opacity="0.96"/>
                <!-- Top-left corner -->
                <text x="24" y="47" font-family="Arial Black, sans-serif" font-size="${cornerSize}" font-weight="900" fill="#000" fill-opacity="0.35">${corner}</text>
                <text x="22" y="45" font-family="Arial Black, sans-serif" font-size="${cornerSize}" font-weight="900" fill="#FFFFFF">${corner}</text>
                <!-- Bottom-right corner -->
                <g transform="rotate(180 100 150)">
                    <text x="24" y="47" font-family="Arial Black, sans-serif" font-size="${cornerSize}" font-weight="900" fill="#000" fill-opacity="0.35">${corner}</text>
                    <text x="22" y="45" font-family="Arial Black, sans-serif" font-size="${cornerSize}" font-weight="900" fill="#FFFFFF">${corner}</text>
                </g>
                <!-- Center symbol -->
                ${renderCenterGraphic(card, palette.main)}
            </svg>
        `;
    }

    function createBackSVG() {
        return `
            <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg">
                <rect x="0" y="0" width="200" height="300" rx="18" fill="#FFFFFF"/>
                <rect x="11" y="11" width="178" height="278" rx="12" fill="#141419"/>
                <ellipse cx="100" cy="150" rx="66" ry="102" transform="rotate(28 100 150)" fill="#E52521" stroke="#FFFFFF" stroke-width="5"/>
                <g transform="rotate(-24 100 150)">
                    <text x="104" y="170" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="60" font-weight="900" fill="#000">UNO</text>
                    <text x="100" y="166" text-anchor="middle" font-family="Arial Black, Impact, sans-serif" font-size="60" font-weight="900" fill="#FFD700" stroke="#000" stroke-width="3">UNO</text>
                </g>
            </svg>
        `;
    }

    return {
        createCardElement(card, { playable = false, onClick = null } = {}) {
            const el = document.createElement('div');
            el.className = 'uno-card' + (playable ? ' playable' : '');
            el.dataset.cardId = card.id;
            el.innerHTML = createFrontSVG(card);
            if (onClick) {
                el.addEventListener('click', () => onClick(card, el));
            }
            return el;
        },
        createBackElement(mini = false) {
            const el = document.createElement('div');
            el.className = mini ? 'uno-card-mini' : 'uno-card';
            el.innerHTML = createBackSVG();
            return el;
        },
        createFrontSVG,
        createBackSVG
    };
})();
