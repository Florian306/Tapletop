// Web Audio war-room sound synthesizer
const RiskSound = (() => {
    let ctx = null;
    let enabled = true;

    function getCtx() {
        if (!enabled) return null;
        if (!ctx) {
            const C = window.AudioContext || window.webkitAudioContext;
            if (!C) return null;
            ctx = new C();
        }
        if (ctx.state === 'suspended') ctx.resume().catch(() => {});
        return ctx;
    }

    function tone(freq, dur, type = 'triangle', vol = 0.1, delay = 0) {
        const a = getCtx();
        if (!a) return;
        const now = a.currentTime + delay;
        const osc = a.createOscillator();
        const g = a.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        g.gain.setValueAtTime(0.001, now);
        g.gain.exponentialRampToValueAtTime(vol, now + 0.015);
        g.gain.exponentialRampToValueAtTime(0.001, now + dur);
        osc.connect(g);
        g.connect(a.destination);
        osc.start(now);
        osc.stop(now + dur + 0.02);
    }

    return {
        toggle() { enabled = !enabled; return enabled; },
        deploy() { tone(360, 0.06, 'triangle', 0.08); },
        cannon() { tone(130, 0.16, 'sawtooth', 0.12, 0); tone(85, 0.22, 'square', 0.09, 0.06); },
        conquer() { tone(440, 0.1, 'triangle', 0.12, 0); tone(554, 0.1, 'triangle', 0.12, 0.08); tone(659, 0.18, 'triangle', 0.14, 0.16); },
        win() { [523, 659, 784, 1046].forEach((n, i) => tone(n, 0.24, 'triangle', 0.14, i * 0.11)); }
    };
})();
