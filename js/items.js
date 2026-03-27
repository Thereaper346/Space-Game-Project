// ============================================================================
// FILE: item.js (Fixed Center-Scale Zoom Culling bug)
// ============================================================================
import { audio } from './audio.js';

export class ItemManager {
    constructor() {
        this.items = [];
    }

    spawn(x, y, library, forceType = null, forceResource = null) {
        let type = forceType || (Math.random() > 0.5 ? 'health' : 'ammo');
        let resType = forceResource;
        
        let customBlueprint = null;
        if (library) {
            let possibleItems = library.filter(p => {
                if (!p.props) return false;
                if (type === 'resource') {
                    let pResType = p.props.resourceType || 'iron';
                    return p.props.type === 'resource' && pResType === resType;
                }
                let pItemRestore = p.props.itemRestore || 'ammo';
                return p.props.type === 'item' && pItemRestore === type;
            });
            
            if (possibleItems.length > 0) {
                customBlueprint = possibleItems[Math.floor(Math.random() * possibleItems.length)];
            }
        }

        this.items.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 1.5, 
            vy: (Math.random() - 0.5) * 1.5,
            angle: 0,
            rotSpeed: (Math.random() - 0.5) * 0.05,
            type: type,
            resourceType: resType,
            blueprint: customBlueprint,
            life: 1800, 
            radius: 15 
        });
    }

    update(player) {
        for (let i = this.items.length - 1; i >= 0; i--) {
            let item = this.items[i];
            item.x += item.vx;
            item.y += item.vy;
            item.angle += item.rotSpeed;
            item.life--;

            if (item.life <= 0) {
                this.items.splice(i, 1);
                continue;
            }

            if (player && player.hull > 0) {
                let dist = Math.hypot(item.x - player.x, item.y - player.y);
                
                if (dist < 150) { 
                    if (item.type === 'health') {
                        player.hull += 75;
                        if (player.hull > player.maxHull) player.hull = player.maxHull;
                        audio.playSFX('sfx_health'); 
                    } else if (item.type === 'ammo') {
                        player.ammo += 50;
                        if (player.ammo > player.maxAmmo) player.ammo = player.maxAmmo;
                        audio.playSFX('sfx_ammo'); 
                    } else if (item.type === 'resource') {
                        let amount = Math.floor(Math.random() * 5) + 1;
                        if (item.resourceType === 'iron') player.inventory.iron += amount;
                        if (item.resourceType === 'scrap') player.inventory.scrap += amount;
                        if (item.resourceType === 'energyCells') player.inventory.energyCells += amount;
                        
                        audio.playSFX('sfx_ore'); 
                    }
                    this.items.splice(i, 1); 
                }
            }
        }
    }

    draw(ctx, camera, palette, debugMode = false) {
        for (let item of this.items) {
            let screenX = item.x - camera.x;
            let screenY = item.y - camera.y;
            
            // --- FIX: TRUE CAMERA BOUNDS MATH ---
            // Dynamically calculates the viewable area based on your zoom scale!
            let scale = camera.currentScale || 1.0;
            let cx = ctx.canvas.width / 2;
            let cy = ctx.canvas.height / 2;
            let viewRadiusX = (ctx.canvas.width / scale) / 2;
            let viewRadiusY = (ctx.canvas.height / scale) / 2;

            if (screenX < cx - viewRadiusX - 400 || screenX > cx + viewRadiusX + 400 || 
                screenY < cy - viewRadiusY - 400 || screenY > cy + viewRadiusY + 400) continue;
            // ------------------------------------

            ctx.save();
            ctx.translate(screenX, screenY);
            
            if (item.life < 180 && item.life % 20 < 10) ctx.globalAlpha = 0.3;

            if (item.blueprint) {
                ctx.rotate(item.angle);
                const flightScale = 2;

                if (item.blueprint.format === 'part' || !item.blueprint.format) {
                    const gridSize = item.blueprint.gridSize || 16;
                    const startX = -(gridSize * flightScale) / 2;
                    const startY = startX;
                    
                    for (let r = 0; r < gridSize; r++) {
                        if (!item.blueprint.data[r]) continue;
                        for (let c = 0; c < gridSize; c++) {
                            let colorVal = item.blueprint.data[r][c];
                            if (colorVal !== 0 && colorVal !== null && colorVal !== undefined) {
                                // Universal Color Translator
                                ctx.fillStyle = (typeof colorVal === 'number') ? palette[colorVal] : colorVal;
                                ctx.fillRect(startX + (c * flightScale), startY + (r * flightScale), flightScale, flightScale);
                            }
                        }
                    }
                } 
                else {
                    const gridBlocks = item.blueprint.gridSize; 
                    const blockVisualSize = 16 * flightScale; 
                    const startX = -(gridBlocks * blockVisualSize) / 2;
                    const startY = startX;

                    for (let row = 0; row < gridBlocks; row++) {
                        for (let col = 0; col < gridBlocks; col++) {
                            const part = item.blueprint.data[row][col];
                            if (part && part.data) {
                                const partX = startX + (col * blockVisualSize);
                                const partY = startY + (row * blockVisualSize);
                                
                                const pGridSize = part.gridSize || 16;
                                for (let pRow = 0; pRow < pGridSize; pRow++) {
                                    if (!part.data[pRow]) continue;
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
            } else {
                ctx.rotate(item.angle);
                if (item.type === 'health') {
                    ctx.fillStyle = '#00ff00';
                    ctx.fillRect(-8, -3, 16, 6);
                    ctx.fillRect(-3, -8, 6, 16);
                } else if (item.type === 'ammo') {
                    ctx.fillStyle = '#ffff00';
                    ctx.fillRect(-4, -6, 8, 12);
                    ctx.fillStyle = '#ff8800';
                    ctx.fillRect(-4, 6, 8, 4);
                } else if (item.type === 'resource') {
                    if (item.resourceType === 'iron') ctx.fillStyle = '#888888';
                    if (item.resourceType === 'scrap') ctx.fillStyle = '#aa5500';
                    if (item.resourceType === 'energyCells') ctx.fillStyle = '#00ccff';
                    ctx.beginPath();
                    ctx.arc(0, 0, 6, 0, Math.PI * 2);
                    ctx.fill();
                }
            }

            if (debugMode) {
                ctx.beginPath();
                ctx.arc(0, 0, 150, 0, Math.PI * 2); 
                ctx.strokeStyle = 'rgba(255, 255, 0, 0.4)';
                ctx.lineWidth = 2;
                ctx.stroke();
            }

            ctx.restore();
        }
    }
}