/**
 * Sudoku Generator & Solver Engine (Pure JavaScript)
 * Supports Classic 9x9, Kids Mini 4x4, Junior 6x6, Wordoku 9x9, Sudoku X, and Windoku.
 * Built for KDP Activity Studio Web Edition.
 */

export const SudokuType = {
    CLASSIC_9X9: "classic_9x9",
    MINI_4X4: "mini_4x4",
    JUNIOR_6X6: "junior_6x6",
    WORDOKU_9X9: "wordoku_9x9",
    SUDOKU_X: "sudoku_x",
    WINDOKU: "windoku"
};

export const SudokuDifficulty = {
    VERY_EASY: "very_easy",
    EASY: "easy",
    MEDIUM: "medium",
    HARD: "hard",
    EXPERT: "expert"
};

export const DIFFICULTY_LABELS = {
    [SudokuDifficulty.VERY_EASY]: "Very Easy",
    [SudokuDifficulty.EASY]: "Easy",
    [SudokuDifficulty.MEDIUM]: "Medium",
    [SudokuDifficulty.HARD]: "Hard",
    [SudokuDifficulty.EXPERT]: "Expert"
};

export const DIFFICULTY_STARS = {
    [SudokuDifficulty.VERY_EASY]: "★☆☆☆☆",
    [SudokuDifficulty.EASY]: "★★☆☆☆",
    [SudokuDifficulty.MEDIUM]: "★★★☆☆",
    [SudokuDifficulty.HARD]: "★★★★☆",
    [SudokuDifficulty.EXPERT]: "★★★★★"
};

export const TYPE_CONFIGS = {
    [SudokuType.CLASSIC_9X9]: { size: 9, boxR: 3, boxC: 3, label: "Classic 9×9", isX: false, isWindoku: false },
    [SudokuType.MINI_4X4]: { size: 4, boxR: 2, boxC: 2, label: "Kids Mini 4×4", isX: false, isWindoku: false },
    [SudokuType.JUNIOR_6X6]: { size: 6, boxR: 2, boxC: 3, label: "Junior 6×6", isX: false, isWindoku: false },
    [SudokuType.WORDOKU_9X9]: { size: 9, boxR: 3, boxC: 3, label: "Wordoku (Letter 9×9)", isX: false, isWindoku: false },
    [SudokuType.SUDOKU_X]: { size: 9, boxR: 3, boxC: 3, label: "Sudoku X (Diagonal)", isX: true, isWindoku: false },
    [SudokuType.WINDOKU]: { size: 9, boxR: 3, boxC: 3, label: "Windoku (Hyper 4-Window)", isX: false, isWindoku: true }
};

export const TARGET_CLUES = {
    4: { [SudokuDifficulty.VERY_EASY]: 9, [SudokuDifficulty.EASY]: 8, [SudokuDifficulty.MEDIUM]: 6, [SudokuDifficulty.HARD]: 5, [SudokuDifficulty.EXPERT]: 4 },
    6: { [SudokuDifficulty.VERY_EASY]: 20, [SudokuDifficulty.EASY]: 17, [SudokuDifficulty.MEDIUM]: 14, [SudokuDifficulty.HARD]: 12, [SudokuDifficulty.EXPERT]: 10 },
    9: { [SudokuDifficulty.VERY_EASY]: 46, [SudokuDifficulty.EASY]: 38, [SudokuDifficulty.MEDIUM]: 32, [SudokuDifficulty.HARD]: 27, [SudokuDifficulty.EXPERT]: 24 }
};

export const DEFAULT_WORDOKU_WORDS = [
    "PUBLISHER", "ALGORITHM", "AUTHORING", "CHEMISTRY", "DANGEROUS",
    "DISCOVERY", "BLUEPRINT", "CHILDRENS", "WONDERFUL", "EDUCATION"
];

// Seeded PRNG for reproducible puzzle generation
export function createRNG(seed = 42) {
    let s = (Math.abs(seed) % 2147483647) || 1234567;
    return function() {
        s = (s * 16807) % 2147483647;
        return (s - 1) / 2147483646;
    };
}

export function cleanWordokuLetters(rawWord) {
    const cleaned = [];
    const seen = new Set();
    const upper = (rawWord || "PUBLISHER").toUpperCase();
    for (const ch of upper) {
        if (ch >= "A" && ch <= "Z" && !seen.has(ch)) {
            seen.add(ch);
            cleaned.push(ch);
            if (cleaned.length === 9) break;
        }
    }
    if (cleaned.length < 9) {
        for (const ch of "PUBLISHER") {
            if (!seen.has(ch)) {
                seen.add(ch);
                cleaned.push(ch);
                if (cleaned.length === 9) break;
            }
        }
    }
    return cleaned.slice(0, 9);
}

const WINDOKU_WINDOWS = [[1, 1], [1, 5], [5, 1], [5, 5]];

function isValid(grid, r, c, val, size, boxR, boxC, isX, isWindoku) {
    // Row check
    for (let x = 0; x < size; x++) {
        if (grid[r][x] === val) return false;
    }
    // Col check
    for (let y = 0; y < size; y++) {
        if (grid[y][c] === val) return false;
    }
    // Box check
    const startR = Math.floor(r / boxR) * boxR;
    const startC = Math.floor(c / boxC) * boxC;
    for (let dr = 0; dr < boxR; dr++) {
        for (let dc = 0; dc < boxC; dc++) {
            if (grid[startR + dr][startC + dc] === val) return false;
        }
    }
    // Sudoku X Diagonals
    if (isX) {
        if (r === c) {
            for (let i = 0; i < size; i++) {
                if (grid[i][i] === val) return false;
            }
        }
        if (r + c === size - 1) {
            for (let i = 0; i < size; i++) {
                if (grid[i][size - 1 - i] === val) return false;
            }
        }
    }
    // Windoku 4 Windows
    if (isWindoku && size === 9) {
        for (const [wr, wc] of WINDOKU_WINDOWS) {
            if (r >= wr && r < wr + 3 && c >= wc && c < wc + 3) {
                for (let dr = 0; dr < 3; dr++) {
                    for (let dc = 0; dc < 3; dc++) {
                        if (grid[wr + dr][wc + dc] === val) return false;
                    }
                }
            }
        }
    }
    return true;
}

// Find unassigned cell with Minimum Remaining Values (MRV) heuristic
function findMRVCell(grid, size, boxR, boxC, isX, isWindoku) {
    let minCand = size + 1;
    let bestCell = null;
    let bestCandidates = null;

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (grid[r][c] === 0) {
                const cands = [];
                for (let v = 1; v <= size; v++) {
                    if (isValid(grid, r, c, v, size, boxR, boxC, isX, isWindoku)) {
                        cands.push(v);
                    }
                }
                if (cands.length < minCand) {
                    minCand = cands.length;
                    bestCell = [r, c];
                    bestCandidates = cands;
                    if (minCand <= 1) return { cell: bestCell, candidates: bestCandidates };
                }
            }
        }
    }
    return { cell: bestCell, candidates: bestCandidates };
}

// Count solutions (stops early at limit=2 to guarantee uniqueness)
function countSolutions(grid, size, boxR, boxC, isX, isWindoku, limit = 2) {
    let count = 0;

    function solve() {
        const { cell, candidates } = findMRVCell(grid, size, boxR, boxC, isX, isWindoku);
        if (!cell) {
            count++;
            return count >= limit;
        }
        if (!candidates || candidates.length === 0) return false;

        const [r, c] = cell;
        for (const val of candidates) {
            grid[r][c] = val;
            if (solve()) return true;
            grid[r][c] = 0;
        }
        return false;
    }

    solve();
    return count;
}

// Solve grid using randomized candidates to create a valid complete board
function fillGridRandom(grid, size, boxR, boxC, isX, isWindoku, rng) {
    const { cell, candidates } = findMRVCell(grid, size, boxR, boxC, isX, isWindoku);
    if (!cell) return true;
    if (!candidates || candidates.length === 0) return false;

    // Fisher-Yates shuffle with seeded RNG
    const shuffled = [...candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const [r, c] = cell;
    for (const val of shuffled) {
        grid[r][c] = val;
        if (fillGridRandom(grid, size, boxR, boxC, isX, isWindoku, rng)) return true;
        grid[r][c] = 0;
    }
    return false;
}

export function generateSudokuPuzzle({
    puzzleId = 1,
    puzzleType = SudokuType.CLASSIC_9X9,
    difficulty = SudokuDifficulty.MEDIUM,
    seed = null,
    symmetric = true,
    wordokuWord = "PUBLISHER",
    titleTemplate = "Sudoku #{num}"
} = {}) {
    const cfg = TYPE_CONFIGS[puzzleType] || TYPE_CONFIGS[SudokuType.CLASSIC_9X9];
    const size = cfg.size;
    const boxR = cfg.boxR;
    const boxC = cfg.boxC;
    const isX = cfg.isX;
    const isWindoku = cfg.isWindoku;

    const actualSeed = seed !== null ? seed : Math.floor(Math.random() * 1000000);
    const rng = createRNG(actualSeed);

    // Symbols
    let symbols = [];
    let wordokuWordClean = null;
    if (puzzleType === SudokuType.WORDOKU_9X9) {
        symbols = cleanWordokuLetters(wordokuWord);
        wordokuWordClean = symbols.join("");
    } else {
        symbols = Array.from({ length: size }, (_, i) => String(i + 1));
    }

    // 1. Generate full solved board
    const solutionNum = Array.from({ length: size }, () => Array(size).fill(0));
    fillGridRandom(solutionNum, size, boxR, boxC, isX, isWindoku, rng);

    // 2. Clue removal to reach target difficulty
    const targetClues = (TARGET_CLUES[size] && TARGET_CLUES[size][difficulty]) || Math.round(size * size * 0.4);
    const cluesNum = solutionNum.map(row => [...row]);

    // Candidate removal list
    const pairs = [];
    if (symmetric) {
        const seen = new Set();
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                const oppR = size - 1 - r;
                const oppC = size - 1 - c;
                const k1 = `${r},${c}`;
                const k2 = `${oppR},${oppC}`;
                if (!seen.has(k1)) {
                    seen.add(k1);
                    seen.add(k2);
                    pairs.push([[r, c], [oppR, oppC]]);
                }
            }
        }
    } else {
        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                pairs.push([[r, c]]);
            }
        }
    }

    // Shuffle pairs
    for (let i = pairs.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
    }

    let currentCluesCount = size * size;
    for (const pair of pairs) {
        if (currentCluesCount <= targetClues) break;

        const backup = pair.map(([r, c]) => ({ r, c, val: cluesNum[r][c] }));
        for (const { r, c } of backup) {
            cluesNum[r][c] = 0;
        }

        // Test uniqueness with temporary copy
        const testGrid = cluesNum.map(row => [...row]);
        if (countSolutions(testGrid, size, boxR, boxC, isX, isWindoku, 2) === 1) {
            currentCluesCount -= backup.length;
        } else {
            // Restore clues
            for (const { r, c, val } of backup) {
                cluesNum[r][c] = val;
            }
        }
    }

    // Convert numbers to symbols
    const cluesGrid = cluesNum.map(row => row.map(v => (v > 0 ? symbols[v - 1] : "")));
    const solutionGrid = solutionNum.map(row => row.map(v => symbols[v - 1]));

    const title = titleTemplate.replace("{num}", String(puzzleId));

    return {
        puzzleId,
        puzzleType,
        size,
        boxRows: boxR,
        boxCols: boxC,
        difficulty,
        difficultyLabel: DIFFICULTY_LABELS[difficulty],
        difficultyStars: DIFFICULTY_STARS[difficulty],
        cluesGrid,
        solutionGrid,
        cluesCount: currentCluesCount,
        title,
        symbols,
        wordokuWord: wordokuWordClean,
        isX,
        isWindoku
    };
}

export function generateSudokuBatch({
    count = 10,
    startNum = 1,
    seed = 42,
    puzzleType = SudokuType.CLASSIC_9X9,
    difficulty = SudokuDifficulty.MEDIUM,
    symmetric = true,
    wordokuWord = "PUBLISHER",
    titleTemplate = "Sudoku #{num}"
} = {}) {
    const puzzles = [];
    for (let i = 0; i < count; i++) {
        const pSeed = (seed + i * 17) % 2147483647;
        const p = generateSudokuPuzzle({
            puzzleId: startNum + i,
            puzzleType,
            difficulty,
            seed: pSeed,
            symmetric,
            wordokuWord,
            titleTemplate
        });
        puzzles.push(p);
    }
    return puzzles;
}
