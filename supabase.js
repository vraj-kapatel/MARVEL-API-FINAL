const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

const storageKey = getStorageKey();

export async function getSession() {
  const session = readStoredSession();

  if (!session) {
    return { session: null };
  }

  if (isExpired(session) && session.refresh_token) {
    try {
      return { session: await refreshSession(session.refresh_token) };
    } catch {
      clearSupabaseStorage();
      return { session: null };
    }
  }

  return { session };
}

export async function signInWithPassword(email, password) {
  const session = await authRequest("/auth/v1/token?grant_type=password", {
    email,
    password,
  });

  return { session: storeSession(normalizeSession(session)) };
}

export async function signUpWithPassword(email, password) {
  const response = await authRequest("/auth/v1/signup", {
    email,
    password,
  });

  const session = response.access_token ? normalizeSession(response) : null;
  if (session) {
    storeSession(session);
  }

  return { user: response.user ?? null, session };
}

export async function autocompleteCharacters(prefix) {
  const url = buildRestUrl("characters", {
    select: "name",
    order: "name.asc",
    limit: "10",
    name: `ilike.${sanitizeSearchTerm(prefix)}*`,
  });

  return restRequest(url);
}

export async function searchCharacters(name) {
  const url = buildRestUrl("characters", {
    select: "*",
    order: "name.asc",
    limit: "10",
    name: `ilike.*${sanitizeSearchTerm(name)}*`,
  });

  return restRequest(url);
}

export async function signOut() {
  const session = readStoredSession();

  if (session?.access_token && SUPABASE_URL && SUPABASE_ANON_KEY) {
    await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
    }).catch(() => {});
  }

  clearSupabaseStorage();
}

async function refreshSession(refreshToken) {
  const session = await authRequest("/auth/v1/token?grant_type=refresh_token", {
    refresh_token: refreshToken,
  });

  return storeSession(normalizeSession(session));
}

async function authRequest(path, body) {
  ensureConfigured();

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      payload.msg ||
        payload.message ||
        payload.error_description ||
        "Supabase auth request failed",
    );
  }

  return payload;
}

async function restRequest(url) {
  ensureConfigured();

  const { session } = await getSession();
  if (!session?.access_token) {
    throw new Error("Please log in before searching characters.");
  }

  const response = await fetch(url, {
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${session.access_token}`,
    },
  });

  const responseText = await response.text();
  const payload = responseText ? parseJson(responseText) : null;

  if (!response.ok) {
    throw new Error(getErrorMessage(payload, responseText, response.status));
  }

  return payload ?? [];
}

function buildRestUrl(tableName, params) {
  ensureConfigured();

  const url = new URL(`/rest/v1/${tableName}`, SUPABASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return url;
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Supabase returned a non-JSON response: ${text.slice(0, 120)}`);
  }
}

function getErrorMessage(payload, responseText, status) {
  if (payload && typeof payload === "object") {
    return (
      payload.message ||
      payload.msg ||
      payload.error_description ||
      payload.error ||
      `Supabase request failed with status ${status}`
    );
  }

  return responseText || `Supabase request failed with status ${status}`;
}

function readStoredSession() {
  const storedValue = localStorage.getItem(storageKey);
  if (!storedValue) return null;

  try {
    const parsed = JSON.parse(storedValue);
    return parsed.currentSession ?? parsed.session ?? parsed;
  } catch {
    return null;
  }
}

function storeSession(session) {
  const storedSession = {
    currentSession: session,
    expiresAt: session.expires_at ?? null,
  };

  localStorage.setItem(storageKey, JSON.stringify(storedSession));
  return session;
}

function normalizeSession(session) {
  if (!session.expires_at && session.expires_in) {
    session.expires_at = Math.floor(Date.now() / 1000) + session.expires_in;
  }

  return session;
}

function isExpired(session) {
  if (!session.expires_at) return false;
  return session.expires_at <= Math.floor(Date.now() / 1000) + 30;
}

function clearSupabaseStorage() {
  localStorage.removeItem(storageKey);

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sb-") && key.endsWith("-auth-token")) {
      localStorage.removeItem(key);
    }
  }
}

function ensureConfigured() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY.");
  }
}

function sanitizeSearchTerm(value) {
  return String(value).trim().replace(/[*,()]/g, "");
}

function getStorageKey() {
  if (!SUPABASE_URL) return "sb-auth-token";

  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split(".")[0];
    return `sb-${projectRef}-auth-token`;
  } catch {
    return "sb-auth-token";
  }
}
