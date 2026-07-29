const SESSION_COOKIE = 'wagi_session';
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const encoder = new TextEncoder();

const getCredentials = (env) => ({
  username: env.WAGI_AUTH_USER || 'wagi',
  password: env.WAGI_AUTH_PASS || 'wagi2026!',
  secret: env.WAGI_AUTH_SECRET || 'wagi-local-auth-secret-change-me',
});

const toBase64Url = (bytes) => {
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const fromBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
  return atob(padded);
};

const getSigningKey = async (secret) =>
  crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );

const signValue = async (value, secret) => {
  const key = await getSigningKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value));
  return toBase64Url(new Uint8Array(signature));
};

const createSessionToken = async (username, secret) => {
  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000;
  const payload = toBase64Url(encoder.encode(JSON.stringify({ username, expiresAt })));
  const signature = await signValue(payload, secret);
  return `${payload}.${signature}`;
};

const getCookie = (request, name) => {
  const cookie = request.headers.get('Cookie') || '';
  return cookie
    .split(';')
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`))
    ?.slice(name.length + 1);
};

const hasValidSession = async (request, secret) => {
  const token = getCookie(request, SESSION_COOKIE);
  if (!token) return false;

  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;

  const expectedSignature = await signValue(payload, secret);
  if (signature !== expectedSignature) return false;

  try {
    const session = JSON.parse(fromBase64Url(payload));
    return session.expiresAt > Date.now();
  } catch {
    return false;
  }
};

const page = (errorMessage = '') => `<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>כניסה ל-Wagi</title>
    <style>
      :root {
        color-scheme: light;
        font-family: Heebo, Arial, sans-serif;
        background: #f5f7fb;
        color: #111827;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        padding: 24px;
        background:
          radial-gradient(circle at 18% 18%, rgba(34, 211, 238, 0.18), transparent 28%),
          linear-gradient(145deg, #f8fbff 0%, #eef4f9 100%);
      }

      main {
        width: min(100%, 380px);
      }

      form {
        display: grid;
        gap: 16px;
        padding: 28px;
        border: 1px solid rgba(15, 23, 42, 0.12);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 24px 70px rgba(15, 23, 42, 0.16);
      }

      h1 {
        margin: 0;
        font-size: 30px;
        line-height: 1.15;
      }

      p {
        margin: 0;
        color: #4b5563;
        line-height: 1.5;
      }

      label {
        display: grid;
        gap: 7px;
        font-weight: 700;
        font-size: 14px;
      }

      input {
        width: 100%;
        box-sizing: border-box;
        border: 1px solid #cbd5e1;
        border-radius: 6px;
        padding: 12px 13px;
        font: inherit;
        background: #fff;
      }

      input:focus {
        outline: 3px solid rgba(34, 211, 238, 0.26);
        border-color: #0891b2;
      }

      button {
        min-height: 46px;
        border: 0;
        border-radius: 6px;
        background: #0f172a;
        color: #fff;
        font: inherit;
        font-weight: 800;
        cursor: pointer;
      }

      .error {
        padding: 10px 12px;
        border-radius: 6px;
        background: #fee2e2;
        color: #991b1b;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <form method="post" action="/login">
        <h1>כניסה ל-Wagi</h1>
        <p>העמוד פתוח רק למשתמשים שקיבלו גישה.</p>
        ${errorMessage ? `<div class="error">${errorMessage}</div>` : ''}
        <label>
          שם משתמש
          <input name="username" autocomplete="username" required autofocus />
        </label>
        <label>
          סיסמה
          <input name="password" type="password" autocomplete="current-password" required />
        </label>
        <button type="submit">כניסה</button>
      </form>
    </main>
  </body>
</html>`;

const loginResponse = (errorMessage = '', status = 200) =>
  new Response(page(errorMessage), {
    status,
    headers: {
      'Content-Type': 'text/html; charset=UTF-8',
      'Cache-Control': 'no-store',
    },
  });

export const onRequest = async ({ request, env, next }) => {
  const url = new URL(request.url);
  const credentials = getCredentials(env);

  if (url.pathname === '/login' && request.method === 'GET') {
    return loginResponse();
  }

  if (url.pathname === '/login' && request.method === 'POST') {
    const formData = await request.formData();
    const username = String(formData.get('username') || '');
    const password = String(formData.get('password') || '');

    if (username !== credentials.username || password !== credentials.password) {
      return loginResponse('שם המשתמש או הסיסמה אינם נכונים.', 401);
    }

    const sessionToken = await createSessionToken(username, credentials.secret);
    return new Response(null, {
      status: 303,
      headers: {
        Location: '/',
        'Set-Cookie': `${SESSION_COOKIE}=${sessionToken}; Path=/; Max-Age=${SESSION_MAX_AGE_SECONDS}; HttpOnly; Secure; SameSite=Lax`,
        'Cache-Control': 'no-store',
      },
    });
  }

  if (await hasValidSession(request, credentials.secret)) {
    return next();
  }

  return loginResponse();
};
