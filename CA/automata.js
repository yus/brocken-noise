// automata.js - Elementary CA with loneliness metrics
class CellularAutomata {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.grid = new Uint8Array(width * height);
        this.nextGrid = new Uint8Array(width * height);
        this.rule = 110; // Default Wolfram rule
        this.generation = 0;
        
        // Initialize with random seed in first row
        this.randomizeFirstRow();
    }
    
    // Wolfram-style rule application (1D CA but visualized as 2D progression)
    setRule(ruleNumber) {
        this.rule = Math.min(255, Math.max(0, ruleNumber));
        this.ruleBits = this.rule.toString(2).padStart(8, '0').split('').map(Number);
    }
    
    // Classic rule: new state = f(left, center, right)
    getNewState(left, center, right) {
        const index = 7 - ((left << 2) | (center << 1) | right);
        return this.ruleBits[index];
    }
    
    step() {
        // Copy current row states upward (scrolling effect)
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
    
    // Loneliness metric: percentage of dead cells with all neighbors dead
    calculateMetrics() {
        let lonely = 0;
        let total = 0;
        
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const idx = y * this.width + x;
                if (this.grid[idx] === 0) {
                    // Check all 8 neighbors
                    let allDead = true;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (dx === 0 && dy === 0) continue;
                            const nx = (x + dx + this.width) % this.width;
                            const ny = (y + dy + this.height) % this.height;
                            if (this.grid[ny * this.width + nx] === 1) {
                                allDead = false;
                                break;
                            }
                        }
                    }
                    if (allDead) lonely++;
                    total++;
                }
            }
        }
        
        return {
            population: this.grid.reduce((a, b) => a + b, 0),
            loneliness: lonely / total,
            generation: this.generation
        };
    }
    
    randomizeFirstRow() {
        // Random initial conditions
        for (let x = 0; x < this.width; x++) {
            this.grid[x] = Math.random() > 0.5 ? 1 : 0;
        }
        // Clear rest
        for (let i = this.width; i < this.grid.length; i++) {
            this.grid[i] = 0;
        }
    }
    
    reset() {
        this.generation = 0;
        this.randomizeFirstRow();
    }
}
