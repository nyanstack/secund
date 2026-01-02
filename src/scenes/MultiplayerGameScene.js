
import Phaser from 'phaser';
import { SocketClient } from '../net/SocketClient';
import { LocalPlayer } from '../objects/LocalPlayer';
import { RemotePlayer } from '../objects/RemotePlayer';

export class MultiplayerGameScene extends Phaser.Scene {
    constructor() {
        super('MultiplayerGameScene');
        this.socket = null;
        this.players = {}; // id -> Player object (Local or Remote)
        this.enemies = {}; // id -> Sprite
        this.bullets = {}; // id -> Sprite

        this.localPlayerId = null;
        this.mapGenerated = false;
    }

    create() {
        console.log('MultiplayerGameScene: Starting...');

        // 1. Connect
        this.socket = new SocketClient();
        this.socket.connect('http://localhost:3001'); // Assuming local dev

        this.socket.on('connect', () => {
            console.log('Connected to server!');
            this.socket.joinRoom('default-room');
        });

        this.socket.on('room-joined', (data) => {
            console.log('Joined Room:', data);
            this.localPlayerId = this.socket.socket.id;
            this.createGridObstacles(data.seed);
            this.mapGenerated = true;

            // Spawn Existing Players (including self, initially as Remote? No, server sends all)
            // Actually, for authoritative, we spawn LocalPlayer for self
            this.updatePlayers(data.players);
        });

        this.socket.on('server-update', (data) => {
            if (!this.mapGenerated) return;
            this.updatePlayers(data.players);
            this.updateEnemies(data.enemies);
            this.updateBullets(data.bullets);
        });

        // Setup Inputs
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // UI
        this.add.text(10, 10, 'MULTIPLAYER MODE', { fontSize: '16px', fill: '#0f0' });
    }

    update(time, delta) {
        if (!this.mapGenerated) return;

        // Local Player Update (Send Inputs)
        if (this.localPlayerId && this.players[this.localPlayerId]) {
            this.players[this.localPlayerId].update(time, delta);
        }
    }

    updatePlayers(serverPlayers) {
        // 1. Remove missing
        for (const id in this.players) {
            if (!serverPlayers[id]) {
                this.players[id].destroy();
                delete this.players[id];
            }
        }

        // 2. Add/Update
        for (const id in serverPlayers) {
            const data = serverPlayers[id];

            if (!this.players[id]) {
                // New Player
                if (id === this.localPlayerId) {
                    this.players[id] = new LocalPlayer(this, data.x, data.y, this.socket);
                    this.players[id].setupKeys(this.wasd);
                } else {
                    this.players[id] = new RemotePlayer(this, data.x, data.y);
                }
            }

            // Sync State
            if (id === this.localPlayerId) {
                this.players[id].reconcile(data);
            } else {
                this.players[id].updateState(data);
            }
        }
    }

    updateEnemies(serverEnemies) {
        // Remove missing
        for (const id in this.enemies) {
            if (!serverEnemies[id]) {
                this.enemies[id].destroy();
                delete this.enemies[id];
            }
        }
        // Add/Update
        for (const id in serverEnemies) {
            const data = serverEnemies[id];
            if (!this.enemies[id]) {
                this.enemies[id] = this.add.sprite(data.x, data.y, 'enemy');
                this.enemies[id].setDisplaySize(48, 48);
            }
            this.enemies[id].setPosition(data.x, data.y);
            // Visuals? Tint?
            if (data.active === false) this.enemies[id].setVisible(false); // Should be removed instead?
        }
    }

    updateBullets(serverBullets) {
        // Server sends array, but we need ID mapping to avoid destroying/creating every frame
        // Assuming server bullets have ID
        const activeIds = new Set();

        for (const data of serverBullets) {
            activeIds.add(data.id);
            if (!this.bullets[data.id]) {
                // Create
                // Use texture 'bullet' - assume created in GameScene or Preloader
                // But this scene is separate. Need to create texture?
                // Reuse the primitive creation from GameScene?
                if (!this.textures.exists('bullet')) {
                    const graphics = this.make.graphics({ x: 0, y: 0, add: false });
                    graphics.fillStyle(0xffffff);
                    graphics.fillRect(0, 0, 8, 8);
                    graphics.generateTexture('bullet', 8, 8);
                }

                this.bullets[data.id] = this.add.image(data.x, data.y, 'bullet');
            }
            this.bullets[data.id].setPosition(data.x, data.y);
        }

        // Cleanup
        for (const id in this.bullets) {
            // Need to convert id to number if stored strings, or just loose equality
            // serverBullets is array. activeIds has it.
            if (!activeIds.has(Number(id)) && !activeIds.has(String(id))) { // Safety for types
                this.bullets[id].destroy();
                delete this.bullets[id];
            }
        }
    }

    createGridObstacles(seed) {
        //seeded random
        const seededRandom = (s) => {
            return function () {
                s = Math.sin(s) * 10000;
                return s - Math.floor(s);
            };
        };
        const rng = seededRandom(seed);

        const GRID_SIZE = 64;
        const COLS = Math.floor(1280 / GRID_SIZE); // 20
        const ROWS = Math.floor(720 / GRID_SIZE); // 11
        const SAFETY_COLS = 3;

        // Simplified Generation: Just Random for now, skipping flood fill validation for simplicity in MP demo
        // (Assuming server validated it or we just trust random)
        // User requirements: "Server generates map seed. Clients generate map locally using seed."
        // We will just generate obstacles.

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (x < SAFETY_COLS) continue;

                if (rng() < 0.20) {
                    const posX = x * GRID_SIZE + GRID_SIZE / 2;
                    const posY = y * GRID_SIZE + GRID_SIZE / 2;

                    // Visual only? Or Physical?
                    // Server handles physics. We just render walls.
                    // But walls need to be visible.
                    this.createCompositeBlock(posX, posY, GRID_SIZE);
                }
            }
        }
    }

    createCompositeBlock(centerX, centerY, size) {
        const subSize = 16;
        const tilesPerSide = size / subSize;
        const startX = centerX - (size / 2) + (subSize / 2);
        const startY = centerY - (size / 2) + (subSize / 2);

        for (let r = 0; r < tilesPerSide; r++) {
            for (let c = 0; c < tilesPerSide; c++) {
                const tx = startX + c * subSize;
                const ty = startY + r * subSize;
                const tile = this.add.rectangle(tx, ty, subSize, subSize, 0x666666);
                tile.setStrokeStyle(1, 0x444444);
            }
        }
    }
}
