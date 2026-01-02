
export class PlayerState {
    constructor(id, x, y) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.width = 48;
        this.height = 48;
        this.hp = 3;
        this.dead = false;

        this.speed = 160;
        this.vx = 0;
        this.vy = 0;
        this.facing = 'right';

        this.inputSequence = 0;
    }

    processInput(input) {
        if (this.dead) {
            this.vx = 0;
            this.vy = 0;
            return;
        }

        let vx = 0;
        let vy = 0;

        if (input.up) vy = -this.speed;
        else if (input.down) vy = this.speed;

        if (vy === 0) {
            if (input.left) vx = -this.speed;
            else if (input.right) vx = this.speed;
        }

        this.vx = vx;
        this.vy = vy;

        // Facing
        if (vy < 0) this.facing = 'up';
        else if (vy > 0) this.facing = 'down';
        else if (vx < 0) this.facing = 'left';
        else if (vx > 0) this.facing = 'right';

        this.inputSequence = input.seq;
    }

    update(delta) {
        if (this.dead) return;

        const seconds = delta / 1000;
        this.x += this.vx * seconds;
        this.y += this.vy * seconds;

        // World Bounds
        this.x = Math.max(24, Math.min(1280 - 24, this.x));
        this.y = Math.max(24, Math.min(720 - 24, this.y));
    }

    takeDamage(amount) {
        if (this.dead) return;
        this.hp -= amount;
        if (this.hp <= 0) {
            this.hp = 0;
            this.dead = true;
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
