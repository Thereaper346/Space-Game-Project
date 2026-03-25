// ============================================================================
// FILE: camera.js
// ============================================================================

export const camera = {
    x: 0,
    y: 0,
    currentScale: 1.0,
    targetScale: 1.0,
    
    update(player, canvas) {
        // 1. Track the player
        this.x = player.x - canvas.width / 2;
        this.y = player.y - canvas.height / 2;
        
        // 2. Smooth Zoom Transition
        // Move currentScale 10% closer to the targetScale every frame
        let diff = this.targetScale - this.currentScale;
        if (Math.abs(diff) > 0.005) {
            this.currentScale += diff * 0.1; 
        } else {
            this.currentScale = this.targetScale; // Snap when close enough
        }
    },
    
    toggleZoom() {
        if (this.targetScale === 1.0) {
            this.targetScale = 0.4; // Zoom out to 250% view area (1.0 / 2.5 = 0.4)
        } else {
            this.targetScale = 1.0; // Zoom back to 100%
        }
    }
};