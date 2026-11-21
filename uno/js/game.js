// Core UNO Engine with 3D Juice, Jump-In, Bluff-Check, Themes & Tournament Mode
(() => {
    const COLORS = ['red', 'blue', 'green', 'yellow'];
    const COLOR_NAMES_DE = { red: 'Rot', blue: 'Blau', green: 'Grün', yellow: 'Gelb' };
    const THEMES = ['casino', 'luxury', 'cyber'];
    const STATS_KEY = 'uno_realistic_stats_v1';

    const state = {
        deck: [],
        discard: [],
        players: [],
        currentPlayer: 0,
        direction: 1,
        activeColor: 'red',
        drawStack: 0,
        drawStackType: null,
        difficulty: 'hard',
        opponentCount: 3,
        theme: 'casino',
        rules: {
            stacking: true,
            unoPenalty: true,
            sevenZero: true,
            jumpIn: true,
            bluffCheck: true,
            drawUntil: false,
            tournament: false
        },
        tournamentScores: {},
        busy: false,
        gameOver: false,
        pendingWildCard: null,
        pendingBluff: null,
        catchablePlayerIdx: null,
        aiTimer: null
    };

    const dom = {
        app: document.getElementById('app'),
        tableGlow: document.getElementById('table-glow'),
        turnBanner: document.getElementById('turn-banner'),
        statsPill: document.getElementById('stats-pill'),
        directionRing: document.getElementById('direction-ring'),
        drawPile: document.getElementById('draw-pile'),
        drawPileTop: document.getElementById('draw-pile-top'),
        deckCount: document.getElementById('deck-count'),
        discardPile: document.getElementById('discard-pile'),
        activeColorDot: document.getElementById('active-color-dot'),
        activeColorText: document.getElementById('active-color-text'),
        stackBadge: document.getElementById('stack-badge'),
        stackBadgeText: document.getElementById('stack-badge-text'),
        actionToast: document.getElementById('action-toast'),
        fxLayer: document.getElementById('fx-layer'),
        btnUno: document.getElementById('btn-uno'),
        btnCatch: document.getElementById('btn-catch'),
        btnSort: document.getElementById('btn-sort'),
        btnSound: document.getElementById('btn-sound'),
        btnTheme: document.getElementById('btn-theme'),
        btnMenu: document.getElementById('btn-menu'),
        btnRules: document.getElementById('btn-rules'),
        modalStart: document.getElementById('modal-start'),
        modalColor: document.getElementById('modal-color'),
        modalBluff: document.getElementById('modal-bluff'),
        bluffDesc: document.getElementById('bluff-desc'),
        modalSwap: document.getElementById('modal-swap'),
        swapTargets: document.getElementById('swap-targets'),
        modalGameover: document.getElementById('modal-gameover'),
        modalRules: document.getElementById('modal-rules')
    };

    // --- Persistent Stats ---
    function loadStats() {
        try {
            const raw = localStorage.getItem(STATS_KEY);
            return raw ? JSON.parse(raw) : { wins: 0, streak: 0 };
        } catch {
            return { wins: 0, streak: 0 };
        }
    }

    function saveStats(won) {
        const stats = loadStats();
        if (won) {
            stats.wins += 1;
            stats.streak += 1;
        } else {
            stats.streak = 0;
        }
        try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch {}
        renderStats();
    }

    function renderStats() {
        const stats = loadStats();
        dom.statsPill.textContent = `🏆 ${stats.wins} · 🔥 ${stats.streak}`;
    }

    // --- Visual FX ---
    let toastTimer = null;
    function showToast(msg) {
        dom.actionToast.textContent = msg;
        dom.actionToast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => dom.actionToast.classList.remove('show'), 2300);
    }

    const chatTimers = {};
    function showBotChat(seat, text) {
        if (!text) return;
        const el = document.getElementById(`chat-${seat}`);
        if (!el) return;
        el.textContent = text;
        el.classList.add('show');
        clearTimeout(chatTimers[seat]);
        chatTimers[seat] = setTimeout(() => el.classList.remove('show'), 2400);
    }

    function triggerShake() {
        dom.app.classList.remove('shake');
        void dom.app.offsetWidth;
        dom.app.classList.add('shake');
    }

    function spawnParticles(count = 28, originEl = dom.discardPile) {
        const rect = originEl ? originEl.getBoundingClientRect() : { left: window.innerWidth / 2, top: window.innerHeight / 2, width: 0, height: 0 };
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        const palette = ['#E52521', '#0072CE', '#3AA935', '#F5C700', '#FFFFFF'];

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = `${cx}px`;
            p.style.top = `${cy}px`;
            p.style.background = palette[i % palette.length];
            dom.fxLayer.appendChild(p);

            const angle = Math.random() * Math.PI * 2;
            const dist = 70 + Math.random() * 220;
            const dx = Math.cos(angle) * dist;
            const dy = Math.sin(angle) * dist + 60;
            const rot = Math.random() * 720 - 360;
            const dur = 600 + Math.random() * 550;

            p.animate([
                { transform: 'translate(0, 0) rotate(0deg) scale(1)', opacity: 1 },
                { transform: `translate(${dx}px, ${dy}px) rotate(${rot}deg) scale(0.3)`, opacity: 0 }
            ], { duration: dur, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' }).onfinish = () => p.remove();
        }
    }

    function applyTheme(theme) {
        state.theme = theme;
        document.body.dataset.theme = theme;
        document.querySelectorAll('#opt-theme button').forEach(b => {
            b.classList.toggle('active', b.dataset.val === theme);
        });
    }

    // --- Deck & Rules ---
    function createDeck() {
        const deck = [];
        let uid = 1;
        for (const color of COLORS) {
            deck.push({ id: `c${uid++}`, color, value: '0' });
            for (let n = 1; n <= 9; n++) {
                deck.push({ id: `c${uid++}`, color, value: String(n) });
                deck.push({ id: `c${uid++}`, color, value: String(n) });
            }
            for (const sym of ['skip', 'reverse', 'draw2']) {
                deck.push({ id: `c${uid++}`, color, value: sym });
                deck.push({ id: `c${uid++}`, color, value: sym });
            }
        }
        for (let i = 0; i < 4; i++) {
            deck.push({ id: `c${uid++}`, color: 'wild', value: 'wild' });
            deck.push({ id: `c${uid++}`, color: 'wild', value: 'wild4' });
        }
        return shuffle(deck);
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    function drawFromDeck(count = 1) {
        const drawn = [];
        for (let i = 0; i < count; i++) {
            if (state.deck.length === 0) {
                if (state.discard.length <= 1) break;
                const top = state.discard.pop();
                state.deck = shuffle(state.discard);
                state.discard = [top];
                showToast('Ablagestapel neu gemischt');
            }
            drawn.push(state.deck.pop());
        }
        return drawn;
    }

    function getTopCard() {
        return state.discard[state.discard.length - 1];
    }

    function isCardPlayable(card) {
        const top = getTopCard();
        if (!top) return true;
        if (state.drawStack > 0) {
            if (!state.rules.stacking) return false;
            return card.value === state.drawStackType;
        }
        if (card.color === 'wild') return true;
        if (card.color === state.activeColor) return true;
        if (card.value === top.value) return true;
        return false;
    }

    function isJumpInCard(card) {
        if (!state.rules.jumpIn || state.drawStack > 0 || state.gameOver) return false;
        const top = getTopCard();
        if (!top || top.color === 'wild' || card.color === 'wild') return false;
        return card.color === top.color && card.value === top.value;
    }

    function getSeatProfiles(opponentCount) {
        if (opponentCount === 1) return [UnoAI.PROFILES[1]];
        if (opponentCount === 2) return [UnoAI.PROFILES[0], UnoAI.PROFILES[2]];
        return [UnoAI.PROFILES[0], UnoAI.PROFILES[1], UnoAI.PROFILES[2]];
    }

    function startNewGame(resetTournament = false) {
        clearTimeout(state.aiTimer);
        state.deck = createDeck();
        state.discard = [];
        state.direction = 1;
        state.drawStack = 0;
        state.drawStackType = null;
        state.busy = false;
        state.gameOver = false;
        state.pendingWildCard = null;
        state.pendingBluff = null;
        state.catchablePlayerIdx = null;

        const aiList = getSeatProfiles(state.opponentCount);
        state.players = [
            { id: 0, name: 'Du', isHuman: true, seat: 'bottom', hand: [], calledUno: false, profile: null }
        ];
        aiList.forEach((profile, idx) => {
            state.players.push({
                id: idx + 1,
                name: profile.name,
                isHuman: false,
                seat: profile.seat,
                hand: [],
                calledUno: false,
                profile
            });
            document.getElementById(`name-${profile.seat}`).textContent = profile.name;
            document.getElementById(`avatar-${profile.seat}`).textContent = profile.avatar;
        });

        if (resetTournament) {
            state.tournamentScores = {};
            state.players.forEach(p => { state.tournamentScores[p.name] = 0; });
        }

        ['left', 'top', 'right'].forEach(seat => {
            const el = document.getElementById(`seat-${seat}`);
            const used = state.players.some(p => p.seat === seat);
            el.classList.toggle('hidden-seat', !used);
        });

        for (let r = 0; r < 7; r++) {
            for (const p of state.players) p.hand.push(...drawFromDeck(1));
        }
        sortHand(state.players[0].hand);

        let starter = drawFromDeck(1)[0];
        while (starter.color === 'wild') {
            state.deck.unshift(starter);
            starter = drawFromDeck(1)[0];
        }
        state.discard.push(starter);
        state.activeColor = starter.color;
        state.currentPlayer = 0;

        dom.modalStart.classList.add('hidden');
        dom.modalGameover.classList.add('hidden');
        dom.modalBluff.classList.add('hidden');
        dom.drawPileTop.innerHTML = CardRenderer.createBackSVG();

        renderAll();
        showToast('Runde gestartet — Du beginnst!');
        SoundFX.cardDraw();
    }

    function sortHand(hand) {
        const colorOrder = { red: 0, blue: 1, green: 2, yellow: 3, wild: 4 };
        const valOrder = {
            '0': 0, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9,
            'skip': 10, 'reverse': 11, 'draw2': 12, 'wild': 13, 'wild4': 14
        };
        hand.sort((a, b) => {
            if (colorOrder[a.color] !== colorOrder[b.color]) return colorOrder[a.color] - colorOrder[b.color];
            return valOrder[a.value] - valOrder[b.value];
        });
    }

    function animateCardFly(fromEl, toEl, card, faceUp = true, flip = false) {
        return new Promise(resolve => {
            if (!fromEl || !toEl) { resolve(); return; }
            const fromRect = fromEl.getBoundingClientRect();
            const toRect = toEl.getBoundingClientRect();

            const flyer = document.createElement('div');
            flyer.className = 'flying-card';
            flyer.innerHTML = faceUp ? CardRenderer.createFrontSVG(card) : CardRenderer.createBackSVG();
            flyer.style.left = `${fromRect.left + fromRect.width / 2 - 54}px`;
            flyer.style.top = `${fromRect.top + fromRect.height / 2 - 81}px`;
            if (flip) flyer.style.transform = 'perspective(600px) rotateY(180deg)';
            dom.fxLayer.appendChild(flyer);

            const dx = (toRect.left + toRect.width / 2) - (fromRect.left + fromRect.width / 2);
            const dy = (toRect.top + toRect.height / 2) - (fromRect.top + fromRect.height / 2);
            const rot = (Math.random() * 14 - 7).toFixed(1);

            requestAnimationFrame(() => {
                flyer.style.transform = `translate(${dx}px, ${dy}px) rotate(${rot}deg) rotateY(0deg)`;
            });

            setTimeout(() => { flyer.remove(); resolve(); }, 340);
        });
    }

    function attach3DTilt(cardEl, baseTransform) {
        cardEl.addEventListener('mousemove', e => {
            const rect = cardEl.getBoundingClientRect();
            const px = (e.clientX - rect.left) / rect.width;
            const py = (e.clientY - rect.top) / rect.height;
            const rx = (0.5 - py) * 22;
            const ry = (px - 0.5) * 24;
            cardEl.style.setProperty('--glare-x', `${(px * 100).toFixed(1)}%`);
            cardEl.style.setProperty('--glare-y', `${(py * 100).toFixed(1)}%`);
            cardEl.style.transform = `translateY(-28px) scale(1.1) rotateX(${rx}deg) rotateY(${ry}deg)`;
            cardEl.style.zIndex = '60';
        });
        cardEl.addEventListener('mouseleave', () => {
            cardEl.style.transform = baseTransform;
            cardEl.style.zIndex = '';
        });
    }

    function renderAll() {
        dom.deckCount.textContent = `${state.deck.length}`;
        dom.directionRing.classList.toggle('ccw', state.direction === -1);
        dom.tableGlow.className = `table-glow glow-${state.activeColor}`;

        dom.activeColorDot.className = `color-dot ${state.activeColor}`;
        dom.activeColorText.textContent = COLOR_NAMES_DE[state.activeColor] || '—';

        if (state.drawStack > 0) {
            dom.stackBadge.classList.remove('hidden');
            dom.stackBadgeText.textContent = `+${state.drawStack} Stapel!`;
        } else {
            dom.stackBadge.classList.add('hidden');
        }

        dom.discardPile.innerHTML = '';
        state.discard.slice(-4).forEach((card, idx) => {
            const el = CardRenderer.createCardElement(card);
            const seed = parseInt(card.id.replace(/\D/g, ''), 10) || idx;
            const angle = ((seed * 19) % 19) - 9;
            el.style.transform = `rotate(${angle}deg)`;
            el.style.zIndex = idx + 1;
            dom.discardPile.appendChild(el);
        });

        const activePlayer = state.players[state.currentPlayer];
        if (activePlayer) {
            dom.turnBanner.textContent = activePlayer.isHuman
                ? (state.drawStack > 0 ? `Du bist dran — Kontern oder +${state.drawStack} ziehen!` : 'Du bist am Zug!')
                : `${activePlayer.name} überlegt...`;
        }

        const human = state.players[0];
        const humanTurn = state.currentPlayer === 0 && !state.busy && !state.gameOver;
        const humanHasPlayable = humanTurn && human.hand.some(isCardPlayable);
        dom.drawPile.classList.toggle('highlight-draw', humanTurn && !humanHasPlayable);

        const canCallUno = state.rules.unoPenalty && human && !human.calledUno && (human.hand.length === 1 || (humanTurn && human.hand.length === 2 && humanHasPlayable));
        dom.btnUno.disabled = !canCallUno;
        dom.btnUno.classList.toggle('ready', canCallUno);
        dom.btnCatch.classList.toggle('hidden', state.catchablePlayerIdx === null);

        state.players.forEach((p, idx) => {
            const seatEl = document.getElementById(`seat-${p.seat}`);
            const countEl = document.getElementById(`count-${p.seat}`);
            const unoEl = document.getElementById(`uno-tag-${p.seat}`);
            const handEl = document.getElementById(`hand-${p.seat}`);

            seatEl.classList.toggle('active-turn', idx === state.currentPlayer && !state.gameOver);
            countEl.textContent = `${p.hand.length} ${p.hand.length === 1 ? 'Karte' : 'Karten'}`;
            unoEl.classList.toggle('hidden', !(p.hand.length === 1 && p.calledUno));

            handEl.innerHTML = '';
            if (p.isHuman) {
                const total = p.hand.length;
                p.hand.forEach((card, cIdx) => {
                    const playable = humanTurn && isCardPlayable(card);
                    const jumpIn = !humanTurn && !state.gameOver && isJumpInCard(card);
                    const clickable = playable || jumpIn;

                    const cardEl = CardRenderer.createCardElement(card, {
                        playable,
                        onClick: clickable ? (c, el) => (jumpIn ? handleHumanJumpIn(c, el) : handleHumanPlay(c, el)) : null
                    });

                    if (jumpIn) cardEl.classList.add('jump-in');
                    else if (!playable && humanTurn) cardEl.classList.add('unplayable');

                    const mid = (total - 1) / 2;
                    const offset = cIdx - mid;
                    const rot = Math.max(-14, Math.min(14, offset * 1.8));
                    const drop = Math.abs(offset) * 1.4;
                    const baseTransform = `translateY(${drop}px) rotate(${rot}deg)`;
                    cardEl.style.transform = baseTransform;

                    if (clickable) attach3DTilt(cardEl, baseTransform);
                    handEl.appendChild(cardEl);
                });
            } else {
                const maxVisual = Math.min(p.hand.length, 10);
                for (let i = 0; i < maxVisual; i++) {
                    handEl.appendChild(CardRenderer.createBackElement(true));
                }
            }
        });
    }

    async function handleHumanJumpIn(card, cardEl) {
        if (state.gameOver || !isJumpInCard(card)) return;
        clearTimeout(state.aiTimer);
        state.busy = true;
        state.currentPlayer = 0;
        showToast('⚡ DAZWISCHENGEWORFEN (Jump-In)!');
        SoundFX.special();
        const goingToOne = state.players[0].hand.length === 2;
        await executePlay(0, card, card.color, cardEl, goingToOne);
    }

    async function handleHumanPlay(card, cardEl) {
        if (state.busy || state.gameOver || state.currentPlayer !== 0) return;
        if (!isCardPlayable(card)) return;

        state.busy = true;
        const goingToOne = state.players[0].hand.length === 2;

        if (card.color === 'wild') {
            state.pendingWildCard = { card, cardEl, goingToOne };
            dom.modalColor.classList.remove('hidden');
            return;
        }
        await executePlay(0, card, card.color, cardEl, goingToOne);
    }

    async function executePlay(playerIdx, card, chosenColor, sourceEl, goingToOne = false) {
        const player = state.players[playerIdx];
        const cardIndex = player.hand.findIndex(c => c.id === card.id);
        if (cardIndex === -1) { state.busy = false; return; }

        // Check if wild4 was a bluff (player held the previous active color)
        const prevColor = state.activeColor;
        const hadPrevColor = player.hand.some(c => c.color === prevColor);

        player.hand.splice(cardIndex, 1);
        SoundFX.cardPlay();
        await animateCardFly(sourceEl, dom.discardPile, card, true);

        state.discard.push(card);
        state.activeColor = chosenColor;
        if (state.catchablePlayerIdx === playerIdx) state.catchablePlayerIdx = null;

        if (player.hand.length === 0) {
            renderAll();
            finishGame(playerIdx);
            return;
        }

        if (state.rules.unoPenalty && goingToOne && !player.calledUno) {
            if (player.isHuman) {
                showToast('UNO vergessen! +2 Strafkarten!');
                SoundFX.penalty();
                player.hand.push(...drawFromDeck(2));
                sortHand(player.hand);
            } else {
                state.catchablePlayerIdx = playerIdx;
                showToast(`${player.name} hat UNO vergessen! Schnell erwischen!`);
            }
        }

        if (player.hand.length > 1) player.calledUno = false;

        let skipNext = false;
        const nextIdx = (playerIdx + state.direction + state.players.length) % state.players.length;
        const nextPlayer = state.players[nextIdx];

        if (card.value === 'reverse') {
            SoundFX.special();
            if (state.players.length === 2) {
                skipNext = true;
                showToast('Richtungswechsel (= Aussetzen)');
            } else {
                state.direction *= -1;
                showToast('Richtungswechsel!');
            }
        } else if (card.value === 'skip') {
            SoundFX.special();
            skipNext = true;
            showToast(`${nextPlayer.name} setzt aus!`);
        } else if (card.value === 'draw2') {
            SoundFX.penalty();
            state.drawStack += 2;
            state.drawStackType = 'draw2';
            showToast(`+2 gespielt! (Stapel: +${state.drawStack})`);
            if (!player.isHuman) showBotChat(player.seat, UnoAI.randomLine(player.profile, 'attack'));
            if (!nextPlayer.isHuman) showBotChat(nextPlayer.seat, UnoAI.randomLine(nextPlayer.profile, 'hit'));
        } else if (card.value === 'wild4') {
            SoundFX.penalty();
            triggerShake();
            spawnParticles(24, dom.discardPile);
            const wasFirstInStack = state.drawStack === 0;
            state.drawStack += 4;
            state.drawStackType = 'wild4';
            showToast(`+4 & ${COLOR_NAMES_DE[chosenColor]}! (Stapel: +${state.drawStack})`);
            if (!player.isHuman) showBotChat(player.seat, UnoAI.randomLine(player.profile, 'attack'));

            // Offer Bluff-Check to human if AI played a fresh +4 against them
            if (state.rules.bluffCheck && wasFirstInStack && !player.isHuman && nextPlayer.isHuman) {
                state.currentPlayer = 0;
                state.pendingBluff = { offenderIdx: playerIdx, wasBluff: hadPrevColor, prevColor };
                renderAll();
                dom.bluffDesc.textContent = `${player.name} hat eine +4 gelegt! Glaubst du, ${player.name} hatte eigentlich noch ${COLOR_NAMES_DE[prevColor]} auf der Hand?`;
                dom.modalBluff.classList.remove('hidden');
                return;
            }
        } else if (card.value === 'wild') {
            SoundFX.special();
            showToast(`Farbe gewählt: ${COLOR_NAMES_DE[chosenColor]}`);
        }

        if (state.rules.sevenZero && card.value === '0') {
            SoundFX.special();
            rotateAllHands();
            showToast('0 gespielt — Alle Hände rotieren!');
        } else if (state.rules.sevenZero && card.value === '7') {
            SoundFX.special();
            if (player.isHuman) {
                renderAll();
                openSwapModal(skipNext);
                return;
            } else {
                const targetIdx = UnoAI.chooseSwapTarget(state.players, playerIdx);
                if (targetIdx !== -1) {
                    swapHands(playerIdx, targetIdx);
                    showBotChat(player.seat, UnoAI.randomLine(player.profile, 'swap'));
                    showToast(`${player.name} tauscht Hand mit ${state.players[targetIdx].name}!`);
                }
            }
        }

        advanceTurn(skipNext ? 2 : 1);
    }

    function rotateAllHands() {
        const hands = state.players.map(p => p.hand);
        const len = state.players.length;
        for (let i = 0; i < len; i++) {
            const fromIdx = (i - state.direction + len) % len;
            state.players[i].hand = hands[fromIdx];
            state.players[i].calledUno = state.players[i].hand.length === 1;
        }
        sortHand(state.players[0].hand);
    }

    function swapHands(idxA, idxB) {
        const tmp = state.players[idxA].hand;
        state.players[idxA].hand = state.players[idxB].hand;
        state.players[idxB].hand = tmp;
        state.players[idxA].calledUno = state.players[idxA].hand.length === 1;
        state.players[idxB].calledUno = state.players[idxB].hand.length === 1;
        sortHand(state.players[0].hand);
    }

    function openSwapModal(skipNext) {
        dom.swapTargets.innerHTML = '';
        state.players.forEach((p, idx) => {
            if (idx === 0) return;
            const btn = document.createElement('button');
            btn.className = 'swap-target-btn';
            btn.innerHTML = `<span>${p.profile.avatar} ${p.name}</span><span>${p.hand.length} Karten</span>`;
            btn.addEventListener('click', () => {
                dom.modalSwap.classList.add('hidden');
                swapHands(0, idx);
                showToast(`Hand mit ${p.name} getauscht!`);
                advanceTurn(skipNext ? 2 : 1);
            });
            dom.swapTargets.appendChild(btn);
        });
        dom.modalSwap.classList.remove('hidden');
    }

    async function handleDrawAction(playerIdx) {
        const player = state.players[playerIdx];
        const wasStack = state.drawStack > 0;
        const count = wasStack ? state.drawStack : 1;

        state.drawStack = 0;
        state.drawStackType = null;

        const targetEl = document.getElementById(`hand-${player.seat}`);
        SoundFX.cardDraw();

        if (wasStack) {
            await animateCardFly(dom.drawPile, targetEl, null, false, true);
            player.hand.push(...drawFromDeck(count));
            player.calledUno = false;
            if (player.isHuman) sortHand(player.hand);
            showToast(`${player.name} zieht +${count} Karten!`);
            advanceTurn(1);
            return;
        }

        // Draw until playable mode
        if (state.rules.drawUntil) {
            let drawnCount = 0;
            let lastCard = null;
            while (drawnCount < 12) {
                const [c] = drawFromDeck(1);
                if (!c) break;
                player.hand.push(c);
                drawnCount++;
                lastCard = c;
                if (isCardPlayable(c)) break;
            }
            await animateCardFly(dom.drawPile, targetEl, lastCard, player.isHuman, true);
            player.calledUno = false;
            if (player.isHuman) sortHand(player.hand);
            if (player.isHuman && lastCard && isCardPlayable(lastCard)) {
                state.busy = false;
                renderAll();
                showToast(`${drawnCount} gezogen — spielbare Karte gefunden!`);
                return;
            }
            showToast(`${player.name} zieht ${drawnCount} Karten`);
            advanceTurn(1);
            return;
        }

        // Standard 1-card draw
        const drawn = drawFromDeck(1);
        const lastCard = drawn[0];
        await animateCardFly(dom.drawPile, targetEl, lastCard, player.isHuman, true);
        if (lastCard) player.hand.push(lastCard);
        player.calledUno = false;
        if (player.isHuman) sortHand(player.hand);

        if (player.isHuman && lastCard && isCardPlayable(lastCard)) {
            state.busy = false;
            renderAll();
            showToast('Gezogene Karte ist spielbar!');
            return;
        }

        showToast(`${player.name} zieht 1 Karte`);
        advanceTurn(1);
    }

    function advanceTurn(steps = 1) {
        const len = state.players.length;
        state.currentPlayer = (state.currentPlayer + state.direction * steps + len * 2) % len;
        state.busy = false;
        renderAll();

        if (!state.gameOver && !state.players[state.currentPlayer].isHuman) {
            scheduleAITurn();
        }
    }

    function scheduleAITurn() {
        state.busy = true;
        const aiIdx = state.currentPlayer;
        const ai = state.players[aiIdx];
        const playable = ai.hand.filter(isCardPlayable);
        const delay = UnoAI.getThinkDelay(playable.length, ai.hand.length, ai.profile);

        // Show subtle thinking bubble
        const bubbleEl = document.getElementById(`chat-${ai.seat}`);
        if (bubbleEl && !bubbleEl.classList.contains('show')) {
            bubbleEl.textContent = '🤔 …';
            bubbleEl.classList.add('show', 'thinking');
        }

        // Briefly twitch a card in the AI's hand right before playing
        const twitchTimer = setTimeout(() => {
            if (state.gameOver || state.currentPlayer !== aiIdx) return;
            const handEl = document.getElementById(`hand-${ai.seat}`);
            const cards = handEl ? handEl.querySelectorAll('.uno-card-mini') : [];
            if (cards.length > 0 && playable.length > 0) {
                const pick = cards[Math.floor(Math.random() * cards.length)];
                pick.classList.add('ai-card-pick');
            }
        }, Math.max(400, delay - 480));

        state.aiTimer = setTimeout(async () => {
            clearTimeout(twitchTimer);
            if (bubbleEl && bubbleEl.classList.contains('thinking')) {
                bubbleEl.classList.remove('show', 'thinking');
            }
            if (state.gameOver || state.currentPlayer !== aiIdx) return;
            const chosen = UnoAI.chooseCard(playable, ai.hand, state, state.difficulty, ai.profile);

            if (!chosen) {
                await handleDrawAction(aiIdx);
                return;
            }

            const goingToOne = ai.hand.length === 2;
            if (goingToOne && Math.random() < 0.85) {
                ai.calledUno = true;
                SoundFX.uno();
                showBotChat(ai.seat, UnoAI.randomLine(ai.profile, 'uno'));
                showToast(`${ai.name} ruft UNO!`);
            }

            const chosenColor = chosen.color === 'wild' ? UnoAI.pickBestColor(ai.hand) : chosen.color;
            const sourceEl = document.getElementById(`hand-${ai.seat}`);
            await executePlay(aiIdx, chosen, chosenColor, sourceEl, goingToOne);
        }, delay);
    }

    function calcHandPoints(hand) {
        return hand.reduce((sum, c) => {
            if (c.color === 'wild') return sum + 50;
            if (['skip', 'reverse', 'draw2'].includes(c.value)) return sum + 20;
            return sum + (parseInt(c.value, 10) || 0);
        }, 0);
    }

    function finishGame(winnerIdx) {
        state.gameOver = true;
        state.busy = false;
        clearTimeout(state.aiTimer);

        const winner = state.players[winnerIdx];
        const humanWon = winner.isHuman;
        saveStats(humanWon);

        if (humanWon) {
            SoundFX.win();
            spawnParticles(65, dom.discardPile);
        } else {
            SoundFX.lose();
        }

        // Tournament scoring: winner gets sum of all opponents' remaining card points
        const roundPoints = state.players.reduce((acc, p, idx) => idx === winnerIdx ? acc : acc + calcHandPoints(p.hand), 0);
        if (state.rules.tournament) {
            state.tournamentScores[winner.name] = (state.tournamentScores[winner.name] || 0) + roundPoints;
        }

        const tournamentOver = state.rules.tournament && state.tournamentScores[winner.name] >= 500;
        document.getElementById('gameover-icon').textContent = humanWon ? '🏆' : '🃏';
        document.getElementById('gameover-title').textContent = tournamentOver
            ? `${winner.name} gewinnt das Turnier!`
            : (humanWon ? 'Du hast gewonnen!' : `${winner.name} gewinnt!`);
        document.getElementById('gameover-desc').textContent = state.rules.tournament
            ? `+${roundPoints} Punkte für ${winner.name} (Ziel: 500 Pkt.)`
            : (humanWon ? 'Starke Runde! Alle Karten abgelegt.' : 'Knapp daneben — Revanche?');

        const board = document.getElementById('scoreboard');
        board.innerHTML = '';
        state.players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'score-row' + (idx === winnerIdx ? ' winner' : '');
            const info = state.rules.tournament
                ? `${state.tournamentScores[p.name] || 0} / 500 Pkt.`
                : `${p.hand.length} Karten (${calcHandPoints(p.hand)} Pkt.)`;
            row.innerHTML = `<span>${p.name}</span><span>${info}</span>`;
            board.appendChild(row);
        });

        document.getElementById('btn-play-again').textContent = (state.rules.tournament && !tournamentOver)
            ? 'Nächste Runde'
            : 'Nochmal spielen';
        dom.modalGameover.classList.remove('hidden');
    }

    // --- Event Listeners ---
    dom.drawPile.addEventListener('click', () => {
        if (state.busy || state.gameOver || state.currentPlayer !== 0) return;
        state.busy = true;
        handleDrawAction(0);
    });

    dom.btnUno.addEventListener('click', () => {
        const human = state.players[0];
        if (!human || dom.btnUno.disabled) return;
        human.calledUno = true;
        SoundFX.uno();
        spawnParticles(22, dom.btnUno);
        showToast('UNO gerufen! 🔥');
        renderAll();
    });

    dom.btnCatch.addEventListener('click', () => {
        if (state.catchablePlayerIdx === null) return;
        const target = state.players[state.catchablePlayerIdx];
        state.catchablePlayerIdx = null;
        SoundFX.penalty();
        target.hand.push(...drawFromDeck(2));
        showBotChat(target.seat, '😤 Mist, erwischt!');
        showToast(`${target.name} erwischt! +2 Strafkarten!`);
        renderAll();
    });

    dom.btnSort.addEventListener('click', () => {
        if (!state.players[0]) return;
        sortHand(state.players[0].hand);
        renderAll();
    });

    dom.btnSound.addEventListener('click', () => {
        dom.btnSound.textContent = SoundFX.toggle() ? '🔊' : '🔇';
    });

    dom.btnTheme.addEventListener('click', () => {
        const next = THEMES[(THEMES.indexOf(state.theme) + 1) % THEMES.length];
        applyTheme(next);
    });

    dom.btnMenu.addEventListener('click', () => dom.modalStart.classList.remove('hidden'));
    dom.btnRules.addEventListener('click', () => dom.modalRules.classList.remove('hidden'));
    document.getElementById('btn-close-rules').addEventListener('click', () => dom.modalRules.classList.add('hidden'));

    // Bluff-Check buttons
    document.getElementById('btn-bluff-challenge').addEventListener('click', () => {
        if (!state.pendingBluff) return;
        const { offenderIdx, wasBluff } = state.pendingBluff;
        state.pendingBluff = null;
        dom.modalBluff.classList.add('hidden');
        const offender = state.players[offenderIdx];

        if (wasBluff) {
            // Offender lied -> offender draws 4, human plays!
            state.drawStack = 0;
            state.drawStackType = null;
            offender.hand.push(...drawFromDeck(4));
            SoundFX.special();
            showBotChat(offender.seat, UnoAI.randomLine(offender.profile, 'caughtBluff'));
            showToast(`BLUFF ERWISCHT! ${offender.name} zieht +4 — du bist dran!`);
            state.busy = false;
            renderAll();
        } else {
            // Offender was honest -> human draws 6!
            state.drawStack = 0;
            state.drawStackType = null;
            state.players[0].hand.push(...drawFromDeck(6));
            sortHand(state.players[0].hand);
            SoundFX.penalty();
            triggerShake();
            showToast(`Kein Bluff! Du ziehst +6 Strafkarten!`);
            advanceTurn(1);
        }
    });

    document.getElementById('btn-bluff-accept').addEventListener('click', () => {
        state.pendingBluff = null;
        dom.modalBluff.classList.add('hidden');
        state.busy = false;
        renderAll();
    });

    // Settings controls
    document.querySelectorAll('#opt-opponents button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#opt-opponents button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.opponentCount = parseInt(btn.dataset.val, 10);
        });
    });

    document.querySelectorAll('#opt-difficulty button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#opt-difficulty button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.val;
        });
    });

    document.querySelectorAll('#opt-theme button').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.val));
    });

    document.getElementById('btn-start-game').addEventListener('click', () => {
        state.rules.stacking = document.getElementById('rule-stacking').checked;
        state.rules.unoPenalty = document.getElementById('rule-uno').checked;
        state.rules.sevenZero = document.getElementById('rule-seven-zero').checked;
        state.rules.jumpIn = document.getElementById('rule-jump-in').checked;
        state.rules.bluffCheck = document.getElementById('rule-bluff').checked;
        state.rules.drawUntil = document.getElementById('rule-draw-until').checked;
        state.rules.tournament = document.getElementById('rule-tournament').checked;
        startNewGame(true);
    });

    document.getElementById('btn-play-again').addEventListener('click', () => {
        const anyWonTournament = Object.values(state.tournamentScores).some(s => s >= 500);
        startNewGame(!state.rules.tournament || anyWonTournament);
    });

    document.getElementById('btn-back-menu').addEventListener('click', () => {
        dom.modalGameover.classList.add('hidden');
        dom.modalStart.classList.remove('hidden');
    });

    document.querySelectorAll('.color-choice').forEach(btn => {
        btn.addEventListener('click', async () => {
            if (!state.pendingWildCard) return;
            const chosenColor = btn.dataset.color;
            const { card, cardEl, goingToOne } = state.pendingWildCard;
            state.pendingWildCard = null;
            dom.modalColor.classList.add('hidden');
            await executePlay(0, card, chosenColor, cardEl, goingToOne);
        });
    });

    window.addEventListener('keydown', e => {
        if (state.gameOver || !dom.modalStart.classList.contains('hidden')) return;
        if (e.code === 'Space' && state.currentPlayer === 0 && !state.busy) {
            e.preventDefault();
            state.busy = true;
            handleDrawAction(0);
        } else if (e.key.toLowerCase() === 'u' && !dom.btnUno.disabled) {
            dom.btnUno.click();
        } else if (e.key.toLowerCase() === 's') {
            dom.btnSort.click();
        }
    });

    renderStats();
})();
