// Load parser and table generator via script injection
// Since we removed ES6 module support from manifest, we'll use global functions

// Debug: Check if required functions are loaded
console.log("[M2M] Checking required functions:");
console.log("- parseScheduleInfo available:", typeof parseScheduleInfo);
console.log("- generateManabaTable available:", typeof generateManabaTable);

const COURSE_CARD_SELECTOR = 'article[data-region="course"]';
const COURSE_VIEW_CONTENT_SELECTOR = 'div[data-region="course-view-content"]';
const COURSES_VIEW_SELECTOR = 'div[data-region="courses-view"]';
const WRAPPER_ID = "manaba-timetable-wrapper";

// Add more flexible selectors for different Moodle versions
const ALTERNATIVE_SELECTORS = {
  courseCards: [
    'article[data-region="course"]',
    '.course-info-container',
    '.coursebox',
    'div[class*="course"]',
    '.course-listitem', 
    'a[href*="course/view.php"]',
    '[data-course-id]',
    '.course-summary-card'
  ],
  courseViewContent: [
    'div[data-region="course-view-content"]',
    '#page-my-index',
    '.block-myoverview',
    'main[role="main"]',
    '.region-content',
    '#region-main',
    '.course-content'
  ],
  coursesView: [
    'div[data-region="courses-view"]',
    '.block-myoverview',
    'main',
    '#page-content',
    '#region-main',
    '.main-content'
  ]
};

// Timing constants
const BASE_RETRY_DELAY_MS = 1000;
const RETRY_DELAY_INCREMENT_MS = 500;
const MAX_RETRY_DELAY_MS = 5000;
const MAX_LOADING_PLACEHOLDERS = 50;

// Course name extraction regex patterns
const COURSE_NAME_PATTERNS = {
  // Extract course code and name from Moodle format: "prefix (code: name (semester))"
  // This regex captures two groups: group 1 is the prefix ("コース星付き" or "コース名") and is discarded,
  // group 2 is the course code and name (e.g., "12345: Course Name (2023年度)") and is used.
  MAIN_EXTRACTION: /^(コース星付き|コース名).*?\n.*?([0-9]+:[^)]+\([^)]+\)).*$/s,
  // Fallback extraction for simpler format
  FALLBACK_EXTRACTION: /^.*?([0-9]+:[^)]+\([^)]+\)).*$/s
};

const courseCache = new Map();
let observer = null;
let hasRendered = false;
let lastProcessedCount = 0;
let processingScheduled = false;
let retryCount = 0;
const MAX_RETRIES = 10;

// Helper function to find element with multiple selectors
function findElement(selectors, context = document) {
  for (const selector of selectors) {
    const element = context.querySelector(selector);
    if (element) {
      console.log("[M2M] Found element with selector:", selector);
      return element;
    }
  }
  console.log("[M2M] No element found with any selector:", selectors);
  return null;
}

// Helper function to find course cards with multiple selectors
function findCourseCards() {
  console.log("[M2M] Starting comprehensive course card search...");
  
  // First, check if we're dealing with loading placeholders
  const placeholders = document.querySelectorAll('.bg-pulse-grey');
  if (placeholders.length > 0) {
    console.log("[M2M] Found loading placeholders:", placeholders.length, "- content may still be loading");
    
    // Check if there are any real course elements alongside placeholders
    const realCourseElements = document.querySelectorAll('a[href*="course/view.php"], .coursename a, [data-course-id]');
    console.log("[M2M] Found real course elements:", realCourseElements.length);
    
    if (realCourseElements.length === 0) {
      // Still loading, try again later
      setTimeout(() => {
        console.log("[M2M] Retrying course card search after loading delay...");
        scheduleProcessing();
      }, 2000);
      return [];
    } else {
      console.log("[M2M] Found some real course elements, proceeding with extraction");
    }
  }
  
  // Try to find actual course links first (most reliable)
  const allCourseLinks = document.querySelectorAll('a[href*="course/view.php"]');
  console.log("[M2M] Found course links:", allCourseLinks.length);
  
  if (allCourseLinks.length > 0) {
    // Filter out links that are inside placeholders
    const validLinks = Array.from(allCourseLinks).filter(link => {
      const isInPlaceholder = link.closest('.bg-pulse-grey') !== null;
      const hasText = link.textContent.trim().length > 0;
      return !isInPlaceholder && hasText;
    });
    
    console.log("[M2M] Valid course links (not in placeholders):", validLinks.length);
    
    if (validLinks.length > 0) {
      validLinks.forEach((link, i) => {
        console.log(`[M2M] Valid course link ${i+1}:`, link.href, "Text:", link.textContent.trim());
      });
      
      return validLinks.map(link => 
        link.closest('div, li, article, .card, .course-listitem') || link.parentElement
      ).filter(Boolean);
    }
  }
  
  // If no direct links found, try standard selectors but filter out placeholders
  for (const selector of ALTERNATIVE_SELECTORS.courseCards) {
    const cards = document.querySelectorAll(selector);
    if (cards.length > 0) {
      console.log("[M2M] Found course cards with selector:", selector, "count:", cards.length);
      
      // Check if cards have actual content (not just placeholders)
      let realCards = [];
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const hasPlaceholder = card.querySelector('.bg-pulse-grey');
        const hasRealContent = card.querySelector('.coursename, a[href*="course/view.php"], .course-title') || 
                              (card.textContent && card.textContent.trim().length > 10);
        
        if (!hasPlaceholder && hasRealContent) {
          realCards.push(card);
          console.log(`[M2M] Real card ${i+1} HTML:`, card.outerHTML.substring(0, 300));
        }
      }
      
      if (realCards.length > 0) {
        return realCards;
      }
    }
  }
  
  return [];
}

function init() {
  console.log("[M2M] Content script loaded on:", window.location.href);
  console.log("[M2M] Document ready state:", document.readyState);
  console.log("[M2M] Extension version: Phase 1 MVP - Fixed Parser");
  
  // Check URL patterns for Moodle compatibility
  const currentUrl = window.location.href;
  console.log("[M2M] Current URL:", currentUrl);
  
  // More flexible URL checking
  const isMoodlePage = (
    currentUrl.includes('/my/') || 
    currentUrl.includes('/my') ||
    currentUrl.includes('moodle') ||
    document.title.toLowerCase().includes('moodle') ||
    document.querySelector('meta[name="generator"][content*="Moodle"]') ||
    document.querySelector('.moodle-footer') ||
    document.querySelector('#page-my-index')
  );
  
  console.log("[M2M] Detected as Moodle page:", isMoodlePage);
  
  if (!isMoodlePage) {
    console.log("[M2M] Not detected as Moodle page, skipping initialization");
    return;
  }

  console.log("[M2M] Looking for course content with selectors:", ALTERNATIVE_SELECTORS.courseViewContent);
  
  const target = findElement(ALTERNATIVE_SELECTORS.courseViewContent);
  console.log("[M2M] Course view content found:", !!target);
  
  if (!target) {
    console.log("[M2M] Course view content not found, waiting...");
    waitForCourseContainer();
    return;
  }

  startObserver(target);
  
  // Start with a short initial delay to allow content to load
  setTimeout(() => {
    console.log("[M2M] Initial processing after 500ms delay...");
    scheduleProcessing();
  }, 500);
  
  // Also monitor for network activity to detect when loading is complete
  monitorNetworkActivity();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
  init();
}

function waitForCourseContainer() {
  console.log("[M2M] Setting up body observer to wait for course container...");
  const bodyObserver = new MutationObserver((mutations) => {
    let shouldCheck = false;
    
    // Check if any mutations involve course content
    mutations.forEach(mutation => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node;
            if (element.matches && (
              element.matches('[data-region*="course"]') ||
              element.matches('.coursename') ||
              element.matches('a[href*="course/view.php"]') ||
              element.querySelector && element.querySelector('.coursename, a[href*="course/view.php"]')
            )) {
              shouldCheck = true;
              console.log("[M2M] Course content detected in mutation:", element);
            }
          }
        });
      }
      
      // Check if placeholders are being removed (content is loading)
      if (mutation.type === 'attributes' || mutation.type === 'childList') {
        const target = mutation.target;
        if (target.matches && target.matches('.course-info-container')) {
          const hasPlaceholder = target.querySelector('.bg-pulse-grey');
          if (!hasPlaceholder) {
            shouldCheck = true;
            console.log("[M2M] Placeholder removed, content may be loaded");
          }
        }
      }
    });
    
    if (shouldCheck) {
      const target = findElement(ALTERNATIVE_SELECTORS.courseViewContent);
      console.log("[M2M] Checking for course container after content change:", !!target);
      if (target) {
        console.log("[M2M] Course container found! Starting observer...");
        bodyObserver.disconnect();
        startObserver(target);
        setTimeout(() => scheduleProcessing(), 1000); // Small delay to ensure content is fully loaded
      }
    }
  });
  
  bodyObserver.observe(document.body, { 
    childList: true, 
    subtree: true, 
    attributes: true,
    attributeFilter: ['class', 'data-loaded']
  });
  
  // Also set up a fallback timer
  setTimeout(() => {
    console.log("[M2M] Fallback timer - checking for content after 3 seconds");
    const target = findElement(ALTERNATIVE_SELECTORS.courseViewContent);
    if (target && !observer) {
      startObserver(target);
      scheduleProcessing();
    }
  }, 3000);
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

function scheduleProcessing() {
  if (processingScheduled) return;
  processingScheduled = true;
  queueMicrotask(async () => {
    processingScheduled = false;
    
    console.log("[M2M] Looking for course cards... (attempt", retryCount + 1, "of", MAX_RETRIES, ")");
    const cards = findCourseCards();
    console.log("[M2M] Found cards:", cards.length);
    
    if (!cards.length) {
      retryCount++;
      console.log("[M2M] No course cards found, retry count:", retryCount);
      if (retryCount < MAX_RETRIES) {
        const delay = Math.min(BASE_RETRY_DELAY_MS + (retryCount * RETRY_DELAY_INCREMENT_MS), MAX_RETRY_DELAY_MS); // Progressive delay
        console.log("[M2M] No course cards found, retrying in", delay, "ms...");
        setTimeout(() => scheduleProcessing(), delay);
      } else {
        console.log("[M2M] Max retries reached, giving up");
        showStatus("コース情報の読み込みに時間がかかっています。ページを更新してください。");
      }
      return;
    }
    
    retryCount = 0; // Reset retry count on success
    try {
      await processCourseCards(cards);
    } catch (error) {
      console.error("[M2M] Failed to process courses", error);
      showStatus(
        "時間割の生成中にエラーが発生しました。ページを更新してください。"
      );
    }
  });
}

async function processCourseCards(courseCards) {
  console.log("[M2M] Found course cards:", courseCards.length);
  const courseInfos = extractCourseInfos(courseCards);
  console.log("[M2M] Extracted course infos:", courseInfos.length);
  
  if (!courseInfos.length) {
    console.log("[M2M] No course infos found");
    return;
  }

  if (hasRendered && courseInfos.length === lastProcessedCount) {
    console.log("[M2M] Already rendered same number of courses, skipping");
    return;
  }

  lastProcessedCount = courseInfos.length;
  console.log("[M2M] Processing courses...");
  
  try {
    showStatus("manabaスタイルの時間割を生成しています…");
    
    // 並列処理でコース情報を取得
    console.log("[M2M] Loading", courseInfos.length, "courses in parallel...");
    const coursePromises = courseInfos.map(info => 
      loadCourse(info).catch(error => {
        console.error("[M2M] Error loading course:", info.name, error);
        return null;
      })
    );
    
    const loadedCourses = await Promise.all(coursePromises);
    
    // フィルタリング: null、schedule無しを除外
    const courses = loadedCourses.filter(course => {
      if (!course) {
        return false;
      }
      if (!course.schedule.length) {
        console.log("[M2M] Course has no schedule:", course.name);
        return false;
      }
      console.log("[M2M] Course loaded with schedule:", course.name, "Schedule:", course.schedule);
      return true;
    });

    console.log("[M2M] Courses with schedule:", courses.length);
    
    if (!courses.length) {
      showStatus("時間割情報を含むコースが見つかりませんでした。");
      return;
    }

    // Only hide original content and render timetable if we have courses to show
    hideOriginalCourseView();
    console.log("[M2M] Rendering timetable...");
    renderTimetable(courses);
    console.log("[M2M] Timetable rendered successfully");
    
    // Debug: Log table structure
    const wrapper = document.getElementById(WRAPPER_ID);
    if (wrapper) {
      console.log("[M2M] Wrapper element:", wrapper);
      console.log("[M2M] Wrapper HTML:", wrapper.outerHTML.substring(0, 500));
      const table = wrapper.querySelector('table');
      if (table) {
        console.log("[M2M] Table found:", table);
        console.log("[M2M] Table rows:", table.rows.length);
        console.log("[M2M] Table computed style display:", getComputedStyle(table).display);
      } else {
        console.log("[M2M] No table found in wrapper");
      }
    }
    
    hasRendered = true;
    
  } catch (error) {
    console.error("[M2M] Error in processCourseCards:", error);
    showStatus("時間割の生成中にエラーが発生しました: " + error.message);
    // Restore original view on error
    restoreOriginalCourseView();
  }
}

function extractCourseInfos(courseCards) {
  const unique = new Map();
  courseCards.forEach((card) => {
    console.log("[M2M] Processing card:", card);
    console.log("[M2M] Card HTML:", card.outerHTML.substring(0, 500));
    
    // Try multiple selectors for course name and link
    const linkSelectors = [
      ".coursename a", 
      "a.aalink", 
      "a[href*='course/view.php']", 
      "a[href*='course']",
      "a", 
      ".course-title a",
      ".courselink a",
      "[data-action='view-course'] a"
    ];
    
    let link = null;
    for (const selector of linkSelectors) {
      link = card.querySelector(selector);
      if (link) {
        console.log("[M2M] Found course link with selector:", selector, "Link:", link);
        break;
      } else {
        console.log("[M2M] No link found with selector:", selector);
      }
    }
    
    // If no direct link found, try to find it in parent or sibling elements
    if (!link) {
      console.log("[M2M] Searching in parent and sibling elements...");
      let parent = card.parentElement;
      while (parent && parent !== document.body) {
        for (const selector of linkSelectors) {
          link = parent.querySelector(selector);
          if (link) {
            console.log("[M2M] Found course link in parent with selector:", selector);
            break;
          }
        }
        if (link) break;
        parent = parent.parentElement;
      }
    }
    
    // Try to find course name even without link
    if (!link) {
      console.log("[M2M] No course link found, checking for course name...");
      const nameSelectors = [
        ".coursename",
        "[data-course-name]",
        ".course-title",
        "h3",
        "h4",
        ".card-title"
      ];
      
      let nameElement = null;
      for (const selector of nameSelectors) {
        nameElement = card.querySelector(selector);
        if (nameElement && nameElement.textContent.trim()) {
          console.log("[M2M] Found course name element:", nameElement.textContent.trim());
          break;
        }
      }
      
      if (nameElement) {
        console.log("[M2M] Course name found but no link - this might be a display-only element");
      }
      return;
    }
    
    const url = normalizeUrl(link.href);
    if (!url) return;
    
    // Clean up course name - remove extra whitespace and unwanted text
    let name = (link.textContent || "").trim();
    name = name.replace(/\s+/g, ' '); // Replace multiple whitespace with single space
    if (COURSE_NAME_PATTERNS.MAIN_EXTRACTION.test(name)) {
      name = name.replace(COURSE_NAME_PATTERNS.MAIN_EXTRACTION, '$2'); // Extract course code and name
    } else if (COURSE_NAME_PATTERNS.FALLBACK_EXTRACTION.test(name)) {
      name = name.replace(COURSE_NAME_PATTERNS.FALLBACK_EXTRACTION, '$1'); // Fallback extraction
    }
    if (!name) return;
    if (unique.has(url)) return;
    
    console.log("[M2M] Extracted course info:", { name, url });
    unique.set(url, { name, url });
  });
  return Array.from(unique.values());
}

function normalizeUrl(href) {
  try {
    return new URL(href, window.location.origin).href;
  } catch (error) {
    console.warn("[M2M] Invalid course URL skipped", href);
    return "";
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
    console.error("[M2M] Failed to fetch course detail", info.url, error);
    courseCache.set(info.url, null);
    return null;
  }
}

async function fetchCourseDocument(url) {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const html = await response.text();
  const parser = new DOMParser();
  return parser.parseFromString(html, "text/html");
}

function renderTimetable(courses) {
  try {
    console.log("[M2M] Starting timetable rendering with courses:", courses.length);
    const wrapper = ensureWrapper();
    wrapper.innerHTML = "";
    
    // Check if generateManabaTable function exists
    if (typeof generateManabaTable !== 'function') {
      throw new Error("generateManabaTable function not found - tableGenerator.js may not be loaded");
    }
    
    console.log("[M2M] Calling generateManabaTable...");
    const table = generateManabaTable(courses);
    
    if (!table || !table.tagName) {
      throw new Error("generateManabaTable returned invalid element");
    }
    
    // Add inline styles to ensure table visibility
    table.style.cssText = `
      width: 100% !important;
      border-collapse: collapse !important;
      background: white !important;
      margin: 10px 0 !important;
      display: table !important;
      visibility: visible !important;
      opacity: 1 !important;
    `;
    
    console.log("[M2M] Table generated successfully, appending to wrapper");
    wrapper.appendChild(table);
    
    // Add a title to make it clear what this is
    const title = document.createElement("h3");
    title.textContent = "manabaスタイル時間割表示";
    title.style.cssText = `
      color: #333 !important;
      margin: 0 0 15px 0 !important;
      font-size: 18px !important;
      font-weight: bold !important;
    `;
    wrapper.insertBefore(title, table);
    
    console.log("[M2M] Timetable render complete");
    
    // Force a reflow to ensure the browser recalculates layout and applies all style changes
    // before displaying the timetable. This helps prevent rendering glitches after dynamic DOM updates.
    wrapper.offsetHeight;
    
  } catch (error) {
    console.error("[M2M] Error in renderTimetable:", error);
    showStatus("時間割テーブルの生成に失敗しました: " + error.message);
    throw error;
  }
}

function hideOriginalCourseView() {
  console.log("[M2M] Minimizing original course view (not hiding completely)...");
  const target = findElement(ALTERNATIVE_SELECTORS.courseViewContent);
  if (target) {
    // Don't set data-manaba-hidden, just reduce opacity to keep content visible
    // Lighter minimization - just reduce opacity slightly
    target.style.cssText = `
      opacity: 0.7 !important;
      transition: all 0.3s ease !important;
    `;
    console.log("[M2M] Original course view lightly minimized");
  } else {
    console.warn("[M2M] Could not find course view to minimize");
  }
}

function restoreOriginalCourseView() {
  console.log("[M2M] Restoring original course view...");
  const target = findElement(ALTERNATIVE_SELECTORS.courseViewContent);
  if (target) {
    target.style.cssText = "";
    console.log("[M2M] Original course view restored");
  }
  
  // Also remove our wrapper
  const wrapper = document.getElementById(WRAPPER_ID);
  if (wrapper) {
    wrapper.remove();
    console.log("[M2M] Manaba wrapper removed");
  }
}

function ensureWrapper() {
  let wrapper = document.getElementById(WRAPPER_ID);
  if (wrapper) {
    return wrapper;
  }

  const container = findElement(ALTERNATIVE_SELECTORS.coursesView);
  if (!container) {
    throw new Error("Course view container not found");
  }

  wrapper = document.createElement("div");
  wrapper.id = WRAPPER_ID;
  wrapper.classList.add("manaba-timetable-container");
  
  // Add inline styles to ensure visibility
  wrapper.style.cssText = `
    display: block !important;
    visibility: visible !important;
    opacity: 1 !important;
    width: 100% !important;
    margin: 20px 0 !important;
    padding: 20px !important;
    background: white !important;
    border: 1px solid #ddd !important;
    border-radius: 4px !important;
    min-height: 400px !important;
  `;
  
  container.prepend(wrapper);
  console.log("[M2M] Wrapper created and styled:", wrapper);
  return wrapper;
}

function showStatus(message) {
  try {
    const wrapper = ensureWrapper();
    wrapper.innerHTML = "";
    const status = document.createElement("div");
    status.classList.add("manaba-timetable-status");
    status.textContent = message;
    wrapper.appendChild(status);
  } catch (error) {
    console.warn("[M2M] Unable to display status", error);
  }
}

// Monitor for network activity and DOM changes to detect when loading is complete
function monitorNetworkActivity() {
  console.log("[M2M] Starting network activity monitoring...");
  
  let lastActivity = Date.now();
  let checkInterval;
  
  // Monitor for specific Moodle loading indicators
  const loadingIndicators = [
    '.loading',
    '.spinner',
    '[aria-label*="loading"]',
    '[data-loading="true"]'
  ];
  
  const checkLoadingComplete = () => {
    const indicators = document.querySelectorAll(loadingIndicators.join(', '));
    const placeholders = document.querySelectorAll('.bg-pulse-grey');
    const courseLinks = document.querySelectorAll('a[href*="course/view.php"]');
    
    console.log("[M2M] Loading check - Indicators:", indicators.length, "Placeholders:", placeholders.length, "Course links:", courseLinks.length);
    
    // If we have course links and no loading indicators, content is likely loaded
    if (courseLinks.length > 0 && indicators.length === 0 && placeholders.length < MAX_LOADING_PLACEHOLDERS) {
      console.log("[M2M] Network activity appears complete, triggering course processing");
      clearInterval(checkInterval);
      setTimeout(() => scheduleProcessing(), 1000);
    }
  };
  
  // Check every 500ms for loading completion
  checkInterval = setInterval(checkLoadingComplete, 500);
  
  // Stop monitoring after 30 seconds
  setTimeout(() => {
    console.log("[M2M] Network monitoring timeout");
    clearInterval(checkInterval);
  }, 30000);
}
