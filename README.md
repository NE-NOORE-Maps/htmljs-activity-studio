# 🧩 KDP Activity Studio · Web Edition (HTML5 & JavaScript)

A high-performance, **100% client-side** web application for generating commercial-grade **Sudoku** and **Word Search** activity books for Amazon KDP, Etsy, and printable stores.

Runs completely in the browser with **zero backend dependencies**, making it free and instant to deploy on **Cloudflare Pages**, **GitHub Pages**, **Vercel**, or **Netlify**.

---

## 🚀 Key Features

### 🧩 1. Sudoku Studio Engine
- **Variants Supported**: Classic 9×9, Kids Mini 4×4, Junior 6×6, Wordoku (letter anagrams), Sudoku X (diagonal constraints), and Windoku (hyper 4-window).
- **Difficulty Tiers**: Very Easy (★☆☆☆☆), Easy (★★☆☆☆), Medium (★★★☆☆), Hard (★★★★☆), Expert (★★★★★).
- **Quality Assurance**: Guaranteed unique single solution (MRV backtracking solver) and authentic 180° rotational clue symmetry.
- **Audience Styles**: Adult Classic, Senior / Large Print, Checkerboard, Kids Fun (rounded cell cards), and Modern Minimalist.

### 🔍 2. Word Search Studio Engine
- **Flexible Grid Sizes**: 12×12 (Junior/Kids), 14×14, 15×15 (KDP Best Seller), 16×16, 18×18 (Hard), and 20×20 (Giant).
- **8-Directional Placement**: Easy (Horizontal/Vertical forward), Medium (adds Diagonals forward), Hard (adds backward), and Expert (all 8 directions).
- **Built-in Themes & Custom Lists**: Safari Animals, Deep Space, Wonders of Nature, plus instant paste/edit for custom vocabulary.
- **Multi-Language Cleaning**: Handles English, German (auto umlaut mapping), Spanish (preserves Ñ), French, and Italian.
- **Visual Solutions**: High-resolution letter grids with elegant translucent highlight capsules.

### 📅 3. Calendar & Date Scheduling System
- **Year Selector**: 2025, 2026, 2027, 2028, 2029, 2030 with automatic leap-year handling (365 / 366 days).
- **Progression Modes**:
  - **Daily**: 1 Day / Puzzle (365 puzzles for a full "A-Puzzle-A-Day" 365-day book).
  - **Monthly**: 1 Month / Puzzle (12 or 24 puzzles per year).
- **Display Modes**:
  - **Formatted Date Text**: E.g., `27-September`, `27-Sept-2026`, `September 27, 2026`, `09/27/2026`.
  - **300 DPI Mini Month Calendar Card**: Vector-crisp calendar thumbnail highlighting the exact puzzle day.
- **Calendar Options**:
  - **Show/Hide Year Toggle**: Toggle between `SEPTEMBER 2026` and `SEPTEMBER` header style.
  - **Start Day**: Sunday vs. Monday week start.
  - **7 Color Themes**: Modern Emerald, Classic Onyx, Royal Blue, Sunset Coral, Forest Sage, Warm Terracotta, Minimalist Slate.

### 📦 4. Commercial Export Formats
1. **Canva Bulk Create Excel (`.xlsx`)**: Pre-formatted multi-column spreadsheet ready for Canva Bulk Create with image references, dates, titles, and solution mappings.
2. **KDP Print-Ready PDF (`.pdf`)**: Formatted interior book PDF with margin safety, section dividers, and back-of-book answer keys. Supports 8.5×11", 6×9", 8.5×8.5", and 8×10" trim sizes.
3. **Complete 300 DPI ZIP Bundle (`.zip`)**: Individual high-resolution PNGs of all grids, solution answer keys, calendar cards, and the Canva spreadsheet in one compressed package.
4. **Solutions Only Excel (`.xlsx`)**: Standalone answer key index.

---

## 📂 Project Architecture

```
htmljs-activity-studio/
├── index.html               # Main studio workspace & UI layout
├── css/
│   └── style.css            # Modern design system (Dark/Light mode, Emerald palette)
├── js/
│   ├── app.js               # Reactive studio state controller & event coordinator
│   ├── sudoku_engine.js     # Backtracking solver & unique Sudoku generator
│   ├── wordsearch_engine.js # 8-way word placement & grid generator
│   ├── calendar_builder.js  # Date progression calculator & 300 DPI calendar card renderer
│   ├── canvas_renderer.js   # 300 DPI raster canvas renderer for grids, pages & solutions
│   ├── excel_exporter.js    # SheetJS Canva Bulk Create Excel builder
│   └── pdf_exporter.js      # jsPDF interior book compiler
└── README.md                # Deployment and user guide
```

---

## ⚡ Deployment to Cloudflare Pages (Recommended)

Cloudflare Pages offers unlimited bandwidth, instant global CDN delivery, and 100% free hosting for static client-side sites.

### Step 1: Push this folder to a new GitHub repository
Open PowerShell or Terminal in this folder:
```bash
git init
git add .
git commit -m "feat: initial commit of KDP Activity Studio"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/htmljs-activity-studio.git
git push -u origin main
```

### Step 2: Connect to Cloudflare Pages
1. Log in to [dash.cloudflare.com](https://dash.cloudflare.com/).
2. In the left navigation, click **Workers & Pages** -> **Create application**.
3. Select the **Pages** tab and click **Connect to Git**.
4. Choose your new GitHub repository: `htmljs-activity-studio`.
5. In **Build Settings**:
   - **Framework preset**: `None`
   - **Build command**: *(leave blank)*
   - **Build output directory**: `.` *(or root `/`)*
6. Click **Save and Deploy**.

Within 15–30 seconds, Cloudflare will provide a free `*.pages.dev` URL (e.g., `https://htmljs-activity-studio.pages.dev`). You can also attach a free custom domain with automated SSL.

---

## 💻 Local Preview

You can run this project locally with any static web server:

### Using Python:
```bash
python -m http.server 8080
```
Then open `http://localhost:8080` in your web browser.

### Using Node / npx:
```bash
npx -y serve .
```

---

## 📜 License
Commercial and Personal Use Allowed for KDP Activity Book publishing.
