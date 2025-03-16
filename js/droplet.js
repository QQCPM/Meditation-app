// Create water droplet visualization with enhanced effects
function createWaterDroplet() {
    app.visuals.droplet = new THREE.Group();
    app.scene.add(app.visuals.droplet);

    // Updated parametric geometry for a teardrop shape
    const dropletGeometry = new THREE.ParametricGeometry((u, v, target) => {
        const radius = 1;
        const stretch = 1.5;
        const angle = u * Math.PI * 2;
        const height = (v - 0.5) * 2 * radius; // height from -radius to radius
        let modifiedRadius;
        const k = 0.5; // Bulbousness at the bottom
        const p = 2;   // Tapering speed at the top
        if (height < 0) {
            // Bottom part: more bulbous
            modifiedRadius = radius * (1 + k * Math.pow(height / radius, 2));
        } else {
            // Top part: taper to a point
            modifiedRadius = radius * (1 - Math.pow(height / radius, p));
        }
        const x = Math.cos(angle) * modifiedRadius;
        const y = height * stretch;
        const z = Math.sin(angle) * modifiedRadius;
        target.set(x, y, z);
    }, 64, 64);

    // Enhanced material for a water-like look
    const dropletMaterial = new THREE.MeshPhysicalMaterial({
        color: app.colors.neutral,
        transparent: true,
        opacity: 0.9,
        transmission: 0.97,           // High transmission for glassiness
        thickness: 0.2,               // Thinner for a small droplet
        roughness: 0.05,              // Very smooth surface
        metalness: 0,                 // Water isn't metallic
        clearcoat: 1.0,               // Shiny surface layer
        clearcoatRoughness: 0.1,
        ior: 1.33,                    // Index of refraction for water
        specularIntensity: 1,
        envMapIntensity: 1,
        attenuationDistance: 0.1,     // Short distance for a small object
        attenuationColor: new THREE.Color(0x87CEEB) // Light blue tint
    });

    // Add normal map for surface ripples
    if (app.visuals.normalMap) {
        dropletMaterial.normalMap = app.visuals.normalMap;
        dropletMaterial.normalScale = new THREE.Vector2(0.05, 0.05); // More pronounced ripples
    }

    app.visuals.dropletMesh = new THREE.Mesh(dropletGeometry, dropletMaterial);
    app.scene.add(app.visuals.dropletMesh);
    
    // Add droplet to group after creation (fixes any potential reference issues)
    app.visuals.droplet.add(app.visuals.dropletMesh);

    // Cube camera for reflections (improved setup)
    const cubeRenderTarget = new THREE.WebGLCubeRenderTarget(256, {
        format: THREE.RGBFormat,
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 10, cubeRenderTarget);
    app.scene.add(cubeCamera); // Add to scene not to droplet
    dropletMaterial.envMap = cubeRenderTarget.texture;
    
    app.animation.updateCubeCamera = () => {
        // Hide droplet before rendering environment map
        app.visuals.dropletMesh.visible = false;
        cubeCamera.position.copy(app.visuals.dropletMesh.position);
        cubeCamera.update(app.renderer, app.scene);
        app.visuals.dropletMesh.visible = true;
    };

    // Highlights
    const highlightMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.3,
        metalness: 0.9,
        roughness: 0.1,
        envMapIntensity: 2
    });

    const highlightGeometry = new THREE.SphereGeometry(0.8, 32, 32);
    const highlight1 = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight1.scale.set(1.2, 0.6, 1);
    highlight1.position.set(0.3, 0.5, 0.3);
    app.visuals.droplet.add(highlight1);

    const highlight2 = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlight2.scale.set(0.8, 0.4, 1);
    highlight2.position.set(-0.2, 0.3, -0.2);
    app.visuals.droplet.add(highlight2);

    // Store original geometry for deformation
    app.visuals.dropletGeometryData = {
        original: dropletGeometry.clone()
    };
}

// Update emotion color transition
function updateEmotionTransition(deltaTime) {
    if (!app.visuals.dropletMesh || !app.animation.emotionTransition.from || !app.animation.emotionTransition.to) 
        return;
    
    // Update transition progress
    app.animation.emotionTransition.progress += deltaTime / app.animation.emotionTransition.duration;
    
    if (app.animation.emotionTransition.progress >= 1.0) {
        // Transition complete
        app.visuals.dropletMesh.material.color.copy(app.animation.emotionTransition.to);
        app.visuals.dropletMesh.material.attenuationColor.copy(app.animation.emotionTransition.to);
        app.animation.emotionTransition.from = null;
        app.animation.emotionTransition.to = null;
    } else {
        // Interpolate between colors
        const t = app.animation.emotionTransition.progress;
        // Use smooth step for easing
        const smoothT = t * t * (3 - 2 * t);
        
        // Interpolate colors
        const color = new THREE.Color().lerpColors(
            app.animation.emotionTransition.from,
            app.animation.emotionTransition.to,
            smoothT
        );
        
        // Apply colors
        app.visuals.dropletMesh.material.color.copy(color);
        app.visuals.dropletMesh.material.attenuationColor.copy(color);
    }
}

// Update droplet color based on emotion
function updateDropletColor(emotion) {
    if (!app.visuals.dropletMesh) return;
    
    let targetColor;
    
    // Map emotion to color
    switch (emotion) {
        case 'happy':
            targetColor = app.colors.happy;
            break;
        case 'sad':
            targetColor = app.colors.sad;
            break;
        case 'angry':
            targetColor = app.colors.angry;
            break;
        case 'surprised':
            targetColor = app.colors.surprised;
            break;
        case 'fearful':
            targetColor = app.colors.fearful;
            break;
        case 'disgusted':
            targetColor = app.colors.disgusted;
            break;
        case 'neutral':
        default:
            targetColor = app.colors.neutral;
            break;
    }
    
    // Adjust transition duration based on emotional difference
    // Slower transitions between very different emotions
    let duration = 1.5;
    if (app.animation.emotionTransition.from) {
        const colorDistance = app.animation.emotionTransition.from.distanceTo(targetColor);
        duration = 1.0 + colorDistance * 2;
    }
    
    // Set up color transition
    app.animation.emotionTransition = {
        from: app.visuals.dropletMesh.material.color.clone(),
        to: targetColor.clone(),
        progress: 0,
        duration: duration
    };
    
    // Also update ripple colors
    if (app.animation.ripples) {
        app.animation.ripples.forEach(ripple => {
            if (ripple.active) {
                ripple.mesh.material.color.copy(targetColor);
            }
        });
    }
    
    // Update background tint subtly
    if (app.visuals.backgroundPlane) {
        const bgColor = targetColor.clone().multiplyScalar(0.2);
        app.visuals.backgroundPlane.material.color.copy(bgColor);
    }
}

export { createWaterDroplet, updateEmotionTransition, updateDropletColor };