const API_BASE = "http://localhost:8010/api";
const EDUMIND_WEB_URL = "http://localhost:5174";
const EDUMIND_ENGAGEMENT_API = "http://localhost:8005";
const EDUMIND_LEARNING_API = "http://localhost:8006";

let currentUser = null; // { id, username, displayName, edumindStudentId }
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
const edumindLinkEl = document.getElementById("edumind-link");
const btnMyPerformance = document.getElementById("btn-my-performance");
const courseContentEl = document.getElementById("course-content");
const performanceViewEl = document.getElementById("performance-view");
const performanceGridEl = document.getElementById("performance-grid");
const perfLoadingEl = document.getElementById("perf-loading");
const perfErrorEl = document.getElementById("perf-error");

function setStatus(msg) {
  const time = new Date().toLocaleTimeString();
  statusEl.textContent = `[${time}] ${msg}`;
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

// 1) Login

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
      (currentUser.edumindStudentId
        ? ` (EduMind: ${currentUser.edumindStudentId})`
        : " (no EduMind mapping)");

    loginInfoEl.textContent =
      `Logged in as ${currentUser.displayName || currentUser.username}\n` +
      `LMS user id: ${currentUser.id}\n` +
      `EduMind student_id: ${currentUser.edumindStudentId || "NONE"}`;

    // Switch view: hide login, show dashboard
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");

    // Show only the My Performance button if the student has a mapping
    if (currentUser.edumindStudentId) {
      btnMyPerformance.classList.remove("hidden");
    }

    setStatus("Login successful. Click a course on the left.");
    await loadCourses();
  } catch (err) {
    loginErrorEl.textContent = "Login failed: " + err.message;
  }
});

// 2) Load courses

document.getElementById("btn-load-courses").addEventListener("click", async () => {
  await loadCourses();
});

async function loadCourses() {
  if (!currentUser) {
    setStatus("Please login first.");
    return;
  }

  try {
    setStatus("Loading courses...");
    const data = await api("/courses/");

    courses = data.courses || [];
    renderCourseList();

    if (courses.length === 0) {
      courseTitleEl.textContent = "No courses yet";
      courseDescriptionEl.textContent =
        "Use POST /api/courses in Postman to create a demo course.";
      activitiesSectionEl.classList.add("hidden");
    } else if (!activeCourse) {
      // Auto-select the first course
      selectCourse(courses[0].id);
    }

    setStatus("Courses loaded.");
  } catch (err) {
    setStatus("Failed to load courses: " + err.message);
  }
}

function renderCourseList() {
  coursesListEl.innerHTML = "";
  if (courses.length === 0) {
    const div = document.createElement("div");
    div.className = "small";
    div.textContent = "No courses found.";
    coursesListEl.appendChild(div);
    return;
  }

  courses.forEach((course) => {
    const div = document.createElement("div");
    div.className = "course-item" + (activeCourse && activeCourse.id === course.id ? " active" : "");
    div.textContent = course.title;
    div.addEventListener("click", () => selectCourse(course.id));
    coursesListEl.appendChild(div);
  });
}

function selectCourse(courseId) {
  const course = courses.find((c) => c.id === courseId);
  if (!course) return;

  // Switch from performance view back to course view
  performanceViewEl.classList.add("hidden");
  courseContentEl.classList.remove("hidden");

  activeCourse = course;
  renderCourseList(); // update active highlight

  courseTitleEl.textContent = course.title;
  courseDescriptionEl.textContent =
    course.description || "This is a demo course for engagement tracking.";

  // Render standard activities (Moodle-style cards)
  activitiesGridEl.innerHTML = "";

  const activities = [
    {
      id: "overview-page",
      type: "Page",
      title: "Course overview",
      description: "Read the course overview page.",
      actions: [
        { label: "Open page", eventType: "page_view" },
      ],
    },
    {
      id: "intro-video",
      type: "Video",
      title: "Introductory lecture",
      description: "Watch the introductory video for this course.",
      actions: [
        { label: "Play video", eventType: "video_play" },
        { label: "Complete video", eventType: "video_complete" },
      ],
    },
    {
      id: "quiz-1",
      type: "Quiz",
      title: "Quiz 1",
      description: "Take a short quiz to test your knowledge.",
      actions: [
        { label: "Start quiz", eventType: "quiz_start" },
        { label: "Submit quiz", eventType: "quiz_submit" },
      ],
    },
  ];

  activities.forEach((act) => {
    const card = document.createElement("div");
    card.className = "activity-card";
    card.innerHTML = `
      <div class="activity-type">${act.type}</div>
      <h4>${act.title}</h4>
      <p class="small">${act.description}</p>
      <div class="activity-actions"></div>
    `;

    const actionsDiv = card.querySelector(".activity-actions");
    act.actions.forEach((a) => {
      const btn = document.createElement("button");
      btn.className = "outline";
      btn.textContent = a.label;
      btn.addEventListener("click", () =>
        sendEventForCourse(a.eventType, course, act)
      );
      actionsDiv.appendChild(btn);
    });

    activitiesGridEl.appendChild(card);
  });

  activitiesSectionEl.classList.remove("hidden");
  setStatus(`Selected course ${course.title}. Use activity buttons to send events.`);
}

// 3) Send event

async function sendEventForCourse(eventType, course, activity) {
  if (!currentUser) {
    setStatus("Please login first.");
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
    setStatus(`Sending ${eventType} for ${activity.title}...`);
    const res = await api("/events/", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setStatus(
      `Event sent: student_id=${res.student_id}, forwarded=${res.forwarded_to}`
    );
  } catch (err) {
    setStatus("Failed to send event: " + err.message);
  }
}

// ─── 4) My Performance ───────────────────────────────────────────────

btnMyPerformance.addEventListener("click", () => {
  courseContentEl.classList.add("hidden");
  performanceViewEl.classList.remove("hidden");
  // Deselect active course in sidebar
  activeCourse = null;
  renderCourseList();
  loadPerformance();
});

async function edumindFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    let detail = "";
    try { const d = await res.json(); detail = d.detail || ""; } catch {}
    throw new Error(detail || res.statusText);
  }
  return res.json();
}

async function loadPerformance() {
  if (!currentUser || !currentUser.edumindStudentId) return;

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

  const trendIcon = trend.toLowerCase().includes("improv") ? "&#9650;" :
                    trend.toLowerCase().includes("declin") ? "&#9660;" : "&#9679;";
  const trendClass = trend.toLowerCase().includes("improv") ? "trend-up" :
                     trend.toLowerCase().includes("declin") ? "trend-down" : "trend-stable";

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
  const riskIcon = atRisk ? "&#9888;" : "&#10003;";

  let alertsHtml = "";
  if (alerts.length > 0) {
    alertsHtml = `<div class="perf-alerts">
      ${alerts.slice(0, 3).map(a =>
        `<div class="perf-alert perf-alert-${a.severity || 'info'}">${a.message}</div>`
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
      <p class="small">No activity data available for the past 7 days.</p>
    </div>`;
  }

  const rows = data.map(d => {
    const dateStr = new Date(d.date + "T00:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    return `<tr>
      <td>${dateStr}</td>
      <td>${d.login_count || 0}</td>
      <td>${d.page_views || 0}</td>
      <td>${d.quiz_attempts || 0}</td>
      <td>${(d.forum_posts || 0) + (d.forum_replies || 0)}</td>
      <td>${d.assignments_submitted || 0}</td>
      <td>${Math.round(d.total_session_duration_minutes || 0)} min</td>
    </tr>`;
  }).join("");

  const totals = data.reduce((acc, d) => {
    acc.logins += d.login_count || 0;
    acc.pages += d.page_views || 0;
    acc.quizzes += d.quiz_attempts || 0;
    acc.forum += (d.forum_posts || 0) + (d.forum_replies || 0);
    acc.assignments += d.assignments_submitted || 0;
    acc.time += d.total_session_duration_minutes || 0;
    return acc;
  }, { logins: 0, pages: 0, quizzes: 0, forum: 0, assignments: 0, time: 0 });

  return `<div class="perf-card perf-card-wide">
    <div class="perf-card-title">Weekly Activity (Last 7 Days)</div>
    <div class="perf-table-wrap">
      <table class="perf-table">
        <thead>
          <tr>
            <th>Date</th><th>Logins</th><th>Pages</th><th>Quizzes</th><th>Forum</th><th>Assign.</th><th>Time</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="perf-table-total">
            <td><strong>Total</strong></td>
            <td><strong>${totals.logins}</strong></td>
            <td><strong>${totals.pages}</strong></td>
            <td><strong>${totals.quizzes}</strong></td>
            <td><strong>${totals.forum}</strong></td>
            <td><strong>${totals.assignments}</strong></td>
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
    Visual: "&#128065;", Auditory: "&#127911;", Reading: "&#128214;", Kinesthetic: "&#9997;", Mixed: "&#127912;"
  };
  const icon = styleIcons[style] || "&#128300;";

  let effectiveHtml = "";
  if (effectiveTypes.length > 0) {
    effectiveHtml = `<div class="perf-stat-row" style="margin-top:0.5rem;">
      <span class="perf-stat-label">Best resource types</span>
      <span class="perf-stat-value">${effectiveTypes.map(t => t.resource_type).join(", ") || "—"}</span>
    </div>`;
  }

  const trendIcon = trend.toLowerCase().includes("improv") ? "&#9650;" :
                    trend.toLowerCase().includes("declin") ? "&#9660;" : "&#9679;";
  const trendClass = trend.toLowerCase().includes("improv") ? "trend-up" :
                     trend.toLowerCase().includes("declin") ? "trend-down" : "trend-stable";

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