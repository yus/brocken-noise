// main.js - WebGL rendering with shader-based cell visualization
const scene = new THREE.Scene();
const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
camera.position.z = 1;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
document.getElementById('canvas-container').appendChild(renderer.domElement);

// DEBUG ROLLUP - Add this temporarily
console.log('🔍 DEBUG MODE ON');
console.log('Three.js version:', THREE.REVISION);

// Check WebGL context
const gl = renderer.getContext();
console.log('WebGL Context:', gl ? '✅' : '❌');
console.log('WebGL Renderer:', gl.getParameter(gl.RENDERER));
console.log('WebGL Vendor:', gl.getParameter(gl.VENDOR));

// Check CA initialization
console.log('CA Grid size:', ca.width, 'x', ca.height);
console.log('Initial grid sum:', ca.grid.reduce((a, b) => a + b, 0));

// Check texture
console.log('Data texture created:', material.uniforms.texture.value ? '✅' : '❌');
console.log('Texture dimensions:', textureWidth, 'x', textureHeight);

// Force an immediate update
updateTexture();
console.log('Texture data after update:', data.slice(0, 10)); // First 10 bytes

// Override animate to log frame count
let frameCount = 0;
const originalAnimate = animate;
animate = function(time) {
    frameCount++;
    if (frameCount % 60 === 0) console.log('Frames rendered:', frameCount);
    originalAnimate(time);
};

// CA instance
const ca = new CellularAutomata(128, 72); // 128x72 cells
let metrics = { population: 0, loneliness: 0 };

// Create a data texture for the CA state
const textureWidth = ca.width;
const textureHeight = ca.height;
const data = new Uint8Array(textureWidth * textureHeight * 4); // RGBA

// Plane geometry with shader material
const geometry = new THREE.PlaneGeometry(2, 2);
const material = new THREE.ShaderMaterial({
    uniforms: {
        time: { value: 0 },
        texture: { value: new THREE.DataTexture(data, textureWidth, textureHeight, THREE.RGBAFormat) },
        loneliness: { value: 0 }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform sampler2D texture;
        uniform float time;
        uniform float loneliness;
        varying vec2 vUv;
        
        void main() {
            vec4 cell = texture2D(texture, vUv);
            
            // Color based on cell state and loneliness
            if (cell.r > 0.5) {
                // Live cell - warm, glowy
                float glow = 0.8 + 0.2 * sin(time * 5.0 + vUv.x * 10.0);
                gl_FragColor = vec4(1.0, 0.6, 0.2, 1.0) * glow;
            } else {
                // Dead cell - cold, with loneliness influence
                float dark = 0.1 + loneliness * 0.3;
                float flicker = 0.05 * sin(time * 3.0 + vUv.y * 20.0);
                gl_FragColor = vec4(dark + flicker, 0.0, 0.1, 1.0);
            }
            
            // Grid lines
            vec2 grid = fract(vUv * vec2(128.0, 72.0));
            if (grid.x < 0.02 || grid.y < 0.02) {
                gl_FragColor = mix(gl_FragColor, vec4(0.3, 0.3, 0.5, 1.0), 0.3);
            }
        }
    `
});

const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

// Animation loop
let lastUpdate = 0;
const targetFPS = 5;
let frameCount = 0;

function animate(time) {
    requestAnimationFrame(animate);
    
    // Update CA at controlled speed
    if (time - lastUpdate > 1000 / targetFPS) {
        metrics = ca.step();
        updateTexture();
        lastUpdate = time;
        
        // Update UI
        document.getElementById('population').textContent = metrics.population;
        material.uniforms.loneliness.value = metrics.loneliness;
    }
    
    material.uniforms.time.value = time / 1000;
    renderer.render(scene, camera);
}

function updateTexture() {
    for (let y = 0; y < textureHeight; y++) {
        for (let x = 0; x < textureWidth; x++) {
            const idx = y * textureWidth + x;
            const cellState = ca.grid[idx];
            const texIdx = idx * 4;
            
            // RGBA
            data[texIdx] = cellState * 255;     // R
            data[texIdx + 1] = cellState * 128; // G
            data[texIdx + 2] = 0;                // B
            data[texIdx + 3] = 255;              // A
        }
    }
    material.uniforms.texture.value.needsUpdate = true;
}

// Controls
document.getElementById('random-rule').addEventListener('click', () => {
    const newRule = Math.floor(Math.random() * 256);
    ca.setRule(newRule);
    document.getElementById('rule-display').textContent = newRule;
});

document.getElementById('reset').addEventListener('click', () => {
    ca.reset();
});

document.getElementById('speed').addEventListener('input', (e) => {
    targetFPS = parseInt(e.target.value);
    document.getElementById('speed-display').textContent = targetFPS;
});

// Handle resize
window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start animation
animate(0);
