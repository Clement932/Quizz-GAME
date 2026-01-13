// --- CONFIGURATION ---
const API_URL = 'https://pokeapi.co/api/v2/';
const GENS = {
    '1': { min: 1, max: 151 }, '2': { min: 152, max: 251 }, '3': { min: 252, max: 386 },
    '4': { min: 387, max: 493 }, '5': { min: 494, max: 649 }, '6': { min: 650, max: 721 },
    '7': { min: 722, max: 809 }, '8': { min: 810, max: 905 }, '9': { min: 906, max: 1025 },
    'all': { min: 1, max: 1025 }
};

const TYPE_COLORS = {
    normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C',
    grass: '#7AC74C', ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1',
    ground: '#E2BF65', flying: '#A98FF3', psychic: '#F95587', bug: '#A6B91A',
    rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC', steel: '#B7B7CE',
    fairy: '#D685AD'
};

const STAT_NAMES = { 'hp': 'PV', 'attack': 'Attaque', 'defense': 'Défense', 'special-attack': 'Atq. Spé.', 'special-defense': 'Déf. Spé.', 'speed': 'Vitesse' };
const TRANSLATIONS = { normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik', grass: 'Plante', ice: 'Glace', fighting: 'Combat', poison: 'Poison', ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte', rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', steel: 'Acier', fairy: 'Fée' };

const ACHIEVEMENTS_LIST = [
    { id: 'first_blood', name: 'Débutant', desc: '1 Pokémon trouvé', target: 1 },
    { id: 'collector', name: 'Expert', desc: '50 Pokémon trouvés', target: 50 },
    { id: 'rich', name: 'Picsou', desc: 'Avoir 1000 💎', moneyTarget: 1000 },
    { id: 'streak_master', name: 'En feu !', desc: 'Combo x10', comboTarget: 10 },
    { id: 'sniper', name: 'Sniper', desc: 'Score de 50 en une partie', scoreTarget: 50 }
];

// --- ÉTAT GLOBAL ---
let gameState = {
    mode: 'quiz',
    currentGenLimits: GENS['1'],
    isShiny: false,
    lives: 3,
    score: 0,
    combo: 0,
    money: parseInt(localStorage.getItem('pokeMoney')) || 0,
    inventory: JSON.parse(localStorage.getItem('pokeInventory')) || { berry: 0, masterball: 0, smoke: 0 },
    pokedexNormal: JSON.parse(localStorage.getItem('pokedexNormal')) || [],
    pokedexShiny: JSON.parse(localStorage.getItem('pokedexShiny')) || [],
    achievements: JSON.parse(localStorage.getItem('pokeAchievements')) || [],
    idPool: [],
    currentPokemon: null,
    tempRoundData: null,
    isPreloading: false,
    timerInterval: null,
    roundActive: false,
    hangmanTries: 0,
    hangmanHidden: [],
    timerPaused: false,
    currentDexTab: 'normal'
};

// --- DOM ELEMENTS ---
const dom = {
    sections: { landing: document.getElementById('landing-section'), modeSelect: document.getElementById('mode-selection-section'), game: document.getElementById('game-interface-section'), shop: document.getElementById('shop-section'), achievements: document.getElementById('achievements-section'), pokedex: document.getElementById('pokedex-section'), gameOver: document.getElementById('game-over-section') },
    ui: {
        loader: document.getElementById('loader-overlay'), loaderText: document.getElementById('loader-text'),
        lives: document.getElementById('lives-display'), score: document.getElementById('current-score'),
        money: document.getElementById('user-money'), shopMoney: document.getElementById('shop-money'),
        img: document.getElementById('poke-img'),
        question: document.getElementById('question-text'), options: document.getElementById('options-container'),
        hangmanInterface: document.getElementById('hangman-interface'), wordDisplay: document.getElementById('word-display'),
        keyboard: document.getElementById('keyboard-grid'), info: document.getElementById('pokemon-info'),
        infoTitle: document.getElementById('info-result-title'), infoName: document.getElementById('info-name'),
        infoTypes: document.getElementById('info-types'), timerFill: document.getElementById('timer-fill'),
        hunterTarget: document.getElementById('hunter-target-display'), hunterText: document.getElementById('hunter-type-text'),
        bg: document.getElementById('bg-layer'), genSelect: document.getElementById('gen-select'),
        shinyToggle: document.getElementById('shiny-toggle'), comboDisplay: document.getElementById('combo-display'),
        comboCount: document.getElementById('combo-count'), hintBtn: document.getElementById('hint-btn'),
        dexGenSelect: document.getElementById('dex-gen-select')
    }
};

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    updateGlobalUI();
    resetBackground();
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('btn-enter-game').addEventListener('click', () => showSection('modeSelect'));
    document.getElementById('header-logo-btn').addEventListener('click', returnToHome);
    document.querySelectorAll('.back-btn, .back-to-landing').forEach(b => b.addEventListener('click', () => b.classList.contains('back-btn') ? showSection('modeSelect') : returnToHome()));
    document.getElementById('home-btn').addEventListener('click', returnToHome);
    document.getElementById('quit-game-btn').addEventListener('click', returnToHome);
    document.getElementById('retry-btn').addEventListener('click', () => startGame(gameState.mode));
    
    document.querySelectorAll('.mode-card').forEach(card => card.addEventListener('click', () => selectGameMode(card.dataset.mode)));
    
    dom.ui.genSelect.addEventListener('change', (e) => gameState.currentGenLimits = GENS[e.target.value]);
    dom.ui.shinyToggle.addEventListener('change', (e) => gameState.isShiny = e.target.checked);
    document.getElementById('next-btn').addEventListener('click', applyNextRound);
    dom.ui.hintBtn.addEventListener('click', useHint);
    
    ['berry', 'smoke', 'masterball'].forEach(item => document.getElementById(`use-${item}`).addEventListener('click', () => useItem(item)));
    document.getElementById('shop-btn').addEventListener('click', () => showSection('shop'));
    document.querySelectorAll('.buy-btn').forEach(btn => btn.addEventListener('click', () => btn.id === 'buy-life-btn' ? buyLife() : buyItem(btn.dataset.item, parseInt(btn.dataset.cost))));
    
    document.addEventListener('keydown', (e) => {
        if(gameState.mode === 'hangman' && gameState.roundActive) {
            const key = e.key.toUpperCase();
            if(/^[A-Z]$/.test(key)) handleHangmanGuess(key, null, normalizeName(gameState.currentPokemon.name));
        }
    });

    document.getElementById('landing-dex-btn').addEventListener('click', () => { showSection('pokedex'); renderPokedex(); });
    ['normal', 'shiny'].forEach(t => document.getElementById(`tab-${t}`).addEventListener('click', (e) => switchDexTab(e.target, t)));
    document.getElementById('landing-ach-btn').addEventListener('click', () => { showSection('achievements'); renderAchievements(); });
    
    dom.ui.dexGenSelect.addEventListener('change', () => renderPokedex());
}

function showSection(name) {
    Object.values(dom.sections).forEach(s => s.classList.add('hidden'));
    if(dom.sections[name]) dom.sections[name].classList.remove('hidden');
    window.scrollTo(0,0);
}

function returnToHome() {
    stopTimer();
    gameState.roundActive = false;
    resetBackground();
    showSection('landing');
}

// --- LOGIQUE JEU ---
function initIdPool() {
    gameState.idPool = [];
    for(let i = gameState.currentGenLimits.min; i <= gameState.currentGenLimits.max; i++) {
        gameState.idPool.push(i);
    }
    for (let i = gameState.idPool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [gameState.idPool[i], gameState.idPool[j]] = [gameState.idPool[j], gameState.idPool[i]];
    }
}

function getNextIdFromPool() {
    if(gameState.idPool.length === 0) initIdPool();
    return gameState.idPool.pop();
}

function selectGameMode(mode) {
    gameState.mode = mode;
    startGame(mode);
}

async function startGame(mode) {
    gameState.lives = 3;
    gameState.score = 0;
    gameState.combo = 0;
    gameState.timerPaused = false;
    initIdPool();
    
    updateGlobalUI();
    dom.ui.score.innerText = 0;
    resetBackground();

    dom.ui.options.classList.add('hidden');
    dom.ui.hangmanInterface.classList.add('hidden');
    dom.ui.hunterTarget.classList.add('hidden');
    dom.ui.hintBtn.style.display = 'inline-block';
    
    if(mode === 'quiz' || mode === 'stat') dom.ui.options.classList.remove('hidden');
    if(mode === 'hangman') dom.ui.hangmanInterface.classList.remove('hidden');
    if(mode === 'stat') {
        dom.ui.hunterTarget.classList.remove('hidden');
        dom.ui.hintBtn.style.display = 'none';
    }

    showSection('game');
    toggleLoader(true);
    
    await prepareRoundData();
    gameState.nextRoundData = gameState.tempRoundData;
    toggleLoader(false);
    applyNextRound();
}

async function prepareRoundData() {
    gameState.isPreloading = true;
    try {
        if(gameState.mode === 'stat') await prepareStatRound();
        else await prepareClassicRound();
    } catch (e) {
        console.error("Erreur fetch, nouvel essai...", e);
        await new Promise(r => setTimeout(r, 1000));
        await prepareRoundData();
    }
    gameState.isPreloading = false;
}

function preloadImage(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = url;
        img.onload = resolve;
        img.onerror = resolve;
    });
}

async function prepareClassicRound() {
    const targetId = getNextIdFromPool();
    const targetData = await fetchPokemonData(targetId);
    
    let answers = [];
    if(gameState.mode === 'quiz') {
        let ids = [targetId];
        const min = gameState.currentGenLimits.min;
        const max = gameState.currentGenLimits.max;
        
        while (ids.length < 4) {
            let rnd = Math.floor(Math.random() * (max - min + 1)) + min;
            if (!ids.includes(rnd)) ids.push(rnd);
        }
        
        const promises = ids.slice(1).map(id => fetchPokemonData(id));
        const wrongResults = await Promise.all(promises);
        
        answers = [{ name: targetData.name, correct: true }];
        wrongResults.forEach(p => answers.push({ name: p.name, correct: false }));
        answers.sort(() => Math.random() - 0.5);
    }

    await preloadImage(targetData.img);
    gameState.tempRoundData = { pokemon: targetData, answers: answers };
}

async function prepareStatRound() {
    const statKeys = ['hp', 'attack', 'defense', 'speed'];
    const targetStat = statKeys[Math.floor(Math.random() * statKeys.length)];
    
    let options = [];
    while(options.length < 2) {
        let id = getNextIdFromPool();
        if(!options.some(p => p.id === id)) {
            const p = await fetchPokemonData(id);
            p.statValue = p.stats.find(s => s.stat.name === targetStat).base_stat;
            p.statPercent = Math.min(100, (p.statValue / 200) * 100); 
            options.push(p);
        }
    }
    
    await Promise.all(options.map(o => preloadImage(o.img)));

    const winner = options[0].statValue >= options[1].statValue ? options[0] : options[1];
    options.forEach(p => p.correct = (p.id === winner.id));
    if(options[0].statValue === options[1].statValue) options[0].correct = true;

    gameState.tempRoundData = { targetStat: targetStat, options: options, pokemon: winner };
}

async function applyNextRound() {
    if (!gameState.tempRoundData && gameState.isPreloading) {
        toggleLoader(true);
        while(gameState.isPreloading) await new Promise(r => setTimeout(r, 100));
        toggleLoader(false);
    }
    
    const data = gameState.tempRoundData;
    gameState.currentPokemon = data.pokemon || null;
    gameState.roundActive = true;
    gameState.timerPaused = false;
    
    if(gameState.mode === 'hangman') gameState.hangmanTries = 8;

    updateGlobalUI();
    dom.ui.info.classList.add('hidden');
    dom.ui.hintBtn.disabled = false;
    
    // RESET UI
    dom.ui.img.style.transition = 'none'; 
    dom.ui.img.classList.remove('revealed-pop'); 
    dom.ui.img.classList.remove('revealed');
    dom.ui.img.style.filter = 'none'; 
    dom.ui.img.style.display = 'block';
    
    resetBackground();

    if(gameState.mode === 'quiz') {
        dom.ui.img.className = 'silhouette'; 
        dom.ui.question.innerText = "IDENTIFICATION";
        dom.ui.img.src = gameState.currentPokemon.img;
    } else if (gameState.mode === 'hangman') {
        dom.ui.img.className = 'silhouette'; 
        dom.ui.question.innerText = "DÉCRYPTAGE NOM";
        dom.ui.img.src = gameState.currentPokemon.img;
        setupHangmanUI(gameState.currentPokemon.name);
    } else if (gameState.mode === 'stat') { 
        dom.ui.img.style.display = 'none'; 
        dom.ui.question.innerText = "COMPARATIF PUISSANCE";
        dom.ui.hunterTarget.classList.remove('hidden');
        dom.ui.hunterText.innerText = STAT_NAMES[data.targetStat];
    }

    const container = dom.ui.options;
    container.innerHTML = '';
    
    if(gameState.mode === 'quiz') {
        container.className = 'grid-options';
        data.answers.forEach(ans => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = ans.name;
            btn.onclick = () => handleAnswer(ans.correct, btn);
            container.appendChild(btn);
        });
    } else if (gameState.mode === 'stat') {
        container.className = 'grid-options'; 
        data.options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'stat-option';
            div.innerHTML = `
                <img src="${opt.img}">
                <div class="stat-bar-container">
                    <div class="stat-bar-fill" style="width: 0%" data-width="${opt.statPercent}%"></div>
                </div>
                <div class="stat-value hidden">${opt.statValue}</div>
                <div class="poke-name-stat">${opt.name}</div>
            `;
            div.onclick = () => handleAnswer(opt.correct, div);
            container.appendChild(div);
        });
    }

    startDynamicTimer();
    gameState.tempRoundData = null;
    prepareRoundData();
}

function setupHangmanUI(name) {
    const cleanName = normalizeName(name);
    gameState.hangmanHidden = cleanName.split('').map(char => (/[a-z]/i.test(char) ? '_' : char));
    dom.ui.wordDisplay.innerText = gameState.hangmanHidden.join(' ');
    dom.ui.keyboard.innerHTML = '';
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ-".split('').forEach(letter => {
        const btn = document.createElement('button');
        btn.innerText = letter;
        btn.className = 'option-btn'; 
        btn.style.padding = '10px 0';
        btn.onclick = () => handleHangmanGuess(letter, btn, cleanName);
        dom.ui.keyboard.appendChild(btn);
    });
}

function handleHangmanGuess(letter, btn, fullName) {
    if(!gameState.roundActive) return;
    if(!btn) {
        const buttons = Array.from(dom.ui.keyboard.children);
        btn = buttons.find(b => b.innerText === letter);
        if(!btn || btn.disabled) return;
    }

    btn.disabled = true;
    const lowerLetter = letter.toLowerCase();
    const lowerName = fullName.toLowerCase();
    
    if (lowerName.includes(lowerLetter)) {
        btn.classList.add('correct');
        let complete = true;
        for(let i=0; i<lowerName.length; i++) {
            if(lowerName[i] === lowerLetter) gameState.hangmanHidden[i] = fullName[i]; 
            if(gameState.hangmanHidden[i] === '_') complete = false;
        }
        dom.ui.wordDisplay.innerText = gameState.hangmanHidden.join(' ');
        if(complete) handleAnswer(true, null);
    } else {
        btn.classList.add('wrong');
        gameState.hangmanTries--; 
        updateGlobalUI(); 
        if(gameState.hangmanTries <= 0) handleAnswer(false, null); 
    }
}

function handleAnswer(isCorrect, element) {
    if(!gameState.roundActive) return; 
    stopTimer();
    gameState.roundActive = false; 
        
    if(gameState.mode === 'quiz') {
        document.querySelectorAll('.option-btn').forEach(b => {
            b.disabled = true;
            if(b.innerText === gameState.currentPokemon.name) b.classList.add('correct');
            else if(b === element && !isCorrect) b.classList.add('wrong');
        });
    } else if (gameState.mode === 'stat') {
        document.querySelectorAll('.stat-option').forEach(div => {
            div.style.pointerEvents = 'none';
            const fill = div.querySelector('.stat-bar-fill');
            fill.style.width = fill.dataset.width;
            fill.style.background = div === element ? (isCorrect ? 'var(--success)' : 'var(--secondary)') : 'var(--primary)';
            div.querySelector('.stat-value').classList.remove('hidden');
        });
    }

    if(isCorrect) successFeedback();
    else loseGlobalLife();
}

function successFeedback() {
    if(gameState.mode !== 'stat') {
        dom.ui.img.classList.remove('silhouette');
        dom.ui.img.classList.add('revealed-pop');
        
        const type = gameState.currentPokemon.types[0].type.name;
        const color = TYPE_COLORS[type];
        dom.ui.bg.style.background = `radial-gradient(circle at 50% 50%, ${color} 0%, var(--bg-dark) 90%)`;
    }
    
    triggerConfetti();
    gameState.combo++;
    
    const basePoints = 10;
    const difficultyMult = Math.min(2, 1 + (gameState.score / 100));
    const comboBonus = gameState.combo * 2;
    const points = Math.floor((basePoints * difficultyMult) + comboBonus);
    
    let moneyGain = 5;
    if(gameState.combo > 5) moneyGain *= 2;
    if(gameState.combo > 10) moneyGain *= 3;
    
    gameState.score += points;
    gameState.money += moneyGain;
    
    addToPokedex(gameState.currentPokemon);
    checkAchievements();
    updateGlobalUI();
    showInfoPopup(true);
}

function loseGlobalLife() {
    gameState.combo = 0;
    gameState.lives--; 
    updateGlobalUI();
    
    if(gameState.mode !== 'stat') {
        dom.ui.img.classList.remove('silhouette');
        dom.ui.img.classList.add('revealed-pop');
    }

    if (gameState.lives <= 0) setTimeout(gameOver, 2000);
    else showInfoPopup(false);
}

function startDynamicTimer() {
    if(gameState.timerInterval) clearInterval(gameState.timerInterval);
    if(gameState.mode === 'hangman') {
        dom.ui.timerFill.style.width = '100%';
        dom.ui.timerFill.style.backgroundColor = '#333';
        return;
    }

    let duration = Math.max(4, 10 - (Math.floor(gameState.score / 50) * 0.5));
    if(gameState.mode === 'stat') duration += 3;

    dom.ui.timerFill.style.transition = 'none';
    dom.ui.timerFill.style.width = '100%';
    dom.ui.timerFill.style.backgroundColor = 'var(--primary)'; 
    
    void dom.ui.timerFill.offsetWidth; 
    
    dom.ui.timerFill.style.transition = `width ${duration}s linear`;
    dom.ui.timerFill.style.width = '0%';
    
    gameState.timerInterval = setTimeout(() => {
        if(gameState.roundActive && !gameState.timerPaused) handleAnswer(false, null);
    }, duration * 1000);
}

function stopTimer() {
    if(gameState.timerInterval) clearTimeout(gameState.timerInterval);
    const w = window.getComputedStyle(dom.ui.timerFill).width;
    dom.ui.timerFill.style.width = w;
    dom.ui.timerFill.style.transition = 'none';
}

function useItem(item) {
    if(gameState.inventory[item] > 0 && gameState.roundActive) {
        if(item === 'berry') {
            stopTimer();
            dom.ui.timerFill.style.backgroundColor = 'var(--primary)'; 
            gameState.timerPaused = true;
            gameState.inventory.berry--;
        } else if (item === 'smoke') {
            gameState.inventory.smoke--;
            applyNextRound();
        } else if (item === 'masterball') {
            gameState.inventory.masterball--;
            handleAnswer(true, null);
        }
        updateGlobalUI();
    }
}

async function fetchPokemonData(id) {
    const res = await fetch(`${API_URL}pokemon/${id}`);
    const data = await res.json();
    const speciesRes = await fetch(`${API_URL}pokemon-species/${id}`);
    const speciesData = await speciesRes.json();
    const nameFr = speciesData.names.find(n => n.language.name === 'fr').name;
    let img = data.sprites.other['official-artwork'].front_default;
    if(gameState.isShiny) img = data.sprites.other['official-artwork'].front_shiny || img;
    return { id: data.id, name: nameFr, img: img, types: data.types, stats: data.stats };
}

function updateGlobalUI() {
    dom.ui.money.innerText = gameState.money;
    dom.ui.shopMoney.innerText = gameState.money;
    dom.ui.lives.innerText = gameState.lives;
    
    if(gameState.combo > 1) {
        dom.ui.comboDisplay.classList.remove('hidden');
        dom.ui.comboCount.innerText = "x" + gameState.combo;
    } else {
        dom.ui.comboDisplay.classList.add('hidden');
    }
    
    document.getElementById('qty-berry').innerText = gameState.inventory.berry;
    document.getElementById('qty-smoke').innerText = gameState.inventory.smoke;
    document.getElementById('qty-masterball').innerText = gameState.inventory.masterball;
    
    localStorage.setItem('pokeMoney', gameState.money);
    localStorage.setItem('pokeInventory', JSON.stringify(gameState.inventory));
}

function useHint() {
    if(gameState.score >= 2) {
        gameState.score -= 2;
        dom.ui.score.innerText = gameState.score;
        dom.ui.hintBtn.disabled = true;
        if(gameState.mode === 'quiz') {
            const wrongs = Array.from(document.querySelectorAll('.option-btn')).filter(b => b.innerText !== gameState.currentPokemon.name);
            wrongs.slice(0, 2).forEach(b => b.style.opacity = '0.3');
        }
    }
}
function gameOver() {
    showSection('gameOver');
    document.getElementById('final-score-val').innerText = gameState.score;
    document.getElementById('final-money-val').innerText = Math.floor(gameState.score / 2);
    gameState.money += Math.floor(gameState.score / 2);
    updateGlobalUI();
}
function addToPokedex(p) {
    let list = gameState.isShiny ? gameState.pokedexShiny : gameState.pokedexNormal;
    if(!list.some(x => x.id === p.id)) { list.push({id: p.id, name: p.name, image: p.img}); list.sort((a,b) => a.id - b.id); localStorage.setItem(gameState.isShiny ? 'pokedexShiny' : 'pokedexNormal', JSON.stringify(list)); }
}
function checkAchievements() {
    const total = gameState.pokedexNormal.length + gameState.pokedexShiny.length;
    ACHIEVEMENTS_LIST.forEach(ach => {
        if(gameState.achievements.includes(ach.id)) return;
        let ok = false;
        if(ach.id === 'first_blood' && total >= 1) ok = true;
        if(ach.id === 'collector' && total >= 50) ok = true;
        if(ach.id === 'rich' && gameState.money >= ach.moneyTarget) ok = true;
        if(ach.id === 'streak_master' && gameState.combo >= ach.comboTarget) ok = true;
        if(ach.id === 'sniper' && gameState.score >= ach.scoreTarget) ok = true;
        if(ok) {
            gameState.achievements.push(ach.id); localStorage.setItem('pokeAchievements', JSON.stringify(gameState.achievements));
            const notif = document.createElement('div');
            notif.innerHTML = `🏆 Succès : ${ach.name}`;
            notif.style.cssText = "position:fixed; top:20px; left:50%; transform:translateX(-50%); background:var(--success); color:black; padding:10px 20px; border-radius:20px; font-weight:bold; z-index:9999;";
            document.body.appendChild(notif);
            setTimeout(() => notif.remove(), 3000);
        }
    });
}
function renderAchievements() {
    const grid = document.getElementById('achievements-grid'); grid.innerHTML = '';
    ACHIEVEMENTS_LIST.forEach(ach => {
        const unlocked = gameState.achievements.includes(ach.id);
        const div = document.createElement('div'); div.className = 'shop-row'; div.style.opacity = unlocked ? 1 : 0.5;
        div.innerHTML = `<div class="icon-box">${unlocked ? '🏆' : '🔒'}</div><div class="info"><strong>${ach.name}</strong><small>${ach.desc}</small></div>`;
        grid.appendChild(div);
    });
}
function renderPokedex() {
    const type = gameState.currentDexTab;
    const genSelect = document.getElementById('dex-gen-select').value;
    const limits = GENS[genSelect];
    
    const grid = document.getElementById('pokedex-grid'); 
    grid.innerHTML = '';
    
    const list = type === 'shiny' ? gameState.pokedexShiny : gameState.pokedexNormal;
    const filtered = list.filter(p => p.id >= limits.min && p.id <= limits.max);
    
    const totalInGen = (limits.max - limits.min) + 1;
    document.getElementById('dex-count').innerText = `${filtered.length}/${totalInGen}`;
    
    if(filtered.length === 0) {
        grid.innerHTML = '<p style="grid-column:1/-1;text-align:center; color:white;">Aucune donnée...</p>';
    } else {
        filtered.forEach(p => { 
            const d = document.createElement('div'); 
            d.className = 'dex-entry'; 
            d.innerHTML = `<img src="${p.image}"><small style="color:white; font-size:0.7rem;">#${p.id}</small>`; 
            grid.appendChild(d); 
        });
    }
}
function switchDexTab(btn, type) { 
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); 
    btn.classList.add('active'); 
    gameState.currentDexTab = type;
    renderPokedex(); 
}
function toggleLoader(show) { if(show) dom.ui.loader.classList.remove('hidden'); else dom.ui.loader.classList.add('hidden'); }
function resetBackground() { dom.ui.bg.style.background = 'var(--bg-gradient)'; }
function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#00f2ff', '#ff0055', '#7000ff', '#00ff9d'];
    for(let i=0; i<30; i++) {
        const conf = document.createElement('div'); conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 1) + 's';
        container.appendChild(conf); setTimeout(() => conf.remove(), 4000);
    }
}
function showInfoPopup(won) {
    dom.ui.info.classList.remove('hidden');
    dom.ui.infoTitle.innerText = won ? "SUCCÈS ANALYSE" : "ERREUR IDENTIFICATION";
    dom.ui.infoTitle.style.color = won ? "var(--success)" : "var(--secondary)";
    dom.ui.infoName.innerText = gameState.currentPokemon.name;
    const typesHtml = gameState.currentPokemon.types.map(t => `<span class="type-badge" style="background:${TYPE_COLORS[t.type.name]}">${TRANSLATIONS[t.type.name] || t.type.name}</span>`).join('');
    dom.ui.infoTypes.innerHTML = typesHtml;
}
function buyItem(item, cost) { if(gameState.money >= cost) { gameState.money -= cost; gameState.inventory[item]++; updateGlobalUI(); } }
function buyLife() { if(gameState.money >= 500 && gameState.lives < 5) { gameState.money -= 500; gameState.lives++; updateGlobalUI(); } }
function normalizeName(name) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "-"); }