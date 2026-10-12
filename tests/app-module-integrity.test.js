import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('app.js imports only valid exports from internal modules', async () => {
    const appJs = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

    // Extract import statements of form: import { ... } from "./file.js?v=..."
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/([^"'?]+)(?:\?v=[^"']*)?["']/g;
    let match;
    let count = 0;

    while ((match = importRegex.exec(appJs)) !== null) {
        const identifiers = match[1].split(',').map(s => s.trim()).filter(Boolean);
        const moduleRelPath = match[2];
        const moduleObj = await import(`../js/${moduleRelPath}`);

        for (const id of identifiers) {
            count++;
            assert.ok(
                id in moduleObj,
                `Expected "${id}" to be exported by js/${moduleRelPath}, but it was undefined.`
            );
            assert.notEqual(
                moduleObj[id],
                undefined,
                `Expected "${id}" in js/${moduleRelPath} to not be undefined.`
            );
        }
    }

    assert.ok(count > 10, 'Expected multiple imported identifiers to be verified');
});

test('buildPerGridSolutionWorkbooks is exported as a function by excel_exporter.js', async () => {
    const excelExporter = await import('../js/excel_exporter.js');
    assert.equal(typeof excelExporter.buildPerGridSolutionWorkbooks, 'function');
});

test('index.html and app.js use synchronized cache-busting version parameters', () => {
    const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const appJs = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

    const appScriptMatch = indexHtml.match(/src="js\/app\.js\?v=([^"]+)"/);
    assert.ok(appScriptMatch, 'index.html must load app.js with a ?v= version query parameter');
    const version = appScriptMatch[1];

    // Verify all module imports in app.js match this version
    const importVersions = [...appJs.matchAll(/from\s*["']\.\/[^"']+\?v=([^"']+)["']/g)].map(m => m[1]);
    assert.ok(importVersions.length > 0, 'app.js imports must have ?v= query parameter');
    for (const v of importVersions) {
        assert.equal(v, version, `Import version in app.js (${v}) should match index.html version (${version})`);
    }
});

test('index.html tab panels match workflow.js step sequence order', () => {
    const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const panelMatches = [...indexHtml.matchAll(/class="tab-panel[^"]*"\s+id="([^"]+)"/g)].map(m => m[1]);
    assert.deepEqual(panelMatches, ['tab-volume', 'tab-rules', 'tab-styling', 'tab-review']);
});

test('Advanced puzzle settings details elements are open by default', () => {
    const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const advancedMatches = [...indexHtml.matchAll(/<details\s+class="advanced"([^>]*)>\s*<summary>Advanced puzzle settings<\/summary>/g)];
    assert.equal(advancedMatches.length, 2, 'Expected 2 Advanced puzzle settings details elements');
    for (const match of advancedMatches) {
        assert.ok(match[1].includes('open'), 'Expected details element to have open attribute');
    }

    // All details.advanced sections across all 4 steps should be open by default
    const allDetails = [...indexHtml.matchAll(/<details\s+class="advanced"([^>]*)>/g)];
    assert.ok(allDetails.length >= 6, 'Expected multiple details.advanced sections across steps');
    for (const match of allDetails) {
        assert.ok(match[1].includes('open'), 'Every details.advanced section must be open by default');
    }
});

test('Font dropdowns categorize commercial-free fonts for Kids, Senior, Adult, and Technical', () => {
    const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    assert.ok(indexHtml.includes('Kids &amp; Activity (Friendly &amp; Rounded)'), 'Expected Kids & Activity font category');
    assert.ok(indexHtml.includes('Senior &amp; Large Print (High Legibility)'), 'Expected Senior & Large Print font category');
    assert.ok(indexHtml.includes('Adult &amp; Classic Editorial'), 'Expected Adult & Classic Editorial font category');
    assert.ok(indexHtml.includes('Technical &amp; Monospace'), 'Expected Technical & Monospace font category');
});

test('parseWordSearchCsv handles simple and themed CSV modes explicitly', async () => {
    const { parseWordSearchCsv } = await import('../js/wordsearch_engine.js');

    const simpleCsv = 'word\nAPPLE\nBANANA\nCHERRY\nORANGE\nGRAPE\nLEMON';
    const simpleRes = parseWordSearchCsv(simpleCsv, 'Fruits', 'English', 'Standard Book Mode', 'simple');
    assert.deepEqual(Object.keys(simpleRes), ['Fruits']);
    assert.equal(simpleRes.Fruits.length, 6);

    const themedCsv = 'theme,word\nSpace,PLANET\nSpace,ROCKET\nOcean,WHALE\nOcean,CORAL';
    const themedRes = parseWordSearchCsv(themedCsv, 'General', 'English', 'Standard Book Mode', 'themed');
    assert.deepEqual(Object.keys(themedRes), ['Space', 'Ocean']);
    assert.equal(themedRes.Space.length, 2);
    assert.equal(themedRes.Ocean.length, 2);
});

test('buildCanvaWordSearchExcel supports 2 games per page with separate word banks and linked solutions', async () => {
    const prevWindow = globalThis.window;
    const addedRows = [];
    let definedCols = [];
    globalThis.window = {
        ExcelJS: {
            Workbook: class {
                constructor() {
                    this.xlsx = { writeBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
                }
                addImage() { return 1; }
                addWorksheet() {
                    return {
                        set columns(c) { definedCols = c; },
                        get columns() { return definedCols; },
                        getRow: () => ({}),
                        addRow: (r) => { addedRows.push(r); return {}; },
                        addImage: () => {}
                    };
                }
            }
        }
    };
    try {
        const { buildCanvaWordSearchExcel } = await import('../js/excel_exporter.js');
        const puzzles = [
            { title: 'Animals #1', difficultyLabel: 'EASY', placedWords: ['CAT', 'DOG', 'BIRD'], grid: [['C','A','T']] },
            { title: 'Animals #2', difficultyLabel: 'EASY', placedWords: ['LION', 'TIGER', 'BEAR'], grid: [['L','I','O']] },
            { title: 'Animals #3', difficultyLabel: 'EASY', placedWords: ['WOLF', 'FOX', 'DEER'], grid: [['W','O','L']] },
            { title: 'Animals #4', difficultyLabel: 'EASY', placedWords: ['FROG', 'TOAD', 'NEWT'], grid: [['F','R','O']] }
        ];

        const res = await buildCanvaWordSearchExcel({
            puzzles,
            puzzlesPerPage: 2,
            solutionsPerPage: 2,
            includeSolutionInSameExcel: true,
            skipSeparateSolutions: true,
            dateScope: 'per_page',
            pageDateStrings: ['Jan 1, 2026', 'Jan 2, 2026'],
            gridImages: ['data:image/png;base64,AAA', 'data:image/png;base64,AAA', 'data:image/png;base64,AAA', 'data:image/png;base64,AAA'],
            solutionImages: ['data:image/png;base64,BBB', 'data:image/png;base64,BBB', 'data:image/png;base64,BBB', 'data:image/png;base64,BBB']
        });

        assert.equal(res.totalPages, 2, '4 puzzles at 2 games per page should produce 2 pages');
        assert.equal(addedRows.length, 2, 'Should write 2 page rows to Canva Bulk sheet');
        assert.equal(addedRows[0].puzzle_1_words_list, 'CAT, DOG, BIRD');
        assert.equal(addedRows[0].puzzle_2_words_list, 'LION, TIGER, BEAR');
        assert.equal(addedRows[0].date, 'Jan 1, 2026');
        const colKeys = definedCols.map(c => c.key);
        assert.ok(colKeys.includes('puzzle_1_solution') && colKeys.includes('puzzle_2_solution'), 'Linked solutions should appear in the same row for both games on the page');
    } finally {
        globalThis.window = prevWindow;
    }
});

test('All puzzle presets and solution markers are strictly Black & White with light gray solution markers', async () => {
    const { SUDOKU_PRESETS, WS_PRESETS, WORDSEARCH_HIGHLIGHT_COLORS } = await import('../js/canvas_renderer.js');
    const { CALENDAR_THEMES } = await import('../js/calendar_builder.js');

    const isGrayscaleHex = (hex) => {
        const m = /^#([0-9a-fA-F]{2})([0-9a-fA-F]{2})([0-9a-fA-F]{2})$/.exec(hex);
        if (!m) return false;
        return m[1].toLowerCase() === m[2].toLowerCase() && m[2].toLowerCase() === m[3].toLowerCase();
    };

    for (const [key, preset] of Object.entries(SUDOKU_PRESETS)) {
        assert.ok(isGrayscaleHex(preset.gridColor), `Sudoku preset ${key} gridColor (${preset.gridColor}) must be B&W grayscale`);
        assert.ok(isGrayscaleHex(preset.shadingColor), `Sudoku preset ${key} shadingColor (${preset.shadingColor}) must be B&W grayscale`);
        assert.ok(isGrayscaleHex(preset.clueColor), `Sudoku preset ${key} clueColor (${preset.clueColor}) must be B&W grayscale`);
        assert.ok(isGrayscaleHex(preset.solutionColor), `Sudoku preset ${key} solutionColor (${preset.solutionColor}) must be B&W grayscale`);
    }

    for (const [key, preset] of Object.entries(WS_PRESETS)) {
        assert.ok(isGrayscaleHex(preset.gridLineColor), `WS preset ${key} gridLineColor (${preset.gridLineColor}) must be B&W grayscale`);
        assert.ok(isGrayscaleHex(preset.letterColor), `WS preset ${key} letterColor (${preset.letterColor}) must be B&W grayscale`);
    }

    for (const color of WORDSEARCH_HIGHLIGHT_COLORS) {
        assert.match(color, /^rgba\(0,\s*0,\s*0,\s*0\.\d+\)$/, `Word Search solution marker (${color}) must be light gray B&W`);
    }

    for (const [themeName, thm] of Object.entries(CALENDAR_THEMES)) {
        assert.ok(isGrayscaleHex(thm.headerColor), `Calendar theme ${themeName} headerColor must be B&W grayscale`);
        assert.ok(isGrayscaleHex(thm.badgeColor), `Calendar theme ${themeName} badgeColor must be B&W grayscale`);
    }
});



