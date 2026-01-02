
import { Player } from './Player';

export class RemotePlayer extends Player {
    constructor(scene, x, y) {
        super(scene, x, y);
        this.setTint(0xaaaaaa); // Distinguish remote players slightly?
    }

    updateState(state) {
        // Interpolate or Snap
        // For simplicity: Snap
        this.setPosition(state.x, state.y);

        if (state.facing) {
            this.facing = state.facing.toUpperCase();
        }
    }
}
