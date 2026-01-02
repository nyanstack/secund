
import { PlayerState } from './PlayerState.js';
import { BulletState } from './BulletState.js';
import { EnemyState } from './EnemyState.js';

export class GameServer {
    constructor(io) {
        this.io = io;
        this.rooms = new Map();

        this.io.on('connection', (socket) => {
            console.log('Player connected:', socket.id);

            socket.on('join-room', (roomId) => {
                this.joinRoom(socket, roomId);
            });

            socket.on('player-input', (input) => {
                this.handleInput(socket, input);
            });

            socket.on('disconnect', () => {
                this.leaveRoom(socket);
            });
        });

        // Loop
        setInterval(() => this.update(), 1000 / 30); // 30 TPS
    }

    joinRoom(socket, roomId) {
        socket.join(roomId);
        let room = this.rooms.get(roomId);
        if (!room) {
            room = {
                id: roomId,
                players: {},
                enemies: {},
                bullets: [],
                seed: Math.floor(Math.random() * 100000),
                lastEnemyId: 0,
                lastBulletId: 0,
                stageTimer: 0
            };
            this.rooms.set(roomId, room);
            // Spawn initial enemies?
            this.spawnEnemies(room, 5);
            // Generate obstacles immediately
            room.obstacles = this.generateObstacles(room.seed);
        }

        // Init player
        room.players[socket.id] = new PlayerState(socket.id, 100 + Math.random() * 50, 400);

        // Send init data
        // Send init data
        socket.emit('room-joined', {
            roomId: roomId,
            seed: room.seed,
            obstacles: room.obstacles, // Send generated obstacles
            players: room.players // Send current players
        });
    }

    leaveRoom(socket) {
        // Find room
        for (const [roomId, room] of this.rooms) {
            if (room.players[socket.id]) {
                delete room.players[socket.id];
                if (Object.keys(room.players).length === 0) {
                    this.rooms.delete(roomId);
                }
                break;
            }
        }
    }

    handleInput(socket, input) {
        for (const room of this.rooms.values()) {
            if (room.players[socket.id]) {
                const player = room.players[socket.id];
                player.processInput(input);

                if (input.shoot) {
                    this.spawnBullet(room, player.id, player.x, player.y, player.facing, 'player');
                }
                break;
            }
        }
    }

    spawnBullet(room, ownerId, x, y, dir, type) {
        const id = ++room.lastBulletId;
        // Bullet spawn offset
        let bx = x;
        let by = y;
        const offset = 20;
        if (dir === 'left') bx -= offset;
        else if (dir === 'right') bx += offset;
        else if (dir === 'up') by -= offset;
        else if (dir === 'down') by += offset;

        const bullet = new BulletState(id, ownerId, bx, by, dir, type);
        room.bullets.push(bullet);
    }

    spawnEnemies(room, count) {
        for (let i = 0; i < count; i++) {
            const id = ++room.lastEnemyId;
            const ex = 600 + Math.random() * 600;
            const ey = 100 + Math.random() * 500;
            room.enemies[id] = new EnemyState(id, ex, ey);
        }
    }

    update() {
        const delta = 1000 / 30;

        for (const room of this.rooms.values()) {
            // Update Players
            for (const p of Object.values(room.players)) {
                p.update(delta);
            }

            // Update Enemies
            for (const e of Object.values(room.enemies)) {
                e.update(delta, room.players);
            }

            // Update Bullets
            for (let i = room.bullets.length - 1; i >= 0; i--) {
                const b = room.bullets[i];
                b.update(delta);
                if (!b.active) {
                    room.bullets.splice(i, 1);
                }
            }

            // check collisions
            this.checkCollisions(room);

            // Broadcast State
            this.io.to(room.id).emit('server-update', {
                players: room.players,
                enemies: room.enemies,
                bullets: room.bullets
            });
        }
    }

    checkCollisions(room) {
        // Simple AABB
        const rectOverlap = (r1, r2) => {
            return r1.x < r2.x + r2.width &&
                r1.x + r1.width > r2.x &&
                r1.y < r2.y + r2.height &&
                r1.height + r1.y > r2.y;
        };

        // Helper for Entity-Entity (Center-Center)
        const resolveEntityCollision = (e1, e2) => {
            const dx = e1.x - e2.x;
            const dy = e1.y - e2.y;
            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Combined sizes
            const halfWidths = (e1.width / 2) + (e2.width / 2);
            const halfHeights = (e1.height / 2) + (e2.height / 2);

            if (absDx < halfWidths && absDy < halfHeights) {
                const penX = halfWidths - absDx;
                const penY = halfHeights - absDy;

                if (penX < penY) {
                    // Resolve X
                    const push = penX / 2;
                    if (dx > 0) {
                        e1.x += push;
                        e2.x -= push;
                    } else {
                        e1.x -= push;
                        e2.x += push;
                    }
                } else {
                    // Resolve Y
                    const push = penY / 2;
                    if (dy > 0) {
                        e1.y += push;
                        e2.y -= push;
                    } else {
                        e1.y -= push;
                        e2.y += push;
                    }
                }
            }
        };

        // Cache obstacles if not already done
        if (!room.obstacles) {
            room.obstacles = this.generateObstacles(room.seed);
        }

        // --- 1. Entity vs Obstacle Collisions ---

        const resolveCollision = (entity, wall) => {
            const halfWidthE = entity.width / 2;
            const halfHeightE = entity.height / 2;
            const halfWidthW = wall.width / 2;
            const halfHeightW = wall.height / 2;

            const centerEx = entity.x; // Entity x is center
            const centerEy = entity.y; // Entity y is center
            const centerWx = wall.x + halfWidthW; // Wall x is top-left
            const centerWy = wall.y + halfHeightW; // Wall y is top-left

            const dx = centerEx - centerWx;
            const dy = centerEy - centerWy;

            const absDx = Math.abs(dx);
            const absDy = Math.abs(dy);

            // Calculate penetration
            // if absDx < (halfWidthE + halfWidthW) -> collision on X
            const penetrationX = (halfWidthE + halfWidthW) - absDx;
            const penetrationY = (halfHeightE + halfHeightW) - absDy;

            if (penetrationX < penetrationY) {
                // Resolve X
                if (dx > 0) entity.x += penetrationX;
                else entity.x -= penetrationX;
            } else {
                // Resolve Y
                if (dy > 0) entity.y += penetrationY;
                else entity.y -= penetrationY;
            }
        };

        // Players vs Obstacles
        for (const p of Object.values(room.players)) {
            if (p.dead) continue;
            const pBounds = p.getBounds();
            for (const wall of room.obstacles) {
                if (rectOverlap(pBounds, wall)) {
                    resolveCollision(p, wall);
                }
            }
        }

        // Enemies vs Obstacles
        for (const e of Object.values(room.enemies)) {
            if (!e.active) continue;
            const eBounds = e.getBounds();
            for (const wall of room.obstacles) {
                if (rectOverlap(eBounds, wall)) {
                    resolveCollision(e, wall);
                }
            }
        }

        // Bullets vs Obstacles
        for (const b of room.bullets) {
            if (!b.active) continue;
            const bBounds = b.getBounds();
            for (const wall of room.obstacles) {
                if (rectOverlap(bBounds, wall)) {
                    b.active = false;
                    break;
                }
            }
        }

        // --- 2. Entity vs Entity Collisions ---

        // Bullets vs Enemies
        for (const b of room.bullets) {
            if (!b.active) continue;
            if (b.type === 'player') {
                const bBounds = b.getBounds();
                for (const e of Object.values(room.enemies)) {
                    if (!e.active) continue;
                    if (rectOverlap(bBounds, e.getBounds())) {
                        e.takeDamage(1);
                        b.active = false;
                        if (!e.active) {
                            // Handle kill
                            this.io.to(room.id).emit('enemy-killed', e.id);
                            delete room.enemies[e.id];
                            // Respawn?
                            this.spawnEnemies(room, 1);
                        }
                        break;
                    }
                }
            }
        }

        // Enemies vs Players
        for (const e of Object.values(room.enemies)) {
            if (!e.active) continue;

            for (const p of Object.values(room.players)) {
                if (p.dead) continue;

                // Use Center-Center resolution so BOTH get pushed apart
                // This prevents the enemy from "bulldozing" the player and causing jitter
                resolveEntityCollision(p, e);
            }
        }



        // Enemies vs Enemies (Prevent Overlap)
        const enemyList = Object.values(room.enemies);
        for (let i = 0; i < enemyList.length; i++) {
            const e1 = enemyList[i];
            if (!e1.active) continue;

            for (let j = i + 1; j < enemyList.length; j++) {
                const e2 = enemyList[j];
                if (!e2.active) continue;

                resolveEntityCollision(e1, e2);
            }
        }
    }

    generateObstacles(seed) {
        // Duplicate logic/constants from client for now
        // Ideally share code (e.g. common/MapGenerator.js), but inline is faster for now.
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

        const obstacles = [];

        for (let y = 0; y < ROWS; y++) {
            for (let x = 0; x < COLS; x++) {
                if (x < SAFETY_COLS) continue;

                if (rng() < 0.20) {
                    const posX = x * GRID_SIZE + GRID_SIZE / 2;
                    const posY = y * GRID_SIZE + GRID_SIZE / 2;

                    // Create bounding box for collision
                    // Size is GRID_SIZE
                    obstacles.push({
                        x: posX - GRID_SIZE / 2,
                        y: posY - GRID_SIZE / 2,
                        width: GRID_SIZE,
                        height: GRID_SIZE
                    });
                }
            }
        }
        return obstacles;
    }
}
