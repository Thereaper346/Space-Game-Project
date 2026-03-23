export class Starfield {
    constructor(count) {
        this.stars = [];
        this.buffer = 2000; // The size of our "Star Tile"
        
        for (let i = 0; i < count; i++) {
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
        
        this.stars.forEach(star => {
            // THE INFINITE MATH: 
            // We use the modulo operator (%) to keep the stars within a 'loop' 
            // based on the camera position.
            let drawX = (star.x - (camera.x * star.parallax)) % this.buffer;
            let drawY = (star.y - (camera.y * star.parallax)) % this.buffer;

            // These two lines prevent the stars from "disappearing" at the edges
            if (drawX < 0) drawX += this.buffer;
            if (drawY < 0) drawY += this.buffer;

            // Only draw the star if it's actually visible on your monitor
            if (drawX < canvas.width && drawY < canvas.height) {
                ctx.beginPath();
                ctx.arc(drawX, drawY, star.size, 0, Math.PI * 2);
                ctx.fill();
            }
        });
    }
}