// main.js - Complete rewrite with proper WebGL setup
(function() {
    'use strict';
    
    // ========== DEBUG CONSOLE ==========
    console.log('🎯 BROCKEN NOISE · CA MODULE INITIALIZING');
    console.log('Timestamp:', new Date().toISOString());
    
    // ========== CONFIGURATION ==========
    const CONFIG = {
        gridWidth: 128,
        gridHeight: 72,
        defaultRule: 110,
        minFPS: 1,
        maxFPS: 30,
        defaultFPS: 5
    };
    
    // ========== THREE.JS SETUP WITH ERROR HANDLING ==========
    let scene, camera, renderer, material, mesh, texture;
    let gl;
    
    try {
        // Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x000000);
        
        // Camera (orthographic for 2D)
        camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
        camera.position.z = 1;
        
        // Renderer with fallback options
        renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: false,
            powerPreference: "high-performance"
        });
        
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Cap for performance
        
        // Get WebGL context for debugging
        gl = renderer.getContext();
        
        console.log('✅ Three.js initialized');
        console.log('📊 WebGL Info:', {
            renderer: gl.getParameter(gl.RENDERER),
            vendor: gl.getParameter(gl.VENDOR),
            version: gl.getParameter(gl.VERSION),
            shadingLanguageVersion: gl.getParameter(gl.SHADING_LANGUAGE_VERSION)
        });
        
    } catch (e) {
        console.error('❌ Failed to initialize WebGL:', e);
        document.body.innerHTML += `
            <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); 
                        background:rgba(0,0,0,0.9); color:#f64; padding:20px; border-left:3px solid #f64;
                        font-family:monospace; z-index:1000;">
                <h3>⚠️ WebGL Error</h3>
                <p>${e.message}</p>
                <p>Please try a different browser or device.</p>
            </div>
        `;
        return;
    }
    
    // Append canvas to container
    document.getElementById('canvas-container').appendChild(renderer.domElement);
    
    // ========== CELLULAR AUTOMATA IMPLEMENTATION ==========
    class CellularAutomata {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.grid = new Uint8Array(width * height);
            this.nextGrid = new Uint8Array(width * height);
            this.rule = CONFIG.defaultRule;
            this.generation = 0;
            this.ruleBits = this.rule.toString(2).padStart(8, '0').split('').map(Number);
            
            console.log('🧬 CA Initialized:', { width, height, cells: width * height });
            this.randomizeFirstRow();
        }
        
        setRule(ruleNumber) {
            this.rule = Math.min(255, Math.max(0, ruleNumber));
            this.ruleBits = this.rule.toString(2).padStart(8, '0').split('').map(Number);
            console.log('📏 Rule set to:', this.rule);
        }
        
        getNewState(left, center, right) {
            // Wolfram rule indexing: left, center, right as binary number
            const index = 7 - ((left << 2) | (center << 1) | right);
            return this.ruleBits[index];
        }
        
        step() {
            // Shift all rows up (scrolling effect)
            for (let y = this.height - 1; y > 0; y--) {
                const currentRow = y * this.width;
                const prevRow = (y - 1) * this.width;
                for (let x = 0; x < this.width; x++) {
                    this.nextGrid[currentRow + x] = this.grid[prevRow + x];
                }
            }
            
            // Calculate new first row based on current first row
            const firstRow = 0;
            for (let x = 0; x < this.width; x++) {
                const left = this.grid[firstRow + ((x - 1 + this.width) % this.width)];
                const center = this.grid[firstRow + x];
                const right = this.grid[firstRow + (x + 1) % this.width];
                this.nextGrid[firstRow + x] = this.getNewState(left, center, right);
            }
            
            // Swap grids
            [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
            this.generation++;
            
            return this.calculateMetrics();
        }
        
        calculateMetrics() {
            let population = 0;
            let lonely = 0;
            let totalDead = 0;
            
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = y * this.width + x;
                    if (this.grid[idx] === 1) {
                        population++;
                    } else {
                        totalDead++;
                        // Check if dead cell has any live neighbors
                        let hasLiveNeighbor = false;
                        for (let dy = -1; dy <= 1; dy++) {
                            for (let dx = -1; dx <= 1; dx++) {
                                if (dx === 0 && dy === 0) continue;
                                const nx = (x + dx + this.width) % this.width;
                                const ny = (y + dy + this.height) % this.height;
                                if (this.grid[ny * this.width + nx] === 1) {
                                    hasLiveNeighbor = true;
                                    break;
                                }
                            }
                            if (hasLiveNeighbor) break;
                        }
                        if (!hasLiveNeighbor) lonely++;
                    }
                }
            }
            
            return {
                population: population,
                loneliness: totalDead > 0 ? lonely / totalDead : 0,
                generation: this.generation
            };
        }
        
        randomizeFirstRow() {
            // Random initial conditions for first row
            for (let x = 0; x < this.width; x++) {
                this.grid[x] = Math.random() > 0.5 ? 1 : 0;
            }
            // Clear rest
            for (let i = this.width; i < this.grid.length; i++) {
                this.grid[i] = 0;
            }
            console.log('🌱 First row randomized, population:', this.grid.slice(0, this.width).reduce((a, b) => a + b, 0));
        }
        
        reset() {
            this.generation = 0;
            this.randomizeFirstRow();
        }
        
        getGridData() {
            return this.grid;
        }
    }
    
    // ========== INITIALIZE CA ==========
    const ca = new CellularAutomata(CONFIG.gridWidth, CONFIG.gridHeight);
    let metrics = ca.calculateMetrics();
    
    // Update UI with initial metrics
    document.getElementById('population').textContent = metrics.population;
    document.getElementById('rule-display').textContent = ca.rule;
    
    // ========== TEXTURE SETUP ==========
    // Create data array for texture (RGBA format)
    const textureWidth = ca.width;
    const textureHeight = ca.height;
    const data = new Uint8Array(textureWidth * textureHeight * 4);
    
    console.log('🖼️ Texture created:', { width: textureWidth, height: textureHeight, dataSize: data.length });
    
    // Create and configure texture
    texture = new THREE.DataTexture(data, textureWidth, textureHeight, THREE.RGBAFormat);
    texture.minFilter = THREE.NearestFilter;  // Crucial for pixel-perfect rendering
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    
    console.log('📦 Texture object:', texture);
    
    // ========== SHADER MATERIAL ==========
    const vertexShader = `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;
    
    const fragmentShader = `
        uniform sampler2D texture;
        uniform float time;
        uniform float loneliness;
        varying vec2 vUv;
        
        void main() {
            // Sample the texture (using nearest neighbor filtering)
            vec4 cell = texture2D(texture, vUv);
            
            // cell.r > 0.5 means live cell (since we set R to 255 for live)
            if (cell.r > 0.5) {
                // Live cell - warm orange with subtle pulse
                float pulse = 0.8 + 0.2 * sin(time * 3.0 + vUv.x * 20.0);
                vec3 liveColor = vec3(1.0, 0.5, 0.2); // Orange
                gl_FragColor = vec4(liveColor * pulse, 1.0);
                
                // Add slight glow at edges
                vec2 gridPos = fract(vUv * vec2(128.0, 72.0));
                if (gridPos.x < 0.05 || gridPos.x > 0.95 || gridPos.y < 0.05 || gridPos.y > 0.95) {
                    gl_FragColor.rgb += vec3(0.3, 0.1, 0.0);
                }
            } else {
                // Dead cell - cold blue/black with loneliness influence
                float intensity = 0.1 + loneliness * 0.4;
                float flicker = 0.05 * sin(time * 5.0 + vUv.y * 30.0);
                
                // Grid lines
                vec2 gridPos = fract(vUv * vec2(128.0, 72.0));
                if (gridPos.x < 0.02 || gridPos.y < 0.02) {
                    // Grid line color
                    gl_FragColor = vec4(0.2, 0.1, 0.2, 1.0);
                } else {
                    // Dead cell color
                    gl_FragColor = vec4(intensity + flicker, 0.0, 0.1, 1.0);
                }
            }
        }
    `;
    
    material = new THREE.ShaderMaterial({
        uniforms: {
            texture: { value: texture },
            time: { value: 0 },
            loneliness: { value: 0 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader
    });
    
    // Check for shader compilation errors
    if (material.compilerErrors) {
        console.error('❌ Shader compilation errors:', material.compilerErrors);
    } else {
        console.log('✅ Shader compiled successfully');
    }
    
    // ========== MESH ==========
    const geometry = new THREE.PlaneGeometry(2, 2);
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    console.log('🎨 Mesh added to scene');
    
    // ========== UPDATE TEXTURE FUNCTION ==========
    function updateTexture() {
        const grid = ca.getGridData();
        let liveCount = 0;
        
        // Fill texture data
        for (let y = 0; y < textureHeight; y++) {
            for (let x = 0; x < textureWidth; x++) {
                const idx = y * textureWidth + x;
                const cellState = grid[idx];
                const texIdx = idx * 4;
                
                if (cellState === 1) {
                    liveCount++;
                    // Live cell: white (will be colored by shader)
                    data[texIdx] = 255;     // R
                    data[texIdx + 1] = 255; // G
                    data[texIdx + 2] = 255; // B
                } else {
                    // Dead cell: black
                    data[texIdx] = 0;        // R
                    data[texIdx + 1] = 0;    // G
                    data[texIdx + 2] = 0;    // B
                }
                data[texIdx + 3] = 255; // Alpha always full
            }
        }
        
        // Update texture
        texture.needsUpdate = true;
        
        // Log occasionally for debugging
        if (ca.generation % 30 === 0) {
            console.log(`📊 Generation ${ca.generation}: ${liveCount} live cells`);
        }
        
        return liveCount;
    }
    
    // ========== ANIMATION LOOP ==========
    let lastUpdate = 0;
    let targetFPS = CONFIG.defaultFPS;
    let frameCount = 0;
    let lastLog = 0;
    
    function animate(time) {
        requestAnimationFrame(animate);
        
        // Update CA at controlled FPS
        if (time - lastUpdate > 1000 / targetFPS) {
            metrics = ca.step();
            const liveCount = updateTexture();
            
            // Update UI
            document.getElementById('population').textContent = liveCount;
            document.getElementById('speed-display').textContent = targetFPS;
            
            // Update shader uniform
            material.uniforms.loneliness.value = metrics.loneliness;
            
            lastUpdate = time;
            frameCount++;
        }
        
        // Update time uniform for animations
        material.uniforms.time.value = time / 1000;
        
        // Render
        renderer.render(scene, camera);
        
        // FPS logging (every 60 frames)
        if (time - lastLog > 1000) {
            console.log(`🎬 Rendering at ~${frameCount}fps`);
            frameCount = 0;
            lastLog = time;
        }
    }
    
    // ========== EVENT LISTENERS ==========
    document.getElementById('random-rule').addEventListener('click', () => {
        const newRule = Math.floor(Math.random() * 256);
        ca.setRule(newRule);
        document.getElementById('rule-display').textContent = newRule;
        console.log('🎲 Random rule selected:', newRule);
    });
    
    document.getElementById('reset').addEventListener('click', () => {
        ca.reset();
        updateTexture();
        console.log('🔄 CA reset');
    });
    
    document.getElementById('speed').addEventListener('input', (e) => {
        targetFPS = parseInt(e.target.value);
        document.getElementById('speed-display').textContent = targetFPS;
    });
    
    // Handle resize
    window.addEventListener('resize', () => {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    });
    
    // ========== INITIAL UPDATE AND START ==========
    console.log('🚀 Starting initial texture update...');
    const initialLive = updateTexture();
    console.log('✨ Initial live cells:', initialLive);
    console.log('🎯 Animation loop starting...');
    
    // Start animation
    animate(0);
    
    // Force a second update after a short delay to ensure texture is applied
    setTimeout(() => {
        updateTexture();
        console.log('⏰ Delayed texture update complete');
    }, 500);
})();
