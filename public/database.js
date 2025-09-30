class GameDatabase {
    constructor() {
        this.dbName = 'TicTacToeDB';
        this.version = 1;
        this.db = null;
    }

    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('gameStats')) {
                    const statsStore = db.createObjectStore('gameStats', { keyPath: 'id', autoIncrement: true });
                    statsStore.createIndex('date', 'date', { unique: false });
                    statsStore.createIndex('difficulty', 'difficulty', { unique: false });
                    statsStore.createIndex('gameMode', 'gameMode', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('gameHistory')) {
                    const historyStore = db.createObjectStore('gameHistory', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('date', 'date', { unique: false });
                    historyStore.createIndex('difficulty', 'difficulty', { unique: false });
                    historyStore.createIndex('result', 'result', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    const settingsStore = db.createObjectStore('settings', { keyPath: 'key' });
                }
            };
        });
    }

    async addGameStats(stats) {
        const transaction = this.db.transaction(['gameStats'], 'readwrite');
        const store = transaction.objectStore('gameStats');
        
        const gameData = {
            date: new Date().toISOString(),
            difficulty: stats.difficulty,
            gameMode: stats.gameMode,
            result: stats.result,
            moves: stats.moves,
            duration: stats.duration
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(gameData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async addGameHistory(history) {
        const transaction = this.db.transaction(['gameHistory'], 'readwrite');
        const store = transaction.objectStore('gameHistory');
        
        const gameData = {
            date: new Date().toISOString(),
            difficulty: history.difficulty,
            gameMode: history.gameMode,
            result: history.result,
            moves: history.moves,
            board: history.board,
            duration: history.duration
        };
        
        return new Promise((resolve, reject) => {
            const request = store.add(gameData);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getGameStats() {
        const transaction = this.db.transaction(['gameStats'], 'readonly');
        const store = transaction.objectStore('gameStats');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getGameHistory(limit = 50) {
        const transaction = this.db.transaction(['gameHistory'], 'readonly');
        const store = transaction.objectStore('gameHistory');
        
        return new Promise((resolve, reject) => {
            const request = store.getAll();
            request.onsuccess = () => {
                const results = request.result;
                results.sort((a, b) => new Date(b.date) - new Date(a.date));
                resolve(results.slice(0, limit));
            };
            request.onerror = () => reject(request.error);
        });
    }

    async getStatsByDifficulty() {
        const stats = await this.getGameStats();
        const difficultyStats = {};
        
        stats.forEach(stat => {
            if (!difficultyStats[stat.difficulty]) {
                difficultyStats[stat.difficulty] = { wins: 0, losses: 0, draws: 0, total: 0 };
            }
            
            difficultyStats[stat.difficulty].total++;
            if (stat.result === 'win') difficultyStats[stat.difficulty].wins++;
            else if (stat.result === 'loss') difficultyStats[stat.difficulty].losses++;
            else if (stat.result === 'draw') difficultyStats[stat.difficulty].draws++;
        });
        
        return difficultyStats;
    }

    async getDifficultyStats() {
        return this.getStatsByDifficulty();
    }

    async getOverallStats() {
        const stats = await this.getGameStats();
        const overall = { wins: 0, losses: 0, draws: 0, total: 0 };
        
        stats.forEach(stat => {
            overall.total++;
            if (stat.result === 'win') overall.wins++;
            else if (stat.result === 'loss') overall.losses++;
            else if (stat.result === 'draw') overall.draws++;
        });
        
        return overall;
    }

    async saveSetting(key, value) {
        const transaction = this.db.transaction(['settings'], 'readwrite');
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
            const request = store.put({ key, value });
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async getSetting(key) {
        const transaction = this.db.transaction(['settings'], 'readonly');
        const store = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
            const request = store.get(key);
            request.onsuccess = () => {
                const result = request.result;
                resolve(result ? result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    async clearAllData() {
        const transaction = this.db.transaction(['gameStats', 'gameHistory', 'settings'], 'readwrite');
        
        const statsStore = transaction.objectStore('gameStats');
        const historyStore = transaction.objectStore('gameHistory');
        const settingsStore = transaction.objectStore('settings');
        
        return new Promise((resolve, reject) => {
            let completed = 0;
            const total = 3;
            
            const checkComplete = () => {
                completed++;
                if (completed === total) resolve();
            };
            
            statsStore.clear().onsuccess = checkComplete;
            historyStore.clear().onsuccess = checkComplete;
            settingsStore.clear().onsuccess = checkComplete;
        });
    }
}

const gameDB = new GameDatabase();
