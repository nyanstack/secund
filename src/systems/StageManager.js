import { Enemy } from '../objects/Enemy';

const STAGE_CONFIG = {
    1: { count: 2, spawnInterval: 1000 },
    2: { count: 2, spawnInterval: 1000 }
};

export class StageManager {
    constructor(scene) {
        this.scene = scene;
        this.currentStage = 1;
        this.enemies = this.scene.physics.add.group();
        this.isStageClear = false;

        // Spawn Queue State
        this.enemiesToSpawn = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 1000;
    }

    startStage(level) {
        this.currentStage = level;
        this.isStageClear = false;

        const config = STAGE_CONFIG[level] || { count: 3, spawnInterval: 2000 };
        this.enemiesToSpawn = config.count;
        this.spawnInterval = config.spawnInterval;
        this.spawnTimer = 0;

        console.log(`Starting Stage ${level}. Total Enemies: ${this.enemiesToSpawn}`);
    }

    update(time, delta) {
        if (this.isStageClear) return;

        // Spawn Logic
        if (this.enemiesToSpawn > 0) {
            this.spawnTimer += delta;
            if (this.spawnTimer >= this.spawnInterval) {
                this.spawnTimer = 0;
                this.createEnemy();
                this.enemiesToSpawn--;
                console.log(`Enemy Spawned. Remaining in queue: ${this.enemiesToSpawn}`);
            }
        }

        this.checkStageClear();
    }

    createEnemy() {
        const point = this.getValidSpawnPoint();
        const enemy = new Enemy(this.scene, point.x, point.y);
        enemy.setTarget(this.scene.player);
        this.enemies.add(enemy);
    }

    getValidSpawnPoint() {
        let x = 0, y = 0;
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 50) {
            x = Phaser.Math.Between(100, 1180);
            y = Phaser.Math.Between(100, 620);
            valid = true;

            // Check obstacle overlap (Strict Bounds Check)
            const enemyBounds = new Phaser.Geom.Rectangle(x - 24, y - 24, 48, 48);

            if (this.scene.obstacles) {
                const obstacles = this.scene.obstacles.getChildren();
                for (const obs of obstacles) {
                    const obsBounds = obs.getBounds();
                    if (Phaser.Geom.Intersects.RectangleToRectangle(enemyBounds, obsBounds)) {
                        valid = false;
                        break;
                    }
                }
            }

            // Avoid player spawn area
            if (valid && this.scene.player) {
                if (Phaser.Math.Distance.Between(x, y, this.scene.player.x, this.scene.player.y) < 200) {
                    valid = false;
                }
            }

            attempts++;
        }

        return valid ? { x, y } : { x: 100, y: 100 };
    }

    checkStageClear() {
        if (this.isStageClear) return;

        // Win Condition: No active enemies AND no enemies waiting to spawn
        // enemies.getLength() includes active and respawning enemies (since responsible for destroy() is on permanent death)
        const activeCount = this.enemies.getLength();

        if (activeCount === 0 && this.enemiesToSpawn === 0) {
            this.isStageClear = true;
            console.log('Stage Clear! active: 0, queue: 0');

            this.scene.time.delayedCall(1000, () => {
                this.nextStage();
            });
        }
    }

    nextStage() {
        if (this.currentStage >= 2) {
            console.log('Game Clear!');
            this.scene.scene.stop('UIScene');
            this.scene.scene.start('EndingScene');
        } else {
            console.log('Next Stage');
            this.scene.scene.stop('UIScene');
            this.scene.scene.start('StageClearScene', { nextLevel: this.currentStage + 1 });
        }
    }
}
