import Phaser from 'phaser';
import { Bullet } from './Bullet';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        // Square
        this.setDisplaySize(48, 48);
        this.body.setSize(48, 48);

        // Stats
        this.hp = 10;
        this.speed = 160; // 160 is a reasonable speed, adjusting later if needed
        this.isInvulnerable = false;

        // State
        this.state = 'IDLE'; // IDLE, MOVE, ATTACK, HIT, DEAD
        this.facing = 'RIGHT';

        // Input keys reference
        this.keys = null;
    }

    setupKeys(keys) {
        this.keys = keys;

        // Input monitoring for One-Shot keys (Attacks)
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update(time, delta) {
        super.update(time, delta);

        if (this.state === 'DEAD') {
            this.setVelocity(0);
            return;
        }

        if (this.state === 'HIT') {
            // Locked movement
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
            this.facing = 'UP';
        } else if (this.keys.down.isDown) {
            vy = this.speed;
            this.facing = 'DOWN';
        }

        // Only move horizontally if not moving vertically
        if (vy === 0) {
            if (this.keys.left.isDown) {
                vx = -this.speed;
                this.facing = 'LEFT';
            } else if (this.keys.right.isDown) {
                vx = this.speed;
                this.facing = 'RIGHT';
            }
        }

        this.setVelocity(vx, vy);

        // Update State
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
        // Check if bullet already exists and is active
        if (this.activeBullet && this.activeBullet.active) {
            return;
        }

        // Align bullet spawn
        let startX = this.x;
        let startY = this.y;
        const offset = 20;

        // Use current facing
        let dir = 'down';
        if (this.facing === 'LEFT') {
            dir = 'left';
            startX -= offset;
        } else if (this.facing === 'RIGHT') {
            dir = 'right'; // Fixed string form to match Bullet expects (lowercase)
            startX += offset;
        } else if (this.facing === 'UP') { // Need to ensure we set UP/DOWN in handleMovement
            dir = 'up';
            startY -= offset;
        } else if (this.facing === 'DOWN') {
            dir = 'down';
            startY += offset;
        } else {
            // Fallback if facing is something else, though handleMovement sets it.
            // But handleMovement in viewing file only sets LEFT/RIGHT in facing variable?
            // Let's check handleMovement again. 
            // It doesn't set UP/DOWN to this.facing!
        }

        // Wait, I need to fix handleMovement to set facing UP/DOWN too.
        // I will do that in a separate chunk or this one if I can.

        // Actually, let's fix handleMovement first or assumes it works? 
        // Viewing file showed:
        // if (this.keys.left.isDown) { ... this.facing = 'LEFT'; }
        // else if (this.keys.right.isDown) { ... this.facing = 'RIGHT'; }
        // if (this.keys.up.isDown) { vy = -speed; } ...
        // It DOES NOT set facing for UP/DOWN. I must fix that to support 4-way shooting.

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
            // Game Over logic triggers here?
            return;
        }

        this.state = 'HIT';
        this.isInvulnerable = true;

        // Knockback
        const dir = this.x < sourceX ? -1 : 1;
        this.setVelocity(dir * 200, 0); // Simple knockback

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
