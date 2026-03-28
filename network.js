// network.js - Клиентский модуль сетевого взаимодействия

class NetworkManager {
    constructor() {
        this.ws = null;
        this.gameId = null;
        this.playerId = null;
        this.isConnected = false;
        this.messageHandlers = new Map();
        this.serverUrl = 'ws://localhost:8080';
        
        // Для переподключения
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 2000;

        this._loadSavedServerUrl();
    }

    _loadSavedServerUrl() {
        try {
            const s = localStorage.getItem('neonShooterWsUrl');
            if (s && /^wss?:\/\/.+/i.test(s.trim())) {
                this.serverUrl = s.trim();
            }
        } catch (e) {}
    }

    /** Сохраняется в localStorage (игра по LAN / своему серверу) */
    setServerUrl(url) {
        const u = (url || '').trim();
        if (!u) return;
        if (!/^wss?:\/\/.+/i.test(u)) {
            console.warn('[Network] Адрес должен быть вида ws://... или wss://...');
            return;
        }
        this.serverUrl = u;
        try {
            localStorage.setItem('neonShooterWsUrl', u);
        } catch (e) {}
    }

    getServerUrl() {
        return this.serverUrl;
    }

    // Типы сообщений (должны совпадать с сервером)
    static MESSAGE_TYPES = {
        CONNECT: 'CONNECT',
        CREATE_GAME: 'CREATE_GAME',
        JOIN_GAME: 'JOIN_GAME',
        GET_GAMES: 'GET_GAMES',
        PLAYER_UPDATE: 'PLAYER_UPDATE',
        SHOOT: 'SHOOT',
        CHANGE_WEAPON: 'CHANGE_WEAPON',
        DISCONNECT: 'DISCONNECT',
        
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

    // Подключиться к серверу
    connect(playerName = 'Player') {
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.serverUrl);

                this.ws.onopen = () => {
                    console.log('[Network] Подключено к серверу');
                    
                    // Отправить информацию о подключении
                    this.send({
                        type: NetworkManager.MESSAGE_TYPES.CONNECT,
                        name: playerName
                    });
                };

                this.ws.onmessage = (event) => {
                    const data = JSON.parse(event.data);
                    
                    // Если это подтверждение подключения, сохранить playerId
                    if (data.type === NetworkManager.MESSAGE_TYPES.CONNECT && data.playerId) {
                        this.playerId = data.playerId;
                        this.isConnected = true;
                        this.reconnectAttempts = 0;
                        console.log('[Network] ID получен:', this.playerId);
                        resolve();
                    }
                    
                    this.handleMessage(data);
                };

                this.ws.onerror = (error) => {
                    console.error('[Network] Ошибка:', error);
                    reject(error);
                };

                this.ws.onclose = () => {
                    console.log('[Network] Отключено от сервера');
                    this.isConnected = false;
                    this.attemptReconnect();
                };
            } catch (error) {
                reject(error);
            }
        });
    }

    // Попытка переподключения
    attemptReconnect() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            console.log(`[Network] Переподключение (попытка ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
            setTimeout(() => {
                this.connect().catch(() => {});
            }, this.reconnectDelay * this.reconnectAttempts);
        }
    }

    // Отправить сообщение
    send(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        } else {
            console.warn('[Network] Соединение закрыто, сообщение не отправлено');
        }
    }

    // Обработать входящее сообщение
    handleMessage(data) {
        const type = data.type;

        console.log('[network.handleMessage] Тип сообщения:', type, 'Обработчики:', this.messageHandlers.has(type));

        // Сохранить ID игрока если это первое сообщение
        if (type === NetworkManager.MESSAGE_TYPES.GAME_STATE) {
            this.gameId = data.gameId;
            console.log('[network] GAME_STATE получено! gameId:', data.gameId);
            console.log('[network] ПОЛНЫЕ данные:', JSON.stringify(data));
        }

        // Вызвать обработчик если он зарегистрирован
        if (this.messageHandlers.has(type)) {
            const handlers = this.messageHandlers.get(type);
            console.log('[network] Найдено обработчиков для', type + ':', handlers.length);
            handlers.forEach((handler, idx) => {
                try {
                    console.log('[network] Вызываем обработчик', idx, 'для типа', type);
                    // Передаём ПОЛНЫЕ данные, не просто payload!
                    handler(data);
                } catch (error) {
                    console.error(`[network] Ошибка в обработчике ${type}:`, error);
                }
            });
        } else {
            console.log('[network] Нет обработчиков для типа:', type);
        }
    }

    // Зарегистрировать обработчик сообщения
    on(messageType, handler) {
        if (!this.messageHandlers.has(messageType)) {
            this.messageHandlers.set(messageType, []);
        }
        this.messageHandlers.get(messageType).push(handler);
    }

    // Удалить обработчик
    off(messageType, handler) {
        if (this.messageHandlers.has(messageType)) {
            const handlers = this.messageHandlers.get(messageType);
            const index = handlers.indexOf(handler);
            if (index !== -1) {
                handlers.splice(index, 1);
            }
        }
    }

    // Создать новую игру
    createGame(mode, maxPlayers) {
        this.send({
            type: NetworkManager.MESSAGE_TYPES.CREATE_GAME,
            mode: mode, // 'coop' или 'pvp'
            maxPlayers: maxPlayers
        });
    }

    // Получить список всех открытых игр
    getGames() {
        this.send({
            type: NetworkManager.MESSAGE_TYPES.GET_GAMES
        });
    }

    // Присоединиться к игре
    joinGame(gameId) {
        this.send({
            type: NetworkManager.MESSAGE_TYPES.JOIN_GAME,
            gameId: gameId
        });
    }

    // Отправить обновление позиции игрока
    updatePlayerPosition(x, y, angle) {
        this.send({
            type: NetworkManager.MESSAGE_TYPES.PLAYER_UPDATE,
            x: Math.round(x),
            y: Math.round(y),
            angle: angle
        });
    }

    // Отправить выстрел
    shoot(x, y, vx, vy) {
        this.send({
            type: NetworkManager.MESSAGE_TYPES.SHOOT,
            x: Math.round(x),
            y: Math.round(y),
            vx: Math.round(vx * 100) / 100,
            vy: Math.round(vy * 100) / 100
        });
    }

    // Отправить смену оружия
    changeWeapon(weaponType, ammo, maxAmmo) {
        this.send({
            type: NetworkManager.MESSAGE_TYPES.CHANGE_WEAPON,
            weaponType: weaponType,
            ammo: ammo,
            maxAmmo: maxAmmo
        });
    }

    // Получить список открытых игр (заглушка - можно расширить)
    getOpenGames() {
        // TODO: Реализовать получение списка игр с сервера
        return [];
    }

    // Отключиться от сервера
    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.isConnected = false;
        }
    }
}

// Создать глобальный экземпляр
const networkManager = new NetworkManager();
