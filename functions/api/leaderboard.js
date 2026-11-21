// Cloudflare Pages Function: /api/leaderboard (D1 Binding: DB)
export async function onRequestGet({ env, request }) {
    if (!env.DB) {
        return Response.json({ ok: false, entries: [] }, { status: 200 });
    }
    const url = new URL(request.url);
    const game = url.searchParams.get('game') || 'monopoly';
    try {
        const { results } = await env.DB.prepare(
            'SELECT player_name, score, created_at FROM leaderboard WHERE game = ? ORDER BY score DESC LIMIT 10'
        ).bind(game).all();
        return Response.json({ ok: true, entries: results || [] });
    } catch {
        return Response.json({ ok: false, entries: [] }, { status: 200 });
    }
}

export async function onRequestPost({ env, request }) {
    if (!env.DB) {
        return Response.json({ ok: false }, { status: 200 });
    }
    try {
        const body = await request.json();
        const name = String(body.player_name || 'Spieler').slice(0, 24);
        const game = String(body.game || 'monopoly').slice(0, 20);
        const score = Math.max(0, Math.min(999999, parseInt(body.score, 10) || 0));

        await env.DB.prepare(
            'INSERT INTO leaderboard (player_name, game, score) VALUES (?, ?, ?)'
        ).bind(name, game, score).run();

        return Response.json({ ok: true });
    } catch {
        return Response.json({ ok: false }, { status: 400 });
    }
}
