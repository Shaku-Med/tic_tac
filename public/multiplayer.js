class MultiplayerGame {
    constructor() {
        this.socket = null;
        this.connected = false;
        this.roomId = null;
        this.playerName = null;
        this.playerNumber = null;
        this.playerSymbol = null;
        this.isMyTurn = false;
        this.gameState = null;
        this.userId = null;
    }

    async connect() {
        return new Promise((resolve, reject) => {
            if (!window.appAuth || !appAuth.isAuthed()) {
                this.showConnectionStatus('Please login first', 'warning');
                return reject(new Error('Not authenticated'));
            }
            this.socket = io();
            
            this.socket.on('connect', () => {
                console.log('Connected to server');
                this.connected = true;
                this.updateConnectionIndicator('connected', 'Connected');
                this.showConnectionStatus('Connected to server', 'success');
                resolve();
            });

            this.socket.on('disconnect', () => {
                console.log('Disconnected from server');
                this.connected = false;
                this.updateConnectionIndicator('disconnected', 'Disconnected');
                this.showConnectionStatus('Disconnected from server', 'error');
            });

            this.socket.on('connect_error', (err) => {
                const msg = err && err.message ? err.message : 'Connection failed';
                this.showConnectionStatus(msg, 'error');
                reject(new Error(msg));
            });

            this.socket.on('error', (data) => {
                const message = typeof data === 'string' ? data : (data && data.message) || 'Server error';
                console.error('Server error:', message);
                this.showConnectionStatus(message, 'error');
            });

            this.socket.on('room-joined', (data) => {
                console.log('Joined room:', data);
                this.roomId = data.roomInfo.id;
                this.playerNumber = data.playerNumber;
                this.playerSymbol = data.symbol;
                
                // Set current room in cookies
                cookieManager.setCurrentRoom(this.roomId);
                
                // Initialize game state if game is already playing
                if (data.roomInfo.gameStatus === 'playing') {
                    this.gameState = {
                        board: Array(3).fill().map(() => Array(3).fill(0)),
                        currentPlayer: 1,
                        gameStatus: 'playing',
                        winner: null,
                        moves: []
                    };
                    this.isMyTurn = this.gameState.currentPlayer === this.playerNumber;
                }
                
                this.updateRoomInfo(data.roomInfo);
                this.updateConnectionIndicator('connected', `Room ${this.roomId}`);
                this.showConnectionStatus(`Joined room ${this.roomId} as ${this.playerSymbol}`, 'success');
                this.updateConnectionStatus();
                
                // Hide restart button when joining room
                this.hideRestartButton();
            });

            this.socket.on('room-updated', (roomInfo) => {
                console.log('Room updated:', roomInfo);
                
                // Initialize game state when game starts
                if (roomInfo.gameStatus === 'playing' && !this.gameState) {
                    this.gameState = {
                        board: Array(3).fill().map(() => Array(3).fill(0)),
                        currentPlayer: 1,
                        gameStatus: 'playing',
                        winner: null,
                        moves: []
                    };
                    this.isMyTurn = this.gameState.currentPlayer === this.playerNumber;
                    console.log('Game started - turn setup:', {
                        currentPlayer: this.gameState.currentPlayer,
                        playerNumber: this.playerNumber,
                        isMyTurn: this.isMyTurn
                    });
                }
                
                this.updateRoomInfo(roomInfo);
                this.updateConnectionStatus();
                
                // Hide restart button when game starts
                if (roomInfo.gameStatus === 'playing') {
                    this.hideRestartButton();
                }
            });

            this.socket.on('move-made', (data) => {
                console.log('Move made:', data);
                this.handleMove(data);
            });

            this.socket.on('game-started', (data) => {
                console.log('Game started:', data);
                this.gameState = data.gameState;
                this.isMyTurn = data.currentPlayer === this.playerNumber;
                this.updateGameMessage();
                this.updateConnectionStatus();
                console.log('Game started - turn setup:', {
                    currentPlayer: data.currentPlayer,
                    playerNumber: this.playerNumber,
                    isMyTurn: this.isMyTurn
                });
            });

            this.socket.on('game-restarted', (roomInfo) => {
                console.log('Game restarted:', roomInfo);
                this.handleGameRestart(roomInfo);
            });

            this.socket.on('player-exited', (data) => {
                console.log('Player exited:', data);
                this.showConnectionStatus(data.message, 'warning');
                this.updateRoomInfo(data.roomInfo);
            });

            // Room list updates
            this.socket.on('rooms-updated', (rooms) => {
                console.log('Rooms updated:', rooms);
                if (typeof roomListManager !== 'undefined') {
                    roomListManager.updateRooms(rooms);
                }
            });

            // Timeout for connection
            setTimeout(() => {
                if (!this.connected) {
                    reject(new Error('Connection timeout'));
                }
            }, 5000);
        });
    }

    createRoom(playerName) {
        if (!this.connected) {
            this.showConnectionStatus('Not connected to server', 'error');
            return;
        }

        this.playerName = playerName;
        this.roomId = this.generateRoomId();
        
        this.socket.emit('join-room', {
            roomId: this.roomId,
            playerName: playerName
        });
    }

    joinRoom(roomId, playerName) {
        if (!this.connected) {
            this.showConnectionStatus('Not connected to server', 'error');
            return;
        }

        this.playerName = playerName;
        this.roomId = roomId.toUpperCase();
        
        this.socket.emit('join-room', {
            roomId: this.roomId,
            playerName: playerName
        });
    }

    leaveRoom() {
        if (this.socket && this.roomId) {
            this.socket.emit('leave-room');
            this.roomId = null;
            this.playerNumber = null;
            this.playerSymbol = null;
            this.isMyTurn = false;
            this.gameState = null;
            
            // Clear current room from cookies
            cookieManager.clearCurrentRoom();
            
            // Reset UI
            this.updateConnectionStatus();
            this.hideRoomInfo();
        }
    }

    // Exit room completely (disconnect and leave)
    exitRoom() {
        if (this.socket && this.roomId) {
            // Emit exit-room event to server
            this.socket.emit('exit-room');
            
            // Clear all game state
            this.roomId = null;
            this.playerNumber = null;
            this.playerSymbol = null;
            this.isMyTurn = false;
            this.gameState = null;
            
            // Clear current room from cookies
            cookieManager.clearCurrentRoom();
            
            // Reset UI
            this.updateConnectionStatus();
            this.hideRoomInfo();
            
            // Show exit message
            this.showConnectionStatus('Exited room successfully', 'success');
        }
    }

    // Hide room info when leaving
    hideRoomInfo() {
        const roomInfoDiv = document.getElementById('room-info');
        if (roomInfoDiv) {
            roomInfoDiv.style.display = 'none';
        }
    }

    // Restart multiplayer game
    restartGame() {
        if (this.socket && this.roomId) {
            this.socket.emit('restart-game');
            console.log('Restarting multiplayer game...');
            return true;
        }
        return false;
    }

    makeMove(x, y) {
        if (!this.connected || !this.roomId) {
            this.showConnectionStatus('Not connected to room', 'error');
            return false;
        }

        if (!this.canMakeMove()) {
            this.showConnectionStatus('Not your turn or game not ready', 'error');
            return false;
        }

        this.socket.emit('make-move', { x, y });
        return true;
    }

    restartGame() {
        if (this.socket && this.roomId) {
            this.socket.emit('restart-game');
            return true;
        }
        return false;
    }

    canMakeMove() {
        const canMove = this.connected && 
               this.roomId && 
               this.gameState && 
               this.gameState.gameStatus === 'playing' && 
               this.isMyTurn;
        
        // Debug information
        console.log('Can make move check:', {
            connected: this.connected,
            roomId: this.roomId,
            gameState: this.gameState,
            gameStatus: this.gameState?.gameStatus,
            isMyTurn: this.isMyTurn,
            currentPlayer: this.gameState?.currentPlayer,
            playerNumber: this.playerNumber,
            playerSymbol: this.playerSymbol
        });
        
        return canMove;
    }

    handleMove(data) {
        const { x, y, playerName, playerSymbol, gameState } = data;
        
        // Update the board visually
        const cell = document.getElementById(`${x}${y}`);
        if (cell) {
            cell.innerHTML = playerSymbol;
            cell.style.color = playerSymbol === 'X' ? 'var(--danger-color)' : 'var(--accent-color)';
            cell.classList.add('cell-animation');
        }

        // Play sound effect
        if (gameSounds) {
            gameSounds.playMove();
        }

        // Update game state
        this.gameState = gameState;
        this.isMyTurn = this.gameState.currentPlayer === this.playerNumber;
        
        console.log('Turn update after move:', {
            currentPlayer: this.gameState.currentPlayer,
            playerNumber: this.playerNumber,
            isMyTurn: this.isMyTurn,
            playerSymbol: this.playerSymbol
        });

        // Update message
        this.updateGameMessage();

        // Check for game end
        if (gameState.gameStatus === 'finished') {
            this.handleGameEnd(gameState);
        }
    }

    handleGameRestart(roomInfo) {
        // Reset the board visually
        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                const cell = document.getElementById(`${x}${y}`);
                if (cell) {
                    cell.innerHTML = "";
                    cell.style.color = "";
                    cell.classList.remove('cell-animation', 'winning-cell');
                }
            }
        }

        // Remove any win lines
        const winLines = document.querySelectorAll('.win-line');
        winLines.forEach(line => line.remove());

        // Update game state
        this.gameState = {
            board: Array(3).fill().map(() => Array(3).fill(0)),
            currentPlayer: 1,
            gameStatus: roomInfo.gameStatus,
            winner: null,
            moves: []
        };

        this.isMyTurn = this.gameState.currentPlayer === this.playerNumber;
        this.updateGameMessage();

        // Clear animations
        if (gameAnimations) {
            gameAnimations.clearCanvas();
        }
        
        // Hide restart button
        this.hideRestartButton();
        
        this.updateConnectionStatus();
    }

    // Hide restart button
    hideRestartButton() {
        const restartBtn = document.getElementById('bttn-restart');
        const newGameBtn = document.getElementById('bttn-new-game');
        
        if (restartBtn) {
            restartBtn.style.display = 'inline-flex';
        }
        if (newGameBtn) {
            newGameBtn.style.display = 'none';
        }
    }

    handleGameEnd(gameState) {
        const { winner } = gameState;
        
        if (winner === 'draw') {
            this.showGameMessage('Draw!', 'warning');
            if (gameAnimations) {
                gameAnimations.showDraw();
            }
            if (gameSounds) {
                gameSounds.playDraw();
            }
        } else {
            const isMyWin = winner === this.playerNumber;
            if (isMyWin) {
                this.showGameMessage('You Win!', 'success');
                if (gameAnimations) {
                    gameAnimations.showConfetti();
                }
                if (gameSounds) {
                    gameSounds.playWin();
                }
            } else {
                this.showGameMessage('You Lose!', 'danger');
                if (gameAnimations) {
                    gameAnimations.showSkeleton();
                }
                if (gameSounds) {
                    gameSounds.playLose();
                }
            }
        }

        // Show restart button
        this.showRestartButton();
    }

    updateGameMessage() {
        if (!this.gameState) return;

        const msg = document.getElementById('message');
        if (!msg) return;

        if (this.gameState.gameStatus === 'waiting') {
            msg.innerHTML = '<i class="fas fa-clock"></i> Waiting for another player...';
            msg.style.color = 'var(--warning-color)';
        } else if (this.gameState.gameStatus === 'playing') {
            if (this.isMyTurn) {
                msg.innerHTML = `<i class="fas fa-user"></i> Your turn (${this.playerSymbol})`;
                msg.style.color = 'var(--accent-color)';
            } else {
                msg.innerHTML = '<i class="fas fa-clock"></i> Opponent\'s turn';
                msg.style.color = 'var(--text-secondary)';
            }
        }
        
        // Update connection status with detailed info
        this.updateConnectionStatus();
    }
    
    updateConnectionStatus() {
        const statusDiv = document.getElementById('connection-status');
        if (!statusDiv) return;
        
        let statusText = '';
        let statusType = 'info';
        
        if (!this.connected) {
            statusText = 'Disconnected from server';
            statusType = 'error';
        } else if (!this.roomId) {
            statusText = 'Connected - Not in room';
            statusType = 'warning';
        } else if (!this.gameState) {
            statusText = `Connected - Room ${this.roomId} - Loading...`;
            statusType = 'info';
        } else if (this.gameState.gameStatus === 'waiting') {
            statusText = `Connected - Room ${this.roomId} - Waiting for player 2`;
            statusType = 'warning';
        } else if (this.gameState.gameStatus === 'playing') {
            statusText = `Connected - Room ${this.roomId} - ${this.isMyTurn ? 'Your turn' : 'Opponent\'s turn'}`;
            statusType = this.isMyTurn ? 'success' : 'info';
        } else if (this.gameState.gameStatus === 'finished') {
            statusText = `Connected - Room ${this.roomId} - Game finished`;
            statusType = 'info';
        }
        
        statusDiv.style.display = 'block';
        statusDiv.className = `status-message ${statusType}`;
        statusDiv.innerHTML = `<i class="fas fa-${statusType === 'success' ? 'check-circle' : statusType === 'error' ? 'exclamation-circle' : statusType === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i> ${statusText}`;
    }

    showGameMessage(text, type) {
        const msg = document.getElementById('message');
        if (!msg) return;

        msg.innerHTML = text;
        msg.style.color = `var(--${type}-color)`;
        msg.classList.add('message-animation');
    }

    showRestartButton() {
        const restartBtn = document.getElementById('bttn-restart');
        const newGameBtn = document.getElementById('bttn-new-game');
        
        if (restartBtn) {
            restartBtn.style.display = 'none';
        }
        if (newGameBtn) {
            newGameBtn.style.display = 'inline-flex';
        }
    }

    updateRoomInfo(roomInfo) {
        const roomInfoDiv = document.getElementById('room-info');
        if (!roomInfoDiv) return;

        if (roomInfo.playerCount > 0) {
            roomInfoDiv.style.display = 'block';
            roomInfoDiv.innerHTML = `
                <div class="room-info">
                    <h3><i class="fas fa-door-open"></i> Room ${roomInfo.id}</h3>
                    <p><i class="fas fa-users"></i> Players: ${roomInfo.playerCount}/${roomInfo.maxPlayers}</p>
                    <p><i class="fas fa-gamepad"></i> Status: ${roomInfo.gameStatus}</p>
                    <p><i class="fas fa-list"></i> Players: ${roomInfo.players.map(p => `${p.name} (${p.symbol})`).join(', ')}</p>
                </div>
            `;
        } else {
            roomInfoDiv.style.display = 'none';
        }
    }

    updateConnectionIndicator(status, text) {
        const indicator = document.getElementById('connection-indicator');
        if (!indicator) return;

        indicator.style.display = 'flex';
        indicator.className = `connection-indicator ${status}`;
        indicator.querySelector('span').textContent = text;
    }

    showConnectionStatus(message, type) {
        const statusDiv = document.getElementById('connection-status');
        if (!statusDiv) return;

        statusDiv.style.display = 'block';
        statusDiv.className = `status-message ${type}`;
        statusDiv.innerHTML = `<i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i> ${message}`;
        
        // Auto-hide success messages
        if (type === 'success') {
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 3000);
        }
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    // Check for existing game and resume
    async checkForExistingGame() {
        try {
            const gameData = await cookieManager.resumeGame();
            if (gameData && gameData.hasRoom) {
                console.log('Found existing game:', gameData);
                
                // Set up the game state
                this.roomId = gameData.room.id;
                this.playerNumber = gameData.user.playerNumber;
                this.playerSymbol = gameData.user.symbol;
                this.gameState = gameData.gameState;
                this.isMyTurn = this.gameState && this.gameState.currentPlayer === this.playerNumber;
                
                // Update UI
                this.updateRoomInfo(gameData.room);
                this.updateGameMessage();
                this.updateConnectionStatus();
                
                // Show resume message
                this.showConnectionStatus(`Resumed game in room ${this.roomId}`, 'success');
                
                return true;
            }
        } catch (error) {
            console.error('Error checking for existing game:', error);
        }
        return false;
    }

    // Initialize user on page load
    initializeUser() {
        cookieManager.initializeUser();
        this.userId = cookieManager.getUserInfo().userId;
        this.playerName = cookieManager.getUserInfo().userName;
        
        // Update name input if it exists
        const nameInput = document.getElementById('player-name');
        if (nameInput && this.playerName) {
            nameInput.value = this.playerName;
        }
    }
}

// Global multiplayer instance
const multiplayerGame = new MultiplayerGame();
