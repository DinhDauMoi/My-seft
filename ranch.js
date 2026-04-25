/**
 * ============================================================
 *  POKÉMON RANCH — All 1025 Pokémon in an interactive grid
 * ============================================================
 */
(function () {
    'use strict';

    const TOTAL_POKEMON = 1025;
    const BATCH_SIZE = 80;
    const GEN_RANGES = {
        1: [1, 151], 2: [152, 251], 3: [252, 386], 4: [387, 493],
        5: [494, 649], 6: [650, 721], 7: [722, 809], 8: [810, 905], 9: [906, 1025]
    };

    const nameCache = {};
    const typeCache = {};  // id -> [types]
    let currentGen = 'all';
    let searchQuery = '';
    let loadedUpTo = 0;
    let isLoading = false;
    let allCells = [];
    const releasedPokemon = [];  // free-roaming sprites

    // Well-known flying/levitating Pokemon IDs
    const FLYING_IDS = new Set([
        6,12,15,17,18,21,22,41,42,49,83,84,85,92,93,94,109,110,123,130,
        142,143,144,145,146,149,150,151,163,164,165,166,169,176,187,188,
        189,193,198,200,207,225,226,227,249,250,267,269,275,277,278,279,
        284,291,329,330,333,334,337,338,343,344,353,354,355,356,358,380,
        381,384,385,386,414,415,416,425,426,430,468,469,472,479,480,481,
        482,483,484,487,488,491,492,493,521,527,528,561,566,567,580,581,
        587,628,630,635,641,642,643,644,645,646,661,662,663,666,701,707,
        714,715,716,717,718,741,797,898,905
    ]);

    const grid = document.getElementById('ranchGrid');
    const searchInput = document.getElementById('searchInput');
    const visibleCountEl = document.getElementById('visibleCount');
    const loadingEl = document.getElementById('loadingMore');

    const spriteURL = id =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
    const staticURL = id =>
        `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

    /* ── Fetch Pokemon name ─────────────────────────────────── */
    async function fetchName(id) {
        if (nameCache[id]) return nameCache[id];
        try {
            const res = await fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`, { signal: AbortSignal.timeout(5000) });
            const data = await res.json();
            const name = data.names?.find(n => n.language.name === 'en')?.name || data.name;
            nameCache[id] = name;
            return name;
        } catch {
            nameCache[id] = `Pokemon #${id}`;
            return nameCache[id];
        }
    }

    function isFlying(id) { return FLYING_IDS.has(Number(id)); }

    /* ── Create a single cell ───────────────────────────────── */
    function createCell(id) {
        const cell = document.createElement('div');
        cell.className = 'poke-cell';
        cell.dataset.id = id;
        cell.dataset.gen = getGen(id);

        const dur = (2.5 + Math.random() * 2).toFixed(1);
        const delay = (Math.random() * -5).toFixed(1);
        cell.style.setProperty('--dur', dur + 's');
        cell.style.setProperty('--delay', delay + 's');

        // ID badge
        const idBadge = document.createElement('div');
        idBadge.className = 'poke-id';
        idBadge.textContent = `#${String(id).padStart(3, '0')}`;
        cell.appendChild(idBadge);

        // Image (lazy)
        const img = document.createElement('img');
        img.className = 'poke-img';
        img.alt = `Pokemon #${id}`;
        img.loading = 'lazy';
        img.draggable = false;
        img.dataset.src = spriteURL(id);
        img.dataset.fallback = staticURL(id);
        // Start with a transparent placeholder
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        cell.appendChild(img);

        // Name
        const nameEl = document.createElement('div');
        nameEl.className = 'poke-name';
        nameEl.textContent = `#${id}`;
        cell.appendChild(nameEl);

        // Lazy-load name
        fetchName(id).then(name => {
            nameEl.textContent = name;
            cell.dataset.name = name.toLowerCase();
        });

        // Click effect — release Pokemon!
        cell.addEventListener('click', () => {
            cell.classList.remove('clicked');
            void cell.offsetWidth;
            cell.classList.add('clicked');
            spawnCellSparkle(cell);
            releasePokemon(Number(id), nameCache[id] || `#${id}`);
        });

        return cell;
    }

    function getGen(id) {
        for (const [gen, [start, end]] of Object.entries(GEN_RANGES)) {
            if (id >= start && id <= end) return gen;
        }
        return '9';
    }

    /* ── Sparkle on click ───────────────────────────────────── */
    function spawnCellSparkle(cell) {
        const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#A78BFA', '#F472B6', '#97a9ff'];
        for (let i = 0; i < 6; i++) {
            const spark = document.createElement('div');
            const size = 3 + Math.random() * 3;
            Object.assign(spark.style, {
                position: 'absolute',
                width: size + 'px', height: size + 'px',
                borderRadius: '50%',
                background: colors[i % colors.length],
                left: '50%', top: '50%',
                pointerEvents: 'none', zIndex: '20',
                boxShadow: `0 0 4px ${colors[i % colors.length]}`
            });
            cell.appendChild(spark);
            const angle = (Math.PI * 2 / 6) * i;
            const dist = 20 + Math.random() * 25;
            spark.animate([
                { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity: 0 }
            ], { duration: 450, easing: 'ease-out', fill: 'forwards' }).onfinish = () => spark.remove();
        }
    }

    /* ── Lazy loading with IntersectionObserver ──────────────── */
    const imgObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.addEventListener('error', () => { img.src = img.dataset.fallback; }, { once: true });
                imgObserver.unobserve(img);
            }
        }
    }, { rootMargin: '200px' });

    /* ── Load a batch of Pokemon ────────────────────────────── */
    function loadBatch() {
        if (isLoading || loadedUpTo >= TOTAL_POKEMON) return;
        isLoading = true;
        loadingEl?.classList.remove('hidden');

        const start = loadedUpTo + 1;
        const end = Math.min(loadedUpTo + BATCH_SIZE, TOTAL_POKEMON);

        const fragment = document.createDocumentFragment();
        for (let id = start; id <= end; id++) {
            const cell = createCell(id);
            fragment.appendChild(cell);
            allCells.push(cell);
            // Observe the image for lazy loading
            const img = cell.querySelector('img');
            if (img) imgObserver.observe(img);
        }
        grid.appendChild(fragment);
        loadedUpTo = end;
        isLoading = false;
        loadingEl?.classList.add('hidden');
        applyFilters();
    }

    /* ── Infinite scroll ────────────────────────────────────── */
    const scrollObserver = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && loadedUpTo < TOTAL_POKEMON) {
            loadBatch();
        }
    }, { rootMargin: '400px' });

    /* ── Apply search + gen filters ─────────────────────────── */
    function applyFilters() {
        let visibleCount = 0;
        for (const cell of allCells) {
            const id = cell.dataset.id;
            const name = cell.dataset.name || '';
            const gen = cell.dataset.gen;

            const matchGen = currentGen === 'all' || gen === currentGen;
            const matchSearch = !searchQuery ||
                id.includes(searchQuery) ||
                name.includes(searchQuery.toLowerCase());

            if (matchGen && matchSearch) {
                cell.style.display = '';
                visibleCount++;
            } else {
                cell.style.display = 'none';
            }
        }
        if (visibleCountEl) visibleCountEl.textContent = visibleCount;
    }

    /* ── Search ─────────────────────────────────────────────── */
    let searchTimeout;
    searchInput?.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            // If searching, load all Pokemon first
            if (searchQuery && loadedUpTo < TOTAL_POKEMON) {
                while (loadedUpTo < TOTAL_POKEMON) loadBatch();
            }
            applyFilters();
        }, 250);
    });

    /* ── Gen filter buttons ─────────────────────────────────── */
    document.getElementById('genFilters')?.addEventListener('click', (e) => {
        const btn = e.target.closest('.gen-btn');
        if (!btn) return;
        document.querySelectorAll('.gen-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentGen = btn.dataset.gen;
        // Load all if filtering specific gen
        if (currentGen !== 'all' && loadedUpTo < TOTAL_POKEMON) {
            while (loadedUpTo < TOTAL_POKEMON) loadBatch();
        }
        applyFilters();
    });

    /* ── Init ───────────────────────────────────────────────── */
    loadBatch();
    loadBatch(); // Load 2 batches initially (160 Pokemon)
    if (loadingEl) scrollObserver.observe(loadingEl);

    // Sentinel for infinite scroll
    const sentinel = document.createElement('div');
    sentinel.id = 'scroll-sentinel';
    sentinel.style.height = '1px';
    grid.parentElement.appendChild(sentinel);
    scrollObserver.observe(sentinel);

    /* ════════════════════════════════════════════════════════
     *  RELEASED POKEMON — Free-roaming sprites
     * ════════════════════════════════════════════════════════ */
    const wildContainer = document.createElement('div');
    wildContainer.id = 'wild-pokemon';
    Object.assign(wildContainer.style, {
        position: 'fixed', inset: '0', pointerEvents: 'none',
        zIndex: '9999', overflow: 'hidden'
    });
    document.body.appendChild(wildContainer);

    const rand = (a, b) => Math.random() * (b - a) + a;
    const WILD_SIZE = 64;
    const GROUND = 55;

    /* ── Ground Walker ──────────────────────────────────────── */
    class WildGround {
        constructor(id, name) {
            this.id = id; this.name = name; this.dead = false;
            this.el = document.createElement('div');
            // Shadow
            this.shadow = document.createElement('div');
            Object.assign(this.shadow.style, {
                position:'absolute', width:'36px', height:'6px', borderRadius:'50%',
                background:'rgba(0,0,0,0.25)', filter:'blur(2px)',
                bottom:'-3px', left:'50%', transform:'translateX(-50%)'
            });
            // Img
            this.img = document.createElement('img');
            this.img.src = spriteURL(id);
            this.img.draggable = false;
            Object.assign(this.img.style, {
                width: WILD_SIZE+'px', height: WILD_SIZE+'px',
                imageRendering:'pixelated', display:'block'
            });
            this.img.addEventListener('error', () => { this.img.src = staticURL(id); }, {once:true});
            this.el.appendChild(this.img);
            this.el.appendChild(this.shadow);
            Object.assign(this.el.style, {
                position:'absolute', willChange:'transform', transition:'opacity 1s',
                pointerEvents:'auto', cursor:'pointer'
            });
            wildContainer.appendChild(this.el);
            // Physics
            this.groundY = window.innerHeight - GROUND - WILD_SIZE;
            this.x = rand(50, window.innerWidth - 100);
            this.y = this.groundY;
            this.vx = rand(0.5, 1.8) * (Math.random()<0.5?1:-1);
            this.vy = 0; this.facingRight = this.vx > 0;
            this.state = 'walk'; this.timer = 0;
            this.life = 20 * 60; // ~20s at 60fps
            this._apply();
        }
        _apply() {
            this.el.style.transform = `translate3d(${this.x}px,${this.y}px,0) scaleX(${this.facingRight?1:-1})`;
        }
        update() {
            this.life--;
            if (this.life <= 0 && !this.dead) { this.dead = true; this.el.style.opacity = '0'; setTimeout(()=>this.el.remove(),1000); return; }
            if (this.life === 60) this.el.style.opacity = '0.3'; // start fading
            this.groundY = window.innerHeight - GROUND - WILD_SIZE;
            const W = window.innerWidth;
            switch(this.state) {
                case 'walk':
                    this.x += this.vx;
                    if (Math.random()<0.004) { this.state='jump'; this.vy=-6*rand(0.7,1.2); }
                    if (Math.random()<0.003) { this.state='idle'; this.timer=rand(40,120); }
                    if (Math.random()<0.005) { this.vx=-this.vx; this.facingRight=this.vx>0; }
                    break;
                case 'idle':
                    this.timer--;
                    if (this.timer<=0) { this.state='walk'; this.vx=rand(0.5,1.8)*(this.facingRight?1:-1); }
                    break;
                case 'jump':
                    this.vy+=0.25; this.y+=this.vy; this.x+=this.vx*0.6;
                    if (this.y>=this.groundY) { this.y=this.groundY; this.vy=0; this.state='walk'; }
                    break;
            }
            if (this.x<-WILD_SIZE) this.x=W; else if (this.x>W) this.x=-WILD_SIZE;
            // Shadow scale
            const air = this.groundY - this.y;
            const s = air>2 ? Math.max(0.3, 1-air/120) : 1;
            this.shadow.style.width = (36*s)+'px';
            this.shadow.style.opacity = String(0.25*s);
            this._apply();
        }
    }

    /* ── Sky Flyer ──────────────────────────────────────────── */
    class WildFlyer {
        constructor(id, name) {
            this.id = id; this.name = name; this.dead = false;
            this.el = document.createElement('div');
            // Aura
            this.aura = document.createElement('div');
            Object.assign(this.aura.style, {
                position:'absolute', inset:'-20px', borderRadius:'50%',
                background:'radial-gradient(circle, rgba(151,169,255,0.2) 0%, transparent 70%)',
                filter:'blur(6px)', animation:'aura-pulse 2.5s ease-in-out infinite',
                pointerEvents:'none'
            });
            this.img = document.createElement('img');
            this.img.src = spriteURL(id);
            this.img.draggable = false;
            Object.assign(this.img.style, {
                width: WILD_SIZE+'px', height: WILD_SIZE+'px',
                imageRendering:'pixelated', display:'block', position:'relative', zIndex:'2',
                filter:'drop-shadow(0 0 6px rgba(151,169,255,0.6))'
            });
            this.img.addEventListener('error', () => { this.img.src = staticURL(id); }, {once:true});
            this.el.appendChild(this.aura);
            this.el.appendChild(this.img);
            Object.assign(this.el.style, {
                position:'absolute', willChange:'transform', transition:'opacity 1s',
                pointerEvents:'auto', cursor:'pointer', zIndex:'10000'
            });
            wildContainer.appendChild(this.el);
            this.W = window.innerWidth; this.H = window.innerHeight;
            this.x = rand(0, this.W);
            this.baseY = rand(60, this.H * 0.35);
            this.y = this.baseY;
            this.speed = rand(0.8, 2.0);
            this.facingRight = Math.random()<0.5;
            this.dir = this.facingRight ? 1 : -1;
            this.t = rand(0, Math.PI*2);
            this.waveA = rand(15,35); this.waveF = rand(0.02,0.04);
            this.bobA = rand(3,7);
            this.life = 20 * 60;
            this.trailT = 0;
            this._apply();
        }
        _apply() {
            this.el.style.transform = `translate3d(${this.x}px,${this.y}px,0) scaleX(${this.facingRight?1:-1})`;
        }
        update() {
            this.life--;
            if (this.life<=0 && !this.dead) { this.dead=true; this.el.style.opacity='0'; setTimeout(()=>this.el.remove(),1000); return; }
            if (this.life===60) this.el.style.opacity='0.3';
            this.W = window.innerWidth; this.H = window.innerHeight;
            this.t += this.waveF;
            this.x += this.speed * this.dir;
            this.y = this.baseY + Math.sin(this.t)*this.waveA + Math.sin(this.t*2.7)*this.bobA;
            if (this.dir>0 && this.x>this.W+WILD_SIZE) { this.x=-WILD_SIZE*2; this.baseY=rand(60,this.H*0.35); }
            else if (this.dir<0 && this.x<-WILD_SIZE*2) { this.x=this.W+WILD_SIZE; this.baseY=rand(60,this.H*0.35); }
            if (Math.random()<0.001) { this.dir=-this.dir; this.facingRight=this.dir>0; }
            // Trail particle
            this.trailT++;
            if (this.trailT%8===0) {
                const p = document.createElement('div');
                const sz = rand(2,4);
                Object.assign(p.style, {
                    position:'absolute', width:sz+'px', height:sz+'px', borderRadius:'50%',
                    background:'#bf81ff', left:(this.x+WILD_SIZE/2)+'px', top:(this.y+WILD_SIZE/2)+'px',
                    pointerEvents:'none', zIndex:'9997', boxShadow:'0 0 4px #bf81ff', opacity:'0.7'
                });
                wildContainer.appendChild(p);
                p.animate([
                    { transform:'translate(0,0) scale(1)', opacity:0.7 },
                    { transform:`translate(${rand(-12,12)}px,${rand(8,25)}px) scale(0)`, opacity:0 }
                ], { duration:rand(500,900), easing:'ease-out', fill:'forwards' }).onfinish = ()=>p.remove();
            }
            this._apply();
        }
    }

    /* ── Release a Pokemon ──────────────────────────────────── */
    let battleMode = false;
    const battleSlots = []; // max 2

    function releasePokemon(id, name) {
        const wild = isFlying(id) ? new WildFlyer(id, name) : new WildGround(id, name);
        releasedPokemon.push(wild);

        // Track for battle: only non-dead wild pokemon
        if (!battleMode) {
            battleSlots.push(wild);
            if (battleSlots.length === 2) {
                // Two Pokemon released — initiate battle!
                battleMode = true;
                setTimeout(() => startRanchBattle(battleSlots[0], battleSlots[1]), 600);
            }
        }
    }

    /* ── Animation loop for released Pokemon ────────────────── */
    function wildLoop() {
        for (let i = releasedPokemon.length - 1; i >= 0; i--) {
            if (releasedPokemon[i].frozen) { /* skip update while frozen */ }
            else releasedPokemon[i].update();
            if (releasedPokemon[i].dead && releasedPokemon[i].life < -60) {
                releasedPokemon.splice(i, 1);
            }
        }
        requestAnimationFrame(wildLoop);
    }
    requestAnimationFrame(wildLoop);

    /* ══════════════════════════════════════════════════════════
     *  RANCH BATTLE SYSTEM
     * ══════════════════════════════════════════════════════════ */
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];

    function startRanchBattle(pkA, pkB) {
        // Freeze both
        pkA.frozen = true;
        pkB.frozen = true;

        // Make them charge toward center
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        const targetAx = centerX - 80;
        const targetBx = centerX + 20;

        // Animate sprites moving toward center
        pkA.el.style.transition = 'transform 0.5s ease-in';
        pkB.el.style.transition = 'transform 0.5s ease-in';
        pkA.facingRight = true;
        pkB.facingRight = false;
        pkA.el.style.transform = `translate3d(${targetAx}px,${centerY}px,0) scaleX(1)`;
        pkB.el.style.transform = `translate3d(${targetBx}px,${centerY}px,0) scaleX(-1)`;

        // After they meet — show battle overlay
        setTimeout(() => {
            // Hide the wild sprites temporarily
            pkA.el.style.opacity = '0';
            pkB.el.style.opacity = '0';
            showBattleOverlay(pkA, pkB);
        }, 600);
    }

    /* ── Battle Overlay ───────────────────────────────────── */
    function showBattleOverlay(pkA, pkB) {
        const overlay = document.createElement('div');
        Object.assign(overlay.style, {
            position: 'fixed', inset: '0', zIndex: '20000',
            background: 'rgba(0,0,0,0)', pointerEvents: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        });
        document.body.appendChild(overlay);

        overlay.animate([
            { background: 'rgba(0,0,0,0)' },
            { background: 'rgba(0,0,0,0.8)' }
        ], { duration: 400, fill: 'forwards' });

        // Arena
        const arena = document.createElement('div');
        Object.assign(arena.style, {
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: '24px', transform: 'scale(0)'
        });

        const sideA = buildBattleSide(pkA.id, 'left');
        const sideB = buildBattleSide(pkB.id, 'right');

        const vsText = document.createElement('div');
        Object.assign(vsText.style, {
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '52px', color: '#FFD700',
            textShadow: '0 0 20px #FFD700, 0 0 40px #ff6e84, 0 4px 8px rgba(0,0,0,0.8)',
            letterSpacing: '6px', transform: 'scale(0)'
        });
        vsText.textContent = 'VS';

        arena.appendChild(sideA.el);
        arena.appendChild(vsText);
        arena.appendChild(sideB.el);
        overlay.appendChild(arena);

        // Animate arena in
        setTimeout(() => {
            arena.animate([
                { transform: 'scale(0) rotate(-10deg)', opacity: 0 },
                { transform: 'scale(1.1) rotate(2deg)', opacity: 1, offset: 0.6 },
                { transform: 'scale(1) rotate(0)', opacity: 1 }
            ], { duration: 500, fill: 'forwards', easing: 'ease-out' });
        }, 200);

        setTimeout(() => {
            vsText.animate([
                { transform: 'scale(0) rotate(-20deg)' },
                { transform: 'scale(1.3) rotate(5deg)', offset: 0.5 },
                { transform: 'scale(1) rotate(0)' }
            ], { duration: 400, fill: 'forwards', easing: 'ease-out' });
        }, 500);

        // Start fighting after intro
        setTimeout(() => runRounds(overlay, sideA, sideB, pkA, pkB), 1200);
    }

    /* ── Build battle side panel ──────────────────────────── */
    function buildBattleSide(id, side) {
        const el = document.createElement('div');
        Object.assign(el.style, {
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            gap: '10px', minWidth: '110px'
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
            width: '96px', height: '10px', borderRadius: '5px',
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            overflow: 'hidden'
        });
        const hpBar = document.createElement('div');
        Object.assign(hpBar.style, {
            width: '100%', height: '100%', borderRadius: '5px',
            background: 'linear-gradient(90deg, #4ECDC4, #44d62c)',
            transition: 'width 0.4s ease, background 0.4s'
        });
        hpWrap.appendChild(hpBar);

        const label = document.createElement('div');
        Object.assign(label.style, {
            fontSize: '11px', fontFamily: "'Space Grotesk', monospace", color: '#97a9ff',
            textShadow: '0 0 6px #97a9ff', letterSpacing: '2px', fontWeight: '700'
        });
        label.textContent = `#${String(id).padStart(3,'0')}`;

        el.appendChild(img);
        el.appendChild(hpWrap);
        el.appendChild(label);

        return { el, img, hpBar, hp: 100 };
    }

    /* ── Run battle rounds ────────────────────────────────── */
    function runRounds(overlay, sideA, sideB, pkA, pkB) {
        const totalRounds = 3 + Math.floor(Math.random() * 3);
        let round = 0;

        function doRound() {
            if (sideA.hp <= 0 || sideB.hp <= 0 || round >= totalRounds) {
                if (sideA.hp === sideB.hp) {
                    if (Math.random() < 0.5) sideA.hp = 0; else sideB.hp = 0;
                }
                finishBattle(overlay, sideA, sideB, pkA, pkB, sideA.hp > sideB.hp);
                return;
            }
            round++;

            const attacker = round % 2 === 1 ? sideA : sideB;
            const defender = round % 2 === 1 ? sideB : sideA;
            const dmg = 15 + Math.floor(Math.random() * 25);
            const dir = attacker === sideA ? 1 : -1;

            // Lunge animation
            attacker.img.animate([
                { transform: `scaleX(${attacker === sideB ? -1 : 1}) translateX(0)` },
                { transform: `scaleX(${attacker === sideB ? -1 : 1}) translateX(${dir * 35}px)`, offset: 0.3 },
                { transform: `scaleX(${attacker === sideB ? -1 : 1}) translateX(0)` }
            ], { duration: 300, easing: 'ease-in-out' });

            // Hit flash
            setTimeout(() => {
                defender.img.animate([
                    { filter: 'brightness(1) drop-shadow(0 0 12px rgba(151,169,255,0.5))' },
                    { filter: 'brightness(3) drop-shadow(0 0 20px #ff3030)', offset: 0.3 },
                    { filter: 'brightness(0.5)', offset: 0.5 },
                    { filter: 'brightness(1) drop-shadow(0 0 12px rgba(151,169,255,0.5))' }
                ], { duration: 400, easing: 'ease-out' });

                // Hit sparks
                const rect = defender.img.getBoundingClientRect();
                spawnBattleSparks(rect.left + rect.width/2, rect.top + rect.height/2);

                defender.hp = Math.max(0, defender.hp - dmg);
                defender.hpBar.style.width = defender.hp + '%';
                if (defender.hp < 30) {
                    defender.hpBar.style.background = 'linear-gradient(90deg, #ff3030, #ff6347)';
                } else if (defender.hp < 60) {
                    defender.hpBar.style.background = 'linear-gradient(90deg, #FFD700, #FFA500)';
                }
            }, 200);

            setTimeout(doRound, 800);
        }
        doRound();
    }

    /* ── Battle sparks ────────────────────────────────────── */
    function spawnBattleSparks(x, y) {
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

    /* ── Finish battle ────────────────────────────────────── */
    function finishBattle(overlay, sideA, sideB, pkA, pkB, aWins) {
        const winner = aWins ? sideA : sideB;
        const loser = aWins ? sideB : sideA;
        const winPk = aWins ? pkA : pkB;
        const losePk = aWins ? pkB : pkA;

        // Loser falls
        loser.img.animate([
            { transform: `scaleX(${loser === sideB ? -1 : 1}) translateY(0)`, opacity: 1 },
            { transform: `scaleX(${loser === sideB ? -1 : 1}) translateY(30px) rotate(${rand(-20,20)}deg)`, opacity: 0 }
        ], { duration: 500, fill: 'forwards', easing: 'ease-in' });

        // Winner bounces
        winner.img.animate([
            { transform: `scaleX(${winner === sideB ? -1 : 1}) translateY(0)` },
            { transform: `scaleX(${winner === sideB ? -1 : 1}) translateY(-15px)`, offset: 0.4 },
            { transform: `scaleX(${winner === sideB ? -1 : 1}) translateY(0)` }
        ], { duration: 500, easing: 'ease-in-out', iterations: 2 });

        // WIN! text
        const winText = document.createElement('div');
        winText.textContent = 'WIN!';
        Object.assign(winText.style, {
            position: 'fixed', left: '50%', top: '38%',
            transform: 'translate(-50%,-50%) scale(0)',
            fontFamily: "'Space Grotesk', sans-serif", fontWeight: '900',
            fontSize: '48px', color: '#4ECDC4',
            textShadow: '0 0 15px #4ECDC4, 0 0 30px #44d62c, 0 4px 8px rgba(0,0,0,0.8)',
            pointerEvents: 'none', zIndex: '20003', letterSpacing: '8px'
        });
        document.body.appendChild(winText);
        winText.animate([
            { transform: 'translate(-50%,-50%) scale(0)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(1.3)', opacity: 1, offset: 0.4 },
            { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 }
        ], { duration: 500, fill: 'forwards', easing: 'ease-out' });

        // Stars burst around winner
        const colors = ['#FFD700', '#FFF', '#4ECDC4', '#A78BFA', '#ff6e84'];
        for (let i = 0; i < 10; i++) {
            const star = document.createElement('div');
            star.textContent = '✦';
            Object.assign(star.style, {
                position: 'fixed', left: '50%', top: '50%',
                fontSize: rand(12,20)+'px', color: pick(colors),
                textShadow: `0 0 8px ${pick(colors)}`,
                pointerEvents: 'none', zIndex: '20004'
            });
            document.body.appendChild(star);
            const angle = (Math.PI*2/10)*i;
            const dist = rand(50,100);
            star.animate([
                { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
                { transform: `translate(calc(-50% + ${Math.cos(angle)*dist}px), calc(-50% + ${Math.sin(angle)*dist}px)) scale(0)`, opacity: 0 }
            ], { duration: 800, easing: 'ease-out', fill: 'forwards' }).onfinish = () => star.remove();
        }

        // Close after delay
        setTimeout(() => {
            overlay.animate([
                { background: 'rgba(0,0,0,0.8)' },
                { background: 'rgba(0,0,0,0)' }
            ], { duration: 400, fill: 'forwards' });
            winText.animate([
                { opacity: 1 }, { opacity: 0 }
            ], { duration: 400, fill: 'forwards' }).onfinish = () => winText.remove();

            setTimeout(() => {
                overlay.remove();

                // Winner — keep alive with glow, resume movement
                winPk.frozen = false;
                winPk.life = 15 * 60; // give more time
                winPk.el.style.opacity = '1';
                winPk.el.style.transition = 'none';
                winPk.img.style.filter = 'drop-shadow(0 0 14px #4ECDC4) brightness(1.2)';
                setTimeout(() => {
                    winPk.img.style.transition = 'filter 2s';
                    winPk.img.style.filter = '';
                }, 3000);

                // Loser — remove instantly
                losePk.dead = true;
                losePk.life = -100;
                losePk.el.style.opacity = '0';
                setTimeout(() => losePk.el.remove(), 500);

                // Reset battle slots
                battleSlots.length = 0;
                battleMode = false;
            }, 400);
        }, 2000);
    }

    /* ── Inject aura keyframes if not present ───────────────── */
    if (!document.querySelector('#ranch-wild-styles')) {
        const s = document.createElement('style');
        s.id = 'ranch-wild-styles';
        s.textContent = `
            @keyframes aura-pulse {
                0%,100% { opacity:0.6; transform:scale(1); }
                50% { opacity:1; transform:scale(1.15); }
            }
        `;
        document.head.appendChild(s);
    }

    /* ── Cursor glow (same as main page) ────────────────────── */
    const cursorGlow = document.querySelector('.cursor-glow');
    if (cursorGlow) {
        document.addEventListener('mousemove', (e) => {
            cursorGlow.style.left = e.clientX + 'px';
            cursorGlow.style.top = e.clientY + 'px';
        });
        document.addEventListener('mouseleave', () => cursorGlow.style.opacity = '0');
        document.addEventListener('mouseenter', () => cursorGlow.style.opacity = '1');
    }

})();

