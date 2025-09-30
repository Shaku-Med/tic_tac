class RoomListManager {
    constructor() {
        this.rooms = [];
        this.refreshInterval = null;
        this.isVisible = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        const refreshBtn = document.getElementById('btn-refresh-rooms');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshRooms();
            });
        }
    }

    // Show room list
    show() {
        const roomListDiv = document.getElementById('available-rooms');
        if (roomListDiv) {
            roomListDiv.style.display = 'block';
            this.isVisible = true;
            this.refreshRooms();
            this.startAutoRefresh();
        }
    }

    // Hide room list
    hide() {
        const roomListDiv = document.getElementById('available-rooms');
        if (roomListDiv) {
            roomListDiv.style.display = 'none';
            this.isVisible = false;
            this.stopAutoRefresh();
        }
    }

    // Fetch rooms from server
    async fetchRooms() {
        try {
            const response = await fetch('/api/rooms');
            if (!response.ok) {
                throw new Error('Failed to fetch rooms');
            }
            const rooms = await response.json();
            return rooms;
        } catch (error) {
            console.error('Error fetching rooms:', error);
            return [];
        }
    }

    // Refresh room list
    async refreshRooms() {
        if (!this.isVisible) return;

        const roomsListDiv = document.getElementById('rooms-list');
        if (!roomsListDiv) return;

        // Show loading state
        roomsListDiv.innerHTML = `
            <div class="loading-rooms">
                <i class="fas fa-spinner fa-spin"></i> Loading rooms...
            </div>
        `;

        try {
            const rooms = await this.fetchRooms();
            this.rooms = rooms;
            this.renderRooms(rooms);
        } catch (error) {
            roomsListDiv.innerHTML = `
                <div class="no-rooms">
                    <i class="fas fa-exclamation-triangle"></i>
                    <div>Failed to load rooms</div>
                </div>
            `;
        }
    }

    // Render rooms in the list
    renderRooms(rooms) {
        const roomsListDiv = document.getElementById('rooms-list');
        if (!roomsListDiv) return;

        if (rooms.length === 0) {
            roomsListDiv.innerHTML = `
                <div class="no-rooms">
                    <i class="fas fa-door-open"></i>
                    <div>No rooms available</div>
                    <div style="font-size: 0.875rem; margin-top: 0.5rem; opacity: 0.7;">
                        Create a room to get started!
                    </div>
                </div>
            `;
            return;
        }

        const roomsHTML = rooms.map(room => this.createRoomHTML(room)).join('');
        roomsListDiv.innerHTML = roomsHTML;

        // Add click listeners to join buttons
        this.addJoinListeners();
    }

    // Create HTML for a single room
    createRoomHTML(room) {
        const isFull = room.playerCount >= room.maxPlayers;
        const canJoin = !isFull && room.status === 'waiting';
        
        return `
            <div class="room-item ${isFull ? 'full' : ''}" data-room-id="${room.id}">
                <div class="room-info">
                    <div class="room-id">Room ${room.id}</div>
                    <div class="room-creator">Created by ${room.creator_name}</div>
                </div>
                <div class="room-status">
                    <div class="room-players">
                        <i class="fas fa-users"></i>
                        <span>${room.playerCount}/${room.maxPlayers}</span>
                    </div>
                    <button class="join-room-btn" 
                            data-room-id="${room.id}" 
                            ${!canJoin ? 'disabled' : ''}>
                        ${isFull ? 'Full' : 'Join'}
                    </button>
                </div>
            </div>
        `;
    }

    // Add event listeners to join buttons
    addJoinListeners() {
        const joinButtons = document.querySelectorAll('.join-room-btn');
        joinButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const roomId = button.getAttribute('data-room-id');
                if (roomId && !button.disabled) {
                    this.joinRoom(roomId);
                }
            });
        });

        // Add click listeners to room items
        const roomItems = document.querySelectorAll('.room-item');
        roomItems.forEach(item => {
            item.addEventListener('click', () => {
                const roomId = item.getAttribute('data-room-id');
                if (roomId && !item.classList.contains('full')) {
                    this.joinRoom(roomId);
                }
            });
        });
    }

    // Join a room
    joinRoom(roomId) {
        // Fill in the room ID input
        const roomIdInput = document.getElementById('room-id');
        if (roomIdInput) {
            roomIdInput.value = roomId;
        }

        // Trigger join room if multiplayer game is connected
        if (typeof multiplayerGame !== 'undefined' && multiplayerGame.connected) {
            const playerName = document.getElementById('player-name').value.trim() || 
                             (multiplayerGame.playerName || 'Player');
            
            if (playerName) {
                multiplayerGame.joinRoom(roomId, playerName);
            }
        } else {
            // Show message to connect first
            if (typeof multiplayerGame !== 'undefined') {
                multiplayerGame.showConnectionStatus('Please connect first', 'warning');
            }
        }
    }

    // Start auto-refresh
    startAutoRefresh() {
        this.stopAutoRefresh(); // Clear any existing interval
        this.refreshInterval = setInterval(() => {
            this.refreshRooms();
        }, 5000); // Refresh every 5 seconds
    }

    // Stop auto-refresh
    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    // Update room list when rooms change
    updateRooms(rooms) {
        this.rooms = rooms;
        if (this.isVisible) {
            this.renderRooms(rooms);
        }
    }

    // Get current rooms
    getRooms() {
        return this.rooms;
    }
}

// Global room list manager instance
const roomListManager = new RoomListManager();
