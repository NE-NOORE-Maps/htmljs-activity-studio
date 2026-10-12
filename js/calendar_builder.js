/**
 * Date progression and mini monthly calendar generator for HTML5 Canvas.
 * Supports show/hide year in headers, week start customization, themes, and KDP date presets.
 */

export const DATE_FORMAT_PRESETS = [
    "27-September",
    "27-september",
    "September 27",
    "27-Sep-2026",
    "27-sept-2026",
    "9-27-2026",
    "09/27/2026",
    "September 27, 2026",
    "Sunday, September 27",
    "Sun, Sep 27, 2026",
    "2026-09-27"
];

export const CALENDAR_THEMES = {
    "High Contrast B&W": {
        headerColor: "#000000",
        badgeColor: "#222222",
        dayHeaderColor: "#333333",
        textColor: "#000000",
        highlightTextColor: "#FFFFFF",
        borderColor: "#222222",
        bgColor: "#FFFFFF"
    },
    "Soft Grayscale": {
        headerColor: "#111111",
        badgeColor: "#444444",
        dayHeaderColor: "#555555",
        textColor: "#222222",
        highlightTextColor: "#FFFFFF",
        borderColor: "#A3A3A3",
        bgColor: "#FFFFFF"
    },
    "Minimalist Slate": {
        headerColor: "#1A1A1A",
        badgeColor: "#333333",
        dayHeaderColor: "#666666",
        textColor: "#262626",
        highlightTextColor: "#FFFFFF",
        borderColor: "#D4D4D4",
        bgColor: "#FFFFFF"
    },
    "Light Gray Card": {
        headerColor: "#000000",
        badgeColor: "#1A1A1A",
        dayHeaderColor: "#404040",
        textColor: "#111111",
        highlightTextColor: "#FFFFFF",
        borderColor: "#BFBFBF",
        bgColor: "#F7F7F7"
    }
};

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const MONTH_ABBRS = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

const WEEKDAY_NAMES = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"
];

const WEEKDAY_ABBRS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function formatPuzzleDate(dateObj, fmtChoice) {
    const d = new Date(dateObj);
    const day = d.getDate();
    const dayPad = String(day).padStart(2, "0");
    const month = d.getMonth() + 1;
    const monthPad = String(month).padStart(2, "0");
    const year = d.getFullYear();
    const monthName = MONTH_NAMES[d.getMonth()];
    const monthAbbr = MONTH_ABBRS[d.getMonth()];
    const weekday = WEEKDAY_NAMES[d.getDay()];
    const weekdayAbbr = WEEKDAY_ABBRS[d.getDay()];

    switch (fmtChoice) {
        case "27-September":
            return `${day}-${monthName}`;
        case "27-september":
            return `${day}-${monthName.toLowerCase()}`;
        case "September 27":
            return `${monthName} ${day}`;
        case "27-Sep-2026":
            return `${day}-${monthAbbr}-${year}`;
        case "27-sept-2026": {
            const abbrT = month === 9 ? "sept" : monthAbbr.toLowerCase();
            return `${day}-${abbrT}-${year}`;
        }
        case "9-27-2026":
            return `${month}-${day}-${year}`;
        case "09/27/2026":
            return `${monthPad}/${dayPad}/${year}`;
        case "September 27, 2026":
            return `${monthName} ${day}, ${year}`;
        case "Sunday, September 27":
            return `${weekday}, ${monthName} ${day}`;
        case "Sun, Sep 27, 2026":
            return `${weekdayAbbr}, ${monthAbbr} ${day}, ${year}`;
        case "2026-09-27":
            return `${year}-${monthPad}-${dayPad}`;
        default:
            return `${monthName} ${day}, ${year}`;
    }
}

export function getPuzzleDateInfo(puzzleIdx, startDate, progression = "daily", formatChoice = "27-September") {
    let base;
    if (typeof startDate === "string" && startDate.includes("-")) {
        const parts = startDate.split("-").map(p => parseInt(p, 10));
        base = new Date(parts[0], parts[1] - 1, parts[2] || 1, 12, 0, 0);
    } else {
        base = new Date(startDate);
        base.setHours(12, 0, 0, 0);
    }

    let targetDate = null;
    let highlightDay = null;

    if (progression === "monthly") {
        const totalMonths = base.getFullYear() * 12 + base.getMonth() + puzzleIdx;
        const y = Math.floor(totalMonths / 12);
        const m = totalMonths % 12;
        targetDate = new Date(y, m, 1, 12, 0, 0);
        highlightDay = null;
    } else {
        targetDate = new Date(base.getFullYear(), base.getMonth(), base.getDate() + puzzleIdx, 12, 0, 0);
        highlightDay = targetDate.getDate();
    }

    return {
        date: targetDate,
        dateStr: formatPuzzleDate(targetDate, formatChoice),
        year: targetDate.getFullYear(),
        month: targetDate.getMonth() + 1,
        day: targetDate.getDate(),
        highlightDay,
        monthName: MONTH_NAMES[targetDate.getMonth()],
        monthAbbr: MONTH_ABBRS[targetDate.getMonth()]
    };
}

export function getPageDateInfo(pageIdx, startDate, progression = "daily", formatChoice = "27-September") {
    return getPuzzleDateInfo(pageIdx, startDate, progression, formatChoice);
}

/**
 * Render a 300 DPI mini month calendar card directly onto an HTML5 Canvas.
 */
export function renderMiniMonthCalendarCanvas({
    year = 2026,
    month = 9, // 1-12
    highlightDay = 27,
    width = 420,
    height = 340,
    theme = "High Contrast B&W",
    firstDaySunday = true,
    showCardBorder = true,
    showYear = true
} = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const thm = CALENDAR_THEMES[theme] || CALENDAR_THEMES["High Contrast B&W"];

    // Background
    ctx.fillStyle = thm.bgColor;
    ctx.fillRect(0, 0, width, height);

    // Card border
    if (showCardBorder) {
        ctx.strokeStyle = thm.borderColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        const r = 14;
        ctx.roundRect(3, 3, width - 6, height - 6, r);
        ctx.stroke();
    }

    // Title: Month & optional Year
    const monthName = MONTH_NAMES[month - 1].toUpperCase();
    const titleText = showYear ? `${monthName} ${year}` : monthName;

    const titleFontSize = Math.round(height * (showYear ? 0.088 : 0.096));
    ctx.fillStyle = thm.headerColor;
    ctx.font = `bold ${titleFontSize}px "Outfit", "DejaVu Sans Bold", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const headerY = Math.round(height * 0.11);
    ctx.fillText(titleText, width / 2, headerY);

    // Divider Line
    const divY = Math.round(height * 0.19);
    ctx.strokeStyle = thm.borderColor;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(Math.round(width * 0.08), divY);
    ctx.lineTo(Math.round(width * 0.92), divY);
    ctx.stroke();

    // Day of week headers
    const headers = firstDaySunday ? ["S", "M", "T", "W", "T", "F", "S"] : ["M", "T", "W", "T", "F", "S", "S"];
    const padX = width * 0.07;
    const availW = width - 2 * padX;
    const colW = availW / 7.0;

    const dhFontSize = Math.round(height * 0.065);
    ctx.fillStyle = thm.dayHeaderColor;
    ctx.font = `bold ${dhFontSize}px "Outfit", "DejaVu Sans Bold", sans-serif`;
    const dhY = Math.round(height * 0.26);

    headers.forEach((hTxt, cI) => {
        const cx = padX + cI * colW + colW / 2.0;
        ctx.fillText(hTxt, cx, dhY);
    });

    // Calendar grid calculations
    const firstDayDate = new Date(year, month - 1, 1);
    let startDayIdx = firstDayDate.getDay(); // 0 is Sunday
    if (!firstDaySunday) {
        startDayIdx = (startDayIdx + 6) % 7; // Monday is 0
    }
    const daysInMonth = new Date(year, month, 0).getDate();

    const weeks = [];
    let currentWeek = new Array(7).fill(0);
    let dayCount = 1;

    for (let c = startDayIdx; c < 7; c++) {
        currentWeek[c] = dayCount++;
    }
    weeks.push(currentWeek);

    while (dayCount <= daysInMonth) {
        currentWeek = new Array(7).fill(0);
        for (let c = 0; c < 7 && dayCount <= daysInMonth; c++) {
            currentWeek[c] = dayCount++;
        }
        weeks.push(currentWeek);
    }

    const startGridY = Math.round(height * 0.38);
    const rowH = (height * 0.88 - startGridY) / Math.max(5, weeks.length);

    const numFontSize = Math.round(height * 0.070);
    const numBoldFontSize = Math.round(height * 0.072);

    weeks.forEach((week, rI) => {
        week.forEach((dayNum, cI) => {
            if (dayNum === 0) return;

            const cx = padX + cI * colW + colW / 2.0;
            const cy = startGridY + rI * rowH;

            if (highlightDay && dayNum === highlightDay) {
                const badgeRadius = Math.min(colW * 0.44, rowH * 0.44);
                ctx.fillStyle = thm.badgeColor;
                ctx.beginPath();
                ctx.arc(cx, cy, badgeRadius, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = thm.highlightTextColor;
                ctx.font = `bold ${numBoldFontSize}px "Outfit", "DejaVu Sans Bold", sans-serif`;
                ctx.fillText(String(dayNum), cx, cy);
            } else {
                ctx.fillStyle = thm.textColor;
                ctx.font = `${numFontSize}px "Outfit", "DejaVu Sans", sans-serif`;
                ctx.fillText(String(dayNum), cx, cy);
            }
        });
    });

    return canvas;
}
