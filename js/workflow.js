import {bookPageCounts, paperbackPageLimit, pageGeometry} from './book_layout.js?v=pro8';

const steps = ['tab-volume','tab-rules','tab-styling','tab-review'];
const names = ['Book setup','Puzzle content','Page design','Review & export'];
let currentStep = 0;
const el = id => document.getElementById(id);

export function setWorkflowStep(index) {
    currentStep = Math.max(0,Math.min(steps.length-1,index));
    document.querySelectorAll('.sidebar-tab-btn').forEach(button => {
        const active = button.dataset.tab === steps[currentStep];
        button.classList.toggle('active',active);
        button.setAttribute('aria-current',active?'step':'false');
    });
    document.querySelectorAll('.tab-panel').forEach(panel=>panel.classList.toggle('active',panel.id===steps[currentStep]));
    el('step-back').disabled = currentStep===0;
    el('step-next').hidden = currentStep===3;
    el('step-next').textContent = currentStep<3 ? `Next: ${names[currentStep+1]} →` : 'Review & export';
    window.scrollTo({top: 0, behavior: 'instant'});
}

export function activeBook(state) {
    const ws = state.mode === 'wordsearch';
    const count = state.totalPuzzlesCount || 0;
    const perPage = ws?1:state.puzzlesPerPage;
    const answers = ws?state.wsSolutionsPerPage:state.solutionsPerPage;
    const trim = ws?state.wsTrimChoice:state.trimChoice;
    const title = state.bookTitles[state.mode];
    const includeTitlePage = state.titlePages[state.mode];
    return {ws,count,perPage,answers,trim,title,includeTitlePage,...bookPageCounts(count,perPage,answers,includeTitlePage)};
}

export function syncWorkflowMode(state) {
    document.querySelectorAll('[data-studio]').forEach(section=>section.hidden=section.dataset.studio!==state.mode);
    el('book-title').value = state.bookTitles[state.mode];
    el('include-title-page').checked = state.titlePages[state.mode];
    ['wordsearch','sudoku'].forEach(mode=>el(`mode-${mode}-btn`).setAttribute('aria-pressed',String(mode===state.mode)));
}

export function updateWorkflow(state) {
    const book = activeBook(state);
    el('preview-book-title').textContent = book.title || 'Untitled collection';
    el('preview-format-label').textContent = `${book.trim} · ${book.totalPages} interior pages · No bleed`;
    const facts = document.createElement('dl'); facts.className='book-facts';
    for (const [label,value] of [['Puzzles',book.count],['Interior pages',book.totalPages],['Puzzle pages',book.puzzlePages],['Answer pages',book.solutionPages]]) {
        const item=document.createElement('div'), dt=document.createElement('dt'),dd=document.createElement('dd');
        dt.textContent=label;dd.textContent=value;item.append(dt,dd);facts.append(item);
    }
    el('book-review').replaceChildren(facts);
    const checks=[];
    const limit=paperbackPageLimit(book.trim);
    const sizeOk=book.totalPages>=24 && book.totalPages<=limit;
    checks.push([sizeOk?'ok':'error',sizeOk?`Page count fits this paperback format (${limit} maximum).`:`This format needs 24–${limit} pages. Adjust your puzzle count or page layout.`]);
    checks.push(['ok',`${book.includeTitlePage?'Title page, ':''}answer divider${book.blankPages?' and one final blank page':''} included in the page count.`]);
    checks.push(['ok',`300 DPI PDF · ${(pageGeometry(book.trim,1,book.totalPages).inside/72).toFixed(3).replace(/0+$/,'')}″ inside margin · mirrored for binding.`]);
    const prefix=book.ws?'ws':'sdk';
    const invalid=[...document.querySelectorAll(`#${prefix}-volume-section input, #${prefix}-rules-section input, #${prefix}-styling-section input, #book-title`)]
        .find(input=>!input.checkValidity());
    if(invalid) checks.push(['error','Complete the required fields and keep numeric values within their allowed range.']);
    const badWordoku=!book.ws && state.sudokuType==='wordoku_9x9' && !/^[A-Z]{9}$/.test(state.wordokuWord.toUpperCase()) ||
        !book.ws && state.sudokuType==='wordoku_9x9' && new Set(state.wordokuWord.toUpperCase()).size!==9;
    if(badWordoku) checks.push(['error','Wordoku needs nine different letters, for example PUBLISHER.']);
    if(book.count===0) checks.push(['error','Add a word list or import a CSV to create your puzzles.']);
    if(book.ws && state.wordPoolCount < book.count*state.wsWordsPerPage && book.count>1) {
        checks.push(['warning',`Your ${state.wordPoolCount || 0} words are reused across this collection. Import more themed words for greater variety.`]);
    }
    const unplaced=state.puzzles?.reduce((n,p)=>n+(p.unplacedWords?.length||0),0)||0;
    if(unplaced) checks.push(['error',`${unplaced} words do not fit in the preview puzzles. Enlarge the grid or reduce words per puzzle.`]);
    if(state.previewError) checks.push(['error',state.previewError]);
    if((!book.ws && book.perPage>=4) || book.answers>=6) checks.push(['warning','Compact layouts use smaller type. Inspect an answer page at full size before printing.']);
    const nodes=checks.map(([kind,text])=>{const p=document.createElement('p');p.className=`review-check ${kind}`;p.textContent=`${kind==='ok'?'✓':kind==='warning'?'•':'!'} ${text}`;return p;});
    el('review-checks').replaceChildren(...nodes);
    const invalidContent=!!invalid||badWordoku||book.count===0||!!unplaced||!!state.previewError;
    state.exportBlocked=invalidContent;
    state.pdfBlocked=invalidContent||!sizeOk;
    for(const id of ['btn-export-canva','btn-export-solutions','btn-export-zip','btn-export-pdf']) {
        el(id).disabled=!!state.isExporting||(id==='btn-export-pdf'?state.pdfBlocked:state.exportBlocked);
    }
    el('export-summary-text').textContent=`${book.count} puzzles · ${book.trim} · ${book.totalPages} PDF pages`;
    el('studio-message').textContent=state.previewError || (invalidContent?'Check your content in Review & export before downloading.':'');
}

export function setupWorkflow(state, refresh) {
    document.querySelectorAll('.sidebar-tab-btn').forEach(button=>button.addEventListener('click',()=>setWorkflowStep(steps.indexOf(button.dataset.tab))));
    el('step-back').addEventListener('click',()=>setWorkflowStep(currentStep-1));
    el('step-next').addEventListener('click',()=>setWorkflowStep(currentStep+1));
    el('jump-review').addEventListener('click',()=>setWorkflowStep(3));
    el('book-title').addEventListener('input',e=>{state.bookTitles[state.mode]=e.target.value;updateWorkflow(state);});
    el('include-title-page').addEventListener('change',e=>{state.titlePages[state.mode]=e.target.checked;refresh();});
    document.querySelector('.sidebar-content').addEventListener('input',()=>updateWorkflow(state));
    document.querySelector('.sidebar-content').addEventListener('change',()=>updateWorkflow(state));
    setWorkflowStep(0);
    syncWorkflowMode(state);
}
