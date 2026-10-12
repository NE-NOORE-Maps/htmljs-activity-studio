/**
 * Canva Bulk Create Excel Workbook Builder
 * Generates ready-to-import Excel files matching Canva's Bulk Create specifications.
 * Uses ExcelJS to embed REAL floating images anchored into the cells for 1-click Canva mapping.
 * Falls back to SheetJS if images are not provided.
 *
 * Supports Canva batch splitting (e.g. 100 pages per batch) so large books (300+, 365, 1460 pages)
 * seamlessly bypass Canva's 100-page bulk create design limit.
 */


// One image represents the finished answer page, matching the older app's
// embedded-picture export while preserving multi-solution page composition.
export async function buildSolutionPageWorkbooks({
    puzzles = [], solutionPageImages = [], solutionsPerPage = 4,
    batchSize = 100, mode = 'wordsearch', pageAspect = 11 / 8.5,
    pageOffset = 0, puzzleNumberOffset = 0
} = {}) {
    if (!window.ExcelJS?.Workbook) throw new Error('Image embedding library unavailable. Reload and retry.');
    if (!Number.isInteger(solutionsPerPage) || solutionsPerPage < 1 || solutionsPerPage > 9)
        throw new Error('Choose between 1 and 9 answers per page.');
    const totalPages = Math.ceil(puzzles.length / solutionsPerPage);
    if (!totalPages || solutionPageImages.length !== totalPages || solutionPageImages.some(image => !image))
        throw new Error('A rendered answer page is missing. Retry the export.');
    const size = batchSize > 0 ? Math.floor(batchSize) : totalPages;
    const files = [];
    for (let start = 0; start < totalPages; start += size) {
        const end = Math.min(start + size, totalPages);
        const wb = new window.ExcelJS.Workbook();
        const sheet = wb.addWorksheet('Solution Pages');
        sheet.columns = [
            {header:'page_number',key:'page_number',width:16},
            {header:'puzzle_numbers',key:'puzzle_numbers',width:26},
            {header:'solution_count',key:'solution_count',width:18},
            {header:'solution_page_image',key:'solution_page_image',width:34}
        ];
        sheet.getRow(1).font = {bold:true};
        sheet.views = [{state:'frozen',ySplit:1}];
        for (let page = start; page < end; page++) {
            const first = page * solutionsPerPage;
            const numbers = puzzles.slice(first, first + solutionsPerPage).map((_,i)=>first+i+1+puzzleNumberOffset);
            const row = sheet.addRow({page_number:page+1+pageOffset,puzzle_numbers:numbers.join(', '),solution_count:numbers.length});
            row.height = 180;
            const image = wb.addImage({base64:cleanBase64(solutionPageImages[page]),extension:'png'});
            sheet.addImage(image,{tl:{col:3.08,row:page-start+1.05},
                ext:{width:140,height:Math.min(220,140*pageAspect)},editAs:'oneCell'});
        }
        files.push({filename:`${mode}_solution_pages_${pageOffset+start+1}-${pageOffset+end}.xlsx`,
            buffer:await wb.xlsx.writeBuffer(),pageStart:pageOffset+start+1,pageEnd:pageOffset+end,rowCount:end-start});
    }
    return {files,isSplit:files.length>1,totalBatches:files.length,totalPages};
}

// A row represents one answer page; each slot contains its own embedded PNG.
// solutionImageMode: 'per_grid' (one PNG per solution) or 'per_page' (one
// composed PNG per answer page, using Answers per page).
async function appendSeparateSolutions(result, options, mode) {
    if (options.skipSeparateSolutions) return result;
    const imageMode = options.solutionImageMode === 'per_page' ? 'per_page' : 'per_grid';
    if (imageMode === 'per_grid' && options.includeSolutionInSameExcel !== false) return result;
    const pages = imageMode === 'per_page'
        ? await buildSolutionPageWorkbooks({ ...options, mode })
        : await buildPerGridSolutionWorkbooks({ ...options, mode });
    result.files.push(...pages.files);
    result.isSplit = result.files.length > 1;
    return result;
}

// Per-grid ("img by img") solution workbook: one row per answer page, each slot
// holding its own embedded solution PNG. Used when the user picks one-image-per-grid.
export async function buildPerGridSolutionWorkbooks({
    puzzles = [], solutionImages = [], solutionsPerPage = 4,
    batchSize = 100, mode = 'wordsearch',
    pageOffset = 0, puzzleNumberOffset = 0
} = {}) {
    if (!window.ExcelJS?.Workbook) throw new Error('Image embedding library unavailable. Reload and retry.');
    if (!Number.isInteger(solutionsPerPage) || solutionsPerPage < 1 || solutionsPerPage > 9)
        throw new Error("Choose between 1 and 9 answers per page.");
    if (solutionImages.length !== puzzles.length || solutionImages.some(image => !image))
        throw new Error("Solution images are missing. Retry the export to embed every answer.");
    const totalPages = Math.ceil(puzzles.length / solutionsPerPage);
    const size = batchSize > 0 ? batchSize : totalPages;
    const files = [];
    for (let start = 0; start < totalPages; start += size) {
        const end = Math.min(start + size, totalPages);
        const wb = new window.ExcelJS.Workbook();
        const ws = wb.addWorksheet("Solution Pages");
        ws.columns = [{header:"page_number",key:"page_number",width:16},
            ...Array.from({length:solutionsPerPage}, (_,i) => [
                {header:`solution_${i+1}_number`,key:`solution_${i+1}_number`,width:18},
                {header:`solution_${i+1}_title`,key:`solution_${i+1}_title`,width:26},
                {header:`solution_${i+1}_image`,key:`solution_${i+1}_image`,width:26}
            ]).flat()];
        ws.getRow(1).font = {bold:true};
        ws.views = [{state:"frozen",ySplit:1}];
        for (let page = start; page < end; page++) {
            const data = {page_number:page+1+pageOffset};
            for (let slot=0; slot<solutionsPerPage; slot++) {
                const index=page*solutionsPerPage+slot;
                if (index>=puzzles.length) break;
                const num=index+1+puzzleNumberOffset;
                data[`solution_${slot+1}_number`]=num;
                data[`solution_${slot+1}_title`]=puzzles[index].title || `Puzzle ${num}`;
            }
            ws.addRow(data).height=150;
            for (let slot=0; slot<solutionsPerPage; slot++) {
                const index=page*solutionsPerPage+slot;
                if (index>=puzzles.length) break;
                const image=wb.addImage({base64:cleanBase64(solutionImages[index]),extension:"png"});
                ws.addImage(image,{tl:{col:3+slot*3+0.08,row:page-start+1.05},ext:{width:140,height:140},editAs:"oneCell"});
            }
        }
        files.push({filename:`${mode}_solutions_pages_${start+1+pageOffset}-${end+pageOffset}.xlsx`,
            buffer:await wb.xlsx.writeBuffer(),pageStart:start+1+pageOffset,pageEnd:end+pageOffset,rowCount:end-start});
    }
    return {files,isSplit:files.length>1,totalBatches:files.length,totalPages};
}

function cleanBase64(dataUrl) {
    if (!dataUrl) return "";
    return dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
}

/**
 * Generate human-readable, step-by-step instructions for Canva Bulk Create.
 */
export function generateCanvaInstructions({ mode = "sudoku", totalPages = 100, batchSize = 100, numBatches = 1, puzzlesPerPage = 1 } = {}) {
    const modeName = mode === "sudoku" ? "Sudoku" : "Word Search";
    const batchLines = [];
    for (let i = 0; i < numBatches; i++) {
        const s = i * batchSize + 1;
        const e = Math.min(totalPages, (i + 1) * batchSize);
        const bStr = String(i + 1).padStart(2, "0");
        batchLines.push(`  • Batch ${bStr}: Pages ${s} to ${e} (${e - s + 1} pages)`);
    }

    return `===================================================================
CANVA BULK CREATE - BATCH IMPORT GUIDE
${modeName} Activity Book (${totalPages} Total Pages)
===================================================================

SEPARATE SOLUTION WORKBOOKS
When separate solutions are selected, *_solutions_pages_*.xlsx files
contain the answer pages. Import these separately from puzzle workbooks.
Each row is one complete answer page. Connect solution_page_image to
one image frame on your answer-page template. The page image already
contains the selected number of solved grids and their puzzle labels.
The final page may contain fewer solutions. PNGs are embedded drawing
objects in the Excel workbook; image import support depends on the app.
The Solution pages only button downloads this image workbook directly.

WHY ARE THERE MULTIPLE PUZZLE BATCH FILES IN THIS ZIP?
Canva has a strict design limit (typically 100 pages per project/document).
Attempting to generate 300+ pages in a single Canva design causes Canva
to limit generation or fail.

Your book has been automatically divided into ${numBatches} ordered,
ready-to-import batches of up to ${batchSize} pages each:

INCLUDED BATCH FILES:
${batchLines.join("\n")}

STEP-BY-STEP INSTRUCTIONS FOR CANVA:

1. OPEN YOUR CANVA DESIGN:
   - Create your page layout (e.g. 8.5 x 11 in).
   - Place your text boxes (Title, Puzzle #, Date) and image frames for the puzzle.

2. OPEN BULK CREATE:
   - In Canva's left sidebar, click "Apps".
   - Search for "Bulk Create".
   - Click "Upload CSV / Excel".

3. UPLOAD BATCH 01:
   - Select the first batch file (*_batch_01_pages_...).
   - Right-click elements on your template to connect data:
     * Connect Title -> {title} (or {puzzle_1_title})
     * Connect Image Frame -> {grid_image} (or {puzzle_1_image})
     * Connect Solution Frame -> {solution_image} (if solutions included)
     * Connect Date -> {date}
   - Click "Continue" -> "Generate Pages". Canva will generate your first batch!

4. REPEAT FOR REMAINING BATCHES:
   - Duplicate your Canva design template or start a new project for Batch 02.
   - Upload Batch 02, generate pages, and repeat for all ${numBatches} batches.

5. FINAL ASSEMBLY:
   - Export each batch as "PDF Print" from Canva and merge them,
     or use the 1-click "KDP Print PDF" option directly in the Studio!
===================================================================
Generated by KDP Activity Studio
===================================================================`;
}

export async function buildCanvaSudokuExcel(options = {}) {
    const { gridImages = [], imageBatchProvider = null } = options;
    if (typeof window.ExcelJS !== "undefined" && (imageBatchProvider || (gridImages && gridImages.length > 0))) {
        return await appendSeparateSolutions(await buildCanvaSudokuExcelJS(options), options, "sudoku");
    }
    if (gridImages.length) throw new Error("Image embedding library unavailable. Reload and retry the export.");
    return buildCanvaSudokuSheetJS(options);
}

/**
 * ExcelJS implementation with automatic batch splitting.
 */
async function buildCanvaSudokuExcelJS(options = {}) {
    const {
        puzzles = [],
        puzzlesPerPage = 1,
        batchSize = 100,
        imageBatchProvider = null
    } = options;

    const totalPuzzles = puzzles.length;
    const totalPages = (puzzlesPerPage === 1) ? totalPuzzles : Math.ceil(totalPuzzles / puzzlesPerPage);
    const effectiveBatchSize = (batchSize && batchSize > 0) ? batchSize : totalPages;
    const numBatches = Math.ceil(totalPages / effectiveBatchSize);
    const padLen = String(totalPages).length > 2 ? String(totalPages).length : 2;
    const pad = (n) => String(n).padStart(padLen, "0");

    const files = [];
    for (let b = 0; b < numBatches; b++) {
        const startPage = b * effectiveBatchSize;
        const endPage = Math.min(totalPages, (b + 1) * effectiveBatchSize);
        let batchImageOpts = options;
        if (imageBatchProvider) {
            const puzStart = startPage * puzzlesPerPage;
            const puzEnd = Math.min(totalPuzzles, endPage * puzzlesPerPage);
            batchImageOpts = { ...options, ...(await imageBatchProvider(puzStart, puzEnd, startPage, endPage)) };
        }
        const wb = createSingleSudokuBatchExcelJS({
            ...batchImageOpts,
            startPage,
            endPage,
            totalPages
        });
        const buffer = await wb.xlsx.writeBuffer();
        const batchNumStr = String(b + 1).padStart(2, "0");
        const filename = (numBatches > 1)
            ? `sudoku_canva_batch_${batchNumStr}_pages_${pad(startPage + 1)}-${pad(endPage)}.xlsx`
            : "sudoku_canva_bulk.xlsx";

        files.push({
            filename,
            buffer,
            batchNum: b + 1,
            pageStart: startPage + 1,
            pageEnd: endPage,
            rowCount: endPage - startPage
        });
    }

    return {
        isSplit: numBatches > 1,
        files,
        totalBatches: numBatches,
        totalPages
    };
}

function createSingleSudokuBatchExcelJS({
    puzzles = [],
    puzzlesPerPage = 1,
    includeSolutionInSameExcel = true,
    dateScope = "per_game",
    dateStrings = [],
    pageDateStrings = [],
    hasCalendarImages = false,
    gridImages = [],
    solutionImages = [],
    calendarImages = [],
    pageCalendarImages = [],
    startPage = 0,
    endPage = 0,
    totalPages = 0,
    numberOffset = 0
} = {}) {
    const wb = new window.ExcelJS.Workbook();
    const ws = wb.addWorksheet("Bulk Create");
    const totalPuzzles = puzzles.length;

    if (puzzlesPerPage === 1) {
        const cols = [
            { header: "title", key: "title", width: 22 },
            { header: "puzzle_number", key: "puzzle_number", width: 16 },
            { header: "difficulty", key: "difficulty", width: 16 },
            { header: "difficulty_stars", key: "difficulty_stars", width: 18 },
            { header: "instructions", key: "instructions", width: 36 }
        ];

        let dateColIdx = -1;
        if (dateStrings && dateStrings.length > 0) {
            cols.push({ header: "date", key: "date", width: 22 });
            dateColIdx = cols.length - 1;
        }

        cols.push({ header: "grid_image", key: "grid_image", width: 32 });
        const gridColIdx = cols.length - 1;

        let calColIdx = -1;
        if (hasCalendarImages) {
            cols.push({ header: "calendar_image", key: "calendar_image", width: 28 });
            calColIdx = cols.length - 1;
        }

        let solColIdx = -1;
        if (includeSolutionInSameExcel) {
            cols.push({ header: "solution_image", key: "solution_image", width: 32 });
            solColIdx = cols.length - 1;
        }

        if (puzzles[0] && puzzles[0].wordokuWord) {
            cols.push({ header: "wordoku_anagram", key: "wordoku_anagram", width: 20 });
        }

        ws.columns = cols;

        const hRow = ws.getRow(1);
        hRow.height = 26;
        hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        hRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184534" }
        };
        hRow.alignment = { vertical: "middle", horizontal: "center" };

        for (let i = startPage; i < endPage; i++) {
            const p = puzzles[i];
            const pNum = i + 1 + numberOffset;
            const rowNumber = (i - startPage) + 2;

            const rowData = {
                title: p.title,
                puzzle_number: pNum,
                difficulty: p.difficultyLabel,
                difficulty_stars: p.difficultyStars,
                instructions: "Fill in the grid so every row, column, and block contains each number exactly once."
            };

            if (dateColIdx !== -1 && dateStrings[i]) {
                rowData.date = dateStrings[i];
            }

            if (p.wordokuWord) {
                rowData.wordoku_anagram = p.wordokuWord;
            }

            const row = ws.addRow(rowData);
            row.height = 150;
            row.alignment = { vertical: "middle", horizontal: "center" };

            if (gridImages[i]) {
                const imgId = wb.addImage({
                    base64: cleanBase64(gridImages[i]),
                    extension: "png"
                });
                ws.addImage(imgId, {
                    tl: { col: gridColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                    ext: { width: 140, height: 140 },
                    editAs: "oneCell"
                });
            }

            if (calColIdx !== -1 && calendarImages[i]) {
                const calId = wb.addImage({
                    base64: cleanBase64(calendarImages[i]),
                    extension: "png"
                });
                ws.addImage(calId, {
                    tl: { col: calColIdx + 0.08, row: rowNumber - 1 + 0.15 },
                    ext: { width: 140, height: 110 },
                    editAs: "oneCell"
                });
            }

            if (solColIdx !== -1 && solutionImages[i]) {
                const solId = wb.addImage({
                    base64: cleanBase64(solutionImages[i]),
                    extension: "png"
                });
                ws.addImage(solId, {
                    tl: { col: solColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                    ext: { width: 140, height: 140 },
                    editAs: "oneCell"
                });
            }
        }

    } else if (dateScope === "per_page") {
        const cols = [{ header: "page_number", key: "page_number", width: 14 }];

        let dateColIdx = -1;
        if (pageDateStrings && pageDateStrings.length > 0) {
            cols.push({ header: "date", key: "date", width: 22 });
            dateColIdx = cols.length - 1;
        }

        let calColIdx = -1;
        if (hasCalendarImages) {
            cols.push({ header: "calendar_image", key: "calendar_image", width: 28 });
            calColIdx = cols.length - 1;
        }

        const slotColMap = [];

        for (let slot = 0; slot < puzzlesPerPage; slot++) {
            const slotNum = slot + 1;
            const slotInfo = {};

            cols.push({ header: `puzzle_${slotNum}_title`, key: `puzzle_${slotNum}_title`, width: 22 });
            cols.push({ header: `puzzle_${slotNum}_difficulty`, key: `puzzle_${slotNum}_difficulty`, width: 16 });

            cols.push({ header: `puzzle_${slotNum}_image`, key: `puzzle_${slotNum}_image`, width: 32 });
            slotInfo.gridColIdx = cols.length - 1;

            if (includeSolutionInSameExcel) {
                cols.push({ header: `puzzle_${slotNum}_solution`, key: `puzzle_${slotNum}_solution`, width: 32 });
                slotInfo.solColIdx = cols.length - 1;
            }

            slotColMap.push(slotInfo);
        }

        ws.columns = cols;

        const hRow = ws.getRow(1);
        hRow.height = 26;
        hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        hRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184534" }
        };
        hRow.alignment = { vertical: "middle", horizontal: "center" };

        for (let pageIdx = startPage; pageIdx < endPage; pageIdx++) {
            const rowNumber = (pageIdx - startPage) + 2;
            const rowData = { page_number: pageIdx + 1 };

            if (dateColIdx !== -1 && pageDateStrings && pageDateStrings[pageIdx]) {
                rowData.date = pageDateStrings[pageIdx];
            }

            for (let slot = 0; slot < puzzlesPerPage; slot++) {
                const pIdx = pageIdx * puzzlesPerPage + slot;
                const slotNum = slot + 1;

                if (pIdx < totalPuzzles) {
                    const p = puzzles[pIdx];
                    rowData[`puzzle_${slotNum}_title`] = p.title;
                    rowData[`puzzle_${slotNum}_difficulty`] = p.difficultyLabel;
                }
            }

            const row = ws.addRow(rowData);
            row.height = 150;
            row.alignment = { vertical: "middle", horizontal: "center" };

            if (calColIdx !== -1 && pageCalendarImages && pageCalendarImages[pageIdx]) {
                const calId = wb.addImage({
                    base64: cleanBase64(pageCalendarImages[pageIdx]),
                    extension: "png"
                });
                ws.addImage(calId, {
                    tl: { col: calColIdx + 0.08, row: rowNumber - 1 + 0.15 },
                    ext: { width: 140, height: 110 },
                    editAs: "oneCell"
                });
            }

            for (let slot = 0; slot < puzzlesPerPage; slot++) {
                const pIdx = pageIdx * puzzlesPerPage + slot;
                if (pIdx < totalPuzzles) {
                    const slotInfo = slotColMap[slot];

                    if (gridImages[pIdx]) {
                        const imgId = wb.addImage({
                            base64: cleanBase64(gridImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(imgId, {
                            tl: { col: slotInfo.gridColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                            ext: { width: 140, height: 140 },
                            editAs: "oneCell"
                        });
                    }

                    if (slotInfo.solColIdx !== undefined && solutionImages[pIdx]) {
                        const solId = wb.addImage({
                            base64: cleanBase64(solutionImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(solId, {
                            tl: { col: slotInfo.solColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                            ext: { width: 140, height: 140 },
                            editAs: "oneCell"
                        });
                    }
                }
            }
        }

    } else {
        const cols = [{ header: "page_number", key: "page_number", width: 14 }];
        const slotColMap = [];

        for (let slot = 0; slot < puzzlesPerPage; slot++) {
            const slotNum = slot + 1;
            const slotInfo = {};

            cols.push({ header: `puzzle_${slotNum}_title`, key: `puzzle_${slotNum}_title`, width: 22 });
            cols.push({ header: `puzzle_${slotNum}_difficulty`, key: `puzzle_${slotNum}_difficulty`, width: 16 });

            if (dateStrings && dateStrings.length > 0) {
                cols.push({ header: `puzzle_${slotNum}_date`, key: `puzzle_${slotNum}_date`, width: 20 });
            }

            cols.push({ header: `puzzle_${slotNum}_image`, key: `puzzle_${slotNum}_image`, width: 32 });
            slotInfo.gridColIdx = cols.length - 1;

            if (hasCalendarImages) {
                cols.push({ header: `puzzle_${slotNum}_calendar`, key: `puzzle_${slotNum}_calendar`, width: 28 });
                slotInfo.calColIdx = cols.length - 1;
            }

            if (includeSolutionInSameExcel) {
                cols.push({ header: `puzzle_${slotNum}_solution`, key: `puzzle_${slotNum}_solution`, width: 32 });
                slotInfo.solColIdx = cols.length - 1;
            }

            slotColMap.push(slotInfo);
        }

        ws.columns = cols;

        const hRow = ws.getRow(1);
        hRow.height = 26;
        hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        hRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184534" }
        };
        hRow.alignment = { vertical: "middle", horizontal: "center" };

        for (let pageIdx = startPage; pageIdx < endPage; pageIdx++) {
            const rowNumber = (pageIdx - startPage) + 2;
            const rowData = { page_number: pageIdx + 1 };

            for (let slot = 0; slot < puzzlesPerPage; slot++) {
                const pIdx = pageIdx * puzzlesPerPage + slot;
                const slotNum = slot + 1;

                if (pIdx < totalPuzzles) {
                    const p = puzzles[pIdx];
                    rowData[`puzzle_${slotNum}_title`] = p.title;
                    rowData[`puzzle_${slotNum}_difficulty`] = p.difficultyLabel;
                    if (dateStrings && dateStrings[pIdx]) {
                        rowData[`puzzle_${slotNum}_date`] = dateStrings[pIdx];
                    }
                }
            }

            const row = ws.addRow(rowData);
            row.height = 150;
            row.alignment = { vertical: "middle", horizontal: "center" };

            for (let slot = 0; slot < puzzlesPerPage; slot++) {
                const pIdx = pageIdx * puzzlesPerPage + slot;
                if (pIdx < totalPuzzles) {
                    const slotInfo = slotColMap[slot];

                    if (gridImages[pIdx]) {
                        const imgId = wb.addImage({
                            base64: cleanBase64(gridImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(imgId, {
                            tl: { col: slotInfo.gridColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                            ext: { width: 140, height: 140 },
                            editAs: "oneCell"
                        });
                    }

                    if (slotInfo.calColIdx !== undefined && calendarImages[pIdx]) {
                        const calId = wb.addImage({
                            base64: cleanBase64(calendarImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(calId, {
                            tl: { col: slotInfo.calColIdx + 0.08, row: rowNumber - 1 + 0.15 },
                            ext: { width: 140, height: 110 },
                            editAs: "oneCell"
                        });
                    }

                    if (slotInfo.solColIdx !== undefined && solutionImages[pIdx]) {
                        const solId = wb.addImage({
                            base64: cleanBase64(solutionImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(solId, {
                            tl: { col: slotInfo.solColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                            ext: { width: 140, height: 140 },
                            editAs: "oneCell"
                        });
                    }
                }
            }
        }
    }

    return wb;
}

/**
 * Fallback: SheetJS text-based Excel workbook.
 */
function buildCanvaSudokuSheetJS(options = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("Excel export library not loaded.");
    }

    const {
        puzzles = [],
        puzzlesPerPage = 1,
        includeSolutionInSameExcel = true,
        dateScope = "per_game",
        dateStrings = [],
        pageDateStrings = [],
        hasCalendarImages = false,
        batchSize = 100
    } = options;

    const totalPuzzles = puzzles.length;
    const totalPages = (puzzlesPerPage === 1) ? totalPuzzles : Math.ceil(totalPuzzles / puzzlesPerPage);
    const effectiveBatchSize = (batchSize && batchSize > 0) ? batchSize : totalPages;
    const numBatches = Math.ceil(totalPages / effectiveBatchSize);
    const padLen = String(totalPages).length > 2 ? String(totalPages).length : 2;
    const pad = (n) => String(n).padStart(padLen, "0");

    const files = [];

    for (let b = 0; b < numBatches; b++) {
        const startPage = b * effectiveBatchSize;
        const endPage = Math.min(totalPages, (b + 1) * effectiveBatchSize);
        const rows = [];

        if (puzzlesPerPage === 1) {
            for (let i = startPage; i < endPage; i++) {
                const p = puzzles[i];
                const pNum = i + 1;
                const pPad = String(pNum).padStart(3, "0");

                const row = {
                    title: p.title,
                    puzzle_number: pNum,
                    difficulty: p.difficultyLabel,
                    difficulty_stars: p.difficultyStars,
                    instructions: "Fill in the grid so every row, column, and block contains each number exactly once.",
                    grid_image: `page_${pPad}_grid.png`
                };

                if (dateStrings && dateStrings[i]) {
                    row.date = dateStrings[i];
                }

                if (hasCalendarImages) {
                    row.calendar_image = `page_${pPad}_calendar.png`;
                }

                if (includeSolutionInSameExcel) {
                    row.solution_image = `page_${pPad}_solution.png`;
                }

                if (p.wordokuWord) {
                    row.wordoku_anagram = p.wordokuWord;
                }

                rows.push(row);
            }
        } else if (dateScope === "per_page") {
            for (let pageIdx = startPage; pageIdx < endPage; pageIdx++) {
                const pagePad = String(pageIdx + 1).padStart(3, "0");
                const row = { page_number: pageIdx + 1 };

                if (pageDateStrings && pageDateStrings[pageIdx]) {
                    row.date = pageDateStrings[pageIdx];
                }

                if (hasCalendarImages) {
                    row.calendar_image = `page_${pagePad}_calendar.png`;
                }

                for (let slot = 0; slot < puzzlesPerPage; slot++) {
                    const pIdx = pageIdx * puzzlesPerPage + slot;
                    const slotNum = slot + 1;

                    if (pIdx < totalPuzzles) {
                        const p = puzzles[pIdx];
                        const pPad = String(pIdx + 1).padStart(3, "0");

                        row[`puzzle_${slotNum}_title`] = p.title;
                        row[`puzzle_${slotNum}_difficulty`] = p.difficultyLabel;
                        row[`puzzle_${slotNum}_image`] = `page_${pPad}_grid.png`;

                        if (includeSolutionInSameExcel) {
                            row[`puzzle_${slotNum}_solution`] = `page_${pPad}_solution.png`;
                        }
                    }
                }
                rows.push(row);
            }
        } else {
            for (let pageIdx = startPage; pageIdx < endPage; pageIdx++) {
                const row = { page_number: pageIdx + 1 };

                for (let slot = 0; slot < puzzlesPerPage; slot++) {
                    const pIdx = pageIdx * puzzlesPerPage + slot;
                    const slotNum = slot + 1;

                    if (pIdx < totalPuzzles) {
                        const p = puzzles[pIdx];
                        const pPad = String(pIdx + 1).padStart(3, "0");

                        row[`puzzle_${slotNum}_title`] = p.title;
                        row[`puzzle_${slotNum}_difficulty`] = p.difficultyLabel;
                        row[`puzzle_${slotNum}_image`] = `page_${pPad}_grid.png`;

                        if (includeSolutionInSameExcel) {
                            row[`puzzle_${slotNum}_solution`] = `page_${pPad}_solution.png`;
                        }

                        if (dateStrings && dateStrings[pIdx]) {
                            row[`puzzle_${slotNum}_date`] = dateStrings[pIdx];
                        }

                        if (hasCalendarImages) {
                            row[`puzzle_${slotNum}_calendar`] = `page_${pPad}_calendar.png`;
                        }
                    }
                }
                rows.push(row);
            }
        }

        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Canva_Bulk");
        const buffer = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const batchNumStr = String(b + 1).padStart(2, "0");
        const filename = (numBatches > 1)
            ? `sudoku_canva_batch_${batchNumStr}_pages_${pad(startPage + 1)}-${pad(endPage)}.xlsx`
            : "sudoku_canva_bulk.xlsx";

        files.push({
            filename,
            buffer,
            batchNum: b + 1,
            pageStart: startPage + 1,
            pageEnd: endPage,
            rowCount: endPage - startPage
        });
    }

    return {
        isSplit: numBatches > 1,
        files,
        totalBatches: numBatches,
        totalPages
    };
}

export function buildSolutionsOnlyExcel({
    puzzles = []
} = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("Excel export library not loaded.");
    }

    const rows = puzzles.map((p, i) => {
        const pNum = i + 1;
        const pPad = String(pNum).padStart(3, "0");
        return {
            puzzle_number: pNum,
            title: `Solution: ${p.title}`,
            difficulty: p.difficultyLabel,
            solution_image: `page_${pPad}_solution.png`
        };
    });

    const ws = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Solutions");

    return window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export async function buildCanvaWordSearchExcel(options = {}) {
    const { gridImages = [], imageBatchProvider = null } = options;
    if (typeof window.ExcelJS !== "undefined" && (imageBatchProvider || (gridImages && gridImages.length > 0))) {
        return await appendSeparateSolutions(await buildCanvaWordSearchExcelJS(options), options, "wordsearch");
    }
    if (gridImages.length) throw new Error("Image embedding library unavailable. Reload and retry the export.");
    return buildCanvaWordSearchSheetJS(options);
}

/**
 * ExcelJS implementation for Word Search with batch splitting.
 */
async function buildCanvaWordSearchExcelJS(options = {}) {
    const {
        puzzles = [],
        puzzlesPerPage = 1,
        batchSize = 100,
        imageBatchProvider = null
    } = options;

    const totalPuzzles = puzzles.length;
    const totalPages = (puzzlesPerPage === 1) ? totalPuzzles : Math.ceil(totalPuzzles / puzzlesPerPage);
    const effectiveBatchSize = (batchSize && batchSize > 0) ? batchSize : totalPages;
    const numBatches = Math.ceil(totalPages / effectiveBatchSize);
    const padLen = String(totalPages).length > 2 ? String(totalPages).length : 2;
    const pad = (n) => String(n).padStart(padLen, "0");

    const files = [];
    for (let b = 0; b < numBatches; b++) {
        const startPage = b * effectiveBatchSize;
        const endPage = Math.min(totalPages, (b + 1) * effectiveBatchSize);
        let batchImageOpts = options;
        if (imageBatchProvider) {
            const puzStart = startPage * puzzlesPerPage;
            const puzEnd = Math.min(totalPuzzles, endPage * puzzlesPerPage);
            batchImageOpts = { ...options, ...(await imageBatchProvider(puzStart, puzEnd, startPage, endPage)) };
        }
        const wb = createSingleWordSearchBatchExcelJS({
            ...batchImageOpts,
            startPage,
            endPage,
            totalPages
        });
        const buffer = await wb.xlsx.writeBuffer();
        const batchNumStr = String(b + 1).padStart(2, "0");
        const filename = (numBatches > 1)
            ? `wordsearch_canva_batch_${batchNumStr}_pages_${pad(startPage + 1)}-${pad(endPage)}.xlsx`
            : "wordsearch_canva_bulk.xlsx";

        files.push({
            filename,
            buffer,
            batchNum: b + 1,
            pageStart: startPage + 1,
            pageEnd: endPage,
            rowCount: endPage - startPage
        });
    }

    return {
        isSplit: numBatches > 1,
        files,
        totalBatches: numBatches,
        totalPages
    };
}

function createSingleWordSearchBatchExcelJS({
    puzzles = [],
    puzzlesPerPage = 1,
    includeSolutionInSameExcel = true,
    dateScope = "per_game",
    dateStrings = [],
    pageDateStrings = [],
    hasCalendarImages = false,
    gridImages = [],
    solutionImages = [],
    calendarImages = [],
    pageCalendarImages = [],
    startPage = 0,
    endPage = 0,
    totalPages = 0,
    numberOffset = 0
} = {}) {
    const wb = new window.ExcelJS.Workbook();
    const ws = wb.addWorksheet("Bulk Create");
    const totalPuzzles = puzzles.length;

    let maxWords = 0;
    puzzles.forEach(p => {
        if (p.placedWords && p.placedWords.length > maxWords) {
            maxWords = p.placedWords.length;
        }
    });

    if (puzzlesPerPage === 1) {
        const cols = [
            { header: "title", key: "title", width: 22 },
            { header: "puzzle_number", key: "puzzle_number", width: 16 },
            { header: "word_count", key: "word_count", width: 14 },
            { header: "words_list", key: "words_list", width: 45 }
        ];

        const activeDateStrings = (dateScope === "per_page" && pageDateStrings && pageDateStrings.length > 0)
            ? pageDateStrings
            : dateStrings;
        const activeCalendarImages = (dateScope === "per_page" && pageCalendarImages && pageCalendarImages.length > 0)
            ? pageCalendarImages
            : calendarImages;

        let dateColIdx = -1;
        if (activeDateStrings && activeDateStrings.length > 0) {
            cols.push({ header: "date", key: "date", width: 22 });
            dateColIdx = cols.length - 1;
        }

        cols.push({ header: "grid_image", key: "grid_image", width: 32 });
        const gridColIdx = cols.length - 1;

        let calColIdx = -1;
        if (hasCalendarImages) {
            cols.push({ header: "calendar_image", key: "calendar_image", width: 28 });
            calColIdx = cols.length - 1;
        }

        let solColIdx = -1;
        if (includeSolutionInSameExcel) {
            cols.push({ header: "solution_image", key: "solution_image", width: 32 });
            solColIdx = cols.length - 1;
        }

        for (let w = 1; w <= maxWords; w++) {
            cols.push({ header: `word_${w}`, key: `word_${w}`, width: 16 });
        }

        ws.columns = cols;

        const hRow = ws.getRow(1);
        hRow.height = 26;
        hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        hRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184534" }
        };
        hRow.alignment = { vertical: "middle", horizontal: "center" };

        for (let i = startPage; i < endPage; i++) {
            const p = puzzles[i];
            const pNum = i + 1 + numberOffset;
            const rowNumber = (i - startPage) + 2;

            const rowData = {
                title: p.title,
                puzzle_number: pNum,
                word_count: p.placedWords ? p.placedWords.length : 0,
                words_list: p.placedWords ? p.placedWords.join(", ") : ""
            };

            if (dateColIdx !== -1 && activeDateStrings[i]) {
                rowData.date = activeDateStrings[i];
            }

            if (p.placedWords) {
                p.placedWords.forEach((word, wIdx) => {
                    rowData[`word_${wIdx + 1}`] = word;
                });
            }

            const row = ws.addRow(rowData);
            row.height = 150;
            row.alignment = { vertical: "middle", horizontal: "center" };

            if (gridImages[i]) {
                const imgId = wb.addImage({
                    base64: cleanBase64(gridImages[i]),
                    extension: "png"
                });
                ws.addImage(imgId, {
                    tl: { col: gridColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                    ext: { width: 140, height: 140 },
                    editAs: "oneCell"
                });
            }

            if (calColIdx !== -1 && activeCalendarImages[i]) {
                const calId = wb.addImage({
                    base64: cleanBase64(activeCalendarImages[i]),
                    extension: "png"
                });
                ws.addImage(calId, {
                    tl: { col: calColIdx + 0.08, row: rowNumber - 1 + 0.15 },
                    ext: { width: 140, height: 110 },
                    editAs: "oneCell"
                });
            }

            if (solColIdx !== -1 && solutionImages[i]) {
                const solId = wb.addImage({
                    base64: cleanBase64(solutionImages[i]),
                    extension: "png"
                });
                ws.addImage(solId, {
                    tl: { col: solColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                    ext: { width: 140, height: 140 },
                    editAs: "oneCell"
                });
            }
        }
    } else {
        const cols = [{ header: "page_number", key: "page_number", width: 14 }];

        let pageDateColIdx = -1;
        let pageCalColIdx = -1;
        if (dateScope === "per_page") {
            if (pageDateStrings && pageDateStrings.length > 0) {
                cols.push({ header: "date", key: "date", width: 22 });
                pageDateColIdx = cols.length - 1;
            }
            if (hasCalendarImages) {
                cols.push({ header: "calendar_image", key: "calendar_image", width: 28 });
                pageCalColIdx = cols.length - 1;
            }
        }

        const slotColMap = [];
        const hasPerGameDates = dateScope !== "per_page" && dateStrings && dateStrings.length > 0;

        for (let slot = 0; slot < puzzlesPerPage; slot++) {
            const slotNum = slot + 1;
            const slotInfo = {};

            cols.push({ header: `puzzle_${slotNum}_title`, key: `puzzle_${slotNum}_title`, width: 22 });
            cols.push({ header: `puzzle_${slotNum}_number`, key: `puzzle_${slotNum}_number`, width: 16 });
            cols.push({ header: `puzzle_${slotNum}_word_count`, key: `puzzle_${slotNum}_word_count`, width: 16 });
            cols.push({ header: `puzzle_${slotNum}_words_list`, key: `puzzle_${slotNum}_words_list`, width: 42 });

            if (hasPerGameDates) {
                cols.push({ header: `puzzle_${slotNum}_date`, key: `puzzle_${slotNum}_date`, width: 22 });
                slotInfo.dateColIdx = cols.length - 1;
            }

            cols.push({ header: `puzzle_${slotNum}_image`, key: `puzzle_${slotNum}_image`, width: 32 });
            slotInfo.gridColIdx = cols.length - 1;

            if (dateScope !== "per_page" && hasCalendarImages) {
                cols.push({ header: `puzzle_${slotNum}_calendar`, key: `puzzle_${slotNum}_calendar`, width: 28 });
                slotInfo.calColIdx = cols.length - 1;
            }

            if (includeSolutionInSameExcel) {
                cols.push({ header: `puzzle_${slotNum}_solution`, key: `puzzle_${slotNum}_solution`, width: 32 });
                slotInfo.solColIdx = cols.length - 1;
            }

            for (let w = 1; w <= maxWords; w++) {
                cols.push({ header: `puzzle_${slotNum}_word_${w}`, key: `puzzle_${slotNum}_word_${w}`, width: 16 });
            }

            slotColMap.push(slotInfo);
        }

        ws.columns = cols;

        const hRow = ws.getRow(1);
        hRow.height = 26;
        hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        hRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184534" }
        };
        hRow.alignment = { vertical: "middle", horizontal: "center" };

        for (let pageIdx = startPage; pageIdx < endPage; pageIdx++) {
            const rowNumber = (pageIdx - startPage) + 2;
            const rowData = { page_number: pageIdx + 1 };

            if (pageDateColIdx !== -1 && pageDateStrings && pageDateStrings[pageIdx]) {
                rowData.date = pageDateStrings[pageIdx];
            }

            for (let slot = 0; slot < puzzlesPerPage; slot++) {
                const pIdx = pageIdx * puzzlesPerPage + slot;
                const slotNum = slot + 1;

                if (pIdx < totalPuzzles) {
                    const p = puzzles[pIdx];
                    const pNum = pIdx + 1 + numberOffset;
                    rowData[`puzzle_${slotNum}_title`] = p.title;
                    rowData[`puzzle_${slotNum}_number`] = pNum;
                    rowData[`puzzle_${slotNum}_word_count`] = p.placedWords ? p.placedWords.length : 0;
                    rowData[`puzzle_${slotNum}_words_list`] = p.placedWords ? p.placedWords.join(", ") : "";

                    if (hasPerGameDates && dateStrings[pIdx]) {
                        rowData[`puzzle_${slotNum}_date`] = dateStrings[pIdx];
                    }

                    if (p.placedWords) {
                        p.placedWords.forEach((word, wIdx) => {
                            rowData[`puzzle_${slotNum}_word_${wIdx + 1}`] = word;
                        });
                    }
                }
            }

            const row = ws.addRow(rowData);
            row.height = 150;
            row.alignment = { vertical: "middle", horizontal: "center" };

            if (pageCalColIdx !== -1 && pageCalendarImages && pageCalendarImages[pageIdx]) {
                const calId = wb.addImage({
                    base64: cleanBase64(pageCalendarImages[pageIdx]),
                    extension: "png"
                });
                ws.addImage(calId, {
                    tl: { col: pageCalColIdx + 0.08, row: rowNumber - 1 + 0.15 },
                    ext: { width: 140, height: 110 },
                    editAs: "oneCell"
                });
            }

            for (let slot = 0; slot < puzzlesPerPage; slot++) {
                const pIdx = pageIdx * puzzlesPerPage + slot;
                if (pIdx < totalPuzzles) {
                    const slotInfo = slotColMap[slot];

                    if (gridImages[pIdx]) {
                        const imgId = wb.addImage({
                            base64: cleanBase64(gridImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(imgId, {
                            tl: { col: slotInfo.gridColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                            ext: { width: 140, height: 140 },
                            editAs: "oneCell"
                        });
                    }

                    if (slotInfo.calColIdx !== undefined && calendarImages[pIdx]) {
                        const calId = wb.addImage({
                            base64: cleanBase64(calendarImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(calId, {
                            tl: { col: slotInfo.calColIdx + 0.08, row: rowNumber - 1 + 0.15 },
                            ext: { width: 140, height: 110 },
                            editAs: "oneCell"
                        });
                    }

                    if (slotInfo.solColIdx !== undefined && solutionImages[pIdx]) {
                        const solId = wb.addImage({
                            base64: cleanBase64(solutionImages[pIdx]),
                            extension: "png"
                        });
                        ws.addImage(solId, {
                            tl: { col: slotInfo.solColIdx + 0.08, row: rowNumber - 1 + 0.05 },
                            ext: { width: 140, height: 140 },
                            editAs: "oneCell"
                        });
                    }
                }
            }
        }
    }

    return wb;
}

/**
 * Fallback: SheetJS text-based Word Search workbook.
 */
function buildCanvaWordSearchSheetJS(options = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("Excel export library not loaded.");
    }

    const {
        puzzles = [],
        puzzlesPerPage = 1,
        includeSolutionInSameExcel = true,
        dateScope = "per_game",
        dateStrings = [],
        pageDateStrings = [],
        hasCalendarImages = false,
        batchSize = 100
    } = options;

    const totalPuzzles = puzzles.length;
    const totalPages = (puzzlesPerPage === 1) ? totalPuzzles : Math.ceil(totalPuzzles / puzzlesPerPage);
    const effectiveBatchSize = (batchSize && batchSize > 0) ? batchSize : totalPages;
    const numBatches = Math.ceil(totalPages / effectiveBatchSize);
    const padLen = String(totalPages).length > 2 ? String(totalPages).length : 2;
    const pad = (n) => String(n).padStart(padLen, "0");

    const files = [];

    for (let b = 0; b < numBatches; b++) {
        const startPage = b * effectiveBatchSize;
        const endPage = Math.min(totalPages, (b + 1) * effectiveBatchSize);
        const rows = [];

        if (puzzlesPerPage === 1) {
            const activeDateStrings = (dateScope === "per_page" && pageDateStrings && pageDateStrings.length > 0)
                ? pageDateStrings
                : dateStrings;
            for (let i = startPage; i < endPage; i++) {
                const p = puzzles[i];
                const pNum = i + 1;
                const pPad = String(pNum).padStart(3, "0");

                const row = {
                    title: p.title,
                    puzzle_number: pNum,
                    word_count: p.placedWords ? p.placedWords.length : 0,
                    words_list: p.placedWords ? p.placedWords.join(", ") : "",
                    grid_image: `page_${pPad}_grid.png`
                };

                if (activeDateStrings && activeDateStrings[i]) {
                    row.date = activeDateStrings[i];
                }

                if (hasCalendarImages) {
                    row.calendar_image = `page_${pPad}_calendar.png`;
                }

                if (includeSolutionInSameExcel) {
                    row.solution_image = `page_${pPad}_solution.png`;
                }

                if (p.placedWords) {
                    p.placedWords.forEach((word, wIdx) => {
                        row[`word_${wIdx + 1}`] = word;
                    });
                }

                rows.push(row);
            }
        } else {
            for (let pageIdx = startPage; pageIdx < endPage; pageIdx++) {
                const row = { page_number: pageIdx + 1 };
                if (dateScope === "per_page") {
                    if (pageDateStrings && pageDateStrings[pageIdx]) {
                        row.date = pageDateStrings[pageIdx];
                    }
                    if (hasCalendarImages) {
                        const pagePad = String(pageIdx + 1).padStart(3, "0");
                        row.calendar_image = `page_${pagePad}_calendar.png`;
                    }
                }
                for (let slot = 0; slot < puzzlesPerPage; slot++) {
                    const pIdx = pageIdx * puzzlesPerPage + slot;
                    const slotNum = slot + 1;
                    if (pIdx < totalPuzzles) {
                        const p = puzzles[pIdx];
                        const pNum = pIdx + 1;
                        const pPad = String(pNum).padStart(3, "0");
                        row[`puzzle_${slotNum}_title`] = p.title;
                        row[`puzzle_${slotNum}_number`] = pNum;
                        row[`puzzle_${slotNum}_word_count`] = p.placedWords ? p.placedWords.length : 0;
                        row[`puzzle_${slotNum}_words_list`] = p.placedWords ? p.placedWords.join(", ") : "";
                        if (dateScope !== "per_page" && dateStrings && dateStrings[pIdx]) {
                            row[`puzzle_${slotNum}_date`] = dateStrings[pIdx];
                        }
                        row[`puzzle_${slotNum}_image`] = `page_${pPad}_grid.png`;
                        if (dateScope !== "per_page" && hasCalendarImages) {
                            row[`puzzle_${slotNum}_calendar`] = `page_${pPad}_calendar.png`;
                        }
                        if (includeSolutionInSameExcel) {
                            row[`puzzle_${slotNum}_solution`] = `page_${pPad}_solution.png`;
                        }
                        if (p.placedWords) {
                            p.placedWords.forEach((word, wIdx) => {
                                row[`puzzle_${slotNum}_word_${wIdx + 1}`] = word;
                            });
                        }
                    }
                }
                rows.push(row);
            }
        }

        const ws = window.XLSX.utils.json_to_sheet(rows);
        const wb = window.XLSX.utils.book_new();
        window.XLSX.utils.book_append_sheet(wb, ws, "Canva_WordSearch");
        const buffer = window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
        const batchNumStr = String(b + 1).padStart(2, "0");
        const filename = (numBatches > 1)
            ? `wordsearch_canva_batch_${batchNumStr}_pages_${pad(startPage + 1)}-${pad(endPage)}.xlsx`
            : "wordsearch_canva_bulk.xlsx";

        files.push({
            filename,
            buffer,
            batchNum: b + 1,
            pageStart: startPage + 1,
            pageEnd: endPage,
            rowCount: endPage - startPage
        });
    }

    return {
        isSplit: numBatches > 1,
        files,
        totalBatches: numBatches,
        totalPages
    };
}
