class Bullet {
    constructor(id, x, y, direction, ownerType, ownerId) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.ownerType = ownerType; // 'player' or 'enemy'
        this.ownerId = ownerId;
        this.speed = 300;
        this.isActive = true;
        this.width = 8;
        this.height = 8;
    }

    update(delta) {
        const moveAmt = this.speed * delta;

        switch (this.direction) {
            case 'up':
                this.y -= moveAmt;
                break;
            case 'down':
                this.y += moveAmt;
                break;
            case 'left':
                this.x -= moveAmt;
                break;
            case 'right':
                this.x += moveAmt;
                break;
        }

        // Bounds Check
        if (this.x < 0 || this.x > 1280 || this.y < 0 || this.y > 720) {
            this.isActive = false;
        }
    }
}

module.exports = { Bullet };
