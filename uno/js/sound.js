// Web Audio API sound synthesizer (zero external assets)
const SoundFX = (() => {
    let ctx = null;
    let enabled = true;

    function ensureContext() {
        if (!enabled) return null;
        if (!ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (!AudioCtx) return null;
            ctx = new AudioCtx();
        }
        if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
        }
        return ctx;
    }

    function playTone(freq, duration, type = 'sine', volume = 0.12, delay = 0) {
        const audio = ensureContext();
        if (!audio) return;
        const now = audio.currentTime + delay;
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    function playNoise(duration, volume = 0.08, highpass = 1200) {
        const audio = ensureContext();
        if (!audio) return;
        const bufferSize = Math.floor(audio.sampleRate * duration);
        const buffer = audio.createBuffer(1, bufferSize, audio.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.35));
        }
        const source = audio.createBufferSource();
        source.buffer = buffer;

        const filter = audio.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = highpass;

        const gain = audio.createGain();
        gain.gain.value = volume;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(audio.destination);
        source.start();
    }

    return {
        toggle() {
            enabled = !enabled;
            return enabled;
        },
        isEnabled() {
            return enabled;
        },
        cardPlay() {
            playNoise(0.09, 0.11, 1400);
            playTone(320, 0.07, 'triangle', 0.08);
        },
        cardDraw() {
            playNoise(0.11, 0.08, 1800);
            playTone(240, 0.06, 'sine', 0.05);
        },
        special() {
            playTone(440, 0.1, 'triangle', 0.11, 0);
            playTone(660, 0.14, 'triangle', 0.11, 0.07);
        },
        penalty() {
            playTone(220, 0.14, 'sawtooth', 0.1, 0);
            playTone(165, 0.22, 'sawtooth', 0.1, 0.1);
        },
        uno() {
            playTone(523.25, 0.12, 'triangle', 0.14, 0);
            playTone(659.25, 0.12, 'triangle', 0.14, 0.09);
            playTone(783.99, 0.22, 'triangle', 0.16, 0.18);
        },
        win() {
            const notes = [523.25, 659.25, 783.99, 1046.5];
            notes.forEach((n, i) => playTone(n, 0.24, 'triangle', 0.14, i * 0.11));
        },
        lose() {
            const notes = [392, 349.23, 311.13, 261.63];
            notes.forEach((n, i) => playTone(n, 0.24, 'sawtooth', 0.08, i * 0.13));
        }
    };
})();
