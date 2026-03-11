// ========== BROCKEN NOISE · PURE WEBGL CA ==========
// Self-contained, no libraries, built-in debugger

(function() {
    'use strict';
    
    // ========== DEBUG SYSTEM ==========
    const DEBUG = {
        enabled: false,
        panel: document.getElementById('debug-panel'),
        logs: [],
        tapCount: 0,
        lastTap: 0,
        
        init: function() {
            // Secret: tap 5 times in 2 seconds to enable debug
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
                    this.panel.style.display = this.enabled ? 'block' : 'none';
                    this.log('🔍 Debug mode ' + (this.enabled ? 'ENABLED' : 'DISABLED'));
                    this.tapCount = 0;
                }
            });
            
            // Also allow ?debug=true in URL
            if (window.location.search.includes('debug=true')) {
                this.enabled = true;
                this.panel.style.display = 'block';
            }
        },
        
        log: function(msg) {
            console.log('[CA]', msg);
            if (!this.enabled) return;
            
            this.logs.unshift('> ' + new Date().toLocaleTimeString() + ': ' + msg);
            if (this.logs.length > 10) this.logs.pop();
            this.panel.innerHTML = '<h4>🔍 DEBUG</h4>' + this.logs.join('<br>');
        },
        
        error: function(msg) {
            console.error('[CA]', msg);
            if (!this.enabled) return;
            this.log('❌ ERROR: ' + msg);
        }
    };
    
    // ========== CELLULAR AUTOMATA ==========
    class CellularAutomata {
        constructor(width, height) {
            this.width = width;
            this.height = height;
            this.grid = new Uint8Array(width * height);
            this.nextGrid = new Uint8Array(width * height);
            this.rule = 110;
            this.generation = 0;
            this.updateRuleBits();
            this.randomizeFirstRow();
        }
        
        updateRuleBits() {
            this.ruleBits = this.rule.toString(2).padStart(8, '0').split('').map(Number);
        }
        
        setRule(rule) {
            this.rule = Math.min(255, Math.max(0, rule));
            this.updateRuleBits();
        }
        
        getNewState(left, center, right) {
            const index = 7 - ((left << 2) | (center << 1) | right);
            return this.ruleBits[index];
        }
        
        step() {
            // Shift rows down (new at top)
            for (let y = this.height - 1; y > 0; y--) {
                const currentRow = y * this.width;
                const prevRow = (y - 1) * this.width;
                for (let x = 0; x < this.width; x++) {
                    this.nextGrid[currentRow + x] = this.grid[prevRow + x];
                }
            }
            
            // Calculate new first row
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
            for (let i = 0; i < this.grid.length; i++) {
                population += this.grid[i];
            }
            return { population, generation: this.generation };
        }
        
        randomizeFirstRow() {
            // Clear all
            for (let i = 0; i < this.grid.length; i++) {
                this.grid[i] = 0;
            }
            // Random first row
            for (let x = 0; x < this.width; x++) {
                this.grid[x] = Math.random() > 0.5 ? 1 : 0;
            }
        }
        
        reset() {
            this.generation = 0;
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
            // Try to get WebGL context
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
            this.debug.log('WebGL initialized: ' + 
                (gl.getParameter(gl.VERSION)));
            this.debug.log('Renderer: ' + gl.getParameter(gl.RENDERER));
            
            // Set viewport
            gl.viewport(0, 0, canvas.width, canvas.height);
            
            // Compile shaders
            return this.initShaders();
        }
        
        initShaders() {
            const gl = this.gl;
    
            // Vertex shader - FIXED: Proper texture coordinate mapping
            const vsSource = `
                attribute vec2 aPosition;
                varying vec2 vTexCoord;
        
                void main() {
                    gl_Position = vec4(aPosition, 0.0, 1.0);
                    // Map from [-1,1] to [0,1] for texture coordinates
                    vTexCoord = aPosition * 0.5 + 0.5;
                }
            `;
    
            // Fragment shader - COMPLETELY REWRITTEN for clarity
            const fsSource = `
                precision highp float;
        
                varying vec2 vTexCoord;
                uniform sampler2D uTexture;
                uniform float uTime;
                uniform float uLoneliness;
                uniform vec2 uResolution;
        
                void main() {
                    // Get the cell value from texture
                    vec4 cell = texture2D(uTexture, vTexCoord);
            
                    // Define grid size (must match CA dimensions)
                    float gridWidth = 128.0;
                    float gridHeight = 72.0;
            
                    // Calculate grid position for cell boundaries
                    vec2 gridPos = fract(vTexCoord * vec2(gridWidth, gridHeight));
            
                    // Check if we're drawing a grid line
                    float gridLineThickness = 0.02;
                    float isGridLine = 0.0;
            
                    if (gridPos.x < gridLineThickness || gridPos.y < gridLineThickness) {
                        isGridLine = 1.0;
                    }
            
                    // Base colors
                    vec3 liveColor = vec3(1.0, 0.5, 0.2);  // Warm orange
                    vec3 deadColor = vec3(0.1, 0.0, 0.1);  // Deep purple/black
                    vec3 gridColor = vec3(0.3, 0.1, 0.2);   // Dim magenta
            
                    // Check if cell is alive (R channel > 0.5)
                    float isAlive = step(0.5, cell.r);
            
                    // Calculate final color
                    vec3 color;
            
                    if (isGridLine > 0.5) {
                        // Grid lines - subtle
                        color = gridColor;
                    } else {
                        if (isAlive > 0.5) {
                            // Live cell - add pulse effect
                            float pulse = 0.8 + 0.2 * sin(uTime * 3.0 + vTexCoord.x * 50.0);
                            color = liveColor * pulse;
                        } else {
                            // Dead cell - influenced by loneliness
                            float intensity = 0.2 + uLoneliness * 0.5;
                            float flicker = 0.1 * sin(uTime * 2.0 + vTexCoord.y * 30.0);
                            color = deadColor * (intensity + flicker);
                        }
                    }
            
                    gl_FragColor = vec4(color, 1.0);
                }
            `;
    
            // Compile vertex shader
            const vs = gl.createShader(gl.VERTEX_SHADER);
            gl.shaderSource(vs, vsSource);
            gl.compileShader(vs);
            
            if (!gl.getShaderParameter(vs, gl.COMPILE_STATUS)) {
                const info = gl.getShaderInfoLog(vs);
                this.debug.error('Vertex shader compilation failed: ' + info);
                console.error('Vertex shader error:', info);
                return false;
            }
    
            // Compile fragment shader
            const fs = gl.createShader(gl.FRAGMENT_SHADER);
            gl.shaderSource(fs, fsSource);
            gl.compileShader(fs);
    
            if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                const info = gl.getShaderInfoLog(fs);
                this.debug.error('Fragment shader compilation failed: ' + info);
                console.error('Fragment shader error:', info);
        
                // Try with mediump precision as fallback
                this.debug.log('Trying fallback shader with mediump...');
        
                const fsSourceFallback = `
                    precision mediump float;
            
                    varying vec2 vTexCoord;
                    uniform sampler2D uTexture;
                    uniform float uTime;
                    uniform float uLoneliness;
            
                    void main() {
                        vec4 cell = texture2D(uTexture, vTexCoord);
                
                        vec2 gridPos = fract(vTexCoord * vec2(128.0, 72.0));
                        float isGridLine = 0.0;
                        if (gridPos.x < 0.02 || gridPos.y < 0.02) {
                            isGridLine = 1.0;
                        }
                
                        if (isGridLine > 0.5) {
                            gl_FragColor = vec4(0.3, 0.1, 0.2, 1.0);
                        } else if (cell.r > 0.5) {
                            gl_FragColor = vec4(1.0, 0.5, 0.2, 1.0);
                        } else {
                            float val = 0.1 + uLoneliness * 0.3;
                            gl_FragColor = vec4(val, 0.0, 0.1, 1.0);
                        }
                    }
                `;
        
                // Try fallback
                gl.shaderSource(fs, fsSourceFallback);
                gl.compileShader(fs);
        
                if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS)) {
                    this.debug.error('Fallback shader also failed');
                    return false;
                }
            }
    
            // Link program
            this.program = gl.createProgram();
            gl.attachShader(this.program, vs);
            gl.attachShader(this.program, fs);
            gl.linkProgram(this.program);
    
            if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
                this.debug.error('Shader program linking failed: ' + 
                    gl.getProgramInfoLog(this.program));
                return false;
            }
    
            gl.useProgram(this.program);
    
            // Set up geometry (full-screen quad)
            const vertices = new Float32Array([
                -1, -1,  // bottom left
                 1, -1,  // bottom right
                -1,  1,  // top left
                -1,  1,  // top left
                 1, -1,  // bottom right
                 1,  1   // top right
            ]);
    
            const vertexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    
            const aPosition = gl.getAttribLocation(this.program, 'aPosition');
            gl.enableVertexAttribArray(aPosition);
            gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
    
            // Create texture for CA data
            this.texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
            // Initialize texture with empty data
            const initialData = new Uint8Array(this.width * this.height * 4);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA,
                this.width, this.height, 0,
                gl.RGBA, gl.UNSIGNED_BYTE,
                initialData
            );
    
            // Get uniform locations
            this.uTexture = gl.getUniformLocation(this.program, 'uTexture');
            this.uTime = gl.getUniformLocation(this.program, 'uTime');
            this.uLoneliness = gl.getUniformLocation(this.program, 'uLoneliness');
            this.uResolution = gl.getUniformLocation(this.program, 'uResolution');
    
            // Set texture unit
            gl.uniform1i(this.uTexture, 0);
    
            // Set resolution
            gl.uniform2f(this.uResolution, this.canvas.width, this.canvas.height);
    
            this.debug.log('Shaders compiled and linked successfully');
    
            // Test with a simple clear color to verify rendering
            gl.clearColor(0.2, 0.0, 0.1, 1.0);
            gl.clear(gl.COLOR_BUFFER_BIT);
    
            return true;
        }
        
        updateTexture(data, width, height) {
            const gl = this.gl;
            if (!gl || !this.texture) return;
            
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            
            // Convert Uint8Array (0/1) to RGBA Uint8Array
            const rgbaData = new Uint8Array(width * height * 4);
            for (let i = 0; i < width * height; i++) {
                const value = data[i] * 255;
                rgbaData[i*4] = value;
                rgbaData[i*4+1] = value;
                rgbaData[i*4+2] = value;
                rgbaData[i*4+3] = 255;
            }
            
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA, 
                width, height, 0, 
                gl.RGBA, gl.UNSIGNED_BYTE, 
                rgbaData
            );
        }
        
        render(time, loneliness) {
            const gl = this.gl;
            if (!gl || !this.program) return;
            
            gl.clearColor(0, 0, 0, 1);
            gl.clear(gl.COLOR_BUFFER_BIT);
            
            gl.useProgram(this.program);
            
            // Set uniforms
            gl.uniform1f(this.uTime, time);
            gl.uniform1f(this.uLoneliness, loneliness);
            gl.uniform1i(this.uTexture, 0);
            
            // Draw
            gl.drawArrays(gl.TRIANGLES, 0, 6);
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
        
        resize() {
            const canvas = this.canvas;
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            this.gl.viewport(0, 0, canvas.width, canvas.height);
            if (this.uResolution) {
                this.gl.uniform2f(this.uResolution, canvas.width, canvas.height);
            }
        }
    }
    
    // ========== MAIN APPLICATION ==========
    function init() {
        DEBUG.init();
        DEBUG.log('Brocken Noise CA initializing...');
        
        // Configuration
        const GRID_WIDTH = 128;
        const GRID_HEIGHT = 72;
        
        // Initialize CA
        const ca = new CellularAutomata(GRID_WIDTH, GRID_HEIGHT);
        DEBUG.log(`CA created: ${GRID_WIDTH}x${GRID_HEIGHT}`);
        
        // Get canvas and create renderer
        const canvas = document.getElementById('webgl-canvas');
        const renderer = new WebGLRenderer(canvas, GRID_WIDTH, GRID_HEIGHT);
        
        if (!renderer.gl) {
            DEBUG.error('Failed to initialize WebGL');
            return;
        }
        
        // Update texture with initial state
        renderer.updateTexture(ca.grid, GRID_WIDTH, GRID_HEIGHT);
        
        // Animation variables
        let lastUpdate = 0;
        let targetFPS = 5;
        let time = 0;
        let loneliness = 0;
        
        // UI Elements
        const ruleDisplay = document.getElementById('rule-display');
        const ruleDisplayBottom = document.getElementById('rule-display-bottom');
        const populationDisplay = document.getElementById('population');
        const speedDisplay = document.getElementById('speed-display');
        const speedDisplayBottom = document.getElementById('speed-display-bottom');
        const speedSlider = document.getElementById('speed');
        const randomBtn = document.getElementById('random-rule');
        const resetBtn = document.getElementById('reset');
        
        // Update displays
        ruleDisplay.textContent = ca.rule;
        ruleDisplayBottom.textContent = ca.rule;
        
        // Animation loop
        function animate(now) {
            requestAnimationFrame(animate);
            
            // Update CA at controlled FPS
            if (now - lastUpdate > 1000 / targetFPS) {
                const metrics = ca.step();
                renderer.updateTexture(ca.grid, GRID_WIDTH, GRID_HEIGHT);
                
                // Update UI
                populationDisplay.textContent = metrics.population;
                
                // Calculate loneliness (simple version: dead cells / total)
                const totalCells = GRID_WIDTH * GRID_HEIGHT;
                loneliness = (totalCells - metrics.population) / totalCells;
                
                lastUpdate = now;
            }
            
            // Render
            time += 0.01;
            renderer.render(time, loneliness);
        }
        
        // Event listeners
        randomBtn.addEventListener('click', () => {
            const newRule = Math.floor(Math.random() * 256);
            ca.setRule(newRule);
            ruleDisplay.textContent = newRule;
            ruleDisplayBottom.textContent = newRule;
            DEBUG.log(`Rule changed to ${newRule}`);
        });
        
        resetBtn.addEventListener('click', () => {
            ca.reset();
            renderer.updateTexture(ca.grid, GRID_WIDTH, GRID_HEIGHT);
            DEBUG.log('CA reset');
        });
        
        speedSlider.addEventListener('input', (e) => {
            targetFPS = parseInt(e.target.value);
            speedDisplay.textContent = targetFPS;
            speedDisplayBottom.textContent = targetFPS;
        });
        
        window.addEventListener('resize', () => {
            renderer.resize();
        });
        
        // Handle visibility change (pause when tab not active)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                DEBUG.log('Tab hidden, pausing');
            } else {
                DEBUG.log('Tab visible, resuming');
            }
        });
        
        // Start animation
        DEBUG.log('Starting animation loop');
        animate(0);
    }
    
    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
