const DAY_LABELS = ["月", "火", "水", "木", "金", "土"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

/**
 * Builds a 7x6 table mirroring the manaba timetable layout.
 * @param {{name: string, url: string, schedule: {dayOfWeek: string, period: number, classroom?: string}[]}} courses
 *   Courses enriched with schedule data and the derived timetable cells.
 * @returns {HTMLTableElement} Generated timetable element.
 */
function generateManabaTable(courses) {
  const table = document.createElement("table");
  table.classList.add("stdlist", "manaba-timetable");

  const headerRow = table.insertRow();
  headerRow.classList.add("title");
  headerRow.appendChild(createHeaderCell("", "top", "courselistweekly-period"));
  DAY_LABELS.forEach((day) => {
    headerRow.appendChild(createHeaderCell(day, "top", "day"));
  });

  const cellMap = buildCellMap(courses);

  PERIODS.forEach((period) => {
    const row = table.insertRow();

    // 時限ヘッダーセル
    const periodCell = row.insertCell();
    periodCell.classList.add("period");
    periodCell.textContent = String(period);

    DAY_LABELS.forEach((day) => {
      const cell = row.insertCell();
      cell.classList.add("course");

      const key = makeKey(day, period);
      const entries = cellMap.get(key);
      if (!entries || !entries.length) {
        // 空のセル
        return;
      }

      // 授業ありセル
      cell.classList.add("course-cell");

      entries.forEach(({ course, schedule }) => {
        cell.appendChild(createCourseEntry(course, schedule));
      });
    });
  });

  return table;
}

function createHeaderCell(text, ...classNames) {
  const th = document.createElement("th");
  if (classNames.length) {
    th.classList.add(...classNames.filter(Boolean));
  }
  th.textContent = text;
  return th;
}

function buildCellMap(courses) {
  const map = new Map();
  courses.forEach((course) => {
    course.schedule.forEach((schedule) => {
      const key = makeKey(schedule.dayOfWeek, schedule.period);
      if (!map.has(key)) {
        map.set(key, []);
      }
      map.get(key).push({ course, schedule });
    });
  });
  return map;
}

function createCourseEntry(course, schedule) {
  const container = document.createElement("div");
  container.classList.add("courselistweekly-nonborder", "courselistweekly-c");

  // manabaスタイルのクリックハンドラを模倣
  container.setAttribute(
    "onclick",
    'window.open(this.querySelector("a").href, "_self")'
  );

  const link = document.createElement("a");
  link.href = course.url;
  link.textContent = course.name;
  link.classList.add("course-link");
  link.target = "_self";
  container.appendChild(link);

  // コースステータス（教室情報）
  if (schedule.classroom) {
    const statusDiv = document.createElement("div");
    statusDiv.classList.add("coursestatus");

    const locationDiv = document.createElement("div");
    locationDiv.classList.add("courselocationinfo", "courselocationinfoV2");
    locationDiv.textContent = `${schedule.dayOfWeek}${schedule.period}:${schedule.classroom}`;
    locationDiv.setAttribute(
      "title",
      `${schedule.dayOfWeek}${schedule.period}:${schedule.classroom}`
    );

    statusDiv.appendChild(locationDiv);
    container.appendChild(statusDiv);
  }

  return container;
}

function makeKey(day, period) {
  return `${day}-${period}`;
}

// Make DAY_LABELS and PERIODS available globally if needed
window.M2M_DAY_LABELS = DAY_LABELS;
window.M2M_PERIODS = PERIODS;
