import Phaser from 'phaser';

export class Bullet extends Phaser.Physics.Arcade.Image {
    constructor(scene, x, y, direction, ownerType) {
        super(scene, x, y, 'bullet'); // Assuming 'bullet' texture exists, or we use a primitive
        this.scene = scene;
        this.ownerType = ownerType; // 'player' or 'enemy' to avoid self-harm if needed
        this.speed = 300;
        this.direction = direction; // 'up', 'down', 'left', 'right'

        // Add to scene
        scene.add.existing(this);
        scene.physics.add.existing(this);

        // Add to specific group for collision management
        if (ownerType === 'player' && scene.playerBullets) {
            scene.playerBullets.add(this);
        } else if (ownerType === 'enemy' && scene.enemyBullets) {
            scene.enemyBullets.add(this);
        }

        this.setCollideWorldBounds(true);
        this.body.onWorldBounds = true; // To detect hitting world (screen) edges if they count as walls

        this.fire(direction);
    }

    fire(direction) {
        this.direction = direction;
        switch (direction) {
            case 'up':
                this.setVelocity(0, -this.speed);
                this.setAngle(-90);
                break;
            case 'down':
                this.setVelocity(0, this.speed);
                this.setAngle(90);
                break;
            case 'left':
                this.setVelocity(-this.speed, 0);
                this.setAngle(180);
                break;
            case 'right':
                this.setVelocity(this.speed, 0);
                this.setAngle(0);
                break;
            default:
                this.setVelocity(0, -this.speed); // Default up
        }
    }

    update(time, delta) {
        // destroy if out of bounds (managed by world bounds or collision mostly)
    }
}
