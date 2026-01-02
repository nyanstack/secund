import { io } from 'socket.io-client';

class SocketService {
    constructor() {
        // Assume localhost for dev, allow config for prod
        // In real deploy, this URL should be dynamic
        this.socket = io('http://localhost:3000');
    }

    on(event, callback) {
        this.socket.on(event, callback);
    }

    emit(event, data) {
        this.socket.emit(event, data);
    }

    get id() {
        return this.socket.id;
    }
}

export const socketService = new SocketService();
