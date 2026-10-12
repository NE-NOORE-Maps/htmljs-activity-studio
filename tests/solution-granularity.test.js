import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCanvaSudokuExcel,
  buildCanvaWordSearchExcel,
  buildPerGridSolutionWorkbooks,
  buildSolutionPageWorkbooks
} from '../js/excel_exporter.js';

class Workbook {
  constructor(){this.sheets=[];this.images=[];this.xlsx={writeBuffer:async()=>this};}
  addWorksheet(name){
    const s={name,rows:[],images:[],getRow:()=>({}),addRow(data){this.rows.push(data);return {};},addImage(id,anchor){this.images.push({id,anchor});}};
    this.sheets.push(s);return s;
  }
  addImage(image){this.images.push(image);return this.images.length-1;}
}
globalThis.window={ExcelJS:{Workbook}};

const png = i => `data:image/png;base64,image${i}`;

function sliceProvider(puzzles, log) {
  return async (puzStart, puzEnd, pageStart, pageEnd) => {
    log?.push([puzStart, puzEnd, pageStart, pageEnd]);
    const gridImages = new Array(puzzles.length);
    for (let i = puzStart; i < puzEnd; i++) gridImages[i] = png(i);
    return { gridImages };
  };
}

test('per_page mode keeps composed answer pages even when solutions are separate', async () => {
  const puzzles = Array.from({length: 11}, (_, i) => ({title: `Puzzle ${i + 1}`, placedWords: ['CAT']}));
  const perPage = 4;
  const composed = Array.from({length: Math.ceil(11 / perPage)}, (_, i) => png(`page${i}`));
  const result = await buildCanvaWordSearchExcel({
    puzzles,
    gridImages: puzzles.map((_, i) => png(i)),
    includeSolutionInSameExcel: false,
    solutionImageMode: 'per_page',
    solutionPageImages: composed,
    solutionsPerPage: perPage,
    batchSize: 100
  });
  const solutions = result.files.filter(f => f.filename.includes('solution'));
  assert.equal(solutions.length, 1);
  const sheet = solutions[0].buffer.sheets[0];
  assert.equal(sheet.rows.length, 3);
  assert.ok(sheet.rows.every(r => 'puzzle_numbers' in r && 'solution_count' in r && !('solution_1_number' in r)));
  assert.equal(solutions[0].buffer.images.length, composed.length);
});

test('skipSeparateSolutions lets the caller stream solution workbooks itself', async () => {
  const puzzles = Array.from({length: 6}, (_, i) => ({title: `Puzzle ${i + 1}`}));
  const result = await buildCanvaSudokuExcel({
    puzzles,
    puzzlesPerPage: 1,
    gridImages: puzzles.map((_, i) => png(i)),
    includeSolutionInSameExcel: false,
    skipSeparateSolutions: true,
    solutionsPerPage: 4,
    batchSize: 100
  });
  assert.equal(result.files.filter(f => f.filename.includes('solution')).length, 0);
  assert.equal(result.files[0].buffer.sheets[0].rows.length, 6);
});

test('imageBatchProvider streams images one batch at a time', async () => {
  const puzzles = Array.from({length: 5}, (_, i) => ({title: `Puzzle ${i + 1}`, placedWords: ['CAT']}));
  const calls = [];
  const result = await buildCanvaWordSearchExcel({
    puzzles,
    imageBatchProvider: sliceProvider(puzzles, calls),
    includeSolutionInSameExcel: false,
    skipSeparateSolutions: true,
    numberOffset: 10,
    solutionsPerPage: 4,
    batchSize: 2
  });
  assert.deepEqual(calls, [[0, 2, 0, 2], [2, 4, 2, 4], [4, 5, 4, 5]]);
  assert.equal(result.files.length, 3);
  assert.deepEqual(
    result.files.flatMap(f => f.buffer.sheets[0].rows).map(r => r.puzzle_number),
    [11, 12, 13, 14, 15]
  );
  assert.deepEqual(result.files.map(f => f.buffer.images.length), [2, 2, 1]);
});

test('numberOffset shifts puzzle numbers but never page numbers', async () => {
  const puzzles = Array.from({length: 8}, (_, i) => ({title: `Puzzle ${i + 1}`}));
  const onePerPage = await buildCanvaSudokuExcel({
    puzzles,
    puzzlesPerPage: 1,
    imageBatchProvider: sliceProvider(puzzles),
    includeSolutionInSameExcel: false,
    skipSeparateSolutions: true,
    numberOffset: 99,
    solutionsPerPage: 4,
    batchSize: 100
  });
  assert.deepEqual(onePerPage.files[0].buffer.sheets[0].rows.map(r => r.puzzle_number), [100, 101, 102, 103, 104, 105, 106, 107]);

  const perFour = await buildCanvaSudokuExcel({
    puzzles,
    puzzlesPerPage: 4,
    imageBatchProvider: sliceProvider(puzzles),
    includeSolutionInSameExcel: false,
    skipSeparateSolutions: true,
    numberOffset: 99,
    solutionsPerPage: 4,
    batchSize: 100
  });
  assert.deepEqual(perFour.files[0].buffer.sheets[0].rows.map(r => r.page_number), [1, 2]);
});

test('per-grid solution workbooks honour pageOffset and puzzleNumberOffset', async () => {
  const puzzles = Array.from({length: 4}, (_, i) => ({title: `Puzzle ${i + 101}`}));
  const result = await buildPerGridSolutionWorkbooks({
    puzzles,
    solutionImages: puzzles.map((_, i) => png(i)),
    solutionsPerPage: 2,
    batchSize: 0,
    mode: 'sudoku',
    pageOffset: 5,
    puzzleNumberOffset: 100
  });
  assert.equal(result.files.length, 1);
  assert.equal(result.files[0].filename, 'sudoku_solutions_pages_6-7.xlsx');
  const rows = result.files[0].buffer.sheets[0].rows;
  assert.deepEqual(rows.map(r => r.page_number), [6, 7]);
  assert.deepEqual(rows.map(r => r.solution_1_number), [101, 103]);
  assert.deepEqual(rows.map(r => r.solution_2_number), [102, 104]);
  assert.equal(rows[0].solution_1_title, 'Puzzle 101');
});

test('composed solution workbooks honour pageOffset and puzzleNumberOffset', async () => {
  const puzzles = Array.from({length: 4}, (_, i) => ({title: `Puzzle ${i + 1}`}));
  const result = await buildSolutionPageWorkbooks({
    puzzles,
    solutionPageImages: [png(0), png(1)],
    solutionsPerPage: 2,
    batchSize: 0,
    mode: 'sudoku',
    pageOffset: 7,
    puzzleNumberOffset: 20
  });
  assert.equal(result.files[0].filename, 'sudoku_solution_pages_8-9.xlsx');
  const rows = result.files[0].buffer.sheets[0].rows;
  assert.deepEqual(rows.map(r => r.page_number), [8, 9]);
  assert.deepEqual(rows.map(r => r.puzzle_numbers), ['21, 22', '23, 24']);
});
