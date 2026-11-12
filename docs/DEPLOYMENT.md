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

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` / `milestone-*` and on pull requests:
`npm ci` → `npm run typecheck` → `npm test` → `npm run build` (Node 24).

## GitHub Pages (optional, manual)

`.github/workflows/deploy-pages.yml` builds, tests, and deploys `dist/` to GitHub Pages.
It is **manual only** (`workflow_dispatch`), so nothing is published by accident.

One-time setup (repository owner):
1. GitHub → repository **Settings → Pages → Build and deployment → Source: GitHub Actions**.
2. **Actions → Deploy to GitHub Pages → Run workflow** (branch `main`).
3. The site appears at `https://<user>.github.io/<repo>/`.

The deployed site is public. To unpublish, disable Pages in the same settings screen.

## Other static hosts

Upload the contents of `dist/` to any static host (Netlify, Cloudflare Pages, S3, nginx).
No redirects or rewrites are required.

## Release checklist

- [ ] `npm test`, `npm run typecheck`, `npm run build` pass (CI green)
- [ ] `npm run simulate:matchups` reviewed after any card, deck, rule, or bot change
- [ ] Manual play-through on desktop and a phone-width window
- [ ] Bump `version` in `package.json`
- [ ] If the save format changes: bump `SAVE_SCHEMA` (old saves are then discarded safely)
