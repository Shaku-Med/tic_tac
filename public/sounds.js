class GameSounds {
    constructor() {
        this.sounds = {};
        this.enabled = true;
        this.volume = 0.5;
        this.init();
    }

    init() {
        this.createSounds();
        this.loadSettings();
    }

    createSounds() {
        // Create audio context for sound generation
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Generate different sound effects using Web Audio API
        this.sounds = {
            move: this.createMoveSound(),
            win: this.createWinSound(),
            lose: this.createLoseSound(),
            draw: this.createDrawSound(),
            aiThinking: this.createAIThinkingSound(),
            buttonClick: this.createButtonClickSound(),
            cellHover: this.createCellHoverSound()
        };
    }

    createMoveSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    createWinSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Victory melody
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            let time = this.audioContext.currentTime;
            
            notes.forEach((frequency, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.frequency.setValueAtTime(frequency, time);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(this.volume * 0.4, time + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
                
                osc.start(time);
                osc.stop(time + 0.3);
                
                time += 0.15;
            });
        };
    }

    createLoseSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Descending sad melody
            const notes = [523.25, 466.16, 415.30, 369.99]; // C5, A#4, G#4, F#4
            let time = this.audioContext.currentTime;
            
            notes.forEach((frequency, index) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.frequency.setValueAtTime(frequency, time);
                gain.gain.setValueAtTime(0, time);
                gain.gain.linearRampToValueAtTime(this.volume * 0.3, time + 0.01);
                gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);
                
                osc.start(time);
                osc.stop(time + 0.4);
                
                time += 0.2;
            });
        };
    }

    createDrawSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Neutral tone
            oscillator.frequency.setValueAtTime(440, this.audioContext.currentTime); // A4
            oscillator.frequency.exponentialRampToValueAtTime(330, this.audioContext.currentTime + 0.5);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.5);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.5);
        };
    }

    createAIThinkingSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            // Subtle thinking sound
            oscillator.frequency.setValueAtTime(200, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.3);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.3);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.3);
        };
    }

    createButtonClickSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(1000, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.05);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.2, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.05);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.05);
        };
    }

    createCellHoverSound() {
        return () => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(this.volume * 0.1, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.1);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.1);
        };
    }

    play(soundName) {
        if (!this.enabled || !this.sounds[soundName]) return;
        
        try {
            // Resume audio context if suspended (required by some browsers)
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.sounds[soundName]();
        } catch (error) {
            console.log('Sound playback failed:', error);
        }
    }

    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    toggle() {
        this.enabled = !this.enabled;
        this.saveSettings();
        return this.enabled;
    }

    loadSettings() {
        const savedVolume = localStorage.getItem('gameSoundVolume');
        const savedEnabled = localStorage.getItem('gameSoundEnabled');
        
        if (savedVolume !== null) {
            this.volume = parseFloat(savedVolume);
        }
        if (savedEnabled !== null) {
            this.enabled = savedEnabled === 'true';
        }
    }

    saveSettings() {
        localStorage.setItem('gameSoundVolume', this.volume.toString());
        localStorage.setItem('gameSoundEnabled', this.enabled.toString());
    }

    // Public methods for easy access
    playMove() { this.play('move'); }
    playWin() { this.play('win'); }
    playLose() { this.play('lose'); }
    playDraw() { this.play('draw'); }
    playAIThinking() { this.play('aiThinking'); }
    playButtonClick() { this.play('buttonClick'); }
    playCellHover() { this.play('cellHover'); }
}

const gameSounds = new GameSounds();
