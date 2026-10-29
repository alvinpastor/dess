const STORAGE_KEY = "schoolRegistrarStudents";
const $ = (id) => document.getElementById(id);

let students = loadStudents();

function loadStudents() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch (error) {
    return [];
  }
}

function saveStudents() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}

function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[char]));
}

function initials(name) {
  return String(name || "?").trim().split(/\s+/).slice(0, 2).map(part => part[0] || "").join("").toUpperCase();
}

function statusClass(status) {
  if (status === "Enrolled") return "status-enrolled";
  if (status === "Pending") return "status-pending";
  return "status-not-enrolled";
}

function statusBadge(status) {
  return `<span class="status ${statusClass(status)}">${escapeHTML(status)}</span>`;
}

function studentCell(student) {
  return `<div class="student-cell">
    <div class="student-avatar">${escapeHTML(initials(student.name))}</div>
    <div><div class="student-name">${escapeHTML(student.name)}</div>
    <div class="student-email">${escapeHTML(student.email || "No email provided")}</div></div>
  </div>`;
}

function renderDashboard() {
  $("total-count").textContent = students.length;
  $("enrolled-count").textContent = students.filter(s => s.status === "Enrolled").length;
  $("pending-count").textContent = students.filter(s => s.status === "Pending").length;
  $("not-enrolled-count").textContent = students.filter(s => s.status === "Not Enrolled").length;

  const recent = [...students].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
  $("recent-table").innerHTML = recent.map(s => `<tr>
    <td>${studentCell(s)}</td><td class="id-cell">${escapeHTML(s.studentId)}</td>
    <td>${escapeHTML(s.course)}</td><td>${escapeHTML(s.year)}</td><td>${statusBadge(s.status)}</td>
  </tr>`).join("");
  $("recent-empty").classList.toggle("hidden", recent.length > 0);
}

function renderStudents() {
  const query = $("search-input").value.trim().toLowerCase();
  const status = $("status-filter").value;
  const filtered = students.filter(s => {
    const matchesQuery = [s.name, s.studentId, s.course, s.email].some(value => String(value || "").toLowerCase().includes(query));
    return matchesQuery && (!status || s.status === status);
  }).sort((a, b) => a.name.localeCompare(b.name));

  $("students-table").innerHTML = filtered.map(s => `<tr>
    <td>${studentCell(s)}</td><td class="id-cell">${escapeHTML(s.studentId)}</td>
    <td>${escapeHTML(s.course)}</td><td>${escapeHTML(s.year)}</td><td>${statusBadge(s.status)}</td>
    <td><div class="action-group">
      <button class="small-button" data-edit="${escapeHTML(s.key)}">Edit</button>
      <button class="small-button delete" data-delete="${escapeHTML(s.key)}">Delete</button>
    </div></td>
  </tr>`).join("");
  $("students-empty").classList.toggle("hidden", filtered.length > 0);
}

function renderAll() {
  renderDashboard();
  renderStudents();
}

function showView(viewName) {
  document.querySelectorAll(".view").forEach(view => view.classList.add("hidden"));
  $(`${viewName}-view`).classList.remove("hidden");
  document.querySelectorAll(".nav-link").forEach(button => button.classList.toggle("active", button.dataset.view === viewName));
  const titles = { dashboard: "Dashboard", students: "Student Records", add: "Register Student" };
  $("page-title").textContent = titles[viewName] || "Dashboard";
  if (viewName === "students") renderStudents();
  if (viewName === "add" && !$("editing-id").value) resetForm();
}

function resetForm() {
  $("student-form").reset();
  $("editing-id").value = "";
  $("form-title").textContent = "Register New Student";
  $("save-button").textContent = "Save Student";
  $("date-registered").value = new Date().toISOString().slice(0, 10);
  $("form-message").textContent = "";
}

function editStudent(key) {
  const student = students.find(s => s.key === key);
  if (!student) return;
  $("editing-id").value = student.key;
  $("student-id").value = student.studentId;
  $("full-name").value = student.name;
  $("email").value = student.email;
  $("phone").value = student.phone;
  $("course").value = student.course;
  $("year-level").value = student.year;
  $("enrollment-status").value = student.status;
  $("date-registered").value = student.dateRegistered;
  $("form-title").textContent = "Edit Student Record";
  $("save-button").textContent = "Update Student";
  showView("add");
  $("editing-id").value = student.key;
  $("form-title").textContent = "Edit Student Record";
  $("save-button").textContent = "Update Student";
}

document.querySelectorAll("[data-view]").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.view));
});
document.querySelectorAll("[data-go]").forEach(button => {
  button.addEventListener("click", () => showView(button.dataset.go));
});

$("student-form").addEventListener("submit", event => {
  event.preventDefault();
  const editingKey = $("editing-id").value;
  const studentId = $("student-id").value.trim();
  const duplicate = students.some(s => s.studentId.toLowerCase() === studentId.toLowerCase() && s.key !== editingKey);
  if (duplicate) {
    $("form-message").textContent = "That Student ID already exists. Please use a unique ID.";
    return;
  }

  const existing = students.find(s => s.key === editingKey);
  const student = {
    key: editingKey || (window.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`),
    studentId,
    name: $("full-name").value.trim(),
    email: $("email").value.trim(),
    phone: $("phone").value.trim(),
    course: $("course").value,
    year: $("year-level").value,
    status: $("enrollment-status").value,
    dateRegistered: $("date-registered").value,
    createdAt: existing ? existing.createdAt : Date.now()
  };

  if (existing) {
    students = students.map(s => s.key === editingKey ? student : s);
  } else {
    students.push(student);
  }

  try {
    saveStudents();
    renderAll();
    resetForm();
    showView("students");
  } catch (error) {
    $("form-message").textContent = "Could not save the record. Your browser storage may be full or unavailable.";
  }
});

$("cancel-button").addEventListener("click", () => {
  resetForm();
  showView("students");
});

$("search-input").addEventListener("input", renderStudents);
$("status-filter").addEventListener("change", renderStudents);

$("students-table").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) editStudent(editButton.dataset.edit);
  if (deleteButton) {
    const student = students.find(s => s.key === deleteButton.dataset.delete);
    if (!student) return;
    if (confirm(`Delete the record for ${student.name} (${student.studentId})? This cannot be undone.`)) {
      students = students.filter(s => s.key !== student.key);
      saveStudents();
      renderAll();
    }
  }
});

renderAll();
showView("dashboard");
