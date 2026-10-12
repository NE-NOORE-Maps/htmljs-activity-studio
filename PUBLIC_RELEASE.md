# Public release and updates

Assessment: 2026-10-11. Local functional verification, not a production certification.

## Verified locally

- Word Search and Sudoku previews and real PDF downloads.
- Correct PDF trim sizes and 300 DPI page images in inspected exports.
- Real separate-solution Excel downloads: Word Search 3+3+1 and Sudoku 4+3, with seven embedded PNGs and seven drawing anchors each.
- 35 automated tests: print geometry, page counts/margins, solution grouping and dark-theme initialization/contrast.
- Dark theme in both studios, saved preference on reload, readable form/export controls; print canvas stays white.
- Responsive phone and tablet layouts checked in the in-app browser.

## Before a broad public launch

- Exercise Chrome, Edge, Firefox and Safari with real downloads, including mobile Safari. Only the in-app browser was exercised here.
- Measure 100/500/maximum-sized collections on modest-memory devices. Exports retain image data in memory, and the UI allows up to 5,000 puzzles. That maximum has not been stress-tested. Establish a tested limit and consider background generation/cancellation.
- Test the generated workbooks in Canva itself. XLSX pictures are embedded drawing objects, not guaranteed to be imported by every application.
- Review and update third-party libraries, retain license notices and test blocked/offline CDN behavior. No full dependency security audit was performed.
- Add project save/load or autosave. Currently theme preference persists, but book settings and content live in memory and reset on reload.
- Publish clear help explaining sample words, PDF preflight, supported export sizes and privacy. User content is processed in the browser; external font/script requests still occur.

## How updates work

This is a static HTML/CSS/JavaScript application; there is no required application server or database. Publish the contents of this directory on a static host with HTTPS. Publishing has not been performed.

For each release:

1. Make changes in a version-controlled branch and run `npm test` plus syntax checks for changed scripts.
2. Test a preview deployment: both studios, dark/light mode, CSV import, PDF, paired and separate Excel exports, and partial final answer pages.
3. Increment the asset version consistently in `index.html` and local module imports (currently `pro5`). Version changed base styles/vendor assets too. Configure the host to revalidate `index.html`; avoid long-lived caching for unversioned files.
4. Deploy all files together. Existing open tabs keep their loaded version until users reload, which currently loses unsaved book content; do not force-reload active exports.
5. Run one real export on the live site and retain the previous deployment for rollback.

Possible next improvements, in priority order: project save/load; tested export limits and cancellation; automated browser/download tests; a version label and release notes. Accounts, payments or protected paid access would need additional server-side services; a static client alone cannot enforce paid access.
