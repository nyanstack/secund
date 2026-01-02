
import Phaser from 'phaser';
import { Bullet } from './Bullet';
import { Player } from './Player';

export class SinglePlayer extends Player {
    constructor(scene, x, y) {
        super(scene, x, y);

        // Stats
        this.hp = 3;
        this.speed = 160;
        this.isInvulnerable = false;

        // Input keys reference
        this.keys = null;
    }

    setupKeys(keys) {
        this.keys = keys;
        // Input monitoring for One-Shot keys (Attacks)
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update(time, delta) {
        super.update(time, delta); // Base Update (if any)

        if (this.state === 'DEAD') {
            this.setVelocity(0);
            return;
        }

        if (this.state === 'HIT') {
            this.setVelocity(0);
            return;
        }

        this.handleMovement();
        this.handleShooting();
    }

    handleMovement() {
        let vx = 0;
        let vy = 0;

        if (this.keys.up.isDown) {
            vy = -this.speed;
        } else if (this.keys.down.isDown) {
            vy = this.speed;
        }

        // Only move horizontally if not moving vertically
        if (vy === 0) {
            if (this.keys.left.isDown) {
                vx = -this.speed;
            } else if (this.keys.right.isDown) {
                vx = this.speed;
            }
        }

        this.setVelocity(vx, vy);

        // Update State & Facing
        // Note: Base Player tracks state/facing for visuals?
        // We override this.facing based on movement
        if (vy < 0) this.facing = 'UP';
        else if (vy > 0) this.facing = 'DOWN';
        else if (vx < 0) this.facing = 'LEFT';
        else if (vx > 0) this.facing = 'RIGHT';

        if (vx !== 0 || vy !== 0) {
            this.state = 'WALK';
        } else {
            this.state = 'IDLE';
        }
    }

    handleShooting() {
        if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            this.shoot();
        }
    }

    shoot() {
        if (this.activeBullet && this.activeBullet.active) {
            return;
        }

        let startX = this.x;
        let startY = this.y;
        const offset = 20;

        let dir = 'down';
        if (this.facing === 'LEFT') { dir = 'left'; startX -= offset; }
        else if (this.facing === 'RIGHT') { dir = 'right'; startX += offset; }
        else if (this.facing === 'UP') { dir = 'up'; startY -= offset; }
        else if (this.facing === 'DOWN') { dir = 'down'; startY += offset; }

        this.activeBullet = new Bullet(this.scene, startX, startY, dir, 'player');
    }

    takeDamage(amount, sourceX) {
        if (this.isInvulnerable || this.state === 'DEAD') return;

        this.hp -= amount;
        this.scene.events.emit('player-hp-changed', this.hp);
        console.log(`Player touched! HP: ${this.hp}`);

        // Flash
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            duration: 100,
            yoyo: true,
            repeat: 3
        });

        if (this.hp <= 0) {
            this.state = 'DEAD';
            this.setTint(0x555555);
            this.scene.events.emit('player-dead');
            return;
        }

        this.state = 'HIT';
        this.isInvulnerable = true;

        // Knockback
        const dir = this.x < sourceX ? -1 : 1;
        this.setVelocity(dir * 200, 0);

        // Invulnerability window
        this.scene.time.delayedCall(1000, () => {
            this.isInvulnerable = false;
        });

        // Recover from hit stun
        this.scene.time.delayedCall(300, () => {
            if (this.state !== 'DEAD') this.state = 'IDLE';
        });
    }
}
