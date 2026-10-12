# KDP Activity Studio Pro

A browser-based workspace for Word Search and Sudoku book interiors, with live previews, PDF and Canva exports. Generation runs locally in the browser. Fonts and export libraries load from CDNs, so initial loading requires internet access.

## Create a book

1. **Book setup** — title, optional title page, trim size, puzzle count and reading style.
2. **Puzzle content** — word lists or CSV for Word Search; variant and difficulty for Sudoku.
3. **Page design** — puzzle and answer layouts, instructions and word-bank presentation. Manual styling and calendars are optional disclosures.
4. **Review & export** — manuscript counts, content warnings and downloads. PDF is the primary export; Canva workbooks, image bundles and answer data remain available.

Replace the sample words with your own collection before publishing. Review warns when words are reused, and exports stop if words cannot fit. Clearing the word list leaves an empty collection. Sudoku includes Classic, Mini, Junior, Wordoku, Sudoku X and Windoku. Wordoku requires nine distinct letters. Each studio retains its own title and settings when switching tabs.

## Print output

- Supported trims: 6×9, 8×10, 8.5×8.5 and 8.5×11 inches.
- PDF pages render at 300 DPI with physical dimensions, square grids and mirrored binding margins.
- Counts include the optional title page, answer divider, answers and a final blank page when needed for an even manuscript.
- Validation targets no-bleed, black-ink paperbacks on white paper: 24–590 pages for the 8.5-inch formats and 24–828 for other supported formats. Other exports remain available for shorter collections.

Inspect the final PDF at actual size, especially compact answer layouts, and use Amazon's Print Previewer before publishing. See [KDP's trim, bleed and margin guide](https://kdp.amazon.com/en_US/help/topic/G201857950). This tool creates interiors; it does not create covers or upload books.

## Local preview

From this directory, run:

```sh
python -m http.server 8086 --bind 127.0.0.1
```

Open `http://127.0.0.1:8086/`. Serve over HTTP because the application uses JavaScript modules.

## Tests

Requires Node.js with its built-in test runner; no package installation is needed.

```sh
npm test
```

Tests cover trim sizes, image proportions, manuscript counts, gutter boundaries and paperback page limits. Browser checks remain necessary for interaction, visual layout and actual downloads.

## Source guide

- `index.html`, `css/studio-pro.css`: workspace and responsive presentation.
- `js/workflow.js`: navigation and review checks.
- `js/app.js`: controls, previews and export orchestration.
- `js/book_layout.js`: physical dimensions, margins and page counts.
- `js/canvas_renderer.js`, `js/pdf_exporter.js`: page composition and PDF assembly.
- `js/sudoku_engine.js`, `js/wordsearch_engine.js`: puzzle generation.

For static hosting, publish this directory without a build command. Keep all JavaScript and CSS folders alongside `index.html`.

## License

Commercial and Personal Use Allowed for KDP Activity Book publishing.

## Separate solution workbooks

Turn off **Include Solution in Same Excel** under Review & export → Canva workbook options. The Canva download becomes a ZIP with separate puzzle and solution workbooks. Solution rows follow **Answers per page** (including 3), with one embedded PNG of each complete answer page. A partial final page contains the remaining answers. **Solution pages only** downloads the image workbook directly. Images & Canva ZIP includes the same workbooks. Excel images use anchored drawing objects; this does not guarantee that every third-party importer supports them.

## Supported workspace sizes

The studio is designed for iPad and desktop screens (768 CSS pixels or wider), with two settings columns and a persistent preview on the right. Landscape gives the widest controls. Smaller windows show a larger-screen notice; phone layouts are not supported.
