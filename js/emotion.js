import { updateDropletColor } from './droplet.js';
import { triggerRipple } from './ripple.js';

// Initialize face-api.js for emotion detection
async function loadFaceDetectionModels() {
    try {
        // Update UI
        document.getElementById('emotion-text').textContent = 'Loading models...';
        
        // Create a more robust model loading with timeout and retry
        const modelPath = 'https://justadudewhohacks.github.io/face-api.js/models';
        const loadModelsWithRetry = async (retries = 3) => {
            try {
                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(modelPath),
                    faceapi.nets.faceLandmark68Net.loadFromUri(modelPath),
                    faceapi.nets.faceRecognitionNet.loadFromUri(modelPath),
                    faceapi.nets.faceExpressionNet.loadFromUri(modelPath)
                ]);
                return true;
            } catch (error) {
                if (retries > 0) {
                    console.log(`Retrying model loading, ${retries} attempts left`);
                    document.getElementById('emotion-text').textContent = `Retrying (${retries})...`;
                    return await loadModelsWithRetry(retries - 1);
                } else {
                    throw error;
                }
            }
        };
        
        const modelLoadPromise = loadModelsWithRetry();
        
        // Add timeout for model loading
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error("Model loading timeout")), 30000);
        });
        
        // Race between successful loading and timeout
        await Promise.race([modelLoadPromise, timeoutPromise]);
        
        console.log('Face detection models loaded');
        document.getElementById('emotion-text').textContent = 'Models loaded';
        document.getElementById('toggle-emotion').disabled = false;
        document.getElementById('toggle-emotion-response').disabled = false;
        
    } catch (error) {
        console.error('Error loading face detection models:', error);
        document.getElementById('emotion-text').textContent = 'Model loading failed';
        
        // Provide retry button
        const retryBtn = document.createElement('button');
        retryBtn.textContent = 'Retry Loading';
        retryBtn.onclick = loadFaceDetectionModels;
        document.getElementById('emotion-display').appendChild(retryBtn);
        
        throw error;
    }
}

// Start video stream and emotion detection
async function startEmotionDetection() {
    try {
        // Update UI first to show we're trying to access camera
        document.getElementById('emotion-text').textContent = 'Accessing camera...';
        document.getElementById('toggle-emotion').disabled = true;
        
        // Access webcam with constraints for better performance
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 320 },
                height: { ideal: 240 },
                facingMode: 'user',
                frameRate: { max: 30 }
            } 
        });
        
        const video = document.getElementById('face-video');
        video.srcObject = stream;
        video.onloadedmetadata = async () => {
            await video.play();
            app.video = video;
            app.emotionDetectionActive = true;
            
            // Update button state
            document.getElementById('toggle-emotion').textContent = 'Disable Emotion Detection';
            document.getElementById('toggle-emotion').disabled = false;
            document.getElementById('toggle-emotion-response').disabled = false;
            
            // Start emotion detection loop
            detectEmotions();
            
            // Show video container
            document.getElementById('video-container').style.display = 'block';
            document.getElementById('emotion-display').style.display = 'block';
        };
        
    } catch (error) {
        console.error('Error accessing webcam:', error);
        document.getElementById('emotion-text').textContent = 'Camera access error';
        document.getElementById('toggle-emotion').textContent = 'Enable Emotion Detection';
        document.getElementById('toggle-emotion').disabled = false;
        app.emotionDetectionActive = false;
        
        // Show more specific error message
        let errorMsg = 'Could not access camera';
        if (error.name === 'NotAllowedError') {
            errorMsg = 'Camera access denied. Please allow camera access and reload.';
        } else if (error.name === 'NotFoundError') {
            errorMsg = 'No camera found. Please connect a camera.';
        }
        
        alert(errorMsg);
    }
}

// Stop emotion detection
function stopEmotionDetection() {
    // Stop video stream
    if (app.video && app.video.srcObject) {
        const stream = app.video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
        app.video.srcObject = null;
    }
    
    app.emotionDetectionActive = false;
    app.emotionResponseActive = false;
    
    // Update button states
    document.getElementById('toggle-emotion').textContent = 'Enable Emotion Detection';
    document.getElementById('toggle-emotion-response').textContent = 'Enable Emotion Response';
    document.getElementById('toggle-emotion-response').disabled = true;
    
    clearTimeout(app.timers.emotion);
    
    // Reset emotion state
    app.state.detectedEmotion = null;
    app.state.emotionConfidence = 0;
    app.state.emotionStability = 0;
    document.getElementById('emotion-text').textContent = 'Emotion detection off';
    document.getElementById('emotion-indicator').style.backgroundColor = '#ccc';
    
    // Reset droplet color to neutral
    if (app.visuals.dropletMesh) {
        app.animation.emotionTransition = {
            from: app.visuals.dropletMesh.material.color.clone(),
            to: app.colors.neutral.clone(),
            progress: 0,
            duration: 1.5
        };
    }
    
    // Hide video if needed
    if (!app.state.videoDisplayVisible) {
        document.getElementById('video-container').style.display = 'none';
        document.getElementById('emotion-display').style.display = 'none';
    }
}

// Toggle emotion response
function toggleEmotionResponse() {
    app.emotionResponseActive = !app.emotionResponseActive;
    
    const responseButton = document.getElementById('toggle-emotion-response');
    responseButton.textContent = app.emotionResponseActive ? 
        'Disable Emotion Response' : 'Enable Emotion Response';
    
    if (!app.emotionResponseActive) {
        // Reset droplet color to neutral
        if (app.visuals.dropletMesh) {
            // Set up color transition back to neutral
            app.animation.emotionTransition = {
                from: app.visuals.dropletMesh.material.color.clone(),
                to: app.colors.neutral.clone(),
                progress: 0,
                duration: 2.0
            };
        }
    } else if (app.state.detectedEmotion) {
        // If already detecting an emotion, update droplet immediately
        updateDropletColor(app.state.detectedEmotion);
    }
}

// Toggle video display
function toggleVideoDisplay() {
    app.state.videoDisplayVisible = !app.state.videoDisplayVisible;
    
    document.getElementById('video-container').style.display = 
        app.state.videoDisplayVisible ? 'block' : 'none';
    document.getElementById('emotion-display').style.display = 
        app.state.videoDisplayVisible ? 'block' : 'none';
    document.getElementById('emotion-history').style.display = 
        (app.state.videoDisplayVisible && app.emotionHistoryActive) ? 'block' : 'none';
    
    document.getElementById('toggle-video-display').textContent = 
        app.state.videoDisplayVisible ? 'Hide Camera' : 'Show Camera';
}

// Toggle emotion history display
function toggleEmotionHistory() {
    app.emotionHistoryActive = !app.emotionHistoryActive;
    
    document.getElementById('emotion-history').style.display = 
        (app.emotionHistoryActive && app.state.videoDisplayVisible) ? 'block' : 'none';
    
    document.getElementById('toggle-emotion-history').textContent = 
        app.emotionHistoryActive ? 'Hide Emotion History' : 'Show Emotion History';
}

// Detect emotions using face-api.js
async function detectEmotions() {
    if (!app.emotionDetectionActive || !app.video) {
        return;
    }
    
    try {
        // Only run detection if the video is ready
        if (app.video.readyState === 4) {
            // Detect faces with expressions
            const detections = await faceapi.detectAllFaces(
                app.video, 
                new faceapi.TinyFaceDetectorOptions({
                    inputSize: 224,     // Smaller for faster detection
                    scoreThreshold: 0.5 // Higher threshold for more confident detections
                })
            ).withFaceLandmarks().withFaceExpressions();
            
            // Process the results if faces found
            if (detections && detections.length > 0) {
                const detection = detections[0]; // Use first face
                const expressions = detection.expressions;
                
                // Find the dominant expression
                let dominantExpression = null;
                let highestConfidence = 0;
                
                for (const [expression, confidence] of Object.entries(expressions)) {
                    if (confidence > highestConfidence) {
                        highestConfidence = confidence;
                        dominantExpression = expression;
                    }
                }
                
                // Update emotion detection stability threshold
                if (highestConfidence > 0.5) {
                    // Check if this is a stable emotion (same as previous detection)
                    const currentTime = Date.now();
                    if (dominantExpression === app.state.detectedEmotion) {
                        // Increase stability (capped at 1.0)
                        app.state.emotionStability = Math.min(
                            1.0, 
                            app.state.emotionStability + 0.1
                        );
                        
                        // Log to history at most once per second
                        if (currentTime - app.lastEmotionUpdateTime > 1000 && app.state.emotionStability > 0.7) {
                            app.lastEmotionUpdateTime = currentTime;
                            logEmotionToHistory(dominantExpression, highestConfidence);
                        }
                    } else {
                        // New emotion - lower stability
                        app.state.emotionStability = 0.3;
                    }
                    
                    // Only change emotion when stability is high enough or it's a new detection
                    if (app.state.emotionStability > 0.5 || !app.state.detectedEmotion) {
                        const prevEmotion = app.state.detectedEmotion;
                        app.state.detectedEmotion = dominantExpression;
                        app.state.emotionConfidence = highestConfidence;
                        
                        // Update emotion display
                        updateEmotionDisplay(dominantExpression, highestConfidence);
                        
                        // Update droplet color if emotion response is active and emotion changed
                        if (app.emotionResponseActive && prevEmotion !== dominantExpression) {
                            updateDropletColor(dominantExpression);
                            
                            // Trigger ripple effect for emotion change
                            triggerRipple();
                            
                            // Log significant emotion changes to history
                            if (prevEmotion) {
                                logEmotionToHistory(dominantExpression, highestConfidence, true);
                            }
                        }
                    }
                }
            } else {
                document.getElementById('emotion-text').textContent = 'No face detected';
                // Gradually decrease stability when no face is detected
                app.state.emotionStability = Math.max(0, app.state.emotionStability - 0.05);
            }
        }
        
        // Continue detection loop with adaptive timing
        // Use longer interval when no face is detected to save resources
        const detectionInterval = detections && detections.length > 0 ? 100 : 500;
        app.timers.emotion = setTimeout(detectEmotions, detectionInterval);
        
    } catch (error) {
        console.error('Error detecting emotions:', error);
        document.getElementById('emotion-text').textContent = 'Detection error';
        
        // Retry after a longer delay
        app.timers.emotion = setTimeout(detectEmotions, 1000);
    }
}

// Log emotion to history display
function logEmotionToHistory(emotion, confidence, isChange = false) {
    // Add to history array (limit to 20 entries)
    const timestamp = new Date().toLocaleTimeString();
    app.emotionHistory.unshift({
        emotion,
        confidence,
        timestamp,
        isChange
    });
    
    if (app.emotionHistory.length > 20) {
        app.emotionHistory.pop();
    }
    
    // Update history display
    const historyContainer = document.getElementById('emotion-history');
    historyContainer.innerHTML = '';
    
    app.emotionHistory.forEach((entry, index) => {
        const entryEl = document.createElement('div');
        entryEl.style.marginBottom = '5px';
        entryEl.style.color = entry.isChange ? '#ff4081' : '#333';
        entryEl.style.fontWeight = index === 0 ? 'bold' : 'normal';
        
        entryEl.textContent = `${entry.timestamp.split(':')[0]}:${entry.timestamp.split(':')[1]} - ${entry.emotion} (${Math.round(entry.confidence * 100)}%)`;
        
        historyContainer.appendChild(entryEl);
    });
}

// Update emotion display
function updateEmotionDisplay(emotion, confidence) {
    const emotionText = document.getElementById('emotion-text');
    const emotionIndicator = document.getElementById('emotion-indicator');
    
    // Capitalize first letter
    const displayEmotion = emotion.charAt(0).toUpperCase() + emotion.slice(1);
    emotionText.textContent = `${displayEmotion} (${Math.round(confidence * 100)}%)`;
    
    // Set indicator color based on emotion
    let color = '#ccc';
    switch (emotion) {
        case 'happy':
            color = '#ffeb3b'; // Yellow
            break;
        case 'sad':
            color = '#2979ff'; // Blue
            break;
        case 'angry':
            color = '#ff5252'; // Red
            break;
        case 'surprised':
            color = '#ab47bc'; // Purple
            break;
        case 'fearful':
            color = '#43a047'; // Green
            break;
        case 'disgusted':
            color = '#ff9800'; // Orange
            break;
        case 'neutral':
            color = '#78909c'; // Blue-gray
            break;
    }
    
    emotionIndicator.style.backgroundColor = color;
    
    // Add stability indicator
    emotionIndicator.style.opacity = app.state.emotionStability;
    emotionText.style.opacity = 0.5 + (app.state.emotionStability * 0.5);
}

export { 
    loadFaceDetectionModels, 
    startEmotionDetection, 
    stopEmotionDetection, 
    toggleEmotionResponse,
    toggleVideoDisplay,
    toggleEmotionHistory,
    detectEmotions,
    logEmotionToHistory,
    updateEmotionDisplay
};