// ============================================================================
// FILE: dungeon.js (The Procedural Maze Architect)
// ============================================================================

export class DungeonManager {
    constructor() {
        this.dungeons = [];
        this.wallScale = 8; // Mazes are drawn huge so you can fly inside them!
    }

    generate(x, y, library, enemySys) {
        // 1. Filter the library for Maze Pieces
        // FIX: Now it strictly looks for the new dropdown tag!
        let mazeParts = library.filter(p => p.format === 'world_part' && p.props && p.props.type === 'maze_room');
        
        let vaultParts = mazeParts.filter(p => p.name.toLowerCase().includes('vault') || p.name.toLowerCase().includes('treasure'));
        let normalParts = mazeParts.filter(p => !p.name.toLowerCase().includes('vault') && !p.name.toLowerCase().includes('treasure'));

        // If you haven't built any maze pieces yet, abort generation
        if (normalParts.length === 0) return; 

        let newDungeon = {
            x: x,
            y: y,
            rooms: []
        };

        // 2. Procedurally String Rooms Together
        // For V1, we will generate a 3-room deep corridor. 
        let currentX = x;
        let currentY = y;
        let numRooms = 3;

        for (let i = 0; i < numRooms; i++) {
            let roomBlueprint = normalParts[Math.floor(Math.random() * normalParts.length)];
            
            // Guarantee the final room is a Vault (if you built one!)
            if (i === numRooms - 1 && vaultParts.length > 0) {
                roomBlueprint = vaultParts[Math.floor(Math.random() * vaultParts.length)];
            }

            newDungeon.rooms.push({
                worldX: currentX,
                worldY: currentY,
                blueprint: roomBlueprint
            });

            // Trigger the Spawners for this room
            this.activateSpawners(currentX, currentY, roomBlueprint, enemySys, library);

            // Shift the coordinates so the next room attaches to the right edge
            let pSize = roomBlueprint.gridSize || 32;
            currentX += (pSize * this.wallScale);
        }

        this.dungeons.push(newDungeon);
        console.log("[ARCHITECT] Procedural Anomaly Generated at", x, y);
    }

    activateSpawners(roomX, roomY, blueprint, enemySys, library) {
        if (!blueprint.props || !blueprint.props.spawners || blueprint.props.spawners.length === 0) return;

        // Find available enemies from your library
        let enemyBlueprints = library.filter(p => p.format === 'ship_blueprint' || p.format === 'part');
        if (enemyBlueprints.length === 0) return;

        let pSize = blueprint.gridSize || 32;
        let startX = -(pSize * this.wallScale) / 2;
        let startY = startX;

        for (let spawner of blueprint.props.spawners) {
            // Calculate exact world coordinates of the spawner pixel
            let spawnX = roomX + startX + (spawner.x * this.wallScale);
            let spawnY = roomY + startY + (spawner.y * this.wallScale);

            let eBlueprint = enemyBlueprints[Math.floor(Math.random() * enemyBlueprints.length)];
            
            // Spawn an enemy exactly on this pixel
            enemySys.spawn(spawnX, spawnY, eBlueprint);
        }
    }

    update(player, library, enemySys, worldSys) {
        // 1. Spawn a Dungeon if none exist and we are in deep space
        if (this.dungeons.length < 1 && player.hull > 0) {
            let biome = worldSys.getBiome(player.x, player.y);
            if (biome.type !== 'safe') {
                // Spawn the maze 3000 pixels away from the player
                let angle = Math.random() * Math.PI * 2;
                this.generate(player.x + Math.cos(angle) * 3000, player.y + Math.sin(angle) * 3000, library, enemySys);
            }
        }

        // 2. Pixel-Perfect Wall Collisions!
        for (let d of this.dungeons) {
            for (let room of d.rooms) {
                let pSize = room.blueprint.gridSize || 32;
                let halfSize = (pSize * this.wallScale) / 2;
                
                let dx = player.x - room.worldX;
                let dy = player.y - room.worldY;

                // Check if player is inside the bounding box of this room
                if (Math.abs(dx) < halfSize + 15 && Math.abs(dy) < halfSize + 15) {
                    
                    // Find exactly which pixel the player is touching
                    let gridX = Math.floor((dx + halfSize) / this.wallScale);
                    let gridY = Math.floor((dy + halfSize) / this.wallScale);

                    if (gridY >= 0 && gridY < pSize && gridX >= 0 && gridX < pSize) {
                        let is2D = Array.isArray(room.blueprint.data[0]);
                        let colorVal = is2D ? (room.blueprint.data[gridY] ? room.blueprint.data[gridY][gridX] : 0) : room.blueprint.data[gridY * pSize + gridX];

                        // If the pixel is painted (not transparent), it's a solid wall!
                        if (colorVal !== 0 && colorVal !== null && colorVal !== 'transparent') {
                            // Bounce the player back!
                            player.vx *= -1.5;
                            player.vy *= -1.5;
                            player.x += player.vx;
                            player.y += player.vy;
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

                // Optimization: Don't draw rooms that are off-screen
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