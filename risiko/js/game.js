// RISIKO — Global Domination Engine (Reinforce, Attack, Fortify, Capitals, Missions, Cards, Auto-Save)
(() => {
    const SAVE_KEY = 'risiko_domination_save_v1';
    const CARD_TYPES = ['🪖', '🐴', '💣'];
    const BOT_FACTIONS = [
        { name: 'General Luna', color: '#f97316', avatar: '🦊' },
        { name: 'Marshal Max', color: '#38bdf8', avatar: '🤖' },
        { name: 'Kommandant Kira', color: '#c084fc', avatar: '🦉' },
        { name: 'Admiral Rex', color: '#eab308', avatar: '🦖' }
    ];

    let state = {
        players: [],
        board: {}, // id -> { ownerId, troops, isCapital }
        currentPlayer: 0,
        phase: 'reinforce', // 'reinforce' | 'attack' | 'fortify'
        reinforcements: 0,
        selectedId: null,
        conqueredThisTurn: false,
        tradeCount: 0,
        mode: 'world', // 'world' | 'mission'
        botCount: 3,
        gameOver: false,
        logs: []
    };

    const dom = {
        seaRoutes: document.getElementById('sea-routes'),
        territoriesLayer: document.getElementById('territories-layer'),
        labelsLayer: document.getElementById('labels-layer'),
        fxLayer: document.getElementById('fx-svg-layer'),
        phasePill: document.getElementById('phase-pill'),
        turnPill: document.getElementById('turn-pill'),
        instructionText: document.getElementById('instruction-text'),
        reinforceBadge: document.getElementById('reinforce-badge'),
        btnNextPhase: document.getElementById('btn-next-phase'),
        cardCount: document.getElementById('card-count'),
        playersList: document.getElementById('players-list'),
        continentsList: document.getElementById('continents-list'),
        battleLog: document.getElementById('battle-log'),
        modalStart: document.getElementById('modal-start'),
        btnResume: document.getElementById('btn-resume'),
        modalCombat: document.getElementById('modal-combat'),
        modalMove: document.getElementById('modal-move'),
        modalCards: document.getElementById('modal-cards'),
        modalInfo: document.getElementById('modal-info')
    };

    let activeCombat = null;
    let pendingMove = null;

    function log(msg) {
        state.logs.unshift(msg);
        if (state.logs.length > 45) state.logs.pop();
        dom.battleLog.innerHTML = state.logs.map(l => `<div>• ${l}</div>`).join('');
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

    function getTerr(id) {
        return RISK_TERRITORIES.find(t => t.id === id);
    }

    function calcReinforcements(pid) {
        const count = Object.values(state.board).filter(b => b.ownerId === pid).length;
        let bonus = Math.max(3, Math.floor(count / 3));
        for (const [cid, cinfo] of Object.entries(RISK_CONTINENTS)) {
            if (ownsCont(state, pid, cid)) bonus += cinfo.bonus;
        }
        return bonus;
    }

    function startNewGame() {
        state.players = [
            { id: 0, name: 'Du', color: '#22c55e', avatar: '🎩', isHuman: true, cards: [], eliminated: false, missionId: null }
        ];
        for (let i = 0; i < state.botCount; i++) {
            const f = BOT_FACTIONS[i];
            state.players.push({ id: i + 1, name: f.name, color: f.color, avatar: f.avatar, isHuman: false, cards: [], eliminated: false, missionId: null });
        }

        // Assign secret missions
        const shuffledMissions = [...RISK_MISSIONS].sort(() => Math.random() - 0.5);
        state.players.forEach((p, idx) => { p.missionId = shuffledMissions[idx % shuffledMissions.length].id; });

        // Distribute all 28 territories fairly
        const shuffledTerr = [...RISK_TERRITORIES].sort(() => Math.random() - 0.5);
        state.board = {};
        shuffledTerr.forEach((t, idx) => {
            const ownerId = idx % state.players.length;
            state.board[t.id] = { ownerId, troops: 2, isCapital: false };
        });

        // Assign 1 Capital per player (+2 starting troops)
        state.players.forEach(p => {
            const firstOwned = RISK_TERRITORIES.find(t => state.board[t.id].ownerId === p.id);
            if (firstOwned) {
                state.board[firstOwned.id].isCapital = true;
                state.board[firstOwned.id].troops += 2;
            }
        });

        state.currentPlayer = 0;
        state.phase = 'reinforce';
        state.reinforcements = calcReinforcements(0);
        state.selectedId = null;
        state.conqueredThisTurn = false;
        state.tradeCount = 0;
        state.gameOver = false;
        state.logs = [];

        dom.modalStart.classList.add('hidden');
        log('⚔️ Neue Kampagne gestartet! Verteile deine Start-Verstärkung.');
        saveGame();
        renderAll();
    }

    function fireArtilleryFX(fromId, toId) {
        const a = getTerr(fromId);
        const b = getTerr(toId);
        if (!a || !b) return;
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', a.x);
        line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x);
        line.setAttribute('y2', b.y);
        line.setAttribute('stroke', '#facc15');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('stroke-dasharray', '8 6');
        dom.fxLayer.appendChild(line);

        const boom = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        boom.setAttribute('cx', b.x);
        boom.setAttribute('cy', b.y);
        boom.setAttribute('r', '18');
        boom.setAttribute('fill', '#ef4444');
        boom.setAttribute('opacity', '0.85');
        dom.fxLayer.appendChild(boom);

        setTimeout(() => { line.remove(); boom.remove(); }, 420);
    }

    function renderMap() {
        // Sea routes once
        if (!dom.seaRoutes.childNodes.length) {
            SEA_ROUTES.forEach(([aId, bId]) => {
                const a = getTerr(aId), b = getTerr(bId);
                if (!a || !b) return;
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
                line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
                line.setAttribute('class', 'sea-line');
                dom.seaRoutes.appendChild(line);
            });
        }

        dom.territoriesLayer.innerHTML = '';
        dom.labelsLayer.innerHTML = '';
        const selTerr = state.selectedId ? getTerr(state.selectedId) : null;

        RISK_TERRITORIES.forEach(t => {
            const cell = state.board[t.id];
            const owner = state.players[cell.ownerId];
            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            let cls = 'territory-path';
            if (state.selectedId === t.id) cls += ' selected';
            else if (selTerr && state.phase === 'attack' && selTerr.adj.includes(t.id) && cell.ownerId !== 0) cls += ' target-valid';
            else if (selTerr && state.phase === 'fortify' && cell.ownerId === 0 && isConnectedOwned(selTerr.id, t.id, 0)) cls += ' fortify-valid';

            const paths = (window.RISK_GEO.loaded && window.RISK_GEO.byTerritory[t.id]?.length)
                ? window.RISK_GEO.byTerritory[t.id]
                : (t.d ? [t.d] : []);

            paths.forEach(dStr => {
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', dStr);
                path.setAttribute('fill', owner.color);
                path.setAttribute('fill-opacity', '0.84');
                path.setAttribute('class', cls);
                path.addEventListener('click', e => handleTerritoryClick(t.id, e));
                g.appendChild(path);
            });
            dom.territoriesLayer.appendChild(g);

            // Render clickable troop medallion & crisp label in top layer
            if (isFinite(t.x) && isFinite(t.y)) {
                const lg = document.createElementNS('http://www.w3.org/2000/svg', 'g');
                lg.setAttribute('class', 'troop-badge-group');
                lg.addEventListener('click', e => handleTerritoryClick(t.id, e));

                const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                label.setAttribute('x', t.x);
                label.setAttribute('y', t.y - 15);
                label.setAttribute('class', 'territory-label');
                label.textContent = (cell.isCapital ? '🏰 ' : '') + t.name;
                lg.appendChild(label);

                const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
                circle.setAttribute('cx', t.x);
                circle.setAttribute('cy', t.y + 4);
                circle.setAttribute('r', '12.5');
                circle.setAttribute('fill', '#09131c');
                circle.setAttribute('stroke', state.selectedId === t.id ? '#fde047' : owner.color);
                circle.setAttribute('class', 'troop-circle' + (cell.isCapital ? ' is-capital' : ''));
                lg.appendChild(circle);

                const txt = document.createElementNS('http://www.w3.org/2000/svg', 'text');
                txt.setAttribute('x', t.x);
                txt.setAttribute('y', t.y + 4);
                txt.setAttribute('class', 'troop-text');
                txt.textContent = cell.troops;
                lg.appendChild(txt);

                dom.labelsLayer.appendChild(lg);
            }
        });
    }

    function renderAll() {
        renderMap();
        const active = state.players[state.currentPlayer];
        const humanTurn = state.currentPlayer === 0 && !state.gameOver;

        const phaseLabels = { reinforce: '1. Verstärkung', attack: '2. Angriff', fortify: '3. Verlegen' };
        dom.phasePill.textContent = `Phase: ${phaseLabels[state.phase]}`;
        dom.turnPill.textContent = active ? `${active.avatar} ${active.name}` : '—';
        dom.cardCount.textContent = state.players[0]?.cards.length || 0;

        dom.reinforceBadge.classList.toggle('hidden', !(humanTurn && state.phase === 'reinforce' && state.reinforcements > 0));
        dom.reinforceBadge.textContent = `+${state.reinforcements} Truppen verfügbar`;

        if (!humanTurn) {
            dom.instructionText.textContent = `${active.name} plant seinen Zug...`;
            dom.btnNextPhase.disabled = true;
        } else if (state.phase === 'reinforce') {
            dom.instructionText.textContent = state.reinforcements > 0
                ? 'Klicke eigene Gebiete für +1 Truppe (Shift+Klick für +5).'
                : 'Alle Truppen verteilt! Weiter zum Angriff.';
            dom.btnNextPhase.textContent = 'Weiter → Angriff';
            dom.btnNextPhase.disabled = state.reinforcements > 0;
        } else if (state.phase === 'attack') {
            dom.instructionText.textContent = state.selectedId
                ? 'Klicke ein rot markiertes Nachbargebiet zum Angreifen!'
                : 'Wähle ein eigenes Gebiet (>1 Truppe) für einen Angriff.';
            dom.btnNextPhase.textContent = 'Weiter → Verlegen';
            dom.btnNextPhase.disabled = false;
        } else {
            dom.instructionText.textContent = state.selectedId
                ? 'Klicke ein blau markiertes verbundenes Gebiet zum Verlegen.'
                : 'Optional: Wähle ein eigenes Gebiet zum Verlegen oder beende den Zug.';
            dom.btnNextPhase.textContent = 'Zug beenden ✓';
            dom.btnNextPhase.disabled = false;
        }

        // Players sidebar
        dom.playersList.innerHTML = state.players.map((p, idx) => {
            const terrs = Object.values(state.board).filter(b => b.ownerId === p.id);
            const troops = terrs.reduce((s, b) => s + b.troops, 0);
            return `<div class="player-row ${idx === state.currentPlayer ? 'active' : ''} ${p.eliminated ? 'eliminated' : ''}">
                <span style="color:${p.color};font-weight:800;">${p.avatar} ${p.name}</span>
                <span>${terrs.length} Geb. · ${troops} 🪖</span>
            </div>`;
        }).join('');

        // Continents sidebar
        dom.continentsList.innerHTML = Object.entries(RISK_CONTINENTS).map(([cid, c]) => {
            const owner = state.players.find(p => ownsCont(state, p.id, cid));
            return `<div class="cont-row">
                <span style="color:${c.color};font-weight:700;">${c.name} (+${c.bonus})</span>
                <span>${owner ? owner.avatar : '—'}</span>
            </div>`;
        }).join('');

        dom.battleLog.innerHTML = state.logs.map(l => `<div>• ${l}</div>`).join('');
    }

    function isConnectedOwned(startId, targetId, pid) {
        if (startId === targetId) return false;
        const visited = new Set([startId]);
        const queue = [startId];
        while (queue.length) {
            const cur = queue.shift();
            if (cur === targetId) return true;
            for (const nxt of getTerr(cur).adj) {
                if (!visited.has(nxt) && state.board[nxt].ownerId === pid) {
                    visited.add(nxt);
                    queue.push(nxt);
                }
            }
        }
        return false;
    }

    function handleTerritoryClick(id, event) {
        if (state.currentPlayer !== 0 || state.gameOver) return;
        const cell = state.board[id];

        if (state.phase === 'reinforce') {
            if (cell.ownerId !== 0 || state.reinforcements <= 0) return;
            const add = event.shiftKey ? Math.min(5, state.reinforcements) : 1;
            cell.troops += add;
            state.reinforcements -= add;
            RiskSound.deploy();
            saveGame();
            renderAll();
            return;
        }

        if (state.phase === 'attack') {
            if (cell.ownerId === 0) {
                state.selectedId = cell.troops > 1 ? id : null;
                renderAll();
            } else if (state.selectedId && getTerr(state.selectedId).adj.includes(id)) {
                openCombatModal(state.selectedId, id);
            }
            return;
        }

        if (state.phase === 'fortify') {
            if (cell.ownerId !== 0) return;
            if (!state.selectedId) {
                if (cell.troops > 1) state.selectedId = id;
                renderAll();
            } else if (state.selectedId === id) {
                state.selectedId = null;
                renderAll();
            } else if (isConnectedOwned(state.selectedId, id, 0)) {
                openMoveModal(state.selectedId, id, false);
            }
        }
    }

    function estimateWinChance(atkTroops, defTroops, isCapital) {
        const aPower = (atkTroops - 1) * 1.08;
        const dPower = defTroops * (isCapital ? 1.25 : 1.0);
        return Math.max(5, Math.min(98, Math.round((aPower / (aPower + dPower)) * 100)));
    }

    function openCombatModal(fromId, toId) {
        activeCombat = { fromId, toId };
        updateCombatUI('Bereit zum Angriff!');
        dom.modalCombat.classList.remove('hidden');
    }

    function updateCombatUI(msg, atkDice = [], defDice = []) {
        if (!activeCombat) return;
        const { fromId, toId } = activeCombat;
        const aCell = state.board[fromId];
        const dCell = state.board[toId];

        document.getElementById('atk-name').textContent = getTerr(fromId).name;
        document.getElementById('def-name').textContent = (dCell.isCapital ? '🏰 ' : '') + getTerr(toId).name;
        document.getElementById('atk-troops').textContent = aCell.troops;
        document.getElementById('def-troops').textContent = dCell.troops;
        document.getElementById('win-chance').textContent = `Siegchance: ${estimateWinChance(aCell.troops, dCell.troops, dCell.isCapital)}%`;
        document.getElementById('combat-result').textContent = msg;

        document.getElementById('atk-dice').innerHTML = atkDice.map(v => `<div class="r-die">${v}</div>`).join('');
        document.getElementById('def-dice').innerHTML = defDice.map(v => `<div class="r-die">${v}</div>`).join('');

        const canFight = aCell.troops > 1 && dCell.troops > 0;
        document.getElementById('btn-roll-once').disabled = !canFight;
        document.getElementById('btn-blitz').disabled = !canFight;
    }

    function resolveBattleRound(fromId, toId) {
        const aCell = state.board[fromId];
        const dCell = state.board[toId];
        const atkCount = Math.min(3, aCell.troops - 1);
        const defCount = Math.min(2, dCell.troops);

        const atkDice = Array.from({ length: atkCount }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a);
        const defDice = Array.from({ length: defCount }, () => 1 + Math.floor(Math.random() * 6)).sort((a, b) => b - a);
        // Capital gives +1 to highest defender die (max 6)
        if (dCell.isCapital && defDice.length) defDice[0] = Math.min(6, defDice[0] + 1);

        let aLoss = 0, dLoss = 0;
        for (let i = 0; i < Math.min(atkDice.length, defDice.length); i++) {
            if (atkDice[i] > defDice[i]) dLoss++;
            else aLoss++;
        }

        aCell.troops -= aLoss;
        dCell.troops -= dLoss;
        RiskSound.cannon();
        fireArtilleryFX(fromId, toId);
        return { atkDice, defDice, aLoss, dLoss, conquered: dCell.troops <= 0 };
    }

    function handleConquest(fromId, toId, attackerId) {
        const prevOwner = state.board[toId].ownerId;
        state.board[toId].ownerId = attackerId;
        state.board[toId].troops = 1;
        state.board[fromId].troops -= 1;
        state.conqueredThisTurn = true;
        RiskSound.conquer();

        const atkPlayer = state.players[attackerId];
        log(`🚩 ${atkPlayer.name} erobert ${getTerr(toId).name}!`);

        // Check elimination
        const prevLeft = Object.values(state.board).filter(b => b.ownerId === prevOwner).length;
        if (prevLeft === 0) {
            state.players[prevOwner].eliminated = true;
            log(`💀 ${state.players[prevOwner].name} wurde ausgelöscht!`);
        }

        checkVictory();
    }

    function openMoveModal(fromId, toId, isConquest) {
        const maxMove = state.board[fromId].troops - 1;
        if (maxMove < 1) {
            state.selectedId = null;
            renderAll();
            return;
        }
        pendingMove = { fromId, toId, isConquest };
        document.getElementById('move-title').textContent = isConquest ? '🚩 Truppen nachrücken' : '🪖 Truppen verlegen';
        document.getElementById('move-desc').textContent = `Von ${getTerr(fromId).name} nach ${getTerr(toId).name}:`;
        const slider = document.getElementById('move-slider');
        slider.min = isConquest ? 0 : 1;
        slider.max = maxMove;
        slider.value = isConquest ? maxMove : Math.max(1, Math.floor(maxMove / 2));
        document.getElementById('move-val').textContent = slider.value;
        dom.modalMove.classList.remove('hidden');
    }

    function checkVictory() {
        const alive = state.players.filter(p => !p.eliminated);
        let winner = alive.length === 1 ? alive[0] : null;

        if (!winner && state.mode === 'mission') {
            for (const p of alive) {
                const m = RISK_MISSIONS.find(x => x.id === p.missionId);
                if (m && m.check(state, p.id)) { winner = p; break; }
            }
        }

        if (winner) {
            state.gameOver = true;
            RiskSound.win();
            document.getElementById('info-icon').textContent = '🏆';
            document.getElementById('info-title').textContent = winner.isHuman ? 'WELTHERRSCHAFT ERREICHT!' : `${winner.name} gewinnt!`;
            document.getElementById('info-desc').textContent = winner.isHuman
                ? 'Glückwunsch General! Deine Fraktion dominiert die Weltkarte.'
                : `${winner.name} hat die Kampagne für sich entschieden.`;
            dom.modalInfo.classList.remove('hidden');
            try { localStorage.removeItem(SAVE_KEY); } catch {}
        }
    }

    function endCurrentTurn() {
        const p = state.players[state.currentPlayer];
        if (state.conqueredThisTurn && p.cards.length < 5) {
            const sym = CARD_TYPES[Math.floor(Math.random() * CARD_TYPES.length)];
            p.cards.push(sym);
            if (p.isHuman) log(`🃏 Du erhältst eine Risiko-Karte (${sym})!`);
        }

        state.conqueredThisTurn = false;
        state.selectedId = null;
        let safety = 0;
        do {
            state.currentPlayer = (state.currentPlayer + 1) % state.players.length;
            safety++;
        } while (state.players[state.currentPlayer].eliminated && safety < 10);

        state.phase = 'reinforce';
        state.reinforcements = calcReinforcements(state.currentPlayer);
        saveGame();
        renderAll();

        if (!state.gameOver && !state.players[state.currentPlayer].isHuman) {
            runBotTurn(state.currentPlayer);
        }
    }

    async function runBotTurn(botId) {
        const bot = state.players[botId];
        await new Promise(r => setTimeout(r, 850));
        if (state.gameOver) return;

        // 1. Reinforce
        while (state.reinforcements > 0) {
            const targetId = RiskAI.pickReinforceTarget(state, botId);
            if (!targetId) break;
            state.board[targetId].troops += 1;
            state.reinforcements -= 1;
        }
        RiskSound.deploy();
        state.phase = 'attack';
        renderAll();
        await new Promise(r => setTimeout(r, 700));

        // 2. Attack (up to 4 battles per turn)
        for (let step = 0; step < 4; step++) {
            if (state.gameOver) return;
            const atk = RiskAI.pickBestAttack(state, botId);
            if (!atk) break;
            const res = resolveBattleRound(atk.from, atk.to);
            if (res.conquered) {
                handleConquest(atk.from, atk.to, botId);
                const moveAmt = Math.max(0, Math.floor((state.board[atk.from].troops - 1) * 0.6));
                state.board[atk.from].troops -= moveAmt;
                state.board[atk.to].troops += moveAmt;
            }
            renderAll();
            await new Promise(r => setTimeout(r, 650));
        }

        if (!state.gameOver) endCurrentTurn();
    }

    // --- Event Listeners ---
    dom.btnNextPhase.addEventListener('click', () => {
        if (state.currentPlayer !== 0 || state.gameOver) return;
        state.selectedId = null;
        if (state.phase === 'reinforce' && state.reinforcements === 0) state.phase = 'attack';
        else if (state.phase === 'attack') state.phase = 'fortify';
        else { endCurrentTurn(); return; }
        renderAll();
    });

    document.getElementById('btn-roll-once').addEventListener('click', () => {
        if (!activeCombat) return;
        const { fromId, toId } = activeCombat;
        const res = resolveBattleRound(fromId, toId);
        if (res.conquered) {
            dom.modalCombat.classList.add('hidden');
            activeCombat = null;
            handleConquest(fromId, toId, 0);
            renderAll();
            if (!state.gameOver) openMoveModal(fromId, toId, true);
        } else {
            updateCombatUI(`Verluste: Du -${res.aLoss} · Gegner -${res.dLoss}`, res.atkDice, res.defDice);
            renderAll();
        }
    });

    document.getElementById('btn-blitz').addEventListener('click', () => {
        if (!activeCombat) return;
        const { fromId, toId } = activeCombat;
        let last = null;
        while (state.board[fromId].troops > 1 && state.board[toId].troops > 0) {
            last = resolveBattleRound(fromId, toId);
        }
        if (last && last.conquered) {
            dom.modalCombat.classList.add('hidden');
            activeCombat = null;
            handleConquest(fromId, toId, 0);
            renderAll();
            if (!state.gameOver) openMoveModal(fromId, toId, true);
        } else if (last) {
            updateCombatUI('Blitz-Angriff gestoppt — nur noch 1 Truppe übrig!', last.atkDice, last.defDice);
            renderAll();
        }
    });

    document.getElementById('btn-retreat').addEventListener('click', () => {
        activeCombat = null;
        dom.modalCombat.classList.add('hidden');
        renderAll();
    });

    document.getElementById('move-slider').addEventListener('input', e => {
        document.getElementById('move-val').textContent = e.target.value;
    });

    document.getElementById('btn-move-confirm').addEventListener('click', () => {
        if (!pendingMove) return;
        const amt = parseInt(document.getElementById('move-slider').value, 10) || 0;
        const { fromId, toId, isConquest } = pendingMove;
        pendingMove = null;
        dom.modalMove.classList.add('hidden');
        state.board[fromId].troops -= amt;
        state.board[toId].troops += amt;
        state.selectedId = null;
        if (!isConquest) {
            endCurrentTurn();
        } else {
            saveGame();
            renderAll();
        }
    });

    // Cards Modal
    function canTradeSet(cards) {
        if (cards.length < 3) return false;
        const counts = { '🪖': 0, '🐴': 0, '💣': 0 };
        cards.forEach(c => { counts[c]++; });
        return Object.values(counts).some(v => v >= 3) || (counts['🪖'] >= 1 && counts['🐴'] >= 1 && counts['💣'] >= 1);
    }

    document.getElementById('btn-cards').addEventListener('click', () => {
        const cards = state.players[0]?.cards || [];
        document.getElementById('cards-grid').innerHTML = cards.length
            ? cards.map(c => `<div class="risk-card"><span>${c}</span>Risiko</div>`).join('')
            : '<span class="modal-desc">Noch keine Karten — erobere Gebiete!</span>';
        const bonus = [4, 6, 8, 10, 12, 15][Math.min(5, state.tradeCount)] || 15;
        const btn = document.getElementById('btn-trade-cards');
        btn.textContent = `Set eintauschen (+${bonus} Truppen)`;
        btn.disabled = !(state.currentPlayer === 0 && state.phase === 'reinforce' && canTradeSet(cards));
        dom.modalCards.classList.remove('hidden');
    });

    document.getElementById('btn-trade-cards').addEventListener('click', () => {
        const p = state.players[0];
        if (!canTradeSet(p.cards)) return;
        p.cards.splice(0, 3);
        const bonus = [4, 6, 8, 10, 12, 15][Math.min(5, state.tradeCount)] || 15;
        state.tradeCount++;
        state.reinforcements += bonus;
        RiskSound.conquer();
        log(`🃏 Karten-Set eingetauscht: +${bonus} Bonus-Truppen!`);
        dom.modalCards.classList.add('hidden');
        renderAll();
    });

    document.getElementById('btn-cards-close').addEventListener('click', () => dom.modalCards.classList.add('hidden'));

    document.getElementById('btn-mission').addEventListener('click', () => {
        const m = RISK_MISSIONS.find(x => x.id === state.players[0]?.missionId);
        document.getElementById('info-icon').textContent = '🎯';
        document.getElementById('info-title').textContent = state.mode === 'mission' ? 'Deine Geheime Mission' : 'Modus: Weltherrschaft';
        document.getElementById('info-desc').textContent = state.mode === 'mission' && m ? m.text : 'Erobere alle 28 Gebiete der Weltkarte!';
        dom.modalInfo.classList.remove('hidden');
    });

    document.getElementById('btn-info-close').addEventListener('click', () => dom.modalInfo.classList.add('hidden'));
    document.getElementById('btn-new').addEventListener('click', () => dom.modalStart.classList.remove('hidden'));
    document.getElementById('btn-sound').addEventListener('click', e => { e.target.textContent = RiskSound.toggle() ? '🔊' : '🔇'; });

    document.querySelectorAll('#opt-mode button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#opt-mode button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.mode = btn.dataset.val;
        });
    });

    document.querySelectorAll('#opt-bots button').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#opt-bots button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.botCount = parseInt(btn.dataset.val, 10);
        });
    });

    document.getElementById('btn-start-game').addEventListener('click', startNewGame);
    dom.btnResume.addEventListener('click', () => {
        if (loadGame()) {
            dom.modalStart.classList.add('hidden');
            renderAll();
            if (!state.players[state.currentPlayer].isHuman) runBotTurn(state.currentPlayer);
        }
    });

    // Load real Natural Earth world map on startup
    loadRealWorldMap().then(() => {
        if (state.players.length > 0) renderAll();
    });

    if (loadGame()) dom.btnResume.classList.remove('hidden');
})();
