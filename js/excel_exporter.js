/**
 * Canva Bulk Create Excel Workbook Builder
 * Generates ready-to-import Excel files matching Canva's Bulk Create specifications.
 * Uses ExcelJS to embed REAL floating images anchored into the cells for 1-click Canva mapping.
 * Falls back to SheetJS if images are not provided.
 */

function cleanBase64(dataUrl) {
    if (!dataUrl) return "";
    return dataUrl.replace(/^data:image\/[a-z]+;base64,/, "");
}

export async function buildCanvaSudokuExcel({
    puzzles = [],
    puzzlesPerPage = 1,
    includeSolutionInSameExcel = true,
    dateScope = "per_game",
    dateStrings = [],
    pageDateStrings = [],
    hasCalendarImages = false,
    gridImages = [],       // Base64 PNG data URLs
    solutionImages = [],   // Base64 PNG data URLs
    calendarImages = [],   // Base64 PNG data URLs
    pageCalendarImages = []// Base64 PNG data URLs
} = {}) {
    // 1. If ExcelJS is available and images are supplied, embed floating images for Canva Bulk Create
    if (typeof window.ExcelJS !== "undefined" && gridImages && gridImages.length > 0) {
        return await buildCanvaSudokuExcelJS({
            puzzles,
            puzzlesPerPage,
            includeSolutionInSameExcel,
            dateScope,
            dateStrings,
            pageDateStrings,
            hasCalendarImages,
            gridImages,
            solutionImages,
            calendarImages,
            pageCalendarImages
        });
    }

    // 2. Fallback: SheetJS text-based Excel workbook
    return buildCanvaSudokuSheetJS({
        puzzles,
        puzzlesPerPage,
        includeSolutionInSameExcel,
        dateScope,
        dateStrings,
        pageDateStrings,
        hasCalendarImages
    });
}

/**
 * ExcelJS implementation embedding floating pictures directly into Canva Bulk Create cells.
 */
async function buildCanvaSudokuExcelJS({
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
    pageCalendarImages = []
} = {}) {
    const wb = new window.ExcelJS.Workbook();
    const ws = wb.addWorksheet("Bulk Create");
    const totalPuzzles = puzzles.length;

    if (puzzlesPerPage === 1) {
        // Define columns
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

        // Image columns (width 32 to neatly fit 140px thumbnail)
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

        // Header Styling
        const hRow = ws.getRow(1);
        hRow.height = 26;
        hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
        hRow.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FF184534" } // Emerald branding
        };
        hRow.alignment = { vertical: "middle", horizontal: "center" };

        for (let i = 0; i < totalPuzzles; i++) {
            const p = puzzles[i];
            const pNum = i + 1;
            const rowNumber = i + 2;

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
            row.height = 150; // Room for floating image thumbnail
            row.alignment = { vertical: "middle", horizontal: "center" };

            // Embed Grid Image
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

            // Embed Calendar Card Image
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

            // Embed Solution Image
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
        // Multi-game per page layout: 1 UNIFIED DATE PER PAGE
        const totalPages = Math.ceil(totalPuzzles / puzzlesPerPage);
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

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            const rowNumber = pageIdx + 2;
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

            // Embed single page-level calendar image
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

            // Embed images for each puzzle slot
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
        // Multi-game per page layout: LINKED TO GAMES (each slot has its own date & calendar)
        const totalPages = Math.ceil(totalPuzzles / puzzlesPerPage);
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

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            const rowNumber = pageIdx + 2;
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

            // Embed images for each slot
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

    return await wb.xlsx.writeBuffer();
}

/**
 * Fallback: SheetJS text-based Excel workbook.
 */
function buildCanvaSudokuSheetJS({
    puzzles = [],
    puzzlesPerPage = 1,
    includeSolutionInSameExcel = true,
    dateScope = "per_game",
    dateStrings = [],
    pageDateStrings = [],
    hasCalendarImages = false
} = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("Excel export library not loaded.");
    }

    const rows = [];
    const totalPuzzles = puzzles.length;

    if (puzzlesPerPage === 1) {
        for (let i = 0; i < totalPuzzles; i++) {
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
        const totalPages = Math.ceil(totalPuzzles / puzzlesPerPage);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
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
        const totalPages = Math.ceil(totalPuzzles / puzzlesPerPage);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
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

    return window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
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

export async function buildCanvaWordSearchExcel({
    puzzles = [],
    includeSolutionInSameExcel = true,
    dateStrings = [],
    hasCalendarImages = false,
    gridImages = [],
    solutionImages = [],
    calendarImages = []
} = {}) {
    // 1. If ExcelJS is available and images are supplied, embed floating images
    if (typeof window.ExcelJS !== "undefined" && gridImages && gridImages.length > 0) {
        return await buildCanvaWordSearchExcelJS({
            puzzles,
            includeSolutionInSameExcel,
            dateStrings,
            hasCalendarImages,
            gridImages,
            solutionImages,
            calendarImages
        });
    }

    // 2. Fallback: SheetJS text-based Excel workbook
    return buildCanvaWordSearchSheetJS({
        puzzles,
        includeSolutionInSameExcel,
        dateStrings,
        hasCalendarImages
    });
}

/**
 * ExcelJS implementation embedding floating pictures for Word Search Canva Bulk Create.
 */
async function buildCanvaWordSearchExcelJS({
    puzzles = [],
    includeSolutionInSameExcel = true,
    dateStrings = [],
    hasCalendarImages = false,
    gridImages = [],
    solutionImages = [],
    calendarImages = []
} = {}) {
    const wb = new window.ExcelJS.Workbook();
    const ws = wb.addWorksheet("Bulk Create");
    const totalPuzzles = puzzles.length;

    const cols = [
        { header: "title", key: "title", width: 22 },
        { header: "puzzle_number", key: "puzzle_number", width: 16 },
        { header: "word_count", key: "word_count", width: 14 },
        { header: "words_list", key: "words_list", width: 45 }
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

    // Determine max words for individual word columns
    let maxWords = 0;
    puzzles.forEach(p => {
        if (p.placedWords && p.placedWords.length > maxWords) {
            maxWords = p.placedWords.length;
        }
    });

    for (let w = 1; w <= maxWords; w++) {
        cols.push({ header: `word_${w}`, key: `word_${w}`, width: 16 });
    }

    ws.columns = cols;

    // Header styling
    const hRow = ws.getRow(1);
    hRow.height = 26;
    hRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    hRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF184534" }
    };
    hRow.alignment = { vertical: "middle", horizontal: "center" };

    for (let i = 0; i < totalPuzzles; i++) {
        const p = puzzles[i];
        const pNum = i + 1;
        const rowNumber = i + 2;

        const rowData = {
            title: p.title,
            puzzle_number: pNum,
            word_count: p.placedWords ? p.placedWords.length : 0,
            words_list: p.placedWords ? p.placedWords.join(", ") : ""
        };

        if (dateColIdx !== -1 && dateStrings[i]) {
            rowData.date = dateStrings[i];
        }

        if (p.placedWords) {
            p.placedWords.forEach((word, wIdx) => {
                rowData[`word_${wIdx + 1}`] = word;
            });
        }

        const row = ws.addRow(rowData);
        row.height = 150;
        row.alignment = { vertical: "middle", horizontal: "center" };

        // Embed Grid Image
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

        // Embed Calendar Card Image
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

        // Embed Solution Image
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

    return await wb.xlsx.writeBuffer();
}

/**
 * Fallback: SheetJS text-based Word Search workbook.
 */
function buildCanvaWordSearchSheetJS({
    puzzles = [],
    includeSolutionInSameExcel = true,
    dateStrings = [],
    hasCalendarImages = false
} = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("Excel export library not loaded.");
    }

    const rows = [];
    const totalPuzzles = puzzles.length;

    for (let i = 0; i < totalPuzzles; i++) {
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

        if (dateStrings && dateStrings[i]) {
            row.date = dateStrings[i];
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

    const ws = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Canva_WordSearch");

    return window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
}
