# Wagi Landing Page

אתר סטטי קטן ל־Wagi, בעברית, מוכן לפריסה דרך Cloudflare Pages.

## קבצים

- `index.html` — מבנה האתר והטמעת סוכן Opal
- `styles.css` — עיצוב RTL מודרני
- `script.js` — JS מינימלי
- `PROJECT.md` — גבולות הפרויקט

## פריסה ב־Cloudflare Pages

1. מעלים את הפרויקט ל־GitHub.
2. ב־Cloudflare: Workers & Pages → Create application → Pages → Connect to Git.
3. בוחרים את הריפו.
4. הגדרות Build:
   - Framework preset: None
   - Build command: להשאיר ריק
   - Build output directory: `/`
5. אחרי הפריסה מחברים Custom domain: `wagi.hai.tech`.

## סוכן Opal

הקוד מוטמע בסוף `index.html`:

```html
<script src="https://opal.hai.tech/embed/widget.js" data-opal-agent="wagi" data-opal-key="pub_Ph_eKCt6CPPLpk7NNhxva3vH" data-opal-language="he" async></script>
```
