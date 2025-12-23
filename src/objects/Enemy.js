import Phaser from 'phaser';
import { Bullet } from './Bullet';

export class Enemy extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'enemy');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        // "Wider rectangle"
        this.setDisplaySize(48, 48);
        this.body.setSize(48, 48);

        // Stats
        this.hp = 3; // Example HP
        this.speed = 160 * 0.65; // 0.65x Player speed
        this.damage = 1;
        this.respawnsRemaining = 2; // "Respawns up to 2 times" means 3 lives total? "The 3rd death is permanent" implies: Spawn (1) -> Die -> Respawn (2) -> Die -> Respawn (3) -> Die -> Done. So 2 respawns.

        this.attackRange = 400;
        this.target = null; // Reference to player
        this.attackCooldown = 0;
        this.isDead = false;
        this.activeBullet = null;

        this.state = 'SPAWNING';
        this.setAlpha(0);
        this.isInvulnerable = true;

        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 100,
            yoyo: true,
            repeat: -1
        });

        this.scene.time.delayedCall(2000, () => {
            if (this.isDead) return;
            this.state = 'IDLE';
            this.isInvulnerable = false;
            this.setAlpha(1);
            this.scene.tweens.killTweensOf(this);
        });
    }

    setTarget(player) {
        this.target = player;
    }

    update(time, delta) {
        if (this.isDead || !this.target || this.target.state === 'DEAD' || this.state === 'SPAWNING') {
            this.setVelocity(0);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // AI Logic
        if (dist <= this.attackRange) {
            // Line up and Shoot
            // Move to align X or Y
            const dx = Math.abs(this.x - this.target.x);
            const dy = Math.abs(this.y - this.target.y);

            if (dx < 20 || dy < 20) {
                this.setVelocity(0);
                if (this.attackCooldown <= 0) {
                    this.tryShoot(time);
                }
            } else {
                // Move to align
                if (dx < dy) {
                    // Align X
                    if (this.x < this.target.x) this.setVelocityX(this.speed);
                    else this.setVelocityX(-this.speed);
                    this.setVelocityY(0);
                } else {
                    // Align Y
                    if (this.y < this.target.y) this.setVelocityY(this.speed);
                    else this.setVelocityY(-this.speed);
                    this.setVelocityX(0);
                }
            }
        } else {
            // Chase (Manhattan/4-Way)
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                // Move Horizontal
                this.setVelocityX(dx > 0 ? this.speed : -this.speed);
                this.setVelocityY(0);
            } else {
                // Move Vertical
                this.setVelocityY(dy > 0 ? this.speed : -this.speed);
                this.setVelocityX(0);
            }
        }
    }

    tryShoot(time) {
        // limit 1 bullet
        if (this.activeBullet && this.activeBullet.active) return;

        this.attackCooldown = 2000;

        const dx = this.target.x - this.x;
        const dy = this.target.y - this.y;

        // Determine primary direction
        let dir = 'down';
        if (Math.abs(dx) > Math.abs(dy)) {
            dir = dx > 0 ? 'right' : 'left';
        } else {
            dir = dy > 0 ? 'down' : 'up';
        }

        this.activeBullet = new Bullet(this.scene, this.x, this.y, dir, 'enemy');
    }

    takeDamage(amount, sourceX) {
        if (this.isDead || this.isInvulnerable || this.state === 'SPAWNING') return;

        this.hp -= amount;
        console.log(`Enemy Hit! HP: ${this.hp}`);

        // Flash
        this.scene.tweens.add({
            targets: this,
            alpha: 0.2,
            duration: 50,
            yoyo: true,
            repeat: 3
        });

        // Knockback
        const dir = this.x < sourceX ? -1 : 1;
        this.setVelocity(dir * 150, 0);

        if (this.hp <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;
        this.setTint(0x000000);
        this.setVelocity(0);
        this.body.checkCollision.none = true;

        console.log(`Enemy Died. Respawns left: ${this.respawnsRemaining}`);
        this.scene.events.emit('enemy-killed');

        this.scene.time.delayedCall(1000, () => {
            this.setVisible(false);
            this.setPosition(-1000, -1000); // Hide away

            if (this.respawnsRemaining > 0) {
                this.respawnsRemaining--;
                this.scene.time.delayedCall(5000, () => {
                    this.respawn();
                });
            } else {
                this.destroy(); // Permanently gone
            }
        });
    }

    respawn() {
        // Use StageManager's logic if possible, or replicate "Find Safe Spot" logic
        // For simplicity, let's just pick a random spot far from player
        let x, y;
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 20) {
            x = Phaser.Math.Between(100, 1180);
            y = Phaser.Math.Between(100, 620);
            const dist = Phaser.Math.Distance.Between(x, y, this.target.x, this.target.y);
            if (dist > 300) valid = true; // Minimum distance
            attempts++;
        }

        this.setPosition(x, y);
        this.clearTint();

        this.isDead = false;
        this.hp = 3;
        this.setVisible(true);
        this.body.checkCollision.none = false;

        // Reset to Spawning State
        this.state = 'SPAWNING';
        this.isInvulnerable = true;
        this.setAlpha(0);

        this.scene.tweens.add({
            targets: this,
            alpha: 1,
            duration: 100,
            yoyo: true,
            repeat: -1
        });

        this.scene.time.delayedCall(2000, () => {
            if (this.isDead) return;
            this.state = 'IDLE';
            this.isInvulnerable = false;
            this.setAlpha(1);
            this.scene.tweens.killTweensOf(this);
        });

        console.log('Enemy Respawned');
    }
}
