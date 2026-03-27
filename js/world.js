// ============================================================================
// FILE: world.js (Added Asteroid Belt & Updated Scale to 9100)
// ============================================================================

export class WorldManager {
    constructor(seed = 1337) {
        this.seed = seed;
        // FIX: The new default massive noise scale
        this.scale = 9100; 
    }

    hash(x, y) {
        let n = Math.sin(x * 12.9898 + y * 78.233 + this.seed) * 43758.5453123;
        return n - Math.floor(n);
    }

    lerp(a, b, t) {
        return a + t * (b - a);
    }

    fade(t) {
        return t * t * t * (t * (t * 6 - 15) + 10);
    }

    getNoise(x, y) {
        let ix = Math.floor(x);
        let iy = Math.floor(y);
        let fx = x - ix;
        let fy = y - iy;

        let u = this.fade(fx);
        let v = this.fade(fy);

        let n00 = this.hash(ix, iy);
        let n10 = this.hash(ix + 1, iy);
        let n01 = this.hash(ix, iy + 1);
        let n11 = this.hash(ix + 1, iy + 1);

        let nx0 = this.lerp(n00, n10, u);
        let nx1 = this.lerp(n01, n11, u);

        return this.lerp(nx0, nx1, v);
    }

    getBiome(worldX, worldY) {
        // This function returns a noise value between 0.0 and 1.0
        let noiseValue = this.getNoise(worldX / this.scale, worldY / this.scale);

        if (noiseValue < 0.35) {
            return { name: 'SAFE ZONE', type: 'safe', color: '#00ffcc', threat: 0, bgTint: 'rgba(0, 50, 100, 0.1)' };
        } else if (noiseValue > 0.65) {
            return { name: 'DANGER ZONE', type: 'danger', color: '#ff0044', threat: 2.0, bgTint: 'rgba(100, 0, 20, 0.1)' };
        } 
        // --- NEW: ASTEROID BELT ---
        // Sits exactly on the border right before you hit the Danger Zone!
        else if (noiseValue > 0.55) { 
            return { name: 'ASTEROID BELT', type: 'asteroid_belt', color: '#ffaa00', threat: 1.5, bgTint: 'rgba(50, 25, 0, 0.15)' };
        } 
        else {
            return { name: 'WILDERNESS', type: 'wild', color: '#aaaaaa', threat: 1.0, bgTint: 'rgba(0, 0, 0, 0)' };
        }
    }

    // ==========================================
    // RADAR SCANNER
    // Pings outwards to find the direction of the nearest safe zone
    // ==========================================
    getClosestSafeZoneAngle(worldX, worldY) {
        if (this.getNoise(worldX / this.scale, worldY / this.scale) < 0.35) return null;

        for (let r = 500; r <= 10000; r += 500) {
            for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) { 
                let checkX = worldX + Math.cos(a) * r;
                let checkY = worldY + Math.sin(a) * r;
                
                if (this.getNoise(checkX / this.scale, checkY / this.scale) < 0.35) {
                    return a; 
                }
            }
        }
        return null; 
    }
}