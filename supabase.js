const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Check if Supabase is configured
const isSupabaseConfigured = supabaseUrl && supabaseKey && 
    supabaseUrl !== 'https://your-project-id.supabase.co' && 
    supabaseKey !== 'your-anon-key-here';

let supabase = null;
if (isSupabaseConfigured) {
    try {
        supabase = createClient(supabaseUrl, supabaseKey);
        console.log('✅ Supabase connected successfully');
    } catch (error) {
        console.error('❌ Failed to connect to Supabase:', error.message);
        supabase = null;
    }
} else {
    console.log('⚠️  Supabase not configured. Multiplayer features will not work.');
    console.log('   Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables');
}

class SupabaseManager {
    constructor() {
        this.client = supabase;
    }

    // Helper method to check if Supabase is available
    checkSupabase() {
        if (!this.client) {
            throw new Error('Supabase not configured. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables.');
        }
    }

    // Room management
    async createRoom(roomId, creatorId, creatorName) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('rooms')
                .insert([
                    {
                        id: roomId,
                        creator_id: creatorId,
                        creator_name: creatorName,
                        status: 'waiting',
                        created_at: new Date().toISOString(),
                        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error creating room:', error);
            throw error;
        }
    }

    // Simple users table helpers
    async getOrCreateUserByName(username) {
        this.checkSupabase();
        const clean = String(username).trim();
        const { data: found, error: findErr } = await this.client
            .from('users')
            .select('id, name')
            .eq('name', clean)
            .limit(1)
            .maybeSingle();
        if (findErr) throw findErr;
        if (found) return found;
        const { data: created, error: createErr } = await this.client
            .from('users')
            .insert({ name: clean })
            .select('id, name')
            .single();
        if (createErr) throw createErr;
        return created;
    }

    async getRoom(roomId) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('rooms')
                .select('*')
                .eq('id', roomId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error getting room:', error);
            throw error;
        }
    }

    async updateRoom(roomId, updates) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('rooms')
                .update(updates)
                .eq('id', roomId)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error updating room:', error);
            throw error;
        }
    }

    async deleteRoom(roomId) {
        this.checkSupabase();
        
        try {
            const { error } = await this.client
                .from('rooms')
                .delete()
                .eq('id', roomId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error deleting room:', error);
            throw error;
        }
    }

    // User management
    async addUserToRoom(roomId, userId, userName, playerNumber) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('room_users')
                .insert([
                    {
                        room_id: roomId,
                        user_id: userId,
                        user_name: userName,
                        player_number: playerNumber,
                        joined_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error adding user to room:', error);
            throw error;
        }
    }

    async getRoomUsers(roomId) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('room_users')
                .select('*')
                .eq('room_id', roomId)
                .order('player_number');

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting room users:', error);
            throw error;
        }
    }

    async removeUserFromRoom(roomId, userId) {
        this.checkSupabase();
        
        try {
            const { error } = await this.client
                .from('room_users')
                .delete()
                .eq('room_id', roomId)
                .eq('user_id', userId);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error('Error removing user from room:', error);
            throw error;
        }
    }

    // Game state management
    async saveGameState(roomId, gameState) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('game_states')
                .upsert([
                    {
                        room_id: roomId,
                        board: JSON.stringify(gameState.board),
                        current_player: gameState.currentPlayer,
                        game_status: gameState.gameStatus,
                        winner: gameState.winner,
                        moves: JSON.stringify(gameState.moves),
                        updated_at: new Date().toISOString()
                    }
                ])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error saving game state:', error);
            throw error;
        }
    }

    async getGameState(roomId) {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('game_states')
                .select('*')
                .eq('room_id', roomId)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            
            if (data) {
                return {
                    board: JSON.parse(data.board),
                    currentPlayer: data.current_player,
                    gameStatus: data.game_status,
                    winner: data.winner,
                    moves: JSON.parse(data.moves)
                };
            }
            return null;
        } catch (error) {
            console.error('Error getting game state:', error);
            throw error;
        }
    }

    // Cleanup functions
    async cleanupExpiredRooms() {
        this.checkSupabase();
        
        try {
            const now = new Date().toISOString();
            
            // Delete expired rooms
            const { error: roomsError } = await this.client
                .from('rooms')
                .delete()
                .lt('expires_at', now);

            if (roomsError) throw roomsError;

            // Delete orphaned room users
            const { data: activeRooms } = await this.client
                .from('rooms')
                .select('id');
            
            const activeRoomIds = activeRooms?.map(room => room.id) || [];
            
            if (activeRoomIds.length > 0) {
                const { error: usersError } = await this.client
                    .from('room_users')
                    .delete()
                    .not('room_id', 'in', `(${activeRoomIds.join(',')})`);

                if (usersError) throw usersError;

                // Delete orphaned game states
                const { error: gameStatesError } = await this.client
                    .from('game_states')
                    .delete()
                    .not('room_id', 'in', `(${activeRoomIds.join(',')})`);

                if (gameStatesError) throw gameStatesError;
            } else {
                // If no active rooms, delete all room_users and game_states
                await this.client.from('room_users').delete().neq('room_id', '');
                await this.client.from('game_states').delete().neq('room_id', '');
            }

            console.log('Cleanup completed successfully');
            return true;
        } catch (error) {
            console.error('Error during cleanup:', error);
            throw error;
        }
    }

    async cleanupEmptyRooms() {
        this.checkSupabase();
        
        try {
            // Get all rooms
            const { data: allRooms } = await this.client
                .from('rooms')
                .select('id');
            
            // Get rooms with users
            const { data: roomsWithUsers } = await this.client
                .from('room_users')
                .select('room_id');
            
            const roomsWithUsersIds = roomsWithUsers?.map(ru => ru.room_id) || [];
            const emptyRooms = allRooms?.filter(room => !roomsWithUsersIds.includes(room.id)) || [];

            if (emptyRooms && emptyRooms.length > 0) {
                const roomIds = emptyRooms.map(room => room.id);
                
                // Delete empty rooms
                await this.client
                    .from('rooms')
                    .delete()
                    .in('id', roomIds);

                // Delete associated game states
                await this.client
                    .from('game_states')
                    .delete()
                    .in('room_id', roomIds);

                console.log(`Cleaned up ${emptyRooms.length} empty rooms`);
            }

            return true;
        } catch (error) {
            console.error('Error cleaning up empty rooms:', error);
            throw error;
        }
    }

    // Get all active rooms
    async getAllRooms() {
        this.checkSupabase();
        
        try {
            const { data, error } = await this.client
                .from('rooms')
                .select(`
                    *,
                    room_users (
                        user_id,
                        user_name,
                        player_number
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting all rooms:', error);
            throw error;
        }
    }
}

module.exports = new SupabaseManager();
