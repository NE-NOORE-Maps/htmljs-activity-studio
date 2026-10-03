/**
 * KDP Print-Ready PDF Book Generator (Pure JavaScript via jsPDF)
 * Supports 8.5x11, 6x9, 8.5x8.5 trim sizes, multi-puzzle layouts, and back-of-book answer keys.
 */

import {
    renderSudokuBookPageCanvas,
    renderSudokuSolutionPageCanvas,
    renderWordSearchBookPageCanvas,
    renderWordSearchSolutionPageCanvas
} from "./canvas_renderer.js";

export const TRIM_DIMENSIONS_PT = {
    "8.5 x 11 inches (Letter)": [612, 792],
    "6 x 9 inches": [432, 648],
    "8.5 x 8.5 inches": [612, 612],
    "8 x 10 inches": [576, 720]
};

export async function buildSudokuKdpPdf({
    puzzles = [],
    style,
    puzzlesPerPage = 1,
    solutionsPerPage = 6,
    trimChoice = "8.5 x 11 inches (Letter)",
    includeInstructions = true,
    dateScope = "per_game",
    dateStrings = [],
    calendarCanvases = [],
    pageDateStrings = [],
    pageCalendarCanvases = [],
    onProgress = null
} = {}) {
    if (typeof window.jspdf === "undefined" || !window.jspdf.jsPDF) {
        throw new Error("jsPDF library is not loaded.");
    }

    const { jsPDF } = window.jspdf;
    const dims = TRIM_DIMENSIONS_PT[trimChoice] || [612, 792];
    const [pageW, pageH] = dims;

    const doc = new jsPDF({
        orientation: pageH >= pageW ? "portrait" : "landscape",
        unit: "pt",
        format: [pageW, pageH]
    });

    const totalPuzzles = puzzles.length;
    const totalPuzPages = Math.ceil(totalPuzzles / puzzlesPerPage);
    const totalSolPages = Math.ceil(totalPuzzles / solutionsPerPage);
    const totalBookPages = totalPuzPages + 1 + totalSolPages; // Includes divider

    let processedCount = 0;

    // 1. Puzzle Interior Pages
    for (let pPage = 1; pPage <= totalPuzPages; pPage++) {
        const startIdx = (pPage - 1) * puzzlesPerPage;
        const endIdx = startIdx + puzzlesPerPage;
        const pSlice = puzzles.slice(startIdx, endIdx);

        const dSlice = dateStrings && dateStrings.length > 0 ? dateStrings.slice(startIdx, endIdx) : null;
        const cSlice = calendarCanvases && calendarCanvases.length > 0 ? calendarCanvases.slice(startIdx, endIdx) : null;
        const pageDateText = pageDateStrings && pageDateStrings[pPage - 1] ? pageDateStrings[pPage - 1] : null;
        const pageCalendarCanvas = pageCalendarCanvases && pageCalendarCanvases[pPage - 1] ? pageCalendarCanvases[pPage - 1] : null;

        // Render page canvas at 150 DPI for crisp vector-like PDF embedding without bloated file size
        const pageCanvas = renderSudokuBookPageCanvas({
            puzzlesSlice: pSlice,
            style,
            puzzlesPerPage,
            pageNum: pPage,
            totalPages: totalPuzPages,
            dpi: 150,
            includeInstructions,
            dateScope,
            dateStrings: dateScope === "per_page" ? null : dSlice,
            calendarCanvases: dateScope === "per_page" ? null : cSlice,
            pageDateText,
            pageCalendarCanvas
        });

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
        if (pPage > 1) {
            doc.addPage([pageW, pageH]);
        }
        doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH);

        processedCount++;
        if (onProgress) {
            onProgress(Math.round((processedCount / totalBookPages) * 100));
        }
    }

    // 2. Solutions Divider Page
    doc.addPage([pageW, pageH]);
    doc.setFillColor(24, 69, 52); // Deep emerald header bar
    doc.rect(0, pageH * 0.40, pageW, pageH * 0.20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("SOLUTIONS", pageW / 2, pageH * 0.49, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text("Complete Answer Keys", pageW / 2, pageH * 0.54, { align: "center" });

    processedCount++;
    if (onProgress) {
        onProgress(Math.round((processedCount / totalBookPages) * 100));
    }

    // 3. Solution Answer Key Pages
    for (let sPage = 1; sPage <= totalSolPages; sPage++) {
        const startIdx = (sPage - 1) * solutionsPerPage;
        const endIdx = startIdx + solutionsPerPage;
        const sSlice = puzzles.slice(startIdx, endIdx);

        const solCanvas = renderSudokuSolutionPageCanvas({
            puzzlesSlice: sSlice,
            style,
            solutionsPerPage,
            pageNum: sPage,
            totalPages: totalSolPages,
            dpi: 150
        });

        const imgData = solCanvas.toDataURL("image/jpeg", 0.90);
        doc.addPage([pageW, pageH]);
        doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH);

        processedCount++;
        if (onProgress) {
            onProgress(Math.round((processedCount / totalBookPages) * 100));
        }
    }

    return doc.output("arraybuffer");
}

export async function buildWordSearchKdpPdf({
    puzzles = [],
    style,
    solutionsPerPage = 4,
    trimChoice = "8.5 x 11 inches (Letter)",
    dateStrings = [],
    calendarCanvases = [],
    wordColumns = 3,
    onProgress = null
} = {}) {
    if (typeof window.jspdf === "undefined" || !window.jspdf.jsPDF) {
        throw new Error("jsPDF library is not loaded.");
    }

    const { jsPDF } = window.jspdf;
    const dims = TRIM_DIMENSIONS_PT[trimChoice] || [612, 792];
    const [pageW, pageH] = dims;

    const doc = new jsPDF({
        orientation: pageH >= pageW ? "portrait" : "landscape",
        unit: "pt",
        format: [pageW, pageH]
    });

    const totalPuzzles = puzzles.length;
    const totalPuzPages = totalPuzzles;
    const totalSolPages = Math.ceil(totalPuzzles / solutionsPerPage);
    const totalBookPages = totalPuzPages + 1 + totalSolPages;

    let processedCount = 0;

    // 1. Word Search Interior Pages (1 puzzle per page)
    for (let i = 0; i < totalPuzPages; i++) {
        const p = puzzles[i];
        const pageNum = i + 1;
        const dTxt = dateStrings && dateStrings[i] ? dateStrings[i] : null;
        const cCanvas = calendarCanvases && calendarCanvases[i] ? calendarCanvases[i] : null;

        const pageCanvas = renderWordSearchBookPageCanvas({
            puzzle: p,
            style,
            pageNum,
            totalPages: totalPuzPages,
            dpi: 150,
            dateText: dTxt,
            calendarCanvas: cCanvas,
            wordColumns
        });

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
        if (i > 0) {
            doc.addPage([pageW, pageH]);
        }
        doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH);

        processedCount++;
        if (onProgress) {
            onProgress(Math.round((processedCount / totalBookPages) * 100));
        }
    }

    // 2. Solutions Divider Page
    doc.addPage([pageW, pageH]);
    doc.setFillColor(24, 69, 52);
    doc.rect(0, pageH * 0.40, pageW, pageH * 0.20, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(28);
    doc.text("SOLUTIONS", pageW / 2, pageH * 0.49, { align: "center" });

    doc.setFontSize(13);
    doc.setFont("helvetica", "normal");
    doc.text("Word Search Answer Keys", pageW / 2, pageH * 0.54, { align: "center" });

    processedCount++;
    if (onProgress) {
        onProgress(Math.round((processedCount / totalBookPages) * 100));
    }

    // 3. Solution Pages
    for (let sPage = 1; sPage <= totalSolPages; sPage++) {
        const startIdx = (sPage - 1) * solutionsPerPage;
        const endIdx = startIdx + solutionsPerPage;
        const sSlice = puzzles.slice(startIdx, endIdx);

        const solCanvas = renderWordSearchSolutionPageCanvas({
            puzzlesSlice: sSlice,
            style,
            solutionsPerPage,
            pageNum: sPage,
            totalPages: totalSolPages,
            dpi: 150
        });

        const imgData = solCanvas.toDataURL("image/jpeg", 0.90);
        doc.addPage([pageW, pageH]);
        doc.addImage(imgData, "JPEG", 0, 0, pageW, pageH);

        processedCount++;
        if (onProgress) {
            onProgress(Math.round((processedCount / totalBookPages) * 100));
        }
    }

    return doc.output("arraybuffer");
}

