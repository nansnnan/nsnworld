const API_BASE = (window.API_BASE || "").replace(/\/+$/, "");
const SESSION_KEY = "nansn.session";
const USERS_KEY = "nansn.users";
const ALLOWED_PAGES = ["index.html", "profile.html"];

function getCurrentUser() {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const user = JSON.parse(raw);
    return user && typeof user === "object" && user.id ? user : null;
  } catch {
    return null;
  }
}

function saveSession(user) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function requireAuth() {
  if (getCurrentUser()) return true;
  document.documentElement.style.visibility = "hidden";
  const page = location.pathname.split("/").pop() || "index.html";
  const next = ALLOWED_PAGES.includes(page) ? page : "index.html";
  location.replace(`auth.html?next=${encodeURIComponent(next)}`);
  return false;
}

function logout() {
  localStorage.removeItem(SESSION_KEY);
}

// 未配置 API_BASE 时的本地后端，账号只保存在当前浏览器。
function loadLocalUsers() {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : { seq: 1, users: [] };
}

function localHash(password) {
  let hash = 5381;
  const text = `nansn:${password}`;
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 33 + text.charCodeAt(i)) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function localRegister(username, password) {
  const state = loadLocalUsers();
  const taken = state.users.some((user) => user.username.toLowerCase() === username.toLowerCase());
  if (taken) {
    return { ok: false, message: "这个用户名已经被注册了" };
  }
  const record = {
    id: String(state.seq).padStart(6, "0"),
    username,
    password: localHash(password),
    createdAt: Date.now(),
  };
  state.seq += 1;
  state.users.push(record);
  localStorage.setItem(USERS_KEY, JSON.stringify(state));
  return { ok: true, user: { id: record.id, username: record.username, createdAt: record.createdAt } };
}

function localLogin(username, password) {
  const record = loadLocalUsers().users.find((item) => item.username.toLowerCase() === username.toLowerCase());
  if (!record || record.password !== localHash(password)) {
    return { ok: false, message: "用户名或密码不正确" };
  }
  return { ok: true, user: { id: record.id, username: record.username, createdAt: record.createdAt } };
}

async function apiRequest(path, payload) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  return response.json();
}

async function register(username, password) {
  const result = API_BASE
    ? await apiRequest("/register", { username, password }).catch(() => ({ ok: false, message: "无法连接服务器，请稍后再试" }))
    : localRegister(username, password);
  if (result.ok) saveSession(result.user);
  return result;
}

async function login(username, password) {
  const result = API_BASE
    ? await apiRequest("/login", { username, password }).catch(() => ({ ok: false, message: "无法连接服务器，请稍后再试" }))
    : localLogin(username, password);
  if (result.ok) saveSession(result.user);
  return result;
}
