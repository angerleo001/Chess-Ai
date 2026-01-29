/**
 * GLOBAL VARIABLES & STATE
 */
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const msgEl = document.getElementById("game-msg");
const aiBtn = document.getElementById("aiBtn");
const pvpBtn = document.getElementById("pvpBtn");
const promoOverlay = document.getElementById("promotion-overlay");

let mode = "AI";            // Tracks current mode: 'AI' or 'PVP'
let selectedSquare = null;  // Stores the ID of the clicked piece (e.g., 'e2')
let lastMove = null;        // Stores {from, to} for highlighting previous moves
let pendingMove = null;     // Temporary move data during Pawn Promotion selection
let game = new Chess();     // The chess engine that validates rules
let moveHistory = [];       // List of board states (FEN) used for AI learning

/** * PERMANENT BRAIN
 * Loads the learned data from LocalStorage. 
 * Since we aren't resetting, this will grow more powerful every game.
 */
let brain = JSON.parse(localStorage.getItem("chess_brain")) || {};

// PIECE ICON MAP
const pieces = { 
    p: "♟", r: "♜", n: "♞", b: "♝", q: "♛", k: "♚", 
    P: "♙", R: "♖", N: "♘", B: "♗", Q: "♕", K: "♔" 
};

/**
 * INITIALIZATION
 */
aiBtn.onclick = () => resetGame("AI");
pvpBtn.onclick = () => resetGame("PVP");
document.getElementById("resetBtn").onclick = () => resetGame(mode);

/**
 * RESET FUNCTION
 * Clears the board but PRESERVES the 'brain' object in memory.
 */
function resetGame(newMode) {
    game.reset(); 
    mode = newMode;
    selectedSquare = null; 
    lastMove = null; 
    moveHistory = [];
    updateModeUI(); 
    renderBoard();
}

function updateModeUI() {
    aiBtn.classList.toggle("active-mode", mode === "AI");
    pvpBtn.classList.toggle("active-mode", mode === "PVP");
}

/**
 * RENDER BOARD
 * Logic to build the grid and apply visual states like Check or Selected.
 */
function renderBoard() {
    boardEl.innerHTML = "";
    const board = game.board();
    const isCheck = game.in_check();
    const turn = game.turn();

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const squareId = indexToSquare(row * 8 + col);
            const piece = board[row][col];
            const squareDiv = document.createElement("div");

            // Use the colors from your custom CSS variables
            squareDiv.className = `square ${(row + col) % 2 === 0 ? "light" : "dark"}`;

            if (piece) {
                const key = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
                squareDiv.textContent = pieces[key];
                squareDiv.style.color = piece.color === 'w' ? '#fff' : '#000';
                
                // KING CHECK HIGHLIGHT
                // Triggers the 'check-glow' animation from your CSS
                if (isCheck && piece.type === 'k' && piece.color === turn) {
                    squareDiv.classList.add("check-glow");
                }
            }

            // HIGHLIGHT LOGIC
            if (selectedSquare === squareId) squareDiv.classList.add("selected");
            if (lastMove && (squareId === lastMove.from || squareId === lastMove.to)) {
                squareDiv.classList.add("last-move");
            }
            
            // VALID MOVE DOTS: Highlighting legal targets for the selected piece
            if (selectedSquare) {
                const moves = game.moves({ square: selectedSquare, verbose: true });
                if (moves.some(m => m.to === squareId)) squareDiv.classList.add("move");
            }

            squareDiv.onclick = () => onSquareClick(squareId);
            boardEl.appendChild(squareDiv);
        }
    }
    updateStatus();
}

/**
 * MOVE LOGIC
 */
function onSquareClick(squareId) {
    if (game.game_over() || (mode === "AI" && game.turn() === 'b')) return;

    if (!selectedSquare) {
        const piece = game.get(squareId);
        if (piece && piece.color === game.turn()) { 
            selectedSquare = squareId; 
            renderBoard(); 
        }
    } else {
        const piece = game.get(selectedSquare);
        
        // CHECK FOR PAWN PROMOTION
        const isPromotion = piece.type === 'p' && (squareId[1] === '8' || squareId[1] === '1');
        const legalMoves = game.moves({square: selectedSquare, verbose: true});

        if (isPromotion && legalMoves.some(m => m.to === squareId)) {
            pendingMove = { from: selectedSquare, to: squareId };
            promoOverlay.style.display = "flex"; 
            return;
        }

        executeMove(selectedSquare, squareId, 'q'); // Default to Queen if not special
    }
}

function executeMove(from, to, promotion) {
    const move = game.move({ from, to, promotion });
    if (move) {
        lastMove = { from: move.from, to: move.to };
        moveHistory.push(game.fen()); // Record the state for learning
        selectedSquare = null; 
        renderBoard();

        if (mode === "AI" && !game.game_over()) {
            setTimeout(makeLearningAiMove, 300);
        }
    } else {
        // Handle piece re-selection or deselection
        const piece = game.get(to);
        selectedSquare = (piece && piece.color === game.turn()) ? to : null;
        renderBoard();
    }
}

// Global scope function for the Promotion Overlay buttons
window.selectPromotion = function(p) {
    promoOverlay.style.display = "none";
    if (pendingMove) {
        executeMove(pendingMove.from, pendingMove.to, p);
        pendingMove = null;
    }
};

/**
 * STATUS DISPLAY
 * Matches the format you requested: "Status: Vs (Mode)" on top, details below.
 */
function updateStatus() {
    const turnText = game.turn() === 'w' ? "White's" : "Black's";
    
    // Header Status
    statusEl.textContent = `Vs (${mode})`;

    // Lower Message details
    if (game.in_checkmate()) {
        const winner = game.turn() === 'w' ? "Black" : "White";
        msgEl.textContent = `Checkmate! ${winner} Wins`;
        learnFromGame(winner); // AI processes the loss or win
    } else if (game.in_draw()) {
        msgEl.textContent = "Draw Game";
    } else {
        msgEl.textContent = `${turnText} Move ${game.in_check() ? "(Check!)" : ""}`;
    }
}

/**
 * AI CORE (REINFORCEMENT LEARNING)
 */
function makeLearningAiMove() {
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    let bestMove = moves[0];
    let bestScore = -Infinity;

    moves.forEach(m => {
        game.move(m.san);
        const fen = game.fen().split(' ')[0]; // Key for the board state
        
        /**
         * AI CALCULATION
         * -evaluateBoard: Standard material count (Knowledge)
         * brain[fen]: Learned experience from previous games (Memory)
         * Math.random: Prevents the AI from becoming a predictable "bot"
         */
        let score = -evaluateBoard(game.board()) + (brain[fen] || 0) + (Math.random() * 0.1);
        
        game.undo();

        if (score > bestScore) {
            bestScore = score;
            bestMove = m;
        }
    });

    game.move(bestMove.san);
    lastMove = { from: bestMove.from, to: bestMove.to };
    moveHistory.push(game.fen());
    renderBoard();
}

/**
 * THE LEARNING MECHANISM
 * This updates the brain. Since brain is defined globally, it keeps growing.
 */
function learnFromGame(winner) {
    // If the AI (Black) lost, we apply a massive penalty to those board states.
    const penalty = winner === "Black" ? 20 : -100; 
    
    moveHistory.forEach(f => {
        const state = f.split(' ')[0];
        brain[state] = (brain[state] || 0) + penalty;
    });
    
    // Save the brain to LocalStorage so it survives a browser refresh.
    localStorage.setItem("chess_brain", JSON.stringify(brain));
}

function evaluateBoard(b) {
    const v = { p: 10, n: 30, b: 30, r: 50, q: 90, k: 900 };
    return b.flat().reduce((acc, p) => p ? acc + (p.color === 'w' ? v[p.type] : -v[p.type]) : acc, 0);
}

function indexToSquare(i) { 
    return String.fromCharCode(97 + (i % 8)) + (8 - Math.floor(i / 8)); 
}

resetGame("AI");