// procedural.js — процедурная генерация: квартальная сетка, дороги, объекты не забивают проезды

class ProceduralGenerator {
    constructor(chunkSize = 640) {
        this.chunkSize = chunkSize;
        this.loadedChunks = new Map();
        this.seed = 12345;

        /** Ширина проезжей части (достаточно для игрока и обхода) */
        this.roadWidth = 52;
        this.roadHalf = this.roadWidth / 2;

        /** Компактные шаблоны зданий под квартал (вне дорог) */
        this.procBuildingTypes = [
            { name: 'block_a', width: 88, height: 72, wallThickness: 8, color: '#3a3a45' },
            { name: 'block_b', width: 104, height: 80, wallThickness: 9, color: '#333340' },
            { name: 'block_c', width: 96, height: 96, wallThickness: 10, color: '#2e2e38' },
            { name: 'garage', width: 72, height: 56, wallThickness: 7, color: '#404050' },
            { name: 'kiosk', width: 56, height: 48, wallThickness: 6, color: '#45455a' }
        ];
    }

    seededRandom(x, y, offset = 0) {
        const n = Math.sin(x * 12.9898 + y * 78.233 + offset * 45.164) * 43758.5453;
        return n - Math.floor(n);
    }

    /** Локальные координаты 0..chunkSize: попадает ли точка на дорогу (рамка + крест) */
    isLocalOnRoad(lx, ly) {
        const S = this.chunkSize;
        const R = this.roadWidth;
        const mid = S / 2;
        const h = this.roadHalf;
        if (lx < R || lx > S - R || ly < R || ly > S - R) return true;
        if (Math.abs(lx - mid) < h) return true;
        if (Math.abs(ly - mid) < h) return true;
        return false;
    }

    isWorldOnRoad(worldX, worldY) {
        const S = this.chunkSize;
        const lx = ((worldX % S) + S) % S;
        const ly = ((worldY % S) + S) % S;
        return this.isLocalOnRoad(lx, ly);
    }

    /** true, если AABB объекта хоть немного задевает проезжую часть */
    objectAABBTouchesRoad(worldX, worldY, size) {
        const h = size / 2;
        const pts = [
            [worldX - h, worldY - h],
            [worldX + h, worldY - h],
            [worldX - h, worldY + h],
            [worldX + h, worldY + h],
            [worldX, worldY]
        ];
        for (const [px, py] of pts) {
            if (this.isWorldOnRoad(px, py)) return true;
        }
        return false;
    }

    /** Границы квадранта чанка (i=0 лево, i=1 право; j=0 верх, j=1 низ) */
    getQuadrantLocalBounds(qi, qj) {
        const S = this.chunkSize;
        const R = this.roadWidth;
        const mid = S / 2;
        const h = this.roadHalf;
        if (qi === 0 && qj === 0) return { minX: R, maxX: mid - h, minY: R, maxY: mid - h };
        if (qi === 1 && qj === 0) return { minX: mid + h, maxX: S - R, minY: R, maxY: mid - h };
        if (qi === 0 && qj === 1) return { minX: R, maxX: mid - h, minY: mid + h, maxY: S - R };
        return { minX: mid + h, maxX: S - R, minY: mid + h, maxY: S - R };
    }

    /** Прямоугольник здания (полный корпус) для проверок коллизий */
    buildingFootprint(b) {
        return {
            left: b.x - b.width / 2,
            right: b.x + b.width / 2,
            top: b.y - b.height / 2,
            bottom: b.y + b.height / 2
        };
    }

    /**
     * Здание вписано в квартал + отступ от «тротуара» у дороги
     */
    generateBuildingInQuadrant(chunkWorldX, chunkWorldY, qi, qj, chunkX, chunkY) {
        const qb = this.getQuadrantLocalBounds(qi, qj);
        const pad = 18;
        const innerW = qb.maxX - qb.minX - pad * 2;
        const innerH = qb.maxY - qb.minY - pad * 2;
        if (innerW < 70 || innerH < 55) return null;

        const typeIdx = Math.floor(
            this.seededRandom(chunkX * 17 + qi, chunkY * 19 + qj, this.seed + 3) * this.procBuildingTypes.length
        );
        let spec = { ...this.procBuildingTypes[typeIdx] };
        spec.width = Math.min(spec.width, innerW - 4);
        spec.height = Math.min(spec.height, innerH - 4);

        const rx = this.seededRandom(chunkX * 5 + qi * 11, chunkY * 7 + qj * 13, this.seed + 1);
        const ry = this.seededRandom(chunkX * 5 + qi * 11, chunkY * 7 + qj * 13, this.seed + 2);
        const localCx = qb.minX + pad + spec.width / 2 + rx * Math.max(0, innerW - spec.width);
        const localCy = qb.minY + pad + spec.height / 2 + ry * Math.max(0, innerH - spec.height);

        const baseX = chunkWorldX + localCx;
        const baseY = chunkWorldY + localCy;

        const building = {
            x: baseX,
            y: baseY,
            width: spec.width,
            height: spec.height,
            wallThickness: spec.wallThickness,
            type: spec.name,
            color: spec.color,
            walls: []
        };

        const bx = building.x - building.width / 2;
        const by = building.y - building.height / 2;
        const wt = building.wallThickness;

        building.walls.push(
            { x: bx, y: by, width: building.width, height: wt },
            { x: bx, y: by + building.height - wt, width: building.width, height: wt },
            { x: bx, y: by, width: wt, height: building.height },
            { x: bx + building.width - wt, y: by, width: wt, height: building.height }
        );

        // Редкие внутренние перегородки только в крупных квадрантах
        if (
            innerW > 130 &&
            innerH > 110 &&
            this.seededRandom(chunkX + qi, chunkY + qj, this.seed + 9) > 0.72
        ) {
            building.walls.push({
                x: bx + wt + 8,
                y: by + building.height / 2 - 4,
                width: building.width - 2 * wt - 16,
                height: 8
            });
        }

        return building;
    }

    canPlaceObject(worldX, worldY, size, chunk) {
        const half = size / 2;
        if (this.objectAABBTouchesRoad(worldX, worldY, size)) return false;

        const margin = 14;
        for (const b of chunk.buildings) {
            const f = this.buildingFootprint(b);
            if (
                worldX + half > f.left - margin &&
                worldX - half < f.right + margin &&
                worldY + half > f.top - margin &&
                worldY - half < f.bottom + margin
            ) {
                return false;
            }
        }

        for (const o of chunk.objects) {
            const d = Math.hypot(o.x - worldX, o.y - worldY);
            if (d < (o.size + size) / 2 + 14) return false;
        }

        for (const w of chunk.walls) {
            if (circleRectCollision(worldX, worldY, half + 2, w.x, w.y, w.width, w.height)) {
                return false;
            }
        }

        return true;
    }

    scatterDecorObjects(chunk, chunkX, chunkY) {
        const wx0 = chunk.worldX;
        const wy0 = chunk.worldY;
        const attempts = 22;
        const size = 22;

        for (let n = 0; n < attempts; n++) {
            const qi = this.seededRandom(chunkX, n, this.seed + 80 + chunkY) > 0.5 ? 1 : 0;
            const qj = this.seededRandom(chunkY, n, this.seed + 81 + chunkX) > 0.5 ? 1 : 0;
            const qb = this.getQuadrantLocalBounds(qi, qj);

            const lx = qb.minX + 12 + this.seededRandom(chunkX + n, chunkY, this.seed + 90) * (qb.maxX - qb.minX - 24);
            const ly = qb.minY + 12 + this.seededRandom(chunkX, chunkY + n, this.seed + 91) * (qb.maxY - qb.minY - 24);

            if (this.isLocalOnRoad(lx, ly)) continue;

            const worldX = wx0 + lx;
            const worldY = wy0 + ly;

            if (this.seededRandom(chunkX * 31 + n, chunkY * 29, this.seed + 92) > 0.42) continue;

            const type = this.seededRandom(worldX, worldY, 93) > 0.55 ? 'crate' : 'barrel';

            if (this.canPlaceObject(worldX, worldY, size, chunk)) {
                chunk.objects.push({ x: worldX, y: worldY, size, type });
            }
        }
    }

    generateChunk(chunkX, chunkY) {
        const chunk = {
            x: chunkX,
            y: chunkY,
            worldX: chunkX * this.chunkSize,
            worldY: chunkY * this.chunkSize,
            walls: [],
            objects: [],
            buildings: []
        };

        const wx0 = chunk.worldX;
        const wy0 = chunk.worldY;

        for (let qi = 0; qi < 2; qi++) {
            for (let qj = 0; qj < 2; qj++) {
                const placeChance = this.seededRandom(
                    chunkX * 100 + qi * 17,
                    chunkY * 100 + qj * 23,
                    this.seed + 50
                );
                // ~50% кварталов со зданием — больше дворов и просветов
                if (placeChance > 0.5) {
                    const b = this.generateBuildingInQuadrant(wx0, wy0, qi, qj, chunkX, chunkY);
                    if (b) {
                        chunk.buildings.push(b);
                        chunk.walls.push(...b.walls);
                    }
                }
            }
        }

        this.scatterDecorObjects(chunk, chunkX, chunkY);

        return chunk;
    }

    getChunk(chunkX, chunkY) {
        const key = `${chunkX},${chunkY}`;
        if (this.loadedChunks.has(key)) {
            return this.loadedChunks.get(key);
        }
        const chunk = this.generateChunk(chunkX, chunkY);
        this.loadedChunks.set(key, chunk);
        return chunk;
    }

    getChunksAroundPosition(worldX, worldY, radius = 2) {
        const chunks = [];
        const centerChunkX = Math.floor(worldX / this.chunkSize);
        const centerChunkY = Math.floor(worldY / this.chunkSize);

        for (let dx = -radius; dx <= radius; dx++) {
            for (let dy = -radius; dy <= radius; dy++) {
                chunks.push(this.getChunk(centerChunkX + dx, centerChunkY + dy));
            }
        }

        return chunks;
    }

    getObjectsAround(worldX, worldY, radius = 2) {
        const chunks = this.getChunksAroundPosition(worldX, worldY, radius);
        const allObjects = [];
        chunks.forEach(chunk => {
            allObjects.push(...chunk.objects);
            allObjects.push(...chunk.walls);
        });
        return allObjects;
    }

    getBuildingsAround(worldX, worldY, radius = 2) {
        const chunks = this.getChunksAroundPosition(worldX, worldY, radius);
        const allBuildings = [];
        chunks.forEach(chunk => {
            allBuildings.push(...chunk.buildings);
        });
        return allBuildings;
    }

    findClearSpawn(worldMaxX, worldMaxY, playerRadius, margin = 70) {
        const pad = margin + playerRadius;
        const checkR = playerRadius + 3;
        const S = this.chunkSize;
        const mid = S / 2;

        const noWallOrPropHit = (px, py) => {
            const chunks = this.getChunksAroundPosition(px, py, 2);
            for (const chunk of chunks) {
                for (const wall of chunk.walls) {
                    if (circleRectCollision(px, py, checkR, wall.x, wall.y, wall.width, wall.height)) {
                        return false;
                    }
                }
                for (const obj of chunk.objects) {
                    const ox = obj.x - obj.size / 2;
                    const oy = obj.y - obj.size / 2;
                    if (circleRectCollision(px, py, checkR, ox, oy, obj.size, obj.size)) {
                        return false;
                    }
                }
            }
            return true;
        };

        const isClearOnRoad = (px, py) => {
            if (px < pad || py < pad || px > worldMaxX - pad || py > worldMaxY - pad) return false;
            if (!this.isWorldOnRoad(px, py)) return false;
            return noWallOrPropHit(px, py);
        };

        const isClearAnywhere = (px, py) => {
            if (px < pad || py < pad || px > worldMaxX - pad || py > worldMaxY - pad) return false;
            return noWallOrPropHit(px, py);
        };

        // Перекрёстки и магистрали — предсказуемые свободные точки
        for (let cx = 0; cx * S < worldMaxX - S; cx++) {
            for (let cy = 0; cy * S < worldMaxY - S; cy++) {
                const ox = cx * S;
                const oy = cy * S;
                const hub = [
                    { x: ox + mid, y: oy + mid },
                    { x: ox + mid, y: oy + this.roadHalf },
                    { x: ox + mid, y: oy + S - this.roadHalf },
                    { x: ox + this.roadHalf, y: oy + mid },
                    { x: ox + S - this.roadHalf, y: oy + mid }
                ];
                for (const p of hub) {
                    if (isClearOnRoad(p.x, p.y)) return p;
                }
            }
        }

        for (let wx = pad; wx < worldMaxX - pad; wx += 72) {
            for (let wy = pad; wy < worldMaxY - pad; wy += 72) {
                if (isClearOnRoad(wx, wy)) return { x: wx, y: wy };
            }
        }

        const cx = worldMaxX / 2;
        const cy = worldMaxY / 2;
        for (let d = 40; d < Math.min(worldMaxX, worldMaxY) / 2; d += 48) {
            for (let k = 0; k < 32; k++) {
                const a = (k / 32) * Math.PI * 2;
                const wx = cx + Math.cos(a) * d;
                const wy = cy + Math.sin(a) * d;
                if (isClearOnRoad(wx, wy)) return { x: wx, y: wy };
            }
        }

        for (let wx = pad; wx < worldMaxX - pad; wx += 100) {
            for (let wy = pad; wy < worldMaxY - pad; wy += 100) {
                if (isClearAnywhere(wx, wy)) return { x: wx, y: wy };
            }
        }

        return { x: Math.min(pad + 40, worldMaxX - pad), y: Math.min(pad + 40, worldMaxY - pad) };
    }

    cleanupChunks(worldX, worldY, keepRadius = 3) {
        const centerChunkX = Math.floor(worldX / this.chunkSize);
        const centerChunkY = Math.floor(worldY / this.chunkSize);

        for (const [key, chunk] of this.loadedChunks.entries()) {
            const dist = Math.abs(chunk.x - centerChunkX) + Math.abs(chunk.y - centerChunkY);
            if (dist > keepRadius) {
                this.loadedChunks.delete(key);
            }
        }
    }

    getStats() {
        return {
            loadedChunks: this.loadedChunks.size,
            chunkSize: this.chunkSize,
            totalBuildings: Array.from(this.loadedChunks.values()).reduce(
                (sum, c) => sum + (c.buildings ? c.buildings.length : 0),
                0
            )
        };
    }
}

const proceduralGen = new ProceduralGenerator(640);
