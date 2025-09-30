class Dashboard {
    constructor() {
        this.db = gameDB;
        this.currentTheme = 'light';
        this.init();
    }

    async init() {
        await this.db.init();
        await this.loadTheme();
        await this.loadStats();
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        document.getElementById('clear-data').addEventListener('click', () => {
            this.clearAllData();
        });

        document.getElementById('export-data').addEventListener('click', () => {
            this.exportData();
        });
    }

    async loadTheme() {
        const savedTheme = await this.db.getSetting('theme');
        if (savedTheme) {
            this.currentTheme = savedTheme;
        }
        this.applyTheme();
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.applyTheme();
        this.db.saveSetting('theme', this.currentTheme);
    }

    applyTheme() {
        const root = document.documentElement;
        const themeIcon = document.querySelector('#theme-toggle i');
        
        if (this.currentTheme === 'dark') {
            root.style.setProperty('--bg-primary', '#1a1a1a');
            root.style.setProperty('--bg-secondary', '#2d2d2d');
            root.style.setProperty('--bg-hover', '#3a3a3a');
            root.style.setProperty('--text-primary', '#ffffff');
            root.style.setProperty('--text-secondary', '#b3b3b3');
            root.style.setProperty('--border-color', '#404040');
            root.style.setProperty('--accent-color', '#3b82f6');
            root.style.setProperty('--accent-hover', '#2563eb');
            themeIcon.className = 'fas fa-sun';
        } else {
            root.style.setProperty('--bg-primary', '#ffffff');
            root.style.setProperty('--bg-secondary', '#f8f9fa');
            root.style.setProperty('--bg-hover', '#e9ecef');
            root.style.setProperty('--text-primary', '#212529');
            root.style.setProperty('--text-secondary', '#6c757d');
            root.style.setProperty('--border-color', '#dee2e6');
            root.style.setProperty('--accent-color', '#3b82f6');
            root.style.setProperty('--accent-hover', '#2563eb');
            themeIcon.className = 'fas fa-moon';
        }
    }

    async loadStats() {
        try {
            const overallStats = await this.db.getOverallStats();
            const difficultyStats = await this.db.getDifficultyStats();
            const recentGames = await this.db.getGameHistory(10);

            this.updateOverallStats(overallStats);
            this.updateDifficultyStats(difficultyStats);
            this.updateRecentGames(recentGames);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    updateOverallStats(stats) {
        document.getElementById('total-wins').textContent = stats.wins;
        document.getElementById('total-losses').textContent = stats.losses;
        document.getElementById('total-draws').textContent = stats.draws;
        
        const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
        document.getElementById('win-rate').textContent = winRate + '%';
    }

    updateDifficultyStats(difficultyStats) {
        const container = document.getElementById('difficulty-stats');
        
        if (Object.keys(difficultyStats).length === 0) {
            container.innerHTML = '<div class="loading">No games played yet</div>';
            return;
        }

        const html = Object.entries(difficultyStats).map(([difficulty, stats]) => {
            const winRate = stats.total > 0 ? Math.round((stats.wins / stats.total) * 100) : 0;
            return `
                <div class="difficulty-item">
                    <div class="difficulty-name">${difficulty}</div>
                    <div class="difficulty-stats-details">
                        <span>Wins: ${stats.wins}</span>
                        <span>Losses: ${stats.losses}</span>
                        <span>Draws: ${stats.draws}</span>
                        <span>Win Rate: ${winRate}%</span>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    updateRecentGames(games) {
        const container = document.getElementById('recent-games');
        
        if (games.length === 0) {
            container.innerHTML = '<div class="loading">No games played yet</div>';
            return;
        }

        const html = games.map(game => {
            const date = new Date(game.date).toLocaleDateString();
            const time = new Date(game.date).toLocaleTimeString();
            const duration = game.duration ? Math.round(game.duration / 1000) + 's' : 'N/A';
            const gameModeText = game.gameMode === 'pvc' ? 'vs AI' : 'vs Player';
            
            return `
                <div class="game-item">
                    <div class="game-info">
                        <div class="game-difficulty">${game.difficulty} (${gameModeText})</div>
                        <div class="game-details">${date} at ${time} • ${duration} • ${game.moves} moves</div>
                    </div>
                    <div class="game-result ${game.result}">${game.result}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = html;
    }

    async clearAllData() {
        if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
            try {
                await this.db.clearAllData();
                await this.loadStats();
                alert('All data has been cleared successfully.');
            } catch (error) {
                console.error('Error clearing data:', error);
                alert('Error clearing data. Please try again.');
            }
        }
    }

    async exportData() {
        try {
            const stats = await this.db.getGameStats();
            const history = await this.db.getGameHistory();
            
            const exportData = {
                exportDate: new Date().toISOString(),
                stats: stats,
                history: history
            };

            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `tic-tac-toe-data-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Error exporting data. Please try again.');
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});
