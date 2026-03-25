// ============================================================================
// FILE: background.js (Your original math, upgraded for Zoom!)
// ============================================================================

export class Starfield {
    constructor(count) {
        this.stars = [];
        // Expanded to 8000 to cover the massive 250% zoomed-out camera view
        this.buffer = 8000; 
        
        // Because 8000 is 4x wider and 4x taller than 2000, it is 16x the area.
        // We multiply the count by 16 so your exact star density remains identical!
        let actualCount = count * 16; 
        
        for (let i = 0; i < actualCount; i++) {
            this.stars.push({
                x: Math.random() * this.buffer,
                y: Math.random() * this.buffer,
                size: Math.random() * 2,
                parallax: Math.random() * 0.7 + 0.1 
            });
        }
    }

    draw(ctx, camera, canvas) {
        ctx.fillStyle = "white";
        
        // 1. Calculate the real boundaries of the camera based on zoom scale
        let scale = camera.currentScale || 1.0;
        let logicalWidth = canvas.width / scale;
        let logicalHeight = canvas.height / scale;

        // Find the absolute top-left corner of the viewing area
        let viewLeft = (canvas.width / 2) - (logicalWidth / 2);
        let viewTop = (canvas.height / 2) - (logicalHeight / 2);

        this.stars.forEach(star => {
            // YOUR INFINITE MATH (Untouched)
            let drawX = (star.x - (camera.x * star.parallax)) % this.buffer;
            let drawY = (star.y - (camera.y * star.parallax)) % this.buffer;

            if (drawX < 0) drawX += this.buffer;
            if (drawY < 0) drawY += this.buffer;

            // 2. Wrap the 8000x8000 box around the camera's current top-left view
            // This prevents the stars from clipping on the bottom right when zoomed out
            drawX += Math.floor(viewLeft / this.buffer) * this.buffer;
            drawY += Math.floor(viewTop / this.buffer) * this.buffer;

            if (drawX < viewLeft) drawX += this.buffer;
            if (drawY < viewTop) drawY += this.buffer;

            // 3. Only draw if it's inside the zoomed-out bounding box
            if (drawX < viewLeft + logicalWidth && drawY < viewTop + logicalHeight) {
                ctx.beginPath();
                
                // CRITICAL FIX: We divide your star size by the scale. 
                // Since the whole canvas is shrinking by 2.5x during a zoom, 
                // this forces the stars to stay their exact physical pixel size on your monitor!
                ctx.arc(drawX, drawY, star.size / scale, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}