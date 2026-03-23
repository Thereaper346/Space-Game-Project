import { audio } from './audio.js';

export class EnemyManager {
    constructor() {
        this.enemies = [];
        this.particles = [];
        this.debris = [];
        this.hostileTint = { r: 255, g: 0, b: 68 }; 
    }

    getTintedColor(originalHex, opacity = 0.5) {
        if (!originalHex || originalHex === "transparent" || originalHex === "#00000000") return "transparent";
        
        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 128, g: 128, b: 128 }; 
        };

        const base = hexToRgb(originalHex);
        const mixR = Math.round(base.r * (1 - opacity) + this.hostileTint.r * opacity);
        const mixG = Math.round(base.g * (1 - opacity) + this.hostileTint.g * opacity);
        const mixB = Math.round(base.b * (1 - opacity) + this.hostileTint.b * opacity);

        const rgbToHex = (r, g, b) => {
            return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        };

        return rgbToHex(mixR, mixG, mixB);
    }

    managePopulation(playerX, playerY, maxEnemies, blueprint, worldSys, stations) {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let dist = Math.hypot(this.enemies[i].x - playerX, this.enemies[i].y - playerY);
            if (dist > 3000) this.enemies.splice(i, 1); 
        }

        let attempts = 0;
        while (this.enemies.length < maxEnemies && maxEnemies > 0 && blueprint && attempts < 10) {
            let spawnAngle = Math.random() * Math.PI * 2;
            let spawnDist = 1200 + Math.random() * 400; 
            
            let sx = playerX + Math.cos(spawnAngle) * spawnDist;
            let sy = playerY + Math.sin(spawnAngle) * spawnDist;

            if (worldSys && worldSys.getBiome(sx, sy).type !== 'safe') {
                let insideAura = false;
                if (stations) {
                    for (let s of stations) {
                        if (Math.hypot(sx - s.x, sy - s.y) < 800) {
                            insideAura = true;
                            break;
                        }
                    }
                }
                
                if (!insideAura) {
                    this.spawn(sx, sy, blueprint);
                }
            }
            attempts++;
        }
    }

    spawn(x, y, blueprint) {
        const personalities = ['chase', 'flank', 'orbit'];
        const myPersonality = personalities[Math.floor(Math.random() * personalities.length)];
        const orbitDir = Math.random() > 0.5 ? 1 : -1; 

        this.enemies.push({
            x: x, y: y, 
            vx: 0, vy: 0,
            angle: 0, 
            hp: 100, 
            fireCooldown: 60 + Math.random() * 60, 
            burstTimer: Math.random() * 180, 
            isReloading: false, 
            evasionTimer: 0,
            evasionOffset: 0,
            blueprint: blueprint, 
            radius: 20,
            personality: myPersonality,
            orbitDir: orbitDir 
        });
    }

    explode(enemy, itemSys, library, dropRate = 100) {
        audio.playSFX('sfx_explosion'); 

        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: enemy.x, y: enemy.y,
                vx: enemy.vx * 0.5 + (Math.random() - 0.5) * 15,
                vy: enemy.vy * 0.5 + (Math.random() - 0.5) * 15,
                size: Math.random() * 5 + 2,
                color: Math.random() > 0.5 ? '#ff0044' : '#ffaa00', 
                life: Math.random() * 30 + 10
            });
        }

        if (itemSys && Math.random() < ((dropRate * 2) / 100)) {
            if (Math.random() > 0.5) {
                itemSys.spawn(enemy.x, enemy.y, library); 
            } else {
                itemSys.spawn(enemy.x, enemy.y, library, 'resource', 'scrap'); 
            }
        }
    }

    update(playerProjectiles, enemyProjectiles, player, itemSys, library, dropRate, playerLaserSpeed, maxEnemies, aggressionFactor, worldSys, stations) {
        
        if (player && player.hull > 0 && player.equippedShip) {
            this.managePopulation(player.x, player.y, maxEnemies, player.equippedShip, worldSys, stations);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            let enemy = this.enemies[i];

            let insideAura = false;
            if (stations) {
                for (let s of stations) {
                    if (Math.hypot(enemy.x - s.x, enemy.y - s.y) < 800) {
                        insideAura = true;
                        break;
                    }
                }
            }

            if ((worldSys && worldSys.getBiome(enemy.x, enemy.y).type === 'safe') || insideAura) {
                for(let s=0; s<15; s++) {
                    this.particles.push({
                        x: enemy.x, y: enemy.y,
                        vx: enemy.vx + (Math.random() - 0.5) * 10, vy: enemy.vy + (Math.random() - 0.5) * 10,
                        size: Math.random() * 4 + 1, color: '#00ffcc', life: 20 
                    });
                }
                this.enemies.splice(i, 1);
                continue; 
            }

            if (player && player.hull > 0) {
                let distToPlayer = Math.hypot(player.x - enemy.x, player.y - enemy.y);
                
                if (!player.isCloaked) {
                    let aimAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                    let visualTargetAngle = aimAngle + (Math.PI / 2);
                    
                    let diff = visualTargetAngle - enemy.angle;
                    diff = Math.atan2(Math.sin(diff), Math.cos(diff)); 
                    enemy.angle += diff * 0.1; 

                    let moveTargetX = player.x;
                    let moveTargetY = player.y;

                    if (enemy.personality === 'orbit') {
                        let angleFromPlayer = Math.atan2(enemy.y - player.y, enemy.x - player.x);
                        moveTargetX = player.x + Math.cos(angleFromPlayer + (0.5 * enemy.orbitDir)) * 300;
                        moveTargetY = player.y + Math.sin(angleFromPlayer + (0.5 * enemy.orbitDir)) * 300;
                    } 
                    else if (enemy.personality === 'flank') {
                        let pFaceX = Math.sin(player.angle);
                        let pFaceY = -Math.cos(player.angle);
                        moveTargetX = player.x - (pFaceX * 300);
                        moveTargetY = player.y - (pFaceY * 300);
                    }

                    let distToMoveTarget = Math.hypot(moveTargetX - enemy.x, moveTargetY - enemy.y);
                    let moveAngle = Math.atan2(moveTargetY - enemy.y, moveTargetX - enemy.x);
                    
                    enemy.evasionTimer--;
                    if (enemy.evasionTimer <= 0) {
                        enemy.evasionOffset = (Math.random() - 0.5) * 1.5; 
                        enemy.evasionTimer = 30 + Math.random() * 60; 
                    }
                    moveAngle += enemy.evasionOffset;

                    const activeThrust = 0.4 * (aggressionFactor / 100); 
                    
                    if (distToMoveTarget > 100) {
                        enemy.vx += Math.cos(moveAngle) * activeThrust;
                        enemy.vy += Math.sin(moveAngle) * activeThrust;
                    } else if (distToPlayer < 150 && enemy.personality === 'chase') {
                        enemy.vx -= Math.cos(aimAngle) * activeThrust * 0.6;
                        enemy.vy -= Math.sin(aimAngle) * activeThrust * 0.6;
                    }

                    enemy.vx *= 0.98;
                    enemy.vy *= 0.98;

                    if (distToPlayer < enemy.radius + 30) {
                        let crashAngle = Math.atan2(player.y - enemy.y, player.x - enemy.x);
                        player.vx = Math.cos(crashAngle) * 15; 
                        player.vy = Math.sin(crashAngle) * 15;
                        player.hull -= 20; 
                        this.explode(enemy, itemSys, library, dropRate);
                        this.enemies.splice(i, 1);
                        continue; 
                    }

                    enemy.burstTimer--;
                    if (enemy.burstTimer <= 0) {
                        enemy.isReloading = !enemy.isReloading;
                        enemy.burstTimer = enemy.isReloading ? 120 : 180; 
                    }

                    if (!enemy.isReloading && enemy.fireCooldown <= 0 && distToPlayer < 700) {
                        let fired = false;
                        const flightScale = 2;

                        if (enemy.blueprint.format && enemy.blueprint.format.includes('blueprint')) {
                            const gridBlocks = enemy.blueprint.gridSize; 
                            const blockVisualSize = 16 * flightScale; 
                            const startX = -(gridBlocks * blockVisualSize) / 2;
                            const startY = startX;

                            for (let row = 0; row < gridBlocks; row++) {
                                for (let col = 0; col < gridBlocks; col++) {
                                    const part = enemy.blueprint.data[row][col];
                                    if (part && part.props && part.props.type === 'weapon') {
                                        const ox = part.props.originX !== undefined ? part.props.originX : 8;
                                        const oy = part.props.originY !== undefined ? part.props.originY : 8;
                                        
                                        const unrotX = startX + (col * blockVisualSize) + (ox * flightScale);
                                        const unrotY = startY + (row * blockVisualSize) + (oy * flightScale);

                                        const rotatedX = unrotX * Math.cos(enemy.angle) - unrotY * Math.sin(enemy.angle);
                                        const rotatedY = unrotX * Math.sin(enemy.angle) + unrotY * Math.cos(enemy.angle);

                                        let shootOffset = 0;
                                        if (part.props.shootDir === 'down') shootOffset = Math.PI;
                                        if (part.props.shootDir === 'left') shootOffset = -Math.PI / 2;
                                        if (part.props.shootDir === 'right') shootOffset = Math.PI / 2;
                                        
                                        const finalShootAngle = enemy.angle + shootOffset;
                                        let startXPos = enemy.x + rotatedX;
                                        let startYPos = enemy.y + rotatedY;

                                        enemyProjectiles.push({
                                            x: startXPos, y: startYPos, lastX: startXPos, lastY: startYPos,
                                            vx: Math.sin(finalShootAngle) * (playerLaserSpeed * 0.7) + enemy.vx,
                                            vy: -Math.cos(finalShootAngle) * (playerLaserSpeed * 0.7) + enemy.vy,
                                            angle: finalShootAngle, life: 120, isNew: true 
                                        });
                                        fired = true;
                                    }
                                }
                            }
                        } else if (enemy.blueprint.format === 'part' || !enemy.blueprint.format) {
                            if (enemy.blueprint.props && enemy.blueprint.props.type === 'weapon') {
                                const ox = enemy.blueprint.props.originX !== undefined ? enemy.blueprint.props.originX : 8;
                                const oy = enemy.blueprint.props.originY !== undefined ? enemy.blueprint.props.originY : 8;
                                const gridSize = enemy.blueprint.gridSize || 16;
                                
                                const unrotX = (ox * flightScale) - (gridSize * flightScale / 2);
                                const unrotY = (oy * flightScale) - (gridSize * flightScale / 2);
                                
                                const rotatedX = unrotX * Math.cos(enemy.angle) - unrotY * Math.sin(enemy.angle);
                                const rotatedY = unrotX * Math.sin(enemy.angle) + unrotY * Math.cos(enemy.angle);

                                let shootOffset = 0;
                                if (enemy.blueprint.props.shootDir === 'down') shootOffset = Math.PI;
                                if (enemy.blueprint.props.shootDir === 'left') shootOffset = -Math.PI / 2;
                                if (enemy.blueprint.props.shootDir === 'right') shootOffset = Math.PI / 2;
                                
                                const finalShootAngle = enemy.angle + shootOffset;
                                enemyProjectiles.push({
                                    x: enemy.x + rotatedX, y: enemy.y + rotatedY, lastX: enemy.x + rotatedX, lastY: enemy.y + rotatedY,
                                    vx: Math.sin(finalShootAngle) * (playerLaserSpeed * 0.7) + enemy.vx,
                                    vy: -Math.cos(finalShootAngle) * (playerLaserSpeed * 0.7) + enemy.vy,
                                    angle: finalShootAngle, life: 120, isNew: true 
                                });
                                fired = true;
                            }
                        }

                        if (fired) {
                            audio.playSFX('laser');
                            enemy.fireCooldown = 60 + Math.random() * 30; 
                        }
                    } else {
                        enemy.fireCooldown--;
                    }
                } else {
                    enemy.evasionTimer--;
                    if (enemy.evasionTimer <= 0) {
                        enemy.evasionOffset = (Math.random() - 0.5) * 2.0; 
                        enemy.evasionTimer = 60; 
                    }
                    enemy.angle += enemy.evasionOffset * 0.05; 
                    enemy.vx *= 0.96; 
                    enemy.vy *= 0.96;
                }
            }

            enemy.x += enemy.vx;
            enemy.y += enemy.vy;

            for (let j = playerProjectiles.length - 1; j >= 0; j--) {
                let p = playerProjectiles[j];
                
                let hitTarget = false;
                for (let step = 0; step <= 1; step += 0.2) {
                    let checkX = p.lastX + ((p.x - p.lastX) * step);
                    let checkY = p.lastY + ((p.y - p.lastY) * step);
                    
                    if (Math.hypot(enemy.x - checkX, enemy.y - checkY) < enemy.radius + 15) {
                        hitTarget = true;
                        p.x = checkX; p.y = checkY;
                        break;
                    }
                }

                if (hitTarget) {
                    enemy.hp -= 25; 
                    audio.playSFX('enemy_hit');

                    for(let s=0; s<5; s++) {
                        this.particles.push({
                            x: p.x, y: p.y,
                            vx: enemy.vx + (Math.random() - 0.5) * 5, vy: enemy.vy + (Math.random() - 0.5) * 5,
                            size: Math.random() * 3 + 1, color: '#00ffcc', life: 15
                        });
                    }
                    playerProjectiles.splice(j, 1); 

                    if (enemy.hp <= 0) {
                        this.explode(enemy, itemSys, library, dropRate);
                        this.enemies.splice(i, 1);
                        break; 
                    }
                }
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life--; p.size *= 0.95; 
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, camera, playerPalette, debugMode = false, aggressionFactor = 30) {
        const flightScale = 2;

        for (let enemy of this.enemies) {
            let screenX = enemy.x - camera.x;
            let screenY = enemy.y - camera.y;

            if (screenX < -400 || screenX > ctx.canvas.width + 400 || screenY < -400 || screenY > ctx.canvas.height + 400) continue;

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(enemy.angle);

            if (debugMode) {
                ctx.beginPath();
                ctx.arc(0, 0, enemy.radius + 15, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            if (enemy.blueprint) {
                const hostileOpacity = 0.15 + (aggressionFactor / 100) * 0.4; 

                // Support Raw S-Part Enemies
                if (enemy.blueprint.format === 'part' || !enemy.blueprint.format) {
                    const gridSize = enemy.blueprint.gridSize || 16;
                    const startX = -(gridSize * flightScale) / 2;
                    const startY = startX;
                    for (let r = 0; r < gridSize; r++) {
                        if (!enemy.blueprint.data[r]) continue; // Anti-Crash Guard
                        for (let c = 0; c < gridSize; c++) {
                            let colorVal = enemy.blueprint.data[r][c];
                            if (colorVal !== 0 && colorVal !== null && colorVal !== undefined) {
                                // Universal Color Translator
                                let originalHex = (typeof colorVal === 'number') ? playerPalette[colorVal] : colorVal;
                                ctx.fillStyle = this.getTintedColor(originalHex, hostileOpacity);
                                ctx.fillRect(startX + (c * flightScale), startY + (r * flightScale), flightScale, flightScale);
                            }
                        }
                    }
                } 
                else if (enemy.blueprint.format.includes('blueprint')) {
                    const gridBlocks = enemy.blueprint.gridSize; 
                    const blockVisualSize = 16 * flightScale; 
                    const startX = -(gridBlocks * blockVisualSize) / 2;
                    const startY = startX;

                    for (let row = 0; row < gridBlocks; row++) {
                        for (let col = 0; col < gridBlocks; col++) {
                            const part = enemy.blueprint.data[row][col];
                            if (part && part.data) {
                                const partX = startX + (col * blockVisualSize);
                                const partY = startY + (row * blockVisualSize);
                                
                                let activeData = part.data;
                                if (part.props && part.props.type === 'engine' && part.frames && part.frames.length > 1) {
                                    let frameIdx = (Math.floor(Date.now() / 80) % (part.frames.length - 1)) + 1;
                                    if (part.frames[frameIdx]) activeData = part.frames[frameIdx];
                                }

                                const pGridSize = part.gridSize || 16;
                                for (let pRow = 0; pRow < pGridSize; pRow++) {
                                    if (!activeData[pRow]) continue; // Anti-Crash Guard
                                    for (let pCol = 0; pCol < pGridSize; pCol++) {
                                        let colorVal = activeData[pRow][pCol];
                                        if (colorVal !== 0 && colorVal !== null && colorVal !== undefined) { 
                                            // Universal Color Translator
                                            let originalHex = (typeof colorVal === 'number') ? playerPalette[colorVal] : colorVal;
                                            ctx.fillStyle = this.getTintedColor(originalHex, hostileOpacity); 
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

        ctx.save();
        for (let p of this.particles) {
            let screenX = p.x - camera.x;
            let screenY = p.y - camera.y;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }
}