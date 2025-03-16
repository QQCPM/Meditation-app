// Create particles inside the droplet
function createParticles() {
    const particleCount = 100; // Increased count for better visual
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    
    // Create particles within the droplet shape
    for (let i = 0; i < particleCount; i++) {
        // Position particles within a teardrop shape
        let x, y, z;
        
        // Use rejection sampling to keep particles inside droplet shape
        do {
            // Random position within bounds
            x = (Math.random() - 0.5) * 1.5;
            y = (Math.random() - 1) * 2;
            z = (Math.random() - 0.5) * 0.6;
            
            // Check if within teardrop boundary (approximate)
            const distFromAxis = Math.sqrt(x*x + z*z);
            const normalizedY = (y + 1.5) / 3; // Normalize y from -1.5 to 1.5
            
            // This formula approximates a teardrop shape
            const maxRadius = 1.2 * Math.sqrt(normalizedY) * (1 - normalizedY/2);
            
            if (distFromAxis <= maxRadius) break;
        } while (true);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        sizes[i] = 0.05 + Math.random() * 0.05;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    
    // Create particle texture with improved gradient
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const context = canvas.getContext('2d');
    const gradient = context.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, canvas.width / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.2, 'rgba(240,255,255,0.9)');
    gradient.addColorStop(0.5, 'rgba(210,240,255,0.6)');
    gradient.addColorStop(1, 'rgba(200,230,255,0)');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
    
    const particleTexture = new THREE.Texture(canvas);
    particleTexture.needsUpdate = true;
    
    // Create improved particle material
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        map: particleTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true
    });
    
    // Create particle system
    app.visuals.particles = new THREE.Points(geometry, particleMaterial);
    app.visuals.droplet.add(app.visuals.particles);
    
    // Store original positions for animation
    app.visuals.particleData = [];
    for (let i = 0; i < particleCount; i++) {
        app.visuals.particleData.push({
            originalX: positions[i * 3],
            originalY: positions[i * 3 + 1],
            originalZ: positions[i * 3 + 2],
            velocity: new THREE.Vector3(
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02,
                (Math.random() - 0.5) * 0.02
            ),
            size: sizes[i],
            initialDelay: Math.random() * 2 // Random delay for particle animation
        });
    }
}

// Update particles animation
function updateParticles(deltaTime, elapsedTime) {
    if (!app.visuals.particles || !app.visuals.particleData) return;
    
    const positions = app.visuals.particles.geometry.attributes.position.array;
    
    // Update particle positions
    for (let i = 0; i < app.visuals.particleData.length; i++) {
        const particle = app.visuals.particleData[i];
        
        // Apply delay for staggered animation
        const delay = particle.initialDelay;
        const adjustedTime = Math.max(0, elapsedTime - delay);
        
        // Base position
        let x = particle.originalX;
        let y = particle.originalY;
        let z = particle.originalZ;
        
        // Breathing effect - move particles up during inhale
        const breathOffset = app.animation.breathProgress * 0.2 * (1.5 + y); // More effect near top
        y += breathOffset;
        
        // Apply turbulence if attention is low
        if (app.animation.turbulence > 0) {
            const turbScale = app.animation.turbulence * 0.1;
            x += (Math.random() - 0.5) * turbScale;
            y += (Math.random() - 0.5) * turbScale;
            z += (Math.random() - 0.5) * turbScale;
        }
        
        // Add gentle swirling motion based on droplet intensity
        const swirl = app.state.dropletIntensity * 0.2;
        const swirlX = Math.sin(adjustedTime * 0.5 + y * 2) * swirl * deltaTime;
        const swirlZ = Math.cos(adjustedTime * 0.5 + y * 2) * swirl * deltaTime;
        
        x += swirlX;
        z += swirlZ;
        
        // Adjust particle motion based on emotion if active
        if (app.emotionResponseActive && app.state.detectedEmotion) {
            if (app.state.detectedEmotion === 'happy') {
                // More energetic upward movement for happiness
                y += Math.sin(adjustedTime * 3 + i * 0.1) * 0.002;
            } else if (app.state.detectedEmotion === 'sad') {
                // Slower, downward movement for sadness
                y -= 0.001;
            } else if (app.state.detectedEmotion === 'angry') {
                // More chaotic movement for anger
                x += (Math.random() - 0.5) * 0.01;
                y += (Math.random() - 0.5) * 0.01;
                z += (Math.random() - 0.5) * 0.01;
            } else if (app.state.detectedEmotion === 'surprised') {
                // Sudden jumps for surprise
                if (Math.random() < 0.02) {
                    x += (Math.random() - 0.5) * 0.05;
                    y += (Math.random() - 0.5) * 0.05;
                    z += (Math.random() - 0.5) * 0.05;
                }
            }
        }
        
        // Update positions
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
    }
    
    // Mark positions for update
    app.visuals.particles.geometry.attributes.position.needsUpdate = true;
    
    // Update particle color based on droplet color
    if (app.emotionResponseActive && app.visuals.dropletMesh) {
        app.visuals.particles.material.color.copy(app.visuals.dropletMesh.material.color);
        app.visuals.particles.material.color.multiplyScalar(1.2); // Make particles slightly brighter
    }
}

export { createParticles, updateParticles };