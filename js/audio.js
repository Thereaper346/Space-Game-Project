// ============================================================================
// FILE: audio.js (Master Audio Controller - 6 Channel Mixer)
// ============================================================================

class AudioManager {
    constructor() {
        this.sounds = {};
        this.bgm = null;
        this.isMuted = false;
        
        // The 6 Independent Audio Channels
        this.channels = {
            musicMain: 0.5,
            musicBattle: 0.5,
            laser: 0.5,
            engine: 0.5,
            enemy: 0.5,
            ui: 0.5
        };
    }

    // Notice the new 'channel' parameter!
    load(name, path, channel, isLoop = false, volume = 1.0) {
        const audio = new Audio(path);
        audio.loop = isLoop;
        audio.baseVolume = volume; 
        audio.channel = channel; // Tag the sound with its channel
        
        // Set initial volume based on its specific channel
        audio.volume = volume * (this.channels[channel] !== undefined ? this.channels[channel] : 1.0);
        
        this.sounds[name] = audio;
        return audio;
    }

    playSFX(name) {
        if (this.isMuted || !this.sounds[name]) return;
        const sound = this.sounds[name].cloneNode();
        const channel = this.sounds[name].channel;
        
        // Apply the live slider volume right as it plays
        sound.volume = this.sounds[name].baseVolume * this.channels[channel];
        sound.play().catch(e => {}); 
    }

    playBGM(name) {
        if (this.isMuted || !this.sounds[name]) return;
        if (this.bgm) this.bgm.pause();
        
        this.bgm = this.sounds[name];
        this.bgm.currentTime = 0;
        const channel = this.bgm.channel;
        
        this.bgm.volume = this.bgm.baseVolume * this.channels[channel];
        this.bgm.play().catch(e => {});
    }

    startEngine() {
        if (this.isMuted || !this.sounds['engine']) return;
        if (this.sounds['engine'].paused) {
            this.sounds['engine'].volume = this.sounds['engine'].baseVolume * this.channels['engine'];
            this.sounds['engine'].play().catch(() => {});
        }
    }

    stopEngine() {
        if (this.sounds['engine'] && !this.sounds['engine'].paused) {
            this.sounds['engine'].pause();
        }
    }

    // One master function to handle live volume updates from ANY slider
    setVolume(channel, val) {
        this.channels[channel] = parseFloat(val);
        
        // If background music is playing AND it matches the slider you just moved, update it live!
        if (this.bgm && this.bgm.channel === channel) {
            this.bgm.volume = this.bgm.baseVolume * this.channels[channel];
        }
        
        // If the engine is currently roaring, update it live!
        if (channel === 'engine' && this.sounds['engine'] && !this.sounds['engine'].paused) {
            this.sounds['engine'].volume = this.sounds['engine'].baseVolume * this.channels['engine'];
        }
    }
}

export const audio = new AudioManager();