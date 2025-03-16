// Initialize audio
function initAudio() {
    if (app.audio.initialized) return;
    
    try {
        // Start Tone.js audio context
        Tone.start();
        
        // Create a reverb effect
        app.audio.reverb = new Tone.Reverb({
            decay: 3,
            wet: 0.5
        }).toDestination();
        app.audio.reverb.generate();
        
        // Create a synth for tones
        app.audio.synth = new Tone.Synth({
            oscillator: {
                type: "sine"
            },
            envelope: {
                attack: 0.3,
                decay: 0.1,
                sustain: 0.5,
                release: 0.5
            }
        }).connect(app.audio.reverb);
        
        // Create noise source for breath sounds
        app.audio.noiseSource = new Tone.Noise("pink");
        
        // Create filter for breath sounds
        app.audio.filter = new Tone.Filter({
            type: "lowpass",
            frequency: 800
        }).connect(app.audio.reverb);
        
        // Connect noise -> filter -> destination
        app.audio.noiseSource.connect(app.audio.filter);
        
        // Set volume
        updateVolume();
        
        app.audio.initialized = true;
    } catch (error) {
        console.error('Error initializing audio:', error);
        alert('Audio initialization failed. Some browser settings may be blocking audio.');
        
        // Disable audio button
        document.getElementById('toggle-audio').disabled = true;
        document.getElementById('toggle-audio').textContent = 'Audio Unavailable';
    }
}

// Update volume
function updateVolume() {
    if (!app.audio.initialized) return;
    
    const volume = app.state.volume;
    // Convert to dB scale (-60 to 0)
    const dbVolume = -60 + (volume * 60);
    
    app.audio.synth.volume.value = dbVolume;
    app.audio.noiseSource.volume.value = dbVolume - 10;
}

// Play audio for current breath phase
function playPhaseAudio() {
    if (!app.state.audioEnabled || !app.audio.initialized) return;
    
    try {
        Tone.Transport.bpm.value = 60;
        
        // Get emotion-specific notes if available
        let notes;
        if (app.emotionResponseActive && app.state.detectedEmotion && 
            app.audio.emotionChords[app.state.detectedEmotion]) {
            notes = app.audio.emotionChords[app.state.detectedEmotion];
        } else {
            notes = app.audio.emotionChords.neutral;
        }
        
        // Use appropriate note for phase
        const baseNote = notes[0];
        const holdNote = notes[1];
        const exhaleNote = notes[2];
        
        switch (app.state.currentPhase) {
            case 'inhale':
                // Rising tone for inhale
                app.audio.synth.triggerAttackRelease(baseNote, app.patterns[app.state.breathingPattern].inhale - 0.1);
                
                // Start breath noise
                app.audio.noiseSource.start();
                app.audio.filter.frequency.value = 600;
                app.audio.filter.frequency.linearRampToValueAtTime(
                    1200, 
                    Tone.now() + app.patterns[app.state.breathingPattern].inhale - 0.1
                );
                break;
                
            case 'hold':
                // Steady tone for hold
                app.audio.synth.triggerAttackRelease(holdNote, app.patterns[app.state.breathingPattern].hold - 0.1);
                
                // Reduce noise volume during hold
                app.audio.noiseSource.volume.linearRampToValueAtTime(
                    -60 + (app.state.volume * 60) - 30,
                    Tone.now() + 0.5
                );
                break;
                
            case 'exhale':
                // Falling tone for exhale
                app.audio.synth.triggerAttackRelease(exhaleNote, app.patterns[app.state.breathingPattern].exhale - 0.1);
                
                // Exhale breath sound
                app.audio.noiseSource.volume.linearRampToValueAtTime(
                    -60 + (app.state.volume * 60) - 10,
                    Tone.now() + 0.5
                );
                app.audio.filter.frequency.linearRampToValueAtTime(
                    300, 
                    Tone.now() + app.patterns[app.state.breathingPattern].exhale - 0.1
                );
                break;
                
            case 'rest':
                // Stop noise during rest
                app.audio.noiseSource.stop();
                break;
        }
    } catch (error) {
        console.error('Audio playback error:', error);
        // Try to reinitialize audio
        app.audio.initialized = false;
        initAudio();
    }
}

// Toggle audio
function toggleAudio() {
    app.state.audioEnabled = !app.state.audioEnabled;
    
    const audioButton = document.getElementById('toggle-audio');
    audioButton.textContent = app.state.audioEnabled ? 'Disable Audio' : 'Enable Audio';
    
    // Enable/disable volume slider
    document.getElementById('volume-slider').disabled = !app.state.audioEnabled;
    
    if (app.state.audioEnabled) {
        // Initialize audio on first enable
        initAudio();
        
        // Play audio if session is active
        if (app.state.sessionActive) {
            playPhaseAudio();
        }
    } else {
        // Stop audio
        if (app.audio.noiseSource && app.audio.initialized) {
            app.audio.noiseSource.stop();
        }
    }
}

export { initAudio, updateVolume, playPhaseAudio, toggleAudio };