// Paperback, black ink / white paper, no bleed. Source checked October 2026:
// https://kdp.amazon.com/en_US/help/topic/G201857950
export const TRIM_DIMENSIONS_PT = {
    '8.5 x 11 inches (Letter)': [612, 792],
    '6 x 9 inches': [432, 648],
    '8.5 x 8.5 inches': [612, 612],
    '8 x 10 inches': [576, 720]
};

export function bookPageCounts(puzzles, perPage = 1, solutionsPerPage = 4, titlePage = true) {
    const puzzlePages = Math.ceil(puzzles / perPage);
    const solutionPages = Math.ceil(puzzles / solutionsPerPage);
    const contentPages = Number(titlePage) + puzzlePages + 1 + solutionPages;
    return { puzzlePages, solutionPages, contentPages, blankPages: contentPages % 2,
        totalPages: contentPages + contentPages % 2 };
}

export function pageGeometry(trimChoice = '8.5 x 11 inches (Letter)', pageNumber = 1, totalPages = 1) {
    const [width, height] = TRIM_DIMENSIONS_PT[trimChoice] || TRIM_DIMENSIONS_PT['8.5 x 11 inches (Letter)'];
    const inside = totalPages > 700 ? 63 : totalPages > 500 ? 54 : totalPages > 300 ? 45 : 36;
    const left = pageNumber % 2 ? inside : 36;
    const right = pageNumber % 2 ? 36 : inside;
    return { width, height, left, right, top:36, bottom:36, inside, liveWidth:width-left-right };
}

export function paperbackPageLimit(trimChoice) {
    return trimChoice?.startsWith('8.5') ? 590 : 828;
}

export function createBookPage({trimChoice, pageNum = 1, bookPageNum = pageNum, totalPages = 1, bookTotalPages = totalPages, dpi = 150} = {}) {
    const geometry = pageGeometry(trimChoice, bookPageNum, bookTotalPages);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(geometry.width / 72 * dpi);
    canvas.height = Math.round(geometry.height / 72 * dpi);
    const ctx = canvas.getContext('2d');
    ctx.scale(dpi / 72, dpi / 72);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,geometry.width,geometry.height);
    ctx.textBaseline = 'middle';
    return {canvas,ctx,...geometry};
}

export function pageText(ctx, text, x, y, maxWidth, size = 12, weight = '400', align = 'left') {
    ctx.fillStyle = '#182522';
    ctx.textAlign = align;
    ctx.font = `${weight} ${size}px "Outfit", sans-serif`;
    // Fit long user titles without cutting off their content.
    const measured = ctx.measureText(String(text)).width;
    if (measured > maxWidth) ctx.font = `${weight} ${Math.max(7,size*maxWidth/measured)}px "Outfit", sans-serif`;
    ctx.fillText(String(text),x,y,maxWidth);
}

export function fitImage(ctx, image, x, y, width, height, verticalAlign = 'center') {
    const ratio = Math.min(width/image.width,height/image.height);
    const w = image.width*ratio, h = image.height*ratio;
    ctx.drawImage(image,x+(width-w)/2,verticalAlign === 'top' ? y : y+(height-h)/2,w,h);
}

export function pageFooter(page, pageNum) {
    pageText(page.ctx, String(pageNum), page.left+page.liveWidth/2, page.height-40, page.liveWidth,9,'400','center');
}
