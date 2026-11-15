const FEATURES = [
  {
    title: "待办清单",
    desc: "把要做的事写下来，做完一件勾掉一件。",
    tags: ["效率", "工具"],
    href: "",
  },
  {
    title: "收藏夹",
    desc: "保存喜欢的链接和想法，随时翻回来看看。",
    tags: ["收藏", "整理"],
    href: "",
  },
  {
    title: "天气",
    desc: "看看今天的温度与天气，出门前心中有数。",
    tags: ["生活", "查询"],
    href: "",
  },
];

const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const countEl = document.getElementById("count");
const input = document.getElementById("search");
const toastEl = document.getElementById("toast");

let toastTimer;

function toast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2000);
}

function getTerms() {
  return input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlight(text, terms) {
  const fragment = document.createDocumentFragment();
  if (!terms.length) {
    fragment.append(text);
    return fragment;
  }
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "gi");
  let cursor = 0;
  let match;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > cursor) fragment.append(text.slice(cursor, match.index));
    const mark = document.createElement("mark");
    mark.textContent = match[0];
    fragment.append(mark);
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length) fragment.append(text.slice(cursor));
  return fragment;
}

function createCard(feature, terms) {
  const isLive = Boolean(feature.href);

  const card = document.createElement("a");
  card.className = "card";
  card.href = isLive ? feature.href : "#";
  if (!isLive) {
    card.addEventListener("click", (event) => {
      event.preventDefault();
      toast(`「${feature.title}」正在搭建中`);
    });
  }

  const icon = document.createElement("span");
  icon.className = "card-icon";
  icon.textContent = feature.title.slice(0, 1);
  icon.setAttribute("aria-hidden", "true");

  const title = document.createElement("h3");
  title.className = "card-title";
  title.append(highlight(feature.title, terms));

  const desc = document.createElement("p");
  desc.className = "card-desc";
  desc.append(highlight(feature.desc, terms));

  const tags = document.createElement("span");
  tags.className = "card-tags";
  feature.tags.forEach((tag) => {
    const chip = document.createElement("span");
    chip.className = "tag";
    chip.append(highlight(tag, terms));
    tags.append(chip);
  });

  const status = document.createElement("span");
  status.className = "tag tag-status";
  status.textContent = isLive ? "已上线" : "即将上线";
  tags.append(status);

  card.append(icon, title, desc, tags);
  return card;
}

function render() {
  const terms = getTerms();
  const visible = FEATURES.filter((feature) => {
    if (!terms.length) return true;
    const haystack = [feature.title, feature.desc, ...feature.tags].join(" ").toLowerCase();
    return terms.every((term) => haystack.includes(term));
  });

  grid.replaceChildren(...visible.map((feature) => createCard(feature, terms)));
  empty.hidden = visible.length > 0;
  countEl.textContent = terms.length
    ? `找到 ${visible.length} 个功能`
    : `共 ${FEATURES.length} 个功能`;
}

input.addEventListener("input", render);

document.addEventListener("keydown", (event) => {
  if (event.key === "/" && document.activeElement !== input) {
    event.preventDefault();
    input.focus();
    input.select();
    return;
  }
  if (event.key === "Escape" && document.activeElement === input) {
    input.value = "";
    render();
  }
});

document.getElementById("year").textContent = new Date().getFullYear();

render();
