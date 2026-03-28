// debug.js - Система логирования для отладки браузера

const DEBUG_LOG_KEY = 'GAME_DEBUG_LOGS';
const MAX_LOGS = 100;

// Переопределяем console.log для сохранения
const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

function addDebugLog(msg, level = 'log') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}][${level.toUpperCase()}] ${msg}`;
    
    // Получаем существующие логи
    let logs = [];
    try {
        const stored = localStorage.getItem(DEBUG_LOG_KEY);
        if (stored) {
            logs = JSON.parse(stored);
        }
    } catch (e) {
        logs = [];
    }
    
    // Добавляем новый лог
    logs.push(logEntry);
    
    // Ограничиваем количество логов
    if (logs.length > MAX_LOGS) {
        logs = logs.slice(-MAX_LOGS);
    }
    
    // Сохраняем
    try {
        localStorage.setItem(DEBUG_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
        console.error('Cannot save debug logs to localStorage:', e);
    }
}

console.log = function(...args) {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    addDebugLog(msg, 'log');
    originalLog.apply(console, args);
};

console.warn = function(...args) {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    addDebugLog(msg, 'warn');
    originalWarn.apply(console, args);
};

console.error = function(...args) {
    const msg = args.map(a => typeof a === 'string' ? a : JSON.stringify(a)).join(' ');
    addDebugLog(msg, 'error');
    originalError.apply(console, args);
};

window.getDebugLogs = function() {
    try {
        const stored = localStorage.getItem(DEBUG_LOG_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {}
    return [];
};

window.clearDebugLogs = function() {
    try {
        localStorage.removeItem(DEBUG_LOG_KEY);
    } catch (e) {}
};

window.showDebugLogs = function() {
    const logs = window.getDebugLogs();
    console.log('=== DEBUG LOGS ===');
    logs.forEach(log => console.log(log));
    console.log('=================');
};

console.log('[DEBUG] Система логирования инициализирована');
