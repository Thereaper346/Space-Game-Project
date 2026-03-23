// ============================================================================
// FILE: player.js (The RPG Player Class - Economy Update)
// ============================================================================
import { defaultShip } from './defaultShip.js';

export class Player {
    constructor() {
        // Flight & Physics
        this.x = 0; 
        this.y = 0; 
        this.vx = 0; 
        this.vy = 0; 
        this.size = 30; 
        this.speed = 0.5; 
        this.color = '#00ffcc'; 
        this.angle = 0;
        this.equippedShip = defaultShip; 

        // Combat Stats
        this.fireCooldown = 0; 
        this.fireRate = 20; 
        this.hull = 300; 
        this.maxHull = 300;
        this.ammo = 200; 
        this.maxAmmo = 200; 

        // Warp Coil (Boost)
        this.boostMax = 100; 
        this.boostAmount = 100;
        this.boostDrain = 100 / (7 * 60); 
        this.boostRecover = 100 / (5 * 60);  
        this.isBoosting = false; 
        this.boostOverheated = false; 
        this.isThrusting = false; 

        // Battery System (Invisibility Cloak)
        this.batteryMax = 100;
        this.batteryAmount = 100;
        this.batteryDrain = 100 / (5 * 60); 
        this.batteryRecover = 100 / (8 * 60); 
        this.isCloaked = false;
        this.batteryEmpty = false;

        // ==========================================
        // RPG Inventory Vault (Now with Credits!)
        // ==========================================
        this.inventory = {
            credits: 0, // Your Space Cash
            
            // Raw Materials
            iron: 0,
            scrap: 0,
            energyCells: 0,

            // Manufactured Components (Bought from Shops)
            hullPlating: 0,
            thrusters: 0,
            laserEmitters: 0
        };
    }

    update() {
        // Passive Warp Coil Recharge
        if (!this.isBoosting) {
            if (this.boostAmount < this.boostMax) {
                this.boostAmount += this.boostRecover;
                if (this.boostAmount > this.boostMax) this.boostAmount = this.boostMax;
            }
        }
        if (this.boostAmount >= 70) this.boostOverheated = false;

        // Passive Battery Recharge
        if (!this.isCloaked) {
            if (this.batteryAmount < this.batteryMax) {
                this.batteryAmount += this.batteryRecover;
                if (this.batteryAmount > this.batteryMax) this.batteryAmount = this.batteryMax;
            }
        }
        // Must recharge to at least 50% after bottoming out to use cloak again
        if (this.batteryAmount >= 50) this.batteryEmpty = false; 
    }
}