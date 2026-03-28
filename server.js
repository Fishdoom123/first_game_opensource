// server.js — WebSocket мультиплеер + раздача игры по HTTP (один порт)
const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.NEON_WS_PORT ? parseInt(process.env.NEON_WS_PORT, 10) : 8080;
const HOST = process.env.NEON_WS_HOST || '0.0.0.0';

const ROOT = path.resolve(__dirname);
const FORBIDDEN_SEGMENTS = new Set(['node_modules', 'release', '.git', 'electron']);

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.mjs': 'text/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.txt': 'text/plain; charset=utf-8',
    '.map': 'application/json'
};

function handleHttpRequest(req, res) {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405);
        res.end();
        return;
    }
    let pathname;
    try {
        pathname = new URL(req.url, 'http://127.0.0.1').pathname;
    } catch (e) {
        res.writeHead(400);
        res.end();
        return;
    }
    let segments = pathname.split('/').filter(Boolean);
    if (segments.length === 0) {
        segments = ['index.html'];
    }
    if (segments.some((s) => s === '..' || s.startsWith('.'))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    if (segments.some((s) => FORBIDDEN_SEGMENTS.has(s))) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    const filePath = path.join(ROOT, ...segments);
    const rootNorm = ROOT + path.sep;
    if (!filePath.startsWith(rootNorm) && filePath !== ROOT) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }
    fs.stat(filePath, (err, st) => {
        if (err || !st.isFile()) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
        res.setHeader('Cache-Control', 'no-cache');
        if (req.method === 'HEAD') {
            res.end();
            return;
        }
        fs.createReadStream(filePath).pipe(res);
    });
}

const server = http.createServer(handleHttpRequest);
const wss = new WebSocket.Server({ server });

let serverListening = false;

// Хранилище игровых сессий
const games = new Map();
const players = new Map();

// Типы сообщений
const MESSAGE_TYPES = {
    // Клиент -> Сервер
    CONNECT: 'CONNECT',
    CREATE_GAME: 'CREATE_GAME',
    JOIN_GAME: 'JOIN_GAME',
    GET_GAMES: 'GET_GAMES',
    PLAYER_UPDATE: 'PLAYER_UPDATE',
    SHOOT: 'SHOOT',
    CHANGE_WEAPON: 'CHANGE_WEAPON',
    DISCONNECT: 'DISCONNECT',
    
    // Сервер -> Клиент
    GAME_STATE: 'GAME_STATE',
    GAMES_LIST: 'GAMES_LIST',
    PLAYER_JOINED: 'PLAYER_JOINED',
    PLAYER_LEFT: 'PLAYER_LEFT',
    ENEMY_UPDATE: 'ENEMY_UPDATE',
    BULLET_FIRED: 'BULLET_FIRED',
    PLAYER_HIT: 'PLAYER_HIT',
    GAME_OVER: 'GAME_OVER',
    ERROR: 'ERROR'
};

// Класс игровой сессии
class GameSession {
    constructor(id, mode, maxPlayers = 4) {
        this.id = id;
        this.mode = mode; // 'coop' или 'pvp'
        this.maxPlayers = maxPlayers;
        this.players = new Map();
        this.enemies = [];
        this.bullets = [];
        this.state = 'waiting'; // waiting, playing, finished
        this.currentRoom = 0;
        this.score = 0;
        this.startTime = Date.now();
    }

    addPlayer(playerId, playerData) {
        if (this.players.size >= this.maxPlayers) {
            return false;
        }
        this.players.set(playerId, {
            id: playerId,
            name: playerData.name,
            x: 400 + Math.random() * 100,
            y: 300 + Math.random() * 100,
            angle: 0,
            health: 100,
            maxHealth: 100,
            ammo: 12,
            maxAmmo: 12,
            score: 0,
            weaponType: 'pistol',
            alive: true,
            joinedAt: Date.now()
        });
        return true;
    }

    removePlayer(playerId) {
        this.players.delete(playerId);
        return this.players.size === 0; // Вернуть true если сессия пуста
    }

    updatePlayerPosition(playerId, x, y, angle) {
        const player = this.players.get(playerId);
        if (player) {
            player.x = x;
            player.y = y;
            player.angle = angle;
        }
    }

    getGameState() {
        return {
            id: this.id,
            mode: this.mode,
            state: this.state,
            players: Array.from(this.players.values()),
            enemies: this.enemies,
            bullets: this.bullets,
            score: this.score,
            currentRoom: this.currentRoom
        };
    }
}

// Обработка новых подключений
wss.on('connection', (ws) => {
    console.log('Новый клиент подключился');
    
    let playerId = null;
    let gameId = null;

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            // Обработать сообщение и получить обновленные ID
            const result = handleMessage(ws, data, playerId, gameId);
            if (result) {
                if (result.playerId) playerId = result.playerId;
                if (result.gameId) gameId = result.gameId;
            }
        } catch (e) {
            console.error('Ошибка парсинга:', e);
            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.ERROR,
                message: 'Ошибка парсинга сообщения'
            }));
        }
    });

    ws.on('close', () => {
        if (playerId && gameId) {
            const game = games.get(gameId);
            if (game) {
                const isEmpty = game.removePlayer(playerId);
                if (isEmpty) {
                    games.delete(gameId);
                }
                // Уведомить остальных игроков
                broadcastToGame(gameId, {
                    type: MESSAGE_TYPES.PLAYER_LEFT,
                    playerId: playerId
                });
            }
            players.delete(playerId);
        }
        console.log('Клиент отключился');
    });
});

function handleMessage(ws, data, playerId, gameId) {
    const type = data.type;
    const result = {};
    
    console.log('[handleMessage] Тип сообщения:', type, 'playerId:', playerId);

    switch (type) {
        case MESSAGE_TYPES.CONNECT: {
            // Генерируем ID игрока
            const pid = 'player_' + Math.random().toString(36).substr(2, 9);
            players.set(pid, {
                ws: ws,
                name: data.name || 'Player',
                gameId: null
            });
            console.log('Игрок подключился:', pid);
            result.playerId = pid;
            
            // Отправить подтверждение подключения
            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.CONNECT,
                playerId: pid,
                message: 'Connected'
            }));
            break;
        }

        case MESSAGE_TYPES.CREATE_GAME: {
            console.log('[CREATE_GAME] Получено сообщение. playerId:', playerId);
            if (!playerId) {
                console.log('[CREATE_GAME] playerId не определен!');
                ws.send(JSON.stringify({
                    type: MESSAGE_TYPES.ERROR,
                    message: 'Сначала подключитесь'
                }));
                break;
            }
            
            const gid = 'game_' + Math.random().toString(36).substr(2, 9);
            const game = new GameSession(gid, data.mode, data.maxPlayers || 4);
            game.addPlayer(playerId, { name: players.get(playerId).name });
            games.set(gid, game);
            players.get(playerId).gameId = gid;
            result.gameId = gid;
            
            console.log('[CREATE_GAME] Игра создана. GameId:', gid, 'Режим:', data.mode);

            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.GAME_STATE,
                gameId: gid,
                state: game.getGameState()
            }));
            console.log('[CREATE_GAME] GAME_STATE отправлен клиенту');
            break;
        }

        case MESSAGE_TYPES.GET_GAMES: {
            // Отправить список всех открытых игр
            const gamesList = Array.from(games.values())
                .filter(game => game.state === 'waiting' && game.players.size < game.maxPlayers)
                .map(game => ({
                    id: game.id,
                    mode: game.mode,
                    players: game.players.size,
                    maxPlayers: game.maxPlayers,
                    createdAt: game.startTime
                }));
            
            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.GAMES_LIST,
                games: gamesList
            }));
            console.log('[GET_GAMES] Отправлено', gamesList.length, 'игр');
            break;
        }

        case MESSAGE_TYPES.JOIN_GAME: {
            if (!playerId) {
                ws.send(JSON.stringify({
                    type: MESSAGE_TYPES.ERROR,
                    message: 'Сначала подключитесь'
                }));
                break;
            }
            
            const game = games.get(data.gameId);
            if (!game) {
                ws.send(JSON.stringify({
                    type: MESSAGE_TYPES.ERROR,
                    message: 'Игра не найдена'
                }));
                break;
            }

            if (!game.addPlayer(playerId, { name: players.get(playerId).name })) {
                ws.send(JSON.stringify({
                    type: MESSAGE_TYPES.ERROR,
                    message: 'Слоты заполнены'
                }));
                break;
            }

            players.get(playerId).gameId = data.gameId;
            result.gameId = data.gameId;

            // Отправить состояние новому игроку
            ws.send(JSON.stringify({
                type: MESSAGE_TYPES.GAME_STATE,
                gameId: data.gameId,
                state: game.getGameState()
            }));

            // Уведомить всех в сессии (полный список — чтобы клиенты синхронизировали remote-игроков)
            broadcastToGame(data.gameId, {
                type: MESSAGE_TYPES.PLAYER_JOINED,
                player: game.players.get(playerId),
                players: Array.from(game.players.values()),
                totalPlayers: game.players.size
            });
            console.log('Игрок присоединился к игре:', data.gameId);
            break;
        }

        case MESSAGE_TYPES.PLAYER_UPDATE: {
            if (gameId) {
                const game = games.get(gameId);
                if (game) {
                    game.updatePlayerPosition(playerId, data.x, data.y, data.angle);
                    // Рассылаем обновление всем в игре
                    broadcastToGame(gameId, {
                        type: MESSAGE_TYPES.PLAYER_UPDATE,
                        playerId: playerId,
                        x: data.x,
                        y: data.y,
                        angle: data.angle
                    });
                }
            }
            break;
        }

        case MESSAGE_TYPES.SHOOT: {
            if (gameId) {
                const game = games.get(gameId);
                if (game) {
                    // Рассылаем выстрел всем
                    broadcastToGame(gameId, {
                        type: MESSAGE_TYPES.SHOOT,
                        playerId: playerId,
                        x: data.x,
                        y: data.y,
                        vx: data.vx,
                        vy: data.vy
                    });
                }
            }
            break;
        }

        case MESSAGE_TYPES.CHANGE_WEAPON: {
            if (gameId) {
                const game = games.get(gameId);
                if (game) {
                    const player = game.players.get(playerId);
                    if (player) {
                        player.weaponType = data.weaponType;
                        player.ammo = data.ammo;
                        player.maxAmmo = data.maxAmmo;
                    }
                    broadcastToGame(gameId, {
                        type: MESSAGE_TYPES.CHANGE_WEAPON,
                        playerId: playerId,
                        weaponType: data.weaponType,
                        ammo: data.ammo
                    });
                }
            }
            break;
        }
    }
    
    return result;
}

function broadcastToGame(gameId, data) {
    const game = games.get(gameId);
    if (!game) return;

    const message = JSON.stringify(data);
    game.players.forEach(player => {
        const playerObj = players.get(player.id);
        if (playerObj && playerObj.ws.readyState === WebSocket.OPEN) {
            playerObj.ws.send(message);
        }
    });
}

function startServer() {
    if (serverListening) {
        return Promise.resolve({ port: PORT, host: HOST });
    }
    return new Promise((resolve, reject) => {
        const onErr = (err) => {
            server.removeListener('error', onErr);
            reject(err);
        };
        server.once('error', onErr);
        server.listen(PORT, HOST, () => {
            server.removeListener('error', onErr);
            serverListening = true;
            console.log(`HTTP + WebSocket на ${HOST}:${PORT}`);
            console.log(`Откройте игру: http://127.0.0.1:${PORT}/`);
            console.log(`WebSocket: ws://127.0.0.1:${PORT} (в LAN: ws://<IP>:${PORT})`);
            resolve({ port: PORT, host: HOST });
        });
    });
}

function stopServer() {
    return new Promise((resolve) => {
        if (!serverListening) {
            resolve();
            return;
        }
        wss.clients.forEach((ws) => {
            try {
                ws.terminate();
            } catch (e) {}
        });
        try {
            wss.close();
        } catch (e) {}
        server.close(() => {
            serverListening = false;
            resolve();
        });
    });
}

module.exports = { startServer, stopServer, PORT, HOST, server, wss };

if (require.main === module) {
    startServer().catch((err) => {
        console.error('Не удалось запустить сервер:', err.message);
        process.exit(1);
    });
}
