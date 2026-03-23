export const camera = {
    x: 0,
    y: 0,
    // This function centers the camera on the player
    update: function(player, canvas) {
        this.x = player.x - canvas.width / 2;
        this.y = player.y - canvas.height / 2;
    }
};