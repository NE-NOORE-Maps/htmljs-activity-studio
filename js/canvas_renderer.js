/**
 * High-Resolution 300 DPI Canvas Raster Renderer for KDP Print & Live Previews.
 * Renders Sudoku grids, word searches, multi-game book interior pages, and composite solutions.
 */

const MM_TO_INCH = 25.4;

export const SUDOKU_PRESETS = {
    "adult_classic": {
        name: "👔 Adult Classic",
        cellStyle: "grid",
        outerLineWidth: 1.4,
        blockLineWidth: 1.0,
        innerLineWidth: 0.4,
        gridColor: "#111815",
        shadingMode: "none",
        shadingColor: "#ecefe9",
        fontScale: 64,
        clueFont: "Outfit",
        clueColor: "#111815",
        solutionColor: "#1d4ed8",
        solutionMode: "color",
        description: "Standard high-contrast publishing layout with bold 3×3 box dividers and balanced digits."
    },
    "senior_large_print": {
        name: "👓 Senior / Large Print",
        cellStyle: "grid",
        outerLineWidth: 2.0,
        blockLineWidth: 1.5,
        innerLineWidth: 0.7,
        gridColor: "#000000",
        shadingMode: "none",
        shadingColor: "#e8eae6",
        fontScale: 82,
        clueFont: "Outfit",
        clueColor: "#000000",
        solutionColor: "#1e3a8a",
        solutionMode: "color",
        description: "Extra-bold high-visibility borders with giant 82% digits for maximum reading comfort."
    },
    "checkerboard": {
        name: "🏁 Checkerboard / Shaded Blocks",
        cellStyle: "grid",
        outerLineWidth: 1.3,
        blockLineWidth: 1.0,
        innerLineWidth: 0.4,
        gridColor: "#1f2937",
        shadingMode: "checkerboard",
        shadingColor: "#ebefe9",
        fontScale: 65,
        clueFont: "Outfit",
        clueColor: "#111815",
        solutionColor: "#047857",
        solutionMode: "color",
        description: "Alternating soft shaded 3×3 blocks to help solvers track regions effortlessly."
    },
    "kids_fun": {
        name: "🎈 Kids Fun (Rounded Cards)",
        cellStyle: "rounded_boxes",
        outerLineWidth: 1.0,
        blockLineWidth: 0.8,
        innerLineWidth: 0.5,
        gridColor: "#334155",
        shadingMode: "none",
        shadingColor: "#f1f5f9",
        fontScale: 76,
        clueFont: "Outfit",
        clueColor: "#0f172a",
        solutionColor: "#b91c1c",
        solutionMode: "color",
        description: "Soft rounded cell cards with large friendly digits. Ideal for 4×4 and 6×6 kids books."
    },
    "modern_minimalist": {
        name: "📐 Modern Minimalist",
        cellStyle: "grid",
        outerLineWidth: 1.1,
        blockLineWidth: 0.7,
        innerLineWidth: 0.3,
        gridColor: "#4b5563",
        shadingMode: "none",
        shadingColor: "#f3f4f6",
        fontScale: 60,
        clueFont: "Plus Jakarta Sans",
        clueColor: "#1f2937",
        solutionColor: "#4f46e5",
        solutionMode: "color",
        description: "Clean, understated hairline aesthetic with contemporary proportion and neutral tones."
    }
};

/**
 * Render a single Sudoku puzzle grid (or its solution) at exact DPI.
 */
export function renderSudokuGridCanvas({
    puzzle,
    style = SUDOKU_PRESETS.adult_classic,
    cellMm = 12.0,
    dpi = 300,
    solution = false,
    includeHeader = false,
    dateText = null
} = {}) {
    const size = puzzle.size;
    const boxR = puzzle.boxRows;
    const boxC = puzzle.boxCols;

    const cellPx = Math.max(8, Math.round((cellMm / MM_TO_INCH) * dpi));
    const gridW = size * cellPx;
    const gridH = size * cellPx;

    const outerLw = Math.max(1, Math.round((style.outerLineWidth / MM_TO_INCH) * dpi));
    const blockLw = Math.max(1, Math.round((style.blockLineWidth / MM_TO_INCH) * dpi));
    const innerLw = Math.max(1, Math.round((style.innerLineWidth / MM_TO_INCH) * dpi));

    const headerHPx = includeHeader ? Math.round((16.0 / MM_TO_INCH) * dpi) : 0;
    const totalW = gridW;
    const totalH = gridH + headerHPx;

    const canvas = document.createElement("canvas");
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d");

    // Pure white canvas background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, totalW, totalH);

    // 1. Optional Header Rendering
    if (includeHeader) {
        const titleFontPx = Math.max(10, Math.round(headerHPx * 0.42));
        ctx.fillStyle = style.clueColor || "#111815";
        ctx.font = `bold ${titleFontPx}px "Outfit", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const titleDisplay = dateText ? `${puzzle.title} · ${dateText}` : puzzle.title;
        ctx.fillText(titleDisplay, 10, headerHPx * 0.35);

        const diffFontPx = Math.max(8, Math.round(headerHPx * 0.28));
        ctx.fillStyle = "#4B5563";
        ctx.font = `${diffFontPx}px "Plus Jakarta Sans", sans-serif`;
        ctx.textAlign = "right";
        ctx.fillText(`${puzzle.difficultyLabel} ${puzzle.difficultyStars}`, gridW - 10, headerHPx * 0.35);

        ctx.strokeStyle = "#D1D5DB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, headerHPx - 2);
        ctx.lineTo(gridW, headerHPx - 2);
        ctx.stroke();
    }

    const yOffset = headerHPx;

    // 2. Shading Layer
    const applyX = puzzle.isX || style.shadingMode === "diagonal";
    const applyWindoku = puzzle.isWindoku || style.shadingMode === "windows";
    const applyChecker = style.shadingMode === "checkerboard";
    const windokuWindows = [[1, 1], [1, 5], [5, 1], [5, 5]];

    ctx.fillStyle = style.shadingColor || "#EFEFEF";

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            let isShaded = false;

            if (applyChecker) {
                const brIdx = Math.floor(r / boxR);
                const bcIdx = Math.floor(c / boxC);
                if ((brIdx + bcIdx) % 2 === 1) isShaded = true;
            }

            if (applyX && (r === c || r + c === size - 1)) {
                isShaded = true;
            }

            if (applyWindoku && size === 9) {
                for (const [wr, wc] of windokuWindows) {
                    if (r >= wr && r < wr + 3 && c >= wc && c < wc + 3) {
                        isShaded = true;
                        break;
                    }
                }
            }

            if (isShaded) {
                ctx.fillRect(c * cellPx, yOffset + r * cellPx, cellPx, cellPx);
            }
        }
    }

    // 3. Grid Lines
    ctx.strokeStyle = style.gridColor || "#111815";

    if (style.cellStyle === "rounded_boxes") {
        const radius = Math.round(cellPx * 0.18);
        const pad = Math.max(1, Math.round(cellPx * 0.04));
        ctx.lineWidth = innerLw;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                ctx.beginPath();
                ctx.roundRect(
                    c * cellPx + pad,
                    yOffset + r * cellPx + pad,
                    cellPx - 2 * pad,
                    cellPx - 2 * pad,
                    radius
                );
                ctx.stroke();
            }
        }

        // Thick box lines as accents
        ctx.lineWidth = blockLw;
        for (let r = 0; r <= size; r += boxR) {
            ctx.beginPath();
            ctx.moveTo(0, yOffset + r * cellPx);
            ctx.lineTo(gridW, yOffset + r * cellPx);
            ctx.stroke();
        }
        for (let c = 0; c <= size; c += boxC) {
            ctx.beginPath();
            ctx.moveTo(c * cellPx, yOffset);
            ctx.lineTo(c * cellPx, yOffset + gridH);
            ctx.stroke();
        }

    } else if (style.cellStyle === "boxes") {
        const pad = Math.max(1, Math.round(cellPx * 0.05));
        ctx.lineWidth = innerLw;

        for (let r = 0; r < size; r++) {
            for (let c = 0; c < size; c++) {
                ctx.strokeRect(
                    c * cellPx + pad,
                    yOffset + r * cellPx + pad,
                    cellPx - 2 * pad,
                    cellPx - 2 * pad
                );
            }
        }
    } else {
        // Continuous Classic Grid
        ctx.lineWidth = innerLw;
        for (let r = 0; r <= size; r++) {
            ctx.beginPath();
            ctx.moveTo(0, yOffset + r * cellPx);
            ctx.lineTo(gridW, yOffset + r * cellPx);
            ctx.stroke();
        }
        for (let c = 0; c <= size; c++) {
            ctx.beginPath();
            ctx.moveTo(c * cellPx, yOffset);
            ctx.lineTo(c * cellPx, yOffset + gridH);
            ctx.stroke();
        }

        // Thick Block Lines
        ctx.lineWidth = blockLw;
        for (let r = 0; r <= size; r += boxR) {
            ctx.beginPath();
            ctx.moveTo(0, yOffset + r * cellPx);
            ctx.lineTo(gridW, yOffset + r * cellPx);
            ctx.stroke();
        }
        for (let c = 0; c <= size; c += boxC) {
            ctx.beginPath();
            ctx.moveTo(c * cellPx, yOffset);
            ctx.lineTo(c * cellPx, yOffset + gridH);
            ctx.stroke();
        }

        // Outer Frame
        ctx.lineWidth = outerLw;
        const halfOut = outerLw / 2;
        ctx.strokeRect(halfOut, yOffset + halfOut, gridW - outerLw, gridH - outerLw);
    }

    // 4. Digits & Symbols
    const fontScale = (style.fontScale || 64) / 100.0;
    const fontPx = Math.max(9, Math.round(cellPx * fontScale));
    const fontFam = style.clueFont || "Outfit";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            const isClue = Boolean(puzzle.cluesGrid[r][c]);
            const symbol = solution ? puzzle.solutionGrid[r][c] : puzzle.cluesGrid[r][c];
            if (!symbol) continue;

            const cx = c * cellPx + cellPx / 2.0;
            const cy = yOffset + r * cellPx + cellPx / 2.0;

            if (solution) {
                if (isClue) {
                    ctx.fillStyle = style.clueColor || "#111815";
                    ctx.font = `bold ${fontPx}px "${fontFam}", sans-serif`;
                    ctx.fillText(symbol, cx, cy);
                } else {
                    // Solved digit
                    if (style.solutionMode === "circled") {
                        const circleR = cellPx * 0.40;
                        ctx.strokeStyle = style.solutionColor || "#1d4ed8";
                        ctx.lineWidth = Math.max(1, Math.round(innerLw * 1.5));
                        ctx.beginPath();
                        ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
                        ctx.stroke();
                    }
                    ctx.fillStyle = style.solutionColor || "#1d4ed8";
                    ctx.font = `bold ${fontPx}px "${fontFam}", sans-serif`;
                    ctx.fillText(symbol, cx, cy);
                }
            } else {
                ctx.fillStyle = style.clueColor || "#111815";
                ctx.font = `bold ${fontPx}px "${fontFam}", sans-serif`;
                ctx.fillText(symbol, cx, cy);
            }
        }
    }

    return canvas;
}

/**
 * Render a composite book interior page showing 1, 2, 4, or 6 puzzles per page.
 */
export function renderSudokuBookPageCanvas({
    puzzlesSlice = [],
    style = SUDOKU_PRESETS.adult_classic,
    puzzlesPerPage = 1,
    pageNum = 1,
    totalPages = 1,
    dpi = 150,
    includeInstructions = true,
    dateScope = "per_game",
    dateStrings = null,
    calendarCanvases = null,
    pageDateText = null,
    pageCalendarCanvas = null
} = {}) {
    const w = Math.round(8.5 * dpi);
    const h = Math.round(11.0 * dpi);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    // Pure white page background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    const fontTitlePx = Math.max(16, Math.round((24.0 / 72.0) * dpi));
    const fontSubPx = Math.max(10, Math.round((12.5 / 72.0) * dpi));
    const fontLblPx = Math.max(9, Math.round((11.0 / 72.0) * dpi));
    const fontInstPx = Math.max(8, Math.round((9.5 / 72.0) * dpi));

    const pageDate = pageDateText || (dateStrings && dateStrings[0] ? dateStrings[0] : null);
    const pageCal = pageCalendarCanvas || (calendarCanvases && calendarCanvases[0] ? calendarCanvases[0] : null);
    const isPerPageScope = (dateScope === "per_page");

    if (puzzlesPerPage === 1 && puzzlesSlice.length > 0) {
        const p = puzzlesSlice[0];
        const dTxt = isPerPageScope ? pageDate : (dateStrings && dateStrings[0] ? dateStrings[0] : null);
        const calCnv = isPerPageScope ? pageCal : (calendarCanvases && calendarCanvases[0] ? calendarCanvases[0] : null);

        let topOffset = 100;

        if (calCnv) {
            const calW = Math.round(w * 0.32);
            const calH = Math.round(calW * 0.80);
            const calX = w - 60 - calW;
            const calY = 35;
            ctx.drawImage(calCnv, calX, calY, calW, calH);

            const headerX = 60;
            ctx.textAlign = "left";
            ctx.textBaseline = "alphabetic";

            ctx.fillStyle = "#14251F";
            ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
            ctx.fillText(dTxt || p.title, headerX, 65);

            ctx.fillStyle = "#5A6962";
            ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
            const sub = dTxt ? `${p.title} · ${p.difficultyLabel} ${p.difficultyStars}` : `Difficulty: ${p.difficultyLabel} ${p.difficultyStars}`;
            ctx.fillText(sub, headerX, 95);

            topOffset = 35 + calH + 15;
            if (includeInstructions) {
                ctx.textAlign = "center";
                ctx.font = `${fontInstPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillStyle = "#6E7D76";
                ctx.fillText("Fill in the grid so every row, column, and block contains each number exactly once.", w / 2, topOffset + 12);
                topOffset += 28;
            }
        } else {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";

            ctx.fillStyle = "#14251F";
            ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
            ctx.fillText(dTxt || p.title, w / 2, 45);

            ctx.fillStyle = "#5A6962";
            ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
            const sub = dTxt ? `${p.title} · ${p.difficultyLabel} ${p.difficultyStars}` : `Difficulty: ${p.difficultyLabel} ${p.difficultyStars}`;
            ctx.fillText(sub, w / 2, 75);

            if (includeInstructions) {
                ctx.font = `${fontInstPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillStyle = "#6E7D76";
                ctx.fillText("Fill in the grid so every row, column, and block contains each number exactly once.", w / 2, 110);
                topOffset = 135;
            }
        }

        // Render high-res grid and scale into available area
        const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 12.0, dpi, solution: false });
        const avail = Math.min(w - 120, h - topOffset - 80);
        const ox = (w - avail) / 2;
        const oy = topOffset + (h - topOffset - 60 - avail) / 2;
        ctx.drawImage(pCanvas, ox, oy, avail, avail);

    } else if (puzzlesPerPage === 2) {
        if (isPerPageScope && (pageDate || pageCal)) {
            // UNIFIED 1 DATE PER PAGE: Single top header card for the page
            let topHeaderHeight = 90;

            if (pageCal) {
                const calW = Math.round(w * 0.22);
                const calH = Math.round(calW * 0.80);
                ctx.drawImage(pageCal, w - 60 - calW, 28, calW, calH);

                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${Math.round(fontTitlePx * 0.95)}px "Outfit", sans-serif`;
                ctx.fillText(pageDate || `Daily Sudoku #${pageNum}`, 60, 50);

                ctx.fillStyle = "#5A6962";
                ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(`Daily Puzzles · Page ${pageNum} of ${totalPages}`, 60, 78);

                if (includeInstructions) {
                    ctx.font = `${fontInstPx}px "Plus Jakarta Sans", sans-serif`;
                    ctx.fillStyle = "#6E7D76";
                    ctx.fillText("Fill in each grid so every row, column, and 3×3 block contains numbers 1 to 9.", 60, 102);
                }

                topHeaderHeight = Math.max(105, 28 + calH + 15);
            } else {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
                ctx.fillText(pageDate, w / 2, 42);

                ctx.fillStyle = "#5A6962";
                ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(`Daily Puzzles · Page ${pageNum} of ${totalPages}`, w / 2, 70);

                if (includeInstructions) {
                    ctx.font = `${fontInstPx}px "Plus Jakarta Sans", sans-serif`;
                    ctx.fillStyle = "#6E7D76";
                    ctx.fillText("Fill in each grid so every row, column, and 3×3 block contains numbers 1 to 9.", w / 2, 96);
                    topHeaderHeight = 118;
                } else {
                    topHeaderHeight = 88;
                }
            }

            // Divider rule
            ctx.strokeStyle = "#E2E8F0";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(60, topHeaderHeight - 6);
            ctx.lineTo(w - 60, topHeaderHeight - 6);
            ctx.stroke();

            const marginX = 60;
            const availH = h - topHeaderHeight - 50;
            const cellW = w - 2 * marginX;
            const cellH = availH / 2;

            puzzlesSlice.slice(0, 2).forEach((p, idx) => {
                const cy = topHeaderHeight + idx * cellH;

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                ctx.fillText(`${p.title} · ${p.difficultyLabel} ${p.difficultyStars}`, w / 2, cy + 18);

                const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 10.0, dpi, solution: false });
                const avail = Math.min(cellW - 40, cellH - 42);
                const ox = (w - avail) / 2;
                const oy = cy + 28 + (cellH - 42 - avail) / 2;
                ctx.drawImage(pCanvas, ox, oy, avail, avail);
            });

        } else {
            // LINKED TO GAMES: Each slot has its own date / calendar card
            const cols = 1, rows = 2;
            const marginX = 60, marginY = 45;
            const cellW = w - 2 * marginX;
            const cellH = (h - marginY - 60) / rows;

            puzzlesSlice.slice(0, 2).forEach((p, idx) => {
                const cy = marginY + idx * cellH;
                const dTxt = dateStrings && dateStrings[idx] ? dateStrings[idx] : "";
                const calCnv = calendarCanvases && calendarCanvases[idx] ? calendarCanvases[idx] : null;

                if (calCnv) {
                    const calW = Math.round(cellW * 0.22);
                    const calH = Math.round(calW * 0.80);
                    ctx.drawImage(calCnv, w - marginX - calW, cy + 10, calW, calH);

                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#14251F";
                    ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                    const lbl = dTxt ? `${dTxt} · ${p.title} (${p.difficultyLabel})` : `${p.title} · ${p.difficultyLabel} ${p.difficultyStars}`;
                    ctx.fillText(lbl, marginX + 10, cy + 22);
                } else {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#14251F";
                    ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                    const lbl = dTxt ? `${dTxt} · ${p.title} · ${p.difficultyLabel} ${p.difficultyStars}` : `${p.title} · ${p.difficultyLabel} ${p.difficultyStars}`;
                    ctx.fillText(lbl, w / 2, cy + 18);
                }

                const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 10.0, dpi, solution: false });
                const avail = Math.min(cellW - 40, cellH - 45);
                const ox = (w - avail) / 2;
                const oy = cy + 30 + (cellH - 45 - avail) / 2;
                ctx.drawImage(pCanvas, ox, oy, avail, avail);
            });
        }

    } else if (puzzlesPerPage === 4) {
        if (isPerPageScope && (pageDate || pageCal)) {
            // UNIFIED 1 DATE PER PAGE (4 puzzles / page)
            let topHeaderHeight = 75;

            if (pageCal) {
                const calW = Math.round(w * 0.18);
                const calH = Math.round(calW * 0.80);
                ctx.drawImage(pageCal, w - 50 - calW, 22, calW, calH);

                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${Math.round(fontTitlePx * 0.88)}px "Outfit", sans-serif`;
                ctx.fillText(pageDate || `Daily Sudoku #${pageNum}`, 50, 40);

                ctx.fillStyle = "#5A6962";
                ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(`Daily Puzzles · Page ${pageNum} of ${totalPages}`, 50, 66);

                topHeaderHeight = Math.max(88, 22 + calH + 12);
            } else {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${Math.round(fontTitlePx * 0.90)}px "Outfit", sans-serif`;
                ctx.fillText(pageDate, w / 2, 36);

                ctx.fillStyle = "#5A6962";
                ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(`Daily Puzzles · Page ${pageNum} of ${totalPages}`, w / 2, 62);
                topHeaderHeight = 80;
            }

            // Divider rule
            ctx.strokeStyle = "#E2E8F0";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(50, topHeaderHeight - 6);
            ctx.lineTo(w - 50, topHeaderHeight - 6);
            ctx.stroke();

            const cols = 2, rows = 2;
            const marginX = 50;
            const availH = h - topHeaderHeight - 45;
            const cellW = (w - 2 * marginX) / cols;
            const cellH = availH / rows;

            puzzlesSlice.slice(0, 4).forEach((p, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const cx = marginX + col * cellW;
                const cy = topHeaderHeight + row * cellH;

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                ctx.fillText(`${p.title} (${p.difficultyLabel})`, cx + cellW / 2, cy + 14);

                const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 9.0, dpi, solution: false });
                const avail = Math.min(cellW - 24, cellH - 34);
                const ox = cx + (cellW - avail) / 2;
                const oy = cy + 24 + (cellH - 34 - avail) / 2;
                ctx.drawImage(pCanvas, ox, oy, avail, avail);
            });

        } else {
            // LINKED TO GAMES (4 puzzles / page)
            const cols = 2, rows = 2;
            const marginX = 50, marginY = 40;
            const cellW = (w - 2 * marginX) / cols;
            const cellH = (h - marginY - 50) / rows;

            puzzlesSlice.slice(0, 4).forEach((p, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const cx = marginX + col * cellW;
                const cy = marginY + row * cellH;

                const dTxt = dateStrings && dateStrings[idx] ? dateStrings[idx] : "";
                const calCnv = calendarCanvases && calendarCanvases[idx] ? calendarCanvases[idx] : null;

                if (calCnv) {
                    const calW = Math.round(cellW * 0.24);
                    const calH = Math.round(calW * 0.80);
                    ctx.drawImage(calCnv, cx + cellW - calW - 6, cy + 4, calW, calH);

                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#14251F";
                    ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                    ctx.fillText(dTxt ? `${dTxt} #${p.puzzleId}` : `${p.title} (${p.difficultyLabel})`, cx + 10, cy + 16);
                } else {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#14251F";
                    ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                    ctx.fillText(dTxt ? `${dTxt} · ${p.title}` : `${p.title} (${p.difficultyLabel})`, cx + cellW / 2, cy + 15);
                }

                const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 10.0, dpi, solution: false });
                const avail = Math.min(cellW - 28, cellH - 38);
                const ox = cx + (cellW - avail) / 2;
                const oy = cy + 26 + (cellH - 38 - avail) / 2;
                ctx.drawImage(pCanvas, ox, oy, avail, avail);
            });
        }

    } else { // 6 per page
        if (isPerPageScope && (pageDate || pageCal)) {
            // UNIFIED 1 DATE PER PAGE (6 puzzles / page)
            let topHeaderHeight = 65;

            if (pageCal) {
                const calW = Math.round(w * 0.16);
                const calH = Math.round(calW * 0.80);
                ctx.drawImage(pageCal, w - 50 - calW, 20, calW, calH);

                ctx.textAlign = "left";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${Math.round(fontTitlePx * 0.82)}px "Outfit", sans-serif`;
                ctx.fillText(pageDate || `Daily Sudoku #${pageNum}`, 50, 36);

                ctx.fillStyle = "#5A6962";
                ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(`Daily Puzzles · Page ${pageNum} of ${totalPages}`, 50, 60);

                topHeaderHeight = Math.max(80, 20 + calH + 10);
            } else {
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${Math.round(fontTitlePx * 0.85)}px "Outfit", sans-serif`;
                ctx.fillText(pageDate, w / 2, 32);

                ctx.fillStyle = "#5A6962";
                ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(`Daily Puzzles · Page ${pageNum} of ${totalPages}`, w / 2, 56);
                topHeaderHeight = 72;
            }

            // Divider rule
            ctx.strokeStyle = "#E2E8F0";
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(50, topHeaderHeight - 6);
            ctx.lineTo(w - 50, topHeaderHeight - 6);
            ctx.stroke();

            const cols = 2, rows = 3;
            const marginX = 50;
            const availH = h - topHeaderHeight - 40;
            const cellW = (w - 2 * marginX) / cols;
            const cellH = availH / rows;

            puzzlesSlice.slice(0, 6).forEach((p, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const cx = marginX + col * cellW;
                const cy = topHeaderHeight + row * cellH;

                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillStyle = "#14251F";
                ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                ctx.fillText(`${p.title} (${p.difficultyLabel})`, cx + cellW / 2, cy + 12);

                const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 9.0, dpi, solution: false });
                const avail = Math.min(cellW - 20, cellH - 28);
                const ox = cx + (cellW - avail) / 2;
                const oy = cy + 20 + (cellH - 28 - avail) / 2;
                ctx.drawImage(pCanvas, ox, oy, avail, avail);
            });

        } else {
            // LINKED TO GAMES (6 puzzles / page)
            const cols = 2, rows = 3;
            const marginX = 50, marginY = 35;
            const cellW = (w - 2 * marginX) / cols;
            const cellH = (h - marginY - 45) / rows;

            puzzlesSlice.slice(0, 6).forEach((p, idx) => {
                const col = idx % cols;
                const row = Math.floor(idx / cols);
                const cx = marginX + col * cellW;
                const cy = marginY + row * cellH;

                const dTxt = dateStrings && dateStrings[idx] ? dateStrings[idx] : "";
                const calCnv = calendarCanvases && calendarCanvases[idx] ? calendarCanvases[idx] : null;

                if (calCnv) {
                    const calW = Math.round(cellW * 0.22);
                    const calH = Math.round(calW * 0.80);
                    ctx.drawImage(calCnv, cx + cellW - calW - 4, cy + 4, calW, calH);

                    ctx.textAlign = "left";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#14251F";
                    ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                    ctx.fillText(dTxt ? `${dTxt} #${p.puzzleId}` : `#{p.puzzleId} (${p.difficultyLabel})`, cx + 6, cy + 13);
                } else {
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillStyle = "#14251F";
                    ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
                    ctx.fillText(dTxt ? `${dTxt} · ${p.title}` : `${p.title} (${p.difficultyLabel})`, cx + cellW / 2, cy + 12);
                }

                const pCanvas = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 10.0, dpi, solution: false });
                const avail = Math.min(cellW - 22, cellH - 30);
                const ox = cx + (cellW - avail) / 2;
                const oy = cy + 22 + (cellH - 30 - avail) / 2;
                ctx.drawImage(pCanvas, ox, oy, avail, avail);
            });
        }
    }

    // Page footer
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#718096";
    ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Page ${pageNum}`, w / 2, h - 25);

    return canvas;
}

/**
 * Render a composite solution page with multiple solved Sudoku answers.
 */
export function renderSudokuSolutionPageCanvas({
    puzzlesSlice = [],
    style = SUDOKU_PRESETS.adult_classic,
    solutionsPerPage = 6,
    pageNum = 1,
    totalPages = 1,
    dpi = 150
} = {}) {
    const w = Math.round(8.5 * dpi);
    const h = Math.round(11.0 * dpi);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    const fontTitlePx = Math.max(16, Math.round((26.0 / 72.0) * dpi));
    const fontSubPx = Math.max(10, Math.round((13.0 / 72.0) * dpi));
    const fontLblPx = Math.max(9, Math.round((11.5 / 72.0) * dpi));

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#14251F";
    ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
    ctx.fillText("SOLUTIONS", w / 2, 45);

    ctx.fillStyle = "#6B7280";
    ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Answer Keys · Page ${pageNum} of ${totalPages}`, w / 2, 75);

    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.lineTo(w - 60, 95);
    ctx.stroke();

    let cols = 2, rows = 3;
    if (solutionsPerPage === 1) { cols = 1; rows = 1; }
    else if (solutionsPerPage === 2) { cols = 2; rows = 1; }
    else if (solutionsPerPage === 4) { cols = 2; rows = 2; }
    else if (solutionsPerPage === 6) { cols = 2; rows = 3; }
    else if (solutionsPerPage === 9) { cols = 3; rows = 3; }

    const marginX = 60, marginY = 115;
    const cellW = (w - 2 * marginX) / cols;
    const cellH = (h - marginY - 60) / rows;

    puzzlesSlice.slice(0, cols * rows).forEach((p, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = marginX + col * cellW;
        const cy = marginY + row * cellH;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1E293B";
        ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
        ctx.fillText(`${p.title} (${p.difficultyLabel})`, cx + cellW / 2, cy + 16);

        const solCnv = renderSudokuGridCanvas({ puzzle: p, style, cellMm: 10.0, dpi, solution: true });
        const availDim = Math.min(cellW - 30, cellH - 40);
        const ox = cx + (cellW - availDim) / 2;
        const oy = cy + 28 + (cellH - 35 - availDim) / 2;
        ctx.drawImage(solCnv, ox, oy, availDim, availDim);
    });

    // Page footer
    ctx.fillStyle = "#718096";
    ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Page ${pageNum}`, w / 2, h - 25);

    return canvas;
}

// Word Search Highlight Colors
export const WORDSEARCH_HIGHLIGHT_COLORS = [
    "rgba(34, 197, 94, 0.32)",
    "rgba(59, 130, 246, 0.32)",
    "rgba(249, 115, 22, 0.32)",
    "rgba(168, 85, 247, 0.32)",
    "rgba(236, 72, 153, 0.32)",
    "rgba(234, 179, 8, 0.32)",
    "rgba(20, 184, 166, 0.32)",
    "rgba(99, 102, 241, 0.32)"
];

/**
 * Render a single Word Search grid (or solution with highlighted words) at exact DPI.
 */
/**
 * Default Word Search Presets
 */
export const WS_PRESETS = {
    adult_classic: {
        cellStyle: "grid",
        gridLineWidth: 0.6,
        gridLineColor: "#9da49f",
        fontScale: 62,
        letterFont: "'Outfit', sans-serif",
        letterColor: "#202a26",
        solutionStyle: "capsule",
        description: "Crisp traditional grid lines, balanced font proportion, neutral tones. Standard for adult puzzle books."
    },
    senior_large_print: {
        cellStyle: "boxes",
        gridLineWidth: 0.9,
        gridLineColor: "#111815",
        fontScale: 75,
        letterFont: "'Plus Jakarta Sans', sans-serif",
        letterColor: "#000000",
        solutionStyle: "capsule",
        description: "Bold high-contrast cell boxes and enlarged letters for seniors and large print editions."
    },
    kids_activity: {
        cellStyle: "rounded_boxes",
        gridLineWidth: 0.8,
        gridLineColor: "#516d61",
        fontScale: 68,
        letterFont: "'Outfit', sans-serif",
        letterColor: "#172721",
        solutionStyle: "capsule",
        description: "Playful rounded cell tiles, soft forest green borders, large punchy letters. Perfect for kids' activity books."
    },
    classroom_clean: {
        cellStyle: "none",
        gridLineWidth: 0.0,
        gridLineColor: "#9da49f",
        fontScale: 65,
        letterFont: "'Outfit', sans-serif",
        letterColor: "#000000",
        solutionStyle: "box",
        description: "Clean borderless design without grid lines. Floating letters for a modern, airy aesthetic."
    },
    custom: {
        cellStyle: "grid",
        gridLineWidth: 0.6,
        gridLineColor: "#9da49f",
        fontScale: 62,
        letterFont: "'Outfit', sans-serif",
        letterColor: "#202a26",
        solutionStyle: "capsule",
        description: "Full manual control over every slider, color, and line option."
    }
};

/**
 * Render a single Word Search grid (or solution with highlighted words) at exact DPI.
 */
export function renderWordSearchGridCanvas({
    puzzle,
    style = WS_PRESETS.adult_classic,
    cellMm = 9.0,
    dpi = 300,
    solution = false,
    includeHeader = false,
    dateText = null,
    showGridLines = true
} = {}) {
    const width = puzzle.width || (puzzle.grid && puzzle.grid[0] ? puzzle.grid[0].length : 15);
    const height = puzzle.height || (puzzle.grid ? puzzle.grid.length : 15);

    const cellPx = Math.max(10, Math.round((cellMm / MM_TO_INCH) * dpi));
    const gridW = width * cellPx;
    const gridH = height * cellPx;

    const headerHPx = includeHeader ? Math.round((16.0 / MM_TO_INCH) * dpi) : 0;
    const totalW = gridW;
    const totalH = gridH + headerHPx;

    const canvas = document.createElement("canvas");
    canvas.width = totalW;
    canvas.height = totalH;
    const ctx = canvas.getContext("2d");

    // Pure white canvas background
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, totalW, totalH);

    // 1. Header (if requested)
    if (includeHeader) {
        const titleFontPx = Math.max(10, Math.round(headerHPx * 0.42));
        ctx.fillStyle = style.letterColor || "#111815";
        ctx.font = `bold ${titleFontPx}px "Outfit", sans-serif`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";

        const titleDisplay = dateText ? `${puzzle.title} · ${dateText}` : puzzle.title;
        ctx.fillText(titleDisplay, 10, headerHPx * 0.35);

        ctx.strokeStyle = "#D1D5DB";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, headerHPx - 2);
        ctx.lineTo(gridW, headerHPx - 2);
        ctx.stroke();
    }

    const yOffset = headerHPx;

    // Line properties
    const cellStyle = style.cellStyle || "grid";
    const rawLw = style.gridLineWidth !== undefined ? style.gridLineWidth : 0.6;
    const lineW = Math.max(1, Math.round((rawLw / MM_TO_INCH) * dpi));
    const lineCol = style.gridLineColor || "#9da49f";
    const solStyle = style.solutionStyle || "capsule";

    // 2. Grid lines & borders according to cellStyle
    if (showGridLines && rawLw > 0 && cellStyle !== "none") {
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = lineW;

        if (cellStyle === "rounded_boxes") {
            const rad = Math.round(cellPx * 0.20);
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    const bx = c * cellPx + 1;
                    const by = yOffset + r * cellPx + 1;
                    const bw = cellPx - 2;
                    const bh = cellPx - 2;
                    ctx.beginPath();
                    ctx.roundRect(bx, by, bw, bh, rad);
                    ctx.stroke();
                }
            }
        } else if (cellStyle === "boxes") {
            for (let r = 0; r < height; r++) {
                for (let c = 0; c < width; c++) {
                    const bx = c * cellPx + 1;
                    const by = yOffset + r * cellPx + 1;
                    ctx.strokeRect(bx, by, cellPx - 2, cellPx - 2);
                }
            }
        } else if (cellStyle === "grid") {
            for (let r = 0; r <= height; r++) {
                ctx.beginPath();
                ctx.moveTo(0, yOffset + r * cellPx);
                ctx.lineTo(gridW, yOffset + r * cellPx);
                ctx.stroke();
            }
            for (let c = 0; c <= width; c++) {
                ctx.beginPath();
                ctx.moveTo(c * cellPx, yOffset);
                ctx.lineTo(c * cellPx, yOffset + gridH);
                ctx.stroke();
            }
        } else if (cellStyle === "outer_border") {
            ctx.strokeRect(lineW / 2, yOffset + lineW / 2, gridW - lineW, gridH - lineW);
        }
    }

    // Outer border for grid style
    if (cellStyle === "grid" && rawLw > 0) {
        const outerW = Math.max(lineW, Math.round((0.9 / MM_TO_INCH) * dpi));
        ctx.strokeStyle = lineCol;
        ctx.lineWidth = outerW;
        ctx.strokeRect(outerW / 2, yOffset + outerW / 2, gridW - outerW, gridH - outerW);
    }

    // Collect solved cells
    const solvedSet = new Set();
    if (puzzle.placements) {
        puzzle.placements.forEach(p => {
            const [dr, dc] = p.direction;
            const len = p.word.length;
            const [sr, sc] = p.start;
            for (let i = 0; i < len; i++) {
                solvedSet.add(`${sr + i * dr},${sc + i * dc}`);
            }
        });
    }

    // 3. Solution Highlighting Layer (Under letters)
    if (solution && puzzle.placements) {
        if (solStyle === "capsule") {
            puzzle.placements.forEach((placement, pIdx) => {
                const color = WORDSEARCH_HIGHLIGHT_COLORS[pIdx % WORDSEARCH_HIGHLIGHT_COLORS.length];
                const [r1, c1] = placement.start;
                const [r2, c2] = placement.end;

                const x1 = c1 * cellPx + cellPx / 2;
                const y1 = yOffset + r1 * cellPx + cellPx / 2;
                const x2 = c2 * cellPx + cellPx / 2;
                const y2 = yOffset + r2 * cellPx + cellPx / 2;

                ctx.save();
                ctx.lineCap = "round";
                ctx.lineWidth = Math.round(cellPx * 0.78);
                ctx.strokeStyle = color;
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
                ctx.restore();
            });
        } else if (solStyle === "box") {
            puzzle.placements.forEach(placement => {
                const [dr, dc] = placement.direction;
                const len = placement.word.length;
                const [sr, sc] = placement.start;

                ctx.save();
                ctx.lineWidth = Math.max(2, Math.round((0.8 / MM_TO_INCH) * dpi));
                ctx.strokeStyle = "#2563EB";
                const pad = Math.round(cellPx * 0.08);

                for (let i = 0; i < len; i++) {
                    const r = sr + i * dr;
                    const c = sc + i * dc;
                    const bx = c * cellPx + pad;
                    const by = yOffset + r * cellPx + pad;
                    const bw = cellPx - 2 * pad;
                    const bh = cellPx - 2 * pad;
                    ctx.strokeRect(bx, by, bw, bh);
                }
                ctx.restore();
            });
        }
    }

    // 4. Letters Layer
    const fontScale = (style.fontScale || 62) / 100.0;
    const fontPx = Math.max(8, Math.round(cellPx * fontScale));
    const fontFam = style.letterFont || "'Outfit', sans-serif";
    const letterCol = style.letterColor || "#202a26";

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let r = 0; r < height; r++) {
        for (let c = 0; c < width; c++) {
            const letter = puzzle.grid[r][c];
            if (!letter) continue;

            const cx = c * cellPx + cellPx / 2;
            const cy = yOffset + r * cellPx + cellPx / 2;
            const isSolved = solvedSet.has(`${r},${c}`);

            if (solution && solStyle === "bold" && isSolved) {
                ctx.fillStyle = "#1E3A8A";
                ctx.font = `800 ${fontPx + 1}px ${fontFam}`;
            } else {
                ctx.fillStyle = letterCol;
                ctx.font = `bold ${fontPx}px ${fontFam}`;
            }

            ctx.fillText(letter, cx, cy);
        }
    }

    return canvas;
}

/**
 * Render a complete Word Search Book Interior Page (Grid + Formatted Word Bank + Header + Date/Calendar)
 */
export function renderWordSearchBookPageCanvas({
    puzzle,
    style = WS_PRESETS.adult_classic,
    pageNum = 1,
    totalPages = 1,
    dpi = 150,
    dateText = null,
    calendarCanvas = null,
    wordColumns = 3,
    showWordBank = true,
    wordBankTitle = null
} = {}) {
    const w = Math.round(8.5 * dpi);
    const h = Math.round(11.0 * dpi);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    // Header Fonts
    const fontTitlePx = Math.max(16, Math.round((24.0 / 72.0) * dpi));
    const fontDatePx = Math.max(11, Math.round((13.0 / 72.0) * dpi));
    const fontSubPx = Math.max(10, Math.round((12.0 / 72.0) * dpi));
    const fontWordPx = Math.max(9, Math.round((11.5 / 72.0) * dpi));

    // 1. Header with optional mini calendar or date text
    let headerHeight = 70;
    if (calendarCanvas) {
        const calW = Math.round(w * 0.17);
        const calH = Math.round(calW * 0.80);
        ctx.drawImage(calendarCanvas, w - 60 - calW, 28, calW, calH);

        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#111815";
        ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
        ctx.fillText(puzzle.title || `Word Search #${pageNum}`, 60, 48);

        if (dateText) {
            ctx.fillStyle = "#2D7A5D";
            ctx.font = `bold ${fontDatePx}px "Plus Jakarta Sans", sans-serif`;
            ctx.fillText(dateText, 60, 74);
        }
        headerHeight = Math.max(90, calH + 35);
    } else {
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#111815";
        ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
        ctx.fillText(puzzle.title || `Word Search #${pageNum}`, w / 2, 45);

        if (dateText) {
            ctx.fillStyle = "#2D7A5D";
            ctx.font = `bold ${fontDatePx}px "Plus Jakarta Sans", sans-serif`;
            ctx.fillText(dateText, w / 2, 75);
            headerHeight = 98;
        } else {
            headerHeight = 75;
        }
    }

    // Thin accent rule
    ctx.strokeStyle = "#E2E8F0";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(60, headerHeight);
    ctx.lineTo(w - 60, headerHeight);
    ctx.stroke();

    // 2. Word Search Grid
    const availableGridH = showWordBank ? Math.round(h * 0.52) : Math.round(h * 0.75);
    const availableGridW = w - 120;
    const gridMaxDim = Math.min(availableGridW, availableGridH);

    const cellMm = (gridMaxDim / Math.max(puzzle.width, puzzle.height) / dpi) * MM_TO_INCH;
    const gridCnv = renderWordSearchGridCanvas({
        puzzle,
        style,
        cellMm,
        dpi,
        solution: false,
        includeHeader: false,
        showGridLines: true
    });

    const gridX = (w - gridCnv.width) / 2;
    const gridY = headerHeight + 25;
    ctx.drawImage(gridCnv, gridX, gridY);

    // 3. Word Bank Section (if enabled)
    if (showWordBank) {
        const words = [...(puzzle.placedWords || puzzle.words || [])].sort((a, b) => a.localeCompare(b));
        const bankY = gridY + gridCnv.height + 25;

        const defaultBankTitle = (puzzle.language && puzzle.language.includes("German")) ? "Wortliste"
            : (puzzle.language && puzzle.language.includes("Spanish")) ? "Lista de palabras"
            : (puzzle.language && puzzle.language.includes("French")) ? "Liste de mots"
            : (puzzle.language && puzzle.language.includes("Italian")) ? "Elenco parole"
            : "WORDS TO FIND";

        const titleText = wordBankTitle || `${defaultBankTitle} (${words.length})`;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1E293B";
        ctx.font = `bold ${fontSubPx}px "Outfit", sans-serif`;
        ctx.fillText(titleText, w / 2, bankY);

        // Word Bank Columns
        const cols = Math.max(1, Math.min(5, wordColumns));
        const bankMarginX = 65;
        const colW = (w - 2 * bankMarginX) / cols;
        const wordsPerCol = Math.ceil(words.length / cols);
        const lineH = Math.max(14, Math.round(fontWordPx * 1.55));

        for (let c = 0; c < cols; c++) {
            const colWords = words.slice(c * wordsPerCol, (c + 1) * wordsPerCol);
            const colStartX = bankMarginX + c * colW + 15;

            colWords.forEach((word, rIdx) => {
                const wy = bankY + 24 + rIdx * lineH;
                ctx.textAlign = "left";
                ctx.textBaseline = "middle";

                // Checkbox icon
                ctx.strokeStyle = "#94A3B8";
                ctx.lineWidth = 1.2;
                const boxSize = Math.round(fontWordPx * 0.72);
                ctx.strokeRect(colStartX, wy - boxSize / 2, boxSize, boxSize);

                // Word text
                ctx.fillStyle = style.letterColor || "#334155";
                ctx.font = `600 ${fontWordPx}px "Plus Jakarta Sans", sans-serif`;
                ctx.fillText(word, colStartX + boxSize + 8, wy);
            });
        }
    }

    // 4. Page Footer
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#718096";
    ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Page ${pageNum}`, w / 2, h - 25);

    return canvas;
}


/**
 * Render a composite Word Search solution page with multiple solved puzzle answer keys.
 */
export function renderWordSearchSolutionPageCanvas({
    puzzlesSlice = [],
    style = SUDOKU_PRESETS.adult_classic,
    solutionsPerPage = 4,
    pageNum = 1,
    totalPages = 1,
    dpi = 150
} = {}) {
    const w = Math.round(8.5 * dpi);
    const h = Math.round(11.0 * dpi);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, w, h);

    const fontTitlePx = Math.max(16, Math.round((26.0 / 72.0) * dpi));
    const fontSubPx = Math.max(10, Math.round((13.0 / 72.0) * dpi));
    const fontLblPx = Math.max(9, Math.round((11.5 / 72.0) * dpi));

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "#14251F";
    ctx.font = `bold ${fontTitlePx}px "Outfit", sans-serif`;
    ctx.fillText("WORD SEARCH SOLUTIONS", w / 2, 45);

    ctx.fillStyle = "#6B7280";
    ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Answer Keys · Page ${pageNum} of ${totalPages}`, w / 2, 75);

    ctx.strokeStyle = "#E5E7EB";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(60, 95);
    ctx.lineTo(w - 60, 95);
    ctx.stroke();

    let cols = 2, rows = 2;
    if (solutionsPerPage === 1) { cols = 1; rows = 1; }
    else if (solutionsPerPage === 2) { cols = 2; rows = 1; }
    else if (solutionsPerPage === 4) { cols = 2; rows = 2; }
    else if (solutionsPerPage === 6) { cols = 2; rows = 3; }

    const marginX = 60, marginY = 115;
    const cellW = (w - 2 * marginX) / cols;
    const cellH = (h - marginY - 60) / rows;

    puzzlesSlice.slice(0, cols * rows).forEach((p, idx) => {
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const cx = marginX + col * cellW;
        const cy = marginY + row * cellH;

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#1E293B";
        ctx.font = `bold ${fontLblPx}px "Outfit", sans-serif`;
        ctx.fillText(p.title || `Puzzle #${idx + 1}`, cx + cellW / 2, cy + 16);

        const solCnv = renderWordSearchGridCanvas({
            puzzle: p,
            style,
            cellMm: 6.5,
            dpi,
            solution: true,
            includeHeader: false,
            showGridLines: true
        });

        const availDim = Math.min(cellW - 30, cellH - 40);
        const ox = cx + (cellW - availDim) / 2;
        const oy = cy + 28 + (cellH - 35 - availDim) / 2;
        ctx.drawImage(solCnv, ox, oy, availDim, availDim);
    });

    // Page footer
    ctx.fillStyle = "#718096";
    ctx.font = `${fontSubPx}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(`Page ${pageNum}`, w / 2, h - 25);

    return canvas;
}

