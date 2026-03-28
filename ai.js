// ai.js - Искусственный интеллект врагов

// Типы врагов
const ENEMY_TYPES = {
    GRUNT: { // Обычный боец
        health: 50,
        hasGun: true,
        gunFireRate: 40,
        gunAmmo: 100,
        baseSpeed: 2.4,
        radius: 12,
        color: '#ff00ff',
        name: 'Боец'
    },
    BEAST: { // Агрессивный зверь - рычит и прыгает
        health: 35,
        hasGun: false,
        baseSpeed: 3.8,
        radius: 11,
        color: '#ff6600',
        name: 'Зверь',
        meleeDamage: 30 // Очень опасен в ближнем бою
    },
    BIKER: { // Байкер - быстрый и опасный
        health: 75,
        hasGun: true,
        gunFireRate: 35,
        gunAmmo: 150,
        baseSpeed: 3.2,
        radius: 13,
        color: '#0088ff',
        name: 'Байкер',
        bulletDamage: 18 // Более сильные выстрелы
    },
    TANK: { // Танк - медленный, крепкий, много урона
        health: 120,
        hasGun: true,
        gunFireRate: 50,
        gunAmmo: 200,
        baseSpeed: 1.5,
        radius: 15,
        color: '#ffff00',
        name: 'Танк',
        bulletDamage: 22 // Мощные выстрелы
    },
    SCOUT: { // Разведчик - быстрый, слабый, точный
        health: 30,
        hasGun: true,
        gunFireRate: 25,
        gunAmmo: 80,
        baseSpeed: 4.0,
        radius: 10,
        color: '#00ff00',
        name: 'Разведчик'
    }
};

// Спавн частей тела при смерти врага
function spawnBodyParts(enemyX, enemyY, skinColor, shirtColor) {
    // Голова
    const headSpeed = 4 + Math.random() * 6;
    const headAngle = Math.random() * Math.PI * 2;
    bodyParts.push({
        type: 'head',
        x: enemyX,
        y: enemyY,
        vx: Math.cos(headAngle) * headSpeed,
        vy: Math.sin(headAngle) * headSpeed - 3,
        angle: Math.random() * Math.PI * 2,
        angularVelocity: (Math.random() - 0.5) * 0.3,
        radius: 8,
        skinColor: skinColor,
        bloodOffset: {
            x: (Math.random() - 0.5) * 4,
            y: (Math.random() - 0.5) * 4
        },
        life: 300 + Math.random() * 200
    });
    
    // Две руки
    for (let i = 0; i < 2; i++) {
        const armSpeed = 3 + Math.random() * 5;
        const armAngle = Math.random() * Math.PI * 2;
        bodyParts.push({
            type: 'arm',
            x: enemyX + (i === 0 ? -8 : 8),
            y: enemyY - 8,
            vx: Math.cos(armAngle) * armSpeed,
            vy: Math.sin(armAngle) * armSpeed - 2,
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 0.25,
            width: 4,
            height: 14,
            color: skinColor,
            life: 280 + Math.random() * 180
        });
    }
    
    // Две ноги
    for (let i = 0; i < 2; i++) {
        const legSpeed = 2.5 + Math.random() * 4.5;
        const legAngle = Math.random() * Math.PI * 2;
        bodyParts.push({
            type: 'leg',
            x: enemyX + (i === 0 ? -6 : 6),
            y: enemyY + 8,
            vx: Math.cos(legAngle) * legSpeed,
            vy: Math.sin(legAngle) * legSpeed - 1.5,
            angle: Math.random() * Math.PI * 2,
            angularVelocity: (Math.random() - 0.5) * 0.2,
            width: 5,
            height: 16,
            color: '#0000ff',  // Штаны
            life: 300 + Math.random() * 200
        });
    }
}

// Проверка видимости врага (нет ли стен между врагом и целью)
function canSeeTarget(fromX, fromY, toX, toY, room) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const dist = Math.hypot(dx, dy);
    const steps = Math.ceil(dist / 10);
    
    for (let i = 0; i <= steps; i++) {
        const checkX = fromX + (dx / steps) * i;
        const checkY = fromY + (dy / steps) * i;
        
        // Проверяем пересечение со стеной
        for (const wall of room.walls) {
            if (circleRectCollision(checkX, checkY, 2, wall.x, wall.y, wall.width, wall.height)) {
                return false; // Стена блокирует видимость
            }
        }
        
        // Проверяем пересечение с объектами
        for (const obj of mapObjects) {
            const objX = obj.x - obj.size / 2;
            const objY = obj.y - obj.size / 2;
            if (circleRectCollision(checkX, checkY, 2, objX, objY, obj.size, obj.size)) {
                return false; // Объект блокирует видимость
            }
        }
    }
    
    return true; // Видимость не заблокирована
}

/** Ближайшая к врагу цель среди локального игрока и союзников (кооп) */
function getClosestPlayerForEnemy(ex, ey) {
    let bx = player.x;
    let by = player.y;
    let best = Math.hypot(ex - bx, ey - by);
    if (typeof isMultiplayer !== 'undefined' && isMultiplayer && currentGameMode === 'coop' && typeof multiplayerPlayers !== 'undefined') {
        for (const mp of multiplayerPlayers) {
            if (!mp || mp.id === playerId) continue;
            const d = Math.hypot(ex - mp.x, ey - mp.y);
            if (d < best) {
                best = d;
                bx = mp.x;
                by = mp.y;
            }
        }
    }
    return { x: bx, y: by, dist: best };
}

// Обновление AI врагов
function updateEnemies(room) {
    for (let i = enemies.length - 1; i >= 0; i--) {
        let e = enemies[i];
        const seed = (e.aiSeed || 0) * 0.001;

        const tgt = getClosestPlayerForEnemy(e.x, e.y);
        const px = tgt.x;
        const py = tgt.y;
        const distToTarget = tgt.dist;
        const distToLocal = Math.hypot(player.x - e.x, player.y - e.y);
        const targetingLocal = distToLocal <= distToTarget + 4;

        const toPlayerAngle = Math.atan2(py - e.y, px - e.x);
        const enemyFacingAngle = e.angle;
        const angleDelta = Math.abs(((toPlayerAngle - enemyFacingAngle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        const hasLOS = distToTarget < 560 && canSeeTarget(e.x, e.y, px, py, room);
        const inFOV = angleDelta < Math.PI * 0.52;
        const veryClose = distToTarget < 140;
        const canSeePlayer = hasLOS && (inFOV || veryClose);

        const shotDist = Math.hypot(lastShotEvent.x - e.x, lastShotEvent.y - e.y);
        const shotLOS = canSeeTarget(e.x, e.y, lastShotEvent.x, lastShotEvent.y, room);
        const shotHearRange = shotLOS ? 500 : 240;
        const shotHeard = Date.now() - lastShotEvent.time < 1700 && shotDist < shotHearRange;

        if (canSeePlayer || shotHeard) {
            e.state = 'chase';
            e.alertTimer = Math.max(e.alertTimer, 140);
            if (canSeePlayer) {
                e.lastSeen = { x: px, y: py };
            } else if (shotHeard) {
                e.lastSeen = { x: lastShotEvent.x, y: lastShotEvent.y };
            }
            
            // Издаем звук только при первом обнаружении
            if (!e.alertedToPlayer) {
                e.alertedToPlayer = true;
                playSpatialSound('enemyAlert', e.x, e.y);
            }
        } else if (e.alertTimer > 0) {
            e.alertTimer -= 1;
            if (e.alertTimer <= 0) {
                e.state = 'patrol';
                e.alertedToPlayer = false; // Сбрасываем флаг когда враг перестает видеть
            }
        }

        // Если здоровье низкое, отступать (только враги с оружием)
        if (e.hasGun && e.health < e.maxHealth * 0.32 && e.state === 'chase' && distToTarget < 260) {
            e.state = 'retreat';
            e.alertTimer = 130;
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
            if (!e.patrolRoute || e.patrolRoute.length === 0) {
                moveAngle = Math.atan2(py - e.y, px - e.x);
                e.speed = e.baseSpeed * (distToTarget > 900 ? 0.55 : 0.38);
            } else {
                const target = e.patrolRoute[e.patrolIndex];
                const distToPoint = Math.hypot(target.x - e.x, target.y - e.y);
                if (distToPoint < 20) {
                    e.patrolIndex = (e.patrolIndex + 1) % e.patrolRoute.length;
                }
                moveAngle = Math.atan2(target.y - e.y, target.x - e.x);
                e.speed = e.baseSpeed * 0.8;
            }
        } else if (e.state === 'chase') {
            let targetX, targetY;
            if (canSeePlayer) {
                targetX = px;
                targetY = py;
                e.lastSeen = { x: px, y: py };
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
            
            // Враги с оружием держат дистанцию для стрельбы
            if (e.hasGun && canSeePlayer) {
                if (distToTarget < 95) {
                    moveAngle = Math.atan2(e.y - py, e.x - px);
                    e.speed = e.baseSpeed * 1.25;
                } else if (distToTarget > 300) {
                    moveAngle = Math.atan2(py - e.y, px - e.x);
                    e.speed = e.baseSpeed * 0.92;
                } else {
                    const toPlayerAngle = Math.atan2(py - e.y, px - e.x);
                    const sideDir = Math.sin(Date.now() * 0.0017 + seed) >= 0 ? 1 : -1;
                    moveAngle = toPlayerAngle + sideDir * (Math.PI / 2 + 0.25);
                    e.speed = e.baseSpeed * 0.38;
                }
            } else {
                // Враги без оружия подходят в ближний бой максимально агрессивно
                moveAngle = Math.atan2(targetY - e.y, targetX - e.x);
                e.speed = e.baseSpeed * (canSeePlayer ? 1.4 : 1.05);
            }
        } else if (e.state === 'retreat') {
            moveAngle = Math.atan2(e.y - py, e.x - px);
            e.speed = e.baseSpeed * 1.15;
            e.alertTimer -= 1;
            if (e.alertTimer <= 0 || distToTarget > 340) {
                e.state = 'patrol';
            }
        }

        if (avoidX !== 0 || avoidY !== 0) {
            const avoidAngle = Math.atan2(avoidY, avoidX);
            moveAngle = moveAngle * 0.72 + avoidAngle * 0.28;
        }

        if ((e.wallStuck || 0) > 0) {
            e.wallStuck--;
            moveAngle += Math.sin(Date.now() * 0.004 + seed) * 0.95;
        }

        e.angle = moveAngle;
        e.x += Math.cos(moveAngle) * e.speed;
        e.y += Math.sin(moveAngle) * e.speed;

        // Анимация ходьбы
        const moved = Math.hypot(e.x - (e.x - Math.cos(moveAngle) * e.speed), e.y - (e.y - Math.sin(moveAngle) * e.speed)) > 0.1;
        if (moved) {
            e.walkCycle = (e.walkCycle + 1) % 20;
        } else {
            e.walkCycle = 0;
        }

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

        let hitWall = false;
        for (const wall of room.walls) {
            if (circleRectCollision(e.x, e.y, e.radius + 1, wall.x, wall.y, wall.width, wall.height)) {
                e.x = prevEnemyX;
                e.y = prevEnemyY;
                hitWall = true;
                break;
            }
        }
        if (hitWall) {
            e.wallStuck = Math.min(18, (e.wallStuck || 0) + 6);
        } else if (e.wallStuck > 0) {
            e.wallStuck = Math.max(0, e.wallStuck - 1);
        }

        // Боевая механика: ближний удар ИЛИ стрельба (в зависимости от оружия)
        if (!e.hasGun && distToLocal < player.radius + e.radius + 12) {
            // Враги БЕЗ оружия - максимально агрессивный ближний бой
            if (e.attackCooldown <= 0 && player.damageCooldown <= 0) {
                const enemyDamage = e.meleeDamage + Math.floor(Math.random() * 10);
                player.health -= enemyDamage;
                player.damageCooldown = 18;
                e.attackCooldown = 8;
                playSpatialSound('hit', e.x, e.y);
            }
            if (e.attackCooldown > 0) e.attackCooldown--;
        } else if (e.hasGun && distToTarget > 38 && distToTarget < 460 && canSeePlayer && canSeeTarget(e.x, e.y, px, py, room)) {
            if (e.shootCooldown <= 0 && e.gunAmmo > 0) {
                e.gunAmmo -= 1;

                const bulletSpeed = 15;
                let predictX = px;
                let predictY = py;
                if (targetingLocal) {
                    const predictDist = distToTarget / bulletSpeed;
                    const playerVelX = (keys['KeyD'] ? 1 : 0) - (keys['KeyA'] ? 1 : 0);
                    const playerVelY = (keys['KeyS'] ? 1 : 0) - (keys['KeyW'] ? 1 : 0);
                    const speedMultiplier = isShiftPressed ? 1.6 : 1.0;
                    predictX = player.x + playerVelX * predictDist * player.speed * speedMultiplier;
                    predictY = player.y + playerVelY * predictDist * player.speed * speedMultiplier;
                }
                
                // Стрельба по предугаданной позиции
                const gunAngle = Math.atan2(predictY - e.y, predictX - e.x);
                
                // Небольшой разброс для реалистичности
                const inaccuracy = (Math.random() - 0.5) * 0.10; // Высокая меткость
                const bulletAngle = gunAngle + inaccuracy;
                
                // Пуля врага
                bullets.push({
                    x: e.x,
                    y: e.y,
                    vx: Math.cos(bulletAngle) * 15,
                    vy: Math.sin(bulletAngle) * 15,
                    radius: 2.5,
                    isEnemyBullet: true,
                    fromEnemy: e,
                    damage: e.bulletDamage || 15,
                    trail: []
                });
                
                e.shootCooldown = e.gunFireRate;
                playSpatialSound('shot', e.x, e.y);
            }
            if (e.shootCooldown > 0) e.shootCooldown--;
        }

        // Попадание пули
        for (let j = bullets.length - 1; j >= 0; j--) {
            let b = bullets[j];
            // Враги не поражаются собственными пулями
            if (b.isEnemyBullet) continue;
            
            let dist = Math.hypot(b.x - e.x, b.y - e.y);
            if (dist < e.radius + b.radius) {
                // Создаем лужи крови
                for (let k = 0; k < 5; k++) {
                    bloodStains.push({
                        x: e.x + (Math.random() - 0.5) * 20,
                        y: e.y + (Math.random() - 0.5) * 20,
                        life: 300 + Math.random() * 200
                    });
                }
                // Гильзы
                for (let k = 0; k < 3; k++) {
                    casings.push({
                        x: e.x,
                        y: e.y,
                        vx: (Math.random() - 0.5) * 6,
                        vy: (Math.random() - 0.5) * 6,
                        life: 60 + Math.random() * 40
                    });
                }
                e.health -= 25 + Math.random() * 15;
                e.state = 'chase';
                e.alertTimer = Math.max(e.alertTimer, 150);
                e.lastSeen = { x: player.x, y: player.y };
                if (!e.alertedToPlayer) {
                    e.alertedToPlayer = true;
                    playSpatialSound('enemyAlert', e.x, e.y);
                }
                playSpatialSound('hit', e.x, e.y);
                bullets.splice(j, 1);
                if (e.health <= 0) {
                    // Калькулируем score с учетом FRENZY MODE
                    const killScore = frenzyActive ? 20 : 10;  // ×2 в FRENZY
                    score += killScore;
                    scoreElement.innerText = score;
                    playSpatialSound('death', e.x, e.y);
                    
                    // Добавляем killText сообщение
                    const killMessage = frenzyActive ? 'FRENZY! +20' : '+10';
                    const killColor = frenzyActive ? '#ff00ff' : '#ffffff';
                    killTexts.push({
                        text: killMessage,
                        x: e.x,
                        y: e.y,
                        life: 120,
                        maxLife: 120,
                        size: 24,
                        color: killColor
                    });
                    
                    // 10% шанс активировать FRENZY MODE
                    if (!frenzyActive && Math.random() < 0.1) {
                        activateFrenzy();
                    }
                    
                    // Спавн частей тела при смерти врага
                    const skinColor = e.state === 'retreat' ? '#ffaaaa' : '#ffccaa';
                    const shirtColor = e.state === 'retreat' ? '#ff0000' : '#ff00ff';
                    spawnBodyParts(e.x, e.y, skinColor, shirtColor);
                    
                    enemies.splice(i, 1);
                }
                break;
            }
        }
    }
}