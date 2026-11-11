# Me

Mobile-first onboarding and home screens from the Figma file, as a static site for GitHub Pages.

## Local preview

```bash
npm start
```

Open [http://localhost:4173](http://localhost:4173).

## Tests

```bash
npm test
```

## GitHub Pages

1. Create a GitHub repository (for example `me`) and push this folder.
2. In the repo: **Settings → Pages**.
3. Source: **Deploy from a branch**.
4. Branch: `main`, folder: `/ (root)`.
5. Site URL: `https://<username>.github.io/me/`

Hash routes (`#/welcome`, `#/home`, …) keep navigation working on project Pages without a custom 404 rewrite.

### Link previews (`og:image`)

Share cover: [`assets/og-cover.jpg`](assets/og-cover.jpg). Meta tags use a path relative to the page URL so previews work once the site is live.

If a crawler ignores relative image URLs, set absolute URLs in `index.html` for `og:image` / `twitter:image`:

`https://<username>.github.io/me/assets/og-cover.jpg`

Then re-scrape in [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) or Slack (paste the URL again) to refresh the cache.
