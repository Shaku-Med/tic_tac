-- Tic-Tac-Toe Multiplayer Database Schema for Supabase

-- Create rooms table
CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(8) PRIMARY KEY,
    creator_id VARCHAR(255) NOT NULL,
    creator_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- Create room_users table
CREATE TABLE IF NOT EXISTS room_users (
    id SERIAL PRIMARY KEY,
    room_id VARCHAR(8) REFERENCES rooms(id) ON DELETE CASCADE,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(50) NOT NULL,
    player_number INTEGER NOT NULL CHECK (player_number IN (1, 2)),
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, player_number)
);

-- Create game_states table
CREATE TABLE IF NOT EXISTS game_states (
    room_id VARCHAR(8) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    board JSONB NOT NULL DEFAULT '[[0,0,0],[0,0,0],[0,0,0]]',
    current_player INTEGER DEFAULT 1 CHECK (current_player IN (1, 2)),
    game_status VARCHAR(20) DEFAULT 'waiting' CHECK (game_status IN ('waiting', 'playing', 'finished')),
    winner INTEGER CHECK (winner IN (1, 2, NULL)),
    moves JSONB DEFAULT '[]',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);
CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);
CREATE INDEX IF NOT EXISTS idx_room_users_room_id ON room_users(room_id);
CREATE INDEX IF NOT EXISTS idx_room_users_user_id ON room_users(user_id);
CREATE INDEX IF NOT EXISTS idx_game_states_room_id ON game_states(room_id);

-- Create function to automatically clean up expired rooms
CREATE OR REPLACE FUNCTION cleanup_expired_rooms()
RETURNS void AS $$
BEGIN
    -- Delete expired rooms and cascade to related tables
    DELETE FROM rooms WHERE expires_at < NOW();
    
    -- Delete orphaned room_users (shouldn't happen with CASCADE, but just in case)
    DELETE FROM room_users WHERE room_id NOT IN (SELECT id FROM rooms);
    
    -- Delete orphaned game_states (shouldn't happen with CASCADE, but just in case)
    DELETE FROM game_states WHERE room_id NOT IN (SELECT id FROM rooms);
END;
$$ LANGUAGE plpgsql;

-- Create function to clean up empty rooms
CREATE OR REPLACE FUNCTION cleanup_empty_rooms()
RETURNS void AS $$
BEGIN
    -- Delete rooms that have no users
    DELETE FROM rooms WHERE id NOT IN (
        SELECT DISTINCT room_id FROM room_users
    );
END;
$$ LANGUAGE plpgsql;

-- Create a scheduled job to run cleanup every hour
-- Note: This requires pg_cron extension to be enabled in Supabase
-- You can also run this manually or set up a cron job

-- Enable Row Level Security (RLS)
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE game_states ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since this is a game)
-- Rooms are public but users can only modify their own data
CREATE POLICY "Rooms are viewable by everyone" ON rooms FOR SELECT USING (true);
CREATE POLICY "Rooms are insertable by everyone" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Rooms are updatable by everyone" ON rooms FOR UPDATE USING (true);
CREATE POLICY "Rooms are deletable by everyone" ON rooms FOR DELETE USING (true);

CREATE POLICY "Room users are viewable by everyone" ON room_users FOR SELECT USING (true);
CREATE POLICY "Room users are insertable by everyone" ON room_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Room users are updatable by everyone" ON room_users FOR UPDATE USING (true);
CREATE POLICY "Room users are deletable by everyone" ON room_users FOR DELETE USING (true);

CREATE POLICY "Game states are viewable by everyone" ON game_states FOR SELECT USING (true);
CREATE POLICY "Game states are insertable by everyone" ON game_states FOR INSERT WITH CHECK (true);
CREATE POLICY "Game states are updatable by everyone" ON game_states FOR UPDATE USING (true);
CREATE POLICY "Game states are deletable by everyone" ON game_states FOR DELETE USING (true);

-- Create a view for room information with user count
CREATE OR REPLACE VIEW room_info AS
SELECT 
    r.id,
    r.creator_id,
    r.creator_name,
    r.status,
    r.created_at,
    r.expires_at,
    COUNT(ru.user_id) as player_count,
    ARRAY_AGG(
        JSON_BUILD_OBJECT(
            'user_id', ru.user_id,
            'user_name', ru.user_name,
            'player_number', ru.player_number
        ) ORDER BY ru.player_number
    ) as players
FROM rooms r
LEFT JOIN room_users ru ON r.id = ru.room_id
GROUP BY r.id, r.creator_id, r.creator_name, r.status, r.created_at, r.expires_at;

-- Create a function to get room with full information
CREATE OR REPLACE FUNCTION get_room_full_info(room_id_param VARCHAR(8))
RETURNS TABLE (
    room_id VARCHAR(8),
    creator_name VARCHAR(50),
    status VARCHAR(20),
    player_count BIGINT,
    players JSON
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ri.id as room_id,
        ri.creator_name,
        ri.status,
        ri.player_count,
        ri.players
    FROM room_info ri
    WHERE ri.id = room_id_param;
END;
$$ LANGUAGE plpgsql;
