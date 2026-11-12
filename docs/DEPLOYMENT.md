# Deployment

Rune Duel is a static site: `npm run build` produces `dist/` (HTML, JS, CSS, fonts, favicon).
No server, backend, or environment variables are needed. Saves and settings live in the
player's browser (localStorage).

## Build

```bash
npm ci
npm test
npm run build      # outputs dist/
npm run preview    # optional local check at http://localhost:4173
```

`vite.config.ts` sets `base: './'`, so asset URLs are relative and `dist/` works from any
path: a domain root, a subfolder, or GitHub Pages' `/<repo>/`. This is safe because the app
has no client-side router (screens are React state, so there are no deep links to rewrite).

Verified locally by serving `dist/` copied to a `rune-dual/` subfolder
(`python -m http.server`, open `/rune-dual/`): all assets and fonts loaded, no console errors.

## Continuous integration and automatic deploys

- `.github/workflows/ci.yml`: every push to a non-`main` branch and every pull request runs
  `npm ci` → `npm run typecheck` → `npm test` → `npm run build` → `npm run e2e`.
- `.github/workflows/deploy-pages.yml`: every push to `main` runs the same checks and, only if
  they all pass, deploys `dist/` to GitHub Pages. It can also be started manually
  (Actions → Deploy to GitHub Pages → Run workflow).
- Browser tests use the Google Chrome preinstalled on `ubuntu-latest` (Playwright
  `channel: 'chrome'`), so no browser download is needed. On failure, traces are uploaded as
  the `playwright-traces` artifact.

Live site: https://quangle2706.github.io/rune-dual/

To stop publishing: disable Pages (Settings → Pages) or disable the workflow (Actions tab).

## Browser smoke tests locally

```bash
npm run build
npm run e2e      # serves dist/ at http://127.0.0.1:4317/rune-dual/ and runs desktop + mobile
```

## Offline / installable app

`public/sw.js` caches the app after the first online visit; the manifest makes it
installable ("Add to Home Screen" / "Install app"). When changing the service worker's
strategy, bump `CACHE` in `sw.js` so old caches are removed. Normal code changes need no
bump: pages are fetched network-first and assets are content-hashed.

## Other static hosts

Upload the contents of `dist/` to any static host (Netlify, Cloudflare Pages, S3, nginx).
No redirects or rewrites are required.

## Release checklist

- [ ] `npm test`, `npm run typecheck`, `npm run build`, `npm run e2e` pass (CI green)
- [ ] `npm run simulate:matchups` reviewed after any card, deck, rule, or bot change
- [ ] Manual play-through on desktop and a phone-width window
- [ ] Bump `version` in `package.json`
- [ ] If the save format changes: bump `SAVE_SCHEMA` (old saves are then discarded safely)
