const { v4: uuidv4 } = require('crypto');

class UserManager {
    constructor() {
        this.users = new Map(); // userId -> userData
        this.socketToUser = new Map(); // socketId -> userId
    }

    // Generate a unique user ID
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    // Get or create user from cookie
    getUserFromCookie(cookies) {
        let userId = cookies.userId;
        
        if (!userId) {
            userId = this.generateUserId();
        }

        // Get or create user data
        if (!this.users.has(userId)) {
            this.users.set(userId, {
                id: userId,
                name: cookies.userName || 'Anonymous',
                currentRoom: cookies.currentRoom || null,
                lastSeen: new Date(),
                socketId: null
            });
        }

        return this.users.get(userId);
    }

    // Update user's current room
    updateUserRoom(userId, roomId) {
        if (this.users.has(userId)) {
            const user = this.users.get(userId);
            user.currentRoom = roomId;
            user.lastSeen = new Date();
        }
    }

    // Associate socket with user
    associateSocket(userId, socketId) {
        if (this.users.has(userId)) {
            const user = this.users.get(userId);
            user.socketId = socketId;
            user.lastSeen = new Date();
            this.socketToUser.set(socketId, userId);
        }
    }

    // Get user by socket ID
    getUserBySocket(socketId) {
        const userId = this.socketToUser.get(socketId);
        return userId ? this.users.get(userId) : null;
    }

    // Get user by user ID
    getUserById(userId) {
        return this.users.get(userId);
    }

    // Disconnect user
    disconnectUser(socketId) {
        const userId = this.socketToUser.get(socketId);
        if (userId && this.users.has(userId)) {
            const user = this.users.get(userId);
            user.socketId = null;
            user.lastSeen = new Date();
        }
        this.socketToUser.delete(socketId);
    }

    // Get user's current room
    getUserCurrentRoom(userId) {
        const user = this.users.get(userId);
        return user ? user.currentRoom : null;
    }

    // Update user name
    updateUserName(userId, name) {
        if (this.users.has(userId)) {
            const user = this.users.get(userId);
            user.name = name;
            user.lastSeen = new Date();
        }
    }

    // Get all users in a room
    getUsersInRoom(roomId) {
        const usersInRoom = [];
        for (const [userId, user] of this.users) {
            if (user.currentRoom === roomId) {
                usersInRoom.push(user);
            }
        }
        return usersInRoom;
    }

    // Clean up old users (optional - for memory management)
    cleanupOldUsers(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
        const now = new Date();
        for (const [userId, user] of this.users) {
            if (now - user.lastSeen > maxAge && !user.socketId) {
                this.users.delete(userId);
            }
        }
    }

    // Get user statistics
    getUserStats() {
        return {
            totalUsers: this.users.size,
            connectedUsers: Array.from(this.users.values()).filter(u => u.socketId).length,
            rooms: new Set(Array.from(this.users.values()).map(u => u.currentRoom).filter(Boolean)).size
        };
    }
}

module.exports = new UserManager();
