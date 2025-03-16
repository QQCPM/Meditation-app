// Import related modules
import { createWaterDroplet } from './droplet.js';
import { createParticles } from './particles.js';
import { createRippleEffect } from './ripple.js';

// Check for WebGL support
function checkWebGLSupport() {
    try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (!gl) {
            throw new Error('WebGL not supported');
        }
        return true;
    } catch (e) {
        console.error('WebGL not supported:', e);
        return false;
    }
}

// Initialize Three.js scene
async function initScene() {
    return new Promise((resolve, reject) => {
        try {
            // Create scene
            app.scene = new THREE.Scene();
            
            // Create camera
            app.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
            app.camera.position.z = 5;
            
            // Create renderer with transparency
            app.renderer = new THREE.WebGLRenderer({ 
                antialias: true,
                alpha: true
            });
            app.renderer.setSize(window.innerWidth, window.innerHeight);
            app.renderer.setPixelRatio(window.devicePixelRatio);
            app.renderer.setClearColor(0x000000, 0); // Transparent background
            app.renderer.physicallyCorrectLights = true;
            app.renderer.outputEncoding = THREE.sRGBEncoding;
            app.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            app.renderer.toneMappingExposure = 1.0;
            document.getElementById('canvas-container').appendChild(app.renderer.domElement);
            
            // Add ambient light
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            app.scene.add(ambientLight);
            
            // Add directional light
            const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
            directionalLight.position.set(5, 5, 5);
            app.scene.add(directionalLight);
            
            // Add point light inside droplet for highlight effect
            const pointLight = new THREE.PointLight(0xffffff, 0.8, 10);
            pointLight.position.set(0, 0, 2);
            app.scene.add(pointLight);
            
            // Add a backlight for rim lighting
            const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
            backLight.position.set(-5, -5, -5);
            app.scene.add(backLight);
            
            // Loading manager to track all texture loading
            const loadingManager = new THREE.LoadingManager(
                // onLoad callback
                () => {
                    // Create water droplet after textures are loaded
                    createWaterDroplet();
                    
                    // Add internal particles
                    createParticles();
                    
                    // Create ripple effect
                    createRippleEffect();
                    
                    // Hide loading screen
                    document.getElementById('loading').style.display = 'none';
                    
                    // Resolve the promise
                    resolve();
                },
                // onProgress callback
                (url, itemsLoaded, itemsTotal) => {
                    console.log(`Loading: ${itemsLoaded}/${itemsTotal}`);
                },
                // onError callback
                (url) => {
                    console.error(`Error loading ${url}`);
                    // Try to continue without this texture
                    document.getElementById('loading').innerHTML = 
                        `<p>Error loading some textures. <button onclick="location.reload()">Retry</button></p>`;
                    reject(new Error(`Failed to load texture: ${url}`));
                }
            );
            
            // Load water normals with loading manager
            const textureLoader = new THREE.TextureLoader(loadingManager);
            textureLoader.setPath('https://threejs.org/examples/textures/');
            
            // Load water normal map
            textureLoader.load('waternormals.jpg', 
                // onLoad callback
                (texture) => {
                    app.visuals.normalMap = texture;
                    app.visuals.normalMap.wrapS = app.visuals.normalMap.wrapT = THREE.RepeatWrapping;
                },
                undefined,
                // onError callback - try to continue with a backup texture
                (err) => {
                    console.error("Error loading water normal map:", err);
                    // Create a basic normal map as fallback
                    const canvas = document.createElement('canvas');
                    canvas.width = canvas.height = 512;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#8080ff'; // Default normal pointing up (+Z)
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    const fallbackTexture = new THREE.CanvasTexture(canvas);
                    fallbackTexture.wrapS = fallbackTexture.wrapT = THREE.RepeatWrapping;
                    app.visuals.normalMap = fallbackTexture;
                }
            );
            
            // Load grid texture (used on a background plane)
            textureLoader.load('grid.png', 
                // onLoad callback
                (gridTexture) => {
                    gridTexture.wrapS = gridTexture.wrapT = THREE.RepeatWrapping;
                    gridTexture.repeat.set(10, 10);
                    
                    const planeGeometry = new THREE.PlaneGeometry(20, 20);
                    const planeMaterial = new THREE.MeshBasicMaterial({ 
                        map: gridTexture, 
                        transparent: true, 
                        opacity: 0.2 
                    });
                    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
                    plane.position.z = -5;
                    app.scene.add(plane);
                    app.visuals.backgroundPlane = plane;
                },
                undefined,
                // onError callback - continue without background grid
                (err) => {
                    console.error("Error loading grid texture:", err);
                }
            );
            
            // Handle window resize
            window.addEventListener('resize', onWindowResize);
            
        } catch (error) {
            console.error('Error initializing scene:', error);
            reject(error);
        }
    });
}

// Handle window resize
function onWindowResize() {
    app.camera.aspect = window.innerWidth / window.innerHeight;
    app.camera.updateProjectionMatrix();
    app.renderer.setSize(window.innerWidth, window.innerHeight);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = app.clock.getDelta();
    const elapsedTime = app.clock.getElapsedTime();
    
    // Import handlers from respective modules
    import('./breathing.js').then(module => {
        module.updateBreathing(deltaTime, elapsedTime);
    });
    
    import('./particles.js').then(module => {
        module.updateParticles(deltaTime, elapsedTime);
    });
    
    import('./droplet.js').then(module => {
        module.updateEmotionTransition(deltaTime);
    });
    
    import('./ripple.js').then(module => {
        module.updateRipples(deltaTime);
    });
    
    // Update water time for texture animation
    app.animation.waterTime += deltaTime * app.state.dropletIntensity;
    
    // Update cube camera for reflections
    if (app.animation.updateCubeCamera) {
        app.animation.updateCubeCamera();
    }
    
    // Periodically trigger ripples during session
    if (app.state.sessionActive && Math.random() < deltaTime * 0.2) {
        import('./ripple.js').then(module => {
            module.triggerRipple();
        });
    }
    
    // Gently rotate the droplet
    if (app.visuals.droplet) {
        app.visuals.droplet.rotation.y = Math.sin(elapsedTime * 0.2) * 0.1;
        
        // Add a subtle wobble based on detected emotion
        if (app.emotionResponseActive && app.state.detectedEmotion) {
            if (app.state.detectedEmotion === 'angry') {
                // More aggressive rotation for anger
                app.visuals.droplet.rotation.x = Math.sin(elapsedTime * 2) * 0.1;
                app.visuals.droplet.rotation.z = Math.cos(elapsedTime * 1.5) * 0.08;
            } else if (app.state.detectedEmotion === 'sad') {
                // Slower, drooping rotation for sadness
                app.visuals.droplet.rotation.x = Math.sin(elapsedTime * 0.5) * 0.05 - 0.1;
            } else if (app.state.detectedEmotion === 'happy') {
                // Bouncy rotation for happiness
                app.visuals.droplet.rotation.x = Math.abs(Math.sin(elapsedTime * 1.2)) * 0.08;
                app.visuals.droplet.position.y = Math.sin(elapsedTime * 1.2) * 0.1;
            } else {
                // Default gentle rotation
                app.visuals.droplet.rotation.x = Math.sin(elapsedTime * 0.3) * 0.05;
            }
        }
    }
    
    // Render scene
    app.renderer.render(app.scene, app.camera);
}

// Export functions to be used in other modules
export { initScene, animate, checkWebGLSupport };