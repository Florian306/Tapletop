// Web Audio synthesizer for Monopoly
const MonoSound = (() => {
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
        dice() { tone(260, 0.06, 'square', 0.06, 0); tone(340, 0.06, 'square', 0.06, 0.07); tone(420, 0.07, 'square', 0.06, 0.14); },
        buy() { tone(523, 0.1, 'triangle', 0.12, 0); tone(659, 0.16, 'triangle', 0.12, 0.08); },
        money() { tone(784, 0.08, 'sine', 0.1, 0); tone(1046, 0.14, 'sine', 0.1, 0.07); },
        jail() { tone(220, 0.18, 'sawtooth', 0.09, 0); tone(155, 0.25, 'sawtooth', 0.09, 0.14); },
        win() { [523, 659, 784, 1046].forEach((n, i) => tone(n, 0.22, 'triangle', 0.12, i * 0.1)); }
    };
})();
