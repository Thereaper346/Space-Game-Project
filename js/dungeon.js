// ============================================================================
// FILE: dungeon.js (The Procedural Maze Architect v4.2 - Floating Corner Fix)
// ============================================================================

export class DungeonManager {
    constructor() {
        this.dungeons = [];
        this.wallScale = 16; 
        this.spawnTimer = 0; 
    }

    getDoorDirection(x, y, size) {
        if (x <= 1) return 'LEFT';
        if (x >= size - 2) return 'RIGHT';
        if (y <= 1) return 'TOP';
        if (y >= size - 2) return 'BOTTOM';
        return null;
    }

    getOppositeDirection(dir) {
        if (dir === 'LEFT') return 'RIGHT';
        if (dir === 'RIGHT') return 'LEFT';
        if (dir === 'TOP') return 'BOTTOM';
        if (dir === 'BOTTOM') return 'TOP';
        return null;
    }

    getDirNum(dir) {
        if (dir === 'TOP') return 0;
        if (dir === 'RIGHT') return 1;
        if (dir === 'BOTTOM') return 2;
        if (dir === 'LEFT') return 3;
        return 0;
    }

    rotate2DArray(matrix, turns) {
        if (turns === 0) return matrix;
        let res = JSON.parse(JSON.stringify(matrix));
        for (let i = 0; i < turns; i++) {
            res = res[0].map((val, index) => res.map(row => row[index]).reverse());
        }
        return res;
    }

    generate(x, y, library, enemySys, targetRooms) {
        let mazeParts = library.filter(p => p.format === 'world_part' && p.props && p.props.type === 'maze_room');
        let vaultParts = mazeParts.filter(p => p.name.toLowerCase().includes('vault') || p.name.toLowerCase().includes('treasure'));
        let outsideParts = library.filter(p => p.format === 'world_part' && p.name.toLowerCase().includes('outside'));
        
        let normalParts = mazeParts.filter(p => !p.name.toLowerCase().includes('vault') && !p.name.toLowerCase().includes('treasure') && !p.name.toLowerCase().includes('outside'));

        if (normalParts.length === 0) return; 

        let newDungeon = { x: x, y: y, rooms: [] };
        let placedRooms = 0;
        let openConnections = [];

        let startPart = normalParts[Math.floor(Math.random() * normalParts.length)];
        let startSize = startPart.gridSize || 32;
        newDungeon.rooms.push({ worldX: x, worldY: y, blueprint: startPart });
        this.activateSpawners(x, y, startPart, enemySys, library);
        placedRooms++;

        if (startPart.props && startPart.props.doors) {
            for (let d of startPart.props.doors) {
                let dir = this.getDoorDirection(d.x, d.y, startSize);
                if (dir) openConnections.push({ sourceWorldX: x, sourceWorldY: y, sourceSize: startSize, dir: dir, doorLocalX: d.x, doorLocalY: d.y });
            }
        }

        let attempts = 0;
        while (placedRooms < targetRooms && openConnections.length > 0 && attempts < 100) {
            attempts++;
            
            let connIdx = Math.floor(Math.random() * openConnections.length);
            let conn = openConnections.splice(connIdx, 1)[0];
            let reqDir = this.getOppositeDirection(conn.dir);
            
            let isLastRoom = (placedRooms >= targetRooms - 2);
            let pool = (isLastRoom && vaultParts.length > 0) ? vaultParts : normalParts;
            
            let validParts = pool.filter(p => {
                if (!p.props || !p.props.doors) return false;
                let pSize = p.gridSize || 32;
                return p.props.doors.some(d => this.getDoorDirection(d.x, d.y, pSize) === reqDir);
            });

            if (validParts.length === 0) continue; 
            
            let nextPart = validParts[Math.floor(Math.random() * validParts.length)];
            let nextSize = nextPart.gridSize || 32;
            let matchingDoor = nextPart.props.doors.find(d => this.getDoorDirection(d.x, d.y, nextSize) === reqDir);
            
            let newX = conn.sourceWorldX;
            let newY = conn.sourceWorldY;
            let dist = ((conn.sourceSize * this.wallScale) / 2) + ((nextSize * this.wallScale) / 2);
            
            if (conn.dir === 'RIGHT') newX += dist;
            if (conn.dir === 'LEFT') newX -= dist;
            if (conn.dir === 'BOTTOM') newY += dist;
            if (conn.dir === 'TOP') newY -= dist;
            
            let overlap = false;
            for (let existing of newDungeon.rooms) {
                let exSize = existing.blueprint.gridSize || 32;
                let minDist = ((exSize * this.wallScale)/2) + ((nextSize * this.wallScale)/2) - 20;
                if (Math.abs(existing.worldX - newX) < minDist && Math.abs(existing.worldY - newY) < minDist) {
                    overlap = true; break;
                }
            }
            if (overlap) continue;

            newDungeon.rooms.push({ worldX: newX, worldY: newY, blueprint: nextPart });
            this.activateSpawners(newX, newY, nextPart, enemySys, library);
            placedRooms++;

            if (nextPart.props && nextPart.props.doors) {
                for (let d of nextPart.props.doors) {
                    if (d.x === matchingDoor.x && d.y === matchingDoor.y) continue; 
                    let dir = this.getDoorDirection(d.x, d.y, nextSize);
                    if (dir) openConnections.push({ sourceWorldX: newX, sourceWorldY: newY, sourceSize: nextSize, dir: dir, doorLocalX: d.x, doorLocalY: d.y });
                }
            }
        }
        
        if (outsideParts.length > 0) {
            let shellRooms = [];
            for (let room of newDungeon.rooms) {
                let rSize = room.blueprint.gridSize || 32;

                // FIX: Only check the 4 flat sides. NO DIAGONALS!
                let dirs = [
                    {dx: 1, dy: 0, req: 'LEFT'}, {dx: -1, dy: 0, req: 'RIGHT'}, 
                    {dx: 0, dy: 1, req: 'TOP'}, {dx: 0, dy: -1, req: 'BOTTOM'}
                ];

                for (let d of dirs) {
                    let isBlockingDoor = false;
                    if (room.blueprint.props && room.blueprint.props.doors) {
                        for (let door of room.blueprint.props.doors) {
                            let dir = this.getDoorDirection(door.x, door.y, rSize);
                            if ((dir === 'RIGHT' && d.dx === 1 && d.dy === 0) ||
                                (dir === 'LEFT' && d.dx === -1 && d.dy === 0) ||
                                (dir === 'BOTTOM' && d.dx === 0 && d.dy === 1) ||
                                (dir === 'TOP' && d.dx === 0 && d.dy === -1)) {
                                isBlockingDoor = true;
                                break;
                            }
                        }
                    }
                    if (isBlockingDoor) continue;

                    let outPart = outsideParts[Math.floor(Math.random() * outsideParts.length)];
                    let outSize = outPart.gridSize || 32;
                    
                    let cx = room.worldX + d.dx * (((rSize * this.wallScale) / 2) + ((outSize * this.wallScale) / 2));
                    let cy = room.worldY + d.dy * (((rSize * this.wallScale) / 2) + ((outSize * this.wallScale) / 2));

                    let occupied = false;
                    let allCurrentRooms = [...newDungeon.rooms, ...shellRooms];
                    for (let existing of allCurrentRooms) {
                        let exSize = existing.blueprint.gridSize || 32;
                        let minDist = ((exSize * this.wallScale)/2) + ((outSize * this.wallScale)/2) - 20;
                        if (Math.abs(existing.worldX - cx) < minDist && Math.abs(existing.worldY - cy) < minDist) {
                            occupied = true; break;
                        }
                    }

                    if (!occupied) {
                        let clonedPart = JSON.parse(JSON.stringify(outPart));
                        let is2D = Array.isArray(outPart.data[0]);
                        let grid2D = is2D ? outPart.data : [];
                        if (!is2D) {
                            for(let r=0; r<outSize; r++) grid2D.push(outPart.data.slice(r*outSize, r*outSize+outSize));
                        }

                        let targetReq = d.req;

                        if (targetReq && clonedPart.props && clonedPart.props.outsides && clonedPart.props.outsides.length > 0) {
                            let marker = clonedPart.props.outsides[0]; 
                            let markerDir = this.getDoorDirection(marker.x, marker.y, outSize);
                            
                            if (markerDir) {
                                let mNum = this.getDirNum(markerDir);
                                let rNum = this.getDirNum(targetReq);
                                let turns = (rNum - mNum + 4) % 4;
                                clonedPart.data = this.rotate2DArray(grid2D, turns);
                            } else {
                                clonedPart.data = grid2D;
                            }
                        } else {
                            let turns = Math.floor(Math.random() * 4);
                            clonedPart.data = this.rotate2DArray(grid2D, turns);
                        }

                        shellRooms.push({ worldX: cx, worldY: cy, blueprint: clonedPart });
                    }
                }
            }
            newDungeon.rooms.push(...shellRooms); 
        }

        this.dungeons.push(newDungeon);
        console.log(`[ARCHITECT] Generated Dungeon Sector with ${placedRooms} connected rooms and a tight outer shell.`);
    }

    activateSpawners(roomX, roomY, blueprint, enemySys, library) {
        if (!blueprint.props || !blueprint.props.spawners || blueprint.props.spawners.length === 0) return;

        let enemyBlueprints = library.filter(p => p.format === 'ship_blueprint' || p.format === 'part');
        if (enemyBlueprints.length === 0) return;

        let pSize = blueprint.gridSize || 32;
        let startX = -(pSize * this.wallScale) / 2;
        let startY = startX;

        for (let spawner of blueprint.props.spawners) {
            let spawnX = roomX + startX + (spawner.x * this.wallScale);
            let spawnY = roomY + startY + (spawner.y * this.wallScale);
            let eBlueprint = enemyBlueprints[Math.floor(Math.random() * enemyBlueprints.length)];
            enemySys.spawn(spawnX, spawnY, eBlueprint);
        }
    }

    update(player, library, enemySys, worldSys, asteroidSys, targetRooms, projectiles, enemyProjectiles) {
        this.spawnTimer++;
        if (this.spawnTimer > 300 && player.hull > 0) { 
            this.spawnTimer = 0;
            let biome = worldSys.getBiome(player.x, player.y);
            if (biome.type !== 'safe') {
                let isFarEnough = true;
                for (let d of this.dungeons) {
                    if (Math.hypot(player.x - d.x, player.y - d.y) < 8000) isFarEnough = false;
                }
                
                if (isFarEnough && Math.random() < 0.40) { 
                    let angle = Math.random() * Math.PI * 2;
                    this.generate(player.x + Math.cos(angle) * 5000, player.y + Math.sin(angle) * 5000, library, enemySys, targetRooms);
                }
            }
        }

        let entitiesToCollide = [player, ...enemySys.enemies];
        if (asteroidSys) entitiesToCollide.push(...asteroidSys.asteroids);

        let allProjectiles = [];
        if (projectiles) allProjectiles.push(...projectiles);
        if (enemyProjectiles) allProjectiles.push(...enemyProjectiles);

        for (let d of this.dungeons) {
            for (let room of d.rooms) {
                let pSize = room.blueprint.gridSize || 32;
                let halfSize = (pSize * this.wallScale) / 2;
                let is2D = Array.isArray(room.blueprint.data[0]);

                for (let ent of entitiesToCollide) {
                    let dx = ent.x - room.worldX;
                    let dy = ent.y - room.worldY;

                    if (Math.abs(dx) < halfSize + 15 && Math.abs(dy) < halfSize + 15) {
                        let gridX = Math.floor((dx + halfSize) / this.wallScale);
                        let gridY = Math.floor((dy + halfSize) / this.wallScale);

                        if (gridY >= 0 && gridY < pSize && gridX >= 0 && gridX < pSize) {
                            let colorVal = is2D ? (room.blueprint.data[gridY] ? room.blueprint.data[gridY][gridX] : 0) : room.blueprint.data[gridY * pSize + gridX];

                            if (colorVal !== 0 && colorVal !== null && colorVal !== 'transparent') {
                                let impactSpeed = Math.hypot(ent.vx, ent.vy);
                                ent.vx *= -0.4;
                                ent.vy *= -0.4;
                                ent.x += ent.vx * 2; 
                                ent.y += ent.vy * 2;

                                if (ent === player && impactSpeed > 15) {
                                    if (!window.dungeonDamageCooldown) { 
                                        player.hull -= 10;
                                        window.dungeonDamageCooldown = true;
                                        setTimeout(() => window.dungeonDamageCooldown = false, 500); 
                                    }
                                }
                            }
                        }
                    }
                }

                for (let i = allProjectiles.length - 1; i >= 0; i--) {
                    let p = allProjectiles[i];
                    let dx = p.x - room.worldX;
                    let dy = p.y - room.worldY;

                    if (Math.abs(dx) < halfSize && Math.abs(dy) < halfSize) {
                        let gridX = Math.floor((dx + halfSize) / this.wallScale);
                        let gridY = Math.floor((dy + halfSize) / this.wallScale);

                        if (gridY >= 0 && gridY < pSize && gridX >= 0 && gridX < pSize) {
                            let colorVal = is2D ? (room.blueprint.data[gridY] ? room.blueprint.data[gridY][gridX] : 0) : room.blueprint.data[gridY * pSize + gridX];

                            if (colorVal !== 0 && colorVal !== null && colorVal !== 'transparent') {
                                p.life = 0; 
                            }
                        }
                    }
                }
            }
        }
    }

    draw(ctx, camera, palette) {
        for (let d of this.dungeons) {
            for (let room of d.rooms) {
                let screenX = room.worldX - camera.x;
                let screenY = room.worldY - camera.y;

                if (screenX < -2000 || screenX > ctx.canvas.width + 2000 || screenY < -2000 || screenY > ctx.canvas.height + 2000) continue;

                ctx.save();
                ctx.translate(screenX, screenY);

                let pSize = room.blueprint.gridSize || 32;
                let startX = -(pSize * this.wallScale) / 2;
                let startY = startX;
                let is2D = Array.isArray(room.blueprint.data[0]);

                for (let r = 0; r < pSize; r++) {
                    for (let c = 0; c < pSize; c++) {
                        let colorVal = is2D ? (room.blueprint.data[r] ? room.blueprint.data[r][c] : 0) : room.blueprint.data[r * pSize + c];
                        
                        if (colorVal !== 0 && colorVal !== null && colorVal !== 'transparent') {
                            let finalColor = (typeof colorVal === 'number') ? palette[colorVal] : colorVal;
                            if (finalColor && finalColor !== "0") {
                                ctx.fillStyle = finalColor;
                                ctx.fillRect(startX + (c * this.wallScale), startY + (r * this.wallScale), this.wallScale + 0.5, this.wallScale + 0.5);
                            }
                        }
                    }
                }
                ctx.restore();
            }
        }
    }
}