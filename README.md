# ermis.dev

Personal landing page replacing [linktr.ee/yet.another.expat](https://linktr.ee/yet.another.expat). Static HTML/CSS, no build step, hosted on GitHub Pages with a custom domain.

## Edit
Open `index.html` and `styles.css` in any editor. Refresh your browser. That's the whole loop.

To preview locally without any tooling, double-click `index.html` — modern browsers will load it from disk. Spotify embeds work fine that way.

## Deploy

### 1. Push to GitHub
Create a new public repo (e.g. `ermis-dev`) on github.com under your account, then from this folder:

```bash
git init
git add .
git commit -m "Initial site"
git branch -M main
git remote add origin https://github.com/Ennui92/ermis-dev.git
git push -u origin main
```

### 2. Turn on GitHub Pages
In the repo on github.com → **Settings** → **Pages**:
- Source: **Deploy from a branch**
- Branch: **main**, folder: **/ (root)**
- Save. First deploy takes ~1 minute.

### 3. Point ermis.dev at GitHub Pages
The `CNAME` file in this repo already declares `ermis.dev`.

In your domain registrar's DNS panel for `ermis.dev`, replace the existing records with:

**Apex (`ermis.dev`) — four A records:**
```
185.199.108.153
185.199.109.153
185.199.110.153
185.199.111.153
```

**`www` subdomain — one CNAME:**
```
www → ennui92.github.io
```

DNS usually propagates in a few minutes (sometimes longer). Once it's live:
- GitHub repo → **Settings → Pages** → confirm `ermis.dev` shows as the custom domain
- Tick **Enforce HTTPS** once the cert provisions (a few more minutes)

### 4. Updating
Edit, commit, push. GitHub Pages redeploys automatically.

```bash
git add .
git commit -m "Update something"
git push
```

## Structure
- `index.html` — all content lives here
- `styles.css` — all styling
- `favicon.svg` — minimal "E" mark
- `CNAME` — tells GitHub Pages the custom domain
- `.nojekyll` — disables GitHub's Jekyll processing (we don't need it)

## Why no framework?
Speed, longevity, and zero maintenance. No `npm install`, no toolchain to upgrade. In ten years this will still load and you'll still know how to edit it.
