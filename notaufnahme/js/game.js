// ZNA — Emergency Room Simulator Engine with Live ECG Monitor
(() => {
    const CASES = [
        {
            title: 'Herzinfarkt (STEMI)',
            triage: 'red', complaint: 'Starke Brustschmerzen, kalter Schweiß',
            hr: 118, spo2: 91, bp: '95/60', temp: '36.8', decay: 1.5,
            findings: {
                anamnesis: 'Ausstrahlender Schmerz in den linken Arm seit 20 Minuten.',
                lab: 'Troponin stark erhöht!',
                xray: 'Lunge frei, Herzgröße normal.',
                ecg: '⚠️ ST-Hebung in V2–V5 (Akuter Herzinfarkt)!'
            },
            required: ['oxygen', 'meds']
        },
        {
            title: 'Kammerflimmern',
            triage: 'red', complaint: 'Bewusstlos eingeliefert (RTW)',
            hr: 0, spo2: 78, bp: '0/0', temp: '36.4', decay: 2.1,
            findings: {
                anamnesis: 'Patient kollabierte plötzlich im Supermarkt.',
                lab: 'Keine Zeit — sofort handeln!',
                xray: 'Nicht indiziert bei Reanimation.',
                ecg: '🚨 KAMMERFLIMMERN — Defibrillation sofort erforderlich!'
            },
            required: ['defib', 'oxygen']
        },
        {
            title: 'Schwerer Asthma-Anfall',
            triage: 'yellow', complaint: 'Atemnot, pfeifende Atmung',
            hr: 112, spo2: 86, bp: '130/85', temp: '37.0', decay: 1.1,
            findings: {
                anamnesis: 'Bekanntes Asthma, Spray vergessen.',
                lab: 'Blutwerte unauffällig.',
                xray: 'Überblähte Lunge, kein Pneumothorax.',
                ecg: 'Sinustachykardie (112 bpm).'
            },
            required: ['oxygen', 'meds']
        },
        {
            title: 'Unterarmfraktur',
            triage: 'green', complaint: 'Sturz vom Fahrrad, Schmerzen im Arm',
            hr: 84, spo2: 99, bp: '122/78', temp: '36.9', decay: 0.4,
            findings: {
                anamnesis: 'Auf die rechte Hand gefallen, starke Schwellung.',
                lab: 'Normalwerte.',
                xray: '🦴 Glatter Bruch der Speiche (Radiusfraktur)!',
                ecg: 'Unauffällig.'
            },
            required: ['splint']
        },
        {
            title: 'Tiefe Schnittwunde',
            triage: 'yellow', complaint: 'Stark blutende Hand nach Küchenunfall',
            hr: 104, spo2: 97, bp: '105/70', temp: '36.7', decay: 1.0,
            findings: {
                anamnesis: 'Beim Brotschneiden abgerutscht, blutet stark.',
                lab: 'Hb leicht gefallen (Blutverlust).',
                xray: 'Kein Fremdkörper, Knochen intakt.',
                ecg: 'Leichte Tachykardie.'
            },
            required: ['bandage', 'iv']
        },
        {
            title: 'Schwere Dehydration',
            triage: 'green', complaint: 'Schwindel & Schwäche nach Hitzetag',
            hr: 102, spo2: 98, bp: '92/58', temp: '37.8', decay: 0.6,
            findings: {
                anamnesis: 'Kaum getrunken, trockene Schleimhäute.',
                lab: 'Elektrolyte verschoben, Hämatokrit hoch.',
                xray: 'Unauffällig.',
                ecg: 'Normaler Rhythmus.'
            },
            required: ['iv']
        }
    ];

    const NAMES = ['Lukas M.', 'Sophie K.', 'Thomas B.', 'Elena W.', 'Markus R.', 'Hannah S.', 'Jonas D.', 'Clara F.'];

    let patients = [];
    let selectedId = null;
    let nextId = 1;
    let saved = 0;
    let lost = 0;
    let score = 0;
    let soundOn = true;
    let ecgX = 0;

    const dom = {
        queue: document.getElementById('patient-queue'),
        queueCount: document.getElementById('queue-count'),
        monPatient: document.getElementById('mon-patient'),
        monTriage: document.getElementById('mon-triage'),
        vHr: document.getElementById('v-hr'),
        vSpo2: document.getElementById('v-spo2'),
        vBp: document.getElementById('v-bp'),
        vTemp: document.getElementById('v-temp'),
        stabFill: document.getElementById('stab-fill'),
        findings: document.getElementById('findings-list'),
        log: document.getElementById('er-log'),
        statSaved: document.getElementById('stat-saved'),
        statLost: document.getElementById('stat-lost'),
        statScore: document.getElementById('stat-score'),
        canvas: document.getElementById('ecg-canvas')
    };

    function beep(freq = 880, dur = 0.06) {
        if (!soundOn) return;
        try {
            const C = window.AudioContext || window.webkitAudioContext;
            const ctx = new C();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = freq;
            g.gain.setValueAtTime(0.05, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
            o.connect(g); g.connect(ctx.destination);
            o.start(); o.stop(ctx.currentTime + dur + 0.01);
        } catch {}
    }

    function spawnPatient() {
        if (patients.length >= 6) return;
        const tpl = CASES[Math.floor(Math.random() * CASES.length)];
        const p = {
            id: nextId++,
            name: NAMES[Math.floor(Math.random() * NAMES.length)],
            age: 19 + Math.floor(Math.random() * 58),
            caseData: tpl,
            stability: tpl.triage === 'red' ? 68 : (tpl.triage === 'yellow' ? 82 : 95),
            revealed: [],
            treated: []
        };
        patients.push(p);
        if (!selectedId) selectedId = p.id;
        render();
    }

    function getSelected() {
        return patients.find(p => p.id === selectedId) || null;
    }

    function render() {
        dom.statSaved.textContent = saved;
        dom.statLost.textContent = lost;
        dom.statScore.textContent = score;
        dom.queueCount.textContent = patients.length;

        dom.queue.innerHTML = '';
        patients.forEach(p => {
            const card = document.createElement('div');
            card.className = `p-card t-${p.caseData.triage}` + (p.id === selectedId ? ' active' : '');
            card.innerHTML = `
                <div class="p-card-top"><span>${p.name} (${p.age})</span><span>${Math.round(p.stability)}%</span></div>
                <div class="p-card-sub">${p.caseData.complaint}</div>
                <div class="mini-bar"><div class="mini-fill" style="width:${p.stability}%;background:${p.stability < 35 ? '#ef4444' : (p.stability < 65 ? '#eab308' : '#22c55e')}"></div></div>
            `;
            card.addEventListener('click', () => { selectedId = p.id; render(); });
            dom.queue.appendChild(card);
        });

        const cur = getSelected();
        if (!cur) {
            dom.monPatient.textContent = 'Kein Patient im Schockraum';
            dom.monTriage.textContent = '—';
            dom.vHr.textContent = '—'; dom.vSpo2.textContent = '—'; dom.vBp.textContent = '—'; dom.vTemp.textContent = '—';
            dom.stabFill.style.width = '0%';
            dom.findings.innerHTML = '<span class="muted">Wähle links einen Patienten aus der Triage aus.</span>';
            return;
        }

        const c = cur.caseData;
        dom.monPatient.textContent = `${cur.name} (${cur.age} J.) — ${c.complaint}`;
        dom.monTriage.textContent = c.triage === 'red' ? '🔴 LEBENSGEFAHR' : (c.triage === 'yellow' ? '🟡 DRINGEND' : '🟢 NORMAL');
        dom.vHr.textContent = c.hr;
        dom.vSpo2.textContent = c.spo2;
        dom.vBp.textContent = c.bp;
        dom.vTemp.textContent = c.temp;
        dom.stabFill.style.width = `${cur.stability}%`;

        if (!cur.revealed.length) {
            dom.findings.innerHTML = '<span class="muted">Noch keine Diagnostik durchgeführt. Nutze rechts Anamnese, Labor, Röntgen oder EKG!</span>';
        } else {
            dom.findings.innerHTML = cur.revealed.map(k => `<div class="finding-item">${c.findings[k]}</div>`).join('');
        }
    }

    // Live ECG Canvas animation
    const ctx = dom.canvas.getContext('2d');
    function drawECG() {
        const cur = getSelected();
        const w = dom.canvas.width;
        const h = dom.canvas.height;
        ctx.fillStyle = 'rgba(2, 6, 8, 0.14)';
        ctx.fillRect(0, 0, w, h);

        const mid = h / 2;
        let y = mid;
        if (cur) {
            const phase = ecgX % 65;
            if (cur.caseData.hr === 0) {
                y = mid + (Math.random() * 16 - 8); // VF jitter
            } else if (phase === 18) y = mid - 34;
            else if (phase === 21) y = mid + 14;
            else if (phase === 30) y = mid - 8;
        }

        ctx.fillStyle = cur && cur.caseData.hr === 0 ? '#ef4444' : '#22c55e';
        ctx.fillRect(ecgX % w, y, 3, 3);
        ecgX = (ecgX + 2) % w;
        requestAnimationFrame(drawECG);
    }

    // Main simulation tick (1s)
    setInterval(() => {
        for (let i = patients.length - 1; i >= 0; i--) {
            const p = patients[i];
            p.stability = Math.max(0, p.stability - p.caseData.decay);
            if (p.stability <= 0) {
                lost++;
                dom.log.textContent = `💔 ${p.name} (${p.caseData.title}) konnte leider nicht gerettet werden!`;
                beep(220, 0.25);
                if (selectedId === p.id) selectedId = null;
                patients.splice(i, 1);
            }
        }
        render();
    }, 1000);

    // Spawn new patients periodically
    setInterval(spawnPatient, 11000);

    // Diagnostic buttons
    document.querySelectorAll('[data-diag]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cur = getSelected();
            if (!cur) return;
            const key = btn.dataset.diag;
            if (!cur.revealed.includes(key)) cur.revealed.push(key);
            beep(660, 0.05);
            dom.log.textContent = `🔬 Befund erhalten für ${cur.name}.`;
            render();
        });
    });

    // Treatment buttons
    document.querySelectorAll('[data-treat]').forEach(btn => {
        btn.addEventListener('click', () => {
            const cur = getSelected();
            if (!cur) return;
            const key = btn.dataset.treat;
            const req = cur.caseData.required;

            if (req.includes(key)) {
                if (!cur.treated.includes(key)) cur.treated.push(key);
                cur.stability = Math.min(100, cur.stability + 22);
                beep(920, 0.08);

                if (req.every(r => cur.treated.includes(r))) {
                    saved++;
                    const pts = cur.caseData.triage === 'red' ? 200 : (cur.caseData.triage === 'yellow' ? 120 : 80);
                    score += pts;
                    dom.log.textContent = `✅ ${cur.name} (${cur.caseData.title}) erfolgreich stabilisiert & entlassen! (+${pts} Pkt.)`;
                    patients = patients.filter(p => p.id !== cur.id);
                    selectedId = patients[0]?.id || null;
                } else {
                    dom.log.textContent = `👍 Gute Maßnahme! ${cur.name} braucht noch eine weitere Behandlung.`;
                }
            } else {
                cur.stability = Math.max(5, cur.stability - 12);
                beep(260, 0.14);
                dom.log.textContent = `⚠️ Falsche Behandlung für ${cur.name}! Prüfe zuerst die Befunde.`;
            }
            render();
        });
    });

    document.getElementById('btn-sound').addEventListener('click', e => {
        soundOn = !soundOn;
        e.target.textContent = soundOn ? '🔊' : '🔇';
    });

    document.getElementById('btn-new').addEventListener('click', () => {
        patients = []; selectedId = null; saved = 0; lost = 0; score = 0;
        spawnPatient(); spawnPatient();
        dom.log.textContent = 'Neue Schicht in der ZNA gestartet!';
    });

    spawnPatient();
    spawnPatient();
    drawECG();
})();
