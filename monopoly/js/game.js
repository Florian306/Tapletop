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
        debts: [], // { fromId, toId, amount }
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
        modalInspect: document.getElementById('modal-inspect'),
        modalAuction: document.getElementById('modal-auction'),
        modalCard: document.getElementById('modal-card'),
        modalPay: document.getElementById('modal-pay'),
        modalTrade: document.getElementById('modal-trade'),
        modalGameover: document.getElementById('modal-gameover')
    };

    let pendingBuyTile = null;
    let pendingCardResolve = null;
    let pendingPay = null;
    let activeAuction = null;

    function getDenomBreakdown(amount) {
        const denoms = [500, 100, 50, 20, 10, 5, 1];
        let rem = Math.max(0, amount);
        const map = {};
        for (const d of denoms) {
            map[d] = Math.floor(rem / d);
            rem -= map[d] * d;
        }
        return map;
    }

    function openPayModal(reason, dueAmount) {
        return new Promise(resolve => {
            const human = state.players[0];
            if (!human || human.money < dueAmount) {
                resolve(true);
                return;
            }
            const available = getDenomBreakdown(human.money);
            const selected = { 500: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 1: 0 };
            pendingPay = { due: dueAmount, available, selected, resolve };

            document.getElementById('pay-reason').textContent = reason;
            document.getElementById('pay-due').textContent = `${dueAmount} €`;
            renderPayModal();
            dom.modalPay.classList.remove('hidden');
        });
    }

    function renderPayModal() {
        if (!pendingPay) return;
        const { due, available, selected } = pendingPay;
        const denoms = [500, 100, 50, 20, 10, 5, 1];
        const given = denoms.reduce((s, d) => s + d * selected[d], 0);
        const change = Math.max(0, given - due);

        document.getElementById('pay-given').textContent = `${given} €`;
        document.getElementById('pay-change').textContent = `${change} €`;
        document.getElementById('btn-pay-confirm').disabled = given < due;

        const grid = document.getElementById('pay-bills-grid');
        grid.innerHTML = '';
        denoms.forEach(d => {
            const left = available[d] - selected[d];
            const btn = document.createElement('button');
            btn.className = `banknote bill-${d} pay-bill-btn`;
            btn.disabled = left <= 0;
            btn.innerHTML = `+${d} €<span class="bill-count">${left} übrig</span>`;
            btn.addEventListener('click', () => {
                if (available[d] - selected[d] > 0) {
                    selected[d]++;
                    MonoSound.money();
                    renderPayModal();
                }
            });
            grid.appendChild(btn);
        });
    }

    function getGridPos(id) {
        if (id <= 10) return { row: 11, col: 11 - id };
        if (id <= 20) return { row: 11 - (id - 10), col: 1 };
        if (id <= 30) return { row: 1, col: 1 + (id - 20) };
        return { row: 1 + (id - 30), col: 11 };
    }

    function getTileIcon(tile) {
        switch (tile.type) {
            case 'go':
                return `<svg viewBox="0 0 32 32"><path d="M26 16H8M8 16l7-7M8 16l7 7" stroke="#dc2626" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`;
            case 'jail':
                return `<svg viewBox="0 0 32 32"><rect x="4" y="4" width="24" height="24" rx="3" fill="#f97316" stroke="#1e293b" stroke-width="2"/><path d="M11 4v24M16 4v24M21 4v24" stroke="#1e293b" stroke-width="2.5"/></svg>`;
            case 'parking':
                return `<svg viewBox="0 0 32 32"><rect x="4" y="13" width="24" height="10" rx="3" fill="#dc2626"/><path d="M8 13l3-6h10l3 6" fill="#ef4444"/><circle cx="10" cy="24" r="3" fill="#1e293b"/><circle cx="22" cy="24" r="3" fill="#1e293b"/></svg>`;
            case 'gotojail':
                return `<svg viewBox="0 0 32 32"><circle cx="16" cy="14" r="8" fill="#2563eb"/><rect x="8" y="8" width="16" height="4" rx="2" fill="#1e3a8a"/><circle cx="16" cy="24" r="4" fill="#fbbf24"/></svg>`;
            case 'railroad':
                return `<svg viewBox="0 0 32 32"><rect x="7" y="6" width="18" height="16" rx="3" fill="#1e293b"/><rect x="10" y="9" width="12" height="6" rx="1" fill="#93c5fd"/><circle cx="11" cy="24" r="2.5" fill="#475569"/><circle cx="21" cy="24" r="2.5" fill="#475569"/></svg>`;
            case 'chance':
                return `<svg viewBox="0 0 32 32"><text x="16" y="25" text-anchor="middle" font-size="24" font-weight="900" fill="#ea580c">?</text></svg>`;
            case 'community':
                return `<svg viewBox="0 0 32 32"><rect x="5" y="10" width="22" height="15" rx="3" fill="#2563eb"/><path d="M5 15h22" stroke="#93c5fd" stroke-width="2.5"/><rect x="13" y="13" width="6" height="5" rx="1" fill="#fbbf24"/></svg>`;
            case 'tax':
                return `<svg viewBox="0 0 32 32"><polygon points="16,4 28,14 16,28 4,14" fill="#38bdf8" stroke="#0284c7" stroke-width="2"/></svg>`;
            case 'utility':
                return tile.id === 12
                    ? `<svg viewBox="0 0 32 32"><circle cx="16" cy="13" r="7" fill="#facc15" stroke="#ca8a04" stroke-width="2"/><rect x="13" y="21" width="6" height="5" rx="1" fill="#475569"/></svg>`
                    : `<svg viewBox="0 0 32 32"><path d="M16 4 C16 4 7 15 7 20 a9 9 0 0 0 18 0 C25 15 16 4 16 4 Z" fill="#0ea5e9" stroke="#0369a1" stroke-width="2"/></svg>`;
            default: return '';
        }
    }

    function getTileSide(id) {
        if (id > 0 && id < 10) return 'side-bottom';
        if (id > 10 && id < 20) return 'side-left';
        if (id > 20 && id < 30) return 'side-top';
        if (id > 30 && id < 40) return 'side-right';
        return 'corner';
    }

    function buildBoardDOM() {
        dom.board.querySelectorAll('.tile').forEach(t => t.remove());

        MONO_BOARD.forEach(tile => {
            const el = document.createElement('div');
            const side = getTileSide(tile.id);
            el.className = `tile ${side}`;
            el.id = `tile-${tile.id}`;
            const pos = getGridPos(tile.id);
            el.style.gridRow = pos.row;
            el.style.gridColumn = pos.col;

            const icon = getTileIcon(tile);
            let inner = '';
            if (tile.color && tile.type === 'street') {
                inner += `<div class="tile-bar" id="bar-${tile.id}" style="background:${tile.color}"></div>`;
            }
            inner += `<div class="tile-content">`;
            if (icon) inner += `<div class="tile-icon">${icon}</div>`;
            inner += `<div class="tile-name">${tile.name}</div>`;
            if (tile.price) inner += `<div class="tile-price">${tile.price} €</div>`;
            else if (tile.amount) inner += `<div class="tile-price">-${tile.amount} €</div>`;
            inner += `</div><div class="tokens-layer" id="tokens-${tile.id}"></div>`;
            el.innerHTML = inner;
            if (['street', 'railroad', 'utility'].includes(tile.type)) {
                el.classList.add('clickable-tile');
                el.addEventListener('click', () => openInspectModal(tile.id));
            }
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
            debts: [],
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

        // Players sidebar & authentic banknotes
        if (state.players[0]) renderBanknotes(state.players[0].money);
        dom.playersList.innerHTML = '';
        state.players.forEach((p, idx) => {
            const row = document.createElement('div');
            row.className = 'player-row' + (idx === state.currentPlayer ? ' active' : '') + (p.bankrupt ? ' bankrupt' : '');
            const jailTag = p.inJail ? ' 🔒' : '';
            const totalDebt = (state.debts || []).filter(d => d.fromId === p.id).reduce((s, d) => s + d.amount, 0);
            const debtTag = totalDebt > 0 ? `<span class="debt-badge">-${totalDebt} €</span>` : '';
            row.innerHTML = `<span>${p.token} ${p.name}${jailTag}${debtTag}</span><strong>${p.money} €</strong>`;
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
                span.className = 'token' + (p.isHuman ? ' token-self' : '') + (p._hopping ? ' hopping' : '');
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
                    <div class="prop-left clickable-prop" data-inspect="${tile.id}">
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
            dom.myProperties.querySelectorAll('[data-inspect]').forEach(el => {
                el.addEventListener('click', () => openInspectModal(parseInt(el.dataset.inspect, 10)));
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

    function settleDebtsFor(player) {
        if (!state.debts || !state.debts.length || player.money <= 0) return;
        for (let i = state.debts.length - 1; i >= 0; i--) {
            const d = state.debts[i];
            if (d.fromId !== player.id) continue;
            const pay = Math.min(player.money, d.amount);
            if (pay <= 0) break;
            player.money -= pay;
            state.players[d.toId].money += pay;
            d.amount -= pay;
            log(`💳 ${player.name} zahlt ${pay} € Schulden an ${state.players[d.toId].name} zurück.`);
            if (d.amount <= 0) state.debts.splice(i, 1);
        }
    }

    function chargePlayer(player, amount, recipientId = null) {
        if (!state.debts) state.debts = [];

        // Allow taking debt from another player if cash isn't enough
        if (recipientId !== null && player.money < amount) {
            const cashPaid = Math.max(0, player.money);
            const debtAdded = amount - cashPaid;
            player.money -= cashPaid;
            state.players[recipientId].money += cashPaid;

            const existing = state.debts.find(d => d.fromId === player.id && d.toId === recipientId);
            if (existing) existing.amount += debtAdded;
            else state.debts.push({ fromId: player.id, toId: recipientId, amount: debtAdded });

            log(`💳 ${player.name} macht ${debtAdded} € Schulden bei ${state.players[recipientId].name}!`);

            const totalDebt = state.debts.filter(d => d.fromId === player.id).reduce((s, d) => s + d.amount, 0);
            if (totalDebt <= 600) return;
        } else {
            player.money -= amount;
            if (recipientId !== null) {
                state.players[recipientId].money += amount;
                settleDebtsFor(state.players[recipientId]);
            } else {
                state.jackpot += amount;
            }
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
            Object.keys(state.properties).forEach(k => {
                if (state.properties[k].ownerId === player.id) delete state.properties[k];
            });
            state.debts = state.debts.filter(d => d.fromId !== player.id && d.toId !== player.id);
            log(`💀 ${player.name} ist BANKROTT und scheidet aus!`);
            checkVictory();
        }
    }

    async function movePlayerStepByStep(player, steps) {
        const dir = steps >= 0 ? 1 : -1;
        const count = Math.abs(steps);
        for (let i = 0; i < count; i++) {
            player.pos = (player.pos + dir + 40) % 40;
            player._hopping = true;
            MonoSound.step();
            if (dir === 1 && player.pos === 0) {
                player.money += 200;
                MonoSound.money();
                log(`${player.name} zieht über LOS (+200 €).`);
                settleDebtsFor(player);
            }
            renderAll();
            await new Promise(r => setTimeout(r, 155));
            player._hopping = false;
        }
        renderAll();
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

        await movePlayerStepByStep(player, sum);
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
            if (player.isHuman && player.money >= tile.amount) {
                await openPayModal(`${tile.name} an die Bank`, tile.amount);
            }
            chargePlayer(player, tile.amount, null);
            log(`${player.name} zahlt ${tile.amount} € ${tile.name} (geht in den Jackpot).`);
            return;
        }

        if (tile.type === 'chance' || tile.type === 'community') {
            const deck = tile.type === 'chance' ? CHANCE_CARDS : COMMUNITY_CARDS;
            const card = deck[Math.floor(Math.random() * deck.length)];
            if (player.isHuman) {
                await showCardPopup(tile.type, card.text);
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
                if (player.isHuman && player.money >= rent) {
                    await openPayModal(`Miete für ${tile.name} an ${owner.name}`, rent);
                }
                chargePlayer(player, rent, owner.id);
                MonoSound.money();
                log(`${player.name} zahlt ${rent} € Miete an ${owner.name} (${tile.name}).`);
            }
        }
    }

    function showCardPopup(cardType, text) {
        return new Promise(resolve => {
            const box = document.getElementById('event-card-box');
            const isChance = cardType === 'chance';
            box.className = `modal-card monopoly-event-card ${isChance ? 'card-chance' : 'card-community'}`;
            document.getElementById('card-icon').textContent = isChance ? '❓' : '📦';
            document.getElementById('card-type-badge').textContent = isChance ? 'EREIGNISFELD' : 'GEMEINSCHAFTSFELD';
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

    function renderBanknotes(amount) {
        const tray = document.getElementById('bill-tray');
        const totalEl = document.getElementById('wallet-total');
        if (!tray || !totalEl) return;
        totalEl.textContent = `${amount.toLocaleString('de-DE')} €`;
        const denoms = [500, 100, 50, 20, 10, 5, 1];
        let rem = Math.max(0, amount);
        const bills = [];
        for (const d of denoms) {
            const cnt = Math.floor(rem / d);
            if (cnt > 0) {
                bills.push({ d, cnt });
                rem -= cnt * d;
            }
        }
        tray.innerHTML = bills.length
            ? bills.map(b => `<div class="banknote bill-${b.d}">${b.d} €<span class="bill-count">×${b.cnt}</span></div>`).join('')
            : '<span class="muted">Kein Bargeld</span>';
    }

    function buildDeedDetailsHTML(tile) {
        if (tile.type === 'street') {
            return `
                <div class="deed-row"><span>Miete (unbebaut)</span><strong>${tile.rent[0]} €</strong></div>
                <div class="deed-row"><span>Mit 1 Haus</span><strong>${tile.rent[1]} €</strong></div>
                <div class="deed-row"><span>Mit 2 Häusern</span><strong>${tile.rent[2]} €</strong></div>
                <div class="deed-row"><span>Mit 3 Häusern</span><strong>${tile.rent[3]} €</strong></div>
                <div class="deed-row"><span>Mit 4 Häusern</span><strong>${tile.rent[4]} €</strong></div>
                <div class="deed-row"><span>Mit Hotel 🏨</span><strong>${tile.rent[5]} €</strong></div>
                <div class="deed-row"><span>Hauspreis</span><strong>${tile.houseCost} €</strong></div>
                <div class="deed-row"><span>Hypothekenwert</span><strong>${Math.floor(tile.price / 2)} €</strong></div>
            `;
        }
        if (tile.type === 'railroad') {
            return `
                <div class="deed-row"><span>1 Bahnhof</span><strong>25 €</strong></div>
                <div class="deed-row"><span>2 Bahnhöfe</span><strong>50 €</strong></div>
                <div class="deed-row"><span>3 Bahnhöfe</span><strong>100 €</strong></div>
                <div class="deed-row"><span>4 Bahnhöfe</span><strong>200 €</strong></div>
                <div class="deed-row"><span>Hypothekenwert</span><strong>100 €</strong></div>
            `;
        }
        return `<div class="deed-row"><span>1 Werk</span><strong>4× Würfelzahl</strong></div>
                <div class="deed-row"><span>2 Werke</span><strong>10× Würfelzahl</strong></div>
                <div class="deed-row"><span>Hypothekenwert</span><strong>75 €</strong></div>`;
    }

    function openInspectModal(tileId) {
        const tile = MONO_BOARD[tileId];
        if (!tile) return;
        const prop = state.properties[tileId];
        const owner = prop ? state.players[prop.ownerId] : null;

        document.getElementById('inspect-color-bar').style.background = tile.color || '#334155';
        document.getElementById('inspect-owner-label').textContent = owner
            ? `BESITZER: ${owner.token} ${owner.name.toUpperCase()}${prop.mortgaged ? ' (HYPOTHEK)' : ''}`
            : `ZU VERKAUFEN · ${tile.price} €`;
        document.getElementById('inspect-title').textContent = tile.name;
        document.getElementById('inspect-details').innerHTML = buildDeedDetailsHTML(tile);
        dom.modalInspect.classList.remove('hidden');
    }

    function startAuction(tile) {
        const participants = state.players.filter(p => !p.bankrupt).map(p => ({
            id: p.id,
            passed: false,
            maxBid: p.isHuman ? Infinity : Math.min(p.money - 80, Math.floor(tile.price * (0.75 + Math.random() * 0.5)))
        }));
        activeAuction = { tile, bid: 10, leaderId: null, participants };
        document.getElementById('auction-title').textContent = `${tile.name} (Wert: ${tile.price} €)`;
        dom.modalAuction.classList.remove('hidden');
        renderAuction();
        setTimeout(runBotAuctionBids, 700);
    }

    function renderAuction() {
        if (!activeAuction) return;
        const leader = activeAuction.leaderId !== null ? state.players[activeAuction.leaderId] : null;
        document.getElementById('auction-bid').textContent = `${activeAuction.bid} €`;
        document.getElementById('auction-leader').textContent = leader ? `${leader.token} ${leader.name}` : 'Niemand';
        document.getElementById('auction-wallet').textContent = `${state.players[0].money} €`;
        const humanPart = activeAuction.participants.find(p => p.id === 0);
        document.querySelectorAll('[data-bid-inc]').forEach(btn => {
            const inc = parseInt(btn.dataset.bidInc, 10);
            btn.disabled = !humanPart || humanPart.passed || state.players[0].money < activeAuction.bid + inc;
        });
    }

    function runBotAuctionBids() {
        if (!activeAuction) return;
        let someoneBid = false;
        for (const p of activeAuction.participants) {
            if (p.id === 0 || p.passed || p.id === activeAuction.leaderId) continue;
            const nextBid = activeAuction.bid + 10;
            if (nextBid <= p.maxBid && state.players[p.id].money >= nextBid) {
                activeAuction.bid = nextBid;
                activeAuction.leaderId = p.id;
                someoneBid = true;
                document.getElementById('auction-status').textContent = `${state.players[p.id].name} bietet ${nextBid} €!`;
                MonoSound.money();
                break;
            } else {
                p.passed = true;
            }
        }
        renderAuction();
        const remaining = activeAuction.participants.filter(p => !p.passed);
        if (remaining.length <= 1 && activeAuction.leaderId !== null) {
            finishAuction();
        } else if (someoneBid) {
            setTimeout(runBotAuctionBids, 750);
        } else if (activeAuction.participants.find(p => p.id === 0)?.passed) {
            finishAuction();
        }
    }

    async function finishAuction() {
        if (!activeAuction) return;
        const { tile, bid, leaderId } = activeAuction;
        activeAuction = null;
        dom.modalAuction.classList.add('hidden');

        if (leaderId === null) {
            log(`🔨 Niemand hat auf ${tile.name} geboten.`);
            return;
        }
        const winner = state.players[leaderId];
        if (winner.isHuman) {
            await openPayModal(`Auktions-Zuschlag für ${tile.name}`, bid);
        }
        winner.money -= bid;
        state.properties[tile.id] = { ownerId: winner.id, houses: 0, mortgaged: false };
        MonoSound.buy();
        log(`🔨 Versteigert! ${winner.name} ersteigert ${tile.name} für ${bid} €!`);
        saveGame();
        renderAll();
    }

    function openBuyModal(tile) {
        pendingBuyTile = tile;
        document.getElementById('buy-color-bar').style.background = tile.color || '#334155';
        document.getElementById('buy-title').textContent = tile.name;
        document.getElementById('buy-details').innerHTML = buildDeedDetailsHTML(tile) + `<div class="deed-price-tag">Kaufpreis: ${tile.price} €</div>`;
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

    document.getElementById('btn-buy-yes').addEventListener('click', async () => {
        if (!pendingBuyTile) return;
        const tile = pendingBuyTile;
        pendingBuyTile = null;
        dom.modalBuy.classList.add('hidden');

        await openPayModal(`Kaufpreis für ${tile.name}`, tile.price);
        const p = state.players[0];
        p.money -= tile.price;
        state.properties[tile.id] = { ownerId: 0, houses: 0, mortgaged: false };
        MonoSound.buy();
        log(`Du kaufst ${tile.name} für ${tile.price} €!`);
        saveGame();
        renderAll();
    });

    document.getElementById('btn-pay-reset').addEventListener('click', () => {
        if (!pendingPay) return;
        Object.keys(pendingPay.selected).forEach(k => { pendingPay.selected[k] = 0; });
        renderPayModal();
    });

    document.getElementById('btn-pay-exact').addEventListener('click', () => {
        if (!pendingPay) return;
        const { due, available, selected } = pendingPay;
        Object.keys(selected).forEach(k => { selected[k] = 0; });
        const denoms = [500, 100, 50, 20, 10, 5, 1];
        let rem = due;
        for (const d of denoms) {
            const take = Math.min(available[d], Math.floor(rem / d));
            selected[d] = take;
            rem -= take * d;
        }
        if (rem > 0) {
            // Pick smallest available bill to cover remainder (bank gives change)
            for (const d of [...denoms].reverse()) {
                if (available[d] - selected[d] > 0) {
                    selected[d]++;
                    break;
                }
            }
        }
        renderPayModal();
    });

    document.getElementById('btn-pay-confirm').addEventListener('click', () => {
        if (!pendingPay) return;
        const resolve = pendingPay.resolve;
        pendingPay = null;
        dom.modalPay.classList.add('hidden');
        MonoSound.buy();
        resolve(true);
    });

    document.getElementById('btn-buy-no').addEventListener('click', () => {
        const tile = pendingBuyTile;
        pendingBuyTile = null;
        dom.modalBuy.classList.add('hidden');
        if (tile) startAuction(tile);
    });

    document.getElementById('btn-inspect-close').addEventListener('click', () => {
        dom.modalInspect.classList.add('hidden');
    });

    document.querySelectorAll('[data-bid-inc]').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!activeAuction) return;
            const inc = parseInt(btn.dataset.bidInc, 10);
            const nextBid = activeAuction.bid + inc;
            if (state.players[0].money < nextBid) return;
            activeAuction.bid = nextBid;
            activeAuction.leaderId = 0;
            document.getElementById('auction-status').textContent = `Du bietest ${nextBid} €!`;
            MonoSound.money();
            renderAuction();
            setTimeout(runBotAuctionBids, 650);
        });
    });

    document.getElementById('btn-auction-pass').addEventListener('click', () => {
        if (!activeAuction) return;
        const humanPart = activeAuction.participants.find(p => p.id === 0);
        if (humanPart) humanPart.passed = true;
        renderAuction();
        setTimeout(runBotAuctionBids, 400);
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
