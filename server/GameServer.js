
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
        }

        // Init player
        room.players[socket.id] = new PlayerState(socket.id, 100 + Math.random() * 50, 400);

        // Send init data
        socket.emit('room-joined', {
            roomId: roomId,
            seed: room.seed,
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

        // Bullets vs Enemies
        for (const b of room.bullets) {
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
            const eBounds = e.getBounds();
            for (const p of Object.values(room.players)) {
                if (p.dead) continue;
                if (rectOverlap(eBounds, p.getBounds())) {
                    p.takeDamage(1);
                    // Push player back slightly?
                }
            }
        }
    }
}
