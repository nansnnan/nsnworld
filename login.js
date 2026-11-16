const USERNAME_PATTERN = /^[\w\u4e00-\u9fa5-]{2,16}$/;

const params = new URLSearchParams(location.search);
const nextPage = ALLOWED_PAGES.includes(params.get("next")) ? params.get("next") : "index.html";

if (getCurrentUser()) {
  location.replace(nextPage);
}

const form = document.getElementById("auth-form");
const usernameInput = form.elements.username;
const passwordInput = form.elements.password;
const errorEl = document.getElementById("auth-error");
const submitBtn = document.getElementById("auth-submit");
const hintEl = document.getElementById("auth-hint");
const tabs = [...document.querySelectorAll(".auth-tab")];

let mode = "login";

function setMode(nextMode) {
  mode = nextMode;
  tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });
  submitBtn.textContent = mode === "login" ? "登录" : "注册并登录";
  hintEl.textContent = mode === "login"
    ? "还没有账号？点上方「注册」创建一个"
    : "注册后会得到一个专属的用户 ID";
  passwordInput.autocomplete = mode === "login" ? "current-password" : "new-password";
  errorEl.textContent = "";
}

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setMode(tab.dataset.mode));
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  const password = passwordInput.value;

  if (!username || !password) {
    errorEl.textContent = "请填写用户名和密码";
    return;
  }
  if (mode === "register") {
    if (!USERNAME_PATTERN.test(username)) {
      errorEl.textContent = "用户名需 2-16 位，可含中英文、数字、下划线和短横线";
      return;
    }
    if (password.length < 6) {
      errorEl.textContent = "密码至少 6 位";
      return;
    }
  }

  submitBtn.disabled = true;
  errorEl.textContent = "";
  const result = mode === "login" ? await login(username, password) : await register(username, password);
  if (!result.ok) {
    submitBtn.disabled = false;
    errorEl.textContent = result.message;
    return;
  }
  location.replace(nextPage);
});

setMode("login");
