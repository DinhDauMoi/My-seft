/**
 * POKEMON EXTRAS — Advanced features
 * Type Matchup, Chat Bubbles, Gacha, NPC Trainer, Biomes
 */
(function(){
'use strict';

function waitForPokemon(cb){
    const check=()=>{
        if(window.__pkWorld) cb(window.__pkWorld);
        else setTimeout(check,200);
    };
    check();
}

waitForPokemon(function(W){
const {pokemons,flyers,container,POKEMON_TYPES,POKEMON_NAMES,SPRITE_SIZE,FLYER_SIZE,GROUND_OFFSET,rand,pick,spriteURL,MOVE_DATA} = W;

/* ═══ 1. TYPE MATCHUP TABLE ═══ */
const EFF={
    fire:{grass:2,ice:2,bug:2,steel:2,water:0.5,rock:0.5,fire:0.5,dragon:0.5},
    water:{fire:2,ground:2,rock:2,water:0.5,grass:0.5,dragon:0.5},
    electric:{water:2,flying:2,electric:0.5,grass:0.5,ground:0,dragon:0.5},
    grass:{water:2,ground:2,rock:2,fire:0.5,grass:0.5,flying:0.5,poison:0.5,bug:0.5,dragon:0.5,steel:0.5},
    ice:{grass:2,ground:2,flying:2,dragon:2,fire:0.5,water:0.5,ice:0.5,steel:0.5},
    fighting:{normal:2,ice:2,rock:2,dark:2,steel:2,poison:0.5,flying:0.5,psychic:0.5,bug:0.5,fairy:0.5,ghost:0},
    poison:{grass:2,fairy:2,poison:0.5,ground:0.5,rock:0.5,ghost:0.5,steel:0},
    ground:{fire:2,electric:2,poison:2,rock:2,steel:2,grass:0.5,bug:0.5,flying:0},
    flying:{grass:2,fighting:2,bug:2,electric:0.5,rock:0.5,steel:0.5},
    psychic:{fighting:2,poison:2,psychic:0.5,steel:0.5,dark:0},
    bug:{grass:2,psychic:2,dark:2,fire:0.5,fighting:0.5,poison:0.5,flying:0.5,ghost:0.5,steel:0.5,fairy:0.5},
    rock:{fire:2,ice:2,flying:2,bug:2,fighting:0.5,ground:0.5,steel:0.5},
    ghost:{psychic:2,ghost:2,dark:0.5,normal:0},
    dragon:{dragon:2,steel:0.5,fairy:0},
    dark:{psychic:2,ghost:2,fighting:0.5,dark:0.5,fairy:0.5},
    steel:{ice:2,rock:2,fairy:2,fire:0.5,water:0.5,electric:0.5,steel:0.5},
    fairy:{fighting:2,dragon:2,dark:2,fire:0.5,poison:0.5,steel:0.5},
    normal:{rock:0.5,steel:0.5,ghost:0}
};

window.calcTypeDamage = function(base, atk, def){
    const aType = POKEMON_TYPES[atk.id]||'normal';
    const dType = POKEMON_TYPES[def.id]||'normal';
    const mult = (EFF[aType]&&EFF[aType][dType]) ?? 1;
    const dmg = Math.round(base * mult);
    if(mult > 1) showEffText(def, '⚡ Super Effective!', '#FFD700');
    else if(mult < 1 && mult > 0) showEffText(def, 'Not very effective...', '#888');
    else if(mult === 0) showEffText(def, 'No effect!', '#555');
    return Math.max(1, dmg);
};

function showEffText(pk, text, color){
    const el = document.createElement('div');
    el.textContent = text;
    Object.assign(el.style,{
        position:'absolute',top:'-22px',left:'50%',transform:'translateX(-50%)',
        fontFamily:"'Space Grotesk'",fontSize:'9px',fontWeight:'800',
        color:color,pointerEvents:'none',zIndex:'10015',whiteSpace:'nowrap',
        textShadow:'0 0 6px '+color
    });
    pk.el.appendChild(el);
    el.animate([
        {opacity:1,transform:'translateX(-50%) translateY(0)'},
        {opacity:0,transform:'translateX(-50%) translateY(-18px)'}
    ],{duration:1200,fill:'forwards'}).onfinish=()=>el.remove();
}

/* ═══ 2. CHAT BUBBLES ═══ */
const CHAT_LINES=[
    '😤 Fight me!','💤 Zzz...','🍖 Hungry...',
    '👋 Hi there!','💪 I\'m strong!','🎵 La la la~','😎 Cool!',
    '🤔 Hmm...','❤️ Love you!','🔥 Let\'s go!','🌟 Wow!',
    '😂 Haha!','🎮 Play?','🏃 Run!','☀️ Nice weather!'
];

function spawnChatBubble(){
    const all=[...pokemons,...flyers].filter(p=>p.state!=='battling'&&p.state!=='frozen');
    if(!all.length) return;
    const pk = pick(all);
    const isFlyer = flyers.includes(pk);
    const sz = isFlyer ? FLYER_SIZE : SPRITE_SIZE;
    const bubble = document.createElement('div');
    bubble.textContent = pick(CHAT_LINES);
    Object.assign(bubble.style,{
        position:'absolute',left:(sz/2)+'px',top:'-28px',
        transform:'translateX(-50%)',
        background:'rgba(255,255,255,0.95)',color:'#333',
        fontFamily:"'Manrope',sans-serif",fontSize:'9px',fontWeight:'600',
        padding:'3px 8px',borderRadius:'8px',
        boxShadow:'0 2px 8px rgba(0,0,0,0.3)',
        pointerEvents:'none',zIndex:'10012',whiteSpace:'nowrap'
    });
    pk.el.appendChild(bubble);
    bubble.animate([
        {opacity:0,transform:'translateX(-50%) translateY(5px) scale(0.8)'},
        {opacity:1,transform:'translateX(-50%) translateY(0) scale(1)', offset:0.15},
        {opacity:1,transform:'translateX(-50%) translateY(0) scale(1)', offset:0.8},
        {opacity:0,transform:'translateX(-50%) translateY(-8px) scale(0.9)'}
    ],{duration:3000,fill:'forwards'}).onfinish=()=>bubble.remove();
}
setInterval(spawnChatBubble, 6000);
setTimeout(spawnChatBubble, 3000);

/* ═══ 3. GACHA SUMMON SYSTEM ═══ */
const RARITY={common:60,rare:25,epic:10,legendary:5};
const RARITY_COLORS={common:'#aaa',rare:'#3e65ff',epic:'#bf81ff',legendary:'#FFD700'};
const LEGENDARY_IDS=[144,145,146,149,150,151,249,250,384,643,644];

function getRarity(){
    const r=Math.random()*100;
    if(r<RARITY.legendary) return 'legendary';
    if(r<RARITY.legendary+RARITY.epic) return 'epic';
    if(r<RARITY.legendary+RARITY.epic+RARITY.rare) return 'rare';
    return 'common';
}

const gachaBtn = document.createElement('div');
gachaBtn.textContent = '🎰 Summon';
Object.assign(gachaBtn.style,{
    position:'fixed',bottom:'12px',right:'12px',
    background:'linear-gradient(135deg,#3e65ff,#bf81ff)',
    color:'#fff',fontFamily:"'Space Grotesk'",fontSize:'12px',fontWeight:'800',
    padding:'8px 14px',borderRadius:'12px',cursor:'pointer',
    zIndex:'10016',pointerEvents:'auto',
    boxShadow:'0 0 20px rgba(62,101,255,0.3)',
    border:'1px solid rgba(255,255,255,0.2)',
    transition:'transform 0.2s, box-shadow 0.2s'
});
gachaBtn.addEventListener('mouseenter',()=>{gachaBtn.style.transform='scale(1.1)';gachaBtn.style.boxShadow='0 0 30px rgba(191,129,255,0.5)';});
gachaBtn.addEventListener('mouseleave',()=>{gachaBtn.style.transform='scale(1)';gachaBtn.style.boxShadow='0 0 20px rgba(62,101,255,0.3)';});
document.body.appendChild(gachaBtn);

let gachaRunning=false;
gachaBtn.addEventListener('click',()=>{
    if(gachaRunning) return;
    gachaRunning=true;
    const overlay=document.createElement('div');
    Object.assign(overlay.style,{
        position:'fixed',inset:'0',background:'rgba(0,0,0,0.8)',
        zIndex:'10030',display:'flex',alignItems:'center',justifyContent:'center',
        flexDirection:'column',gap:'16px',fontFamily:"'Space Grotesk'"
    });
    document.body.appendChild(overlay);
    const rarity=getRarity();
    const pool = rarity==='legendary' ? LEGENDARY_IDS : W.ALL_POKEMON_IDS;
    const resultId = pick(pool);
    const resultName = POKEMON_NAMES[resultId]||`#${resultId}`;
    const color = RARITY_COLORS[rarity];

    const reel=document.createElement('div');
    Object.assign(reel.style,{width:'120px',height:'120px',borderRadius:'50%',
        border:`3px solid ${color}`,display:'flex',alignItems:'center',justifyContent:'center',
        background:'rgba(255,255,255,0.05)',boxShadow:`0 0 40px ${color}40`,overflow:'hidden'
    });
    const reelImg=document.createElement('img');
    reelImg.style.cssText='width:80px;height:80px;image-rendering:pixelated;';
    reel.appendChild(reelImg);
    overlay.appendChild(reel);

    let spins=0;const totalSpins=20;
    const spinInterval=setInterval(()=>{
        reelImg.src=spriteURL(pick(W.ALL_POKEMON_IDS));
        reel.style.transform=`rotate(${spins*18}deg)`;
        spins++;
        if(spins>=totalSpins){
            clearInterval(spinInterval);
            reelImg.src=spriteURL(resultId);
            reel.style.transform='rotate(0) scale(1.2)';
            reel.style.transition='transform 0.3s';
            reel.style.boxShadow=`0 0 60px ${color}`;
            setTimeout(()=>{
                const label=document.createElement('div');
                label.innerHTML=`<div style="font-size:28px;font-weight:900;color:${color};text-shadow:0 0 20px ${color}">${rarity.toUpperCase()}!</div>
                    <div style="font-size:16px;color:#fff;margin-top:4px">#${resultId} ${resultName}</div>`;
                label.style.textAlign='center';
                overlay.appendChild(label);
                label.animate([{opacity:0,transform:'scale(0)'},{opacity:1,transform:'scale(1)'}],{duration:400,fill:'forwards'});
                for(let i=0;i<15;i++){
                    const s=document.createElement('div');
                    s.textContent=pick(['✦','★','✧','⭐','💫']);
                    Object.assign(s.style,{position:'fixed',left:'50%',top:'50%',fontSize:rand(12,24)+'px',color:color,pointerEvents:'none',zIndex:'10031'});
                    overlay.appendChild(s);
                    const a=(Math.PI*2/15)*i,d=rand(80,180);
                    s.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(calc(-50% + ${Math.cos(a)*d}px),calc(-50% + ${Math.sin(a)*d}px)) scale(0)`,opacity:0}],{duration:800,fill:'forwards'});
                }
                setTimeout(()=>{
                    overlay.addEventListener('click',()=>{
                        overlay.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'}).onfinish=()=>{overlay.remove();gachaRunning=false;};
                        if(W.FLYING_IDS&&W.FLYING_IDS.has(resultId)) flyers.push(new W.FlyingPokemon(resultId));
                        else pokemons.push(new W.Pokemon(resultId));
                    });
                },500);
            },400);
        }
    },80);
});



/* ═══ 5. SILENT TOURNAMENT (no popup, feeds scoreboard) ═══ */
let tournamentActive=false;
function runSilentTournament(){
    if(tournamentActive) return;
    const all=[...pokemons,...flyers].filter(p=>p.state!=='battling'&&p.state!=='frozen');
    if(all.length<4) return;
    tournamentActive=true;

    let fighters=all.sort(()=>Math.random()-0.5).slice(0,Math.min(8,all.length));

    function simRound(){
        if(fighters.length<=1){
            // Winner gets +3 score
            if(fighters[0]){
                fighters[0]._wins = (fighters[0]._wins||0) + 3;
                // Update scoreboard in pokemon.js
                if(typeof window.__pkSaveScore === 'function') window.__pkSaveScore(fighters[0]);
            }
            tournamentActive=false;
            return;
        }
        const next=[];
        for(let i=0;i<fighters.length;i+=2){
            if(i+1>=fighters.length){next.push(fighters[i]);continue;}
            const a=fighters[i],b=fighters[i+1];
            const aType=POKEMON_TYPES[a.id]||'normal',bType=POKEMON_TYPES[b.id]||'normal';
            const aMult=(EFF[aType]&&EFF[aType][bType])??1;
            const bMult=(EFF[bType]&&EFF[bType][aType])??1;
            const winner=aMult>bMult?a:aMult<bMult?b:Math.random()<0.5?a:b;
            // Each round winner gets +1
            winner._wins = (winner._wins||0) + 1;
            if(typeof window.__pkSaveScore === 'function') window.__pkSaveScore(winner);
            next.push(winner);
        }
        fighters=next;
        setTimeout(simRound,500);
    }
    simRound();
}
setTimeout(runSilentTournament,40000);
setInterval(()=>{if(!tournamentActive)runSilentTournament();},90000);

/* ═══ 6. BIOME ZONES ═══ */
const biomes=[
    {name:'🌊 Ocean',x:0,w:0.25,types:['water','ice'],color:'rgba(30,144,255,0.06)'},
    {name:'🌿 Forest',x:0.25,w:0.25,types:['grass','bug','poison'],color:'rgba(34,139,34,0.06)'},
    {name:'🏔️ Mountain',x:0.5,w:0.25,types:['rock','ground','steel','fighting'],color:'rgba(139,119,101,0.06)'},
    {name:'⚡ Electric Field',x:0.75,w:0.25,types:['electric','fire','dragon'],color:'rgba(255,215,0,0.06)'}
];

const biomeOverlay=document.createElement('div');
biomeOverlay.id='biome-overlay';
Object.assign(biomeOverlay.style,{position:'fixed',inset:'0',pointerEvents:'none',zIndex:'0'});
biomes.forEach(b=>{
    const zone=document.createElement('div');
    Object.assign(zone.style,{
        position:'absolute',left:(b.x*100)+'%',top:'0',width:(b.w*100)+'%',height:'100%',
        background:b.color,borderRight:'1px solid rgba(255,255,255,0.03)'
    });
    biomeOverlay.appendChild(zone);
});
document.body.appendChild(biomeOverlay);


/* ═══ 🌋 RAID BOSS EVENT ═══ */
const BOSS_IDS=[150,384,249,250,643,644,149]; // Legendary bosses
let raidActive=false;

function startRaidBoss(){
    if(raidActive) return;
    const fighters=[...pokemons,...flyers].filter(p=>p.state!=='battling'&&p.state!=='frozen');
    if(fighters.length<3) return;
    raidActive=true;

    const bossId=pick(BOSS_IDS);
    const bossName=POKEMON_NAMES[bossId]||`Boss #${bossId}`;
    const bossType=POKEMON_TYPES[bossId]||'dragon';
    const bossMaxHp=500;
    let bossHp=bossMaxHp;

    // ── Screen shake warning ──
    document.body.style.animation='raidShake 0.1s ease-in-out 6';
    const warn=document.createElement('div');
    warn.textContent='⚠️ RAID BOSS INCOMING!';
    Object.assign(warn.style,{
        position:'fixed',top:'40%',left:'50%',transform:'translate(-50%,-50%)',
        fontFamily:"'Space Grotesk'",fontSize:'28px',fontWeight:'900',
        color:'#ff3030',textShadow:'0 0 30px #ff3030,0 0 60px #ff0000',
        pointerEvents:'none',zIndex:'10050',whiteSpace:'nowrap',letterSpacing:'2px'
    });
    document.body.appendChild(warn);
    warn.animate([
        {opacity:0,transform:'translate(-50%,-50%) scale(0.3)'},
        {opacity:1,transform:'translate(-50%,-50%) scale(1.1)',offset:0.2},
        {opacity:1,transform:'translate(-50%,-50%) scale(1)',offset:0.8},
        {opacity:0,transform:'translate(-50%,-50%) scale(1.3)'}
    ],{duration:2500,fill:'forwards'}).onfinish=()=>warn.remove();

    // ── Spawn boss after warning ──
    setTimeout(()=>{
        document.body.style.animation='';
        const boss=document.createElement('div');
        boss.id='raid-boss';
        const bossImg=document.createElement('img');
        bossImg.src=spriteURL(bossId);
        bossImg.style.cssText=`width:${SPRITE_SIZE*4}px;height:${SPRITE_SIZE*4}px;image-rendering:pixelated;filter:brightness(1.2) drop-shadow(0 0 20px rgba(255,0,0,0.6)) hue-rotate(15deg);`;
        boss.appendChild(bossImg);
        Object.assign(boss.style,{
            position:'fixed',left:'50%',top:'-200px',
            transform:'translateX(-50%)',zIndex:'10040',
            pointerEvents:'none',transition:'top 1s ease-out'
        });
        document.body.appendChild(boss);

        // Boss name label
        const nameTag=document.createElement('div');
        nameTag.textContent=`💀 ${bossName}`;
        Object.assign(nameTag.style,{
            textAlign:'center',fontFamily:"'Space Grotesk'",fontSize:'14px',
            fontWeight:'900',color:'#ff3030',marginTop:'4px',
            textShadow:'0 0 10px rgba(255,0,0,0.5)'
        });
        boss.appendChild(nameTag);

        // Boss HP bar
        const hpWrap=document.createElement('div');
        Object.assign(hpWrap.style,{
            width:(SPRITE_SIZE*4)+'px',height:'12px',background:'rgba(0,0,0,0.7)',
            borderRadius:'6px',overflow:'hidden',margin:'4px auto 0',
            border:'1px solid rgba(255,0,0,0.4)'
        });
        const hpFill=document.createElement('div');
        Object.assign(hpFill.style,{
            width:'100%',height:'100%',
            background:'linear-gradient(90deg,#ff3030,#ff6060)',
            borderRadius:'6px',transition:'width 0.3s ease'
        });
        hpWrap.appendChild(hpFill);
        boss.appendChild(hpWrap);

        // HP text
        const hpText=document.createElement('div');
        hpText.textContent=`${bossHp}/${bossMaxHp}`;
        Object.assign(hpText.style,{
            textAlign:'center',fontFamily:"'Space Grotesk'",fontSize:'10px',
            color:'#ff6060',fontWeight:'700',marginTop:'2px'
        });
        boss.appendChild(hpText);

        // Slide boss in
        requestAnimationFrame(()=>{boss.style.top='60px';});

        // ── Attack sequence ──
        const attackers=fighters.slice(0,8); // Max 8 attackers
        let atkIdx=0;

        function bossRound(){
            if(bossHp<=0){
                bossDefeated();
                return;
            }
            if(atkIdx>=attackers.length){
                // Boss counter-attack!
                bossCounterAttack();
                atkIdx=0;
                setTimeout(bossRound,1500);
                return;
            }
            const pk=attackers[atkIdx];
            atkIdx++;
            if(!pk.el||!pk.el.parentNode){setTimeout(bossRound,300);return;}

            // ── Pokemon visibly lunges toward boss ──
            const pkRect=pk.el.getBoundingClientRect();
            const bossRect=boss.getBoundingClientRect();
            const bossCenter={x:bossRect.left+bossRect.width/2, y:bossRect.top+bossRect.height/2};
            const pkCenter={x:pkRect.left+pkRect.width/2, y:pkRect.top+pkRect.height/2};
            const jumpX=bossCenter.x-pkCenter.x;
            const jumpY=bossCenter.y-pkCenter.y;
            pk.el.style.zIndex='10044';
            pk.el.animate([
                {transform:`translate3d(${pk.x}px,${pk.y}px,0) scale(1)`,offset:0},
                {transform:`translate3d(${pk.x+jumpX*0.7}px,${pk.y+jumpY*0.7}px,0) scale(1.3)`,offset:0.4},
                {transform:`translate3d(${pk.x+jumpX*0.8}px,${pk.y+jumpY*0.8}px,0) scale(1.4)`,offset:0.5},
                {transform:`translate3d(${pk.x}px,${pk.y}px,0) scale(1)`,offset:1}
            ],{duration:600,easing:'ease-in-out'});

            const pkName=POKEMON_NAMES[pk.id]||`#${pk.id}`;
            const pkType=POKEMON_TYPES[pk.id]||'normal';
            const moveInfo=MOVE_DATA[pkType]||MOVE_DATA.normal;
            const mult=(EFF[pkType]&&EFF[pkType][bossType])??1;
            const baseDmg=20+Math.floor(Math.random()*15);
            const dmg=Math.max(1,Math.round(baseDmg*mult));

            // Show attack text
            const atkText=document.createElement('div');
            atkText.innerHTML=`${moveInfo.emoji} ${pkName} used <b>${pick(moveInfo.moves)}</b>! <span style="color:${mult>1?'#FFD700':mult<1?'#888':'#fff'}">${dmg>30?'💥':'⚡'} -${dmg}</span>`;
            Object.assign(atkText.style,{
                position:'fixed',bottom:(120+atkIdx*18)+'px',left:'50%',
                transform:'translateX(-50%)',fontFamily:"'Space Grotesk'",
                fontSize:'11px',color:'#eee',pointerEvents:'none',
                zIndex:'10045',whiteSpace:'nowrap',
                textShadow:'0 1px 4px rgba(0,0,0,0.8)'
            });
            document.body.appendChild(atkText);
            atkText.animate([
                {opacity:0,transform:'translateX(-50%) translateY(10px)'},
                {opacity:1,transform:'translateX(-50%) translateY(0)',offset:0.15},
                {opacity:1,transform:'translateX(-50%) translateY(0)',offset:0.7},
                {opacity:0,transform:'translateX(-50%) translateY(-10px)'}
            ],{duration:2000,fill:'forwards'}).onfinish=()=>atkText.remove();

            // Effectiveness text
            if(mult>1){
                const se=document.createElement('div');
                se.textContent='⚡ SUPER EFFECTIVE!';
                Object.assign(se.style,{position:'fixed',top:'180px',left:'50%',transform:'translateX(-50%)',fontFamily:"'Space Grotesk'",fontSize:'13px',fontWeight:'900',color:'#FFD700',textShadow:'0 0 15px #FFD700',pointerEvents:'none',zIndex:'10046',whiteSpace:'nowrap'});
                document.body.appendChild(se);
                se.animate([{opacity:0,transform:'translateX(-50%) scale(0.5)'},{opacity:1,transform:'translateX(-50%) scale(1.2)',offset:0.2},{opacity:0,transform:'translateX(-50%) scale(0.8)'}],{duration:1000,fill:'forwards'}).onfinish=()=>se.remove();
            }

            // Boss hit flash
            bossImg.animate([{filter:'brightness(3)'},{filter:'brightness(1.2) drop-shadow(0 0 20px rgba(255,0,0,0.6)) hue-rotate(15deg)'}],{duration:200});

            // Apply damage
            bossHp=Math.max(0,bossHp-dmg);
            hpFill.style.width=(bossHp/bossMaxHp*100)+'%';
            hpText.textContent=`${bossHp}/${bossMaxHp}`;
            if(bossHp<bossMaxHp*0.3) hpFill.style.background='linear-gradient(90deg,#ff0000,#ff3030)';

            // Hit particles
            for(let i=0;i<5;i++){
                const sp=document.createElement('div');
                sp.textContent=pick(['💥','⭐','✦','🔥','⚡']);
                Object.assign(sp.style,{position:'fixed',left:'50%',top:'140px',fontSize:rand(10,18)+'px',pointerEvents:'none',zIndex:'10042'});
                document.body.appendChild(sp);
                const a=Math.random()*Math.PI*2,d=rand(30,80);
                sp.animate([{opacity:1,transform:`translate(-50%,0) scale(1)`},{opacity:0,transform:`translate(calc(-50% + ${Math.cos(a)*d}px),${Math.sin(a)*d}px) scale(0)`}],{duration:500,fill:'forwards'}).onfinish=()=>sp.remove();
            }

            setTimeout(bossRound,600);
        }

        function bossCounterAttack(){
            // Boss attacks all Pokemon
            const counter=document.createElement('div');
            counter.textContent=`💀 ${bossName} COUNTER-ATTACKS!`;
            Object.assign(counter.style,{
                position:'fixed',top:'50%',left:'50%',transform:'translate(-50%,-50%)',
                fontFamily:"'Space Grotesk'",fontSize:'18px',fontWeight:'900',
                color:'#ff3030',textShadow:'0 0 20px #ff0000',
                pointerEvents:'none',zIndex:'10048',whiteSpace:'nowrap'
            });
            document.body.appendChild(counter);
            counter.animate([{opacity:0,transform:'translate(-50%,-50%) scale(0.5)'},{opacity:1,transform:'translate(-50%,-50%) scale(1.1)',offset:0.3},{opacity:0,transform:'translate(-50%,-50%) scale(0.9)'}],{duration:1500,fill:'forwards'}).onfinish=()=>counter.remove();

            // Screen flash red
            const flash=document.createElement('div');
            Object.assign(flash.style,{position:'fixed',inset:'0',background:'rgba(255,0,0,0.15)',pointerEvents:'none',zIndex:'10041'});
            document.body.appendChild(flash);
            flash.animate([{opacity:1},{opacity:0}],{duration:500,fill:'forwards'}).onfinish=()=>flash.remove();

            // Boss beam animation
            bossImg.animate([
                {transform:'scale(1)'},
                {transform:'scale(1.3)',offset:0.3},
                {transform:'scale(1)'}
            ],{duration:600});
        }

        function bossDefeated(){
            // Victory!
            const vic=document.createElement('div');
            vic.innerHTML=`<div style="font-size:32px;font-weight:900;color:#4ECDC4;text-shadow:0 0 30px #4ECDC4">🎉 RAID CLEAR!</div>
                <div style="font-size:16px;color:#FFD700;margin-top:8px">💀 ${bossName} defeated!</div>`;
            Object.assign(vic.style,{
                position:'fixed',top:'40%',left:'50%',transform:'translate(-50%,-50%)',
                fontFamily:"'Space Grotesk'",textAlign:'center',
                pointerEvents:'none',zIndex:'10055',whiteSpace:'nowrap'
            });
            document.body.appendChild(vic);
            vic.animate([{opacity:0,transform:'translate(-50%,-50%) scale(0)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:600,easing:'ease-out',fill:'forwards'});

            // Boss explode
            bossImg.animate([{transform:'scale(1)',filter:'brightness(1.2)'},{transform:'scale(2)',filter:'brightness(5)',offset:0.5},{transform:'scale(0)',filter:'brightness(10)',opacity:0}],{duration:1000,fill:'forwards'});

            // FIREWORKS!
            let fw=0;
            const fwInterval=setInterval(()=>{
                fw++;
                if(fw>20){clearInterval(fwInterval);return;}
                const x=rand(100,window.innerWidth-100),y=rand(50,window.innerHeight*0.6);
                for(let i=0;i<12;i++){
                    const p=document.createElement('div');
                    const c=pick(['#FFD700','#ff6e84','#4ECDC4','#bf81ff','#3e65ff','#ff3030','#00ff88']);
                    p.textContent=pick(['✦','★','✧','●','◆']);
                    Object.assign(p.style,{position:'fixed',left:x+'px',top:y+'px',fontSize:rand(8,16)+'px',color:c,pointerEvents:'none',zIndex:'10052',textShadow:`0 0 6px ${c}`});
                    document.body.appendChild(p);
                    const a=(Math.PI*2/12)*i,d=rand(40,100);
                    p.animate([
                        {transform:'scale(1)',opacity:1},
                        {transform:`translate(${Math.cos(a)*d}px,${Math.sin(a)*d}px) scale(0)`,opacity:0}
                    ],{duration:rand(600,1000),fill:'forwards'}).onfinish=()=>p.remove();
                }
            },150);

            // Award wins to all attackers
            attackers.forEach(pk=>{
                pk._wins=(pk._wins||0)+2;
                if(typeof window.__pkSaveScore==='function') window.__pkSaveScore(pk);
            });

            // Drop rare Pokemon reward
            setTimeout(()=>{
                const rewardId=pick(BOSS_IDS);
                const reward=document.createElement('div');
                reward.innerHTML=`<div style="font-size:12px;color:#FFD700;font-weight:900;font-family:'Space Grotesk';text-align:center;text-shadow:0 0 10px #FFD700">🎁 REWARD!</div>`;
                const rwImg=document.createElement('img');
                rwImg.src=spriteURL(rewardId);
                rwImg.style.cssText=`width:${SPRITE_SIZE*2}px;height:${SPRITE_SIZE*2}px;image-rendering:pixelated;filter:drop-shadow(0 0 15px rgba(255,215,0,0.8));`;
                reward.appendChild(rwImg);
                Object.assign(reward.style,{position:'fixed',left:'50%',top:'50%',transform:'translate(-50%,-50%)',zIndex:'10053',pointerEvents:'none'});
                document.body.appendChild(reward);
                reward.animate([{opacity:0,transform:'translate(-50%,-50%) scale(0)'},{opacity:1,transform:'translate(-50%,-50%) scale(1)'}],{duration:500,easing:'ease-out',fill:'forwards'});

                // Spawn it
                if(W.FLYING_IDS&&W.FLYING_IDS.has(rewardId)) flyers.push(new W.FlyingPokemon(rewardId));
                else pokemons.push(new W.Pokemon(rewardId));

                setTimeout(()=>{
                    reward.animate([{opacity:1},{opacity:0}],{duration:500,fill:'forwards'}).onfinish=()=>reward.remove();
                    vic.animate([{opacity:1},{opacity:0}],{duration:500,fill:'forwards'}).onfinish=()=>vic.remove();
                    boss.animate([{opacity:1},{opacity:0}],{duration:300,fill:'forwards'}).onfinish=()=>boss.remove();
                    raidActive=false;
                },3000);
            },2000);
        }

        // Start attack sequence after boss slides in
        setTimeout(bossRound,1500);
    },2800); // after warning animation
}

// Inject shake keyframe
const raidStyle=document.createElement('style');
raidStyle.textContent=`@keyframes raidShake{0%,100%{transform:translate(0)}25%{transform:translate(-4px,2px)}50%{transform:translate(4px,-2px)}75%{transform:translate(-2px,4px)}}`;
document.head.appendChild(raidStyle);

// Raid every 30 minutes
setTimeout(startRaidBoss,1800000);
setInterval(()=>{if(!raidActive)startRaidBoss();},1800000);

}); // end waitForPokemon
})();
