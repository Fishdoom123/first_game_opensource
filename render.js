// render.js - Функции рисования

// Рисование humanoid (игрок или враг)
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

// Преобразование мировых координат в экранные
function worldToScreen(x, y) {
    return {
        x: x - camera.x,
        y: y - camera.y
    };
}

function drawTexturedCrate(cx, cy, size, sway) {
    const h = size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(sway) * 0.04);
    const g = ctx.createLinearGradient(-h, -h, h, h);
    g.addColorStop(0, '#5c3d2e');
    g.addColorStop(0.45, '#8b5a3c');
    g.addColorStop(0.55, '#6d4428');
    g.addColorStop(1, '#3d2618');
    ctx.fillStyle = g;
    ctx.fillRect(-h, -h, size, size);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(-h + 0.5, -h + 0.5, size - 1, size - 1);
    ctx.strokeStyle = 'rgba(255, 0, 255, 0.2)';
    ctx.beginPath();
    ctx.moveTo(-h * 0.3, -h); ctx.lineTo(-h * 0.3, h);
    ctx.moveTo(h * 0.25, -h); ctx.lineTo(h * 0.25, h);
    ctx.moveTo(-h, -h * 0.2); ctx.lineTo(h, -h * 0.2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.fillRect(-h + 3, -h + 3, size * 0.35, size * 0.22);
    ctx.restore();
}

function drawTexturedBarrel(cx, cy, size, sway) {
    const rx = size / 1.35;
    const ry = size / 2;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(Math.sin(sway * 0.8) * 0.06);
    const g = ctx.createLinearGradient(-rx, 0, rx, 0);
    g.addColorStop(0, '#1a3a6e');
    g.addColorStop(0.35, '#3d6eb8');
    g.addColorStop(0.55, '#5a8fd4');
    g.addColorStop(0.7, '#2a5088');
    g.addColorStop(1, '#152a50');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.45)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.lineWidth = 1;
    for (let t = -0.5; t <= 0.5; t += 0.5) {
        ctx.beginPath();
        ctx.ellipse(0, t * ry * 0.85, rx * 0.92, ry * 0.12, 0, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.beginPath();
    ctx.ellipse(-rx * 0.35, -ry * 0.35, rx * 0.2, ry * 0.15, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawTexturedPillar(cx, cy, size, sway) {
    const w = size / 2;
    const h = size;
    ctx.save();
    ctx.translate(cx, cy - h * 0.25);
    ctx.rotate(Math.sin(sway) * 0.02);
    const g = ctx.createLinearGradient(-w, -h, w, h * 0.5);
    g.addColorStop(0, '#9aa8b8');
    g.addColorStop(0.5, '#5a6570');
    g.addColorStop(1, '#2a3038');
    ctx.fillStyle = g;
    ctx.fillRect(-w, -h, size, h * 1.5);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(-w + 0.5, -h + 0.5, size - 1, h * 1.5 - 1);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.fillRect(-w + 4, -h + 6, w * 0.35, h * 1.2);
    ctx.restore();
}

// Рисование объектов мира
function drawMapObjects() {
    mapObjects.forEach(obj => {
        const p = worldToScreen(obj.x, obj.y);
        if (p.x < -80 || p.x > canvas.width + 80 || p.y < -80 || p.y > canvas.height + 80) return;
        if (obj.type === 'crate') {
            drawTexturedCrate(p.x, p.y, obj.size, obj.sway);
        } else if (obj.type === 'barrel') {
            drawTexturedBarrel(p.x, p.y, obj.size, obj.sway);
        } else if (obj.type === 'pillar') {
            drawTexturedPillar(p.x, p.y, obj.size, obj.sway);
        }
    });
}

// Рисование объектов комнаты
function drawRoomObjects() {
    room.objects.forEach(obj => {
        const p = worldToScreen(obj.x, obj.y);
        if (obj.type === 'lake') {
            const g = ctx.createLinearGradient(p.x, p.y, p.x + obj.width, p.y + obj.height);
            g.addColorStop(0, '#0a1a4a');
            g.addColorStop(0.4, '#1a4a8a');
            g.addColorStop(0.7, '#0d3a6e');
            g.addColorStop(1, '#051428');
            ctx.fillStyle = g;
            ctx.fillRect(p.x, p.y, obj.width, obj.height);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.strokeRect(p.x, p.y, obj.width, obj.height);
            const t = Date.now() * 0.002;
            ctx.strokeStyle = 'rgba(255, 0, 255, 0.08)';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.ellipse(
                    p.x + obj.width * (0.2 + i * 0.2),
                    p.y + obj.height * 0.5 + Math.sin(t + i) * 6,
                    obj.width * 0.12,
                    5,
                    0,
                    0,
                    Math.PI * 2
                );
                ctx.stroke();
            }
        } else if (obj.type === 'tree') {
            const cx = p.x + obj.width / 2;
            const baseY = p.y + obj.height;
            ctx.fillStyle = '#3d2817';
            ctx.fillRect(cx - obj.width * 0.12, p.y + obj.height * 0.35, obj.width * 0.24, obj.height * 0.65);
            const fg = ctx.createRadialGradient(cx, p.y + obj.height * 0.35, 2, cx, p.y + obj.height * 0.2, obj.width * 0.55);
            fg.addColorStop(0, '#2d8a3a');
            fg.addColorStop(0.6, '#0d5a22');
            fg.addColorStop(1, '#042810');
            ctx.fillStyle = fg;
            ctx.beginPath();
            ctx.arc(cx, p.y + obj.height * 0.32, obj.width * 0.48, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 150, 0.2)';
            ctx.lineWidth = 1;
            ctx.stroke();
        } else if (obj.type === 'car') {
            const w = obj.width;
            const h = obj.height;
            const bodyG = ctx.createLinearGradient(p.x, p.y, p.x, p.y + h);
            bodyG.addColorStop(0, '#ff4a6a');
            bodyG.addColorStop(0.5, '#c01838');
            bodyG.addColorStop(1, '#6a0818');
            ctx.fillStyle = bodyG;
            ctx.fillRect(p.x + w * 0.08, p.y + h * 0.22, w * 0.84, h * 0.48);
            ctx.fillStyle = '#1a1a24';
            ctx.fillRect(p.x + w * 0.12, p.y + h * 0.35, w * 0.76, h * 0.28);
            ctx.fillStyle = '#0a0a12';
            ctx.fillRect(p.x + w * 0.05, p.y + h * 0.62, w * 0.18, h * 0.22);
            ctx.fillRect(p.x + w * 0.77, p.y + h * 0.62, w * 0.18, h * 0.22);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.35)';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x + w * 0.08, p.y + h * 0.22, w * 0.84, h * 0.48);
        } else if (obj.type === 'barrel') {
            drawTexturedBarrel(p.x + obj.width / 2, p.y + obj.height / 2, Math.min(obj.width, obj.height), 0);
        }
    });
}

// Рисование стен комнаты
function drawWalls() {
    room.walls.forEach(wall => {
        const p = worldToScreen(wall.x, wall.y);
        if (p.x < -wall.width - 20 || p.x > canvas.width + 20 || p.y < -wall.height - 20 || p.y > canvas.height + 20) {
            return;
        }
        const g = ctx.createLinearGradient(p.x, p.y, p.x + wall.width, p.y + wall.height);
        g.addColorStop(0, '#4a4a58');
        g.addColorStop(0.35, '#2a2a36');
        g.addColorStop(0.65, '#3a3a48');
        g.addColorStop(1, '#1a1a22');
        ctx.fillStyle = g;
        ctx.fillRect(p.x, p.y, wall.width, wall.height);
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.22)';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x + 0.5, p.y + 0.5, wall.width - 1, wall.height - 1);
        ctx.fillStyle = 'rgba(255, 0, 255, 0.06)';
        ctx.fillRect(p.x, p.y, wall.width, 2);
    });
}

// Рисование зданий из процедурной генерации
function drawProceduralBuildings() {
    if (!useProceduralGeneration || !player) return;

    const buildings = proceduralGen.getBuildingsAround(player.x, player.y, 2);

    buildings.forEach(building => {
        building.walls.forEach(wall => {
            const p = worldToScreen(wall.x, wall.y);
            if (p.x < -wall.width - 30 || p.x > canvas.width + 30 || p.y < -wall.height - 30 || p.y > canvas.height + 30) {
                return;
            }
            const base = building.color || '#333';
            const g = ctx.createLinearGradient(p.x, p.y, p.x, p.y + wall.height);
            g.addColorStop(0, base);
            g.addColorStop(0.5, '#1a1a22');
            g.addColorStop(1, base);
            ctx.fillStyle = g;
            ctx.fillRect(p.x, p.y, wall.width, wall.height);
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.28)';
            ctx.lineWidth = 1;
            ctx.strokeRect(p.x + 0.5, p.y + 0.5, wall.width - 1, wall.height - 1);
            if (wall.height > 25 && wall.width > 40 && (wall.width > wall.height || wall.width > 60)) {
                ctx.fillStyle = 'rgba(255, 200, 120, 0.35)';
                const winW = Math.min(8, wall.width * 0.12);
                const winH = Math.min(10, wall.height * 0.22);
                for (let u = 0.22; u < 0.85; u += 0.18) {
                    ctx.fillRect(p.x + wall.width * u, p.y + wall.height * 0.25, winW, winH);
                }
            }
        });
    });
}

// Рисование крови
function drawBlood() {
    ctx.fillStyle = 'rgba(139, 0, 0, 0.7)';
    for (let b of bloodStains) {
        const p = worldToScreen(b.x, b.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Рисование гильз
function drawCasings() {
    ctx.fillStyle = '#ffff00';
    for (let c of casings) {
        const p = worldToScreen(c.x, c.y);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Рисование аптечек
function drawHealthPacks() {
    for (let pack of healthPacks) {
        const p = worldToScreen(pack.x, pack.y);
        const r = pack.radius;
        const pulse = 0.85 + Math.sin(Date.now() * 0.006 + pack.x * 0.01) * 0.15;
        ctx.save();
        ctx.shadowColor = '#00ff99';
        ctx.shadowBlur = 12 * pulse;
        const g = ctx.createRadialGradient(p.x - 2, p.y - 2, 1, p.x, p.y, r + 4);
        g.addColorStop(0, '#aaffcc');
        g.addColorStop(0.45, '#00dd77');
        g.addColorStop(1, '#006633');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(p.x - 1, p.y - r * 0.55, 2, r * 1.1);
        ctx.fillRect(p.x - r * 0.55, p.y - 1, r * 1.1, 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 10px Courier New';
        ctx.textAlign = 'center';
        ctx.fillText('+', p.x, p.y + 4);
        ctx.restore();
    }
}

// Рисование частей тела
function drawBodyParts() {
    for (let part of bodyParts) {
        const p = worldToScreen(part.x, part.y);
        
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(part.angle || 0);
        
        if (part.type === 'head') {
            // Голова - круг с кровавым пятном
            ctx.fillStyle = part.skinColor;
            ctx.beginPath();
            ctx.arc(0, 0, part.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // Кровавое пятно
            ctx.fillStyle = 'rgba(139, 0, 0, 0.8)';
            ctx.beginPath();
            ctx.arc(part.bloodOffset.x, part.bloodOffset.y, part.radius * 0.4, 0, Math.PI * 2);
            ctx.fill();
        } else if (part.type === 'arm' || part.type === 'leg') {
            // Руки и ноги - прямоугольники
            ctx.fillStyle = part.color;
            ctx.fillRect(-part.width / 2, -part.height / 2, part.width, part.height);
            
            // Контур
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.strokeRect(-part.width / 2, -part.height / 2, part.width, part.height);
        }
        
        ctx.restore();
    }
}

// Рисование пуль
function drawBullets() {
    bullets.forEach(b => {
        ctx.strokeStyle = b.isEnemyBullet ? 'rgba(255, 80, 120, 0.65)' : 'rgba(0, 255, 255, 0.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        b.trail.forEach((point, index) => {
            const p = worldToScreen(point.x, point.y);
            if (index === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();

        const p = worldToScreen(b.x, b.y);
        const core = b.isEnemyBullet ? '#ff6a9a' : '#00ffff';
        const glow = b.isEnemyBullet ? '#ff0044' : '#00ffff';
        const g = ctx.createRadialGradient(p.x - 1, p.y - 1, 0, p.x, p.y, b.radius + 4);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.35, core);
        g.addColorStop(1, b.isEnemyBullet ? 'rgba(80,0,20,0)' : 'rgba(0,40,60,0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, b.radius, 0, Math.PI * 2);
        ctx.fillStyle = g;
        ctx.shadowBlur = 10;
        ctx.shadowColor = glow;
        ctx.fill();
    });
    ctx.shadowBlur = 0;
}

function drawEnemies() {
    enemies.forEach(e => {
        const p = worldToScreen(e.x, e.y);
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) return;

        // Health bar
        const healthRatio = Math.max(0, Math.min(1, e.health / e.maxHealth));
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x - 18, p.y - 28, 36, 5);
        ctx.fillStyle = `rgba(${255 - healthRatio * 255}, ${healthRatio * 200}, 40, 0.9)`;
        ctx.fillRect(p.x - 18, p.y - 28, 36 * healthRatio, 5);

        // Цвет в зависимости от типа врага
        const shirtColor = e.color || '#ff00ff';
        const skinColor = e.state === 'retreat' ? '#ffaaaa' : '#ffccaa';
        // Показываем оружие если враг его имеет
        drawHumanoid(p.x, p.y, e.angle, skinColor, shirtColor, e.hasGun, e.walkCycle);
        
        // Рисуем красный восклицательный знак если враг видит игрока
        if (e.alertedToPlayer) {
            const exclamationY = p.y - 45; // Вверху над врагом
            const bounce = Math.sin(Date.now() * 0.01) * 3; // Мигание вверх-вниз
            const rotation = (Date.now() * 0.003); // Поворот (skew эффект)
            const skewAmount = Math.sin(rotation) * 0.1; // Поворот на оси
            
            ctx.save();
            ctx.translate(p.x, exclamationY + bounce);
            ctx.transform(1, skewAmount, 0, 1, 0, 0); // Skew трансформация для эффекта вращения
            ctx.fillStyle = '#ff0000';
            ctx.font = 'bold 28px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2; // Мигание прозрачности
            ctx.fillText('!', 0, 0);
            ctx.restore();
        }
    });
}

// Рисование других игроков (мультиплеер)
function drawMultiplayerPlayers() {
    // Рисуем других игроков только если мультиплеер включен и playerId установлен
    if (!isMultiplayer || !playerId || !multiplayerPlayers || multiplayerPlayers.length === 0) return;

    multiplayerPlayers.forEach(mp => {
        if (!mp || mp.id === playerId) return; // Не рисуем самого себя

        const p = worldToScreen(mp.x, mp.y);
        if (p.x < -50 || p.x > canvas.width + 50 || p.y < -50 || p.y > canvas.height + 50) return;

        // Health bar
        const healthRatio = Math.max(0, Math.min(1, mp.health / mp.maxHealth));
        ctx.fillStyle = '#000';
        ctx.fillRect(p.x - 18, p.y - 28, 36, 5);
        ctx.fillStyle = `rgba(0, ${healthRatio * 255}, 255, 0.9)`; // Синий цвет для соигроков
        ctx.fillRect(p.x - 18, p.y - 28, 36 * healthRatio, 5);

        // Рисуем игрока (синий цвет для отличия)
        const skinColor = '#ffccaa';
        const shirtColor = '#0099ff'; // Синий цвет для соигроков
        drawHumanoid(p.x, p.y, mp.angle, skinColor, shirtColor, mp.hasGun || false, mp.walkCycle || 0);

        // Показываем никнейм
        ctx.fillStyle = '#0099ff';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(mp.name || 'Player', p.x, p.y - 30);
    });
}

// Рисование игрока
function drawPlayer() {
    if (!player || isDead) {
        if (!player) console.warn('[drawPlayer] Player не определен!');
        if (isDead) console.warn('[drawPlayer] Игрок мертв!');
        return;
    }
    
    const p = worldToScreen(player.x, player.y);
    drawHumanoid(p.x, p.y, player.angle, '#ffccaa', '#ff0000', true, player.walkCycle);

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

    // Отображение комнаты/мира
    if (!useProceduralGeneration) {
        ctx.fillText(`ROOM: ${rooms[currentRoom].name}`, barX + 4, barY + barHeight + 35);
    } else {
        ctx.fillText(`INFINITE WORLD - COOP`, barX + 4, barY + barHeight + 35);
    }
}

// Syntwave фон с сеткой
function drawSynthwaveBackground() {
    // Градиент фона (темный фиолетовый -> темный синий)
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#0a0015');      // Темный фиолетовый вверху
    gradient.addColorStop(0.4, '#1a0033');    // Средний фиолетовый
    gradient.addColorStop(0.7, '#0d1b2a');    // Темный синий
    gradient.addColorStop(1, '#000810');      // Почти черный внизу
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Сетка фона (60px плитки)
    ctx.strokeStyle = '#1a2a3a';
    ctx.lineWidth = 1;
    const tileSize = 60;
    
    const startX = Math.floor(camera.x / tileSize) * tileSize;
    const endX = Math.ceil((camera.x + canvas.width) / tileSize) * tileSize;
    const startY = Math.floor(camera.y / tileSize) * tileSize;
    const endY = Math.ceil((camera.y + canvas.height) / tileSize) * tileSize;
    
    for (let x = startX; x <= endX; x += tileSize) {
        for (let y = startY; y <= endY; y += tileSize) {
            const p = worldToScreen(x, y);
            ctx.strokeRect(p.x, p.y, tileSize, tileSize);
        }
    }
}

function minimapRoundRectPath(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
}

/** Мини-карта (экранные координаты): стены, враги, союзники, вы */
function drawMinimap() {
    if (!player || isDead) return;

    const mw = 198;
    const mh = 148;
    const pad = 12;
    const mx = canvas.width - mw - pad;
    const my = frenzyActive ? 78 : 14;

    let originX;
    let originY;
    let viewW;
    let viewH;
    if (typeof useProceduralGeneration !== 'undefined' && useProceduralGeneration) {
        viewW = 2600;
        viewH = 2600;
        originX = player.x - viewW / 2;
        originY = player.y - viewH / 2;
    } else {
        originX = 0;
        originY = 0;
        viewW = typeof worldWidth !== 'undefined' ? worldWidth : 2000;
        viewH = typeof worldHeight !== 'undefined' ? worldHeight : 2000;
    }

    const sx = mw / viewW;
    const sy = mh / viewH;

    const toMini = (wx, wy) => ({
        x: mx + (wx - originX) * sx,
        y: my + (wy - originY) * sy
    });

    const inMap = (px, py) => px >= mx - 2 && px <= mx + mw + 2 && py >= my - 2 && py <= my + mh + 2;

    ctx.save();
    ctx.fillStyle = 'rgba(6, 2, 18, 0.88)';
    minimapRoundRectPath(mx, my, mw, mh, 10);
    ctx.fill();
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.65)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    minimapRoundRectPath(mx + 1, my + 1, mw - 2, mh - 2, 8);
    ctx.clip();

    ctx.fillStyle = 'rgba(20, 8, 40, 0.95)';
    ctx.fillRect(mx, my, mw, mh);

    ctx.strokeStyle = 'rgba(0, 255, 255, 0.07)';
    ctx.lineWidth = 1;
    const gridStep = 280;
    for (let gx = Math.floor(originX / gridStep) * gridStep; gx < originX + viewW; gx += gridStep) {
        const a = toMini(gx, originY);
        const b = toMini(gx, originY + viewH);
        if (a.x >= mx && a.x <= mx + mw) {
            ctx.beginPath();
            ctx.moveTo(a.x, my);
            ctx.lineTo(a.x, my + mh);
            ctx.stroke();
        }
    }
    for (let gy = Math.floor(originY / gridStep) * gridStep; gy < originY + viewH; gy += gridStep) {
        const a = toMini(originX, gy);
        if (a.y >= my && a.y <= my + mh) {
            ctx.beginPath();
            ctx.moveTo(mx, a.y);
            ctx.lineTo(mx + mw, a.y);
            ctx.stroke();
        }
    }

    let wallCap = 0;
    const maxWalls = 900;
    if (typeof room !== 'undefined' && room.walls) {
        for (const wall of room.walls) {
            if (wallCap++ > maxWalls) break;
            if (wall.x + wall.width < originX || wall.x > originX + viewW || wall.y + wall.height < originY || wall.y > originY + viewH) {
                continue;
            }
            const a = toMini(wall.x, wall.y);
            const bw = Math.max(1, wall.width * sx);
            const bh = Math.max(1, wall.height * sy);
            if (a.x + bw < mx || a.x > mx + mw || a.y + bh < my || a.y > my + mh) continue;
            ctx.fillStyle = 'rgba(120, 130, 150, 0.85)';
            ctx.fillRect(a.x, a.y, bw, bh);
        }
    }

    if (typeof enemies !== 'undefined') {
        enemies.forEach(e => {
            const q = toMini(e.x, e.y);
            if (!inMap(q.x, q.y)) return;
            ctx.fillStyle = '#ff2a7a';
            ctx.beginPath();
            ctx.arc(q.x, q.y, 3.2, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    if (typeof isMultiplayer !== 'undefined' && isMultiplayer && typeof multiplayerPlayers !== 'undefined' && playerId != null) {
        multiplayerPlayers.forEach(mp => {
            if (!mp || mp.id === playerId) return;
            const q = toMini(mp.x, mp.y);
            if (!inMap(q.x, q.y)) return;
            ctx.fillStyle = '#38b6ff';
            ctx.beginPath();
            ctx.moveTo(q.x, q.y - 5);
            ctx.lineTo(q.x + 4, q.y + 4);
            ctx.lineTo(q.x - 4, q.y + 4);
            ctx.closePath();
            ctx.fill();
        });
    }

    const pl = toMini(player.x, player.y);
    ctx.fillStyle = '#00ffcc';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(pl.x, pl.y, 4.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();

    ctx.fillStyle = 'rgba(0, 255, 255, 0.85)';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('MAP', mx + 8, my + 6);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
    ctx.font = '9px Courier New';
    ctx.fillText('○ вы  ▲ друг  ● враг', mx + 42, my + 7);

    ctx.restore();
}

// Основная функция рисования
function draw() {
    if (!player) {
        // Логируем только первый раз
        if (!window.noPlayerWarned) {
            console.warn('[draw] ⚠️ Player не определен!');
            window.noPlayerWarned = true;
        }
        return;
    }
    
    // Логируем фрейм только в режиме отладки
    if (!window.drawLogged) {
        console.log('[draw] 🎨 Первый фрейм! player:', !!player, 'isGamePaused:', isGamePaused, 'isDead:', isDead);
        window.drawLogged = true;
    }

    ctx.save();

    // Покачивание камеры в FRENZY MODE
    if (frenzyActive) {
        applyFrenzyShake();
    }

    // Synthwave фон
    drawSynthwaveBackground();

    drawWalls();
    drawProceduralBuildings();
    drawRoomObjects();
    drawMapObjects();
    drawBlood();
    drawCasings();
    drawHealthPacks();
    drawBodyParts();
    drawBullets();
    drawEnemies();
    drawMultiplayerPlayers();
    drawPlayer();
    drawKillTexts();
    drawFrenzyOverlay();
    
    // Эффекты FRENZY MODE
    addFrenzyGlitchEffect();
    addFrenzyNoise();
    addFrenzyFlash();
    
    ctx.restore();

    drawMinimap();
}

// Рисование текстов убийств с анимацией
function drawKillTexts() {
    for (let i = killTexts.length - 1; i >= 0; i--) {
        let kt = killTexts[i];
        
        // Мировые координаты (для текстов в мире)
        const p = worldToScreen(kt.x, kt.y);
        
        // Подъем текста вверх
        const yOffset = (1 - kt.life / kt.maxLife) * 40;
        const displayY = p.y - yOffset;
        
        // Прозрачность (появляется в начале, исчезает в конце)
        const alpha = kt.life > kt.maxLife * 0.8 
            ? (kt.life - kt.maxLife * 0.8) / (kt.maxLife * 0.2)
            : kt.life / (kt.maxLife * 0.8);
        
        ctx.save();
        ctx.globalAlpha = Math.min(1, alpha);
        ctx.fillStyle = kt.color;
        ctx.font = `bold ${kt.size}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Контур для видимости
        ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeText(kt.text, p.x, displayY);
        ctx.fillText(kt.text, p.x, displayY);
        
        ctx.restore();
    }
}

// Рисование пульсирующего оверлея FRENZY MODE
function drawFrenzyOverlay() {
    if (!frenzyActive) return;
    
    // Агрессивный пульс
    const pulsePhase = (FRENZY_DURATION - frenzyTimer) % 30 / 30;
    const pulseAlpha = Math.abs(Math.sin(pulsePhase * Math.PI)) * 0.2 + 0.15;
    
    ctx.save();
    ctx.globalAlpha = pulseAlpha;
    ctx.fillStyle = '#ff00ff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Агрессивные неоновые края
    ctx.strokeStyle = '#ff00ff';
    ctx.lineWidth = 5;
    ctx.globalAlpha = pulseAlpha * 2;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20;
    ctx.strokeRect(2, 2, canvas.width - 4, canvas.height - 4);
    
    ctx.restore();
    
    // Анимированная ЭКРАННАЯ надпись FRENZY
    const remainingSeconds = Math.ceil(frenzyTimer / 60);
    const time = Date.now();
    const pulse = Math.sin(time * 0.008) * 0.3 + 0.7;
    
    ctx.save();
    ctx.font = `bold ${32 + pulse * 20}px Arial`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    
    // Основной текст
    ctx.fillStyle = `rgba(255, 0, 255, ${Math.min(1, pulse + 0.5)})`;
    ctx.shadowColor = '#ff00ff';
    ctx.shadowBlur = 20 + pulse * 10;
    ctx.shadowOffsetX = Math.sin(time * 0.01) * 3;
    ctx.shadowOffsetY = Math.cos(time * 0.01) * 3;
    ctx.fillText(`FRENZY ${remainingSeconds}s`, canvas.width - 20, 20);
    
    // Эхо текста (глич эффект)
    ctx.globalAlpha = Math.random() * 0.3;
    ctx.fillStyle = '#00ffff';
    ctx.shadowBlur = 0;
    ctx.fillText(`FRENZY ${remainingSeconds}s`, canvas.width - 20 + Math.random() * 5 - 2, 20 + Math.random() * 5 - 2);
    
    ctx.restore();
}

// Покачивание камеры
function applyFrenzyShake() {
    const shakeIntensity = 8 + Math.sin(Date.now() * 0.01) * 4;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    
    ctx.translate(shakeX, shakeY);
}

// Вспышки света
function addFrenzyFlash() {
    if (!frenzyActive) return;
    
    // Вспышки с четкими интервалами
    const time = Date.now() % 200;
    const flashAlpha = time < 50 ? (50 - time) / 50 * 0.5 : 0;
    
    if (flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = flashAlpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

// Эффект глича с фиолетовыми полосками
function addFrenzyGlitchEffect() {
    if (!frenzyActive) return;
    
    ctx.save();
    
    // Усиленные горизонтальные смещения (glitch)
    for (let i = 0; i < 5; i++) {
        const glitchY = Math.random() * canvas.height;
        const glitchHeight = Math.random() * 50 + 15;
        const glitchOffset = (Math.random() - 0.5) * 40;
        
        ctx.globalAlpha = Math.random() * 0.6 + 0.3;
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(glitchOffset, glitchY, canvas.width, glitchHeight);
    }
    
    // Агрессивные вертикальные полоски
    for (let i = 0; i < 10; i++) {
        const glitchX = Math.random() * canvas.width;
        const glitchWidth = Math.random() * 15 + 3;
        
        ctx.globalAlpha = Math.random() * 0.5 + 0.2;
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(glitchX, 0, glitchWidth, canvas.height);
    }
    
    // Цветовое раздвоение RGB для большей брутальности
    const glitchAlpha = Math.sin(Date.now() * 0.015) * 0.25 + 0.2;
    
    // Красный сдвиг
    ctx.globalAlpha = glitchAlpha;
    ctx.fillStyle = 'rgba(255, 0, 150, 0.5)';
    ctx.fillRect(Math.random() * 20 - 10, 0, canvas.width, canvas.height);
    
    // Голубой сдвиг
    ctx.globalAlpha = glitchAlpha * 0.7;
    ctx.fillStyle = 'rgba(0, 255, 255, 0.3)';
    ctx.fillRect(Math.random() * -20 + 10, 0, canvas.width, canvas.height);
    
    ctx.restore();
}

// Эффект помех (VHS/Glitch noise)
function addFrenzyNoise() {
    if (!frenzyActive) return;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Случайные горизонтальные полосы помех (больше)
    for (let i = 0; i < canvas.height; i += Math.random() * 8 + 3) {
        const offset = Math.floor(i * canvas.width * 4);
        for (let j = 0; j < canvas.width * 4; j += 4) {
            if (Math.random() > 0.6) {
                data[offset + j] = Math.random() * 255;     // R
                data[offset + j + 1] = 0;                    // G
                data[offset + j + 2] = Math.random() * 255;  // B (фиолетовый)
                data[offset + j + 3] = Math.random() * 120;  // A (более видимый)
            }
        }
    }
    
    ctx.putImageData(imageData, 0, 0);
}