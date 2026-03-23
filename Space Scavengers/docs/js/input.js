// This object tracks which keys are currently being pressed
export const keys = {
    ArrowUp: false,
    ArrowDown: false,
    ArrowLeft: false,
    ArrowRight: false,
    w: false,
    a: false,
    s: false,
    d: false,
    " ": false,
    Space: false,
    Shift: false,
    mouseDown: false 
};

// Listen for the key being pressed down
window.addEventListener('keydown', (e) => {
    // NEW: If the user is typing in a text box, let the browser handle it normally!
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; 
    }

    if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        keys[" "] = true;
        keys.Space = true;
    } else if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = true;
    }
});

// Listen for the key being released
window.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }

    if (e.key === " " || e.code === "Space") {
        keys[" "] = false;
        keys.Space = false;
    } else if (keys.hasOwnProperty(e.key)) {
        keys[e.key] = false;
    }
});

// Listen for mouse clicks
window.addEventListener('mousedown', (e) => {
    if (e.button === 0 && e.target.id === 'gameCanvas') {
        keys.mouseDown = true;
    }
});

window.addEventListener('mouseup', (e) => {
    if (e.button === 0) {
        keys.mouseDown = false;
    }
});