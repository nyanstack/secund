
import { io } from "socket.io-client";

export class SocketClient {
    constructor() {
        this.socket = null;
        this.isConnected = false;
        this.callbacks = {};
    }

    connect(url) {
        this.socket = io(url);

        this.socket.on('connect', () => {
            console.log('SocketClient: Connected to', url);
            this.isConnected = true;
            if (this.callbacks['connect']) this.callbacks['connect']();
        });

        this.socket.on('disconnect', () => {
            console.log('SocketClient: Disconnected');
            this.isConnected = false;
            if (this.callbacks['disconnect']) this.callbacks['disconnect']();
        });

        // Forward server events
        this.socket.on('room-joined', (data) => this.emit('room-joined', data));
        this.socket.on('server-update', (data) => this.emit('server-update', data));
        this.socket.on('enemy-killed', (id) => this.emit('enemy-killed', id));
    }

    on(event, callback) {
        this.callbacks[event] = callback;
    }

    emit(event, data) {
        if (this.callbacks[event]) this.callbacks[event](data);
    }

    joinRoom(roomId) {
        if (this.socket) this.socket.emit('join-room', roomId);
    }

    sendInput(input) {
        if (this.socket) this.socket.emit('player-input', input);
    }
}
