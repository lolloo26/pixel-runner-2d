(function () {

var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var gameContainer = document.getElementById('game-container');
var chestCanvas = document.getElementById('chest-canvas');
var chestCtx = chestCanvas.getContext('2d');
chestCanvas.width = 64;
chestCanvas.height = 64;
chestCtx.imageSmoothingEnabled = false;

var W = 320;
var H = 180;
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

var GROUND_Y = H - 22;
var GRAVITY = 0.38;
var MAX_FALL = 7;
var JUMP_FORCE = -5.6;
var JUMP_HOLD = -0.19;
var JUMP_HOLD_MAX = 14;

var MAX_JUMP_HEIGHT = 42;

function isMobileTouch() {
    return window.matchMedia('(hover: none) and (pointer: coarse)').matches;
}

var mobilePresentationRequested = false;

function scaleCanvas() {
    var viewport = window.visualViewport;
    var cw = viewport && viewport.width ? viewport.width : window.innerWidth;
    var ch = viewport && viewport.height ? viewport.height : window.innerHeight;
    var previousWidth = W;
    var previousGround = GROUND_Y;
    document.documentElement.style.setProperty('--viewport-width', cw + 'px');
    document.documentElement.style.setProperty('--viewport-height', ch + 'px');
    var baseHeight = isMobileTouch() && cw >= ch ? 150 : 180;
    if (cw / ch >= 16 / 9) {
        H = baseHeight;
        W = Math.max(Math.round(H * 16 / 9), Math.round(H * cw / ch));
    } else {
        W = Math.round(baseHeight * 16 / 9);
        H = Math.max(baseHeight, Math.round(W * ch / cw));
    }
    GROUND_Y = H - 22;
    var pixelRatio = Math.min(window.devicePixelRatio || 1, 3);
    canvas.width = Math.round(W * pixelRatio);
    canvas.height = Math.round(H * pixelRatio);
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    ctx.imageSmoothingEnabled = false;
    var groundShift = GROUND_Y - previousGround;
    if (typeof player !== 'undefined' && (groundShift !== 0 || W !== previousWidth)) {
        if (player.grounded) player.y += groundShift;
        for (var i = 0; i < obstacles.length; i++) obstacles[i].y += groundShift;
        for (var i = 0; i < coins.length; i++) coins[i].y += groundShift;
        for (var j = 0; j < walls.length; j++) walls[j].h = GROUND_Y;
        initBgElements();
    }
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';
    canvas.style.left = '0px';
    canvas.style.top = '0px';
}

function canvasPoint(clientX, clientY) {
    var rect = canvas.getBoundingClientRect();
    var canvasStyle = getComputedStyle(canvas);
    var width = parseFloat(canvasStyle.width) || rect.width;
    var height = parseFloat(canvasStyle.height) || rect.height;
    var quads = canvas.getBoxQuads ? canvas.getBoxQuads({ box: 'content' }) : null;
    if (quads && quads.length > 0) {
        var quad = quads[0];
        var ux = quad.p2.x - quad.p1.x;
        var uy = quad.p2.y - quad.p1.y;
        var vx = quad.p4.x - quad.p1.x;
        var vy = quad.p4.y - quad.p1.y;
        var determinant = ux * vy - uy * vx;
        if (Math.abs(determinant) > 0.0001) {
            var dx = clientX - quad.p1.x;
            var dy = clientY - quad.p1.y;
            var localX = (dx * vy - dy * vx) / determinant;
            var localY = (ux * dy - uy * dx) / determinant;
            return { x: localX * W, y: localY * H };
        }
    }

    var containerTransform = getComputedStyle(gameContainer).transform;
    var Matrix = window.DOMMatrix || window.WebKitCSSMatrix;
    if (containerTransform !== 'none' && Matrix) {
        var containerRect = gameContainer.getBoundingClientRect();
        var inverse = new Matrix(containerTransform).inverse();
        var dx = clientX - (containerRect.left + containerRect.width / 2);
        var dy = clientY - (containerRect.top + containerRect.height / 2);
        var localX = gameContainer.clientWidth / 2 + inverse.a * dx + inverse.c * dy;
        var localY = gameContainer.clientHeight / 2 + inverse.b * dx + inverse.d * dy;
        return {
            x: (localX - canvas.offsetLeft) * W / Math.max(1, width),
            y: (localY - canvas.offsetTop) * H / Math.max(1, height)
        };
    }

    return {
        x: (clientX - rect.left) * W / Math.max(1, width),
        y: (clientY - rect.top) * H / Math.max(1, height)
    };
}

function requestMobilePresentation() {
    if (!isMobileTouch() || mobilePresentationRequested) return;
    mobilePresentationRequested = true;

    var orientation = screen.orientation;
    var lockLandscape = function() {
        if (!orientation || typeof orientation.lock !== 'function') return;
        var lockPromise;
        try {
            lockPromise = orientation.lock('landscape');
        } catch (error) {
            updateOrientationState();
            return;
        }
        if (lockPromise && typeof lockPromise.catch === 'function') {
            lockPromise.catch(updateOrientationState);
        }
    };
    var fullscreenPromise;
    try {
        if (!document.fullscreenElement && gameContainer.requestFullscreen) {
            fullscreenPromise = gameContainer.requestFullscreen({ navigationUI: 'hide' });
        }
    } catch (error) {
        fullscreenPromise = null;
    }

    if (fullscreenPromise && typeof fullscreenPromise.then === 'function') {
        fullscreenPromise.then(lockLandscape).catch(function() {
            mobilePresentationRequested = false;
            lockLandscape();
        });
    } else {
        lockLandscape();
    }
}

var BIOMES = [
    {
        name: 'GIUNGLA',
        theme: 'jungle',
        sky: [4, 28, 8],
        ground: [14, 90, 18],
        groundAlt: [22, 115, 28],
        groundDark: [8, 55, 12],
        far: [6, 44, 10],
        mid: [12, 66, 16],
        accent: [60, 220, 100],
        obstacleColor: [28, 108, 28],
        obstacleDark: [14, 60, 14],
        obstacleHighlight: [60, 160, 60],
        flyColor: [20, 155, 55],
        flyDark: [10, 90, 30],
        flyHighlight: [50, 200, 90],
        wallColor: [45, 165, 45],
        wallDark: [20, 90, 20],
        coinColor: [255, 215, 0],
        coinHighlight: [255, 240, 100],
        coinShadow: [180, 130, 0],
        particles: [50, 210, 60],
        atmColor: [40, 200, 40],
        atmType: 'leaves'
    },
    {
        name: 'VULCANO',
        theme: 'volcano',
        sky: [32, 5, 5],
        ground: [90, 22, 10],
        groundAlt: [115, 35, 18],
        groundDark: [55, 10, 5],
        far: [52, 10, 6],
        mid: [75, 22, 14],
        accent: [255, 90, 30],
        obstacleColor: [130, 32, 18],
        obstacleDark: [70, 14, 8],
        obstacleHighlight: [200, 70, 40],
        flyColor: [210, 55, 18],
        flyDark: [120, 25, 8],
        flyHighlight: [255, 110, 60],
        wallColor: [230, 75, 28],
        wallDark: [120, 35, 12],
        coinColor: [255, 180, 0],
        coinHighlight: [255, 230, 80],
        coinShadow: [180, 100, 0],
        particles: [255, 110, 20],
        atmColor: [255, 80, 10],
        atmType: 'sparks'
    },
    {
        name: 'GHIACCIAIO',
        theme: 'glacier',
        sky: [5, 20, 38],
        ground: [22, 88, 110],
        groundAlt: [34, 110, 135],
        groundDark: [10, 45, 65],
        far: [8, 38, 58],
        mid: [18, 60, 82],
        accent: [30, 210, 240],
        obstacleColor: [38, 118, 158],
        obstacleDark: [18, 65, 90],
        obstacleHighlight: [80, 190, 230],
        flyColor: [55, 158, 200],
        flyDark: [22, 80, 110],
        flyHighlight: [110, 220, 255],
        wallColor: [78, 198, 238],
        wallDark: [30, 110, 150],
        coinColor: [200, 240, 255],
        coinHighlight: [240, 255, 255],
        coinShadow: [100, 170, 210],
        particles: [110, 225, 255],
        atmColor: [180, 230, 255],
        atmType: 'snow'
    },
    {
        name: 'DESERTO NEON',
        theme: 'neon',
        sky: [24, 5, 32],
        ground: [82, 28, 105],
        groundAlt: [105, 40, 130],
        groundDark: [44, 12, 58],
        far: [38, 8, 50],
        mid: [62, 18, 72],
        accent: [235, 115, 255],
        obstacleColor: [122, 48, 145],
        obstacleDark: [65, 22, 80],
        obstacleHighlight: [185, 90, 220],
        flyColor: [182, 78, 205],
        flyDark: [95, 35, 115],
        flyHighlight: [230, 130, 255],
        wallColor: [205, 98, 258],
        wallDark: [110, 42, 140],
        coinColor: [255, 215, 0],
        coinHighlight: [255, 245, 120],
        coinShadow: [180, 130, 0],
        particles: [225, 118, 255],
        atmColor: [200, 80, 255],
        atmType: 'neon'
    }
];

var SKINS = [
    { id: 'classic', name: 'CLASSICO',  rarity: 'common',    colors: { body: '#e8e8ff', eye: '#00ff88', outline: '#555566' } },
    { id: 'ninja',   name: 'NINJA',     rarity: 'common',    colors: { body: '#1e1e2e', eye: '#ff0044', outline: '#080810' } },
    { id: 'robot',   name: 'ROBOT',     rarity: 'rare',      colors: { body: '#aabbcc', eye: '#00ffff', outline: '#445566' } },
    { id: 'magma',   name: 'MAGMA',     rarity: 'rare',      colors: { body: '#ff4422', eye: '#ffff00', outline: '#8a1800' } },
    { id: 'ice',     name: 'GHIACCIO',  rarity: 'epic',      colors: { body: '#88ddff', eye: '#ffffff', outline: '#3377aa' } },
    { id: 'gold',    name: 'DORATO',    rarity: 'legendary', colors: { body: '#ffd700', eye: '#ff4400', outline: '#886600' } }
];

var RARITY_WEIGHTS = { common: 40, rare: 25, epic: 15, legendary: 5 };
var RARITY_LABELS  = { common: 'COMUNE', rare: 'RARO', epic: 'EPICO', legendary: 'LEGGENDARIO' };
var RARITY_COLORS  = { common: '#aaaaaa', rare: '#55aaff', epic: '#cc55ff', legendary: '#ffd700' };
var DUPE_REFUND    = { common: 10, rare: 20, epic: 35, legendary: 50 };

var PLAYER_IDLE = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,1,0,1,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,1,0,0,1,0,0,0],
    [0,0,1,1,0,0,1,1,0,0]
];

var PLAYER_RUN1 = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,1,0,1,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,0,0,0,1,0,0],
    [0,1,1,0,0,0,0,1,1,0]
];

var PLAYER_RUN2 = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,1,0,1,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,0,1,0,0,1,1,0,0],
    [0,0,0,1,1,0,1,1,0,0]
];

var PLAYER_JUMP = [
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,0,1,1,1,1,0,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [1,0,0,1,1,1,1,0,0,1],
    [0,0,0,1,1,1,1,0,0,0],
    [0,0,1,0,0,0,0,1,0,0],
    [0,1,0,0,0,0,0,0,1,0]
];

var PLAYER_CROUCH = [
    [0,0,1,1,1,1,1,1,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,0,2,1,1,1,1,2,0,0],
    [0,1,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,1,0,1,0],
    [0,0,1,1,0,0,1,1,0,0]
];

var COIN_SPRITE = [
    [0,0,1,1,1,1,0,0],
    [0,1,2,2,2,1,1,0],
    [1,1,2,1,1,2,1,1],
    [1,2,1,3,3,1,2,1],
    [1,2,1,3,3,1,2,1],
    [1,1,2,1,1,2,1,1],
    [0,1,1,2,2,1,1,0],
    [0,0,1,1,1,1,0,0]
];

var COIN_ANIM1 = [
    [0,0,0,1,1,0,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,1,2,2,1,0,0],
    [0,0,0,1,1,0,0,0]
];

var COIN_ANIM2 = [
    [0,0,0,0,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,1,1,0,0,0],
    [0,0,0,0,1,0,0,0]
];

var COIN_ANIM3 = COIN_ANIM1;

var COIN_FRAMES = [COIN_SPRITE, COIN_ANIM1, COIN_ANIM2, COIN_ANIM3];

var ui = {
    main:         document.getElementById('main-menu'),
    game:         document.getElementById('game-ui'),
    over:         document.getElementById('game-over'),
    pause:        document.getElementById('pause-menu'),
    musicToggle:  document.getElementById('music-toggle'),
    audioStatus:  document.getElementById('audio-status'),
    mobileSettings: document.getElementById('mobile-settings-menu'),
    mobileSettingsButton: document.getElementById('mobile-settings-button'),
    audioToggle:  document.getElementById('mobile-audio-toggle'),
    musicVolume:  document.getElementById('music-volume'),
    sfxVolume:    document.getElementById('sfx-volume'),
    touchSize:    document.getElementById('touch-size'),
    touchOpacity: document.getElementById('touch-opacity'),
    commands:     document.getElementById('commands-menu'),
    shop:         document.getElementById('shop-menu'),
    chestOverlay: document.getElementById('chest-overlay'),
    overlay:      document.getElementById('ui-overlay'),
    biomeTransition: document.getElementById('biome-transition'),
    biomeTitle:   document.getElementById('biome-title'),
    biomeParticles: document.getElementById('biome-particles'),
    score:        document.getElementById('current-score'),
    target:       document.getElementById('wall-hit-target'),
    coinCount:    document.getElementById('coin-count'),
    biome:        document.getElementById('biome-indicator'),
    prompt:       document.getElementById('timing-prompt'),
    duck:         document.getElementById('duck-control'),
    highScore:    document.getElementById('main-highscore-value'),
    mainCoins:    document.getElementById('main-coins-value'),
    shopCoins:    document.getElementById('shop-coins'),
    skinList:     document.getElementById('skin-selector'),
    finalScore:   document.getElementById('final-score'),
    finalCoins:   document.getElementById('final-coins'),
    newRecord:    document.getElementById('new-record'),
    chestResult:  document.getElementById('chest-result'),
    chestClose:   document.getElementById('chest-close-btn')
};

var save = {
    coins:      parseInt(localStorage.getItem('pr_coins'))    || 0,
    highScore:  parseInt(localStorage.getItem('pr_highscore'))|| 0,
    skins:      JSON.parse(localStorage.getItem('pr_skins'))  || ['classic'],
    activeSkin: localStorage.getItem('pr_active_skin')        || 'classic',
    audioEnabled: localStorage.getItem('pr_audio_enabled') !== 'false'
};

function persist() {
    localStorage.setItem('pr_coins',      save.coins);
    localStorage.setItem('pr_highscore',  save.highScore);
    localStorage.setItem('pr_skins',      JSON.stringify(save.skins));
    localStorage.setItem('pr_active_skin',save.activeSkin);
    localStorage.setItem('pr_audio_enabled', save.audioEnabled);
}

var game = {
    running: false,
    paused: false,
    attractMode: false,
    score: 0,
    sessionCoins: 0,
    speed: 1.2,
    baseSpeed: 1.2,
    biomeIndex: 0,
    biomeTransition: 0,
    biomeTransitionTimer: 0,
    biomeTransitionId: 0,
    prevBiomeIndex: -1,
    frameCount: 0,
    lastObstacle: 0,
    lastCoin: 0,
    lastWall: 0,
    wallActive: false,
    screenShake: 0,
    flashAlpha: 0,
    autoJump: false,
    autoCrouch: false
};

var music = (function() {
    var paths = [
        'audio/giungla.mp3',
        'audio/vulcano.mp3',
        'audio/ghiacciaio.mp3',
        'audio/deserto.mp3'
    ];
    var tracks = paths.map(function(path) {
        var audio = new Audio(path);
        audio.loop = true;
        audio.preload = 'none';
        var track = {
            audio: audio,
            source: null,
            gain: null,
            level: 0,
            fade: null,
            fadeTimer: null,
            stopTimer: null,
            active: false
        };
        audio.addEventListener('error', function() {
            showAudioError('Impossibile caricare ' + path);
        });
        return track;
    });
    var context = null;
    var compressor = null;
    var sfxBus = null;
    var unlocked = false;
    var enabled = save.audioEnabled;
    var paused = false;
    var currentIndex = -1;
    var storedMusicVolume = parseFloat(localStorage.getItem('pr_music_volume'));
    var storedSfxVolume = parseFloat(localStorage.getItem('pr_sfx_volume'));
    var volume = isFinite(storedMusicVolume) ? Math.max(0, Math.min(1, storedMusicVolume)) : 0.75;
    var sfxVolume = isFinite(storedSfxVolume) ? Math.max(0, Math.min(1, storedSfxVolume)) : 0.4;
    var crossfadeDuration = 1.8;

    function showAudioError(message) {
        if (location.protocol === 'file:') {
            message = 'Apri il gioco da http://localhost:8787 per ascoltare la musica';
        }
        ui.musicToggle.title = message;
        ui.audioToggle.title = message;
        if (ui.audioStatus) {
            ui.audioStatus.textContent = message;
            ui.audioStatus.classList.remove('hidden');
        }
    }

    function clearAudioError() {
        if (!ui.audioStatus) return;
        ui.audioStatus.textContent = '';
        ui.audioStatus.classList.add('hidden');
    }

    function prepareAudioGraph() {
        if (context) return;
        var AudioContextType = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextType) return;

        try {
            context = new AudioContextType();
            compressor = context.createDynamicsCompressor();
            compressor.threshold.value = -4;
            compressor.knee.value = 8;
            compressor.ratio.value = 8;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.18;
            compressor.connect(context.destination);
            sfxBus = context.createGain();
            sfxBus.gain.value = enabled ? sfxVolume : 0;
            sfxBus.connect(compressor);
            for (var i = 0; i < tracks.length; i++) {
                tracks[i].source = context.createMediaElementSource(tracks[i].audio);
                tracks[i].gain = context.createGain();
                tracks[i].gain.gain.value = 0;
                tracks[i].source.connect(tracks[i].gain);
                tracks[i].gain.connect(compressor);
            }
        } catch (error) {
            context = null;
            compressor = null;
            sfxBus = null;
            showAudioError('Il sistema audio del browser non è disponibile');
        }
    }

    function rampSfxBus(target, duration) {
        if (!sfxBus || !context || context.state === 'closed') return;
        var now = context.currentTime;
        var gain = sfxBus.gain;
        gain.cancelScheduledValues(now);
        gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(target, now + duration);
    }

    function playTone(frequency, endFrequency, start, duration, type, peak) {
        var oscillator = context.createOscillator();
        var envelope = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(peak, start + 0.008);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(envelope);
        envelope.connect(sfxBus);
        oscillator.start(start);
        oscillator.stop(start + duration + 0.01);
    }

    function playNoise(start, duration, peak, filterType, filterFrequency) {
        var frameCount = Math.max(1, Math.floor(context.sampleRate * duration));
        var buffer = context.createBuffer(1, frameCount, context.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < frameCount; i++) {
            data[i] = (Math.random() * 2 - 1) * (1 - i / frameCount);
        }
        var source = context.createBufferSource();
        var filter = context.createBiquadFilter();
        var envelope = context.createGain();
        source.buffer = buffer;
        filter.type = filterType;
        filter.frequency.setValueAtTime(filterFrequency, start);
        envelope.gain.setValueAtTime(0.0001, start);
        envelope.gain.exponentialRampToValueAtTime(peak, start + 0.003);
        envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        source.connect(filter);
        filter.connect(envelope);
        envelope.connect(sfxBus);
        source.start(start);
        source.stop(start + duration + 0.01);
    }

    function playSfx(type, perfect) {
        if (!enabled || sfxVolume <= 0 || !unlocked || !context || !sfxBus || context.state === 'closed') return;
        var now = context.currentTime;
        if (type === 'jump') {
            playTone(330, 570, now, 0.12, 'sine', 0.13);
        } else if (type === 'coin') {
            playTone(880, 1080, now, 0.12, 'sine', 0.12);
            playTone(1320, 1600, now + 0.065, 0.14, 'sine', 0.105);
        } else if (type === 'wall') {
            playTone(150, 48, now, 0.17, 'sine', 0.24);
            playTone(260, 100, now, 0.12, 'triangle', 0.12);
            playNoise(now, 0.045, 0.13, 'bandpass', 1250);
            playNoise(now + 0.025, 0.16, 0.075, 'highpass', 2200);
            playTone(900, 1320, now + 0.035, 0.15, 'sine', 0.045);
            playTone(1480, 1850, now + 0.075, 0.13, 'sine', 0.035);
            if (perfect) {
                playTone(1240, 1560, now + 0.025, 0.2, 'sine', 0.09);
                playTone(1860, 2200, now + 0.09, 0.18, 'sine', 0.065);
            }
        } else if (type === 'ui') {
            playTone(520, 360, now, 0.055, 'sine', 0.075);
        }
    }

    function cancelTrackTimers(track) {
        clearInterval(track.fadeTimer);
        clearTimeout(track.stopTimer);
        track.fadeTimer = null;
        track.stopTimer = null;
    }

    function getTrackLevel(track, now) {
        if (!track.fade) return track.level;
        if (now >= track.fade.end) return track.fade.to;
        var progress = Math.max(0, (now - track.fade.start) / (track.fade.end - track.fade.start));
        return track.fade.from + (track.fade.to - track.fade.from) * progress;
    }

    function setTrackLevel(track, target, duration) {
        clearInterval(track.fadeTimer);
        track.fadeTimer = null;

        if (track.gain && context && context.state !== 'closed') {
            var now = context.currentTime;
            var param = track.gain.gain;
            var from = getTrackLevel(track, now);
            param.cancelScheduledValues(now);
            param.setValueAtTime(from, now);
            if (duration > 0) {
                param.linearRampToValueAtTime(target, now + duration);
                track.fade = { from: from, to: target, start: now, end: now + duration };
            } else {
                param.setValueAtTime(target, now);
                track.fade = null;
            }
            track.level = target;
            return;
        }

        var startVolume = track.audio.volume;
        if (duration <= 0) {
            track.audio.volume = target;
            track.level = target;
            track.fade = null;
            return;
        }

        var started = performance.now();
        track.fade = { from: startVolume, to: target, start: started, end: started + duration * 1000 };
        track.fadeTimer = setInterval(function() {
            var progress = Math.min(1, (performance.now() - started) / (duration * 1000));
            track.audio.volume = startVolume + (target - startVolume) * progress;
            track.level = track.audio.volume;
            if (progress >= 1) {
                clearInterval(track.fadeTimer);
                track.fadeTimer = null;
                track.fade = null;
            }
        }, 30);
    }

    function stopTrack(index, reset) {
        var track = tracks[index];
        cancelTrackTimers(track);
        setTrackLevel(track, 0, 0);
        track.audio.pause();
        track.active = false;
        if (reset) track.audio.currentTime = 0;
    }

    function scheduleStop(index, duration, reset) {
        var track = tracks[index];
        clearTimeout(track.stopTimer);
        track.stopTimer = setTimeout(function() {
            stopTrack(index, reset);
        }, duration * 1000 + 40);
    }

    function startTrack(index, restart) {
        var track = tracks[index];
        clearTimeout(track.stopTimer);
        track.stopTimer = null;
        if (track.active) return;
        if (restart) track.audio.currentTime = 0;
        setTrackLevel(track, 0, 0);
        track.active = true;
        var result;
        try {
            result = track.audio.play();
        } catch (error) {
            track.active = false;
            showAudioError('Riproduzione non disponibile: ' + paths[index]);
            return;
        }
        if (result && typeof result.catch === 'function') {
            result.then(function() {
                clearAudioError();
            }, function(error) {
                track.active = false;
                setTrackLevel(track, 0, 0);
                showAudioError(error && error.name === 'NotAllowedError' ?
                    'Tocca di nuovo per avviare la musica' :
                    'Riproduzione non disponibile: ' + paths[index]);
            });
        } else {
            clearAudioError();
        }
    }

    function setBiome(index) {
        index = (index + tracks.length) % tracks.length;
        var previousIndex = currentIndex;
        currentIndex = index;
        if (!enabled || !unlocked || paused) return;
        if (previousIndex === index && tracks[index].active &&
            (!tracks[index].fade || tracks[index].fade.to === volume)) return;

        for (var i = 0; i < tracks.length; i++) {
            if (i !== previousIndex && i !== index && tracks[i].active) stopTrack(i, true);
        }

        startTrack(index, true);
        setTrackLevel(tracks[index], volume, crossfadeDuration);

        if (previousIndex >= 0 && previousIndex !== index && tracks[previousIndex].active) {
            setTrackLevel(tracks[previousIndex], 0, crossfadeDuration);
            scheduleStop(previousIndex, crossfadeDuration, true);
        }
    }

    function unlock(retry) {
        if (!unlocked) {
            prepareAudioGraph();
            unlocked = true;
        }
        if (context && context.state !== 'running') {
            context.resume().catch(function(error) {
                unlocked = false;
                showAudioError(error && error.name === 'NotAllowedError' ?
                    'Tocca di nuovo per avviare la musica' :
                    'Impossibile avviare l’audio del browser');
            });
        }
        if (currentIndex < 0) currentIndex = 0;
        if (retry && tracks[currentIndex].audio.paused) tracks[currentIndex].active = false;
        if (enabled && !paused) setBiome(currentIndex);
    }

    function setEnabled(value) {
        enabled = value;
        rampSfxBus(enabled ? sfxVolume : 0, 0.025);
        if (!enabled) {
            for (var i = 0; i < tracks.length; i++) {
                if (tracks[i].active) stopTrack(i, true);
            }
        } else if (unlocked && !paused && currentIndex >= 0) {
            setBiome(currentIndex);
        }
    }

    function setPaused(value) {
        if (paused === value) return;
        paused = value;
        if (paused) {
            for (var i = 0; i < tracks.length; i++) {
                if (!tracks[i].active) continue;
                setTrackLevel(tracks[i], 0, 0.25);
                scheduleStop(i, 0.25, false);
            }
        } else if (enabled && unlocked && currentIndex >= 0) {
            for (var j = 0; j < tracks.length; j++) {
                if (j !== currentIndex && tracks[j].active) stopTrack(j, true);
            }
            startTrack(currentIndex, false);
            setTrackLevel(tracks[currentIndex], volume, 0.35);
        }
    }

    function fadeOut(duration) {
        for (var i = 0; i < tracks.length; i++) {
            if (!tracks[i].active) continue;
            setTrackLevel(tracks[i], 0, duration);
            scheduleStop(i, duration, true);
        }
    }

    function setMusicVolume(value) {
        volume = Math.max(0, Math.min(1, value));
        localStorage.setItem('pr_music_volume', volume);
        if (enabled && !paused && currentIndex >= 0 && tracks[currentIndex].active) {
            setTrackLevel(tracks[currentIndex], volume, 0.08);
        }
    }

    function setSfxVolume(value) {
        sfxVolume = Math.max(0, Math.min(1, value));
        localStorage.setItem('pr_sfx_volume', sfxVolume);
        rampSfxBus(enabled ? sfxVolume : 0, 0.05);
    }

    return {
        unlock: unlock,
        setBiome: setBiome,
        setEnabled: setEnabled,
        setPaused: setPaused,
        fadeOut: fadeOut,
        playSfx: playSfx,
        setMusicVolume: setMusicVolume,
        setSfxVolume: setSfxVolume,
        getMusicVolume: function() { return volume; },
        getSfxVolume: function() { return sfxVolume; }
    };
})();

function updateAudioControls() {
    var enabled = save.audioEnabled;
    ui.audioToggle.textContent = 'AUDIO: ' + (enabled ? 'ON' : 'OFF');
    ui.audioToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
    ui.musicToggle.firstElementChild.textContent = enabled ? '🔊' : '🔇';
    ui.musicToggle.setAttribute('aria-label', enabled ? 'Disattiva musica' : 'Attiva musica');
    ui.musicToggle.setAttribute('title', enabled ? 'Disattiva musica' : 'Attiva musica');
    ui.musicToggle.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function toggleAudio() {
    save.audioEnabled = !save.audioEnabled;
    persist();
    music.setEnabled(save.audioEnabled);
    updateAudioControls();
}

function unlockMusic() {
    music.unlock(true);
}

function updateOrientationState() {
    var viewport = window.visualViewport;
    var width = viewport && viewport.width ? viewport.width : window.innerWidth;
    var height = viewport && viewport.height ? viewport.height : window.innerHeight;
    var portrait = isMobileTouch() && height > width;
    var orientationChanged = portrait !== previousPortraitState;
    previousPortraitState = portrait;
    document.body.classList.toggle('mobile-portrait', portrait);

    if (orientationChanged) {
        keys = {};
        clearTouchInputs();
    }

    if (portrait && game.running && !game.paused) {
        game.paused = true;
        orientationPaused = true;
        music.setPaused(true);
        keys = {};
        clearTouchInputs();
    } else if (!portrait && orientationPaused) {
        orientationPaused = false;
        game.paused = false;
        music.setPaused(false);
        ui.pause.classList.add('hidden');
        lastTime = performance.now();
    }

    ui.duck.classList.toggle('active', isMobileTouch() && !portrait && game.running && !game.attractMode && !game.paused);
    scaleCanvas();
}

var PW = 10;
var PH = 10;

var player = {
    x: 36,
    y: GROUND_Y - PH,
    w: PW,
    h: PH,
    vy: 0,
    grounded: true,
    crouching: false,
    jumpHeld: false,
    jumpTimer: 0,
    jumpBuffer: 0,
    animFrame: 0,
    animTimer: 0
};

var keys = {};
var obstacles = [];
var coins = [];
var walls = [];
var particles = [];
var atmParticles = [];
var bgLayers = { far: [], mid: [], stars: [] };
var loopActive = false;
var pointerStarts = Object.create(null);
var touchJumpPointers = Object.create(null);
var touchDownPointers = Object.create(null);
var duckPointers = Object.create(null);
var orientationPaused = false;
var previousPortraitState = false;
var hitFeedbackTimer = 0;
var targetHitRadius = 17;
var displayedScore = -1;

function clearTouchInputs() {
    pointerStarts = Object.create(null);
    touchJumpPointers = Object.create(null);
    touchDownPointers = Object.create(null);
    duckPointers = Object.create(null);
}

function hasActivePointers(pointers) {
    return Object.keys(pointers).length > 0;
}

function rgb(arr) {
    return 'rgb(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ')';
}

function rgba(arr, a) {
    return 'rgba(' + arr[0] + ',' + arr[1] + ',' + arr[2] + ',' + a + ')';
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function lerpColor(a, b, t) {
    return [
        Math.round(lerp(a[0], b[0], t)),
        Math.round(lerp(a[1], b[1], t)),
        Math.round(lerp(a[2], b[2], t))
    ];
}

function rand(min, max) {
    return Math.random() * (max - min) + min;
}

function randInt(min, max) {
    return Math.floor(rand(min, max + 1));
}

function biome() {
    return BIOMES[game.biomeIndex];
}

function prevBiome() {
    if (game.prevBiomeIndex < 0) return biome();
    return BIOMES[game.prevBiomeIndex];
}

function transitionedColor(prop) {
    if (game.biomeTransition >= 1 || game.prevBiomeIndex < 0) return biome()[prop];
    return lerpColor(prevBiome()[prop], biome()[prop], game.biomeTransition);
}

function initBgElements() {
    bgLayers.far = [];
    bgLayers.mid = [];
    bgLayers.stars = [];
    atmParticles = [];
    for (var i = 0; i < 28; i++) {
        bgLayers.stars.push({ x: rand(0, W), y: rand(0, GROUND_Y - 25), twinkle: rand(0, 6.28) });
    }
    for (var i = 0; i < 8; i++) {
        bgLayers.far.push({ x: i * 55, h: rand(28, 60), w: rand(38, 60) });
    }
    for (var i = 0; i < 10; i++) {
        bgLayers.mid.push({ x: i * 36, h: rand(12, 36), w: rand(16, 28), type: randInt(0, 2) });
    }
    for (var i = 0; i < 20; i++) {
        atmParticles.push(makeAtmParticle(true));
    }
}

function makeAtmParticle(randomX) {
    var b = biome();
    var p = {
        x: randomX ? rand(0, W) : W + rand(0, 20),
        y: rand(0, GROUND_Y - 10),
        vx: 0,
        vy: 0,
        size: rand(1, 2.5),
        life: rand(0, 180),
        maxLife: rand(80, 200),
        type: b.atmType
    };
    if (b.atmType === 'leaves') {
        p.vx = rand(-1.0, -0.3);
        p.vy = rand(0.2, 0.7);
        p.angle = rand(0, 6.28);
        p.spin  = rand(-0.08, 0.08);
    } else if (b.atmType === 'sparks') {
        p.vx = rand(-1.5, -0.3);
        p.vy = rand(-1.2, 0.2);
        p.grav = 0.04;
    } else if (b.atmType === 'snow') {
        p.vx = rand(-0.5, -0.1);
        p.vy = rand(0.3, 0.8);
        p.wobble = rand(0, 6.28);
        p.wobbleSpeed = rand(0.04, 0.12);
    } else if (b.atmType === 'neon') {
        p.vx = rand(-1.2, -0.3);
        p.vy = rand(-0.4, 0.4);
        p.pulse = rand(0, 6.28);
        p.pulseSpeed = rand(0.1, 0.25);
    }
    return p;
}

function drawSprite(sx, sy, matrix, colorMap) {
    for (var r = 0; r < matrix.length; r++) {
        for (var c = 0; c < matrix[r].length; c++) {
            var v = matrix[r][c];
            if (v > 0 && colorMap[v]) {
                ctx.fillStyle = colorMap[v];
                ctx.fillRect(Math.floor(sx + c), Math.floor(sy + r), 1, 1);
            }
        }
    }
}

function drawSpriteOnCtx(context, sx, sy, matrix, colorMap, scale) {
    scale = scale || 1;
    for (var r = 0; r < matrix.length; r++) {
        for (var c = 0; c < matrix[r].length; c++) {
            var v = matrix[r][c];
            if (v > 0 && colorMap[v]) {
                context.fillStyle = colorMap[v];
                context.fillRect(Math.floor(sx + c * scale), Math.floor(sy + r * scale), scale, scale);
            }
        }
    }
}

function getSkinColors(skinDef) {
    return { 1: skinDef.colors.body, 2: skinDef.colors.eye, 3: skinDef.colors.outline };
}

function drawOutlinedSprite(sx, sy, matrix, colorMap, outlineColor) {
    var dirs = [[-1,0],[1,0],[0,-1],[0,1]];
    for (var r = 0; r < matrix.length; r++) {
        for (var c = 0; c < matrix[r].length; c++) {
            if (matrix[r][c] > 0) {
                for (var d = 0; d < dirs.length; d++) {
                    var nr = r + dirs[d][0];
                    var nc = c + dirs[d][1];
                    var outside = nr < 0 || nr >= matrix.length || nc < 0 || nc >= matrix[r].length || matrix[nr][nc] === 0;
                    if (outside) {
                        ctx.fillStyle = outlineColor;
                        ctx.fillRect(Math.floor(sx + c + dirs[d][1]), Math.floor(sy + r + dirs[d][0]), 1, 1);
                    }
                }
            }
        }
    }
    for (var r = 0; r < matrix.length; r++) {
        for (var c = 0; c < matrix[r].length; c++) {
            var v = matrix[r][c];
            if (v > 0 && colorMap[v]) {
                ctx.fillStyle = colorMap[v];
                ctx.fillRect(Math.floor(sx + c), Math.floor(sy + r), 1, 1);
            }
        }
    }
}

function spawnObstacle() {
    var b = biome();
    var flying = Math.random() < 0.28;
    if (flying) {
        var fw = randInt(5, 9);
        var fh = 4;
        var fy = GROUND_Y - randInt(16, 28);
        obstacles.push({
            x: W + 8,
            y: fy,
            w: fw,
            h: fh,
            flying: true,
            color: b.flyColor,
            dark: b.flyDark,
            highlight: b.flyHighlight,
            wingTimer: 0
        });
    } else {
        var tall = Math.random() < 0.3;
        var oh = tall ? randInt(10, 16) : randInt(5, 9);
        var ow = randInt(4, 7);
        obstacles.push({
            x: W + 8,
            y: GROUND_Y - oh,
            w: ow,
            h: oh,
            flying: false,
            color: b.obstacleColor,
            dark: b.obstacleDark,
            highlight: b.obstacleHighlight
        });
    }
}

function obstaclesOverlapAt(nx, ny, nw, nh) {
    for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        if (nx < o.x + o.w + 4 && nx + nw + 4 > o.x &&
            ny < o.y + o.h     && ny + nh     > o.y) {
            return true;
        }
    }
    return false;
}

function spawnCoinRow() {
    var b = biome();
    var count = randInt(3, 6);
    var startX = W + 8;
    var groundRow = Math.random() < 0.5;
    var rowY;

    if (groundRow) {
        rowY = GROUND_Y - 8 - 2;
    } else {
        var arcH = randInt(14, Math.floor(MAX_JUMP_HEIGHT * 0.75));
        rowY = GROUND_Y - PH - arcH;
        if (rowY < 8) rowY = 8;
    }

    var step = 10;
    var allClear = true;
    for (var i = 0; i < count; i++) {
        var cx = startX + i * step;
        var cy = rowY;
        if (obstaclesOverlapAt(cx, cy, 8, 8)) {
            allClear = false;
            break;
        }
        for (var j = 0; j < walls.length; j++) {
            if (!walls[j].destroyed && cx < walls[j].x + walls[j].w + 6 && cx + 8 > walls[j].x - 6) {
                allClear = false;
                break;
            }
        }
        if (!allClear) break;
    }

    if (!allClear) return;

    for (var i = 0; i < count; i++) {
        coins.push({
            x: startX + i * step,
            y: rowY,
            w: 8,
            h: 8,
            frame: 0,
            timer: 0
        });
    }
}

function spawnWall() {
    if (game.wallActive) return;
    game.wallActive = true;
    var b = biome();
    walls.push({
        x: W + 10,
        w: 8,
        h: GROUND_Y,
        color: b.wallColor,
        dark: b.wallDark,
        active: true,
        windowStart: -1,
        windowDuration: 0,
        destroyed: false,
        missed: false,
        flashTimer: 0
    });
}

function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
        particles.push({
            x: x + rand(-4, 4),
            y: y + rand(-4, 4),
            vx: rand(-2.5, 2.5),
            vy: rand(-3.5, 0),
            life: rand(18, 50),
            maxLife: 50,
            size: rand(1, 3),
            color: color
        });
    }
}

function spawnCoinParticles(x, y) {
    for (var i = 0; i < 8; i++) {
        particles.push({
            x: x, y: y,
            vx: rand(-2, 2),
            vy: rand(-2.5, -0.5),
            life: rand(10, 24),
            maxLife: 24,
            size: 1,
            color: [255, 215, 0]
        });
    }
}

function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resetPlayer() {
    player.x = 36;
    player.y = GROUND_Y - PH;
    player.vy = 0;
    player.grounded = true;
    player.crouching = false;
    player.jumpHeld = false;
    player.jumpTimer = 0;
    player.jumpBuffer = 0;
}

function initializeRun(attractMode) {
    game.running = true;
    game.paused = false;
    orientationPaused = false;
    game.attractMode = attractMode;
    game.score = 0;
    game.sessionCoins = 0;
    game.speed = 1.2;
    game.baseSpeed = 1.2;
    game.biomeIndex = 0;
    music.setPaused(false);
    music.setBiome(0);
    game.prevBiomeIndex = -1;
    game.biomeTransition = 1;
    game.biomeTransitionTimer = 0;
    game.biomeTransitionId = 0;
    game.frameCount = 0;
    game.lastObstacle = 0;
    game.lastCoin = 0;
    game.lastWall = 0;
    game.wallActive = false;
    game.screenShake = 0;
    game.flashAlpha = 0;
    game.autoJump = false;
    game.autoCrouch = false;
    hitFeedbackTimer = 0;

    resetPlayer();
    obstacles = [];
    coins = [];
    walls = [];
    particles = [];
    keys = {};
    clearTouchInputs();
    initBgElements();

    ui.over.classList.add('hidden');
    ui.pause.classList.add('hidden');
    ui.mobileSettings.classList.add('hidden');
    ui.commands.classList.add('hidden');
    ui.shop.classList.add('hidden');
    ui.main.classList.toggle('hidden', !attractMode);
    ui.game.classList.toggle('hidden', attractMode);
    ui.duck.classList.toggle('active', !attractMode && isMobileTouch());
    ui.prompt.classList.add('hidden');
    ui.prompt.classList.remove('hit-good');
    ui.target.classList.add('hidden');
    ui.newRecord.classList.add('hidden');
    ui.biome.textContent = BIOMES[0].name;
    displayedScore = -1;
    beginBiomeTransition();

    ensureLoop();
}

function startGame() {
    music.unlock(true);
    requestMobilePresentation();
    initializeRun(false);
    updateOrientationState();
}

function startAttract() {
    initializeRun(true);
    updateOrientationState();
}

function gameOver() {
    if (game.attractMode) {
        initializeRun(true);
        return;
    }

    music.fadeOut(0.8);
    game.running = false;
    game.paused = false;
    orientationPaused = false;

    var score = Math.floor(game.score);
    save.coins += game.sessionCoins;

    var isRecord = false;
    if (score > save.highScore) {
        save.highScore = score;
        isRecord = true;
    }
    persist();

    ui.game.classList.add('hidden');
    ui.pause.classList.add('hidden');
    ui.mobileSettings.classList.add('hidden');
    ui.commands.classList.add('hidden');
    ui.duck.classList.remove('active');
    ui.prompt.classList.add('hidden');
    ui.prompt.classList.remove('hit-good');
    ui.target.classList.add('hidden');
    ui.biomeTransition.classList.add('hidden');
    ui.biomeParticles.innerHTML = '';
    ui.overlay.classList.remove('theme-jungle', 'theme-volcano', 'theme-glacier', 'theme-neon');
    game.biomeTransitionTimer = 0;
    hitFeedbackTimer = 0;
    ui.over.classList.remove('hidden');
    ui.finalScore.textContent = 'PUNTI: ' + score;
    ui.finalCoins.textContent = 'MONETE: +' + game.sessionCoins;
    if (isRecord) {
        ui.newRecord.classList.remove('hidden');
    } else {
        ui.newRecord.classList.add('hidden');
    }
}

function showMenu() {
    ui.over.classList.add('hidden');
    ui.pause.classList.add('hidden');
    ui.mobileSettings.classList.add('hidden');
    ui.commands.classList.add('hidden');
    ui.shop.classList.add('hidden');
    ui.chestOverlay.classList.add('hidden');
    ui.main.classList.remove('hidden');
    ui.highScore.textContent = save.highScore;
    ui.mainCoins.textContent = save.coins;
    if (!game.running || !game.attractMode) startAttract();
}

function openCommands() {
    ui.commands.classList.remove('hidden');
}

function closeCommands() {
    ui.commands.classList.add('hidden');
}

function updateTouchButtonPreferences() {
    var size = Number(ui.touchSize.value);
    var opacity = Number(ui.touchOpacity.value) / 100;
    document.documentElement.style.setProperty('--touch-size', size + 'px');
    document.documentElement.style.setProperty('--touch-opacity', opacity.toFixed(2));
    localStorage.setItem('pr_touch_size', size);
    localStorage.setItem('pr_touch_opacity', Number(ui.touchOpacity.value));
}

function openMobileSettings() {
    if (!isMobileTouch()) return;
    requestMobilePresentation();
    if (game.running && !game.attractMode && !game.paused) pauseGame();
    ui.pause.classList.add('hidden');
    ui.mobileSettings.classList.remove('hidden');
}

function closeMobileSettings() {
    ui.mobileSettings.classList.add('hidden');
    if (game.paused && !orientationPaused) resumeGame();
}

function pauseGame() {
    if (!game.running || game.attractMode || game.paused) return;
    game.paused = true;
    music.setPaused(true);
    keys = {};
    clearTouchInputs();
    ui.duck.classList.remove('active');
    ui.pause.classList.remove('hidden');
}

function resumeGame() {
    if (!game.paused) return;
    if (orientationPaused) return;
    game.paused = false;
    music.setPaused(false);
    keys = {};
    clearTouchInputs();
    ui.pause.classList.add('hidden');
    ui.mobileSettings.classList.add('hidden');
    ui.commands.classList.add('hidden');
    ui.duck.classList.toggle('active', isMobileTouch());
    lastTime = performance.now();
}

function handleEscape() {
    if (!ui.commands.classList.contains('hidden')) {
        closeCommands();
        return;
    }
    if (!ui.mobileSettings.classList.contains('hidden')) {
        ui.mobileSettings.classList.add('hidden');
        if (game.paused && !orientationPaused) resumeGame();
        return;
    }
    if (game.paused) {
        resumeGame();
        return;
    }
    pauseGame();
}

function showShop(fromGameOver) {
    ui.main.classList.add('hidden');
    ui.over.classList.add('hidden');
    ui.shop.classList.remove('hidden');
    ui.shop._fromGameOver = fromGameOver || false;
    refreshShop();
}

function refreshShop() {
    ui.shopCoins.textContent = 'MONETE: ' + save.coins;
    ui.skinList.innerHTML = '';

    for (var i = 0; i < SKINS.length; i++) {
        var skin   = SKINS[i];
        var owned  = save.skins.indexOf(skin.id) >= 0;
        var equipped = save.activeSkin === skin.id;

        var item = document.createElement('div');
        item.className = 'skin-item';
        if (equipped)    item.className += ' equipped';
        else if (owned)  item.className += ' unlocked';
        else             item.className += ' locked';

        var raritySpan = document.createElement('span');
        raritySpan.className = 'skin-rarity rarity-' + skin.rarity;
        raritySpan.textContent = RARITY_LABELS[skin.rarity];
        item.appendChild(raritySpan);

        var preview = document.createElement('canvas');
        preview.width  = 10;
        preview.height = 10;
        preview.style.width  = '36px';
        preview.style.height = '36px';
        var pCtx = preview.getContext('2d');
        pCtx.imageSmoothingEnabled = false;
        drawSpriteOnCtx(pCtx, 0, 0, PLAYER_IDLE, getSkinColors(skin), 1);
        item.appendChild(preview);

        var nameSpan = document.createElement('span');
        nameSpan.className = 'skin-name';
        nameSpan.textContent = skin.name;
        item.appendChild(nameSpan);

        if (owned && !equipped) {
            item.onclick = (function(skinId) {
                return function() {
                    save.activeSkin = skinId;
                    persist();
                    refreshShop();
                };
            })(skin.id);
        }

        ui.skinList.appendChild(item);
    }
}

function openChest() {
    if (save.coins < 50) return;
    save.coins -= 50;
    persist();

    ui.shop.classList.add('hidden');
    ui.chestOverlay.classList.remove('hidden');
    ui.chestResult.classList.add('hidden');
    ui.chestClose.classList.add('hidden');

    var chestAnim = { phase: 0, timer: 0, shake: 0, opened: false, skin: null };

    var totalWeight = 0;
    for (var key in RARITY_WEIGHTS) totalWeight += RARITY_WEIGHTS[key];
    var roll = Math.random() * totalWeight;
    var cumulative = 0;
    var chosenRarity = 'common';
    for (var key in RARITY_WEIGHTS) {
        cumulative += RARITY_WEIGHTS[key];
        if (roll < cumulative) { chosenRarity = key; break; }
    }

    var candidates = [];
    for (var i = 0; i < SKINS.length; i++) {
        if (SKINS[i].rarity === chosenRarity) candidates.push(SKINS[i]);
    }
    chestAnim.skin = candidates[randInt(0, candidates.length - 1)];

    var isDupe = save.skins.indexOf(chestAnim.skin.id) >= 0;

    function animateChest() {
        chestAnim.timer++;
        chestCtx.clearRect(0, 0, 64, 64);

        if (chestAnim.timer < 60) {
            var shk = Math.sin(chestAnim.timer * 0.5) * Math.min(chestAnim.timer * 0.05, 2);
            chestCtx.save();
            chestCtx.translate(32 + shk, 32);
            chestCtx.fillStyle = '#d4a017';
            chestCtx.fillRect(-13, -9, 26, 18);
            chestCtx.fillStyle = '#aa7700';
            chestCtx.fillRect(-13, -9, 26, 5);
            chestCtx.fillStyle = '#ffd700';
            chestCtx.fillRect(-3, -3, 6, 6);
            chestCtx.fillStyle = '#886600';
            chestCtx.fillRect(-13, 0, 26, 1);
            chestCtx.restore();
            requestAnimationFrame(animateChest);
        } else if (chestAnim.timer < 90) {
            var t = (chestAnim.timer - 60) / 30;
            chestCtx.save();
            chestCtx.translate(32, 32);
            chestCtx.fillStyle = '#d4a017';
            chestCtx.fillRect(-13, -9 + t * 5, 26, 18 - t * 5);
            chestCtx.fillStyle = '#aa7700';
            chestCtx.fillRect(-13, -9 - t * 9, 26, 5);
            var glow = Math.sin(chestAnim.timer * 0.3) * 0.3 + 0.7;
            chestCtx.fillStyle = 'rgba(255,215,0,' + glow + ')';
            chestCtx.fillRect(-9, -7, 18, 5);
            chestCtx.restore();
            requestAnimationFrame(animateChest);
        } else if (chestAnim.timer < 120) {
            chestCtx.save();
            chestCtx.translate(32, 20);
            var colors = getSkinColors(chestAnim.skin);
            drawSpriteOnCtx(chestCtx, -10, -10, PLAYER_IDLE, colors, 2);
            chestCtx.restore();
            var sparkle = (chestAnim.timer - 90) / 30;
            for (var i = 0; i < 10; i++) {
                var angle = (i / 10) * Math.PI * 2 + chestAnim.timer * 0.1;
                var dist = 10 + sparkle * 18;
                chestCtx.fillStyle = RARITY_COLORS[chestAnim.skin.rarity];
                chestCtx.fillRect(32 + Math.cos(angle) * dist, 32 + Math.sin(angle) * dist, 2, 2);
            }
            requestAnimationFrame(animateChest);
        } else {
            chestCtx.save();
            chestCtx.translate(32, 20);
            var colors = getSkinColors(chestAnim.skin);
            drawSpriteOnCtx(chestCtx, -10, -10, PLAYER_IDLE, colors, 2);
            chestCtx.restore();

            if (!isDupe) {
                save.skins.push(chestAnim.skin.id);
                ui.chestResult.innerHTML = '<span style="color:' + RARITY_COLORS[chestAnim.skin.rarity] + '">' + chestAnim.skin.name + '</span><br><span style="font-size:0.8rem">' + RARITY_LABELS[chestAnim.skin.rarity] + '</span>';
            } else {
                var refund = DUPE_REFUND[chestAnim.skin.rarity];
                save.coins += refund;
                ui.chestResult.innerHTML = '<span style="color:' + RARITY_COLORS[chestAnim.skin.rarity] + '">' + chestAnim.skin.name + '</span><br><span style="font-size:0.8rem">DOPPIONE! +' + refund + ' monete</span>';
            }
            persist();
            ui.chestResult.classList.remove('hidden');
            ui.chestClose.classList.remove('hidden');
        }
    }

    requestAnimationFrame(animateChest);
}

function updatePlayer() {
    if (game.attractMode) {
        var closest = null;
        var closestDistance = Infinity;
        for (var i = 0; i < obstacles.length; i++) {
            var distance = obstacles[i].x - (player.x + player.w);
            if (distance >= -obstacles[i].w && distance < closestDistance) {
                closest = obstacles[i];
                closestDistance = distance;
            }
        }
        game.autoJump = !!closest && !closest.flying && (player.grounded || (player.jumpHeld && player.jumpTimer < 7)) && closestDistance < Math.max(30, game.speed * 12);
        game.autoCrouch = !!closest && closest.flying && closestDistance < Math.max(18, game.speed * 8);
        keys.Space = game.autoJump;
        keys.ArrowDown = game.autoCrouch;
    }

    var jumpInput = keys['Space'] || keys['ArrowUp'] || keys['KeyW'] || hasActivePointers(touchJumpPointers) || player.jumpBuffer > 0;
    if (player.jumpBuffer > 0) player.jumpBuffer--;
    if (jumpInput) {
        if (player.grounded) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumpHeld = true;
            player.jumpTimer = 0;
            music.playSfx('jump');
        } else if (player.jumpHeld && player.jumpTimer < JUMP_HOLD_MAX) {
            player.vy += JUMP_HOLD;
            player.jumpTimer++;
        }
    } else {
        player.jumpHeld = false;
    }

    var downInput = keys['ArrowDown'] || keys['KeyS'] || hasActivePointers(touchDownPointers);
    if (downInput) {
        player.crouching = player.grounded;
        if (!player.grounded) {
            player.vy += 2.2;
        }
    } else {
        player.crouching = false;
    }

    if (!player.grounded) {
        player.vy += GRAVITY;
        var maxFall = downInput ? MAX_FALL + 4 : MAX_FALL;
        if (player.vy > maxFall) player.vy = maxFall;
        player.y += player.vy;
    }

    var ph = player.crouching ? 6 : PH;
    var floor = GROUND_Y - ph;
    if (player.y >= floor) {
        player.y = floor;
        player.vy = 0;
        player.grounded = true;
    }

    player.animTimer++;
    if (player.animTimer > 5) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 4;
    }
}

function updateObstacles() {
    var upcomingWall = null;
    for (var i = 0; i < walls.length; i++) {
        if (!walls[i].destroyed) {
            upcomingWall = walls[i];
            break;
        }
    }

    var wallSafetyActive = !!upcomingWall &&
        upcomingWall.x - (player.x + player.w) <= getWallSafetyDistance();

    if (game.biomeTransitionTimer <= 0 && !wallSafetyActive) {
        game.lastObstacle++;
        var gapDistance = Math.max(110, 190 - Math.min(55, game.score * 0.06));
        var minGap = Math.max(18, gapDistance / game.speed);
        if (game.lastObstacle > minGap + rand(0, minGap * 0.3)) {
            spawnObstacle();
            game.lastObstacle = 0;
        }
    }

    if (wallSafetyActive) game.lastObstacle = 0;

    for (var i = obstacles.length - 1; i >= 0; i--) {
        var o = obstacles[i];
        o.x -= game.speed;
        if (o.flying) o.wingTimer++;
        if (o.x + o.w < 0) {
            obstacles.splice(i, 1);
            continue;
        }

        if (game.biomeTransitionTimer > 0) {
            continue;
        }
        if (o.transitionGhost) continue;

        var ph = player.crouching ? 6 : PH;
        var py = player.crouching ? GROUND_Y - 6 : player.y;
        if (aabb(player.x + 2, py + 1, player.w - 4, ph - 2, o.x, o.y, o.w, o.h)) {
            game.screenShake = 9;
            gameOver();
            return;
        }
    }
}

function updateCoins() {
    game.lastCoin++;
    var coinInterval = (250 + rand(0, 90)) / game.speed;
    if (game.lastCoin > coinInterval) {
        spawnCoinRow();
        game.lastCoin = 0;
    }

    for (var i = coins.length - 1; i >= 0; i--) {
        var c = coins[i];
        c.x -= game.speed;
        c.timer++;
        if (c.timer > 8) { c.timer = 0; c.frame = (c.frame + 1) % COIN_FRAMES.length; }

        if (c.x + c.w < 0) {
            coins.splice(i, 1);
            continue;
        }

        var ph = player.crouching ? 6 : PH;
        var py = player.crouching ? GROUND_Y - 6 : player.y;
        if (aabb(player.x, py, player.w, ph, c.x, c.y, c.w, c.h)) {
            game.sessionCoins++;
            music.playSfx('coin');
            spawnCoinParticles(c.x + 4, c.y + 4);
            coins.splice(i, 1);
        }
    }
}

function getWallApproachDuration() {
    return Math.max(34, Math.min(70, Math.round(130 / game.speed)));
}

function getWallSafetyDistance() {
    return game.speed * (getWallApproachDuration() + 30) + 30;
}

var BIOME_TRANSITION_DURATION = 2400;

function beginBiomeTransition() {
    if (game.attractMode) {
        game.biomeTransitionTimer = 0;
        ui.biomeTransition.classList.add('hidden');
        ui.biomeParticles.innerHTML = '';
        ui.overlay.classList.remove('theme-jungle', 'theme-volcano', 'theme-glacier', 'theme-neon');
        return;
    }

    var transition = biome();
    var colors = {
        jungle: '#58ff91',
        volcano: '#ff8b38',
        glacier: '#c6f5ff',
        neon: '#ffe06b'
    };

    game.biomeTransitionTimer = BIOME_TRANSITION_DURATION;
    game.biomeTransitionId++;
    game.lastObstacle = 0;
    game.lastWall = 0;
    for (var i = 0; i < obstacles.length; i++) {
        if (!obstacles[i].transitionGhost) {
            obstacles[i].transitionGhost = true;
            obstacles[i].transitionId = game.biomeTransitionId;
        }
    }
    ui.prompt.classList.add('hidden');
    ui.target.classList.add('hidden');
    ui.biomeTitle.textContent = transition.name;
    ui.biomeParticles.innerHTML = '';
    ui.overlay.classList.remove('theme-jungle', 'theme-volcano', 'theme-glacier', 'theme-neon');
    ui.overlay.classList.add('theme-' + transition.theme);
    ui.biomeTransition.classList.remove('hidden');

    for (var i = 0; i < 28; i++) {
        var particle = document.createElement('span');
        particle.className = 'biome-particle';
        particle.style.setProperty('--particle-x', rand(0, 100).toFixed(2) + '%');
        particle.style.setProperty('--particle-y', (transition.theme === 'volcano' ? rand(70, 105) : rand(-8, 108)).toFixed(2) + '%');
        particle.style.setProperty('--particle-size', rand(3, 10).toFixed(1) + 'px');
        particle.style.setProperty('--particle-delay', rand(-0.2, 0.45).toFixed(2) + 's');
        particle.style.setProperty('--particle-drift', rand(-85, 85).toFixed(1) + 'px');
        particle.style.setProperty('--particle-color', colors[transition.theme]);
        ui.biomeParticles.appendChild(particle);
    }
}

function updateBiomeTransition(dt) {
    if (game.biomeTransitionTimer <= 0) return;
    game.biomeTransitionTimer = Math.max(0, game.biomeTransitionTimer - dt);
    if (game.biomeTransitionTimer > 0) return;

    walls = [];
    game.wallActive = false;
    ui.biomeTransition.classList.add('hidden');
    ui.overlay.classList.remove('theme-jungle', 'theme-volcano', 'theme-glacier', 'theme-neon');
    ui.biomeParticles.innerHTML = '';
}

function activeTimingWall() {
    for (var i = 0; i < walls.length; i++) {
        if (!walls[i].destroyed && walls[i].windowStart >= 0) return walls[i];
    }
    return null;
}

function positionWallTarget(wall) {
    var bounds = ui.overlay.getBoundingClientRect();
    var targetWidth = parseFloat(getComputedStyle(ui.target).width) || 64;
    var targetRadius = targetWidth / 2;
    var desiredScale = 1 + 38 / targetHitRadius;
    var safeRadius = targetRadius * desiredScale + 8;
    var exclusions = [ui.score, ui.coinCount, ui.biome, ui.prompt, ui.mobileSettingsButton, ui.duck];
    var positions = [];
    var step = Math.max(8, Math.min(20, Math.floor(targetRadius / 2)));

    while (!positions.length && safeRadius >= targetRadius + 8) {
        var minX = bounds.left + safeRadius;
        var maxX = bounds.right - safeRadius;
        var minY = bounds.top + safeRadius;
        var maxY = bounds.bottom - safeRadius;
        var excludedRects = [];

        for (var i = 0; i < exclusions.length; i++) {
            var element = exclusions[i];
            if (!element || element.classList.contains('hidden')) continue;
            var rect = element.getBoundingClientRect();
            if (rect.width && rect.height) {
                excludedRects.push({
                    left: rect.left - safeRadius,
                    right: rect.right + safeRadius,
                    top: rect.top - safeRadius,
                    bottom: rect.bottom + safeRadius
                });
            }
        }

        for (var y = minY; y <= maxY; y += step) {
            for (var x = minX; x <= maxX; x += step) {
                var safe = true;
                for (var j = 0; j < excludedRects.length; j++) {
                    var excluded = excludedRects[j];
                    if (x >= excluded.left && x <= excluded.right && y >= excluded.top && y <= excluded.bottom) {
                        safe = false;
                        break;
                    }
                }
                if (safe) positions.push({ x: x, y: y });
            }
        }

        if (!positions.length) {
            if (safeRadius <= targetRadius + 8) break;
            safeRadius = Math.max(targetRadius + 8, safeRadius - 8);
        }
    }

    if (!positions.length) {
        var fallbackX = Math.max(bounds.left + targetRadius, Math.min(bounds.right - targetRadius, (bounds.left + bounds.right) / 2));
        var fallbackY = Math.max(bounds.top + targetRadius, Math.min(bounds.bottom - targetRadius, (bounds.top + bounds.bottom) / 2));
        positions.push({ x: fallbackX, y: fallbackY });
    }

    var position = positions[Math.floor(Math.random() * positions.length)];
    wall.targetX = position.x - bounds.left;
    wall.targetY = position.y - bounds.top;
    ui.target.style.left = wall.targetX + 'px';
    ui.target.style.top = wall.targetY + 'px';
    wall.targetApproachScale = Math.min(desiredScale, (safeRadius - 8) / targetRadius);
    ui.target.style.setProperty('--approach-scale', wall.targetApproachScale.toFixed(3));
}

function attemptWallHit(wall) {
    if (!wall || wall.destroyed || wall.windowStart < 0) return false;
    var progress = wall.windowStart / wall.windowDuration;
    music.playSfx('wall', progress >= 0.92);
    wall.destroyed = true;
    wall.flashTimer = 0;
    ui.target.classList.add('hidden');
    game.score += 25;
    game.sessionCoins += 5;
    game.flashAlpha = 0.6;
    game.screenShake = 5;
    if (!game.attractMode) {
        ui.prompt.textContent = progress >= 0.92 ? 'PERFECT!' : 'GREAT!';
        ui.prompt.classList.add('hit-good');
        ui.prompt.classList.remove('hidden');
        hitFeedbackTimer = 45;
    }
    spawnParticles(wall.x + wall.w / 2, GROUND_Y / 2, biome().particles, 32);
    spawnParticles(wall.x + wall.w / 2, GROUND_Y / 3, biome().wallColor, 22);
    return true;
}

function updateWalls() {
    if (game.biomeTransitionTimer <= 0) {
        game.lastWall++;
        var wallInterval = Math.max(360, 600 - Math.min(180, game.score * 0.16)) / game.speed;
        if (game.lastWall > wallInterval && !game.wallActive && Math.floor(game.score) > 30) {
            spawnWall();
            game.lastWall = 0;
        }
    }

    for (var i = walls.length - 1; i >= 0; i--) {
        var wall = walls[i];
        wall.x -= game.speed;

        if (wall.destroyed) {
            ui.target.classList.add('hidden');
            wall.flashTimer++;
            if (wall.flashTimer > 22) {
                walls.splice(i, 1);
                game.wallActive = false;
            }
            continue;
        }

        if (game.biomeTransitionTimer > 0) {
            continue;
        }

        var dist = wall.x - player.x;

        var approachDuration = getWallApproachDuration();
        if (dist > 0 && dist <= game.speed * approachDuration + 8 && wall.windowStart < 0) {
            wall.windowStart = 0;
            wall.windowDuration = approachDuration;
            if (!game.attractMode) {
                ui.prompt.textContent = 'TOCCA IL BERSAGLIO A TEMPO';
                ui.prompt.classList.remove('hit-good');
                ui.prompt.classList.remove('hidden');
                ui.target.classList.remove('hidden');
                positionWallTarget(wall);
            }
        }

        if (wall.windowStart >= 0) {
            wall.windowStart++;
            if (!game.attractMode) {
                var progress = Math.min(1, wall.windowStart / wall.windowDuration);
                var maxApproachScale = wall.targetApproachScale || (1 + 38 / targetHitRadius);
                var approachScale = 1 + (maxApproachScale - 1) * (1 - progress);
                ui.target.style.setProperty('--approach-scale', approachScale.toFixed(3));
            }
            if (game.attractMode && wall.windowStart / wall.windowDuration >= 0.92) {
                attemptWallHit(wall);
            }
        }

        if (wall.x + wall.w < player.x) {
            ui.prompt.classList.add('hidden');
            game.screenShake = 11;
            gameOver();
            return;
        }

        var ph = player.crouching ? 6 : PH;
        var py = player.crouching ? GROUND_Y - 6 : player.y;
        if (!wall.destroyed && aabb(player.x + 2, py, player.w - 4, ph, wall.x, 0, wall.w, GROUND_Y)) {
            ui.prompt.classList.add('hidden');
            game.screenShake = 11;
            gameOver();
            return;
        }
    }
}

function updateParticles() {
    for (var i = particles.length - 1; i >= 0; i--) {
        var p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.1;
        p.life--;
        if (p.life <= 0) {
            particles.splice(i, 1);
        }
    }
}

function updateAtmParticles() {
    var b = biome();
    for (var i = atmParticles.length - 1; i >= 0; i--) {
        var p = atmParticles[i];
        p.life++;
        p.x += p.vx;
        p.y += p.vy;

        if (p.type === 'snow') {
            p.wobble += p.wobbleSpeed;
            p.x += Math.sin(p.wobble) * 0.3;
        } else if (p.type === 'sparks') {
            p.vy += p.grav;
        } else if (p.type === 'neon') {
            p.pulse += p.pulseSpeed;
        } else if (p.type === 'leaves') {
            p.angle += p.spin;
        }

        if (p.life > p.maxLife || p.x < -5 || p.y > GROUND_Y || p.y < -5) {
            atmParticles[i] = makeAtmParticle(false);
            atmParticles[i].type = b.atmType;
        }
    }
}

function updateBiome() {
    var scoreVal = Math.floor(game.score);
    var newBiome = Math.floor(scoreVal / 500) % BIOMES.length;
    if (newBiome !== game.biomeIndex) {
        game.prevBiomeIndex = game.biomeIndex;
        game.biomeIndex = newBiome;
        music.setBiome(newBiome);
        game.biomeTransition = 0;
        ui.biome.textContent = BIOMES[game.biomeIndex].name;
        beginBiomeTransition();
        for (var i = 0; i < atmParticles.length; i++) {
            atmParticles[i] = makeAtmParticle(true);
            atmParticles[i].type = biome().atmType;
        }
    }

    if (game.biomeTransition < 1) {
        game.biomeTransition = Math.min(1, game.biomeTransition + 0.007);
    }
}

function update(dt) {
    game.frameCount++;
    game.score += game.speed * 0.05;
    var targetSpeed = game.baseSpeed + (5.2 - game.baseSpeed) * (1 - Math.exp(-game.score / 1100));
    game.speed += (targetSpeed - game.speed) * 0.015;

    updateBiome();
    updatePlayer();
    if (!game.running) return;
    updateObstacles();
    if (!game.running) return;
    updateCoins();
    updateWalls();
    updateBiomeTransition(dt);
    if (!game.running) return;
    updateParticles();
    updateAtmParticles();

    if (game.screenShake > 0) game.screenShake -= 0.5;
    if (game.flashAlpha > 0)  game.flashAlpha  -= 0.03;
    if (hitFeedbackTimer > 0) {
        hitFeedbackTimer--;
        if (hitFeedbackTimer === 0 && !activeTimingWall()) {
            ui.prompt.classList.add('hidden');
            ui.prompt.classList.remove('hit-good');
        }
    }

    var scoreValue = Math.floor(game.score);
    if (scoreValue !== displayedScore) {
        ui.score.textContent = scoreValue;
        ui.score.classList.remove('score-pop');
        void ui.score.offsetWidth;
        ui.score.classList.add('score-pop');
        displayedScore = scoreValue;
    }
    ui.coinCount.textContent = 'x' + game.sessionCoins;
}

function drawBackground() {
    var sky = transitionedColor('sky');
    ctx.fillStyle = rgb(sky);
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < bgLayers.stars.length; i++) {
        var s = bgLayers.stars[i];
        var twinkle = Math.sin(game.frameCount * 0.05 + s.twinkle) * 0.5 + 0.5;
        ctx.fillStyle = rgba([255, 255, 255], twinkle * 0.65);
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }

    var farColor = transitionedColor('far');
    var farOffset = (game.frameCount * game.speed * 0.12) % W;
    for (var i = 0; i < bgLayers.far.length; i++) {
        var m = bgLayers.far[i];
        var mx = ((m.x - farOffset) % (W + 70)) - 35;
        if (mx < -70) mx += W + 70;
        drawMountain(mx, GROUND_Y, m.w, m.h, farColor);
    }

    var midColor = transitionedColor('mid');
    var midOffset = (game.frameCount * game.speed * 0.3) % W;
    for (var i = 0; i < bgLayers.mid.length; i++) {
        var t = bgLayers.mid[i];
        var tx = ((t.x - midOffset) % (W + 50)) - 25;
        if (tx < -40) tx += W + 50;
        if (t.type === 0) {
            drawTree(tx, GROUND_Y, t.h, midColor);
        } else if (t.type === 1) {
            drawPillar(tx, GROUND_Y, t.h, midColor);
        } else {
            drawRock(tx, GROUND_Y, t.h, midColor);
        }
    }
}

function drawMountain(x, baseY, w, h, color) {
    ctx.fillStyle = rgb(color);
    ctx.beginPath();
    ctx.moveTo(x, baseY);
    ctx.lineTo(x + w * 0.5, baseY - h);
    ctx.lineTo(x + w, baseY);
    ctx.closePath();
    ctx.fill();
    var lighter = lerpColor(color, [255, 255, 255], 0.15);
    ctx.fillStyle = rgb(lighter);
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, baseY - h);
    ctx.lineTo(x + w * 0.5 + 3, baseY - h + 6);
    ctx.lineTo(x + w * 0.5 - 3, baseY - h + 6);
    ctx.closePath();
    ctx.fill();
}

function drawTree(x, baseY, h, color) {
    var dk = lerpColor(color, [0, 0, 0], 0.25);
    ctx.fillStyle = rgb(dk);
    ctx.fillRect(Math.floor(x + 3), baseY - h, 2, h);
    ctx.fillStyle = rgb(color);
    ctx.fillRect(Math.floor(x), baseY - h, 8, 5);
    ctx.fillRect(Math.floor(x + 1), baseY - h - 4, 6, 4);
    ctx.fillRect(Math.floor(x + 2), baseY - h - 7, 4, 3);
    var hi = lerpColor(color, [255, 255, 255], 0.2);
    ctx.fillStyle = rgb(hi);
    ctx.fillRect(Math.floor(x + 1), baseY - h, 2, 1);
}

function drawPillar(x, baseY, h, color) {
    var dk = lerpColor(color, [0, 0, 0], 0.3);
    ctx.fillStyle = rgb(dk);
    ctx.fillRect(Math.floor(x + 1), baseY - h, 2, h);
    ctx.fillStyle = rgb(color);
    ctx.fillRect(Math.floor(x), baseY - h, 5, h);
    ctx.fillRect(Math.floor(x - 1), baseY - h, 7, 2);
    ctx.fillRect(Math.floor(x - 1), baseY - 2, 7, 2);
}

function drawRock(x, baseY, h, color) {
    var rh = Math.min(h, 10);
    var dk = lerpColor(color, [0, 0, 0], 0.3);
    ctx.fillStyle = rgb(dk);
    ctx.fillRect(Math.floor(x + 1), baseY - rh, 7, rh);
    ctx.fillStyle = rgb(color);
    ctx.fillRect(Math.floor(x), baseY - rh, 7, rh);
    ctx.fillRect(Math.floor(x + 1), baseY - rh - 2, 5, 2);
    var hi = lerpColor(color, [255, 255, 255], 0.2);
    ctx.fillStyle = rgb(hi);
    ctx.fillRect(Math.floor(x + 1), baseY - rh, 2, 2);
}

function drawGround() {
    var gc  = transitionedColor('ground');
    var gc2 = transitionedColor('groundAlt');
    var gdk = transitionedColor('groundDark');
    ctx.fillStyle = rgb(gdk);
    ctx.fillRect(0, GROUND_Y + 1, W, H - GROUND_Y - 1);
    ctx.fillStyle = rgb(gc);
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    var groundOffset = Math.floor(game.frameCount * game.speed) % 6;
    ctx.fillStyle = rgb(gc2);
    for (var x = -groundOffset; x < W; x += 6) {
        ctx.fillRect(x, GROUND_Y, 3, 1);
        ctx.fillRect(x + 3, GROUND_Y + 3, 3, 1);
        ctx.fillRect(x, GROUND_Y + 6, 3, 1);
    }

    var accent = transitionedColor('accent');
    ctx.fillStyle = rgba(accent, 0.4);
    ctx.fillRect(0, GROUND_Y, W, 1);

    ctx.fillStyle = rgba(gdk, 0.5);
    ctx.fillRect(0, GROUND_Y + 2, W, 1);
}

function drawAtmParticles() {
    var b = biome();
    var atmC = b.atmColor;

    for (var i = 0; i < atmParticles.length; i++) {
        var p = atmParticles[i];
        var alpha = Math.min(1, p.life / 20) * (1 - p.life / p.maxLife) * 0.7;
        if (alpha < 0.02) continue;

        if (p.type === 'leaves') {
            ctx.save();
            ctx.translate(Math.floor(p.x), Math.floor(p.y));
            ctx.fillStyle = rgba(atmC, alpha);
            ctx.fillRect(-1, 0, 3, 1);
            ctx.fillRect(0, -1, 1, 3);
            ctx.restore();
        } else if (p.type === 'sparks') {
            var bright = lerpColor(atmC, [255, 255, 200], 0.5);
            ctx.fillStyle = rgba(bright, alpha * 1.4);
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), 1);
        } else if (p.type === 'snow') {
            ctx.fillStyle = rgba([220, 240, 255], alpha);
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
        } else if (p.type === 'neon') {
            var pulse = Math.sin(p.pulse) * 0.4 + 0.6;
            ctx.fillStyle = rgba(atmC, alpha * pulse);
            ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 1, 1);
            ctx.fillStyle = rgba(atmC, alpha * pulse * 0.3);
            ctx.fillRect(Math.floor(p.x) - 1, Math.floor(p.y) - 1, 3, 3);
        }
    }
}

function drawPlayer() {
    var skinDef = null;
    for (var i = 0; i < SKINS.length; i++) {
        if (SKINS[i].id === save.activeSkin) { skinDef = SKINS[i]; break; }
    }
    if (!skinDef) skinDef = SKINS[0];

    var colors = getSkinColors(skinDef);
    var outlineColor = skinDef.colors.outline;
    var sprite;
    var py = player.crouching ? GROUND_Y - 6 : player.y;

    if (player.crouching) {
        sprite = PLAYER_CROUCH;
    } else if (!player.grounded) {
        sprite = PLAYER_JUMP;
    } else {
        var frames = [PLAYER_IDLE, PLAYER_RUN1, PLAYER_IDLE, PLAYER_RUN2];
        sprite = frames[player.animFrame % 4];
    }

    drawOutlinedSprite(player.x, py, sprite, colors, outlineColor);
    drawBiomeOutfit(player.x, py);
}

function drawOutfitPixels(x, y, pixels) {
    for (var i = 0; i < pixels.length; i++) {
        ctx.fillStyle = pixels[i][2];
        ctx.fillRect(Math.floor(x + pixels[i][0]), Math.floor(y + pixels[i][1]), 1, 1);
    }
}

function drawBiomeOutfit(x, y) {
    var crouching = player.crouching;
    var bodyRow = crouching ? 3 : 5;

    if (biome().theme === 'jungle') {
        drawOutfitPixels(x, y, [
            [3, bodyRow, '#236b32'], [4, bodyRow, '#7e6a32'], [6, bodyRow, '#28522c'],
            [2, bodyRow + 1, '#7e6a32'], [4, bodyRow + 1, '#236b32'], [5, bodyRow + 1, '#805b32'],
            [3, bodyRow + 2, '#28522c'], [6, bodyRow + 2, '#7e6a32']
        ]);
    } else if (biome().theme === 'volcano') {
        var shortsRow = crouching ? 5 : 7;
        drawOutfitPixels(x, y, [
            [2, shortsRow, '#f4c928'], [3, shortsRow, '#ffdc3d'], [4, shortsRow, '#f4c928'],
            [5, shortsRow, '#ffdc3d'], [6, shortsRow, '#f4c928'], [3, shortsRow + 1, '#d99b18'],
            [5, shortsRow + 1, '#d99b18'], [2, 2, '#171923'], [3, 2, '#252733'],
            [4, 2, '#171923'], [5, 2, '#252733'], [6, 2, '#171923'], [3, 1, '#ffffff'],
            [6, 1, '#ffffff']
        ]);
    } else if (biome().theme === 'glacier') {
        drawOutfitPixels(x, y, [
            [2, bodyRow, '#eaf7ff'], [3, bodyRow, '#ffffff'], [4, bodyRow, '#c9e8f5'],
            [5, bodyRow, '#ffffff'], [6, bodyRow, '#eaf7ff'], [2, bodyRow + 1, '#bdddec'],
            [3, bodyRow + 1, '#f5fbff'], [4, bodyRow + 1, '#bdddec'], [5, bodyRow + 1, '#f5fbff'],
            [6, bodyRow + 1, '#bdddec'], [3, bodyRow + 2, '#d6edf7'], [5, bodyRow + 2, '#d6edf7'],
            [2, 2, '#253b56'], [3, 2, '#80e7ff'], [4, 2, '#c5f6ff'], [5, 2, '#80e7ff'],
            [6, 2, '#253b56'], [3, 1, '#eaf7ff'], [4, 1, '#eaf7ff'], [5, 1, '#eaf7ff']
        ]);
    } else {
        var scarfRow = crouching ? 3 : 4;
        drawOutfitPixels(x, y, [
            [3, 0, '#d9b947'], [4, 0, '#f2d879'], [5, 0, '#d9b947'],
            [2, 1, '#c5a43a'], [3, 1, '#f2d879'], [4, 1, '#d9b947'],
            [5, 1, '#f2d879'], [6, 1, '#c5a43a'], [2, scarfRow, '#c5a43a'],
            [3, scarfRow, '#f2d879'], [4, scarfRow, '#d9b947'], [5, scarfRow, '#f2d879'],
            [6, scarfRow, '#c5a43a']
        ]);
    }
}

function drawObstacle(o) {
    ctx.save();
    if (game.biomeTransitionTimer > 0) {
        ctx.globalAlpha = game.biomeTransitionTimer / BIOME_TRANSITION_DURATION;
    }

    var c  = o.color;
    var dk = o.dark;
    var hi = o.highlight;

    if (o.flying) {
        ctx.fillStyle = rgb(dk);
        ctx.fillRect(Math.floor(o.x + 1), Math.floor(o.y + 1), o.w, o.h);
        ctx.fillStyle = rgb(c);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, o.h);
        ctx.fillStyle = rgb(hi);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, 1);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y), 1, o.h);

        var wf = Math.sin(o.wingTimer * 0.25) > 0 ? 1 : 0;
        ctx.fillStyle = rgba(c, 0.7);
        if (wf === 0) {
            ctx.fillRect(Math.floor(o.x - 3), Math.floor(o.y), 3, 2);
            ctx.fillRect(Math.floor(o.x + o.w), Math.floor(o.y), 3, 2);
        } else {
            ctx.fillRect(Math.floor(o.x - 2), Math.floor(o.y + 1), 2, 2);
            ctx.fillRect(Math.floor(o.x + o.w), Math.floor(o.y + 1), 2, 2);
        }

        ctx.fillStyle = rgb([255, 80, 80]);
        ctx.fillRect(Math.floor(o.x + 1), Math.floor(o.y + 1), 1, 1);
        ctx.fillRect(Math.floor(o.x + o.w - 2), Math.floor(o.y + 1), 1, 1);

    } else {
        ctx.fillStyle = rgb(dk);
        ctx.fillRect(Math.floor(o.x + 1), Math.floor(o.y + 1), o.w, o.h);
        ctx.fillStyle = rgb(c);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, o.h);
        ctx.fillStyle = rgb(hi);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, 1);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y), 1, o.h);
        ctx.fillStyle = rgb(dk);
        ctx.fillRect(Math.floor(o.x + o.w - 1), Math.floor(o.y), 1, o.h);
        ctx.fillRect(Math.floor(o.x), Math.floor(o.y + o.h - 1), o.w, 1);

        ctx.fillStyle = rgba([0, 0, 0], 0.3);
        ctx.fillRect(Math.floor(o.x + 1), Math.floor(o.y + 3), 1, 1);
        ctx.fillRect(Math.floor(o.x + 3), Math.floor(o.y + 6), 1, 1);
    }
    ctx.restore();
}

function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
        if (!obstacles[i].transitionGhost ||
            (game.biomeTransitionTimer > 0 && obstacles[i].transitionId === game.biomeTransitionId)) {
            drawObstacle(obstacles[i]);
        }
    }
}

function drawCoins() {
    var b = biome();
    for (var i = 0; i < coins.length; i++) {
        var c = coins[i];
        var ccolor   = b.coinColor    || [255, 215, 0];
        var chi      = b.coinHighlight|| [255, 240, 100];
        var csh      = b.coinShadow   || [180, 130, 0];
        var sprite   = COIN_FRAMES[c.frame];
        var colorMap = { 1: rgb(ccolor), 2: rgb(chi), 3: rgb(csh) };

        ctx.fillStyle = rgba([0, 0, 0], 0.3);
        ctx.fillRect(Math.floor(c.x + 1), Math.floor(c.y + 1), c.w, c.h);

        drawSprite(c.x, c.y, sprite, colorMap);
    }
}

function drawWalls() {
    for (var i = 0; i < walls.length; i++) {
        var wall = walls[i];
        if (wall.destroyed) continue;

        ctx.save();
        if (game.biomeTransitionTimer > 0) {
            ctx.globalAlpha = game.biomeTransitionTimer / BIOME_TRANSITION_DURATION;
        }

        var c  = wall.color;
        var dk = wall.dark;

        ctx.fillStyle = rgb(dk);
        ctx.fillRect(Math.floor(wall.x + 1), 1, wall.w, GROUND_Y - 1);
        ctx.fillStyle = rgb(c);
        ctx.fillRect(Math.floor(wall.x), 0, wall.w, GROUND_Y);

        var hi = lerpColor(c, [255, 255, 255], 0.2);
        ctx.fillStyle = rgb(hi);
        ctx.fillRect(Math.floor(wall.x), 0, 1, GROUND_Y);

        var crackColor = lerpColor(c, [0, 0, 0], 0.45);
        ctx.fillStyle = rgb(crackColor);
        for (var cy = 6; cy < GROUND_Y; cy += 14) {
            ctx.fillRect(Math.floor(wall.x + 1), cy,     3, 1);
            ctx.fillRect(Math.floor(wall.x + 2), cy + 2, 1, 2);
            ctx.fillRect(Math.floor(wall.x + 4), cy + 6, 2, 1);
        }

        if (wall.windowStart >= 0) {
            var pulse = Math.sin(game.frameCount * 0.35) * 0.2 + 0.8;
            ctx.fillStyle = rgba([255, 255, 100], pulse * 0.22);
            ctx.fillRect(Math.floor(wall.x - 1), 0, wall.w + 2, GROUND_Y);
        }
        ctx.restore();
    }
}

function drawParticles() {
    for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        var alpha = p.life / p.maxLife;
        ctx.fillStyle = rgba(p.color, alpha);
        ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
    }
}

function drawEffects() {
    if (game.flashAlpha > 0) {
        ctx.fillStyle = 'rgba(255,255,255,' + game.flashAlpha + ')';
        ctx.fillRect(0, 0, W, H);
    }
}

function draw() {
    ctx.save();
    if (game.screenShake > 0) {
        var sx = (Math.random() - 0.5) * game.screenShake;
        var sy = (Math.random() - 0.5) * game.screenShake;
        ctx.translate(sx, sy);
    }

    drawBackground();
    drawAtmParticles();
    drawGround();
    drawWalls();
    drawObstacles();
    drawCoins();
    drawPlayer();
    drawParticles();
    drawEffects();

    ctx.restore();
}

var lastTime = 0;

function ensureLoop() {
    if (loopActive) return;
    loopActive = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
}

function loop(time) {
    if (!game.running) {
        loopActive = false;
        return;
    }

    if (game.paused) {
        lastTime = time;
        requestAnimationFrame(loop);
        return;
    }

    var dt = time - lastTime;
    lastTime = time;

    if (dt > 100) dt = 16;

    update(dt);
    if (!game.running) {
        loopActive = false;
        return;
    }
    draw();

    requestAnimationFrame(loop);
}

window.addEventListener('keydown', function(e) {
    if (e.code === 'Escape') {
        e.preventDefault();
        if (!e.repeat) handleEscape();
        return;
    }
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyW' || e.code === 'KeyS') {
        e.preventDefault();
    }
    if ((e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') && !e.repeat && game.running && !game.attractMode) {
        player.jumpBuffer = 4;
    }
    keys[e.code] = true;
});

window.addEventListener('keyup', function(e) {
    keys[e.code] = false;
});

canvas.addEventListener('pointerdown', function(e) {
    if (!game.running || game.attractMode || (e.pointerType === 'mouse' && e.button !== 0)) return;
    e.preventDefault();
    requestMobilePresentation();
    var point = canvasPoint(e.clientX, e.clientY);
    var rect = canvas.getBoundingClientRect();
    pointerStarts[e.pointerId] = {
        x: point.x,
        y: point.y,
        swipeThreshold: 24 * H / Math.max(1, rect.height),
        swiped: false
    };
    touchJumpPointers[e.pointerId] = true;
    player.jumpBuffer = 4;
    if (canvas.setPointerCapture) canvas.setPointerCapture(e.pointerId);
});

canvas.addEventListener('pointermove', function(e) {
    var pointer = pointerStarts[e.pointerId];
    if (!pointer || pointer.swiped) return;
    var point = canvasPoint(e.clientX, e.clientY);
    if (point.y - pointer.y > pointer.swipeThreshold) {
        pointer.swiped = true;
        delete touchJumpPointers[e.pointerId];
        touchDownPointers[e.pointerId] = true;
        if (!player.grounded) player.vy = Math.max(player.vy, 2);
    }
});

function endPointer(e) {
    var pointer = pointerStarts[e.pointerId];
    if (pointer) {
        delete pointerStarts[e.pointerId];
        delete touchJumpPointers[e.pointerId];
        if (pointer.swiped) delete touchDownPointers[e.pointerId];
    }
    if (duckPointers[e.pointerId]) {
        delete duckPointers[e.pointerId];
        delete touchDownPointers[e.pointerId];
    }
}

window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);
window.addEventListener('blur', function() {
    keys = {};
    clearTouchInputs();
});
window.addEventListener('resize', updateOrientationState);
window.addEventListener('orientationchange', function() {
    updateOrientationState();
    window.setTimeout(updateOrientationState, 120);
});
if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', updateOrientationState);
}
if (screen.orientation && screen.orientation.addEventListener) {
    screen.orientation.addEventListener('change', updateOrientationState);
}
document.addEventListener('fullscreenchange', function() {
    if (!document.fullscreenElement) mobilePresentationRequested = false;
    updateOrientationState();
});

ui.duck.addEventListener('pointerdown', function(e) {
    if (!game.running || game.attractMode) return;
    e.preventDefault();
    e.stopPropagation();
    requestMobilePresentation();
    duckPointers[e.pointerId] = true;
    touchDownPointers[e.pointerId] = true;
    if (ui.duck.setPointerCapture) ui.duck.setPointerCapture(e.pointerId);
});

function handleMobileSettingsButton(e) {
    e.preventDefault();
    e.stopPropagation();
    if (ui.mobileSettings.classList.contains('hidden')) openMobileSettings();
}

ui.mobileSettingsButton.addEventListener('pointerdown', handleMobileSettingsButton);
ui.mobileSettingsButton.addEventListener('click', handleMobileSettingsButton);

document.addEventListener('pointerdown', function firstMobileTouch() {
    if (isMobileTouch()) requestMobilePresentation();
}, { once: true });

document.addEventListener('pointerdown', unlockMusic, { capture: true });
document.addEventListener('click', unlockMusic, { capture: true });
document.addEventListener('keydown', unlockMusic);
document.addEventListener('click', function(e) {
    if (!e.target || typeof e.target.closest !== 'function') return;
    var control = e.target.closest('button, [role="button"], .skin-item');
    if (!control || control.disabled || control.id === 'wall-hit-target') return;
    if (control.classList.contains('locked') || control.classList.contains('equipped')) return;
    music.playSfx('ui');
}, { capture: true });
ui.audioToggle.onclick = toggleAudio;
ui.musicToggle.onclick = toggleAudio;
ui.musicVolume.value = String(Math.round(music.getMusicVolume() * 100));
ui.sfxVolume.value = String(Math.round(music.getSfxVolume() * 100));
ui.touchSize.value = localStorage.getItem('pr_touch_size') || '60';
ui.touchOpacity.value = localStorage.getItem('pr_touch_opacity') || '70';
updateTouchButtonPreferences();
updateAudioControls();
ui.musicVolume.addEventListener('input', function() {
    music.setMusicVolume(parseInt(ui.musicVolume.value, 10) / 100);
});
ui.sfxVolume.addEventListener('input', function() {
    music.setSfxVolume(parseInt(ui.sfxVolume.value, 10) / 100);
});
ui.touchSize.addEventListener('input', updateTouchButtonPreferences);
ui.touchOpacity.addEventListener('input', updateTouchButtonPreferences);
document.getElementById('mobile-settings-controls-btn').onclick = openCommands;
document.getElementById('mobile-settings-resume-btn').onclick = closeMobileSettings;
document.getElementById('mobile-settings-restart-btn').onclick = startGame;
document.getElementById('mobile-settings-menu-btn').onclick = showMenu;
document.getElementById('mobile-settings-close-btn').onclick = closeMobileSettings;

ui.target.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    attemptWallHit(activeTimingWall());
});

document.getElementById('start-btn').onclick = function() {
    startGame();
};
document.getElementById('restart-btn').onclick = function() {
    startGame();
};
document.getElementById('menu-btn').onclick = showMenu;
document.getElementById('shop-btn').onclick = function() { showShop(false); };
document.getElementById('main-controls-btn').onclick = openCommands;
document.getElementById('gameover-shop-btn').onclick = function() { showShop(true); };
document.getElementById('resume-btn').onclick = resumeGame;
document.getElementById('pause-controls-btn').onclick = openCommands;
document.getElementById('pause-restart-btn').onclick = startGame;
document.getElementById('pause-menu-btn').onclick = showMenu;
document.getElementById('commands-close-btn').onclick = closeCommands;
document.getElementById('back-btn').onclick = function() {
    if (ui.shop._fromGameOver) {
        ui.shop.classList.add('hidden');
        ui.over.classList.remove('hidden');
    } else {
        showMenu();
    }
};
document.getElementById('buy-chest-btn').onclick = openChest;
document.getElementById('chest-close-btn').onclick = function() {
    ui.chestOverlay.classList.add('hidden');
    showShop(ui.shop._fromGameOver);
};

scaleCanvas();
showMenu();
updateOrientationState();

})();
