import { Player } from '../objects/Player';
import { CombatSystem } from '../systems/CombatSystem';
import { StageManager } from '../systems/StageManager';
import Phaser from 'phaser';

export class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    init(data) {
        this.level = data.level || 1;
    }

    create() {
        try {
            console.log('GameScene: create started');
            // Create Bullet Texture
            const graphics = this.make.graphics({ x: 0, y: 0, add: false });
            graphics.fillStyle(0xffffff);
            graphics.fillRect(0, 0, 8, 8);
            graphics.generateTexture('bullet', 8, 8);

            this.scene.launch('UIScene', { gameScene: this });
            this.add.text(16, 16, `Stage ${this.level}`, { fontSize: '32px', fill: '#fff' });

            this.physics.world.setBounds(0, 0, 1280, 720);

            this.stageManager = new StageManager(this);
            this.combatSystem = new CombatSystem(this);
            console.log('GameScene: Systems created');

            this.registry.set('killed', 0);
            this.events.on('enemy-killed', () => {
                const k = this.registry.get('killed') || 0;
                this.registry.set('killed', k + 1);
            });

            this.events.on('player-dead', () => {
                console.log('GameScene: Player Died');
                this.scene.stop('UIScene');
                this.scene.start('DefeatScene');
            });

            // Obstacles Layer
            this.obstacles = this.physics.add.staticGroup();
            this.createGridObstacles();

            this.player = new Player(this, 100, 400);
            console.log('GameScene: Player created');

            // Setup Inputs
            const cursors = this.input.keyboard.createCursorKeys();
            const wasd = this.input.keyboard.addKeys({
                up: Phaser.Input.Keyboard.KeyCodes.W,
                down: Phaser.Input.Keyboard.KeyCodes.S,
                left: Phaser.Input.Keyboard.KeyCodes.A,
                right: Phaser.Input.Keyboard.KeyCodes.D
            });

            this.player.setupKeys(wasd);

            // Bullet Collisions
            this.playerBullets = this.physics.add.group();
            this.enemyBullets = this.physics.add.group();

            this.stageManager.startStage(this.level);
            console.log('GameScene: Stage started');

            this.physics.world.on('worldbounds', (body) => {
                if (body.gameObject && (this.playerBullets.contains(body.gameObject) || this.enemyBullets.contains(body.gameObject))) {
                    body.gameObject.destroy();
                }
            });

            // Entity Collisions
            this.physics.add.collider(this.player, this.obstacles);
            this.physics.add.collider(this.stageManager.enemies, this.obstacles);
            this.physics.add.collider(this.stageManager.enemies, this.stageManager.enemies);

            this.physics.add.collider(this.player, this.stageManager.enemies);
        } catch (err) {
            console.error('GameScene: Create failed', err);
        }
    }

    createGridObstacles() {
        const GRID_SIZE = 64;
        const COLS = Math.floor(1280 / GRID_SIZE); // 20
        const ROWS = Math.floor(720 / GRID_SIZE); // 11
        const SAFETY_COLS = 3; // Safe zone for player spawn

        let validMap = false;
        let attempts = 0;
        let grid = [];

        while (!validMap && attempts < 10) {
            attempts++;
            grid = [];
            let obstacleCount = 0;
            const targetObstacles = (COLS * ROWS) * 0.20; // 20% density target

            // 1. Generate Random Grid
            for (let y = 0; y < ROWS; y++) {
                const row = [];
                for (let x = 0; x < COLS; x++) {
                    // Safety Check
                    if (x < SAFETY_COLS) {
                        row.push(0); // Empty
                        continue;
                    }

                    // Random placement
                    const isObstacle = Math.random() < 0.20;
                    if (isObstacle) {
                        row.push(1);
                        obstacleCount++;
                    } else {
                        row.push(0);
                    }
                }
                grid.push(row);
            }

            // 2. Validate Connectivity (Flood Fill)
            if (this.validateMap(grid, COLS, ROWS)) {
                validMap = true;
                console.log(`Map Validated after ${attempts} attempts. Obstacles: ${obstacleCount}`);
            }
        }

        if (!validMap) {
            console.warn('Failed to generate valid map after 10 attempts. Using fallback (clearing heavy obstacles).');
            // Heavy fallback: Clear center row to ensure passage
            const midY = Math.floor(ROWS / 2);
            for (let x = 0; x < COLS; x++) grid[midY][x] = 0;
        }

        // 3. Instantiate
        let totalArea = 0;
        const totalMapArea = 1280 * 720;

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (grid[y][x] === 1) {
                    const posX = x * GRID_SIZE + GRID_SIZE / 2;
                    const posY = y * GRID_SIZE + GRID_SIZE / 2;

                    this.createCompositeBlock(posX, posY, GRID_SIZE);
                    // Area calc is same (full block filled)
                    totalArea += GRID_SIZE * GRID_SIZE;
                }
            }
        }

        const percentage = ((totalArea / totalMapArea) * 100).toFixed(2);
        this.time.delayedCall(100, () => {
            this.events.emit('map-stats', percentage);
        });
    }

    createCompositeBlock(centerX, centerY, size) {
        // Break block into 4x4 sub-tiles (16px each for 64px block)
        const subSize = 16;
        const tilesPerSide = size / subSize; // 4

        // Start top-left relative to center
        const startX = centerX - (size / 2) + (subSize / 2);
        const startY = centerY - (size / 2) + (subSize / 2);

        for (let r = 0; r < tilesPerSide; r++) {
            for (let c = 0; c < tilesPerSide; c++) {
                const tx = startX + c * subSize;
                const ty = startY + r * subSize;

                const tile = this.add.rectangle(tx, ty, subSize, subSize, 0x666666);

                // Borders for visual clarity of bricks
                tile.setStrokeStyle(1, 0x444444);

                this.obstacles.add(tile);
            }
        }
    }

    validateMap(grid, cols, rows) {
        // BFS to ensure all 0s are connected
        // Find start point (first 0)
        let startX = -1, startY = -1;
        let emptyCount = 0;

        for (let y = 0; y < rows; y++) {
            for (let x = 0; x < cols; x++) {
                if (grid[y][x] === 0) {
                    if (startX === -1) {
                        startX = x;
                        startY = y;
                    }
                    emptyCount++;
                }
            }
        }

        if (startX === -1) return false; // Full map?

        const queue = [{ x: startX, y: startY }];
        const visited = new Set();
        const key = (x, y) => `${x},${y}`;
        visited.add(key(startX, startY));

        let reachableCount = 0;

        while (queue.length > 0) {
            const current = queue.shift();
            reachableCount++;

            const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (const [dx, dy] of dirs) {
                const nx = current.x + dx;
                const ny = current.y + dy;

                if (nx >= 0 && nx < cols && ny >= 0 && ny < rows && grid[ny][nx] === 0) {
                    const k = key(nx, ny);
                    if (!visited.has(k)) {
                        visited.add(k);
                        queue.push({ x: nx, y: ny });
                    }
                }
            }
        }

        // Valid if we reached every empty tile
        return reachableCount === emptyCount;
    }

    update(time, delta) {
        if (!this.player) return;

        this.player.update(time, delta);

        // Enemies update
        if (this.stageManager && this.stageManager.enemies) {
            this.stageManager.enemies.getChildren().forEach(enemy => enemy.update(time, delta));
        }

        if (this.combatSystem) {
            this.combatSystem.update();
        }

        // Collision logic here due to simple access
        // Player Bullet vs World
        this.physics.world.collide(this.playerBullets, this.obstacles, (bullet, obstacle) => {
            bullet.destroy();
            obstacle.destroy();
            // Optional: particle effect here
        });

        // Enemy Bullet vs World
        this.physics.world.collide(this.enemyBullets, this.obstacles, (bullet, obstacle) => {
            bullet.destroy();
            obstacle.destroy();
        });

        // Player Bullet vs Enemy
        this.physics.overlap(this.playerBullets, this.stageManager.enemies, (bullet, enemy) => {
            const bulletX = bullet.x;
            bullet.destroy();
            enemy.takeDamage(1, bulletX);

            // Score Logic
            if (!enemy.isInvulnerable && enemy.state !== 'SPAWNING') {
                const currentScore = this.registry.get('score') || 0;
                this.registry.set('score', currentScore + 1);
                this.events.emit('score-changed', currentScore + 1);
            }
        });

        // Enemy Bullet vs Player
        this.physics.overlap(this.enemyBullets, this.player, (player, bullet) => {
            const bulletX = bullet.x;
            bullet.destroy();
            player.takeDamage(1, bulletX);
        });

        if (this.stageManager) {
            this.stageManager.update(time, delta);

            // Stats Tracking
            const enemies = this.stageManager.enemies;
            const active = enemies.countActive(true);
            const remaining = enemies.getChildren().reduce((acc, e) => acc + e.respawnsRemaining, 0);
            const killed = this.registry.get('killed') || 0;

            this.events.emit('stats-updated', { active, remaining, killed });
        }
    }
}
