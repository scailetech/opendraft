# Repository Rename Guide: academic-thesis-ai → opendraft

**Date:** 2025-11-22
**Current Name:** `academic-thesis-ai`
**New Name:** `opendraft`
**GitHub URL (Current):** https://github.com/federicodeponte/academic-thesis-ai
**GitHub URL (After Rename):** https://github.com/federicodeponte/opendraft

---

## Why Rename?

The repository name `academic-thesis-ai` is outdated and doesn't match the **OpenDraft** brand name established across:
- ✅ All code (rebrand complete - commit `6bb859d`)
- ✅ Landing page (OpenDraft branding)
- ✅ Documentation (all docs use "OpenDraft")
- ✅ Python package name (`opendraft/`)
- ❌ **GitHub repository name** (still `academic-thesis-ai`)

**Inconsistency:** The brand is "OpenDraft" but the repo is called "academic-thesis-ai"

---

## Manual Rename Steps (GitHub Web Interface)

**⚠️ IMPORTANT: This must be done manually on GitHub**

### Step 1: Rename Repository on GitHub

1. Go to: **https://github.com/federicodeponte/academic-thesis-ai/settings**
2. Scroll to **"Repository name"** section
3. Change from: `academic-thesis-ai`
4. Change to: `opendraft`
5. Click **"Rename"** button
6. GitHub will show confirmation: "Redirects will be set up automatically"

**What GitHub Does Automatically:**
- ✅ Sets up redirect from old URL to new URL
- ✅ Updates all open PRs, issues, wikis
- ✅ Updates GitHub Pages URL (if enabled)
- ✅ Preserves stars, forks, watchers

**What Breaks Temporarily:**
- ❌ Local clones (need to update remote URL)
- ❌ CI/CD pipelines (GitHub Actions will update automatically)
- ❌ External links (but redirects will work)

---

## Post-Rename: Update Local Repository

After renaming on GitHub, update your local clone:

```bash
cd ~/academic-thesis-ai

# Update remote URL
git remote set-url origin https://github.com/federicodeponte/opendraft.git

# Verify new URL
git remote -v
# Should show: https://github.com/federicodeponte/opendraft.git

# Pull to verify connection
git pull origin master

# Optional: Rename local directory to match
cd ..
mv academic-thesis-ai opendraft
cd opendraft
```

---

## Post-Rename: Update External Services

### 1. Vercel Deployment

**Website Deployment (opendraft-landing):**

Go to: https://vercel.com/federico-de-pontes-projects/academic-thesis-landing/settings

1. **Git Settings** → **Connected Git Repository**
   - Click "Disconnect" on old repo
   - Click "Connect Git Repository"
   - Select: `federicodeponte/opendraft`
   - Root Directory: `website`
   - Branch: `master`

2. **Verify Deployment**
   - Push a small change
   - Check deployment logs
   - Verify https://opendraft-landing.vercel.app works

**Rename Vercel Project (Optional):**
1. Go to: https://vercel.com/federico-de-pontes-projects/academic-thesis-landing/settings
2. Under "General" → "Project Name"
3. Change from: `academic-thesis-landing`
4. Change to: `opendraft-landing`

### 2. Modal.com Backend

**Backend Worker:**
- Modal.com automatically uses git remotes
- No action needed (will follow git remote URL)
- Verify deployment works after rename

### 3. CI/CD (GitHub Actions)

**Status:** ✅ No action needed
- GitHub Actions automatically updates repository references
- Workflows will continue to work

### 4. Supabase (if configured)

**Check webhook URLs:**
1. Go to: https://app.supabase.com
2. Check any GitHub integration webhooks
3. Update if they reference old repo name (unlikely with redirects)

---

## Impact Assessment

### ✅ Safe (Auto-Handled by GitHub)

- Open issues remain open
- Pull requests remain linked
- Stars/forks/watchers preserved
- GitHub Pages (if enabled)
- Webhooks continue working
- Old URLs redirect automatically

### ⚠️ Requires Update

- **Local clones** - Update remote URL (see above)
- **Vercel deployment** - Reconnect to new repo name
- **Documentation links** - Update internal docs (already done)
- **npm package.json** - Update repository field

### ❌ External Links (Will Redirect)

- Blog posts linking to repo
- External documentation
- Social media links
- README badges

**Note:** GitHub redirects work indefinitely, so these aren't broken, just not "clean"

---

## Checklist

### Before Rename
- [x] Complete rebrand to "OpenDraft" in all code
- [x] Update all internal documentation
- [x] Commit and push all pending changes
- [x] Notify team/collaborators (if any)

### During Rename (Manual - GitHub Web)
- [ ] Go to repository settings
- [ ] Change name from `academic-thesis-ai` to `opendraft`
- [ ] Confirm rename
- [ ] Verify redirect works (visit old URL)

### After Rename
- [ ] Update local clone remote URL
- [ ] Reconnect Vercel deployment to new repo
- [ ] Update package.json repository field
- [ ] Update README badges (if using shields.io)
- [ ] Test CI/CD pipeline runs
- [ ] Test Vercel deployment
- [ ] Update any external documentation you control

---

## Files to Update After Rename

### 1. package.json (website/)

**Current:**
```json
{
  "name": "opendraft-landing",
  "repository": {
    "type": "git",
    "url": "https://github.com/federicodeponte/academic-thesis-ai.git",
    "directory": "website"
  }
}
```

**After Rename:**
```json
{
  "name": "opendraft-landing",
  "repository": {
    "type": "git",
    "url": "https://github.com/federicodeponte/opendraft.git",
    "directory": "website"
  }
}
```

### 2. README Badges (if using shields.io)

**Search for:**
```markdown
![Tests](https://img.shields.io/github/actions/workflow/status/federicodeponte/academic-thesis-ai/ci.yml)
![Stars](https://img.shields.io/github/stars/federicodeponte/academic-thesis-ai)
```

**Replace with:**
```markdown
![Tests](https://img.shields.io/github/actions/workflow/status/federicodeponte/opendraft/ci.yml)
![Stars](https://img.shields.io/github/stars/federicodeponte/opendraft)
```

### 3. Python setup.py / pyproject.toml (if exists)

**Update repository URL in:**
- `setup.py` → `url` field
- `pyproject.toml` → `[project.urls]`

---

## Verification Steps

After completing the rename, verify everything works:

### 1. Local Git
```bash
git remote -v
# Should show: https://github.com/federicodeponte/opendraft.git

git pull origin master
# Should pull without errors

git push origin master
# Should push without errors
```

### 2. GitHub Redirect
```bash
# Old URL should redirect
curl -I https://github.com/federicodeponte/academic-thesis-ai 2>&1 | grep -i location
# Should show: Location: https://github.com/federicodeponte/opendraft
```

### 3. Vercel Deployment
```bash
# Push a small change
echo "test" >> website/README.md
git add website/README.md
git commit -m "test: Verify Vercel deployment after repo rename"
git push origin master

# Check Vercel logs
vercel ls --token <your-token>
```

### 4. CI/CD
- Check GitHub Actions tab for any failed workflows
- Re-run any failed workflows

---

## Rollback Plan (If Needed)

If something goes wrong, you can rename back:

1. Go to: https://github.com/federicodeponte/opendraft/settings
2. Change name from `opendraft` back to `academic-thesis-ai`
3. Update local remote: `git remote set-url origin https://github.com/federicodeponte/academic-thesis-ai.git`
4. Reconnect Vercel

**Note:** Renaming is fully reversible. GitHub preserves all data.

---

## FAQ

### Q: Will old links break?
**A:** No, GitHub sets up automatic redirects indefinitely. Old URLs will redirect to new URLs.

### Q: Will I lose stars/forks?
**A:** No, all stars, forks, watchers are preserved.

### Q: Will PRs/issues break?
**A:** No, all PRs and issues remain linked and functional.

### Q: Do I need to update npm package name?
**A:** No, npm package name (`opendraft`) is independent of GitHub repo name.

### Q: Will CI/CD break?
**A:** GitHub Actions automatically updates. Other CI systems may need webhook updates.

### Q: Can I rename back if I regret it?
**A:** Yes, you can rename back at any time with no data loss.

---

## Timeline

**Estimated Time:** 10-15 minutes

1. Rename on GitHub: **2 minutes**
2. Update local clone: **1 minute**
3. Reconnect Vercel: **5 minutes**
4. Update package.json: **2 minutes**
5. Verification tests: **5 minutes**

---

## Support

If you encounter issues after renaming:

- **GitHub Redirect Not Working:** Wait 5-10 minutes for DNS propagation
- **Vercel Deployment Fails:** Check Vercel logs, ensure root directory is still `website`
- **Local Git Errors:** Double-check remote URL with `git remote -v`
- **External Service Webhooks:** Update webhook URLs in service settings

---

## Summary

✅ **Rename is safe** - GitHub handles most updates automatically
✅ **Redirects work** - Old URLs won't break
✅ **Data preserved** - Stars, forks, issues, PRs all maintained
⚠️ **Manual steps** - Update local clones and Vercel deployment

**Recommended:** Rename now to align GitHub repo name with OpenDraft brand.

---

**For questions:** https://github.com/federicodeponte/opendraft/discussions

🤖 Generated with [Claude Code](https://claude.com/claude-code)
