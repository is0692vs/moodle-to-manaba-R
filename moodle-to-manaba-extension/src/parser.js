const DAY_KANJI = ["月", "火", "水", "木", "金", "土", "日"];

// Updated regex patterns to handle different schedule formats
const SCHEDULE_PATTERNS = [
  // Pattern 1: 金1(1-2) - treat (1-2) as detail, not range - only use the main period
  /([月火水木金土日])\s*([0-9]{1,2})\s*\([0-9]+-[0-9]+\)/g,
  // Pattern 2: 金1,2,3 - comma separated periods
  /([月火水木金土日])\s*([0-9]{1,2}(?:\s*,\s*[0-9]{1,2})*)/g,
  // Pattern 3: 金1-3 - actual range without parentheses  
  /([月火水木金土日])\s*([0-9]{1,2})\s*-\s*([0-9]{1,2})/g,
  // Pattern 4: Simple 金1
  /([月火水木金土日])\s*([0-9]{1,2})/g
];

const LOCATION_REGEX = /^\s*([月火水木金土日])\s*([0-9]{1,2})\s*[：:](.+)$/;

/**
 * @typedef {Object} ScheduleInfo
 * @property {string} dayOfWeek - Kanji weekday character (e.g. "月")
 * @property {number} period - Moodle period number (1-7)
 * @property {string | undefined} classroom - Optional classroom text
 */

/**
 * Extracts timetable information from the Moodle course summary block.
 * @param {Document} doc - The fetched course detail document.
 * @returns {ScheduleInfo[]} Parsed schedule entries.
 */
function parseScheduleInfo(doc) {
  console.log("[Parser] Starting schedule parsing...");
  
  const summaryRoot = doc.querySelector(
    "section.block_course_summary .text_to_html"
  );
  if (!summaryRoot) {
    console.log("[Parser] No course summary block found");
    return [];
  }

  const rawText = summaryRoot.innerHTML
    .replace(/<br\s*\/>/gi, "\n")
    .replace(/<br\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  console.log("[Parser] Raw text lines:", rawText);

  if (!rawText.length) {
    return [];
  }

  const locationMap = new Map();
  rawText.forEach((line) => {
    const match = line.match(LOCATION_REGEX);
    if (!match) return;
    const [, day, periodRaw, location] = match;
    const period = parseInt(periodRaw, 10);
    if (Number.isNaN(period)) return;
    locationMap.set(makeKey(day, period), sanitizeLocation(location));
    console.log("[Parser] Found location:", day, period, "->", location);
  });

  const scheduleText = rawText.join(" ");
  console.log("[Parser] Combined schedule text:", scheduleText);
  
  const schedules = [];

  // Try each pattern in order of specificity
  for (let i = 0; i < SCHEDULE_PATTERNS.length; i++) {
    const pattern = SCHEDULE_PATTERNS[i];
    const patternSchedules = [];
    let match;

    // Reset regex state
    pattern.lastIndex = 0;
    
    while ((match = pattern.exec(scheduleText)) !== null) {
      console.log("[Parser] Pattern", i + 1, "matched:", match);
      
      if (i === 0) {
        // Pattern 1: 金1(1-2) - ignore the parentheses, treat as single period
        const [, day, periodStr] = match;
        const period = parseInt(periodStr, 10);
        if (DAY_KANJI.includes(day) && !Number.isNaN(period)) {
          const classroom = locationMap.get(makeKey(day, period));
          patternSchedules.push({ dayOfWeek: day, period, classroom });
          console.log("[Parser] Added single period (ignoring range):", day, period);
        }
      } else if (i === 1) {
        // Pattern 2: 金1,2,3 - comma separated
        const [, day, periodsStr] = match;
        const periods = periodsStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !Number.isNaN(p));
        periods.forEach(period => {
          if (DAY_KANJI.includes(day)) {
            const classroom = locationMap.get(makeKey(day, period));
            patternSchedules.push({ dayOfWeek: day, period, classroom });
            console.log("[Parser] Added comma-separated period:", day, period);
          }
        });
      } else if (i === 2) {
        // Pattern 3: 金1-3 - actual range
        const [, day, startStr, endStr] = match;
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (DAY_KANJI.includes(day) && !Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          for (let period = start; period <= end; period++) {
            const classroom = locationMap.get(makeKey(day, period));
            patternSchedules.push({ dayOfWeek: day, period, classroom });
            console.log("[Parser] Added range period:", day, period);
          }
        }
      } else {
        // Pattern 4: Simple 金1
        const [, day, periodStr] = match;
        const period = parseInt(periodStr, 10);
        if (DAY_KANJI.includes(day) && !Number.isNaN(period)) {
          const classroom = locationMap.get(makeKey(day, period));
          patternSchedules.push({ dayOfWeek: day, period, classroom });
          console.log("[Parser] Added simple period:", day, period);
        }
      }
    }

    if (patternSchedules.length > 0) {
      console.log("[Parser] Pattern", i + 1, "found", patternSchedules.length, "periods");
      schedules.push(...patternSchedules);
      break; // Use only the first matching pattern to avoid duplicates
    }
  }

  console.log("[Parser] Final schedules:", schedules);
  
  return schedules;
}

function makeKey(day, period) {
  return `${day}-${period}`;
}

function sanitizeLocation(location) {
  return location.replace(/\s+/g, " ").trim();
}
