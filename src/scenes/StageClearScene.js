import Phaser from 'phaser';

export class StageClearScene extends Phaser.Scene {
    constructor() {
        super('StageClearScene');
    }

    init(data) {
        this.nextLevel = data.nextLevel;
    }

    create() {
        const { width, height } = this.scale;
        const currentScore = this.registry.get('score') || 0;

        this.add.text(width / 2, height / 2 - 50, 'STAGE CLEAR!', {
            fontSize: '64px',
            fill: '#0f0'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 20, `Score: ${currentScore}`, {
            fontSize: '32px',
            fill: '#fff'
        }).setOrigin(0.5);

        this.add.text(width / 2, height / 2 + 100, 'Press SPACE to Continue', {
            fontSize: '24px',
            fill: '#fff'
        }).setOrigin(0.5);

        this.input.keyboard.once('keydown-SPACE', () => {
            this.scene.start('GameScene', { level: this.nextLevel });
        });
    }
}
