import Phaser from 'phaser';

export class MainMenu extends Phaser.Scene {
    constructor() {
        super('MainMenu');
    }

    create() {
        const { width, height } = this.scale;

        this.add.text(width / 2, height / 2 - 50, 'SECUND', {
            fontFamily: 'Arial',
            fontSize: '64px',
            color: '#ffffff'
        }).setOrigin(0.5);

        const playButtonBg = this.add.rectangle(width / 2, height / 2 + 50, 300, 60, 0x000000)
            .setInteractive({ useHandCursor: true });

        const playButtonText = this.add.text(width / 2, height / 2 + 50, 'SINGLE PLAYER', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#00ff00'
        }).setOrigin(0.5);

        const mpButtonBg = this.add.rectangle(width / 2, height / 2 + 120, 300, 60, 0x000000)
            .setInteractive({ useHandCursor: true });

        const mpButtonText = this.add.text(width / 2, height / 2 + 120, 'MULTIPLAYER', {
            fontFamily: 'Arial',
            fontSize: '32px',
            color: '#00ff00'
        }).setOrigin(0.5);

        const startGame = () => {
            console.log('MainMenu: Starting game...');
            try {
                this.registry.set('score', 0);
                this.scene.start('GameScene', { level: 1 });
                console.log('MainMenu: Started GameScene');
            } catch (e) {
                console.error('MainMenu: Error starting GameScene', e);
            }
        };

        playButtonBg.on('pointerdown', () => {
            console.log('MainMenu: Play button clicked');
            startGame();
        });

        playButtonBg.on('pointerover', () => playButtonText.setStyle({ fill: '#ff0' }));
        playButtonBg.on('pointerout', () => playButtonText.setStyle({ fill: '#0f0' }));

        mpButtonBg.on('pointerdown', () => {
            console.log('MainMenu: Multiplayer button clicked');
            this.scene.start('MultiplayerGameScene');
        });

        mpButtonBg.on('pointerover', () => mpButtonText.setStyle({ fill: '#ff0' }));
        mpButtonBg.on('pointerout', () => mpButtonText.setStyle({ fill: '#0f0' }));

        // Spacebar Start
        this.input.keyboard.once('keydown-SPACE', () => {
            console.log('MainMenu: Spacebar pressed');
            startGame();
        });

        this.add.text(width / 2, height / 2 + 190, 'Press SPACE or click Start Single Player', {
            fontSize: '16px',
            fill: '#888'
        }).setOrigin(0.5);


    }
}
