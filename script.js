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

const STAT_NAMES = {
    'hp': 'PV',
    'attack': 'Attaque',
    'defense': 'Défense',
    'special-attack': 'Atq. Spé.',
    'special-defense': 'Déf. Spé.',
    'speed': 'Vitesse'
};

const TRANSLATIONS = {
    normal: 'Normal', fire: 'Feu', water: 'Eau', electric: 'Électrik', grass: 'Plante', ice: 'Glace',
    fighting: 'Combat', poison: 'Poison', ground: 'Sol', flying: 'Vol', psychic: 'Psy', bug: 'Insecte',
    rock: 'Roche', ghost: 'Spectre', dragon: 'Dragon', steel: 'Acier', fairy: 'Fée'
};

const ACHIEVEMENTS_LIST = [
    { id: 'first_blood', name: 'Dresseur Débutant', desc: 'Capturer 1 Pokémon', target: 1 },
    { id: 'collector', name: 'Collectionneur', desc: 'Capturer 50 Pokémon', target: 50 },
    { id: 'rich', name: 'Fortune', desc: 'Posséder 500 💎', moneyTarget: 500 },
    { id: 'streak_master', name: 'On Fire', desc: 'Combo x5 atteint', comboTarget: 5 },
    { id: 'prestige', name: 'Légende Vivante', desc: 'Prestige 1 atteint', prestigeTarget: 1 }
];

// --- ÉTAT GLOBAL ---
let gameState = {
    mode: 'quiz',
    currentPokemon: null,
    currentGenLimits: GENS['1'],
    isShiny: false,
    lives: 3,
    hangmanTries: 9,
    score: 0,
    combo: 0,
    money: parseInt(localStorage.getItem('pokeMoney')) || 0,
    highScore: parseInt(localStorage.getItem('pokeHighScore')) || 0,
    prestige: parseInt(localStorage.getItem('pokePrestige')) || 0,
    inventory: JSON.parse(localStorage.getItem('pokeInventory')) || { berry: 0, masterball: 0, smoke: 0 },
    pokedexNormal: JSON.parse(localStorage.getItem('pokedexNormal')) || [],
    pokedexShiny: JSON.parse(localStorage.getItem('pokedexShiny')) || [],
    achievements: JSON.parse(localStorage.getItem('pokeAchievements')) || [],
    sessionPlayedIds: new Set(),
    timerInterval: null,
    roundActive: false,
    nextRoundData: null,
    isLoading: false,
    hangmanHidden: []
};

// --- DOM ELEMENTS ---
const dom = {
    sections: {
        landing: document.getElementById('landing-section'),
        modeSelect: document.getElementById('mode-selection-section'),
        game: document.getElementById('game-interface-section'),
        shop: document.getElementById('shop-section'),
        achievements: document.getElementById('achievements-section'),
        pokedex: document.getElementById('pokedex-section'),
        gameOver: document.getElementById('game-over-section')
    },
    ui: {
        loader: document.getElementById('loader-overlay'),
        lives: document.getElementById('lives-display'),
        score: document.getElementById('current-score'),
        money: document.getElementById('user-money'),
        shopMoney: document.getElementById('shop-money'),
        gameCard: document.querySelector('.game-card'),
        img: document.getElementById('poke-img'),
        question: document.getElementById('question-text'),
        options: document.getElementById('options-container'),
        hangmanInterface: document.getElementById('hangman-interface'),
        wordDisplay: document.getElementById('word-display'),
        keyboard: document.getElementById('keyboard-grid'),
        info: document.getElementById('pokemon-info'),
        infoTitle: document.getElementById('info-result-title'),
        infoName: document.getElementById('info-name'),
        infoTypes: document.getElementById('info-types'),
        timerFill: document.getElementById('timer-fill'),
        hunterTargetDisplay: document.getElementById('hunter-target-display'),
        hunterTypeText: document.getElementById('hunter-type-text'),
        bg: document.getElementById('bg-layer'),
        genSelect: document.getElementById('gen-select'),
        shinyToggle: document.getElementById('shiny-toggle'),
        comboDisplay: document.getElementById('combo-display'),
        comboCount: document.getElementById('combo-count'),
        hintBtn: document.getElementById('hint-btn')
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
    
    document.querySelectorAll('.back-btn').forEach(b => b.addEventListener('click', () => showSection('modeSelect')));
    document.querySelectorAll('.back-to-landing').forEach(b => b.addEventListener('click', returnToHome));
    document.getElementById('home-btn').addEventListener('click', returnToHome);
    document.getElementById('quit-game-btn').addEventListener('click', returnToHome);
    document.getElementById('retry-btn').addEventListener('click', () => startGame(gameState.mode));

    document.querySelectorAll('.mode-card').forEach(card => {
        card.addEventListener('click', () => selectGameMode(card.dataset.mode));
    });

    dom.ui.genSelect.addEventListener('change', (e) => {
        gameState.currentGenLimits = GENS[e.target.value];
        updateGlobalUI();
    });
    dom.ui.shinyToggle.addEventListener('change', (e) => {
        gameState.isShiny = e.target.checked;
        updateGlobalUI();
    });

    document.getElementById('next-btn').addEventListener('click', applyNextRound);
    dom.ui.hintBtn.addEventListener('click', useHint);
    
    document.getElementById('use-berry').addEventListener('click', () => useItem('berry'));
    document.getElementById('use-smoke').addEventListener('click', () => useItem('smoke'));
    document.getElementById('use-masterball').addEventListener('click', () => useItem('masterball'));

    document.getElementById('shop-btn').addEventListener('click', () => showSection('shop'));
    document.querySelectorAll('.buy-btn').forEach(btn => {
        if(btn.id === 'buy-life-btn') btn.addEventListener('click', buyLife);
        else btn.addEventListener('click', () => buyItem(btn.dataset.item, parseInt(btn.dataset.cost)));
    });

    document.addEventListener('keydown', handlePhysicalKeyboard);
    document.getElementById('landing-dex-btn').addEventListener('click', () => { showSection('pokedex'); renderPokedex('normal'); });
    document.getElementById('tab-normal').addEventListener('click', (e) => switchDexTab(e.target, 'normal'));
    document.getElementById('tab-shiny').addEventListener('click', (e) => switchDexTab(e.target, 'shiny'));
    document.getElementById('landing-ach-btn').addEventListener('click', () => { showSection('achievements'); renderAchievements(); });
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

function selectGameMode(mode) {
    gameState.mode = mode;
    startGame(mode);
}

async function startGame(mode) {
    gameState.lives = 3 + (gameState.prestige > 0 ? 1 : 0);
    gameState.score = 0;
    gameState.combo = 0;
    gameState.sessionPlayedIds.clear(); 
    gameState.nextRoundData = null;
    
    updateGlobalUI();
    dom.ui.score.innerText = 0;
    resetBackground();

    dom.ui.options.classList.add('hidden');
    dom.ui.hangmanInterface.classList.add('hidden');
    dom.ui.hunterTargetDisplay.classList.add('hidden');
    dom.ui.hintBtn.style.display = 'inline-block';

    if(mode === 'quiz') dom.ui.options.classList.remove('hidden');
    if(mode === 'hangman') dom.ui.hangmanInterface.classList.remove('hidden');
    if(mode === 'hunter') {
        dom.ui.options.classList.remove('hidden'); 
        dom.ui.hunterTargetDisplay.classList.remove('hidden');
        dom.ui.hintBtn.style.display = 'none'; 
    }

    showSection('game');
    toggleLoader(true);
    await prepareNextRoundData();
    toggleLoader(false);
    applyNextRound();
}

async function prepareNextRoundData() {
    if (gameState.isLoading) return;
    gameState.isLoading = true;
    try {
        if(gameState.mode === 'stat') await prepareStatRound(); // Nouveau nom
        else await prepareClassicRound();
    } catch (e) {
        setTimeout(prepareNextRoundData, 1000);
    }
    gameState.isLoading = false;
}

function getUniqueRandomId() {
    const min = gameState.currentGenLimits.min;
    const max = gameState.currentGenLimits.max;
    const range = max - min + 1;
    if(gameState.sessionPlayedIds.size >= range - 5) gameState.sessionPlayedIds.clear();

    let id; let safe=0;
    do { id = Math.floor(Math.random() * (max - min + 1)) + min; safe++; } 
    while(gameState.sessionPlayedIds.has(id) && safe < 100);
    return id;
}

async function prepareClassicRound() {
    const targetId = getUniqueRandomId(); 
    gameState.sessionPlayedIds.add(targetId);
    
    const targetData = await fetchPokemonData(targetId);
    let answers = [];

    if(gameState.mode === 'quiz') {
        let ids = [targetId];
        while (ids.length < 4) {
            let rnd = getNextRandomId(); 
            if (!ids.includes(rnd)) ids.push(rnd);
        }
        const promises = ids.slice(1).map(id => fetchPokemonData(id));
        const wrongResults = await Promise.all(promises);
        answers = [{ name: targetData.name, correct: true }];
        wrongResults.forEach(p => answers.push({ name: p.name, correct: false }));
        answers.sort(() => Math.random() - 0.5);
    }

    gameState.nextRoundData = { pokemon: targetData, answers: answers };
}

async function prepareStatRound() {
    // Choisir une stat au hasard
    const statKeys = ['hp', 'attack', 'defense', 'speed']; // On garde les stats simples
    const targetStat = statKeys[Math.floor(Math.random() * statKeys.length)];
    
    // Récupérer 4 Pokémon uniques
    let options = [];
    while(options.length < 4) {
        let id = getUniqueRandomId();
        // Petite astuce : pour éviter les doublons dans le tableau options local
        if(!options.some(p => p.id === id)) {
            const p = await fetchPokemonData(id);
            // Extraire la valeur de la stat cible
            p.statValue = p.stats.find(s => s.stat.name === targetStat).base_stat;
            options.push(p);
        }
    }

    // Trouver le gagnant (celui qui a la plus grosse stat)
    // On trie par ordre décroissant
    const sorted = [...options].sort((a, b) => b.statValue - a.statValue);
    const winner = sorted[0];

    // Marquer le gagnant
    options.forEach(p => p.correct = (p.id === winner.id));
    
    // Mélanger les options pour l'affichage
    options.sort(() => Math.random() - 0.5);

    gameState.nextRoundData = { 
        targetStat: targetStat, 
        options: options, 
        pokemon: winner // Le "gagnant" pour l'info de fin
    };
}
async function applyNextRound() {
    if (!gameState.nextRoundData) {
        toggleLoader(true);
        await prepareNextRoundData();
        toggleLoader(false);
    }
    
    const data = gameState.nextRoundData;
    if(!data) return; 

    gameState.currentPokemon = data.pokemon || null;
    gameState.roundActive = true;
    if(gameState.mode === 'hangman') gameState.hangmanTries = 9;

    updateGlobalUI();
    dom.ui.info.classList.add('hidden');
    dom.ui.hintBtn.disabled = false;
    
    // RESET VISUEL
    dom.ui.img.style.transition = 'none'; 
    dom.ui.img.classList.remove('revealed');
    dom.ui.img.style.filter = 'none'; 
    dom.ui.img.style.display = 'block'; // On réaffiche l'image par défaut pour les autres modes
    
    // GESTION DES MODES
    if(gameState.mode === 'quiz') {
        dom.ui.img.className = 'float-anim'; 
        // On force le noir pour le quiz au début
        dom.ui.img.style.filter = 'brightness(0)'; 
        dom.ui.question.innerText = "Qui est ce Pokémon ?";
        dom.ui.img.src = gameState.currentPokemon.img;

    } else if (gameState.mode === 'hangman') {
        dom.ui.img.className = 'float-anim'; 
        // On force le noir pour le pendu au début
        dom.ui.img.style.filter = 'brightness(0)';
        dom.ui.question.innerText = "Quel est son nom ?";
        dom.ui.img.src = gameState.currentPokemon.img;
        setupHangmanUI(gameState.currentPokemon.name);

    } else if (gameState.mode === 'stat') { // MODE STATS
        // 1. Cacher l'image centrale pour éviter le bug de l'icône brisée
        dom.ui.img.style.display = 'none'; 
        
        // 2. Mettre à jour le titre
        dom.ui.question.innerText = "Qui a le plus de...";
        
        // 3. Afficher la grosse stat (ex: VITESSE)
        dom.ui.hunterTargetDisplay.classList.remove('hidden');
        dom.ui.hunterTypeText.innerText = STAT_NAMES[data.targetStat];
        dom.ui.hunterTypeText.style.color = '#2D3436';
        
        // 4. Changer le petit texte "TYPE CIBLE" en "STATISTIQUE"
        const labelSpan = document.querySelector('#hunter-target-display span');
        if(labelSpan) labelSpan.innerText = "STATISTIQUE";
    }

    // GENERATION DES OPTIONS (Boutons)
    const container = dom.ui.options;
    container.innerHTML = '';
    
    if(gameState.mode === 'quiz') {
        container.className = 'grid-2x2';
        data.answers.forEach(ans => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            btn.innerText = ans.name;
            btn.onclick = () => handleAnswer(ans.correct, btn);
            container.appendChild(btn);
        });
    } else if (gameState.mode === 'stat') {
        container.className = 'grid-2x2';
        data.options.forEach(opt => {
            const div = document.createElement('div');
            div.className = 'hunter-option';
            // On affiche l'image du Pokémon
            div.innerHTML = `<img src="${opt.img}" loading="lazy">`;
            div.onclick = () => handleAnswer(opt.correct, div);
            container.appendChild(div);
        });
    }

    startTimer();
    gameState.nextRoundData = null;
    prepareNextRoundData();
}

function setupHangmanUI(name) {
    const cleanName = normalizeName(name);
    gameState.hangmanHidden = cleanName.split('').map(char => (/[a-z]/i.test(char) ? '_' : char));
    dom.ui.wordDisplay.innerText = gameState.hangmanHidden.join(' ');
    dom.ui.keyboard.innerHTML = '';
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ-".split('').forEach(letter => {
        const btn = document.createElement('button');
        btn.innerText = letter;
        btn.className = 'key-btn';
        btn.dataset.letter = letter;
        btn.onclick = () => handleHangmanGuess(letter, btn, cleanName);
        dom.ui.keyboard.appendChild(btn);
    });
}

function handlePhysicalKeyboard(e) {
    if(gameState.mode !== 'hangman' || !gameState.roundActive) return;
    const key = e.key.toUpperCase();
    if(/^[A-Z\-]$/.test(key)) {
        const btn = Array.from(document.querySelectorAll('.key-btn')).find(b => b.innerText === key);
        if(btn && !btn.disabled) btn.click();
    }
}

function handleHangmanGuess(letter, btn, fullName) {
    if(!gameState.roundActive) return;
    btn.disabled = true;
    const lowerLetter = letter.toLowerCase();
    const lowerName = fullName.toLowerCase();
    
    if (lowerName.includes(lowerLetter)) {
        btn.classList.add('used-correct');
        let complete = true;
        for(let i=0; i<lowerName.length; i++) {
            if(lowerName[i] === lowerLetter) gameState.hangmanHidden[i] = fullName[i]; 
            if(gameState.hangmanHidden[i] === '_') complete = false;
        }
        dom.ui.wordDisplay.innerText = gameState.hangmanHidden.join(' ');
        if(complete) handleAnswer(true, null);
    } else {
        btn.classList.add('used-wrong');
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
    } else if (gameState.mode === 'hunter') {
        document.querySelectorAll('.hunter-option').forEach(div => div.style.pointerEvents = 'none');
        if(element) element.classList.add(isCorrect ? 'correct' : 'wrong');
    }

    if(isCorrect) successFeedback();
    else loseGlobalLife();
}

function successFeedback() {
    // REVELATION AU SUCCES
    if(gameState.mode !== 'hunter') {
        dom.ui.img.style.transition = 'filter 0.5s ease';
        dom.ui.img.className = 'revealed';
        dom.ui.img.style.filter = 'none'; 
    }
    
    const pType = gameState.currentPokemon.types[0].type.name;
    setTypeBackground(pType);
    triggerConfetti();

    gameState.combo++;
    const mult = gameState.mode === 'hangman' ? 2 : 1;
    gameState.score += (10 * mult) + (gameState.combo * 2);
    gameState.money += 15;
    
    addToPokedex(gameState.currentPokemon);
    checkAchievements();
    updateGlobalUI();

    showInfoPopup(true);
}

function loseGlobalLife() {
    gameState.combo = 0;
    gameState.lives--; 
    updateGlobalUI();
    
    if(dom.ui.gameCard) {
        dom.ui.gameCard.classList.add('shake');
        setTimeout(() => dom.ui.gameCard.classList.remove('shake'), 400);
    }

    // Révélation en cas de défaite
    if(gameState.mode !== 'hunter') {
        dom.ui.img.style.transition = 'filter 0.5s ease';
        dom.ui.img.className = 'revealed';
        dom.ui.img.style.filter = 'none';
    }

    if (gameState.lives <= 0) {
        setTimeout(gameOver, 2000);
    } else {
        showInfoPopup(false);
    }
}

function showInfoPopup(won) {
    dom.ui.info.classList.remove('hidden');
    dom.ui.infoTitle.innerText = won ? "Excellent !" : "Dommage...";
    dom.ui.infoTitle.style.color = won ? "#00B894" : "#FF7675";
    dom.ui.infoName.innerText = gameState.currentPokemon.name;
    
    const typesHtml = gameState.currentPokemon.types.map(t => 
        `<span class="type-badge" style="background:${TYPE_COLORS[t.type.name]}">${TRANSLATIONS[t.type.name] || t.type.name}</span>`
    ).join('');
    dom.ui.infoTypes.innerHTML = typesHtml;
}

function triggerConfetti() {
    const container = document.getElementById('confetti-container');
    const colors = ['#00B894', '#0984e3', '#fdcb6e', '#e17055', '#d63031'];
    for(let i=0; i<30; i++) {
        const conf = document.createElement('div');
        conf.className = 'confetti';
        conf.style.left = Math.random() * 100 + 'vw';
        conf.style.background = colors[Math.floor(Math.random() * colors.length)];
        conf.style.animationDuration = (Math.random() * 2 + 2) + 's';
        container.appendChild(conf);
        setTimeout(() => conf.remove(), 4000);
    }
}

function gameOver() {
    showSection('gameOver');
    document.getElementById('final-score-val').innerText = gameState.score;
    document.getElementById('final-money-val').innerText = gameState.score; 
    gameState.money += gameState.score;
    if(gameState.score > gameState.highScore) {
        gameState.highScore = gameState.score;
        localStorage.setItem('pokeHighScore', gameState.highScore);
    }
    updateGlobalUI();
}

function startTimer() {
    if(gameState.timerInterval) clearInterval(gameState.timerInterval);
    if(gameState.mode === 'hangman') { // PAS DE TIMER PENDU
        dom.ui.timerFill.style.width = '100%';
        dom.ui.timerFill.style.backgroundColor = '#e0e0e0'; 
        return; 
    }
    let duration = 10;
    if(gameState.mode === 'hunter') duration = 15;
    dom.ui.timerFill.style.transition = 'none';
    dom.ui.timerFill.style.width = '100%';
    dom.ui.timerFill.style.backgroundColor = '#6C5CE7'; 
    void dom.ui.timerFill.offsetWidth; 
    dom.ui.timerFill.style.transition = `width ${duration}s linear`;
    dom.ui.timerFill.style.width = '0%';
    gameState.timerInterval = setTimeout(() => {
        if(gameState.roundActive) handleAnswer(false, null);
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
            dom.ui.timerFill.style.backgroundColor = '#00CEC9'; 
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

function useHint() {
    if(gameState.score >= 2) {
        gameState.score -= 2;
        dom.ui.score.innerText = gameState.score;
        dom.ui.hintBtn.disabled = true;
        if(gameState.mode === 'quiz') {
            const wrongs = Array.from(document.querySelectorAll('.option-btn')).filter(b => b.innerText !== gameState.currentPokemon.name);
            wrongs.slice(0, 2).forEach(b => b.style.opacity = '0');
        } else if (gameState.mode === 'hangman') {
            const unrevealedIdx = gameState.hangmanHidden.map((c, i) => c === '_' ? i : -1).filter(i => i !== -1);
            if(unrevealedIdx.length > 0) {
                const idx = unrevealedIdx[Math.floor(Math.random() * unrevealedIdx.length)];
                const char = normalizeName(gameState.currentPokemon.name)[idx];
                const btn = Array.from(document.querySelectorAll('.key-btn')).find(b => b.dataset.letter === char.toUpperCase());
                if(btn) handleHangmanGuess(char, btn, normalizeName(gameState.currentPokemon.name));
            }
        }
    }
}

function getNextRandomId() {
    const min = gameState.currentGenLimits.min;
    const max = gameState.currentGenLimits.max;
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function fetchPokemonData(id) {
    const res = await fetch(`${API_URL}pokemon/${id}`);
    const data = await res.json();
    const speciesRes = await fetch(`${API_URL}pokemon-species/${id}`);
    const speciesData = await speciesRes.json();
    const nameFr = speciesData.names.find(n => n.language.name === 'fr').name;
    let img = data.sprites.other['official-artwork'].front_default;
    if(gameState.isShiny) img = data.sprites.other['official-artwork'].front_shiny || img;
    await new Promise(r => { const i = new Image(); i.src = img; i.onload = r; i.onerror = r; });
    return { id: data.id, name: nameFr, img: img, types: data.types, stats: data.stats };
}

function updateGlobalUI() {
    dom.ui.money.innerText = gameState.money;
    dom.ui.shopMoney.innerText = gameState.money;
    if(gameState.mode === 'hangman' && gameState.roundActive) dom.ui.lives.innerText = `${gameState.lives} ❤️ (${gameState.hangmanTries})`;
    else dom.ui.lives.innerText = gameState.lives;
    if(gameState.combo > 1) {
        dom.ui.comboDisplay.classList.remove('combo-hidden');
        dom.ui.comboCount.innerText = gameState.combo;
    } else dom.ui.comboDisplay.classList.add('combo-hidden');
    document.getElementById('qty-berry').innerText = gameState.inventory.berry;
    document.getElementById('qty-smoke').innerText = gameState.inventory.smoke;
    document.getElementById('qty-masterball').innerText = gameState.inventory.masterball;
    localStorage.setItem('pokeMoney', gameState.money);
    localStorage.setItem('pokeInventory', JSON.stringify(gameState.inventory));
}

function normalizeName(name) { return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z]/g, "-"); }
function setTypeBackground(type) { dom.ui.bg.style.background = `radial-gradient(circle at center, ${TYPE_COLORS[type] || '#333'} 0%, #2D3436 90%)`; }
function resetBackground() { dom.ui.bg.style.background = 'linear-gradient(135deg, #81ecec 0%, #a29bfe 100%)'; }
function toggleLoader(show) { if(show) dom.ui.loader.classList.remove('hidden'); else dom.ui.loader.classList.add('hidden'); }
function buyLife() { if(gameState.money >= 500 && gameState.lives < 5) { gameState.money -= 500; gameState.lives++; updateGlobalUI(); alert("Vie récupérée !"); } }
function buyItem(item, cost) { if(gameState.money >= cost) { gameState.money -= cost; gameState.inventory[item]++; updateGlobalUI(); } }
function renderPokedex(type) {
    const grid = document.getElementById('pokedex-grid'); grid.innerHTML = '';
    const list = type === 'shiny' ? gameState.pokedexShiny : gameState.pokedexNormal;
    const filtered = list.filter(p => p.id >= gameState.currentGenLimits.min && p.id <= gameState.currentGenLimits.max);
    document.getElementById('dex-count').innerText = `${filtered.length}/${gameState.currentGenLimits.max - gameState.currentGenLimits.min + 1}`;
    if(filtered.length === 0) grid.innerHTML = '<p style="grid-column:1/-1;text-align:center">Rien ici pour le moment.</p>';
    filtered.forEach(p => { const d = document.createElement('div'); d.className = 'dex-entry'; d.innerHTML = `<img src="${p.image}"><small>#${p.id}</small>`; grid.appendChild(d); });
}
function switchDexTab(btn, type) { document.querySelectorAll('.tab').forEach(t => t.classList.remove('active')); btn.classList.add('active'); renderPokedex(type); }
function addToPokedex(p) {
    let list = gameState.isShiny ? gameState.pokedexShiny : gameState.pokedexNormal;
    if(!list.some(x => x.id === p.id)) { list.push({id: p.id, name: p.name, image: p.img}); list.sort((a,b) => a.id - b.id); localStorage.setItem(gameState.isShiny ? 'pokedexShiny' : 'pokedexNormal', JSON.stringify(list)); }
}
function renderAchievements() {
    const grid = document.getElementById('achievements-grid'); grid.innerHTML = '';
    ACHIEVEMENTS_LIST.forEach(ach => {
        const unlocked = gameState.achievements.includes(ach.id);
        const div = document.createElement('div'); div.className = 'list-item'; div.style.opacity = unlocked ? 1 : 0.5;
        div.innerHTML = `<span class="emoji">${unlocked ? '🏆' : '🔒'}</span><div class="details"><strong>${ach.name}</strong><small>${ach.desc}</small></div>`;
        grid.appendChild(div);
    });
}
function checkAchievements() {
    ACHIEVEMENTS_LIST.forEach(ach => {
        if(gameState.achievements.includes(ach.id)) return;
        let ok = false;
        const total = gameState.pokedexNormal.length + gameState.pokedexShiny.length;
        if(ach.id === 'first_blood' && total >= 1) ok = true;
        if(ach.id === 'collector' && total >= 50) ok = true;
        if(ach.id === 'rich' && gameState.money >= 500) ok = true;
        if(ach.id === 'streak_master' && gameState.combo >= 5) ok = true;
        if(ok) {
            gameState.achievements.push(ach.id); localStorage.setItem('pokeAchievements', JSON.stringify(gameState.achievements));
            alert(`Succès débloqué : ${ach.name}`);
        }
    });
}