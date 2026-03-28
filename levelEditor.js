// levelEditor.js - Конструктор уровней

let editorState = {
    camera: { x: 0, y: 0, zoom: 1 },
    selectedObjectType: 'wall',
    currentRoomIndex: 0,
    isNewLevel: false,
    deleteMode: false,
    objects: { walls: [], enemies: [], items: [] },
    gridSize: 20,
    editorCanvas: null,
    editorCtx: null
};

function initLevelEditor() {
    const canvas = document.getElementById('editorCanvas');
    if (!canvas) return;
    
    editorState.editorCanvas = canvas;
    editorState.editorCtx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    editorState.isNewLevel = editorState.currentRoomIndex >= 2;
    
    // Загружаем текущий уровень
    const currentRoom = rooms[editorState.currentRoomIndex] || originalRooms[editorState.currentRoomIndex];
    if (currentRoom) {
        editorState.objects.walls = currentRoom.walls.map(w => ({...w}));
        editorState.objects.enemies = (currentRoom.enemySpawns || []).map(e => ({x: e.x, y: e.y}));
        editorState.objects.items = (currentRoom.objects || []).map(o => ({x: o.x, y: o.y, width: o.width, height: o.height, type: o.type}));
    }
    
    // Обработчики UI
    const selectEl = document.getElementById('editorObjectType');
    if (selectEl) {
        selectEl.onchange = (e) => {
            editorState.selectedObjectType = e.target.value;
        };
    }
    
    const roomSelect = document.getElementById('editorRoomSelect');
    if (roomSelect) {
        roomSelect.innerHTML = '';
        ['Лес', 'Город'].forEach((name, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = name + ' (защищён)';
            roomSelect.appendChild(opt);
        });
        for (let i = 2; i < 10; i++) {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = `Уровень ${i}` + (localStorage.getItem(`customLevel_${i}`) ? ' (сохранён)' : '');
            roomSelect.appendChild(opt);
        }
        roomSelect.value = editorState.currentRoomIndex;
        roomSelect.onchange = (e) => {
            editorState.currentRoomIndex = parseInt(e.target.value);
            editorState.isNewLevel = editorState.currentRoomIndex >= 2;
            initLevelEditor();
        };
    }
    
    const deleteCheckbox = document.getElementById('editorDeleteMode');
    if (deleteCheckbox) {
        deleteCheckbox.onchange = (e) => {
            editorState.deleteMode = e.target.checked;
        };
    }
    
    // Обработчики кнопок
    const btnSave = document.getElementById('btnSaveLevel');
    if (btnSave) {
        btnSave.onclick = saveLevelInEditor;
    }
    
    const btnLoad = document.getElementById('btnLoadLevel');
    if (btnLoad) {
        btnLoad.onclick = () => {
            initLevelEditor();
            alert('Уровень перезагружен!');
        };
    }
    
    const btnExit = document.getElementById('btnExitEditor');
    if (btnExit) {
        btnExit.onclick = () => {
            const levelEditor = document.getElementById('levelEditor');
            const gameCanvas = document.getElementById('gameCanvas');
            
            levelEditor.style.display = 'none';
            if (gameCanvas) {
                gameCanvas.style.pointerEvents = 'auto';
            }
            
            isGamePaused = true;
            showMainMenu(true);
        };
    }
    
    canvas.onmousemove = (e) => {
        editorState.mouseX = e.clientX;
        editorState.mouseY = e.clientY;
    };
    
    canvas.onclick = (e) => handleEditorClick(e, canvas);
    canvas.oncontextmenu = (e) => {
        e.preventDefault();
        handleEditorRightClick(e, canvas);
    };
    
    document.onkeydown = handleEditorKeydown;
    
    // Запуск цикла отрисовки
    function editorLoop() {
        const ctx = editorState.editorCtx;
        ctx.fillStyle = '#0a0a0c';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Сетка
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;
        for (let x = editorState.camera.x % editorState.gridSize; x < canvas.width; x += editorState.gridSize) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, canvas.height);
            ctx.stroke();
        }
        for (let y = editorState.camera.y % editorState.gridSize; y < canvas.height; y += editorState.gridSize) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(canvas.width, y);
            ctx.stroke();
        }
        
        // Информация
        ctx.fillStyle = '#00ffff';
        ctx.font = '12px monospace';
        const mode = editorState.deleteMode ? 'УДАЛЕНИЕ' : 'РАЗМЕЩЕНИЕ';
        const levelType = editorState.isNewLevel ? 'ПОЛЬЗОВАТЕЛЬСКИЙ' : 'ОРИГИНАЛЬНЫЙ (защищён)';
        ctx.fillText(`Режим: ${mode} | Тип уровня: ${levelType}`, 10, 20);
        
        drawEditorObjects(ctx, canvas);
        
        if (document.getElementById('levelEditor').style.display !== 'none') {
            requestAnimationFrame(editorLoop);
        }
    }
    
    editorLoop();
}

function drawEditorObjects(ctx, canvas) {
    ctx.save();
    ctx.translate(-editorState.camera.x, -editorState.camera.y);
    
    // Стены
    ctx.fillStyle = '#00ffff';
    editorState.objects.walls.forEach(wall => {
        ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.strokeRect(wall.x, wall.y, wall.width, wall.height);
    });
    
    // Враги (спавны)
    ctx.fillStyle = '#ff0000';
    editorState.objects.enemies.forEach(enemy => {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.stroke();
    });
    
    // Предметы
    editorState.objects.items.forEach(item => {
        if (item.type === 'crate') {
            ctx.fillStyle = '#ffff00';
        } else if (item.type === 'barrel') {
            ctx.fillStyle = '#ff8800';
        } else {
            ctx.fillStyle = '#00ffff';
        }
        ctx.fillRect(item.x - item.width/2, item.y - item.height/2, item.width, item.height);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.strokeRect(item.x - item.width/2, item.y - item.height/2, item.width, item.height);
        
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(item.type === 'crate' ? 'C' : 'B', item.x, item.y + 4);
    });
    
    ctx.restore();
}

function handleEditorClick(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = screenX + editorState.camera.x;
    const worldY = screenY + editorState.camera.y;
    
    if (editorState.deleteMode) {
        // Удаление предметов
        const radius = 20;
        editorState.objects.walls = editorState.objects.walls.filter(w => {
            return !(worldX > w.x && worldX < w.x + w.width && worldY > w.y && worldY < w.y + w.height);
        });
        editorState.objects.enemies = editorState.objects.enemies.filter(e => {
            const dist = Math.hypot(worldX - e.x, worldY - e.y);
            return dist > radius;
        });
        editorState.objects.items = editorState.objects.items.filter(o => {
            const dist = Math.hypot(worldX - o.x, worldY - o.y);
            return dist > radius;
        });
    } else {
        // Размещение предметов
        if (editorState.selectedObjectType === 'wall') {
            editorState.objects.walls.push({x: worldX - 40, y: worldY - 40, width: 80, height: 80});
        } else if (editorState.selectedObjectType === 'enemy') {
            editorState.objects.enemies.push({x: worldX, y: worldY});
        } else if (editorState.selectedObjectType === 'crate') {
            editorState.objects.items.push({x: worldX, y: worldY, width: 60, height: 60, type: 'crate'});
        } else if (editorState.selectedObjectType === 'barrel') {
            editorState.objects.items.push({x: worldX, y: worldY, width: 50, height: 50, type: 'barrel'});
        }
    }
}

function handleEditorRightClick(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const screenX = e.clientX - rect.left;
    const screenY = e.clientY - rect.top;
    const worldX = screenX + editorState.camera.x;
    const worldY = screenY + editorState.camera.y;
    
    const radius = 30;
    editorState.objects.walls = editorState.objects.walls.filter(w => {
        return !(worldX > w.x && worldX < w.x + w.width && worldY > w.y && worldY < w.y + w.height);
    });
    editorState.objects.enemies = editorState.objects.enemies.filter(e => {
        const dist = Math.hypot(worldX - e.x, worldY - e.y);
        return dist > radius;
    });
    editorState.objects.items = editorState.objects.items.filter(o => {
        const dist = Math.hypot(worldX - o.x, worldY - o.y);
        return dist > radius;
    });
}

function handleEditorKeydown(e) {
    if (document.getElementById('levelEditor').style.display === 'none') return;
    
    const moveAmount = 20;
    if (e.code === 'KeyW') editorState.camera.y -= moveAmount;
    if (e.code === 'KeyS') editorState.camera.y += moveAmount;
    if (e.code === 'KeyA') editorState.camera.x -= moveAmount;
    if (e.code === 'KeyD') editorState.camera.x += moveAmount;
    if (e.code === 'KeyQ') editorState.camera.x -= moveAmount; 
    if (e.code === 'KeyE') editorState.camera.x += moveAmount;
    if (e.code === 'Escape') {
        document.getElementById('levelEditor').style.display = 'none';
        showMainMenu(true);
    }
}

function saveLevelInEditor() {
    if (!editorState.isNewLevel) {
        alert('⚠️ Нельзя редактировать оригинальные уровни (Лес, Город)\nОни защищены от изменений!');
        return;
    }
    
    const room = {
        name: `custom_${editorState.currentRoomIndex}`,
        width: 1800,
        height: 1200,
        playerSpawn: { x: 100, y: 100 },
        walls: editorState.objects.walls,
        doors: [],
        enemySpawns: editorState.objects.enemies.map(e => ({
            x: e.x, 
            y: e.y, 
            patrolRoute: [{x: e.x, y: e.y}, {x: e.x + 100, y: e.y}, {x: e.x + 100, y: e.y + 100}, {x: e.x, y: e.y + 100}]
        })),
        objects: editorState.objects.items
    };
    
    // Сохраняем в localStorage
    localStorage.setItem(`customLevel_${editorState.currentRoomIndex}`, JSON.stringify(room));
    rooms[editorState.currentRoomIndex] = room;
    
    alert('✓ Уровень сохранён! ID: Level_' + editorState.currentRoomIndex);
    console.log('Сохранённый уровень:', room);
}
