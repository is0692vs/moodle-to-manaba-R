// Load parser and table generator via script injection
// Since we removed ES6 module support from manifest, we'll use global functions

const COURSE_CARD_SELECTOR = 'article[data-region="course"]';
const COURSE_VIEW_CONTENT_SELECTOR = 'div[data-region="course-view-content"]';
const COURSES_VIEW_SELECTOR = 'div[data-region="courses-view"]';
const WRAPPER_ID = 'manaba-timetable-wrapper';

const courseCache = new Map();
let observer = null;
let hasRendered = false;
let lastProcessedCount = 0;

function init() {
  const target = document.querySelector(COURSE_VIEW_CONTENT_SELECTOR);
  if (!target) {
    waitForCourseContainer();
    return;
  }

  startObserver(target);
  scheduleProcessing();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

function waitForCourseContainer() {
  const bodyObserver = new MutationObserver(() => {
    const target = document.querySelector(COURSE_VIEW_CONTENT_SELECTOR);
    if (!target) return;
    bodyObserver.disconnect();
    startObserver(target);
    scheduleProcessing();
  });
  bodyObserver.observe(document.body, { childList: true, subtree: true });
}

function startObserver(target) {
  if (observer) {
    observer.disconnect();
  }

  observer = new MutationObserver(() => {
    scheduleProcessing();
  });

  observer.observe(target, { childList: true, subtree: true });
}

let processingScheduled = false;
function scheduleProcessing() {
  if (processingScheduled) return;
  processingScheduled = true;
  queueMicrotask(async () => {
    processingScheduled = false;
    const cards = document.querySelectorAll(COURSE_CARD_SELECTOR);
    if (!cards.length) {
      return;
    }
    try {
      await processCourseCards(cards);
    } catch (error) {
      console.error('[M2M] Failed to process courses', error);
      showStatus('時間割の生成中にエラーが発生しました。ページを更新してください。');
    }
  });
}

async function processCourseCards(courseCards) {
  const courseInfos = extractCourseInfos(courseCards);
  if (!courseInfos.length) {
    return;
  }

  if (hasRendered && courseInfos.length === lastProcessedCount) {
    return;
  }

  lastProcessedCount = courseInfos.length;
  showStatus('manabaスタイルの時間割を生成しています…');
  hideOriginalCourseView();

  const courses = [];
  for (const info of courseInfos) {
    const course = await loadCourse(info);
    if (!course) continue;
    if (!course.schedule.length) continue;
    courses.push(course);
  }

  if (!courses.length) {
    showStatus('時間割情報を含むコースが見つかりませんでした。');
    return;
  }

  renderTimetable(courses);
  hasRendered = true;
}

function extractCourseInfos(courseCards) {
  const unique = new Map();
  courseCards.forEach((card) => {
    const link = card.querySelector('.coursename a, a.aalink');
    if (!link) return;
    const url = normalizeUrl(link.href);
    if (!url) return;
    const name = (link.textContent || '').trim();
    if (!name) return;
    if (unique.has(url)) return;
    unique.set(url, { name, url });
  });
  return Array.from(unique.values());
}

function normalizeUrl(href) {
  try {
    return new URL(href, window.location.origin).href;
  } catch (error) {
    console.warn('[M2M] Invalid course URL skipped', href);
    return '';
  }
}

async function loadCourse(info) {
  if (courseCache.has(info.url)) {
    return courseCache.get(info.url);
  }

  try {
    const doc = await fetchCourseDocument(info.url);
    const schedule = parseScheduleInfo(doc);
    const course = { ...info, schedule };
    courseCache.set(info.url, course);
    return course;
  } catch (error) {
    console.error('[M2M] Failed to fetch course detail', info.url, error);
    courseCache.set(info.url, null);
    return null;
  }
}

async function fetchCourseDocument(url) {
  const response = await fetch(url, { credentials: 'include' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const html = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, 'text/html');
}

function renderTimetable(courses) {
  const wrapper = ensureWrapper();
  wrapper.innerHTML = '';
  wrapper.appendChild(generateManabaTable(courses));
}

function hideOriginalCourseView() {
  const target = document.querySelector(COURSE_VIEW_CONTENT_SELECTOR);
  if (target) {
    target.setAttribute('data-manaba-hidden', 'true');
    target.style.display = 'none';
  }
}

function ensureWrapper() {
  let wrapper = document.getElementById(WRAPPER_ID);
  if (wrapper) {
    return wrapper;
  }

  const container = document.querySelector(COURSES_VIEW_SELECTOR);
  if (!container) {
    throw new Error('Course view container not found');
  }

  wrapper = document.createElement('div');
  wrapper.id = WRAPPER_ID;
  wrapper.classList.add('manaba-timetable-container');
  container.prepend(wrapper);
  return wrapper;
}

function showStatus(message) {
  try {
    const wrapper = ensureWrapper();
    wrapper.innerHTML = '';
    const status = document.createElement('div');
    status.classList.add('manaba-timetable-status');
    status.textContent = message;
    wrapper.appendChild(status);
  } catch (error) {
    console.warn('[M2M] Unable to display status', error);
  }
}
