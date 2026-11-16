const user = getCurrentUser();

if (user) {
  document.title = `${user.username} · 南山南的小天地`;
  document.getElementById("avatar").textContent = user.username.slice(0, 1);
  document.getElementById("username").textContent = user.username;
  document.getElementById("user-id").textContent = user.id;
  document.getElementById("joined").textContent = new Date(user.createdAt).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

document.getElementById("logout").addEventListener("click", () => {
  logout();
  location.replace("auth.html");
});
