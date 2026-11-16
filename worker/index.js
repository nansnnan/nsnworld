const USERNAME_PATTERN = /^[\w\u4e00-\u9fa5-]{2,16}$/;
const MAX_ID_ATTEMPTS = 5;

function corsHeaders(env) {
  return {
    "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
  };
}

function json(env, data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...corsHeaders(env) },
  });
}

function publicUser(user) {
  return { id: user.id, username: user.username, createdAt: user.createdAt };
}

async function hashPassword(password, salt) {
  const data = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function readJson(request) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function register(request, env) {
  const body = await readJson(request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!USERNAME_PATTERN.test(username)) {
    return json(env, { ok: false, message: "用户名需 2-16 位，可含中英文、数字、下划线和短横线" }, 400);
  }
  if (password.length < 6) {
    return json(env, { ok: false, message: "密码至少 6 位" }, 400);
  }

  const nameKey = `name:${username.toLowerCase()}`;
  if (await env.USERS.get(nameKey)) {
    return json(env, { ok: false, message: "这个用户名已经被注册了" }, 409);
  }

  let seq = parseInt((await env.USERS.get("seq")) || "1", 10);
  let id = "";
  for (let attempt = 0; attempt < MAX_ID_ATTEMPTS; attempt += 1) {
    id = String(seq).padStart(6, "0");
    if (!(await env.USERS.get(`user:${id}`))) break;
    seq += 1;
  }

  const salt = crypto.randomUUID();
  const user = {
    id,
    username,
    salt,
    password: await hashPassword(password, salt),
    createdAt: Date.now(),
  };

  await env.USERS.put(`user:${id}`, JSON.stringify(user));
  await env.USERS.put(nameKey, id);
  await env.USERS.put("seq", String(seq + 1));

  return json(env, { ok: true, user: publicUser(user) }, 201);
}

async function login(request, env) {
  const body = await readJson(request);
  const username = typeof body?.username === "string" ? body.username.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!username || !password) {
    return json(env, { ok: false, message: "用户名或密码不正确" }, 401);
  }

  const id = await env.USERS.get(`name:${username.toLowerCase()}`);
  const raw = id ? await env.USERS.get(`user:${id}`) : null;
  if (!raw) {
    return json(env, { ok: false, message: "用户名或密码不正确" }, 401);
  }

  const user = JSON.parse(raw);
  const hashed = await hashPassword(password, user.salt);
  if (hashed !== user.password) {
    return json(env, { ok: false, message: "用户名或密码不正确" }, 401);
  }

  return json(env, { ok: true, user: publicUser(user) });
}

async function getUser(env, id) {
  const raw = await env.USERS.get(`user:${id}`);
  if (!raw) {
    return json(env, { ok: false, message: "用户不存在" }, 404);
  }
  return json(env, { ok: true, user: publicUser(JSON.parse(raw)) });
}

export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    if (pathname === "/health") {
      return json(env, { ok: true });
    }
    if (pathname === "/register" && request.method === "POST") {
      return register(request, env);
    }
    if (pathname === "/login" && request.method === "POST") {
      return login(request, env);
    }

    const match = pathname.match(/^\/users\/(\d{6})$/);
    if (match && request.method === "GET") {
      return getUser(env, match[1]);
    }

    return json(env, { ok: false, message: "接口不存在" }, 404);
  },
};
