require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const supabase = require('./supabase');
const userManager = require('./user-manager');

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
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Game state management - now using Supabase
const players = new Map(); // Keep socket connections in memory

// Game logic helpers
function checkWinner(board) {
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

function isBoardFull(board) {
    return board.every(row => row.every(cell => cell !== 0));
}

// Broadcast room list to all connected clients
async function broadcastRoomList() {
    try {
        const rooms = await supabase.getAllRooms();
        io.emit('rooms-updated', rooms);
    } catch (error) {
        console.error('Error broadcasting room list:', error);
    }
}

// Socket.io auth middleware
io.use((socket, next) => {
    try {
        const rawCookie = socket.handshake.headers.cookie || '';
        const cookies = rawCookie ? rawCookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = decodeURIComponent(value || '');
            return acc;
        }, {}) : {};

        const isAuthed = cookies.isAuthed === 'true';
        const nameOk = typeof cookies.userName === 'string' && /^[a-zA-Z0-9_]{3,20}$/.test(String(cookies.userName).trim());
        if (!isAuthed || !nameOk) {
            return next(new Error('Authentication required'));
        }
        return next();
    } catch (e) {
        return next(new Error('Authentication required'));
    }
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log(`Player connected: ${socket.id}`);

    // Get user from cookies
    const cookies = socket.handshake.headers.cookie ? 
        socket.handshake.headers.cookie.split(';').reduce((acc, cookie) => {
            const [key, value] = cookie.trim().split('=');
            acc[key] = decodeURIComponent(value);
            return acc;
        }, {}) : {};

    const user = userManager.getUserFromCookie(cookies);
    userManager.associateSocket(user.id, socket.id);
    
    console.log(`User ${user.name} (${user.id}) connected with socket ${socket.id}`);

    // Join room
    socket.on('join-room', async (data) => {
        const { roomId, playerName } = data;
        
        if (!roomId || !playerName) {
            socket.emit('error', { message: 'Room ID and player name required' });
            return;
        }

        // Update user name if changed
        if (playerName !== user.name) {
            userManager.updateUserName(user.id, playerName);
        }

        try {
            // Check if room exists
            let room = await supabase.getRoom(roomId);
            if (!room) {
                // Create new room
                await supabase.createRoom(roomId, socket.id, playerName);
                room = await supabase.getRoom(roomId);
            }

            // Get current room users
            const roomUsers = await supabase.getRoomUsers(roomId);
            
            if (roomUsers.length >= 2) {
                socket.emit('error', { message: 'Room is full' });
                return;
            }

            // Check if player already in room
            const existingUser = roomUsers.find(ru => ru.user_id === user.id);
            if (existingUser) {
                socket.emit('error', { message: 'Player already in room' });
                return;
            }

            // Add player to room
            const playerNumber = roomUsers.length + 1;
            await supabase.addUserToRoom(roomId, user.id, playerName, playerNumber);
            
            // Update user's current room
            userManager.updateUserRoom(user.id, roomId);

            // Update room status if second player
            if (roomUsers.length === 1) {
                await supabase.updateRoom(roomId, { status: 'playing' });
                // Initialize game state
                await supabase.saveGameState(roomId, {
                    board: Array(3).fill().map(() => Array(3).fill(0)),
                    currentPlayer: 1,
                    gameStatus: 'playing',
                    winner: null,
                    moves: []
                });
                console.log(`Game started in room ${roomId} - Player 1's turn`);
            }

            // Store player info
            players.set(socket.id, { 
                userId: user.id, 
                roomId, 
                playerName, 
                playerNumber 
            });
            
            // Join socket room
            socket.join(roomId);
            
            // Get updated room info
            const updatedRoom = await supabase.getRoom(roomId);
            const updatedUsers = await supabase.getRoomUsers(roomId);
            
            // Notify player of successful join
            socket.emit('room-joined', {
                roomInfo: {
                    id: roomId,
                    playerCount: updatedUsers.length,
                    maxPlayers: 2,
                    gameStatus: updatedRoom.status,
                    players: updatedUsers.map(u => ({
                        name: u.user_name,
                        symbol: u.player_number === 1 ? 'X' : 'O',
                        number: u.player_number
                    }))
                },
                playerNumber: playerNumber,
                symbol: playerNumber === 1 ? 'X' : 'O'
            });

            // Notify all players in room
            io.to(roomId).emit('room-updated', {
                id: roomId,
                playerCount: updatedUsers.length,
                maxPlayers: 2,
                gameStatus: updatedRoom.status,
                players: updatedUsers.map(u => ({
                    name: u.user_name,
                    symbol: u.player_number === 1 ? 'X' : 'O',
                    number: u.player_number
                }))
            });
            
            // If game just started, notify all players
            if (updatedUsers.length === 2 && updatedRoom.status === 'playing') {
                io.to(roomId).emit('game-started', {
                    currentPlayer: 1,
                    gameState: {
                        board: Array(3).fill().map(() => Array(3).fill(0)),
                        currentPlayer: 1,
                        gameStatus: 'playing',
                        winner: null,
                        moves: []
                    }
                });
                console.log(`Game started notification sent to room ${roomId}`);
            }
            
            // Broadcast room list update
            broadcastRoomList();
            
            console.log(`Player ${playerName} joined room ${roomId}`);
        } catch (error) {
            console.error('Error joining room:', error);
            socket.emit('error', { message: 'Failed to join room' });
        }
    });

    // Make move
    socket.on('make-move', async (data) => {
        const { x, y } = data;
        const player = players.get(socket.id);
        
        if (!player) {
            socket.emit('error', { message: 'Player not in room' });
            return;
        }

        try {
            // Get current game state
            const gameState = await supabase.getGameState(player.roomId);
            if (!gameState) {
                socket.emit('error', { message: 'Game state not found' });
                return;
            }

            if (gameState.gameStatus !== 'playing') {
                socket.emit('error', { message: 'Game not in playing state' });
                return;
            }

            const playerSymbol = player.playerNumber === 1 ? 1 : 2;
            
            if (playerSymbol !== gameState.currentPlayer) {
                socket.emit('error', { message: 'Not your turn' });
                return;
            }

            if (gameState.board[x][y] !== 0) {
                socket.emit('error', { message: 'Cell already occupied' });
                return;
            }

            // Make the move
            gameState.board[x][y] = playerSymbol;
            gameState.moves.push({ player: playerSymbol, x, y, timestamp: new Date() });

            // Check for win
            const winner = checkWinner(gameState.board);
            if (winner) {
                gameState.gameStatus = 'finished';
                gameState.winner = winner;
                await supabase.updateRoom(player.roomId, { status: 'finished' });
            } else if (isBoardFull(gameState.board)) {
                gameState.gameStatus = 'finished';
                gameState.winner = 'draw';
                await supabase.updateRoom(player.roomId, { status: 'finished' });
            } else {
                gameState.currentPlayer = gameState.currentPlayer === 1 ? 2 : 1;
            }

            // Save updated game state
            await supabase.saveGameState(player.roomId, gameState);

            // Broadcast move to all players in room
            io.to(player.roomId).emit('move-made', {
                x, y, 
                playerName: player.playerName,
                playerSymbol: playerSymbol === 1 ? 'X' : 'O',
                gameState: gameState
            });

            console.log(`Move made in room ${player.roomId}: ${player.playerName} played ${playerSymbol === 1 ? 'X' : 'O'} at (${x}, ${y})`);
        } catch (error) {
            console.error('Error making move:', error);
            socket.emit('error', { message: 'Failed to make move' });
        }
    });

    // Restart game
    socket.on('restart-game', async () => {
        const player = players.get(socket.id);
        
        if (!player) {
            socket.emit('error', { message: 'Player not in room' });
            return;
        }

        try {
            // Reset game state
            await supabase.saveGameState(player.roomId, {
                board: Array(3).fill().map(() => Array(3).fill(0)),
                currentPlayer: 1,
                gameStatus: 'playing',
                winner: null,
                moves: []
            });

            // Update room status
            await supabase.updateRoom(player.roomId, { status: 'playing' });
            
            // Get updated room info
            const room = await supabase.getRoom(player.roomId);
            const users = await supabase.getRoomUsers(player.roomId);
            
            // Notify all players in room
            io.to(player.roomId).emit('game-restarted', {
                id: player.roomId,
                playerCount: users.length,
                maxPlayers: 2,
                gameStatus: room.status,
                players: users.map(u => ({
                    name: u.user_name,
                    symbol: u.player_number === 1 ? 'X' : 'O',
                    number: u.player_number
                }))
            });

            // Broadcast room list update
            broadcastRoomList();
            
            console.log(`Game restarted in room ${player.roomId}`);
        } catch (error) {
            console.error('Error restarting game:', error);
            socket.emit('error', { message: 'Failed to restart game' });
        }
    });

    // Leave room
    socket.on('leave-room', async () => {
        const player = players.get(socket.id);
        const user = userManager.getUserBySocket(socket.id);
        
        if (!player || !user) {
            return;
        }

        try {
            // Remove player from room
            await supabase.removeUserFromRoom(player.roomId, user.id);
            
            // Check if room is empty
            const remainingUsers = await supabase.getRoomUsers(player.roomId);
            
            if (remainingUsers.length === 0) {
                // Delete empty room
                await supabase.deleteRoom(player.roomId);
                console.log(`Room ${player.roomId} deleted (empty)`);
            } else {
                // Update room status to waiting
                await supabase.updateRoom(player.roomId, { status: 'waiting' });
                
                // Get updated room info
                const room = await supabase.getRoom(player.roomId);
                
                // Notify remaining players
                io.to(player.roomId).emit('room-updated', {
                    id: player.roomId,
                    playerCount: remainingUsers.length,
                    maxPlayers: 2,
                    gameStatus: room.status,
                    players: remainingUsers.map(u => ({
                        name: u.user_name,
                        symbol: u.player_number === 1 ? 'X' : 'O',
                        number: u.player_number
                    }))
                });
            }

            players.delete(socket.id);
            socket.leave(player.roomId);
            
            // Broadcast room list update
            broadcastRoomList();
            
            console.log(`Player left room ${player.roomId}`);
        } catch (error) {
            console.error('Error leaving room:', error);
        }
    });

    // Exit room (force exit and cleanup)
    socket.on('exit-room', async () => {
        const player = players.get(socket.id);
        const user = userManager.getUserBySocket(socket.id);
        
        if (!player || !user) {
            return;
        }

        try {
            console.log(`User ${user.name} exiting room ${player.roomId}`);
            
            // Remove player from room
            await supabase.removeUserFromRoom(player.roomId, user.id);
            
            // Check if room is empty
            const remainingUsers = await supabase.getRoomUsers(player.roomId);
            
            if (remainingUsers.length === 0) {
                // Delete empty room and all associated data
                await supabase.deleteRoom(player.roomId);
                console.log(`Room ${player.roomId} deleted (empty after exit)`);
            } else {
                // Update room status to waiting
                await supabase.updateRoom(player.roomId, { status: 'waiting' });
                
                // Get updated room info
                const room = await supabase.getRoom(player.roomId);
                
                // Notify remaining players that someone left
                io.to(player.roomId).emit('player-exited', {
                    message: `${user.name} has left the room`,
                    roomInfo: {
                        id: player.roomId,
                        playerCount: remainingUsers.length,
                        maxPlayers: 2,
                        gameStatus: room.status,
                        players: remainingUsers.map(u => ({
                            name: u.user_name,
                            symbol: u.player_number === 1 ? 'X' : 'O',
                            number: u.player_number
                        }))
                    }
                });
            }

            // Clear user's current room
            userManager.updateUserRoom(user.id, null);
            
            // Disconnect user from user manager
            userManager.disconnectUser(socket.id);
            players.delete(socket.id);
            socket.leave(player.roomId);
            
            // Broadcast room list update
            broadcastRoomList();
            
            console.log(`User ${user.name} exited room ${player.roomId}`);
        } catch (error) {
            console.error('Error exiting room:', error);
        }
    });

    // Handle disconnect
    socket.on('disconnect', async () => {
        const player = players.get(socket.id);
        const user = userManager.getUserBySocket(socket.id);
        
        if (player && user) {
            try {
                // Remove player from room
                await supabase.removeUserFromRoom(player.roomId, user.id);
                
                // Check if room is empty
                const remainingUsers = await supabase.getRoomUsers(player.roomId);
                
                if (remainingUsers.length === 0) {
                    // Delete empty room
                    await supabase.deleteRoom(player.roomId);
                    console.log(`Room ${player.roomId} deleted (empty)`);
                } else {
                    // Update room status to waiting
                    await supabase.updateRoom(player.roomId, { status: 'waiting' });
                    
                    // Get updated room info
                    const room = await supabase.getRoom(player.roomId);
                    
                    // Notify remaining players
                    io.to(player.roomId).emit('room-updated', {
                        id: player.roomId,
                        playerCount: remainingUsers.length,
                        maxPlayers: 2,
                        gameStatus: room.status,
                        players: remainingUsers.map(u => ({
                            name: u.user_name,
                            symbol: u.player_number === 1 ? 'X' : 'O',
                            number: u.player_number
                        }))
                    });
                }
                
                // Disconnect user from user manager
                userManager.disconnectUser(socket.id);
                players.delete(socket.id);
                
                // Broadcast room list update
                broadcastRoomList();
            } catch (error) {
                console.error('Error handling disconnect:', error);
            }
        }
        
        console.log(`User ${user?.name || 'Unknown'} disconnected: ${socket.id}`);
    });
});

// API routes
app.get('/api/rooms', async (req, res) => {
    try {
        const rooms = await supabase.getAllRooms();
        res.json(rooms);
    } catch (error) {
        console.error('Error getting rooms:', error);
        res.status(500).json({ message: 'Failed to get rooms' });
    }
});

app.get('/api/rooms/:roomId', async (req, res) => {
    try {
        const room = await supabase.getRoom(req.params.roomId);
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }
        res.json(room);
    } catch (error) {
        console.error('Error getting room:', error);
        res.status(500).json({ message: 'Failed to get room' });
    }
});

// Simple username auth (create or login)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username } = req.body || {};
        if (!username || typeof username !== 'string') {
            return res.status(400).send('Invalid username');
        }

        const clean = String(username).trim();
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(clean)) {
            return res.status(400).send('Use 3-20 chars: letters, numbers, _');
        }

        // If Supabase is configured, use it; otherwise in-memory fallback via userManager
        let userRecord = null;
        try {
            if (supabase && supabase.getOrCreateUserByName) {
                userRecord = await supabase.getOrCreateUserByName(clean);
            }
        } catch (e) {
            console.log('Auth via Supabase unavailable, using memory store');
        }

        if (!userRecord) {
            // Fallback: map username to persistent cookie userId
            const existing = Array.from(userManager.users.values()).find(u => u.name === clean);
            if (existing) {
                userRecord = { id: existing.id, name: existing.name };
            } else {
                const u = userManager.getUserFromCookie({ userName: clean });
                userManager.updateUserName(u.id, clean);
                userRecord = { id: u.id, name: clean };
            }
        }

        // Set cookies
        res.cookie('userId', userRecord.id, { httpOnly: false, sameSite: 'lax', path: '/' });
        res.cookie('userName', encodeURIComponent(userRecord.name), { httpOnly: false, sameSite: 'lax', path: '/' });
        res.cookie('isAuthed', 'true', { httpOnly: false, sameSite: 'lax', path: '/' });
        res.json({ ok: true, userId: userRecord.id, userName: userRecord.name });
    } catch (error) {
        console.error('Auth error:', error);
        res.status(500).send('Auth failed');
    }
});

// Get user's current room and game state
app.get('/api/user/current-room', async (req, res) => {
    try {
        const userId = req.cookies.userId;
        if (!userId) {
            return res.json({ hasRoom: false });
        }

        const user = userManager.getUserById(userId);
        if (!user || !user.currentRoom) {
            return res.json({ hasRoom: false });
        }

        // Get room info
        const room = await supabase.getRoom(user.currentRoom);
        if (!room) {
            // User's room no longer exists
            userManager.updateUserRoom(userId, null);
            return res.json({ hasRoom: false });
        }

        // Get game state
        const gameState = await supabase.getGameState(user.currentRoom);
        
        // Get room users
        const roomUsers = await supabase.getRoomUsers(user.currentRoom);
        const userInRoom = roomUsers.find(ru => ru.user_id === userId);

        res.json({
            hasRoom: true,
            room: {
                id: user.currentRoom,
                status: room.status,
                playerCount: roomUsers.length,
                maxPlayers: 2,
                players: roomUsers.map(u => ({
                    name: u.user_name,
                    symbol: u.player_number === 1 ? 'X' : 'O',
                    number: u.player_number
                }))
            },
            user: {
                playerNumber: userInRoom?.player_number,
                symbol: userInRoom?.player_number === 1 ? 'X' : 'O'
            },
            gameState: gameState
        });
    } catch (error) {
        console.error('Error getting user current room:', error);
        res.status(500).json({ message: 'Failed to get current room' });
    }
});

// Serve the main game page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve dashboard
app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Cleanup function
async function performCleanup() {
    try {
        console.log('Performing cleanup...');
        await supabase.cleanupExpiredRooms();
        await supabase.cleanupEmptyRooms();
        console.log('Cleanup completed');
    } catch (error) {
        if (error.message.includes('Supabase not configured')) {
            console.log('⚠️  Skipping cleanup - Supabase not configured');
        } else {
            console.error('Cleanup failed:', error);
        }
    }
}

// Run cleanup every hour
setInterval(performCleanup, 60 * 60 * 1000);

// Run initial cleanup on startup
setTimeout(performCleanup, 5000);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🎮 Game available at: http://localhost:${PORT}`);
    
    if (process.env.SUPABASE_URL && process.env.SUPABASE_URL !== 'https://your-project-id.supabase.co') {
        console.log('✅ Supabase configured - Multiplayer features enabled');
    } else {
        console.log('⚠️  Supabase not configured - Only single player and local multiplayer work');
        console.log('   To enable online multiplayer, set up Supabase and configure environment variables');
    }
});
