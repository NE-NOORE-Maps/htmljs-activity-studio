import {createBookPage, pageText, fitImage, pageFooter} from "./book_layout.js?v=pro9";
/**
 * High-Resolution 300 DPI Canvas Raster Renderer for KDP Print & Live Previews.
 * Renders Sudoku grids, word searches, multi-game book interior pages, and composite solutions.
 */

const MM_TO_INCH = 25.4;

// Page composition uses points, independent of the raster resolution.
export function renderSudokuBookPageCanvas(options = {}) {
    const {puzzlesSlice = [], style = SUDOKU_PRESETS.adult_classic, puzzlesPerPage = 1,
        pageNum = 1, bookPageNum = pageNum, dpi = 150, includeInstructions = true,
        dateScope = 'per_game', dateStrings = [], calendarCanvases = [], pageDateText, pageCalendarCanvas} = options;
    const page = createBookPage(options);
    const {ctx,left,liveWidth,height} = page;
    const cols = puzzlesPerPage >= 4 ? 2 : 1;
    const rows = Math.ceil(puzzlesPerPage/cols);
    let top = 42;
    if (dateScope === 'per_page' && (pageDateText || pageCalendarCanvas)) {
        pageText(ctx,pageDateText || 'Daily puzzles',left,top+10,liveWidth-90,18,'600');
        if (pageCalendarCanvas) fitImage(ctx,pageCalendarCanvas,left+liveWidth-80,top,80,60);
        top += pageCalendarCanvas ? 72 : 34;
    }
    const gap = 18, cellW = (liveWidth-gap*(cols-1))/cols;
    const cellH = (height-top-64-gap*(rows-1))/rows;
    puzzlesSlice.slice(0,puzzlesPerPage).forEach((p,i) => {
        const x = left+(i%cols)*(cellW+gap), y = top+Math.floor(i/cols)*(cellH+gap);
        const date = dateScope === 'per_game' ? dateStrings?.[i] : null;
        const calendar = dateScope === 'per_game' ? calendarCanvases?.[i] : null;
        const calW = calendar ? Math.min(74,cellW*.25) : 0;
        const headingW = cellW-(calW ? calW+12 : 0);
        pageText(ctx,p.title || `Sudoku ${p.puzzleId}`,x,y+10,headingW,puzzlesPerPage===1?22:13,'600');
        pageText(ctx,[p.difficultyLabel,date].filter(Boolean).join(' · '),x,y+30,headingW,10);
        if(calendar) fitImage(ctx,calendar,x+cellW-calW,y,calW,54);
        let header = calendar ? 65 : 46;
        if(includeInstructions && puzzlesPerPage<=2) {
            const rule = p.isX ? 'Rows, columns, boxes and both diagonals must contain each symbol once.'
                : p.isWindoku ? 'Rows, columns, boxes and shaded windows must contain each symbol once.'
                : 'Fill every row, column and box with each symbol exactly once.';
            pageText(ctx,rule,x,y+header,cellW,9);
            header += 18;
        }
        const size = Math.min(cellW,cellH-header);
        const grid = renderSudokuGridCanvas({puzzle:p,style,dpi,cellMm:(size/72*25.4)/p.size});
        fitImage(ctx,grid,x,y+header,cellW,cellH-header);
    });
    pageFooter(page,bookPageNum);
    return page.canvas;
}

export function renderWordSearchBookPageCanvas(options = {}) {
    const {puzzle, style = WS_PRESETS.adult_classic, pageNum = 1, bookPageNum = pageNum,
        dpi = 150, dateText, calendarCanvas, wordColumns = 3, showWordBank = true, wordBankTitle} = options;
    const page = createBookPage(options);
    const {ctx,left,liveWidth,height} = page;
    const words = [...(puzzle.placedWords || puzzle.words || [])].sort((a,b)=>a.localeCompare(b));
    const cols = Math.max(1,Math.min(5,wordColumns)), bankRows = Math.ceil(words.length/cols);
    const fontSize = style.fontScale >= 76 ? 14 : 11;
    const lineH = fontSize*1.6;
    const bankHeight = showWordBank ? 34+bankRows*lineH : 0;
    const top = calendarCanvas ? 116 : dateText ? 103 : 85;
    pageText(ctx,puzzle.title || `Word Search ${puzzle.puzzleId || pageNum}`,left,53,liveWidth-(calendarCanvas?100:0),22,'600');
    pageText(ctx,[dateText,`Puzzle ${puzzle.puzzleId || pageNum}`].filter(Boolean).join(' · '),left,75,liveWidth-(calendarCanvas?100:0),10);
    if(calendarCanvas) fitImage(ctx,calendarCanvas,left+liveWidth-85,39,85,64);
    const availableH = height-top-bankHeight-72;
    if(availableH < 72) throw new Error('The word list is too tall for this page. Use more word columns or fewer words per puzzle.');
    const cellPt = Math.min(liveWidth/puzzle.width, availableH/puzzle.height);
    const grid = renderWordSearchGridCanvas({puzzle,style,dpi,cellMm:cellPt/72*25.4,showGridLines:true});
    const gridH = Math.min(availableH,liveWidth*grid.height/grid.width);
    fitImage(ctx,grid,left,top,liveWidth,gridH);
    if(showWordBank) {
        const bankY = top+gridH+26;
        pageText(ctx,wordBankTitle || 'Words to find',left,bankY,liveWidth,11,'600');
        const colW = liveWidth/cols;
        words.forEach((word,i) => {
            const x = left+Math.floor(i/bankRows)*colW, y = bankY+24+(i%bankRows)*lineH;
            ctx.strokeStyle = '#777'; ctx.lineWidth = .75;
            ctx.strokeRect(x,y-3.5,7,7);
            pageText(ctx,word,x+13,y,colW-20,fontSize,'400');
        });
    }
    pageFooter(page,bookPageNum);
    return page.canvas;
}

function renderAnswerPage(options, wordsearch) {
    const {puzzlesSlice = [], solutionsPerPage = wordsearch?4:6, pageNum = 1,
        bookPageNum = pageNum, dpi = 150, style = wordsearch?WS_PRESETS.adult_classic:SUDOKU_PRESETS.adult_classic} = options;
    const page = createBookPage(options);
    const {ctx,left,liveWidth,height} = page;
    pageText(ctx,'Answer key',left,53,liveWidth,22,'600');
    const cols = solutionsPerPage<=2?1:solutionsPerPage===9?3:2;
    const rows = Math.ceil(solutionsPerPage/cols), gap = 18;
    const cellW = (liveWidth-gap*(cols-1))/cols, cellH = (height-152-gap*(rows-1))/rows;
    puzzlesSlice.slice(0,solutionsPerPage).forEach((p,i) => {
        const x = left+(i%cols)*(cellW+gap), y = 89+Math.floor(i/cols)*(cellH+gap);
        pageText(ctx,`${p.puzzleId || i+1} · ${p.title}`,x,y+6,cellW,10,'600');
        const cellPt = Math.min(cellW/(wordsearch?p.width:p.size),(cellH-23)/(wordsearch?p.height:p.size));
        const render = wordsearch?renderWordSearchGridCanvas:renderSudokuGridCanvas;
        const grid = render({puzzle:p,style,solution:true,dpi,cellMm:cellPt/72*25.4});
        fitImage(ctx,grid,x,y+23,cellW,cellH-23,'top');
    });
    pageFooter(page,bookPageNum);
    return page.canvas;
}

export function renderSudokuSolutionPageCanvas(options = {}) { return renderAnswerPage(options,false); }
export function renderWordSearchSolutionPageCanvas(options = {}) { return renderAnswerPage(options,true); }

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

/**
 * Render a composite solution page with multiple solved Sudoku answers.
 */

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

/**
 * Render a composite Word Search solution page with multiple solved puzzle answer keys.
 */
