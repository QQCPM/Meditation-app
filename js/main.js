// Import modules
import { initScene, animate, checkWebGLSupport } from './scene.js';
import { initEventListeners } from './ui.js';
import { loadFaceDetectionModels } from './emotion.js';

// Main application object - globally accessible
window.app = {
    // Scene elements
    scene: null,
    camera: null,
    renderer: null,
    clock: new THREE.Clock(),
    
    // Emotion detection elements
    faceDetector: null,
    video: null,
    emotionDetectionActive: false,
    emotionResponseActive: false,
    emotionHistoryActive: false,
    emotionHistory: [],
    lastEmotionUpdateTime: 0,
    
    // Application state
    state: {
        sessionActive: false,
        attentionLevel: 'high', // high, low, dynamic
        breathingPattern: 'normal', // normal, box, 478
        currentPhase: 'inhale', // inhale, hold, exhale, rest
        dropletIntensity: 0.5,
        audioEnabled: false,
        volume: 0.5,
        uiVisible: true,
        detectedEmotion: null,
        emotionConfidence: 0,
        videoDisplayVisible: true,
        emotionStability: 0
    },
    
    // Breathing patterns (seconds)
    patterns: {
        normal: { inhale: 4, hold: 0, exhale: 4, rest: 0 },
        box: { inhale: 4, hold: 4, exhale: 4, rest: 4 },
        478: { inhale: 4, hold: 7, exhale: 8, rest: 0 }
    },
    
    // Colors
    colors: {
        neutral: new THREE.Color(0x4aa3df),  // Default blue
        happy: new THREE.Color(0xffeb3b),    // Bright yellow
        sad: new THREE.Color(0x2979ff),      // Blue
        angry: new THREE.Color(0xff5252),    // Red
        surprised: new THREE.Color(0xab47bc),// Purple
        fearful: new THREE.Color(0x43a047),  // Green
        disgusted: new THREE.Color(0xff9800) // Orange
    },
    
    // Animation
    animation: {
        breathProgress: 0,
        phaseTimer: 0,
        turbulence: 0,
        updateCubeCamera: null,
        waterTime: 0,
        emotionTransition: {
            from: null,
            to: null,
            progress: 0,
            duration: 2.0
        },
        ripples: []
    },
    
    // Visualization elements
    visuals: {
        droplet: null,
        dropletMesh: null,
        highlights: null,
        particles: null,
        ripples: [],
        normalMap: null,
        backgroundPlane: null
    },
    
    // Audio elements
    audio: {
        synth: null,
        noiseSource: null,
        filter: null,
        reverb: null,
        initialized: false,
        emotionChords: {
            happy: ["E4", "G#4", "B4"],
            sad: ["A3", "C4", "E4"],
            angry: ["D4", "F4", "A4"],
            neutral: ["C4", "E4", "G4"],
            surprised: ["F4", "A4", "C5"],
            fearful: ["B3", "D4", "F#4"],
            disgusted: ["G3", "B3", "D4"]
        }
    },
    
    // Timers
    timers: {
        phase: null,
        session: null,
        emotion: null,
        ripple: null
    }
};

// Application initialization
async function init() {
    // Check for WebGL support
    if (!checkWebGLSupport()) {
        document.getElementById('loading').innerHTML = 
            '<div>WebGL not available. Please try a different browser.</div>';
        return;
    }
    
    try {
        // Initialize scene
        await initScene();
        
        // Initialize event listeners
        initEventListeners();
        
        // Start animation loop
        animate();
        
        // Load face detection models in background
        loadFaceDetectionModels().catch(error => {
            console.warn('Face detection models could not be loaded:', error);
        });
        
        // Initially hide video containers until emotion detection is enabled
        document.getElementById('video-container').style.display = 'none';
        document.getElementById('emotion-display').style.display = 'none';
        document.getElementById('emotion-history').style.display = 'none';
        
    } catch (error) {
        console.error('Initialization error:', error);
        document.getElementById('loading').innerHTML = 
            `<div>Error initializing application: ${error.message}</div>
             <button onclick="location.reload()">Retry</button>`;
    }
}

// Start the application when the window loads
window.addEventListener('load', init);

// Export any needed functions for other modules
export { init };