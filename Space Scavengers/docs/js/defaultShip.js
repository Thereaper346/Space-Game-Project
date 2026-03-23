// FILE: defaultShip.js
// You can replace the "data" array later with the code from any ship you build in the studio!

export const defaultShip = {
    name: "Starter Ship",
    gridSize: 11,
    format: "ship_blueprint",
    props: { type: "hull", thrustDir: "down", shootDir: "up", originX: 8, originY: 8 },
    data: [
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(11)) }, null,null,null,null,null],
        [null,null,null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(2)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(2)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(2)) }, null,null,null,null],
        [null,null,null, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(5)) }, { gridSize:16, data:Array(16).fill().map(()=>Array(16).fill(8)) }, null,null,null],
        [null,null,null,null, { gridSize:16, props: {type: 'engine', thrustDir: 'down'}, data:Array(16).fill().map(()=>Array(16).fill(19)) }, null, { gridSize:16, props: {type: 'engine', thrustDir: 'down'}, data:Array(16).fill().map(()=>Array(16).fill(19)) }, null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null],
        [null,null,null,null,null,null,null,null,null,null,null]
    ]
};