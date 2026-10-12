import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSolutionPageWorkbooks} from '../js/excel_exporter.js';
class Workbook {
  constructor(){this.sheets=[];this.images=[];this.xlsx={writeBuffer:async()=>this};}
  addWorksheet(name){const sheet={name,rows:[],images:[],getRow:()=>({}),addRow(data){this.rows.push(data);return {};},addImage(id,anchor){this.images.push({id,anchor});}};this.sheets.push(sheet);return sheet;}
  addImage(image){this.images.push(image);return this.images.length-1;}
}
globalThis.window={ExcelJS:{Workbook}};
for(const perPage of [2,3,4,6]) test(`solution-only workbook embeds one complete ${perPage}-answer page image per row`,async()=>{
 const puzzles=Array.from({length:11},(_,i)=>({title:`Puzzle ${i+1}`}));
 const pageImages=Array.from({length:Math.ceil(11/perPage)},(_,i)=>`data:image/png;base64,page${i}`);
 const result=await buildSolutionPageWorkbooks({puzzles,solutionPageImages:pageImages,solutionsPerPage:perPage,batchSize:2,mode:'wordsearch'});
 const rows=result.files.flatMap(file=>file.buffer.sheets[0].rows);
 assert.equal(rows.length,pageImages.length);
 assert.deepEqual(rows.map(row=>row.puzzle_numbers),Array.from({length:pageImages.length},(_,page)=>Array.from({length:perPage},(_,slot)=>page*perPage+slot+1).filter(n=>n<=11).join(', ')));
 assert.equal(result.files.reduce((sum,file)=>sum+file.buffer.images.length,0),pageImages.length);
 assert.deepEqual(result.files.flatMap(file=>file.buffer.images.map(image=>image.base64)),pageImages.map(image=>image.split(',')[1]));
 assert.ok(result.files.every(file=>file.buffer.sheets[0].images.every(image=>Math.floor(image.anchor.tl.col)===3)));
});
