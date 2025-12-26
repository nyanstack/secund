import Phaser from 'phaser';

export class DefeatScene extends Phaser.Scene {
    constructor() {
        super('DefeatScene');
    }

    create() {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor('#000000');

        this.add.text(width / 2, height / 2 - 50, 'DEFEATED', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#ff0000',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 50, 'Press SPACE to Continue', {
            fontFamily: 'Arial',
            fontSize: '24px',
            color: '#ffffff'
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('MainMenu');
        });
    }
}
