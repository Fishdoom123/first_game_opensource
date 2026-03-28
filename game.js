// game.js - Основная логика игры

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { willReadFrequently: true });
const scoreElement = document.getElementById('score');
const ammoElement = document.getElementById('ammo');
const weaponElement = document.getElementById('weapon');
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
let isShiftPressed = false;

window.addEventListener('keydown', (e) => {
    // Escape для закрытия меню
    if (e.code === 'Escape') {
        const mainMenu = document.getElementById('mainMenu');
        if (mainMenu && mainMenu.classList.contains('active')) {
            if (!isDead && player) {
                showMainMenu(false);
            }
        }
        return;
    }
    
    if (e.code === 'KeyM') {
        if (isDead) {
            gameOverScreen.style.display = 'none';
            showMainMenu(true);
            isDead = false;
        } else {
            const mainMenu = document.getElementById('mainMenu');
            const isCurrentlyActive = mainMenu ? mainMenu.classList.contains('active') : false;
            showMainMenu(!isCurrentlyActive);
        }
        return;
    }
    
    // Рестарт на R при смерти - должно работать даже когда меню открыто
    if (e.code === 'KeyR' && isDead) {
        gameOverScreen.style.display = 'none';
        showMainMenu(false);
        initGame();
        return;
    }

    // Меню открыто — не передаём ввод в игру (в коопе мир при этом не на паузе)
    if (isMainMenuOpen()) return;
    // Проверка на паузу - только ПОСЛЕ обработки меню
    if (isGamePaused) return;

    // Переключение оружия
    if (e.code === 'KeyE') {
        if (player) {
            player.weaponType = player.weaponType === 'pistol' ? 'rifle' : 'pistol';
            // Обновляем fireRate в зависимости от типа оружия
            if (player.weaponType === 'pistol') {
                player.fireRate = 150;
                player.maxAmmo = 12;
            } else {
                player.fireRate = 60;  // Автомат стреляет быстрее
                player.maxAmmo = 30;
            }
            // Перезаряжаем при смене оружия
            player.ammo = player.maxAmmo;
        }
        return;
    }
    
    // Обработка Shift для ускорения
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isShiftPressed = true;
    }
    
    keys[e.code] = true;
});
window.addEventListener('keyup', (e) => {
    // Всегда сбрасываем состояние клавиш, иначе при открытом меню в коопе залипнут WASD/Shift
    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
        isShiftPressed = false;
    }
    keys[e.code] = false;
});
window.addEventListener('mousemove', (e) => {
    if (isMainMenuOpen() || isGamePaused) return;
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});
window.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    if (isMainMenuOpen() || isGamePaused) return;
    mouse.isDown = true;
});
window.addEventListener('mouseup', (e) => {
    if (e.button !== 0) return;
    mouse.isDown = false;
});

// Игровой мир
let worldWidth = 3000;
let worldHeight = 3000;
const playerViewHorizon = 800; // область вокруг игрока в которой может видеть враг

// Камера
const camera = { x: 0, y: 0 };

// Звук выстрелов для ИИ
let lastShotEvent = { x: 0, y: 0, time: 0 };

// Игровые объекты
let player;
let bullets = [];
let enemies = [];
let bloodStains = []; // Динамический объект: кровь
let casings = [];     // Динамический объект: гильзы
let bodyParts = [];   // Части тела врагов с физикой
let mapObjects = [];  // Накопленные объекты карты (ящики, бочки, колонны)
let healthPacks = []; // Аптечки для восстановления здоровья
let killTexts = [];   // Тексты убийств
let currentRoom = 0;  // Текущая комната
let rooms = [];       // Массив комнат
let originalRooms = [];  // Оригинальные стартовые уровни (не менять)
let room;             // Текущая комната
let score = 0;
let isDead = false;
let isGamePaused = true;

// Мультиплеер
let isMultiplayer = false;       // Мультиплеер ли сейчас
let currentGameMode = 'single';  // 'single', 'coop', 'pvp'
let multiplayerPlayers = [];     // Другие игроки в мультиплеере
let playerId = null;             // ID текущего игрока в сессии
let updateCounter = 0;           // Счетчик для отправки обновлений позиции

// Процедурная генерация (для кооп режима)
let useProceduralGeneration = false; // Использовать процедурную генерацию
let lastCleanupChunksTime = 0;      // Время последней очистки чанков
let spawnEnemyTimer = 0;            // Таймер для респавна врагов (5 минут = 18000 кадров)
const SPAWN_ENEMY_INTERVAL = 18000; // 5 минут при 60 FPS

// FRENZY MODE
let frenzyActive = false;
let frenzyTimer = 0;
const FRENZY_DURATION = 30 * 60; // 30 секунд (60 fps)

// Определение комнат
function initializeRooms() {
    rooms = [];
    rooms.push({
        name: 'forest',
    width: 1800,
    height: 1200,
    playerSpawn: { x: 100, y: 100 },
    walls: [
        // Границы
        { x: 0, y: 0, width: 1800, height: 20 },
        { x: 0, y: 0, width: 20, height: 1200 },
        { x: 1780, y: 0, width: 20, height: 1200 },
        { x: 0, y: 1180, width: 1800, height: 20 },
        // Внутренние препятствия - каменные стены
        { x: 300, y: 200, width: 150, height: 30 },
        { x: 600, y: 400, width: 30, height: 250 },
        { x: 900, y: 300, width: 200, height: 30 },
        { x: 1200, y: 500, width: 30, height: 300 },
        { x: 400, y: 700, width: 300, height: 30 },
        { x: 1000, y: 900, width: 200, height: 30 }
    ],
    doors: [],
    enemySpawns: [
        { x: 400, y: 300, patrolRoute: [{ x: 400, y: 300 }, { x: 500, y: 300 }, { x: 500, y: 400 }, { x: 400, y: 400 }] },
        { x: 800, y: 500, patrolRoute: [{ x: 800, y: 500 }, { x: 900, y: 500 }, { x: 900, y: 600 }, { x: 800, y: 600 }] },
        { x: 1100, y: 300, patrolRoute: [{ x: 1100, y: 300 }, { x: 1200, y: 300 }, { x: 1200, y: 200 }, { x: 1100, y: 200 }] },
        { x: 600, y: 800, patrolRoute: [{ x: 600, y: 800 }, { x: 700, y: 800 }, { x: 700, y: 900 }, { x: 600, y: 900 }] },
        { x: 1400, y: 700, patrolRoute: [{ x: 1400, y: 700 }, { x: 1500, y: 700 }, { x: 1500, y: 800 }, { x: 1400, y: 800 }] },
        { x: 300, y: 600, patrolRoute: [{ x: 300, y: 600 }, { x: 350, y: 600 }, { x: 350, y: 700 }, { x: 300, y: 700 }] }
    ],
    objects: [
        { x: 500, y: 500, width: 120, height: 120, type: 'lake' },
        { x: 1300, y: 400, width: 80, height: 80, type: 'crate' },
        { x: 700, y: 200, width: 60, height: 60, type: 'barrel' },
        { x: 950, y: 750, width: 70, height: 70, type: 'crate' }
    ]
});

// Уровень 2: Город
rooms.push({
    name: 'city',
    width: 1800,
    height: 1400,
    playerSpawn: { x: 100, y: 100 },
    walls: [
        // Границы города
        { x: 0, y: 0, width: 1800, height: 20 },
        { x: 0, y: 0, width: 20, height: 1400 },
        { x: 1780, y: 0, width: 20, height: 1400 },
        { x: 0, y: 1380, width: 1800, height: 20 },
        // Высокие здания
        { x: 200, y: 150, width: 150, height: 200 },
        { x: 450, y: 300, width: 120, height: 250 },
        { x: 700, y: 200, width: 180, height: 150 },
        { x: 1000, y: 400, width: 140, height: 220 },
        { x: 1300, y: 100, width: 160, height: 200 },
        // Средние здания
        { x: 350, y: 700, width: 100, height: 120 },
        { x: 700, y: 800, width: 110, height: 130 },
        { x: 1100, y: 850, width: 130, height: 150 },
        { x: 500, y: 1000, width: 90, height: 100 }
    ],
    doors: [],
    enemySpawns: [
        { x: 250, y: 400, patrolRoute: [{ x: 250, y: 400 }, { x: 350, y: 400 }, { x: 350, y: 500 }, { x: 250, y: 500 }] },
        { x: 600, y: 500, patrolRoute: [{ x: 600, y: 500 }, { x: 700, y: 500 }, { x: 700, y: 600 }, { x: 600, y: 600 }] },
        { x: 900, y: 300, patrolRoute: [{ x: 900, y: 300 }, { x: 1000, y: 300 }, { x: 1000, y: 400 }, { x: 900, y: 400 }] },
        { x: 1200, y: 550, patrolRoute: [{ x: 1200, y: 550 }, { x: 1300, y: 550 }, { x: 1300, y: 650 }, { x: 1200, y: 650 }] },
        { x: 400, y: 900, patrolRoute: [{ x: 400, y: 900 }, { x: 500, y: 900 }, { x: 500, y: 1000 }, { x: 400, y: 1000 }] },
        { x: 800, y: 1000, patrolRoute: [{ x: 800, y: 1000 }, { x: 900, y: 1000 }, { x: 900, y: 1100 }, { x: 800, y: 1100 }] },
        { x: 1400, y: 800, patrolRoute: [{ x: 1400, y: 800 }, { x: 1500, y: 800 }, { x: 1500, y: 900 }, { x: 1400, y: 900 }] }
    ],
    objects: [
        { x: 620, y: 700, width: 80, height: 80, type: 'crate' },
        { x: 1100, y: 1100, width: 60, height: 60, type: 'barrel' },
        { x: 300, y: 1200, width: 70, height: 70, type: 'crate' },
        { x: 1500, y: 600, width: 50, height: 50, type: 'barrel' }
    ]
});

    // Сохраняем оригинальные уровни
    originalRooms = rooms.map(r => JSON.parse(JSON.stringify(r)));
}

// Инициализируем комнаты
initializeRooms();

function initGame() {
    console.log('[InitGame] ✅ ЗАПУСК ИНИЦИАЛИЗАЦИИ!');
    console.log('[InitGame]   isMultiplayer:', isMultiplayer, 'currentGameMode:', currentGameMode);
    console.log('[InitGame]   useProceduralGeneration (перед):', useProceduralGeneration);
    
    // Если это кооп режим - использовать процедурную генерацию
    if (isMultiplayer && currentGameMode === 'coop') {
        console.log('[InitGame] 🎮 COOP РЕЖИМ АКТИВИРОВАН');
        useProceduralGeneration = true;
        worldWidth = 10000; // Большой мир
        worldHeight = 10000;
        
        // Создаем пустую комнату для совместимости
        const coopSpawn = proceduralGen.findClearSpawn(worldWidth, worldHeight, 12);
        room = {
            width: worldWidth,
            height: worldHeight,
            playerSpawn: { x: coopSpawn.x, y: coopSpawn.y },
            walls: [],
            objects: [],
            enemies: [],
            name: 'Infinite Coop World'
        };
        
        // Убедимся, что rooms[0] = room для совместимости
        if (rooms.length === 0) {
            rooms.push(room);
        } else {
            rooms[0] = room;
        }
        
        player = {
            x: coopSpawn.x,
            y: coopSpawn.y,
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
            walkCycle: 0,
            weaponType: 'pistol',
            fireRate: 150
        };
        
        spawnEnemyTimer = 0;
    } else {
        // Обычный режим
        useProceduralGeneration = false;
        
        // Загружаем оригинальный уровень перед игрой
        const sourceRoom = originalRooms[currentRoom] || rooms[currentRoom];
        if (!sourceRoom) {
            console.error(`Уровень ${currentRoom} не найден!`);
            currentRoom = 0;
            return;
        }
        room = JSON.parse(JSON.stringify(sourceRoom));
        rooms[currentRoom] = room;
        
        worldWidth = room.width;
        worldHeight = room.height;
        player = {
            x: room.playerSpawn.x,
            y: room.playerSpawn.y,
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
            walkCycle: 0,
            weaponType: 'pistol',
            fireRate: 150
        };
    }
    bullets = [];
    enemies = [];
    killTexts = [];
    bloodStains = [];
    casings = [];
    bodyParts = [];
    mapObjects = [];
    healthPacks = [];
    score = 0;
    isDead = false;
    frenzyActive = false;
    frenzyTimer = 0;
    
    // Убираем анимацию HUD при инициализации
    if (document.getElementById('ui')) {
        document.getElementById('ui').classList.remove('frenzy-mode');
    }

    // Логика спавна в зависимости от режима
    if (useProceduralGeneration) {
        // Кооп режим с процедурной генерацией
        const chunks = proceduralGen.getChunksAroundPosition(player.x, player.y, 2);
        
        // Загружаем объекты и стены из чанков
        chunks.forEach(chunk => {
            chunk.objects.forEach(obj => {
                mapObjects.push({
                    x: obj.x,
                    y: obj.y,
                    width: obj.size,
                    height: obj.size,
                    type: obj.type,
                    size: obj.size,
                    sway: 0
                });
            });
            
            // Загружаем стены в room.walls
            chunk.walls.forEach(wall => {
                room.walls.push(wall);
            });
        });
        
        console.log('[InitGame] Загруженоных чанков:', chunks.length, 'Стен:', room.walls.length);
        
        // Спавним врагов в кооп режиме (5-15 врагов вокруг игрока)
        spawnCoopEnemies(5 + Math.floor(Math.random() * 10));
        
    } else {
        // Обычный режим со статическими уровнями
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
        room.enemySpawns.forEach((spawn, idx) => {
            // Выбираем тип врага случайно
            const typeNames = Object.keys(ENEMY_TYPES);
            const randomType = typeNames[Math.floor(Math.random() * typeNames.length)];
            const type = ENEMY_TYPES[randomType];
            
            enemies.push({
                x: spawn.x,
                y: spawn.y,
                radius: type.radius,
                type: randomType,
                health: type.health,
                maxHealth: type.health,
                baseSpeed: type.baseSpeed,
                speed: type.baseSpeed,
                angle: 0,
                state: 'patrol',
                patrolRoute: spawn.patrolRoute || [],
                patrolIndex: 0,
                hasGun: type.hasGun,
                gunFireRate: type.gunFireRate || 0,
                shootCooldown: 0,
                gunAmmo: type.gunAmmo || 0,
                attackCooldown: 0,
                alertTimer: 0,
                walkCycle: 0,
                alertedToPlayer: false,
                meleeDamage: type.meleeDamage || 20,
                bulletDamage: type.bulletDamage || 15,
                color: type.color,
                lastSeen: null,
                aiSeed: Math.floor(Math.random() * 10000),
                wallStuck: 0
            });
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
    ammoElement.innerText = player.ammo;
    gameOverScreen.style.display = 'none';

    // Установка обработчиков сетевых событий (для мультиплеера)
    if (isMultiplayer && networkManager.isConnected) {
        // Когда другой игрок обновляет позицию
        networkManager.on('PLAYER_UPDATE', (data) => {
            if (data.playerId !== playerId) {
                // Найти или создать игрока в multiplayerPlayers
                let mp = multiplayerPlayers.find(p => p.id === data.playerId);
                if (mp) {
                    mp.x = data.x;
                    mp.y = data.y;
                    mp.angle = data.angle;
                }
            }
        });

        // Когда другой игрок стреляет
        networkManager.on('SHOOT', (data) => {
            if (data.playerId !== playerId) {
                bullets.push({
                    x: data.x,
                    y: data.y,
                    vx: data.vx,
                    vy: data.vy,
                    radius: 3,
                    isEnemyBullet: false,
                    fromPlayer: data.playerId,
                    trail: []
                });
            }
        });

        // Когда игрок присоединяется
        networkManager.on('PLAYER_JOINED', (data) => {
            if (data.players && Array.isArray(data.players)) {
                multiplayerPlayers = data.players;
            } else if (data.player && data.player.id) {
                const rest = multiplayerPlayers.filter(p => p.id !== data.player.id);
                multiplayerPlayers = [...rest, data.player];
            }
            console.log('Игрок присоединился:', data.player ? data.player.name : '', 'всего в списке:', multiplayerPlayers.length);
        });

        // Когда игрок отключается
        networkManager.on('PLAYER_LEFT', (data) => {
            multiplayerPlayers = multiplayerPlayers.filter(p => p.id !== data.playerId);
            console.log(`Игрок отключился: ${data.playerId}`);
        });
    }

    console.log('[InitGame] Инициализация завершена. Player:', {x: player.x, y: player.y, health: player.health});
    console.log('[InitGame] Врагов спавнено:', enemies.length);
    console.log('[InitGame] UseProceduralGeneration:', useProceduralGeneration);
    
    startBackgroundMusic();
}

function update() {
    // В кооп режиме room уже инициализирован
    if (!useProceduralGeneration) {
        room = rooms[currentRoom];
    }
    
    if (isDead) {
        // R ключ обрабатывается в keydown handler
        return;
    }

    if (isMultiplayer && currentGameMode === 'coop' && isMainMenuOpen()) {
        keys['KeyW'] = keys['KeyS'] = keys['KeyA'] = keys['KeyD'] = false;
        isShiftPressed = false;
        mouse.isDown = false;
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

    // Применяем базовую скорость, с ускорением на Shift
    const moveSpeed = isShiftPressed ? player.speed * 1.6 : player.speed;
    player.x += dx * moveSpeed;
    player.y += dy * moveSpeed;

    // Анимация ходьбы
    if (dx !== 0 || dy !== 0) {
        player.walkCycle = (player.walkCycle + 1) % 20;
    } else {
        player.walkCycle = 0;
    }

    // Границы мира
    const prevPlayerX = player.x - dx * moveSpeed;
    const prevPlayerY = player.y - dy * moveSpeed;
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
    updateHealthPacks();

    // Камера центрируется на игроке
    camera.x = player.x - canvas.width / 2;
    camera.y = player.y - canvas.height / 2;

    // Обновление процедурной генерации (если включена)
    if (useProceduralGeneration) {
        // Каждые 30 кадров очищаем далекие чанки и загружаем новые
        lastCleanupChunksTime++;
        if (lastCleanupChunksTime > 30) {
            proceduralGen.cleanupChunks(player.x, player.y, 3);
            
            // Обновляем mapObjects и walls на основе новых чанков
            mapObjects = [];
            room.walls = [];
            
            const chunks = proceduralGen.getChunksAroundPosition(player.x, player.y, 2);
            chunks.forEach(chunk => {
                chunk.objects.forEach(obj => {
                    mapObjects.push({
                        x: obj.x,
                        y: obj.y,
                        width: obj.size,
                        height: obj.size,
                        type: obj.type,
                        size: obj.size,
                        sway: 0
                    });
                });
                
                chunk.walls.forEach(wall => {
                    room.walls.push(wall);
                });
            });
            
            lastCleanupChunksTime = 0;
        }
        
        // Респавн врагов каждые 5 минут (18000 кадров)
        spawnEnemyTimer++;
        if (spawnEnemyTimer >= SPAWN_ENEMY_INTERVAL) {
            spawnCoopEnemies(3 + Math.floor(Math.random() * 5)); // Спавним 3-8 врагов
            spawnEnemyTimer = 0;
            console.log('[Coop] Враги заново заспавнены!');
        }
    }

    // Прицеливание (по мировым координатам мыши)
    const mouseWorldX = camera.x + mouse.x;
    const mouseWorldY = camera.y + mouse.y;
    player.angle = Math.atan2(mouseWorldY - player.y, mouseWorldX - player.x);

    // Перезарядка (R): работает, если не мёртв и если нет полного боезапаса
    if (!player.reloading && keys['KeyR'] && player.ammo < player.maxAmmo) {
        player.reloading = true;
        // Время перезарядки: пистолет быстрее, автомат медленнее
        player.reloadTimer = player.weaponType === 'pistol' ? 50 : 85;
        playSpatialSound('reload', player.x, player.y);
    }

    if (player.reloading) {
        player.reloadTimer = Math.max(0, player.reloadTimer - 1);
        if (player.reloadTimer === 0) {
            player.reloading = false;
            player.ammo = player.maxAmmo;
        }
    }

    // Уменьшение cooldown урона
    if (player.damageCooldown > 0) {
        player.damageCooldown--;
    }

    // Стрельба
    const now = Date.now();
    if (mouse.isDown && now - lastShootTime > player.fireRate && !player.reloading && player.ammo > 0) {
        player.ammo -= 1;

        // Вектор скорости пули
        const vx = Math.cos(player.angle) * 18;
        const vy = Math.sin(player.angle) * 18;

        // Пуля
        bullets.push({
            x: player.x,
            y: player.y,
            vx: vx,
            vy: vy,
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

        // Отправить выстрел на сервер если мультиплеер
        if (isMultiplayer && networkManager.isConnected) {
            networkManager.shoot(player.x, player.y, vx, vy);
        }
    }

    // Обновление гильз
    updateCasings();

    // Обновление пуль
    updateBullets();

    // Обновление крови
    updateBlood();

    // Обновление частей тела
    updateBodyParts();

    // Обновление текстов убийств
    updateKillTexts();

    // Обновление покачивания объектов
    mapObjects.forEach(obj => {
        obj.sway = (obj.sway + 0.05) % (Math.PI * 2);
    });

    // Обновление врагов
    updateEnemies(room);

    // Обновление FRENZY MODE
    if (frenzyActive) {
        frenzyTimer--;
        if (frenzyTimer <= 0) {
            frenzyActive = false;
            // Возвращаем обычную музыку
            playNormalMusic();
            // Убираем анимацию с HUD
            if (document.getElementById('ui')) {
                document.getElementById('ui').classList.remove('frenzy-mode');
            }
        }
    }

    scoreElement.innerText = score;
    ammoElement.innerText = player.ammo;
    
    // Обновляем информацию об оружии
    const weaponName = player.weaponType === 'pistol' ? 'Пистолет' : 'Автомат';
    weaponElement.innerText = weaponName + ' (E для смены)';

    // Синхронизация мультиплеера (отправляем обновление позиции каждые 3 кадра)
    if (isMultiplayer && networkManager.isConnected) {
        updateCounter++;
        if (updateCounter >= 3) {
            networkManager.updatePlayerPosition(player.x, player.y, player.angle);
            updateCounter = 0;
        }
        
        // Обновлять положение других игроков если присоединились
        // TODO: Добавить рендеринг других игроков
    }

    // Смерть игрока
    if (player.health <= 0) {
        isDead = true;
        gameOverScreen.style.display = 'block';
        playSpatialSound('death', player.x, player.y);
    }
}

// Функция смены уровня
function changeLevel(levelIndex) {
    currentRoom = levelIndex;
    
    // Останавливаем FRENZY MODE при смене уровня
    frenzyActive = false;
    frenzyTimer = 0;
    
    // Убираем анимацию с HUD
    if (document.getElementById('ui')) {
        document.getElementById('ui').classList.remove('frenzy-mode');
    }
    
    // Возвращаемся к обычной музыке
    playNormalMusic();
    
    initGame();
}

let lastShootTime = 0;

// Функция спавна врагов в кооп режиме
function spawnCoopEnemies(count) {
    console.log('[SpawnCoopEnemies] Спавним', count, 'врагов');
    const typeNames = Object.keys(ENEMY_TYPES);
    
    for (let i = 0; i < count; i++) {
        // Спавним врагов вокруг игрока на расстоянии 300-800 пикселей
        const angle = Math.random() * Math.PI * 2;
        const distance = 300 + Math.random() * 500;
        const x = Math.max(40, Math.min(worldWidth - 40, player.x + Math.cos(angle) * distance));
        const y = Math.max(40, Math.min(worldHeight - 40, player.y + Math.sin(angle) * distance));
        
        // Выбираем случайный тип врага
        const randomType = typeNames[Math.floor(Math.random() * typeNames.length)];
        const type = ENEMY_TYPES[randomType];
        const pr = 70;
        const patrolRoute = [
            { x: Math.max(20, x - pr), y: Math.max(20, y - pr) },
            { x: Math.min(worldWidth - 20, x + pr), y: Math.max(20, y - pr) },
            { x: Math.min(worldWidth - 20, x + pr), y: Math.min(worldHeight - 20, y + pr) },
            { x: Math.max(20, x - pr), y: Math.min(worldHeight - 20, y + pr) }
        ];
        
        enemies.push({
            x: x,
            y: y,
            radius: type.radius,
            type: randomType,
            health: type.health,
            maxHealth: type.health,
            baseSpeed: type.baseSpeed,
            speed: type.baseSpeed,
            angle: 0,
            state: 'patrol',
            patrolRoute,
            patrolIndex: 0,
            hasGun: type.hasGun,
            gunFireRate: type.gunFireRate || 0,
            shootCooldown: 0,
            gunAmmo: type.gunAmmo || 0,
            attackCooldown: 0,
            alertTimer: 0,
            walkCycle: 0,
            alertedToPlayer: false,
            meleeDamage: type.meleeDamage || 20,
            bulletDamage: type.bulletDamage || 15,
            color: type.color,
            lastSeen: null,
            aiSeed: Math.floor(Math.random() * 10000),
            wallStuck: 0
        });
    }
}

// Функция активации FRENZY MODE
function activateFrenzy() {
    frenzyActive = true;
    frenzyTimer = FRENZY_DURATION;
    
    // Переключаемся на FRENZY музыку
    playFrenzyMusic();
    
    // Добавляем классс для качания HUD
    if (document.getElementById('ui')) {
        document.getElementById('ui').classList.add('frenzy-mode');
    }
    
    // Анонс FRENZY MODE
    killTexts.push({
        text: 'FRENZY MODE!',
        x: canvas.width / 2,
        y: canvas.height / 2,
        life: 120,
        maxLife: 120,
        size: 48,
        color: '#ff00ff'
    });
}

function loop() {
    // Логируем состояние первый раз для диагностики
    if (!window.loopInitialized) {
        console.log('[loop] Первый кадр. isGamePaused:', isGamePaused, 'isDead:', isDead, 'player:', !!player);
        window.loopInitialized = true;
    }
    
    const worldPaused = isDead || isGamePaused;
    if (!worldPaused) {
        update();
    } else if (!window.gamePausedLogged && isGamePaused) {
        console.log('[loop] Игра на паузе. isGamePaused:', isGamePaused);
        window.gamePausedLogged = true;
    }
    
    draw();
    updateMenuTextEffect();
    requestAnimationFrame(loop);
}

function isMainMenuOpen() {
    const mainMenu = document.getElementById('mainMenu');
    return !!(mainMenu && mainMenu.classList.contains('active'));
}

// Управление главным меню
function showMainMenu(show = true) {
    const mainMenu = document.getElementById('mainMenu');
    const gameCanvas = document.getElementById('gameCanvas');
    
    if (!mainMenu) {
        return;
    }
    
    if (show) {
        mainMenu.classList.add('active');
        // В коопе меню только перекрывает экран: симуляция и сеть работают, ввод блокируется отдельно
        if (isMultiplayer && currentGameMode === 'coop') {
            isGamePaused = false;
        } else {
            isGamePaused = true;
        }
        gameCanvas.style.pointerEvents = 'none';
    } else {
        mainMenu.classList.remove('active');
        isGamePaused = false;
        gameCanvas.style.pointerEvents = 'auto';
    }
}

function applyWsUrlFromInput() {
    const inp = document.getElementById('wsServerUrl');
    if (inp && inp.value.trim()) {
        networkManager.setServerUrl(inp.value.trim());
    }
}

function refreshWsServerInputField() {
    const inp = document.getElementById('wsServerUrl');
    if (inp && typeof networkManager !== 'undefined') {
        inp.value = networkManager.getServerUrl();
    }
}

// Функции меню
function showMenuView(viewName) {
    document.getElementById('mainMenuView').style.display = viewName === 'main' ? 'block' : 'none';
    document.getElementById('levelSelectView').style.display = viewName === 'levels' ? 'block' : 'none';
    document.getElementById('multiplayerView').style.display = viewName === 'multiplayer' ? 'block' : 'none';
    document.getElementById('createGameView').style.display = viewName === 'create' ? 'block' : 'none';
    document.getElementById('joinGameView').style.display = viewName === 'join' ? 'block' : 'none';
    if (document.getElementById('levelEditor')) {
        document.getElementById('levelEditor').style.display = viewName === 'editor' ? 'block' : 'none';
    }
    if (viewName === 'multiplayer') {
        refreshWsServerInputField();
    }
}

function setupLevelButtons() {
    const levelButtons = document.getElementById('levelButtons');
    if (!levelButtons) return;
    
    levelButtons.innerHTML = '';
    
    // Оригинальные уровни
    ['Лес', 'Город'].forEach((name, idx) => {
        const btn = document.createElement('button');
        btn.className = 'menu-btn';
        btn.textContent = name;
        btn.onclick = () => {
            currentRoom = idx;
            showMainMenu(false);
            initGame();
        };
        levelButtons.appendChild(btn);
    });
    
    // Пользовательские уровни из localStorage
    for (let i = 2; i < 10; i++) {
        const saved = localStorage.getItem(`customLevel_${i}`);
        if (saved) {
            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.textContent = `Уровень ${i}`;
            btn.onclick = () => {
                currentRoom = i;
                const levelData = JSON.parse(saved);
                rooms[i] = levelData;
                originalRooms[i] = JSON.parse(JSON.stringify(levelData));
                showMainMenu(false);
                initGame();
            };
            levelButtons.appendChild(btn);
        }
    }
}

function startLevelEditor() {
    const levelEditor = document.getElementById('levelEditor');
    const gameCanvas = document.getElementById('gameCanvas');
    
    levelEditor.style.display = 'block';
    if (gameCanvas) {
        gameCanvas.style.pointerEvents = 'none';
    }
    
    editorState.currentRoomIndex = currentRoom || 0;
    
    // Остановить игру
    isGamePaused = true;
    
    // Сбросить состояние мыши - это важно!
    mouse.isDown = false;
    
    // Отключить звуки
    if (typeof stopAllSounds === 'function') {
        stopAllSounds();
    }
    
    if (typeof initLevelEditor === 'function') {
        initLevelEditor();
    }
}

// Обработчики меню
const btnPlayLevels = document.getElementById('btnPlayLevels');
const btnSettings = document.getElementById('btnSettings');
const btnQuit = document.getElementById('btnQuit');
const btnLevelEditor = document.getElementById('btnLevelEditor');
const btnBackFromLevels = document.getElementById('btnBackFromLevels');
const btnExitEditor = document.getElementById('btnExitEditor');
const btnSaveLevel = document.getElementById('btnSaveLevel');
const btnLoadLevel = document.getElementById('btnLoadLevel');

if (btnPlayLevels) {
    btnPlayLevels.addEventListener('click', () => {
        setupLevelButtons();
        showMenuView('levels');
    });
}

if (btnBackFromLevels) {
    btnBackFromLevels.addEventListener('click', () => {
        showMenuView('main');
    });
}

if (btnSettings) {
    btnSettings.addEventListener('click', () => {
        alert('Настройки будут добавлены позже');
    });
}

// Обработчики мультиплеера
const btnMultiplayer = document.getElementById('btnMultiplayer');
const btnCreateGame = document.getElementById('btnCreateGame');
// Кнопки для присоединения к игре
const btnJoinGame = document.getElementById('btnJoinGame');
const btnRefreshGames = document.getElementById('btnRefreshGames');
const btnBackFromMulti = document.getElementById('btnBackFromMulti');
const btnStartCreate = document.getElementById('btnStartCreate');
const btnBackFromCreate = document.getElementById('btnBackFromCreate');
const btnDoJoin = document.getElementById('btnDoJoin');
const btnBackFromJoin = document.getElementById('btnBackFromJoin');

// Функция загрузки списка игр
function loadGamesList() {
    applyWsUrlFromInput();
    console.log('[loadGamesList] Запрашиваем список игр...');
    const gamesList = document.getElementById('gamesList');
    gamesList.innerHTML = '<p style="color: #888;">Загружаю...</p>';
    
    // Слушаем ответ с список игр
    networkManager.on('GAMES_LIST', (data) => {
        console.log('[loadGamesList] Получен список. Игр:', data.games.length);
        const games = data.games;
        
        if (!games || games.length === 0) {
            gamesList.innerHTML = '<p style="color: #888;">Нет открытых игр. Создайте новую!</p>';
            return;
        }
        
        let html = '';
        games.forEach((game, idx) => {
            const createdTime = new Date(game.createdAt).toLocaleTimeString();
            html += `
                <div style="background: #0a1617; border: 1px solid #00ff00; padding: 8px; margin-bottom: 5px; cursor: pointer; border-radius: 3px;" onclick="selectGame('${game.id}')">
                    <strong style="color: #00ff00;">[${idx + 1}] ${game.mode.toUpperCase()}</strong> 
                    <span style="color: #0ff;">${game.players}/${game.maxPlayers}</span> 
                    <span style="color: #888; font-size: 12px;">${createdTime}</span>
                </div>
            `;
        });
        
        gamesList.innerHTML = html;
    });
    
    // Запрашиваем список
    networkManager.getGames();
}

// Функция выбора игры из списка
function selectGame(gameId) {
    console.log('[selectGame] Выбрана игра:', gameId);
    document.getElementById('gameCode').value = gameId;
}

if (btnMultiplayer) {
    btnMultiplayer.addEventListener('click', () => {
        showMenuView('multiplayer');
        applyWsUrlFromInput();
        const statusEl = document.getElementById('multiplayerStatus');
        if (networkManager.isConnected) {
            statusEl.textContent = '✓ Подключено к серверу';
            statusEl.style.color = '#00ff00';
            return;
        }
        statusEl.textContent = 'Подключение к серверу…';
        statusEl.style.color = '#00ffff';
        networkManager.connect('Player').then(() => {
            statusEl.textContent = '✓ Подключено к серверу';
            statusEl.style.color = '#00ff00';
        }).catch(() => {
            statusEl.textContent = '✗ Сервер недоступен. В приложении .dmg сервер стартует сам; иначе: node server.js. Проверьте адрес WebSocket ниже.';
            statusEl.style.color = '#ff6666';
        });
    });
}

if (btnCreateGame) {
    btnCreateGame.addEventListener('click', () => {
        showMenuView('create');
    });
}

if (btnJoinGame) {
    btnJoinGame.addEventListener('click', () => {
        applyWsUrlFromInput();
        showMenuView('join');
        loadGamesList();
    });
}

if (btnRefreshGames) {
    btnRefreshGames.addEventListener('click', () => {
        loadGamesList();
    });
}

if (btnBackFromMulti) {
    btnBackFromMulti.addEventListener('click', () => {
        showMenuView('main');
    });
}

if (btnStartCreate) {
    btnStartCreate.addEventListener('click', () => {
        applyWsUrlFromInput();
        const mode = document.getElementById('gameMode').value;
        const maxPlayers = parseInt(document.getElementById('maxPlayers').value);
        
        console.log('[btnStartCreate] Создание игры. Режим:', mode, 'Макс игроков:', maxPlayers);
        console.log('[btnStartCreate] networkManager.isConnected:', networkManager.isConnected);
        
        // Убедимся, что подключены к серверу
        if (!networkManager.isConnected) {
            console.log('[btnStartCreate] Не подключены к серверу, подключаемся...');
            const playerName = prompt('Введите ваше имя:', 'Player');
            if (!playerName) return;
            
            networkManager.connect(playerName).then(() => {
                console.log('[btnStartCreate] Подключение установлено, создаем игру...');
                
                // Регистрируем обработчик ДО создания игры, чтобы не пропустить ответ!
                const handleGameState = (data) => {
                    console.log('[handleGameState] *** ВЫЗВАН! ***');
                    console.log('[handleGameState] data:', data);
                    console.log('[handleGameState] data.gameId:', data.gameId);
                    console.log('[handleGameState] data.state:', data.state);
                    if (data.gameId) {
                        console.log('[handleGameState] ✓ Запускаем игру. GameId:', data.gameId);
                        // Игра создана, запустить её
                        isMultiplayer = true;
                        currentGameMode = mode;
                        playerId = networkManager.playerId; // Получить playerId из сетевого менеджера
                        multiplayerPlayers = data.state.players;
                        console.log('[handleGameState] Установлены переменные:');
                        console.log('  isMultiplayer:', isMultiplayer, 'currentGameMode:', currentGameMode, 'playerId:', playerId);
                        console.log('  multiplayerPlayers.length:', multiplayerPlayers.length);
                        console.log('[handleGameState] Вызываем showMainMenu(false)...');
                        showMainMenu(false);
                        console.log('[handleGameState] После showMainMenu. isGamePaused:', isGamePaused);
                        console.log('[handleGameState] Вызываем initGame()...');
                        initGame();
                        console.log('[handleGameState] initGame() завершена. player:', !!player);
                        networkManager.off('GAME_STATE', handleGameState);
                    } else {
                        console.log('[handleGameState] ✗ gameId не найден в data!');
                    }
                };
                console.log('[btnStartCreate] Регистрируем handleGameState...');
                networkManager.on('GAME_STATE', handleGameState);
                console.log('[btnStartCreate] handleGameState зарегистрирован');
                
                // ТЕПЕРЬ отправляем команду создания игры на сервер
                console.log('[btnStartCreate] Отправляем CREATE_GAME на сервер...');
                networkManager.createGame(mode, maxPlayers);
                
                document.getElementById('createStatus').textContent = '✓ Создаём игру...';
                document.getElementById('createStatus').style.color = '#00ff00';
            }).catch(err => {
                console.error('[btnStartCreate] Ошибка подключения:', err);
                alert('Ошибка подключения к серверу: ' + err.message);
            });
        } else {
            console.log('[btnStartCreate] Уже подключены, создаем игру...');
            
            // Регистрируем обработчик ДО создания игры, чтобы не пропустить ответ!
            const handleGameState = (data) => {
                console.log('[handleGameState] *** ВЫЗВАН! (уже подключены) ***');
                console.log('[handleGameState] data:', data);
                console.log('[handleGameState] data.gameId:', data.gameId);
                if (data.gameId) {
                    console.log('[handleGameState] ✓ Запускаем игру. GameId:', data.gameId);
                    // Игра создана, запустить её
                    isMultiplayer = true;
                    currentGameMode = mode;
                    playerId = networkManager.playerId;
                    multiplayerPlayers = data.state.players;
                    console.log('[handleGameState] Установлены переменные:');
                    console.log('  isMultiplayer:', isMultiplayer, 'currentGameMode:', currentGameMode, 'playerId:', playerId);
                    showMainMenu(false);
                    console.log('[handleGameState] После showMainMenu. isGamePaused:', isGamePaused);
                    initGame();
                    console.log('[handleGameState] initGame() завершена. player:', !!player);
                    networkManager.off('GAME_STATE', handleGameState);
                } else {
                    console.log('[handleGameState] ✗ gameId не найден!');
                }
            };
            console.log('[btnStartCreate] Регистрируем handleGameState (уже подключены)...');
            networkManager.on('GAME_STATE', handleGameState);
            console.log('[btnStartCreate] handleGameState зарегистрирован');
            
            // ТЕПЕРЬ отправляем команду создания игры на сервер
            console.log('[btnStartCreate] Отправляем CREATE_GAME на сервер...');
            networkManager.createGame(mode, maxPlayers);
            
            document.getElementById('createStatus').textContent = '✓ Создаём игру...';
            document.getElementById('createStatus').style.color = '#00ff00';
        }
    });
}

if (btnBackFromCreate) {
    btnBackFromCreate.addEventListener('click', () => {
        showMenuView('multiplayer');
    });
}

if (btnDoJoin) {
    btnDoJoin.addEventListener('click', () => {
        applyWsUrlFromInput();
        const gameCode = document.getElementById('gameCode').value;
        const playerName = document.getElementById('playerName').value || 'Player';
        
        if (!gameCode) {
            document.getElementById('joinStatus').textContent = '✗ Введите код игры';
            document.getElementById('joinStatus').style.color = '#ff0000';
            return;
        }
        
        // Убедимся, что подключены к серверу
        if (!networkManager.isConnected) {
            networkManager.connect(playerName).then(() => {
                setupJoinHandlers(gameCode, playerName);
            }).catch(err => {
                document.getElementById('joinStatus').textContent = '✗ Ошибка подключения: ' + err.message;
                document.getElementById('joinStatus').style.color = '#ff0000';
            });
        } else {
            setupJoinHandlers(gameCode, playerName);
        }
    });

    function setupJoinHandlers(gameCode, playerName) {
        // Регистрируем обработчики ДО присоединения!
        const handleGameState = (data) => {
            if (data.gameId) {
                // Присоединились к игре
                isMultiplayer = true;
                currentGameMode = (data.state && data.state.mode) ? data.state.mode : 'coop';
                playerId = networkManager.playerId; // Получить playerId из сетевого менеджера
                multiplayerPlayers = data.state.players || [];
                showMainMenu(false);
                initGame();
                networkManager.off('GAME_STATE', handleGameState);
                networkManager.off('ERROR', handleError);
            }
        };
        
        const handleError = (data) => {
            document.getElementById('joinStatus').textContent = '✗ ' + data.message;
            document.getElementById('joinStatus').style.color = '#ff0000';
            networkManager.off('ERROR', handleError);
            networkManager.off('GAME_STATE', handleGameState);
        };
        
        networkManager.on('GAME_STATE', handleGameState);
        networkManager.on('ERROR', handleError);
        
        // ТЕПЕРЬ отправляем команду присоединения
        networkManager.joinGame(gameCode);
        
        document.getElementById('joinStatus').textContent = '✓ Подключаемся...';
        document.getElementById('joinStatus').style.color = '#00ff00';
    }
}

if (btnBackFromJoin) {
    btnBackFromJoin.addEventListener('click', () => {
        showMenuView('multiplayer');
    });
}

if (btnLevelEditor) {
    btnLevelEditor.addEventListener('click', () => {
        showMainMenu(false);
        startLevelEditor();
    });
}

if (btnLoadLevel) {
    btnLoadLevel.addEventListener('click', () => {
        if (typeof loadLevelIntoEditor === 'function') {
            loadLevelIntoEditor(editorState.currentRoomIndex);
            alert('✓ Уровень загружена из редактора!');
        }
    });
}

if (btnExitEditor) {
    btnExitEditor.addEventListener('click', () => {
        document.getElementById('levelEditor').style.display = 'none';
        showMainMenu(true);
    });
}

if (btnSaveLevel) {
    btnSaveLevel.addEventListener('click', () => {
        if (typeof saveLevelInEditor === 'function') {
            saveLevelInEditor();
        }
    });
}

if (btnQuit) {
    btnQuit.addEventListener('click', () => {
        window.close();
    });
}

// Запуск - инициализируем первый уровень при загрузке
initGame();
loop();
showMainMenu(true);