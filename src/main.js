import Phaser from 'phaser';
import './style.css';

import { Boot } from './scenes/Boot';
import { MainMenu } from './scenes/MainMenu';
import { GameScene } from './scenes/GameScene';
import { UIScene } from './scenes/UIScene';
import { StageClearScene } from './scenes/StageClearScene';
import { EndingScene } from './scenes/EndingScene';

import { DefeatScene } from './scenes/DefeatScene';
import { MultiplayerGameScene } from './scenes/MultiplayerGameScene';

const config = {
    type: Phaser.AUTO,
    width: 1280,
    height: 720,
    parent: 'game-container',
    backgroundColor: '#333333',
    physics: {
        default: 'arcade',
        arcade: {
            debug: true, // Verification task asks for debug visualization
            gravity: { y: 0 } // Top-down-ish combat, manual Y handling for clamping
        }
    },
    scene: [
        Boot,
        MainMenu,
        GameScene,
        UIScene,
        StageClearScene,
        EndingScene,
        DefeatScene,
        MultiplayerGameScene
    ],
    pixelArt: false,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    }
};

const game = new Phaser.Game(config);
