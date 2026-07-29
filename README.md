# Wagi Landing Page

אתר סטטי קטן ל־Wagi, בעברית, מוכן לפריסה דרך Cloudflare Pages.

## קבצים

- `index.html` — מבנה האתר והטמעת סוכן Opal
- `styles.css` — עיצוב RTL מודרני
- `script.js` — JS מינימלי + מיקום הסוכן הקולי במרכז המסך
- `PROJECT.md` — גבולות הפרויקט

## פריסה ב־Cloudflare Pages

1. מעלים את הפרויקט ל־GitHub.
2. ב־Cloudflare: Workers & Pages → Create application → Pages → Connect to Git.
3. בוחרים את הריפו.
4. הגדרות Build:
   - Framework preset: None
   - Build command: להשאיר ריק
   - Build output directory: `/`
5. אחרי הפריסה מחברים Custom domain: `wagi.co.il`.

## כניסה מוגנת

האתר מוגן דרך Cloudflare Pages Functions. מי שנכנס בלי session פעיל מקבל מסך התחברות בעברית.

משתני סביבה מומלצים ב־Cloudflare:

- `WAGI_AUTH_USER` — שם המשתמש
- `WAGI_AUTH_PASS` — הסיסמה
- `WAGI_AUTH_SECRET` — מחרוזת ארוכה ואקראית לחתימת session

אם המשתנים לא מוגדרים, יש פרטי כניסה זמניים בקוד לטובת בדיקות בלבד.

## סוכן Opal

הקוד הקולי מוטמע בסוף `index.html`, והצ׳אט הטקסטואלי הוסר כדי להשאיר רק את הסוכן הקולי:

```html
<script
  src="https://opal.hai.tech/embed/voice-avatar.js"
  data-opal-agent-id="wagi"
  data-opal-package-url="https://wagi.co.il/avatar-packages/wagi-vet-v1/"
  data-opal-language="he"
  data-opal-position="bottom-left"
  async></script>
```
