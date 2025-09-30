const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Game state management
const rooms = new Map();
const players = new Map();

// Room management
class Room {
    constructor(id, creator) {
        this.id = id;
        this.creator = creator;
        this.players = new Map();
        this.gameState = {
            board: Array(3).fill().map(() => Array(3).fill(0)),
            currentPlayer: 1, // 1 for X, 2 for O
            gameStatus: 'waiting', // waiting, playing, finished
            winner: null,
            moves: []
        };
        this.maxPlayers = 2;
        this.createdAt = new Date();
    }

    addPlayer(playerId, playerName) {
        if (this.players.size >= this.maxPlayers) {
            return { success: false, message: 'Room is full' };
        }
        
        if (this.players.has(playerId)) {
            return { success: false, message: 'Player already in room' };
        }

        const playerNumber = this.players.size + 1;
        this.players.set(playerId, {
            id: playerId,
            name: playerName,
            number: playerNumber,
            symbol: playerNumber === 1 ? 'X' : 'O'
        });

        if (this.players.size === 2) {
            this.gameState.gameStatus = 'playing';
        }

        return { success: true, playerNumber, symbol: playerNumber === 1 ? 'X' : 'O' };
    }

    removePlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return false;

        this.players.delete(playerId);
        
        if (this.players.size === 0) {
            return 'empty';
        }

        if (this.gameState.gameStatus === 'playing') {
            this.gameState.gameStatus = 'waiting';
            this.resetGame();
        }

        return true;
    }

    makeMove(playerId, x, y) {
        if (this.gameState.gameStatus !== 'playing') {
            return { success: false, message: 'Game not in playing state' };
        }

        const player = this.players.get(playerId);
        if (!player) {
            return { success: false, message: 'Player not in room' };
        }

        const expectedPlayer = this.gameState.currentPlayer;
        const playerSymbol = player.symbol === 'X' ? 1 : 2;
        
        if (playerSymbol !== expectedPlayer) {
            return { success: false, message: 'Not your turn' };
        }

        if (this.gameState.board[x][y] !== 0) {
            return { success: false, message: 'Cell already occupied' };
        }

        // Make the move
        this.gameState.board[x][y] = playerSymbol;
        this.gameState.moves.push({ player: playerSymbol, x, y, timestamp: new Date() });

        // Check for win
        const winner = this.checkWinner();
        if (winner) {
            this.gameState.gameStatus = 'finished';
            this.gameState.winner = winner;
        } else if (this.isBoardFull()) {
            this.gameState.gameStatus = 'finished';
            this.gameState.winner = 'draw';
        } else {
            this.gameState.currentPlayer = this.gameState.currentPlayer === 1 ? 2 : 1;
        }

        return { 
            success: true, 
            gameState: this.gameState,
            playerName: player.name,
            playerSymbol: player.symbol
        };
    }

    checkWinner() {
        const board = this.gameState.board;
        
        // Check rows
        for (let i = 0; i < 3; i++) {
            if (board[i][0] !== 0 && board[i][0] === board[i][1] && board[i][1] === board[i][2]) {
                return board[i][0];
            }
        }
        
        // Check columns
        for (let j = 0; j < 3; j++) {
            if (board[0][j] !== 0 && board[0][j] === board[1][j] && board[1][j] === board[2][j]) {
                return board[0][j];
            }
        }
        
        // Check diagonals
        if (board[0][0] !== 0 && board[0][0] === board[1][1] && board[1][1] === board[2][2]) {
            return board[0][0];
        }
        if (board[0][2] !== 0 && board[0][2] === board[1][1] && board[1][1] === board[2][0]) {
            return board[0][2];
        }
        
        return null;
    }

    isBoardFull() {
        return this.gameState.board.every(row => row.every(cell => cell !== 0));
    }

    resetGame() {
        this.gameState = {
            board: Array(3).fill().map(() => Array(3).fill(0)),
            currentPlayer: 1,
            gameStatus: this.players.size === 2 ? 'playing' : 'waiting',
            winner: null,
            moves: []
        };
    }

    getRoomInfo() {
        return {
            id: this.id,
            playerCount: this.players.size,
            maxPlayers: this.maxPlayers,
            gameStatus: this.gameState.gameStatus,
            players: Array.from(this.players.values()).map(p => ({
                name: p.name,
                symbol: p.symbol,
                number: p.number
            }))
        };
    }
}

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Join room
    socket.on('join-room', (data) => {
        const { roomId, playerName } = data;
        
        if (!roomId || !playerName) {
            socket.emit('error', { message: 'Room ID and player name required' });
            return;
        }

        // Get or create room
        let room = rooms.get(roomId);
        if (!room) {
            room = new Room(roomId, socket.id);
            rooms.set(roomId, room);
        }

        // Add player to room
        const result = room.addPlayer(socket.id, playerName);
        if (!result.success) {
            socket.emit('error', { message: result.message });
            return;
        }

        // Store player info
        players.set(socket.id, { roomId, playerName });
        
        // Join socket room
        socket.join(roomId);
        
        // Notify player of successful join
        socket.emit('room-joined', {
            roomInfo: room.getRoomInfo(),
            playerNumber: result.playerNumber,
            symbol: result.symbol
        });

        // Notify all players in room
        io.to(roomId).emit('room-updated', room.getRoomInfo());
        
        console.log(`Player ${playerName} joined room ${roomId}`);
    });

    // Make move
    socket.on('make-move', (data) => {
        const { x, y } = data;
        const player = players.get(socket.id);
        
        if (!player) {
            socket.emit('error', { message: 'Player not in room' });
            return;
        }

        const room = rooms.get(player.roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        const result = room.makeMove(socket.id, x, y);
        if (!result.success) {
            socket.emit('error', { message: result.message });
            return;
        }

        // Broadcast move to all players in room
        io.to(player.roomId).emit('move-made', {
            x, y, 
            playerName: result.playerName,
            playerSymbol: result.playerSymbol,
            gameState: result.gameState
        });

        console.log(`Move made in room ${player.roomId}: ${result.playerName} played ${result.playerSymbol} at (${x}, ${y})`);
    });

    // Restart game
    socket.on('restart-game', () => {
        const player = players.get(socket.id);
        
        if (!player) {
            socket.emit('error', { message: 'Player not in room' });
            return;
        }

        const room = rooms.get(player.roomId);
        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        room.resetGame();
        
        // Notify all players in room
        io.to(player.roomId).emit('game-restarted', room.getRoomInfo());
        
        console.log(`Game restarted in room ${player.roomId}`);
    });

    // Leave room
    socket.on('leave-room', () => {
        const player = players.get(socket.id);
        
        if (!player) {
            return;
        }

        const room = rooms.get(player.roomId);
        if (room) {
            const result = room.removePlayer(socket.id);
            
            if (result === 'empty') {
                rooms.delete(player.roomId);
                console.log(`Room ${player.roomId} deleted (empty)`);
            } else {
                // Notify remaining players
                io.to(player.roomId).emit('room-updated', room.getRoomInfo());
            }
        }

        players.delete(socket.id);
        socket.leave(player.roomId);
        
        console.log(`Player left room ${player.roomId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        const player = players.get(socket.id);
        
        if (player) {
            const room = rooms.get(player.roomId);
            if (room) {
                const result = room.removePlayer(socket.id);
                
                if (result === 'empty') {
                    rooms.delete(player.roomId);
                    console.log(`Room ${player.roomId} deleted (empty)`);
                } else {
                    // Notify remaining players
                    io.to(player.roomId).emit('room-updated', room.getRoomInfo());
                }
            }
            
            players.delete(socket.id);
        }
        
        console.log(`Player disconnected: ${socket.id}`);
    });
});

// API routes
app.get('/api/rooms', (req, res) => {
    const roomList = Array.from(rooms.values()).map(room => room.getRoomInfo());
    res.json(roomList);
});

app.get('/api/rooms/:roomId', (req, res) => {
    const room = rooms.get(req.params.roomId);
    if (!room) {
        return res.status(404).json({ message: 'Room not found' });
    }
    res.json(room.getRoomInfo());
});

// Serve the main game page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Game available at: http://localhost:${PORT}`);
});
