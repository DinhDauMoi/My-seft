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
            if (this.state === 'frozen' || this.state === 'battling') return;
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
            if (this.state === 'frozen' || this.state === 'battling') return;
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
        checkForBattle();
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
     *  HOMEPAGE IN-PLACE BATTLE SYSTEM
     *  - Pokemon fight where they stand (no center overlay)
     *  - HP bars appear on sprites during battle
     *  - No background blur/dim
     *  - Loser fades out, new Pokemon spawns
     *  - Random chance triggers battles when nearby
     * ══════════════════════════════════════════════════════════ */
    let battleActive = false;
    const BATTLE_PROXIMITY = 120;
    // Battle every 6 hours
    const BATTLE_COOLDOWN = 6 * 60 * 60 * 1000; // 6 hours in ms
    let lastBattleTime = parseInt(localStorage.getItem('pkLastBattle') || '0');
    function canBattle() {
        return Date.now() - lastBattleTime >= BATTLE_COOLDOWN;
    }
    function markBattled() {
        lastBattleTime = Date.now();
        localStorage.setItem('pkLastBattle', String(lastBattleTime));
    }
    const BATTLE_CHANCE = 0.0004;

    function addHpBar(pk) {
        if (pk._hpBarWrap) return;
        const wrap = document.createElement('div');
        Object.assign(wrap.style, {
            position: 'absolute', top: '-10px', left: '50%',
            transform: 'translateX(-50%)', width: '50px', height: '6px',
            borderRadius: '3px', background: 'rgba(0,0,0,0.6)',
            border: '1px solid rgba(255,255,255,0.15)',
            overflow: 'hidden', zIndex: '10010',
            boxShadow: '0 0 6px rgba(0,0,0,0.4)',
            opacity: '0', transition: 'opacity 0.3s'
        });
        const bar = document.createElement('div');
        Object.assign(bar.style, {
            width: '100%', height: '100%', borderRadius: '3px',
            background: 'linear-gradient(90deg, #4ECDC4, #44d62c)',
            transition: 'width 0.4s ease, background 0.4s'
        });
        wrap.appendChild(bar);
        pk.el.appendChild(wrap);
        pk._hpBarWrap = wrap;
        pk._hpBar = bar;
        pk._hp = 100;
        setTimeout(() => { wrap.style.opacity = '1'; }, 50);
    }

    function removeHpBar(pk) {
        if (pk._hpBarWrap) {
            pk._hpBarWrap.style.opacity = '0';
            setTimeout(() => {
                if (pk._hpBarWrap) pk._hpBarWrap.remove();
                pk._hpBarWrap = null;
                pk._hpBar = null;
            }, 300);
        }
    }

    function updateHpBar(pk) {
        if (!pk._hpBar) return;
        pk._hpBar.style.width = pk._hp + '%';
        if (pk._hp < 30) pk._hpBar.style.background = 'linear-gradient(90deg, #ff3030, #ff6347)';
        else if (pk._hp < 60) pk._hpBar.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
    }

    /* ── MOVE / SKILL DATABASE ────────────────────────────────── */
    const POKEMON_TYPES = {
        // Fire
        4: 'fire', 6: 'fire', 77: 'fire', 155: 'fire', 390: 'fire',
        255: 'fire', 498: 'fire', 607: 'fire', 653: 'fire',
        // Water
        7: 'water', 54: 'water', 129: 'water', 131: 'water', 158: 'water',
        183: 'water', 258: 'water', 349: 'water', 393: 'water',
        501: 'water', 656: 'water',
        // Electric
        25: 'electric', 145: 'electric', 172: 'electric', 179: 'electric',
        403: 'electric', 479: 'electric', 587: 'electric',
        // Grass
        1: 'grass', 187: 'grass', 252: 'grass', 387: 'grass',
        495: 'grass', 650: 'grass',
        // Psychic
        63: 'psychic', 150: 'psychic', 151: 'psychic', 196: 'psychic',
        280: 'psychic',
        // Dark
        52: 'dark', 197: 'dark', 198: 'dark', 430: 'dark', 570: 'dark',
        // Dragon
        147: 'dragon', 149: 'dragon', 246: 'dragon', 371: 'dragon',
        384: 'dragon', 443: 'dragon', 635: 'dragon', 714: 'dragon',
        // Ice
        144: 'ice', 225: 'ice',
        // Ghost
        92: 'ghost', 425: 'ghost', 426: 'ghost',
        // Fighting
        447: 'fighting', 304: 'fighting',
        // Fairy
        39: 'fairy', 175: 'fairy', 176: 'fairy', 468: 'fairy', 427: 'fairy',
        // Normal
        133: 'normal', 143: 'normal',
        // Rock
        74: 'rock', 104: 'rock', 142: 'rock',
        // Bug
        12: 'bug', 123: 'bug', 267: 'bug',
        // Flying
        17: 'flying', 18: 'flying', 21: 'flying', 22: 'flying',
        146: 'flying', 249: 'flying', 250: 'flying', 277: 'flying',
        278: 'flying', 333: 'flying', 334: 'flying', 380: 'flying',
        381: 'flying', 469: 'flying', 472: 'flying', 521: 'flying',
        527: 'flying', 628: 'flying', 641: 'flying', 643: 'flying',
        644: 'flying', 661: 'flying', 663: 'flying',
        // Poison
        41: 'poison', 49: 'poison',
        // Ground
        330: 'ground',
    };

    const MOVE_DATA = {
        fire:     { moves: ['Flamethrower', 'Fire Blast', 'Ember', 'Fire Punch'],       color: '#FF4500', sparkColors: ['#FF4500','#FF6347','#FFD700','#FF8C00'], emoji: '🔥' },
        water:    { moves: ['Hydro Pump', 'Surf', 'Water Gun', 'Aqua Tail'],            color: '#1E90FF', sparkColors: ['#1E90FF','#00BFFF','#87CEEB','#4169E1'], emoji: '💧' },
        electric: { moves: ['Thunderbolt', 'Thunder', 'Spark', 'Volt Tackle'],          color: '#FFD700', sparkColors: ['#FFD700','#FFF700','#FFFF00','#FFA500'], emoji: '⚡' },
        grass:    { moves: ['Solar Beam', 'Razor Leaf', 'Vine Whip', 'Leaf Storm'],     color: '#32CD32', sparkColors: ['#32CD32','#228B22','#90EE90','#00FF00'], emoji: '🍃' },
        psychic:  { moves: ['Psychic', 'Psybeam', 'Confusion', 'Future Sight'],        color: '#FF69B4', sparkColors: ['#FF69B4','#DA70D6','#EE82EE','#FF1493'], emoji: '🔮' },
        dark:     { moves: ['Dark Pulse', 'Shadow Ball', 'Crunch', 'Night Slash'],      color: '#483D8B', sparkColors: ['#483D8B','#6A5ACD','#191970','#800080'], emoji: '🌑' },
        dragon:   { moves: ['Dragon Claw', 'Draco Meteor', 'Dragon Pulse', 'Outrage'],  color: '#7B68EE', sparkColors: ['#7B68EE','#6A5ACD','#9370DB','#8A2BE2'], emoji: '🐉' },
        ice:      { moves: ['Ice Beam', 'Blizzard', 'Frost Breath', 'Ice Punch'],       color: '#00CED1', sparkColors: ['#00CED1','#AFEEEE','#E0FFFF','#B0E0E6'], emoji: '❄️' },
        ghost:    { moves: ['Shadow Ball', 'Hex', 'Phantom Force', 'Night Shade'],      color: '#8B008B', sparkColors: ['#8B008B','#9932CC','#BA55D3','#4B0082'], emoji: '👻' },
        fighting: { moves: ['Close Combat', 'Aura Sphere', 'Brick Break', 'Hi Jump Kick'], color: '#CD853F', sparkColors: ['#CD853F','#D2691E','#F4A460','#FF8C00'], emoji: '👊' },
        fairy:    { moves: ['Moonblast', 'Dazzling Gleam', 'Play Rough', 'Fairy Wind'], color: '#FFB6C1', sparkColors: ['#FFB6C1','#FF69B4','#FFC0CB','#FF1493'], emoji: '✨' },
        normal:   { moves: ['Tackle', 'Hyper Beam', 'Body Slam', 'Quick Attack'],       color: '#C0C0C0', sparkColors: ['#C0C0C0','#DCDCDC','#FFF','#A9A9A9'],    emoji: '💥' },
        rock:     { moves: ['Rock Slide', 'Stone Edge', 'Rock Throw', 'Smack Down'],    color: '#B8860B', sparkColors: ['#B8860B','#DAA520','#CD853F','#8B7355'], emoji: '🪨' },
        bug:      { moves: ['X-Scissor', 'Bug Buzz', 'Signal Beam', 'Fury Cutter'],     color: '#9ACD32', sparkColors: ['#9ACD32','#6B8E23','#556B2F','#ADFF2F'], emoji: '🐛' },
        flying:   { moves: ['Air Slash', 'Hurricane', 'Brave Bird', 'Aerial Ace'],      color: '#87CEEB', sparkColors: ['#87CEEB','#B0C4DE','#ADD8E6','#4682B4'], emoji: '🌪️' },
        poison:   { moves: ['Sludge Bomb', 'Poison Jab', 'Toxic', 'Venoshock'],         color: '#9932CC', sparkColors: ['#9932CC','#8B008B','#BA55D3','#DA70D6'], emoji: '☠️' },
        ground:   { moves: ['Earthquake', 'Earth Power', 'Dig', 'Mud Shot'],            color: '#D2B48C', sparkColors: ['#D2B48C','#DEB887','#F4A460','#8B7355'], emoji: '🌍' },
    };

    function getMovesForPokemon(id) {
        const type = POKEMON_TYPES[id] || 'normal';
        return MOVE_DATA[type] || MOVE_DATA.normal;
    }

    /* ── Show move name floating above attacker ──────────────── */
    function showMoveName(pk, moveName, color, emoji) {
        const label = document.createElement('div');
        label.textContent = `${emoji} ${moveName}`;
        Object.assign(label.style, {
            position: 'absolute', top: '-24px', left: '50%',
            transform: 'translateX(-50%) scale(0)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '800',
            fontSize: '11px', color: color,
            textShadow: `0 0 6px ${color}, 0 1px 3px rgba(0,0,0,0.9)`,
            pointerEvents: 'none', zIndex: '10014', whiteSpace: 'nowrap',
            letterSpacing: '0.5px', lineHeight: '1'
        });
        pk.el.appendChild(label);
        label.animate([
            { transform: 'translateX(-50%) scale(0) translateY(0)', opacity: 0 },
            { transform: 'translateX(-50%) scale(1.1) translateY(-2px)', opacity: 1, offset: 0.2 },
            { transform: 'translateX(-50%) scale(1) translateY(-4px)', opacity: 1, offset: 0.6 },
            { transform: 'translateX(-50%) scale(0.8) translateY(-14px)', opacity: 0 }
        ], { duration: 900, fill: 'forwards', easing: 'ease-out' }).onfinish = () => label.remove();
    }

    /* ── Type-colored battle sparks ──────────────────────────── */
    function spawnBattleSparks(x, y, sparkColors) {
        const colors = sparkColors || ['#FFD700', '#FF6347', '#FFF', '#ff3030'];
        for (let i = 0; i < 6; i++) {
            const s = document.createElement('div');
            const sz = rand(3, 6);
            Object.assign(s.style, {
                position: 'absolute', width: sz+'px', height: sz+'px',
                borderRadius: '50%', background: pick(colors),
                left: x+'px', top: y+'px',
                pointerEvents: 'none', zIndex: '10012',
                boxShadow: `0 0 6px ${pick(colors)}`
            });
            container.appendChild(s);
            const angle = (Math.PI*2/6)*i + rand(-0.3,0.3);
            const dist = rand(12, 35);
            s.animate([
                { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity: 0 }
            ], { duration: 350, easing: 'ease-out', fill: 'forwards' }).onfinish = () => s.remove();
        }
    }

    /* ── Type-specific PARTICLE EFFECTS ─────────────────────── */
    function spawnTypeEffect(x, y, type) {
        const data = MOVE_DATA[type] || MOVE_DATA.normal;
        // Ring burst (kept)
        const ring = document.createElement('div');
        Object.assign(ring.style, {
            position: 'absolute', left: x+'px', top: y+'px',
            width: '10px', height: '10px', borderRadius: '50%',
            border: `2px solid ${data.color}`,
            boxShadow: `0 0 8px ${data.color}, inset 0 0 4px ${data.color}40`,
            transform: 'translate(-50%,-50%) scale(0.5)',
            pointerEvents: 'none', zIndex: '10013', opacity: '0.9'
        });
        container.appendChild(ring);
        ring.animate([
            { transform: 'translate(-50%,-50%) scale(0.5)', opacity: 0.9 },
            { transform: 'translate(-50%,-50%) scale(3)', opacity: 0 }
        ], { duration: 400, easing: 'ease-out', fill: 'forwards' }).onfinish = () => ring.remove();

        // Type-specific particles
        const FX = {
            fire: () => {
                for (let i = 0; i < 8; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['🔥','🔥','✦','●']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-15,15)+'px', top:y+rand(-10,10)+'px',
                        fontSize: rand(8,16)+'px', pointerEvents:'none', zIndex:'10014',
                        filter: `drop-shadow(0 0 4px #FF4500)`
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'translateY(0) scale(1)', opacity:1 },
                        { transform:`translateY(${-rand(25,55)}px) translateX(${rand(-12,12)}px) scale(0.3)`, opacity:0 }
                    ], { duration: rand(400,700), easing:'ease-out', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            water: () => {
                for (let i = 0; i < 10; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['💧','💦','•','○']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+'px', top:y+'px',
                        fontSize: rand(6,14)+'px', color:'#1E90FF',
                        pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 3px #00BFFF)'
                    });
                    container.appendChild(p);
                    const angle = (Math.PI*2/10)*i + rand(-0.3,0.3);
                    const dist = rand(18,45);
                    p.animate([
                        { transform:'translate(-50%,-50%) scale(1.2)', opacity:1 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity:0 }
                    ], { duration: rand(350,550), easing:'ease-out', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            electric: () => {
                // Lightning bolts
                for (let i = 0; i < 4; i++) {
                    const bolt = document.createElement('div');
                    bolt.textContent = '⚡';
                    Object.assign(bolt.style, {
                        position:'absolute', left:x+rand(-20,20)+'px', top:y+rand(-25,5)+'px',
                        fontSize: rand(14,24)+'px', pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 6px #FFD700) drop-shadow(0 0 12px #FFF700)',
                        opacity:'0'
                    });
                    container.appendChild(bolt);
                    bolt.animate([
                        { opacity:0, transform:'scale(0.3) rotate(-20deg)' },
                        { opacity:1, transform:'scale(1.2) rotate(0deg)', offset:0.15 },
                        { opacity:1, transform:'scale(1) rotate(5deg)', offset:0.4 },
                        { opacity:0, transform:'scale(0.5) translateY(-15px) rotate(-10deg)' }
                    ], { duration: rand(350,550), delay: i*60, fill:'forwards' }).onfinish = () => bolt.remove();
                }
                // Electric crackle lines
                for (let i = 0; i < 6; i++) {
                    const line = document.createElement('div');
                    const len = rand(12,28);
                    Object.assign(line.style, {
                        position:'absolute', left:x+'px', top:y+'px',
                        width:len+'px', height:'2px',
                        background:'linear-gradient(90deg, #FFD700, #FFF700, transparent)',
                        transform:`rotate(${rand(0,360)}deg)`, transformOrigin:'left center',
                        pointerEvents:'none', zIndex:'10014',
                        boxShadow:'0 0 4px #FFD700'
                    });
                    container.appendChild(line);
                    line.animate([
                        { opacity:1, width:len+'px' },
                        { opacity:0, width:'0px' }
                    ], { duration: rand(200,400), delay: rand(0,150), fill:'forwards' }).onfinish = () => line.remove();
                }
            },
            grass: () => {
                const leaves = ['🍃','🌿','🍀','🌱'];
                for (let i = 0; i < 8; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(leaves);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-10,10)+'px', top:y+rand(-10,10)+'px',
                        fontSize: rand(8,16)+'px', pointerEvents:'none', zIndex:'10014'
                    });
                    container.appendChild(p);
                    const dx = rand(-35,35), dy = rand(-40,-10);
                    p.animate([
                        { transform:'scale(1) rotate(0deg)', opacity:1 },
                        { transform:`translate(${dx}px,${dy}px) scale(0.4) rotate(${rand(-180,180)}deg)`, opacity:0 }
                    ], { duration: rand(500,800), delay: i*40, easing:'ease-out', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            ice: () => {
                const flakes = ['❄️','❄','✧','✦'];
                for (let i = 0; i < 8; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(flakes);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-15,15)+'px', top:y+rand(-15,15)+'px',
                        fontSize: rand(8,16)+'px', color:'#B0E0E6',
                        pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 4px #00CED1)'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'scale(1.2) rotate(0deg)', opacity:1 },
                        { transform:`translate(${rand(-25,25)}px,${rand(15,35)}px) scale(0) rotate(${rand(60,180)}deg)`, opacity:0 }
                    ], { duration: rand(500,800), delay: i*50, easing:'ease-out', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            psychic: () => {
                for (let i = 0; i < 6; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['🔮','✦','◆','★']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+'px', top:y+'px',
                        fontSize: rand(8,14)+'px', color:'#FF69B4',
                        pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 5px #FF69B4)'
                    });
                    container.appendChild(p);
                    const angle = (Math.PI*2/6)*i;
                    const dist = rand(20,40);
                    p.animate([
                        { transform:'translate(-50%,-50%) scale(0) rotate(0deg)', opacity:0 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist*0.5}px), calc(-50% + ${Math.sin(angle)*dist*0.5}px)) scale(1.3) rotate(180deg)`, opacity:1, offset:0.4 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0) rotate(360deg)`, opacity:0 }
                    ], { duration: rand(500,700), fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            ghost: () => {
                for (let i = 0; i < 5; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['👻','💀','🌑','◉']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-15,15)+'px', top:y+rand(-10,10)+'px',
                        fontSize: rand(10,18)+'px', pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 6px #8B008B)'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'translateY(0) scale(0.5)', opacity:0 },
                        { transform:'translateY(-5px) scale(1.2)', opacity:0.9, offset:0.3 },
                        { transform:`translateY(${-rand(20,40)}px) translateX(${rand(-20,20)}px) scale(0)`, opacity:0 }
                    ], { duration: rand(600,900), delay: i*80, fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            dragon: () => {
                for (let i = 0; i < 7; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['🐉','💎','✦','◆']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+'px', top:y+'px',
                        fontSize: rand(8,16)+'px', color: pick(['#7B68EE','#9370DB','#8A2BE2']),
                        pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 4px #7B68EE)'
                    });
                    container.appendChild(p);
                    const angle = (Math.PI*2/7)*i;
                    const dist = rand(20,45);
                    p.animate([
                        { transform:'translate(-50%,-50%) scale(1.5)', opacity:1 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0) rotate(${rand(-90,90)}deg)`, opacity:0 }
                    ], { duration: rand(400,650), fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            dark: () => {
                for (let i = 0; i < 6; i++) {
                    const p = document.createElement('div');
                    const sz = rand(6,14);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-12,12)+'px', top:y+rand(-12,12)+'px',
                        width:sz+'px', height:sz+'px', borderRadius:'50%',
                        background:'radial-gradient(circle, #483D8B 0%, #191970 60%, transparent 100%)',
                        pointerEvents:'none', zIndex:'10014',
                        boxShadow:'0 0 8px #191970'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'scale(1.5)', opacity:0.8 },
                        { transform:`translate(${rand(-20,20)}px,${rand(-20,20)}px) scale(0)`, opacity:0 }
                    ], { duration: rand(400,700), delay: i*50, fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            fighting: () => {
                const fists = ['👊','💢','💥','✊'];
                for (let i = 0; i < 5; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(fists);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-15,15)+'px', top:y+rand(-10,10)+'px',
                        fontSize: rand(10,18)+'px', pointerEvents:'none', zIndex:'10014'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'scale(0) rotate(-30deg)', opacity:0 },
                        { transform:'scale(1.3) rotate(0deg)', opacity:1, offset:0.2 },
                        { transform:`translate(${rand(-20,20)}px,${rand(-25,5)}px) scale(0) rotate(${rand(-45,45)}deg)`, opacity:0 }
                    ], { duration: rand(350,550), delay: i*60, fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            fairy: () => {
                const stars = ['✨','⭐','✦','💖','★'];
                for (let i = 0; i < 8; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(stars);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-10,10)+'px', top:y+rand(-10,10)+'px',
                        fontSize: rand(6,14)+'px', pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 3px #FFB6C1)'
                    });
                    container.appendChild(p);
                    const angle = (Math.PI*2/8)*i;
                    const dist = rand(15,35);
                    p.animate([
                        { transform:'translate(-50%,-50%) scale(0)', opacity:0 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist*0.6}px), calc(-50% + ${Math.sin(angle)*dist*0.6}px)) scale(1.3)`, opacity:1, offset:0.35 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity:0 }
                    ], { duration: rand(500,750), fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            flying: () => {
                for (let i = 0; i < 6; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['🌪️','💨','〰','≋']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-10,10)+'px', top:y+rand(-5,5)+'px',
                        fontSize: rand(10,18)+'px', color:'#87CEEB',
                        pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 3px #87CEEB)'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'translateX(0) scale(1)', opacity:1 },
                        { transform:`translateX(${rand(25,50) * (Math.random()<0.5?1:-1)}px) translateY(${rand(-15,15)}px) scale(0.3)`, opacity:0 }
                    ], { duration: rand(400,650), delay: i*50, easing:'ease-out', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            poison: () => {
                for (let i = 0; i < 6; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['☠️','💀','●','◉']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-10,10)+'px', top:y+rand(-5,10)+'px',
                        fontSize: rand(8,14)+'px', color:'#9932CC',
                        pointerEvents:'none', zIndex:'10014',
                        filter:'drop-shadow(0 0 4px #9932CC)'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'scale(1) translateY(0)', opacity:0.9 },
                        { transform:`scale(0.3) translateY(${-rand(20,40)}px) translateX(${rand(-15,15)}px)`, opacity:0 }
                    ], { duration: rand(500,750), delay: i*60, fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            rock: () => {
                for (let i = 0; i < 6; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['🪨','◆','■','▲']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-8,8)+'px', top:y+rand(-8,8)+'px',
                        fontSize: rand(8,14)+'px', color:'#B8860B',
                        pointerEvents:'none', zIndex:'10014'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'scale(1.2) translateY(0)', opacity:1 },
                        { transform:`translate(${rand(-18,18)}px,${rand(15,35)}px) scale(0) rotate(${rand(-90,90)}deg)`, opacity:0 }
                    ], { duration: rand(350,550), delay: i*40, easing:'ease-in', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            bug: () => {
                for (let i = 0; i < 5; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['🐛','✂','✦','×']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-12,12)+'px', top:y+rand(-12,12)+'px',
                        fontSize: rand(8,14)+'px', color:'#9ACD32',
                        pointerEvents:'none', zIndex:'10014'
                    });
                    container.appendChild(p);
                    const angle = (Math.PI*2/5)*i;
                    const dist = rand(15,30);
                    p.animate([
                        { transform:'translate(-50%,-50%) scale(1)', opacity:1 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0) rotate(180deg)`, opacity:0 }
                    ], { duration: rand(300,500), fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            ground: () => {
                for (let i = 0; i < 7; i++) {
                    const p = document.createElement('div');
                    const sz = rand(4,8);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-15,15)+'px', top:y+5+'px',
                        width:sz+'px', height:sz+'px', borderRadius: rand(0,1) > 0.5 ? '50%' : '2px',
                        background: pick(['#D2B48C','#DEB887','#8B7355','#CD853F']),
                        pointerEvents:'none', zIndex:'10014'
                    });
                    container.appendChild(p);
                    p.animate([
                        { transform:'translateY(0) scale(1)', opacity:1 },
                        { transform:`translate(${rand(-20,20)}px,${-rand(15,35)}px) scale(0)`, opacity:0 }
                    ], { duration: rand(350,550), delay: i*30, easing:'ease-out', fill:'forwards' }).onfinish = () => p.remove();
                }
            },
            normal: () => {
                for (let i = 0; i < 5; i++) {
                    const p = document.createElement('div');
                    p.textContent = pick(['💥','✦','★','●']);
                    Object.assign(p.style, {
                        position:'absolute', left:x+rand(-10,10)+'px', top:y+rand(-10,10)+'px',
                        fontSize: rand(8,14)+'px', color:'#C0C0C0',
                        pointerEvents:'none', zIndex:'10014'
                    });
                    container.appendChild(p);
                    const angle = (Math.PI*2/5)*i;
                    const dist = rand(15,30);
                    p.animate([
                        { transform:'translate(-50%,-50%) scale(1)', opacity:1 },
                        { transform:`translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity:0 }
                    ], { duration: 400, fill:'forwards' }).onfinish = () => p.remove();
                }
            }
        };

        (FX[type] || FX.normal)();
    }

    function findBattlePair() {
        // All active Pokemon (ground + flyers)
        const all = [
            ...pokemons.filter(p => p.state !== 'frozen' && p.state !== 'battling'),
            ...flyers.filter(f => f.state !== 'frozen' && f.state !== 'battling')
        ];
        // Flyers use wider proximity since they move faster
        const FLYER_PROXIMITY = 160;
        for (let i = 0; i < all.length; i++) {
            for (let j = i+1; j < all.length; j++) {
                const dx = all[i].x - all[j].x;
                const dy = all[i].y - all[j].y;
                const dist = Math.sqrt(dx*dx+dy*dy);
                const isFlying = flyers.includes(all[i]) || flyers.includes(all[j]);
                const threshold = isFlying ? FLYER_PROXIMITY : BATTLE_PROXIMITY;
                if (dist < threshold) {
                    return [all[i], all[j]];
                }
            }
        }
        return null;
    }

    /* ── Lunge attack with move name + type effects ──────────── */
    function lungeAttack(attacker, defender, cb) {
        const dir = attacker.x < defender.x ? 1 : -1;
        const moveData = getMovesForPokemon(attacker.id);
        const moveName = pick(moveData.moves);

        // Show move name above attacker
        showMoveName(attacker, moveName, moveData.color, moveData.emoji);

        attacker.el.animate([
            { transform: `translate3d(${attacker.x}px, ${attacker.y}px, 0) scaleX(${dir > 0 ? 1 : -1})` },
            { transform: `translate3d(${attacker.x + dir*22}px, ${attacker.y}px, 0) scaleX(${dir > 0 ? 1 : -1})`, offset: 0.4 },
            { transform: `translate3d(${attacker.x}px, ${attacker.y}px, 0) scaleX(${dir > 0 ? 1 : -1})` }
        ], { duration: 300, easing: 'ease-in-out' });

        setTimeout(() => {
            const type = POKEMON_TYPES[attacker.id] || 'normal';
            // Type-colored hit flash
            defender.img.animate([
                { filter: 'brightness(1)' },
                { filter: `brightness(2.5) hue-rotate(${type === 'fire' ? '0' : type === 'water' ? '200' : type === 'electric' ? '50' : '0'}deg)`, offset: 0.3 },
                { filter: 'brightness(0.6)', offset: 0.5 },
                { filter: 'brightness(1)' }
            ], { duration: 350, easing: 'ease-out' });

            const hitX = defender.x + SPRITE_SIZE/2;
            const hitY = defender.y + SPRITE_SIZE/2;
            spawnBattleSparks(hitX, hitY, moveData.sparkColors);
            spawnTypeEffect(hitX, hitY, type);
            if (cb) cb();
        }, 180);
    }

    function startHomeBattle(pkA, pkB) {
        if (battleActive) return;
        battleActive = true;
        pkA.state = 'battling';
        pkB.state = 'battling';
        pkA.facingRight = pkA.x < pkB.x;
        pkB.facingRight = pkB.x < pkA.x;
        pkA._applyPos();
        pkB._applyPos();
        addHpBar(pkA);
        addHpBar(pkB);

        const totalRounds = 3 + Math.floor(Math.random() * 3);
        let round = 0;
        function doRound() {
            if (pkA._hp <= 0 || pkB._hp <= 0 || round >= totalRounds) {
                if (pkA._hp === pkB._hp) {
                    if (Math.random() < 0.5) pkA._hp = 0; else pkB._hp = 0;
                }
                finishBattle(pkA, pkB);
                return;
            }
            round++;
            const atk = round % 2 === 1 ? pkA : pkB;
            const def = round % 2 === 1 ? pkB : pkA;
            const dmg = typeof calcTypeDamage === 'function'
                ? calcTypeDamage(15 + Math.floor(Math.random() * 25), atk, def)
                : 15 + Math.floor(Math.random() * 25);
            lungeAttack(atk, def, () => {
                def._hp = Math.max(0, def._hp - dmg);
                updateHpBar(def);
            });
            setTimeout(doRound, 700);
        }
        setTimeout(doRound, 400);
    }

    function finishBattle(pkA, pkB) {
        const aWins = pkA._hp > pkB._hp;
        const winner = aWins ? pkA : pkB;
        const loser = aWins ? pkB : pkA;

        winner.img.animate([
            { transform: 'translateY(0)' },
            { transform: 'translateY(-12px)', offset: 0.4 },
            { transform: 'translateY(0)' }
        ], { duration: 400, easing: 'ease-in-out', iterations: 2 });

        const winLabel = document.createElement('div');
        winLabel.textContent = 'WIN!';
        Object.assign(winLabel.style, {
            position: 'absolute', top: '-28px', left: '50%',
            transform: 'translateX(-50%) scale(0)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '14px', color: '#4ECDC4',
            textShadow: '0 0 8px #4ECDC4, 0 2px 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none', zIndex: '10015', whiteSpace: 'nowrap',
            letterSpacing: '2px'
        });
        winner.el.appendChild(winLabel);
        winLabel.animate([
            { transform: 'translateX(-50%) scale(0)', opacity: 0 },
            { transform: 'translateX(-50%) scale(1.2)', opacity: 1, offset: 0.3 },
            { transform: 'translateX(-50%) translateY(-10px) scale(1)', opacity: 1, offset: 0.7 },
            { transform: 'translateX(-50%) translateY(-20px) scale(0.8)', opacity: 0 }
        ], { duration: 1500, fill: 'forwards' }).onfinish = () => winLabel.remove();

        setTimeout(() => {
            removeHpBar(winner);
            // Resume movement based on type
            const isFlyer = flyers.includes(winner);
            if (isFlyer) {
                winner.state = undefined; // flyers use undefined as normal state
            } else {
                winner.state = 'walk';
                winner.vx = rand(MIN_SPEED, MAX_SPEED) * (winner.facingRight ? 1 : -1);
            }
            winner.img.style.filter = 'drop-shadow(0 0 10px #4ECDC4) brightness(1.15)';
            setTimeout(() => {
                winner.img.style.transition = 'filter 2s';
                winner.img.style.filter = '';
                setTimeout(() => { winner.img.style.transition = 'filter 0.3s'; }, 2000);
            }, 2000);
        }, 800);

        setTimeout(() => {
            removeHpBar(loser);
            loser.el.style.transition = 'opacity 0.6s, transform 0.6s';
            loser.el.style.opacity = '0';
            loser.el.style.transform += ' scale(0.3)';
            setTimeout(() => {
                loser.el.remove();
                const gi = pokemons.indexOf(loser);
                if (gi >= 0) pokemons.splice(gi, 1);
                const fi = flyers.indexOf(loser);
                if (fi >= 0) flyers.splice(fi, 1);
                spawnNewPokemon();
                battleActive = false;
            }, 700);
        }, 600);
    }

    function checkForBattle() {
        if (battleActive || isThrowing) return;
        if (!canBattle()) return; // 6-hour cooldown
        if (Math.random() > BATTLE_CHANCE) return;
        const pair = findBattlePair();
        if (pair) {
            markBattled();
            startHomeBattle(pair[0], pair[1]);
        }
    }



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

    /* ══════════════════════════════════════════════════════════
     *  POKÉBALL THROWING SYSTEM
     * ══════════════════════════════════════════════════════════ */
    let isThrowing = false;

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

    /* ══════════════════════════════════════════════════════════
     *  POKEMON NAME DATABASE
     * ══════════════════════════════════════════════════════════ */
    const POKEMON_NAMES = {
        1:'Bulbasaur',4:'Charmander',6:'Charizard',7:'Squirtle',12:'Butterfree',
        17:'Pidgeotto',18:'Pidgeot',21:'Spearow',22:'Fearow',25:'Pikachu',
        39:'Jigglypuff',41:'Zubat',49:'Venomoth',52:'Meowth',54:'Psyduck',
        58:'Growlithe',63:'Abra',74:'Geodude',77:'Ponyta',92:'Gastly',
        104:'Cubone',123:'Scyther',129:'Magikarp',131:'Lapras',133:'Eevee',
        142:'Aerodactyl',143:'Snorlax',144:'Articuno',145:'Zapdos',146:'Moltres',
        147:'Dratini',149:'Dragonite',150:'Mewtwo',151:'Mew',155:'Cyndaquil',
        158:'Totodile',172:'Pichu',175:'Togepi',176:'Togetic',179:'Mareep',
        183:'Marill',187:'Hoppip',193:'Yanma',196:'Espeon',197:'Umbreon',
        198:'Murkrow',225:'Delibird',226:'Mantine',227:'Skarmory',246:'Larvitar',
        249:'Lugia',250:'Ho-Oh',252:'Treecko',255:'Torchic',258:'Mudkip',
        267:'Beautifly',277:'Swellow',278:'Wingull',280:'Ralts',304:'Aron',
        330:'Flygon',333:'Swablu',334:'Altaria',349:'Feebas',371:'Bagon',
        380:'Latias',381:'Latios',384:'Rayquaza',387:'Turtwig',390:'Chimchar',
        393:'Piplup',403:'Shinx',425:'Drifloon',426:'Drifblim',427:'Buneary',
        430:'Honchkrow',443:'Gible',447:'Riolu',468:'Togekiss',469:'Yanmega',
        472:'Gliscor',479:'Rotom',495:'Snivy',498:'Tepig',501:'Oshawott',
        521:'Unfezant',527:'Woobat',570:'Zorua',587:'Emolga',607:'Litwick',
        628:'Braviary',635:'Hydreigon',641:'Tornadus',643:'Reshiram',
        644:'Zekrom',650:'Chespin',653:'Fennekin',656:'Froakie',661:'Fletchling',
        663:'Talonflame',714:'Noibat'
    };

    /* ══════════════════════════════════════════════════════════
     *  2. SHINY POKEMON SYSTEM
     * ══════════════════════════════════════════════════════════ */
    const SHINY_CHANCE = 0.05; // 5% = 1/20

    function makeShiny(pk) {
        pk.isShiny = true;
        pk.img.style.filter = 'saturate(1.8) hue-rotate(40deg) brightness(1.15)';
        // Sparkle aura
        const sparkle = document.createElement('div');
        sparkle.className = 'shiny-sparkle';
        Object.assign(sparkle.style, {
            position:'absolute', inset:'0', pointerEvents:'none', zIndex:'1'
        });
        pk.el.appendChild(sparkle);
        // Continuous sparkle particles
        pk._shinyInterval = setInterval(() => {
            if (!pk.el.parentNode) { clearInterval(pk._shinyInterval); return; }
            const s = document.createElement('div');
            s.textContent = pick(['✦','✧','★','⭐']);
            const isFlyer = flyers.includes(pk);
            const sz = isFlyer ? FLYER_SIZE : SPRITE_SIZE;
            Object.assign(s.style, {
                position:'absolute', left: rand(0, sz)+'px', top: rand(0, sz)+'px',
                fontSize: rand(6,12)+'px', color: pick(['#FFD700','#FFF','#FF69B4','#87CEEB']),
                pointerEvents:'none', zIndex:'2',
                textShadow: '0 0 4px #FFD700'
            });
            pk.el.appendChild(s);
            s.animate([
                { transform:'scale(0) rotate(0)', opacity:0 },
                { transform:'scale(1.2) rotate(90deg)', opacity:1, offset:0.3 },
                { transform:'scale(0) rotate(180deg) translateY(-10px)', opacity:0 }
            ], { duration:800, fill:'forwards' }).onfinish = () => s.remove();
        }, 600);
    }

    // Apply shiny to existing Pokemon
    setTimeout(() => {
        [...pokemons, ...flyers].forEach(pk => {
            if (Math.random() < SHINY_CHANCE) makeShiny(pk);
        });
    }, 3000);

    /* ══════════════════════════════════════════════════════════
     *  5. DAY/NIGHT CYCLE
     * ══════════════════════════════════════════════════════════ */
    const dayNightOverlay = document.createElement('div');
    dayNightOverlay.id = 'day-night-overlay';
    Object.assign(dayNightOverlay.style, {
        position:'fixed', inset:'0', pointerEvents:'none', zIndex:'1',
        transition:'background 60s linear'
    });
    document.body.appendChild(dayNightOverlay);

    function updateDayNight() {
        const h = new Date().getHours();
        let bg;
        if (h >= 6 && h < 10) bg = 'rgba(255,200,100,0.03)';       // Morning
        else if (h >= 10 && h < 16) bg = 'rgba(255,255,200,0.02)';  // Day
        else if (h >= 16 && h < 19) bg = 'rgba(255,140,50,0.06)';   // Sunset
        else if (h >= 19 && h < 21) bg = 'rgba(30,30,80,0.12)';     // Dusk
        else bg = 'rgba(10,10,40,0.18)';                              // Night
        dayNightOverlay.style.background = bg;
    }
    updateDayNight();
    setInterval(updateDayNight, 60000);

    /* ══════════════════════════════════════════════════════════
     *  3. WEATHER SYSTEM
     * ══════════════════════════════════════════════════════════ */
    const weatherTypes = ['clear','rain','snow','thunder','leaves'];
    let currentWeather = 'clear';
    let weatherInterval = null;

    function setWeather(type) {
        currentWeather = type;
        if (weatherInterval) clearInterval(weatherInterval);
        // Remove old weather label
        const oldLabel = document.getElementById('weather-label');
        if (oldLabel) oldLabel.remove();

        if (type === 'clear') return;

        // Weather label
        const label = document.createElement('div');
        label.id = 'weather-label';
        const labels = { rain:'🌧️ Rain', snow:'❄️ Snow', thunder:'⚡ Thunder', leaves:'🍃 Windy' };
        label.textContent = labels[type] || '';
        Object.assign(label.style, {
            position:'fixed', top:'80px', right:'20px',
            fontFamily:"'Space Grotesk',sans-serif", fontSize:'12px',
            color:'rgba(255,255,255,0.5)', pointerEvents:'none', zIndex:'50',
            background:'rgba(0,0,0,0.3)', padding:'4px 10px', borderRadius:'8px',
            backdropFilter:'blur(4px)'
        });
        document.body.appendChild(label);
        label.animate([{opacity:0},{opacity:1}],{duration:500,fill:'forwards'});

        weatherInterval = setInterval(() => {
            const p = document.createElement('div');
            const W = window.innerWidth;
            if (type === 'rain') {
                Object.assign(p.style, {
                    position:'fixed', left:rand(0,W)+'px', top:'-10px',
                    width:'2px', height:rand(10,20)+'px',
                    background:'linear-gradient(to bottom, transparent, rgba(100,180,255,0.6))',
                    pointerEvents:'none', zIndex:'2'
                });
                document.body.appendChild(p);
                p.animate([
                    {transform:'translateY(0)', opacity:0.7},
                    {transform:`translateY(${window.innerHeight+20}px)`, opacity:0}
                ],{duration:rand(500,900), fill:'forwards'}).onfinish=()=>p.remove();
            } else if (type === 'snow') {
                p.textContent = pick(['❄','❅','❆','•']);
                Object.assign(p.style, {
                    position:'fixed', left:rand(0,W)+'px', top:'-10px',
                    fontSize:rand(8,16)+'px', color:'rgba(200,220,255,0.7)',
                    pointerEvents:'none', zIndex:'2'
                });
                document.body.appendChild(p);
                p.animate([
                    {transform:'translateY(0) rotate(0)', opacity:0.8},
                    {transform:`translateY(${window.innerHeight+20}px) translateX(${rand(-40,40)}px) rotate(360deg)`, opacity:0}
                ],{duration:rand(2000,4000), fill:'forwards'}).onfinish=()=>p.remove();
            } else if (type === 'thunder') {
                p.textContent = '⚡';
                Object.assign(p.style, {
                    position:'fixed', left:rand(0,W)+'px', top:rand(0,200)+'px',
                    fontSize:rand(16,30)+'px', pointerEvents:'none', zIndex:'2',
                    filter:'drop-shadow(0 0 8px #FFD700)'
                });
                document.body.appendChild(p);
                p.animate([
                    {opacity:0, transform:'scale(0.5)'},
                    {opacity:1, transform:'scale(1.2)', offset:0.1},
                    {opacity:0, transform:'scale(0.8) translateY(40px)'}
                ],{duration:rand(300,600), fill:'forwards'}).onfinish=()=>p.remove();
            } else if (type === 'leaves') {
                p.textContent = pick(['🍃','🍂','🌿','🍁']);
                Object.assign(p.style, {
                    position:'fixed', left:'-20px', top:rand(0,window.innerHeight*0.7)+'px',
                    fontSize:rand(10,18)+'px', pointerEvents:'none', zIndex:'2'
                });
                document.body.appendChild(p);
                p.animate([
                    {transform:'translateX(0) rotate(0)', opacity:0.8},
                    {transform:`translateX(${W+40}px) translateY(${rand(30,100)}px) rotate(${rand(180,720)}deg)`, opacity:0}
                ],{duration:rand(3000,5000), fill:'forwards'}).onfinish=()=>p.remove();
            }
        }, type==='snow'?200 : type==='rain'?50 : type==='thunder'?800 : 300);
    }

    // Auto-change weather every 30s
    function randomWeather() {
        setWeather(pick(weatherTypes));
    }
    setTimeout(randomWeather, 5000);
    setInterval(randomWeather, 30000);

    /* ══════════════════════════════════════════════════════════
     *  4. POKÉDEX POPUP (on right-click or long press)
     * ══════════════════════════════════════════════════════════ */
    function showPokedex(pk) {
        const existing = document.getElementById('pokedex-popup');
        if (existing) existing.remove();

        const name = POKEMON_NAMES[pk.id] || `Pokemon #${pk.id}`;
        const type = POKEMON_TYPES[pk.id] || 'normal';
        const moveData = MOVE_DATA[type] || MOVE_DATA.normal;
        const isFlyer = flyers.includes(pk);
        const shinyTag = pk.isShiny ? ' ✨SHINY✨' : '';
        const wins = pk._wins || 0;

        const popup = document.createElement('div');
        popup.id = 'pokedex-popup';
        popup.innerHTML = `
            <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
                <img src="${spriteURL(pk.id)}" style="width:64px;height:64px;image-rendering:pixelated;${pk.isShiny?'filter:saturate(1.8) hue-rotate(40deg) brightness(1.15)':''}">
                <div>
                    <div style="font-size:18px;font-weight:900;color:#fff">#${pk.id} ${name}${shinyTag}</div>
                    <div style="display:flex;gap:6px;margin-top:4px">
                        <span style="background:${moveData.color}30;color:${moveData.color};padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;border:1px solid ${moveData.color}40">${moveData.emoji} ${type.toUpperCase()}</span>
                        ${isFlyer ? '<span style="background:rgba(135,206,235,0.2);color:#87CEEB;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700">🕊️ FLYING</span>' : ''}
                    </div>
                </div>
            </div>
            <div style="font-size:11px;color:#a9abb3;margin-bottom:6px">Moves: ${moveData.moves.join(', ')}</div>
            <div style="display:flex;gap:12px;font-size:11px;color:#a9abb3">
                <span>🏆 Wins: <b style="color:#4ECDC4">${wins}</b></span>
                <span>${pk.isShiny ? '✨ Shiny!' : '⚪ Normal'}</span>
            </div>
        `;
        Object.assign(popup.style, {
            position:'fixed', left:'50%', top:'50%',
            transform:'translate(-50%,-50%) scale(0)',
            background:'rgba(11,14,20,0.95)', border:'1px solid rgba(151,169,255,0.3)',
            borderRadius:'16px', padding:'16px 20px', zIndex:'10020',
            fontFamily:"'Space Grotesk',sans-serif",
            backdropFilter:'blur(20px)', maxWidth:'320px',
            boxShadow:'0 0 40px rgba(62,101,255,0.15), 0 8px 30px rgba(0,0,0,0.5)'
        });
        document.body.appendChild(popup);
        popup.animate([
            {transform:'translate(-50%,-50%) scale(0)', opacity:0},
            {transform:'translate(-50%,-50%) scale(1)', opacity:1}
        ],{duration:250, easing:'ease-out', fill:'forwards'});

        // Close on click anywhere
        const closer = (e) => {
            if (!popup.contains(e.target)) {
                popup.animate([{opacity:1,transform:'translate(-50%,-50%) scale(1)'},{opacity:0,transform:'translate(-50%,-50%) scale(0.8)'}],
                    {duration:200,fill:'forwards'}).onfinish=()=>popup.remove();
                document.removeEventListener('click', closer);
                document.removeEventListener('contextmenu', closer);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closer);
            document.addEventListener('contextmenu', closer);
        }, 100);
    }

    // Right-click on Pokemon = Pokédex
    container.addEventListener('contextmenu', e => {
        e.preventDefault();
        const rect = container.getBoundingClientRect();
        const cx = e.clientX, cy = e.clientY;
        const target = findNearest(cx, cy);
        if (target) showPokedex(target.ref);
    });

    /* ══════════════════════════════════════════════════════════
     *  6. POKEMON EGG
     * ══════════════════════════════════════════════════════════ */
    let eggActive = false;
    function spawnEgg() {
        if (eggActive) return;
        eggActive = true;
        const egg = document.createElement('div');
        egg.id = 'pokemon-egg';
        egg.textContent = '🥚';
        let clicks = 0;
        const needed = 5 + Math.floor(Math.random()*5);
        Object.assign(egg.style, {
            position:'absolute', fontSize:'32px', cursor:'pointer',
            left: rand(10, window.innerWidth-60)+'px',
            bottom: (GROUND_OFFSET+5)+'px',
            pointerEvents:'auto', zIndex:'10001',
            filter:'drop-shadow(0 0 8px rgba(255,215,0,0.4))',
            transition:'transform 0.2s'
        });
        container.appendChild(egg);
        egg.animate([{opacity:0,transform:'scale(0)'},{opacity:1,transform:'scale(1)'}],
            {duration:500,easing:'ease-out',fill:'forwards'});

        egg.addEventListener('click', () => {
            clicks++;
            egg.animate([
                {transform:'rotate(0) scale(1)'},
                {transform:`rotate(${rand(-20,20)}deg) scale(1.1)`, offset:0.3},
                {transform:'rotate(0) scale(1)'}
            ],{duration:300});
            // Crack particles
            for(let i=0;i<3;i++){
                const c = document.createElement('div');
                c.textContent = '✦';
                Object.assign(c.style,{
                    position:'absolute', left:egg.style.left, bottom:egg.style.bottom,
                    fontSize:'10px', color:'#FFD700', pointerEvents:'none', zIndex:'10002'
                });
                container.appendChild(c);
                c.animate([{opacity:1,transform:`translate(${rand(-15,15)}px,${rand(-20,0)}px)`},{opacity:0,transform:`translate(${rand(-25,25)}px,${-rand(20,40)}px)`}],
                    {duration:400,fill:'forwards'}).onfinish=()=>c.remove();
            }

            if (clicks >= needed) {
                // HATCH!
                egg.textContent = '💫';
                egg.animate([{transform:'scale(1.5)',opacity:1},{transform:'scale(3)',opacity:0}],
                    {duration:500,fill:'forwards'}).onfinish=()=>{
                    egg.remove();
                    // Burst effect
                    for(let i=0;i<10;i++){
                        const s=document.createElement('div');
                        s.textContent=pick(['✨','⭐','💫','🌟']);
                        const ex=parseFloat(egg.style.left), ey=window.innerHeight-GROUND_OFFSET-30;
                        Object.assign(s.style,{position:'absolute',left:ex+'px',top:ey+'px',fontSize:rand(10,18)+'px',pointerEvents:'none',zIndex:'10002'});
                        container.appendChild(s);
                        const a=(Math.PI*2/10)*i, d=rand(30,60);
                        s.animate([{transform:'scale(1)',opacity:1},{transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(0)`,opacity:0}],
                            {duration:600,fill:'forwards'}).onfinish=()=>s.remove();
                    }
                    spawnNewPokemon();
                    eggActive = false;
                };
            }
        });
    }
    // Spawn egg every 45s
    setTimeout(spawnEgg, 15000);
    setInterval(() => { if(!eggActive) spawnEgg(); }, 45000);

    /* ══════════════════════════════════════════════════════════
     *  7. EVOLUTION SYSTEM (3 wins = evolve)
     * ══════════════════════════════════════════════════════════ */
    const EVOLUTION_MAP = {
        1:2, 2:3, 4:5, 5:6, 7:8, 8:9, 25:26, 133:136, 155:156,
        158:159, 172:25, 175:176, 179:180, 252:253, 255:256,
        258:259, 387:388, 390:391, 393:394, 447:448, 495:496,
        498:499, 501:502, 650:651, 653:654, 656:657, 63:64,
        92:93, 147:148, 246:247, 371:372, 443:444, 570:571,
        607:608, 280:281, 403:404, 661:662
    };

    function tryEvolve(pk) {
        pk._wins = (pk._wins || 0) + 1;
        saveScoreboard(pk);
        if (pk._wins >= 3 && EVOLUTION_MAP[pk.id]) {
            const newId = EVOLUTION_MAP[pk.id];
            // Evolution flash
            pk.img.animate([
                {filter:'brightness(1)'},
                {filter:'brightness(5) saturate(0)', offset:0.3},
                {filter:'brightness(8)', offset:0.6},
                {filter:'brightness(1)'}
            ],{duration:1200, easing:'ease-in-out'});

            const flash = document.createElement('div');
            flash.textContent = '⬆️ EVOLVED!';
            Object.assign(flash.style, {
                position:'absolute', top:'-25px', left:'50%',
                transform:'translateX(-50%)', fontFamily:"'Space Grotesk'",
                fontSize:'12px', fontWeight:'900', color:'#FFD700',
                textShadow:'0 0 10px #FFD700', pointerEvents:'none',
                zIndex:'10015', whiteSpace:'nowrap'
            });
            pk.el.appendChild(flash);
            flash.animate([
                {opacity:0,transform:'translateX(-50%) translateY(0) scale(0)'},
                {opacity:1,transform:'translateX(-50%) translateY(-10px) scale(1.2)', offset:0.3},
                {opacity:0,transform:'translateX(-50%) translateY(-25px) scale(0.8)'}
            ],{duration:1500,fill:'forwards'}).onfinish=()=>flash.remove();

            setTimeout(() => {
                pk.id = newId;
                pk.img.src = spriteURL(newId);
                pk._wins = 0;
                // reset filter after evolution
            }, 600);
        }
    }

    /* ══════════════════════════════════════════════════════════
     *  8. BATTLE SCOREBOARD (localStorage)
     * ══════════════════════════════════════════════════════════ */
    let scoreboard = JSON.parse(localStorage.getItem('pkScoreboard') || '{}');

    function saveScoreboard(pk) {
        const key = pk.id;
        if (!scoreboard[key]) scoreboard[key] = { wins:0, name: POKEMON_NAMES[key]||`#${key}` };
        scoreboard[key].wins = (pk._wins || 0);
        localStorage.setItem('pkScoreboard', JSON.stringify(scoreboard));
        renderScoreboard();
    }

    const sbPanel = document.createElement('div');
    sbPanel.id = 'scoreboard';
    Object.assign(sbPanel.style, {
        position:'fixed', bottom:'12px', left:'12px',
        background:'rgba(11,14,20,0.85)', border:'1px solid rgba(255,255,255,0.08)',
        borderRadius:'12px', padding:'8px 12px', zIndex:'10016',
        fontFamily:"'Space Grotesk',sans-serif", fontSize:'11px',
        color:'#a9abb3', maxWidth:'160px', backdropFilter:'blur(8px)',
        pointerEvents:'auto', transition:'opacity 0.3s'
    });
    document.body.appendChild(sbPanel);

    function renderScoreboard() {
        const top5 = Object.entries(scoreboard)
            .sort((a,b) => b[1].wins - a[1].wins)
            .slice(0, 5);
        if (top5.length === 0) { sbPanel.style.opacity='0'; return; }
        sbPanel.style.opacity='1';
        sbPanel.innerHTML = '<div style="font-weight:800;color:#FFD700;margin-bottom:4px;font-size:10px">🏆 TOP FIGHTERS</div>' +
            top5.map(([id,d],i) =>
                `<div style="display:flex;justify-content:space-between;gap:8px;padding:1px 0"><span>${['🥇','🥈','🥉','4.','5.'][i]} ${d.name}</span><span style="color:#4ECDC4">${d.wins}W</span></div>`
            ).join('');
    }
    renderScoreboard();

    /* ══════════════════════════════════════════════════════════
     *  9. POKEMON FOLLOWS CURSOR
     * ══════════════════════════════════════════════════════════ */
    const follower = document.createElement('div');
    const followerId = pick([25, 133, 175, 39, 172]); // Cute Pokemon pool
    const followerImg = document.createElement('img');
    followerImg.src = spriteURL(followerId);
    followerImg.style.cssText = 'width:36px;height:36px;image-rendering:pixelated;';
    follower.appendChild(followerImg);
    Object.assign(follower.style, {
        position:'fixed', pointerEvents:'none', zIndex:'10003',
        transition:'left 0.3s ease-out, top 0.3s ease-out',
        filter:'drop-shadow(0 2px 4px rgba(0,0,0,0.4))', opacity:'0.8'
    });
    document.body.appendChild(follower);

    let mouseX = window.innerWidth/2, mouseY = window.innerHeight/2;
    let followerX = mouseX, followerY = mouseY;
    let followerFacing = true;
    document.addEventListener('mousemove', e => { mouseX = e.clientX; mouseY = e.clientY; });

    function updateFollower() {
        const dx = mouseX - followerX - 18;
        const dy = mouseY - followerY - 18;
        followerX += dx * 0.08;
        followerY += dy * 0.08;
        const newFacing = dx > 0;
        if (newFacing !== followerFacing) {
            followerFacing = newFacing;
            followerImg.style.transform = `scaleX(${followerFacing ? 1 : -1})`;
        }
        follower.style.left = followerX + 'px';
        follower.style.top = followerY + 'px';
        requestAnimationFrame(updateFollower);
    }
    requestAnimationFrame(updateFollower);

    // ── Hook evolution into finishBattle ──
    const _origFinishBattle = finishBattle;
    finishBattle = function(pkA, pkB) {
        const aWins = pkA._hp > pkB._hp;
        const winner = aWins ? pkA : pkB;
        tryEvolve(winner);
        _origFinishBattle(pkA, pkB);
    };

    /* ── EXPOSE GLOBALS for pokemon-extras.js ─────────────── */
    window.__pkWorld = {
        pokemons, flyers, container, POKEMON_TYPES, POKEMON_NAMES,
        SPRITE_SIZE, FLYER_SIZE, GROUND_OFFSET, FLYING_IDS,
        ALL_POKEMON_IDS, MOVE_DATA,
        rand, pick, spriteURL,
        Pokemon, FlyingPokemon
    };
    window.__pkStartBattle = startHomeBattle;
    window.__pkSaveScore = saveScoreboard;

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

