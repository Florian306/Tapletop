// Tactical AI generals for RISIKO
const RiskAI = (() => {
    function pickReinforceTarget(state, botId) {
        const owned = RISK_TERRITORIES.filter(t => state.board[t.id].ownerId === botId);
        // Prefer border territories adjacent to enemies
        const borders = owned.filter(t => t.adj.some(a => state.board[a].ownerId !== botId));
        const pool = borders.length ? borders : owned;
        // Weight toward territories bordering weak enemies
        pool.sort((a, b) => {
            const minEnemyA = Math.min(...a.adj.filter(x => state.board[x].ownerId !== botId).map(x => state.board[x].troops), 99);
            const minEnemyB = Math.min(...b.adj.filter(x => state.board[x].ownerId !== botId).map(x => state.board[x].troops), 99);
            return minEnemyA - minEnemyB;
        });
        return pool[0]?.id || null;
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
                if (ratio < 1.25) continue;

                let score = ratio * 10;
                if (target.isCapital) score += 8;
                if (score > bestScore) {
                    bestScore = score;
                    best = { from: t.id, to: adjId };
                }
            }
        }
        return best;
    }

    return { pickReinforceTarget, pickBestAttack };
})();
