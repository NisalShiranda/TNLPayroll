# 🚀 Full Deployment Guide (Backend & Frontend)

## Part 1: Deploy Backend to Render (Already Done? ✅)

If you haven't done this yet, follow these steps:

1.  **Push to GitHub:**
    ```bash
    git add .
    git commit -m "Prepare for deployment"
    git push
    ```
2.  **Create Service on Render:**
    -   New **Web Service**.
    -   Connect `TNLPayroll` repo.
    -   **Root Directory:** `server`
    -   **Build Command:** `npm install`
    -   **Start Command:** `node index.js`
    -   **Env Vars:** Add `MONGO_URI`.

---

## Part 2: Deploy Frontend to Vercel (New! ✨)

Now let's get your React site online.

### Step 1: Login to Vercel
1.  Go to [vercel.com](https://vercel.com/) and log in (use GitHub login).

### Step 2: Add New Project
1.  Click **"Add New..."** -> **"Project"**.
2.  Find your `TNLPayroll` repository and click **"Import"**.

### Step 3: Configure Project (Crucial Step!)

You will see a "Configure Project" screen. You **MUST** change the Root Directory because your React app is inside the `client` folder.

1.  Look for **"Root Directory"**.
2.  Click **"Edit"**.
3.  Select the **`client`** folder and click **"Continue"**.

### Step 4: Verify Settings
Once you select `client`, Vercel should auto-detect the rest:
-   **Framework Preset:** `Vite`
-   **Build Command:** `npm run build` (or `vite build`)
-   **Output Directory:** `dist`

If these look correct, click **"Deploy"**.

### Step 5: Done! 🎉
-   Vercel will build your site (takes ~1 minute).
-   Once finished, you will get a domain like `tnl-payroll.vercel.app`.
-   **Click it** and test your app!

---

## Troubleshooting
-   **App fits API Error?**
    -   Check if your Backend (Render) is awake (it might take 30s to wake up).
    -   Check Console (F12) for any red errors.
-   **"404 Not Found" on specific pages?**
    -   Since this is a Single Page App (SPA), Vercel usually handles this, but if you get 404s on refresh, you might need a `vercel.json` file. (Usually Vite preset handles this automatically).
