
import Phaser from 'phaser';

export class Player extends Phaser.Physics.Arcade.Sprite {
    constructor(scene, x, y) {
        super(scene, x, y, 'player');

        scene.add.existing(this);
        scene.physics.add.existing(this);

        this.setCollideWorldBounds(true);
        this.setDisplaySize(48, 48);
        this.body.setSize(48, 48);

        // Visual State
        this.state = 'IDLE'; // IDLE, MOVE, ATTACK, HIT, DEAD
        this.facing = 'RIGHT';
    }

    // Shared visual Updates (Animations etc) can go here
    update(time, delta) {
        // Base update
    }
}
