class GhostVisionApp {
    constructor() {
        this.permissions = {
            camera: false,
            location: false
        };
        this.isScanning = false;
        this.lastScanTime = 0;
        this.scanInterval = 30000; // 30 seconds between scans
        
        this.init();
    }

    async init() {
        await this.showLoadingScreen();
        this.showPermissionScreen();
        this.setupEventListeners();
        
        // Initialize managers
        window.ghostManager = new GhostManager();
        window.arRenderer = new ARRenderer();
    }

    async showLoadingScreen() {
        return new Promise(resolve => {
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
                resolve();
            }, 3000);
        });
    }

    showPermissionScreen() {
        document.getElementById('permission-screen').classList.remove('hidden');
    }

    setupEventListeners() {
        document.getElementById('grant-permissions').addEventListener('click', () => {
            this.requestPermissions();
        });
    }

    async requestPermissions() {
        try {
            // Request camera permission
            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: 'environment',
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } 
            });
            this.permissions.camera = true;
            this.videoStream = stream;

            // Request location permission
            if ('geolocation' in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.permissions.location = true;
                        this.startApp();
                    },
                    (error) => {
                        console.warn('Location permission denied, using fallback');
                        this.startApp();
                    }
                );
            } else {
                this.startApp();
            }
        } catch (error) {
            console.error('Permission denied:', error);
            alert('Camera access is required for ghost detection!');
        }
    }

    startApp() {
        document.getElementById('permission-screen').classList.add('hidden');
        document.getElementById('app').classList.remove('hidden');
        
        this.setupCamera();
        this.startGhostDetection();
        this.startLocationTracking();
        
        // Update ghost count display
        this.updateGhostCount();
    }

    setupCamera() {
        const video = document.querySelector('a-scene').sceneEl.canvas;
        if (this.videoStream) {
            // The video stream will be handled by AR.js
        }
    }

    startGhostDetection() {
        // Start periodic scanning
        setInterval(() => {
            if (Date.now() - this.lastScanTime > this.scanInterval) {
                this.performGhostScan();
            }
        }, 5000); // Check every 5 seconds

        // Also scan when significant movement detected
        if ('DeviceMotionEvent' in window) {
            window.addEventListener('devicemotion', (event) => {
                const acceleration = event.accelerationIncludingGravity;
                const magnitude = Math.sqrt(
                    acceleration.x ** 2 + 
                    acceleration.y ** 2 + 
                    acceleration.z ** 2
                );
                
                if (magnitude > 15 && Date.now() - this.lastScanTime > 10000) {
                    this.performGhostScan();
                }
            });
        }
    }

    async performGhostScan() {
        if (this.isScanning) return;
        
        this.isScanning = true;
        this.lastScanTime = Date.now();
        
        // Show scanning indicator
        document.getElementById('scanning-indicator').classList.remove('hidden');
        
        try {
            const frame = await this.captureFrame();
            const location = await this.getCurrentLocation();
            const orientation = this.getCurrentOrientation();
            
            // Send to AI for ghost analysis
            const ghostData = await this.analyzeFrameForGhosts(frame, location, orientation);
            
            if (ghostData && ghostData.shouldPlaceGhost) {
                await window.ghostManager.addGhost(ghostData);
                this.updateGhostCount();
            }
        } catch (error) {
            console.error('Ghost scan failed:', error);
        } finally {
            this.isScanning = false;
            setTimeout(() => {
                document.getElementById('scanning-indicator').classList.add('hidden');
            }, 2000);
        }
    }

    async captureFrame() {
        const canvas = document.getElementById('capture-canvas');
        const ctx = canvas.getContext('2d');
        
        // Get video element from AR.js
        const video = document.querySelector('a-scene').sceneEl.camera.el.components.camera.videoEl || 
                     document.querySelector('video');
        
        if (!video) return null;
        
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        return canvas.toDataURL('image/jpeg', 0.8);
    }

    async getCurrentLocation() {
        if (!this.permissions.location) {
            return { lat: 0, lng: 0, accuracy: 0 };
        }
        
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                () => {
                    resolve({ lat: 0, lng: 0, accuracy: 0 });
                }
            );
        });
    }

    getCurrentOrientation() {
        // Get camera rotation from A-Frame
        const camera = document.querySelector('a-camera');
        const rotation = camera.getAttribute('rotation') || { x: 0, y: 0, z: 0 };
        
        return {
            x: rotation.x,
            y: rotation.y,
            z: rotation.z
        };
    }

    async analyzeFrameForGhosts(frameData, location, orientation) {
        try {
            const completion = await websim.chat.completions.create({
                messages: [
                    {
                        role: "system",
                        content: `You are a supernatural entity detector. Analyze the provided camera frame and determine if this location would be suitable for placing a ghost.

Consider factors like:
- Dark corners or shadowy areas
- Empty spaces where a figure could appear
- Atmospheric conditions (lighting, environment)
- Creepy or eerie elements in the scene

Respond with JSON following this schema:
{
  "shouldPlaceGhost": boolean,
  "ghostType": "shadow" | "transparent" | "glowing" | "child" | "adult" | "demonic",
  "position": {"x": number, "y": number, "z": number},
  "description": string,
  "scareLevel": number (1-10),
  "triggerDistance": number (meters)
}`
                    },
                    {
                        role: "user",
                        content: [
                            {
                                type: "text",
                                text: `Location: ${location.lat}, ${location.lng}\nOrientation: ${orientation.x}, ${orientation.y}, ${orientation.z}\nPlease analyze this frame for ghost placement opportunities.`
                            },
                            {
                                type: "image_url",
                                image_url: { url: frameData }
                            }
                        ]
                    }
                ],
                json: true
            });

            const result = JSON.parse(completion.content);
            
            if (result.shouldPlaceGhost) {
                return {
                    ...result,
                    location: location,
                    orientation: orientation,
                    timestamp: Date.now(),
                    id: Math.random().toString(36).substr(2, 9)
                };
            }
            
            return null;
        } catch (error) {
            console.error('AI analysis failed:', error);
            return null;
        }
    }

    startLocationTracking() {
        if (!this.permissions.location) return;
        
        // Check for nearby ghosts every 2 seconds
        setInterval(() => {
            this.checkForNearbyGhosts();
        }, 2000);
    }

    async checkForNearbyGhosts() {
        const currentLocation = await this.getCurrentLocation();
        const currentOrientation = this.getCurrentOrientation();
        
        const nearbyGhosts = window.ghostManager.findNearbyGhosts(
            currentLocation, 
            currentOrientation, 
            5 // 5 meter radius
        );
        
        nearbyGhosts.forEach(ghost => {
            if (!ghost.hasAppeared) {
                this.triggerGhostAppearance(ghost);
                window.ghostManager.markGhostAsAppeared(ghost.id);
            }
        });
    }

    triggerGhostAppearance(ghost) {
        // Show alert
        this.showGhostAlert();
        
        // Render ghost in AR
        window.arRenderer.renderGhost(ghost);
        
        // Play spooky sound
        this.playGhostSound(ghost.scareLevel);
    }

    showGhostAlert() {
        const alert = document.getElementById('ghost-alert');
        alert.classList.remove('hidden');
        
        setTimeout(() => {
            alert.classList.add('hidden');
        }, 3000);
    }

    async playGhostSound(scareLevel) {
        try {
            const soundPrompts = [
                "Whispered ghost voice saying boo softly",
                "Creaky door opening slowly",
                "Footsteps on old wooden floor",
                "Chains rattling ominously",
                "Demonic growl echoing"
            ];
            
            const promptIndex = Math.min(scareLevel - 1, soundPrompts.length - 1);
            
            const result = await websim.textToSpeech({
                text: scareLevel > 5 ? "BOOOOOO!" : "boo...",
                voice: "en-female"
            });
            
            const audio = new Audio(result.url);
            audio.volume = Math.min(scareLevel / 10, 0.8);
            audio.play();
        } catch (error) {
            console.error('Failed to play ghost sound:', error);
        }
    }

    updateGhostCount() {
        const count = window.ghostManager.getTotalGhostCount();
        document.querySelector('#ghost-count span').textContent = count;
    }
}

// Start the app when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GhostVisionApp();
});

