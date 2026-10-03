/**
 * Word Search Generator & Solver Engine (Pure JavaScript)
 * Supports dynamic dimensions 10x10 to 25x25, 8-directional placement, multi-language cleaning,
 * full accent support (Standard Book Mode, Preserve Exact, Strip All), multi-theme CSV parsing,
 * deterministic PRNG seeding, and density optimization.
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
    hard: Object.values(DIRECTIONS),
    expert: Object.values(DIRECTIONS)
};

export const LANGUAGE_CONFIGS = {
    "English": {
        flag: "🇬🇧",
        label: "🇬🇧 English",
        default_theme: "Animals",
        word_bank_title: "Word bank",
        fill_alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        badge_info: "Standard Latin alphabet (A–Z).",
        sample_words: "LION\nTIGER\nLEOPARD\nELEPHANT\nGIRAFFE\nMONKEY\nZEBRA\nKANGAROO\nPANDA\nDOLPHIN\nBEAR\nWOLF",
        themed_csv: `theme,word
Big Cats,LION
Big Cats,TIGER
Big Cats,LEOPARD
Farm Animals,COW
Farm Animals,SHEEP
Farm Animals,HORSE
Ocean,WHALE
Ocean,SHARK
Ocean,DOLPHIN
`,
        simple_csv: `word
LION
TIGER
LEOPARD
ZEBRA
GIRAFFE
ELEPHANT
MONKEY
BEAR
`,
        prompts: {
            "Themed CSV": `Create a themed word-search CSV for a children's activity book.
Return CSV only with exactly two columns: theme,word.
Create 10 themes with 12 unique uppercase words per theme.
Theme: [INSERT THEME]
Difficulty: [easy, medium, or hard]
Use only family-friendly words, 3-12 letters, letters only, no spaces or punctuation.
Do not add explanations or markdown.`,
            "Simple CSV": `Create a simple word-search CSV for a children's activity book.
Return CSV only with exactly one column: word.
Create [INSERT NUMBER] unique uppercase words about: [INSERT TOPIC]
Difficulty: [easy, medium, or hard]
Use only family-friendly words, 3-12 letters, letters only, no spaces or punctuation.
Do not add explanations or markdown.`,
            "Pasted word list": `Create a clean word list for a word-search puzzle.
Return one uppercase word per line and nothing else.
Topic: [INSERT TOPIC]
Number of words: [INSERT NUMBER]
Use family-friendly words, 3-12 letters, letters only, no spaces or punctuation.
Do not add numbering, bullets, explanations, or markdown.`
        }
    },
    "German (Deutsch)": {
        flag: "🇩🇪",
        label: "🇩🇪 German (Deutsch)",
        default_theme: "Tiere",
        word_bank_title: "Wortliste",
        fill_alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÜ",
        badge_info: "Umlaute Ä, Ö, Ü unterstützt · ß wird automatisch als SS geschrieben.",
        sample_words: "LÖWE\nTIGER\nLEOPARD\nELEFANT\nGIRAFFE\nAFFE\nZEBRA\nBÄR\nWOLF\nSCHLANGE\nHIRSCH\nFUCHS",
        themed_csv: `theme,word
Raubkatzen,LÖWE
Raubkatzen,TIGER
Raubkatzen,LEOPARD
Bauernhof,KUH
Bauernhof,SCHAF
Bauernhof,PFERD
Waldtiere,BÄR
Waldtiere,WOLF
Waldtiere,HIRSCH
`,
        simple_csv: `word
LÖWE
TIGER
LEOPARD
ZEBRA
GIRAFFE
ELEFANT
BÄR
FUCHS
`,
        prompts: {
            "Themed CSV": `Erstelle eine Wortsuch-CSV (Buchstabensalat) für ein deutsches Rätselbuch.
Gib nur CSV mit genau zwei Spalten zurück: theme,word.
Erstelle 10 Themen mit je 12 einzigartigen Wörtern in Großbuchstaben pro Thema.
Thema: [THEMA HIER EINFÜGEN]
Schwierigkeitsgrad: [easy, medium, oder hard]
Verwende deutsche Wörter, 3-12 Buchstaben, nur Buchstaben (Ä, Ö, Ü erlaubt, ß als SS).
Keine Erklärungen oder Markdown hinzufügen.`,
            "Simple CSV": `Erstelle eine einfache Wortsuch-CSV für ein deutsches Rätselbuch.
Gib nur CSV mit genau einer Spalte zurück: word.
Erstelle [ANZAHL] einzigartige Wörter in Großbuchstaben über: [THEMA]
Schwierigkeitsgrad: [easy, medium, oder hard]
Verwende familienfreundliche Wörter, 3-12 Buchstaben (Ä, Ö, Ü erlaubt, ß als SS).
Keine Erklärungen oder Markdown hinzufügen.`,
            "Pasted word list": `Erstelle eine saubere Wortliste für ein deutsches Suchsel (Wortsuchspiel).
Gib genau ein deutsches Wort in Großbuchstaben pro Zeile zurück und sonst nichts.
Thema: [THEMA]
Anzahl der Wörter: [ANZAHL]
Verwende Wörter mit 3-12 Buchstaben (Ä, Ö, Ü erlaubt, ß als SS).
Keine Nummerierung, Aufzählungspunkte oder Erklärungen hinzufügen.`
        }
    },
    "Spanish (Español)": {
        flag: "🇪🇸",
        label: "🇪🇸 Spanish (Español)",
        default_theme: "Animales",
        word_bank_title: "Lista de palabras",
        fill_alphabet: "ABCDEFGHIJKLMNÑOPQRSTUVWXYZ",
        badge_info: "Letra oficial Ñ incluida en alfabeto y relleno · Acentos adaptados.",
        sample_words: "LEÓN\nTIGRE\nLEOPARDO\nELEFANTE\nJIRAFA\nMONO\nCEBRA\nOSO\nLOBO\nSERPIENTE\nDELFÍN\nBALLENA",
        themed_csv: `theme,word
Grandes Felinos,LEÓN
Grandes Felinos,TIGRE
Grandes Felinos,LEOPARDO
Granja,VACA
Granja,OVEJA
Granja,CABALLO
Océano,BALLENA
Océano,TIBURÓN
Océano,DELFÍN
`,
        simple_csv: `word
LEÓN
TIGRE
LEOPARDO
CEBRA
JIRAFA
ELEFANTE
MONO
OSO
`,
        prompts: {
            "Themed CSV": `Crea un archivo CSV de sopa de letras para un libro de pasatiempos en español.
Devuelve solo el CSV con exactamente dos columnas: theme,word.
Crea 10 temas con 12 palabras únicas en mayúsculas por tema.
Tema: [INSERTAR TEMA]
Dificultad: [easy, medium, o hard]
Usa palabras en español familiares, de 3 a 12 letras (la letra Ñ está permitida).
Sin explicaciones ni formato markdown.`,
            "Simple CSV": `Crea un archivo CSV simple de sopa de letras para un libro de pasatiempos en español.
Devuelve solo el CSV con exactamente una columna: word.
Crea [INSERTAR NÚMERO] palabras únicas en mayúsculas sobre: [INSERTAR TEMA]
Dificultad: [easy, medium, o hard]
Usa palabras familiares de 3 a 12 letras (la letra Ñ está permitida).
Sin explicaciones ni formato markdown.`,
            "Pasted word list": `Crea una lista de palabras para una sopa de letras en español.
Devuelve una palabra en mayúsculas por línea y nada más.
Tema: [INSERTAR TEMA]
Número de palabras: [INSERTAR NÚMERO]
Palabras en español de 3 a 12 letras (la letra Ñ está permitida).
Sin números, viñetas ni explicaciones.`
        }
    },
    "French (Français)": {
        flag: "🇫🇷",
        label: "🇫🇷 French (Français)",
        default_theme: "Animaux",
        word_bank_title: "Liste de mots",
        fill_alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        badge_info: "Mots mêlés en français · Supporte les accents ou normalisation A–Z.",
        sample_words: "LION\nTIGRE\nLÉOPARD\nÉLÉPHANT\nGIRAFE\nSINGE\nZÈBRE\nOURS\nLOUP\nSERPENT\nDAUPHIN\nBALEINE",
        themed_csv: `theme,word
Félins,LION
Félins,TIGRE
Félins,LÉOPARD
Ferme,VACHE
Ferme,MOUTON
Ferme,CHEVAL
Océan,BALEINE
Océan,REQUIN
Océan,DAUPHIN
`,
        simple_csv: `word
LION
TIGRE
LÉOPARD
ZÈBRE
GIRAFE
ÉLÉPHANT
SINGE
OURS
`,
        prompts: {
            "Themed CSV": `Créez un fichier CSV de mots mêlés pour un livre d'activités en français.
Retournez uniquement le CSV avec exactement deux colonnes : theme,word.
Créez 10 thèmes avec 12 mots uniques en majuscules par thème.
Thème : [INSÉRER LE THÈME]
Difficulté : [easy, medium, ou hard]
Utilisez des mots français adaptés aux familles, 3 à 12 lettres, sans espaces ni ponctuation.
Pas d'explications ni de balisage markdown.`,
            "Simple CSV": `Créez un simple fichier CSV de mots mêlés pour un livre d'activités en français.
Retournez uniquement le CSV avec exactement une colonne : word.
Créez [INSÉRER LE NOMBRE] mots uniques en majuscules sur : [INSÉRER LE SUJET]
Difficulté : [easy, medium, ou hard]
Utilisez des mots français de 3 à 12 lettres.
Pas d'explications ni de balisage markdown.`,
            "Pasted word list": `Créez une liste de mots pour un jeu de mots mêlés en français.
Retournez un mot en majuscules par ligne et rien d'autre.
Sujet : [INSÉRER LE SUJET]
Nombre de mots : [INSÉRER LE NOMBRE]
Mots français de 3 à 12 lettres, uniquement des lettres.
Pas de numérotation, puces ni explications.`
        }
    },
    "Italian (Italiano)": {
        flag: "🇮🇹",
        label: "🇮🇹 Italian (Italiano)",
        default_theme: "Animali",
        word_bank_title: "Elenco parole",
        fill_alphabet: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
        badge_info: "Crucipuzzle in italiano · Lettere A–Z con accenti adattati.",
        sample_words: "LEONE\nTIGRE\nLEOPARDO\nELEFANTE\nGIRAFFA\nSCIMMIA\nZEBRA\nORSO\nLUPO\nSERPENTE\nDELFINO\nBALENA",
        themed_csv: `theme,word
Grandi Felini,LEONE
Grandi Felini,TIGRE
Grandi Felini,LEOPARDO
Fattoria,MUCCA
Fattoria,PECORA
Fattoria,CAVALLO
Oceano,BALENA
Oceano,SQUALO
Oceano,DELFINO
`,
        simple_csv: `word
LEONE
TIGRE
LEOPARDO
ZEBRA
GIRAFFA
ELEFANTE
SCIMMIA
ORSO
`,
        prompts: {
            "Themed CSV": `Crea un file CSV per crucipuzzle (cerca parole) per un libro di enigmistica in italiano.
Restituisci solo il CSV con esattamente due colonne: theme,word.
Crea 10 temi con 12 parole uniche in maiuscolo per tema.
Tema: [INSERISCI IL TEMA]
Difficoltà: [easy, medium, o hard]
Usa parole italiane adatte a tutti, 3-12 lettere, senza spazi o punteggiatura.
Nessuna spiegazione o markup markdown.`,
            "Simple CSV": `Crea un semplice file CSV di crucipuzzle per un libro in italiano.
Restituisci solo il CSV con esattamente una colonna: word.
Crea [INSERISCI NUMERO] parole uniche in maiuscolo su: [INSERISCI ARGOMENTO]
Difficoltà: [easy, medium, o hard]
Usa parole italiane di 3-12 lettere.
Nessuna spiegazione o markup markdown.`,
            "Pasted word list": `Crea un elenco di parole per un crucipuzzle in italiano.
Restituisci una parola in maiuscolo per riga e nient'altro.
Argomento: [INSERISCI ARGOMENTO]
Numero di parole: [INSERISCI NUMERO]
Parole italiane da 3 a 12 lettere, solo lettere.
Nessuna numerazione, elenchi puntati o spiegazioni.`
        }
    }
};

/**
 * Calculate recommended word capacity of a grid: ~45% of cells filled at avg length 6.
 */
export function maxWordsForGrid(rows, cols) {
    return Math.max(4, Math.round((rows * cols * 0.45) / 6));
}

/**
 * Mulberry32 32-bit PRNG for deterministic puzzle seeds.
 */
export function createPrng(seedVal) {
    let s = (Math.abs(Math.floor(seedVal)) || 123456789) >>> 0;
    return function() {
        s |= 0;
        s = (s + 0x6d2b79f5) | 0;
        let t = Math.imul(s ^ (s >>> 15), 1 | s);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Clean and normalize a word according to language and accent mode.
 */
export function cleanWordForLanguage(rawWord, language = "English", accentMode = "Standard Book Mode") {
    let w = (rawWord || "").trim().toUpperCase();
    if (!w) return "";

    // Replace German Eszett
    w = w.replace(/ß/g, "SS").replace(/ẞ/g, "SS");

    if (accentMode === "Preserve Exact Accents") {
        return w.replace(/[^A-ZÄÖÜÑÁÀÂÉÈÊËÍÌÎÏÓÒÔÚÙÛ]/g, "");
    }

    if (accentMode === "Strip All Accents (A-Z)") {
        return w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
    }

    // Standard Book Mode
    if (language.includes("Spanish")) {
        const out = [];
        for (const ch of w) {
            if (ch === "Ñ") {
                out.push("Ñ");
            } else {
                const norm = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (norm >= "A" && norm <= "Z") out.push(norm);
            }
        }
        return out.join("");
    } else if (language.includes("German")) {
        const out = [];
        for (const ch of w) {
            if (ch === "Ä" || ch === "Ö" || ch === "Ü") {
                out.push(ch);
            } else {
                const norm = ch.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                if (norm >= "A" && norm <= "Z") out.push(norm);
            }
        }
        return out.join("");
    } else {
        return w.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z]/g, "");
    }
}

/**
 * Parse raw text into grouped themes and cleaned words.
 */
export function parseWordSearchText(rawText, defaultTheme = "Word Search", language = "English", accentMode = "Standard Book Mode") {
    const groups = {};
    const lines = (rawText || "").replace(/;/g, "\n").split("\n");
    const dTheme = defaultTheme.trim() || "Word Search";
    groups[dTheme] = [];

    for (const line of lines) {
        const cw = cleanWordForLanguage(line, language, accentMode);
        if (cw.length >= 3) {
            groups[dTheme].push(cw);
        }
    }

    // Filter duplicates per theme
    groups[dTheme] = Array.from(new Set(groups[dTheme]));
    return groups;
}

/**
 * Parse CSV file content (supports multi-theme 'theme,word' or single-column 'word').
 */
export function parseWordSearchCsv(csvContent, defaultTheme = "Word Search", language = "English", accentMode = "Standard Book Mode") {
    const groups = {};
    const dTheme = defaultTheme.trim() || "Word Search";

    if (!csvContent || typeof csvContent !== "string") {
        return groups;
    }

    // Basic CSV line parser (handles commas and quotes)
    const lines = csvContent.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return groups;

    // Detect header
    const firstTokens = lines[0].split(",").map(t => t.replace(/["']/g, "").trim().toLowerCase());
    const themeIdx = firstTokens.indexOf("theme");
    const wordIdx = firstTokens.indexOf("word");

    let startLine = 0;
    const isThemed = (themeIdx !== -1 && wordIdx !== -1);

    if (isThemed || firstTokens[0] === "word" || firstTokens[0] === "words") {
        startLine = 1;
    }

    for (let i = startLine; i < lines.length; i++) {
        const rawTokens = lines[i].split(",").map(t => t.replace(/["']/g, "").trim());
        if (!rawTokens[0]) continue;

        if (isThemed) {
            const rowTheme = rawTokens[themeIdx] || dTheme;
            const rowWord = rawTokens[wordIdx] || "";
            const cw = cleanWordForLanguage(rowWord, language, accentMode);
            if (cw.length >= 3) {
                if (!groups[rowTheme]) groups[rowTheme] = [];
                if (!groups[rowTheme].includes(cw)) {
                    groups[rowTheme].push(cw);
                }
            }
        } else {
            const cw = cleanWordForLanguage(rawTokens[0], language, accentMode);
            if (cw.length >= 3) {
                if (!groups[dTheme]) groups[dTheme] = [];
                if (!groups[dTheme].includes(cw)) {
                    groups[dTheme].push(cw);
                }
            }
        }
    }

    return groups;
}

/**
 * Generate a single word search puzzle reliably with retries.
 */
export function generateWordSearchPuzzle({
    words = [],
    width = 15,
    height = 15,
    difficulty = "medium",
    language = "English",
    accentMode = "Standard Book Mode",
    fillAlphabet = null,
    title = "Word Search #1",
    seed = null
} = {}) {
    const directions = DIFFICULTY_DIRECTIONS[difficulty] || DIFFICULTY_DIRECTIONS.medium;
    const langCfg = LANGUAGE_CONFIGS[language] || LANGUAGE_CONFIGS["English"];
    const alphabet = fillAlphabet || (accentMode === "Strip All Accents (A-Z)" ? "ABCDEFGHIJKLMNOPQRSTUVWXYZ" : langCfg.fill_alphabet);

    const prng = seed !== null ? createPrng(seed) : Math.random;
    const randInt = max => Math.floor(prng() * max);

    // Clean and deduplicate words, sort descending by length
    const cleanedWords = Array.from(new Set(
        words
            .map(w => cleanWordForLanguage(w, language, accentMode))
            .filter(w => w.length >= 3 && w.length <= Math.max(width, height))
    )).sort((a, b) => b.length - a.length);

    let bestGrid = null;
    let bestPlacements = [];
    let bestUnplaced = cleanedWords;

    // Retry loop for maximum placement completion
    for (let attempt = 0; attempt < 12; attempt++) {
        const grid = Array.from({ length: height }, () => Array(width).fill(""));
        const placements = [];
        const unplaced = [];

        // Shuffle words slightly on each attempt while keeping longer ones first
        const attemptWords = [...cleanedWords].sort((a, b) => {
            const diff = b.length - a.length;
            if (diff !== 0) return diff;
            return prng() - 0.5;
        });

        for (const word of attemptWords) {
            let placed = false;

            // Collect all possible valid candidate starting cells and directions
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

            // Shuffle candidates using PRNG
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

        if (unplaced.length < bestUnplaced.length) {
            bestGrid = grid;
            bestPlacements = placements;
            bestUnplaced = unplaced;
        }

        if (bestUnplaced.length === 0) {
            break;
        }
    }

    const grid = bestGrid || Array.from({ length: height }, () => Array(width).fill(""));
    const solutionGrid = grid.map(row => [...row]);

    // Fill remaining empty cells with random letters from active alphabet
    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            if (grid[r][c] === "") {
                const char = alphabet[randInt(alphabet.length)];
                grid[r][c] = char;
            }
        }
    }

    return {
        title,
        theme: title,
        width,
        height,
        grid,
        solutionGrid,
        words: bestPlacements.map(p => p.word),
        placedWords: bestPlacements.map(p => p.word),
        placements: bestPlacements,
        unplacedWords: bestUnplaced,
        difficulty,
        language
    };
}
