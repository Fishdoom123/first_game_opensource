const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const gameOverScreen = document.getElementById('gameover');

// Настройка размера холста
function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Управление
const keys = {};
const mouse = { x: 0, y: 0, isDown: false };

window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyM') {
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu) {
            const isVisible = mainMenu.style.display !== 'none';
            showMainMenu(!isVisible);
        }
        return;
    }

    if (isGamePaused) return;
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    if (isGamePaused) return;
    keys[e.code] = false;
});
window.addEventListener('mousemove', (e) => {
    if (isGamePaused) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', (e) => {
    if (e.button !== 0 || isGamePaused) return;
    mouse.isDown = true;
});
window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    mouse.isDown = false;
});

// Звуковая система на файлах (music-1)
const soundFiles = {
    shot: 'music-1/pistol-vistrel.mp3',
    casing: 'music-1/gilzy-padenie.mp3',
    reload: 'music-1/Pistol-loaded-to-fire.mp3',
    bg1: 'music-1/background-music-1.mp3',
    bg2: 'music-1/background-music-2.mp3'
};

const sounds = {};
let backgroundMusicStarted = false;

const audioSettings = {
    global: 1.0,
    shot: 0.35,
    casing: 0.8,
    reload: 0.8,
    hit: 0.85,
    death: 0.85,
    enemyAttack: 0.75,
    music: 0.5
};

function applyVolumeSettings(name, baseVolume) {
    let factor = 1;
    if (name === 'shot') factor = audioSettings.shot;
    else if (name === 'casing') factor = audioSettings.casing;
    else if (name === 'reload') factor = audioSettings.reload;
    else if (name === 'hit') factor = audioSettings.hit;
    else if (name === 'death') factor = audioSettings.death;
    else if (name === 'enemyAttack') factor = audioSettings.enemyAttack;
    else if (name.startsWith('bg')) factor = audioSettings.music;
    return baseVolume * factor * audioSettings.global;
}

function loadSounds() {
    for (const k in soundFiles) {
        sounds[k] = new Audio(soundFiles[k]);
        sounds[k].preload = 'auto';
        sounds[k].volume = (k.startsWith('bg')) ? 0.35 : 1;
        sounds[k].load();
    }
    sounds.bg1.loop = false;
    sounds.bg2.loop = false;
    sounds.bg1.onended = () => { if (!isDead) sounds.bg2.play().catch(() => {}); };
    sounds.bg2.onended = () => { if (!isDead) sounds.bg1.play().catch(() => {}); };
}

function startBackgroundMusic() {
    if (backgroundMusicStarted) return;
    backgroundMusicStarted = true;
    if (!sounds.bg1) loadSounds();
    sounds.bg1.volume = applyVolumeSettings('bg1', 1);
    sounds.bg2.volume = applyVolumeSettings('bg2', 1);
    sounds.bg1.play().catch(() => {
        // можно позже попытаться снова при событии пользователя
        document.body.addEventListener('click', () => {
            sounds.bg1.play().catch(() => {});
        }, { once: true });
    });
}

let isGamePaused = true;
let isGameStarted = false;

function createMainMenu() {
    if (document.getElementById('mainMenu')) return;

    const menu = document.createElement('div');
    menu.id = 'mainMenu';
    menu.style.position = 'absolute';
    menu.style.top = '50%';
    menu.style.left = '50%';
    menu.style.transform = 'translate(-50%, -50%)';
    menu.style.width = '320px';
    menu.style.padding = '18px';
    menu.style.background = 'rgba(0, 0, 0, 0.9)';
    menu.style.border = '2px solid #00ffff';
    menu.style.borderRadius = '10px';
    menu.style.color = '#fff';
    menu.style.zIndex = 999;
    menu.style.fontFamily = 'Courier New, monospace';
    menu.style.textAlign = 'center';

    const title = document.createElement('h1');
    title.id = 'menuTitle';
    title.innerText = 'NEON SHOOTER';
    title.style.margin = '0 0 10px';
    title.style.fontSize = '32px';
    title.style.color = '#00ffff';
    title.style.textShadow = '0 0 20px #00ffff, 0 0 25px #ff00ff, 0 0 36px #ff00ff';
    title.style.letterSpacing = '0.12em';
    title.style.fontFamily = 'Orbitron, Courier New, monospace';
    title.style.position = 'relative';
    title.style.display = 'inline-block';
    menu.appendChild(title);

    const info = document.createElement('div');
    info.innerText = 'WASD + mouse: двигайся и стреляй. R: перезарядка. M: пауза меню';
    info.style.marginBottom = '12px';
    info.style.fontSize = '12px';
    info.style.color = '#ccc';
    menu.appendChild(info);

    const startBtn = document.createElement('button');
    startBtn.innerText = isGameStarted ? 'Начать заново' : 'Начать игру';
    startBtn.style.width = '80%';
    startBtn.style.margin = '6px 0';
    startBtn.style.fontSize = '16px';
    startBtn.style.cursor = 'pointer';
    startBtn.style.border = '1px solid #00ffea';
    startBtn.style.background = 'linear-gradient(145deg, #0f1f4a, #001644)';
    startBtn.style.color = '#00ffff';
    startBtn.onmouseover = () => { startBtn.style.background = 'linear-gradient(145deg, #184c8a, #002f96)'; };
    startBtn.onmouseout = () => { startBtn.style.background = 'linear-gradient(145deg, #0f1f4a, #001644)'; };
    startBtn.onclick = () => {
        isGameStarted = true;
        showMainMenu(false);
        initGame();
        isGamePaused = false;
    };
    menu.appendChild(startBtn);

    const musicLabel = document.createElement('div');
    musicLabel.innerText = 'Громкость музыки';
    musicLabel.style.margin = '12px 0 4px';
    menu.appendChild(musicLabel);

    const musicSlider = document.createElement('input');
    musicSlider.type = 'range';
    musicSlider.min = '0';
    musicSlider.max = '100';
    musicSlider.value = `${Math.round(audioSettings.music * 100)}`;
    musicSlider.style.width = '90%';
    musicSlider.oninput = () => {
        audioSettings.music = musicSlider.value / 100;
        if (sounds.bg1) sounds.bg1.volume = applyVolumeSettings('bg1', 1);
        if (sounds.bg2) sounds.bg2.volume = applyVolumeSettings('bg2', 1);
    };
    menu.appendChild(musicSlider);

    const sfxLabel = document.createElement('div');
    sfxLabel.innerText = 'Громкость эффектов';
    sfxLabel.style.margin = '10px 0 4px';
    menu.appendChild(sfxLabel);

    const sfxSlider = document.createElement('input');
    sfxSlider.type = 'range';
    sfxSlider.min = '0';
    sfxSlider.max = '100';
    sfxSlider.value = `${Math.round(audioSettings.global * 100)}`;
    sfxSlider.style.width = '90%';
    sfxSlider.oninput = () => {
        audioSettings.global = sfxSlider.value / 100;
    };
    menu.appendChild(sfxSlider);

    document.body.appendChild(menu);
}

function showMainMenu(show) {
    const mainMenu = document.getElementById('mainMenu');
    if (!mainMenu) return;
    mainMenu.style.display = show ? 'block' : 'none';
    isGamePaused = show;
    if (show) {
        gameOverScreen.style.display = 'none';
        mouse.isDown = false;
        for (let k in keys) keys[k] = false;
    }
}

function updateMenuTextEffect() {
    const title = document.getElementById('menuTitle');
    if (!title || !isGamePaused) return;
    const now = Date.now();
    const beat = 1 + Math.sin(now / 200) * 0.06;
    const offset = Math.sin(now / 110) * 2;
    const hue = 180 + Math.sin(now / 300) * 40;
    title.style.transform = `translateX(${offset}px) scale(${beat})`;
    title.style.color = `hsl(${hue}, 100%, 64%)`;
    title.style.textShadow = `0 0 24px hsla(${hue}, 100%, 70%, 0.9), 0 0 36px hsla(${hue+30}, 100%, 60%, 0.8), 0 0 42px hsla(${hue+40}, 100%, 55%, 0.6)`;
}

function getVolumeByDistance(x, y) {
    if (!player) return 1;
    const d = Math.hypot(player.x - x, player.y - y);
    const max = 900;
    return Math.max(0.12, Math.min(1, 1 - d / max));
}

function circleRectCollision(cx, cy, cr, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - closestX;
    const dy = cy - closestY;
    return (dx * dx + dy * dy) < (cr * cr);
}

function rectRectCollision(ax, ay, aw, ah, bx, by, bw, bh) {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function playSound(name, x = null, y = null) {
    if (!sounds[name]) return;
    const distanceVolume = (x != null && y != null) ? getVolumeByDistance(x, y) : 1;
    const audio = sounds[name].cloneNode();
    const typeBaseVolume = name.startsWith('bg') ? 1 : 0.9;
    audio.volume = Math.min(1, distanceVolume * typeBaseVolume * applyVolumeSettings(name, 1));
    audio.play().catch(() => {});
}

function playSpatialSound(type, x, y) {
    if (type === 'shot') {
        playSound('shot', x, y);
    } else if (type === 'casing') {
        playSound('casing', x, y);
    } else if (type === 'reload') {
        playSound('reload', x, y);
    } else if (type === 'hit') {
        playSound('hit', x, y);
    } else if (type === 'death') {
        playSound('death', x, y);
    } else if (type === 'enemyAttack') {
        playSound('hit', x, y);
    }
}

// Игровой мир
let worldWidth = 3000;
let worldHeight = 3000;
const playerViewHorizon = 800; // область вокруг игрока в которой может видеть враг

// Камера
const camera = { x: 0, y: 0 };

// Звук выстрелов для ИИ
let lastShotEvent = { x: 0, y: 0, time: 0 };

// Игровые переменные
let player, bullets, enemies, score, isDead, enemySpawnTimer;
let bloodStains = []; // Динамический объект: кровь
let casings = [];     // Динамический объект: гильзы
let mapObjects = [];  // Накопленные объекты карты (ящики, бочки, колонны)
let healthPacks = []; // Аптечки для восстановления здоровья
let currentRoom = 0;  // Текущая комната
let rooms = [];       // Массив комнат

// Определение комнат
rooms.push({
    name: 'house',
    width: 800,
    height: 600,
    walls: [
        // Стены дома
        { x: 0, y: 0, width: 800, height: 20 }, // Верхняя стена
        { x: 0, y: 0, width: 20, height: 600 }, // Левая стена
        { x: 780, y: 0, width: 20, height: 600 }, // Правая стена
        { x: 0, y: 580, width: 800, height: 20 }, // Нижняя стена
        // Внутренние стены
        { x: 200, y: 200, width: 400, height: 20 }, // Горизонтальная стена
        { x: 400, y: 200, width: 20, height: 200 } // Вертикальная стена
    ],
    doors: [
        // Двери (пока без логики перехода)
    ],
    enemySpawns: [
        { x: 100, y: 100, patrolRoute: [{ x: 100, y: 100 }, { x: 150, y: 100 }, { x: 150, y: 150 }, { x: 100, y: 150 }] },
        { x: 700, y: 500, patrolRoute: [{ x: 700, y: 500 }, { x: 650, y: 500 }, { x: 650, y: 450 }, { x: 700, y: 450 }] },
        { x: 500, y: 300, patrolRoute: [{ x: 500, y: 300 }, { x: 550, y: 300 }, { x: 550, y: 350 }, { x: 500, y: 350 }] }
    ],
    objects: [
        { x: 300, y: 300, width: 20, height: 20, type: 'crate' },
        { x: 600, y: 400, width: 20, height: 20, type: 'barrel' }
    ]
});

function initGame() {
    const room = rooms[currentRoom];
    worldWidth = room.width;
    worldHeight = room.height;
    player = {
        x: worldWidth / 2,
        y: worldHeight / 2,
        radius: 12,
        speed: 5,
        angle: 0,
        health: 140,
        maxHealth: 140,
        damageCooldown: 0,
        ammo: 12,
        maxAmmo: 12,
        reloading: false,
        reloadTimer: 0,
        walkCycle: 0
    };
    bullets = [];
    enemies = [];
    bloodStains = [];
    casings = [];
    mapObjects = [];
    healthPacks = [];
    score = 0;
    isDead = false;
    enemySpawnTimer = 0;

    // Спавн объектов из комнаты
    room.objects.forEach(obj => {
        mapObjects.push({
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            type: obj.type,
            size: obj.width, // Предполагаем квадрат
            sway: 0
        });
    });

    // Спавн врагов из комнаты
    room.enemySpawns.forEach(spawn => {
        enemies.push({
            x: spawn.x,
            y: spawn.y,
            radius: 12,
            speed: 1.8 + Math.random() * 1.4,
            baseSpeed: 1.8 + Math.random() * 1.4,
            health: 60 + Math.floor(Math.random() * 50),
            maxHealth: 60 + Math.floor(Math.random() * 50),
            state: 'patrol',
            patrolRoute: spawn.patrolRoute,
            patrolIndex: 0,
            targetX: spawn.patrolRoute[0].x,
            targetY: spawn.patrolRoute[0].y,
            lastSeenPlayerX: null,
            lastSeenPlayerY: null,
            agroTimer: 0,
            retreatTimer: 0,
            avoidanceX: 0,
            avoidanceY: 0,
            walkCycle: 0
        });
    });

    startBackgroundMusic();

    for (let i = 0; i < 32; i++) {
        const type = ['crate', 'barrel', 'pillar'][Math.floor(Math.random() * 3)];
        mapObjects.push({
            x: 120 + Math.random() * (worldWidth - 240),
            y: 120 + Math.random() * (worldHeight - 240),
            type,
            size: type === 'pillar' ? 28 : (type === 'barrel' ? 18 : 26)
        });
    }

    // Спавн аптечек
    for (let i = 0; i < 8; i++) {
        healthPacks.push({
            x: 100 + Math.random() * (worldWidth - 200),
            y: 100 + Math.random() * (worldHeight - 200),
            radius: 8,
            healAmount: 30
        });
    }

    scoreElement.innerText = score;
    gameOverScreen.style.display = 'none';
}

function spawnEnemy() {
    let x, y;
    if (Math.random() < 0.5) {
        x = Math.random() < 0.5 ? -60 : worldWidth + 60;
        y = Math.random() * worldHeight;
    } else {
        x = Math.random() * worldWidth;
        y = Math.random() < 0.5 ? -60 : worldHeight + 60;
    }
    let patrolCenterX = Math.min(worldWidth - 100, Math.max(100, Math.random() * worldWidth));
    let patrolCenterY = Math.min(worldHeight - 100, Math.max(100, Math.random() * worldHeight));
    const route = [];
    for (let i = 0; i < 4; i++) {
        route.push({
            x: patrolCenterX + (Math.random() - 0.5) * 240,
            y: patrolCenterY + (Math.random() - 0.5) * 240
        });
    }
    enemies.push({
        x: x,
        y: y,
        radius: 12,
        speed: 1.8 + Math.random() * 1.4,
        baseSpeed: 1.8 + Math.random() * 1.4,
        health: 60 + Math.floor(Math.random() * 50) + waveNumber * 10, // Здоровье увеличивается с волной
        maxHealth: 60 + Math.floor(Math.random() * 50) + waveNumber * 10,
        state: 'patrol',
        patrolRoute: route,
        patrolIndex: 0,
        alertTimer: 0,
        attackCooldown: 0
    });
}

let lastShootTime = 0;

function update() {
    const room = rooms[currentRoom];
    if (isDead) {
        if (keys['KeyR']) initGame();
        return;
    }

    // Движение игрока
    let dx = 0;
    let dy = 0;
    if (keys['KeyW']) dy -= 1;
    if (keys['KeyS']) dy += 1;
    if (keys['KeyA']) dx -= 1;
    if (keys['KeyD']) dx += 1;

    if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
    }

    player.x += dx * player.speed;
    player.y += dy * player.speed;

    // Анимация ходьбы
    if (dx !== 0 || dy !== 0) {
        player.walkCycle = (player.walkCycle + 1) % 20;
    } else {
        player.walkCycle = 0;
    }

    // Границы мира
    const prevPlayerX = player.x - dx * player.speed;
    const prevPlayerY = player.y - dy * player.speed;
    player.x = Math.max(player.radius, Math.min(worldWidth - player.radius, player.x));
    player.y = Math.max(player.radius, Math.min(worldHeight - player.radius, player.y));

    // Физика: блокирование персонажа объектами
    for (const obj of mapObjects) {
        const objX = obj.x - obj.size / 2;
        const objY = obj.y - obj.size / 2;
        if (circleRectCollision(player.x, player.y, player.radius + 1, objX, objY, obj.size, obj.size)) {
            player.x = prevPlayerX;
            player.y = prevPlayerY;
            break;
        }
    }

    // Физика: блокирование персонажа стенами
    for (const wall of room.walls) {
        if (circleRectCollision(player.x, player.y, player.radius + 1, wall.x, wall.y, wall.width, wall.height)) {
            player.x = prevPlayerX;
            player.y = prevPlayerY;
            break;
        }
    }

    // Подбор аптечек
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        const pack = healthPacks[i];
        const dist = Math.hypot(player.x - pack.x, player.y - pack.y);
        if (dist < player.radius + pack.radius) {
            player.health = Math.min(player.maxHealth, player.health + pack.healAmount);
            healthPacks.splice(i, 1);
        }
    }

    // Камера центрируется на игроке в пределах мира
    camera.x = Math.max(canvas.width / 2, Math.min(worldWidth - canvas.width / 2, player.x));
    camera.y = Math.max(canvas.height / 2, Math.min(worldHeight - canvas.height / 2, player.y));

    // Прицеливание (по мировым координатам мыши)
    const mouseWorldX = camera.x - canvas.width / 2 + mouse.x;
    const mouseWorldY = camera.y - canvas.height / 2 + mouse.y;
    player.angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);

    // Перезарядка (R): работает, если не мёртв и если нет полного боезапаса
    if (!player.reloading && keys['KeyR'] && player.ammo < player.maxAmmo) {
        player.reloading = true;
        player.reloadTimer = 65;
        playSpatialSound('reload', player.x, player.y);
    }

    if (player.reloading) {
        player.reloadTimer = Math.max(0, player.reloadTimer - 1);
        if (player.reloadTimer === 0) {
            player.reloading = false;
            player.ammo = player.maxAmmo;
        }
    }

    // Стрельба
    const now = Date.now();
    if (mouse.isDown && now - lastShootTime > 150 && !player.reloading && player.ammo > 0) {
        player.ammo -= 1;

        // Пуля
        bullets.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(player.angle) * 18,
            vy: Math.sin(player.angle) * 18,
            radius: 3,
            trail: []
        });
        
        // Вылет гильзы (вправо и назад от направления пушки)
        casings.push({
            x: player.x,
            y: player.y,
            vx: Math.cos(player.angle - Math.PI/2) * (3 + Math.random() * 2),
            vy: Math.sin(player.angle - Math.PI/2) * (3 + Math.random() * 2),
            life: 20
        });

        playSpatialSound('shot', player.x, player.y);
        playSpatialSound('casing', player.x, player.y);
        lastShotEvent = { x: player.x, y: player.y, time: now };
        lastShootTime = now;
    }

    // Обновление гильз
    for (let c of casings) {
        if (c.life > 0) {
            c.x += c.vx;
            c.y += c.vy;
            c.vx *= 0.8; // Замедление трением о пол
            c.vy *= 0.8;
            c.life--;
        }
    }

    // Обновление пуль
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // След пули
        b.trail.push({x: b.x, y: b.y});
        if (b.trail.length > 5) b.trail.shift();

        let removed = false;
        for (const obj of mapObjects) {
            const objX = obj.x - obj.size / 2;
            const objY = obj.y - obj.size / 2;
            if (circleRectCollision(b.x, b.y, b.radius, objX, objY, obj.size, obj.size)) {
                bullets.splice(i, 1);
                removed = true;
                break;
            }
        }

        if (removed) continue;

        // Проверка столкновения со стенами
        for (const wall of room.walls) {
            if (circleRectCollision(b.x, b.y, b.radius, wall.x, wall.y, wall.width, wall.height)) {
                bullets.splice(i, 1);
                removed = true;
                break;
            }
        }

        if (removed) continue;
        if (b.x < 0 || b.x > worldWidth || b.y < 0 || b.y > worldHeight) {
            bullets.splice(i, 1);
        }
    }

    // Обновление врагов с патрульным ИИ и агро
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];

        const distToPlayer = Math.hypot(player.x - e.x, player.y - e.y);
        const toPlayerAngle = Math.atan2(player.y - e.y, player.x - e.x);
        const playerFacingAngle = player.angle;
        const angleDelta = Math.abs(((toPlayerAngle - playerFacingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const canSeePlayer = distToPlayer < 300 && angleDelta < Math.PI * 0.68;
        const shotHeard = (Date.now() - lastShotEvent.time < 1400) &&
                          (Math.hypot(lastShotEvent.x - e.x, lastShotEvent.y - e.y) < 360);

        if (canSeePlayer || shotHeard) {
            e.state = 'chase';
            e.alertTimer = 160;
            e.lastSeen = { x: player.x, y: player.y };
        } else if (e.alertTimer > 0) {
            e.alertTimer -= 1;
            if (e.alertTimer <= 0) {
                e.state = 'patrol';
            }
        }

        // Если здоровье низкое, отступать
        if (e.health < e.maxHealth * 0.3 && e.state === 'chase') {
            e.state = 'retreat';
            e.alertTimer = 120;
        }

        // Отталкивание от соседей
        let avoidX = 0;
        let avoidY = 0;
        for (let k = 0; k < enemies.length; k++) {
            if (k === i) continue;
            const other = enemies[k];
            const d = Math.hypot(other.x - e.x, other.y - e.y);
            if (d > 0 && d < 45) {
                avoidX -= (other.x - e.x) / d;
                avoidY -= (other.y - e.y) / d;
            }
        }

        let moveAngle;
        if (e.state === 'patrol') {
            let target = e.patrolRoute[e.patrolIndex];
            let distToPoint = Math.hypot(target.x - e.x, target.y - e.y);
            if (distToPoint < 16) {
                e.patrolIndex = (e.patrolIndex + 1) % e.patrolRoute.length;
                target = e.patrolRoute[e.patrolIndex];
                distToPoint = Math.hypot(target.x - e.x, target.y - e.y);
            }
            moveAngle = Math.atan2(target.y - e.y, target.x - e.x);
            e.speed = e.baseSpeed * 0.85;
        } else if (e.state === 'retreat') {
            // Отступать от игрока
            moveAngle = Math.atan2(e.y - player.y, e.x - player.x);
            e.speed = e.baseSpeed * 1.1;
            e.alertTimer -= 1;
            if (e.alertTimer <= 0 || distToPlayer > 300) {
                e.state = 'patrol';
            }
        } else {
            let targetX, targetY;
            if (canSeePlayer) {
                targetX = player.x;
                targetY = player.y;
                e.lastSeen = { x: player.x, y: player.y };
            } else if (e.lastSeen) {
                targetX = e.lastSeen.x;
                targetY = e.lastSeen.y;
                const distToLastSeen = Math.hypot(targetX - e.x, targetY - e.y);
                if (distToLastSeen < 14) {
                    e.lastSeen = null;
                    e.state = 'patrol';
                }
            } else {
                targetX = e.x + Math.cos(e.angle) * 20;
                targetY = e.y + Math.sin(e.angle) * 20;
            }
            moveAngle = Math.atan2(targetY - e.y, targetX - e.x);
            e.speed = e.baseSpeed * (canSeePlayer ? 1.2 : 1.05);
        }

        if (avoidX !== 0 || avoidY !== 0) {
            const avoidAngle = Math.atan2(avoidY, avoidX);
            moveAngle = moveAngle * 0.7 + avoidAngle * 0.3;
        }

        e.angle = moveAngle;
        e.x += Math.cos(moveAngle) * e.speed;
        e.y += Math.sin(moveAngle) * e.speed;

        // Ограничение по миру
        const prevEnemyX = e.x - Math.cos(moveAngle) * e.speed;
        const prevEnemyY = e.y - Math.sin(moveAngle) * e.speed;

        e.x = Math.max(e.radius, Math.min(worldWidth - e.radius, e.x));
        e.y = Math.max(e.radius, Math.min(worldHeight - e.radius, e.y));

        for (const obj of mapObjects) {
            const objX = obj.x - obj.size / 2;
            const objY = obj.y - obj.size / 2;
            if (circleRectCollision(e.x, e.y, e.radius + 1, objX, objY, obj.size, obj.size)) {
                e.x = prevEnemyX;
                e.y = prevEnemyY;
                break;
            }
        }

        // Физика: блокирование врага стенами
        for (const wall of room.walls) {
            if (circleRectCollision(e.x, e.y, e.radius + 1, wall.x, wall.y, wall.width, wall.height)) {
                e.x = prevEnemyX;
                e.y = prevEnemyY;
                break;
            }
        }

        // Анимация ходьбы
        const moved = Math.hypot(e.x - prevEnemyX, e.y - prevEnemyY) > 0.1;
        if (moved) {
            e.walkCycle = (e.walkCycle + 1) % 20;
        } else {
            e.walkCycle = 0;
        }

        // Боевая механика: ближний удар врагом
        if (distToPlayer < player.radius + e.radius + 8) {
            if (e.attackCooldown <= 0 && player.damageCooldown <= 0) {
                const enemyDamage = 8 + Math.floor(Math.random() * 8);
                player.health -= enemyDamage;
                player.damageCooldown = 18;
                e.attackCooldown = 36;
                playSpatialSound('enemyAttack', e.x, e.y);
            }
            if (e.attackCooldown > 0) e.attackCooldown--;
        }

        if (player.damageCooldown > 0) player.damageCooldown--;

        if (player.health <= 0) {
            isDead = true;
            gameOverScreen.style.display = 'block';
            playSpatialSound('death', player.x, player.y);
            showMainMenu(true);
        }

        // Попадание пули
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            let dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < e.radius + b.radius) {
                // Создаем лужи крови
                for (let k = 0; k < 6; k++) {
                    bloodStains.push({
                        x: e.x + (Math.random() - 0.5) * 30,
                        y: e.y + (Math.random() - 0.5) * 30,
                        radius: Math.random() * 6 + 2
                    });
                }

                const damage = 20 + Math.floor(Math.random() * 18);
                e.health -= damage;
                playSpatialSound('hit', e.x, e.y);

                bullets.splice(j, 1);
                if (e.health <= 0) {
                    playSpatialSound('death', e.x, e.y);
                    enemies.splice(i, 1);
                    score += 120;
                    scoreElement.innerText = score;
                }
                break;
            }
        }
    }
}

// Универсальная функция отрисовки человечков (вид сверху)
function drawHumanoid(x, y, angle, skinColor, shirtColor, hasGun, walkCycle = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // Ноги (анимация ходьбы)
    const legOffset = Math.sin(walkCycle * 0.3) * 3;
    ctx.fillStyle = '#0000ff'; // Штаны
    ctx.fillRect(-4 + legOffset, 14, 4, 12); // Левая нога
    ctx.fillRect(0 - legOffset, 14, 4, 12); // Правая нога

    // Плечи (футболка)
    ctx.fillStyle = shirtColor;
    ctx.fillRect(-8, -14, 16, 28); 

    if (hasGun) {
        // Оружие (справа)
        ctx.fillStyle = '#444'; // Темный металл
        ctx.fillRect(5, 8, 22, 5);
        
        // Руки лежат на оружии
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.arc(12, 10, 4, 0, Math.PI * 2); ctx.fill(); // Правая
        ctx.beginPath(); ctx.arc(5, -12, 4, 0, Math.PI * 2); ctx.fill(); // Левая (согнута)
    } else {
        // Бита или труба в руках у врага
        ctx.fillStyle = '#8b4513';
        ctx.fillRect(0, -16, 26, 4);
        
        // Руки
        ctx.fillStyle = skinColor;
        ctx.beginPath(); ctx.arc(5, -14, 4, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(-2, 12, 4, 0, Math.PI * 2); ctx.fill();
    }

    // Голова
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
}

function worldToScreen(x, y) {
    return {
        x: x - camera.x + canvas.width / 2,
        y: y - camera.y + canvas.height / 2
    };
    // Обновление покачивания объектов
    mapObjects.forEach(obj => {
        obj.sway = (obj.sway + 0.05) % (Math.PI * 2);
    });
}

function draw() {
    if (!player) return;
    // 1. Фон - Плитка
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    const tileSize = 60;

    const startX = Math.floor((camera.x - canvas.width / 2) / tileSize) * tileSize;
    const endX = Math.ceil((camera.x + canvas.width / 2) / tileSize) * tileSize;
    const startY = Math.floor((camera.y - canvas.height / 2) / tileSize) * tileSize;
    const endY = Math.ceil((camera.y + canvas.height / 2) / tileSize) * tileSize;

    for (let x = startX; x <= endX; x += tileSize) {
        const sx = worldToScreen(x, 0).x;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height); ctx.stroke();
    }
    for (let y = startY; y <= endY; y += tileSize) {
        const sy = worldToScreen(0, y).y;
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy); ctx.stroke();
    }

    // 2. Отрисовка объектов мира
    mapObjects.forEach(obj => {
        const p = worldToScreen(obj.x, obj.y);
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) return;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.sin(obj.sway) * 0.05);
        ctx.translate(-p.x, -p.y);
        if (obj.type === 'crate') {
            ctx.fillStyle = '#654321'; // Темно-коричневый
            ctx.fillRect(p.x - obj.size/2, p.y - obj.size/2, obj.size, obj.size);
            ctx.strokeStyle = '#3d2817';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x - obj.size/2, p.y - obj.size/2, obj.size, obj.size);
        } else if (obj.type === 'barrel') {
            ctx.fillStyle = '#4169E1'; // Королевский синий
            ctx.beginPath();
            ctx.ellipse(p.x, p.y, obj.size/1.3, obj.size, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#1e3a8a';
            ctx.stroke();
        } else if (obj.type === 'pillar') {
            ctx.fillStyle = '#708090'; // Slate gray
            ctx.fillRect(p.x - obj.size/2, p.y - obj.size, obj.size, obj.size*2);
            ctx.strokeStyle = '#2f4f4f';
            ctx.strokeRect(p.x - obj.size/2, p.y - obj.size, obj.size, obj.size*2);
        }
        ctx.restore();
    });

    // 2.5. Отрисовка стен комнаты
    const room = rooms[currentRoom];
    ctx.fillStyle = '#666666';
    room.walls.forEach(wall => {
        const p = worldToScreen(wall.x, wall.y);
        ctx.fillRect(p.x, p.y, wall.width, wall.height);
    });

    // 3. Отрисовка крови на полу
    ctx.fillStyle = 'rgba(139, 0, 0, 0.7)';
    for (let b of bloodStains) {
        const p = worldToScreen(b.x, b.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
    }

    // 3.5. Отрисовка аптечек
    ctx.fillStyle = '#00ff00';
    for (let pack of healthPacks) {
        const p = worldToScreen(pack.x, pack.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, pack.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px Courier New';
        ctx.fillText('+', p.x - 3, p.y + 4);
    }

    // 4. Отрисовка гильз
    ctx.fillStyle = '#ffcc00';
    for (let c of casings) {
        const p = worldToScreen(c.x, c.y);
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(Math.atan2(c.vy, c.vx));
        ctx.fillRect(-2, -1, 4, 2);
        ctx.restore();
    }

    // 4. Отрисовка пуль
    bullets.forEach(b => {
        // След
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        b.trail.forEach((point, index) => {
            const p = worldToScreen(point.x, point.y);
            if (index === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        const p = worldToScreen(b.x, b.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#00ffff';
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00ffff';
        ctx.fill();
    });
    ctx.shadowBlur = 0;

    // 5. Враги
    enemies.forEach(e => {
        const p = worldToScreen(e.x, e.y);
        const healthRatio = Math.max(0, Math.min(1, e.health / e.maxHealth));
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x - 18, p.y - 28, 36, 5);
        ctx.fillStyle = `rgba(${255 - healthRatio * 255}, ${healthRatio * 200}, 40, 0.9)`;
        ctx.fillRect(p.x - 18, p.y - 28, 36 * healthRatio, 5);
        const skinColor = e.state === 'retreat' ? '#ffaaaa' : '#ffccaa';
        const shirtColor = e.state === 'retreat' ? '#ff0000' : '#ff00ff';
        drawHumanoid(p.x, p.y, e.angle, skinColor, shirtColor, false, e.walkCycle);
    });

    // 6. Игрок
    if (!isDead) {
        const p = worldToScreen(player.x, player.y);
        drawHumanoid(p.x, p.y, player.angle, '#ffccaa', '#00ffff', true, player.walkCycle);

        // Health bar в нижнем правом углу
        const barWidth = 200;
        const barHeight = 20;
        const barX = canvas.width - barWidth - 20;
        const barY = canvas.height - barHeight - 20;
        const playerHealthRatio = Math.max(0, Math.min(1, player.health / player.maxHealth));

        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#00ff99';
        ctx.fillRect(barX + 2, barY + 2, (barWidth - 4) * playerHealthRatio, barHeight - 4);
        ctx.strokeStyle = '#00ffff';
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#fff';
        ctx.font = '14px Courier New';
        ctx.fillText(`HP: ${Math.floor(player.health)} / ${player.maxHealth}`, barX + 4, barY - 5);

        const reloadText = player.reloading ? 'RELOADING...' : '';
        ctx.fillText(`AMMO: ${player.ammo} / ${player.maxAmmo} ${reloadText}`, barX + 4, barY + barHeight + 15);

        // Отображение волны
        ctx.fillText(`ROOM: ${rooms[currentRoom].name}`, barX + 4, barY + barHeight + 35);
    }
}

function loop() {
    if (!isGamePaused && !isDead) {
        update();
    }
    draw();
    updateMenuTextEffect();
    requestAnimationFrame(loop);
}

// Запуск
createMainMenu();
showMainMenu(false);
initGame();
isGamePaused = false;
loop();