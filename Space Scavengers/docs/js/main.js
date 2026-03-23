// ============================================================================
// FILE: main.js (Equip Logic Fix & Auto-Tab Switching)
// ============================================================================
import { keys } from './input.js';
import { camera } from './camera.js';
import { Starfield } from './background.js';
import { ShipEditor } from './editor.js';
import { audio } from './audio.js'; 
import { AsteroidManager } from './asteroids.js'; 
import { ItemManager } from './items.js'; 
import { EnemyManager } from './enemy.js'; 
import { WorldManager } from './world.js'; 
import { StationManager } from './station.js';
import { Player } from './player.js'; 

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

audio.load('laser', 'sounds/laser.mp3', 'laser', false, 0.4);
audio.load('engine', 'sounds/engine_loop.mp3', 'engine', true, 0.5);
audio.load('ui_click', 'sounds/click.mp3', 'ui', false, 0.6);

audio.load('bgm_space', 'sounds/space_music.mp3', 'musicMain', true, 0.3);
audio.load('bgm_space_1', 'sounds/space_music_1.mp3', 'musicMain', true, 0.3);
audio.load('bgm_space_2', 'sounds/space_music_2.mp3', 'musicMain', true, 0.3);
audio.load('bgm_space_3', 'sounds/space_music_3.mp3', 'musicMain', true, 0.3);

audio.load('bgm_menu', 'sounds/menu_music.mp3', 'musicMain', true, 0.3); 
audio.load('bgm_battle', 'sounds/battle_music.mp3', 'musicBattle', true, 0.3); 
audio.load('enemy_hit', 'sounds/enemy_hit.mp3', 'enemy', false, 0.6); 
audio.load('sfx_explosion', 'sounds/explosion.mp3', 'sfx', false, 0.8);
audio.load('sfx_health', 'sounds/health_pickup.mp3', 'sfx', false, 0.7);
audio.load('sfx_ammo', 'sounds/ammo_pickup.mp3', 'sfx', false, 0.7);
audio.load('sfx_ore', 'sounds/ore.mp3', 'sfx', false, 0.7);

let gameState = 'MENU'; 
let stars = new Starfield(400);
let editor = new ShipEditor();
let asteroidSys = new AsteroidManager(); 
let itemSys = new ItemManager(); 
let enemySys = new EnemyManager(); 
let worldSys = new WorldManager(Math.random() * 10000); 
let stationSys = new StationManager();
let player = new Player(); 
let isDrawing = false; 

let globalSelectedIndex = null; 
let shopButtons = [];
let shopState = {}; 
let shopScrollY = 0; 
let activeShopTab = 'BUY'; 
let activeLibraryFilter = 'ALL'; 
let lastTrack = '';
let isMouseDown = false;
let activeShopBtnId = null;
let shopHoldTicks = 0;

function resetShopCounters() {
    shopState = {};
    shopScrollY = 0; 
}

let evilPalette = editor.colors.map(c => {
    let hex = c.toLowerCase();
    if (hex === '#00ffcc') return '#ff0044'; 
    if (hex === '#00ff00') return '#ff3333'; 
    if (hex === '#0088aa') return '#aa0000'; 
    if (hex === '#0000ff') return '#550000'; 
    if (hex === '#3399ff') return '#ff3300'; 
    return c; 
});

let settings = { 
    controls: 'mouse', debugMode: false, showCoords: false,
    laserSpeed: 25, infHealth: false, infAmmo: false,
    dropRate: 100, enemyRate: 3, enemyAggression: 30, noiseScale: 4000 
}; 

let projectiles = [];
let enemyProjectiles = []; 
let speedLines = []; 
let deathParticles = []; 
let screenMouseX = 0, screenMouseY = 0;

const bindClick = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
const bindChange = (id, fn) => { const el = document.getElementById(id); if (el) el.onchange = fn; };
const bindInput = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('input', fn); };

function playRandomSpaceBGM() {
    const tracks = ['bgm_space', 'bgm_space_1', 'bgm_space_2', 'bgm_space_3'];
    let chosenTrack = tracks[Math.floor(Math.random() * tracks.length)];
    
    while (chosenTrack === lastTrack && tracks.length > 1) {
        chosenTrack = tracks[Math.floor(Math.random() * tracks.length)];
    }
    
    lastTrack = chosenTrack;
    audio.playBGM(chosenTrack);
}

function setupUI() {
    const mainMenu = document.getElementById('main-menu');
    const editorTools = document.getElementById('editor-tools');
    const editorLibrary = document.getElementById('editor-library');
    const pauseOverlay = document.getElementById('pause-overlay');
    const gameOverOverlay = document.getElementById('game-over-overlay');
    const settingsMenu = document.getElementById('settings-menu');
    const startOverlay = document.getElementById('start-overlay'); 
    
    const btnContinue = document.getElementById('btn-continue');
    if (localStorage.getItem('scavenger_save')) {
        if (btnContinue) btnContinue.style.display = 'block';
    }

    if (startOverlay) {
        startOverlay.onclick = () => {
            startOverlay.style.display = 'none';
            mainMenu.style.display = 'block';
            audio.playBGM('bgm_menu'); 
        };
    }

    audio.setVolume('musicMain', parseFloat(document.getElementById('vol-music-main').value));
    audio.setVolume('musicBattle', parseFloat(document.getElementById('vol-music-battle').value));
    audio.setVolume('laser', parseFloat(document.getElementById('vol-laser').value));
    audio.setVolume('engine', parseFloat(document.getElementById('vol-engine').value));
    audio.setVolume('enemy', parseFloat(document.getElementById('vol-enemy').value));
    audio.setVolume('ui', parseFloat(document.getElementById('vol-ui').value));
    audio.setVolume('sfx', parseFloat(document.getElementById('vol-sfx').value));

    bindClick('btn-continue', () => {
        try {
            let saveData = JSON.parse(localStorage.getItem('scavenger_save'));
            
            player.x = saveData.player.x;
            player.y = saveData.player.y;
            player.angle = saveData.player.angle;
            player.hull = saveData.player.hull;
            player.ammo = saveData.player.ammo;
            player.inventory = saveData.player.inventory;
            player.equippedShip = saveData.player.equippedShip;
            
            editor.partsLibrary = saveData.library;

            projectiles = [];
            enemyProjectiles = [];
            deathParticles = [];
            asteroidSys.asteroids = [];
            enemySys.enemies = [];
            itemSys.items = [];
            stationSys.stations = [];

            updateLibraryUI();

            gameState = 'GAME'; 
            if(mainMenu) mainMenu.style.display = 'none'; 
            audio.playSFX('ui_click');
            playRandomSpaceBGM(); 
        } catch (err) {
            console.error("Save file corrupted!", err);
            alert("Save file could not be loaded.");
        }
    });

    bindClick('btn-save-game', () => {
        let saveData = {
            player: {
                x: player.x,
                y: player.y,
                angle: player.angle,
                hull: player.hull,
                ammo: player.ammo,
                inventory: player.inventory,
                equippedShip: player.equippedShip
            },
            library: editor.partsLibrary
        };
        
        localStorage.setItem('scavenger_save', JSON.stringify(saveData));
        
        let btn = document.getElementById('btn-save-game');
        let oldText = btn.innerText;
        btn.innerText = "✓ SAVE SUCCESSFUL";
        btn.style.backgroundColor = "#0088aa";
        audio.playSFX('sfx_health'); 
        
        setTimeout(() => {
            btn.innerText = oldText;
            btn.style.backgroundColor = "#004422";
        }, 1500);

        if (btnContinue) btnContinue.style.display = 'block';
    });

    // ==========================================
    // FIX: PLAYER EQUIP RESET BUG
    // Preserves the equipped ship when resetting health/ammo
    // ==========================================
    bindClick('btn-play', () => { 
        let currentShip = player.equippedShip;
        let currentInv = player.inventory;

        player = new Player();
        player.equippedShip = currentShip; 
        player.inventory = currentInv;

        // ONLY default to index 0 if the player has absolutely no ship equipped yet
        if (!player.equippedShip && editor.partsLibrary.length > 0) {
            player.equippedShip = editor.partsLibrary[0];
        }

        projectiles = [];
        enemyProjectiles = [];
        asteroidSys.asteroids = [];
        enemySys.enemies = [];
        itemSys.items = [];
        stationSys.stations = [];

        gameState = 'GAME'; 
        if(mainMenu) mainMenu.style.display = 'none'; 
        audio.playSFX('ui_click');
        playRandomSpaceBGM(); 
        
        if (asteroidSys.asteroids.length === 0) {
            for(let i=0; i<15; i++) { 
                let spawnX, spawnY;
                do {
                    spawnX = player.x + (Math.random() - 0.5) * 4000;
                    spawnY = player.y + (Math.random() - 0.5) * 4000;
                } while (Math.hypot(spawnX - player.x, spawnY - player.y) < 800);
                asteroidSys.spawn(spawnX, spawnY);
            }
        }
    });

    bindClick('btn-respawn', () => {
        player.hull = player.maxHull;
        player.ammo = 200;
        player.batteryAmount = player.batteryMax;
        player.isCloaked = false;
        player.vx = 0; player.vy = 0;
        projectiles = []; enemyProjectiles = []; deathParticles = [];
        
        for (let e of enemySys.enemies) {
            if (Math.hypot(e.x - player.x, e.y - player.y) < 800) e.x += 1000;
        }

        if(gameOverOverlay) gameOverOverlay.style.display = 'none';
        gameState = 'GAME';
        audio.playSFX('ui_click');
        playRandomSpaceBGM(); 
    });

    bindClick('btn-quit-dead', () => {
        player.hull = player.maxHull; player.ammo = 200; player.vx = 0; player.vy = 0;
        if(gameOverOverlay) gameOverOverlay.style.display = 'none';
        if(mainMenu) mainMenu.style.display = 'block';
        gameState = 'MENU';
        audio.playSFX('ui_click');
        audio.playBGM('bgm_menu');
    });
    
    bindClick('btn-editor', () => { 
        gameState = 'EDITOR'; 
        if(mainMenu) mainMenu.style.display = 'none'; 
        if(editorTools) editorTools.style.display = 'flex'; 
        if(editorLibrary) editorLibrary.style.display = 'flex'; 
        audio.playSFX('ui_click'); 
    });

    bindClick('btn-exit', () => { 
        gameState = 'MENU'; 
        if(editorTools) editorTools.style.display = 'none'; 
        if(editorLibrary) editorLibrary.style.display = 'none'; 
        if(mainMenu) mainMenu.style.display = 'block'; 
        audio.playSFX('ui_click'); 
        audio.playBGM('bgm_menu'); 
    });

    bindClick('btn-settings-main', () => { 
        if(mainMenu) mainMenu.style.display = 'none'; 
        if(settingsMenu) settingsMenu.style.display = 'block'; 
        audio.playSFX('ui_click'); 
    });

    bindClick('btn-settings-pause', () => { 
        if(pauseOverlay) pauseOverlay.style.display = 'none'; 
        if(settingsMenu) settingsMenu.style.display = 'block'; 
        audio.playSFX('ui_click');
    });

    bindClick('btn-close-settings', () => { 
        audio.playSFX('ui_click'); 
        if(settingsMenu) settingsMenu.style.display = 'none'; 
        if (gameState === 'MENU') { if(mainMenu) mainMenu.style.display = 'block'; } 
        else { if(pauseOverlay) pauseOverlay.style.display = 'block'; } 
    });

    bindChange('control-scheme', (e) => { settings.controls = e.target.value; audio.playSFX('ui_click');});

    bindInput('vol-music-main', (e) => { audio.setVolume('musicMain', e.target.value); });
    bindInput('vol-music-battle', (e) => { audio.setVolume('musicBattle', e.target.value); });
    bindInput('vol-laser', (e) => { audio.setVolume('laser', e.target.value); });
    bindInput('vol-engine', (e) => { audio.setVolume('engine', e.target.value); });
    bindInput('vol-enemy', (e) => { audio.setVolume('enemy', e.target.value); });
    bindInput('vol-ui', (e) => { audio.setVolume('ui', e.target.value); });
    bindInput('vol-sfx', (e) => { audio.setVolume('sfx', e.target.value); });
    
    bindChange('vol-laser', () => { audio.playSFX('laser'); });
    bindChange('vol-ui', () => { audio.playSFX('ui_click'); });
    bindChange('vol-enemy', () => { audio.playSFX('enemy_hit'); }); 
    bindChange('vol-sfx', () => { audio.playSFX('sfx_health'); }); 

    const debugHud = document.getElementById('debug-hud');
    bindChange('toggle-coords', (e) => { settings.showCoords = e.target.checked; if (debugHud) debugHud.style.display = settings.showCoords ? 'block' : 'none'; audio.playSFX('ui_click'); });
    bindChange('toggle-hitboxes', (e) => { settings.debugMode = e.target.checked; audio.playSFX('ui_click'); });
    bindChange('toggle-inf-health', (e) => { settings.infHealth = e.target.checked; audio.playSFX('ui_click'); });
    bindChange('toggle-inf-ammo', (e) => { settings.infAmmo = e.target.checked; audio.playSFX('ui_click'); });

    bindInput('debug-laser-speed', (e) => { settings.laserSpeed = parseInt(e.target.value); document.getElementById('val-laser-speed').innerText = settings.laserSpeed; });
    bindInput('debug-drop-rate', (e) => { settings.dropRate = parseInt(e.target.value); document.getElementById('val-drop-rate').innerText = settings.dropRate; });
    bindInput('debug-enemy-rate', (e) => { settings.enemyRate = parseInt(e.target.value); document.getElementById('val-enemy-rate').innerText = settings.enemyRate; });
    bindInput('debug-enemy-aggression', (e) => { settings.enemyAggression = parseInt(e.target.value); document.getElementById('val-enemy-aggression').innerText = settings.enemyAggression; });
    bindInput('debug-noise-scale', (e) => { settings.noiseScale = parseInt(e.target.value); document.getElementById('val-noise-scale').innerText = settings.noiseScale; worldSys.scale = settings.noiseScale; });

    const switchTab = (mode) => {
        editor.mode = mode; 
        
        ['tab-part', 'tab-world-part', 'tab-ship', 'tab-world'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active-tab');
        });

        if(mode === 'PART' && document.getElementById('tab-part')) document.getElementById('tab-part').classList.add('active-tab');
        if(mode === 'WORLD_PART' && document.getElementById('tab-world-part')) document.getElementById('tab-world-part').classList.add('active-tab');
        if(mode === 'ASSEMBLE_SHIP' && document.getElementById('tab-ship')) document.getElementById('tab-ship').classList.add('active-tab');
        if(mode === 'ASSEMBLE_WORLD' && document.getElementById('tab-world')) document.getElementById('tab-world').classList.add('active-tab');
        
        const designUI = document.getElementById('design-mode-ui');
        const assembleUI = document.getElementById('assemble-mode-ui');
        if(designUI) designUI.style.display = (mode === 'PART' || mode === 'WORLD_PART') ? 'block' : 'none';
        if(assembleUI) assembleUI.style.display = (mode === 'ASSEMBLE_SHIP' || mode === 'ASSEMBLE_WORLD') ? 'block' : 'none';
        
        updateLibraryUI(); 
        audio.playSFX('ui_click');
    };

    bindClick('tab-part', () => switchTab('PART'));
    bindClick('tab-world-part', () => switchTab('WORLD_PART'));
    bindClick('tab-ship', () => switchTab('ASSEMBLE_SHIP'));
    bindClick('tab-world', () => switchTab('ASSEMBLE_WORLD'));

    const setTool = (toolName, btnId) => {
        editor.activeTool = toolName;
        ['btn-tool-brush', 'btn-tool-fill', 'btn-tool-origin'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.classList.remove('active-tool');
        });
        const activeBtn = document.getElementById(btnId);
        if(activeBtn) activeBtn.classList.add('active-tool');
        audio.playSFX('ui_click');
    };

    bindClick('btn-tool-brush', () => setTool('BRUSH', 'btn-tool-brush'));
    bindClick('btn-tool-fill', () => setTool('FILL', 'btn-tool-fill'));
    bindClick('btn-tool-origin', () => setTool('ORIGIN', 'btn-tool-origin'));

    bindClick('btn-undo', () => { editor.undo(); audio.playSFX('ui_click'); });
    bindClick('btn-redo', () => { editor.redo(); audio.playSFX('ui_click'); });
    bindClick('btn-clear-draw', () => { 
        editor.clearCanvas(); 
        const nameInput = document.getElementById('part-name');
        if(nameInput) nameInput.value = ""; 
        updateLibraryUI(); 
        audio.playSFX('ui_click'); 
    });
    bindClick('btn-deselect', () => { editor.deselect(); globalSelectedIndex = null; updateLibraryUI(); audio.playSFX('ui_click'); });

    const filters = [
        { id: 'filter-all', target: null },
        { id: 'filter-parts', target: 'tab-part' },
        { id: 'filter-ships', target: 'tab-ship' },
        { id: 'filter-stations', target: 'tab-world' }
    ];
    filters.forEach(f => {
        bindClick(f.id, () => {
            filters.forEach(fid => document.getElementById(fid.id)?.classList.remove('active-lib'));
            document.getElementById(f.id)?.classList.add('active-lib');
            activeLibraryFilter = f.id.replace('filter-', '').toUpperCase();
            
            if (f.target) {
                const targetTab = document.getElementById(f.target);
                if (targetTab) targetTab.click(); 
            }
            
            updateLibraryUI();
            audio.playSFX('ui_click');
        });
    });

    bindClick('btn-rename-part', () => {
        if (globalSelectedIndex !== null) {
            let currentName = editor.partsLibrary[globalSelectedIndex].name;
            let newName = prompt("Enter new name for blueprint:", currentName);
            if (newName && newName.trim() !== "") {
                editor.partsLibrary[globalSelectedIndex].name = newName.trim();
                updateLibraryUI();
                audio.playSFX('ui_click');
            }
        }
    });

    bindClick('btn-delete-part', () => {
        if (globalSelectedIndex !== null) {
            let currentName = editor.partsLibrary[globalSelectedIndex].name;
            if (confirm(`Are you sure you want to permanently delete "${currentName}" from the library?`)) {
                editor.partsLibrary.splice(globalSelectedIndex, 1);
                globalSelectedIndex = null;
                updateLibraryUI();
                audio.playSFX('sfx_explosion'); 
            }
        }
    });

    bindChange('part-type', (e) => {
        editor.currentProps.type = e.target.value;
        const eProps = document.getElementById('engine-props');
        const wProps = document.getElementById('weapon-props');
        const iProps = document.getElementById('item-props');
        const rProps = document.getElementById('resource-props');

        if(eProps) eProps.style.display = (e.target.value === 'engine') ? 'block' : 'none';
        if(wProps) wProps.style.display = (e.target.value === 'weapon') ? 'block' : 'none';
        if(iProps) iProps.style.display = (e.target.value === 'item') ? 'block' : 'none'; 
        if(rProps) rProps.style.display = (e.target.value === 'resource') ? 'block' : 'none'; 
    });
    
    bindChange('thrust-dir', (e) => editor.currentProps.thrustDir = e.target.value);
    bindChange('shoot-dir', (e) => editor.currentProps.shootDir = e.target.value);
    bindChange('item-restore-type', (e) => editor.currentProps.itemRestore = e.target.value);
    bindChange('resource-type', (e) => editor.currentProps.resourceType = e.target.value);

    bindClick('btn-toggle-grid', () => {
        editor.showRedGrid = !editor.showRedGrid;
        const bg = document.getElementById('btn-toggle-grid');
        if(bg) {
            bg.style.backgroundColor = editor.showRedGrid ? "#ff3333" : "#440000";
            bg.style.color = editor.showRedGrid ? "#ffffff" : "#ff3333";
        }
        audio.playSFX('ui_click');
    });

    const colorGrid = document.getElementById('color-grid');
    if (colorGrid) {
        for(let i = 1; i < editor.colors.length; i++) {
            let swatch = document.createElement('div'); swatch.className = 'color-swatch'; swatch.style.backgroundColor = editor.colors[i];
            swatch.onclick = () => { 
                editor.currentColor = i; 
                document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active-swatch')); 
                swatch.classList.add('active-swatch'); 
                audio.playSFX('ui_click'); 
            };
            colorGrid.appendChild(swatch);
        }
    }

    bindClick('btn-eraser', () => { editor.selectedAssembleIndex = null; updateLibraryUI(); audio.playSFX('ui_click'); });
    bindClick('btn-save-part', () => { 
        const nameInput = document.getElementById('part-name');
        editor.savePart(nameInput ? nameInput.value : ""); 
        if(nameInput) nameInput.value = ""; 
        updateLibraryUI(); 
        audio.playSFX('ui_click');
    });

    bindClick('btn-equip', () => { 
        if (globalSelectedIndex !== null) { 
            player.equippedShip = editor.partsLibrary[globalSelectedIndex]; 
            for (let e of enemySys.enemies) e.blueprint = player.equippedShip;
            audio.playSFX('ui_click');
            alert(`"${player.equippedShip.name}" equipped! Enemies updated too!`); 
        } 
    });

    bindClick('btn-copy-js', () => {
        if (globalSelectedIndex !== null) {
            let part = editor.partsLibrary[globalSelectedIndex];
            let outputStr = "";

            if (part.format && part.format.includes('blueprint')) {
                outputStr += `// ==========================================\n`;
                outputStr += `// Hardcode Coordinates for: ${part.name}\n`;
                outputStr += `// ==========================================\n`;
                outputStr += `const ${part.name.replace(/[^a-zA-Z0-9]/g, '')}Coords = [\n`;
                for(let r = 0; r < part.gridSize; r++) {
                    for(let c = 0; c < part.gridSize; c++) {
                        if(part.data[r][c]) {
                            let subPart = part.data[r][c];
                            outputStr += `    { row: ${r}, col: ${c}, name: "${subPart.name}", type: "${subPart.props ? subPart.props.type : 'hull'}" },\n`;
                        }
                    }
                }
                outputStr += `];\n\n`;
            }
            outputStr += `export const customDesign = ` + JSON.stringify(part, null, 4) + `;`;
            navigator.clipboard.writeText(outputStr).then(() => { alert("JS Data & Coordinates Copied to Clipboard!"); });
            audio.playSFX('ui_click');
        } else { 
            alert("Select a part from the library first!"); 
        }
    });

    bindClick('btn-export', () => {
        const projectFile = { library: editor.partsLibrary, workspaces: { partGrid: editor.partGrid, worldPartGrid: editor.worldPartGrid, shipGrid: editor.shipGrid, worldAssemblyGrid: editor.worldAssemblyGrid } };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(projectFile));
        const dlAnchorElem = document.createElement('a'); dlAnchorElem.setAttribute("href", dataStr); dlAnchorElem.setAttribute("download", "scavenger_project.json");
        document.body.appendChild(dlAnchorElem); dlAnchorElem.click(); dlAnchorElem.remove();
        audio.playSFX('ui_click');
    });

    const fileImport = document.getElementById('file-import');
    bindClick('btn-import', () => { if(fileImport) fileImport.click(); audio.playSFX('ui_click'); });
    if(fileImport) {
        fileImport.onchange = (e) => {
            const file = e.target.files[0]; if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const loadedData = JSON.parse(event.target.result);
                    if (loadedData.library) {
                        editor.partsLibrary = loadedData.library;
                        if (loadedData.workspaces) {
                            editor.partGrid = loadedData.workspaces.partGrid || editor.createEmptyGrid(16); editor.worldPartGrid = loadedData.workspaces.worldPartGrid || editor.createEmptyGrid(32);
                            editor.shipGrid = loadedData.workspaces.shipGrid || editor.createEmptyAssembly(11); editor.worldAssemblyGrid = loadedData.workspaces.worldAssemblyGrid || editor.createEmptyAssembly(11);
                        }
                    } else { editor.partsLibrary = loadedData; }
                    updateLibraryUI(); alert("Project Workspace Loaded!");
                } catch (err) { alert("Error loading file."); }
            };
            reader.readAsText(file);
        };
    }

    bindClick('btn-resume', () => { gameState = 'GAME'; const pauseOverlay = document.getElementById('pause-overlay'); if(pauseOverlay) pauseOverlay.style.display = 'none'; audio.playSFX('ui_click'); });
    bindClick('btn-quit', () => { gameState = 'MENU'; const pauseOverlay = document.getElementById('pause-overlay'); const mainMenu = document.getElementById('main-menu'); if(pauseOverlay) pauseOverlay.style.display = 'none'; if(mainMenu) mainMenu.style.display = 'block'; audio.playSFX('ui_click'); audio.playBGM('bgm_menu'); });

    const frameBtns = document.querySelectorAll('.frame-btn');
    frameBtns.forEach(btn => {
        btn.onclick = (e) => {
            const frameIdx = parseInt(e.target.getAttribute('data-frame'));
            editor.setFrame(frameIdx);
            frameBtns.forEach(b => b.classList.remove('active-tab'));
            e.target.classList.add('active-tab');
            audio.playSFX('ui_click');
        };
    });
}

function updateLibraryUI() {
    const container = document.getElementById('library-container');
    const actionContainer = document.getElementById('action-container');
    const selectedNameText = document.getElementById('selected-part-name');
    if(!container) return;
    container.innerHTML = ""; 
    
    editor.partsLibrary.forEach((part, index) => {
        let isPart = !part.format || part.format === 'part' || part.format === 'world_part';
        let isShip = part.format === 'ship_blueprint';
        let isStation = part.format === 'world_blueprint';
        
        if (activeLibraryFilter === 'PARTS' && !isPart) return;
        if (activeLibraryFilter === 'SHIPS' && !isShip) return;
        if (activeLibraryFilter === 'STATIONS' && !isStation) return;

        const div = document.createElement('div');
        div.style.cssText = "padding:10px; border-bottom:1px solid #333; font-size:13px; cursor:pointer; color:#ccc;";
        
        const isSelecting = (globalSelectedIndex === index);
        if (isSelecting) { 
            div.style.backgroundColor = "#004422"; 
            div.style.borderLeft = "4px solid #00ffcc"; 
        }

        let tag = '🛡️';
        if (part.format === 'world_part') tag = '🌍'; 
        else if (part.format === 'ship_blueprint') tag = '🚀'; 
        else if (part.format === 'world_blueprint') tag = '🪐'; 
        else if (part.props && part.props.type === 'item') tag = '🎁'; 
        else if (part.props && part.props.type === 'engine') tag = '🔥';
        else if (part.props && part.props.type === 'weapon') tag = '⚔️';
        else if (part.props && part.props.type === 'resource') tag = '🪨'; 

        div.innerText = `${tag} ${part.name}`;
        
        // ==========================================
        // FIX: AUTO TAB SWITCHER
        // Safely jumps to the correct tool tab without alerts!
        // ==========================================
        div.onclick = () => {
            globalSelectedIndex = index;
            
            if (actionContainer) actionContainer.style.display = 'block';
            if (selectedNameText) selectedNameText.innerText = `Selected: ${part.name}`;
            
            audio.playSFX('ui_click');

            let targetMode = 'PART';
            if (part.format === 'world_part') targetMode = 'WORLD_PART';
            if (part.format === 'ship_blueprint') targetMode = 'ASSEMBLE_SHIP';
            if (part.format === 'world_blueprint') targetMode = 'ASSEMBLE_WORLD';
            
            switchTab(targetMode); 

            editor.loadPartForEdit(index);
            
            if (!part.format || part.format === 'part' || part.format === 'world_part') {
                const nameInp = document.getElementById('part-name');
                const typeInp = document.getElementById('part-type');
                const eProps = document.getElementById('engine-props');
                const wProps = document.getElementById('weapon-props');
                const iProps = document.getElementById('item-props');
                const rProps = document.getElementById('resource-props'); 

                const sDir = document.getElementById('shoot-dir');
                const tDir = document.getElementById('thrust-dir');
                const iRest = document.getElementById('item-restore-type');
                const rType = document.getElementById('resource-type'); 
                
                if(nameInp) nameInp.value = part.name;
                if(typeInp) typeInp.value = part.props.type || 'hull';
                if(eProps) eProps.style.display = (part.props && part.props.type === 'engine') ? 'block' : 'none';
                if(wProps) wProps.style.display = (part.props && part.props.type === 'weapon') ? 'block' : 'none';
                if(iProps) iProps.style.display = (part.props && part.props.type === 'item') ? 'block' : 'none';
                if(rProps) rProps.style.display = (part.props && part.props.type === 'resource') ? 'block' : 'none';
                
                if(sDir) sDir.value = part.props.shootDir || 'up';
                if(tDir) tDir.value = part.props.thrustDir || 'down';
                if(iRest) iRest.value = part.props.itemRestore || 'ammo';
                if(rType) rType.value = part.props.resourceType || 'iron';
            }
            updateLibraryUI(); 
        };
        container.appendChild(div);
    });

    if (globalSelectedIndex === null && actionContainer) { actionContainer.style.display = 'none'; }
}

window.addEventListener('keydown', (e) => {
    if (gameState === 'GAME_OVER') return; 

    if (e.key === 'e' || e.key === 'E') {
        if (gameState === 'GAME' && stationSys.canDock && !player.isCloaked) {
            gameState = 'SHOP'; activeShopTab = 'BUY'; resetShopCounters(); audio.playSFX('ui_click');
        } else if (gameState === 'SHOP') {
            gameState = 'GAME'; resetShopCounters(); audio.playSFX('ui_click');
        }
    }

    if (e.key === 'Tab') {
        e.preventDefault(); 
        if (gameState === 'GAME') { gameState = 'INVENTORY'; audio.playSFX('ui_click'); } 
        else if (gameState === 'INVENTORY') { gameState = 'GAME'; audio.playSFX('ui_click'); }
    }

    if ((e.key === 'c' || e.key === 'C') && gameState === 'GAME') {
        if (!player.batteryEmpty && player.batteryAmount > 0) { player.isCloaked = !player.isCloaked; audio.playSFX('ui_click'); }
    }

    if (e.key === 'Escape') {
        if (gameState === 'INVENTORY') { gameState = 'GAME'; audio.playSFX('ui_click'); return; }
        if (gameState === 'SHOP') { gameState = 'GAME'; resetShopCounters(); audio.playSFX('ui_click'); return; }

        const pauseOverlay = document.getElementById('pause-overlay');
        const settingsMenu = document.getElementById('settings-menu');
        const mainMenu = document.getElementById('main-menu');
        
        if (settingsMenu && settingsMenu.style.display === 'block') {
            settingsMenu.style.display = 'none';
            if (gameState === 'MENU') { if(mainMenu) mainMenu.style.display = 'block'; } else { if(pauseOverlay) pauseOverlay.style.display = 'block'; }
            return;
        }

        if (gameState === 'GAME') { gameState = 'PAUSED'; if(pauseOverlay) pauseOverlay.style.display = 'block'; }
        else if (gameState === 'PAUSED') { gameState = 'GAME'; if(pauseOverlay) pauseOverlay.style.display = 'none'; }
    }
    
    if ((e.key === 'h' || e.key === 'H') && gameState === 'GAME') {
        settings.debugMode = !settings.debugMode;
        const hitBoxToggle = document.getElementById('toggle-hitboxes');
        if (hitBoxToggle) hitBoxToggle.checked = settings.debugMode;
    }
});

window.addEventListener('wheel', (e) => {
    if (gameState === 'SHOP') { shopScrollY += e.deltaY * 0.5; if (shopScrollY < 0) shopScrollY = 0; if (shopScrollY > 1000) shopScrollY = 1000; }
});

function processShopClick(btnId) {
    if (btnId === 'tab_buy') { activeShopTab = 'BUY'; resetShopCounters(); audio.playSFX('ui_click'); return; }
    if (btnId === 'tab_sell') { activeShopTab = 'SELL'; resetShopCounters(); audio.playSFX('ui_click'); return; }

    if (btnId.startsWith('minus_')) {
        let key = btnId.replace('minus_', '');
        if (shopState[key] && shopState[key] > 0) { shopState[key]--; audio.playSFX('ui_click'); }
    } 
    else if (btnId.startsWith('plus_')) {
        let key = btnId.replace('plus_', '');
        let canAdd = false; let isBuy = activeShopTab === 'BUY'; let itemType = key;
        
        let playerInvKey = itemType;
        if (itemType === 'iron') playerInvKey = 'iron'; if (itemType === 'scrap') playerInvKey = 'scrap'; if (itemType === 'cells') playerInvKey = 'energyCells';
        if (itemType === 'hull') playerInvKey = 'hullPlating'; if (itemType === 'thruster') playerInvKey = 'thrusters'; if (itemType === 'laser') playerInvKey = 'laserEmitters';

        let price = 10; if (itemType === 'hull') price = 5; if (itemType === 'laser') price = 15;
        if (!shopState[key]) shopState[key] = 0;

        if (isBuy) { canAdd = ((shopState[key] + 1) * price <= player.inventory.credits); } 
        else { canAdd = (shopState[key] < player.inventory[playerInvKey]); }

        if (canAdd) { shopState[key]++; audio.playSFX('ui_click'); }
    } 
    else if (btnId.startsWith('edit_')) {
        let key = btnId.replace('edit_', ''); let isBuy = activeShopTab === 'BUY'; let itemType = key;
        let playerInvKey = itemType;
        if (itemType === 'iron') playerInvKey = 'iron'; if (itemType === 'scrap') playerInvKey = 'scrap'; if (itemType === 'cells') playerInvKey = 'energyCells';
        if (itemType === 'hull') playerInvKey = 'hullPlating'; if (itemType === 'thruster') playerInvKey = 'thrusters'; if (itemType === 'laser') playerInvKey = 'laserEmitters';

        let price = 10; if (itemType === 'hull') price = 5; if (itemType === 'laser') price = 15;

        let input = prompt("Enter quantity:", shopState[key] || 0);
        if (input !== null) {
            let amount = parseInt(input);
            if (!isNaN(amount) && amount >= 0) {
                if (isBuy) { let maxBuy = Math.floor(player.inventory.credits / price); if (amount > maxBuy) amount = maxBuy; } 
                else { let maxSell = player.inventory[playerInvKey]; if (amount > maxSell) amount = maxSell; }
                shopState[key] = amount; audio.playSFX('ui_click');
            }
        }
        isMouseDown = false; activeShopBtnId = null;
    }
    else if (btnId.startsWith('commit_')) {
        let key = btnId.replace('commit_', ''); let amount = shopState[key] || 0; let isBuy = activeShopTab === 'BUY'; let itemType = key;
        let price = 10; if (itemType === 'hull') price = 5; if (itemType === 'laser') price = 15;

        if (amount > 0) {
            if (!isBuy) { 
                if (key === 'iron') { player.inventory.iron -= amount; player.inventory.credits += amount * price; }
                if (key === 'scrap') { player.inventory.scrap -= amount; player.inventory.credits += amount * price; }
                if (key === 'cells') { player.inventory.energyCells -= amount; player.inventory.credits += amount * price; }
                if (key === 'hull') { player.inventory.hullPlating -= amount; player.inventory.credits += amount * price; }
                if (key === 'thruster') { player.inventory.thrusters -= amount; player.inventory.credits += amount * price; }
                if (key === 'laser') { player.inventory.laserEmitters -= amount; player.inventory.credits += amount * price; }
            } else { 
                if (key === 'iron') { player.inventory.credits -= amount * price; player.inventory.iron += amount; }
                if (key === 'scrap') { player.inventory.credits -= amount * price; player.inventory.scrap += amount; }
                if (key === 'cells') { player.inventory.credits -= amount * price; player.inventory.energyCells += amount; }
                if (key === 'hull') { player.inventory.credits -= amount * price; player.inventory.hullPlating += amount; }
                if (key === 'thruster') { player.inventory.credits -= amount * price; player.inventory.thrusters += amount; }
                if (key === 'laser') { player.inventory.credits -= amount * price; player.inventory.laserEmitters += amount; }
            }
            shopState[key] = 0; audio.playSFX('sfx_health'); 
        }
    }
}

canvas.addEventListener('mousedown', (e) => { 
    if (gameState === 'SHOP') {
        for (let btn of shopButtons) {
            if (e.clientX >= btn.x && e.clientX <= btn.x + btn.w && e.clientY >= btn.y && e.clientY <= btn.y + btn.h) {
                activeShopBtnId = btn.id; isMouseDown = true; shopHoldTicks = 0; processShopClick(btn.id); 
            }
        }
        return; 
    }
    if (gameState === 'EDITOR') { isDrawing = true; editor.saveState(); editor.paint(e.clientX, e.clientY, canvas, true); }
});

canvas.addEventListener('mousemove', (e) => { screenMouseX = e.clientX; screenMouseY = e.clientY; if (gameState === 'EDITOR' && isDrawing) { editor.paint(e.clientX, e.clientY, canvas, false); } });
window.addEventListener('mouseup', () => { isDrawing = false; isMouseDown = false; activeShopBtnId = null; });
window.addEventListener('mouseleave', () => { isDrawing = false; isMouseDown = false; activeShopBtnId = null; });

function fireWeapons() {
    if (!player.equippedShip || player.fireCooldown > 0 || player.isCloaked) return;
    if (!settings.infAmmo) { if (player.ammo <= 0) return; }

    const ship = player.equippedShip;
    const flightScale = 2;
    let fired = false; 

    if (ship.format === 'part' || !ship.format) {
        if (ship.props && ship.props.type === 'weapon') {
            const ox = ship.props.originX !== undefined ? ship.props.originX : 8;
            const oy = ship.props.originY !== undefined ? ship.props.originY : 8;
            const gridSize = ship.gridSize || 16;
            const unrotX = (ox * flightScale) - (gridSize * flightScale / 2);
            const unrotY = (oy * flightScale) - (gridSize * flightScale / 2);
            const rotatedX = unrotX * Math.cos(player.angle) - unrotY * Math.sin(player.angle);
            const rotatedY = unrotX * Math.sin(player.angle) + unrotY * Math.cos(player.angle);

            let shootOffset = 0;
            if (ship.props.shootDir === 'down') shootOffset = Math.PI;
            if (ship.props.shootDir === 'left') shootOffset = -Math.PI / 2;
            if (ship.props.shootDir === 'right') shootOffset = Math.PI / 2;
            
            const finalShootAngle = player.angle + shootOffset;
            projectiles.push({ x: player.x + rotatedX, y: player.y + rotatedY, lastX: player.x + rotatedX, lastY: player.y + rotatedY, vx: Math.sin(finalShootAngle) * settings.laserSpeed + player.vx, vy: -Math.cos(finalShootAngle) * settings.laserSpeed + player.vy, angle: finalShootAngle, life: 120, isNew: true });
            fired = true;
        }
    } else if (ship.format.includes('blueprint')) {
        const gridBlocks = ship.gridSize; 
        const blockVisualSize = 16 * flightScale; 
        const startX = -(gridBlocks * blockVisualSize) / 2, startY = startX;
        
        for (let row = 0; row < gridBlocks; row++) {
            for (let col = 0; col < gridBlocks; col++) {
                const part = ship.data[row][col];
                if (part && part.props && part.props.type === 'weapon') {
                    const ox = part.props.originX !== undefined ? part.props.originX : 8;
                    const oy = part.props.originY !== undefined ? part.props.originY : 8;
                    const unrotX = startX + (col * blockVisualSize) + (ox * flightScale);
                    const unrotY = startY + (row * blockVisualSize) + (oy * flightScale);
                    const rotatedX = unrotX * Math.cos(player.angle) - unrotY * Math.sin(player.angle);
                    const rotatedY = unrotX * Math.sin(player.angle) + unrotY * Math.cos(player.angle);

                    let shootOffset = 0;
                    if (part.props.shootDir === 'down') shootOffset = Math.PI;
                    if (part.props.shootDir === 'left') shootOffset = -Math.PI / 2;
                    if (part.props.shootDir === 'right') shootOffset = Math.PI / 2;
                    
                    const finalShootAngle = player.angle + shootOffset;
                    projectiles.push({ x: player.x + rotatedX, y: player.y + rotatedY, lastX: player.x + rotatedX, lastY: player.y + rotatedY, vx: Math.sin(finalShootAngle) * settings.laserSpeed + player.vx, vy: -Math.cos(finalShootAngle) * settings.laserSpeed + player.vy, angle: finalShootAngle, life: 120, isNew: true });
                    fired = true;
                }
            }
        }
    } 

    if (fired) { audio.playSFX('laser'); player.fireCooldown = player.fireRate; if (!settings.infAmmo) player.ammo--; }
}

// ==========================================
// FIX: UNIVERSAL SHIP RENDERING
// Safely reads old 1D Arrays and animated Engines
// ==========================================
function drawPlayerShip() {
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(player.angle);
    if (player.isCloaked) ctx.globalAlpha = 0.3 + Math.random() * 0.2; 
    if (!player.equippedShip) { ctx.fillStyle = player.color; ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size); ctx.restore(); return; }
    
    const ship = player.equippedShip; 
    const flightScale = 2; 

    if (settings.debugMode) {
        let coreOffset = 15; ctx.fillStyle = '#00ff00';
        let pts = [{x: 0, y: 0}, {x: coreOffset, y: 0}, {x: -coreOffset, y: 0}, {x: 0, y: coreOffset}, {x: 0, y: -coreOffset}];
        for (let pt of pts) { ctx.beginPath(); ctx.arc(pt.x, pt.y, 4, 0, Math.PI*2); ctx.fill(); }
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.4)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(0, 0, coreOffset, 0, Math.PI * 2); ctx.stroke();
    }

    if (ship.format === 'part' || !ship.format) {
        let activeData = ship.data;
        if (ship.props && ship.props.type === 'engine' && ship.frames && ship.frames.length > 1) {
            let frameIdx = 0;
            if (player.isThrusting) {
                let numAnimFrames = ship.frames.length - 1;
                if (numAnimFrames > 0) frameIdx = (Math.floor(Date.now() / 80) % numAnimFrames) + 1;
            }
            if (ship.frames[frameIdx]) activeData = ship.frames[frameIdx];
        }

        const pGridSize = ship.gridSize || 16;
        const startX = -(pGridSize * flightScale) / 2;
        const is2D = Array.isArray(activeData[0]);

        for (let pRow = 0; pRow < pGridSize; pRow++) {
            for (let pCol = 0; pCol < pGridSize; pCol++) {
                let colorVal = is2D ? (activeData[pRow] ? activeData[pRow][pCol] : 0) : activeData[pRow * pGridSize + pCol];
                if (colorVal !== 0 && colorVal !== null && colorVal !== undefined && colorVal !== 'transparent') {
                    let finalColor = (typeof colorVal === 'number') ? editor.colors[colorVal] : colorVal;
                    if (finalColor && finalColor !== "0") {
                        ctx.fillStyle = finalColor;
                        ctx.fillRect(startX + (pCol * flightScale), startX + (pRow * flightScale), flightScale, flightScale);
                    }
                }
            }
        }
    } 
    else if (ship.format.includes('blueprint')) {
        const gridBlocks = ship.gridSize; 
        const blockVisualSize = 16 * flightScale; 
        const startX = -(gridBlocks * blockVisualSize) / 2;

        for (let row = 0; row < gridBlocks; row++) {
            for (let col = 0; col < gridBlocks; col++) {
                const part = ship.data[row][col];
                if (part && part.data) {
                    const partX = startX + (col * blockVisualSize), partY = startX + (row * blockVisualSize);
                    let activeData = part.data; 
                    const isEngine = part.props && part.props.type === 'engine';
                    
                    if (isEngine && part.frames && part.frames.length > 1) {
                        let frameIdx = 0; 
                        if (player.isThrusting) {
                            let numAnimFrames = part.frames.length - 1; 
                            if (numAnimFrames > 0) frameIdx = (Math.floor(Date.now() / 80) % numAnimFrames) + 1; 
                        }
                        if (part.frames[frameIdx]) activeData = part.frames[frameIdx];
                    }

                    const pGridSize = part.gridSize || 16;
                    const is2D = Array.isArray(activeData[0]);

                    for (let pRow = 0; pRow < pGridSize; pRow++) {
                        for (let pCol = 0; pCol < pGridSize; pCol++) {
                            let colorVal = is2D ? (activeData[pRow] ? activeData[pRow][pCol] : 0) : activeData[pRow * pGridSize + pCol];
                            if (colorVal !== 0 && colorVal !== null && colorVal !== undefined && colorVal !== 'transparent') { 
                                let finalColor = (typeof colorVal === 'number') ? editor.colors[colorVal] : colorVal; 
                                if (finalColor && finalColor !== "0") {
                                    ctx.fillStyle = finalColor; 
                                    ctx.fillRect(partX + (pCol * flightScale), partY + (pRow * flightScale), flightScale, flightScale); 
                                }
                            }
                        }
                    }
                }
            }
        }
    } 
    ctx.restore();
}

function drawHUD(currentBiome, enemies, items, worldManager, stations) {
    if (!player.equippedShip) return;

    if (settings.showCoords) {
        const debugHud = document.getElementById('debug-hud');
        if (debugHud) debugHud.innerHTML = `SECTOR: [${Math.floor(player.x)}, ${Math.floor(player.y)}]<br>ROCKS: ${asteroidSys.asteroids.length}<br>ENEMIES: ${enemySys.enemies.length}<br>ITEMS: ${itemSys.items.length}`;
    }

    const hudSize = 120;
    const padding = 20;
    const startX = padding;
    const startY = canvas.height - hudSize - padding - 20; 

    ctx.fillStyle = 'rgba(0, 20, 0, 0.6)';
    ctx.fillRect(startX, startY, hudSize, hudSize);
    
    let healthRatio = player.hull / player.maxHull;
    ctx.fillStyle = healthRatio <= 0.25 && !settings.infHealth ? '#ff3333' : '#00ff00'; 
    ctx.font = 'bold 12px Courier New';
    ctx.shadowBlur = 5;
    ctx.shadowColor = ctx.fillStyle;
    const integrityStr = settings.infHealth ? `INTEGRITY: INF` : `INTEGRITY: ${Math.floor(healthRatio * 100)}%`;
    ctx.fillText(integrityStr, startX, startY - 8);
    ctx.shadowBlur = 0; 

    const infoX = startX + hudSize + 15;
    let currentY = startY + hudSize - 45; 
    const barWidth = 100; const barHeight = 8;
    
    ctx.fillStyle = player.boostOverheated ? '#ff3333' : '#00ccff'; ctx.font = 'bold 10px Courier New'; ctx.fillText('WARP COIL', infoX, currentY - 6);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(infoX, currentY, barWidth, barHeight);
    ctx.fillStyle = player.boostOverheated ? '#ff3333' : '#00ccff'; ctx.fillRect(infoX, currentY, (player.boostAmount / player.boostMax) * barWidth, barHeight);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(infoX, currentY, barWidth, barHeight);

    currentY += 25;
    ctx.fillStyle = player.batteryEmpty ? '#ff00ff' : '#cc00ff'; ctx.font = 'bold 10px Courier New'; ctx.fillText(player.isCloaked ? 'CLOAK ACTIVE' : 'BATTERY', infoX, currentY - 6);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)'; ctx.fillRect(infoX, currentY, barWidth, barHeight);
    ctx.fillStyle = player.batteryEmpty ? '#ff00ff' : '#cc00ff'; ctx.fillRect(infoX, currentY, (player.batteryAmount / player.batteryMax) * barWidth, barHeight);
    ctx.strokeStyle = '#555'; ctx.lineWidth = 1; ctx.strokeRect(infoX, currentY, barWidth, barHeight);

    currentY += 25;
    if (currentBiome) {
        ctx.fillStyle = currentBiome.color; ctx.shadowColor = currentBiome.color; ctx.font = 'bold 12px Courier New';
        ctx.fillText(`ZONE: ${currentBiome.name}`, infoX, currentY); ctx.shadowBlur = 0;
    }

    currentY += 20;
    ctx.fillStyle = player.ammo <= 50 && !settings.infAmmo ? '#ffaa00' : '#00ffcc'; ctx.shadowColor = ctx.fillStyle;
    ctx.fillText(settings.infAmmo ? `AMMO: INF` : `AMMO: ${player.ammo} / ${player.maxAmmo}`, infoX, currentY); ctx.shadowBlur = 0; 

    const ship = player.equippedShip;
    const radarCX = startX + hudSize / 2;
    const radarCY = startY + hudSize / 2;
    
    ctx.save();
    ctx.translate(radarCX, radarCY);
    
    if (ship.format === 'part' || !ship.format) {
        const pGridSize = ship.gridSize || 16;
        const miniScale = (hudSize - 30) / pGridSize;
        const offset = -(pGridSize * miniScale) / 2;
        const is2D = Array.isArray(ship.data[0]);

        for (let pRow = 0; pRow < pGridSize; pRow++) {
            for (let pCol = 0; pCol < pGridSize; pCol++) {
                let colorVal = is2D ? (ship.data[pRow] ? ship.data[pRow][pCol] : 0) : ship.data[pRow * pGridSize + pCol];
                if (colorVal !== 0 && colorVal !== null && colorVal !== undefined && colorVal !== 'transparent') {
                    ctx.fillStyle = healthRatio <= 0.25 && !settings.infHealth ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)';
                    ctx.fillRect(offset + (pCol * miniScale), offset + (pRow * miniScale), miniScale, miniScale);
                }
            }
        }
    } 
    else if (ship.format.includes('blueprint')) {
        const gridBlocks = ship.gridSize; 
        const miniScale = (hudSize - 30) / (gridBlocks * 16); 
        const offset = -(gridBlocks * 16 * miniScale) / 2;

        for (let row = 0; row < gridBlocks; row++) {
            for (let col = 0; col < gridBlocks; col++) {
                const part = ship.data[row][col];
                if (part && part.data) {
                    const partX = offset + (col * 16 * miniScale);
                    const partY = offset + (row * 16 * miniScale); 
                    
                    const pGridSize = part.gridSize || 16;
                    const is2D = Array.isArray(part.data[0]);

                    for (let pRow = 0; pRow < pGridSize; pRow++) {
                        for (let pCol = 0; pCol < pGridSize; pCol++) {
                            let colorVal = is2D ? (part.data[pRow] ? part.data[pRow][pCol] : 0) : part.data[pRow * pGridSize + pCol];
                            if (colorVal !== 0 && colorVal !== null && colorVal !== undefined && colorVal !== 'transparent') { 
                                ctx.fillStyle = healthRatio <= 0.25 && !settings.infHealth ? 'rgba(255, 0, 0, 0.8)' : 'rgba(0, 255, 0, 0.8)'; 
                                ctx.fillRect(partX + (pCol * miniScale), partY + (pRow * miniScale), miniScale, miniScale); 
                            }
                        }
                    }
                }
            }
        }
    } 
    
    ctx.restore();

    const radarRadius = (hudSize / 2) - 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(radarCX, radarCY, radarRadius, 0, Math.PI * 2); ctx.stroke();

    ctx.lineWidth = 3; ctx.strokeStyle = '#3399ff';
    if(items) {
        for (let item of items) {
            if (Math.hypot(item.x - player.x, item.y - player.y) > 4000) continue; 
            let angle = Math.atan2(item.y - player.y, item.x - player.x);
            ctx.beginPath(); ctx.arc(radarCX, radarCY, radarRadius, angle - 0.04, angle + 0.04); ctx.stroke();
        }
    }

    ctx.strokeStyle = '#ff0044';
    if(enemies) {
        for (let e of enemies) {
            if (Math.hypot(e.x - player.x, e.y - player.y) > 4000) continue;
            let angle = Math.atan2(e.y - player.y, e.x - player.x);
            ctx.beginPath(); ctx.arc(radarCX, radarCY, radarRadius, angle - 0.05, angle + 0.05); ctx.stroke();
        }
    }

    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4;
    if (stations) {
        for (let s of stations) {
            if (Math.hypot(s.x - player.x, s.y - player.y) > 6000) continue; 
            let angle = Math.atan2(s.y - player.y, s.x - player.x);
            ctx.beginPath(); ctx.arc(radarCX, radarCY, radarRadius, angle - 0.08, angle + 0.08); ctx.stroke();
        }
    }

    if(worldManager) {
        let safeAngle = worldManager.getClosestSafeZoneAngle(player.x, player.y);
        if (safeAngle !== null) {
            ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(radarCX, radarCY, radarRadius, safeAngle - 0.1, safeAngle + 0.1); ctx.stroke();
        }
    }

    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; for(let i = 0; i < hudSize; i += 4) ctx.fillRect(startX, startY + i, hudSize, 2);
    ctx.strokeStyle = healthRatio <= 0.25 && !settings.infHealth ? 'rgba(255, 0, 0, 0.5)' : 'rgba(0, 255, 0, 0.5)'; ctx.lineWidth = 2; ctx.strokeRect(startX, startY, hudSize, hudSize);
}

function drawInventoryScreen() {
    const w = canvas.width; const h = canvas.height;
    ctx.fillStyle = 'rgba(0, 30, 0, 0.85)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; for(let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
    ctx.strokeStyle = '#00ffcc'; ctx.lineWidth = 4; ctx.strokeRect(50, 50, w - 100, h - 100);

    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 30px Courier New'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffcc';
    ctx.fillText('SYSTEM DIAGNOSTICS & CARGO', w / 2 - 250, 100); ctx.shadowBlur = 0; 

    ctx.fillStyle = '#ffff00'; ctx.font = 'bold 24px Courier New'; ctx.fillText(`ACCOUNT BALANCE: ${player.inventory.credits} CREDITS`, 100, 140);
    ctx.font = 'bold 20px Courier New'; ctx.fillStyle = '#00ffcc';
    ctx.fillText('RAW MATERIALS', 100, 190); ctx.fillRect(100, 200, 250, 2); 
    
    ctx.font = '18px Courier New';
    ctx.fillText(`DURASTEEL     : ${player.inventory.iron}`, 100, 240);
    ctx.fillText(`ACTUATOR MODS : ${player.inventory.scrap}`, 100, 280);
    ctx.fillText(`CRYO-COILS    : ${player.inventory.energyCells}`, 100, 320);

    ctx.font = 'bold 20px Courier New'; ctx.fillText('STORED COMPONENTS', 450, 190); ctx.fillRect(450, 200, 300, 2);
    ctx.font = '18px Courier New';
    ctx.fillText(`HULL PLATING : ${player.inventory.hullPlating}`, 450, 240);
    ctx.fillText(`THRUSTERS    : ${player.inventory.thrusters}`, 450, 280);
    ctx.fillText(`LASER EMITTER: ${player.inventory.laserEmitters}`, 450, 320);

    ctx.fillStyle = 'rgba(0, 255, 204, 0.5)'; ctx.fillText('PRESS [TAB] TO RETURN TO HELM', w / 2 - 170, h - 90);
}

function drawShopButton(text, x, y, w, h, id, isActive) {
    ctx.fillStyle = isActive ? '#004488' : '#222222'; ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = isActive ? '#00ccff' : '#555555'; ctx.lineWidth = 2; ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = isActive ? '#ffffff' : '#777777';
    let fontSize = w < 40 ? 16 : 14; ctx.font = `bold ${fontSize}px Courier New`;
    ctx.fillText(text, x + (w / 2) - (ctx.measureText(text).width / 2), y + (h/2) + 5);
    if (isActive) shopButtons.push({id: id, x: x, y: y, w: w, h: h});
}

function drawShopRow(x, y, key, maxAffordableOrOwned, price) {
    let currentCount = shopState[key] || 0; let isBuy = activeShopTab === 'BUY';
    drawShopButton('-', x, y - 20, 25, 25, `minus_${key}`, currentCount > 0);
    
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 16px Courier New';
    ctx.fillText(currentCount.toString().padStart(2, '0'), x + 35, y - 3);
    shopButtons.push({id: `edit_${key}`, x: x + 30, y: y - 20, w: 30, h: 25});

    let canAdd = isBuy ? ((currentCount + 1) * price <= player.inventory.credits) : (currentCount < maxAffordableOrOwned);
    drawShopButton('+', x + 65, y - 20, 25, 25, `plus_${key}`, canAdd);

    let actionText = isBuy ? `BUY (${currentCount * price}cr)` : `SELL (${currentCount * price}cr)`;
    drawShopButton(actionText, x + 100, y - 20, 140, 25, `commit_${key}`, currentCount > 0);
}

function drawShopScreen() {
    const w = canvas.width; const h = canvas.height; shopButtons = []; 

    ctx.fillStyle = 'rgba(0, 20, 30, 0.9)'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; for(let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 2);
    ctx.strokeStyle = '#0088ff'; ctx.lineWidth = 4; ctx.strokeRect(50, 50, w - 100, h - 100);

    ctx.fillStyle = '#0088ff'; ctx.font = 'bold 30px Courier New'; ctx.shadowBlur = 10; ctx.shadowColor = '#0088ff';
    ctx.fillText('TRADE NETWORK - TERMINAL ONLINE', w / 2 - 250, 100); ctx.shadowBlur = 0; 
    ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 24px Courier New'; ctx.fillText(`ACCOUNT BALANCE: ${player.inventory.credits} CREDITS`, 100, 140);

    drawShopButton('BUY FROM VENDOR', 100, 170, 200, 30, 'tab_buy', activeShopTab !== 'BUY');
    drawShopButton('SELL YOUR CARGO', 310, 170, 200, 30, 'tab_sell', activeShopTab !== 'SELL');
    
    if (activeShopTab === 'BUY') { ctx.fillStyle = '#00ffcc'; ctx.fillRect(100, 205, 200, 4); }
    if (activeShopTab === 'SELL') { ctx.fillStyle = '#00ffcc'; ctx.fillRect(310, 205, 200, 4); }

    ctx.save(); ctx.rect(100, 220, w - 200, h - 320); ctx.clip(); ctx.translate(0, -shopScrollY); 

    ctx.font = '16px Courier New'; let rowY = 250; const spacing = 50;

    if (activeShopTab === 'BUY') {
        ctx.fillStyle = '#0088ff'; ctx.fillText('--- VENDOR INVENTORY ---', 100, rowY); rowY += spacing;
        const vendorItems = [ { key: 'iron', name: 'DURASTEEL', price: 10 }, { key: 'scrap', name: 'ACTUATOR MODS', price: 10 }, { key: 'cells', name: 'CRYO-COILS', price: 10 }, { key: 'hull', name: 'HULL PLATING', price: 5 }, { key: 'thruster', name: 'THRUSTER MODULE', price: 10 }, { key: 'laser', name: 'LASER EMITTER', price: 15 } ];
        for (let item of vendorItems) {
            ctx.fillStyle = '#00ffcc'; ctx.fillText(`${item.name.padEnd(15, ' ')} (${item.price}cr)`, 100, rowY);
            drawShopRow(350, rowY, item.key, 999, item.price); rowY += spacing;
        }
    } else if (activeShopTab === 'SELL') {
        ctx.fillStyle = '#0088ff'; ctx.fillText('--- YOUR CARGO ---', 100, rowY); rowY += spacing;
        const playerItems = [ { key: 'iron', invKey: 'iron', name: 'DURASTEEL', price: 10 }, { key: 'scrap', invKey: 'scrap', name: 'ACTUATOR MODS', price: 10 }, { key: 'cells', invKey: 'energyCells', name: 'CRYO-COILS', price: 10 }, { key: 'hull', invKey: 'hullPlating', name: 'HULL PLATING', price: 5 }, { key: 'thruster', invKey: 'thrusters', name: 'THRUSTER MODULE', price: 10 }, { key: 'laser', invKey: 'laserEmitters', name: 'LASER EMITTER', price: 15 } ];
        let hasItems = false;
        for (let item of playerItems) {
            let owned = player.inventory[item.invKey];
            if (owned > 0) {
                hasItems = true; ctx.fillStyle = '#00ffcc'; ctx.fillText(`${item.name.padEnd(15, ' ')} [OWNED: ${owned}]`, 100, rowY);
                drawShopRow(400, rowY, item.key, owned, item.price); rowY += spacing;
            }
        }
        if (!hasItems) { ctx.fillStyle = '#aaaaaa'; ctx.fillText(`YOUR CARGO HOLD IS EMPTY.`, 100, rowY); }
    }
    ctx.restore(); 
    ctx.fillStyle = 'rgba(0, 136, 255, 0.5)'; ctx.fillText('SCROLL TO VIEW MORE | PRESS [E] OR [ESC] TO UNDOCK', w / 2 - 240, h - 90);
}

function gameLoop() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (gameState === 'GAME') {
        if (settings.infHealth) player.hull = player.maxHull;

        if (player.hull <= 0) {
            player.hull = 0; audio.playSFX('sfx_explosion');
            for(let i=0; i<50; i++) { deathParticles.push({ x: player.x, y: player.y, vx: player.vx * 0.5 + (Math.random() - 0.5) * 20, vy: player.vy * 0.5 + (Math.random() - 0.5) * 20, size: Math.random() * 8 + 3, color: Math.random() > 0.5 ? '#00ffcc' : '#ffffff', life: Math.random() * 60 + 20 }); }
            gameState = 'GAME_OVER';
            const gameOverOverlay = document.getElementById('game-over-overlay'); if (gameOverOverlay) gameOverOverlay.style.display = 'block';
            audio.stopEngine(); return requestAnimationFrame(gameLoop); 
        }

        player.isCloaked = player.isCloaked && !player.batteryEmpty && player.batteryAmount > 0;
        if (player.isCloaked) { player.batteryAmount -= player.batteryDrain; if (player.batteryAmount <= 0) { player.batteryAmount = 0; player.batteryEmpty = true; player.isCloaked = false; audio.playSFX('ui_click'); } }
        player.update(); 

        let isMoving = false; let activeThrust = player.isBoosting ? player.speed * 1.7 : player.speed;

        if (settings.controls === 'mouse') {
            let dx = screenMouseX - canvas.width / 2, dy = screenMouseY - canvas.height / 2; let targetAngle = Math.atan2(dy, dx) + Math.PI / 2;
            let diff = targetAngle - player.angle; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.angle += diff * 0.12; 

            if ((keys.Shift || keys.shift || keys.ShiftLeft || keys.ShiftRight) && !player.boostOverheated && player.boostAmount > 0) { player.isBoosting = true; player.boostAmount -= player.boostDrain; if (player.boostAmount < 0) player.boostAmount = 0; } else { player.isBoosting = false; }
            if (keys.w || keys.ArrowUp) { isMoving = true; player.vx += Math.sin(player.angle) * activeThrust; player.vy -= Math.cos(player.angle) * activeThrust; }
            if (keys.s || keys.ArrowDown) { isMoving = true; player.vx -= Math.sin(player.angle) * (activeThrust * 0.6); player.vy += Math.cos(player.angle) * (activeThrust * 0.6); }
            if (keys.a || keys.ArrowLeft) { isMoving = true; player.vx -= Math.cos(player.angle) * (activeThrust * 0.8); player.vy -= Math.sin(player.angle) * (activeThrust * 0.8); }
            if (keys.d || keys.ArrowRight) { isMoving = true; player.vx += Math.cos(player.angle) * (activeThrust * 0.8); player.vy += Math.sin(player.angle) * (activeThrust * 0.8); }

            player.isThrusting = isMoving; if (keys.mouseDown) fireWeapons();

        } else {
            if ((keys.Shift || keys.shift || keys.ShiftLeft || keys.ShiftRight) && !player.boostOverheated && player.boostAmount > 0) { player.isBoosting = true; player.boostAmount -= player.boostDrain; if (player.boostAmount < 0) player.boostAmount = 0; } else { player.isBoosting = false; }
            if (keys.ArrowUp || keys.w) { player.vy -= activeThrust; player.isThrusting = true; }
            if (keys.ArrowDown || keys.s) { player.vy += activeThrust; player.isThrusting = true; }
            if (keys.ArrowLeft || keys.a) { player.vx -= activeThrust; player.isThrusting = true; }
            if (keys.ArrowRight || keys.d) { player.vx += activeThrust; player.isThrusting = true; }
            if (Math.abs(player.vx) > 0.1 || Math.abs(player.vy) > 0.1) { let targetAngle = Math.atan2(player.vy, player.vx) + Math.PI / 2; let diff = targetAngle - player.angle; diff = Math.atan2(Math.sin(diff), Math.cos(diff)); player.angle += diff * 0.12; }
        }

        if (keys.Space || keys[' '] || keys.space) fireWeapons();
        if (player.fireCooldown > 0) player.fireCooldown--;

        if (player.isThrusting) { audio.startEngine(); } else { audio.stopEngine(); }
        player.vx *= 0.98; player.vy *= 0.98; player.x += player.vx; player.y += player.vy;
        camera.update(player, canvas); 

        let currentBiome = worldSys.getBiome(player.x, player.y);
        ctx.fillStyle = currentBiome.bgTint; ctx.fillRect(0, 0, canvas.width, canvas.height);
        if (stars && typeof stars.draw === 'function') stars.draw(ctx, camera, canvas);
        
        let currentSpeed = Math.hypot(player.vx, player.vy);
        if (player.isBoosting && currentSpeed > 35) {
            for(let i=0; i<3; i++) { speedLines.push({ x: player.x + (Math.random() - 0.5) * canvas.width * 1.5, y: player.y + (Math.random() - 0.5) * canvas.height * 1.5, length: Math.random() * 100 + 50, life: Math.random() * 10 + 10 }); }
        }

        ctx.save(); ctx.strokeStyle = 'rgba(0, 255, 204, 0.4)'; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let i = speedLines.length - 1; i >= 0; i--) {
            let sl = speedLines[i]; sl.life--;
            if (sl.life <= 0) { speedLines.splice(i, 1); } else {
                let backwardX = -Math.sin(player.angle) * 40; let backwardY = Math.cos(player.angle) * 40;
                sl.x += backwardX; sl.y += backwardY;
                ctx.moveTo(sl.x - camera.x, sl.y - camera.y); ctx.lineTo(sl.x - camera.x - backwardX * (sl.length / 40), sl.y - camera.y - backwardY * (sl.length / 40));
            }
        }
        ctx.stroke(); ctx.restore();

        for (let i = projectiles.length - 1; i >= 0; i--) {
            let p = projectiles[i]; p.lastX = p.x; p.lastY = p.y;
            if (!p.isNew) { p.x += p.vx; p.y += p.vy; }
            p.isNew = false; p.life--;
            
            if (p.life <= 0) { projectiles.splice(i, 1); } else {
                ctx.save(); ctx.translate(p.x - camera.x, p.y - camera.y); ctx.rotate(p.angle); ctx.fillStyle = '#00ffcc'; ctx.fillRect(-2, -6, 4, 12); ctx.restore();
            }
        }

        for (let i = enemyProjectiles.length - 1; i >= 0; i--) {
            let p = enemyProjectiles[i]; p.lastX = p.x; p.lastY = p.y;
            if (!p.isNew) { p.x += p.vx; p.y += p.vy; }
            p.isNew = false; p.life--;
            
            if (player.hull > 0 && Math.hypot(p.x - player.x, p.y - player.y) < 15) {
                if (!settings.infHealth) player.hull -= 10;
                audio.playSFX('enemy_hit'); p.life = 0; 
            }

            if (p.life <= 0) { enemyProjectiles.splice(i, 1); } else {
                ctx.save(); ctx.translate(p.x - camera.x, p.y - camera.y); ctx.rotate(p.angle); ctx.fillStyle = '#ff0044'; ctx.fillRect(-2, -6, 4, 12); ctx.restore();
            }
        }

        itemSys.update(player); itemSys.draw(ctx, camera, editor.colors, settings.debugMode);
        asteroidSys.update(projectiles, player, itemSys, editor.partsLibrary, settings.dropRate, stationSys.stations); asteroidSys.draw(ctx, camera, editor.colors, settings.debugMode);

        let activeMaxEnemies = currentBiome.type === 'safe' ? 0 : settings.enemyRate;
        enemySys.update(projectiles, enemyProjectiles, player, itemSys, editor.partsLibrary, settings.dropRate, settings.laserSpeed, activeMaxEnemies, settings.enemyAggression, worldSys, stationSys.stations);
        enemySys.draw(ctx, camera, editor.colors, settings.debugMode, settings.enemyAggression);
        
        stationSys.update(player, editor.partsLibrary, worldSys); stationSys.draw(ctx, camera, editor.colors, settings.debugMode);

        drawPlayerShip();

        if (stationSys.canDock && !player.isCloaked) {
            ctx.fillStyle = '#00ffcc'; ctx.font = 'bold 18px Courier New'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffcc';
            ctx.fillText("PRESS [E] TO DOCK", canvas.width / 2 - 85, canvas.height / 2 + 50); ctx.shadowBlur = 0; 
        }
        
        drawHUD(currentBiome, enemySys.enemies, itemSys.items, worldSys, stationSys.stations); 
        
    } else if (gameState === 'INVENTORY' || gameState === 'SHOP') {
        let currentBiome = worldSys.getBiome(player.x, player.y);
        ctx.fillStyle = currentBiome.bgTint; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (stars && typeof stars.draw === 'function') stars.draw(ctx, camera, canvas);
        asteroidSys.draw(ctx, camera, editor.colors, false); enemySys.draw(ctx, camera, editor.colors, false, settings.enemyAggression); stationSys.draw(ctx, camera, editor.colors, false);
        drawPlayerShip(); drawHUD(currentBiome, enemySys.enemies, itemSys.items, worldSys, stationSys.stations);

        if (gameState === 'INVENTORY') drawInventoryScreen();
        if (gameState === 'SHOP') {
            drawShopScreen();
            if (isMouseDown && activeShopBtnId) {
                if (activeShopBtnId.startsWith('plus_') || activeShopBtnId.startsWith('minus_')) {
                    shopHoldTicks++; if (shopHoldTicks > 30 && shopHoldTicks % 3 === 0) processShopClick(activeShopBtnId);
                }
            }
        }
    } else if (gameState === 'GAME_OVER') {
        camera.x += 1; camera.y += 1;
        if (stars && typeof stars.draw === 'function') stars.draw(ctx, camera, canvas);
        
        ctx.save();
        for (let i = deathParticles.length - 1; i >= 0; i--) {
            let p = deathParticles[i]; p.x += p.vx; p.y += p.vy; p.life--; p.size *= 0.95;
            if (p.life <= 0) { deathParticles.splice(i, 1); } else {
                ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x - camera.x + ctx.canvas.width / 2, p.y - camera.y + ctx.canvas.height / 2, p.size, 0, Math.PI * 2); ctx.fill();
            }
        }
        ctx.restore();
        asteroidSys.draw(ctx, camera, editor.colors, settings.debugMode); enemySys.draw(ctx, camera, editor.colors, settings.debugMode, settings.enemyAggression); stationSys.draw(ctx, camera, editor.colors, settings.debugMode);
    } else if (gameState === 'EDITOR') { 
        if (editor && typeof editor.draw === 'function') editor.draw(ctx, canvas); 
    } else { 
        if (stars && typeof stars.draw === 'function') stars.draw(ctx, camera, canvas); 
    }
    requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; });
canvas.width = window.innerWidth; canvas.height = window.innerHeight;

try { setupUI(); } catch (err) { console.error("UI Error caught, but game loop is still alive!", err); }
requestAnimationFrame(gameLoop);