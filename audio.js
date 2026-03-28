// audio.js - Звуковая система

// Настройка звука
const audioSettings = {
    global: 0.5, // Громкость эффектов
    music: 0.3   // Громкость музыки
};

// Файлы звуков
const soundFiles = {
    shot: 'music-1/pistol-vistrel.mp3',
    casing: 'music-1/gilzy-padenie.mp3',  // Предполагаю, что это звук гильзы
    hit: 'music-1/gilzy-padenie.mp3',     // Или другой файл, если есть
    death: 'music-1/gilzy-padenie.mp3',   // Аналогично
    enemyAttack: 'music-1/pistol-vistrel.mp3', // Или другой
    enemyAlert: 'music-1/pistol-vistrel.mp3', // Звук обнаружения врага
    reload: 'music-1/Pistol-loaded-to-fire.mp3',
    bg1: 'music-1/background-music-1.mp3',
    bg2: 'music-1/background-music-2.mp3'
};

// Объект звуков
const sounds = {};

// Загрузка звуков
function loadSounds() {
    for (let key in soundFiles) {
        sounds[key] = new Audio(soundFiles[key]);
        sounds[key].volume = applyVolumeSettings(key, 1);
    }
}

// Применение настроек громкости
function applyVolumeSettings(soundKey, baseVolume) {
    if (soundKey.startsWith('bg')) {
        return baseVolume * audioSettings.music;
    } else {
        return baseVolume * audioSettings.global;
    }
}

// Воспроизведение звука
function playSound(soundKey, volume = 1) {
    if (sounds[soundKey]) {
        sounds[soundKey].currentTime = 0;
        sounds[soundKey].volume = applyVolumeSettings(soundKey, volume);
        if (soundKey.startsWith('bg')) {
            sounds[soundKey].loop = true;
        }
        sounds[soundKey].play().catch(() => {}); // Игнорировать ошибки
    }
}

// Пространственный звук
function playSpatialSound(soundKey, x, y, volume = 1) {
    const dist = Math.hypot(player.x - x, player.y - y);
    const maxDist = 400;
    const spatialVolume = Math.max(0, 1 - dist / maxDist) * volume;
    playSound(soundKey, spatialVolume);
}

// Фоновая музыка
let currentBgIndex = 0;
const bgTracks = ['bg1', 'bg2'];

function startBackgroundMusic() {
    try {
        // Убедимся что bg2 остановлена перед воспроизведением bg1
        if (sounds && sounds['bg2']) {
            sounds['bg2'].pause();
            sounds['bg2'].currentTime = 0;
        }
        if (sounds && sounds['bg1']) {
            sounds['bg1'].currentTime = 0;
            sounds['bg1'].volume = audioSettings.music;
            sounds['bg1'].loop = true;
            sounds['bg1'].play().catch(() => {});
        }
    } catch (e) {
        console.error('Error starting background music:', e);
    }
}

// Безопасное переключение на FRENZY режим музыку
function playFrenzyMusic() {
    try {
        if (sounds && sounds['bg1']) {
            sounds['bg1'].pause();
        }
        if (sounds && sounds['bg2']) {
            sounds['bg2'].currentTime = 0;
            sounds['bg2'].volume = audioSettings.music;
            sounds['bg2'].loop = true;
            sounds['bg2'].play().catch(() => {});
        }
    } catch (e) {
        console.error('Error playing frenzy music:', e);
    }
}

// Безопасное возвращение к обычной музыке
function playNormalMusic() {
    try {
        if (sounds && sounds['bg2']) {
            sounds['bg2'].pause();
            sounds['bg2'].currentTime = 0;
        }
        if (sounds && sounds['bg1']) {
            sounds['bg1'].currentTime = 0;
            sounds['bg1'].volume = audioSettings.music;
            sounds['bg1'].loop = true;
            sounds['bg1'].play().catch(() => {});
        }
    } catch (e) {
        console.error('Error playing normal music:', e);
    }
}

// Остановить все звуки
function stopAllSounds() {
    try {
        for (let key in sounds) {
            if (sounds[key]) {
                sounds[key].pause();
                sounds[key].currentTime = 0;
            }
        }
    } catch (e) {
        console.error('Error stopping sounds:', e);
    }
}

// Загрузка звуков при запуске
loadSounds();