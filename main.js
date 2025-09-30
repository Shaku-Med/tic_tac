
var board = [
	[0, 0, 0],
	[0, 0, 0],
	[0, 0, 0],
];

var HUMAN = -1;
var COMP = +1;

// Game mode: 'pvc' (Player vs Computer) or 'pvp' (Player vs Player)
var gameMode = 'pvc';
var currentPlayer = HUMAN;

window.addEventListener('DOMContentLoaded', function() {
	// Game mode selector
	var modeSelect = document.getElementById('game-mode');
	var diffContainer = document.getElementById('difficulty-container');
	if (modeSelect) {
		modeSelect.addEventListener('change', function() {
			gameMode = modeSelect.value;
			if (gameMode === 'pvp') {
				diffContainer.style.display = 'none';
				document.getElementById('bttn-restart').value = 'Restart';
				document.getElementById('message').textContent = "Player 1's turn (X)";
			} else {
				diffContainer.style.display = '';
				document.getElementById('bttn-restart').value = 'Computer Start';
				document.getElementById('message').textContent = '';
			}
			restartGame();
		});
	}
});

function restartGame() {
	for (var x = 0; x < 3; x++) {
		for (var y = 0; y < 3; y++) {
			board[x][y] = 0;
			var htmlBoard = document.getElementById(String(x) + String(y));
			htmlBoard.style.color = '#444';
			htmlBoard.innerHTML = '';
		}
	}
	currentPlayer = HUMAN;
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

function aiTurn() {
	var x, y;
	var move;
	var cell;

	if (emptyCells(board).length == 9) {
		x = parseInt(Math.random() * 3);
		y = parseInt(Math.random() * 3);
	} else {
		move = minimax(board, emptyCells(board).length, COMP);
		x = move[0];
		y = move[1];
	}

	if (setMove(x, y, COMP)) {
		cell = document.getElementById(String(x) + String(y));
		cell.innerHTML = "O";
	}
	currentPlayer = HUMAN;
}

function clickedCell(cell) {
	var button = document.getElementById("bttn-restart");
	button.disabled = true;
	var msg = document.getElementById("message");
	var x = parseInt(cell.id[0]);
	var y = parseInt(cell.id[1]);
	if (gameOverAll(board) || emptyCells(board).length === 0 || cell.innerHTML !== "") return;

	if (gameMode === 'pvp') {
		// PvP mode
		if (currentPlayer === HUMAN) {
			if (setMove(x, y, HUMAN)) {
				cell.innerHTML = "X";
				if (gameOver(board, HUMAN)) {
					msg.textContent = "Player 1 (X) wins!";
				} else if (emptyCells(board).length === 0) {
					msg.textContent = "Draw!";
				} else {
					currentPlayer = COMP;
					msg.textContent = "Player 2's turn (O)";
				}
			}
		} else {
			if (setMove(x, y, COMP)) {
				cell.innerHTML = "O";
				if (gameOver(board, COMP)) {
					msg.textContent = "Player 2 (O) wins!";
				} else if (emptyCells(board).length === 0) {
					msg.textContent = "Draw!";
				} else {
					currentPlayer = HUMAN;
					msg.textContent = "Player 1's turn (X)";
				}
			}
		}
		if (gameOverAll(board) || emptyCells(board).length === 0) {
			button.value = "Restart";
			button.disabled = false;
		}
		return;
	}

	// PvC mode
	var move = setMove(x, y, HUMAN);
	if (move === true) {
		cell.innerHTML = "X";
		if (!gameOverAll(board) && emptyCells(board).length > 0) {
			setTimeout(function() {
				aiTurn();
				if (gameOver(board, COMP)) {
					msg.textContent = "You lose!";
				} else if (emptyCells(board).length === 0 && !gameOverAll(board)) {
					msg.textContent = "Draw!";
				}
				if (gameOverAll(board) || emptyCells(board).length === 0) {
					button.value = "Restart";
					button.disabled = false;
				}
			}, 300);
		}
	}
	if (gameOver(board, COMP)) {
		msg.textContent = "You lose!";
	}
	if (emptyCells(board).length === 0 && !gameOverAll(board)) {
		msg.textContent = "Draw!";
	}
	if (gameOverAll(board) || emptyCells(board).length === 0) {
		button.value = "Restart";
		button.disabled = false;
	}
}

function restartBttn(button) {
	var msg = document.getElementById("message");
	if (gameMode === 'pvc') {
		if (button.value === "Computer Start") {
			aiTurn();
			button.disabled = true;
		} else if (button.value === "Restart") {
			restartGame();
			button.value = "Computer Start";
			msg.textContent = '';
		}
	} else {
		// PvP
		restartGame();
		button.value = "Restart";
		msg.textContent = "Player 1's turn (X)";
	}
}
