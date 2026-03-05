const API_BASE = "http://localhost:8010/api";
const EDUMIND_ENGAGEMENT_API = "http://localhost:8005";
const EDUMIND_LEARNING_API = "http://localhost:8006";

let currentUser = null;
let courses = [];
let activeCourse = null;

const navbarUserEl = document.getElementById("navbar-user");
const loginView = document.getElementById("login-view");
const dashboardView = document.getElementById("dashboard-view");
const loginInfoEl = document.getElementById("login-info");
const loginErrorEl = document.getElementById("login-error");
const statusEl = document.getElementById("status");
const coursesListEl = document.getElementById("courses-list");
const courseTitleEl = document.getElementById("course-title");
const courseDescriptionEl = document.getElementById("course-description");
const activitiesSectionEl = document.getElementById("activities-section");
const activitiesGridEl = document.getElementById("activities-grid");
const btnMyPerformance = document.getElementById("btn-my-performance");
const courseContentEl = document.getElementById("course-content");
const performanceViewEl = document.getElementById("performance-view");
const performanceGridEl = document.getElementById("performance-grid");
const perfLoadingEl = document.getElementById("perf-loading");
const perfErrorEl = document.getElementById("perf-error");

function setStatus(msg) {
  // In the production-like LMS UI we avoid showing internal logs.
  // Keep this hook for future use (e.g., subtle notifications), but do not render debug text.
  statusEl.textContent = "";
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    let detail = "";
    try {
      const data = await res.json();
      detail = data.detail || JSON.stringify(data);
    } catch {
      detail = res.statusText;
    }
    throw new Error(`${res.status} ${res.statusText}: ${detail}`);
  }
  return res.json();
}

// ─── Login ─────────────────────────────────────────────────────────────

document.getElementById("btn-login").addEventListener("click", async () => {
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  loginErrorEl.textContent = "";
  setStatus("");

  try {
    const data = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });

    currentUser = {
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.display_name,
      edumindStudentId: data.edumind_student_id,
      instituteId: data.institute_id || "LMS_INST_A",
    };

    navbarUserEl.textContent =
      (currentUser.displayName || currentUser.username) +
      (currentUser.edumindStudentId ? ` (${currentUser.edumindStudentId})` : "");

    loginInfoEl.textContent =
      `Logged in as ${currentUser.displayName || currentUser.username} | EduMind: ${currentUser.edumindStudentId || "NONE"}`;

    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");

    if (currentUser.edumindStudentId) {
      btnMyPerformance.classList.remove("hidden");
    }

    setStatus("Login successful. Select a course.");
    await loadCourses();
  } catch (err) {
    loginErrorEl.textContent = "Login failed: " + err.message;
  }
});

// ─── Courses ────────────────────────────────────────────────────────────

document.getElementById("btn-load-courses").addEventListener("click", async () => {
  await loadCourses();
});

async function loadCourses() {
  if (!currentUser) return;

  try {
    const data = await api("/courses/");
    courses = data.courses || [];
    renderCourseList();

    if (courses.length === 0) {
      courseTitleEl.textContent = "No courses yet";
      courseDescriptionEl.textContent = "No courses are currently assigned to your account.";
      activitiesSectionEl.classList.add("hidden");
    } else if (!activeCourse) {
      selectCourse(courses[0].id);
    }
  } catch (err) {
    console.error("Failed to load courses", err);
  }
}

function renderCourseList() {
  coursesListEl.innerHTML = "";
  courses.forEach((course) => {
    const div = document.createElement("div");
    div.className = "course-item" + (activeCourse?.id === course.id ? " active" : "");
    div.textContent = course.title;
    div.addEventListener("click", () => selectCourse(course.id));
    coursesListEl.appendChild(div);
  });
}

// ─── Course activities with real materials ───────────────────────────────

const VARK_ACTIVITIES = [
  {
    id: "intro-video",
    type: "Video",
    vark: "auditory",
    title: "Introduction to Machine Learning",
    description: "Watch this lecture to learn core machine learning concepts.",
    content: `
      <div class="content-panel">
        <h4>Video: Introduction to Machine Learning</h4>
        <div class="video-container">
          <iframe src="https://www.youtube.com/embed/ukzFI9rgwfU?rel=0" allowfullscreen></iframe>
        </div>
        <p class="small" style="margin-top:0.75rem;">3Blue1Brown – Neural Networks (YouTube)</p>
        <button class="primary" data-role="video-complete" style="margin-top:0.75rem;">Mark video as completed</button>
      </div>
    `,
    actions: [
      { label: "Play video", eventType: "video_play" },
      { label: "Complete video", eventType: "video_complete" },
    ],
  },
  {
    id: "ml-article",
    type: "Article",
    vark: "reading",
    title: "What is Machine Learning?",
    description: "Read this article on machine learning fundamentals.",
    content: `
      <div class="content-panel">
        <h4>What is Machine Learning?</h4>
        <div class="article-content">
          <p><strong>Machine learning (ML)</strong> is a subset of artificial intelligence that enables systems to learn and improve from experience without being explicitly programmed. It focuses on developing computer programs that can access data and use it to learn for themselves.</p>
          <p>The process begins with observations or data, such as examples, direct experience, or instruction, to look for patterns in data and make better decisions in the future. The primary aim is to allow computers to learn automatically without human intervention.</p>
          <p><strong>Types of ML:</strong> Supervised learning (labeled data), unsupervised learning (unlabeled data), and reinforcement learning (reward-based). Common applications include recommendation systems, image recognition, natural language processing, and autonomous vehicles.</p>
        </div>
      </div>
    `,
    actions: [
      { label: "Read page", eventType: "page_view" },
    ],
  },
  {
    id: "ml-diagram",
    type: "Diagram",
    vark: "visual",
    title: "Neural Network Architecture",
    description: "Review this diagram showing a simple neural network.",
    content: `
      <div class="content-panel">
        <h4>Neural Network Architecture</h4>
        <div class="diagram-container">
          <svg viewBox="0 0 400 200" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto;">
            <defs><linearGradient id="g1" x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" style="stop-color:#8b5cf6"/><stop offset="100%" style="stop-color:#6366f1"/></linearGradient></defs>
            <circle cx="50" cy="50" r="12" fill="url(#g1)" opacity="0.8"/><circle cx="50" cy="100" r="12" fill="url(#g1)" opacity="0.8"/><circle cx="50" cy="150" r="12" fill="url(#g1)" opacity="0.8"/>
            <circle cx="200" cy="60" r="12" fill="#06b6d4" opacity="0.8"/><circle cx="200" cy="100" r="12" fill="#06b6d4" opacity="0.8"/><circle cx="200" cy="140" r="12" fill="#06b6d4" opacity="0.8"/>
            <circle cx="350" cy="100" r="12" fill="#10b981" opacity="0.8"/>
            <line x1="62" y1="50" x2="188" y2="60" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="62" y1="100" x2="188" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="62" y1="150" x2="188" y2="140" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="212" y1="60" x2="338" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="212" y1="100" x2="338" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <line x1="212" y1="140" x2="338" y2="100" stroke="#71717a" stroke-width="1" opacity="0.6"/>
            <text x="50" y="185" text-anchor="middle" fill="#a1a1aa" font-size="11">Input</text>
            <text x="200" y="185" text-anchor="middle" fill="#a1a1aa" font-size="11">Hidden</text>
            <text x="350" y="185" text-anchor="middle" fill="#a1a1aa" font-size="11">Output</text>
          </svg>
        </div>
        <p class="small" style="margin-top:0.75rem;">Input layer → Hidden layers → Output layer</p>
      </div>
    `,
    actions: [
      { label: "View diagram", eventType: "resource_download" },
    ],
  },
  {
    id: "ml-quiz",
    type: "Quiz",
    vark: "kinesthetic",
    title: "ML Basics Quiz",
    description: "Test your knowledge with this short interactive quiz.",
    content: `
      <div class="content-panel">
        <h4>ML Basics Quiz</h4>
        <p>Which of the following is a type of machine learning?</p>
        <div class="quiz-options" id="quiz-options">
          <div class="quiz-option" data-value="a">Supervised learning</div>
          <div class="quiz-option" data-value="b">Unsupervised learning</div>
          <div class="quiz-option" data-value="c">Reinforcement learning</div>
          <div class="quiz-option" data-value="d">All of the above</div>
        </div>
        <button class="primary quiz-submit-btn" style="margin-top:0.75rem;">Submit answer</button>
        <div class="small quiz-feedback" style="margin-top:0.75rem;"></div>
      </div>
    `,
    actions: [],
  },
];

function selectCourse(courseId) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;

  performanceViewEl.classList.add("hidden");
  courseContentEl.classList.remove("hidden");

  activeCourse = course;
  renderCourseList();

  courseTitleEl.textContent = course.title;
  courseDescriptionEl.textContent =
    course.description || "This course combines lecture, reading, visual summary, and quiz activities.";

  activitiesGridEl.innerHTML = "";

  VARK_ACTIVITIES.forEach((act) => {
    const card = document.createElement("div");
    card.className = `activity-card vark-${act.vark}`;
    card.innerHTML = `
      <div class="activity-type">${act.type}</div>
      <h4>${act.title}</h4>
      <p class="small">${act.description}</p>
      <div class="activity-actions"></div>
      <div class="activity-content-area" style="margin-top:1rem;"></div>
    `;

    const actionsDiv = card.querySelector(".activity-actions");
    const contentArea = card.querySelector(".activity-content-area");

    // Open button to show content
    const openBtn = document.createElement("button");
    openBtn.className = "outline";
    openBtn.textContent = "Open";
    openBtn.addEventListener("click", () => {
      if (contentArea.innerHTML) {
        contentArea.innerHTML = "";
        openBtn.textContent = "Open";
      } else {
        contentArea.innerHTML = act.content;
        openBtn.textContent = "Close";

        // Natural interactions trigger events
        if (act.id === "intro-video") {
          // Opening the video counts as a play
          sendEventForCourse("video_play", course, act);
          const completeBtn = contentArea.querySelector("[data-role='video-complete']");
          if (completeBtn) {
            completeBtn.addEventListener("click", () => {
              sendEventForCourse("video_complete", course, act);
            });
          }
        } else if (act.id === "ml-article") {
          // Opening the article counts as a page view
          sendEventForCourse("page_view", course, act);
        } else if (act.id === "ml-diagram") {
          // Opening the diagram counts as viewing / downloading the resource
          sendEventForCourse("resource_download", course, act);
        } else if (act.id === "ml-quiz") {
          // First time opening the quiz counts as quiz_start
          if (!contentArea.dataset.quizStarted) {
            sendEventForCourse("quiz_start", course, act);
            contentArea.dataset.quizStarted = "true";
          }
          // Quiz option selection
          contentArea.querySelectorAll(".quiz-option").forEach((opt) => {
            opt.addEventListener("click", () => {
              contentArea.querySelectorAll(".quiz-option").forEach((o) => o.classList.remove("selected"));
              opt.classList.add("selected");
            });
          });
          // Quiz submission with feedback
          const submitBtn = contentArea.querySelector(".quiz-submit-btn");
          const feedbackEl = contentArea.querySelector(".quiz-feedback");
          if (submitBtn && feedbackEl) {
            submitBtn.addEventListener("click", () => {
              const selected = contentArea.querySelector(".quiz-option.selected");
              if (!selected) {
                feedbackEl.textContent = "Please choose an answer before submitting.";
                return;
              }
              const value = selected.dataset.value;
              const correct = value === "d";
              if (correct) {
                feedbackEl.textContent = "Correct! All of these are types of machine learning.";
              } else {
                feedbackEl.textContent = "Not quite. The correct answer is: All of the above.";
              }
              sendEventForCourse("quiz_submit", course, act);
            });
          }
        }
      }
    });
    actionsDiv.appendChild(openBtn);

    activitiesGridEl.appendChild(card);
  });

  activitiesSectionEl.classList.remove("hidden");
}

// ─── Send event ─────────────────────────────────────────────────────────

async function sendEventForCourse(eventType, course, activity) {
  if (!currentUser) {
    return;
  }

  const payload = {
    event_type: eventType,
    event_timestamp: new Date().toISOString(),
    lms_user_id: currentUser.id,
    session_id: "sess-" + currentUser.id,
    event_data: {
      course_id: course.id,
      course_title: course.title,
      activity_id: activity.id,
      activity_title: activity.title,
      activity_type: activity.type,
    },
  };

  try {
    const res = await api("/events/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("Failed to send event", err);
  }
}

// ─── My Performance ──────────────────────────────────────────────────────

btnMyPerformance.addEventListener("click", () => {
  courseContentEl.classList.add("hidden");
  performanceViewEl.classList.remove("hidden");
  activeCourse = null;
  renderCourseList();
  loadPerformance();
});

async function edumindFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try {
      const d = await res.json();
      detail = d.detail || "";
    } catch {}
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function loadPerformance() {
  if (!currentUser?.edumindStudentId) return;

  const sid = encodeURIComponent(currentUser.edumindStudentId);
  const iid = encodeURIComponent(currentUser.instituteId);

  perfLoadingEl.classList.remove("hidden");
  perfErrorEl.classList.add("hidden");
  performanceGridEl.innerHTML = "";

  try {
    const [summary, dashboard, metrics, lsAnalytics] = await Promise.allSettled([
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/engagement/students/${sid}/summary`),
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/students/${sid}/dashboard?institute_id=${iid}`),
      edumindFetch(`${EDUMIND_ENGAGEMENT_API}/api/v1/engagement/students/${sid}/metrics?days=7`),
      edumindFetch(`${EDUMIND_LEARNING_API}/api/v1/students/${sid}/analytics`),
    ]);

    perfLoadingEl.classList.add("hidden");

    performanceGridEl.innerHTML =
      renderEngagementCard(summary) +
      renderRiskCard(dashboard) +
      renderWeeklyCard(metrics) +
      renderLearningStyleCard(lsAnalytics);
  } catch (err) {
    perfLoadingEl.classList.add("hidden");
    perfErrorEl.textContent = "Failed to load performance data: " + err.message;
    perfErrorEl.classList.remove("hidden");
  }
}

function val(settled) {
  return settled.status === "fulfilled" ? settled.value : null;
}

function renderEngagementCard(settled) {
  const data = val(settled);
  if (!data) {
    return `<div class="perf-card">
      <div class="perf-card-title">Engagement Summary</div>
      <p class="small">Could not load engagement data.</p>
    </div>`;
  }

  const score = Math.round(data.avg_engagement_score || 0);
  const level = data.current_engagement_level || "N/A";
  const trend = data.trend || "Stable";
  const days = data.days_tracked || 0;

  const trendIcon = trend.toLowerCase().includes("improv") ? "↑" : trend.toLowerCase().includes("declin") ? "↓" : "•";
  const trendClass = trend.toLowerCase().includes("improv") ? "trend-up" : trend.toLowerCase().includes("declin") ? "trend-down" : "trend-stable";
  const scoreClass = score >= 70 ? "score-high" : score >= 40 ? "score-med" : "score-low";

  return `<div class="perf-card">
    <div class="perf-card-title">Engagement Summary</div>
    <div class="perf-score-row">
      <div class="perf-score-badge ${scoreClass}">${score}%</div>
      <div class="perf-score-detail">
        <div class="perf-level">${level} engagement</div>
        <div class="perf-trend ${trendClass}">${trendIcon} ${trend}</div>
      </div>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Days tracked</span>
      <span class="perf-stat-value">${days}</span>
    </div>
  </div>`;
}

function renderRiskCard(settled) {
  const data = val(settled);
  if (!data) {
    return `<div class="perf-card">
      <div class="perf-card-title">Risk Status</div>
      <p class="small">Could not load risk data.</p>
    </div>`;
  }

  const status = data.current_status || {};
  const atRisk = status.at_risk;
  const riskLevel = status.risk_level || "Unknown";
  const prob = status.risk_probability != null ? Math.round(status.risk_probability * 100) : null;
  const alerts = data.alerts || [];

  const riskClass = riskLevel === "High" ? "risk-high" : riskLevel === "Medium" ? "risk-med" : "risk-low";
  const riskIcon = atRisk ? "⚠" : "✓";

  let alertsHtml = "";
  if (alerts.length > 0) {
    alertsHtml = `<div class="perf-alerts">
      ${alerts.slice(0, 3).map((a) =>
        `<div class="perf-alert perf-alert-${a.severity || "info"}">${a.message}</div>`
      ).join("")}
    </div>`;
  }

  const scores = data.component_scores || {};
  let componentsHtml = "";
  if (Object.keys(scores).length > 0) {
    const labels = { login: "Login", session: "Session", interaction: "Interaction", forum: "Forum", assignment: "Assignment" };
    componentsHtml = `<div class="perf-components">
      ${Object.entries(scores).map(([k, v]) =>
        `<div class="perf-comp-item">
          <span class="perf-comp-label">${labels[k] || k}</span>
          <div class="perf-comp-bar-bg"><div class="perf-comp-bar" style="width:${Math.min(Math.round(v), 100)}%"></div></div>
          <span class="perf-comp-val">${Math.round(v)}</span>
        </div>`
      ).join("")}
    </div>`;
  }

  return `<div class="perf-card">
    <div class="perf-card-title">Risk Status</div>
    <div class="perf-risk-row">
      <span class="perf-risk-badge ${riskClass}">${riskIcon} ${riskLevel}</span>
      ${prob != null ? `<span class="perf-risk-prob">${prob}% probability</span>` : ""}
    </div>
    ${alertsHtml}
    ${componentsHtml}
  </div>`;
}

function renderWeeklyCard(settled) {
  const data = val(settled);
  if (!data || !Array.isArray(data) || data.length === 0) {
    return `<div class="perf-card">
      <div class="perf-card-title">Weekly Activity</div>
      <p class="small">No activity data for the past 7 days.</p>
    </div>`;
  }

  const rows = data.map((d) => {
    const dateStr = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `<tr>
      <td>${dateStr}</td>
      <td>${d.login_count || 0}</td>
      <td>${d.page_views || 0}</td>
      <td>${d.video_plays || 0}</td>
      <td>${d.resource_downloads || 0}</td>
      <td>${d.quiz_attempts || 0}</td>
      <td>${(d.forum_posts || 0) + (d.forum_replies || 0)}</td>
      <td>${Math.round(d.total_session_duration_minutes || 0)} min</td>
    </tr>`;
  }).join("");

  const totals = data.reduce((acc, d) => {
    acc.logins += d.login_count || 0;
    acc.pages += d.page_views || 0;
    acc.videos += d.video_plays || 0;
    acc.diagrams += d.resource_downloads || 0;
    acc.quizzes += d.quiz_attempts || 0;
    acc.forum += (d.forum_posts || 0) + (d.forum_replies || 0);
    acc.time += d.total_session_duration_minutes || 0;
    return acc;
  }, { logins: 0, pages: 0, videos: 0, diagrams: 0, quizzes: 0, forum: 0, time: 0 });

  return `<div class="perf-card perf-card-wide">
    <div class="perf-card-title">Weekly Activity</div>
    <div class="perf-table-wrap">
      <table class="perf-table">
        <thead>
          <tr>
            <th>Date</th><th>Logins</th><th>Pages</th><th>Videos</th><th>Diagrams</th><th>Quizzes</th><th>Forum</th><th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="perf-table-total">
            <td><strong>Total</strong></td>
            <td><strong>${totals.logins}</strong></td>
            <td><strong>${totals.pages}</strong></td>
            <td><strong>${totals.videos}</strong></td>
            <td><strong>${totals.diagrams}</strong></td>
            <td><strong>${totals.quizzes}</strong></td>
            <td><strong>${totals.forum}</strong></td>
            <td><strong>${Math.round(totals.time)} min</strong></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>`;
}

function renderLearningStyleCard(settled) {
  const data = val(settled);
  if (!data) {
    return `<div class="perf-card">
      <div class="perf-card-title">Learning Style</div>
      <p class="small">Could not load learning style data.</p>
    </div>`;
  }

  const style = data.learning_style || "Unknown";
  const confidence = data.style_confidence != null ? Math.round(data.style_confidence * 100) : null;
  const trend = data.engagement_trend || "stable";
  const struggles = data.total_struggles || 0;
  const unresolved = data.unresolved_struggles || 0;
  const effectiveTypes = data.most_effective_resource_types || [];

  const styleIcons = {
    Visual: "👁",
    Auditory: "🎧",
    Reading: "📖",
    Kinesthetic: "✋",
    Mixed: "🔄",
  };
  const icon = styleIcons[style] || "❓";

  let effectiveHtml = "";
  if (effectiveTypes.length > 0) {
    effectiveHtml = `<div class="perf-stat-row" style="margin-top:0.5rem;">
      <span class="perf-stat-label">Best resource types</span>
      <span class="perf-stat-value">${effectiveTypes.map((t) => t.resource_type).join(", ") || "—"}</span>
    </div>`;
  }

  const trendIcon = trend.toLowerCase().includes("improv") ? "↑" : trend.toLowerCase().includes("declin") ? "↓" : "•";
  const trendClass = trend.toLowerCase().includes("improv") ? "trend-up" : trend.toLowerCase().includes("declin") ? "trend-down" : "trend-stable";

  return `<div class="perf-card">
    <div class="perf-card-title">Learning Style</div>
    <div class="perf-style-row">
      <span class="perf-style-icon">${icon}</span>
      <div>
        <div class="perf-style-name">${style}</div>
        ${confidence != null ? `<div class="small">Confidence: ${confidence}%</div>` : ""}
      </div>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Engagement trend</span>
      <span class="perf-stat-value ${trendClass}">${trendIcon} ${trend}</span>
    </div>
    <div class="perf-stat-row">
      <span class="perf-stat-label">Struggles detected</span>
      <span class="perf-stat-value">${struggles} (${unresolved} unresolved)</span>
    </div>
    ${effectiveHtml}
  </div>`;
}
