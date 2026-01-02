class Player {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.hp = 3;
        this.speed = 160;
        this.width = 48;
        this.height = 48;

        // Input State
        this.input = {
            up: false,
            down: false,
            left: false,
            right: false
        };

        this.facing = 'RIGHT';
        this.isDead = false;
        this.isInvulnerable = false;

        // Cooldowns
        this.attackCooldown = 0;
    }

    update(delta) {
        if (this.isDead) return;

        let vx = 0;
        let vy = 0;
        // delta is in seconds typically for Phaser, but here we can rely on fixed step
        // Let's assume delta is seconds (approx 0.016s)
        const moveAmt = this.speed * delta;

        if (this.input.up) {
            vy = -moveAmt;
            this.facing = 'UP';
        } else if (this.input.down) {
            vy = moveAmt;
            this.facing = 'DOWN';
        }

        // Horizontal priority check similar to original logic? Or unrestricted?
        // Original: "Only move horizontally if not moving vertically" logic was present but let's allow diagonal for smooth netplay unless requested otherwise.
        // Actually, let's keep it simple: 8-way movement is standard.
        // But original code said: "Only move horizontally if not moving vertically". I will stick to that to preserve feel.

        if (vy === 0) {
            if (this.input.left) {
                vx = -moveAmt;
                this.facing = 'LEFT';
            } else if (this.input.right) {
                vx = moveAmt;
                this.facing = 'RIGHT';
            }
        }

        this.x += vx;
        this.y += vy;

        // Clamp to World (Assuming 1280x720)
        this.x = Math.max(24, Math.min(1280 - 24, this.x));
        this.y = Math.max(24, Math.min(720 - 24, this.y));

        if (this.attackCooldown > 0) this.attackCooldown -= delta;
    }

    takeDamage(amount) {
        if (this.isInvulnerable || this.isDead) return;

        this.hp -= amount;
        this.isInvulnerable = true;

        // Simple timeout for invulnerability handling in GameRoom or here if we pass loop reference?
        // For simplicity, we just mark it, and GameRoom can handle clearing it or we use a timestamp.
        this.invulnerableUntil = Date.now() + 1000;

        if (this.hp <= 0) {
            this.isDead = true;
        }
    }
}

module.exports = { Player };
