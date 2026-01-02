
import { Player } from './Player';
import Phaser from 'phaser';

export class LocalPlayer extends Player {
    constructor(scene, x, y, socketClient) {
        super(scene, x, y);
        this.socketClient = socketClient;
        this.inputSeq = 0;

        this.keys = null;
        this.spaceKey = null;
    }

    setupKeys(keys) {
        this.keys = keys;
        this.spaceKey = this.scene.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    }

    update(time, delta) {
        super.update(time, delta);
        if (!this.keys) return;

        // Construct Input Payload
        const input = {
            up: this.keys.up.isDown,
            down: this.keys.down.isDown,
            left: this.keys.left.isDown,
            right: this.keys.right.isDown,
            shoot: Phaser.Input.Keyboard.JustDown(this.spaceKey),
            seq: this.inputSeq++
        };

        this.socketClient.sendInput(input);
    }

    reconcile(state) {
        // Simple Snap to Server for now
        this.setPosition(state.x, state.y);

        // Update visual state based on server provided velocity/facing? 
        // Or reconstruct from history?
        // Using server facing directly for now
        if (state.facing) {
            let f = state.facing.toUpperCase();
            this.facing = f;
        }
    }
}
