import Phaser from 'phaser';

export class EndingScene extends Phaser.Scene {
    constructor() {
        super('EndingScene');
    }

    create() {
        const { width, height } = this.scale;
        const finalScore = this.registry.get('score') || 0;

        this.add.text(width / 2, height / 2 - 50, 'CONGRATULATIONS!', {
            fontSize: '64px',
            fill: '#ff0'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 20, `Final Score: ${finalScore}`, {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 100, 'Press SPACE to Return Home', {
            fontSize: '24px',
            fill: '#fff'
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('MainMenu');
        });
    }
}
