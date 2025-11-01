const DAY_MAP = {
  "月": "Mon", "火": "Tue", "水": "Wed", "木": "Thu", "金": "Fri", "土": "Sat", "日": "Sun",
  "Mon": "月", "Tue": "火", "Wed": "水", "Thu": "木", "Fri": "金", "Sat": "土", "Sun": "日"
};

const DAY_JP = ["月", "火", "水", "木", "金", "土", "日"];
const DAY_EN = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Function to get schedule patterns based on language
function getSchedulePatterns(lang) {
  const days = lang === 'en' ? DAY_EN.join('|') : DAY_JP.join('');
  return [
    // Pattern 1: 金1(1-2) or Fri1(1-2)
    new RegExp(`([${days}])\\s*([0-9]{1,2})\\s*\\([0-9]+-[0-9]+\\)`, 'g'),
    // Pattern 2: 金1,2,3 or Fri1,2,3
    new RegExp(`([${days}])\\s*([0-9]{1,2}(?:\\s*,\\s*[0-9]{1,2})*)`, 'g'),
    // Pattern 3: 金1-3 or Fri1-3
    new RegExp(`([${days}])\\s*([0-9]{1,2})\\s*-\\s*([0-9]{1,2})`, 'g'),
    // Pattern 4: Simple 金1 or Fri1
    new RegExp(`([${days}])\\s*([0-9]{1,2})`, 'g')
  ];
}

// Function to get location regex based on language
function getLocationRegex(lang) {
  const days = lang === 'en' ? DAY_EN.join('|') : DAY_JP.join('');
  return new RegExp(`^\\s*([${days}])\\s*([0-9]{1,2})\\s*[：:](.+)$`);
}

/**
 * @typedef {Object} ScheduleInfo
 * @property {string} dayOfWeek - Kanji weekday character (e.g. "月")
 * @property {number} period - Moodle period number (1-7)
 * @property {string | undefined} classroom - Optional classroom text
 */

/**
 * Extracts timetable information from the Moodle course summary block.
 * @param {Document} doc - The fetched course detail document.
 * @param {string} lang - The language ('ja' or 'en').
 * @returns {ScheduleInfo[]} Parsed schedule entries.
 */
function parseScheduleInfo(doc, lang = 'ja') {
  console.log(`[Parser] Starting schedule parsing for lang: ${lang}...`);

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

  const locationRegex = getLocationRegex(lang);
  const schedulePatterns = getSchedulePatterns(lang);
  const dayList = lang === 'en' ? DAY_EN : DAY_JP;

  const normalizeDay = (day) => {
    return lang === 'en' ? DAY_MAP[day] : day;
  };

  const locationMap = new Map();
  rawText.forEach((line) => {
    const match = line.match(locationRegex);
    if (!match) return;
    const [, day, periodRaw, location] = match;
    const period = parseInt(periodRaw, 10);
    if (Number.isNaN(period)) return;
    const normalizedDay = normalizeDay(day);
    locationMap.set(makeKey(normalizedDay, period), sanitizeLocation(location));
    console.log("[Parser] Found location:", normalizedDay, period, "->", location);
  });

  const scheduleText = rawText.join(" ");
  console.log("[Parser] Combined schedule text:", scheduleText);

  const schedules = [];

  // Try each pattern in order of specificity
  for (let i = 0; i < schedulePatterns.length; i++) {
    const pattern = schedulePatterns[i];
    const patternSchedules = [];
    let match;

    // Reset regex state
    pattern.lastIndex = 0;

    while ((match = pattern.exec(scheduleText)) !== null) {
      console.log("[Parser] Pattern", i + 1, "matched:", match);

      const day = normalizeDay(match[1]);

      if (i === 0) {
        // Pattern 1: e.g., 金1(1-2)
        const period = parseInt(match[2], 10);
        if (dayList.includes(match[1]) && !Number.isNaN(period)) {
          const classroom = locationMap.get(makeKey(day, period));
          patternSchedules.push({ dayOfWeek: day, period, classroom });
          console.log(
            "[Parser] Added single period (ignoring range):",
            day,
            period
          );
        }
      } else if (i === 1) {
        // Pattern 2: e.g., 金1,2,3
        const periods = match[2].split(',').map(p => parseInt(p.trim(), 10)).filter(p => !Number.isNaN(p));
        periods.forEach(period => {
          if (dayList.includes(match[1])) {
            const classroom = locationMap.get(makeKey(day, period));
            patternSchedules.push({ dayOfWeek: day, period, classroom });
            console.log("[Parser] Added comma-separated period:", day, period);
          }
        });
      } else if (i === 2) {
        // Pattern 3: e.g., 金1-3
        const start = parseInt(match[2], 10);
        const end = parseInt(match[3], 10);
        if (dayList.includes(match[1]) && !Number.isNaN(start) && !Number.isNaN(end) && end >= start) {
          for (let period = start; period <= end; period++) {
            const classroom = locationMap.get(makeKey(day, period));
            patternSchedules.push({ dayOfWeek: day, period, classroom });
            console.log("[Parser] Added range period:", day, period);
          }
        }
      } else {
        // Pattern 4: e.g., 金1
        const period = parseInt(match[2], 10);
        if (dayList.includes(match[1]) && !Number.isNaN(period)) {
          const classroom = locationMap.get(makeKey(day, period));
          patternSchedules.push({ dayOfWeek: day, period, classroom });
          console.log("[Parser] Added simple period:", day, period);
        }
      }
    }

    if (patternSchedules.length > 0) {
      console.log(
        "[Parser] Pattern",
        i + 1,
        "found",
        patternSchedules.length,
        "periods"
      );
      schedules.push(...patternSchedules);
      break; // Use only the first matching pattern to avoid duplicates
    }
  }

  console.log("[Parser] Final schedules:", schedules);

  return schedules;
}

/**
 * 同じ時間帯の授業を重複とみなして除外する関数
 * 同じ曜日・時限に複数の授業が登録されている場合に使用
 * 現在はコメントアウトされており、使用されていない
 */
/*
function dedupeSchedules(schedules) {
  const seen = new Set();
  return schedules.filter(schedule => {
    const key = `${schedule.dayOfWeek}-${schedule.period}`;
    if (seen.has(key)) {
      console.log("[Parser] Duplicate schedule removed:", key);
      return false;
    }
    seen.add(key);
    return true;
  });
}
*/

function makeKey(day, period) {
  return `${day}-${period}`;
}

function sanitizeLocation(location) {
  return location.replace(/\s+/g, " ").trim();
}
