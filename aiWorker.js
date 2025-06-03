// aiWorker.js
const WIN_PATTERNS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6]
];

function checkWinSmallBoard(board) {
    return WIN_PATTERNS.some(([a, b, c]) =>
        board[a] && board[a] === board[b] && board[a] === board[c]
    );
}

function checkWinBigBoard(winners) {
    return WIN_PATTERNS.some(([a, b, c]) =>
        winners[a] && winners[a] !== 'draw' && winners[a] === winners[b] && winners[a] === winners[c]
    );
}

function isBoardFull(board) {
    return board.every(cell => cell !== null);
}

function isBigBoardFull(winners, boardStates) {
    if (winners.every(winner => winner !== null)) return true;
    return !boardStates.some((board, i) =>
        winners[i] === null && board.some(cell => cell === null)
    );
}

function findValidMoves(activeBoard, boardStates, smallBoardWinners) {
    const validMoves = [];

    if (activeBoard === null || smallBoardWinners[activeBoard] !== null) {
        for (let i = 0; i < 9; i++) {
            if (smallBoardWinners[i] === null) {
                for (let j = 0; j < 9; j++) {
                    if (boardStates[i][j] === null) {
                        validMoves.push([i, j]);
                    }
                }
            }
        }
    } else {
        for (let j = 0; j < 9; j++) {
            if (boardStates[activeBoard][j] === null) {
                validMoves.push([activeBoard, j]);
            }
        }
    }

    return validMoves;
}

function minimax(activeBoard, boardStates, smallBoardWinners, depth, isMaximizing, alpha, beta, aiSymbol, playerSymbol) {
    if (depth === 0) {
        return evaluatePosition(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol);
    }

    const winner = checkWinBigBoard(smallBoardWinners);
    if (winner) {
        return winner === aiSymbol ? 10000 + depth : -10000 - depth;
    }

    if (isBigBoardFull(smallBoardWinners, boardStates)) {
        return 0;
    }

    const validMoves = findValidMoves(activeBoard, boardStates, smallBoardWinners);
    if (validMoves.length === 0) {
        return 0;
    }

    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const [bigIndex, smallIndex] of validMoves) {
            const newBoardStates = JSON.parse(JSON.stringify(boardStates));
            newBoardStates[bigIndex][smallIndex] = aiSymbol;

            const newSmallBoardWinners = [...smallBoardWinners];
            if (checkWinSmallBoard(newBoardStates[bigIndex])) {
                newSmallBoardWinners[bigIndex] = aiSymbol;
            } else if (isBoardFull(newBoardStates[bigIndex])) {
                newSmallBoardWinners[bigIndex] = 'draw';
            }

            let nextActiveBoard = smallIndex;
            if (newSmallBoardWinners[smallIndex] !== null) {
                nextActiveBoard = null;
            }

            const evalScore = minimax(
                nextActiveBoard,
                newBoardStates,
                newSmallBoardWinners,
                depth - 1,
                false,
                alpha,
                beta,
                aiSymbol,
                playerSymbol
            );

            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const [bigIndex, smallIndex] of validMoves) {
            const newBoardStates = JSON.parse(JSON.stringify(boardStates));
            newBoardStates[bigIndex][smallIndex] = playerSymbol;

            const newSmallBoardWinners = [...smallBoardWinners];
            if (checkWinSmallBoard(newBoardStates[bigIndex])) {
                newSmallBoardWinners[bigIndex] = playerSymbol;
            } else if (isBoardFull(newBoardStates[bigIndex])) {
                newSmallBoardWinners[bigIndex] = 'draw';
            }

            let nextActiveBoard = smallIndex;
            if (newSmallBoardWinners[smallIndex] !== null) {
                nextActiveBoard = null;
            }

            const evalScore = minimax(
                nextActiveBoard,
                newBoardStates,
                newSmallBoardWinners,
                depth - 1,
                true,
                alpha,
                beta,
                aiSymbol,
                playerSymbol
            );

            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluatePosition(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol) {
    let score = 0;
    score += evaluateBigBoard(smallBoardWinners, aiSymbol, playerSymbol) * 150;
    score += evaluateStrategicPositions(smallBoardWinners, aiSymbol, playerSymbol) * 100;
    score += evaluateSmallBoards(boardStates, smallBoardWinners, aiSymbol, playerSymbol) * 50;
    score += evaluateNextBoardAdvantage(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol) * 60;
    score += evaluateThreats(boardStates, smallBoardWinners, aiSymbol, playerSymbol) * 200;
    score += evaluateTraps(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol) * 200;
    return score;
}

function evaluateBigBoard(smallBoardWinners, aiSymbol, playerSymbol) {
    let score = 0;

    for (const pattern of WIN_PATTERNS) {
        const [a, b, c] = pattern;
        const aiCount = pattern.filter(idx => smallBoardWinners[idx] === aiSymbol).length;
        const playerCount = pattern.filter(idx => smallBoardWinners[idx] === playerSymbol).length;
        const emptyCount = 3 - aiCount - playerCount;

        if (aiCount === 2 && emptyCount === 1) score += 800;
        if (playerCount === 2 && emptyCount === 1) score -= 750;
        if (playerCount === 0) score += aiCount * 120;
        if (aiCount === 0) score -= playerCount * 100;
    }

    return score;
}

function evaluateStrategicPositions(smallBoardWinners, aiSymbol, playerSymbol) {
    let score = 0;

    if (smallBoardWinners[4] === aiSymbol) score += 200;
    else if (smallBoardWinners[4] === playerSymbol) score -= 170;
    else if (smallBoardWinners[4] === null) score += 100;

    const corners = [0, 2, 6, 8];
    for (const corner of corners) {
        if (smallBoardWinners[corner] === aiSymbol) score += 80;
        else if (smallBoardWinners[corner] === playerSymbol) score -= 70;
    }

    const sides = [1, 3, 5, 7];
    for (const side of sides) {
        if (smallBoardWinners[side] === aiSymbol) score += 50;
        else if (smallBoardWinners[side] === playerSymbol) score -= 40;
    }

    return score;
}

function evaluateSmallBoards(boardStates, smallBoardWinners, aiSymbol, playerSymbol) {
    let score = 0;

    for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
        if (smallBoardWinners[boardIdx] !== null) continue;

        const board = boardStates[boardIdx];

        for (const pattern of WIN_PATTERNS) {
            const [a, b, c] = pattern;
            const aiCells = [a, b, c].filter(idx => board[idx] === aiSymbol).length;
            const playerCells = [a, b, c].filter(idx => board[idx] === playerSymbol).length;
            const emptyCells = [a, b, c].filter(idx => board[idx] === null).length;

            if (aiCells === 2 && emptyCells === 1) score += 100;
            if (playerCells === 2 && emptyCells === 1) score -= 150;
            if (playerCells === 0 && emptyCells > 0) score += aiCells * 10;
            if (aiCells === 0 && emptyCells > 0) score -= playerCells * 15;
        }

        if (board[4] === aiSymbol) score += 20;
        if (board[4] === playerSymbol) score -= 15;

        for (const corner of [0, 2, 6, 8]) {
            if (board[corner] === aiSymbol) score += 10;
            if (board[corner] === playerSymbol) score -= 10;
        }
    }

    return score;
}

function evaluateNextBoardAdvantage(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol) {
    if (activeBoard === null) return 0;

    let score = 0;

    if (smallBoardWinners[activeBoard] === null) {
        const board = boardStates[activeBoard];

        for (const pattern of WIN_PATTERNS) {
            const [a, b, c] = pattern;
            const aiCells = [a, b, c].filter(idx => board[idx] === aiSymbol).length;
            const playerCells = [a, b, c].filter(idx => board[idx] === playerSymbol).length;
            const emptyCells = [a, b, c].filter(idx => board[idx] === null).length;

            if (aiCells === 2 && emptyCells === 1) score += 70;
            if (playerCells === 2 && emptyCells === 1) score -= 65;
        }

        if ([0, 2, 6, 8, 4].includes(activeBoard)) score += 10;
    } else {
        score += 15;
    }

    return score;
}

function evaluateThreats(boardStates, smallBoardWinners, aiSymbol, playerSymbol) {
    let score = 0;

    for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
        if (smallBoardWinners[boardIdx] === null) {
            const board = boardStates[boardIdx];

            for (const pattern of WIN_PATTERNS) {
                const [a, b, c] = pattern;
                const aiCells = [a, b, c].filter(idx => board[idx] === aiSymbol).length;
                const playerCells = [a, b, c].filter(idx => board[idx] === playerSymbol).length;
                const emptyCells = [a, b, c].filter(idx => board[idx] === null).length;

                if (aiCells === 2 && emptyCells === 1) score += 100;
                if (playerCells === 2 && emptyCells === 1) score -= 150;
            }
        }
    }

    return score;
}

function evaluateTraps(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol) {
    let score = 0;

    for (let boardIdx = 0; boardIdx < 9; boardIdx++) {
        if (smallBoardWinners[boardIdx] === null) {
            const board = boardStates[boardIdx];
            const corners = [0, 2, 6, 8];
            const playerCorners = corners.filter(idx => board[idx] === playerSymbol).length;
            if (playerCorners >= 2) {
                score -= 100;
            }
        }
    }

    return score;
}

function findBestMoveWithMinimax(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol, depth) {
    const validMoves = findValidMoves(activeBoard, boardStates, smallBoardWinners);
    if (validMoves.length === 0) return null;

    let bestScore = -Infinity;
    let bestMove = null;

    let alpha = -Infinity;
    let beta = Infinity;

    for (const [bigIndex, smallIndex] of validMoves) {
        const newBoardStates = JSON.parse(JSON.stringify(boardStates));
        newBoardStates[bigIndex][smallIndex] = aiSymbol;

        const newSmallBoardWinners = [...smallBoardWinners];
        if (checkWinSmallBoard(newBoardStates[bigIndex])) {
            newSmallBoardWinners[bigIndex] = aiSymbol;
        } else if (isBoardFull(newBoardStates[bigIndex])) {
            newSmallBoardWinners[bigIndex] = 'draw';
        }

        if (checkWinBigBoard(newSmallBoardWinners)) return [bigIndex, smallIndex];

        let nextActiveBoard = smallIndex;
        if (newSmallBoardWinners[smallIndex] !== null) nextActiveBoard = null;

        const score = minimax(
            nextActiveBoard,
            newBoardStates,
            newSmallBoardWinners,
            depth - 1,
            false,
            alpha,
            beta,
            aiSymbol,
            playerSymbol
        );

        if (score > bestScore) {
            bestScore = score;
            bestMove = [bigIndex, smallIndex];
        }

        alpha = Math.max(alpha, bestScore);
        if (beta <= alpha) break;
    }

    return bestMove;
}

self.onmessage = function(e) {
    const { activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol, depth } = e.data;
    const bestMove = findBestMoveWithMinimax(activeBoard, boardStates, smallBoardWinners, aiSymbol, playerSymbol, depth);
    postMessage(bestMove);
};
