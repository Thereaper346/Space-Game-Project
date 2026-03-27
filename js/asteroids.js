// ============================================================================
// FILE: asteroids.js (Restored Spawn Distances & Boosted Belt Density)
// ============================================================================
import { audio } from './audio.js';

export class AsteroidManager {
    constructor() {
        this.asteroids = [];
        this.particles = [];
        this.debris = []; 
        this.targetCount = 20; 
        
        this.baseColors = [
            { light: '#666666', dark: '#222222' }, 
            { light: '#777777', dark: '#2a2a2a' }, 
            { light: '#555555', dark: '#1a1a1a' }  
        ];
        this.globalLightAngle = -Math.PI / 4; 
    }

    managePopulation(playerX, playerY, worldSys, dungeonSys) {
        let currentBiome = 'wilderness';
        if (worldSys) {
            currentBiome = worldSys.getBiome(playerX, playerY).type;
        }
        
        // BOOSTED: 20 normally, 100 in the asteroid belt!
        this.targetCount = (currentBiome === 'asteroid_belt') ? 100 : 20;

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            let dist = Math.hypot(this.asteroids[i].x - playerX, this.asteroids[i].y - playerY);
            if (dist > 15000) this.asteroids.splice(i, 1); 
        }
        
        let attempts = 0;
        while (this.asteroids.length < this.targetCount && attempts < 30) {
            attempts++;
            let spawnAngle = Math.random() * Math.PI * 2;
            
            // FIX: Restored the tighter spawn radius so they actually appear near you!
            // 2000 is just off-screen on a zoomed out monitor.
            let spawnDist = 2000 + Math.random() * 1500;
            
            let sx = playerX + Math.cos(spawnAngle) * spawnDist;
            let sy = playerY + Math.sin(spawnAngle) * spawnDist;

            let hitDungeon = false;
            if (dungeonSys) {
                for (let d of dungeonSys.dungeons) {
                    for (let room of d.rooms) {
                        let pSize = room.blueprint.gridSize || 32;
                        let halfSize = (pSize * dungeonSys.wallScale) / 2;
                        if (Math.abs(sx - room.worldX) < halfSize + 800 && Math.abs(sy - room.worldY) < halfSize + 800) {
                            hitDungeon = true; break;
                        }
                    }
                    if (hitDungeon) break;
                }
            }

            if (!hitDungeon) {
                this.spawn(sx, sy);
            }
        }
    }

    spawn(x, y) {
        let scale = Math.random() * 2.5 + 0.5; 
        let baseRadius = 60; 
        let maxHealth = Math.ceil(scale * 2) * 25;

        let vertices = [];
        let craters = []; 
        let numPoints = 40 + Math.floor(Math.random() * 20); 
        let noiseSeed1 = Math.random() * 100;
        let noiseSeed2 = Math.random() * 100;
        let maxRadius = 0;

        for(let i = 0; i < numPoints; i++) {
            let angle = (i / numPoints) * Math.PI * 2;
            let r = baseRadius;
            r += Math.sin(angle * 3 + noiseSeed1) * (baseRadius * 0.10); 
            r += Math.cos(angle * 6 + noiseSeed2) * (baseRadius * 0.05); 
            r += Math.sin(angle * 14) * (baseRadius * 0.02);             

            if (r > maxRadius) maxRadius = r;
            vertices.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r });
        }

        let numCraters = Math.floor(Math.random() * 3) + 2;
        for(let i = 0; i < numCraters; i++) {
            let distFromCenter = Math.random() * (baseRadius * 0.4);
            let craterAngle = Math.random() * Math.PI * 2;
            craters.push({
                x: Math.cos(craterAngle) * distFromCenter,
                y: Math.sin(craterAngle) * distFromCenter,
                r: Math.random() * 8 + 4 
            });
        }

        let palette = this.baseColors[Math.floor(Math.random() * this.baseColors.length)];

        this.asteroids.push({
            x: x, y: y,
            vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2,
            angle: Math.random() * Math.PI * 2,
            rotSpeed: (Math.random() - 0.5) * 0.02, 
            scale: scale, 
            hp: maxHealth, 
            vertices: vertices, craters: craters,
            radius: maxRadius * scale, 
            palette: palette
        });
    }

    explode(asteroid, itemSys, library, dropRate = 100) {
        audio.playSFX('sfx_explosion'); 

        for (let i = 0; i < 15 * asteroid.scale; i++) {
            this.debris.push({
                x: asteroid.x, y: asteroid.y,
                vx: asteroid.vx + (Math.random() - 0.5) * 8, vy: asteroid.vy + (Math.random() - 0.5) * 8,
                rot: (Math.random() - 0.5) * 0.4, angle: Math.random() * Math.PI * 2,
                length: Math.random() * 20 + 10, life: 60, maxLife: 60
            });
        }
        for (let i = 0; i < 40 * asteroid.scale; i++) {
            this.particles.push({
                x: asteroid.x, y: asteroid.y,
                vx: asteroid.vx * 0.5 + (Math.random() - 0.5) * 12 * asteroid.scale,
                vy: asteroid.vy * 0.5 + (Math.random() - 0.5) * 12 * asteroid.scale,
                size: Math.random() * 5 * asteroid.scale + 2,
                color: Math.random() > 0.5 ? '#888888' : '#bbbbbb', 
                life: Math.random() * 30 + 10
            });
        }

        if (itemSys && Math.random() < (dropRate / 100)) {
            if (Math.random() > 0.4) {
                itemSys.spawn(asteroid.x, asteroid.y, library, 'resource', 'iron');
            } else {
                itemSys.spawn(asteroid.x, asteroid.y, library); 
            }
        }
    }

    pointInPoly(worldX, worldY, ast) {
        let dx = worldX - ast.x, dy = worldY - ast.y;
        let cosA = Math.cos(-ast.angle), sinA = Math.sin(-ast.angle);
        let localX = (dx * cosA - dy * sinA) / ast.scale;
        let localY = (dx * sinA + dy * cosA) / ast.scale;

        let inside = false;
        for (let i = 0, j = ast.vertices.length - 1; i < ast.vertices.length; j = i++) {
            let xi = ast.vertices[i].x, yi = ast.vertices[i].y;
            let xj = ast.vertices[j].x, yj = ast.vertices[j].y;
            let intersect = ((yi > localY) != (yj > localY)) && (localX < (xj - xi) * (localY - yi) / (yj - yi) + xi);
            if (intersect) inside = !inside;
        }
        return inside;
    }

    lineIntersects(x1, y1, x2, y2, x3, y3, x4, y4) {
        let det = (x2 - x1) * (y4 - y3) - (x4 - x3) * (y2 - y1);
        if (det === 0) return false;
        let lambda = ((y4 - y3) * (x4 - x1) + (x3 - x4) * (y4 - y1)) / det;
        let gamma = ((y1 - y2) * (x4 - x1) + (x2 - x1) * (y4 - y1)) / det;
        return (0 < lambda && lambda < 1) && (0 < gamma && gamma < 1);
    }

    update(projectiles, player, itemSys, library, dropRate = 100, stations = [], worldSys = null, dungeonSys = null) {
        if (player) this.managePopulation(player.x, player.y, worldSys, dungeonSys);

        let shipRadius = player && player.equippedShip ? (player.equippedShip.gridSize * 16 * 2) / 2 : 30;

        for (let i = this.asteroids.length - 1; i >= 0; i--) {
            let ast = this.asteroids[i];
            
            let hitAura = false;
            if (stations) {
                for (let s of stations) {
                    if (Math.hypot(ast.x - s.x, ast.y - s.y) < 800) {
                        hitAura = true;
                        break;
                    }
                }
            }

            if (hitAura) {
                for(let s=0; s < 10 * ast.scale; s++) {
                    this.particles.push({
                        x: ast.x, y: ast.y,
                        vx: ast.vx + (Math.random() - 0.5) * 10, vy: ast.vy + (Math.random() - 0.5) * 10,
                        size: Math.random() * 3 + 1, color: '#00ffcc', life: 20
                    });
                }
                this.asteroids.splice(i, 1);
                continue;
            }

            ast.x += ast.vx; ast.y += ast.vy; ast.angle += ast.rotSpeed;

            let worldVerts = ast.vertices.map(v => {
                return {
                    x: ast.x + (v.x * Math.cos(ast.angle) - v.y * Math.sin(ast.angle)) * ast.scale,
                    y: ast.y + (v.x * Math.sin(ast.angle) + v.y * Math.cos(ast.angle)) * ast.scale
                };
            });

            if (player && player.hull > 0 && player.equippedShip) {
                if (Math.hypot(ast.x - player.x, ast.y - player.y) < ast.radius + shipRadius + 50) {
                    
                    let shipCoreOffset = 15; 
                    let shipPoints = [
                        {x: player.x, y: player.y},
                        {x: player.x + Math.cos(player.angle)*shipCoreOffset, y: player.y + Math.sin(player.angle)*shipCoreOffset},
                        {x: player.x - Math.cos(player.angle)*shipCoreOffset, y: player.y - Math.sin(player.angle)*shipCoreOffset},
                        {x: player.x + Math.cos(player.angle + Math.PI/2)*shipCoreOffset, y: player.y + Math.sin(player.angle + Math.PI/2)*shipCoreOffset},
                        {x: player.x + Math.cos(player.angle - Math.PI/2)*shipCoreOffset, y: player.y + Math.sin(player.angle - Math.PI/2)*shipCoreOffset}
                    ];

                    let crashed = false;
                    for (let pt of shipPoints) {
                        if (this.pointInPoly(pt.x, pt.y, ast)) { crashed = true; break; }
                    }

                    if (crashed) {
                        let impactSpeed = Math.hypot(player.vx, player.vy);
                        let knockback = Math.max(impactSpeed * 0.8, 3); 
                        let angle = Math.atan2(player.y - ast.y, player.x - ast.x);
                        
                        player.vx = Math.cos(angle) * knockback; 
                        player.vy = Math.sin(angle) * knockback;
                        
                        player.x += Math.cos(angle) * 5;
                        player.y += Math.sin(angle) * 5;
                        
                        player.hull -= 20; 
                        this.explode(ast, itemSys, library, dropRate);
                        this.asteroids.splice(i, 1);
                        continue; 
                    }
                }
            }

            for (let j = projectiles.length - 1; j >= 0; j--) {
                let p = projectiles[j];
                
                if (Math.hypot(ast.x - p.x, ast.y - p.y) > ast.radius + 300) continue; 

                let hitTarget = false;

                for (let v = 0, next = worldVerts.length - 1; v < worldVerts.length; next = v++) {
                    if (this.lineIntersects(p.lastX, p.lastY, p.x, p.y, worldVerts[v].x, worldVerts[v].y, worldVerts[next].x, worldVerts[next].y)) {
                        hitTarget = true;
                        break;
                    }
                }
                
                if (!hitTarget && this.pointInPoly(p.x, p.y, ast)) hitTarget = true;

                if (hitTarget) {
                    ast.hp -= 25; 
                    
                    audio.playSFX('enemy_hit');

                    for(let s=0; s<5; s++) {
                        this.particles.push({
                            x: p.x, y: p.y,
                            vx: ast.vx + (Math.random() - 0.5) * 5, vy: ast.vy + (Math.random() - 0.5) * 5,
                            size: Math.random() * 3 + 1, color: '#00ffcc', life: 15
                        });
                    }
                    projectiles.splice(j, 1); 
                    if (ast.hp <= 0) {
                        this.explode(ast, itemSys, library, dropRate);
                        this.asteroids.splice(i, 1);
                        break; 
                    }
                }
            }
        }

        for (let i = this.debris.length - 1; i >= 0; i--) {
            let d = this.debris[i]; d.x += d.vx; d.y += d.vy; d.angle += d.rot; d.life--;
            if (d.life <= 0) this.debris.splice(i, 1);
        }
        for (let i = this.particles.length - 1; i >= 0; i--) {
            let p = this.particles[i]; p.x += p.vx; p.y += p.vy; p.life--; p.size *= 0.95; 
            if (p.life <= 0) this.particles.splice(i, 1);
        }
    }

    draw(ctx, camera, palette, debugMode = false) {
        let scaleCam = camera.currentScale || 1.0;
        let viewRadiusX = (ctx.canvas.width / scaleCam) / 2;
        let viewRadiusY = (ctx.canvas.height / scaleCam) / 2;
        let cx = ctx.canvas.width / 2;
        let cy = ctx.canvas.height / 2;

        for (let ast of this.asteroids) {
            let screenX = ast.x - camera.x;
            let screenY = ast.y - camera.y;

            let buffer = (ast.radius * ast.scale) + 200;
            if (screenX < cx - viewRadiusX - buffer || screenX > cx + viewRadiusX + buffer || 
                screenY < cy - viewRadiusY - buffer || screenY > cy + viewRadiusY + buffer) {
                continue;
            }

            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(ast.angle);
            ctx.scale(ast.scale, ast.scale); 
            
            let shadowOffsetX = Math.cos(this.globalLightAngle + Math.PI) * (3 / ast.scale);
            let shadowOffsetY = Math.sin(this.globalLightAngle + Math.PI) * (3 / ast.scale);
            
            let rotShadowX = shadowOffsetX * Math.cos(-ast.angle) - shadowOffsetY * Math.sin(-ast.angle);
            let rotShadowY = shadowOffsetX * Math.sin(-ast.angle) + shadowOffsetY * Math.cos(-ast.angle);

            ctx.beginPath();
            ctx.moveTo(ast.vertices[0].x + rotShadowX, ast.vertices[0].y + rotShadowY);
            for (let i = 1; i < ast.vertices.length; i++) {
                ctx.lineTo(ast.vertices[i].x + rotShadowX, ast.vertices[i].y + rotShadowY);
            }
            ctx.closePath();
            ctx.fillStyle = '#111111'; 
            ctx.fill();

            let gradX1 = Math.cos(-ast.angle + this.globalLightAngle) * 60;
            let gradY1 = Math.sin(-ast.angle + this.globalLightAngle) * 60;
            let gradX2 = Math.cos(-ast.angle + this.globalLightAngle + Math.PI) * 60;
            let gradY2 = Math.sin(-ast.angle + this.globalLightAngle + Math.PI) * 60;

            let gradient = ctx.createLinearGradient(gradX1, gradY1, gradX2, gradY2);
            gradient.addColorStop(0, ast.palette.light); 
            gradient.addColorStop(1, ast.palette.dark);  

            ctx.beginPath();
            ctx.moveTo(ast.vertices[0].x, ast.vertices[0].y);
            for(let v = 1; v < ast.vertices.length; v++) {
                ctx.lineTo(ast.vertices[v].x, ast.vertices[v].y);
            }
            ctx.closePath(); 

            ctx.fillStyle = gradient; 
            ctx.fill();

            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.5 / ast.scale;
            ctx.stroke();

            if (debugMode) {
                ctx.strokeStyle = '#00ff00';
                ctx.lineWidth = 4 / ast.scale;
                ctx.stroke();
            }

            for (let c of ast.craters) {
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.3)'; 
                ctx.fill();
                
                let highlightStart = -ast.angle + this.globalLightAngle + (Math.PI / 2);
                let highlightEnd = -ast.angle + this.globalLightAngle + (Math.PI * 1.5);
                
                ctx.beginPath();
                ctx.arc(c.x, c.y, c.r, highlightStart, highlightEnd);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                ctx.lineWidth = 2 / ast.scale;
                ctx.stroke();
            }
            ctx.restore();
        }

        for (let d of this.debris) {
            let screenX = d.x - camera.x;
            let screenY = d.y - camera.y;
            ctx.save();
            ctx.translate(screenX, screenY);
            ctx.rotate(d.angle);
            ctx.globalAlpha = d.life / d.maxLife; 
            ctx.beginPath();
            ctx.moveTo(-d.length/2, 0);
            ctx.lineTo(d.length/2, 0);
            ctx.strokeStyle = '#888888';
            ctx.lineWidth = 2;
            ctx.stroke();
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