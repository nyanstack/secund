
export class EnemyState {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.hp = 2;
        this.speed = 100;
        this.vx = 0;
        this.vy = 0;
        this.active = true;
    }

    update(delta, players) {
        if (!this.active) return;

        // Simple tracking AI: Move towards nearest player
        let nearest = null;
        let minDist = Infinity;

        for (const p of Object.values(players)) {
            if (p.dead) continue;
            const dx = p.x - this.x;
            const dy = p.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                nearest = p;
            }
        }

        if (nearest) {
            const dx = nearest.x - this.x;
            const dy = nearest.y - this.y;

            // Manhattan Movement: Prioritize larger distance axis
            // Or just check if aligned?
            // "Manhattan mode" usually means move on one axis at a time.

            if (Math.abs(dx) > Math.abs(dy)) {
                // Move Horizontal
                this.vx = (dx > 0 ? 1 : -1) * this.speed;
                this.vy = 0;
            } else {
                // Move Vertical
                this.vy = (dy > 0 ? 1 : -1) * this.speed;
                this.vx = 0;
            }
        } else {
            this.vx = 0;
            this.vy = 0;
        }

        const seconds = delta / 1000;
        this.x += this.vx * seconds;
        this.y += this.vy * seconds;

        // World Bounds
        this.x = Math.max(24, Math.min(1280 - 24, this.x));
        this.y = Math.max(24, Math.min(720 - 24, this.y));
    }

    takeDamage(amount) {
        if (!this.active) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.active = false;
        }
    }

    getBounds() {
        return {
            x: this.x - this.width / 2,
            y: this.y - this.height / 2,
            width: this.width,
            height: this.height
        };
    }
}
