class CookieManager {
    constructor() {
        this.userId = this.getCookie('userId');
        this.userName = this.getCookie('userName');
        this.currentRoom = this.getCookie('currentRoom');
    }

    // Set a cookie
    setCookie(name, value, days = 30) {
        const expires = new Date();
        expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
        document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires.toUTCString()};path=/`;
    }

    // Get a cookie
    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }

    // Delete a cookie
    deleteCookie(name) {
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    }

    // Generate a unique user ID
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    }

    // Initialize user
    initializeUser() {
        if (!this.userId) {
            this.userId = this.generateUserId();
            this.setCookie('userId', this.userId);
        }
        
        if (!this.userName) {
            this.userName = 'Player' + Math.floor(Math.random() * 1000);
            this.setCookie('userName', this.userName);
        }
    }

    // Update user name
    updateUserName(name) {
        this.userName = name;
        this.setCookie('userName', name);
    }

    // Set current room
    setCurrentRoom(roomId) {
        this.currentRoom = roomId;
        if (roomId) {
            this.setCookie('currentRoom', roomId);
        } else {
            this.deleteCookie('currentRoom');
        }
    }

    // Clear current room
    clearCurrentRoom() {
        this.currentRoom = null;
        this.deleteCookie('currentRoom');
    }

    // Get user info
    getUserInfo() {
        return {
            userId: this.userId,
            userName: this.userName,
            currentRoom: this.currentRoom
        };
    }

    // Check if user has a current room
    hasCurrentRoom() {
        return this.currentRoom !== null;
    }

    // Resume game from current room
    async resumeGame() {
        if (!this.hasCurrentRoom()) {
            return null;
        }

        try {
            const response = await fetch('/api/user/current-room');
            const data = await response.json();
            
            if (data.hasRoom) {
                return data;
            } else {
                // Room no longer exists, clear it
                this.clearCurrentRoom();
                return null;
            }
        } catch (error) {
            console.error('Error resuming game:', error);
            return null;
        }
    }
}

// Global cookie manager instance
const cookieManager = new CookieManager();
