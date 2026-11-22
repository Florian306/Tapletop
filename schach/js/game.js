// Chess Grandmaster Engine with Minimax Alpha-Beta AI
(() => {
    const GLYPHS = {
        wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
        bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟'
    };
    const VALUES = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 20000 };
    const FILES = 'abcdefgh';
    const THEMES = ['wood', 'marble', 'emerald'];

    let board = [];
    let turn = 'w';
    let selected = null;
    let legalMoves = [];
    let history = [];
    let lastMove = null;
    let captured = { w: [], b: [] };
    let gameOver = false;
    let themeIdx = 0;
    let hintMove = null;
    let analysis = { best: 0, good: 0, inaccuracy: 0, blunder: 0, castled: false, notes: [] };

    const dom = {
        board: document.getElementById('chess-board'),
        status: document.getElementById('status-pill'),
        history: document.getElementById('move-history'),
        capWhite: document.getElementById('cap-white'),
        capBlack: document.getElementById('cap-black'),
        diff: document.getElementById('difficulty-select')
    };

    function playClick() {
        try {
            const C = window.AudioContext || window.webkitAudioContext;
            const ctx = new C();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = 'triangle';
            o.frequency.value = 260;
            g.gain.setValueAtTime(0.08, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + 0.07);
        } catch {}
    }

    function initGame() {
        const back = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
        board = Array.from({ length: 8 }, () => Array(8).fill(null));
        for (let c = 0; c < 8; c++) {
            board[0][c] = { color: 'b', type: back[c], moved: false };
            board[1][c] = { color: 'b', type: 'P', moved: false };
            board[6][c] = { color: 'w', type: 'P', moved: false };
            board[7][c] = { color: 'w', type: back[c], moved: false };
        }
        turn = 'w';
        selected = null;
        legalMoves = [];
        history = [];
        lastMove = null;
        captured = { w: [], b: [] };
        gameOver = false;
        hintMove = null;
        analysis = { best: 0, good: 0, inaccuracy: 0, blunder: 0, castled: false, notes: [] };
        render();
    }

    function cloneBoard(b) {
        return b.map(row => row.map(p => (p ? { ...p } : null)));
    }

    function inBounds(r, c) {
        return r >= 0 && r < 8 && c >= 0 && c < 8;
    }

    function getPseudoMoves(b, r, c) {
        const p = b[r][c];
        if (!p) return [];
        const moves = [];
        const opp = p.color === 'w' ? 'b' : 'w';

        if (p.type === 'P') {
            const dir = p.color === 'w' ? -1 : 1;
            const startRow = p.color === 'w' ? 6 : 1;
            if (inBounds(r + dir, c) && !b[r + dir][c]) {
                moves.push({ fr: r, fc: c, tr: r + dir, tc: c });
                if (r === startRow && !b[r + dir * 2][c]) {
                    moves.push({ fr: r, fc: c, tr: r + dir * 2, tc: c });
                }
            }
            for (const dc of [-1, 1]) {
                if (inBounds(r + dir, c + dc) && b[r + dir][c + dc]?.color === opp) {
                    moves.push({ fr: r, fc: c, tr: r + dir, tc: c + dc });
                }
            }
        } else if (p.type === 'N') {
            for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
                const nr = r + dr, nc = c + dc;
                if (inBounds(nr, nc) && b[nr][nc]?.color !== p.color) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
            }
        } else if (p.type === 'K') {
            for (let dr = -1; dr <= 1; dr++) {
                for (let dc = -1; dc <= 1; dc++) {
                    if (!dr && !dc) continue;
                    const nr = r + dr, nc = c + dc;
                    if (inBounds(nr, nc) && b[nr][nc]?.color !== p.color) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                }
            }
            // Castling
            if (!p.moved && !isKingInCheck(b, p.color)) {
                if (b[r][7]?.type === 'R' && !b[r][7].moved && !b[r][5] && !b[r][6]) {
                    moves.push({ fr: r, fc: c, tr: r, tc: 6, castle: 'K' });
                }
                if (b[r][0]?.type === 'R' && !b[r][0].moved && !b[r][1] && !b[r][2] && !b[r][3]) {
                    moves.push({ fr: r, fc: c, tr: r, tc: 2, castle: 'Q' });
                }
            }
        } else {
            const dirs = p.type === 'R' ? [[1,0],[-1,0],[0,1],[0,-1]]
                : p.type === 'B' ? [[1,1],[1,-1],[-1,1],[-1,-1]]
                : [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
            for (const [dr, dc] of dirs) {
                let nr = r + dr, nc = c + dc;
                while (inBounds(nr, nc)) {
                    if (!b[nr][nc]) {
                        moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                    } else {
                        if (b[nr][nc].color === opp) moves.push({ fr: r, fc: c, tr: nr, tc: nc });
                        break;
                    }
                    nr += dr; nc += dc;
                }
            }
        }
        return moves;
    }

    function applyMoveOn(b, m) {
        const nb = cloneBoard(b);
        const piece = nb[m.fr][m.fc];
        nb[m.tr][m.tc] = { ...piece, moved: true };
        nb[m.fr][m.fc] = null;
        if (piece.type === 'P' && (m.tr === 0 || m.tr === 7)) nb[m.tr][m.tc].type = 'Q';
        if (m.castle === 'K') { nb[m.tr][5] = { ...nb[m.tr][7], moved: true }; nb[m.tr][7] = null; }
        if (m.castle === 'Q') { nb[m.tr][3] = { ...nb[m.tr][0], moved: true }; nb[m.tr][0] = null; }
        return nb;
    }

    function isKingInCheck(b, color) {
        let kr = -1, kc = -1;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c]?.color === color && b[r][c].type === 'K') { kr = r; kc = c; }
            }
        }
        if (kr === -1) return true;
        const opp = color === 'w' ? 'b' : 'w';
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c]?.color === opp) {
                    const p = b[r][c];
                    if (p.type === 'K') {
                        if (Math.abs(r - kr) <= 1 && Math.abs(c - kc) <= 1) return true;
                    } else {
                        const ms = getPseudoMoves(b, r, c);
                        if (ms.some(m => m.tr === kr && m.tc === kc)) return true;
                    }
                }
            }
        }
        return false;
    }

    function getAllLegalMoves(b, color) {
        const res = [];
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c]?.color === color) {
                    for (const m of getPseudoMoves(b, r, c)) {
                        const nb = applyMoveOn(b, m);
                        if (!isKingInCheck(nb, color)) res.push(m);
                    }
                }
            }
        }
        return res;
    }

    function evaluateBoard(b) {
        let score = 0;
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const p = b[r][c];
                if (!p) continue;
                const centerBonus = (3.5 - Math.abs(3.5 - r)) * 4 + (3.5 - Math.abs(3.5 - c)) * 4;
                const val = VALUES[p.type] + centerBonus;
                score += p.color === 'b' ? val : -val;
            }
        }
        return score;
    }

    function minimax(b, depth, alpha, beta, maximizing) {
        const color = maximizing ? 'b' : 'w';
        const moves = getAllLegalMoves(b, color);
        if (depth === 0 || !moves.length) {
            if (!moves.length) {
                if (isKingInCheck(b, color)) return maximizing ? -99999 : 99999;
                return 0;
            }
            return evaluateBoard(b);
        }

        if (maximizing) {
            let maxEval = -Infinity;
            for (const m of moves) {
                const ev = minimax(applyMoveOn(b, m), depth - 1, alpha, beta, false);
                if (ev > maxEval) maxEval = ev;
                if (ev > alpha) alpha = ev;
                if (beta <= alpha) break;
            }
            return maxEval;
        } else {
            let minEval = Infinity;
            for (const m of moves) {
                const ev = minimax(applyMoveOn(b, m), depth - 1, alpha, beta, true);
                if (ev < minEval) minEval = ev;
                if (ev < beta) beta = ev;
                if (beta <= alpha) break;
            }
            return minEval;
        }
    }

    function findBestWhiteMove(b) {
        const moves = getAllLegalMoves(b, 'w');
        if (!moves.length) return { move: null, evalScore: 0 };
        let bestM = moves[0];
        let bestEval = Infinity; // White minimizes evaluateBoard (which is + for Black)
        for (const m of moves) {
            const ev = minimax(applyMoveOn(b, m), 1, -Infinity, Infinity, true);
            if (ev < bestEval) { bestEval = ev; bestM = m; }
        }
        return { move: bestM, evalScore: bestEval };
    }

    function openAnalysisModal() {
        const total = analysis.best + analysis.good + analysis.inaccuracy + analysis.blunder;
        const acc = total > 0
            ? Math.round(((analysis.best * 100 + analysis.good * 82 + analysis.inaccuracy * 55 + analysis.blunder * 15) / total))
            : 100;

        document.getElementById('rev-accuracy').textContent = `${acc}%`;
        document.getElementById('rev-stats').innerHTML = `
            <div class="review-stat">⭐ Beste Züge: <strong>${analysis.best}</strong></div>
            <div class="review-stat">✅ Gute Züge: <strong>${analysis.good}</strong></div>
            <div class="review-stat">⚠️ Ungenau: <strong>${analysis.inaccuracy}</strong></div>
            <div class="review-stat">❌ Patzer: <strong>${analysis.blunder}</strong></div>
        `;

        const tips = [];
        if (analysis.blunder > 0) tips.push(`• Du hattest ${analysis.blunder} Patzer — prüfe vor jedem Zug kurz, ob das Zielfeld von einer gegnerischen Figur gedeckt ist.`);
        if (!analysis.castled && total >= 6) tips.push('• Tipp: Nutze die Rochade (König 2 Felder Richtung Turm), um deinen König früh in Sicherheit zu bringen.');
        if (analysis.inaccuracy >= 2) tips.push('• Achte auf die 4 Zentrumsfelder (d4, d5, e4, e5) — Figuren im Zentrum kontrollieren mehr Felder.');
        if (acc >= 85 && total >= 4) tips.push('• Starke Leistung! Deine Zug-Genauigkeit liegt auf Turnier-Niveau.');
        if (!tips.length) tips.push('• Spiele ein paar Züge, dann erstellt die Engine persönliche Tipps für dich!');

        document.getElementById('rev-tips').innerHTML = tips.map(t => `<div>${t}</div>`).join('');
        document.getElementById('modal-review').classList.remove('hidden');
    }

    function executeMove(m) {
        let ratingTag = '';
        if (turn === 'w') {
            if (m.castle) analysis.castled = true;
            const best = findBestWhiteMove(board);
            const playedEval = minimax(applyMoveOn(board, m), 1, -Infinity, Infinity, true);
            const loss = playedEval - best.evalScore; // higher = worse for white
            if (loss <= 35) { analysis.best++; ratingTag = ' ⭐'; }
            else if (loss <= 100) { analysis.good++; ratingTag = ' ✅'; }
            else if (loss <= 200) { analysis.inaccuracy++; ratingTag = ' ⚠️'; }
            else {
                analysis.blunder++;
                const bTxt = best.move ? ` (Besser: ${FILES[best.move.fc]}${8 - best.move.fr}→${FILES[best.move.tc]}${8 - best.move.tr})` : '';
                ratingTag = ` ❌${bTxt}`;
            }
        }

        hintMove = null;
        history.push({ board: cloneBoard(board), turn, lastMove, captured: { w: [...captured.w], b: [...captured.b] } });
        const target = board[m.tr][m.tc];
        const mover = board[m.fr][m.fc];
        if (target) captured[mover.color].push(GLYPHS[target.color + target.type]);

        board = applyMoveOn(board, m);
        lastMove = m;
        const note = `${GLYPHS[mover.color + mover.type]} ${FILES[m.fc]}${8 - m.fr}→${FILES[m.tc]}${8 - m.tr}${ratingTag}`;
        const div = document.createElement('div');
        div.textContent = note;
        dom.history.appendChild(div);
        dom.history.scrollTop = dom.history.scrollHeight;

        turn = turn === 'w' ? 'b' : 'w';
        selected = null;
        legalMoves = [];
        playClick();

        const nextMoves = getAllLegalMoves(board, turn);
        if (!nextMoves.length) {
            gameOver = true;
            const check = isKingInCheck(board, turn);
            dom.status.textContent = check
                ? (turn === 'b' ? '🏆 SCHACHMATT! Du gewinnst!' : '💀 SCHACHMATT! KI gewinnt!')
                : '🤝 PATT — Unentschieden!';
            setTimeout(openAnalysisModal, 700);
        }
        render();

        if (!gameOver && turn === 'b') {
            setTimeout(runAIMove, 350);
        }
    }

    function runAIMove() {
        const moves = getAllLegalMoves(board, 'b');
        if (!moves.length) return;
        const depth = parseInt(dom.diff.value, 10) || 2;
        let bestMove = moves[0];
        let bestScore = -Infinity;

        for (const m of moves) {
            const score = minimax(applyMoveOn(board, m), depth - 1, -Infinity, Infinity, false) + (Math.random() * 6 - 3);
            if (score > bestScore) {
                bestScore = score;
                bestMove = m;
            }
        }
        executeMove(bestMove);
    }

    function handleSquareClick(r, c) {
        if (gameOver || turn !== 'w') return;
        const hit = legalMoves.find(m => m.tr === r && m.tc === c);
        if (hit) {
            executeMove(hit);
            return;
        }
        if (board[r][c]?.color === 'w') {
            selected = { r, c };
            legalMoves = getAllLegalMoves(board, 'w').filter(m => m.fr === r && m.fc === c);
        } else {
            selected = null;
            legalMoves = [];
        }
        render();
    }

    function render() {
        dom.board.innerHTML = '';
        const checkW = isKingInCheck(board, 'w');
        const checkB = isKingInCheck(board, 'b');

        if (!gameOver) {
            dom.status.textContent = turn === 'w'
                ? (checkW ? '⚠️ SCHACH! Weiß am Zug' : 'Weiß (Du) ist am Zug')
                : 'Schwarz (KI) überlegt...';
        }

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                const sq = document.createElement('div');
                sq.className = `sq ${(r + c) % 2 === 0 ? 'light' : 'dark'}`;
                if (selected && selected.r === r && selected.c === c) sq.classList.add('selected');
                if (hintMove && ((hintMove.fr === r && hintMove.fc === c) || (hintMove.tr === r && hintMove.tc === c))) sq.classList.add('hint-best');
                if (lastMove && ((lastMove.fr === r && lastMove.fc === c) || (lastMove.tr === r && lastMove.tc === c))) sq.classList.add('last-move');

                const p = board[r][c];
                if (p?.type === 'K' && ((p.color === 'w' && checkW) || (p.color === 'b' && checkB))) sq.classList.add('in-check');

                const isHint = legalMoves.some(m => m.tr === r && m.tc === c);
                if (isHint) sq.classList.add(p ? 'hint-capture' : 'hint-move');

                if (p) {
                    const span = document.createElement('span');
                    span.className = `piece ${p.color}`;
                    span.textContent = GLYPHS[p.color + p.type];
                    sq.appendChild(span);
                }

                sq.addEventListener('click', () => handleSquareClick(r, c));
                dom.board.appendChild(sq);
            }
        }

        dom.capWhite.textContent = captured.w.join(' ');
        dom.capBlack.textContent = captured.b.join(' ');
    }

    document.getElementById('btn-hint').addEventListener('click', () => {
        if (gameOver || turn !== 'w') return;
        const best = findBestWhiteMove(board);
        hintMove = best.move;
        render();
    });
    document.getElementById('btn-analysis').addEventListener('click', openAnalysisModal);
    document.getElementById('btn-rev-close').addEventListener('click', () => document.getElementById('modal-review').classList.add('hidden'));
    document.getElementById('btn-new').addEventListener('click', () => { dom.history.innerHTML = ''; initGame(); });
    document.getElementById('btn-theme').addEventListener('click', () => {
        themeIdx = (themeIdx + 1) % THEMES.length;
        document.body.dataset.board = THEMES[themeIdx];
    });
    document.getElementById('btn-undo').addEventListener('click', () => {
        if (history.length < 2 || turn !== 'w') return;
        history.pop();
        const prev = history.pop();
        board = prev.board;
        turn = 'w';
        lastMove = prev.lastMove;
        captured = prev.captured;
        gameOver = false;
        selected = null;
        legalMoves = [];
        render();
    });

    initGame();
})();
