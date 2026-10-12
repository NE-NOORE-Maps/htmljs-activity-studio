import {setupWorkflow, syncWorkflowMode, updateWorkflow, activeBook} from "./workflow.js?v=pro10";
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
    generateSudokuPuzzle,
    generateSudokuBatch
} from "./sudoku_engine.js?v=pro10";

import {
    DATE_FORMAT_PRESETS,
    CALENDAR_THEMES,
    getPuzzleDateInfo,
    renderMiniMonthCalendarCanvas
} from "./calendar_builder.js?v=pro10";

import {
    generateWordSearchPuzzle,
    cleanWordForLanguage,
    LANGUAGE_CONFIGS,
    maxWordsForGrid,
    parseWordSearchText,
    parseWordSearchCsv
} from "./wordsearch_engine.js?v=pro10";

import {
    SUDOKU_PRESETS,
    WS_PRESETS,
    WORDSEARCH_HIGHLIGHT_COLORS,
    renderSudokuGridCanvas,
    renderSudokuBookPageCanvas,
    renderSudokuSolutionPageCanvas,
    renderWordSearchGridCanvas,
    renderWordSearchBookPageCanvas,
    renderWordSearchSolutionPageCanvas
} from "./canvas_renderer.js?v=pro10";

import {
    buildCanvaSudokuExcel,
    buildCanvaWordSearchExcel,
    buildPerGridSolutionWorkbooks,
    buildSolutionPageWorkbooks,
    generateCanvaInstructions
} from "./excel_exporter.js?v=pro10";

import {
    buildSudokuKdpPdf,
    buildWordSearchKdpPdf
} from "./pdf_exporter.js?v=pro10";
import {TRIM_DIMENSIONS_PT} from "./book_layout.js?v=pro10";

// Global Studio State
const state = {
    mode: "wordsearch", // "sudoku" | "wordsearch"
    bookTitles: {wordsearch: "The Word Search Collection", sudoku: "The Sudoku Collection"},
    titlePages: {wordsearch: true, sudoku: true},
    theme: (() => { try { return localStorage.getItem("studio_theme") || "light"; } catch { return "light"; } })(),
    viewMode: "book_page", // "book_page" | "single_puzzle" | "single_solution" | "solution_page"
    currentPage: 1,

    // Volume & Layout (Sudoku)
    puzzleCount: 50,
    startNumber: 1,
    puzzlesPerPage: 1,
    solutionsPerPage: 1,
    sdkSeparateSolutionsPerPage: 6,
    trimChoice: "8.5 x 11 inches (Letter)",
    sameExcel: true,
    sdkSolutionImageMode: "per_grid", // "per_grid" (one PNG per solution) | "per_page" (composed answer page)
    includeInstructions: true,
    canvaBatchSize: 100, // Pages per Canva bulk batch file (100 = Canva design limit)

    // Volume & Layout (Word Search)
    wsPuzzleCount: 1,
    wsStartNumber: 1,
    wsTargetCountEnforced: false,
    wsPuzzlesPerPage: 1,
    wsSolutionsPerPage: 1,
    wsSeparateSolutionsPerPage: 4,
    wsTrimChoice: "8.5 x 11 inches (Letter)",
    wsSameExcel: true,
    wsSolutionImageMode: "per_grid", // "per_grid" | "per_page"
    wsShowWordBank: true,
    wsWordCols: 3,
    wsCanvaBatchSize: 100, // Pages per Canva bulk batch file (100 = Canva design limit)

    // Date & Calendar
    dateEnabled: false,
    dateMode: "text", // "text" | "calendar_image"
    dateScope: "per_game", // "per_game" | "per_page"
    selectedYear: 2026,
    startDate: "2026-01-01",
    progression: "daily",
    dateFormat: "27-September",
    calTheme: "High Contrast B&W",
    calBorder: true,
    calSunday: true,
    calShowYear: true,

    // Visual Styling (Sudoku)
    activeStyle: { ...SUDOKU_PRESETS.adult_classic },

    // Visual Styling (Word Search)
    wsActivePreset: "adult_classic",
    wsActiveStyle: { ...WS_PRESETS.adult_classic },

    // Sudoku Generator Rules
    sudokuType: SudokuType.CLASSIC_9X9,
    difficulty: SudokuDifficulty.MEDIUM,
    seed: 42,
    symmetric: true,
    wordokuWord: "PUBLISHER",
    titleTemplate: "Sudoku #{num}",

    // Word Search Generator Rules & Content
    wsLanguage: "English",
    wsAccentMode: "Standard Book Mode",
    wsSource: "paste", // "paste" | "csv"
    wsCsvMode: "auto", // "auto" | "simple" | "themed"
    wsThemeInput: "Animals",
    wsSeed: 42,
    wsRawText: LANGUAGE_CONFIGS["English"].sample_words,
    wsCsvContent: null,
    wsCsvFileName: null,
    wsGridChoice: "auto",
    wsRows: 13,
    wsCols: 13,
    wsWordsPerPage: 12,
    wsDifficulty: "medium",
    wsTitleTemplate: "{title}",

    // Generated preview slice & build cache
    puzzles: [],
    totalPuzzlesCount: 1,
    builtPuzzlesCache: null,
    builtPuzzlesHash: null
};

// DOM Element References
const dom = {
    // Mode Buttons
    modeSudokuBtn: document.getElementById("mode-sudoku-btn"),
    modeWordsearchBtn: document.getElementById("mode-wordsearch-btn"),
    themeToggleBtn: document.getElementById("theme-toggle-btn"),
    newBookBtn: document.getElementById("new-book-btn"),
    toggleAllDetailsBtn: document.getElementById("toggle-all-details-btn"),

    // Sidebar Tabs
    sidebarTabBtns: document.querySelectorAll(".sidebar-tab-btn"),
    tabPanels: document.querySelectorAll(".tab-panel"),

    // Volume Sections
    sdkVolumeSection: document.getElementById("sdk-volume-section"),
    wsVolumeSection: document.getElementById("ws-volume-section"),

    // Sudoku Volume Controls
    countInput: document.getElementById("sdk-count-input"),
    countBadge: document.getElementById("sdk-count-badge"),
    startNumInput: document.getElementById("sdk-start-num"),
    countPresetBtns: document.querySelectorAll("#sdk-volume-section .preset-pill-btn[data-count]"),
    puzPerPageSel: document.getElementById("sdk-puz-per-page"),
    solPerPageSel: document.getElementById("sdk-sol-per-page"),
    sdkSolLinkedBadge: document.getElementById("sdk-sol-linked-badge"),
    trimChoiceSel: document.getElementById("sdk-trim-choice"),
    sameExcelTog: document.getElementById("sdk-same-excel-tog"),
    sdkSolLayoutBtns: document.querySelectorAll("#sdk-sol-layout-pills .preset-pill-btn"),
    sdkSolLayoutHelp: document.getElementById("sdk-sol-layout-help"),
    instructionsTog: document.getElementById("sdk-instructions-tog"),
    sdkCanvaBatchPreset: document.getElementById("sdk-canva-batch-preset"),
    sdkCanvaBatchBadge: document.getElementById("sdk-canva-batch-badge"),
    sdkCanvaBatchInput: document.getElementById("sdk-canva-batch-input"),
    sdkCanvaBatchHelp: document.getElementById("sdk-canva-batch-help"),

    // Word Search Volume Controls
    wsCountInput: document.getElementById("ws-count-input"),
    wsCountBadge: document.getElementById("ws-count-badge"),
    wsAutoCountFormula: document.getElementById("ws-auto-count-formula"),
    wsAutoCountSub: document.getElementById("ws-auto-count-sub"),
    wsStartNum: document.getElementById("ws-start-num"),
    wsCountPresetBtns: document.querySelectorAll("#ws-count-preset-pills .preset-pill-btn"),
    wsPuzPerPageSel: document.getElementById("ws-puz-per-page"),
    wsSolPerPageSel: document.getElementById("ws-sol-per-page"),
    wsSolLinkedBadge: document.getElementById("ws-sol-linked-badge"),
    wsTrimChoiceSel: document.getElementById("ws-trim-choice"),
    wsWordColsSel: document.getElementById("ws-word-cols-select"),
    wsShowBankTog: document.getElementById("ws-show-bank-tog"),
    wsSameExcelTog: document.getElementById("ws-same-excel-tog"),
    wsSolLayoutBtns: document.querySelectorAll("#ws-sol-layout-pills .preset-pill-btn"),
    wsSolLayoutHelp: document.getElementById("ws-sol-layout-help"),
    wsTargetCountTog: document.getElementById("ws-target-count-tog"),
    wsCanvaBatchPreset: document.getElementById("ws-canva-batch-preset"),
    wsCanvaBatchBadge: document.getElementById("ws-canva-batch-badge"),
    wsCanvaBatchInput: document.getElementById("ws-canva-batch-input"),
    wsCanvaBatchHelp: document.getElementById("ws-canva-batch-help"),

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

    // Sudoku Style Controls
    sdkStylingSection: document.getElementById("sdk-styling-section"),
    audiencePillBtns: document.querySelectorAll("#audience-preset-pills .preset-pill-btn"),
    cellStyleSel: document.getElementById("sdk-cell-style"),
    shadingModeSel: document.getElementById("sdk-shading-mode"),
    sdkClueFontSel: document.getElementById("sdk-clue-font-sel"),
    outerLwInput: document.getElementById("sdk-outer-lw"),
    blockLwInput: document.getElementById("sdk-block-lw"),
    innerLwInput: document.getElementById("sdk-inner-lw"),
    fontScaleInput: document.getElementById("sdk-font-scale"),
    solutionModeSel: document.getElementById("sdk-solution-mode"),

    // Word Search Style Controls
    wsStylingSection: document.getElementById("ws-styling-section"),
    wsAudiencePresetBtns: document.querySelectorAll("#ws-audience-preset-pills .preset-pill-btn"),
    wsThemeBadge: document.getElementById("ws-theme-badge"),
    wsCellStyleSel: document.getElementById("ws-cell-style-sel"),
    wsSolStyleSel: document.getElementById("ws-sol-style-sel"),
    wsLineColorSel: document.getElementById("ws-line-color-sel"),
    wsCustomLineHex: document.getElementById("ws-custom-line-hex"),
    wsLineWidthInput: document.getElementById("ws-line-width-input"),
    wsLineWVal: document.getElementById("ws-line-w-val"),
    wsLetterFontSel: document.getElementById("ws-letter-font-sel"),
    wsLetterColorSel: document.getElementById("ws-letter-color-sel"),
    wsCustomLetterHex: document.getElementById("ws-custom-letter-hex"),
    wsFontScaleSlider: document.getElementById("ws-font-scale-slider"),
    wsFontScaleVal: document.getElementById("ws-font-scale-val"),

    // Sudoku Rules Controls
    sdkRulesSection: document.getElementById("sdk-rules-section"),
    typeSel: document.getElementById("sdk-type-select"),
    wordokuGroup: document.getElementById("wordoku-group"),
    wordokuWordInput: document.getElementById("sdk-wordoku-word"),
    diffSel: document.getElementById("sdk-difficulty-select"),
    seedInput: document.getElementById("sdk-seed-input"),
    titleTplInput: document.getElementById("sdk-title-tpl"),
    symmetricTog: document.getElementById("sdk-symmetric-tog"),

    // Word Search Rules & Content Controls
    wsRulesSection: document.getElementById("ws-rules-section"),
    wsLangSelect: document.getElementById("ws-lang-select"),
    wsAccentModeSel: document.getElementById("ws-accent-mode-sel"),
    wsLangBadge: document.getElementById("ws-lang-badge"),
    wsResetSampleBtn: document.getElementById("ws-reset-sample-btn"),
    wsSourcePillBtns: document.querySelectorAll("#ws-source-pills .preset-pill-btn"),
    wsSrcPasteBtn: document.getElementById("ws-src-paste-btn"),
    wsSrcCsvBtn: document.getElementById("ws-src-csv-btn"),
    wsSrcCsvThemedBtn: document.getElementById("ws-src-csv-themed-btn"),
    wsThemeInput: document.getElementById("ws-theme-input"),
    wsSeedInput: document.getElementById("ws-seed-input"),
    wsShuffleSeedBtn: document.getElementById("ws-shuffle-seed-btn"),
    wsCsvDropzone: document.getElementById("ws-csv-dropzone"),
    wsCsvFileInput: document.getElementById("ws-csv-file-input"),
    wsCsvFileLabel: document.getElementById("ws-csv-file-label"),
    wsCsvModeHint: document.getElementById("ws-csv-mode-hint"),
    wsTextareaGroup: document.getElementById("ws-textarea-group"),
    wsWordListInput: document.getElementById("ws-word-list-input"),
    wsWordCountBadge: document.getElementById("ws-word-count-badge"),
    wsSummaryCard: document.getElementById("ws-summary-card"),
    wsSummaryText: document.getElementById("ws-summary-text"),
    wsSampleTag: document.getElementById("ws-sample-tag"),
    wsDownThemedCsv: document.getElementById("ws-down-themed-csv"),
    wsDownSimpleCsv: document.getElementById("ws-down-simple-csv"),
    wsAiExpander: document.getElementById("ws-ai-expander"),
    wsAiExpanderHdr: document.getElementById("ws-ai-expander-hdr"),
    wsAiExpanderBody: document.getElementById("ws-ai-expander-body"),
    wsAiExpIcon: document.getElementById("ws-ai-exp-icon"),
    wsPromptTypeSel: document.getElementById("ws-prompt-type-sel"),
    wsPromptCodeBox: document.getElementById("ws-prompt-code-box"),
    wsCopyPromptBtn: document.getElementById("ws-copy-prompt-btn"),
    wsGridDimSelect: document.getElementById("ws-grid-dim-select"),
    wsDifficultySelect: document.getElementById("ws-difficulty-select"),
    wsCustomDimsRow: document.getElementById("ws-custom-dims-row"),
    wsCustRows: document.getElementById("ws-cust-rows"),
    wsCustRowsVal: document.getElementById("ws-cust-rows-val"),
    wsCustCols: document.getElementById("ws-cust-cols"),
    wsCustColsVal: document.getElementById("ws-cust-cols-val"),
    wsWordsPerPageSlider: document.getElementById("ws-words-per-page-slider"),
    wsWordsPerPageVal: document.getElementById("ws-words-per-page-val"),
    wsCapacityCard: document.getElementById("ws-capacity-card"),
    wsCapacityDimText: document.getElementById("ws-capacity-dim-text"),
    wsCapacitySubText: document.getElementById("ws-capacity-sub-text"),

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

// Update Word Search Input Summary Card & Auto-Calculated Puzzle Count
function updateWsSummaryCard() {
    let groups = {};
    if (state.wsSource === "csv" && state.wsCsvContent) {
        groups = parseWordSearchCsv(state.wsCsvContent, state.wsThemeInput, state.wsLanguage, state.wsAccentMode, state.wsCsvMode);
    } else {
        const raw = state.wsRawText || "";
        groups = parseWordSearchText(raw, state.wsThemeInput, state.wsLanguage, state.wsAccentMode);
    }
    const themeCount = Object.keys(groups).length;
    const totalWords = Object.values(groups).reduce((acc, list) => acc + list.length, 0);
    const wpp = state.wsWordsPerPage || 12;

    let autoPuzzles = 0;
    for (const words of Object.values(groups)) {
        const cleaned = words.filter(w => w.length >= 3);
        if (cleaned.length > 0) {
            autoPuzzles += Math.max(1, Math.ceil(cleaned.length / wpp));
        }
    }

    if (dom.wsSummaryText) {
        dom.wsSummaryText.textContent = `${themeCount} theme${themeCount !== 1 ? "s" : ""} · ${totalWords} valid word${totalWords !== 1 ? "s" : ""} · ${autoPuzzles} auto puzzle${autoPuzzles !== 1 ? "s" : ""}`;
    }
    if (dom.wsWordCountBadge) {
        dom.wsWordCountBadge.textContent = `${totalWords} words`;
    }
    if (dom.wsSampleTag) {
        if (state.wsSource === "csv") {
            const modeLabel = state.wsCsvMode === "themed" ? "Themed CSV" : (state.wsCsvMode === "simple" ? "Normal CSV" : "CSV");
            dom.wsSampleTag.textContent = state.wsCsvFileName ? `${modeLabel}: ${state.wsCsvFileName}` : `${modeLabel} Imported`;
        } else {
            dom.wsSampleTag.textContent = "Word List Input";
        }
    }

    if (dom.wsAutoCountFormula) {
        if (state.wsSource === "csv" && (state.wsCsvMode === "themed" || themeCount > 1)) {
            dom.wsAutoCountFormula.textContent = `Auto-calculated: ${themeCount} CSV theme${themeCount !== 1 ? "s" : ""} (${totalWords} words @ ${wpp}/page) = ${autoPuzzles} puzzle${autoPuzzles !== 1 ? "s" : ""}`;
        } else {
            dom.wsAutoCountFormula.textContent = `Auto-calculated: ${totalWords} words ÷ ${wpp} words/page = ${autoPuzzles} puzzle${autoPuzzles !== 1 ? "s" : ""}`;
        }
    }
    if (dom.wsAutoCountSub) {
        dom.wsAutoCountSub.textContent = state.wsTargetCountEnforced
            ? `Manual count override is ON (${state.wsPuzzleCount} puzzles). Turn off override to use auto-calculated count (${autoPuzzles}).`
            : `Calculated automatically from your ${state.wsSource === "csv" ? "CSV records" : "word list"} and words per page.`;
    }
}

// Update Word Search Capacity Card
function updateWsCapacityCard() {
    let rows = state.wsRows || 12;
    let cols = state.wsCols || 10;
    if (state.wsGridChoice === "auto") {
        rows = state.wsDifficulty === "easy" ? 10 : (state.wsDifficulty === "medium" ? 13 : 16);
        cols = rows;
    } else if (state.wsGridChoice !== "custom" && state.wsGridChoice && state.wsGridChoice.includes("x")) {
        const parts = state.wsGridChoice.split("x").map(Number);
        rows = parts[0] || 12;
        cols = parts[1] || 10;
    }
    state.wsRows = rows;
    state.wsCols = cols;

    const cap = maxWordsForGrid(rows, cols);
    if (dom.wsCapacityDimText) {
        dom.wsCapacityDimText.textContent = `${rows} Rows × ${cols} Columns (${rows * cols} cells)`;
    }
    if (dom.wsCapacitySubText) {
        dom.wsCapacitySubText.textContent = `Suggested capacity: ~${cap} words per puzzle · ${rows !== cols ? "Rectangular" : "Square"} layout`;
    }
    if (dom.wsWordsPerPageSlider) {
        dom.wsWordsPerPageSlider.max = Math.max(30, cap + 8);
    }
}

// Update Word Search AI Prompt Box
function updateWsPromptBox() {
    if (!dom.wsPromptCodeBox || !dom.wsPromptTypeSel) return;
    const pType = dom.wsPromptTypeSel.value || "Themed CSV";
    const langCfg = LANGUAGE_CONFIGS[state.wsLanguage] || LANGUAGE_CONFIGS["English"];
    const promptText = langCfg.prompts ? (langCfg.prompts[pType] || "") : "";
    dom.wsPromptCodeBox.textContent = promptText;
}

// Update Active Language configuration
function updateWsLanguage(langKey) {
    state.wsLanguage = langKey;
    const cfg = LANGUAGE_CONFIGS[langKey] || LANGUAGE_CONFIGS["English"];
    if (dom.wsLangBadge) {
        dom.wsLangBadge.innerHTML = `${cfg.flag} <b>${cfg.label}</b>: ${cfg.badge_info}`;
    }
    if (dom.wsDownThemedCsv) {
        dom.wsDownThemedCsv.textContent = `📥 Themed CSV (${cfg.flag})`;
    }
    if (dom.wsDownSimpleCsv) {
        dom.wsDownSimpleCsv.textContent = `📥 Normal CSV (${cfg.flag})`;
    }
    updateWsPromptBox();
}

// True when the word list or theme no longer matches the language sample, i.e.
// the user would lose their own edits if we overwrite them.
function wsEditorHasCustomContent(cfg) {
    const c = cfg || LANGUAGE_CONFIGS[state.wsLanguage] || LANGUAGE_CONFIGS["English"];
    const customWords = state.wsSource !== "csv"
        && (state.wsRawText || "").trim() !== (String(c.sample_words || "").trim());
    const customTheme = (state.wsThemeInput || "").trim() !== (c.default_theme || "").trim();
    return customWords || customTheme;
}

// Switch between Studio Modes (Sudoku vs Word Search)
function setStudioMode(mode) {
    state.mode = mode;
    if (mode === "sudoku") {
        dom.modeSudokuBtn.classList.add("active");
        dom.modeWordsearchBtn.classList.remove("active");
        if (dom.sdkVolumeSection) dom.sdkVolumeSection.style.display = "block";
        if (dom.wsVolumeSection) dom.wsVolumeSection.style.display = "none";
        if (dom.sdkStylingSection) dom.sdkStylingSection.style.display = "block";
        if (dom.wsStylingSection) dom.wsStylingSection.style.display = "none";
        if (dom.sdkRulesSection) dom.sdkRulesSection.style.display = "block";
        if (dom.wsRulesSection) dom.wsRulesSection.style.display = "none";
    } else {
        dom.modeWordsearchBtn.classList.add("active");
        dom.modeSudokuBtn.classList.remove("active");
        if (dom.sdkVolumeSection) dom.sdkVolumeSection.style.display = "none";
        if (dom.wsVolumeSection) dom.wsVolumeSection.style.display = "block";
        if (dom.sdkStylingSection) dom.sdkStylingSection.style.display = "none";
        if (dom.wsStylingSection) dom.wsStylingSection.style.display = "block";
        if (dom.sdkRulesSection) dom.sdkRulesSection.style.display = "none";
        if (dom.wsRulesSection) dom.wsRulesSection.style.display = "block";
    }
    state.currentPage = 1;
    syncWorkflowMode(state);
    refreshStudio();
}

// Sudoku Config Hash for build caching
function getSudokuConfigHash() {
    return [
        "sudoku",
        state.puzzleCount,
        state.startNumber,
        state.seed,
        state.sudokuType,
        state.difficulty,
        state.symmetric,
        state.wordokuWord,
        state.titleTemplate
    ].join("|");
}

// Word Search Config Hash for build caching
function getWsConfigHash() {
    return [
        "ws",
        state.wsPuzzleCount,
        state.wsStartNumber,
        state.wsSeed,
        state.wsLanguage,
        state.wsAccentMode,
        state.wsDifficulty,
        state.wsGridChoice,
        state.wsRows,
        state.wsCols,
        state.wsWordsPerPage,
        state.wsTitleTemplate,
        state.wsThemeInput,
        state.wsTargetCountEnforced,
        state.wsSource,
        state.wsCsvMode,
        state.wsRawText,
        state.wsCsvFileName,
        state.wsCsvContent || ""
    ].join("|");
}

// Extract base chunks for Word Search (automatically dividing each theme/word pool by wordsPerPage)
function getWsBaseChunks() {
    let groups = {};
    if (state.wsSource === "csv" && state.wsCsvContent) {
        groups = parseWordSearchCsv(state.wsCsvContent, state.wsThemeInput, state.wsLanguage, state.wsAccentMode, state.wsCsvMode);
    } else {
        const raw = state.wsSource === "csv" ? (state.wsCsvContent || "") : (state.wsRawText || "");
        groups = parseWordSearchText(raw, state.wsThemeInput, state.wsLanguage, state.wsAccentMode);
    }

    const baseChunks = [];
    const wpp = state.wsWordsPerPage || 12;
    for (const [theme, words] of Object.entries(groups)) {
        const cleaned = words.filter(w => w.length >= 3);
        if (cleaned.length === 0) continue;

        if (cleaned.length <= wpp) {
            baseChunks.push({ theme, words: cleaned, allWords: cleaned, chunkIndex: 0 });
        } else {
            const totalChunks = Math.ceil(cleaned.length / wpp);
            for (let i = 0; i < totalChunks; i++) {
                baseChunks.push({
                    theme,
                    words: cleaned.slice(i * wpp, (i + 1) * wpp),
                    allWords: cleaned,
                    chunkIndex: i
                });
            }
        }
    }

    state.wordPoolCount = Object.values(groups).reduce((n,words)=>n+words.filter(w=>w.length>=3).length,0);
    return baseChunks;
}

// Select words for a specific Word Search puzzle instance, rotating words across puzzles
// so words beyond words_per_page are utilized rather than dropped.
function getWordsForWsPuzzle(item, puzzleIndex, targetWordCount) {
    const allWords = item.allWords || item.words || [];
    const baseWords = item.words || [];
    if (baseWords && baseWords.length > 0 && puzzleIndex < (state.autoChunkCount || Infinity)) {
        return baseWords;
    }
    if (!allWords || allWords.length <= targetWordCount) {
        return baseWords;
    }
    const step = Math.max(1, allWords.length - targetWordCount);
    const startOffset = (puzzleIndex * step) % allWords.length;
    const selected = [];
    for (let k = 0; k < targetWordCount; k++) {
        selected.push(allWords[(startOffset + k) % allWords.length]);
    }
    return selected;
}

// Determine title for a Word Search puzzle page:
// If it's a themed word search, the title of the page is the title of the theme.
function getWsPuzzleTitle(item, pNum) {
    const rawTheme = (item && item.theme) ? String(item.theme).trim() : "";
    const isThemed = rawTheme.length > 0 && rawTheme.toLowerCase() !== "word search" && rawTheme.toLowerCase() !== "my theme";
    if (isThemed) {
        return rawTheme;
    }
    if (state.wsTitleTemplate && state.wsTitleTemplate.includes("{num}")) {
        return state.wsTitleTemplate.replace("{num}", String(pNum)).replace("{title}", rawTheme || "Word Search");
    }
    return rawTheme || `Word Search #${pNum}`;
}

// Determine total puzzle count needed for Word Search
function getWsTotalNeeded(baseChunks) {
    if (!baseChunks || baseChunks.length === 0) return 0;
    state.autoChunkCount = baseChunks.length;
    if (state.wsTargetCountEnforced) {
        return Math.max(1, state.wsPuzzleCount || 1);
    }
    // Automatically calculate puzzle count from baseChunks!
    const autoCount = Math.max(1, baseChunks.length);
    state.wsPuzzleCount = autoCount;
    if (dom.wsCountInput && document.activeElement !== dom.wsCountInput) {
        dom.wsCountInput.value = autoCount;
    }
    if (dom.wsCountBadge) {
        dom.wsCountBadge.textContent = autoCount;
    }
    return autoCount;
}

// Determine grid dimensions & fill alphabet for Word Search
function getWsActiveDimensions() {
    let rows = 12, cols = 10;
    if (state.wsGridChoice === "auto") {
        rows = state.wsDifficulty === "easy" ? 10 : (state.wsDifficulty === "medium" ? 13 : 16);
        cols = rows;
    } else if (state.wsGridChoice === "custom") {
        rows = state.wsRows || 12;
        cols = state.wsCols || 10;
    } else if (state.wsGridChoice && state.wsGridChoice.includes("x")) {
        const parts = state.wsGridChoice.split("x").map(Number);
        rows = parts[0] || 12;
        cols = parts[1] || 10;
    }

    const langCfg = LANGUAGE_CONFIGS[state.wsLanguage] || LANGUAGE_CONFIGS["English"];
    let fillAlpha = langCfg.fill_alphabet || "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    if (state.wsAccentMode === "Strip All Accents (A-Z)") {
        fillAlpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }

    return { rows, cols, fillAlpha };
}

// Generate Puzzles Batch (FAST: Generates ONLY the 1 active preview page)
function updatePuzzlesBatch() {
    // Invalidate build cache if config changed
    const currHash = state.mode === "sudoku" ? getSudokuConfigHash() : getWsConfigHash();
    if (state.builtPuzzlesHash && state.builtPuzzlesHash !== currHash) {
        state.builtPuzzlesCache = null;
        state.builtPuzzlesHash = null;
    }

    if (state.mode === "sudoku") {
        state.totalPuzzlesCount = Math.max(1, state.puzzleCount);
        const ppp = state.puzzlesPerPage || 1;
        const spp = state.solutionsPerPage || 6;

        let totalPages = 1;
        if (state.viewMode === "book_page") {
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / ppp));
        } else if (state.viewMode === "solution_page") {
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / spp));
        } else {
            totalPages = state.totalPuzzlesCount;
        }

        if (state.currentPage > totalPages) state.currentPage = totalPages;
        if (state.currentPage < 1) state.currentPage = 1;

        let startIdx = 0;
        let count = 1;
        if (state.viewMode === "book_page") {
            startIdx = (state.currentPage - 1) * ppp;
            count = Math.min(ppp, state.totalPuzzlesCount - startIdx);
        } else if (state.viewMode === "solution_page") {
            startIdx = (state.currentPage - 1) * spp;
            count = Math.min(spp, state.totalPuzzlesCount - startIdx);
        } else {
            startIdx = state.currentPage - 1;
            count = 1;
        }

        const previewPuzzles = [];
        for (let i = 0; i < count; i++) {
            const pIdx = startIdx + i;
            const pSeed = (state.seed + pIdx * 17) % 2147483647;
            const p = generateSudokuPuzzle({
                puzzleId: state.startNumber + pIdx,
                puzzleType: state.sudokuType,
                difficulty: state.difficulty,
                seed: pSeed,
                symmetric: state.symmetric,
                wordokuWord: state.wordokuWord,
                titleTemplate: state.titleTemplate
            });
            previewPuzzles.push(p);
        }
        state.puzzles = previewPuzzles;
    } else {
        const baseChunks = getWsBaseChunks();
        state.totalPuzzlesCount = getWsTotalNeeded(baseChunks);
        if (!state.totalPuzzlesCount) { state.puzzles = []; return; }
        const ppp = state.wsPuzzlesPerPage || 1;
        const spp = state.wsSolutionsPerPage || 4;

        let totalPages = 1;
        if (state.viewMode === "book_page") {
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / ppp));
        } else if (state.viewMode === "solution_page") {
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / spp));
        } else {
            totalPages = state.totalPuzzlesCount;
        }

        if (state.currentPage > totalPages) state.currentPage = totalPages;
        if (state.currentPage < 1) state.currentPage = 1;

        let startIdx = 0;
        let count = 1;
        if (state.viewMode === "book_page") {
            startIdx = (state.currentPage - 1) * ppp;
            count = Math.min(ppp, state.totalPuzzlesCount - startIdx);
        } else if (state.viewMode === "solution_page") {
            startIdx = (state.currentPage - 1) * spp;
            count = Math.min(spp, state.totalPuzzlesCount - startIdx);
        } else {
            startIdx = state.currentPage - 1;
            count = 1;
        }

        const { rows, cols, fillAlpha } = getWsActiveDimensions();
        const generated = [];

        for (let i = 0; i < count; i++) {
            const globalIdx = startIdx + i;
            const pNum = (state.wsStartNumber || 1) + globalIdx;
            const item = baseChunks[globalIdx % baseChunks.length];
            const pTitle = getWsPuzzleTitle(item, pNum);
            const puzzleWords = getWordsForWsPuzzle(item, globalIdx, state.wsWordsPerPage || 12);

            const puzzle = generateWordSearchPuzzle({
                words: puzzleWords,
                width: cols,
                height: rows,
                difficulty: state.wsDifficulty,
                language: state.wsLanguage,
                title: pTitle,
                fillAlphabet: fillAlpha,
                seed: (state.wsSeed || 42) + globalIdx * 19
            });

            puzzle.puzzleId = pNum;
            puzzle.theme = pTitle;
            puzzle.title = pTitle;
            puzzle.difficultyLabel = state.wsDifficulty.toUpperCase();
            generated.push(puzzle);
        }

        state.puzzles = generated;
    }
}

// Update Top Metrics Strip
function updateMetrics() {
    dom.metricPuzzles.textContent = state.totalPuzzlesCount;

    if (state.mode === "sudoku") {
        const cfg = TYPE_CONFIGS[state.sudokuType];
        dom.metricType.textContent = cfg.label;
        dom.metricDiff.textContent = `${DIFFICULTY_LABELS[state.difficulty]} ${DIFFICULTY_STARS[state.difficulty]}`;
        dom.metricGrid.textContent = `${cfg.size} × ${cfg.size}`;
        dom.metricClues.textContent = state.puzzles[0] ? state.puzzles[0].cluesCount : "-";
        dom.metricGamesPage.textContent = state.puzzlesPerPage;

        const totalPages = Math.ceil(state.totalPuzzlesCount / (state.puzzlesPerPage || 1));
        const effectiveBatch = (state.canvaBatchSize && state.canvaBatchSize > 0) ? state.canvaBatchSize : totalPages;
        const batches = Math.ceil(totalPages / effectiveBatch);
        const batchInfo = (batches > 1) ? ` · Canva: ${batches} batches (${state.canvaBatchSize}p/file)` : "";

        dom.exportSummary.textContent = `${state.totalPuzzlesCount} Puzzles · ${state.trimChoice} · ${state.puzzlesPerPage} game(s)/page${batchInfo} · 300 DPI Commercial Print Ready`;
    } else {
        const langShort = (state.wsLanguage || "English").split(" ")[0];
        const ppp = state.wsPuzzlesPerPage || 1;
        dom.metricType.textContent = `Word Search (${langShort})`;
        dom.metricDiff.textContent = state.wsDifficulty.toUpperCase();
        dom.metricGrid.textContent = state.puzzles[0] ? `${state.puzzles[0].height} × ${state.puzzles[0].width}` : `${state.wsRows} × ${state.wsCols}`;
        dom.metricClues.textContent = state.puzzles[0] && state.puzzles[0].placedWords ? state.puzzles[0].placedWords.length : "-";
        dom.metricGamesPage.textContent = `${ppp} (${state.wsWordCols} cols)`;

        const totalPages = Math.ceil(state.totalPuzzlesCount / ppp);
        const effectiveBatch = (state.wsCanvaBatchSize && state.wsCanvaBatchSize > 0) ? state.wsCanvaBatchSize : totalPages;
        const batches = Math.ceil(totalPages / effectiveBatch);
        const batchInfo = (batches > 1) ? ` · Canva: ${batches} batches (${state.wsCanvaBatchSize}p/file)` : "";

        dom.exportSummary.textContent = `${state.totalPuzzlesCount} Word Searches · ${state.wsTrimChoice} · ${ppp} game(s)/page${batchInfo} · 300 DPI Commercial Print Ready`;
    }

    updateCanvaBatchBadges();
}

function updateCanvaBatchBadges() {
    if (dom.sdkCanvaBatchBadge) {
        const totalPuzzles = state.totalPuzzlesCount;
        const totalPages = Math.ceil(totalPuzzles / (state.puzzlesPerPage || 1));
        if (!state.canvaBatchSize || state.canvaBatchSize <= 0) {
            dom.sdkCanvaBatchBadge.textContent = `No split (${totalPages} pages)`;
        } else {
            const batches = Math.ceil(totalPages / state.canvaBatchSize);
            dom.sdkCanvaBatchBadge.textContent = batches > 1
                ? `${state.canvaBatchSize} / batch (${batches} puzzle files)`
                : `${state.canvaBatchSize} / batch (1 puzzle file)`;
        }
    }

    if (dom.wsCanvaBatchBadge) {
        const totalPuzzles = state.mode === "wordsearch" ? state.totalPuzzlesCount : (state.wsPuzzleCount || 1);
        const totalPages = Math.ceil(totalPuzzles / (state.wsPuzzlesPerPage || 1));
        if (!state.wsCanvaBatchSize || state.wsCanvaBatchSize <= 0) {
            dom.wsCanvaBatchBadge.textContent = `No split (${totalPages} pages)`;
        } else {
            const batches = Math.ceil(totalPages / state.wsCanvaBatchSize);
            dom.wsCanvaBatchBadge.textContent = batches > 1
                ? `${state.wsCanvaBatchSize} / batch (${batches} puzzle files)`
                : `${state.wsCanvaBatchSize} / batch (1 puzzle file)`;
        }
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
    state.previewError = "";
    try { renderStageContent(); } catch (error) {
        state.previewError = error.message;
        dom.mainCanvas.width = dom.mainCanvas.width;
    }
    updateWorkflow(state);
}

function renderStageContent() {
    if (!state.puzzles || state.puzzles.length === 0) {
        dom.mainCanvas.width = dom.mainCanvas.width;
        dom.stagePageSel.replaceChildren();
        dom.btnPagePrev.disabled = dom.btnPageNext.disabled = true;
        return;
    }

    // Calculate pagination based on view mode & studio mode
    let totalPages = 1;
    if (state.mode === "sudoku") {
        if (state.viewMode === "book_page") {
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / state.puzzlesPerPage));
        } else if (state.viewMode === "solution_page") {
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / state.solutionsPerPage));
        } else {
            totalPages = state.totalPuzzlesCount;
        }
    } else {
        // Word Search mode
        if (state.viewMode === "book_page") {
            const ppp = state.wsPuzzlesPerPage || 1;
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / ppp));
        } else if (state.viewMode === "solution_page") {
            const spp = state.wsSolutionsPerPage || 4;
            totalPages = Math.max(1, Math.ceil(state.totalPuzzlesCount / spp));
        } else {
            totalPages = state.totalPuzzlesCount;
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
            const pId = state.mode === "sudoku" ? (state.startNumber + p - 1) : (state.wsStartNumber + p - 1);
            opt.textContent = `Puzzle #${pId}`;
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
        const endIdx = Math.min(state.totalPuzzlesCount, startIdx + state.puzzlesPerPage);
        const pSlice = state.puzzles;

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
                for (let i = startIdx; i < endIdx; i++) {
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
            trimChoice: state.trimChoice,
            bookTotalPages: activeBook(state).totalPages,
            bookPageNum: state.currentPage + Number(activeBook(state).includeTitlePage),
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
        const sSlice = state.puzzles;

        const solCnv = renderSudokuSolutionPageCanvas({
            trimChoice: state.trimChoice,
            bookTotalPages: activeBook(state).totalPages,
            bookPageNum: state.currentPage + Number(activeBook(state).includeTitlePage) + activeBook(state).puzzlePages + 1,
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
        const p = state.puzzles[0];
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
        const p = state.puzzles[0];

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
    const p = state.puzzles[0];
    if (!p) return;
    const ppp = state.wsPuzzlesPerPage || 1;

    if (state.viewMode === "book_page") {
        const startIdx = (state.currentPage - 1) * ppp;
        const endIdx = Math.min(state.totalPuzzlesCount, startIdx + ppp);
        const pSlice = state.puzzles;

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
                for (let i = startIdx; i < endIdx; i++) {
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

        const pageCnv = renderWordSearchBookPageCanvas({
            trimChoice: state.wsTrimChoice,
            bookTotalPages: activeBook(state).totalPages,
            bookPageNum: state.currentPage + Number(activeBook(state).includeTitlePage),
            puzzle: p,
            puzzlesSlice: pSlice,
            puzzlesPerPage: ppp,
            style: state.wsActiveStyle,
            pageNum: state.currentPage,
            totalPages,
            dpi: 150,
            dateScope: state.dateScope,
            dateText: dateStrings ? dateStrings[0] : pageDateText,
            calendarCanvas: calendarCanvases ? calendarCanvases[0] : pageCalendarCanvas,
            dateStrings,
            calendarCanvases,
            pageDateText,
            pageCalendarCanvas,
            wordColumns: state.wsWordCols,
            showWordBank: state.wsShowWordBank,
            wordBankTitle: LANGUAGE_CONFIGS[state.wsLanguage]?.word_bank_title
        });

        dom.mainCanvas.width = pageCnv.width;
        dom.mainCanvas.height = pageCnv.height;
        ctx.drawImage(pageCnv, 0, 0);

    } else if (state.viewMode === "solution_page") {
        const solPerPage = state.wsSolutionsPerPage || 4;
        const sSlice = state.puzzles;

        const solCnv = renderWordSearchSolutionPageCanvas({
            trimChoice: state.wsTrimChoice,
            bookTotalPages: activeBook(state).totalPages,
            bookPageNum: state.currentPage + Number(activeBook(state).includeTitlePage) + activeBook(state).puzzlePages + 1,
            puzzlesSlice: sSlice,
            style: state.wsActiveStyle,
            solutionsPerPage: solPerPage,
            pageNum: state.currentPage,
            totalPages: Math.ceil(state.totalPuzzlesCount / solPerPage),
            dpi: 150
        });

        dom.mainCanvas.width = solCnv.width;
        dom.mainCanvas.height = solCnv.height;
        ctx.drawImage(solCnv, 0, 0);

    } else if (state.viewMode === "single_puzzle") {
        let dTxt = null;
        if (state.dateEnabled) {
            const dateIdx = (state.dateScope === "per_page") ? Math.floor(pIdx / ppp) : pIdx;
            const info = getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat);
            dTxt = info.dateStr;
        }

        const pCnv = renderWordSearchGridCanvas({
            puzzle: p,
            style: state.wsActiveStyle,
            cellMm: 10.0,
            dpi: 150,
            solution: false,
            includeHeader: true,
            dateText: dTxt,
            showGridLines: true
        });

        dom.mainCanvas.width = pCnv.width;
        dom.mainCanvas.height = pCnv.height;
        ctx.drawImage(pCnv, 0, 0);

    } else if (state.viewMode === "single_solution") {
        let dTxt = null;
        if (state.dateEnabled) {
            const dateIdx = (state.dateScope === "per_page") ? Math.floor(pIdx / ppp) : pIdx;
            const info = getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat);
            dTxt = info.dateStr;
        }

        const sCnv = renderWordSearchGridCanvas({
            puzzle: p,
            style: state.wsActiveStyle,
            cellMm: 10.0,
            dpi: 150,
            solution: true,
            includeHeader: true,
            dateText: dTxt,
            showGridLines: true
        });

        dom.mainCanvas.width = sCnv.width;
        dom.mainCanvas.height = sCnv.height;
        ctx.drawImage(sCnv, 0, 0);
    }
}

// Keep Solutions per page linked to Games per page when solutions are included
// with the puzzle (Same Excel = ON), or unlocked up to 9/page when separate.
function syncSolutionPerPageLock() {
    // Word Search
    if (state.wsSameExcel && state.wsSolutionImageMode === "per_grid") {
        state.wsSolutionsPerPage = state.wsPuzzlesPerPage || 1;
        if (dom.wsSolPerPageSel) {
            dom.wsSolPerPageSel.value = String(state.wsSolutionsPerPage);
            dom.wsSolPerPageSel.disabled = true;
        }
        if (dom.wsSolLinkedBadge) {
            const g = state.wsPuzzlesPerPage || 1;
            dom.wsSolLinkedBadge.textContent = `Linked to ${g} game${g > 1 ? "s" : ""}/page`;
        }
    } else {
        state.wsSolutionsPerPage = state.wsSeparateSolutionsPerPage || 4;
        if (dom.wsSolPerPageSel) {
            dom.wsSolPerPageSel.disabled = false;
            dom.wsSolPerPageSel.value = String(state.wsSolutionsPerPage);
        }
        if (dom.wsSolLinkedBadge) {
            dom.wsSolLinkedBadge.textContent = "Separate · Max 9 / page";
        }
    }

    // Sudoku
    if (state.sameExcel && state.sdkSolutionImageMode === "per_grid") {
        state.solutionsPerPage = state.puzzlesPerPage || 1;
        if (dom.solPerPageSel) {
            dom.solPerPageSel.value = String(state.solutionsPerPage);
            dom.solPerPageSel.disabled = true;
        }
        if (dom.sdkSolLinkedBadge) {
            const g = state.puzzlesPerPage || 1;
            dom.sdkSolLinkedBadge.textContent = `Linked to ${g} game${g > 1 ? "s" : ""}/page`;
        }
    } else {
        state.solutionsPerPage = state.sdkSeparateSolutionsPerPage || 6;
        if (dom.solPerPageSel) {
            dom.solPerPageSel.disabled = false;
            dom.solPerPageSel.value = String(state.solutionsPerPage);
        }
        if (dom.sdkSolLinkedBadge) {
            dom.sdkSolLinkedBadge.textContent = "Separate · Max 9 / page";
        }
    }
}

// Master Refresh
function refreshStudio() {
    try {
        syncSolutionPerPageLock();
        updateWsSummaryCard();
        updatePuzzlesBatch();
        updateMetrics();
        updateMiniCalendarThumbnail();
        renderStage();
    } catch(error) {
        state.previewError = error.message;
        dom.mainCanvas.width = dom.mainCanvas.width;
        updateWorkflow(state);
    }
}

// Wire the "Solutions layout" pill group (one image per grid vs one composed
// image per answer page) and keep the Same-Excel toggle + help text in sync.
function setupSolutionLayoutPills(btns, helpEl, sameExcelTog, prefix) {
    if (!btns || !btns.length) return;
    const modeKey = prefix === "ws" ? "wsSolutionImageMode" : "sdkSolutionImageMode";
    const helpText = {
        per_grid: "One image per solution grid — when included with the puzzle, solutions are paired with each game page; when separate, up to 9 solution grids per Excel row.",
        per_page: `Grids are composed onto one full answer page image (up to 9 solutions per page). Exported as a separate solution workbook.`
    };
    const sync = () => {
        const perPage = state[modeKey] === "per_page";
        if (sameExcelTog) {
            sameExcelTog.disabled = perPage;
            if (perPage) sameExcelTog.checked = false;
        }
        if (helpEl) helpEl.textContent = helpText[state[modeKey]];
        btns.forEach(b => {
            const on = b.dataset.solLayout === state[modeKey];
            b.classList.toggle("active", on);
            b.setAttribute("aria-checked", String(on));
        });
        syncSolutionPerPageLock();
    };
    if (!btns._solLayoutWired) {
        btns._solLayoutWired = true;
        btns.forEach(btn => {
            btn.addEventListener("click", () => {
                state[modeKey] = btn.dataset.solLayout === "per_page" ? "per_page" : "per_grid";
                if (state[modeKey] === "per_page") {
                    if (prefix === "ws") state.wsSameExcel = false;
                    if (prefix === "sdk") state.sameExcel = false;
                }
                sync();
                refreshStudio();
            });
        });
    }
    sync();
}

// Set Up Event Handlers
function setupEvents() {
    // Mode Switcher (Sudoku vs Word Search)
    dom.modeSudokuBtn.addEventListener("click", () => setStudioMode("sudoku"));
    dom.modeWordsearchBtn.addEventListener("click", () => setStudioMode("wordsearch"));

    // Collapse / Expand All Sections button + sync with individual <details class="advanced">
    const syncToggleAllBtnLabel = () => {
        if (!dom.toggleAllDetailsBtn) return;
        const detailsList = Array.from(document.querySelectorAll("details.advanced"));
        const anyClosed = detailsList.some(d => !d.open);
        dom.toggleAllDetailsBtn.textContent = anyClosed ? "📂 Expand All Sections" : "📂 Collapse All Sections";
        dom.toggleAllDetailsBtn.setAttribute("aria-expanded", String(!anyClosed));
    };

    if (dom.toggleAllDetailsBtn) {
        dom.toggleAllDetailsBtn.addEventListener("click", () => {
            const detailsList = Array.from(document.querySelectorAll("details.advanced"));
            const anyClosed = detailsList.some(d => !d.open);
            const targetOpen = anyClosed;
            detailsList.forEach(d => { d.open = targetOpen; });
            if (dom.wsAiExpanderBody && dom.wsAiExpanderHdr && dom.wsAiExpIcon) {
                dom.wsAiExpanderBody.classList.toggle("open", targetOpen);
                dom.wsAiExpanderHdr.setAttribute("aria-expanded", String(targetOpen));
                dom.wsAiExpanderBody.style.display = targetOpen ? "flex" : "none";
                dom.wsAiExpIcon.textContent = targetOpen ? "▲" : "▼";
            }
            syncToggleAllBtnLabel();
        });
    }

    document.querySelectorAll("details.advanced").forEach(d => {
        d.addEventListener("toggle", syncToggleAllBtnLabel);
    });

    // Solution image granularity (one PNG per grid vs one composed page image)
    setupSolutionLayoutPills(dom.sdkSolLayoutBtns, dom.sdkSolLayoutHelp, dom.sameExcelTog, "sdk");
    setupSolutionLayoutPills(dom.wsSolLayoutBtns, dom.wsSolLayoutHelp, dom.wsSameExcelTog, "ws");

    // Theme Switcher (Dark / Light)
    dom.themeToggleBtn.addEventListener("click", () => {
        const newTheme = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
        document.documentElement.setAttribute("data-theme", newTheme);
        try { localStorage.setItem("studio_theme", newTheme); } catch { /* Theme still works without storage. */ }
        dom.themeToggleBtn.textContent = newTheme === "dark" ? "☀️" : "🌙";
        dom.themeToggleBtn.setAttribute("aria-pressed", String(newTheme === "dark"));
        dom.themeToggleBtn.setAttribute("aria-label", newTheme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    });

    // New Random Book Seed
    dom.newBookBtn.addEventListener("click", () => {
        const randSeed = Math.floor(Math.random() * 900000) + 10000;
        if (state.mode === "sudoku") {
            state.seed = randSeed;
            dom.seedInput.value = state.seed;
        } else {
            state.wsSeed = randSeed;
            if (dom.wsSeedInput) dom.wsSeedInput.value = state.wsSeed;
        }
        state.currentPage = 1;
        refreshStudio();
    });

    // View Mode Selector
    dom.viewBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.viewBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            state.viewMode = btn.dataset.view;
            state.currentPage = 1;
            updatePuzzlesBatch();
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
            updatePuzzlesBatch();
            renderStage();
        }
    });

    dom.btnPageNext.addEventListener("click", () => {
        state.currentPage++;
        updatePuzzlesBatch();
        renderStage();
    });

    dom.stagePageSel.addEventListener("change", (e) => {
        state.currentPage = parseInt(e.target.value, 10);
        updatePuzzlesBatch();
        renderStage();
    });

    // ==========================================
    // Sudoku Volume Controls
    // ==========================================
    dom.countInput.addEventListener("input", (e) => {
        state.puzzleCount = Math.max(1, Math.min(5000, parseInt(e.target.value, 10) || 1));
        dom.countBadge.textContent = state.puzzleCount;
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.countPresetBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            dom.countPresetBtns.forEach(b => b.classList.remove("active"));
            btn.classList.add("active");
            const cnt = parseInt(btn.dataset.count, 10);
            state.puzzleCount = cnt;
            dom.countInput.value = cnt;
            dom.countBadge.textContent = cnt;
            if (state.mode === "sudoku") refreshStudio();
        });
    });

    dom.startNumInput.addEventListener("input", (e) => {
        state.startNumber = Math.max(1, parseInt(e.target.value, 10) || 1);
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.puzPerPageSel.addEventListener("change", (e) => {
        state.puzzlesPerPage = parseInt(e.target.value, 10);
        syncSolutionPerPageLock("sdk");
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.solPerPageSel.addEventListener("change", (e) => {
        state.solutionsPerPage = parseInt(e.target.value, 10);
        if (!state.sameExcel) {
            state.sdkSeparateSolutionsPerPage = state.solutionsPerPage;
        }
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.trimChoiceSel.addEventListener("change", (e) => {
        state.trimChoice = e.target.value;
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.sameExcelTog.addEventListener("change", (e) => {
        state.sameExcel = e.target.checked;
        syncSolutionPerPageLock("sdk");
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.instructionsTog.addEventListener("change", (e) => {
        state.includeInstructions = e.target.checked;
        if (state.mode === "sudoku") renderStage();
    });

    if (dom.sdkCanvaBatchPreset) {
        dom.sdkCanvaBatchPreset.addEventListener("change", (e) => {
            const val = e.target.value;
            if (val === "custom") {
                if (dom.sdkCanvaBatchInput) {
                    dom.sdkCanvaBatchInput.style.display = "block";
                    state.canvaBatchSize = Math.max(1, parseInt(dom.sdkCanvaBatchInput.value, 10) || 100);
                }
            } else {
                if (dom.sdkCanvaBatchInput) dom.sdkCanvaBatchInput.style.display = "none";
                state.canvaBatchSize = parseInt(val, 10);
            }
            updateMetrics();
        });
    }

    if (dom.sdkCanvaBatchInput) {
        dom.sdkCanvaBatchInput.addEventListener("input", (e) => {
            state.canvaBatchSize = Math.max(1, parseInt(e.target.value, 10) || 100);
            updateMetrics();
        });
    }

    // ==========================================
    // Word Search Volume Controls
    // ==========================================
    if (dom.wsCountInput) {
        dom.wsCountInput.addEventListener("input", (e) => {
            state.wsPuzzleCount = Math.max(1, Math.min(5000, parseInt(e.target.value, 10) || 1));
            state.wsTargetCountEnforced = true;
            if (dom.wsTargetCountTog) dom.wsTargetCountTog.checked = true;
            if (dom.wsCountPresetBtns) {
                dom.wsCountPresetBtns.forEach(b => b.classList.toggle("active", b.dataset.count === String(state.wsPuzzleCount)));
            }
            if (dom.wsCountBadge) dom.wsCountBadge.textContent = state.wsPuzzleCount;
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsCountPresetBtns) {
        dom.wsCountPresetBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                dom.wsCountPresetBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                if (btn.dataset.count === "auto") {
                    state.wsTargetCountEnforced = false;
                    if (dom.wsTargetCountTog) dom.wsTargetCountTog.checked = false;
                    updateWsSummaryCard();
                } else {
                    const cnt = parseInt(btn.dataset.count, 10) || 50;
                    state.wsTargetCountEnforced = true;
                    if (dom.wsTargetCountTog) dom.wsTargetCountTog.checked = true;
                    state.wsPuzzleCount = cnt;
                    if (dom.wsCountInput) dom.wsCountInput.value = cnt;
                    if (dom.wsCountBadge) dom.wsCountBadge.textContent = cnt;
                }
                if (state.mode === "wordsearch") refreshStudio();
            });
        });
    }

    if (dom.wsStartNum) {
        dom.wsStartNum.addEventListener("input", (e) => {
            state.wsStartNumber = Math.max(1, parseInt(e.target.value, 10) || 1);
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsPuzPerPageSel) {
        dom.wsPuzPerPageSel.addEventListener("change", (e) => {
            state.wsPuzzlesPerPage = Math.max(1, Math.min(2, parseInt(e.target.value, 10) || 1));
            syncSolutionPerPageLock("ws");
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsSolPerPageSel) {
        dom.wsSolPerPageSel.addEventListener("change", (e) => {
            state.wsSolutionsPerPage = parseInt(e.target.value, 10);
            if (!state.wsSameExcel) {
                state.wsSeparateSolutionsPerPage = state.wsSolutionsPerPage;
            }
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsTrimChoiceSel) {
        dom.wsTrimChoiceSel.addEventListener("change", (e) => {
            state.wsTrimChoice = e.target.value;
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsWordColsSel) {
        dom.wsWordColsSel.addEventListener("change", (e) => {
            state.wsWordCols = parseInt(e.target.value, 10);
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsShowBankTog) {
        dom.wsShowBankTog.addEventListener("change", (e) => {
            state.wsShowWordBank = e.target.checked;
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsSameExcelTog) {
        dom.wsSameExcelTog.addEventListener("change", (e) => {
            state.wsSameExcel = e.target.checked;
            syncSolutionPerPageLock("ws");
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsTargetCountTog) {
        dom.wsTargetCountTog.addEventListener("change", (e) => {
            state.wsTargetCountEnforced = e.target.checked;
            if (!state.wsTargetCountEnforced) {
                if (dom.wsCountPresetBtns) {
                    dom.wsCountPresetBtns.forEach(b => b.classList.toggle("active", b.dataset.count === "auto"));
                }
                updateWsSummaryCard();
            }
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsCanvaBatchPreset) {
        dom.wsCanvaBatchPreset.addEventListener("change", (e) => {
            const val = e.target.value;
            if (val === "custom") {
                if (dom.wsCanvaBatchInput) {
                    dom.wsCanvaBatchInput.style.display = "block";
                    state.wsCanvaBatchSize = Math.max(1, parseInt(dom.wsCanvaBatchInput.value, 10) || 100);
                }
            } else {
                if (dom.wsCanvaBatchInput) dom.wsCanvaBatchInput.style.display = "none";
                state.wsCanvaBatchSize = parseInt(val, 10);
            }
            updateMetrics();
        });
    }

    if (dom.wsCanvaBatchInput) {
        dom.wsCanvaBatchInput.addEventListener("input", (e) => {
            state.wsCanvaBatchSize = Math.max(1, parseInt(e.target.value, 10) || 100);
            updateMetrics();
        });
    }

    // ==========================================
    // Date & Calendar Controls
    // ==========================================
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

    // ==========================================
    // Sudoku Style Controls
    // ==========================================
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
                if (dom.sdkClueFontSel && state.activeStyle.fontFamily) {
                    const hasOpt = Array.from(dom.sdkClueFontSel.options).some(o => o.value === state.activeStyle.fontFamily);
                    if (hasOpt) dom.sdkClueFontSel.value = state.activeStyle.fontFamily;
                }
                if (state.mode === "sudoku") renderStage();
            }
        });
    });

    if (dom.sdkClueFontSel) {
        dom.sdkClueFontSel.addEventListener("change", (e) => {
            state.activeStyle.fontFamily = e.target.value;
            if (state.mode === "sudoku") renderStage();
        });
    }

    dom.cellStyleSel.addEventListener("change", (e) => {
        state.activeStyle.cellStyle = e.target.value;
        if (state.mode === "sudoku") renderStage();
    });

    dom.shadingModeSel.addEventListener("change", (e) => {
        state.activeStyle.shadingMode = e.target.value;
        if (state.mode === "sudoku") renderStage();
    });

    dom.outerLwInput.addEventListener("input", (e) => {
        state.activeStyle.outerLineWidth = parseFloat(e.target.value) || 1.4;
        if (state.mode === "sudoku") renderStage();
    });

    dom.blockLwInput.addEventListener("input", (e) => {
        state.activeStyle.blockLineWidth = parseFloat(e.target.value) || 1.0;
        if (state.mode === "sudoku") renderStage();
    });

    dom.innerLwInput.addEventListener("input", (e) => {
        state.activeStyle.innerLineWidth = parseFloat(e.target.value) || 0.4;
        if (state.mode === "sudoku") renderStage();
    });

    dom.fontScaleInput.addEventListener("input", (e) => {
        state.activeStyle.fontScale = parseInt(e.target.value, 10) || 64;
        if (state.mode === "sudoku") renderStage();
    });

    dom.solutionModeSel.addEventListener("change", (e) => {
        state.activeStyle.solutionMode = e.target.value;
        if (state.mode === "sudoku") renderStage();
    });

    // ==========================================
    // Word Search Style Controls
    // ==========================================
    if (dom.wsAudiencePresetBtns) {
        dom.wsAudiencePresetBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                dom.wsAudiencePresetBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const presetKey = btn.dataset.preset;
                state.wsActivePreset = presetKey;
                if (WS_PRESETS[presetKey]) {
                    state.wsActiveStyle = { ...WS_PRESETS[presetKey] };
                    if (dom.wsCellStyleSel) dom.wsCellStyleSel.value = state.wsActiveStyle.cellStyle;
                    if (dom.wsSolStyleSel) dom.wsSolStyleSel.value = state.wsActiveStyle.solutionStyle;
                    if (dom.wsLineWidthInput) dom.wsLineWidthInput.value = state.wsActiveStyle.gridLineWidth;
                    if (dom.wsLineWVal) dom.wsLineWVal.textContent = state.wsActiveStyle.gridLineWidth + "mm";
                    if (dom.wsLetterFontSel) dom.wsLetterFontSel.value = state.wsActiveStyle.letterFont;
                    if (dom.wsFontScaleSlider) dom.wsFontScaleSlider.value = state.wsActiveStyle.fontScale;
                    if (dom.wsFontScaleVal) dom.wsFontScaleVal.textContent = state.wsActiveStyle.fontScale + "%";
                    if (dom.wsThemeBadge) dom.wsThemeBadge.textContent = state.wsActiveStyle.description;

                    // Match line color select
                    const lc = state.wsActiveStyle.gridLineColor;
                    if (dom.wsLineColorSel) {
                        const hasOpt = Array.from(dom.wsLineColorSel.options).some(o => o.value === lc);
                        if (hasOpt) {
                            dom.wsLineColorSel.value = lc;
                            if (dom.wsCustomLineHex) dom.wsCustomLineHex.style.display = "none";
                        } else {
                            dom.wsLineColorSel.value = "custom";
                            if (dom.wsCustomLineHex) {
                                dom.wsCustomLineHex.style.display = "block";
                                dom.wsCustomLineHex.value = lc;
                            }
                        }
                    }

                    // Match letter color select
                    const ltc = state.wsActiveStyle.letterColor;
                    if (dom.wsLetterColorSel) {
                        const hasOpt = Array.from(dom.wsLetterColorSel.options).some(o => o.value === ltc);
                        if (hasOpt) {
                            dom.wsLetterColorSel.value = ltc;
                            if (dom.wsCustomLetterHex) dom.wsCustomLetterHex.style.display = "none";
                        } else {
                            dom.wsLetterColorSel.value = "custom";
                            if (dom.wsCustomLetterHex) {
                                dom.wsCustomLetterHex.style.display = "block";
                                dom.wsCustomLetterHex.value = ltc;
                            }
                        }
                    }

                    if (state.mode === "wordsearch") renderStage();
                }
            });
        });
    }

    if (dom.wsCellStyleSel) {
        dom.wsCellStyleSel.addEventListener("change", (e) => {
            state.wsActiveStyle.cellStyle = e.target.value;
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsSolStyleSel) {
        dom.wsSolStyleSel.addEventListener("change", (e) => {
            state.wsActiveStyle.solutionStyle = e.target.value;
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsLineColorSel) {
        dom.wsLineColorSel.addEventListener("change", (e) => {
            if (e.target.value === "custom") {
                if (dom.wsCustomLineHex) dom.wsCustomLineHex.style.display = "block";
            } else {
                if (dom.wsCustomLineHex) dom.wsCustomLineHex.style.display = "none";
                state.wsActiveStyle.gridLineColor = e.target.value;
                if (state.mode === "wordsearch") renderStage();
            }
        });
    }

    if (dom.wsCustomLineHex) {
        dom.wsCustomLineHex.addEventListener("input", (e) => {
            state.wsActiveStyle.gridLineColor = e.target.value || "#9DA49F";
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsLineWidthInput) {
        dom.wsLineWidthInput.addEventListener("input", (e) => {
            const val = parseFloat(e.target.value) || 0.6;
            state.wsActiveStyle.gridLineWidth = val;
            if (dom.wsLineWVal) dom.wsLineWVal.textContent = `${val}mm`;
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsLetterFontSel) {
        dom.wsLetterFontSel.addEventListener("change", (e) => {
            state.wsActiveStyle.letterFont = e.target.value;
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsLetterColorSel) {
        dom.wsLetterColorSel.addEventListener("change", (e) => {
            if (e.target.value === "custom") {
                if (dom.wsCustomLetterHex) dom.wsCustomLetterHex.style.display = "block";
            } else {
                if (dom.wsCustomLetterHex) dom.wsCustomLetterHex.style.display = "none";
                state.wsActiveStyle.letterColor = e.target.value;
                if (state.mode === "wordsearch") renderStage();
            }
        });
    }

    if (dom.wsCustomLetterHex) {
        dom.wsCustomLetterHex.addEventListener("input", (e) => {
            state.wsActiveStyle.letterColor = e.target.value || "#202A26";
            if (state.mode === "wordsearch") renderStage();
        });
    }

    if (dom.wsFontScaleSlider) {
        dom.wsFontScaleSlider.addEventListener("input", (e) => {
            const val = parseInt(e.target.value, 10) || 62;
            state.wsActiveStyle.fontScale = val;
            if (dom.wsFontScaleVal) dom.wsFontScaleVal.textContent = `${val}%`;
            if (state.mode === "wordsearch") renderStage();
        });
    }

    // ==========================================
    // Sudoku Generator Rules Controls
    // ==========================================
    dom.typeSel.addEventListener("change", (e) => {
        state.sudokuType = e.target.value;
        dom.wordokuGroup.style.display = state.sudokuType === SudokuType.WORDOKU_9X9 ? "flex" : "none";
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.wordokuWordInput.addEventListener("input", (e) => {
        state.wordokuWord = e.target.value;
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.diffSel.addEventListener("change", (e) => {
        state.difficulty = e.target.value;
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.seedInput.addEventListener("input", (e) => {
        state.seed = parseInt(e.target.value, 10) || 42;
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.titleTplInput.addEventListener("input", (e) => {
        state.titleTemplate = e.target.value || "Sudoku #{num}";
        if (state.mode === "sudoku") refreshStudio();
    });

    dom.symmetricTog.addEventListener("change", (e) => {
        state.symmetric = e.target.checked;
        if (state.mode === "sudoku") refreshStudio();
    });

    // ==========================================
    // Word Search Rules & Content Controls
    // ==========================================
    // Step 1: Language & Accents
    if (dom.wsLangSelect) {
        dom.wsLangSelect.addEventListener("change", (e) => {
            const lang = e.target.value;
            const prevLang = state.wsLanguage;
            const prevCfg = LANGUAGE_CONFIGS[prevLang] || LANGUAGE_CONFIGS["English"];
            if (wsEditorHasCustomContent(prevCfg) && !confirm(
                "Changing the language replaces your current word list and theme with the new language's sample. Your edits will be lost. Continue?"
            )) {
                e.target.value = prevLang;
                return;
            }
            updateWsLanguage(lang);
            const cfg = LANGUAGE_CONFIGS[lang] || LANGUAGE_CONFIGS["English"];
            state.wsThemeInput = cfg.default_theme;
            if (dom.wsThemeInput) dom.wsThemeInput.value = state.wsThemeInput;
            state.wsRawText = cfg.sample_words;
            if (dom.wsWordListInput) dom.wsWordListInput.value = state.wsRawText;
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsAccentModeSel) {
        dom.wsAccentModeSel.addEventListener("change", (e) => {
            state.wsAccentMode = e.target.value;
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsResetSampleBtn) {
        dom.wsResetSampleBtn.addEventListener("click", () => {
            const cfg = LANGUAGE_CONFIGS[state.wsLanguage] || LANGUAGE_CONFIGS["English"];
            if (wsEditorHasCustomContent(cfg) && !confirm(
                "Replace your current word list and theme with this language's sample content?"
            )) {
                return;
            }
            state.wsThemeInput = cfg.default_theme;
            if (dom.wsThemeInput) dom.wsThemeInput.value = state.wsThemeInput;
            state.wsRawText = cfg.sample_words;
            if (dom.wsWordListInput) dom.wsWordListInput.value = state.wsRawText;
            state.wsSource = "paste";
            state.wsCsvMode = "auto";
            if (dom.wsSourcePillBtns) {
                dom.wsSourcePillBtns.forEach(b => b.classList.toggle("active", b.dataset.source === "paste"));
            }
            if (dom.wsTextareaGroup) dom.wsTextareaGroup.style.display = "block";
            if (dom.wsCsvDropzone) dom.wsCsvDropzone.style.display = "none";
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    // Step 1: Source pills (Paste vs Normal CSV vs Themed CSV)
    if (dom.wsSourcePillBtns) {
        dom.wsSourcePillBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                dom.wsSourcePillBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");
                const src = btn.dataset.source;
                if (src === "paste") {
                    state.wsSource = "paste";
                    state.wsCsvMode = "auto";
                    if (dom.wsTextareaGroup) dom.wsTextareaGroup.style.display = "block";
                    if (dom.wsCsvDropzone) dom.wsCsvDropzone.style.display = "none";
                    if (dom.wsCsvModeDesc) {
                        dom.wsCsvModeDesc.textContent = "Paste one word per line — puzzle count is calculated automatically (total words ÷ words per puzzle).";
                    }
                } else if (src === "csv-simple") {
                    state.wsSource = "csv";
                    state.wsCsvMode = "simple";
                    if (dom.wsTextareaGroup) dom.wsTextareaGroup.style.display = "none";
                    if (dom.wsCsvDropzone) dom.wsCsvDropzone.style.display = "flex";
                    if (dom.wsCsvModeHint) {
                        dom.wsCsvModeHint.textContent = "Normal CSV mode: 1 column of words (header 'word' optional). Total words ÷ words per puzzle = puzzle count.";
                    }
                    if (dom.wsCsvModeDesc) {
                        dom.wsCsvModeDesc.textContent = "Normal CSV (word): total words in the CSV are divided by Words per puzzle to calculate the puzzle count.";
                    }
                } else if (src === "csv-themed") {
                    state.wsSource = "csv";
                    state.wsCsvMode = "themed";
                    if (dom.wsTextareaGroup) dom.wsTextareaGroup.style.display = "none";
                    if (dom.wsCsvDropzone) dom.wsCsvDropzone.style.display = "flex";
                    if (dom.wsCsvModeHint) {
                        dom.wsCsvModeHint.textContent = "Themed CSV mode: 2 columns 'theme,word'. Each unique theme in the CSV creates its own puzzle(s) automatically.";
                    }
                    if (dom.wsCsvModeDesc) {
                        dom.wsCsvModeDesc.textContent = "Themed CSV (theme,word): puzzle count is calculated automatically from the theme records in your CSV.";
                    }
                } else {
                    state.wsSource = "csv";
                    state.wsCsvMode = "auto";
                    if (dom.wsTextareaGroup) dom.wsTextareaGroup.style.display = "none";
                    if (dom.wsCsvDropzone) dom.wsCsvDropzone.style.display = "flex";
                }
                updateWsSummaryCard();
                if (state.mode === "wordsearch") refreshStudio();
            });
        });
    }

    if (dom.wsThemeInput) {
        dom.wsThemeInput.addEventListener("input", (e) => {
            state.wsThemeInput = e.target.value;
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsSeedInput) {
        dom.wsSeedInput.addEventListener("input", (e) => {
            state.wsSeed = parseInt(e.target.value, 10) || 42;
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsShuffleSeedBtn) {
        dom.wsShuffleSeedBtn.addEventListener("click", () => {
            state.wsSeed = Math.floor(Math.random() * 900000) + 1000;
            if (dom.wsSeedInput) dom.wsSeedInput.value = state.wsSeed;
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    // CSV File Drag & Drop + Click
    if (dom.wsCsvDropzone && dom.wsCsvFileInput) {
        dom.wsCsvDropzone.addEventListener("click", () => dom.wsCsvFileInput.click());

        dom.wsCsvDropzone.addEventListener("keydown", (e) => {
            if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                dom.wsCsvFileInput.click();
            }
        });

        dom.wsCsvDropzone.addEventListener("dragover", (e) => {
            e.preventDefault();
            dom.wsCsvDropzone.style.borderColor = "var(--primary)";
        });

        dom.wsCsvDropzone.addEventListener("dragleave", () => {
            dom.wsCsvDropzone.style.borderColor = "var(--border-subtle)";
        });

        dom.wsCsvDropzone.addEventListener("drop", (e) => {
            e.preventDefault();
            dom.wsCsvDropzone.style.borderColor = "var(--border-subtle)";
            if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                handleCsvFile(e.dataTransfer.files[0]);
            }
        });

        dom.wsCsvFileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files[0]) {
                handleCsvFile(e.target.files[0]);
            }
        });
    }

    function handleCsvFile(file) {
        const reader = new FileReader();
        reader.onload = (evt) => {
            state.wsCsvContent = evt.target.result;
            state.wsCsvFileName = file.name;
            if (dom.wsCsvFileLabel) {
                dom.wsCsvFileLabel.textContent = `📄 ${file.name}`;
            }
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        };
        reader.readAsText(file);
    }

    if (dom.wsWordListInput) {
        dom.wsWordListInput.addEventListener("input", (e) => {
            state.wsRawText = e.target.value;
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    // Sample CSV Downloads
    if (dom.wsDownThemedCsv) {
        dom.wsDownThemedCsv.addEventListener("click", () => {
            const cfg = LANGUAGE_CONFIGS[state.wsLanguage] || LANGUAGE_CONFIGS["English"];
            const blob = new Blob([cfg.themed_csv], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `themed_${cfg.default_theme.toLowerCase()}_sample.csv`);
        });
    }

    if (dom.wsDownSimpleCsv) {
        dom.wsDownSimpleCsv.addEventListener("click", () => {
            const cfg = LANGUAGE_CONFIGS[state.wsLanguage] || LANGUAGE_CONFIGS["English"];
            const blob = new Blob([cfg.simple_csv], { type: "text/csv;charset=utf-8;" });
            saveAs(blob, `simple_${cfg.default_theme.toLowerCase()}_sample.csv`);
        });
    }

    // AI Prompts Expander
    if (dom.wsAiExpanderHdr) {
        dom.wsAiExpanderHdr.addEventListener("click", () => {
            const isOpen = dom.wsAiExpanderBody.classList.toggle("open");
            dom.wsAiExpanderHdr.setAttribute("aria-expanded", String(isOpen));
            dom.wsAiExpanderBody.style.display = isOpen ? "flex" : "none";
            dom.wsAiExpIcon.textContent = isOpen ? "▲" : "▼";
        });
    }

    if (dom.wsPromptTypeSel) {
        dom.wsPromptTypeSel.addEventListener("change", () => updateWsPromptBox());
    }

    if (dom.wsCopyPromptBtn) {
        dom.wsCopyPromptBtn.addEventListener("click", () => {
            if (dom.wsPromptCodeBox && dom.wsPromptCodeBox.textContent) {
                navigator.clipboard.writeText(dom.wsPromptCodeBox.textContent).then(() => {
                    const original = dom.wsCopyPromptBtn.textContent;
                    dom.wsCopyPromptBtn.textContent = "✅ Copied!";
                    setTimeout(() => { dom.wsCopyPromptBtn.textContent = original; }, 1500);
                });
            }
        });
    }

    // Step 2: Grid Dimensions & Capacity
    if (dom.wsGridDimSelect) {
        dom.wsGridDimSelect.addEventListener("change", (e) => {
            state.wsGridChoice = e.target.value;
            if (state.wsGridChoice === "custom") {
                if (dom.wsCustomDimsRow) dom.wsCustomDimsRow.style.display = "flex";
                state.wsRows = parseInt(dom.wsCustRows.value, 10) || 12;
                state.wsCols = parseInt(dom.wsCustCols.value, 10) || 10;
            } else {
                if (dom.wsCustomDimsRow) dom.wsCustomDimsRow.style.display = "none";
                if (state.wsGridChoice === "auto") {
                    state.wsRows = state.wsDifficulty === "easy" ? 10 : (state.wsDifficulty === "medium" ? 13 : 16);
                    state.wsCols = state.wsRows;
                } else if (state.wsGridChoice.includes("x")) {
                    const parts = state.wsGridChoice.split("x").map(Number);
                    state.wsRows = parts[0] || 12;
                    state.wsCols = parts[1] || 10;
                }
            }
            updateWsCapacityCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsDifficultySelect) {
        dom.wsDifficultySelect.addEventListener("change", (e) => {
            state.wsDifficulty = e.target.value;
            if (state.wsGridChoice === "auto") {
                state.wsRows = state.wsDifficulty === "easy" ? 10 : (state.wsDifficulty === "medium" ? 13 : 16);
                state.wsCols = state.wsRows;
                updateWsCapacityCard();
            }
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsCustRows) {
        dom.wsCustRows.addEventListener("input", (e) => {
            state.wsRows = parseInt(e.target.value, 10) || 12;
            if (dom.wsCustRowsVal) dom.wsCustRowsVal.textContent = state.wsRows;
            updateWsCapacityCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsCustCols) {
        dom.wsCustCols.addEventListener("input", (e) => {
            state.wsCols = parseInt(e.target.value, 10) || 10;
            if (dom.wsCustColsVal) dom.wsCustColsVal.textContent = state.wsCols;
            updateWsCapacityCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    if (dom.wsWordsPerPageSlider) {
        dom.wsWordsPerPageSlider.addEventListener("input", (e) => {
            state.wsWordsPerPage = parseInt(e.target.value, 10) || 12;
            if (dom.wsWordsPerPageVal) dom.wsWordsPerPageVal.textContent = state.wsWordsPerPage;
            updateWsSummaryCard();
            if (state.mode === "wordsearch") refreshStudio();
        });
    }

    // ==========================================
    // Exports
    // ==========================================
    dom.btnExportCanva.addEventListener("click", handleExportCanva);
    dom.btnExportSolutions.addEventListener("click", handleExportSolutions);
    dom.btnExportPdf.addEventListener("click", handleExportPdf);
    dom.btnExportZip.addEventListener("click", handleExportZip);
}

// In-page toast: non-blocking feedback replacing native alert() popups.
function showToast(message, type = "error", duration = 6000) {
    let host = document.getElementById("toast-host");
    if (!host) {
        host = document.createElement("div");
        host.id = "toast-host";
        host.className = "toast-host";
        host.setAttribute("role", "status");
        host.setAttribute("aria-live", "polite");
        document.body.appendChild(host);
    }
    const el = document.createElement("div");
    el.className = `toast toast-${type}`;
    el.textContent = message;
    const close = document.createElement("button");
    close.type = "button";
    close.className = "toast-close";
    close.setAttribute("aria-label", "Dismiss message");
    close.textContent = "\u00d7";
    close.addEventListener("click", () => dismiss());
    el.appendChild(close);
    host.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    let timer = setTimeout(dismiss, duration);
    function dismiss() {
        clearTimeout(timer);
        el.classList.remove("show");
        setTimeout(() => el.remove(), 250);
    }
    return el;
}

// Progress Bar Helper
let lockedControls = [];
function setProgress(percent, text) {
    if (percent !== null && !state.isExporting) {
        lockedControls = [...document.querySelectorAll("button, input, select, textarea, summary")].map(control=>[control, control.disabled]);
        lockedControls.forEach(([control])=>control.disabled=true);
        state.isExporting = true;
    } else if (percent === null) {
        lockedControls.forEach(([control,disabled])=>control.disabled=disabled);
        lockedControls=[];
        state.isExporting=false;
        updateWorkflow(state);
    }
    if (percent === null) {
        dom.exportProgressContainer.style.display = "none";
    } else {
        dom.exportProgressContainer.style.display = "flex";
        dom.exportProgressFill.style.width = `${percent}%`;
        dom.exportProgressText.textContent = text || `Processing ${percent}%...`;
    }
}

// Generate full collection of puzzles on demand (with chunked progress reporting & caching)
async function getOrBuildFullPuzzlesBatch(onProgress) {
    const currentHash = state.mode === "sudoku" ? getSudokuConfigHash() : getWsConfigHash();

    if (state.builtPuzzlesCache && state.builtPuzzlesHash === currentHash) {
        return state.builtPuzzlesCache;
    }

    if (state.mode === "sudoku") {
        const total = state.puzzleCount;
        const allPuzzles = [];
        const chunkSize = 25;

        for (let i = 0; i < total; i++) {
            const pSeed = (state.seed + i * 17) % 2147483647;
            const p = generateSudokuPuzzle({
                puzzleId: state.startNumber + i,
                puzzleType: state.sudokuType,
                difficulty: state.difficulty,
                seed: pSeed,
                symmetric: state.symmetric,
                wordokuWord: state.wordokuWord,
                titleTemplate: state.titleTemplate
            });
            allPuzzles.push(p);

            if (onProgress && (i % chunkSize === 0 || i === total - 1)) {
                const pct = Math.round(((i + 1) / total) * 100);
                onProgress(pct, `Generating full Sudoku collection: ${i + 1} / ${total} (${pct}%)...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        state.builtPuzzlesCache = allPuzzles;
        state.builtPuzzlesHash = currentHash;
        return allPuzzles;
    } else {
        const baseChunks = getWsBaseChunks();
        const totalNeeded = getWsTotalNeeded(baseChunks);
        const { rows, cols, fillAlpha } = getWsActiveDimensions();

        const allPuzzles = [];
        const chunkSize = 20;

        for (let i = 0; i < totalNeeded; i++) {
            const pNum = (state.wsStartNumber || 1) + i;
            const item = baseChunks[i % baseChunks.length];
            const pTitle = getWsPuzzleTitle(item, pNum);
            const puzzleWords = getWordsForWsPuzzle(item, i, state.wsWordsPerPage || 12);

            const puzzle = generateWordSearchPuzzle({
                words: puzzleWords,
                width: cols,
                height: rows,
                difficulty: state.wsDifficulty,
                language: state.wsLanguage,
                title: pTitle,
                fillAlphabet: fillAlpha,
                seed: (state.wsSeed || 42) + i * 19
            });

            if (puzzle.unplacedWords.length) throw new Error(`Puzzle ${pNum}: ${puzzle.unplacedWords.length} words do not fit. Increase the grid size or reduce words per puzzle.`);
            puzzle.puzzleId = pNum;
            puzzle.theme = pTitle;
            puzzle.title = pTitle;
            puzzle.difficultyLabel = state.wsDifficulty.toUpperCase();
            allPuzzles.push(puzzle);

            if (onProgress && (i % chunkSize === 0 || i === totalNeeded - 1)) {
                const pct = Math.round(((i + 1) / totalNeeded) * 100);
                onProgress(pct, `Generating full Word Search collection: ${i + 1} / ${totalNeeded} (${pct}%)...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        state.builtPuzzlesCache = allPuzzles;
        state.builtPuzzlesHash = currentHash;
        return allPuzzles;
    }
}

// Helper to render images for Canva Bulk cell embedding
// Render the same composite answer pages used by preview and the book PDF.
// Each resulting PNG is one complete page, even when it contains several grids.
// startPage/endPage let callers stream a bounded range of answer pages.
async function renderSolutionPageImages(puzzles, onProgress, startPage = 0, endPage = null) {
    const book = activeBook(state);
    const pageCount = Math.ceil(puzzles.length / book.answers);
    const lastPage = endPage == null ? pageCount : Math.min(endPage, pageCount);
    const pageImages = [];
    for (let page = startPage; page < lastPage; page++) {
        const canvas = (book.ws ? renderWordSearchSolutionPageCanvas : renderSudokuSolutionPageCanvas)({
            puzzlesSlice: puzzles.slice(page * book.answers, (page + 1) * book.answers),
            solutionsPerPage: book.answers,
            pageNum: page + 1,
            bookPageNum: Number(book.includeTitlePage) + book.puzzlePages + 2 + page,
            bookTotalPages: book.totalPages,
            totalPages: pageCount,
            trimChoice: book.trim,
            style: book.ws ? state.wsActiveStyle : state.activeStyle,
            dpi: 300
        });
        pageImages.push(canvas.toDataURL("image/png"));
        canvas.width = 1; canvas.height = 1;
        if ((page - startPage) % 3 === 0 || page === lastPage - 1) {
            onProgress?.(Math.round(((page - startPage + 1) / Math.max(1, lastPage - startPage)) * 100));
            await new Promise(resolve => setTimeout(resolve, 0));
        }
    }
    return pageImages;
}

// Render only one slice of puzzle/page bitmaps so exports never hold the whole
// book's images in memory at once. Arrays are globally indexed but only the
// requested range is filled (the rest stay empty and cost nothing).
async function renderImageSlice(puzzles, { puzStart, puzEnd, pageStart, pageEnd, needSolution = false, onProgress }) {
    const ws = state.mode === "wordsearch";
    const ppp = ws ? (state.wsPuzzlesPerPage || 1) : state.puzzlesPerPage;
    const total = puzzles.length;
    const totalPages = Math.ceil(total / ppp);
    const gridImages = new Array(total);
    const solutionImages = new Array(total);
    const calendarImages = new Array(total);
    const pageCalendarImages = new Array(totalPages);

    const calOpts = (info) => ({
        year: info.year, month: info.month, highlightDay: info.highlightDay,
        theme: state.calTheme, firstDaySunday: state.calSunday,
        showCardBorder: state.calBorder, showYear: state.calShowYear
    });

    if (state.dateEnabled && state.dateMode === "calendar_image") {
        for (let p = pageStart; p < pageEnd; p++) {
            const info = getPuzzleDateInfo(p, state.startDate, state.progression, state.dateFormat);
            const cnv = renderMiniMonthCalendarCanvas(calOpts(info));
            pageCalendarImages[p] = cnv.toDataURL("image/png");
            cnv.width = 1; cnv.height = 1;
        }
    }

    for (let i = puzStart; i < puzEnd; i++) {
        const p = puzzles[i];
        let dTxt = null;
        if (state.dateEnabled) {
            const dateIdx = (state.dateScope === "per_page") ? Math.floor(i / ppp) : i;
            const info = getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat);
            dTxt = info.dateStr;
            if (state.dateMode === "calendar_image") {
                const cnv = renderMiniMonthCalendarCanvas(calOpts(info));
                calendarImages[i] = cnv.toDataURL("image/png");
                cnv.width = 1; cnv.height = 1;
            }
        }

        let gridCnv, solCnv = null;
        if (ws) {
            gridCnv = renderWordSearchGridCanvas({ puzzle: p, style: state.wsActiveStyle, cellMm: 9.0, dpi: 300, solution: false, dateText: dTxt, showGridLines: true });
            gridImages[i] = gridCnv.toDataURL("image/png");
            if (needSolution) {
                solCnv = renderWordSearchGridCanvas({ puzzle: p, style: state.wsActiveStyle, cellMm: 9.0, dpi: 300, solution: true, showGridLines: true });
                solutionImages[i] = solCnv.toDataURL("image/png");
            }
        } else {
            gridCnv = renderSudokuGridCanvas({ puzzle: p, style: state.activeStyle, cellMm: 12.0, dpi: 300, solution: false, dateText: dTxt });
            gridImages[i] = gridCnv.toDataURL("image/png");
            if (needSolution) {
                solCnv = renderSudokuGridCanvas({ puzzle: p, style: state.activeStyle, cellMm: 12.0, dpi: 300, solution: true });
                solutionImages[i] = solCnv.toDataURL("image/png");
            }
        }
        gridCnv.width = 1; gridCnv.height = 1;
        if (solCnv) { solCnv.width = 1; solCnv.height = 1; }

        if (onProgress && ((i - puzStart) % 4 === 0 || i === puzEnd - 1)) {
            onProgress(Math.round(((i - puzStart + 1) / Math.max(1, puzEnd - puzStart)) * 100));
            await new Promise(r => setTimeout(r, 0));
        }
    }
    return { gridImages, solutionImages, calendarImages, pageCalendarImages };
}

// Render per-grid solution PNGs for a slice of puzzles (one image per grid).
async function renderSolutionGridRange(puzzles, puzStart, puzEnd, onProgress) {
    const ws = state.mode === "wordsearch";
    const out = [];
    for (let i = puzStart; i < puzEnd; i++) {
        const p = puzzles[i];
        const cnv = ws
            ? renderWordSearchGridCanvas({ puzzle: p, style: state.wsActiveStyle, cellMm: 9.0, dpi: 300, solution: true, showGridLines: true })
            : renderSudokuGridCanvas({ puzzle: p, style: state.activeStyle, cellMm: 12.0, dpi: 300, solution: true });
        out.push(cnv.toDataURL("image/png"));
        cnv.width = 1; cnv.height = 1;
        if ((i - puzStart) % 4 === 0 || i === puzEnd - 1) {
            onProgress?.(Math.round(((i - puzStart + 1) / Math.max(1, puzEnd - puzStart)) * 100));
            await new Promise(r => setTimeout(r, 0));
        }
    }
    return out;
}

// Build the separate solution workbooks (streamed by answer-page chunks) for
// both granularity modes. Returns an array of file descriptors.
async function buildSeparateSolutionFiles(fullPuzzles, { imageMode, answers, batchSize, startNumber, mode, pageAspect, onProgress, solutionGridProvider = null }) {
    const total = fullPuzzles.length;
    const totalSolPages = Math.ceil(total / answers);
    const chunk = batchSize > 0 ? batchSize : totalSolPages;
    const files = [];
    for (let ps = 0; ps < totalSolPages; ps += chunk) {
        const pe = Math.min(totalSolPages, ps + chunk);
        const puzStart = ps * answers;
        const puzEnd = Math.min(total, pe * answers);
        const slice = fullPuzzles.slice(puzStart, puzEnd);
        const puzzleNumberOffset = startNumber - 1 + puzStart;
        if (imageMode === "per_page") {
            const pageImages = await renderSolutionPageImages(fullPuzzles, onProgress, ps, pe);
            const res = await buildSolutionPageWorkbooks({
                puzzles: slice, solutionPageImages: pageImages, solutionsPerPage: answers,
                batchSize: 0, mode, pageAspect, pageOffset: ps, puzzleNumberOffset
            });
            files.push(...res.files);
        } else {
            const solImages = solutionGridProvider
                ? await solutionGridProvider(puzStart, puzEnd)
                : await renderSolutionGridRange(fullPuzzles, puzStart, puzEnd, onProgress);
            const res = await buildPerGridSolutionWorkbooks({
                puzzles: slice, solutionImages: solImages, solutionsPerPage: answers,
                batchSize: 0, mode, pageOffset: ps, puzzleNumberOffset
            });
            files.push(...res.files);
        }
    }
    return files;
}

// Handle Canva Bulk Excel Export (with REAL embedded floating images)
async function handleExportCanva() {
    updateWorkflow(state);
    if (state.isExporting || state.exportBlocked) return;
    try {
        setProgress(2, "Generating full puzzle collection for export...");
        const fullPuzzles = await getOrBuildFullPuzzlesBatch(setProgress);

        const ws = state.mode === "wordsearch";
        const ppp = ws ? (state.wsPuzzlesPerPage || 1) : state.puzzlesPerPage;
        const answers = ws ? state.wsSolutionsPerPage : state.solutionsPerPage;
        const sameExcel = ws ? state.wsSameExcel : state.sameExcel;
        const imageMode = (ws ? state.wsSolutionImageMode : state.sdkSolutionImageMode) === "per_page" ? "per_page" : "per_grid";
        const startNumber = ws ? state.wsStartNumber : state.startNumber;
        // Solutions live inside the puzzle workbook only when "same Excel" is on
        // AND images are per-grid. Any other combination streams a separate file.
        const solutionsInMain = sameExcel && imageMode === "per_grid";
        const separateSolutions = !solutionsInMain;

        const totalPuzzles = fullPuzzles.length;
        const totalPages = Math.ceil(totalPuzzles / ppp);
        const batchSize = ws
            ? (state.wsCanvaBatchSize && state.wsCanvaBatchSize > 0 ? state.wsCanvaBatchSize : 0)
            : (state.canvaBatchSize && state.canvaBatchSize > 0 ? state.canvaBatchSize : 0);

        const dateStrings = fullPuzzles.map((_, i) => {
            const dateIdx = (state.dateScope === "per_page") ? Math.floor(i / ppp) : i;
            return state.dateEnabled ? getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat).dateStr : "";
        });
        const pageDateStrings = [];
        if (state.dateEnabled) {
            for (let p = 0; p < totalPages; p++) {
                pageDateStrings.push(getPuzzleDateInfo(p, state.startDate, state.progression, state.dateFormat).dateStr);
            }
        }
        const book = activeBook(state);
        const [trimW, trimH] = TRIM_DIMENSIONS_PT[book.trim];
        const pageAspect = trimH / trimW;

        setProgress(10, "Rendering puzzle images for Canva Bulk cell embedding...");
        const imageBatchProvider = (puzStart, puzEnd, pageStart, pageEnd) =>
            renderImageSlice(fullPuzzles, {
                puzStart, puzEnd, pageStart, pageEnd,
                needSolution: solutionsInMain,
                onProgress: pct => setProgress(10 + Math.round(pct * 0.45), `Embedding images into Canva Excel: ${pct}%...`)
            });

        const common = {
            puzzles: fullPuzzles,
            includeSolutionInSameExcel: solutionsInMain,
            solutionImageMode: imageMode,
            skipSeparateSolutions: true,
            numberOffset: startNumber - 1,
            dateStrings: state.dateEnabled ? dateStrings : [],
            hasCalendarImages: state.dateEnabled && state.dateMode === "calendar_image",
            imageBatchProvider,
            batchSize,
            pageAspect
        };

        let result;
        if (ws) {
            result = await buildCanvaWordSearchExcel({
                ...common,
                puzzlesPerPage: ppp,
                solutionsPerPage: answers,
                dateScope: state.dateScope,
                pageDateStrings: state.dateEnabled ? pageDateStrings : []
            });
        } else {
            result = await buildCanvaSudokuExcel({
                ...common,
                puzzlesPerPage: ppp,
                solutionsPerPage: answers,
                dateScope: state.dateScope,
                pageDateStrings: state.dateEnabled ? pageDateStrings : []
            });
        }

        if (separateSolutions) {
            setProgress(58, "Rendering answer pages for the solution workbook...");
            const solFiles = await buildSeparateSolutionFiles(fullPuzzles, {
                imageMode, answers, batchSize, startNumber, mode: state.mode, pageAspect,
                onProgress: pct => setProgress(58 + Math.round(pct * 0.3), `Rendering answer pages: ${pct}%...`)
            });
            result.files.push(...solFiles);
            result.isSplit = result.files.length > 1;
        }

        setProgress(90, "Packaging Canva Bulk workbook files...");
        if (result.isSplit && result.files.length > 1) {
            const zip = new window.JSZip();
            result.files.forEach(f => {
                zip.file(f.filename, f.buffer);
            });
            const instructions = generateCanvaInstructions({
                mode: state.mode,
                totalPages: result.totalPages,
                batchSize: batchSize || 100,
                numBatches: result.totalBatches,
                puzzlesPerPage: ppp
            });
            zip.file("CANVA_BULK_CREATE_INSTRUCTIONS.txt", instructions);

            const zipBlob = await zip.generateAsync({
                type: "blob",
                compression: "DEFLATE",
                compressionOptions: { level: 6 }
            });
            const zipName = state.mode === "sudoku"
                ? `sudoku_canva_bulk_batches_${result.totalPages}_pages.zip`
                : `wordsearch_canva_bulk_batches_${result.totalPages}_pages.zip`;
            saveAs(zipBlob, zipName);
        } else {
            setProgress(95, "Downloading Canva Bulk workbook...");
            const singleFile = result.files[0];
            const blob = new Blob([singleFile.buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
            saveAs(blob, singleFile.filename);
        }
        setTimeout(() => setProgress(null), 1000);
    } catch (err) {
        setProgress(null);
        showToast(`Export failed: ${err.message}`);
    }
}

// Download only complete answer pages, with each page embedded in Excel.
async function handleExportSolutions() {
    updateWorkflow(state);
    if (state.isExporting || state.exportBlocked) return;
    try {
        setProgress(5, "Generating full puzzle collection for solutions export...");
        const fullPuzzles = await getOrBuildFullPuzzlesBatch(setProgress);
        const wsS = state.mode === "wordsearch";
        const answers = wsS ? state.wsSolutionsPerPage : state.solutionsPerPage;
        const imageMode = (wsS ? state.wsSolutionImageMode : state.sdkSolutionImageMode) === "per_page" ? "per_page" : "per_grid";
        const startNumber = wsS ? state.wsStartNumber : state.startNumber;
        const batchSize = wsS
            ? (state.wsCanvaBatchSize && state.wsCanvaBatchSize > 0 ? state.wsCanvaBatchSize : 0)
            : (state.canvaBatchSize && state.canvaBatchSize > 0 ? state.canvaBatchSize : 0);
        const bookS = activeBook(state);
        const pageAspectS = TRIM_DIMENSIONS_PT[bookS.trim][1] / TRIM_DIMENSIONS_PT[bookS.trim][0];

        setProgress(20, "Rendering answer pages...");
        const files = await buildSeparateSolutionFiles(fullPuzzles, {
            imageMode, answers, batchSize, startNumber, mode: state.mode, pageAspect: pageAspectS,
            onProgress: pct => setProgress(20 + Math.round(pct * 0.65), `Rendering answer pages: ${pct}%...`)
        });
        if (files.length === 1) {
            saveAs(new Blob([files[0].buffer], {type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),
                files[0].filename);
        } else {
            const zip = new window.JSZip();
            files.forEach(file => zip.file(file.filename,file.buffer));
            const blob = await zip.generateAsync({type:'blob',compression:'DEFLATE'});
            saveAs(blob, `${state.mode}_solution_pages.zip`);
        }
        setTimeout(() => setProgress(null), 1000);
    } catch (err) {
        setProgress(null);
        showToast(`Export failed: ${err.message}`);
    }
}

// Handle KDP Print PDF Export
async function handleExportPdf() {
    updateWorkflow(state);
    if (state.isExporting || state.pdfBlocked) return;
    try {
        setProgress(2, "Generating full puzzle collection for PDF book...");
        const fullPuzzles = await getOrBuildFullPuzzlesBatch(setProgress);
        setProgress(15, "Building print-ready KDP PDF book...");
        const totalPuzzles = fullPuzzles.length;
        const pppPdf = state.mode === "sudoku" ? state.puzzlesPerPage : (state.wsPuzzlesPerPage || 1);
        const totalPages = Math.ceil(totalPuzzles / pppPdf);

        const dateStrings = fullPuzzles.map((_, i) =>
            state.dateEnabled ? getPuzzleDateInfo(i, state.startDate, state.progression, state.dateFormat).dateStr : ""
        );

        const calendarCanvases = fullPuzzles.map((_, i) => {
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
                bookTitle: state.bookTitles[state.mode],
                includeTitlePage: state.titlePages[state.mode],
                puzzles: fullPuzzles,
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
                onProgress: (p) => setProgress(15 + Math.round(p * 0.8), `Rendering PDF book pages: ${p}%`)
            });
            filename = "sudoku_kdp_interior.pdf";
        } else {
            pdfBuffer = await buildWordSearchKdpPdf({
                bookTitle: state.bookTitles[state.mode],
                includeTitlePage: state.titlePages[state.mode],
                puzzles: fullPuzzles,
                style: state.wsActiveStyle,
                puzzlesPerPage: state.wsPuzzlesPerPage || 1,
                solutionsPerPage: state.wsSolutionsPerPage || 4,
                trimChoice: state.wsTrimChoice,
                dateScope: state.dateScope,
                dateStrings: state.dateEnabled ? dateStrings : [],
                calendarCanvases,
                pageDateStrings: state.dateEnabled ? pageDateStrings : [],
                pageCalendarCanvases,
                wordColumns: state.wsWordCols,
                showWordBank: state.wsShowWordBank,
                wordBankTitle: LANGUAGE_CONFIGS[state.wsLanguage]?.word_bank_title,
                onProgress: (p) => setProgress(15 + Math.round(p * 0.8), `Rendering PDF book pages: ${p}%`)
            });
            filename = "wordsearch_kdp_interior.pdf";
        }

        const blob = new Blob([pdfBuffer], { type: "application/pdf" });
        saveAs(blob, filename);
        setTimeout(() => setProgress(null), 1000);
    } catch (err) {
        setProgress(null);
        showToast(`PDF export failed: ${err.message}`);
    }
}

// Handle Complete 300 DPI ZIP Bundle Export
async function handleExportZip() {
    updateWorkflow(state);
    if (state.isExporting || state.exportBlocked) return;
    if (typeof window.JSZip === "undefined") {
        showToast("JSZip library not loaded. Reload the page and retry.");
        return;
    }

    try {
        setProgress(2, "Generating full puzzle collection for ZIP bundle...");
        const fullPuzzles = await getOrBuildFullPuzzlesBatch(setProgress);

        const zip = new window.JSZip();
        const imgFolder = zip.folder("images");
        const total = fullPuzzles.length;
        const wsMode = state.mode === "wordsearch";
        const pppZ = wsMode ? (state.wsPuzzlesPerPage || 1) : state.puzzlesPerPage;
        const totalPages = Math.ceil(total / pppZ);

        setProgress(15, `Rendering 300 DPI high-resolution puzzle images: 0 / ${total}`);

        const canvasToBlob = (canvas) => new Promise(resolve => canvas.toBlob(resolve, "image/png"));
        const blobToDataUrl = (blob) => new Promise(resolve => {
            if (!blob) return resolve("");
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result);
            fr.onerror = () => resolve("");
            fr.readAsDataURL(blob);
        });

        const pageDateStrings = [];
        const gridBlobs = new Array(total);
        const solBlobs = new Array(total);
        const calBlobs = new Array(total);
        const pageCalBlobs = new Array(totalPages);

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
                    pageCalBlobs[p] = await canvasToBlob(calCnv);
                    calCnv.width = 1; calCnv.height = 1;

                    if (state.dateScope === "per_page") {
                        imgFolder.file(`page_${String(p + 1).padStart(3, "0")}_calendar.png`, pageCalBlobs[p]);
                    }
                }
            }
        }

        for (let i = 0; i < total; i++) {
            const p = fullPuzzles[i];
            const pPad = String(i + 1).padStart(3, "0");

            let dTxt = null;

            if (state.dateEnabled) {
                const dateIdx = (state.dateScope === "per_page")
                    ? Math.floor(i / pppZ)
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
                    const calBlob = await canvasToBlob(calCnv);
                    calCnv.width = 1; calCnv.height = 1;
                    calBlobs[i] = calBlob;
                    if (state.dateScope === "per_game") {
                        imgFolder.file(`puzzle_${pPad}_calendar.png`, calBlob);
                    }
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
                gridBlobs[i] = await canvasToBlob(gridCnv);
                imgFolder.file(`puzzle_${pPad}_grid.png`, gridBlobs[i]);
                gridCnv.width = 1; gridCnv.height = 1;

                // Sudoku Solution Image (300 DPI)
                solCnv = renderSudokuGridCanvas({
                    puzzle: p,
                    style: state.activeStyle,
                    cellMm: 12.0,
                    dpi: 300,
                    solution: true
                });
                solBlobs[i] = await canvasToBlob(solCnv);
                imgFolder.file(`puzzle_${pPad}_solution.png`, solBlobs[i]);
                solCnv.width = 1; solCnv.height = 1;

            } else {
                // Word Search Grid Image (300 DPI)
                gridCnv = renderWordSearchGridCanvas({
                    puzzle: p,
                    style: state.wsActiveStyle,
                    cellMm: 9.0,
                    dpi: 300,
                    solution: false,
                    dateText: dTxt,
                    showGridLines: true
                });
                gridBlobs[i] = await canvasToBlob(gridCnv);
                imgFolder.file(`puzzle_${pPad}_grid.png`, gridBlobs[i]);
                gridCnv.width = 1; gridCnv.height = 1;

                // Word Search Solution Image (300 DPI)
                solCnv = renderWordSearchGridCanvas({
                    puzzle: p,
                    style: state.wsActiveStyle,
                    cellMm: 9.0,
                    dpi: 300,
                    solution: true,
                    showGridLines: true
                });
                solBlobs[i] = await canvasToBlob(solCnv);
                imgFolder.file(`puzzle_${pPad}_solution.png`, solBlobs[i]);
                solCnv.width = 1; solCnv.height = 1;
            }

            if (i % 5 === 0 || i === total - 1) {
                const pct = 15 + Math.round(((i + 1) / total) * 55);
                setProgress(pct, `Rendering 300 DPI high-res images: ${i + 1} of ${total}...`);
                await new Promise(r => setTimeout(r, 0));
            }
        }

        // Add Canva Excel with embedded pictures and complete answer-page images.
        setProgress(72, "Adding Canva Bulk Create Excel workbook with embedded pictures...");
        const answersZ = wsMode ? state.wsSolutionsPerPage : state.solutionsPerPage;
        const sameExcelZ = wsMode ? state.wsSameExcel : state.sameExcel;
        const imageModeZ = (wsMode ? state.wsSolutionImageMode : state.sdkSolutionImageMode) === "per_page" ? "per_page" : "per_grid";
        const startNumberZ = wsMode ? state.wsStartNumber : state.startNumber;
        const solutionsInMainZ = sameExcelZ && imageModeZ === "per_grid";
        const separateSolutionsZ = !solutionsInMainZ;

        const dateStrings = fullPuzzles.map((_, i) => {
            const dateIdx = (state.dateScope === "per_page") ? Math.floor(i / pppZ) : i;
            return state.dateEnabled ? getPuzzleDateInfo(dateIdx, state.startDate, state.progression, state.dateFormat).dateStr : "";
        });

        const batchSize = state.mode === "sudoku"
            ? (state.canvaBatchSize && state.canvaBatchSize > 0 ? state.canvaBatchSize : 0)
            : (state.wsCanvaBatchSize && state.wsCanvaBatchSize > 0 ? state.wsCanvaBatchSize : 0);

        const bookZ = activeBook(state);
        const pageAspectZ = TRIM_DIMENSIONS_PT[bookZ.trim][1] / TRIM_DIMENSIONS_PT[bookZ.trim][0];

        // Decode base64 only for the images one batch needs; the rest of the
        // book stays in compact PNG blob form inside the ZIP.
        const zipImageBatchProvider = async (puzStart, puzEnd, pageStart, pageEnd) => {
            const gridImages = new Array(total);
            const solutionImages = new Array(total);
            const calendarImages = new Array(total);
            const pageCalendarImages = new Array(totalPages);
            for (let i = puzStart; i < puzEnd; i++) {
                gridImages[i] = await blobToDataUrl(gridBlobs[i]);
                if (solutionsInMainZ && solBlobs[i]) solutionImages[i] = await blobToDataUrl(solBlobs[i]);
                if (calBlobs[i]) calendarImages[i] = await blobToDataUrl(calBlobs[i]);
            }
            for (let p = pageStart; p < pageEnd; p++) {
                if (pageCalBlobs[p]) pageCalendarImages[p] = await blobToDataUrl(pageCalBlobs[p]);
            }
            return { gridImages, solutionImages, calendarImages, pageCalendarImages };
        };

        const canvaCommon = {
            puzzles: fullPuzzles,
            includeSolutionInSameExcel: solutionsInMainZ,
            solutionImageMode: imageModeZ,
            skipSeparateSolutions: true,
            numberOffset: startNumberZ - 1,
            dateStrings: state.dateEnabled ? dateStrings : [],
            hasCalendarImages: state.dateEnabled && state.dateMode === "calendar_image",
            imageBatchProvider: zipImageBatchProvider,
            batchSize,
            pageAspect: pageAspectZ
        };

        const canvaResult = wsMode
            ? await buildCanvaWordSearchExcel({
                ...canvaCommon,
                puzzlesPerPage: pppZ,
                solutionsPerPage: answersZ,
                dateScope: state.dateScope,
                pageDateStrings: state.dateEnabled ? pageDateStrings : []
            })
            : await buildCanvaSudokuExcel({
                ...canvaCommon,
                puzzlesPerPage: pppZ,
                solutionsPerPage: answersZ,
                dateScope: state.dateScope,
                pageDateStrings: state.dateEnabled ? pageDateStrings : []
            });

        if (separateSolutionsZ) {
            const solFiles = await buildSeparateSolutionFiles(fullPuzzles, {
                imageMode: imageModeZ, answers: answersZ, batchSize,
                startNumber: startNumberZ, mode: state.mode, pageAspect: pageAspectZ,
                solutionGridProvider: imageModeZ === "per_grid"
                    ? async (a, b) => {
                        const out = [];
                        for (let i = a; i < b; i++) out.push(await blobToDataUrl(solBlobs[i]));
                        return out;
                    }
                    : null,
                onProgress: pct => setProgress(72 + Math.round(pct * 0.06), `Rendering answer pages: ${pct}%...`)
            });
            canvaResult.files.push(...solFiles);
            canvaResult.isSplit = canvaResult.files.length > 1;
        }

        if (canvaResult.files.length > 1) {
            const canvaFolder = zip.folder("canva_batches");
            canvaResult.files.forEach(f => {
                canvaFolder.file(f.filename, f.buffer);
            });
            const instructions = generateCanvaInstructions({
                mode: state.mode,
                totalPages: canvaResult.totalPages,
                batchSize: batchSize || 100,
                numBatches: canvaResult.totalBatches,
                puzzlesPerPage: pppZ
            });
            canvaFolder.file("CANVA_BULK_CREATE_INSTRUCTIONS.txt", instructions);
        } else {
            zip.file(canvaResult.files[0].filename, canvaResult.files[0].buffer);
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
        showToast(`ZIP generation failed: ${err.message}`);
    }
}

// Bootstrap
window.addEventListener("DOMContentLoaded", () => {
    dom.themeToggleBtn.setAttribute("aria-pressed", String(state.theme === "dark"));
    dom.themeToggleBtn.setAttribute("aria-label", state.theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    if (state.theme === "dark") {
        document.documentElement.setAttribute("data-theme", "dark");
        dom.themeToggleBtn.textContent = "☀️";
    }

    if (dom.wsWordListInput) {
        dom.wsWordListInput.value = state.wsRawText;
    }
    if (dom.wsThemeInput) {
        dom.wsThemeInput.value = state.wsThemeInput;
    }

    if (dom.previewWrapper) {
        dom.previewWrapper.style.maxWidth = "480px";
    }

    populateDateFormats();
    populateCalendarThemes();
    updateWsLanguage(state.wsLanguage);
    updateWsSummaryCard();
    updateWsCapacityCard();
    syncSolutionPerPageLock("sdk");
    syncSolutionPerPageLock("ws");
    setupEvents();
    setupWorkflow(state, refreshStudio);
    setStudioMode(state.mode);
    document.fonts.ready.then(refreshStudio);
});
