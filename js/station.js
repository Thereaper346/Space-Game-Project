import { audio } from './audio.js';

export class StationManager {
    constructor() {
        this.stations = [];
        this.canDock = false; 
    }

    update(player, library, worldSys) {
        let stationBlueprint = null;
        if (library) {
            let allStations = library.filter(p => p.name.toLowerCase().includes('station') && p.format === 'world_blueprint');
            
            if (allStations.length > 0) {
                stationBlueprint = allStations[Math.floor(Math.random() * allStations.length)];
            }
        }

        this.canDock = false;

        for (let i = this.stations.length - 1; i >= 0; i--) {
            let station = this.stations[i];
            let dist = Math.hypot(station.x - player.x, station.y - player.y);
            let currentZone = worldSys.getBiome(station.x, station.y);
            
            if (dist > 5000 || currentZone.type !== 'safe') {
                this.stations.splice(i, 1);
                continue; 
            }

            if (player && player.hull > 0) {
                let distToPlayer = Math.hypot(station.x - player.x, station.y - player.y);
                
                if (distToPlayer < 150) {
                    this.canDock = true;
                }

                if (distToPlayer < 800) { 
                    station.healTimer++;
                    if (station.healTimer > 30) { 
                        let healed = false;
                        if (player.hull < player.maxHull) { player.hull += 5; healed = true; }
                        if (player.ammo < player.maxAmmo) { player.ammo += 10; healed = true; }
                        
                        if (player.hull > player.maxHull) player.hull = player.maxHull;
                        if (player.ammo > player.maxAmmo) player.ammo = player.maxAmmo;

                        if (healed) audio.playSFX('ui_click');
                        
                        station.healTimer = 0;
                    }
                }
            }
        }

        if (player && stationBlueprint) {
            let biome = worldSys.getBiome(player.x, player.y);
            if (biome.type === 'safe' && this.stations.length === 0) {
                
                let spawnAngle = player.angle || (Math.random() * Math.PI * 2);
                let spawnDist = 1500;
                
                this.stations.push({
                    x: player.x + Math.cos(spawnAngle) * spawnDist,
                    y: player.y + Math.sin(spawnAngle) * spawnDist,
                    angle: 0, 
                    blueprint: stationBlueprint,
                    healTimer: 0
                });
            }
        }
    }

    draw(ctx, camera, palette, debugMode = false) {
        const flightScale = 3.5; 

        for (let station of this.stations) {
            let screenX = station.x - camera.x;
            let screenY = station.y - camera.y;

            if (screenX < -2000 || screenX > ctx.canvas.width + 2000 || screenY < -2000 || screenY > ctx.canvas.height + 2000) continue;

            ctx.save();
            ctx.translate(screenX, screenY);

            ctx.beginPath();
            ctx.arc(0, 0, 800, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 204, 0.05)';
            ctx.fill();
            
            ctx.strokeStyle = 'rgba(0, 255, 204, 0.3)';
            ctx.lineWidth = 2;
            ctx.setLineDash([15, 20]); 
            ctx.stroke();
            ctx.setLineDash([]); 

            ctx.rotate(station.angle);
            if (station.blueprint) {
                const gridBlocks = station.blueprint.gridSize; 
                
                const partSize = station.blueprint.format === 'world_blueprint' ? 32 : 16;
                const blockVisualSize = partSize * flightScale; 
                
                const startX = -(gridBlocks * blockVisualSize) / 2;
                const startY = startX;

                for (let row = 0; row < gridBlocks; row++) {
                    for (let col = 0; col < gridBlocks; col++) {
                        const part = station.blueprint.data[row][col];
                        if (part && part.data) {
                            const partX = startX + (col * blockVisualSize);
                            const partY = startY + (row * blockVisualSize);
                            
                            const pGridSize = part.gridSize || 16;
                            for (let pRow = 0; pRow < pGridSize; pRow++) {
                                if (!part.data[pRow]) continue; // Anti-Crash
                                for (let pCol = 0; pCol < pGridSize; pCol++) {
                                    let colorVal = part.data[pRow][pCol];
                                    if (colorVal !== 0 && colorVal !== null && colorVal !== undefined) { 
                                        // Universal Color Translator
                                        ctx.fillStyle = (typeof colorVal === 'number') ? palette[colorVal] : colorVal; 
                                        ctx.fillRect(partX + (pCol * flightScale), partY + (pRow * flightScale), flightScale, flightScale); 
                                    }
                                }
                            }
                        }
                    }
                }
            }
            ctx.restore();
        }
    }
}