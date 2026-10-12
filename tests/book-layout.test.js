import test from 'node:test';
import assert from 'node:assert/strict';
import {bookPageCounts,pageGeometry,paperbackPageLimit} from '../js/book_layout.js';

test('manuscript counts include front matter, divider, answers and even-page padding',()=>{
    assert.deepEqual(bookPageCounts(18,1,4,true),{puzzlePages:18,solutionPages:5,contentPages:25,blankPages:1,totalPages:26});
    assert.deepEqual(bookPageCounts(20,1,6,true),{puzzlePages:20,solutionPages:4,contentPages:26,blankPages:0,totalPages:26});
    assert.equal(bookPageCounts(20,1,6,false).totalPages,26);
    assert.equal(bookPageCounts(100,4,9,false).totalPages,38);
});
test('binding margin changes at page-count thresholds and mirrors on even pages',()=>{
    for(const [count,margin] of [[150,36],[300,36],[301,45],[500,45],[501,54],[700,54],[701,63]]) {
        const odd=pageGeometry('6 x 9 inches',1,count),even=pageGeometry('6 x 9 inches',2,count);
        assert.equal(odd.left,margin);assert.equal(even.right,margin);
        assert.equal(odd.right,36);assert.equal(even.left,36);
        assert.equal(odd.liveWidth,even.liveWidth);
    }
});
test('large trim books have a different black-ink white-paper page limit',()=>{
    assert.equal(paperbackPageLimit('8.5 x 8.5 inches'),590);
    assert.equal(paperbackPageLimit('8.5 x 11 inches (Letter)'),590);
    assert.equal(paperbackPageLimit('6 x 9 inches'),828);
    assert.equal(paperbackPageLimit('8 x 10 inches'),828);
});
