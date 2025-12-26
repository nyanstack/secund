import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
    constructor() {
        super('UIScene');
    }

    init(data) {
        this.gameScene = data.gameScene;
    }

    create() {
        // UI Overlay
        this.scoreText = this.add.text(20, 60, 'Score: 0', { fontSize: '32px', fill: '#ffffff' });
        this.hpText = this.add.text(20, 100, 'HP: 3', { fontSize: '32px', fill: '#ff0000' });

        this.activeText = this.add.text(20, 140, 'Active: 0', { fontSize: '24px', fill: '#aaa' });
        this.remainingText = this.add.text(20, 170, 'Remaining: 0', { fontSize: '24px', fill: '#aaa' });
        this.killedText = this.add.text(20, 200, 'Killed: 0', { fontSize: '24px', fill: '#aaa' });
        this.areaText = this.add.text(20, 230, 'Obstacles: 0%', { fontSize: '24px', fill: '#aaa' });

        // Listen to GameScene events
        if (this.gameScene) {
            this.gameScene.events.on('player-hp-changed', (hp) => {
                this.hpText.setText(`HP: ${hp}`);
            });
            this.gameScene.events.on('score-changed', (score) => {
                this.scoreText.setText(`Score: ${score}`);
            });
            this.gameScene.events.on('stats-updated', (stats) => {
                this.activeText.setText(`Active: ${stats.active}`);
                this.remainingText.setText(`Spawning: ${stats.remaining}`);
                this.killedText.setText(`Killed: ${stats.killed}`);
            });
            this.gameScene.events.on('map-stats', (pct) => {
                this.areaText.setText(`Obstacles: ${pct}%`);
            });
        }

        // Initialize score text
        const currentScore = this.registry.get('score') || 0;
        this.scoreText.setText(`Score: ${currentScore}`);
    }
}
