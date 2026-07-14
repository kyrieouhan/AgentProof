const statusEl = document.querySelector("#status");
const sessionEl = document.querySelector("#session-state");
const taskList = document.querySelector("#task-list");

function setStatus(message, kind = "success") {
  statusEl.textContent = message;
  statusEl.className = kind;
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json" },
    credentials: "same-origin",
    ...options
  });
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }
  return body;
}

function formJson(form) {
  return JSON.stringify(Object.fromEntries(new FormData(form)));
}

async function refreshSession() {
  const { user } = await request("/api/me");
  sessionEl.textContent = user ? `Logged in as ${user.email} (${user.role})` : "Not logged in.";
  await refreshTasks();
}

async function refreshTasks() {
  try {
    const { tasks } = await request("/api/tasks");
    taskList.innerHTML = "";
    for (const task of tasks) {
      const item = document.createElement("li");
      item.textContent = `${task.completed ? "✓" : "□"} ${task.title}`;
      taskList.append(item);
    }
  } catch {
    taskList.innerHTML = "<li>Log in to view tasks.</li>";
  }
}

document.querySelector("#register-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/register", {
      method: "POST",
      body: formJson(event.currentTarget)
    });
    setStatus("Registration succeeded and you are logged in.");
    await refreshSession();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#login-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await request("/api/login", {
      method: "POST",
      body: formJson(event.currentTarget)
    });
    setStatus("Login succeeded.");
    await refreshSession();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#logout-button").addEventListener("click", async () => {
  try {
    await request("/api/logout", { method: "POST" });
    setStatus("Logged out.");
    await refreshSession();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  try {
    await request("/api/tasks", {
      method: "POST",
      body: formJson(form)
    });
    form.reset();
    setStatus("Task saved to SQLite.");
    await refreshTasks();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

document.querySelector("#admin-button").addEventListener("click", async () => {
  try {
    await request("/api/admin/summary");
    setStatus("Admin request succeeded.");
  } catch (error) {
    setStatus(error.message, "error");
  }
});

refreshSession().catch((error) => setStatus(error.message, "error"));
