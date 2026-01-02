import { Player } from './Player';
import Phaser from 'phaser';

export class LocalPlayer extends Player {
    constructor(scene, x, y, socketClient) {
        super(scene, x, y);
        this.socketClient = socketClient;
        this.inputSeq = 0;
        this.speed = 160; // Match server/singleplayer speed

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

        // Client-Side Prediction: Move immediately
        this.handleMovement();

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

    handleMovement() {
        let vx = 0;
        let vy = 0;

        if (this.keys.up.isDown) {
            vy = -this.speed;
        } else if (this.keys.down.isDown) {
            vy = this.speed;
        }

        // Manhattan Logic: Only move horizontally if not moving vertically
        if (vy === 0) {
            if (this.keys.left.isDown) {
                vx = -this.speed;
            } else if (this.keys.right.isDown) {
                vx = this.speed;
            }
        }

        this.setVelocity(vx, vy);

        // Update Facing
        if (vy < 0) this.facing = 'UP';
        else if (vy > 0) this.facing = 'DOWN';
        else if (vx < 0) this.facing = 'LEFT';
        else if (vx > 0) this.facing = 'RIGHT';

        // Update State (for visuals if we had them)
        if (vx !== 0 || vy !== 0) {
            this.state = 'WALK';
        } else {
            this.state = 'IDLE';
        }
    }

    reconcile(state) {
        // Reconciliation: Only snap if error is large
        const dx = this.x - state.x;
        const dy = this.y - state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Tolerance threshold (e.g. 24px - half a player width)
        if (dist > 24) {
            this.setPosition(state.x, state.y);
        }

        // If we are predicting, we generally trust local facing unless snapped
        if (state.facing) {
            // Optional: Snap facing if needed, but local input usually authoritative for proper feel
        }
    }
}
