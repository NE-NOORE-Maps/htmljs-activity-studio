/**
 * Word Search Generator & Solver Engine (Pure JavaScript)
 * Supports dynamic dimensions 10x10 to 30x30, 8-directional placement, multi-language cleaning,
 * and high-density overlap optimization.
 */

export const DIRECTIONS = {
    E:  [0, 1],   // Right
    S:  [1, 0],   // Down
    SE: [1, 1],   // Down-Right
    NE: [-1, 1],  // Up-Right
    W:  [0, -1],  // Left (Reverse)
    N:  [-1, 0],  // Up (Reverse)
    NW: [-1, -1], // Up-Left (Reverse)
    SW: [1, -1]   // Down-Left (Reverse)
};

export const DIFFICULTY_DIRECTIONS = {
    easy: [DIRECTIONS.E, DIRECTIONS.S],
    medium: [DIRECTIONS.E, DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.NE],
    hard: [DIRECTIONS.E, DIRECTIONS.S, DIRECTIONS.SE, DIRECTIONS.NE, DIRECTIONS.W, DIRECTIONS.N],
    expert: Object.values(DIRECTIONS)
};

export const LANGUAGE_FILLERS = {
    en: "EEEEEEEEAAAAAIIIIIROOOOONNNNSTTTTLLLLCCCCUDDDPMHHGBFYWKVXZJQ",
    de: "EEEEEEEEENNNAAAIIIIRRRSSSSTTTTUUUDDDHHHGGLMOOBBFWZPKVJQXY",
    es: "EEEEEEEEAAAAAOOOOOSSSSNIIIIIRRRRLLLLDDDCTTUUMMPPGGYBVFZQHJXKW",
    fr: "EEEEEEEEAAAAAIIIIISSSSNTRRRRUULDDDOMPCCVHQGBFYZJXKWW",
    it: "EEEEEEEEAAAAAIIIIIOOOOOSSRRRRTTTLDDNDCUMMPPVFGBQZHZ"
};

export const SAMPLE_WORD_BANKS = {
    animals: [
        "ELEPHANT", "GIRAFFE", "KANGAROO", "DOLPHIN", "CHEETAH", "PENGUIN",
        "FLAMINGO", "OCTOPUS", "HEDGEHOG", "SQUIRREL", "CHAMELEON", "GORILLA",
        "PANTHER", "PLATYPUS", "ANTELOPE", "BUFFALO", "LEOPARD", "TORTOISE"
    ],
    space: [
        "ASTRONAUT", "TELESCOPE", "CONSTELLATION", "SUPERNOVA", "METEORITE", "ASTEROID",
        "SATELLITE", "GRAVITATION", "SPACECRAFT", "ANDROMEDA", "PLANETARY", "GALAXIES",
        "SOLARSYSTEM", "ECLIPSE", "INTERSTELLAR", "COSMONAUT", "NEBULA", "STARLIGHT"
    ],
    nature: [
        "WATERFALL", "RAINFOREST", "MOUNTAIN", "VALLEY", "VOLCANO", "GLACIER",
        "MEADOW", "CANYON", "SAVANNA", "ISLAND", "HORIZON", "PENINSULA",
        "STREAM", "BLOSSOM", "SUNSHINE", "WILDERNESS", "WOODLAND", "EVERGREEN"
    ]
};

export function cleanWordForLanguage(word, lang = "en") {
    let w = (word || "").trim().toUpperCase();
    if (lang === "de") {
        w = w.replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS");
    } else if (lang === "es") {
        // Retain Ñ, strip accents from others
        w = w.replace(/[ÁÀÂÄ]/g, "A")
             .replace(/[ÉÈÊË]/g, "E")
             .replace(/[ÍÌÎÏ]/g, "I")
             .replace(/[ÓÒÔÖ]/g, "O")
             .replace(/[ÚÙÛÜ]/g, "U");
    } else {
        w = w.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return w.replace(/[^A-ZÑ]/g, "");
}

export function generateWordSearchPuzzle({
    words = [],
    width = 15,
    height = 15,
    difficulty = "medium",
    language = "en",
    title = "Word Search #1",
    seed = null
} = {}) {
    const directions = DIFFICULTY_DIRECTIONS[difficulty] || DIFFICULTY_DIRECTIONS.medium;
    const fillers = LANGUAGE_FILLERS[language] || LANGUAGE_FILLERS.en;

    // Clean and sort words by length descending for better placement density
    const cleanedWords = words
        .map(w => cleanWordForLanguage(w, language))
        .filter(w => w.length >= 3 && w.length <= Math.max(width, height))
        .filter((w, idx, self) => self.indexOf(w) === idx)
        .sort((a, b) => b.length - a.length);

    const grid = Array.from({ length: height }, () => Array(width).fill(""));
    const placements = [];
    const unplaced = [];

    // Helper random integer
    const randInt = max => Math.floor(Math.random() * max);

    for (const word of cleanedWords) {
        let placed = false;
        let attempts = 0;
        const maxAttempts = 180;

        // Collect all possible starting configurations
        const candidates = [];
        for (let r = 0; r < height; r++) {
            for (let c = 0; c < width; c++) {
                for (const [dr, dc] of directions) {
                    const endR = r + (word.length - 1) * dr;
                    const endC = c + (word.length - 1) * dc;
                    if (endR >= 0 && endR < height && endC >= 0 && endC < width) {
                        candidates.push({ r, c, dr, dc });
                    }
                }
            }
        }

        // Shuffle candidates
        for (let i = candidates.length - 1; i > 0; i--) {
            const j = randInt(i + 1);
            [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
        }

        for (const { r, c, dr, dc } of candidates) {
            let fits = true;
            let overlaps = 0;

            for (let i = 0; i < word.length; i++) {
                const curR = r + i * dr;
                const curC = c + i * dc;
                const existing = grid[curR][curC];
                if (existing !== "" && existing !== word[i]) {
                    fits = false;
                    break;
                }
                if (existing === word[i]) {
                    overlaps++;
                }
            }

            if (fits) {
                // Place word
                for (let i = 0; i < word.length; i++) {
                    const curR = r + i * dr;
                    const curC = c + i * dc;
                    grid[curR][curC] = word[i];
                }

                placements.push({
                    word,
                    start: [r, c],
                    end: [r + (word.length - 1) * dr, c + (word.length - 1) * dc],
                    direction: [dr, dc],
                    overlaps
                });

                placed = true;
                break;
            }
        }

        if (!placed) {
            unplaced.push(word);
        }
    }

    // Clone solution before filling with random letters
    const solutionGrid = grid.map(row => [...row]);

    // Fill remaining empty cells with weighted random fillers
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            if (grid[r][c] === "") {
                const randomLetter = fillers[randInt(fillers.length)];
                grid[r][c] = randomLetter;
            }
        }
    }

    return {
        title,
        width,
        height,
        grid,
        solutionGrid,
        placedWords: placements.map(p => p.word),
        placements,
        unplacedWords: unplaced,
        difficulty,
        language
    };
}
