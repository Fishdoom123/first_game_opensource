// ui.js - Пользовательский интерфейс

// Анимация текста меню
function updateMenuTextEffect() {
    const title = document.querySelector('.menu-title');
    if (!title) return;

    const mainMenu = document.getElementById('mainMenu');
    if (!mainMenu || !mainMenu.classList.contains('active')) return;

    const time = Date.now() * 0.005;
    const scale = 1 + Math.sin(time) * 0.05;
    title.style.transform = `scale(${scale})`;
}

// Запуск музыки по клику (для Safari)
window.addEventListener('click', () => {
    if (typeof startBackgroundMusic === 'function') {
        startBackgroundMusic();
    }
}, { once: true });