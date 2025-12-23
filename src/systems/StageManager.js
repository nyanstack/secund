import { Enemy } from '../objects/Enemy';

export class StageManager {
    constructor(scene) {
        this.scene = scene;
        this.currentStage = 1;
        this.enemies = this.scene.physics.add.group();
        this.isStageClear = false;
    }

    startStage(level) {
        this.currentStage = level;
        this.isStageClear = false;
        this.spawnEnemies();
    }

    spawnEnemies() {
        // Logic to spawn enemies based on stage config
        if (this.currentStage === 1) {
            // Stage 1: 1 Enemy? Or maybe 2? Prompt says "There is one enemy type... Each stage has 2 stages total". 
            // "enemies spawn according to respawn rules".
            // Let's spawn 1 enemy for Stage 1.
            this.createEnemy();
        } else if (this.currentStage === 2) {
            // Stage 2: Maybe 2 enemies?
            this.createEnemy();
            this.createEnemy();
        }
    }

    createEnemy() {
        // Find valid spawn location
        let x, y;
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 50) {
            x = Phaser.Math.Between(100, 1180);
            y = Phaser.Math.Between(100, 620);
            valid = true;

            // Check obstacle overlap (approximate)
            // We can check distance to all obstacles
            if (this.scene.obstacles) {
                this.scene.obstacles.getChildren().forEach(obs => {
                    const dist = Phaser.Math.Distance.Between(x, y, obs.x, obs.y);
                    if (dist < 80) valid = false; // 80 = (48/2 + max_obs_dim/2) mostly
                });
            }

            // Avoid player spawn area
            if (Phaser.Math.Distance.Between(x, y, this.scene.player.x, this.scene.player.y) < 200) {
                valid = false;
            }

            attempts++;
        }

        const enemy = new Enemy(this.scene, x, y);
        enemy.setTarget(this.scene.player);
        this.enemies.add(enemy);
    }

    checkStageClear() {
        if (this.isStageClear) return;

        // Count active enemies
        const activeEnemies = this.enemies.countActive(true);
        // We also need to know if any enemies are waiting to respawn.
        // We can check if `enemies.children` contains any identifiable "dead but respawning" state, 
        // or just track a counter of "total enemies to kill".
        // The enemies remove themselves on final death.
        // But `die()` hides them and waits.
        // So `countActive(true)` might still return them if they are just invisible?
        // `die()` sets visible false. `countActive(true)` usually counts visible/active ones.
        // But let's be safer: check if group size is 0?
        // Enemies calling `destroy()` effectively removes them.

        const aliveOrRespawning = this.enemies.getChildren().some(e => !e.isDead || e.respawnsRemaining > 0);

        if (!aliveOrRespawning) {
            this.isStageClear = true;
            console.log('Stage Clear! Auto-advancing...');

            // Short delay before moving to next stage
            this.scene.time.delayedCall(1000, () => {
                this.nextStage();
            });
        }
    }

    activateExitZone() {
        // Deprecated: Auto-advance is now used.
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
