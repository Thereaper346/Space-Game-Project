// ============================================================================
// FILE: defaultAsteroid.js
// Replace this data with ANY blueprint you build in the Studio!
// ============================================================================

export const defaultAsteroid = {
    "name": "Craggy Asteroid",
    "gridSize": 11,
    "format": "ship_blueprint",
    "props": { "type": "hull", "thrustDir": "down", "shootDir": "up", "originX": 8, "originY": 8 },
    "data": [
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null,null,null],
        [null,null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null,null],
        [null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(4)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null],
        [null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(4)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(4)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null],
        [null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null,null],
        [null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null,null],
        [null,null,null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null]
    ],
    "frames": null
};