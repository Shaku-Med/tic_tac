# Tic-Tac-Toe Multiplayer Game

A real-time multiplayer Tic-Tac-Toe game built with Node.js, Express, Socket.io, and vanilla JavaScript.

## Features

- **Single Player vs AI**: Play against computer with 11 difficulty levels
- **Local Multiplayer**: Two players on the same device
- **Online Multiplayer**: Real-time multiplayer with WebSocket support
- **Sound Effects**: Immersive audio feedback for all game actions
- **Animations**: Visual effects for wins, losses, and draws
- **Statistics Dashboard**: Track your game history and performance
- **Theme Support**: Light and dark mode themes
- **Mobile Responsive**: Works on all device sizes

## Installation

1. **Install Node.js** (if not already installed)
   - Download from [nodejs.org](https://nodejs.org/)

2. **Set up Supabase Database**
   - Create a new project at [supabase.com](https://supabase.com)
   - Go to your project dashboard
   - Navigate to SQL Editor
   - Run the SQL commands from `database-schema.sql`
   - Copy your project URL and anon key from Settings > API

3. **Configure Environment Variables**
   ```bash
   # Copy the example environment file
   copy env.example .env
   
   # Edit .env with your Supabase credentials
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_ANON_KEY=your-anon-key-here
   ```
   
   **Note**: You can also use `test.env` as a template and rename it to `.env`

4. **Install Dependencies**
   ```bash
   cd tic_tac
   npm install
   ```

5. **Start the Server**
   ```bash
   npm start
   ```
   
   Or for development with auto-restart:
   ```bash
   npm run dev
   ```

6. **Open the Game**
   - Navigate to `http://localhost:3000` in your browser

## Game Modes

### Player vs Computer (PvC)
- Choose from 11 AI difficulty levels
- From "Very Easy" to "Un-Beatable"
- AI makes intentional mistakes on easier levels

### Player vs Player (PvP)
- Two players on the same device
- Take turns clicking cells
- Perfect for local multiplayer

### Online Multiplayer
- Real-time multiplayer with WebSocket
- Create or join rooms with unique IDs
- Play with friends anywhere in the world
- Room capacity: 2 players per room

## Multiplayer Setup

1. **Start the Server**
   ```bash
   npm start
   ```

2. **Open Multiple Browser Windows**
   - Navigate to `http://localhost:3000` in each window

3. **Create a Room**
   - Select "Online Multiplayer" mode
   - Click "Connect to Server"
   - Enter your name
   - Click "Create Room"
   - Share the Room ID with your friend

4. **Join a Room**
   - Select "Online Multiplayer" mode
   - Click "Connect to Server"
   - Enter your name and the Room ID
   - Click "Join Room"

## API Endpoints

- `GET /` - Main game page
- `GET /dashboard` - Statistics dashboard
- `GET /api/rooms` - List all active rooms
- `GET /api/rooms/:roomId` - Get specific room info

## WebSocket Events

### Client to Server
- `join-room` - Join a game room
- `make-move` - Make a move in the game
- `restart-game` - Restart the current game
- `leave-room` - Leave the current room

### Server to Client
- `room-joined` - Successfully joined a room
- `room-updated` - Room information updated
- `move-made` - A move was made by a player
- `game-restarted` - Game was restarted
- `error` - Error message

## File Structure

```
tic_tac/
├── server.js              # Node.js server with Socket.io
├── package.json           # Dependencies and scripts
├── public/                # Client-side files
│   ├── index.html         # Main game page
│   ├── dashboard.html     # Statistics dashboard
│   ├── main.js           # Game logic
│   ├── multiplayer.js    # Multiplayer client logic
│   ├── database.js       # IndexedDB operations
│   ├── animations.js     # Canvas animations
│   ├── sounds.js         # Sound effects
│   └── style.css         # Game styles
└── README.md             # This file
```

## Technologies Used

- **Backend**: Node.js, Express, Socket.io
- **Database**: Supabase (PostgreSQL)
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Client Storage**: IndexedDB (client-side)
- **Audio**: Web Audio API
- **Graphics**: HTML5 Canvas
- **Icons**: Font Awesome

## Database Schema

The application uses Supabase (PostgreSQL) with the following tables:

- **rooms**: Stores game rooms with expiration times
- **room_users**: Tracks players in each room
- **game_states**: Stores current game board and state

### Automatic Cleanup

- **Expired Rooms**: Automatically deleted after 24 hours
- **Empty Rooms**: Deleted when all players leave
- **Orphaned Data**: Cleaned up automatically
- **Scheduled Cleanup**: Runs every hour

## Development

To run in development mode with auto-restart:

```bash
npm run dev
```

This uses `nodemon` to automatically restart the server when files change.

## Deployment

The game can be deployed to any Node.js hosting service:

- **Heroku**: Add a `Procfile` with `web: node server.js`
- **Vercel**: Configure for Node.js
- **DigitalOcean**: Deploy as a Node.js app
- **AWS**: Use Elastic Beanstalk or EC2

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## License

MIT License - feel free to use and modify!