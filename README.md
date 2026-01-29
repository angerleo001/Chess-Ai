# ♚ Premium Chess AI

A sleek, responsive, and high-performance Chess application featuring **Aaisha**, a self-learning AI built with Reinforcement Learning. Play locally against a friend or challenge an AI that evolves every time it loses.

!

## 🚀 Key Features

* **Self-Learning AI (Reinforcement Learning):** Unlike static bots, Aaisha records every game state. If she is checkmated, she applies a heavy penalty to those moves in her "brain" (localStorage), ensuring she rarely falls for the same trap twice.
* **Premium UI/UX:** A modern dark-themed interface built with CSS variables, featuring smooth transitions and radial-gradient highlights.
* **Fully Responsive:** Play on any device. The board scales dynamically using CSS `calc()` and viewport units for a native app-like experience on mobile.
* **Pro Chess Rules:** * Full move validation via `chess.js`.
    * **Pawn Promotion:** Interactive overlay to choose Queen, Rook, Bishop, or Knight.
    * **King Safety:** The King pulses red when in check, providing immediate visual feedback.
    * **Last Move Highlight:** Easily track the flow of the game.

## 🛠️ Built With

* **HTML5 & CSS3:** Custom UI with responsive grid layouts.
* **JavaScript (ES6+):** Pure JS logic for the learning algorithm and DOM manipulation.
* **[Chess.js](https://github.com/jhlywa/chess.js):** Used for move validation and game state management.

## 🧠 How the AI Works

The AI uses a combination of **Material Evaluation** and **Reinforcement Learning**:
1.  **Material Weight:** Aaisha knows the value of pieces ($Q=90, R=50, B/N=30, P=10$).
2.  **Memory:** Every board state is saved to a "Brain" object in `localStorage`.
3.  **The Penalty System:** When the game ends in checkmate, the AI backtracks through its `moveHistory`. If it lost, it applies a $-100$ score to those positions, forcing it to explore different paths in future games.

## 📱 Mobile Preview

The layout automatically shifts for smaller screens, stacking the game controls below the board for better thumb-reach.



## 🔧 Installation & Usage

1. **Clone the repo:**
   ```bash
   git clone https://github.com/angerleo001/Chess-Ai.git

2. **Run the index.html file**
