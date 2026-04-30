# Setup & Deploy

Three paths, in the order I'd recommend tackling them. They build on each other — Path B and Path C both want a GitHub repo set up.

---

## Path A — Run on your Mac (5 minutes)

### One-time setup

1. Check Node is installed. Open **Terminal** (Cmd+Space, type "Terminal", Enter):
   ```
   node --version
   ```
   You want **v18 or higher**. If the command isn't found, install Node from https://nodejs.org (download the **LTS** version, run the installer).

2. The `node_modules` folder in the project was built inside a Linux sandbox during verification, so its native binaries won't work on macOS. Wipe it and reinstall:
   ```
   cd ~/Desktop/R\ Special/meeting-prep
   rm -rf node_modules
   npm install
   ```
   (The `\ ` in the path is how Terminal handles the space in "R Special".)

### Run it

From the same folder:
```
npm run dev
```

You'll see something like:
```
▲ Next.js 14.2.15
- Local:        http://localhost:3000
- Network:      http://192.168.x.x:3000
```

Open `http://localhost:3000` in Safari or Chrome on your Mac. Use Chrome's responsive-design mode (Cmd+Option+I → toggle device toolbar) to see the mobile experience, or…

### View it on your phone (recommended — it's mobile-first)

Your phone needs to be on the **same WiFi** as your Mac.

1. Find your Mac's IP. In Terminal:
   ```
   ipconfig getifaddr en0
   ```
   (If that returns nothing, try `ipconfig getifaddr en1` — your WiFi might be on a different interface.)

2. On your phone's browser, go to `http://<that-ip>:3000`. Example: `http://192.168.1.42:3000`.

To stop the dev server: Ctrl+C in the Terminal window.

### Optional — turn on the live LLM

By default the app runs in demo-fallback mode (templated briefings). To use the real Anthropic API:
```
cp .env.example .env.local
```
Open `.env.local` in any text editor and add your key:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Save, then restart `npm run dev`.

---

## Path B — Deploy to Vercel for a public URL (10 minutes)

Vercel is the standard host for Next.js — free tier, automatic builds, real URL you can share with stakeholders.

### Steps

1. **Create a GitHub repo.** Go to https://github.com/new. Name it something like `lq-meeting-prep`. Set it private. Don't initialize with a README (the project already has one).

2. **Push the code.** In Terminal:
   ```
   cd ~/Desktop/R\ Special/meeting-prep
   git init
   git add .
   git commit -m "Phase 1 MVP"
   git branch -M main
   git remote add origin https://github.com/<your-username>/lq-meeting-prep.git
   git push -u origin main
   ```

3. **Connect Vercel.** Go to https://vercel.com, sign in with your GitHub account, click **Add New Project**, pick the repo. Vercel auto-detects Next.js. Click **Deploy**.

4. After ~60 seconds you'll have a URL like `lq-meeting-prep-xyz.vercel.app`. Open it on any device.

5. **Enable live LLM** (optional). In Vercel: project → **Settings** → **Environment Variables** → add `ANTHROPIC_API_KEY` with your key. Then **Deployments** → click the latest deployment → **Redeploy** to pick up the new env var.

Every time you `git push` to `main`, Vercel rebuilds and updates the URL automatically.

---

## Path C — Hand off to the Replit dev department

Easiest once Path B's GitHub repo exists.

1. Send your dev department the GitHub repo URL.
2. In Replit: **Create Repl** → **Import from GitHub** → paste the repo URL.
3. Replit auto-detects Node/Next, runs `npm install`, and gives them a built-in preview URL.
4. They can edit collaboratively in the browser and push changes back to GitHub.

If you don't want to set up GitHub right now and just want to hand them a zip:
```
cd ~/Desktop/R\ Special
zip -r meeting-prep.zip meeting-prep -x "meeting-prep/node_modules/*" "meeting-prep/.next/*"
```
That makes `meeting-prep.zip` on your Desktop, ~few hundred KB, ready to attach to an email or upload.

---

## Path → Phase 2 (Mosaic / Azure)

When the time comes, the same GitHub repo from Path B is what Azure App Service / Azure Static Web Apps / Azure DevOps will pull from. Two changes from `README.md` apply:

1. Replace `lib/lq-engine/` internals with calls to Mosaic's KB.
2. Add `lib/llm/azure-openai.ts` and flip `LLM_PROVIDER=azure` in env vars.

The UI, API contract, and prompt builder do not change.

---

## Troubleshooting

**`npm install` errors about node-gyp / Python.** Some optional native deps need build tools. Usually safe to ignore — Next.js doesn't need them. If install fails completely, try `npm install --no-optional`.

**Port 3000 already in use.** Either close whatever's using it, or run `PORT=3001 npm run dev`.

**Phone can't reach the IP.** Some corporate WiFi networks isolate clients from each other. Try a personal hotspot, or use Path B (Vercel) instead.

**LLM call fails / 500 error.** Check the Terminal where `npm run dev` is running — it logs the error. Most common cause: API key invalid or out of credits. The app will automatically fall back to demo mode in that case.
