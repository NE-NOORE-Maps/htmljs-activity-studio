/**
 * Canva Bulk Create Excel Workbook Builder (Pure JavaScript via SheetJS)
 * Generates ready-to-import Excel files matching Canva's Bulk Create column schema.
 */

export function buildCanvaSudokuExcel({
    puzzles = [],
    puzzlesPerPage = 1,
    includeSolutionInSameExcel = true,
    dateStrings = [],
    hasCalendarImages = false
} = {}) {
    // If window.XLSX is loaded from SheetJS
    if (typeof window.XLSX === "undefined") {
        throw new Error("SheetJS (XLSX) library not loaded.");
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
    } else {
        // Multi-game per page layout (2, 4, or 6 games per page)
        const totalPages = Math.ceil(totalPuzzles / puzzlesPerPage);

        for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
            const row = {
                page_number: pageIdx + 1
            };

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
                } else {
                    // Empty placeholder slot if last page has fewer games
                    row[`puzzle_${slotNum}_title`] = "";
                    row[`puzzle_${slotNum}_difficulty`] = "";
                    row[`puzzle_${slotNum}_image`] = "";
                    if (includeSolutionInSameExcel) row[`puzzle_${slotNum}_solution`] = "";
                    if (dateStrings) row[`puzzle_${slotNum}_date`] = "";
                    if (hasCalendarImages) row[`puzzle_${slotNum}_calendar`] = "";
                }
            }
            rows.push(row);
        }
    }

    // Build workbook
    const ws = window.XLSX.utils.json_to_sheet(rows);
    const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, "Canva_Bulk");

    // Return binary array
    return window.XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export function buildSolutionsOnlyExcel({
    puzzles = []
} = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("SheetJS (XLSX) library not loaded.");
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

export function buildCanvaWordSearchExcel({
    puzzles = [],
    includeSolutionInSameExcel = true,
    dateStrings = [],
    hasCalendarImages = false
} = {}) {
    if (typeof window.XLSX === "undefined") {
        throw new Error("SheetJS (XLSX) library not loaded.");
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

        // Add individual word columns for flexible Canva text box mapping
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

