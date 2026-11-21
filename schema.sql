-- Run once in Cloudflare D1 Console (database: tapletop)
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    player_name TEXT NOT NULL,
    game TEXT NOT NULL,
    score INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_leaderboard_game_score ON leaderboard (game, score DESC);
