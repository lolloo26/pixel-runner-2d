(function () {

var canvas = document.getElementById('game-canvas');
var ctx = canvas.getContext('2d');
var chestCanvas = document.getElementById('chest-canvas');
var chestCtx = chestCanvas.getContext('2d');
chestCanvas.width = 64;
chestCanvas.height = 64;
chestCtx.imageSmoothingEnabled = false;

var SCALE = 4;
var W = 200;
var H = 112;
canvas.width = W;
canvas.height = H;
ctx.imageSmoothingEnabled = false;

var GROUND_Y = H - 16;
var GRAVITY = 0.35;
var MAX_FALL = 6;
var JUMP_FORCE = -4.8;
var JUMP_HOLD = -0.18;
var JUMP_HOLD_MAX = 12;

var BIOMES = [
    {
        name: 'GIUNGLA',
        sky: [6, 34, 6],
        ground: [10, 80, 10],
        groundAlt: [15, 100, 20],
        far: [8, 50, 8],
        mid: [15, 70, 15],
        accent: [74, 222, 128],
        obstacleColor: [30, 120, 30],
        flyColor: [20, 160, 60],
        wallColor: [50, 180, 50],
        coinColor: [255, 215, 0],
        particles: [40, 200, 40]
    },
    {
        name: 'VULCANO',
        sky: [34, 6, 6],
        ground: [80, 20, 10],
        groundAlt: [100, 30, 15],
        far: [50, 10, 8],
        mid: [70, 20, 15],
        accent: [248, 113, 113],
        obstacleColor: [120, 30, 20],
        flyColor: [200, 60, 20],
        wallColor: [220, 80, 30],
        coinColor: [255, 180, 0],
        particles: [255, 100, 20]
    },
    {
        name: 'GHIACCIAIO',
        sky: [6, 26, 40],
        ground: [20, 80, 100],
        groundAlt: [30, 100, 120],
        far: [10, 40, 60],
        mid: [20, 60, 80],
        accent: [34, 211, 238],
        obstacleColor: [40, 120, 160],
        flyColor: [60, 160, 200],
        wallColor: [80, 200, 240],
        coinColor: [200, 240, 255],
        particles: [100, 220, 255]
    },
    {
        name: 'DESERTO NEON',
        sky: [26, 6, 34],
        ground: [80, 30, 100],
        groundAlt: [100, 40, 120],
        far: [40, 10, 50],
        mid: [60, 20, 70],
        accent: [232, 121, 249],
        obstacleColor: [120, 50, 140],
        flyColor: [180, 80, 200],
        wallColor: [200, 100, 255],
        coinColor: [255, 215, 0],
        particles: [220, 120, 255]
    }
];

var SKINS = [
    { id: 'classic', name: 'CLASSICO', rarity: 'common', colors: { body: '#ffffff', eye: '#00ff88', outline: '#888888' } },
    { id: 'ninja', name: 'NINJA', rarity: 'common', colors: { body: '#2a2a3a', eye: '#ff0044', outline: '#111122' } },
    { id: 'robot', name: 'ROBOT', rarity: 'rare', colors: { body: '#aabbcc', eye: '#00ffff', outline: '#667788' } },
    { id: 'magma', name: 'MAGMA', rarity: 'rare', colors: { body: '#ff4422', eye: '#ffff00', outline: '#aa2200' } },
    { id: 'ice', name: 'GHIACCIO', rarity: 'epic', colors: { body: '#88ddff', eye: '#ffffff', outline: '#4488aa' } },
    { id: 'gold', name: 'DORATO', rarity: 'legendary', colors: { body: '#ffd700', eye: '#ff4400', outline: '#aa8800' } }
];

var RARITY_WEIGHTS = { common: 40, rare: 25, epic: 15, legendary: 5 };
var RARITY_LABELS = { common: 'COMUNE', rare: 'RARO', epic: 'EPICO', legendary: 'LEGGENDARIO' };
var RARITY_COLORS = { common: '#aaaaaa', rare: '#55aaff', epic: '#cc55ff', legendary: '#ffd700' };
var DUPE_REFUND = { common: 10, rare: 20, epic: 35, legendary: 50 };

var PLAYER_SPRITE = [
    [0,0,0,1,1,1,0,0,0],
    [0,0,1,1,1,1,1,0,0],
    [0,0,1,2,1,2,1,0,0],
    [0,0,1,1,1,1,1,0,0],
    [0,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,0,1,0],
    [0,0,0,1,1,1,0,0,0],
    [0,0,0,1,0,1,0,0,0],
    [0,0,1,1,0,1,1,0,0]
];

var PLAYER_CROUCH = [
    [0,0,1,1,1,1,1,0,0],
    [0,0,1,2,1,2,1,0,0],
    [0,1,1,1,1,1,1,1,0],
    [0,1,0,1,1,1,0,1,0],
    [0,0,1,1,0,1,1,0,0]
];

var COIN_SPRITE = [
    [0,1,1,1,0],
    [1,1,0,1,1],
    [1,0,1,0,1],
    [1,1,0,1,1],
    [0,1,1,1,0]
];

var COIN_ANIM = [
    [0,1,1,1,0],
    [0,1,0,1,0],
    [0,1,1,1,0],
    [0,1,0,1,0],
    [0,1,1,1,0]
];

var ui = {
    main: document.getElementById('main-menu'),
    game: document.getElementById('game-ui'),
    over: document.getElementById('game-over'),
    shop: document.getElementById('shop-menu'),
    chestOverlay: document.getElementById('chest-overlay'),
    score: document.getElementById('current-score'),
    coinCount: document.getElementById('coin-count'),
    biome: document.getElementById('biome-indicator'),
    prompt: document.getElementById('timing-prompt'),
    highScore: document.getElementById('main-highscore'),
    mainCoins: document.getElementById('main-coins'),
    shopCoins: document.getElementById('shop-coins'),
    skinList: document.getElementById('skin-selector'),
    finalScore: document.getElementById('final-score'),
    finalCoins: document.getElementById('final-coins'),
    newRecord: document.getElementById('new-record'),
    chestResult: document.getElementById('chest-result'),
    chestClose: document.getElementById('chest-close-btn')
};

var save = {
    coins: parseInt(localStorage.getItem('pr_coins')) || 0,
    highScore: parseInt(localStorage.getItem('pr_highscore')) || 0,
    skins: JSON.parse(localStorage.getItem('pr_skins')) || ['classic'],
    activeSkin: localStorage.getItem('pr_active_skin') || 'classic'
};

function persist() {
    localStorage.setItem('pr_coins', save.coins);
    localStorage.setItem('pr_highscore', save.highScore);
    localStorage.setItem('pr_skins', JSON.stringify(save.skins));
    localStorage.setItem('pr_active_skin', save.activeSkin);
}

var game = {
    running: false,
    score: 0,
    sessionCoins: 0,
    speed: 1.5,
    baseSpeed: 1.5,
    biomeIndex: 0,
    biomeTransition: 0,
    prevBiomeIndex: -1,
    frameCount: 0,
    lastObstacle: 0,
    lastCoin: 0,
    lastWall: 0,
    wallActive: false,
    screenShake: 0,
    flashAlpha: 0
};

var player = {
    x: 30,
    y: GROUND_Y - 9,
    w: 9,
    h: 9,
    vy: 0,
    grounded: true,
    crouching: false,
    jumpHeld: false,
    jumpTimer: 0,
    animFrame: 0,
    animTimer: 0
};

var keys = {};
var obstacles = [];
var coins = [];
var walls = [];
var particles = [];
var bgLayers = { far: [], mid: [], stars: [] };

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
    for (var i = 0; i < 20; i++) {
        bgLayers.stars.push({ x: rand(0, W), y: rand(0, GROUND_Y - 20), twinkle: rand(0, 6.28) });
    }
    for (var i = 0; i < 6; i++) {
        bgLayers.far.push({ x: i * 45, h: rand(20, 50), w: rand(30, 50) });
    }
    for (var i = 0; i < 8; i++) {
        bgLayers.mid.push({ x: i * 30, h: rand(10, 30), w: rand(15, 25), type: randInt(0, 2) });
    }
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
    return { 1: skinDef.colors.body, 2: skinDef.colors.eye };
}

function spawnObstacle() {
    var b = biome();
    var flying = Math.random() < 0.3;
    if (flying) {
        obstacles.push({
            x: W + 5,
            y: GROUND_Y - randInt(14, 24),
            w: randInt(4, 7),
            h: 3,
            flying: true,
            color: b.flyColor
        });
    } else {
        var tall = Math.random() < 0.3;
        obstacles.push({
            x: W + 5,
            y: GROUND_Y - (tall ? randInt(8, 12) : randInt(4, 7)),
            w: randInt(3, 5),
            h: tall ? randInt(8, 12) : randInt(4, 7),
            flying: false,
            color: b.obstacleColor
        });
    }
}

function spawnCoin() {
    coins.push({
        x: W + 5,
        y: GROUND_Y - randInt(10, 30),
        w: 5,
        h: 5,
        frame: 0,
        timer: 0
    });
}

function spawnWall() {
    if (game.wallActive) return;
    game.wallActive = true;
    var b = biome();
    walls.push({
        x: W + 10,
        w: 6,
        h: GROUND_Y,
        color: b.wallColor,
        active: true,
        windowStart: -1,
        windowDuration: 40,
        destroyed: false,
        missed: false,
        flashTimer: 0
    });
}

function spawnParticles(x, y, color, count) {
    for (var i = 0; i < count; i++) {
        particles.push({
            x: x + rand(-3, 3),
            y: y + rand(-3, 3),
            vx: rand(-2, 2),
            vy: rand(-3, 0),
            life: rand(15, 40),
            maxLife: 40,
            size: rand(1, 2.5),
            color: color
        });
    }
}

function spawnCoinParticles(x, y) {
    for (var i = 0; i < 6; i++) {
        particles.push({
            x: x, y: y,
            vx: rand(-1.5, 1.5),
            vy: rand(-2, -0.5),
            life: rand(10, 20),
            maxLife: 20,
            size: 1,
            color: [255, 215, 0]
        });
    }
}

function aabb(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function resetPlayer() {
    player.x = 30;
    player.y = GROUND_Y - 9;
    player.vy = 0;
    player.grounded = true;
    player.crouching = false;
    player.jumpHeld = false;
    player.jumpTimer = 0;
}

function startGame() {
    game.running = true;
    game.score = 0;
    game.sessionCoins = 0;
    game.speed = 1.5;
    game.baseSpeed = 1.5;
    game.biomeIndex = 0;
    game.prevBiomeIndex = -1;
    game.biomeTransition = 1;
    game.frameCount = 0;
    game.lastObstacle = 0;
    game.lastCoin = 0;
    game.lastWall = 0;
    game.wallActive = false;
    game.screenShake = 0;
    game.flashAlpha = 0;

    resetPlayer();
    obstacles = [];
    coins = [];
    walls = [];
    particles = [];
    initBgElements();

    ui.main.classList.add('hidden');
    ui.over.classList.add('hidden');
    ui.shop.classList.add('hidden');
    ui.game.classList.remove('hidden');
    ui.prompt.classList.add('hidden');
    ui.newRecord.classList.add('hidden');
    ui.biome.textContent = BIOMES[0].name;

    requestAnimationFrame(loop);
}

function gameOver() {
    game.running = false;

    var score = Math.floor(game.score);
    save.coins += game.sessionCoins;

    var isRecord = false;
    if (score > save.highScore) {
        save.highScore = score;
        isRecord = true;
    }
    persist();

    ui.game.classList.add('hidden');
    ui.prompt.classList.add('hidden');
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
    ui.shop.classList.add('hidden');
    ui.chestOverlay.classList.add('hidden');
    ui.main.classList.remove('hidden');
    ui.highScore.textContent = 'RECORD: ' + save.highScore;
    ui.mainCoins.textContent = 'MONETE: ' + save.coins;
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
        var skin = SKINS[i];
        var owned = save.skins.indexOf(skin.id) >= 0;
        var equipped = save.activeSkin === skin.id;

        var item = document.createElement('div');
        item.className = 'skin-item';
        if (equipped) item.className += ' equipped';
        else if (owned) item.className += ' unlocked';
        else item.className += ' locked';

        var raritySpan = document.createElement('span');
        raritySpan.className = 'skin-rarity rarity-' + skin.rarity;
        raritySpan.textContent = RARITY_LABELS[skin.rarity];
        item.appendChild(raritySpan);

        var preview = document.createElement('canvas');
        preview.width = 9;
        preview.height = 9;
        preview.style.width = '36px';
        preview.style.height = '36px';
        var pCtx = preview.getContext('2d');
        pCtx.imageSmoothingEnabled = false;
        drawSpriteOnCtx(pCtx, 0, 0, PLAYER_SPRITE, getSkinColors(skin), 1);
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
            chestCtx.fillRect(-12, -8, 24, 16);
            chestCtx.fillStyle = '#aa7700';
            chestCtx.fillRect(-12, -8, 24, 4);
            chestCtx.fillStyle = '#ffd700';
            chestCtx.fillRect(-2, -2, 4, 4);
            chestCtx.restore();
            requestAnimationFrame(animateChest);
        } else if (chestAnim.timer < 90) {
            var t = (chestAnim.timer - 60) / 30;
            chestCtx.save();
            chestCtx.translate(32, 32);

            chestCtx.fillStyle = '#d4a017';
            chestCtx.fillRect(-12, -8 + t * 4, 24, 16 - t * 4);
            chestCtx.fillStyle = '#aa7700';
            chestCtx.fillRect(-12, -8 - t * 8, 24, 4);

            var glow = Math.sin(chestAnim.timer * 0.3) * 0.3 + 0.7;
            chestCtx.fillStyle = 'rgba(255,215,0,' + glow + ')';
            chestCtx.fillRect(-8, -6, 16, 4);

            chestCtx.restore();
            requestAnimationFrame(animateChest);
        } else if (chestAnim.timer < 120) {
            chestCtx.save();
            chestCtx.translate(32, 20);
            var colors = getSkinColors(chestAnim.skin);
            drawSpriteOnCtx(chestCtx, -9, -9, PLAYER_SPRITE, colors, 2);
            chestCtx.restore();

            var sparkle = (chestAnim.timer - 90) / 30;
            for (var i = 0; i < 8; i++) {
                var angle = (i / 8) * Math.PI * 2 + chestAnim.timer * 0.1;
                var dist = 10 + sparkle * 15;
                chestCtx.fillStyle = RARITY_COLORS[chestAnim.skin.rarity];
                chestCtx.fillRect(32 + Math.cos(angle) * dist, 32 + Math.sin(angle) * dist, 2, 2);
            }

            requestAnimationFrame(animateChest);
        } else {
            chestCtx.save();
            chestCtx.translate(32, 20);
            var colors = getSkinColors(chestAnim.skin);
            drawSpriteOnCtx(chestCtx, -9, -9, PLAYER_SPRITE, colors, 2);
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
    var ph = player.crouching ? 5 : 9;

    if (keys['Space'] || keys['ArrowUp']) {
        if (player.grounded) {
            player.vy = JUMP_FORCE;
            player.grounded = false;
            player.jumpHeld = true;
            player.jumpTimer = 0;
        } else if (player.jumpHeld && player.jumpTimer < JUMP_HOLD_MAX) {
            player.vy += JUMP_HOLD;
            player.jumpTimer++;
        }
    } else {
        player.jumpHeld = false;
    }

    if (keys['ArrowDown']) {
        player.crouching = true;
        if (!player.grounded) {
            player.vy += 0.5;
        }
    } else {
        player.crouching = false;
    }

    if (!player.grounded) {
        player.vy += GRAVITY;
        if (player.vy > MAX_FALL) player.vy = MAX_FALL;
        player.y += player.vy;
    }

    var floor = GROUND_Y - ph;
    if (player.y >= floor) {
        player.y = floor;
        player.vy = 0;
        player.grounded = true;
    }

    player.animTimer++;
    if (player.animTimer > 6) {
        player.animTimer = 0;
        player.animFrame = (player.animFrame + 1) % 2;
    }
}

function updateObstacles() {
    game.lastObstacle++;
    var minGap = Math.max(40, 70 - game.speed * 5);
    if (game.lastObstacle > minGap + rand(0, 30)) {
        spawnObstacle();
        game.lastObstacle = 0;
    }

    for (var i = obstacles.length - 1; i >= 0; i--) {
        var o = obstacles[i];
        o.x -= game.speed;
        if (o.x + o.w < 0) {
            obstacles.splice(i, 1);
            continue;
        }

        var ph = player.crouching ? 5 : 9;
        var py = player.crouching ? GROUND_Y - 5 : player.y;
        if (aabb(player.x + 1, py + 1, player.w - 2, ph - 2, o.x, o.y, o.w, o.h)) {
            game.screenShake = 8;
            gameOver();
            return;
        }
    }
}

function updateCoins() {
    game.lastCoin++;
    if (game.lastCoin > 50 + rand(0, 40)) {
        spawnCoin();
        game.lastCoin = 0;
    }

    for (var i = coins.length - 1; i >= 0; i--) {
        var c = coins[i];
        c.x -= game.speed;
        c.timer++;
        if (c.timer > 10) { c.timer = 0; c.frame = (c.frame + 1) % 2; }

        if (c.x + c.w < 0) {
            coins.splice(i, 1);
            continue;
        }

        var ph = player.crouching ? 5 : 9;
        var py = player.crouching ? GROUND_Y - 5 : player.y;
        if (aabb(player.x, py, player.w, ph, c.x, c.y, c.w, c.h)) {
            game.sessionCoins++;
            spawnCoinParticles(c.x + 2, c.y + 2);
            coins.splice(i, 1);
        }
    }
}

function updateWalls() {
    game.lastWall++;
    var wallInterval = Math.max(200, 350 - game.speed * 10);
    if (game.lastWall > wallInterval && !game.wallActive && Math.floor(game.score) > 30) {
        spawnWall();
        game.lastWall = 0;
    }

    for (var i = walls.length - 1; i >= 0; i--) {
        var wall = walls[i];
        wall.x -= game.speed;

        if (wall.destroyed) {
            wall.flashTimer++;
            if (wall.flashTimer > 20) {
                walls.splice(i, 1);
                game.wallActive = false;
            }
            continue;
        }

        var dist = wall.x - player.x;

        if (dist < 40 && dist > -5 && wall.windowStart < 0) {
            wall.windowStart = 0;
            ui.prompt.classList.remove('hidden');
        }

        if (wall.windowStart >= 0) {
            wall.windowStart++;
            if (wall.windowStart > wall.windowDuration) {
                wall.missed = true;
            }
        }

        if (wall.missed) {
            ui.prompt.classList.add('hidden');
            game.screenShake = 10;
            gameOver();
            return;
        }

        if (wall.x + wall.w < player.x) {
            ui.prompt.classList.add('hidden');
            game.screenShake = 10;
            gameOver();
            return;
        }

        var ph = player.crouching ? 5 : 9;
        var py = player.crouching ? GROUND_Y - 5 : player.y;
        if (!wall.destroyed && aabb(player.x + 1, py, player.w - 2, ph, wall.x, 0, wall.w, GROUND_Y)) {
            if (wall.windowStart >= 0 && wall.windowStart <= wall.windowDuration && keys['KeyE']) {
                wall.destroyed = true;
                wall.flashTimer = 0;
                game.score += 25;
                game.sessionCoins += 5;
                game.flashAlpha = 0.6;
                game.screenShake = 5;
                ui.prompt.classList.add('hidden');
                spawnParticles(wall.x + wall.w / 2, GROUND_Y / 2, biome().particles, 30);
                spawnParticles(wall.x + wall.w / 2, GROUND_Y / 3, biome().wallColor, 20);
            } else {
                ui.prompt.classList.add('hidden');
                game.screenShake = 10;
                gameOver();
                return;
            }
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

function updateBiome() {
    var scoreVal = Math.floor(game.score);
    var newBiome = Math.floor(scoreVal / 500) % BIOMES.length;
    if (newBiome !== game.biomeIndex) {
        game.prevBiomeIndex = game.biomeIndex;
        game.biomeIndex = newBiome;
        game.biomeTransition = 0;
        game.baseSpeed += 0.15;
        game.speed = game.baseSpeed;
        ui.biome.textContent = BIOMES[game.biomeIndex].name;
    }

    if (game.biomeTransition < 1) {
        game.biomeTransition = Math.min(1, game.biomeTransition + 0.008);
    }
}

function update() {
    game.frameCount++;
    game.score += game.speed * 0.05;

    updateBiome();
    updatePlayer();
    if (!game.running) return;
    updateObstacles();
    if (!game.running) return;
    updateCoins();
    updateWalls();
    if (!game.running) return;
    updateParticles();

    if (game.screenShake > 0) game.screenShake -= 0.5;
    if (game.flashAlpha > 0) game.flashAlpha -= 0.03;

    ui.score.textContent = Math.floor(game.score);
    ui.coinCount.textContent = 'x' + game.sessionCoins;
}

function drawBackground() {
    var sky = transitionedColor('sky');
    ctx.fillStyle = rgb(sky);
    ctx.fillRect(0, 0, W, H);

    for (var i = 0; i < bgLayers.stars.length; i++) {
        var s = bgLayers.stars[i];
        var twinkle = Math.sin(game.frameCount * 0.05 + s.twinkle) * 0.5 + 0.5;
        ctx.fillStyle = rgba([255, 255, 255], twinkle * 0.6);
        ctx.fillRect(Math.floor(s.x), Math.floor(s.y), 1, 1);
    }

    var farColor = transitionedColor('far');
    ctx.fillStyle = rgb(farColor);
    var farOffset = (game.frameCount * game.speed * 0.15) % W;
    for (var i = 0; i < bgLayers.far.length; i++) {
        var m = bgLayers.far[i];
        var mx = ((m.x - farOffset) % (W + 60)) - 30;
        if (mx < -60) mx += W + 60;
        drawMountain(mx, GROUND_Y, m.w, m.h, farColor);
    }

    var midColor = transitionedColor('mid');
    var midOffset = (game.frameCount * game.speed * 0.35) % W;
    for (var i = 0; i < bgLayers.mid.length; i++) {
        var t = bgLayers.mid[i];
        var tx = ((t.x - midOffset) % (W + 40)) - 20;
        if (tx < -30) tx += W + 40;
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
}

function drawTree(x, baseY, h, color) {
    ctx.fillStyle = rgb(color);
    ctx.fillRect(Math.floor(x + 2), baseY - h, 2, h);
    ctx.fillRect(Math.floor(x), baseY - h, 6, 4);
    ctx.fillRect(Math.floor(x + 1), baseY - h - 3, 4, 3);
}

function drawPillar(x, baseY, h, color) {
    ctx.fillStyle = rgb(color);
    ctx.fillRect(Math.floor(x), baseY - h, 4, h);
    ctx.fillRect(Math.floor(x - 1), baseY - h, 6, 2);
}

function drawRock(x, baseY, h, color) {
    ctx.fillStyle = rgb(color);
    var rh = Math.min(h, 8);
    ctx.fillRect(Math.floor(x), baseY - rh, 6, rh);
    ctx.fillRect(Math.floor(x + 1), baseY - rh - 2, 4, 2);
}

function drawGround() {
    var gc = transitionedColor('ground');
    var gc2 = transitionedColor('groundAlt');
    ctx.fillStyle = rgb(gc);
    ctx.fillRect(0, GROUND_Y, W, H - GROUND_Y);

    var groundOffset = Math.floor(game.frameCount * game.speed) % 4;
    ctx.fillStyle = rgb(gc2);
    for (var x = -groundOffset; x < W; x += 4) {
        ctx.fillRect(x, GROUND_Y, 2, 1);
        ctx.fillRect(x + 2, GROUND_Y + 2, 2, 1);
    }

    var accent = transitionedColor('accent');
    ctx.fillStyle = rgba(accent, 0.3);
    ctx.fillRect(0, GROUND_Y, W, 1);
}

function drawPlayer() {
    var skinDef = SKINS.find(function(s) { return s.id === save.activeSkin; }) || SKINS[0];
    var colors = getSkinColors(skinDef);
    var sprite = player.crouching ? PLAYER_CROUCH : PLAYER_SPRITE;
    var py = player.crouching ? GROUND_Y - 5 : player.y;

    if (player.animFrame === 1 && player.grounded && !player.crouching) {
        var runSprite = [];
        for (var r = 0; r < PLAYER_SPRITE.length; r++) {
            runSprite.push(PLAYER_SPRITE[r].slice());
        }
        runSprite[7] = [0,0,1,0,0,0,1,0,0];
        runSprite[8] = [0,1,1,0,0,0,0,1,0];
        drawSprite(player.x, py, runSprite, colors);
    } else {
        drawSprite(player.x, py, sprite, colors);
    }
}

function drawObstacles() {
    for (var i = 0; i < obstacles.length; i++) {
        var o = obstacles[i];
        var c = o.color;
        ctx.fillStyle = rgb(c);

        if (o.flying) {
            ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, o.h);
            ctx.fillStyle = rgba(c, 0.5);
            ctx.fillRect(Math.floor(o.x - 1), Math.floor(o.y + 1), 1, 1);
            ctx.fillRect(Math.floor(o.x + o.w), Math.floor(o.y + 1), 1, 1);
        } else {
            ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, o.h);
            var highlight = lerpColor(c, [255, 255, 255], 0.2);
            ctx.fillStyle = rgb(highlight);
            ctx.fillRect(Math.floor(o.x), Math.floor(o.y), o.w, 1);
        }
    }
}

function drawCoins() {
    for (var i = 0; i < coins.length; i++) {
        var c = coins[i];
        var b = biome();
        var sprite = c.frame === 0 ? COIN_SPRITE : COIN_ANIM;
        var ccolor = b.coinColor || [255, 215, 0];
        drawSprite(c.x, c.y, sprite, { 1: rgb(ccolor) });
    }
}

function drawWalls() {
    for (var i = 0; i < walls.length; i++) {
        var wall = walls[i];
        if (wall.destroyed) {
            continue;
        }

        var c = wall.color;
        ctx.fillStyle = rgb(c);
        ctx.fillRect(Math.floor(wall.x), 0, wall.w, GROUND_Y);

        var crackColor = lerpColor(c, [0, 0, 0], 0.4);
        ctx.fillStyle = rgb(crackColor);
        for (var cy = 5; cy < GROUND_Y; cy += 12) {
            ctx.fillRect(Math.floor(wall.x + 1), cy, 2, 1);
            ctx.fillRect(Math.floor(wall.x + 3), cy + 4, 2, 1);
        }

        if (wall.windowStart >= 0 && wall.windowStart <= wall.windowDuration) {
            var pulse = Math.sin(game.frameCount * 0.3) * 0.3 + 0.7;
            ctx.fillStyle = rgba([255, 255, 100], pulse * 0.5);
            ctx.fillRect(Math.floor(wall.x - 1), 0, wall.w + 2, GROUND_Y);

            var progress = wall.windowStart / wall.windowDuration;
            var barW = wall.w;
            var barH = 2;
            var barY = GROUND_Y - 4;
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(Math.floor(wall.x), barY, barW, barH);
            var r = Math.floor(255 * progress);
            var g = Math.floor(255 * (1 - progress));
            ctx.fillStyle = 'rgb(' + r + ',' + g + ',0)';
            ctx.fillRect(Math.floor(wall.x), barY, Math.floor(barW * (1 - progress)), barH);
        }
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

function loop(time) {
    if (!game.running) return;

    var dt = time - lastTime;
    lastTime = time;

    if (dt > 100) dt = 16;

    update();
    if (!game.running) return;
    draw();

    requestAnimationFrame(loop);
}

window.addEventListener('keydown', function(e) {
    if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'KeyE') {
        e.preventDefault();
    }
    keys[e.code] = true;
});

window.addEventListener('keyup', function(e) {
    keys[e.code] = false;
});

document.getElementById('start-btn').onclick = function() {
    lastTime = performance.now();
    startGame();
};
document.getElementById('restart-btn').onclick = function() {
    lastTime = performance.now();
    startGame();
};
document.getElementById('menu-btn').onclick = showMenu;
document.getElementById('shop-btn').onclick = function() { showShop(false); };
document.getElementById('gameover-shop-btn').onclick = function() { showShop(true); };
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

showMenu();

})();
