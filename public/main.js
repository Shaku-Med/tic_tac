
var board = [
	[0, 0, 0],
	[0, 0, 0],
	[0, 0, 0],
];

var HUMAN = -1;
var COMP = +1;

var gameMode = 'pvc';
var currentPlayer = HUMAN;
var difficulty = 'Smart';
var gameStartTime = null;
var moveCount = 0;
var currentTheme = 'light';

window.addEventListener('DOMContentLoaded', async function() {
	await gameDB.init();
	await loadTheme();
	await loadGameSettings();
	gameAnimations.init();
	gameSounds.init();
	
	var modeSelect = document.getElementById('game-mode');
	var diffContainer = document.getElementById('difficulty-container');
	var diffSelect = document.getElementById('difficulty');
	var themeToggle = document.getElementById('theme-toggle');
	var soundToggle = document.getElementById('sound-toggle');
	
	if (modeSelect) {
		modeSelect.addEventListener('change', function() {
			gameMode = modeSelect.value;
			gameDB.saveSetting('gameMode', gameMode);
			if (gameMode === 'pvp') {
				diffContainer.style.display = 'none';
				document.getElementById('bttn-restart').innerHTML = '<i class="fas fa-play"></i> Restart';
				document.getElementById('message').textContent = "Player 1's turn (X)";
			} else {
				diffContainer.style.display = '';
				document.getElementById('bttn-restart').innerHTML = '<i class="fas fa-play"></i> Computer Start';
				updateDifficultyDisplay();
			}
			restartGame();
		});
	}
	
	if (diffSelect) {
		diffSelect.addEventListener('change', function() {
			difficulty = diffSelect.value;
			gameDB.saveSetting('difficulty', difficulty);
			updateDifficultyDisplay();
		});
	}
	
	if (themeToggle) {
		themeToggle.addEventListener('click', toggleTheme);
	}
	
	if (soundToggle) {
		soundToggle.addEventListener('click', toggleSound);
		updateSoundButton();
	}
	
	updateDifficultyDisplay();
	
	// Add hover sound effects to game cells
	const cells = document.querySelectorAll('#tab-ttt td');
	cells.forEach(cell => {
		cell.addEventListener('mouseenter', function() {
			if (this.innerHTML === "" && !gameOverAll(board)) {
				gameSounds.playCellHover();
			}
		});
	});
	
	// Multiplayer removed
});

function restartGame() {
	for (var x = 0; x < 3; x++) {
		for (var y = 0; y < 3; y++) {
			board[x][y] = 0;
			var htmlBoard = document.getElementById(String(x) + String(y));
			htmlBoard.style.color = '';
			htmlBoard.innerHTML = '';
			htmlBoard.classList.remove('cell-animation', 'winning-cell');
		}
	}
	
	var winLines = document.querySelectorAll('.win-line');
	winLines.forEach(function(line) {
		line.remove();
	});
	
	hideAIThinking();
	currentPlayer = HUMAN;
	gameStartTime = Date.now();
	moveCount = 0;
}

function evalute(state) {
	var score = 0;

	if (gameOver(state, COMP)) {
		score = +1;
	}
	else if (gameOver(state, HUMAN)) {
		score = -1;
	} else {
		score = 0;
	}

	return score;
}

function gameOver(state, player) {
	var win_state = [
		[state[0][0], state[0][1], state[0][2]],
		[state[1][0], state[1][1], state[1][2]],
		[state[2][0], state[2][1], state[2][2]],
		[state[0][0], state[1][0], state[2][0]],
		[state[0][1], state[1][1], state[2][1]],
		[state[0][2], state[1][2], state[2][2]],
		[state[0][0], state[1][1], state[2][2]],
		[state[2][0], state[1][1], state[0][2]],
	];

	for (var i = 0; i < 8; i++) {
		var line = win_state[i];
		var filled = 0;
		for (var j = 0; j < 3; j++) {
			if (line[j] == player)
				filled++;
		}
		if (filled == 3)
			return true;
	}
	return false;
}

function getWinningLine(state, player) {
	var win_state = [
		[state[0][0], state[0][1], state[0][2]],
		[state[1][0], state[1][1], state[1][2]],
		[state[2][0], state[2][1], state[2][2]],
		[state[0][0], state[1][0], state[2][0]],
		[state[0][1], state[1][1], state[2][1]],
		[state[0][2], state[1][2], state[2][2]],
		[state[0][0], state[1][1], state[2][2]],
		[state[2][0], state[1][1], state[0][2]],
	];

	var win_positions = [
		[[0,0], [0,1], [0,2]],
		[[1,0], [1,1], [1,2]],
		[[2,0], [2,1], [2,2]],
		[[0,0], [1,0], [2,0]],
		[[0,1], [1,1], [2,1]],
		[[0,2], [1,2], [2,2]],
		[[0,0], [1,1], [2,2]],
		[[2,0], [1,1], [0,2]],
	];

	for (var i = 0; i < 8; i++) {
		var line = win_state[i];
		var filled = 0;
		for (var j = 0; j < 3; j++) {
			if (line[j] == player)
				filled++;
		}
		if (filled == 3)
			return { line: i, positions: win_positions[i] };
	}
	return null;
}

function gameOverAll(state) {
	return gameOver(state, HUMAN) || gameOver(state, COMP);
}

function emptyCells(state) {
	var cells = [];
	for (var x = 0; x < 3; x++) {
		for (var y = 0; y < 3; y++) {
			if (state[x][y] == 0)
				cells.push([x, y]);
		}
	}

	return cells;
}

function validMove(x, y) {
	var empties = emptyCells(board);
	try {
		if (board[x][y] == 0) {
			return true;
		}
		else {
			return false;
		}
	} catch (e) {
		return false;
	}
}

function setMove(x, y, player) {
	if (validMove(x, y)) {
		board[x][y] = player;
		return true;
	}
	else {
		return false;
	}
}

function minimax(state, depth, player) {
	var best;

	if (player == COMP) {
		best = [-1, -1, -1000];
	}
	else {
		best = [-1, -1, +1000];
	}

	if (depth == 0 || gameOverAll(state)) {
		var score = evalute(state);
		return [-1, -1, score];
	}

	emptyCells(state).forEach(function (cell) {
		var x = cell[0];
		var y = cell[1];
		state[x][y] = player;
		var score = minimax(state, depth - 1, -player);
		state[x][y] = 0;
		score[0] = x;
		score[1] = y;

		if (player == COMP) {
			if (score[2] > best[2])
				best = score;
		}
		else {
			if (score[2] < best[2])
				best = score;
		}
	});

	return best;
}

function getRandomMove() {
	var empties = emptyCells(board);
	if (empties.length > 0) {
		var randomIndex = Math.floor(Math.random() * empties.length);
		return empties[randomIndex];
	}
	return [-1, -1];
}

function getVeryEasyMove() {
	return getRandomMove();
}

function getEasyMove() {
	var empties = emptyCells(board);
	if (empties.length > 0) {
		if (Math.random() < 0.8) {
			return getRandomMove();
		}
	}
	return getBasicMove();
}

function getStupidMove() {
	var empties = emptyCells(board);
	if (empties.length > 0) {
		if (Math.random() < 0.9) {
			return getRandomMove();
		}
	}
	
	for (var i = 0; i < empties.length; i++) {
		var x = empties[i][0];
		var y = empties[i][1];
		board[x][y] = COMP;
		if (gameOver(board, COMP)) {
			board[x][y] = 0;
			if (Math.random() < 0.3) {
				return getRandomMove();
			}
			return [x, y];
		}
		board[x][y] = 0;
	}
	
	return getRandomMove();
}

function getBasicMove() {
	var empties = emptyCells(board);
	if (empties.length === 9) {
		return getRandomMove();
	}
	
	for (var i = 0; i < empties.length; i++) {
		var x = empties[i][0];
		var y = empties[i][1];
		board[x][y] = COMP;
		if (gameOver(board, COMP)) {
			board[x][y] = 0;
			return [x, y];
		}
		board[x][y] = 0;
	}
	
	return getRandomMove();
}

function getSmartMove() {
	var empties = emptyCells(board);
	if (empties.length === 9) {
		return getRandomMove();
	}
	
	for (var i = 0; i < empties.length; i++) {
		var x = empties[i][0];
		var y = empties[i][1];
		board[x][y] = COMP;
		if (gameOver(board, COMP)) {
			board[x][y] = 0;
			return [x, y];
		}
		board[x][y] = 0;
	}
	
	for (var i = 0; i < empties.length; i++) {
		var x = empties[i][0];
		var y = empties[i][1];
		board[x][y] = HUMAN;
		if (gameOver(board, HUMAN)) {
			board[x][y] = 0;
			return [x, y];
		}
		board[x][y] = 0;
	}
	
	if (empties.length === 8) {
		var corners = [[0,0], [0,2], [2,0], [2,2]];
		var center = [1,1];
		if (board[1][1] === 0) return center;
		for (var i = 0; i < corners.length; i++) {
			var corner = corners[i];
			if (board[corner[0]][corner[1]] === 0) {
				return corner;
			}
		}
	}
	
	return getRandomMove();
}

function getAdvancedMove() {
	var empties = emptyCells(board);
	if (empties.length === 9) {
		return getRandomMove();
	}
	
	for (var i = 0; i < empties.length; i++) {
		var x = empties[i][0];
		var y = empties[i][1];
		board[x][y] = COMP;
		if (gameOver(board, COMP)) {
			board[x][y] = 0;
			return [x, y];
		}
		board[x][y] = 0;
	}
	
	for (var i = 0; i < empties.length; i++) {
		var x = empties[i][0];
		var y = empties[i][1];
		board[x][y] = HUMAN;
		if (gameOver(board, HUMAN)) {
			board[x][y] = 0;
			return [x, y];
		}
		board[x][y] = 0;
	}
	
	if (empties.length === 8) {
		var corners = [[0,0], [0,2], [2,0], [2,2]];
		var center = [1,1];
		if (board[1][1] === 0) return center;
		for (var i = 0; i < corners.length; i++) {
			var corner = corners[i];
			if (board[corner[0]][corner[1]] === 0) {
				return corner;
			}
		}
	}
	
	if (empties.length === 7) {
		var edges = [[0,1], [1,0], [1,2], [2,1]];
		for (var i = 0; i < edges.length; i++) {
			var edge = edges[i];
			if (board[edge[0]][edge[1]] === 0) {
				return edge;
			}
		}
	}
	
	return getRandomMove();
}

function getProMove() {
	var move = minimax(board, emptyCells(board).length, COMP);
	return [move[0], move[1]];
}

function showAIThinking() {
	var thinking = document.getElementById('ai-thinking');
	thinking.classList.add('show');
}

function hideAIThinking() {
	var thinking = document.getElementById('ai-thinking');
	thinking.classList.remove('show');
}

function highlightWinningCells(winningLine) {
	if (!winningLine) return;
	
	winningLine.positions.forEach(function(pos) {
		var cell = document.getElementById(String(pos[0]) + String(pos[1]));
		cell.classList.add('winning-cell');
	});
	
	drawWinLine(winningLine);
}

function drawWinLine(winningLine) {
	var table = document.getElementById('tab-ttt');
	var winLine = document.createElement('div');
	winLine.className = 'win-line';
	
	var positions = winningLine.positions;
	var cell1 = document.getElementById(String(positions[0][0]) + String(positions[0][1]));
	var cell2 = document.getElementById(String(positions[2][0]) + String(positions[2][1]));
	
	var rect1 = cell1.getBoundingClientRect();
	var rect2 = cell2.getBoundingClientRect();
	var tableRect = table.getBoundingClientRect();
	
	var top = Math.min(rect1.top, rect2.top) - tableRect.top + 60;
	var left = Math.min(rect1.left, rect2.left) - tableRect.left + 60;
	
	if (winningLine.line < 3) {
		winLine.classList.add('horizontal');
		winLine.style.top = top + 'px';
		winLine.style.left = left + 'px';
		winLine.style.width = '240px';
	} else if (winningLine.line < 6) {
		winLine.classList.add('vertical');
		winLine.style.top = top + 'px';
		winLine.style.left = left + 'px';
		winLine.style.height = '240px';
	} else {
		winLine.classList.add('diagonal');
		winLine.style.top = top + 'px';
		winLine.style.left = left + 'px';
		winLine.style.width = '340px';
		winLine.style.transform = winningLine.line === 6 ? 'rotate(45deg)' : 'rotate(-45deg)';
	}
	
	table.appendChild(winLine);
}

function aiTurn() {
	showAIThinking();
	gameSounds.playAIThinking();
	
	setTimeout(function() {
	var x, y;
	var move;
	var cell;
		var msg = document.getElementById("message");
		var button = document.getElementById("bttn-restart");
		
		switch(difficulty) {
			case 'Very Easy':
				move = getVeryEasyMove();
				break;
			case 'Easy':
				move = getStupidMove();
				break;
			case 'Smart':
				move = getBasicMove();
				break;
			case 'Easy Pro':
				move = getSmartMove();
				break;
			case 'Medium Smart':
				move = getSmartMove();
				break;
			case 'Smarter':
				move = getAdvancedMove();
				break;
			case 'Thinker':
				move = getAdvancedMove();
				break;
			case 'Human Like':
				move = getAdvancedMove();
				break;
			case 'Pro':
				move = getAdvancedMove();
				break;
			case 'Ledgen':
				move = getProMove();
				break;
			case 'Un-Beatable':
				move = getProMove();
				break;
			default:
				move = getSmartMove();
		}

		x = move[0];
		y = move[1];

	if (setMove(x, y, COMP)) {
		cell = document.getElementById(String(x) + String(y));
		cell.innerHTML = "O";
			cell.style.color = 'var(--accent-color)';
			cell.classList.add('cell-animation');
			moveCount++;
			gameSounds.playMove();
			
			// Check if AI won after making the move
			if (gameOver(board, COMP)) {
				console.log('AI won! Showing loss animation...');
				var winningLine = getWinningLine(board, COMP);
				highlightWinningCells(winningLine);
				msg.innerHTML = '<i class="fas fa-robot"></i> AI Wins! Better luck next time!';
				msg.style.color = 'var(--danger-color)';
				msg.classList.add('message-animation');
				gameAnimations.showSkeleton();
				gameSounds.playLose();
				saveGameResult('loss');
				showNewGameButton();
				button.innerHTML = '<i class="fas fa-redo"></i> Restart';
				button.disabled = false;
				button.style.display = 'inline-flex';
				hideAIThinking();
				return;
			}
			
			// Check if it's a draw
			if (emptyCells(board).length === 0) {
				console.log('Game is a draw!');
				msg.innerHTML = '<i class="fas fa-handshake"></i> Draw!';
				msg.style.color = 'var(--warning-color)';
				msg.classList.add('message-animation');
				gameAnimations.showDraw();
				saveGameResult('draw');
				showNewGameButton();
				button.innerHTML = '<i class="fas fa-redo"></i> Restart';
				button.disabled = false;
				button.style.display = 'inline-flex';
				hideAIThinking();
				return;
			}
		}
		
		hideAIThinking();
	currentPlayer = HUMAN;
	}, 800);
}

function updateStats() {
	var stats = localStorage.getItem('ticTacStats');
	if (stats) {
		gameStats = JSON.parse(stats);
	}
}

function saveStats() {
	localStorage.setItem('ticTacStats', JSON.stringify(gameStats));
}

function clickedCell(cell) {
	var button = document.getElementById("bttn-restart");
	button.disabled = true;
	var msg = document.getElementById("message");
	var x = parseInt(cell.id[0]);
	var y = parseInt(cell.id[1]);
	if (gameOverAll(board) || emptyCells(board).length === 0 || cell.innerHTML !== "") return;

	// Multiplayer removed

	cell.classList.add('cell-animation');
	moveCount++;
	gameSounds.playMove();

	if (gameMode === 'pvp') {
		if (currentPlayer === HUMAN) {
			if (setMove(x, y, HUMAN)) {
				cell.innerHTML = "X";
				cell.style.color = 'var(--danger-color)';
				if (gameOver(board, HUMAN)) {
					var winningLine = getWinningLine(board, HUMAN);
					highlightWinningCells(winningLine);
					msg.innerHTML = '<i class="fas fa-trophy"></i> Player 1 (X) wins!';
					msg.style.color = 'var(--success-color)';
					msg.classList.add('message-animation');
					gameAnimations.showConfetti();
					gameSounds.playWin();
					saveGameResult('win');
					showNewGameButton();
					button.innerHTML = '<i class="fas fa-redo"></i> Restart';
					button.disabled = false;
					button.style.display = 'inline-flex';
				} else if (emptyCells(board).length === 0) {
					msg.innerHTML = '<i class="fas fa-handshake"></i> Draw!';
					msg.style.color = 'var(--warning-color)';
					msg.classList.add('message-animation');
					gameAnimations.showDraw();
					saveGameResult('draw');
					showNewGameButton();
					button.innerHTML = '<i class="fas fa-redo"></i> Restart';
					button.disabled = false;
					button.style.display = 'inline-flex';
				} else {
					currentPlayer = COMP;
					msg.innerHTML = '<i class="fas fa-user"></i> Player 2\'s turn (O)';
					msg.style.color = 'var(--accent-color)';
				}
			}
		} else {
			if (setMove(x, y, COMP)) {
				cell.innerHTML = "O";
				cell.style.color = 'var(--accent-color)';
				if (gameOver(board, COMP)) {
					var winningLine = getWinningLine(board, COMP);
					highlightWinningCells(winningLine);
					msg.innerHTML = '<i class="fas fa-trophy"></i> Player 2 (O) wins!';
					msg.style.color = 'var(--success-color)';
					msg.classList.add('message-animation');
					gameAnimations.showConfetti();
					saveGameResult('loss');
					showNewGameButton();
					button.innerHTML = '<i class="fas fa-redo"></i> Restart';
					button.disabled = false;
					button.style.display = 'inline-flex';
				} else if (emptyCells(board).length === 0) {
					msg.innerHTML = '<i class="fas fa-handshake"></i> Draw!';
					msg.style.color = 'var(--warning-color)';
					msg.classList.add('message-animation');
					gameAnimations.showDraw();
					saveGameResult('draw');
					showNewGameButton();
					button.innerHTML = '<i class="fas fa-redo"></i> Restart';
					button.disabled = false;
					button.style.display = 'inline-flex';
				} else {
					currentPlayer = HUMAN;
					msg.innerHTML = '<i class="fas fa-user"></i> Player 1\'s turn (X)';
					msg.style.color = 'var(--danger-color)';
				}
			}
		}
		return;
	}

	var move = setMove(x, y, HUMAN);
	if (move === true) {
		cell.innerHTML = "X";
		cell.style.color = 'var(--danger-color)';
		if (!gameOverAll(board) && emptyCells(board).length > 0) {
			setTimeout(function() {
				aiTurn();
				// Win detection is now handled in aiTurn() function
			}, 200);
		}
	}
	if (gameOver(board, HUMAN)) {
		var winningLine = getWinningLine(board, HUMAN);
		highlightWinningCells(winningLine);
		msg.innerHTML = '<i class="fas fa-trophy"></i> You win!';
		msg.style.color = 'var(--success-color)';
		msg.classList.add('message-animation');
		gameAnimations.showConfetti();
		saveGameResult('win');
		showNewGameButton();
		button.innerHTML = '<i class="fas fa-redo"></i> Restart';
		button.disabled = false;
		button.style.display = 'inline-flex';
	}
	// AI win detection is now handled in aiTurn() function
	if (emptyCells(board).length === 0 && !gameOverAll(board)) {
		msg.innerHTML = '<i class="fas fa-handshake"></i> Draw!';
		msg.style.color = 'var(--warning-color)';
		msg.classList.add('message-animation');
		gameAnimations.showDraw();
		saveGameResult('draw');
		showNewGameButton();
		button.innerHTML = '<i class="fas fa-redo"></i> Restart';
		button.disabled = false;
		button.style.display = 'inline-flex';
	}
}

function restartBttn(button) {
	gameSounds.playButtonClick();
	
	// Multiplayer removed
	
	var msg = document.getElementById("message");
	msg.classList.remove('message-animation');
	gameAnimations.clearCanvas();
	
	if (gameMode === 'pvc') {
		if (button.innerHTML.includes("Computer Start")) {
			aiTurn();
			button.disabled = true;
		} else if (button.innerHTML.includes("Restart")) {
			restartGame();
			button.innerHTML = '<i class="fas fa-play"></i> Computer Start';
			button.disabled = false;
			updateDifficultyDisplay();
		}
	} else {
		restartGame();
		button.innerHTML = '<i class="fas fa-redo"></i> Restart';
		button.disabled = false;
		msg.innerHTML = '<i class="fas fa-user"></i> Player 1\'s turn (X)';
		msg.style.color = 'var(--danger-color)';
	}
}

function updateDifficultyDisplay() {
	var msg = document.getElementById("message");
	if (gameMode === 'pvc') {
		var difficultyText = '';
		switch(difficulty) {
			case 'Very Easy':
				difficultyText = '<i class="fas fa-robot"></i> Very Easy - AI plays randomly';
				break;
			case 'Easy':
				difficultyText = '<i class="fas fa-smile"></i> Easy - AI is quite stupid and makes mistakes';
				break;
			case 'Smart':
				difficultyText = '<i class="fas fa-brain"></i> Smart - AI tries to win but not too hard';
				break;
			case 'Easy Pro':
				difficultyText = '<i class="fas fa-star"></i> Easy Pro - AI blocks wins and takes wins';
				break;
			case 'Medium Smart':
				difficultyText = '<i class="fas fa-bullseye"></i> Medium Smart - AI uses basic strategy';
				break;
			case 'Smarter':
				difficultyText = '<i class="fas fa-rocket"></i> Smarter - AI uses advanced positioning';
				break;
			case 'Thinker':
				difficultyText = '<i class="fas fa-lightbulb"></i> Thinker - AI thinks several moves ahead';
				break;
			case 'Human Like':
				difficultyText = '<i class="fas fa-user"></i> Human Like - AI plays like a skilled human';
				break;
			case 'Pro':
				difficultyText = '<i class="fas fa-trophy"></i> Pro - AI uses professional strategies';
				break;
			case 'Ledgen':
				difficultyText = '<i class="fas fa-crown"></i> Legend - AI is nearly unbeatable';
				break;
			case 'Un-Beatable':
				difficultyText = '<i class="fas fa-skull"></i> Un-Beatable - AI is perfect (impossible to beat)';
				break;
			default:
				difficultyText = '<i class="fas fa-gamepad"></i> Select a difficulty to start!';
		}
		msg.innerHTML = difficultyText;
		msg.style.color = 'var(--warning-color)';
	}
}

async function loadTheme() {
	const savedTheme = await gameDB.getSetting('theme');
	if (savedTheme) {
		currentTheme = savedTheme;
	}
	applyTheme();
}

async function loadGameSettings() {
	const savedGameMode = await gameDB.getSetting('gameMode');
	const savedDifficulty = await gameDB.getSetting('difficulty');
	
	if (savedGameMode) {
		gameMode = savedGameMode;
		document.getElementById('game-mode').value = gameMode;
	}
	
	if (savedDifficulty) {
		difficulty = savedDifficulty;
		document.getElementById('difficulty').value = difficulty;
	}
}

function toggleTheme() {
	currentTheme = currentTheme === 'light' ? 'dark' : 'light';
	applyTheme();
	gameDB.saveSetting('theme', currentTheme);
}

function applyTheme() {
	const root = document.documentElement;
	const themeIcon = document.querySelector('#theme-toggle i');
	
	if (currentTheme === 'dark') {
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

async function saveGameResult(result) {
	const duration = gameStartTime ? Date.now() - gameStartTime : 0;
	
	const gameStats = {
		difficulty: difficulty,
		gameMode: gameMode,
		result: result,
		moves: moveCount,
		duration: duration,
		date: new Date().toISOString()
	};
	
	const gameHistory = {
		difficulty: difficulty,
		gameMode: gameMode,
		result: result,
		moves: moveCount,
		board: JSON.parse(JSON.stringify(board)),
		duration: duration,
		date: new Date().toISOString()
	};
	
	try {
		await gameDB.addGameStats(gameStats);
		await gameDB.addGameHistory(gameHistory);
		console.log('Game data saved successfully:', { result, difficulty, gameMode, moves: moveCount, duration });
	} catch (error) {
		console.error('Error saving game data:', error);
	}
}

function showNewGameButton() {
	document.getElementById('bttn-restart').style.display = 'none';
	document.getElementById('bttn-new-game').style.display = 'inline-flex';
}

function showAIWinCelebration() {
	gameAnimations.showSkeleton();
	setTimeout(() => {
		gameAnimations.clearCanvas();
	}, 3000);
}

function newGame() {
	gameSounds.playButtonClick();
		restartGame();
	document.getElementById('bttn-restart').style.display = 'inline-flex';
	document.getElementById('bttn-new-game').style.display = 'none';
	updateDifficultyDisplay();
}

function toggleSound() {
	const enabled = gameSounds.toggle();
	updateSoundButton();
	gameSounds.playButtonClick();
}

function updateSoundButton() {
	const soundToggle = document.getElementById('sound-toggle');
	const icon = soundToggle.querySelector('i');
	if (gameSounds.enabled) {
		icon.className = 'fas fa-volume-up';
		soundToggle.title = 'Disable Sound';
	} else {
		icon.className = 'fas fa-volume-mute';
		soundToggle.title = 'Enable Sound';
	}
}

function showStats() {
	window.location.href = 'dashboard.html';
}

// Multiplayer removed

// Test function to verify AI win detection
function testAIWin() {
	console.log('Testing AI win detection...');
	board = [
		[COMP, COMP, COMP],
		[HUMAN, HUMAN, 0],
		[0, 0, 0]
	];
	console.log('Board set for AI win:', board);
	console.log('gameOver(board, COMP):', gameOver(board, COMP));
}
