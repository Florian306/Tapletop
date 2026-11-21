// Monopoly Imperium Engine with AI, Building, Mortgages, Trading & Auto-Save
(() => {
    const SAVE_KEY = 'monopoly_imperium_save_v1';
    const DIE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const BOT_CONFIGS = [
        { name: 'Luna', token: '🦊', color: '#f97316' },
        { name: 'Max', token: '🤖', color: '#38bdf8' },
        { name: 'Kira', token: '🦉', color: '#c084fc' }
    ];

    let state = {
        players: [],
        properties: {}, // tileId -> { ownerId, houses: 0..5, mortgaged: false }
        currentPlayer: 0,
        jackpot: 0,
        hasRolled: false,
        doublesCount: 0,
        lastDice: [1, 1],
        botCount: 3,
        gameOver: false,
        logs: []
    };

    const dom = {
        board: document.getElementById('board'),
        turnInfo: document.getElementById('turn-info'),
        jackpotAmount: document.getElementById('jackpot-amount'),
        die1: document.getElementById('die-1'),
        die2: document.getElementById('die-2'),
        btnRoll: document.getElementById('btn-roll'),
        btnEndTurn: document.getElementById('btn-end-turn'),
        btnJailPay: document.getElementById('btn-jail-pay'),
        centerLog: document.getElementById('center-log'),
        playersList: document.getElementById('players-list'),
        myProperties: document.getElementById('my-properties'),
        eventLog: document.getElementById('event-log'),
        modalStart: document.getElementById('modal-start'),
        btnResumeSave: document.getElementById('btn-resume-save'),
        modalBuy: document.getElementById('modal-buy'),
        modalCard: document.getElementById('modal-card'),
        modalTrade: document.getElementById('modal-trade'),
        modalGameover: document.getElementById('modal-gameover')
    };

    let pendingBuyTile = null;
    let pendingCardResolve = null;

    function getGridPos(id) {
        if (id <= 10) return { row: 11, col: 11 - id };
        if (id <= 20) return { row: 11 - (id - 10), col: 1 };
        if (id <= 30) return { row: 1, col: 1 + (id - 20) };
        return { row: 1 + (id - 30), col: 11 };
    }

    function buildBoardDOM() {
        // Remove old tiles, keep board-center
        dom.board.querySelectorAll('.tile').forEach(t => t.remove());

        MONO_BOARD.forEach(tile => {
            const el = document.createElement('div');
            const isCorner = [0, 10, 20, 30].includes(tile.id);
            el.className = 'tile' + (isCorner ? ' corner' : '');
            el.id = `tile-${tile.id}`;
            const pos = getGridPos(tile.id);
            el.style.gridRow = pos.row;
            el.style.gridColumn = pos.col;

            let inner = '';
            if (tile.color && tile.type === 'street') {
                inner += `<div class="tile-bar" id="bar-${tile.id}" style="background:${tile.color}"></div>`;
            }
            inner += `<div class="tile-name">${tile.name}</div>`;
            if (tile.price) {
                inner += `<div class="tile-price">${tile.price} €</div>`;
            } else if (tile.amount) {
                inner += `<div class="tile-price">-${tile.amount} €</div>`;
            }
            inner += `<div class="tokens-layer" id="tokens-${tile.id}"></div>`;
            el.innerHTML = inner;
            dom.board.appendChild(el);
        });
    }

    function saveGame() {
        try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch {}
    }

    function loadGame() {
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) return false;
            const parsed = JSON.parse(raw);
            if (!parsed || !parsed.players || parsed.gameOver) return false;
            state = parsed;
            return true;
        } catch {
            return false;
        }
    }

    function log(msg) {
        dom.centerLog.textContent = msg;
        state.logs.unshift(msg);
        if (state.logs.length > 40) state.logs.pop();
        renderLogs();
    }

    function renderLogs() {
        dom.eventLog.innerHTML = state.logs.map(l => `<div>• ${l}</div>`).join('');
    }

    function startNewGame() {
        state = {
            players: [
                { id: 0, name: 'Du', token: '🎩', color: '#22c55e', money: 1500, pos: 0, inJail: false, jailTurns: 0, bankrupt: false, isHuman: true }
            ],
            properties: {},
            currentPlayer: 0,
            jackpot: 0,
            hasRolled: false,
            doublesCount: 0,
            lastDice: [1, 1],
            botCount: state.botCount,
            gameOver: false,
            logs: []
        };

        for (let i = 0; i < state.botCount; i++) {
            const cfg = BOT_CONFIGS[i];
            state.players.push({
                id: i + 1,
                name: cfg.name,
                token: cfg.token,
                color: cfg.color,
                money: 1500,
                pos: 0,
                inJail: false,
                jailTurns: 0,
                bankrupt: false,
                isHuman: false
            });
        }

        dom.modalStart.classList.add('hidden');
        dom.modalGameover.classList.add('hidden');
        log('Neue Partie gestartet! Alle starten mit 1.500 €.');
        saveGame();
        renderAll();
    }

    function ownsFullGroup(playerId, group) {
        const groupTiles = MONO_BOARD.filter(t => t.group === group);
        return groupTiles.every(t => state.properties[t.id]?.ownerId === playerId && !state.properties[t.id]?.mortgaged);
    }

    function calcRent(tile, diceSum) {
        const prop = state.properties[tile.id];
        if (!prop || prop.mortgaged) return 0;
        if (tile.type === 'railroad') {
            const ownedRails = MONO_BOARD.filter(t => t.type === 'railroad' && state.properties[t.id]?.ownerId === prop.ownerId && !state.properties[t.id]?.mortgaged).length;
            return tile.rent[Math.max(0, ownedRails - 1)];
        }
        if (tile.type === 'utility') {
            const ownedUtils = MONO_BOARD.filter(t => t.type === 'utility' && state.properties[t.id]?.ownerId === prop.ownerId && !state.properties[t.id]?.mortgaged).length;
            return diceSum * (ownedUtils >= 2 ? 10 : 4);
        }
        if (prop.houses > 0) return tile.rent[prop.houses];
        const base = tile.rent[0];
        return ownsFullGroup(prop.ownerId, tile.group) ? base * 2 : base;
    }

    function renderAll() {
        dom.jackpotAmount.textContent = `${state.jackpot} €`;
        dom.die1.textContent = DIE_FACES[state.lastDice[0] - 1];
        dom.die2.textContent = DIE_FACES[state.lastDice[1] - 1];

        const active = state.players[state.currentPlayer];
        dom.turnInfo.textContent = active ? `${active.token} ${active.name} ist dran` : '—';

        // Buttons for human
        const isHumanTurn = active && active.isHuman && !state.gameOver;
        dom.btnRoll.disabled = !isHumanTurn || state.hasRolled;
        dom.btnEndTurn.classList.toggle('hidden', !isHumanTurn || !state.hasRolled);
        dom.btnJailPay.classList.toggle('hidden', !isHumanTurn || !active.inJail || state.hasRolled || active.money < 50);

        // Players sidebar
        dom.playersList.innerHTML = '';
        state.players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'player-row' + (idx === state.currentPlayer ? ' active' : '') + (p.bankrupt ? ' bankrupt' : '');
            const jailTag = p.inJail ? ' 🔒' : '';
            row.innerHTML = `<span>${p.token} ${p.name}${jailTag}</span><strong>${p.money} €</strong>`;
            dom.playersList.appendChild(row);
        });

        // Board tokens, owners & houses
        MONO_BOARD.forEach(tile => {
            const tileEl = document.getElementById(`tile-${tile.id}`);
            const tokensEl = document.getElementById(`tokens-${tile.id}`);
            const barEl = document.getElementById(`bar-${tile.id}`);
            tokensEl.innerHTML = '';

            // Remove old owner dot
            const oldDot = tileEl.querySelector('.owner-dot');
            if (oldDot) oldDot.remove();

            const prop = state.properties[tile.id];
            tileEl.classList.toggle('mortgaged', Boolean(prop?.mortgaged));
            if (prop) {
                const owner = state.players[prop.ownerId];
                if (owner) {
                    const dot = document.createElement('div');
                    dot.className = 'owner-dot';
                    dot.style.background = owner.color;
                    tileEl.appendChild(dot);
                }
                if (barEl) {
                    barEl.textContent = prop.houses === 5 ? '🏨' : '🏠'.repeat(prop.houses || 0);
                }
            } else if (barEl) {
                barEl.textContent = '';
            }
        });

        state.players.forEach(p => {
            if (p.bankrupt) return;
            const tokensEl = document.getElementById(`tokens-${p.pos}`);
            if (tokensEl) {
                const span = document.createElement('span');
                span.className = 'token';
                span.textContent = p.token;
                tokensEl.appendChild(span);
            }
        });

        // Human owned properties list
        const myProps = MONO_BOARD.filter(t => state.properties[t.id]?.ownerId === 0);
        if (!myProps.length) {
            dom.myProperties.innerHTML = '<span class="muted">Noch keine Straßen gekauft.</span>';
        } else {
            dom.myProperties.innerHTML = '';
            myProps.forEach(tile => {
                const prop = state.properties[tile.id];
                const canBuild = isHumanTurn && tile.type === 'street' && !prop.mortgaged && ownsFullGroup(0, tile.group) && prop.houses < 5 && state.players[0].money >= tile.houseCost;
                const item = document.createElement('div');
                item.className = 'prop-item';
                const houseLabel = prop.houses === 5 ? ' 🏨' : (prop.houses > 0 ? ` 🏠×${prop.houses}` : '');
                item.innerHTML = `
                    <div class="prop-left">
                        <span class="prop-swatch" style="background:${tile.color || '#555'}"></span>
                        <span>${tile.name}${houseLabel}${prop.mortgaged ? ' (Hyp.)' : ''}</span>
                    </div>
                    <div class="prop-actions">
                        ${canBuild ? `<button class="prop-btn" data-build="${tile.id}">+${tile.houseCost}€</button>` : ''}
                        ${isHumanTurn && prop.houses === 0 ? `<button class="prop-btn mort" data-mort="${tile.id}">${prop.mortgaged ? 'Lösen' : 'Hyp.'}</button>` : ''}
                    </div>
                `;
                dom.myProperties.appendChild(item);
            });

            dom.myProperties.querySelectorAll('[data-build]').forEach(btn => {
                btn.addEventListener('click', () => buildHouse(0, parseInt(btn.dataset.build, 10)));
            });
            dom.myProperties.querySelectorAll('[data-mort]').forEach(btn => {
                btn.addEventListener('click', () => toggleMortgage(0, parseInt(btn.dataset.mort, 10)));
            });
        }

        renderLogs();
    }

    function buildHouse(playerId, tileId) {
        const player = state.players[playerId];
        const tile = MONO_BOARD[tileId];
        const prop = state.properties[tileId];
        if (!prop || prop.ownerId !== playerId || prop.houses >= 5 || player.money < tile.houseCost) return;
        player.money -= tile.houseCost;
        prop.houses += 1;
        MonoSound.buy();
        log(`${player.name} baut ${prop.houses === 5 ? 'ein Hotel' : 'ein Haus'} auf ${tile.name}!`);
        saveGame();
        renderAll();
    }

    function toggleMortgage(playerId, tileId) {
        const player = state.players[playerId];
        const tile = MONO_BOARD[tileId];
        const prop = state.properties[tileId];
        if (!prop || prop.ownerId !== playerId || prop.houses > 0) return;
        const half = Math.floor(tile.price / 2);
        if (!prop.mortgaged) {
            prop.mortgaged = true;
            player.money += half;
            log(`${player.name} nimmt ${half} € Hypothek auf ${tile.name} auf.`);
        } else {
            const cost = Math.ceil(half * 1.1);
            if (player.money < cost) return;
            prop.mortgaged = false;
            player.money -= cost;
            log(`${player.name} löst Hypothek auf ${tile.name} für ${cost} € ab.`);
        }
        MonoSound.money();
        saveGame();
        renderAll();
    }

    function chargePlayer(player, amount, recipientId = null) {
        player.money -= amount;
        if (recipientId !== null) {
            state.players[recipientId].money += amount;
        } else {
            state.jackpot += amount;
        }

        // Auto-mortgage if negative
        if (player.money < 0) {
            const owned = MONO_BOARD.filter(t => state.properties[t.id]?.ownerId === player.id && !state.properties[t.id]?.mortgaged);
            for (const t of owned) {
                if (player.money >= 0) break;
                state.properties[t.id].houses = 0;
                state.properties[t.id].mortgaged = true;
                player.money += Math.floor(t.price / 2);
                log(`${player.name} verpfändet ${t.name} gegen drohende Pleite.`);
            }
        }

        if (player.money < 0) {
            player.bankrupt = true;
            // Release properties
            Object.keys(state.properties).forEach(k => {
                if (state.properties[k].ownerId === player.id) delete state.properties[k];
            });
            log(`💀 ${player.name} ist BANKROTT und scheidet aus!`);
            checkVictory();
        }
    }

    function checkVictory() {
        const alive = state.players.filter(p => !p.bankrupt);
        if (alive.length <= 1) {
            state.gameOver = true;
            const winner = alive[0];
            MonoSound.win();
            document.getElementById('go-title').textContent = winner.isHuman ? 'Du hast das Imperium gewonnen!' : `${winner.name} gewinnt!`;
            document.getElementById('go-desc').textContent = `${winner.token} ${winner.name} bleibt mit ${winner.money} € als einziger übrig.`;
            dom.modalGameover.classList.remove('hidden');
            try { localStorage.removeItem(SAVE_KEY); } catch {}
        }
    }

    async function rollDice() {
        const player = state.players[state.currentPlayer];
        if (!player || state.gameOver) return;

        MonoSound.dice();
        dom.die1.classList.add('rolling');
        dom.die2.classList.add('rolling');
        await new Promise(r => setTimeout(r, 350));
        dom.die1.classList.remove('rolling');
        dom.die2.classList.remove('rolling');

        const d1 = 1 + Math.floor(Math.random() * 6);
        const d2 = 1 + Math.floor(Math.random() * 6);
        state.lastDice = [d1, d2];
        const sum = d1 + d2;
        const isDouble = d1 === d2;

        if (player.inJail) {
            if (isDouble) {
                player.inJail = false;
                player.jailTurns = 0;
                log(`${player.name} würfelt Pasch (${d1}+${d2}) und kommt aus dem Gefängnis!`);
            } else {
                player.jailTurns++;
                if (player.jailTurns >= 3) {
                    player.inJail = false;
                    player.jailTurns = 0;
                    chargePlayer(player, 50, null);
                    log(`${player.name} zahlt nach 3 Runden 50 € Kaution.`);
                } else {
                    log(`${player.name} würfelt ${d1}+${d2} und bleibt im Gefängnis.`);
                    state.hasRolled = true;
                    saveGame();
                    renderAll();
                    return;
                }
            }
        } else {
            if (isDouble) {
                state.doublesCount++;
                if (state.doublesCount >= 3) {
                    sendToJail(player);
                    state.hasRolled = true;
                    saveGame();
                    renderAll();
                    return;
                }
            } else {
                state.hasRolled = true;
            }
        }

        const oldPos = player.pos;
        player.pos = (player.pos + sum) % 40;
        if (player.pos < oldPos) {
            player.money += 200;
            MonoSound.money();
            log(`${player.name} zieht über LOS (+200 €).`);
        }

        renderAll();
        await handleLanding(player, sum);
        saveGame();
        renderAll();
    }

    function sendToJail(player) {
        player.pos = 10;
        player.inJail = true;
        player.jailTurns = 0;
        MonoSound.jail();
        log(`🚔 ${player.name} muss ins Gefängnis!`);
    }

    async function handleLanding(player, diceSum) {
        const tile = MONO_BOARD[player.pos];

        if (tile.type === 'gotojail') {
            sendToJail(player);
            state.hasRolled = true;
            return;
        }

        if (tile.type === 'parking') {
            if (state.jackpot > 0) {
                player.money += state.jackpot;
                MonoSound.money();
                log(`🎉 ${player.name} kassiert den Frei-Parken-Jackpot: +${state.jackpot} €!`);
                state.jackpot = 0;
            } else {
                log(`${player.name} ruht sich auf Frei Parken aus.`);
            }
            return;
        }

        if (tile.type === 'tax') {
            chargePlayer(player, tile.amount, null);
            log(`${player.name} zahlt ${tile.amount} € ${tile.name} (geht in den Jackpot).`);
            return;
        }

        if (tile.type === 'chance' || tile.type === 'community') {
            const deck = tile.type === 'chance' ? CHANCE_CARDS : COMMUNITY_CARDS;
            const card = deck[Math.floor(Math.random() * deck.length)];
            if (player.isHuman) {
                await showCardPopup(tile.type === 'chance' ? 'Ereignisfeld' : 'Gemeinschaftsfeld', card.text);
            } else {
                log(`${player.name} zieht Karte: "${card.text}"`);
            }
            await applyCardEffect(player, card, diceSum);
            return;
        }

        if (['street', 'railroad', 'utility'].includes(tile.type)) {
            const prop = state.properties[tile.id];
            if (!prop) {
                if (player.money >= tile.price) {
                    if (player.isHuman) {
                        openBuyModal(tile);
                    } else if (player.money - tile.price >= 140) {
                        player.money -= tile.price;
                        state.properties[tile.id] = { ownerId: player.id, houses: 0, mortgaged: false };
                        MonoSound.buy();
                        log(`${player.name} kauft ${tile.name} für ${tile.price} €.`);
                    }
                }
            } else if (prop.ownerId !== player.id && !prop.mortgaged) {
                const rent = calcRent(tile, diceSum);
                const owner = state.players[prop.ownerId];
                chargePlayer(player, rent, owner.id);
                MonoSound.money();
                log(`${player.name} zahlt ${rent} € Miete an ${owner.name} (${tile.name}).`);
            }
        }
    }

    function showCardPopup(title, text) {
        return new Promise(resolve => {
            document.getElementById('card-type-badge').textContent = title;
            document.getElementById('card-text').textContent = text;
            dom.modalCard.classList.remove('hidden');
            pendingCardResolve = resolve;
        });
    }

    async function applyCardEffect(player, card, diceSum) {
        if (card.action === 'money') {
            player.money += card.amount;
            MonoSound.money();
        } else if (card.action === 'tax') {
            chargePlayer(player, card.amount, null);
        } else if (card.action === 'jail') {
            sendToJail(player);
            state.hasRolled = true;
        } else if (card.action === 'move') {
            if (card.target < player.pos) player.money += 200;
            player.pos = card.target;
            await handleLanding(player, diceSum);
        } else if (card.action === 'back') {
            player.pos = (player.pos - card.steps + 40) % 40;
            await handleLanding(player, diceSum);
        }
    }

    function openBuyModal(tile) {
        pendingBuyTile = tile;
        document.getElementById('buy-color-bar').style.background = tile.color || '#334155';
        document.getElementById('buy-title').textContent = tile.name;
        document.getElementById('buy-details').textContent = `Kaufpreis: ${tile.price} € · Dein Guthaben: ${state.players[0].money} €`;
        dom.modalBuy.classList.remove('hidden');
    }

    function nextTurn() {
        if (state.gameOver) return;
        state.hasRolled = false;
        state.doublesCount = 0;

        let safety = 0;
        do {
            state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
            safety++;
        } while (state.players[state.currentPlayer].bankrupt && safety < 10);

        saveGame();
        renderAll();

        const active = state.players[state.currentPlayer];
        if (active && !active.isHuman) {
            runBotTurn(active);
        }
    }

    async function runBotTurn(bot) {
        await new Promise(r => setTimeout(r, 1100 + Math.random() * 700));
        if (state.gameOver || state.currentPlayer !== bot.id) return;

        if (bot.inJail && bot.money >= 250) {
            bot.inJail = false;
            bot.jailTurns = 0;
            chargePlayer(bot, 50, null);
            log(`${bot.name} zahlt 50 € Kaution.`);
            renderAll();
            await new Promise(r => setTimeout(r, 600));
        }

        await rollDice();
        if (state.gameOver || bot.bankrupt) return;

        // Bot building logic
        const botStreets = MONO_BOARD.filter(t => t.type === 'street' && state.properties[t.id]?.ownerId === bot.id);
        for (const t of botStreets) {
            const prop = state.properties[t.id];
            if (!prop.mortgaged && ownsFullGroup(bot.id, t.group) && prop.houses < 5 && bot.money - t.houseCost >= 250) {
                buildHouse(bot.id, t.id);
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (!state.hasRolled && !bot.inJail) {
            // Rolled a double -> roll again
            await runBotTurn(bot);
            return;
        }

        await new Promise(r => setTimeout(r, 850));
        nextTurn();
    }

    // --- Event Listeners ---
    dom.btnRoll.addEventListener('click', () => {
        if (state.currentPlayer !== 0 || state.hasRolled) return;
        rollDice();
    });

    dom.btnEndTurn.addEventListener('click', () => {
        if (state.currentPlayer !== 0 || !state.hasRolled) return;
        nextTurn();
    });

    dom.btnJailPay.addEventListener('click', () => {
        const p = state.players[0];
        if (!p.inJail || p.money < 50) return;
        p.inJail = false;
        p.jailTurns = 0;
        chargePlayer(p, 50, null);
        log('Du zahlst 50 € Kaution und bist frei!');
        saveGame();
        renderAll();
    });

    document.getElementById('btn-buy-yes').addEventListener('click', () => {
        if (!pendingBuyTile) return;
        const p = state.players[0];
        p.money -= pendingBuyTile.price;
        state.properties[pendingBuyTile.id] = { ownerId: 0, houses: 0, mortgaged: false };
        MonoSound.buy();
        log(`Du kaufst ${pendingBuyTile.name} für ${pendingBuyTile.price} €!`);
        pendingBuyTile = null;
        dom.modalBuy.classList.add('hidden');
        saveGame();
        renderAll();
    });

    document.getElementById('btn-buy-no').addEventListener('click', () => {
        pendingBuyTile = null;
        dom.modalBuy.classList.add('hidden');
    });

    document.getElementById('btn-card-ok').addEventListener('click', () => {
        dom.modalCard.classList.add('hidden');
        if (pendingCardResolve) {
            const r = pendingCardResolve;
            pendingCardResolve = null;
            r();
        }
    });

    // Trade Modal
    document.getElementById('btn-open-trade').addEventListener('click', () => {
        const select = document.getElementById('trade-prop-select');
        const botProps = MONO_BOARD.filter(t => state.properties[t.id] && state.properties[t.id].ownerId !== 0 && state.properties[t.id].houses === 0);
        if (!botProps.length) {
            log('Aktuell besitzt kein Bot eine handelbare Straße.');
            return;
        }
        select.innerHTML = botProps.map(t => {
            const owner = state.players[state.properties[t.id].ownerId];
            return `<option value="${t.id}">${t.name} (${owner.name} · Wert ${t.price} €)</option>`;
        }).join('');
        dom.modalTrade.classList.remove('hidden');
    });

    document.getElementById('btn-trade-close').addEventListener('click', () => dom.modalTrade.classList.add('hidden'));

    document.getElementById('btn-trade-send').addEventListener('click', () => {
        const tileId = parseInt(document.getElementById('trade-prop-select').value, 10);
        const offer = parseInt(document.getElementById('trade-offer').value, 10) || 0;
        const tile = MONO_BOARD[tileId];
        const prop = state.properties[tileId];
        const seller = state.players[prop.ownerId];
        const human = state.players[0];

        dom.modalTrade.classList.add('hidden');
        if (offer > human.money) {
            log('Du hast nicht genug Geld für dieses Angebot.');
            return;
        }

        const hasFull = ownsFullGroup(seller.id, tile.group);
        const minAccept = Math.floor(tile.price * (hasFull ? 2.2 : 1.3));
        if (offer >= minAccept) {
            human.money -= offer;
            seller.money += offer;
            prop.ownerId = 0;
            MonoSound.buy();
            log(`🤝 Deal! ${seller.name} verkauft dir ${tile.name} für ${offer} €!`);
        } else {
            log(`❌ ${seller.name} lehnt ${offer} € für ${tile.name} ab (zu wenig).`);
        }
        saveGame();
        renderAll();
    });

    document.querySelectorAll('#opt-bots button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#opt-bots button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.botCount = parseInt(btn.dataset.val, 10);
        });
    });

    document.getElementById('btn-start-new').addEventListener('click', startNewGame);
    document.getElementById('btn-go-new').addEventListener('click', startNewGame);
    document.getElementById('btn-new').addEventListener('click', () => dom.modalStart.classList.remove('hidden'));
    document.getElementById('btn-sound').addEventListener('click', e => {
        e.target.textContent = MonoSound.toggle() ? '🔊' : '🔇';
    });

    dom.btnResumeSave.addEventListener('click', () => {
        if (loadGame()) {
            dom.modalStart.classList.add('hidden');
            renderAll();
            log('Gespeicherte Partie fortgesetzt!');
            const active = state.players[state.currentPlayer];
            if (active && !active.isHuman) runBotTurn(active);
        }
    });

    // Init
    buildBoardDOM();
    if (loadGame()) {
        dom.btnResumeSave.classList.remove('hidden');
    }
})();
