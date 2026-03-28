// physics.js - Физика и столкновения

// Круг-прямоугольник столкновение
function circleRectCollision(cx, cy, radius, rx, ry, rw, rh) {
    const closestX = Math.max(rx, Math.min(cx, rx + rw));
    const closestY = Math.max(ry, Math.min(cy, ry + rh));
    const distanceX = cx - closestX;
    const distanceY = cy - closestY;
    return (distanceX * distanceX + distanceY * distanceY) < (radius * radius);
}

// Обновление пуль
function updateBullets() {
    for (let i = bullets.length - 1; i >= 0; i--) {
        let b = bullets[i];
        b.x += b.vx;
        b.y += b.vy;

        // След пули
        b.trail.push({x: b.x, y: b.y});
        if (b.trail.length > 5) b.trail.shift();

        let removed = false;
        
        // Проверка столкновения пули врага с игроком
        if (b.isEnemyBullet && !removed) {
            const dist = Math.hypot(player.x - b.x, player.y - b.y);
            if (dist < player.radius + b.radius) {
                if (player.damageCooldown <= 0) {
                    player.health -= b.damage;
                    player.damageCooldown = 18;
                    playSpatialSound('hit', b.x, b.y);
                }
                bullets.splice(i, 1);
                removed = true;
            }
        }
        
        if (removed) continue;
        
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
}

// Обновление гильз
function updateCasings() {
    for (let i = casings.length - 1; i >= 0; i--) {
        let c = casings[i];
        if (c.life > 0) {
            c.x += c.vx;
            c.y += c.vy;
            c.vx *= 0.8; // Замедление трением о пол
            c.vy *= 0.8;
            c.life--;
        } else {
            casings.splice(i, 1); // Удаление гильз когда они "мертвы"
        }
    }
}

// Обновление крови
function updateBlood() {
    for (let i = bloodStains.length - 1; i >= 0; i--) {
        bloodStains[i].life--;
        if (bloodStains[i].life <= 0) {
            bloodStains.splice(i, 1);
        }
    }
}

// Обновление частей тела
function updateBodyParts() {
    for (let i = bodyParts.length - 1; i >= 0; i--) {
        let part = bodyParts[i];
        
        // Физика: движение и затухание
        part.x += part.vx;
        part.y += part.vy;
        part.vx *= 0.85;  // Затухание скорости
        part.vy *= 0.85;
        part.vy += 0.2;   // Гравитация
        
        // Угловая скорость (вращение)
        part.angle += part.angularVelocity;
        part.angularVelocity *= 0.92;
        
        // Время жизни
        part.life--;
        
        // Удаление при истечении времени жизни
        if (part.life <= 0) {
            bodyParts.splice(i, 1);
        }
    }
}

// Обновление аптечек
function updateHealthPacks() {
    for (let i = healthPacks.length - 1; i >= 0; i--) {
        const pack = healthPacks[i];
        const dist = Math.hypot(player.x - pack.x, player.y - pack.y);
        if (dist < player.radius + pack.radius) {
            player.health = Math.min(player.maxHealth, player.health + pack.healAmount);
            healthPacks.splice(i, 1);
        }
    }
}

// Обновление текстов убийств
function updateKillTexts() {
    for (let i = killTexts.length - 1; i >= 0; i--) {
        killTexts[i].life--;
        if (killTexts[i].life <= 0) {
            killTexts.splice(i, 1);
        }
    }
}