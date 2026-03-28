// console-logger.js - Минимальная консоль отладки на странице
// Добавить ДО всех других скриптов в index.html

const CONSOLE_LOGS_MAX = 20;
let CONSOLE_LOGS = [];

// Перех вата console.log
const originalConsoleLog = window.console.log;
window.console.log = function(...args) {
    const msg = args.map(arg => {
        if (typeof arg === 'object') {
            try {
                return JSON.stringify(arg).substring(0, 50);
            } catch {
                return String(arg);
            }
        }
        return String(arg);
    }).join(' ');
    
    CONSOLE_LOGS.push(msg);
    if (CONSOLE_LOGS.length > CONSOLE_LOGS_MAX) {
        CONSOLE_LOGS.shift();
    }
    
    // Обновляем элемент на странице если он существует
    const debugDiv = document.getElementById('debug-console');
    if (debugDiv) {
        debugDiv.innerHTML = CONSOLE_LOGS.map(log => `<div>${log}</div>`).join('');
    }
    
    originalConsoleLog(...args);
};

// Создаем стиль для консоли
const style = document.createElement('style');
style.textContent = `
    #debug-console {
        position: fixed;
        bottom: 10px;
        right: 10px;
        width: 400px;
        max-height: 150px;
        background: rgba(0, 0, 0, 0.8);
        color: #0f0;
        font-family: monospace;
        font-size: 12px;
        padding: 10px;
        border: 2px solid #0f0;
        overflow-y: auto;
        z-index: 99999;
        border-radius: 5px;
    }
    #debug-console div {
        margin: 2px 0;
        padding: 2px 0;
    }
`;
document.head.appendChild(style);

// Создаем div консоли
const debugDiv = document.createElement('div');
debugDiv.id = 'debug-console';
debugDiv.style.display = 'none';

// Добавляем кнопку для открытия/закрытия консоли
const toggleBtn = document.createElement('button');
toggleBtn.textContent = '🔍 DEBUG';
toggleBtn.style.cssText = `
    position: fixed;
    bottom: 10px;
    right: 420px;
    z-index: 99998;
    padding: 5px 10px;
    background: #0f0;
    color: #000;
    border: none;
    cursor: pointer;
    border-radius: 3px;
    font-weight: bold;
`;
toggleBtn.onclick = () => {
    debugDiv.style.display = debugDiv.style.display === 'none' ? 'block' : 'none';
};

document.body.appendChild(toggleBtn);
document.body.appendChild(debugDiv);

console.log('[CONSOLE-LOGGER] Инициализирована');
