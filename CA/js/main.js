// ========== BROCKEN NOISE · PURE WEBGL CA ==========
// Version 2.0 - Full rule space exploration + spectre detection

(function() {
    'use strict';
    
    // ========== DEBUG SYSTEM ==========
    // ========== DEBUG SYSTEM ==========
    const DEBUG = {
        enabled: false,
        panel: document.getElementById('debug-panel'),
        logs: [],
        tapCount: 0,
        lastTap: 0,

        init: function() {
            // Ensure panel exists
            if (!this.panel) {
                this.panel = document.getElementById('debug-panel');
            }

            document.addEventListener('touchend', (e) => {
                const now = Date.now();
                if (now - this.lastTap < 2000) {
                    this.tapCount++;
                } else {
                    this.tapCount = 1;
                }
                this.lastTap = now;

                if (this.tapCount >= 5) {
                    this.enabled = !this.enabled;
                    if (this.panel) {
                        this.panel.style.display = this.enabled ? 'block' : 'none';
                    }
                    this.log('🔍 Debug mode ' + (this.enabled ? 'ENABLED' : 'DISABLED'));
                    this.tapCount = 0;
                }
            });

            if (window.location.search.includes('debug=true')) {
                this.enabled = true;
                if (this.panel) {
                    this.panel.style.display = 'block';
                }
            }

            // Now safe to log
            this.log('🚀 DEBUG SYSTEM INITIALIZED');
            this.log('WebGL canvas found: ' + (document.getElementById('webgl-canvas') ? '✅' : '❌'));
        },

        log: function(msg) {
            console.log('[CA]', msg);
            if (!this.enabled || !this.panel) return;

            const timeStr = new Date().toLocaleTimeString();
            this.logs.unshift(`> ${timeStr}: ${msg}`);
            if (this.logs.length > 10) this.logs.pop();

            // Force panel update
            this.panel.innerHTML = '<h4>🔍 DEBUG</h4>' + this.logs.join('<br>');
        },

        error: function(msg) {
            console.error('[CA]', msg);
            if (!this.enabled) return;
            this.log('❌ ERROR: ' + msg);
        }
    };
    // At top of main.js, right after DEBUG.init();
    DEBUG.log('🚀 MAIN.JS STARTED');
    DEBUG.log('WebGL canvas found: ' + (document.getElementById('webgl-canvas') ? '✅' : '❌'));
    
    // ========== CELLULAR AUTOMATA ==========
    class CellularAutomata {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.grid = new Uint8Array(width * height);
            this.nextGrid = new Uint8Array(width * height);
            this.history = []; // Store recent grids for pattern detection
            this.rule = 110;
            this.ruleClass = this.classifyRule(110);
            this.generation = 0;
            this.silenceFrames = 0;
            this.spectreHistory = [];
            this.patternMemory = new Map(); // Remember patterns we've seen
            this.updateRuleBits();
            this.randomizeFirstRow();
        }
        
        // Classify rules into Wolfram classes
        classifyRule(rule) {
            const bits = rule.toString(2).padStart(8, '0').split('').map(Number);
            
            // Class 1: Uniformity (rules 0, 32, 40, etc.)
            if ([0, 32, 40, 72, 96, 104, 128, 160, 168, 192, 224, 232, 255].includes(rule)) {
                return 1; // Eventually becomes uniform
            }
            
            // Class 2: Periodic (rules 4, 12, etc.)
            if ([4, 12, 28, 36, 44, 50, 60, 76, 77, 78, 94, 108, 132, 140, 156, 172, 178, 200, 204, 220, 222, 236].includes(rule)) {
                return 2; // Forms stable or oscillating patterns
            }
            
            // Class 3: Chaotic (rules 30, 45, etc.)
            if ([30, 45, 73, 75, 86, 89, 90, 101, 105, 109, 129, 133, 135, 137, 149, 150, 161, 165, 169, 181, 182, 183, 193, 195, 197, 210, 214, 217, 218, 225].includes(rule)) {
                return 3; // Pseudo-random chaotic
            }
            
            // Class 4: Complex (rules 110, 54, etc.)
            if ([54, 62, 110, 126, 146, 152, 154, 158, 184, 188, 190, 220, 222, 232, 235, 236, 238, 240, 250].includes(rule)) {
                return 4; // Complex, possibly Turing complete
            }
            
            // Default classification based on behavior
            return 3; // Default to chaotic
        }
        
        // Get rule class name
        getRuleClassName() {
            const classes = ['Uniform', 'Periodic', 'Chaotic', 'Complex'];
            return classes[this.ruleClass - 1] || 'Unknown';
        }
        
        updateRuleBits() {
            this.ruleBits = this.rule.toString(2).padStart(8, '0').split('').map(Number);
            this.ruleClass = this.classifyRule(this.rule);
        }
        
        setRule(rule) {
            this.rule = Math.min(255, Math.max(0, rule));
            this.updateRuleBits();
            this.patternMemory.clear(); // Reset pattern memory for new rule
        }
        
        // True random rule (not just uniform distribution)
        getRandomRule() {
            // Weighted distribution to favor interesting rules
            const rand = Math.random();
            
            if (rand < 0.2) {
                // 20% chance: Class 1-2 (simple)
                const simpleRules = [0, 32, 72, 96, 128, 160, 192, 224, 4, 12, 28, 36, 50, 76, 108, 132, 140, 172, 200, 204, 232, 236];
                return simpleRules[Math.floor(Math.random() * simpleRules.length)];
            } else if (rand < 0.5) {
                // 30% chance: Class 3 (chaotic)
                const chaoticRules = [30, 45, 73, 75, 86, 89, 90, 101, 105, 109, 133, 135, 137, 149, 150, 161, 165, 169, 181, 182, 183, 193, 195, 197, 210, 214, 217, 218, 225];
                return chaoticRules[Math.floor(Math.random() * chaoticRules.length)];
            } else {
                // 50% chance: Class 4 (complex) + truly random
                if (Math.random() < 0.7) {
                    // Prefer known interesting rules
                    const complexRules = [30, 54, 62, 90, 110, 126, 146, 150, 154, 158, 182, 184, 188, 190, 220, 222, 238, 250];
                    return complexRules[Math.floor(Math.random() * complexRules.length)];
                } else {
                    // Pure random from all 256
                    return Math.floor(Math.random() * 256);
                }
            }
        }
        
        getNewState(left, center, right) {
            const index = 7 - ((left << 2) | (center << 1) | right);
            return this.ruleBits[index];
        }
        
        step() {
            // Store current grid in history
            if (this.history.length > 10) {
                this.history.shift();
            }
            this.history.push(new Uint8Array(this.grid));
            
            // Shift rows down (new at top)
            for (let y = this.height - 1; y > 0; y--) {
                const currentRow = y * this.width;
                const prevRow = (y - 1) * this.width;
                for (let x = 0; x < this.width; x++) {
                    this.nextGrid[currentRow + x] = this.grid[prevRow + x];
                }
            }
            
            // Calculate new first row with wrap-around
            for (let x = 0; x < this.width; x++) {
                const left = this.grid[(x - 1 + this.width) % this.width];
                const center = this.grid[x];
                const right = this.grid[(x + 1) % this.width];
                this.nextGrid[x] = this.getNewState(left, center, right);
            }
            
            // Swap grids
            [this.grid, this.nextGrid] = [this.nextGrid, this.grid];
            this.generation++;
            
            return this.calculateMetrics();
        }
        
        calculateMetrics() {
            let population = 0;
            let clusters = 0;
            let visited = new Uint8Array(this.width * this.height);
            
            // Count population and find clusters (connected components)
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width; x++) {
                    const idx = y * this.width + x;
                    if (this.grid[idx] === 1 && !visited[idx]) {
                        clusters++;
                        // BFS to mark cluster
                        const queue = [[x, y]];
                        visited[idx] = 1;
                        
                        while (queue.length > 0) {
                            const [cx, cy] = queue.shift();
                            for (let dy = -1; dy <= 1; dy++) {
                                for (let dx = -1; dx <= 1; dx++) {
                                    if (dx === 0 && dy === 0) continue;
                                    const nx = (cx + dx + this.width) % this.width;
                                    const ny = (cy + dy + this.height) % this.height;
                                    const nidx = ny * this.width + nx;
                                    if (this.grid[nidx] === 1 && !visited[nidx]) {
                                        visited[nidx] = 1;
                                        queue.push([nx, ny]);
                                    }
                                }
                            }
                        }
                    }
                }
            }
            
            // Calculate entropy (measure of chaos)
            let entropy = 0;
            const blockSize = 4;
            for (let y = 0; y < this.height; y += blockSize) {
                for (let x = 0; x < this.width; x += blockSize) {
                    let sum = 0;
                    for (let dy = 0; dy < blockSize && y + dy < this.height; dy++) {
                        for (let dx = 0; dx < blockSize && x + dx < this.width; dx++) {
                            sum += this.grid[(y + dy) * this.width + (x + dx)];
                        }
                    }
                    const density = sum / (blockSize * blockSize);
                    if (density > 0 && density < 1) {
                        entropy -= density * Math.log2(density) + (1 - density) * Math.log2(1 - density);
                    }
                }
            }
            
            // Detect silence (very low activity)
            const activity = population / (this.width * this.height);
            if (activity < 0.02) {
                this.silenceFrames++;
            } else {
                this.silenceFrames = 0;
            }
            
            // Detect spectre (interesting patterns)
            const spectre = this.detectSpectre();
            
            return {
                population,
                clusters,
                entropy: entropy / 100, // Normalize
                silence: this.silenceFrames,
                activity,
                spectre,
                generation: this.generation
            };
        }
        
        detectSpectre() {
            // Look for interesting patterns in recent history
            const patterns = [];
            
            // 1. Check for oscillators (2-cycle)
            if (this.history.length >= 2) {
                const prev = this.history[this.history.length - 2];
                let diff = 0;
                for (let i = 0; i < this.grid.length; i++) {
                    if (this.grid[i] !== prev[i]) diff++;
                }
                const changeRate = diff / this.grid.length;
                if (changeRate < 0.05) {
                    patterns.push({ type: 'oscillator', intensity: 1 - changeRate * 20 });
                }
            }
            
            // 2. Check for gliders (moving patterns)
            if (this.history.length >= 5) {
                // Cross-correlation between frames
                let movement = 0;
                for (let i = 1; i < this.history.length; i++) {
                    const prev = this.history[i-1];
                    const curr = this.history[i];
                    let correlation = 0;
                    for (let y = 0; y < this.height; y++) {
                        for (let x = 0; x < this.width; x++) {
                            if (prev[y * this.width + x] === curr[y * this.width + x]) {
                                correlation++;
                            }
                        }
                    }
                    movement += correlation / this.grid.length;
                }
                movement /= (this.history.length - 1);
                
                if (movement > 0.85 && movement < 0.95) {
                    patterns.push({ type: 'glider', intensity: movement });
                }
            }
            
            // 3. Check for symmetry
            let symmetry = 0;
            for (let y = 0; y < this.height; y++) {
                for (let x = 0; x < this.width / 2; x++) {
                    const left = this.grid[y * this.width + x];
                    const right = this.grid[y * this.width + (this.width - 1 - x)];
                    if (left === right) symmetry++;
                }
            }
            const symmetryScore = symmetry / (this.height * (this.width / 2));
            if (symmetryScore > 0.7) {
                patterns.push({ type: 'symmetric', intensity: symmetryScore });
            }
            
            // 4. Check for fractals (self-similarity)
            if (this.generation % 10 === 0) {
                // Simple fractal detection: compare with scaled version
                let selfSimilar = 0;
                const scale = 2;
                for (let y = 0; y < this.height / scale; y++) {
                    for (let x = 0; x < this.width / scale; x++) {
                        const sum1 = this.grid[y * this.width + x];
                        let sum2 = 0;
                        for (let dy = 0; dy < scale; dy++) {
                            for (let dx = 0; dx < scale; dx++) {
                                sum2 += this.grid[(y * scale + dy) * this.width + (x * scale + dx)];
                            }
                        }
                        if ((sum1 === 1 && sum2 > 0) || (sum1 === 0 && sum2 === 0)) {
                            selfSimilar++;
                        }
                    }
                }
                const fractalScore = selfSimilar / ((this.height / scale) * (this.width / scale));
                if (fractalScore > 0.8) {
                    patterns.push({ type: 'fractal', intensity: fractalScore });
                }
            }
            
            // 5. Emergence from silence (the "Brocken Spectre" moment)
            if (this.silenceFrames > 15 && this.activity > 0.1) {
                patterns.push({ 
                    type: 'emergence', 
                    intensity: Math.min(1, this.activity * 2) 
                });
            }
            
            // Find the strongest pattern
            if (patterns.length > 0) {
                patterns.sort((a, b) => b.intensity - a.intensity);
                const strongest = patterns[0];
                
                // Track in history
                this.spectreHistory.push({
                    type: strongest.type,
                    intensity: strongest.intensity,
                    generation: this.generation
                });
                if (this.spectreHistory.length > 50) this.spectreHistory.shift();
                
                return strongest;
            }
            
            return { type: 'none', intensity: 0 };
        }
        
        randomizeFirstRow() {
            // Random initial conditions with better distribution
            for (let x = 0; x < this.width; x++) {
                this.grid[x] = Math.random() > 0.5 ? 1 : 0;
            }
            // Clear rest
            for (let i = this.width; i < this.grid.length; i++) {
                this.grid[i] = 0;
            }
            this.history = [];
            this.spectreHistory = [];
            this.patternMemory.clear();
        }
        
        reset() {
            this.generation = 0;
            this.silenceFrames = 0;
            this.randomizeFirstRow();
        }
    }
    
    // ========== WEBGL RENDERER ==========
    class WebGLRenderer {
        constructor(canvas, width, height) {
            this.canvas = canvas;
            this.width = width;
            this.height = height;
            this.gl = null;
            this.program = null;
            this.texture = null;
            this.debug = DEBUG;
            
            this.initWebGL();
        }
        
        initWebGL() {
            const canvas = this.canvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            
            const gl = canvas.getContext('webgl2') || 
                       canvas.getContext('webgl') || 
                       canvas.getContext('experimental-webgl');
            
            if (!gl) {
                this.debug.error('No WebGL context available');
                this.showFallbackMessage();
                return false;
            }
            
            this.gl = gl;
            this.debug.log('WebGL initialized: ' + gl.getParameter(gl.VERSION));
            this.debug.log('Renderer: ' + gl.getParameter(gl.RENDERER));
            
            gl.viewport(0, 0, canvas.width, canvas.height);
            gl.clearColor(0.0, 0.0, 0.0, 1.0);
            
            return this.initShaders();
        }
        
        initShaders() {
            const gl = this.gl;
            
            const vsSource = `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;
                
                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
            
            const fsSource = `
                precision highp float;
                
                varying vec2 vTexCoord;
                uniform sampler2D uTexture;
                uniform float uTime;
                uniform float uLoneliness;
                uniform float uEntropy;
                uniform float uSpectreIntensity;
                uniform int uSpectreType;
                uniform int uRuleClass;
                uniform vec2 uResolution;
                
                void main() {
                    vec4 cell = texture2D(uTexture, vTexCoord);
                    float isAlive = cell.r;
                    
                    // Grid dimensions
                    float gridWidth = 128.0;
                    float gridHeight = 72.0;
                    
                    // Calculate grid position
                    vec2 gridPos = fract(vTexCoord * vec2(gridWidth, gridHeight));
                    float gridLineThickness = 0.015;
                    float isGridLine = step(gridLineThickness, gridPos.x) * step(gridLineThickness, gridPos.y);
                    isGridLine = 1.0 - isGridLine;
                    
                    // Base colors by rule class
                    vec3 liveColor;
                    vec3 deadColor;
                    vec3 gridColor = vec3(0.2, 0.1, 0.15);
                    
                    if (uRuleClass == 1) { // Uniform
                        liveColor = vec3(1.0, 0.3, 0.3);
                        deadColor = vec3(0.1, 0.0, 0.0);
                    } else if (uRuleClass == 2) { // Periodic
                        liveColor = vec3(1.0, 0.7, 0.2);
                        deadColor = vec3(0.1, 0.05, 0.0);
                    } else if (uRuleClass == 3) { // Chaotic
                        liveColor = vec3(1.0, 0.4, 0.8);
                        deadColor = vec3(0.1, 0.0, 0.1);
                    } else { // Complex
                        liveColor = vec3(0.4, 0.8, 1.0);
                        deadColor = vec3(0.0, 0.1, 0.2);
                    }
                    
                    // Spectre colors by type
                    vec3 spectreColor;
                    if (uSpectreType == 1) spectreColor = vec3(1.0, 0.9, 0.6); // Oscillator
                    else if (uSpectreType == 2) spectreColor = vec3(0.6, 1.0, 0.6); // Glider
                    else if (uSpectreType == 3) spectreColor = vec3(0.8, 0.6, 1.0); // Symmetric
                    else if (uSpectreType == 4) spectreColor = vec3(1.0, 0.5, 0.8); // Fractal
                    else if (uSpectreType == 5) spectreColor = vec3(0.8, 1.0, 0.9); // Emergence
                    else spectreColor = vec3(0.9, 0.9, 1.0);
                    
                    // Spectre glow effect
                    float spectreGlow = uSpectreIntensity;
                    if (uSpectreIntensity > 0.0) {
                        vec2 center = vec2(0.5, 0.5);
                        float distToCenter = distance(vTexCoord, center);
                        float pulse = 0.5 + 0.5 * sin(uTime * 5.0 - distToCenter * 10.0);
                        spectreGlow *= pulse * (1.0 - distToCenter * 0.5);
                    }
                    
                    // Calculate final color
                    vec3 color;
                    
                    if (isGridLine > 0.5) {
                        color = gridColor;
                    } else {
                        if (isAlive > 0.0) {
                            // Live cell with rule class tint
                            float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + vTexCoord.x * 50.0);
                            color = liveColor * pulse;
                            
                            // Add spectre glow
                            if (spectreGlow > 0.0) {
                                color = mix(color, spectreColor, spectreGlow * 0.7);
                            }
                        } else {
                            // Dead cell influenced by entropy and loneliness
                            float intensity = 0.15 + uLoneliness * 0.3 + uEntropy * 0.2;
                            float flicker = 0.1 * sin(uTime * 2.0 + vTexCoord.y * 30.0);
                            color = deadColor * (intensity + flicker);
                            
                            // Faint spectre influence
                            if (spectreGlow > 0.0) {
                                color += spectreColor * spectreGlow * 0.1;
                            }
                        }
                    }
                    
                    // Vignette based on silence
                    vec2 center = vec2(0.5, 0.5);
                    float distFromCenter = distance(vTexCoord, center);
                    float vignette = 1.0 - uLoneliness * 0.4 * distFromCenter;
                    color *= vignette;
                    
                    gl_FragColor = vec4(color, 1.0);
                }
            `;
            
            // Compile shaders
            const vs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vs, vsSource);
            gl.compileShader(vs);
            
            if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
                this.debug.error('Vertex shader failed: ' + gl.getShaderInfoLog(vs));
                return false;
            }
            
            const fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, fsSource);
            gl.compileShader(fs);
            
            if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                this.debug.error('Fragment shader failed: ' + gl.getShaderInfoLog(fs));
                return false;
            }
            
            // Link program
            this.program = gl.createProgram();
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);
            
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                this.debug.error('Program linking failed');
                return false;
            }
            
            gl.useProgram(this.program);
            
            // Set up geometry
            const vertices = new Float32Array([
                -1, -1, 1, -1, -1, 1,
                -1, 1, 1, -1, 1, 1
            ]);
            
            const vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
            
            const aPosition = gl.getAttribLocation(this.program, 'aPosition');
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
            
            // Create texture
            this.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            
            // Get uniform locations
            this.uTexture = gl.getUniformLocation(this.program, 'uTexture');
            this.uTime = gl.getUniformLocation(this.program, 'uTime');
            this.uLoneliness = gl.getUniformLocation(this.program, 'uLoneliness');
            this.uEntropy = gl.getUniformLocation(this.program, 'uEntropy');
            this.uSpectreIntensity = gl.getUniformLocation(this.program, 'uSpectreIntensity');
            this.uSpectreType = gl.getUniformLocation(this.program, 'uSpectreType');
            this.uRuleClass = gl.getUniformLocation(this.program, 'uRuleClass');
            this.uResolution = gl.getUniformLocation(this.program, 'uResolution');
            
            gl.uniform1i(this.uTexture, 0);
            gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
            
            this.debug.log('Shaders initialized');
            return true;
        }
        
        updateTexture(data, width, height) {
            const gl = this.gl;
            if (!gl || !this.texture) return;
            
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            
            const rgbaData = new Uint8Array(width * height * 4);
            for (let i = 0; i < width * height; i++) {
                const val = data[i] * 255;
                rgbaData[i*4] = val;
                rgbaData[i*4+1] = val;
                rgbaData[i*4+2] = val;
                rgbaData[i*4+3] = 255;
            }
            
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA,
                width, height, 0,
                gl.RGBA, gl.UNSIGNED_BYTE,
                rgbaData
            );
        }
        
        render(time, metrics) {
            const gl = this.gl;
            if (!gl || !this.program) return;
            
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.useProgram(this.program);
            
            // Map spectre type to int for shader
            let spectreType = 0;
            if (metrics.spectre && metrics.spectre.type !== 'none') {
                const typeMap = {
                    'oscillator': 1,
                    'glider': 2,
                    'symmetric': 3,
                    'fractal': 4,
                    'emergence': 5
                };
                spectreType = typeMap[metrics.spectre.type] || 0;
            }
            
            gl.uniform1f(this.uTime, time);
            gl.uniform1f(this.uLoneliness, 1 - (metrics.population / (this.width * this.height)));
            gl.uniform1f(this.uEntropy, metrics.entropy || 0);
            gl.uniform1f(this.uSpectreIntensity, metrics.spectre ? metrics.spectre.intensity : 0);
            gl.uniform1i(this.uSpectreType, spectreType);
            gl.uniform1i(this.uRuleClass, this.ruleClass || 3);
            
            gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
        
        setRuleClass(ruleClass) {
            this.ruleClass = ruleClass;
        }
        
        resize() {
            const canvas = this.canvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, canvas.width, canvas.height);
            if (this.uResolution) {
                this.gl.uniform2f(this.uResolution, canvas.width, canvas.height);
            }
        }
        
        showFallbackMessage() {
            const div = document.createElement('div');
            div.style.cssText = `
                position: absolute;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(0,0,0,0.95);
                color: #f64;
                padding: 20px;
                border-left: 3px solid #f64;
                font-family: monospace;
                text-align: center;
                z-index: 2000;
            `;
            div.innerHTML = `
                <h3>⚠️ WebGL Not Available</h3>
                <p style="color:#ccc; margin:10px 0;">Your browser doesn't support WebGL.</p>
                <p style="color:#f96; font-size:0.8rem;">Try Chrome or Firefox</p>
            `;
            document.body.appendChild(div);
        }
    }
    
    // ========== UI HELPERS ==========
    function showNotification(message, type = 'spectre') {
        const notif = document.getElementById('spectre-notification');
        if (!notif) return;
        
        const typeColors = {
            'oscillator': '#ffaa66',
            'glider': '#66ffaa',
            'symmetric': '#aa66ff',
            'fractal': '#ff66aa',
            'emergence': '#66aaff',
            'spectre': '#aaf'
        };
        
        notif.style.borderLeftColor = typeColors[type] || '#f64';
        notif.innerHTML = `✨ ${message}`;
        notif.classList.add('visible');
        
        clearTimeout(window.notifTimeout);
        window.notifTimeout = setTimeout(() => {
            notif.classList.remove('visible');
        }, 2000);
    }
    
    // ========== MAIN ==========
    function init() {
        DEBUG.init();
        DEBUG.log('Brocken Noise CA v2 initializing...');
        
        const GRID_WIDTH = 128;
        const GRID_HEIGHT = 72;
        
        const ca = new CellularAutomata(GRID_WIDTH, GRID_HEIGHT);
        DEBUG.log(`CA created: ${GRID_WIDTH}x${GRID_HEIGHT}, initial rule: ${ca.rule}`);
        
        const canvas = document.getElementById('webgl-canvas');
        const renderer = new WebGLRenderer(canvas, GRID_WIDTH, GRID_HEIGHT);
        
        if (!renderer.gl) {
            DEBUG.error('Failed to initialize WebGL');
            return;
        }
        
        renderer.updateTexture(ca.grid, GRID_WIDTH, GRID_HEIGHT);
        
        // Animation variables
        let lastUpdate = 0;
        let targetFPS = 5;
        let time = 0;
        let lastSpectreTime = 0;
        
        // UI Elements
        const ruleDisplay = document.getElementById('rule-display');
        const ruleDisplayBottom = document.getElementById('rule-display-bottom');
        const ruleInput = document.getElementById('rule-input');
        const populationDisplay = document.getElementById('population');
        const speedDisplay = document.getElementById('speed-display');
        const speedDisplayBottom = document.getElementById('speed-display-bottom');
        const speedSlider = document.getElementById('speed');
        const randomBtn = document.getElementById('random-rule');
        const resetBtn = document.getElementById('reset');
        const applyRule = document.getElementById('apply-rule');
        const classDisplay = document.getElementById('rule-class');
        
        // Initialize UI
        ruleDisplay.textContent = ca.rule;
        ruleDisplayBottom.textContent = ca.rule;
        ruleInput.value = ca.rule;
        if (classDisplay) {
            classDisplay.textContent = ca.getRuleClassName();
        }
        
        // Animation loop
        // Animation loop
        function animate(now) {
            requestAnimationFrame(animate);
    
            if (now - lastUpdate > 1000 / targetFPS) {
                const metrics = ca.step();
                renderer.updateTexture(ca.grid, GRID_WIDTH, GRID_HEIGHT);
        
                // Update UI
                populationDisplay.textContent = metrics.population;
                // Inside the if block, after metrics = ca.step()
                console.log('Population:', metrics.population, 'Generation:', ca.generation);
                DEBUG.log('Population: ' + metrics.population + ' Gen: ' + ca.generation);
        
                // Handle spectre notification
                if (metrics.spectre && metrics.spectre.type !== 'none' && 
                    metrics.spectre.intensity > 0.6 && now - lastSpectreTime > 3000) {
                    const typeNames = {
                        'oscillator': 'OSCILLATOR',
                        'glider': 'GLIDER',
                        'symmetric': 'SYMMETRY',
                        'fractal': 'FRACTAL',
                        'emergence': 'EMERGENCE'
                    };
                    showNotification(
                        `${typeNames[metrics.spectre.type] || 'SPECTRE'} · ${Math.round(metrics.spectre.intensity * 100)}%`,
                        metrics.spectre.type
                    );
                    lastSpectreTime = now;
                    
                    DEBUG.log(`✨ Spectre detected: ${metrics.spectre.type} (${Math.round(metrics.spectre.intensity * 100)}%)`);
                }
                
                // Update rule class display
                if (classDisplay) {
                    classDisplay.textContent = ca.getRuleClassName();
                }
                renderer.setRuleClass(ca.ruleClass);
                
                lastUpdate = now;
            }
            
            time += 0.01;
            renderer.render(time, ca.calculateMetrics());
        }
        
        // Event listeners
        randomBtn.addEventListener('click', () => {
            const newRule = ca.getRandomRule();
            ca.setRule(newRule);
            ruleDisplay.textContent = newRule;
            ruleDisplayBottom.textContent = newRule;
            ruleInput.value = newRule;
            DEBUG.log(`Random rule selected: ${newRule} (${ca.getRuleClassName()})`);
            showNotification(`RULE ${newRule} · ${ca.getRuleClassName()}`, 'spectre');
        });
        
        resetBtn.addEventListener('click', () => {
            ca.reset();
            renderer.updateTexture(ca.grid, GRID_WIDTH, GRID_HEIGHT);
            DEBUG.log('CA reset');
            showNotification('RESET · NEW SEED', 'spectre');
        });
        
        speedSlider.addEventListener('input', (e) => {
            targetFPS = parseInt(e.target.value);
            speedDisplay.textContent = targetFPS;
            speedDisplayBottom.textContent = targetFPS;
        });
        
        if (applyRule) {
            applyRule.addEventListener('click', () => {
                let newRule = parseInt(ruleInput.value);
                if (isNaN(newRule)) newRule = 110;
                newRule = Math.min(255, Math.max(0, newRule));
                ca.setRule(newRule);
                ruleDisplay.textContent = newRule;
                ruleDisplayBottom.textContent = newRule;
                ruleInput.value = newRule;
                DEBUG.log(`Rule manually set to ${newRule} (${ca.getRuleClassName()})`);
                showNotification(`RULE ${newRule} · ${ca.getRuleClassName()}`, 'spectre');
            });
        }
        
        if (ruleInput) {
            ruleInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    applyRule.click();
                }
            });
        }
        
        window.addEventListener('resize', () => {
            renderer.resize();
        });
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                DEBUG.log('Tab hidden, pausing');
            } else {
                DEBUG.log('Tab visible, resuming');
            }
        });
        
        DEBUG.log('Starting animation loop');
        animate(0);
        // Force a redraw every frame regardless of CA update
        function forceRender() {
            renderer.render(time, ca.calculateMetrics());
            requestAnimationFrame(forceRender);
        }
        forceRender();
    }
    
    // Start
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
