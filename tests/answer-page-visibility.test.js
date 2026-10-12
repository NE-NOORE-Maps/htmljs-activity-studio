import test from 'node:test';
import assert from 'node:assert/strict';
import {renderSudokuSolutionPageCanvas,renderWordSearchSolutionPageCanvas} from '../js/canvas_renderer.js';
import {generateSudokuPuzzle} from '../js/sudoku_engine.js';
import {generateWordSearchPuzzle} from '../js/wordsearch_engine.js';
globalThis.document={createElement(){const calls=[];const ctx=new Proxy({calls,measureText:t=>({width:String(t).length*6})},{get(o,k){return k in o?o[k]:(...args)=>calls.push([k,...args]);}});return{width:0,height:0,getContext:()=>ctx};}};
const sdk=generateSudokuPuzzle({seed:2});
const ws=generateWordSearchPuzzle({words:['APPLE','PEAR','PLUM'],width:12,height:12,seed:2});
for(const [name,render,puzzle] of [['Sudoku',renderSudokuSolutionPageCanvas,sdk],['Word Search',renderWordSearchSolutionPageCanvas,ws]]){
 for(const perPage of [2,3,4]) test(`${name} ${perPage}-answer page draws every solved grid near its label`,()=>{
  const puzzles=Array.from({length:perPage},(_,i)=>({...puzzle,puzzleId:i+1,title:`Puzzle ${i+1}`}));
  const page=render({puzzlesSlice:puzzles,solutionsPerPage:perPage,dpi:150});
  const calls=page.getContext('2d').calls;
  const images=calls.filter(c=>c[0]==='drawImage');
  assert.equal(images.length,perPage);
  assert.ok(images[0][3] < 200,'first solved grid should start just below its label');
  assert.ok(images.every(c=>c[4]>0&&c[5]>0),'grids must have visible area');
 });
}
