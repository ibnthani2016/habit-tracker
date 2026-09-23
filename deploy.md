# Deploy Plan: Habit Tracker

## Target
Any static host. Primary recommendation: **GitHub Pages** (free, HTTPS, CDN).
Alternatives: Netlify, Vercel, Cloudflare Pages, AWS S3 + CloudFront, Surge.sh.

## Prerequisites
- Git repository pushed to GitHub
- GitHub Pages enabled (Settings → Pages → Source: Deploy from branch)

## Deploy Steps

### 1. Prep
```bash
# Verify tests pass
cd habit-tracker
node --test js/streaks.test.js js/storage.test.js
# Expected: 34 pass, 0 fail

# Verify no uncommitted changes
git status
# Expected: working tree clean
```

### 2. Tag the release
```bash
git tag -a v1.0.0 -m "Habit Tracker v1.0.0 — MVP with streaks, localStorage, export/reset"
git push origin v1.0.0
```

### 3. Deploy to GitHub Pages

**Option A: GitHub Actions (recommended)**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: .
      - id: deployment
        uses: actions/deploy-pages@v4
```

Push the workflow file. GitHub Actions deploys automatically on every push to `main`.

**Option B: Manual (branch-based)**

```bash
# GitHub Pages serves from a branch (gh-pages or main)
git checkout --orphan gh-pages
git rm -rf .
git checkout main -- index.html css/ js/ spec.md
# Remove dev-only files from deploy
git rm -f js/*.test.js js/storage-contract.md review.md tasks/
git commit -m "Deploy v1.0.0 to GitHub Pages"
git push origin gh-pages --force
```

### 4. Verify deploy
```
1. Open https://<username>.github.io/habit-tracker/
2. Check: 3 default habits visible
3. Check: click a checkbox → streak updates → reload → still checked
4. Check: Export button downloads JSON
5. Check: Reset button clears and re-seeds defaults
6. Check: Add Habit section is NOT visible (feature flag off)
```

### 5. Enable feature flag (staged rollout)
After stable for 24 hours, enable for team/internal testing:
```js
// In browser console on the deployed site
localStorage.setItem('ht:flag:ENABLE_ADD_HABIT', 'true');
location.reload();
```

Verify the Add Habit form appears and works, then decide on full rollout.

---

## Rollback Plan

### Trigger Conditions
- Error rate spike (measured by manual testing / user reports)
- Data corruption reports
- Critical bug in streak calculation
- Security vulnerability discovered

### Rollback Steps

**Step 1: Identify the previous stable tag**
```bash
git tag -l | sort -V | tail -2
# Output: v0.9.0  v1.0.0
```

**Step 2: Revert to previous version**
```bash
# Option A: Roll back the deployed branch
git checkout gh-pages
git revert --no-commit HEAD
git commit -m "Rollback v1.0.0 → restore previous stable version"
git push origin gh-pages
```

**Option B: Deploy previous tag directly**
```bash
git checkout v0.9.0
git checkout -b gh-pages-rollback
git push origin gh-pages-rollback
# In GitHub repo Settings → Pages, switch source branch to gh-pages-rollback
```

**Step 3: Verify rollback**
- Open deployed URL
- Confirm previous behavior restored
- Confirm user data intact (localStorage survives — old code reads the same schema)

**Step 4: Communicate**
- Update README/status page if applicable
- Document the bug that caused rollback

### Rollback Time
- GitHub Actions deploy: ~1 minute (wait for CI)
- Branch switch: ~30 seconds

### Data Considerations
- **User data is SAFE**: localStorage is client-side; the deployed JS file only reads/writes it. Rolling back the deployed code does NOT delete user data.
- **Schema compatibility**: If v1.0.0 introduced a schema change (it didn't — schema is v1 from first commit), old code must handle it. Our `load()` resets to defaults on unrecognized versions, which is the safe fallback.

---

## Post-Deploy Checklist (First Hour)

- [ ] Site loads at deployed URL
- [ ] 3 default habits visible
- [ ] Check/uncheck a habit → streak updates correctly
- [ ] Reload page → checked state persists
- [ ] Export button downloads valid JSON
- [ ] Reset button works and re-seeds defaults
- [ ] Console shows zero errors
- [ ] Feature flag off: Add Habit form hidden
- [ ] Feature flag on: Add Habit form works (tested manually)
- [ ] Mobile layout readable (test via browser devtools)
- [ ] No 404s for CSS/JS assets
