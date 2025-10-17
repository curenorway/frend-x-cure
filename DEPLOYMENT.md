# Deployment Guide

## Quick Deploy to Railway (Recommended)

Railway is the easiest option for this app - supports WebSockets, Node.js, and file storage.

### Step 1: Push to GitHub

```bash
# Repository is already created and pushed!
# Your repo: https://github.com/curenorway/frend-x-cure

# If you need to push updates later:
git add .
git commit -m "Your commit message"
git push
```

### Step 2: Deploy to Railway

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project"
4. Select "Deploy from GitHub repo"
5. Choose your `frend-x-cure` repository
6. Railway auto-detects Node.js and deploys!

### Step 3: Add Environment Variables

In Railway dashboard:
1. Click your project
2. Go to "Variables" tab
3. Add these:
   - `AUTH_USERNAME` = admin (or your preferred username)
   - `AUTH_PASSWORD` = YourSecurePassword123! (use a strong password)
   - `STORYBLOK_TOKEN` = your token
   - `STORYBLOK_SPACE_ID` = 139140
   - `NODE_ENV` = production

**Security Note:** The AUTH_USERNAME and AUTH_PASSWORD protect your dashboard with HTTP Basic Authentication. Anyone accessing the dashboard will need to enter these credentials.

### Step 4: Access Your App

Railway will give you a URL like: `https://frend-x-cure-production.up.railway.app`

**Done!** Your dashboard is now live.

---

## Alternative: Render

### Quick Deploy:

1. Go to https://render.com
2. Sign up with GitHub
3. "New" → "Web Service"
4. Connect your GitHub repo
5. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
6. Add environment variables (same as above)
7. Deploy!

---

## Alternative: Fly.io

### Quick Deploy:

```bash
# Install Fly CLI
brew install flyctl  # macOS
# or: curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login

# Launch app
flyctl launch
# Follow prompts, select region

# Set secrets
flyctl secrets set STORYBLOK_TOKEN=your_token
flyctl secrets set STORYBLOK_SPACE_ID=139140

# Deploy
flyctl deploy
```

---

## Environment Variables Required

For ANY deployment, you need:

```env
# Authentication (Required for production)
AUTH_USERNAME=admin
AUTH_PASSWORD=your_secure_password_here

# Storyblok
STORYBLOK_TOKEN=your_personal_access_token
STORYBLOK_SPACE_ID=139140

# Optional:
NODE_ENV=production
PORT=auto_detected  # Railway/Render set this automatically
```

---

## Post-Deployment Setup

### 1. Run Discovery

Once deployed, visit your app and click **"Refresh Data"** or run discovery via API:

```bash
curl -X POST https://your-app.railway.app/api/run-discovery
```

### 2. Upload Reports

Since reports/ directory is gitignored, you'll need to:

**Option A: Run discovery in production** (slow)
- Click "Refresh Data" button in UI
- Wait ~30 seconds

**Option B: Upload local reports** (fast)
- You already have `reports/` locally
- Use Railway's file upload or manual API call

**Option C: Mount persistent storage** (best for production)
- Railway: Add Volume for `/reports` and `/output`
- Render: Use Persistent Disks

---

## Important Notes

### File Persistence

⚠️ **Railway/Render use ephemeral filesystems** - files don't persist between deploys.

**Solutions:**

1. **Add Persistent Volume** (Railway/Render):
   - Railway: Project Settings → Add Volume → Mount at `/app/reports`
   - Keeps your discovery data and transformed outputs

2. **Use Cloud Storage** (Better for production):
   - Store reports in S3/R2/Cloudflare
   - Store transformed data in database
   - Update code to use cloud storage

3. **Re-run Discovery** (Simple for now):
   - Just click "Refresh Data" after each deploy
   - Takes 30 seconds

### WebSockets

✅ All recommended platforms support WebSockets:
- Railway: Native support
- Render: Native support
- Fly.io: Native support

### Cost

**Free Tiers:**
- **Railway**: $5 free credit/month (enough for this app)
- **Render**: Free tier available (sleeps after inactivity)
- **Fly.io**: Free tier for 3 small VMs

**Recommendation:** Railway free tier is perfect for this project.

---

## Troubleshooting

### "Module not found" errors

Make sure `package.json` has all dependencies:
```json
{
  "dependencies": {
    "axios": "^1.6.0",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "ws": "^8.14.0",
    "open": "^9.1.0"
  }
}
```

### Port errors

Server uses `process.env.PORT || 3000` - platforms set PORT automatically.

### Reports not found

Run discovery: POST to `/api/run-discovery` or click "Refresh Data" in UI.

### WebSocket disconnects

Check platform supports WebSockets and health checks aren't interfering.

---

## Production Checklist

Before going live:

- [ ] Push to GitHub
- [ ] Deploy to Railway/Render
- [ ] Add environment variables
- [ ] Run discovery (or upload reports)
- [ ] Test dashboard access
- [ ] Test transformation
- [ ] Set up persistent storage (optional)
- [ ] Add custom domain (optional)
- [ ] Set up monitoring (optional)

---

## Custom Domain (Optional)

### Railway:
1. Project Settings → Custom Domain
2. Add your domain
3. Update DNS: CNAME to Railway URL

### Render:
1. Settings → Custom Domain
2. Add domain
3. Update DNS records

---

## Monitoring (Optional)

### Railway Built-in:
- Metrics tab shows CPU, memory, bandwidth
- Logs tab shows all console output

### External:
- Add Sentry for error tracking
- Add LogRocket for session replay
- Add analytics

---

## Next Steps After Deployment

1. **Share URL with team** - They can now use the dashboard
2. **Build more transformers** - Articles, Videos, Projects
3. **Add Webflow integration** - Upload transformed data
4. **Set up CI/CD** - Auto-deploy on git push (Railway does this automatically)

---

**Your migration dashboard is now accessible from anywhere!** 🚀
