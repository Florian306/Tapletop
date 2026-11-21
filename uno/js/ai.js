// Realistic AI opponents with personalities & live reactions
const UnoAI = (() => {
    const COLORS = ['red', 'blue', 'green', 'yellow'];

    const PROFILES = [
        {
            name: 'Luna',
            avatar: '🦊',
            seat: 'left',
            style: 'aggressive', // loves +2/+4 and occasional bluffs
            lines: {
                attack: ['😈 Viel Spaß damit!', 'Sorry not sorry 😎', 'Nimm die mal mit!'],
                hit: ['😤 Ernsthaft?!', 'Das merk ich mir…', 'Boah, frech!'],
                uno: ['🔥 UNO! Gleich vorbei!', 'Nur noch eine! 😏'],
                swap: ['🤝 Danke für deine Karten!', 'Tausch mal schön! 😈'],
                caughtBluff: ['😳 Okay okay, erwischt…', 'Mist, war ein Versuch wert 😅'],
                jumpIn: ['⚡ Zu langsam! Mein Zug!', 'Boom! Dazwischen!']
            }
        },
        {
            name: 'Max',
            avatar: '🤖',
            seat: 'top',
            style: 'tactical', // calculates color counts and avoids waste
            lines: {
                attack: ['Kalkuliert. 📊', 'Optimales Play.', 'Tut mir fast leid.'],
                hit: ['Statistisch unwahrscheinlich…', 'Okay, guter Zug.', 'Uff.'],
                uno: ['UNO. Alles nach Plan.', 'Noch eine Karte.'],
                swap: ['Effizienter Tausch.', 'Nehme ich gerne.'],
                caughtBluff: ['Risiko nicht aufgegangen.', 'Gut erkannt.'],
                jumpIn: ['⚡ Perfektes Timing.', 'Eingegriffen!']
            }
        },
        {
            name: 'Kira',
            avatar: '🦉',
            seat: 'right',
            style: 'chaotic', // impulsive, loves 7-0 & jump-ins
            lines: {
                attack: ['Haha, gönn dir! 🎉', 'Ups, +4! 😜', 'Chaos muss sein!'],
                hit: ['Auaaa 😭', 'Warum immer ich?!', 'Nooo meine schöne Hand!'],
                uno: ['UNO!! 🥳', 'Fast gewonnen!!'],
                swap: ['Wirbelwind! 🌪️', 'Gib her deine Hand! 😄'],
                caughtBluff: ['Hihi, erwischt 🤭', 'Ups, ich hatte ja doch eine!'],
                jumpIn: ['⚡ ZACK! Meins!', 'Überraschung! 😆']
            }
        }
    ];

    function randomLine(profile, category) {
        const list = profile?.lines?.[category];
        if (!list || !list.length) return '';
        return list[Math.floor(Math.random() * list.length)];
    }

    function pickBestColor(hand) {
        const counts = { red: 0, blue: 0, green: 0, yellow: 0 };
        for (const card of hand) {
            if (counts[card.color] !== undefined) counts[card.color]++;
        }
        let best = COLORS[0];
        let max = -1;
        for (const c of COLORS) {
            if (counts[c] > max) {
                max = counts[c];
                best = c;
            }
        }
        return best;
    }

    function chooseCard(playableCards, hand, state, difficulty, profile) {
        if (!playableCards.length) return null;
        if (difficulty === 'normal') {
            return playableCards[Math.floor(Math.random() * playableCards.length)];
        }

        const nextIdx = (state.currentPlayer + state.direction + state.players.length) % state.players.length;
        const nextPlayer = state.players[nextIdx];
        const nextLowCards = nextPlayer.hand.length <= 2;
        const style = profile?.style || 'tactical';

        let bestCard = playableCards[0];
        let bestScore = -Infinity;

        for (const card of playableCards) {
            let score = 0;

            if (card.color === 'wild') {
                // Aggressive bots bluff +4 more often; tactical bots save wilds
                if (card.value === 'wild4') {
                    score += nextLowCards ? 34 : (style === 'aggressive' ? 6 : -18);
                } else {
                    score -= 16;
                }
            } else {
                const sameColorCount = hand.filter(c => c.color === card.color).length;
                score += sameColorCount * 4.5;
            }

            if (card.value === 'draw2' || card.value === 'skip' || card.value === 'reverse') {
                score += nextLowCards ? 32 : (style === 'aggressive' ? 16 : 8);
            }

            const num = parseInt(card.value, 10);
            if (!isNaN(num)) score += num;

            if (state.rules.sevenZero && card.value === '7') {
                const minOther = Math.min(...state.players.filter((_, i) => i !== state.currentPlayer).map(p => p.hand.length));
                if (hand.length - 1 > minOther + 1) score += (style === 'chaotic' ? 45 : 35);
                else score -= 12;
            }

            if (score > bestScore) {
                bestScore = score;
                bestCard = card;
            }
        }

        return bestCard;
    }

    function chooseSwapTarget(players, aiIndex) {
        let bestIdx = -1;
        let minCards = Infinity;
        players.forEach((p, idx) => {
            if (idx !== aiIndex && p.hand.length < minCards) {
                minCards = p.hand.length;
                bestIdx = idx;
            }
        });
        return bestIdx;
    }

    function getThinkDelay(playableCount, handLength, profile) {
        // Personality-based human-like thinking pace (ms)
        const style = profile?.style || 'tactical';
        const baseByStyle = { chaotic: 1300, aggressive: 1650, tactical: 2050 };
        let base = baseByStyle[style] || 1700;

        if (playableCount === 0) {
            // Scanning hand before realizing they must draw
            return base + Math.random() * 650;
        }
        if (playableCount >= 3) {
            // Multiple options -> think noticeably longer
            base += 550;
        }
        if (handLength <= 2) {
            // Tense endgame moment
            base += 350;
        }
        return base + Math.random() * 950;
    }

    return {
        PROFILES,
        randomLine,
        pickBestColor,
        chooseCard,
        chooseSwapTarget,
        getThinkDelay
    };
})();
