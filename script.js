document.addEventListener("DOMContentLoaded", () => {
    const gb = document.getElementById("game-board");
    const rb = document.getElementById("reset-button");
    const ti = document.getElementById("turn-indicator");
    const bsi = document.getElementById("board-size");
    const asb = document.getElementById("apply-size-button");
    const smt = document.getElementById("solo-mode-toggle");
    const p1n = document.getElementById("player1-name");
    const p2n = document.getElementById("player2-name");
    const p1s = document.getElementById("player1-score");
    const p2s = document.getElementById("player2-score");
    const rsb = document.getElementById("reset-scores-button");
    const m = document.getElementById("modal");
    const cbutton = document.getElementById("close-button");
    const crb = document.getElementById("confirm-reset-button");
    const cab = document.getElementById("cancel-reset-button");

    let bs = parseInt(bsi.value);
    let cp = "X";
    let ga = true;
    let board = [];
    let sm = false;
    let p1sc = localStorage.getItem('p1sc') ? parseInt(localStorage.getItem('p1sc')) : 0;
    let p2sc = localStorage.getItem('p2sc') ? parseInt(localStorage.getItem('p2sc')) : 0;

    p1s.textContent = p1sc;
    p2s.textContent = p2sc;

    const createBoard = (s) => {
        gb.innerHTML = "";
        board = Array.from({ length: s }, () => Array(s).fill(""));
        gb.style.gridTemplateColumns = `repeat(${s}, 80px)`;
        gb.style.gridTemplateRows = `repeat(${s}, 80px)`;
        board.forEach((r, ri) => {
            r.forEach((_, ci) => {
                const c = document.createElement("div");
                c.classList.add("cell");
                c.dataset.row = ri;
                c.dataset.col = ci;
                c.addEventListener("click", handleCellClick);
                gb.appendChild(c);
            });
        });
    };

    const handleCellClick = (e) => {
        const c = e.target;
        const r = parseInt(c.dataset.row);
        const co = parseInt(c.dataset.col);

        if (board[r][co] !== "" || !ga) return;

        board[r][co] = cp;
        c.textContent = cp;

        if (checkWin(cp)) {
            ga = false;
            setTimeout(() => {
                highlightWinningCells();
                updateScore();
                setTimeout(resetGame, 5000);
            }, 100);
        } else if (board.flat().every(c => c !== "")) {
            ga = false;
            ti.textContent = "It's a draw!";
            setTimeout(resetGame, 5000);
        } else {
            cp = cp === "X" ? "O" : "X";
            ti.textContent = `${cp === "X" ? p1n.textContent : p2n.textContent}'s turn`;

            if (sm && cp === "O") {
                setTimeout(() => {
                    aiMove();
                }, 500);
            }
        }
    };

    const aiMove = () => {
        if (!ga) return;
        for (let r = 0; r < bs; r++) {
            for (let c = 0; c < bs; c++) {
                if (board[r][c] === "") {
                    board[r][c] = "O";
                    const cell = gb.querySelector(`[data-row='${r}'][data-col='${c}']`);
                    cell.textContent = "O";
                    cp = "X";
                    ti.textContent = `${p1n.textContent}'s turn`;

                    if (checkWin("O")) {
                        ga = false;
                        setTimeout(() => {
                            highlightWinningCells();
                            updateScore();
                            setTimeout(resetGame, 5000);
                        }, 100);
                    }
                    return;
                }
            }
        }
    };

    const checkWin = (p) => {
        const wc = [];
        const win = (board.some((r, ri) => {
            if (r.every(c => c === p)) {
                r.forEach((_, ci) => wc.push([ri, ci]));
                return true;
            }
            return false;
        }) || board[0].some((_, ci) => {
            if (board.every(r => r[ci] === p)) {
                board.forEach((_, ri) => wc.push([ri, ci]));
                return true;
            }
            return false;
        }) || board.every((r, i) => r[i] === p) && (() => {
            board.forEach((_, i) => wc.push([i, i]));
            return true;
        })() || board.every((r, i) => r[board.length - 1 - i] === p) && (() => {
            board.forEach((_, i) => wc.push([i, board.length - 1 - i]));
            return true;
        })());

        if (win) {
            board.wc = wc;
        }
        return win;
    };

    const highlightWinningCells = () => {
        board.wc.forEach(([r, c]) => {
            const cell = gb.querySelector(`[data-row='${r}'][data-col='${c}']`);
            cell.classList.add("winning-cell");
        });
        ti.textContent = `${cp === "X" ? p1n.textContent : p2n.textContent} wins!`;
    };

    const updateScore = () => {
        if (cp === "X") {
            p1sc++;
            p1s.textContent = p1sc;
            localStorage.setItem('p1sc', p1sc);
        } else {
            p2sc++;
            p2s.textContent = p2sc;
            localStorage.setItem('p2sc', p2sc);
        }
    };

    const resetGame = () => {
        ga = true;
        cp = "X";
        ti.textContent = `${p1n.textContent}'s turn`;
        createBoard(bs);
    };

    rb.addEventListener("click", () => {
        m.style.display = "flex";
    });

    crb.addEventListener("click", () => {
        resetGame();
        m.style.display = "none";
    });

    cab.addEventListener("click", () => {
        m.style.display = "none";
    });

    cbutton.addEventListener("click", () => {
        m.style.display = "none";
    });

    asb.addEventListener("click", () => {
        const s = parseInt(bsi.value);
        if (s >= 3 && s <= 10) {
            bs = s;
            resetGame();
        } else {
            alert("Please enter a size between 3 and 10.");
        }
    });

    smt.addEventListener("change", () => {
        sm = smt.checked;
        if (sm) {
            p2n.textContent = "AI";
            ti.textContent = `${p1n.textContent}'s turn`;
        } else {
            p2n.textContent = "Player 2";
            ti.textContent = `${p1n.textContent}'s turn`;
        }
        resetGame();
    });

    rsb.addEventListener("click", () => {
        p1sc = 0;
        p2sc = 0;
        p1s.textContent = p1sc;
        p2s.textContent = p2sc;
        localStorage.setItem('p1sc', p1sc);
        localStorage.setItem('p2sc', p2sc);
    });

    p1n.addEventListener("input", () => {
        ti.textContent = `${p1n.textContent}'s turn`;
    });

    createBoard(bs);
});
