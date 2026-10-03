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
    "Modern Emerald": {
        headerColor: "#184534",
        badgeColor: "#184534",
        dayHeaderColor: "#52796F",
        textColor: "#1E293B",
        highlightTextColor: "#FFFFFF",
        borderColor: "#D1D5DB",
        bgColor: "#FFFFFF"
    },
    "Minimalist Slate": {
        headerColor: "#0F172A",
        badgeColor: "#0F172A",
        dayHeaderColor: "#64748B",
        textColor: "#334155",
        highlightTextColor: "#FFFFFF",
        borderColor: "#E2E8F0",
        bgColor: "#FFFFFF"
    },
    "Royal Navy": {
        headerColor: "#1E3A8A",
        badgeColor: "#1E3A8A",
        dayHeaderColor: "#3B82F6",
        textColor: "#1E293B",
        highlightTextColor: "#FFFFFF",
        borderColor: "#CBD5E1",
        bgColor: "#FFFFFF"
    },
    "Warm Amber": {
        headerColor: "#78350F",
        badgeColor: "#B45309",
        dayHeaderColor: "#D97706",
        textColor: "#451A03",
        highlightTextColor: "#FFFFFF",
        borderColor: "#FDE68A",
        bgColor: "#FFFBEB"
    },
    "Rosewood": {
        headerColor: "#881337",
        badgeColor: "#BE123C",
        dayHeaderColor: "#E11D48",
        textColor: "#4C0519",
        highlightTextColor: "#FFFFFF",
        borderColor: "#FECDD3",
        bgColor: "#FFF1F2"
    },
    "Soft Lavender": {
        headerColor: "#4C1D95",
        badgeColor: "#6D28D9",
        dayHeaderColor: "#8B5CF6",
        textColor: "#2E1065",
        highlightTextColor: "#FFFFFF",
        borderColor: "#DDD6FE",
        bgColor: "#F5F3FF"
    },
    "High Contrast B&W": {
        headerColor: "#000000",
        badgeColor: "#000000",
        dayHeaderColor: "#000000",
        textColor: "#000000",
        highlightTextColor: "#FFFFFF",
        borderColor: "#000000",
        bgColor: "#FFFFFF"
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
    const base = new Date(startDate);
    let targetDate = null;
    let highlightDay = null;

    if (progression === "monthly") {
        const totalMonths = base.getFullYear() * 12 + base.getMonth() + puzzleIdx;
        const y = Math.floor(totalMonths / 12);
        const m = totalMonths % 12;
        targetDate = new Date(y, m, 1);
        highlightDay = null;
    } else {
        targetDate = new Date(base.getTime() + puzzleIdx * 86400000);
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
    theme = "Modern Emerald",
    firstDaySunday = true,
    showCardBorder = true,
    showYear = true
} = {}) {
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    const thm = CALENDAR_THEMES[theme] || CALENDAR_THEMES["Modern Emerald"];

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
