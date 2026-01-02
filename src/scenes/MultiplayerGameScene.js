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

        // Physics group for walls
        this.obstacles = null;
    }

    create() {
        console.log('MultiplayerGameScene: Starting...');

        // 1. Setup UI (so it's ready for status updates)
        this.statusText = this.add.text(10, 10, 'MULTIPLAYER MODE: Connecting...', { fontSize: '16px', fill: '#ffff00' });

        // 2. Setup Inputs (so they are ready for player creation)
        this.wasd = this.input.keyboard.addKeys({
            up: Phaser.Input.Keyboard.KeyCodes.W,
            down: Phaser.Input.Keyboard.KeyCodes.S,
            left: Phaser.Input.Keyboard.KeyCodes.A,
            right: Phaser.Input.Keyboard.KeyCodes.D
        });

        // 3. Setup Physics
        this.obstacles = this.physics.add.staticGroup();
        this.enemiesGroup = this.physics.add.group(); // Group for enemy bodies

        // 4. Connect
        this.socket = new SocketClient();
        const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
        this.socket.connect(serverUrl);

        this.socket.on('connect', () => {
            console.log('Connected to server!');
            this.statusText.setText('MULTIPLAYER MODE: Connected');
            this.statusText.setFill('#00ff00');
            this.socket.joinRoom('default-room');
        });

        this.socket.on('room-joined', (data) => {
            console.log('Joined Room:', data);
            this.localPlayerId = this.socket.socket.id;
            this.createObstaclesFromList(data.obstacles);
            this.mapGenerated = true;

            // Spawn Existing Players
            this.updatePlayers(data.players);
        });

        this.socket.on('server-update', (data) => {
            if (!this.mapGenerated) return;
            this.updatePlayers(data.players);
            this.updateEnemies(data.enemies);
            this.updateBullets(data.bullets);
        });
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

                // Ensure Physics Collision with Static Group and Enemies
                if (!this.players[id].hasCollider) {
                    this.physics.add.collider(this.players[id], this.obstacles);
                    this.physics.add.collider(this.players[id], this.enemiesGroup);
                    this.players[id].hasCollider = true;
                }
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
                const enemy = this.add.sprite(data.x, data.y, 'enemy');
                enemy.setDisplaySize(48, 48);
                this.physics.add.existing(enemy); // Enable physics body
                enemy.body.setSize(48, 48);
                enemy.body.setImmovable(true); // Immovable: Player cannot push them, acts as solid wall
                this.enemiesGroup.add(enemy);
                this.enemies[id] = enemy;
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
            if (!activeIds.has(Number(id)) && !activeIds.has(String(id))) {
                this.bullets[id].destroy();
                delete this.bullets[id];
            }
        }
    }

    createObstaclesFromList(obstacles) {
        if (!obstacles) return;

        for (const obs of obstacles) {
            const centerX = obs.x + obs.width / 2;
            const centerY = obs.y + obs.height / 2;

            this.createCompositeBlock(centerX, centerY, obs.width);
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

                // Add to physics group
                this.obstacles.add(tile);
            }
        }
    }
}
