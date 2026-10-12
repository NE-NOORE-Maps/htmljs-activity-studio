import {renderSudokuBookPageCanvas, renderSudokuSolutionPageCanvas,
    renderWordSearchBookPageCanvas, renderWordSearchSolutionPageCanvas} from './canvas_renderer.js?v=pro9';
import {TRIM_DIMENSIONS_PT, bookPageCounts, paperbackPageLimit, createBookPage, pageText} from './book_layout.js?v=pro9';
export {TRIM_DIMENSIONS_PT} from './book_layout.js?v=pro9';

// The same physical layout powers previews and exports. PDF pages are rasterized at 300 DPI.
async function buildBook(options, wordsearch) {
    if (!window.jspdf?.jsPDF) throw new Error('The PDF library is unavailable. Check your connection and reload.');
    const {puzzles = [], style, puzzlesPerPage = 1, solutionsPerPage = wordsearch ? 4 : 6,
        trimChoice = '8.5 x 11 inches (Letter)', includeTitlePage = true,
        bookTitle = wordsearch ? 'The Word Search Collection' : 'The Sudoku Collection', onProgress} = options;
    if (!puzzles.length) throw new Error('Add puzzles before exporting.');
    const ppp = wordsearch ? 1 : puzzlesPerPage;
    const counts = bookPageCounts(puzzles.length,ppp,solutionsPerPage,includeTitlePage);
    if (counts.totalPages < 24 || counts.totalPages > paperbackPageLimit(trimChoice)) {
        throw new Error(`This format needs 24–${paperbackPageLimit(trimChoice)} pages for black ink on white paper. Your book has ${counts.totalPages}. Adjust the puzzle count or page layout.`);
    }
    const [w,h] = TRIM_DIMENSIONS_PT[trimChoice] || TRIM_DIMENSIONS_PT['8.5 x 11 inches (Letter)'];
    const doc = new window.jspdf.jsPDF({orientation:'portrait',unit:'pt',format:[w,h],compress:true});
    doc.setProperties({title:bookTitle,creator:'KDP Activity Studio Pro'});
    let physicalPage = 0;
    const addCanvas = async canvas => {
        if (physicalPage++) doc.addPage([w,h]);
        // Lossless text and grid edges, with actual 300 DPI page dimensions.
        doc.addImage(canvas.toDataURL('image/png'),'PNG',0,0,w,h,undefined,'FAST');
        canvas.width = 1; canvas.height = 1; // Release each large page bitmap promptly.
        onProgress?.(Math.round(physicalPage/counts.totalPages*100));
        await new Promise(resolve=>setTimeout(resolve,0));
    };
    const basic = {trimChoice,dpi:300,bookTotalPages:counts.totalPages};
    if (includeTitlePage) {
        const title = createBookPage({...basic,bookPageNum:1});
        const center = title.left+title.liveWidth/2;
        // Wrap the user title to keep longer titles readable.
        const words = bookTitle.trim().split(/\s+/), lines = [];
        let line = '';
        for(const word of words) {
            const candidate = line ? line+' '+word : word;
            if(candidate.length>28 && line) { lines.push(line); line=word; } else line=candidate;
        }
        if(line) lines.push(line);
        lines.forEach((text,i)=>pageText(title.ctx,text,center,h*.35+i*34,title.liveWidth,28,'600','center'));
        pageText(title.ctx,`${puzzles.length} ${wordsearch?'word search':'Sudoku'} puzzles`,center,h*.35+lines.length*34+30,title.liveWidth,13,'400','center');
        pageText(title.ctx,'With complete answer keys',center,h*.35+lines.length*34+54,title.liveWidth,11,'400','center');
        await addCanvas(title.canvas);
    }
    for(let i=0;i<counts.puzzlePages;i++) {
        const offset=i*ppp;
        const shared={...options,...basic,style,pageNum:i+1,bookPageNum:physicalPage+1,totalPages:counts.puzzlePages};
        const canvas=wordsearch ? renderWordSearchBookPageCanvas({...shared,puzzle:puzzles[i],
            dateText:options.dateStrings?.[i],calendarCanvas:options.calendarCanvases?.[i]})
            : renderSudokuBookPageCanvas({...shared,puzzlesSlice:puzzles.slice(offset,offset+ppp),
                dateStrings:options.dateStrings?.slice(offset,offset+ppp),calendarCanvases:options.calendarCanvases?.slice(offset,offset+ppp),
                pageDateText:options.pageDateStrings?.[i],pageCalendarCanvas:options.pageCalendarCanvases?.[i]});
        await addCanvas(canvas);
    }
    const divider=createBookPage({...basic,bookPageNum:physicalPage+1});
    pageText(divider.ctx,'Answer keys',divider.left+divider.liveWidth/2,h*.44,divider.liveWidth,28,'600','center');
    pageText(divider.ctx,'Find each puzzle by its number.',divider.left+divider.liveWidth/2,h*.44+35,divider.liveWidth,12,'400','center');
    await addCanvas(divider.canvas);
    const answerRenderer=wordsearch?renderWordSearchSolutionPageCanvas:renderSudokuSolutionPageCanvas;
    for(let i=0;i<counts.solutionPages;i++) {
        await addCanvas(answerRenderer({...basic,style,solutionsPerPage,pageNum:i+1,bookPageNum:physicalPage+1,
            totalPages:counts.solutionPages,puzzlesSlice:puzzles.slice(i*solutionsPerPage,(i+1)*solutionsPerPage)}));
    }
    if(counts.blankPages) await addCanvas(createBookPage({...basic,bookPageNum:physicalPage+1}).canvas);
    return doc.output('arraybuffer');
}
export function buildSudokuKdpPdf(options = {}) { return buildBook(options,false); }
export function buildWordSearchKdpPdf(options = {}) { return buildBook(options,true); }
