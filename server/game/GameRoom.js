const { Player } = require('../entities/Player');
const { Enemy } = require('../entities/Enemy');
const { Bullet } = require('../entities/Bullet');
const { MathUtils } = require('../utils/math');

class GameRoom {
    constructor(io) {
        this.io = io;
        this.players = {};
        this.enemies = {};
        this.bullets = {};
        this.map = []; // Grid 
        this.obstacles = []; // Rectangles {x, y, w, h}

        // IDs
        this.enemyIdCounter = 0;
        this.bulletIdCounter = 0;

        // Config
        this.enemySpawnTimer = 0;
        this.generateMap();
    }

    generateMap() {
        // Simple map generation for testing
        // 20% obstacles
        const rows = Math.floor(720 / 64);
        const cols = Math.floor(1280 / 64);

        for (let y = 0; y < rows; y++) {
            const row = [];
            for (let x = 0; x < cols; x++) {
                if (x < 3) {
                    row.push(0); // Safe zone
                    continue;
                }
                const isObs = Math.random() < 0.2;
                row.push(isObs ? 1 : 0);

                if (isObs) {
                    this.obstacles.push({
                        x: x * 64 + 32, // Check center vs corner logic. Phaser rectangles are usually center. 
                        y: y * 64 + 32,
                        width: 64,
                        height: 64
                    });
                }
            }
            this.map.push(row);
        }
    }

    addPlayer(socket) {
        this.players[socket.id] = new Player(socket.id, 100, 300);

        // Send initial state + map
        socket.emit('mapData', {
            grid: this.map,
            obstacles: this.obstacles
        });
    }

    removePlayer(id) {
        delete this.players[id];
    }

    handleInput(id, input) {
        if (this.players[id]) {
            this.players[id].input = input; // { up, down, left, right, shoot }

            // Handle shoot instantly or in update?
            if (input.shoot) {
                this.tryShoot(this.players[id], 'player');
            }
        }
    }

    tryShoot(entity, type) {
        if (entity.attackCooldown > 0) return;

        entity.attackCooldown = 0.5; // 500ms

        // Spawn bullet
        const id = this.bulletIdCounter++;
        let dir = entity.facing;

        // If entity is Enemy, facing might be deduced or passed.
        // For Player, it's stored.
        if (!dir) dir = 'down';

        // Offset
        let startX = entity.x;
        let startY = entity.y;

        if (dir === 'left') startX -= 30;
        if (dir === 'right') startX += 30;
        if (dir === 'up') startY -= 30;
        if (dir === 'down') startY += 30;

        const bullet = new Bullet(id, startX, startY, dir, type, entity.id);
        this.bullets[id] = bullet;
    }

    update() {
        const delta = 1 / 60; // 60 FPS fixed

        // update players
        for (const id in this.players) {
            const p = this.players[id];
            p.update(delta);

            // Check invulnerable expiry
            if (p.isInvulnerable && Date.now() > p.invulnerableUntil) {
                p.isInvulnerable = false;
            }
        }

        // update enemies
        this.enemySpawnTimer += delta;
        if (this.enemySpawnTimer > 3 && Object.keys(this.enemies).length < 5) { // Spawn every 3s up to 5
            this.enemySpawnTimer = 0;
            this.spawnEnemy();
        }

        for (const id in this.enemies) {
            const e = this.enemies[id];
            e.update(delta, this.players, this.map);

            if (e.hp <= 0) {
                delete this.enemies[id];
                this.io.emit('enemyKilled', id); // Event for effects
                continue;
            }

            // Ai Shoot logic request
            // const dist = ... ; if close & aligned -> shoot. 
            // Simplified: if e.attackCooldown <= 0, tryShoot.
            // But Enemy.js has complex shoot logic.
        }

        // update bullets
        for (const id in this.bullets) {
            const b = this.bullets[id];
            b.update(delta);

            if (!b.isActive) {
                delete this.bullets[id];
                continue;
            }

            // Collision: Bullet vs Players
            if (b.ownerType === 'enemy') {
                for (const pid in this.players) {
                    const p = this.players[pid];
                    if (this.checkOverlap(b, p)) {
                        p.takeDamage(1);
                        b.isActive = false;
                        delete this.bullets[id];
                        break;
                    }
                }
            }

            // Collision: Bullet vs Enemies
            if (b.ownerType === 'player') {
                for (const eid in this.enemies) {
                    const e = this.enemies[eid];
                    if (this.checkOverlap(b, e)) {
                        e.takeDamage(1);
                        b.isActive = false;
                        delete this.bullets[id];
                        break;
                    }
                }
            }

            // Collision: Bullet vs Obstacles
            for (const obs of this.obstacles) {
                if (this.checkOverlap(b, obs)) {
                    b.isActive = false;
                    delete this.bullets[id];
                    break;
                }
            }
        }

        // Broadcast State
        this.io.emit('stateUpdate', {
            players: this.players,
            enemies: this.enemies,
            bullets: this.bullets
        });
    }

    spawnEnemy() {
        const id = this.enemyIdCounter++;
        // Random pos
        const x = MathUtils.Between(50, 1200);
        const y = MathUtils.Between(50, 650);
        this.enemies[id] = new Enemy(id, x, y);
    }

    checkOverlap(rectA, rectB) {
        // Simple AABB
        // Assuming centered x,y. 
        // objects have width/height or default to small size
        const wA = rectA.width || 8;
        const hA = rectA.height || 8;
        const wB = rectB.width || 48;
        const hB = rectB.height || 48;

        return (rectA.x < rectB.x + wB &&
            rectA.x + wA > rectB.x &&
            rectA.y < rectB.y + hB &&
            rectA.y + hA > rectB.y);
    }
}

module.exports = { GameRoom };
