// ============================================================================
// FILE: editor.js (Added OUTSIDE Shell Marker Support)
// ============================================================================

export class ShipEditor {
    constructor() {
        this.mode = 'PART'; 
        this.partGridSize = 16;
        this.worldPartGridSize = 32;
        
        this.partFrames = [this.createEmptyGrid(this.partGridSize)];
        this.worldPartFrames = [this.createEmptyGrid(this.worldPartGridSize)];
        this.partGrid = this.partFrames[0];
        this.worldPartGrid = this.worldPartFrames[0];
        this.currentFrame = 0;
        this.maxFrames = 5;

        this.shipGridSize = 11; 
        this.worldAssemblyGridSize = 11;
        this.shipGrid = this.createEmptyAssembly(this.shipGridSize);
        this.worldAssemblyGrid = this.createEmptyAssembly(this.worldAssemblyGridSize);
        
        this.partsLibrary = []; 
        this.showRedGrid = false; 
        
        this.activeTool = 'BRUSH'; 
        this.dragStartX = null;
        this.dragStartY = null;
        this.previewGrid = null; 
        this.isErasingStroke = false; 
        
        this.history = { 
            PART: { undo: [], redo: [] }, WORLD_PART: { undo: [], redo: [] },
            ASSEMBLE_SHIP: { undo: [], redo: [] }, ASSEMBLE_WORLD: { undo: [], redo: [] }
        };
        
        this.colors = [
            "transparent", "#ffffff", "#d9d9d9", "#a6a6a6", "#595959", "#262626", "#000000", 
            "#ff3333", "#cc0000", "#800000", "#ff8800", "#cc6600", "#804000", 
            "#ffcc00", "#cca300", "#806600", "#33cc33", "#009900", "#004d00", 
            "#00ffcc", "#00b38f", "#006652", "#3399ff", "#0066cc", "#003366", 
            "#9933ff", "#6600cc", "#330066", "#ff66b3", "#cc0066", "#660033"  
        ];
        
        this.currentColor = 1; 
        // NEW: Added outsides array to properties
        this.currentProps = { type: 'hull', thrustDir: 'down', shootDir: 'up', originX: 8, originY: 8, doors: [], spawners: [], outsides: [] };
        this.editingIndex = null;
        this.selectedAssembleIndex = null;
    }

    createEmptyGrid(size) { return Array(size).fill().map(() => Array(size).fill(0)); }
    createEmptyAssembly(size) { return Array(size).fill().map(() => Array(size).fill(null)); }

    ensure2D(data, size) {
        if (!data || data.length === 0) return this.createEmptyGrid(size);
        if (Array.isArray(data[0])) return JSON.parse(JSON.stringify(data)); 
        let newGrid = [];
        for (let r = 0; r < size; r++) {
            let row = [];
            for (let c = 0; c < size; c++) row.push(data[r * size + c] || 0);
            newGrid.push(row);
        }
        return newGrid;
    }

    setFrame(index) {
        if (index < 0 || index >= this.maxFrames) return;
        const targetFrames = this.mode === 'WORLD_PART' ? this.worldPartFrames : this.partFrames;
        while (targetFrames.length <= index) {
            targetFrames.push(JSON.parse(JSON.stringify(targetFrames[targetFrames.length - 1])));
        }
        this.currentFrame = index;
        if (this.mode === 'WORLD_PART') this.worldPartGrid = targetFrames[index];
        else this.partGrid = targetFrames[index];
    }

    getGridOffset(canvas) {
        if (this.mode === 'PART') {
            const size = this.partGridSize; const cellSize = 32; 
            return { startX: (canvas.width/2) - (size*cellSize/2), startY: (canvas.height/2) - (size*cellSize/2), cellSize, size, scale: 1 };
        } else if (this.mode === 'WORLD_PART') {
            const size = this.worldPartGridSize; const cellSize = 16; 
            return { startX: (canvas.width/2) - (size*cellSize/2), startY: (canvas.height/2) - (size*cellSize/2), cellSize, size, scale: 1 };
        } else if (this.mode === 'ASSEMBLE_SHIP') {
            const size = this.shipGridSize; const scale = 3; const cellSize = this.partGridSize * scale; 
            return { startX: (canvas.width/2) - (size*cellSize/2), startY: (canvas.height/2) - (size*cellSize/2) + 20, cellSize, size, scale };
        } else {
            const size = this.worldAssemblyGridSize; const scale = 1.5; const cellSize = this.worldPartGridSize * scale; 
            return { startX: (canvas.width/2) - (size*cellSize/2), startY: (canvas.height/2) - (size*cellSize/2) + 20, cellSize, size, scale };
        }
    }

    getActiveGrid() {
        if (this.mode === 'PART') return this.partGrid;
        if (this.mode === 'WORLD_PART') return this.worldPartGrid;
        if (this.mode === 'ASSEMBLE_SHIP') return this.shipGrid;
        if (this.mode === 'ASSEMBLE_WORLD') return this.worldAssemblyGrid;
    }

    setActiveGrid(newState) {
        if (this.mode === 'PART') { this.partFrames[this.currentFrame] = newState; this.partGrid = newState; }
        else if (this.mode === 'WORLD_PART') { this.worldPartFrames[this.currentFrame] = newState; this.worldPartGrid = newState; }
        else if (this.mode === 'ASSEMBLE_SHIP') this.shipGrid = newState;
        else if (this.mode === 'ASSEMBLE_WORLD') this.worldAssemblyGrid = newState;
    }

    deselect() { this.editingIndex = null; this.selectedAssembleIndex = null; }

    saveState() {
        const activeGrid = this.getActiveGrid();
        const hist = this.history[this.mode];
        hist.undo.push(JSON.parse(JSON.stringify(activeGrid)));
        if (hist.undo.length > 30) hist.undo.shift(); 
        hist.redo = []; 
    }

    undo() {
        const hist = this.history[this.mode];
        if (hist.undo.length === 0) return; 
        hist.redo.push(JSON.parse(JSON.stringify(this.getActiveGrid()))); 
        this.setActiveGrid(hist.undo.pop());
    }

    redo() {
        const hist = this.history[this.mode];
        if (hist.redo.length === 0) return; 
        hist.undo.push(JSON.parse(JSON.stringify(this.getActiveGrid()))); 
        this.setActiveGrid(hist.redo.pop());
    }

    clearCanvas() {
        this.saveState(); 
        if (this.mode === 'PART') { 
            this.partFrames = [this.createEmptyGrid(this.partGridSize)]; 
            this.partGrid = this.partFrames[0]; this.currentFrame = 0; 
        }
        else if (this.mode === 'WORLD_PART') { 
            this.worldPartFrames = [this.createEmptyGrid(this.worldPartGridSize)]; 
            this.worldPartGrid = this.worldPartFrames[0]; this.currentFrame = 0; 
        }
        else if (this.mode === 'ASSEMBLE_SHIP') this.shipGrid = this.createEmptyAssembly(this.shipGridSize);
        else if (this.mode === 'ASSEMBLE_WORLD') this.worldAssemblyGrid = this.createEmptyAssembly(this.worldAssemblyGridSize);
        
        this.currentProps.doors = [];
        this.currentProps.spawners = [];
        this.currentProps.outsides = [];
        this.deselect();
    }

    floodFill(grid, startX, startY, targetColor, replacementColor) {
        if (targetColor === replacementColor) return;
        if (grid[startY] === undefined || grid[startY][startX] === undefined) return;
        if (grid[startY][startX] !== targetColor) return;
        const stack = [[startX, startY]];
        const size = grid.length;
        while (stack.length > 0) {
            const [x, y] = stack.pop();
            if (x >= 0 && x < size && y >= 0 && y < size) {
                if (grid[y][x] === targetColor) {
                    grid[y][x] = replacementColor;
                    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
                }
            }
        }
    }

    drawShapePreview(x0, y0, x1, y1, tool, color, size) {
        if (tool === 'LINE') {
            let dx = Math.abs(x1 - x0), sx = x0 < x1 ? 1 : -1;
            let dy = -Math.abs(y1 - y0), sy = y0 < y1 ? 1 : -1;
            let err = dx + dy, e2;
            while (true) {
                if (x0 >= 0 && x0 < size && y0 >= 0 && y0 < size) this.previewGrid[y0][x0] = color || -1; 
                if (x0 === x1 && y0 === y1) break;
                e2 = 2 * err;
                if (e2 >= dy) { err += dy; x0 += sx; }
                if (e2 <= dx) { err += dx; y0 += sy; }
            }
        } else if (tool === 'RECT' || tool === 'RECT_FILL') {
            let minX = Math.min(x0, x1), maxX = Math.max(x0, x1);
            let minY = Math.min(y0, y1), maxY = Math.max(y0, y1);
            for(let r = minY; r <= maxY; r++) {
                for(let c = minX; c <= maxX; c++) {
                    if (r >= 0 && r < size && c >= 0 && c < size) {
                        if (tool === 'RECT_FILL' || r === minY || r === maxY || c === minX || c === maxX) {
                            this.previewGrid[r][c] = color || -1;
                        }
                    }
                }
            }
        } else if (tool === 'CIRCLE' || tool === 'CIRCLE_FILL') {
            let radius = Math.hypot(x1 - x0, y1 - y0);
            for(let r = 0; r < size; r++) {
                for(let c = 0; c < size; c++) {
                    let dist = Math.hypot(c - x0, r - y0);
                    if (tool === 'CIRCLE_FILL' && dist <= radius + 0.5) {
                        this.previewGrid[r][c] = color || -1;
                    } else if (tool === 'CIRCLE' && Math.abs(dist - radius) < 1.0) { 
                        this.previewGrid[r][c] = color || -1;
                    }
                }
            }
        }
    }

    paint(mouseX, mouseY, canvas, isFirstClick, isMouseUp = false) {
        const offset = this.getGridOffset(canvas);
        const gridX = Math.floor((mouseX - offset.startX) / offset.cellSize);
        const gridY = Math.floor((mouseY - offset.startY) / offset.cellSize);

        if (this.mode === 'PART' || this.mode === 'WORLD_PART') {
            const activeGrid = this.getActiveGrid();

            if (isMouseUp) {
                if (this.previewGrid) {
                    for(let r=0; r < offset.size; r++) {
                        for(let c=0; c < offset.size; c++) {
                            if (this.previewGrid[r][c] !== 0) {
                                activeGrid[r][c] = this.previewGrid[r][c] === -1 ? 0 : this.previewGrid[r][c];
                            }
                        }
                    }
                    this.previewGrid = null;
                }
                this.dragStartX = null;
                this.dragStartY = null;
                return;
            }

            if (gridX >= 0 && gridX < offset.size && gridY >= 0 && gridY < offset.size) {
                
                if (isFirstClick) {
                    this.dragStartX = gridX;
                    this.dragStartY = gridY;
                }

                let colorToUse = this.activeTool === 'ERASER' ? 0 : this.currentColor;

                if (this.activeTool === 'BRUSH' || this.activeTool === 'ERASER') {
                    if (isFirstClick && this.activeTool === 'BRUSH') {
                        this.isErasingStroke = (activeGrid[gridY][gridX] === this.currentColor);
                    }
                    activeGrid[gridY][gridX] = this.isErasingStroke ? 0 : colorToUse;
                }
                else if (this.activeTool === 'DOOR' && isFirstClick) {
                    if (!this.currentProps.doors) this.currentProps.doors = [];
                    let idx = this.currentProps.doors.findIndex(d => d.x === gridX && d.y === gridY);
                    if (idx > -1) this.currentProps.doors.splice(idx, 1);
                    else this.currentProps.doors.push({x: gridX, y: gridY});
                }
                else if (this.activeTool === 'SPAWNER' && isFirstClick) {
                    if (!this.currentProps.spawners) this.currentProps.spawners = [];
                    let idx = this.currentProps.spawners.findIndex(s => s.x === gridX && s.y === gridY);
                    if (idx > -1) this.currentProps.spawners.splice(idx, 1);
                    else this.currentProps.spawners.push({x: gridX, y: gridY});
                }
                // NEW: Logic to record OUTSIDE markers
                else if (this.activeTool === 'OUTSIDE' && isFirstClick) {
                    if (!this.currentProps.outsides) this.currentProps.outsides = [];
                    let idx = this.currentProps.outsides.findIndex(s => s.x === gridX && s.y === gridY);
                    if (idx > -1) this.currentProps.outsides.splice(idx, 1);
                    else this.currentProps.outsides.push({x: gridX, y: gridY});
                }
                else if (this.activeTool === 'ORIGIN' && isFirstClick) {
                    this.currentProps.originX = gridX; this.currentProps.originY = gridY;
                }
                else if (this.activeTool === 'FILL' && isFirstClick) {
                    this.floodFill(activeGrid, gridX, gridY, activeGrid[gridY][gridX], colorToUse);
                }
                else if (['LINE', 'RECT', 'RECT_FILL', 'CIRCLE', 'CIRCLE_FILL'].includes(this.activeTool)) {
                    if (this.dragStartX !== null && this.dragStartY !== null) {
                        this.previewGrid = this.createEmptyGrid(offset.size);
                        this.drawShapePreview(this.dragStartX, this.dragStartY, gridX, gridY, this.activeTool, colorToUse, offset.size);
                    }
                }
            }
        } else if ((this.mode === 'ASSEMBLE_SHIP' || this.mode === 'ASSEMBLE_WORLD') && isFirstClick) { 
            const activeAssembly = this.getActiveGrid();
            if (gridX >= 0 && gridX < offset.size && gridY >= 0 && gridY < offset.size) {
                if (this.activeTool === 'ERASER') {
                    activeAssembly[gridY][gridX] = null;
                } else if (this.selectedAssembleIndex !== null && this.partsLibrary[this.selectedAssembleIndex]) {
                    activeAssembly[gridY][gridX] = JSON.parse(JSON.stringify(this.partsLibrary[this.selectedAssembleIndex]));
                } 
            }
        }
    }

    savePart(name) {
        let gridToSave, framesToSave, sizeToSave, defaultName, formatType;
        if (this.mode === 'WORLD_PART') { gridToSave = this.worldPartFrames[0]; framesToSave = this.worldPartFrames; sizeToSave = this.worldPartGridSize; defaultName = "World Segment"; formatType = 'world_part'; } 
        else if (this.mode === 'ASSEMBLE_SHIP') { gridToSave = this.shipGrid; framesToSave = null; sizeToSave = this.shipGridSize; defaultName = "Ship Blueprint"; formatType = 'ship_blueprint'; } 
        else if (this.mode === 'ASSEMBLE_WORLD') { gridToSave = this.worldAssemblyGrid; framesToSave = null; sizeToSave = this.worldAssemblyGridSize; defaultName = "Station Blueprint"; formatType = 'world_blueprint'; } 
        else { gridToSave = this.partFrames[0]; framesToSave = this.partFrames; sizeToSave = this.partGridSize; defaultName = "Ship Segment"; formatType = 'part'; }

        const partData = {
            name: name || defaultName, gridSize: sizeToSave, format: formatType,
            props: JSON.parse(JSON.stringify(this.currentProps)),
            data: JSON.parse(JSON.stringify(gridToSave)),
            frames: framesToSave ? JSON.parse(JSON.stringify(framesToSave)) : null 
        };

        if (this.editingIndex !== null) { this.partsLibrary[this.editingIndex] = partData; } 
        else { this.partsLibrary.push(partData); }
        
        this.deselect();
        return this.partsLibrary;
    }

    loadPartForEdit(index) {
        this.editingIndex = index;
        const part = this.partsLibrary[index];
        this.currentProps = JSON.parse(JSON.stringify(part.props));
        if (this.currentProps.originX === undefined) { this.currentProps.originX = 8; this.currentProps.originY = 8; }
        if (!this.currentProps.doors) this.currentProps.doors = [];
        if (!this.currentProps.spawners) this.currentProps.spawners = [];
        if (!this.currentProps.outsides) this.currentProps.outsides = []; // NEW
        
        let pSize = part.gridSize || 16;

        if (part.format === 'world_part') { 
            this.worldPartFrames = part.frames ? part.frames.map(f => this.ensure2D(f, pSize)) : [this.ensure2D(part.data, pSize)];
            this.worldPartGrid = this.worldPartFrames[0]; this.currentFrame = 0; this.mode = 'WORLD_PART'; 
        } else if (part.format === 'ship_blueprint') { 
            this.shipGrid = JSON.parse(JSON.stringify(part.data)); this.mode = 'ASSEMBLE_SHIP'; 
        } else if (part.format === 'world_blueprint') { 
            this.worldAssemblyGrid = JSON.parse(JSON.stringify(part.data)); this.mode = 'ASSEMBLE_WORLD'; 
        } else { 
            this.partFrames = part.frames ? part.frames.map(f => this.ensure2D(f, pSize)) : [this.ensure2D(part.data, pSize)];
            this.partGrid = this.partFrames[0]; this.currentFrame = 0; this.mode = 'PART'; 
        }
        this.history[this.mode] = { undo: [], redo: [] };
    }

    draw(ctx, canvas) {
        const offset = this.getGridOffset(canvas);
        if (this.mode === 'PART' || this.mode === 'WORLD_PART') {
            const activeGrid = this.getActiveGrid();
            
            if (this.currentFrame > 0) {
                const prevGrid = this.mode === 'WORLD_PART' ? this.worldPartFrames[this.currentFrame - 1] : this.partFrames[this.currentFrame - 1];
                for (let row = 0; row < offset.size; row++) {
                    for (let col = 0; col < offset.size; col++) {
                        if (prevGrid[row][col] !== 0) {
                            const x = offset.startX + col * offset.cellSize;
                            const y = offset.startY + row * offset.cellSize;
                            ctx.globalAlpha = 0.3; 
                            ctx.fillStyle = this.colors[prevGrid[row][col]]; 
                            ctx.fillRect(x, y, offset.cellSize, offset.cellSize);
                            ctx.globalAlpha = 1.0; 
                        }
                    }
                }
            }

            for (let row = 0; row < offset.size; row++) {
                for (let col = 0; col < offset.size; col++) {
                    const x = offset.startX + col * offset.cellSize;
                    const y = offset.startY + row * offset.cellSize;
                    
                    if (activeGrid[row][col] !== 0) {
                        ctx.fillStyle = this.colors[activeGrid[row][col]]; 
                        ctx.fillRect(x, y, offset.cellSize, offset.cellSize);
                    }
                    
                    if (this.previewGrid && this.previewGrid[row][col] !== 0) {
                        if (this.previewGrid[row][col] === -1) {
                            ctx.fillStyle = "rgba(0, 0, 0, 0.5)"; 
                            ctx.fillRect(x, y, offset.cellSize, offset.cellSize);
                        } else {
                            ctx.fillStyle = this.colors[this.previewGrid[row][col]];
                            ctx.fillRect(x, y, offset.cellSize, offset.cellSize);
                        }
                    }
                    
                    ctx.strokeStyle = "#222"; ctx.strokeRect(x, y, offset.cellSize, offset.cellSize);
                }
            }

            if (this.currentProps.doors) {
                ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 3;
                for (let d of this.currentProps.doors) {
                    const dx = offset.startX + d.x * offset.cellSize; const dy = offset.startY + d.y * offset.cellSize;
                    ctx.strokeRect(dx + 4, dy + 4, offset.cellSize - 8, offset.cellSize - 8);
                }
                ctx.lineWidth = 1;
            }
            if (this.currentProps.spawners) {
                ctx.strokeStyle = "#ff0044"; ctx.lineWidth = 3;
                for (let s of this.currentProps.spawners) {
                    const sx = offset.startX + s.x * offset.cellSize; const sy = offset.startY + s.y * offset.cellSize;
                    ctx.beginPath();
                    ctx.moveTo(sx + 4, sy + 4); ctx.lineTo(sx + offset.cellSize - 4, sy + offset.cellSize - 4);
                    ctx.moveTo(sx + offset.cellSize - 4, sy + 4); ctx.lineTo(sx + 4, sy + offset.cellSize - 4);
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
            }
            // NEW: Draw OUTSIDE Markers as green boxes
            if (this.currentProps.outsides) {
                ctx.strokeStyle = "#00ff00"; ctx.lineWidth = 3;
                for (let o of this.currentProps.outsides) {
                    const ox = offset.startX + o.x * offset.cellSize; const oy = offset.startY + o.y * offset.cellSize;
                    ctx.strokeRect(ox + 4, oy + 4, offset.cellSize - 8, offset.cellSize - 8);
                    
                    // Draw a little hash to show which way it points
                    ctx.beginPath(); ctx.moveTo(ox + offset.cellSize/2, oy + offset.cellSize/2);
                    if (o.x <= 1) ctx.lineTo(ox, oy + offset.cellSize/2); 
                    else if (o.x >= offset.size - 2) ctx.lineTo(ox + offset.cellSize, oy + offset.cellSize/2); 
                    else if (o.y <= 1) ctx.lineTo(ox + offset.cellSize/2, oy); 
                    else if (o.y >= offset.size - 2) ctx.lineTo(ox + offset.cellSize/2, oy + offset.cellSize); 
                    ctx.stroke();
                }
                ctx.lineWidth = 1;
            }

            if (this.currentProps.type === 'engine') this.drawVectorArrow(ctx, offset);
            if (this.currentProps.type === 'weapon') this.drawWeaponArrow(ctx, offset);
            
            if (this.showRedGrid) {
                ctx.strokeStyle = "rgba(255, 50, 50, 0.8)"; ctx.lineWidth = 2; ctx.beginPath();
                for (let col = 0; col <= offset.size; col += 4) { const x = offset.startX + col * offset.cellSize; ctx.moveTo(x, offset.startY); ctx.lineTo(x, offset.startY + offset.size * offset.cellSize); }
                for (let row = 0; row <= offset.size; row += 4) { const y = offset.startY + row * offset.cellSize; ctx.moveTo(offset.startX, y); ctx.lineTo(offset.startX + offset.size * offset.cellSize, y); }
                ctx.stroke(); ctx.lineWidth = 1; 
            }
        } else {
            const activeAssembly = this.getActiveGrid();
            for (let row = 0; row < offset.size; row++) {
                for (let col = 0; col < offset.size; col++) {
                    const x = offset.startX + col * offset.cellSize;
                    const y = offset.startY + row * offset.cellSize;
                    ctx.strokeStyle = "#333"; ctx.strokeRect(x, y, offset.cellSize, offset.cellSize);
                    const part = activeAssembly[row][col];
                    if (part && part.data) {
                        const pGridSize = part.gridSize || 16;
                        const is2D = Array.isArray(part.data[0]);

                        for (let pRow = 0; pRow < pGridSize; pRow++) {
                            for (let pCol = 0; pCol < pGridSize; pCol++) {
                                let colorVal = is2D ? (part.data[pRow] ? part.data[pRow][pCol] : 0) : part.data[pRow * pGridSize + pCol];
                                if (colorVal !== 0 && colorVal !== null && colorVal !== undefined && colorVal !== 'transparent') {
                                    let finalColor = (typeof colorVal === 'number') ? this.colors[colorVal] : colorVal;
                                    if (finalColor && finalColor !== "0") {
                                        ctx.fillStyle = finalColor;
                                        ctx.fillRect(x + pCol * offset.scale, y + pRow * offset.scale, offset.scale, offset.scale);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            const centerX = offset.startX + (offset.size * offset.cellSize) / 2;
            const centerY = offset.startY + (offset.size * offset.cellSize) / 2;
            ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 2; ctx.beginPath();
            ctx.arc(centerX, centerY, 15, 0, Math.PI * 2);
            ctx.moveTo(centerX - 25, centerY); ctx.lineTo(centerX + 25, centerY);
            ctx.moveTo(centerX, centerY - 25); ctx.lineTo(centerX, centerY + 25);
            ctx.stroke(); ctx.lineWidth = 1;
        }
    }

    drawVectorArrow(ctx, offset) {
        const cx = offset.startX + (offset.size * offset.cellSize) / 2;
        const cy = offset.startY + (offset.size * offset.cellSize) / 2;
        ctx.strokeStyle = "rgba(255, 50, 50, 0.8)"; ctx.fillStyle = "rgba(255, 50, 50, 0.8)"; ctx.lineWidth = 5;
        ctx.beginPath();
        if (this.currentProps.thrustDir === 'down') { ctx.moveTo(cx, cy - 40); ctx.lineTo(cx, cy + 40); ctx.moveTo(cx - 20, cy + 20); ctx.lineTo(cx, cy + 60); ctx.lineTo(cx + 20, cy + 20); } 
        else if (this.currentProps.thrustDir === 'up') { ctx.moveTo(cx, cy + 40); ctx.lineTo(cx, cy - 40); ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx, cy - 60); ctx.lineTo(cx + 20, cy - 20); } 
        else if (this.currentProps.thrustDir === 'left') { ctx.moveTo(cx + 40, cy); ctx.lineTo(cx - 40, cy); ctx.moveTo(cx - 20, cy - 20); ctx.lineTo(cx - 60, cy); ctx.lineTo(cx - 20, cy + 20); } 
        else if (this.currentProps.thrustDir === 'right') { ctx.moveTo(cx - 40, cy); ctx.lineTo(cx + 40, cy); ctx.moveTo(cx + 20, cy - 20); ctx.lineTo(cx + 60, cy); ctx.lineTo(cx + 20, cy + 20); }
        ctx.stroke(); ctx.fill(); ctx.lineWidth = 1; 
    }

    drawWeaponArrow(ctx, offset) {
        const ox = this.currentProps.originX; const oy = this.currentProps.originY;
        const cx = offset.startX + (ox * offset.cellSize) + (offset.cellSize / 2);
        const cy = offset.startY + (oy * offset.cellSize) + (offset.cellSize / 2);
        ctx.fillStyle = "#ff8800"; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI*2); ctx.fill();
        ctx.strokeStyle = "rgba(255, 150, 0, 0.9)"; ctx.lineWidth = 3; ctx.setLineDash([10, 10]); ctx.beginPath();
        if (this.currentProps.shootDir === 'up') { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 100); } 
        else if (this.currentProps.shootDir === 'down') { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + 100); } 
        else if (this.currentProps.shootDir === 'left') { ctx.moveTo(cx, cy); ctx.lineTo(cx - 100, cy); } 
        else if (this.currentProps.shootDir === 'right') { ctx.moveTo(cx, cy); ctx.lineTo(cx + 100, cy); }
        ctx.stroke(); ctx.setLineDash([]); ctx.lineWidth = 1; 
    }
}