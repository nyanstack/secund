import Phaser from 'phaser';

export class Boot extends Phaser.Scene {
    constructor() {
        super('Boot');
    }

    preload() {
        // Create simple placeholder graphics
        const graphics = this.make.graphics({ x: 0, y: 0, add: false });

        // Player: Square (White) - Matching Enemy Size
        graphics.fillStyle(0xffffff);
        graphics.fillRect(0, 0, 48, 48);
        graphics.generateTexture('player', 48, 48);

        // Enemy: Wider Rectangle (Red)
        graphics.clear();
        graphics.fillStyle(0xff0000);
        graphics.fillRect(0, 0, 48, 48);
        graphics.generateTexture('enemy', 48, 48);

        // Ground/Floor constraint (if needed visuals)

        // Load nothing for now, just placeholders
    }

    create() {
        this.scene.start('MainMenu');
    }
}
