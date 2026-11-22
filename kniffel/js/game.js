// Kniffel (Yahtzee) Tabletop Engine with Bot Opponent & D1 Leaderboard
(() => {
    const FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
    const CATEGORIES = [
        { id: 'ones', label: '1er', upper: true, calc: d => sumOf(d, 1) },
        { id: 'twos', label: '2er', upper: true, calc: d => sumOf(d, 2) },
        { id: 'threes', label: '3er', upper: true, calc: d => sumOf(d, 3) },
        { id: 'fours', label: '4er', upper: true, calc: d => sumOf(d, 4) },
        { id: 'fives', label: '5er', upper: true, calc: d => sumOf(d, 5) },
        { id: 'sixes', label: '6er', upper: true, calc: d => sumOf(d, 6) },
        { id: 'threeKind', label: 'Dreierpasch', calc: d => hasCount(d, 3) ? sumAll(d) : 0 },
        { id: 'fourKind', label: 'Viererpasch', calc: d => hasCount(d, 4) ? sumAll(d) : 0 },
        { id: 'fullHouse', label: 'Full House (25)', calc: d => isFullHouse(d) ? 25 : 0 },
        { id: 'smallStr', label: 'Kleine Straße (30)', calc: d => hasStraight(d, 4) ? 30 : 0 },
        { id: 'largeStr', label: 'Große Straße (40)', calc: d => hasStraight(d, 5) ? 40 : 0 },
        { id: 'kniffel', label: 'KNIFFEL (50)', calc: d => hasCount(d, 5) ? 50 : 0 },
        { id: 'chance', label: 'Chance', calc: d => sumAll(d) }
    ];

    let vsBot = true;
    let dice = [1, 2, 3, 4, 5];
    let held = [false, false, false, false, false];
    let rollsLeft = 3;
    let turn = 0; // 0 = human, 1 = bot
    let scores = [{}, {}];
    let gameOver = false;

    const dom = {
        diceRow: document.getElementById('dice-row'),
        rollsLeft: document.getElementById('rolls-left'),
        btnRoll: document.getElementById('btn-roll'),
        scoreBody: document.getElementById('score-body'),
        turnPill: document.getElementById('turn-pill'),
        colBot: document.getElementById('col-bot')
    };

    function sumAll(d) { return d.reduce((a, b) => a + b, 0); }
    function sumOf(d, val) { return d.filter(x => x === val).reduce((a, b) => a + b, 0); }
    function counts(d) {
        const m = {};
        d.forEach(x => { m[x] = (m[x] || 0) + 1; });
        return Object.values(m);
    }
    function hasCount(d, n) { return counts(d).some(c => c >= n); }
    function isFullHouse(d) { const c = counts(d).sort(); return c.length === 2 && c[0] === 2 && c[1] === 3; }
    function hasStraight(d, len) {
        const u = [...new Set(d)].sort((a, b) => a - b);
        let run = 1;
        for (let i = 1; i < u.length; i++) {
            run = u[i] === u[i - 1] + 1 ? run + 1 : 1;
            if (run >= len) return true;
        }
        return false;
    }

    function calcTotals(sc) {
        const upper = CATEGORIES.filter(c => c.upper).reduce((s, c) => s + (sc[c.id] || 0), 0);
        const bonus = upper >= 63 ? 35 : 0;
        const lower = CATEGORIES.filter(c => !c.upper).reduce((s, c) => s + (sc[c.id] || 0), 0);
        return { upper, bonus, total: upper + bonus + lower };
    }

    function startNewGame() {
        dice = [1, 2, 3, 4, 5];
        held = [false, false, false, false, false];
        rollsLeft = 3;
        turn = 0;
        scores = [{}, {}];
        gameOver = false;
        dom.colBot.style.display = vsBot ? '' : 'none';
        render();
    }

    async function rollDice() {
        if (rollsLeft <= 0 || gameOver) return;
        rollsLeft--;
        for (let i = 0; i < 5; i++) {
            if (!held[i]) dice[i] = 1 + Math.floor(Math.random() * 6);
        }
        render(true);
    }

    function chooseCategory(catId) {
        if (gameOver || rollsLeft === 3 || scores[turn][catId] !== undefined) return;
        const cat = CATEGORIES.find(c => c.id === catId);
        scores[turn][catId] = cat.calc(dice);

        // Check game end
        const humanDone = Object.keys(scores[0]).length === CATEGORIES.length;
        const botDone = !vsBot || Object.keys(scores[1]).length === CATEGORIES.length;
        if (humanDone && botDone) {
            gameOver = true;
            const t0 = calcTotals(scores[0]).total;
            const t1 = calcTotals(scores[1]).total;
            dom.turnPill.textContent = vsBot
                ? (t0 >= t1 ? `🏆 Du gewinnst (${t0} : ${t1})!` : `🤖 Bot gewinnt (${t1} : ${t0})!`)
                : `🏆 Endstand: ${t0} Punkte!`;
            fetch('/api/leaderboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_name: 'Du', game: 'kniffel', score: t0 })
            }).catch(() => {});
            render();
            return;
        }

        // Next turn
        held = [false, false, false, false, false];
        rollsLeft = 3;
        if (vsBot) turn = turn === 0 ? 1 : 0;
        render();

        if (vsBot && turn === 1 && !gameOver) {
            setTimeout(runBotTurn, 650);
        }
    }

    async function runBotTurn() {
        for (let r = 0; r < 3; r++) {
            await rollDice();
            await new Promise(res => setTimeout(res, 550));
            // Keep most frequent number
            const freq = {};
            dice.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
            const bestVal = parseInt(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0], 10);
            held = dice.map(v => v === bestVal);
            render();
        }
        // Pick highest scoring open category
        const open = CATEGORIES.filter(c => scores[1][c.id] === undefined);
        open.sort((a, b) => b.calc(dice) - a.calc(dice));
        if (open.length) chooseCategory(open[0].id);
    }

    function render(animate = false) {
        if (!gameOver) {
            dom.turnPill.textContent = turn === 0 ? 'Du bist dran' : '🤖 Bot würfelt...';
        }
        dom.rollsLeft.textContent = rollsLeft === 3 ? 'Bereit — 3 Würfe' : `Noch ${rollsLeft} ${rollsLeft === 1 ? 'Wurf' : 'Würfe'}`;
        dom.btnRoll.disabled = gameOver || turn !== 0 || rollsLeft <= 0;

        dom.diceRow.innerHTML = '';
        dice.forEach((val, idx) => {
            const el = document.createElement('div');
            el.className = 'k-die' + (held[idx] ? ' held' : '') + (animate && !held[idx] ? ' rolling' : '');
            el.textContent = FACES[val - 1];
            el.addEventListener('click', () => {
                if (turn !== 0 || rollsLeft === 3 || gameOver) return;
                held[idx] = !held[idx];
                render();
            });
            dom.diceRow.appendChild(el);
        });

        const t0 = calcTotals(scores[0]);
        const t1 = calcTotals(scores[1]);
        const canPick = turn === 0 && rollsLeft < 3 && !gameOver;

        let rows = '';
        CATEGORIES.forEach((cat, idx) => {
            const v0 = scores[0][cat.id];
            const v1 = scores[1][cat.id];
            const preview = canPick && v0 === undefined ? cat.calc(dice) : null;
            rows += `<tr>
                <td>${cat.label}</td>
                <td class="score-cell ${preview !== null ? 'available' : ''}" data-cat="${cat.id}">${v0 !== undefined ? v0 : (preview !== null ? preview : '—')}</td>
                ${vsBot ? `<td>${v1 !== undefined ? v1 : '—'}</td>` : ''}
            </tr>`;
            if (idx === 5) {
                rows += `<tr class="summary-row"><td>Bonus (ab 63)</td><td>+${t0.bonus}</td>${vsBot ? `<td>+${t1.bonus}</td>` : ''}</tr>`;
            }
        });
        rows += `<tr class="total-row"><td>GESAMT</td><td>${t0.total}</td>${vsBot ? `<td>${t1.total}</td>` : ''}</tr>`;
        dom.scoreBody.innerHTML = rows;

        dom.scoreBody.querySelectorAll('.score-cell.available').forEach(cell => {
            cell.addEventListener('click', () => chooseCategory(cell.dataset.cat));
        });
    }

    dom.btnRoll.addEventListener('click', rollDice);
    document.getElementById('btn-new').addEventListener('click', startNewGame);
    document.getElementById('btn-mode').addEventListener('click', e => {
        vsBot = !vsBot;
        e.target.textContent = vsBot ? 'Modus: vs. Bot' : 'Modus: Solo';
        startNewGame();
    });

    startNewGame();
})();
