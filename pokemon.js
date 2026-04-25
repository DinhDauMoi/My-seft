/**
 * ============================================================
 *  PIXEL POKÉMON WANDERER  — Makes pixel Pokémon roam the page
 *  Sprites: Generation V Black/White animated GIFs (PokeAPI)
 * ============================================================
 */

(function () {
    'use strict';

    /* ── CONFIG ────────────────────────────────────────────── */
    const TOTAL_COUNT    = 8;           // total Pokémon on screen (half of before)
    const POKEBALL_COUNT = 3;           // decorative Pokéballs
    const GROUND_OFFSET  = 60;          // px above the very bottom
    const SPRITE_SIZE    = 68;          // rendered size (px)
    const FLYER_SIZE     = 76;          // flying sprites slightly bigger
    const MIN_SPEED      = 0.4;
    const MAX_SPEED      = 1.6;
    const JUMP_FORCE     = -6;
    const GRAVITY        = 0.25;
    const IDLE_CHANCE    = 0.003;
    const WALK_CHANCE    = 0.01;
    const JUMP_CHANCE    = 0.004;
    const TURN_CHANCE    = 0.005;

    /* ── All Pokémon pool (popular + legendary + flying) ───── */
    const ALL_POKEMON_IDS = [
        1, 4, 6, 7, 12, 17, 18, 21, 22, 25, 39, 41, 49, 52, 54, 58,
        63, 74, 77, 92, 104, 123, 129, 131, 133, 142, 143, 144, 145,
        146, 147, 149, 150, 151, 155, 158, 172, 175, 176, 179, 183,
        187, 193, 196, 197, 198, 225, 226, 227, 246, 249, 250, 252,
        255, 258, 267, 277, 278, 280, 304, 330, 333, 334, 349, 371,
        380, 381, 384, 387, 390, 393, 403, 425, 426, 427, 430, 443,
        447, 468, 469, 472, 479, 495, 498, 501, 521, 527, 570, 587,
        607, 628, 635, 641, 643, 644, 650, 653, 656, 661, 663, 714
    ];

    /* ── Flying-type Pokémon IDs ───────────────────────────── */
    const FLYING_IDS = new Set([
        6,12,17,18,21,22,41,42,49,123,142,144,145,146,149,
        163,164,165,166,169,176,187,188,189,193,198,225,226,
        227,249,250,267,269,277,278,279,291,330,333,334,380,
        381,384,414,415,416,425,426,430,468,469,472,521,527,
        528,561,566,567,580,581,587,628,630,635,641,642,643,
        644,645,646,661,662,663,666,701,714,715,741,797
    ]);

    /* ── Aura colors for flyers (random pick) ─────────────── */
    const AURA_COLORS = [
        '#88DDFF','#FFD700','#FF6347','#D580FF','#FFB6E1','#00BFFF',
        '#C0D8FF','#FF6090','#5070FF','#40FF40','#FF60FF','#80E0FF',
        '#FFA54F','#4080FF','#40C040'
    ];

    /* ── ANIMATED SPRITE URL (Gen V BW) ───────────────────── */
    const spriteURL = id =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;

    /* ── STATIC FALLBACK ──────────────────────────────────── */
    const staticURL = id =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

    /* ── POKÉBALL SVG ─────────────────────────────────────── */
    function createPokeballSVG() {
        return `<svg viewBox="0 0 100 100" width="28" height="28" style="filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5))">
            <circle cx="50" cy="50" r="48" fill="#fff" stroke="#333" stroke-width="4"/>
            <path d="M2 50 A48 48 0 0 0 98 50 Z" fill="#e3350d" stroke="#333" stroke-width="4"/>
            <rect x="2" y="47" width="96" height="6" fill="#333"/>
            <circle cx="50" cy="50" r="14" fill="#fff" stroke="#333" stroke-width="4"/>
            <circle cx="50" cy="50" r="7" fill="#333"/>
        </svg>`;
    }

    /* ── CONTAINER ─────────────────────────────────────────── */
    const container = document.createElement('div');
    container.id = 'pokemon-world';
    container.setAttribute('aria-hidden', 'true');
    Object.assign(container.style, {
        position: 'fixed',
        inset: '0',
        pointerEvents: 'none',
        zIndex: '9998',
        overflow: 'hidden'
    });
    document.body.appendChild(container);

    /* ── GRASS STRIP (decorative) ─────────────────────────── */
    const grass = document.createElement('div');
    grass.id = 'pokemon-grass';
    Object.assign(grass.style, {
        position: 'absolute',
        bottom: '0',
        left: '0',
        width: '100%',
        height: `${GROUND_OFFSET + 10}px`,
        background: 'linear-gradient(to top, rgba(34, 139, 34, 0.12) 0%, rgba(34, 139, 34, 0.04) 60%, transparent 100%)',
        pointerEvents: 'none'
    });
    container.appendChild(grass);

    /* ── UTILITY ───────────────────────────────────────────── */
    const rand = (min, max) => Math.random() * (max - min) + min;
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    /* ── POKÉBALL DECORATIONS ─────────────────────────────── */
    for (let i = 0; i < POKEBALL_COUNT; i++) {
        const ball = document.createElement('div');
        ball.innerHTML = createPokeballSVG();
        Object.assign(ball.style, {
            position: 'absolute',
            bottom: `${rand(8, 30)}px`,
            left: `${rand(5, 92)}%`,
            opacity: String(rand(0.3, 0.6)),
            transform: `rotate(${rand(-30, 30)}deg)`,
            transition: 'transform 0.3s',
            pointerEvents: 'auto',
            cursor: 'pointer',
            zIndex: '9998'
        });
        // wiggle on hover
        ball.addEventListener('mouseenter', () => {
            ball.style.transform = `rotate(${rand(-15, 15)}deg) scale(1.3)`;
            ball.style.opacity = '0.9';
        });
        ball.addEventListener('mouseleave', () => {
            ball.style.transform = `rotate(${rand(-30, 30)}deg) scale(1)`;
            ball.style.opacity = String(rand(0.3, 0.6));
        });
        container.appendChild(ball);
    }

    /* ── POKEMON CLASS ─────────────────────────────────────── */
    class Pokemon {
        constructor(specificId) {
            this.id = specificId || pick(ALL_POKEMON_IDS);
            this.el = document.createElement('div');
            this.el.className = 'pkmn-sprite';

            // Shadow element
            this.shadow = document.createElement('div');
            this.shadow.className = 'pkmn-shadow';
            Object.assign(this.shadow.style, {
                position: 'absolute',
                width: `${SPRITE_SIZE * 0.6}px`,
                height: '8px',
                borderRadius: '50%',
                background: 'rgba(0,0,0,0.25)',
                filter: 'blur(3px)',
                bottom: '-4px',
                left: '50%',
                transform: 'translateX(-50%)',
                transition: 'width 0.2s, opacity 0.2s'
            });

            // Sprite image
            this.img = document.createElement('img');
            this.img.src = spriteURL(this.id);
            this.img.alt = `Pokemon #${this.id}`;
            this.img.draggable = false;
            Object.assign(this.img.style, {
                width: `${SPRITE_SIZE}px`,
                height: `${SPRITE_SIZE}px`,
                imageRendering: 'pixelated',
                display: 'block',
                transition: 'filter 0.3s'
            });
            // Fallback to static if animated 404
            this.img.addEventListener('error', () => {
                this.img.src = staticURL(this.id);
            });

            this.el.appendChild(this.img);
            this.el.appendChild(this.shadow);

            Object.assign(this.el.style, {
                position: 'absolute',
                willChange: 'transform',
                transition: 'none',
                zIndex: String(Math.floor(rand(9998, 10000)))
            });

            container.appendChild(this.el);

            // Physics
            this.groundY = window.innerHeight - GROUND_OFFSET - SPRITE_SIZE;
            this.x = rand(0, window.innerWidth - SPRITE_SIZE);
            this.y = this.groundY;
            this.vx = rand(MIN_SPEED, MAX_SPEED) * (Math.random() < 0.5 ? 1 : -1);
            this.vy = 0;
            this.facingRight = this.vx > 0;
            this.state = 'walk';   // walk | idle | jump
            this.stateTimer = 0;

            this._applyPos();
        }

        _applyPos() {
            this.el.style.transform =
                `translate3d(${this.x}px, ${this.y}px, 0) scaleX(${this.facingRight ? 1 : -1})`;
        }

        update() {
            if (this.state === 'frozen') return; // captured — don't move
            const W = window.innerWidth;
            this.groundY = window.innerHeight - GROUND_OFFSET - SPRITE_SIZE;

            /* ── STATE MACHINE ──────────────────────── */
            switch (this.state) {
                case 'walk':
                    // Maybe idle
                    if (Math.random() < IDLE_CHANCE) {
                        this.state = 'idle';
                        this.stateTimer = rand(60, 200);
                    }
                    // Maybe jump
                    if (Math.random() < JUMP_CHANCE) {
                        this.state = 'jump';
                        this.vy = JUMP_FORCE * rand(0.7, 1.2);
                    }
                    // Maybe turn
                    if (Math.random() < TURN_CHANCE) {
                        this.vx = -this.vx;
                        this.facingRight = this.vx > 0;
                    }
                    this.x += this.vx;
                    break;

                case 'idle':
                    this.stateTimer--;
                    if (this.stateTimer <= 0 || Math.random() < WALK_CHANCE) {
                        this.state = 'walk';
                        this.vx = rand(MIN_SPEED, MAX_SPEED) * (this.facingRight ? 1 : -1);
                    }
                    // Can also jump from idle
                    if (Math.random() < JUMP_CHANCE * 0.5) {
                        this.state = 'jump';
                        this.vy = JUMP_FORCE * rand(0.7, 1.0);
                    }
                    break;

                case 'jump':
                    this.vy += GRAVITY;
                    this.y += this.vy;
                    this.x += this.vx * 0.6;
                    if (this.y >= this.groundY) {
                        this.y = this.groundY;
                        this.vy = 0;
                        this.state = 'walk';
                    }
                    break;
            }

            /* ── BOUNDS ─────────────────────────────── */
            if (this.x < -SPRITE_SIZE) {
                this.x = W;
            } else if (this.x > W) {
                this.x = -SPRITE_SIZE;
            }

            /* ── SHADOW ─────────────────────────────── */
            const airborne = this.groundY - this.y;
            if (airborne > 2) {
                const scale = Math.max(0.3, 1 - airborne / 120);
                this.shadow.style.width  = `${SPRITE_SIZE * 0.6 * scale}px`;
                this.shadow.style.opacity = String(0.25 * scale);
            } else {
                this.shadow.style.width  = `${SPRITE_SIZE * 0.6}px`;
                this.shadow.style.opacity = '0.25';
            }

            this._applyPos();
        }
    }

    /* ── FLYER CLASS (any flying-type Pokémon) ──────────────── */
    class FlyingPokemon {
        constructor(id) {
            this.id = id;
            this.auraColor = pick(AURA_COLORS);
            this.el = document.createElement('div');
            this.el.className = 'pkmn-flyer';

            // Aura glow container
            this.aura = document.createElement('div');
            this.aura.className = 'pkmn-aura';
            Object.assign(this.aura.style, {
                position: 'absolute',
                inset: `-${FLYER_SIZE * 0.35}px`,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${this.auraColor}30 0%, ${this.auraColor}10 40%, transparent 70%)`,
                filter: 'blur(8px)',
                animation: 'aura-pulse 3s ease-in-out infinite',
                pointerEvents: 'none'
            });

            // Sprite image
            this.img = document.createElement('img');
            this.img.src = spriteURL(this.id);
            this.img.alt = `Pokemon #${this.id}`;
            this.img.draggable = false;
            Object.assign(this.img.style, {
                width: `${FLYER_SIZE}px`,
                height: `${FLYER_SIZE}px`,
                imageRendering: 'pixelated',
                display: 'block',
                position: 'relative',
                zIndex: '2',
                filter: `drop-shadow(0 0 6px ${this.auraColor}80)`,
                transition: 'filter 0.3s'
            });
            this.img.addEventListener('error', () => {
                this.img.src = staticURL(this.id);
            });

            // Name tooltip
            this.tooltip = document.createElement('div');
            this.tooltip.className = 'pkmn-tooltip';
            this.tooltip.textContent = `#${this.id}`;
            Object.assign(this.tooltip.style, {
                position: 'absolute',
                bottom: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                fontFamily: 'monospace',
                color: this.auraColor,
                textShadow: `0 0 6px ${this.auraColor}`,
                whiteSpace: 'nowrap',
                opacity: '0',
                transition: 'opacity 0.3s',
                pointerEvents: 'none',
                letterSpacing: '1px',
                textTransform: 'uppercase'
            });

            this.el.appendChild(this.aura);
            this.el.appendChild(this.img);
            this.el.appendChild(this.tooltip);

            Object.assign(this.el.style, {
                position: 'absolute',
                willChange: 'transform',
                transition: 'none',
                zIndex: '10000'
            });

            container.appendChild(this.el);

            // Flight physics
            this.W = window.innerWidth;
            this.H = window.innerHeight;
            this.x = rand(-FLYER_SIZE * 2, this.W);
            // Fly in the upper 40% of the viewport
            this.baseY = rand(60, this.H * 0.35);
            this.y = this.baseY;
            this.speed = rand(0.6, 1.8);
            this.facingRight = Math.random() < 0.5;
            this.direction = this.facingRight ? 1 : -1;
            this.time = rand(0, Math.PI * 2);      // phase offset
            this.waveAmp = rand(15, 40);            // vertical wave amplitude
            this.waveFreq = rand(0.015, 0.035);     // wave frequency
            this.bobAmp = rand(3, 8);               // small secondary bob
            this.bobFreq = rand(0.04, 0.08);
            this.trailTimer = 0;

            this._applyPos();
        }

        _applyPos() {
            this.el.style.transform =
                `translate3d(${this.x}px, ${this.y}px, 0) scaleX(${this.facingRight ? 1 : -1})`;
        }

        update() {
            if (this.state === 'frozen') return; // captured — don't move
            this.W = window.innerWidth;
            this.H = window.innerHeight;
            this.time += this.waveFreq;

            // Horizontal movement
            this.x += this.speed * this.direction;

            // Vertical: sine wave + small bob
            this.y = this.baseY
                + Math.sin(this.time) * this.waveAmp
                + Math.sin(this.time * 2.7) * this.bobAmp;

            // Screen wrap
            if (this.direction > 0 && this.x > this.W + FLYER_SIZE) {
                this.x = -FLYER_SIZE * 2;
                this.baseY = rand(60, this.H * 0.35);
            } else if (this.direction < 0 && this.x < -FLYER_SIZE * 2) {
                this.x = this.W + FLYER_SIZE;
                this.baseY = rand(60, this.H * 0.35);
            }

            // Occasional direction change (rare)
            if (Math.random() < 0.0008) {
                this.direction = -this.direction;
                this.facingRight = this.direction > 0;
            }

            // Particle trail
            this.trailTimer++;
            if (this.trailTimer % 6 === 0) {
                this._spawnTrailParticle();
            }

            this._applyPos();
        }

        _spawnTrailParticle() {
            const particle = document.createElement('div');
            const size = rand(2, 5);
            const px = this.x + FLYER_SIZE / 2 + rand(-10, 10);
            const py = this.y + FLYER_SIZE / 2 + rand(-5, 5);
            Object.assign(particle.style, {
                position: 'absolute',
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                background: this.auraColor,
                left: `${px}px`,
                top: `${py}px`,
                pointerEvents: 'none',
                zIndex: '9997',
                boxShadow: `0 0 ${size * 2}px ${this.auraColor}`,
                opacity: '0.8'
            });
            container.appendChild(particle);

            // Animate the particle fading and drifting down
            particle.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 0.8 },
                { transform: `translate(${rand(-15, 15)}px, ${rand(10, 30)}px) scale(0)`, opacity: 0 }
            ], {
                duration: rand(600, 1200),
                easing: 'ease-out',
                fill: 'forwards'
            }).onfinish = () => particle.remove();
        }
    }

    /* ── SPAWN — auto-assign ground or sky based on type ───── */
    const pokemons = [];
    const flyers = [];
    const usedIds = new Set();
    // Shuffle and pick TOTAL_COUNT unique Pokemon
    const shuffled = [...ALL_POKEMON_IDS].sort(() => Math.random() - 0.5);
    const chosen = shuffled.slice(0, TOTAL_COUNT);
    chosen.forEach((id, i) => {
        setTimeout(() => {
            if (FLYING_IDS.has(id)) {
                flyers.push(new FlyingPokemon(id));
            } else {
                pokemons.push(new Pokemon(id));
            }
        }, i * 500);
    });

    /* ── GAME LOOP ────────────────────────────────────────── */
    function loop() {
        for (const p of pokemons) p.update();
        for (const f of flyers) f.update();
        requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);

    /* ── HANDLE RESIZE ────────────────────────────────────── */
    window.addEventListener('resize', () => {
        for (const p of pokemons) {
            p.groundY = window.innerHeight - GROUND_OFFSET - SPRITE_SIZE;
            if (p.y > p.groundY) p.y = p.groundY;
        }
    });

    /* ══════════════════════════════════════════════════════════
     *  BATTLE SYSTEM + POKÉMON ROTATION (every 2 minutes)
     * ══════════════════════════════════════════════════════════ */
    let isThrowing = false;
    let battleActive = false;

    /* ── Spawn a brand-new Pokemon (not already on screen) ──── */
    function spawnNewPokemon() {
        const activeIds = new Set([
            ...pokemons.map(p => p.id),
            ...flyers.map(f => f.id)
        ]);
        const available = ALL_POKEMON_IDS.filter(id => !activeIds.has(id));
        if (available.length === 0) return;
        const newId = available[Math.floor(Math.random() * available.length)];
        if (FLYING_IDS.has(newId)) {
            flyers.push(new FlyingPokemon(newId));
        } else {
            pokemons.push(new Pokemon(newId));
        }
    }

    /* ── Remove a random Pokemon with fade-out ─────────────── */
    function retirePokemon() {
        // Prefer ground Pokemon if there are some, else flyers
        const allActive = [...pokemons, ...flyers].filter(p => p.state !== 'frozen');
        if (allActive.length <= 2) return null; // keep at least 2
        const victim = allActive[Math.floor(Math.random() * allActive.length)];
        victim.el.style.transition = 'opacity 0.8s';
        victim.el.style.opacity = '0';
        setTimeout(() => {
            victim.el.remove();
            const gi = pokemons.indexOf(victim);
            if (gi >= 0) pokemons.splice(gi, 1);
            const fi = flyers.indexOf(victim);
            if (fi >= 0) flyers.splice(fi, 1);
        }, 800);
        return victim;
    }

    /* ── Pick 2 Pokemon for battle ────────────────────────── */
    function pickBattlePair() {
        const all = [...pokemons, ...flyers].filter(p => p.state !== 'frozen');
        if (all.length < 2) return null;
        const shuffled = all.sort(() => Math.random() - 0.5);
        return [shuffled[0], shuffled[1]];
    }

    /* ── Start a battle ───────────────────────────────────── */
    function triggerBattle() {
        if (battleActive || isThrowing) return;
        const pair = pickBattlePair();
        if (!pair) return;
        const [pkA, pkB] = pair;

        battleActive = true;
        pkA.state = 'frozen';
        pkB.state = 'frozen';

        // Battle overlay
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', zIndex: '20000',
            background: 'rgba(0,0,0,0)', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });
        document.body.appendChild(overlay);

        overlay.animate([
            { background: 'rgba(0,0,0,0)' },
            { background: 'rgba(0,0,0,0.75)' }
        ], { duration: 400, fill: 'forwards' });

        // Arena
        const arena = document.createElement('div');
        Object.assign(arena.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '20px', transform: 'scale(0)'
        });

        const sideA = buildSide(pkA.id, 'left');
        const sideB = buildSide(pkB.id, 'right');

        const vs = document.createElement('div');
        Object.assign(vs.style, {
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '48px', color: '#FFD700',
            textShadow: '0 0 20px #FFD700, 0 0 40px #ff6e84, 0 4px 8px rgba(0,0,0,0.8)',
            letterSpacing: '4px', transform: 'scale(0)'
        });
        vs.textContent = 'VS';

        arena.appendChild(sideA.el);
        arena.appendChild(vs);
        arena.appendChild(sideB.el);
        overlay.appendChild(arena);

        setTimeout(() => {
            arena.animate([
                { transform: 'scale(0) rotate(-10deg)', opacity: 0 },
                { transform: 'scale(1.1) rotate(2deg)', opacity: 1, offset: 0.6 },
                { transform: 'scale(1) rotate(0)', opacity: 1 }
            ], { duration: 500, fill: 'forwards', easing: 'ease-out' });
        }, 300);

        setTimeout(() => {
            vs.animate([
                { transform: 'scale(0) rotate(-20deg)' },
                { transform: 'scale(1.3) rotate(5deg)', offset: 0.5 },
                { transform: 'scale(1) rotate(0)' }
            ], { duration: 400, fill: 'forwards', easing: 'ease-out' });
        }, 600);

        setTimeout(() => runBattleRounds(overlay, sideA, sideB, pkA, pkB), 1200);
    }

    /* ── Build battle side panel ──────────────────────────── */
    function buildSide(id, side) {
        const el = document.createElement('div');
        Object.assign(el.style, {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '8px', minWidth: '100px'
        });
        const img = document.createElement('img');
        img.src = spriteURL(id);
        img.draggable = false;
        Object.assign(img.style, {
            width: '96px', height: '96px', imageRendering: 'pixelated',
            filter: 'drop-shadow(0 0 12px rgba(151,169,255,0.5))',
            transform: side === 'right' ? 'scaleX(-1)' : 'scaleX(1)'
        });
        img.addEventListener('error', () => { img.src = staticURL(id); }, { once: true });

        const hpWrap = document.createElement('div');
        Object.assign(hpWrap.style, {
            width: '90px', height: '8px', borderRadius: '4px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
            overflow: 'hidden'
        });
        const hpBar = document.createElement('div');
        Object.assign(hpBar.style, {
            width: '100%', height: '100%', borderRadius: '4px',
            background: 'linear-gradient(90deg, #4ECDC4, #44d62c)',
            transition: 'width 0.4s ease, background 0.4s'
        });
        hpWrap.appendChild(hpBar);

        const label = document.createElement('div');
        Object.assign(label.style, {
            fontSize: '10px', fontFamily: 'monospace', color: '#97a9ff',
            textShadow: '0 0 6px #97a9ff', letterSpacing: '1px'
        });
        label.textContent = `#${id}`;

        el.appendChild(img);
        el.appendChild(hpWrap);
        el.appendChild(label);
        return { el, img, hpBar, hp: 100 };
    }

    /* ── Run battle rounds ────────────────────────────────── */
    function runBattleRounds(overlay, sideA, sideB, pkA, pkB) {
        const rounds = 3 + Math.floor(Math.random() * 3);
        let round = 0;

        function doRound() {
            if (sideA.hp <= 0 || sideB.hp <= 0 || round >= rounds) {
                if (sideA.hp === sideB.hp) {
                    if (Math.random() < 0.5) sideA.hp = 0; else sideB.hp = 0;
                }
                endBattle(overlay, sideA, sideB, pkA, pkB, sideA.hp > sideB.hp);
                return;
            }
            round++;
            const atk = round % 2 === 1 ? sideA : sideB;
            const def = round % 2 === 1 ? sideB : sideA;
            const dmg = 15 + Math.floor(Math.random() * 25);
            const dir = atk === sideA ? 1 : -1;

            atk.img.animate([
                { transform: `scaleX(${atk === sideB ? -1 : 1}) translateX(0)` },
                { transform: `scaleX(${atk === sideB ? -1 : 1}) translateX(${dir * 30}px)`, offset: 0.3 },
                { transform: `scaleX(${atk === sideB ? -1 : 1}) translateX(0)` }
            ], { duration: 300, easing: 'ease-in-out' });

            setTimeout(() => {
                def.img.animate([
                    { filter: 'brightness(1) drop-shadow(0 0 12px rgba(151,169,255,0.5))' },
                    { filter: 'brightness(3) drop-shadow(0 0 20px #ff3030)', offset: 0.3 },
                    { filter: 'brightness(0.5)', offset: 0.5 },
                    { filter: 'brightness(1) drop-shadow(0 0 12px rgba(151,169,255,0.5))' }
                ], { duration: 400, easing: 'ease-out' });

                const rect = def.img.getBoundingClientRect();
                spawnHitSparks(rect.left + rect.width/2, rect.top + rect.height/2);

                def.hp = Math.max(0, def.hp - dmg);
                def.hpBar.style.width = def.hp + '%';
                if (def.hp < 30) def.hpBar.style.background = 'linear-gradient(90deg, #ff3030, #ff6347)';
                else if (def.hp < 60) def.hpBar.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
            }, 200);

            setTimeout(doRound, 800);
        }
        doRound();
    }

    /* ── Hit sparks ───────────────────────────────────────── */
    function spawnHitSparks(x, y) {
        const colors = ['#FFD700', '#FF6347', '#FFF', '#ff3030'];
        for (let i = 0; i < 6; i++) {
            const s = document.createElement('div');
            const sz = rand(3, 6);
            Object.assign(s.style, {
                position: 'fixed', width: sz+'px', height: sz+'px', borderRadius: '50%',
                background: pick(colors), left: x+'px', top: y+'px',
                pointerEvents: 'none', zIndex: '20002',
                boxShadow: `0 0 6px ${pick(colors)}`
            });
            document.body.appendChild(s);
            const angle = (Math.PI*2/6)*i + rand(-0.3, 0.3);
            const dist = rand(15, 40);
            s.animate([
                { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity: 0 }
            ], { duration: 350, easing: 'ease-out', fill: 'forwards' }).onfinish = () => s.remove();
        }
    }

    /* ── End battle ───────────────────────────────────────── */
    function endBattle(overlay, sideA, sideB, pkA, pkB, aWins) {
        const winner = aWins ? sideA : sideB;
        const loser = aWins ? sideB : sideA;
        const winPk = aWins ? pkA : pkB;
        const losePk = aWins ? pkB : pkA;

        loser.img.animate([
            { transform: `scaleX(${loser === sideB ? -1 : 1}) translateY(0)`, opacity: 1 },
            { transform: `scaleX(${loser === sideB ? -1 : 1}) translateY(30px) rotate(${rand(-20,20)}deg)`, opacity: 0 }
        ], { duration: 500, fill: 'forwards', easing: 'ease-in' });

        winner.img.animate([
            { transform: `scaleX(${winner === sideB ? -1 : 1}) translateY(0)` },
            { transform: `scaleX(${winner === sideB ? -1 : 1}) translateY(-15px)`, offset: 0.4 },
            { transform: `scaleX(${winner === sideB ? -1 : 1}) translateY(0)` }
        ], { duration: 500, easing: 'ease-in-out', iterations: 2 });

        // WIN text
        const winText = document.createElement('div');
        winText.textContent = 'WIN!';
        Object.assign(winText.style, {
            position: 'fixed', left: '50%', top: '38%',
            transform: 'translate(-50%,-50%) scale(0)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '42px', color: '#4ECDC4',
            textShadow: '0 0 15px #4ECDC4, 0 0 30px #44d62c, 0 4px 8px rgba(0,0,0,0.8)',
            pointerEvents: 'none', zIndex: '20003', letterSpacing: '6px'
        });
        document.body.appendChild(winText);
        winText.animate([
            { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1, offset: 0.4 },
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
        ], { duration: 500, fill: 'forwards', easing: 'ease-out' });

        // Close overlay
        setTimeout(() => {
            overlay.animate([
                { background: 'rgba(0,0,0,0.75)' },
                { background: 'rgba(0,0,0,0)' }
            ], { duration: 400, fill: 'forwards' });
            winText.animate([
                { opacity: 1 }, { opacity: 0 }
            ], { duration: 400, fill: 'forwards' }).onfinish = () => winText.remove();

            setTimeout(() => {
                overlay.remove();

                // Winner resumes
                const isFlyer = flyers.includes(winPk);
                if (isFlyer) {
                    winPk.state = undefined;
                } else {
                    winPk.state = 'walk';
                    winPk.vx = rand(MIN_SPEED, MAX_SPEED) * (winPk.facingRight ? 1 : -1);
                }
                winPk.el.style.opacity = '1';
                winPk.el.style.transition = 'none';
                winPk.img.style.filter = 'drop-shadow(0 0 12px #4ECDC4) brightness(1.2)';
                setTimeout(() => {
                    winPk.img.style.transition = 'filter 2s';
                    winPk.img.style.filter = '';
                }, 3000);

                // Loser disappears + replaced with new Pokemon
                losePk.el.style.transition = 'opacity 0.5s';
                losePk.el.style.opacity = '0';
                setTimeout(() => {
                    losePk.el.remove();
                    const gi = pokemons.indexOf(losePk);
                    if (gi >= 0) pokemons.splice(gi, 1);
                    const fi = flyers.indexOf(losePk);
                    if (fi >= 0) flyers.splice(fi, 1);

                    // Spawn replacement
                    spawnNewPokemon();
                }, 600);

                // Also randomly retire 0-1 more and spawn replacements
                if (Math.random() < 0.5) {
                    setTimeout(() => {
                        retirePokemon();
                        setTimeout(spawnNewPokemon, 1000);
                    }, 1500);
                }

                battleActive = false;
            }, 400);
        }, 1800);
    }

    /* ── Timer: trigger battle every 2 minutes ─────────────── */
    setInterval(triggerBattle, 2 * 60 * 1000);


    /* ══════════════════════════════════════════════════════════
     *  POKÉBALL THROWING SYSTEM
     * ══════════════════════════════════════════════════════════ */

    const CATCH_RATE = 0.35;          // 35% chance to catch
    const HIT_RADIUS = 90;           // px — how close click must be to a Pokémon
    const WOBBLE_COUNT = 5;

    /* ── Pokéball SVG (larger, for throwing) ───────────────── */
    function ballSVG(size) {
        return `<svg viewBox="0 0 100 100" width="${size}" height="${size}">
            <circle cx="50" cy="50" r="48" fill="#fff" stroke="#222" stroke-width="5"/>
            <path d="M2 50 A48 48 0 0 0 98 50 Z" fill="#e3350d" stroke="#222" stroke-width="5"/>
            <rect x="2" y="46" width="96" height="8" fill="#222"/>
            <circle cx="50" cy="50" r="16" fill="#fff" stroke="#222" stroke-width="5"/>
            <circle cx="50" cy="50" r="8" fill="#f5f5f5" stroke="#222" stroke-width="3"/>
        </svg>`;
    }

    /* ── Custom Pokéball cursor ────────────────────────────── */
    const cursorBall = document.createElement('div');
    cursorBall.id = 'pokeball-cursor';
    cursorBall.innerHTML = ballSVG(32);
    Object.assign(cursorBall.style, {
        position: 'fixed', pointerEvents: 'none', zIndex: '10005',
        transform: 'translate(-50%, -50%)', transition: 'opacity 0.2s',
        filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.5))', opacity: '0'
    });
    document.body.appendChild(cursorBall);

    // Show Pokéball cursor when hovering over the pokemon container area
    document.addEventListener('mousemove', e => {
        cursorBall.style.left = e.clientX + 'px';
        cursorBall.style.top = e.clientY + 'px';
        cursorBall.style.opacity = '1';
    });
    document.addEventListener('mouseleave', () => { cursorBall.style.opacity = '0'; });

    /* ── Find nearest Pokémon to click point ───────────────── */
    function findNearest(cx, cy) {
        let best = null, bestDist = Infinity;
        const allTargets = [
            ...pokemons.map(p => ({ ref: p, cx: p.x + SPRITE_SIZE/2, cy: p.y + SPRITE_SIZE/2, type: 'ground' })),
            ...flyers.map(f => ({ ref: f, cx: f.x + FLYER_SIZE/2, cy: f.y + FLYER_SIZE/2, type: 'flyer' }))
        ];
        for (const t of allTargets) {
            const dx = t.cx - cx, dy = t.cy - cy;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist < bestDist) { bestDist = dist; best = t; }
        }
        return bestDist <= HIT_RADIUS ? best : null;
    }

    /* ── Throw Pokéball ───────────────────────────────────── */
    document.addEventListener('click', e => {
        if (isThrowing) return;

        const startX = e.clientX, startY = e.clientY;
        const target = findNearest(startX, startY);

        // Create thrown ball
        const ball = document.createElement('div');
        ball.innerHTML = ballSVG(36);
        Object.assign(ball.style, {
            position: 'fixed', left: startX + 'px', top: startY + 'px',
            transform: 'translate(-50%, -50%) scale(0.5)',
            pointerEvents: 'none', zIndex: '10004',
            filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.6))',
            transition: 'none'
        });
        document.body.appendChild(ball);

        if (!target) {
            // MISS — ball flies forward and fades
            animateMiss(ball, startX, startY);
            return;
        }

        // HIT — animate ball toward Pokemon
        isThrowing = true;
        const targetX = target.cx, targetY = target.cy;
        const pokemon = target.ref;
        const isFlyer = target.type === 'flyer';
        const size = isFlyer ? FLYER_SIZE : SPRITE_SIZE;

        // Freeze the Pokemon
        const origState = pokemon.state;
        pokemon.state = 'frozen';

        // Animate ball flying to target (arc trajectory)
        const throwDuration = 400;
        const midY = Math.min(startY, targetY) - 60; // arc peak

        ball.animate([
            { left: startX+'px', top: startY+'px', transform: 'translate(-50%,-50%) scale(0.6) rotate(0deg)' },
            { left: ((startX+targetX)/2)+'px', top: midY+'px', transform: 'translate(-50%,-50%) scale(1) rotate(360deg)', offset: 0.5 },
            { left: targetX+'px', top: targetY+'px', transform: 'translate(-50%,-50%) scale(0.9) rotate(720deg)' }
        ], { duration: throwDuration, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
            // Ball hit! — suck Pokemon into ball
            spawnImpactFlash(targetX, targetY);
            pokemon.el.style.transition = 'transform 0.3s ease-in, opacity 0.3s';
            pokemon.el.style.transform = `translate3d(${targetX - size/2}px, ${targetY - size/2}px, 0) scale(0)`;
            pokemon.el.style.opacity = '0';

            setTimeout(() => {
                // Ball drops to ground
                const groundY = window.innerHeight - GROUND_OFFSET - 10;
                ball.animate([
                    { top: targetY+'px' },
                    { top: groundY+'px' }
                ], { duration: 300, easing: 'ease-in', fill: 'forwards' }).onfinish = () => {
                    // Start wobble sequence
                    wobbleBall(ball, targetX, groundY, pokemon, isFlyer, origState);
                };
            }, 350);
        };
    });

    /* ── Miss animation ───────────────────────────────────── */
    function animateMiss(ball, x, y) {
        const dir = (Math.random() < 0.5 ? -1 : 1) * rand(30, 80);
        ball.animate([
            { left: x+'px', top: y+'px', transform: 'translate(-50%,-50%) scale(0.6) rotate(0deg)', opacity: 1 },
            { left: (x+dir)+'px', top: (y+120)+'px', transform: 'translate(-50%,-50%) scale(0.4) rotate(540deg)', opacity: 0 }
        ], { duration: 600, easing: 'ease-in', fill: 'forwards' }).onfinish = () => ball.remove();
    }

    /* ── Impact flash ─────────────────────────────────────── */
    function spawnImpactFlash(x, y) {
        const flash = document.createElement('div');
        Object.assign(flash.style, {
            position: 'fixed', left: x+'px', top: y+'px',
            width: '60px', height: '60px', borderRadius: '50%',
            background: 'radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 70%)',
            transform: 'translate(-50%,-50%) scale(0.5)',
            pointerEvents: 'none', zIndex: '10003'
        });
        document.body.appendChild(flash);
        flash.animate([
            { transform: 'translate(-50%,-50%) scale(0.5)', opacity: 1 },
            { transform: 'translate(-50%,-50%) scale(2.5)', opacity: 0 }
        ], { duration: 350, easing: 'ease-out', fill: 'forwards' }).onfinish = () => flash.remove();
    }

    /* ── Wobble sequence ──────────────────────────────────── */
    function wobbleBall(ball, x, groundY, pokemon, isFlyer, origState) {
        let wobblesDone = 0;
        const caught = Math.random() < CATCH_RATE;

        function doWobble() {
            if (wobblesDone >= WOBBLE_COUNT) {
                if (caught) {
                    captureSuccess(ball, x, groundY, pokemon, isFlyer);
                } else {
                    captureFail(ball, x, groundY, pokemon, isFlyer, origState);
                }
                return;
            }
            wobblesDone++;

            // Wobble: rotate left → right → center
            ball.animate([
                { transform: 'translate(-50%,-50%) rotate(0deg)' },
                { transform: 'translate(-50%,-50%) rotate(-25deg)', offset: 0.25 },
                { transform: 'translate(-50%,-50%) rotate(25deg)', offset: 0.75 },
                { transform: 'translate(-50%,-50%) rotate(0deg)' }
            ], { duration: 500, easing: 'ease-in-out' }).onfinish = () => {
                // Small pause between wobbles
                setTimeout(doWobble, 200);
            };
        }

        // Small delay before first wobble
        setTimeout(doWobble, 400);
    }

    /* ── Capture SUCCESS ──────────────────────────────────── */
    function captureSuccess(ball, x, groundY, pokemon, isFlyer) {
        // Stars burst
        const colors = ['#FFD700', '#FFF', '#FF6B6B', '#4ECDC4', '#A78BFA'];
        for (let i = 0; i < 12; i++) {
            const star = document.createElement('div');
            star.textContent = '✦';
            Object.assign(star.style, {
                position: 'fixed', left: x+'px', top: groundY+'px',
                fontSize: rand(10,18)+'px', color: pick(colors),
                textShadow: `0 0 8px ${pick(colors)}`,
                pointerEvents: 'none', zIndex: '10006',
                transform: 'translate(-50%,-50%)'
            });
            document.body.appendChild(star);
            const angle = (Math.PI*2/12)*i;
            const dist = rand(40,90);
            star.animate([
                { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity: 0 }
            ], { duration: 700, easing: 'ease-out', fill: 'forwards' }).onfinish = () => star.remove();
        }

        // "Gotcha!" text
        const gotcha = document.createElement('div');
        gotcha.textContent = 'Gotcha!';
        Object.assign(gotcha.style, {
            position: 'fixed', left: x+'px', top: (groundY - 40)+'px',
            transform: 'translate(-50%,-50%) scale(0)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '24px', color: '#FFD700',
            textShadow: '0 0 10px #FFD700, 0 2px 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none', zIndex: '10006', whiteSpace: 'nowrap'
        });
        document.body.appendChild(gotcha);
        gotcha.animate([
            { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1.2)', opacity: 1, offset: 0.3 },
            { transform: 'translate(-50%, calc(-50% - 30px)) scale(1)', opacity: 1, offset: 0.7 },
            { transform: 'translate(-50%, calc(-50% - 50px)) scale(0.8)', opacity: 0 }
        ], { duration: 1500, easing: 'ease-out', fill: 'forwards' }).onfinish = () => gotcha.remove();

        // Ball fades away
        ball.animate([
            { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' },
            { opacity: 0, transform: 'translate(-50%,-50%) scale(0.5)' }
        ], { duration: 800, delay: 600, easing: 'ease-in', fill: 'forwards' }).onfinish = () => ball.remove();

        // Remove the pokemon from the active list
        setTimeout(() => {
            pokemon.el.remove();
            if (isFlyer) {
                const idx = flyers.indexOf(pokemon);
                if (idx >= 0) flyers.splice(idx, 1);
            } else {
                const idx = pokemons.indexOf(pokemon);
                if (idx >= 0) pokemons.splice(idx, 1);
            }
            isThrowing = false;
        }, 1000);
    }

    /* ── Capture FAIL ─────────────────────────────────────── */
    function captureFail(ball, x, groundY, pokemon, isFlyer, origState) {
        // Ball breaks open — flash
        spawnImpactFlash(x, groundY);

        // Ball splits and fades
        ball.animate([
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%,-50%) scale(1.5)', opacity: 0 }
        ], { duration: 400, easing: 'ease-out', fill: 'forwards' }).onfinish = () => ball.remove();

        // Pokemon escapes — reappear at the ball position
        const size = isFlyer ? FLYER_SIZE : SPRITE_SIZE;
        pokemon.x = x - size/2;
        pokemon.y = isFlyer ? rand(60, window.innerHeight * 0.35) : pokemon.groundY;
        pokemon.el.style.transition = 'none';
        pokemon.el.style.opacity = '1';
        pokemon.state = origState === 'frozen' ? 'walk' : origState;
        pokemon.vx = rand(MIN_SPEED, MAX_SPEED) * (Math.random() < 0.5 ? 1 : -1);
        pokemon.facingRight = pokemon.vx > 0;
        if (isFlyer) {
            pokemon.baseY = pokemon.y;
            pokemon.direction = pokemon.facingRight ? 1 : -1;
        }
        pokemon._applyPos();

        // "Oh no!" text
        const ohno = document.createElement('div');
        ohno.textContent = 'Xổng rồi!';
        Object.assign(ohno.style, {
            position: 'fixed', left: x+'px', top: (groundY - 30)+'px',
            transform: 'translate(-50%,-50%)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '700',
            fontSize: '18px', color: '#ff6e84',
            textShadow: '0 0 8px #ff6e84, 0 2px 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none', zIndex: '10006', whiteSpace: 'nowrap'
        });
        document.body.appendChild(ohno);
        ohno.animate([
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
            { transform: 'translate(-50%, calc(-50% - 40px)) scale(0.7)', opacity: 0 }
        ], { duration: 1200, easing: 'ease-out', fill: 'forwards' }).onfinish = () => ohno.remove();

        // Make pokemon flash briefly (escape effect)
        pokemon.el.style.transition = 'opacity 0.1s';
        let flashCount = 0;
        const flashInterval = setInterval(() => {
            pokemon.el.style.opacity = flashCount % 2 === 0 ? '0.3' : '1';
            flashCount++;
            if (flashCount >= 8) {
                clearInterval(flashInterval);
                pokemon.el.style.opacity = '1';
                pokemon.el.style.transition = 'none';
                isThrowing = false;
            }
        }, 100);
    }

    /* ── SPARKLE EFFECT (kept for other uses) ─────────────── */
    function spawnSparkle(x, y) {
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6'];
        for (let i = 0; i < 8; i++) {
            const spark = document.createElement('div');
            Object.assign(spark.style, {
                position: 'absolute', width: '4px', height: '4px',
                borderRadius: '50%', background: pick(colors),
                left: `${x}px`, top: `${y}px`,
                pointerEvents: 'none', zIndex: '10001',
                boxShadow: `0 0 6px ${pick(colors)}`
            });
            container.appendChild(spark);
            const angle = (Math.PI * 2 / 8) * i;
            const dist = rand(20, 50);
            const tx = Math.cos(angle) * dist;
            const ty = Math.sin(angle) * dist - 20;
            spark.animate([
                { transform: 'translate(0,0) scale(1)', opacity: 1 },
                { transform: `translate(${tx}px,${ty}px) scale(0)`, opacity: 0 }
            ], { duration: 500, easing: 'cubic-bezier(.25,.46,.45,.94)', fill: 'forwards' }).onfinish = () => spark.remove();
        }
    }

    /* ── CSS (injected) ───────────────────────────────────── */
    const style = document.createElement('style');
    style.textContent = `
        #pokemon-world {
            font-size: 0;
            line-height: 0;
        }
        /* Hide default cursor over the page body */
        body { cursor: none !important; }
        body a, body button, body input, body textarea, body select {
            cursor: none !important;
        }
        #pokeball-cursor {
            transition: transform 0.15s ease;
        }
        .pkmn-sprite {
            pointer-events: auto;
            cursor: none;
        }
        .pkmn-sprite img {
            pointer-events: none;
        }
        .pkmn-sprite:hover img {
            filter: brightness(1.3) drop-shadow(0 0 8px rgba(255,215,0,0.7));
        }
        /* ── FLYER STYLES ─── */
        .pkmn-flyer {
            pointer-events: auto;
            cursor: none;
        }
        .pkmn-flyer img {
            pointer-events: none;
        }
        .pkmn-flyer:hover img {
            filter: brightness(1.4) drop-shadow(0 0 14px var(--aura-color, #D580FF)) !important;
        }
        .pkmn-flyer:hover .pkmn-tooltip {
            opacity: 1 !important;
        }
        .pkmn-flyer:hover .pkmn-aura {
            filter: blur(12px) brightness(1.5) !important;
        }
        @keyframes aura-pulse {
            0%, 100% { opacity: 0.6; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.15); }
        }
        @media (max-width: 768px) {
            body { cursor: auto !important; }
            #pokeball-cursor { display: none !important; }
            .pkmn-sprite img {
                width: 48px !important;
                height: 48px !important;
            }
            .pkmn-flyer img {
                width: 56px !important;
                height: 56px !important;
            }
        }
    `;
    document.head.appendChild(style);

})();

