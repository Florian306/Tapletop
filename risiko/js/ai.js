// Tactical AI generals for RISIKO 1815 (continent focus, bonus breaking, capital defense, front-line fortify)
const RiskAI = (() => {
    function getEnemyNeighbors(state, terr, botId) {
        return terr.adj.filter(a => state.board[a].ownerId !== botId);
    }

    function countMissingInCont(state, botId, contId) {
        return RISK_TERRITORIES.filter(t => t.cont === contId && state.board[t.id].ownerId !== botId).length;
    }

    function pickReinforceTarget(state, botId) {
        const owned = RISK_TERRITORIES.filter(t => state.board[t.id].ownerId === botId);
        const borders = owned.filter(t => getEnemyNeighbors(state, t, botId).length > 0);
        const pool = borders.length ? borders : owned;
        if (!pool.length) return null;

        let bestId = pool[0].id;
        let bestScore = -Infinity;

        for (const t of pool) {
            const cell = state.board[t.id];
            const enemies = getEnemyNeighbors(state, t, botId);
            const maxEnemy = Math.max(...enemies.map(e => state.board[e].troops), 0);
            let score = 0;

            // Defend threatened capital
            if (cell.isCapital && maxEnemy >= cell.troops) score += 35;

            // Push to finish a continent we almost own
            const missing = countMissingInCont(state, botId, t.cont);
            if (missing === 1) score += 28;
            else if (missing === 2) score += 14;

            // Threaten an enemy's completed continent
            for (const eId of enemies) {
                const eTerr = RISK_TERRITORIES.find(x => x.id === eId);
                const eOwner = state.board[eId].ownerId;
                if (eTerr && ownsCont(state, eOwner, eTerr.cont)) score += 22;
            }

            // Slight preference for attacking weak neighbors
            const minEnemy = Math.min(...enemies.map(e => state.board[e].troops), 99);
            score += Math.max(0, 12 - minEnemy);

            if (score > bestScore) {
                bestScore = score;
                bestId = t.id;
            }
        }
        return bestId;
    }

    function pickBestAttack(state, botId) {
        let best = null;
        let bestScore = -Infinity;

        for (const t of RISK_TERRITORIES) {
            const cell = state.board[t.id];
            if (cell.ownerId !== botId || cell.troops < 3) continue;

            for (const adjId of t.adj) {
                const target = state.board[adjId];
                if (target.ownerId === botId) continue;
                const ratio = cell.troops / Math.max(1, target.troops);
                if (ratio < 1.2) continue;

                const targetTerr = RISK_TERRITORIES.find(x => x.id === adjId);
                let score = ratio * 12;

                // Huge priority: complete our own continent
                if (targetTerr && countMissingInCont(state, botId, targetTerr.cont) === 1) score += 40;
                // High priority: break an opponent's completed continent bonus
                if (targetTerr && ownsCont(state, target.ownerId, targetTerr.cont)) score += 32;
                // High priority: capture enemy capital
                if (target.isCapital) score += 18;

                if (score > bestScore) {
                    bestScore = score;
                    best = { from: t.id, to: adjId };
                }
            }
        }
        return best;
    }

    function pickFortifyMove(state, botId, isConnectedFn) {
        const owned = RISK_TERRITORIES.filter(t => state.board[t.id].ownerId === botId);
        // Safe interior territories with spare troops (>1)
        const interior = owned
            .filter(t => state.board[t.id].troops > 1 && getEnemyNeighbors(state, t, botId).length === 0)
            .sort((a, b) => state.board[b.id].troops - state.board[a.id].troops);
        const borders = owned.filter(t => getEnemyNeighbors(state, t, botId).length > 0);

        for (const src of interior) {
            const reachableBorder = borders.find(b => isConnectedFn(src.id, b.id, botId));
            if (reachableBorder) {
                return { from: src.id, to: reachableBorder.id, amount: state.board[src.id].troops - 1 };
            }
        }
        return null;
    }

    return { pickReinforceTarget, pickBestAttack, pickFortifyMove };
})();
