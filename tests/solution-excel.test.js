import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCanvaSudokuExcel,buildCanvaWordSearchExcel} from '../js/excel_exporter.js';
class Workbook {
  constructor(){this.sheets=[];this.images=[];this.xlsx={writeBuffer:async()=>this};}
  addWorksheet(name){const s={name,rows:[],images:[],getRow:()=>({}),addRow(data){this.rows.push(data);return {};},addImage(id,anchor){this.images.push({id,anchor});}};this.sheets.push(s);return s;}
  addImage(image){this.images.push(image);return this.images.length-1;}
}
globalThis.window={ExcelJS:{Workbook}};
for(const [mode,build] of [['sudoku',buildCanvaSudokuExcel],['wordsearch',buildCanvaWordSearchExcel]]){
  for(const perPage of [2,3,4,6,9]) test(`${mode}: separate ${perPage} answers per row with embedded pictures`,async()=>{
    const puzzles=Array.from({length:11},(_,i)=>({title:`Puzzle ${i+1}`,placedWords:['CAT']}));
    const images=puzzles.map((_,i)=>`data:image/png;base64,image${i}`);
    const result=await build({puzzles,gridImages:images,solutionImages:images,includeSolutionInSameExcel:false,solutionsPerPage:perPage,batchSize:2});
    const solutions=result.files.filter(f=>f.filename.includes('solutions'));
    assert.ok(solutions.length>0,'separate solution workbooks must exist');
    const rows=solutions.flatMap(f=>f.buffer.sheets[0].rows);
    assert.equal(rows.length,Math.ceil(11/perPage));
    assert.equal(solutions.reduce((n,f)=>n+f.buffer.images.length,0),11);
    assert.deepEqual(rows.map(r=>r.page_number),Array.from({length:rows.length},(_,i)=>i+1));
    assert.deepEqual(rows.flatMap(r=>Array.from({length:perPage},(_,i)=>r[`solution_${i+1}_number`]).filter(Boolean)),Array.from({length:11},(_,i)=>i+1));
    assert.ok(solutions.every(f=>f.buffer.images.every(im=>!im.base64.startsWith('data:'))));
    assert.ok(result.isSplit);
  });
}
