
export class BulletState {
    constructor(id, ownerId, x, y, dir, type) {
        this.id = id;
        this.ownerId = ownerId;
        this.x = x;
        this.y = y;
        this.dir = dir; // 'left', 'right', 'up', 'down'
        this.type = type; // 'player' or 'enemy'

        this.speed = 400; // Match client speed
        this.width = 8;
        this.height = 8;
        this.active = true;
    }

    update(delta) {
        if (!this.active) return;

        const seconds = delta / 1000;
        const dist = this.speed * seconds;

        if (this.dir === 'left') this.x -= dist;
        else if (this.dir === 'right') this.x += dist;
        else if (this.dir === 'up') this.y -= dist;
        else if (this.dir === 'down') this.y += dist;

        // Bounds check (0-1280, 0-720)
        if (this.x < 0 || this.x > 1280 || this.y < 0 || this.y > 720) {
            this.active = false;
        }
    }

    getBounds() {
        return {
            x: this.x,
            y: this.y,
            width: this.width,
            height: this.height
        };
    }
}
