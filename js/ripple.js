// Create ripple effect
function createRippleEffect() {
    // Create ring geometry for ripples
    const ringGeometry = new THREE.RingGeometry(0.5, 0.7, 32);
    const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: app.colors.neutral,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide
    });
    
    // Create initial ripple rings (hidden until triggered)
    for (let i = 0; i < 5; i++) {
        const ripple = new THREE.Mesh(ringGeometry, ringMaterial.clone());
        ripple.rotation.x = Math.PI / 2; // Lay flat
        ripple.position.y = -1.5; // Position below droplet
        ripple.scale.set(0.1, 0.1, 0.1); // Start small
        ripple.visible = false;
        
        app.scene.add(ripple);
        app.animation.ripples.push({
            mesh: ripple,
            active: false,
            scale: 0.1,
            opacity: 0.5
        });
    }
}

// Trigger a ripple effect
function triggerRipple() {
    // Find an inactive ripple
    const inactiveRipple = app.animation.ripples.find(r => !r.active);
    if (!inactiveRipple) return;
    
    // Set ripple properties
    inactiveRipple.active = true;
    inactiveRipple.scale = 0.1;
    inactiveRipple.opacity = 0.5;
    inactiveRipple.mesh.visible = true;
    
    // Position below droplet
    inactiveRipple.mesh.position.copy(app.visuals.droplet.position);
    inactiveRipple.mesh.position.y = app.visuals.droplet.position.y - 1.5;
    
    // Update color based on current emotion
    if (app.emotionResponseActive && app.state.detectedEmotion) {
        const color = app.colors[app.state.detectedEmotion] || app.colors.neutral;
        inactiveRipple.mesh.material.color.copy(color);
    }
}

// Update ripples animation
function updateRipples(deltaTime) {
    app.animation.ripples.forEach(ripple => {
        if (!ripple.active) return;
        
        // Expand ripple
        ripple.scale += deltaTime * 2;
        ripple.opacity -= deltaTime * 0.8;
        
        // Apply scale and opacity
        ripple.mesh.scale.set(ripple.scale, ripple.scale, 1);
        ripple.mesh.material.opacity = ripple.opacity;
        
        // Deactivate when fully faded
        if (ripple.opacity <= 0) {
            ripple.active = false;
            ripple.mesh.visible = false;
        }
    });
}

export { createRippleEffect, triggerRipple, updateRipples };