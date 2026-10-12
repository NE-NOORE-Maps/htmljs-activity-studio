import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('app.js imports only valid exports from internal modules', async () => {
    const appJs = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

    // Extract import statements of form: import { ... } from "./file.js?v=..."
    const importRegex = /import\s*\{([^}]+)\}\s*from\s*["']\.\/([^"'?]+)(?:\?v=[^"']*)?["']/g;
    let match;
    let count = 0;

    while ((match = importRegex.exec(appJs)) !== null) {
        const identifiers = match[1].split(',').map(s => s.trim()).filter(Boolean);
        const moduleRelPath = match[2];
        const moduleObj = await import(`../js/${moduleRelPath}`);

        for (const id of identifiers) {
            count++;
            assert.ok(
                id in moduleObj,
                `Expected "${id}" to be exported by js/${moduleRelPath}, but it was undefined.`
            );
            assert.notEqual(
                moduleObj[id],
                undefined,
                `Expected "${id}" in js/${moduleRelPath} to not be undefined.`
            );
        }
    }

    assert.ok(count > 10, 'Expected multiple imported identifiers to be verified');
});

test('buildPerGridSolutionWorkbooks is exported as a function by excel_exporter.js', async () => {
    const excelExporter = await import('../js/excel_exporter.js');
    assert.equal(typeof excelExporter.buildPerGridSolutionWorkbooks, 'function');
});

test('index.html and app.js use synchronized cache-busting version parameters', () => {
    const indexHtml = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
    const appJs = readFileSync(new URL('../js/app.js', import.meta.url), 'utf8');

    const appScriptMatch = indexHtml.match(/src="js\/app\.js\?v=([^"]+)"/);
    assert.ok(appScriptMatch, 'index.html must load app.js with a ?v= version query parameter');
    const version = appScriptMatch[1];

    // Verify all module imports in app.js match this version
    const importVersions = [...appJs.matchAll(/from\s*["']\.\/[^"']+\?v=([^"']+)["']/g)].map(m => m[1]);
    assert.ok(importVersions.length > 0, 'app.js imports must have ?v= query parameter');
    for (const v of importVersions) {
        assert.equal(v, version, `Import version in app.js (${v}) should match index.html version (${version})`);
    }
});
