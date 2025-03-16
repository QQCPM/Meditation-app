import { triggerRipple } from './ripple.js';
import { playPhaseAudio } from './audio.js';

function updateBreathing(deltaTime, elapsedTime) {
    if (!app.visuals.droplet || !app.visuals.dropletMesh) return;
    
    if (app.state.sessionActive) {
        // Update phase timer
        app.animation.phaseTimer += deltaTime;
        
        // Get current phase duration
        const currentPattern = app.patterns[app.state.breathingPattern];
        const currentPhaseDuration = currentPattern[app.state.currentPhase];
        
        // Check if phase is complete
        if (app.animation.phaseTimer >= currentPhaseDuration) {
            // Reset phase timer
            app.animation.phaseTimer = 0;
            
            // Move to next phase
            updateBreathPhase();
            
            // Play audio for the new phase
            playPhaseAudio();
            
            // Trigger ripple on phase change
            triggerRipple();
        }
        
        // Calculate breath progress based on current phase
        let progress = 0;
        if (app.state.currentPhase === 'inhale') {
            // Inhale: 0 -> 1
            progress = app.animation.phaseTimer / currentPhaseDuration;
        } else if (app.state.currentPhase === 'hold' && app.state.breathingPattern !== 'normal') {
            // Hold: stay at 1
            progress = 1;
        } else if (app.state.currentPhase === 'exhale') {
            // Exhale: 1 -> 0
            progress = 1 - (app.animation.phaseTimer / currentPhaseDuration);
        } else {
            // Rest: stay at 0
            progress = 0;
        }
        
        app.animation.breathProgress = progress;
        
        // Update turbulence based on attention level
        if (app.state.attentionLevel === 'low') {
            // High turbulence for low attention
            app.animation.turbulence = 0.7;
        } else if (app.state.attentionLevel === 'dynamic') {
            // Fluctuating turbulence for dynamic attention
            app.animation.turbulence = 0.1 + 0.6 * Math.abs(Math.sin(elapsedTime * 0.2));
        } else {
            // Low turbulence for high attention
            app.animation.turbulence = 0;
        }
        
        // Adjust turbulence based on emotion if active
        if (app.emotionResponseActive && app.state.detectedEmotion) {
            if (app.state.detectedEmotion === 'angry') {
                // Increase turbulence for anger
                app.animation.turbulence += 0.4;
            } else if (app.state.detectedEmotion === 'fearful') {
                // Add random spikes for fear
                app.animation.turbulence += Math.random() * 0.3;
            }
        }
    } else {
        // Default gentle breathing when not in session
        app.animation.breathProgress = (Math.sin(elapsedTime * 0.5) + 1) * 0.5;
        app.animation.turbulence = 0;
    }

    // Get current and original positions
    const positions = app.visuals.dropletMesh.geometry.attributes.position.array;
    const originalPositions = app.visuals.dropletGeometryData.original.attributes.position.array;

    // Update vertex positions for subtle deformation
    for (let i = 0; i < positions.length; i += 3) {
        const x = originalPositions[i];
        const y = originalPositions[i + 1];
        const z = originalPositions[i + 2];

        // Breathing effect on y-axis
        const breathOffset = app.animation.breathProgress * 0.1;
        const scaledY = y * (1 + breathOffset);

        // Subtle turbulence
        const turbX = (Math.random() - 0.5) * app.animation.turbulence * 0.05;
        const turbY = (Math.random() - 0.5) * app.animation.turbulence * 0.05;
        const turbZ = (Math.random() - 0.5) * app.animation.turbulence * 0.05;

        positions[i] = x + turbX;
        positions[i + 1] = scaledY + turbY;
        positions[i + 2] = z + turbZ;
    }
    app.visuals.dropletMesh.geometry.attributes.position.needsUpdate = true;

    // Scale the droplet
    const baseScale = 0.8;
    let scaleValue = baseScale * (1 + app.animation.breathProgress * 0.15);
    if (app.animation.turbulence > 0) {
        scaleValue += (Math.random() - 0.5) * app.animation.turbulence * 0.1;
    }
    app.visuals.droplet.scale.set(scaleValue, scaleValue, scaleValue);

    // Update normal map for surface ripples
    if (app.visuals.dropletMesh.material.normalMap) {
        const turbulenceOffset = app.animation.turbulence * 0.01;
        const breathOffset = app.animation.breathProgress * 0.02;
        app.visuals.dropletMesh.material.normalMap.offset.x += Math.sin(elapsedTime) * turbulenceOffset;
        app.visuals.dropletMesh.material.normalMap.offset.y += (Math.cos(elapsedTime * 0.8) * turbulenceOffset) + (breathOffset * deltaTime);
        const normalScale = 0.02 + (app.state.dropletIntensity * 0.03) + (app.animation.turbulence * 0.02);
        app.visuals.dropletMesh.material.normalScale.set(normalScale, normalScale);
    }

    // Update instruction text
    updateInstructions();
}

// Update breath phase
function updateBreathPhase() {
    const currentPattern = app.patterns[app.state.breathingPattern];
    
    // Cycle through phases
    if (app.state.currentPhase === 'inhale') {
        if (currentPattern.hold > 0) {
            app.state.currentPhase = 'hold';
        } else {
            app.state.currentPhase = 'exhale';
        }
    } else if (app.state.currentPhase === 'hold') {
        app.state.currentPhase = 'exhale';
    } else if (app.state.currentPhase === 'exhale') {
        if (currentPattern.rest > 0) {
            app.state.currentPhase = 'rest';
        } else {
            app.state.currentPhase = 'inhale';
        }
    } else { // rest
        app.state.currentPhase = 'inhale';
    }
}

// Update instructions text
function updateInstructions() {
    const instructionsEl = document.getElementById('instructions');
    
    if (!app.state.sessionActive) {
        instructionsEl.textContent = "Click 'Start Session' to begin";
        return;
    }
    
    let text = "";
    switch (app.state.currentPhase) {
        case 'inhale':
            text = "Inhale...";
            break;
        case 'hold':
            text = "Hold...";
            break;
        case 'exhale':
            text = "Exhale...";
            break;
        case 'rest':
            text = "Rest...";
            break;
    }
    
    // Add emotion-specific guidance if emotion response is active
    if (app.emotionResponseActive && app.state.detectedEmotion && app.state.emotionStability > 0.7) {
        switch (app.state.detectedEmotion) {
            case 'angry':
                text += " Release tension";
                break;
            case 'sad':
                text += " Find comfort";
                break;
            case 'fearful':
                text += " You are safe";
                break;
            case 'happy':
                text += " Enjoy this feeling";
                break;
            case 'surprised':
                text += " Center yourself";
                break;
            case 'disgusted':
                text += " Let it pass";
                break;
        }
    }
    
    instructionsEl.textContent = text;
}

export { updateBreathing, updateBreathPhase, updateInstructions };