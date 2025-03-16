import { toggleAudio, updateVolume } from './audio.js';
import { startEmotionDetection, stopEmotionDetection, toggleEmotionResponse, toggleVideoDisplay, toggleEmotionHistory } from './emotion.js';
import { triggerRipple } from './ripple.js';

// Initialize event listeners
function initEventListeners() {
    // Attention level buttons
    document.getElementById('attention-high').addEventListener('click', () => {
        app.state.attentionLevel = 'high';
        setActiveButton('attention-high', ['attention-low', 'attention-dynamic']);
    });
    
    document.getElementById('attention-low').addEventListener('click', () => {
        app.state.attentionLevel = 'low';
        setActiveButton('attention-low', ['attention-high', 'attention-dynamic']);
    });
    
    document.getElementById('attention-dynamic').addEventListener('click', () => {
        app.state.attentionLevel = 'dynamic';
        setActiveButton('attention-dynamic', ['attention-high', 'attention-low']);
    });
    
    // Breathing pattern buttons
    document.getElementById('breathing-normal').addEventListener('click', () => {
        app.state.breathingPattern = 'normal';
        setActiveButton('breathing-normal', ['breathing-box', 'breathing-478']);
    });
    
    document.getElementById('breathing-box').addEventListener('click', () => {
        app.state.breathingPattern = 'box';
        setActiveButton('breathing-box', ['breathing-normal', 'breathing-478']);
    });
    
    document.getElementById('breathing-478').addEventListener('click', () => {
        app.state.breathingPattern = '478';
        setActiveButton('breathing-478', ['breathing-normal', 'breathing-box']);
    });
    
    // Droplet intensity slider
    document.getElementById('intensity-slider').addEventListener('input', (e) => {
        app.state.dropletIntensity = parseInt(e.target.value) / 100;
        document.getElementById('intensity-value').textContent = `${e.target.value}%`;
    });
    
    // Volume slider
    document.getElementById('volume-slider').addEventListener('input', (e) => {
        app.state.volume = parseInt(e.target.value) / 100;
        document.getElementById('volume-value').textContent = `${e.target.value}%`;
        updateVolume();
    });
    
    // Toggle audio button
    document.getElementById('toggle-audio').addEventListener('click', toggleAudio);
    
    // Toggle session button
    document.getElementById('toggle-session').addEventListener('click', toggleSession);
    
    // Toggle UI button
    document.querySelector('.toggle-ui').addEventListener('click', toggleUI);
    
    // Toggle emotion detection button
    document.getElementById('toggle-emotion').addEventListener('click', () => {
        if (app.emotionDetectionActive) {
            stopEmotionDetection();
        } else {
            startEmotionDetection();
        }
    });
    
    // Toggle emotion response button
    document.getElementById('toggle-emotion-response').addEventListener('click', toggleEmotionResponse);
    
    // Toggle video display button
    document.getElementById('toggle-video-display').addEventListener('click', toggleVideoDisplay);
    
    // Toggle emotion history button
    document.getElementById('toggle-emotion-history').addEventListener('click', toggleEmotionHistory);
    
    // Add keyboard shortcuts
    window.addEventListener('keydown', (e) => {
        if (e.key === ' ' && !e.repeat) {
            toggleSession();
        } else if (e.key === 'e' && !e.repeat) {
            if (app.emotionDetectionActive) {
                stopEmotionDetection();
            } else {
                startEmotionDetection();
            }
        } else if (e.key === 'r' && !e.repeat) {
            toggleEmotionResponse();
        } else if (e.key === 'v' && !e.repeat) {
            toggleVideoDisplay();
        } else if (e.key === 'h' && !e.repeat) {
            toggleEmotionHistory();
        } else if (e.key === 'a' && !e.repeat) {
            toggleAudio();
        } else if (e.key === 'u' && !e.repeat) {
            toggleUI();
        }
    });
}

// Toggle UI visibility
function toggleUI() {
    const uiContainer = document.getElementById('ui-container');
    app.state.uiVisible = !app.state.uiVisible;
    
    if (app.state.uiVisible) {
        uiContainer.style.transform = 'translateX(-50%)';
    } else {
        uiContainer.style.transform = 'translateX(-50%) translateY(calc(100% + 30px))';
    }
}

// Toggle session state
function toggleSession() {
    app.state.sessionActive = !app.state.sessionActive;
    
    const sessionButton = document.getElementById('toggle-session');
    sessionButton.textContent = app.state.sessionActive ? 'End Session' : 'Start Session';
    
    if (app.state.sessionActive) {
        // Start session
        app.state.currentPhase = 'inhale';
        app.animation.phaseTimer = 0;
        
        // Play initial audio
        import('./audio.js').then(module => {
            module.playPhaseAudio();
        });
        
        // Initial ripple effect
        triggerRipple();
    } else {
        // End session
        if (app.state.audioEnabled && app.audio.noiseSource) {
            app.audio.noiseSource.stop();
        }
    }
}

// Helper to set active button
function setActiveButton(activeId, inactiveIds) {
    document.getElementById(activeId).classList.add('active');
    inactiveIds.forEach(id => {
        document.getElementById(id).classList.remove('active');
    });
}

export { initEventListeners, toggleUI, toggleSession, setActiveButton };