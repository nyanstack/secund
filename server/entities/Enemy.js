const { MathUtils } = require('../utils/math');

class Enemy {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.hp = 2;
        this.speed = 100; // slightly slower than player
        this.width = 48;
        this.height = 48;

        this.attackRange = 400;
        this.targetId = null;
        this.attackCooldown = 0;
        this.state = 'SPAWNING'; // SPAWNING, IDLE, DEAD
        this.spawnTimer = 2; // seconds
    }

    update(delta, players, map) {
        if (this.state === 'SPAWNING') {
            this.spawnTimer -= delta;
            if (this.spawnTimer <= 0) {
                this.state = 'IDLE';
            }
            return;
        }

        if (this.attackCooldown > 0) {
            this.attackCooldown -= delta;
        }

        // Find Target
        let target = null;
        let minDist = 9999;

        // Simple nearest player check
        for (const pId in players) {
            const p = players[pId];
            if (p.isDead) continue;

            const d = MathUtils.Distance(this.x, this.y, p.x, p.y);
            if (d < minDist) {
                minDist = d;
                target = p;
                this.targetId = p.id;
            }
        }

        if (!target) return; // No targets

        // chase logic ported
        if (minDist <= this.attackRange) {
            // Line Up Logic
            const dx = Math.abs(this.x - target.x);
            const dy = Math.abs(this.y - target.y);

            if (dx < 20 || dy < 20) {
                // Shoot chance handled by GameRoom or here? 
                // We'll mark a "wantsToShoot" flag for GameRoom to consume
            } else {
                if (dx < dy) {
                    // Align X
                    if (this.x < target.x) this.x += this.speed * delta;
                    else this.x -= this.speed * delta;
                } else {
                    // Align Y
                    if (this.y < target.y) this.y += this.speed * delta;
                    else this.y -= this.speed * delta;
                }
            }
        } else {
            // Chase
            const dx = target.x - this.x;
            const dy = target.y - this.y;

            if (Math.abs(dx) > Math.abs(dy)) {
                this.x += (dx > 0 ? 1 : -1) * this.speed * delta;
            } else {
                this.y += (dy > 0 ? 1 : -1) * this.speed * delta;
            }
        }

        // Clamp bounds
        this.x = Math.max(24, Math.min(1280 - 24, this.x));
        this.y = Math.max(24, Math.min(720 - 24, this.y));
    }

    takeDamage(amount) {
        if (this.state === 'SPAWNING') return;
        this.hp -= amount;
        // Knockback handled in update or simplified?
        // Simplifying knockback for now (not implementing physics push yet)
    }
}

module.exports = { Enemy };
