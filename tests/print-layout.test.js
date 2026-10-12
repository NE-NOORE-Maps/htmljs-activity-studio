import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSudokuBookPageCanvas, renderSudokuSolutionPageCanvas,
  renderWordSearchBookPageCanvas, renderWordSearchSolutionPageCanvas } from '../js/canvas_renderer.js';
import { generateSudokuPuzzle } from '../js/sudoku_engine.js';
import { generateWordSearchPuzzle } from '../js/wordsearch_engine.js';

// Recording context isolates physical layout from platform font rasterization.
globalThis.document = { createElement() {
  const calls = [];
  const ctx = new Proxy({ calls, measureText: text => ({ width: String(text).length * 6 }) }, {
    get(target, key) { return key in target ? target[key] : (...args) => calls.push([key, ...args]); }
  });
  return { width: 0, height: 0, getContext: () => ctx };
}};
const sdk = generateSudokuPuzzle({seed:42});
const ws = generateWordSearchPuzzle({words:['APPLE','PEAR','PLUM','GRAPE'],width:12,height:12,seed:42});
const renderers = [
  ['Sudoku puzzle', renderSudokuBookPageCanvas, {puzzlesSlice:[sdk]}],
  ['Sudoku solutions', renderSudokuSolutionPageCanvas, {puzzlesSlice:[sdk]}],
  ['Word Search puzzle', renderWordSearchBookPageCanvas, {puzzle:ws}],
  ['Word Search solutions', renderWordSearchSolutionPageCanvas, {puzzlesSlice:[ws]}]
];
for (const [name, render, args] of renderers) {
  for (const [trimChoice,w,h] of [['6 x 9 inches',6,9],['8.5 x 8.5 inches',8.5,8.5],['8 x 10 inches',8,10]]) {
    test(`${name} respects ${trimChoice} at 300 DPI`, () => {
      const canvas = render({...args,trimChoice,dpi:300});
      assert.deepEqual([canvas.width,canvas.height],[w*300,h*300]);
    });
  }
  test(`${name} keeps grid proportions on square pages`, () => {
    const canvas = render({...args,trimChoice:'8.5 x 8.5 inches',dpi:300});
    for (const [,img,,,w,h] of canvas.getContext('2d').calls.filter(c => c[0]==='drawImage' && c.length===6)) {
      assert.ok(Math.abs(w/h - img.width/img.height)<0.001, 'grid must not stretch');
    }
  });
}
