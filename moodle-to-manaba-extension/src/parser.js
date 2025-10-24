const DAY_KANJI = ["月", "火", "水", "木", "金", "土", "日"];
const SCHEDULE_REGEX = /([月火水木金土日])\s*([0-9]{1,2})(?:\((\d+)-(\d+)\))?/g;
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
export function parseScheduleInfo(doc) {
  const summaryRoot = doc.querySelector(
    "section.block_course_summary .text_to_html"
  );
  if (!summaryRoot) {
    return [];
  }

  const rawText = summaryRoot.innerHTML
    .replace(/<br\s*\/>/gi, "\n")
    .replace(/<br\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

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
  });

  const scheduleText = rawText.join(" ");
  const schedules = [];
  let match;

  while ((match = SCHEDULE_REGEX.exec(scheduleText)) !== null) {
    const [, day, primaryPeriodRaw, rangeStartRaw, rangeEndRaw] = match;
    const primaryPeriod = parseInt(primaryPeriodRaw, 10);
    if (!DAY_KANJI.includes(day) || Number.isNaN(primaryPeriod)) {
      continue;
    }

    const rangeStart = rangeStartRaw ? parseInt(rangeStartRaw, 10) : null;
    const rangeEnd = rangeEndRaw ? parseInt(rangeEndRaw, 10) : null;
    const periods = expandPeriods(primaryPeriod, rangeStart, rangeEnd);

    periods.forEach((period) => {
      const classroom = locationMap.get(makeKey(day, period));
      schedules.push({ dayOfWeek: day, period, classroom });
    });
  }

  return dedupeSchedules(schedules);
}

function expandPeriods(primary, rangeStart, rangeEnd) {
  if (rangeStart && rangeEnd && rangeEnd >= rangeStart) {
    const periods = [];
    for (let current = rangeStart; current <= rangeEnd; current += 1) {
      periods.push(current);
    }
    return periods;
  }
  return [primary];
}

function makeKey(day, period) {
  return `${day}-${period}`;
}

function sanitizeLocation(location) {
  return location.replace(/\s+/g, " ").trim();
}

function dedupeSchedules(schedules) {
  const seen = new Set();
  return schedules.filter((entry) => {
    const key = makeKey(entry.dayOfWeek, entry.period);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
