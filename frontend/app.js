const API_BASE = "http://localhost:8010/api";

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