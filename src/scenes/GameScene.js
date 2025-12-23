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

            // Obstacles Layer
            this.obstacles = this.physics.add.staticGroup();
            this.createRandomObstacles();

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

    createRandomObstacles() {
        // Simple random blocks
        let totalArea = 0;
        const totalMapArea = 1280 * 720;
        const targetArea = totalMapArea * 0.20; // 20% coverage

        let attempts = 0;
        while (totalArea < targetArea && attempts < 200) {
            attempts++;

            const x = Phaser.Math.Between(200, 1000);
            const y = Phaser.Math.Between(100, 600);
            const w = Phaser.Math.Between(30, 100);
            const h = Phaser.Math.Between(30, 100);

            // Check overlap with spawn (0-200 x)
            if (x < 200) continue;

            const obstacle = this.add.rectangle(x, y, w, h, 0x666666);
            this.obstacles.add(obstacle);

            totalArea += w * h;
        }
        const percentage = ((totalArea / totalMapArea) * 100).toFixed(2);

        // Emit stats
        this.time.delayedCall(100, () => {
            this.events.emit('map-stats', percentage);
        });
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
        this.physics.world.collide(this.playerBullets, this.obstacles, (bullet) => {
            bullet.destroy();
        });

        // Enemy Bullet vs World
        this.physics.world.collide(this.enemyBullets, this.obstacles, (bullet) => {
            bullet.destroy();
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
            this.stageManager.checkStageClear();

            // Stats Tracking
            const enemies = this.stageManager.enemies;
            const active = enemies.countActive(true);
            const remaining = enemies.getChildren().reduce((acc, e) => acc + e.respawnsRemaining, 0);
            const killed = this.registry.get('killed') || 0;

            this.events.emit('stats-updated', { active, remaining, killed });
        }
    }
}
