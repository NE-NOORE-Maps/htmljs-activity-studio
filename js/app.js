/**
 * KDP Activity Studio · Main Application Controller
 * Handles reactive UI state, real-time preview rendering, and production exports
 * for both Sudoku Studio and Word Search Studio.
 */

import {
    SudokuType,
    SudokuDifficulty,
    DIFFICULTY_LABELS,
    DIFFICULTY_STARS,
    TYPE_CONFIGS,
    generateSudokuBatch
} from "./sudoku_engine.js";

import {
    DATE_FORMAT_PRESETS,
    CALENDAR_THEMES,
    getPuzzleDateInfo,
    renderMiniMonthCalendarCanvas
} from "./calendar_builder.js";

import {
    generateWordSearchPuzzle,
    SAMPLE_WORD_BANKS,
    cleanWordForLanguage
} from "./wordsearch_engine.js";

import {
    SUDOKU_PRESETS,
    WORDSEARCH_HIGHLIGHT_COLORS,
    renderSudokuGridCanvas,
    renderSudokuBookPageCanvas,
    renderSudokuSolutionPageCanvas,
    renderWordSearchGridCanvas,
    renderWordSearchBookPageCanvas,
    renderWordSearchSolutionPageCanvas
} from "./canvas_renderer.js";

import {
    buildCanvaSudokuExcel,
    buildCanvaWordSearchExcel,
    buildSolutionsOnlyExcel
} from "./excel_exporter.js";

import {
    buildSudokuKdpPdf,
    buildWordSearchKdpPdf
} from "./pdf_exporter.js";

// Global Studio State
const state = {
    mode: "sudoku", // "sudoku" | "wordsearch"
    theme: localStorage.getItem("studio_theme") || "light",
    viewMode: "book_page", // "book_page" | "single_puzzle" | "single_solution" | "solution_page"
    currentPage: 1,

    // Volume & Layout
    puzzleCount: 50,
    startNumber: 1,
    puzzlesPerPage: 1,
    solutionsPerPage: 6,
    trimChoice: "8.5 x 11 inches (Letter)",
    sameExcel: true,
    includeInstructions: true,

    // Date & Calendar
    dateEnabled: false,
    dateMode: "text", // "text" | "calendar_image"
    dateScope: "per_game", // "per_game" | "per_page"
    selectedYear: 2026,
    startDate: "2026-01-01",
    progression: "daily",
    dateFormat: "27-September",
    calTheme: "Modern Emerald",
    calBorder: true,
    calSunday: true,
    calShowYear: true,

    // Visual Styling
    activeStyle: { ...SUDOKU_PRESETS.adult_classic },

    // Sudoku Generator Rules
    sudokuType: SudokuType.CLASSIC_9X9,
    difficulty: SudokuDifficulty.MEDIUM,
    seed: 42,
    symmetric: true,
    wordokuWord: "PUBLISHER",
    titleTemplate: "Sudoku #{num}",

    // Word Search Generator Rules
    wsTheme: "animals",
    wsWords: [...SAMPLE_WORD_BANKS.animals],
    wsGridDim: 15,
    wsDifficulty: "medium",
    wsLanguage: "en",
    wsWordCols: 3,
    wsSeed: 101,
    wsTitleTemplate: "Word Search #{num}",

    // Generated batch cache
    puzzles: []
};

// DOM Element References
const dom = {
    // Mode Buttons
    modeSudokuBtn: document.getElementById("mode-sudoku-btn"),
    modeWordsearchBtn: document.getElementById("mode-wordsearch-btn"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    newBookBtn: document.getElementById("new-book-btn"),

    // Sidebar Tabs
    sidebarTabBtns: document.querySelectorAll(".sidebar-tab-btn"),
    tabPanels: document.querySelectorAll(".tab-panel"),

    // Volume Controls
    countInput: document.getElementById("sdk-count-input"),
    countBadge: document.getElementById("sdk-count-badge"),
    startNumInput: document.getElementById("sdk-start-num"),
    countPresetBtns: document.querySelectorAll(".preset-pill-btn[data-count]"),
    puzPerPageSel: document.getElementById("sdk-puz-per-page"),
    solPerPageSel: document.getElementById("sdk-sol-per-page"),
    trimChoiceSel: document.getElementById("sdk-trim-choice"),
    sameExcelTog: document.getElementById("sdk-same-excel-tog"),
    instructionsTog: document.getElementById("sdk-instructions-tog"),

    // Date Controls
    dateEnabledTog: document.getElementById("sdk-date-enabled-tog"),
    dateSubpanel: document.getElementById("date-controls-subpanel"),
    calYearSel: document.getElementById("sdk-cal-year-sel"),
    startDateInput: document.getElementById("sdk-start-date-input"),
    calProgSel: document.getElementById("sdk-cal-progression"),
    calScopePills: document.getElementById("cal-date-scope-pills"),
    scopePerGameBtn: document.getElementById("scope-per-game-btn"),
    scopePerPageBtn: document.getElementById("scope-per-page-btn"),
    dateScopeDesc: document.getElementById("date-scope-desc"),
    dispTextBtn: document.getElementById("disp-text-btn"),
    dispCardBtn: document.getElementById("disp-card-btn"),
    dateFmtGroup: document.getElementById("date-fmt-group"),
    dateFmtSel: document.getElementById("sdk-date-fmt-sel"),
    calCardSettings: document.getElementById("calendar-card-settings"),
    calThemeSel: document.getElementById("sdk-cal-theme-sel"),
    calBorderTog: document.getElementById("sdk-cal-border-tog"),
    calSundayTog: document.getElementById("sdk-cal-sunday-tog"),
    calShowYearTog: document.getElementById("sdk-cal-show-year-tog"),
    calThumbnail: document.getElementById("cal-preview-thumbnail"),

    // Style Controls
    audiencePillBtns: document.querySelectorAll("#audience-preset-pills .preset-pill-btn"),
    cellStyleSel: document.getElementById("sdk-cell-style"),
    shadingModeSel: document.getElementById("sdk-shading-mode"),
    outerLwInput: document.getElementById("sdk-outer-lw"),
    blockLwInput: document.getElementById("sdk-block-lw"),
    innerLwInput: document.getElementById("sdk-inner-lw"),
    fontScaleInput: document.getElementById("sdk-font-scale"),
    solutionModeSel: document.getElementById("sdk-solution-mode"),

    // Sudoku Rules Controls
    sdkRulesSection: document.getElementById("sdk-rules-section"),
    typeSel: document.getElementById("sdk-type-select"),
    wordokuGroup: document.getElementById("wordoku-group"),
    wordokuWordInput: document.getElementById("sdk-wordoku-word"),
    diffSel: document.getElementById("sdk-difficulty-select"),
    seedInput: document.getElementById("sdk-seed-input"),
    titleTplInput: document.getElementById("sdk-title-tpl"),
    symmetricTog: document.getElementById("sdk-symmetric-tog"),

    // Word Search Rules Controls
    wsRulesSection: document.getElementById("ws-rules-section"),
    wsThemePillBtns: document.querySelectorAll("#ws-theme-presets .preset-pill-btn"),
    wsWordListInput: document.getElementById("ws-word-list-input"),
    wsWordCountBadge: document.getElementById("ws-word-count-badge"),
    wsGridDimSel: document.getElementById("ws-grid-dim-select"),
    wsDifficultySel: document.getElementById("ws-difficulty-select"),
    wsLangSel: document.getElementById("ws-lang-select"),
    wsWordColsSel: document.getElementById("ws-word-cols-select"),
    wsSeedInput: document.getElementById("ws-seed-input"),
    wsTitleTplInput: document.getElementById("ws-title-tpl"),

    // Metrics
    metricPuzzles: document.getElementById("metric-puzzles"),
    metricType: document.getElementById("metric-type"),
    metricDiff: document.getElementById("metric-diff"),
    metricGrid: document.getElementById("metric-grid"),
    metricClues: document.getElementById("metric-clues"),
    metricGamesPage: document.getElementById("metric-games-page"),

    // Stage
    viewBtns: document.querySelectorAll(".view-btn"),
    stagePageSel: document.getElementById("stage-page-select"),
    btnPagePrev: document.getElementById("btn-page-prev"),
    btnPageNext: document.getElementById("btn-page-next"),
    mainCanvas: document.getElementById("main-stage-canvas"),
    previewWrapper: document.getElementById("preview-wrapper"),
    zoomBtns: document.querySelectorAll(".zoom-btn"),
    exportSummary: document.getElementById("export-summary-text"),

    // Export Buttons & Progress
    btnExportCanva: document.getElementById("btn-export-canva"),
    btnExportSolutions: document.getElementById("btn-export-solutions"),
    btnExportPdf: document.getElementById("btn-export-pdf"),
    btnExportZip: document.getElementById("btn-export-zip"),
    exportProgressContainer: document.getElementById("export-progress-container"),
    exportProgressFill: document.getElementById("export-progress-fill"),
    exportProgressText: document.getElementById("export-progress-text")
};

// Initialize Date Format Dropdown
function populateDateFormats() {
    dom.dateFmtSel.innerHTML = "";
    DATE_FORMAT_PRESETS.forEach(preset => {
        const opt = document.createElement("option");
        opt.value = preset;
        opt.textContent = preset.replace("2026", String(state.selectedYear));
        if (preset === state.dateFormat) opt.selected = true;
        dom.dateFmtSel.appendChild(opt);
    });
}

// Initialize Calendar Themes Dropdown
function populateCalendarThemes() {
    dom.calThemeSel.innerHTML = "";
    Object.keys(CALENDAR_THEMES).forEach(thName => {
        const opt = document.createElement("option");
        opt.value = thName;
        opt.textContent = thName;
        if (thName === state.calTheme) opt.selected = true;
        dom.calThemeSel.appendChild(opt);
    });
}

// Generate Puzzles Batch (Sudoku or Word Search)
function updatePuzzlesBatch() {
    if (state.mode === "sudoku") {
        state.puzzles = generateSudokuBatch({
            count: state.puzzleCount,
            startNum: state.startNumber,
            seed: state.seed,
            puzzleType: state.sudokuType,
            difficulty: state.difficulty,
            symmetric: state.symmetric,
            wordokuWord: state.wordokuWord,
            titleTemplate: state.titleTemplate
        });
    } else {
        // Word Search Batch
        const baseWords = state.wsWords.length > 0 ? state.wsWords : SAMPLE_WORD_BANKS.animals;
        const generated = [];

        for (let i = 0; i < state.puzzleCount; i++) {
            const pNum = state.startNumber + i;
            const pTitle = state.wsTitleTemplate.replace("{num}", String(pNum)).replace("{title}", `Theme ${pNum}`);

            // Shuffle words per puzzle so each page has varied arrangements
            const shuffled = [...baseWords].sort(() => Math.sin(state.wsSeed + i * 41) - 0.5);

            const puzzle = generateWordSearchPuzzle({
                words: shuffled,
                width: state.wsGridDim,
                height: state.wsGridDim,
                difficulty: state.wsDifficulty,
                language: state.wsLanguage,
                title: pTitle,
                seed: state.wsSeed + i * 19
            });

            puzzle.puzzleId = pNum;
            puzzle.difficultyLabel = state.wsDifficulty.toUpperCase();
            generated.push(puzzle);
        }

        state.puzzles = generated;
    }
}

// Update Top Metrics Strip
function updateMetrics() {
    dom.metricPuzzles.textContent = state.puzzles.length;

    if (state.mode === "sudoku") {
        const cfg = TYPE_CONFIGS[state.sudokuType];
        dom.metricType.textContent = cfg.label;
        dom.metricDiff.textContent = `${DIFFICULTY_LABELS[state.difficulty]} ${DIFFICULTY_STARS[state.difficulty]}`;
        dom.metricGrid.textContent = `${cfg.size} × ${cfg.size}`;
        dom.metricClues.textContent = state.puzzles[0] ? state.puzzles[0].cluesCount : "-";
        dom.metricGamesPage.textContent = state.puzzlesPerPage;

        dom.exportSummary.textContent = `${state.puzzleCount} Puzzles · ${state.trimChoice} · ${state.puzzlesPerPage} game(s)/page · 300 DPI Commercial Print Ready`;
    } else {
        dom.metricType.textContent = "Word Search";
        dom.metricDiff.textContent = state.wsDifficulty.toUpperCase();
        dom.metricGrid.textContent = `${state.wsGridDim} × ${state.wsGridDim}`;
        dom.metricClues.textContent = state.puzzles[0] && state.puzzles[0].placedWords ? state.puzzles[0].placedWords.length : "-";
        dom.metricGamesPage.textContent = `1 (${state.wsWordCols} cols)`;

        dom.exportSummary.textContent = `${state.puzzleCount} Word Searches · ${state.trimChoice} · 300 DPI Commercial Print Ready`;
    }
}

// Update Live Mini Calendar Preview Thumbnail in Sidebar
function updateMiniCalendarThumbnail() {
    if (!state.dateEnabled || state.dateMode !== "calendar_image") return;

    const startDateObj = new Date(state.startDate);
    const hlDay = state.progression === "daily" ? startDateObj.getDate() : null;

    const thumbCanvas = renderMiniMonthCalendarCanvas({
        year: state.selectedYear,
        month: startDateObj.getMonth() + 1,
        highlightDay: hlDay,
        width: 380,
        height: 300,
        theme: state.calTheme,
        firstDaySunday: state.calSunday,
        showCardBorder: state.calBorder,
        showYear: state.calShowYear
    });

    const ctx = dom.calThumbnail.getContext("2d");
    dom.calThumbnail.width = thumbCanvas.width;
    dom.calThumbnail.height = thumbCanvas.height;
    ctx.drawImage(thumbCanvas, 0, 0);
}

// Render the Active Stage View
function renderStage() {
    if (!state.puzzles || state.puzzles.length === 0) return;

    // Calculate pagination based on view mode & studio mode
    let totalPages = 1;
    if (state.mode === "sudoku") {
        if (state.viewMode === "book_page") {
            totalPages = Math.max(1, Math.ceil(state.puzzles.length / state.puzzlesPerPage));
        } else if (state.viewMode === "solution_page") {
            totalPages = Math.max(1, Math.ceil(state.puzzles.length / state.solutionsPerPage));
        } else {
            totalPages = state.puzzles.length;
        }
    } else {
        // Word Search mode
        if (state.viewMode === "book_page") {
            totalPages = state.puzzles.length; // 1 puzzle per page standard
        } else if (state.viewMode === "solution_page") {
            totalPages = Math.max(1, Math.ceil(state.puzzles.length / 4)); // 4 solutions per page
        } else {
            totalPages = state.puzzles.length;
        }
    }

    if (state.currentPage > totalPages) state.currentPage = totalPages;
    if (state.currentPage < 1) state.currentPage = 1;

    // Update Pagination Select Dropdown
    dom.stagePageSel.innerHTML = "";
    for (let p = 1; p <= totalPages; p++) {
        const opt = document.createElement("option");
        opt.value = p;
        if (state.viewMode === "book_page") {
            opt.textContent = `Page ${p}/${totalPages}`;
        } else if (state.viewMode === "solution_page") {
            opt.textContent = `Solutions Page ${p}/${totalPages}`;
        } else {
            opt.textContent = `Puzzle #${state.startNumber + p - 1}`;
        }
        if (p === state.currentPage) opt.selected = true;
        dom.stagePageSel.appendChild(opt);
    }

    dom.btnPagePrev.disabled = state.currentPage <= 1;
    dom.btnPageNext.disabled = state.currentPage >= totalPages;

    const ctx = dom.mainCanvas.getContext("2d");

    // Branch Rendering by Mode
    if (state.mode === "sudoku") {
        renderSudokuStage(ctx, totalPages);
    } else {
        renderWordSearchStage(ctx, totalPages);
    }
}

// Render Sudoku Stage Views
function renderSudokuStage(ctx, totalPages) {
    if (state.viewMode === "book_page") {
        const startIdx = (state.currentPage - 1) * state.puzzlesPerPage;
        const endIdx = startIdx + state.puzzlesPerPage;
        const pSlice = state.puzzles.slice(startIdx, endIdx);

        let dateStrings = null;
        let calendarCanvases = null;
        let pageDateText = null;
        let pageCalendarCanvas = null;

        if (state.dateEnabled) {
            if (state.dateScope === "per_page") {
                const pageIdx = state.currentPage - 1;
                const info = getPuzzleDateInfo(pageIdx, state.startDate, state.progression, state.dateFormat);
                pageDateText = info.dateStr;

                if (state.dateMode === "calendar_image") {
                    pageCalendarCanvas = renderMiniMonthCalendarCanvas({
                        year: info.year,
                        month: info.month,
                        highlightDay: info.highlightDay,
                        theme: state.calTheme,
                        firstDaySunday: state.calSunday,
                        showCardBorder: state.calBorder,
                        showYear: state.calShowYear
                    });
                }
            } else {
                dateStrings = [];
                calendarCanvases = [];
                for (let i = startIdx; i < Math.min(state.puzzles.length, endIdx); i++) {
                    const info = getPuzzleDateInfo(i, state.startDate, state.progression, state.dateFormat);
                    dateStrings.push(info.dateStr);

                    if (state.dateMode === "calendar_image") {
                        const cCanvas = renderMiniMonthCalendarCanvas({
                            year: info.year,
                            month: info.month,
                            highlightDay: info.highlightDay,
                            theme: state.calTheme,
                            firstDaySunday: state.calSunday,
                            showCardBorder: state.calBorder,
                            showYear: state.calShowYear
                        });
                        calendarCanvases.push(cCanvas);
                    }
                }
            }
        }

        const pageCnv = renderSudokuBookPageCanvas({
            puzzlesSlice: pSlice,
            style: state.activeStyle,
            puzzlesPerPage: state.puzzlesPerPage,
            pageNum: state.currentPage,
            totalPages,
            dpi: 150,
            includeInstructions: state.includeInstructions,
            dateScope: state.dateScope,
            dateStrings,
            calendarCanvases,
            pageDateText,
            pageCalendarCanvas
        });

        dom.mainCanvas.width = pageCnv.width;
        dom.mainCanvas.height = pageCnv.height;
        ctx.drawImage(pageCnv, 0, 0);

    } else if (state.viewMode === "solution_page") {
        const startIdx = (state.currentPage - 1) * state.solutionsPerPage;
        const endIdx = startIdx + state.solutionsPerPage;
        const sSlice = state.puzzles.slice(startIdx, endIdx);

        const solCnv = renderSudokuSolutionPageCanvas({
            puzzlesSlice: sSlice,
            style: state.activeStyle,
            solutionsPerPage: state.solutionsPerPage,
            pageNum: state.currentPage,
            totalPages,
            dpi: 150
        });

        dom.mainCanvas.width = solCnv.width;
        dom.mainCanvas.height = solCnv.height;
        ctx.drawImage(solCnv, 0, 0);

    } else if (state.viewMode === "single_puzzle") {
        const pIdx = state.currentPage - 1;
        const p = state.puzzles[pIdx] || state.puzzles[0];
        let dTxt = null;
        if (state.dateEnabled) {
            const dateIdx = (state.dateScope === "per_page")
                ? Math.floor(pIdx / state.puzzlesPerPage)
                : pIdx;
            const info = getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat);
            dTxt = info.dateStr;
        }

        const pCnv = renderSudokuGridCanvas({
            puzzle: p,
            style: state.activeStyle,
            cellMm: 12.0,
            dpi: 150,
            solution: false,
            includeHeader: true,
            dateText: dTxt
        });

        dom.mainCanvas.width = pCnv.width;
        dom.mainCanvas.height = pCnv.height;
        ctx.drawImage(pCnv, 0, 0);

    } else if (state.viewMode === "single_solution") {
        const pIdx = state.currentPage - 1;
        const p = state.puzzles[pIdx] || state.puzzles[0];

        const sCnv = renderSudokuGridCanvas({
            puzzle: p,
            style: state.activeStyle,
            cellMm: 12.0,
            dpi: 150,
            solution: true,
            includeHeader: true
        });

        dom.mainCanvas.width = sCnv.width;
        dom.mainCanvas.height = sCnv.height;
        ctx.drawImage(sCnv, 0, 0);
    }
}

// Render Word Search Stage Views
function renderWordSearchStage(ctx, totalPages) {
    const pIdx = state.currentPage - 1;
    const p = state.puzzles[pIdx] || state.puzzles[0];

    let dTxt = null;
    let calCanvas = null;

    if (state.dateEnabled) {
        const info = getPuzzleDateInfo(pIdx, state.startDate, state.progression, state.dateFormat);
        dTxt = info.dateStr;

        if (state.dateMode === "calendar_image") {
            calCanvas = renderMiniMonthCalendarCanvas({
                year: info.year,
                month: info.month,
                highlightDay: info.highlightDay,
                theme: state.calTheme,
                firstDaySunday: state.calSunday,
                showCardBorder: state.calBorder,
                showYear: state.calShowYear
            });
        }
    }

    if (state.viewMode === "book_page") {
        const pageCnv = renderWordSearchBookPageCanvas({
            puzzle: p,
            style: state.activeStyle,
            pageNum: state.currentPage,
            totalPages,
            dpi: 150,
            dateText: dTxt,
            calendarCanvas: calCanvas,
            wordColumns: state.wsWordCols
        });

        dom.mainCanvas.width = pageCnv.width;
        dom.mainCanvas.height = pageCnv.height;
        ctx.drawImage(pageCnv, 0, 0);

    } else if (state.viewMode === "solution_page") {
        const solPerPage = 4;
        const startIdx = (state.currentPage - 1) * solPerPage;
        const sSlice = state.puzzles.slice(startIdx, startIdx + solPerPage);

        const solCnv = renderWordSearchSolutionPageCanvas({
            puzzlesSlice: sSlice,
            style: state.activeStyle,
            solutionsPerPage: solPerPage,
            pageNum: state.currentPage,
            totalPages: Math.ceil(state.puzzles.length / solPerPage),
            dpi: 150
        });

        dom.mainCanvas.width = solCnv.width;
        dom.mainCanvas.height = solCnv.height;
        ctx.drawImage(solCnv, 0, 0);

    } else if (state.viewMode === "single_puzzle") {
        const pCnv = renderWordSearchGridCanvas({
            puzzle: p,
            style: state.activeStyle,
            cellMm: 10.0,
            dpi: 150,
            solution: false,
            includeHeader: true,
            dateText: dTxt
        });

        dom.mainCanvas.width = pCnv.width;
        dom.mainCanvas.height = pCnv.height;
        ctx.drawImage(pCnv, 0, 0);

    } else if (state.viewMode === "single_solution") {
        const sCnv = renderWordSearchGridCanvas({
            puzzle: p,
            style: state.activeStyle,
            cellMm: 10.0,
            dpi: 150,
            solution: true,
            includeHeader: true,
            dateText: dTxt
        });

        dom.mainCanvas.width = sCnv.width;
        dom.mainCanvas.height = sCnv.height;
        ctx.drawImage(sCnv, 0, 0);
    }
}

// Master Refresh
function refreshStudio() {
    updatePuzzlesBatch();
    updateMetrics();
    updateMiniCalendarThumbnail();
    renderStage();
}

// Set Up Event Handlers
function setupEvents() {
    // Mode Switcher (Sudoku vs Word Search)
    dom.modeSudokuBtn.addEventListener("click", () => {
        state.mode = "sudoku";
        dom.modeSudokuBtn.classList.add("active");
        dom.modeWordsearchBtn.classList.remove("active");
        dom.sdkRulesSection.style.display = "block";
        dom.wsRulesSection.style.display = "none";
        state.currentPage = 1;
        refreshStudio();
    });

    dom.modeWordsearchBtn.addEventListener("click", () => {
        state.mode = "wordsearch";
        dom.modeWordsearchBtn.classList.add("active");
        dom.modeSudokuBtn.classList.remove("active");
        dom.sdkRulesSection.style.display = "none";
        dom.wsRulesSection.style.display = "block";
        state.currentPage = 1;
        refreshStudio();
    });

    // Theme Switcher (Dark / Light)
    dom.themeToggleBtn.addEventListener("click", () => {
        const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        localStorage.setItem("studio_theme", newTheme);
        dom.themeToggleBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
    });

    // New Random Book Seed
    dom.newBookBtn.addEventListener("click", () => {
        const randSeed = Math.floor(Math.random() * 900000) + 10000;
        if (state.mode === "sudoku") {
            state.seed = randSeed;
            dom.seedInput.value = state.seed;
        } else {
            state.wsSeed = randSeed;
            dom.wsSeedInput.value = state.wsSeed;
        }
        state.currentPage = 1;
        refreshStudio();
    });

    // Sidebar Tab Navigation
    dom.sidebarTabBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.sidebarTabBtns.forEach(b => b.classList.remove("active"));
            dom.tabPanels.forEach(p => p.classList.remove("active"));
            btn.classList.add("active");
            const targetPanel = document.getElementById(btn.dataset.tab);
            if (targetPanel) targetPanel.classList.add("active");
        });
    });

    // View Mode Selector
    dom.viewBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.viewBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.viewMode = btn.dataset.view;
            state.currentPage = 1;
            renderStage();
        });
    });

    // Zoom Controls (50% Default, 75%, 100%)
    dom.zoomBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.zoomBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const scale = parseFloat(btn.dataset.scale) || 0.5;
            state.previewScale = scale;
            if (dom.previewWrapper) {
                if (scale === 0.5) {
                    dom.previewWrapper.style.maxWidth = "480px";
                } else if (scale === 0.75) {
                    dom.previewWrapper.style.maxWidth = "720px";
                } else {
                    dom.previewWrapper.style.maxWidth = "100%";
                }
            }
        });
    });

    // Page Navigation
    dom.btnPagePrev.addEventListener("click", () => {
        if (state.currentPage > 1) {
            state.currentPage--;
            renderStage();
        }
    });

    dom.btnPageNext.addEventListener("click", () => {
        state.currentPage++;
        renderStage();
    });

    dom.stagePageSel.addEventListener("change", (e) => {
        state.currentPage = parseInt(e.target.value, 10);
        renderStage();
    });

    // Volume Controls
    dom.countInput.addEventListener("input", (e) => {
        state.puzzleCount = Math.max(1, Math.min(366, parseInt(e.target.value, 10) || 1));
        dom.countBadge.textContent = state.puzzleCount;
        refreshStudio();
    });

    dom.countPresetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.countPresetBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const cnt = parseInt(btn.dataset.count, 10);
            state.puzzleCount = cnt;
            dom.countInput.value = cnt;
            dom.countBadge.textContent = cnt;
            refreshStudio();
        });
    });

    dom.startNumInput.addEventListener("input", (e) => {
        state.startNumber = Math.max(1, parseInt(e.target.value, 10) || 1);
        refreshStudio();
    });

    dom.puzPerPageSel.addEventListener("change", (e) => {
        state.puzzlesPerPage = parseInt(e.target.value, 10);
        refreshStudio();
    });

    dom.solPerPageSel.addEventListener("change", (e) => {
        state.solutionsPerPage = parseInt(e.target.value, 10);
        refreshStudio();
    });

    dom.trimChoiceSel.addEventListener("change", (e) => {
        state.trimChoice = e.target.value;
        refreshStudio();
    });

    dom.sameExcelTog.addEventListener("change", (e) => {
        state.sameExcel = e.target.checked;
        dom.solPerPageSel.disabled = state.sameExcel;
    });

    dom.instructionsTog.addEventListener("change", (e) => {
        state.includeInstructions = e.target.checked;
        renderStage();
    });

    // Date & Calendar Controls
    dom.dateEnabledTog.addEventListener("change", (e) => {
        state.dateEnabled = e.target.checked;
        dom.dateSubpanel.style.display = state.dateEnabled ? "flex" : "none";
        refreshStudio();
    });

    dom.calYearSel.addEventListener("change", (e) => {
        state.selectedYear = parseInt(e.target.value, 10);
        state.startDate = `${state.selectedYear}-01-01`;
        dom.startDateInput.value = state.startDate;
        populateDateFormats();
        refreshStudio();
    });

    dom.startDateInput.addEventListener("change", (e) => {
        state.startDate = e.target.value;
        refreshStudio();
    });

    dom.calProgSel.addEventListener("change", (e) => {
        state.progression = e.target.value;
        refreshStudio();
    });

    if (dom.scopePerGameBtn && dom.scopePerPageBtn) {
        dom.scopePerGameBtn.addEventListener("click", () => {
            state.dateScope = "per_game";
            dom.scopePerGameBtn.classList.add("active");
            dom.scopePerPageBtn.classList.remove("active");
            if (dom.dateScopeDesc) {
                dom.dateScopeDesc.textContent = "Each puzzle slot receives its own sequential calendar date.";
            }
            refreshStudio();
        });

        dom.scopePerPageBtn.addEventListener("click", () => {
            state.dateScope = "per_page";
            dom.scopePerPageBtn.classList.add("active");
            dom.scopePerGameBtn.classList.remove("active");
            if (dom.dateScopeDesc) {
                dom.dateScopeDesc.textContent = "All puzzles on the same book page share one unified date header.";
            }
            refreshStudio();
        });
    }

    dom.dispTextBtn.addEventListener("click", () => {
        state.dateMode = "text";
        dom.dispTextBtn.classList.add("active");
        dom.dispCardBtn.classList.remove("active");
        dom.calCardSettings.style.display = "none";
        dom.dateFmtGroup.style.display = "flex";
        refreshStudio();
    });

    dom.dispCardBtn.addEventListener("click", () => {
        state.dateMode = "calendar_image";
        dom.dispCardBtn.classList.add("active");
        dom.dispTextBtn.classList.remove("active");
        dom.calCardSettings.style.display = "flex";
        dom.dateFmtGroup.style.display = "none";
        refreshStudio();
    });

    dom.dateFmtSel.addEventListener("change", (e) => {
        state.dateFormat = e.target.value;
        refreshStudio();
    });

    dom.calThemeSel.addEventListener("change", (e) => {
        state.calTheme = e.target.value;
        refreshStudio();
    });

    dom.calBorderTog.addEventListener("change", (e) => {
        state.calBorder = e.target.checked;
        refreshStudio();
    });

    dom.calSundayTog.addEventListener("change", (e) => {
        state.calSunday = e.target.checked;
        refreshStudio();
    });

    dom.calShowYearTog.addEventListener("change", (e) => {
        state.calShowYear = e.target.checked;
        refreshStudio();
    });

    // Audience Style Presets
    dom.audiencePillBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.audiencePillBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const presetKey = btn.dataset.preset;
            if (SUDOKU_PRESETS[presetKey]) {
                state.activeStyle = { ...SUDOKU_PRESETS[presetKey] };
                dom.cellStyleSel.value = state.activeStyle.cellStyle;
                dom.shadingModeSel.value = state.activeStyle.shadingMode;
                dom.outerLwInput.value = state.activeStyle.outerLineWidth;
                dom.blockLwInput.value = state.activeStyle.blockLineWidth;
                dom.innerLwInput.value = state.activeStyle.innerLineWidth;
                dom.fontScaleInput.value = state.activeStyle.fontScale;
                dom.solutionModeSel.value = state.activeStyle.solutionMode;
                renderStage();
            }
        });
    });

    // Manual Styling Inputs
    dom.cellStyleSel.addEventListener("change", (e) => {
        state.activeStyle.cellStyle = e.target.value;
        renderStage();
    });

    dom.shadingModeSel.addEventListener("change", (e) => {
        state.activeStyle.shadingMode = e.target.value;
        renderStage();
    });

    dom.outerLwInput.addEventListener("input", (e) => {
        state.activeStyle.outerLineWidth = parseFloat(e.target.value) || 1.4;
        renderStage();
    });

    dom.blockLwInput.addEventListener("input", (e) => {
        state.activeStyle.blockLineWidth = parseFloat(e.target.value) || 1.0;
        renderStage();
    });

    dom.innerLwInput.addEventListener("input", (e) => {
        state.activeStyle.innerLineWidth = parseFloat(e.target.value) || 0.4;
        renderStage();
    });

    dom.fontScaleInput.addEventListener("input", (e) => {
        state.activeStyle.fontScale = parseInt(e.target.value, 10) || 64;
        renderStage();
    });

    dom.solutionModeSel.addEventListener("change", (e) => {
        state.activeStyle.solutionMode = e.target.value;
        renderStage();
    });

    // Sudoku Generator Rules Controls
    dom.typeSel.addEventListener("change", (e) => {
        state.sudokuType = e.target.value;
        dom.wordokuGroup.style.display = state.sudokuType === SudokuType.WORDOKU_9X9 ? "flex" : "none";
        refreshStudio();
    });

    dom.wordokuWordInput.addEventListener("input", (e) => {
        state.wordokuWord = e.target.value;
        refreshStudio();
    });

    dom.diffSel.addEventListener("change", (e) => {
        state.difficulty = e.target.value;
        refreshStudio();
    });

    dom.seedInput.addEventListener("input", (e) => {
        state.seed = parseInt(e.target.value, 10) || 42;
        refreshStudio();
    });

    dom.titleTplInput.addEventListener("input", (e) => {
        state.titleTemplate = e.target.value || "Sudoku #{num}";
        refreshStudio();
    });

    dom.symmetricTog.addEventListener("change", (e) => {
        state.symmetric = e.target.checked;
        refreshStudio();
    });

    // Word Search Controls
    dom.wsThemePillBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.wsThemePillBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.wsTheme = btn.dataset.theme;

            if (state.wsTheme !== "custom" && SAMPLE_WORD_BANKS[state.wsTheme]) {
                state.wsWords = [...SAMPLE_WORD_BANKS[state.wsTheme]];
                dom.wsWordListInput.value = state.wsWords.join("\n");
                dom.wsWordCountBadge.textContent = `${state.wsWords.length} words`;
                refreshStudio();
            }
        });
    });

    dom.wsWordListInput.addEventListener("input", (e) => {
        const raw = e.target.value;
        const words = raw
            .split(/[\n,]+/)
            .map(w => w.trim().toUpperCase())
            .filter(w => w.length >= 3);

        state.wsWords = words;
        dom.wsWordCountBadge.textContent = `${words.length} words`;
        refreshStudio();
    });

    dom.wsGridDimSel.addEventListener("change", (e) => {
        state.wsGridDim = parseInt(e.target.value, 10);
        refreshStudio();
    });

    dom.wsDifficultySel.addEventListener("change", (e) => {
        state.wsDifficulty = e.target.value;
        refreshStudio();
    });

    dom.wsLangSel.addEventListener("change", (e) => {
        state.wsLanguage = e.target.value;
        refreshStudio();
    });

    dom.wsWordColsSel.addEventListener("change", (e) => {
        state.wsWordCols = parseInt(e.target.value, 10);
        renderStage();
    });

    dom.wsSeedInput.addEventListener("input", (e) => {
        state.wsSeed = parseInt(e.target.value, 10) || 101;
        refreshStudio();
    });

    dom.wsTitleTplInput.addEventListener("input", (e) => {
        state.wsTitleTemplate = e.target.value || "Word Search #{num}";
        refreshStudio();
    });

    // Exports
    dom.btnExportCanva.addEventListener("click", handleExportCanva);
    dom.btnExportSolutions.addEventListener("click", handleExportSolutions);
    dom.btnExportPdf.addEventListener("click", handleExportPdf);
    dom.btnExportZip.addEventListener("click", handleExportZip);
}

// Progress Bar Helper
function setProgress(percent, text) {
    if (percent === null) {
        dom.exportProgressContainer.style.display = "none";
    } else {
        dom.exportProgressContainer.style.display = "flex";
        dom.exportProgressFill.style.width = `${percent}%`;
        dom.exportProgressText.textContent = text || `Processing ${percent}%...`;
    }
}

// Helper to render images for Canva Bulk cell embedding
async function renderCanvaBulkImages(onProgress) {
    const total = state.puzzles.length;
    const totalPages = Math.ceil(total / state.puzzlesPerPage);
    const gridImages = [];
    const solutionImages = [];
    const calendarImages = [];
    const pageCalendarImages = [];

    // Pre-generate page calendar images when calendar image mode is active
    if (state.dateEnabled && state.dateMode === "calendar_image") {
        for (let p = 0; p < totalPages; p++) {
            const info = getPuzzleDateInfo(p, state.startDate, state.progression, state.dateFormat);
            const calCnv = renderMiniMonthCalendarCanvas({
                year: info.year,
                month: info.month,
                highlightDay: info.highlightDay,
                theme: state.calTheme,
                firstDaySunday: state.calSunday,
                showCardBorder: state.calBorder,
                showYear: state.calShowYear
            });
            pageCalendarImages.push(calCnv.toDataURL("image/png"));
        }
    }

    for (let i = 0; i < total; i++) {
        const p = state.puzzles[i];
        let dTxt = null;

        if (state.dateEnabled) {
            const dateIdx = (state.dateScope === "per_page")
                ? Math.floor(i / state.puzzlesPerPage)
                : i;
            const info = getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat);
            dTxt = info.dateStr;

            if (state.dateMode === "calendar_image") {
                const calCnv = renderMiniMonthCalendarCanvas({
                    year: info.year,
                    month: info.month,
                    highlightDay: info.highlightDay,
                    theme: state.calTheme,
                    firstDaySunday: state.calSunday,
                    showCardBorder: state.calBorder,
                    showYear: state.calShowYear
                });
                calendarImages.push(calCnv.toDataURL("image/png"));
            }
        }

        if (state.mode === "sudoku") {
            const gridCnv = renderSudokuGridCanvas({
                puzzle: p,
                style: state.activeStyle,
                cellMm: 12.0,
                dpi: 150,
                solution: false,
                dateText: dTxt
            });
            gridImages.push(gridCnv.toDataURL("image/png"));

            if (state.sameExcel) {
                const solCnv = renderSudokuGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 12.0,
                    dpi: 150,
                    solution: true
                });
                solutionImages.push(solCnv.toDataURL("image/png"));
            }
        } else {
            const gridCnv = renderWordSearchGridCanvas({
                puzzle: p,
                style: state.activeStyle,
                cellMm: 9.0,
                dpi: 150,
                solution: false,
                dateText: dTxt,
                showGridLines: true
            });
            gridImages.push(gridCnv.toDataURL("image/png"));

            if (state.sameExcel) {
                const solCnv = renderWordSearchGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 9.0,
                    dpi: 150,
                    solution: true,
                    showGridLines: true
                });
                solutionImages.push(solCnv.toDataURL("image/png"));
            }
        }

        if (onProgress && (i % 4 === 0 || i === total - 1)) {
            onProgress(Math.round(((i + 1) / total) * 65));
            await new Promise(r => setTimeout(r, 0));
        }
    }

    return { gridImages, solutionImages, calendarImages, pageCalendarImages };
}

// Handle Canva Bulk Excel Export (with REAL embedded floating images)
async function handleExportCanva() {
    try {
        setProgress(5, "Rendering puzzle images for Canva Bulk cell embedding...");
        const { gridImages, solutionImages, calendarImages, pageCalendarImages } = await renderCanvaBulkImages(
            pct => setProgress(pct, `Embedding images into Canva Excel: ${pct}%...`)
        );

        setProgress(70, "Building Canva Bulk Excel workbook with embedded pictures...");
        const totalPuzzles = state.puzzles.length;
        const totalPages = Math.ceil(totalPuzzles / state.puzzlesPerPage);

        const dateStrings = state.puzzles.map((_, i) => {
            const dateIdx = (state.dateScope === "per_page")
                ? Math.floor(i / state.puzzlesPerPage)
                : i;
            return state.dateEnabled ? getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat).dateStr : "";
        });

        const pageDateStrings = [];
        if (state.dateEnabled) {
            for (let p = 0; p < totalPages; p++) {
                const info = getPuzzleDateInfo(p, state.startDate, state.progression, state.dateFormat);
                pageDateStrings.push(info.dateStr);
            }
        }

        let buffer;
        let filename;

        if (state.mode === "sudoku") {
            buffer = await buildCanvaSudokuExcel({
                puzzles: state.puzzles,
                puzzlesPerPage: state.puzzlesPerPage,
                includeSolutionInSameExcel: state.sameExcel,
                dateScope: state.dateScope,
                dateStrings: state.dateEnabled ? dateStrings : [],
                pageDateStrings: state.dateEnabled ? pageDateStrings : [],
                hasCalendarImages: state.dateEnabled && state.dateMode === "calendar_image",
                gridImages,
                solutionImages,
                calendarImages,
                pageCalendarImages
            });
            filename = "sudoku_canva_bulk.xlsx";
        } else {
            buffer = await buildCanvaWordSearchExcel({
                puzzles: state.puzzles,
                includeSolutionInSameExcel: state.sameExcel,
                dateStrings: state.dateEnabled ? dateStrings : [],
                hasCalendarImages: state.dateEnabled && state.dateMode === "calendar_image",
                gridImages,
                solutionImages,
                calendarImages
            });
            filename = "wordsearch_canva_bulk.xlsx";
        }

        setProgress(95, "Downloading Canva Bulk workbook...");
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        saveAs(blob, filename);
        setTimeout(() => setProgress(null), 1000);
    } catch (err) {
        setProgress(null);
        alert(`Export failed: ${err.message}`);
    }
}

// Handle Solutions Excel Export
function handleExportSolutions() {
    try {
        const buffer = buildSolutionsOnlyExcel({ puzzles: state.puzzles });
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const filename = state.mode === "sudoku" ? "sudoku_solutions.xlsx" : "wordsearch_solutions.xlsx";
        saveAs(blob, filename);
    } catch (err) {
        alert(`Export failed: ${err.message}`);
    }
}

// Handle KDP Print PDF Export
async function handleExportPdf() {
    try {
        setProgress(5, "Building print-ready KDP PDF book...");
        const totalPuzzles = state.puzzles.length;
        const totalPages = Math.ceil(totalPuzzles / state.puzzlesPerPage);

        const dateStrings = state.puzzles.map((_, i) =>
            state.dateEnabled ? getPuzzleDateInfo(i, state.startDate, state.progression, state.dateFormat).dateStr : ""
        );

        const calendarCanvases = state.puzzles.map((_, i) => {
            if (state.dateEnabled && state.dateMode === "calendar_image") {
                const info = getPuzzleDateInfo(i, state.startDate, state.progression, state.dateFormat);
                return renderMiniMonthCalendarCanvas({
                    year: info.year,
                    month: info.month,
                    highlightDay: info.highlightDay,
                    theme: state.calTheme,
                    firstDaySunday: state.calSunday,
                    showCardBorder: state.calBorder,
                    showYear: state.calShowYear
                });
            }
            return null;
        });

        const pageDateStrings = [];
        const pageCalendarCanvases = [];
        if (state.dateEnabled) {
            for (let p = 0; p < totalPages; p++) {
                const info = getPuzzleDateInfo(p, state.startDate, state.progression, state.dateFormat);
                pageDateStrings.push(info.dateStr);
                if (state.dateMode === "calendar_image") {
                    pageCalendarCanvases.push(renderMiniMonthCalendarCanvas({
                        year: info.year,
                        month: info.month,
                        highlightDay: info.highlightDay,
                        theme: state.calTheme,
                        firstDaySunday: state.calSunday,
                        showCardBorder: state.calBorder,
                        showYear: state.calShowYear
                    }));
                } else {
                    pageCalendarCanvases.push(null);
                }
            }
        }

        let pdfBuffer;
        let filename;

        if (state.mode === "sudoku") {
            pdfBuffer = await buildSudokuKdpPdf({
                puzzles: state.puzzles,
                style: state.activeStyle,
                puzzlesPerPage: state.puzzlesPerPage,
                solutionsPerPage: state.solutionsPerPage,
                trimChoice: state.trimChoice,
                includeInstructions: state.includeInstructions,
                dateScope: state.dateScope,
                dateStrings: state.dateEnabled ? dateStrings : [],
                calendarCanvases,
                pageDateStrings: state.dateEnabled ? pageDateStrings : [],
                pageCalendarCanvases,
                onProgress: (p) => setProgress(p, `Rendering PDF book pages: ${p}%`)
            });
            filename = "sudoku_kdp_interior.pdf";
        } else {
            pdfBuffer = await buildWordSearchKdpPdf({
                puzzles: state.puzzles,
                style: state.activeStyle,
                solutionsPerPage: 4,
                trimChoice: state.trimChoice,
                dateStrings: state.dateEnabled ? dateStrings : [],
                calendarCanvases,
                wordColumns: state.wsWordCols,
                onProgress: (p) => setProgress(p, `Rendering PDF book pages: ${p}%`)
            });
            filename = "wordsearch_kdp_interior.pdf";
        }

        const blob = new Blob([pdfBuffer], { type: "application/pdf" });
        saveAs(blob, filename);
        setTimeout(() => setProgress(null), 1000);
    } catch (err) {
        setProgress(null);
        alert(`PDF export failed: ${err.message}`);
    }
}

// Handle Complete 300 DPI ZIP Bundle Export
async function handleExportZip() {
    if (typeof window.JSZip === "undefined") {
        alert("JSZip library not loaded.");
        return;
    }

    try {
        const zip = new window.JSZip();
        const imgFolder = zip.folder("images");
        const total = state.puzzles.length;
        const totalPages = Math.ceil(total / state.puzzlesPerPage);

        setProgress(1, `Rendering 300 DPI high-resolution puzzle images: 0 / ${total}`);

        const canvasToBlob = (canvas) => new Promise(resolve => canvas.toBlob(resolve, "image/png"));

        const gridImages = [];
        const solutionImages = [];
        const calendarImages = [];
        const pageCalendarImages = [];
        const pageDateStrings = [];

        // Pre-render page calendar cards if 1 date per page is selected
        if (state.dateEnabled) {
            for (let p = 0; p < totalPages; p++) {
                const info = getPuzzleDateInfo(p, state.startDate, state.progression, state.dateFormat);
                pageDateStrings.push(info.dateStr);

                if (state.dateMode === "calendar_image") {
                    const calCnv = renderMiniMonthCalendarCanvas({
                        year: info.year,
                        month: info.month,
                        highlightDay: info.highlightDay,
                        theme: state.calTheme,
                        firstDaySunday: state.calSunday,
                        showCardBorder: state.calBorder,
                        showYear: state.calShowYear
                    });
                    pageCalendarImages.push(calCnv.toDataURL("image/png"));

                    if (state.dateScope === "per_page") {
                        const calBlob = await canvasToBlob(calCnv);
                        imgFolder.file(`page_${String(p + 1).padStart(3, "0")}_calendar.png`, calBlob);
                    }
                }
            }
        }

        for (let i = 0; i < total; i++) {
            const p = state.puzzles[i];
            const pPad = String(i + 1).padStart(3, "0");

            let dTxt = null;
            let calCnv = null;

            if (state.dateEnabled) {
                const dateIdx = (state.dateScope === "per_page")
                    ? Math.floor(i / state.puzzlesPerPage)
                    : i;
                const info = getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat);
                dTxt = info.dateStr;

                if (state.dateMode === "calendar_image" && state.dateScope === "per_game") {
                    calCnv = renderMiniMonthCalendarCanvas({
                        year: info.year,
                        month: info.month,
                        highlightDay: info.highlightDay,
                        theme: state.calTheme,
                        firstDaySunday: state.calSunday,
                        showCardBorder: state.calBorder,
                        showYear: state.calShowYear
                    });
                    const calBlob = await canvasToBlob(calCnv);
                    imgFolder.file(`puzzle_${pPad}_calendar.png`, calBlob);
                    calendarImages.push(calCnv.toDataURL("image/png"));
                }
            }

            let gridCnv = null;
            let solCnv = null;

            if (state.mode === "sudoku") {
                // Sudoku Grid Image (300 DPI)
                gridCnv = renderSudokuGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 12.0,
                    dpi: 300,
                    solution: false,
                    dateText: dTxt
                });
                const gridBlob = await canvasToBlob(gridCnv);
                imgFolder.file(`puzzle_${pPad}_grid.png`, gridBlob);
                gridImages.push(gridCnv.toDataURL("image/png"));

                // Sudoku Solution Image (300 DPI)
                solCnv = renderSudokuGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 12.0,
                    dpi: 300,
                    solution: true
                });
                const solBlob = await canvasToBlob(solCnv);
                imgFolder.file(`puzzle_${pPad}_solution.png`, solBlob);
                solutionImages.push(solCnv.toDataURL("image/png"));

            } else {
                // Word Search Grid Image (300 DPI)
                gridCnv = renderWordSearchGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 9.0,
                    dpi: 300,
                    solution: false,
                    dateText: dTxt,
                    showGridLines: true
                });
                const gridBlob = await canvasToBlob(gridCnv);
                imgFolder.file(`puzzle_${pPad}_grid.png`, gridBlob);
                gridImages.push(gridCnv.toDataURL("image/png"));

                // Word Search Solution Image (300 DPI)
                solCnv = renderWordSearchGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 9.0,
                    dpi: 300,
                    solution: true,
                    showGridLines: true
                });
                const solBlob = await canvasToBlob(solCnv);
                imgFolder.file(`puzzle_${pPad}_solution.png`, solBlob);
                solutionImages.push(solCnv.toDataURL("image/png"));
            }

            if (i % 5 === 0 || i === total - 1) {
                const pct = Math.round(((i + 1) / total) * 70);
                setProgress(pct, `Rendering 300 DPI high-res images: ${i + 1} of ${total}...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // Add Canva Excel with embedded pictures
        setProgress(75, "Adding Canva Bulk Create Excel workbook with embedded pictures...");
        const dateStrings = state.puzzles.map((_, i) => {
            const dateIdx = (state.dateScope === "per_page")
                ? Math.floor(i / state.puzzlesPerPage)
                : i;
            return state.dateEnabled ? getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat).dateStr : "";
        });

        if (state.mode === "sudoku") {
            const canvaBuffer = await buildCanvaSudokuExcel({
                puzzles: state.puzzles,
                puzzlesPerPage: state.puzzlesPerPage,
                includeSolutionInSameExcel: state.sameExcel,
                dateScope: state.dateScope,
                dateStrings: state.dateEnabled ? dateStrings : [],
                pageDateStrings: state.dateEnabled ? pageDateStrings : [],
                hasCalendarImages: state.dateEnabled && state.dateMode === "calendar_image",
                gridImages,
                solutionImages,
                calendarImages,
                pageCalendarImages
            });
            zip.file("sudoku_canva_bulk.xlsx", canvaBuffer);

            if (!state.sameExcel) {
                const solBuffer = buildSolutionsOnlyExcel({ puzzles: state.puzzles });
                zip.file("sudoku_solutions.xlsx", solBuffer);
            }
        } else {
            const canvaBuffer = await buildCanvaWordSearchExcel({
                puzzles: state.puzzles,
                includeSolutionInSameExcel: state.sameExcel,
                dateStrings: state.dateEnabled ? dateStrings : [],
                hasCalendarImages: state.dateEnabled && state.dateMode === "calendar_image",
                gridImages,
                solutionImages,
                calendarImages
            });
            zip.file("wordsearch_canva_bulk.xlsx", canvaBuffer);
        }

        // Generate final ZIP
        setProgress(85, "Compressing commercial ZIP bundle...");
        const zipContent = await zip.generateAsync({
            type: "blob",
            compression: "DEFLATE",
            compressionOptions: { level: 6 }
        }, (meta) => {
            setProgress(85 + Math.round(meta.percent * 0.14), `Compressing ZIP bundle: ${Math.round(meta.percent)}%`);
        });

        const zipFilename = state.mode === "sudoku" ? "sudoku_export_bundle.zip" : "wordsearch_export_bundle.zip";
        saveAs(zipContent, zipFilename);
        setProgress(null);
    } catch (err) {
        setProgress(null);
        alert(`ZIP generation failed: ${err.message}`);
    }
}

// Bootstrap
window.addEventListener("DOMContentLoaded", () => {
    if (state.theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        dom.themeToggleBtn.textContent = "☀️";
    }

    if (dom.wsWordListInput) {
        dom.wsWordListInput.value = state.wsWords.join("\n");
        dom.wsWordCountBadge.textContent = `${state.wsWords.length} words`;
    }

    if (dom.previewWrapper) {
        dom.previewWrapper.style.maxWidth = "480px";
    }

    populateDateFormats();
    populateCalendarThemes();
    setupEvents();
    refreshStudio();
});
