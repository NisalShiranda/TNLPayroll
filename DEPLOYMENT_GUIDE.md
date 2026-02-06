# 🚀 Step-by-Step Guide to Deploy Backend to Render

This guide will walk you through deploying your Node.js/Express backend to **Render.com**.

## Prerequisite: Push Code to GitHub

Before deploying, your code needs to be on GitHub.

1.  **Open a Terminal** in your project root folder (`TNLPayroll`).
2.  Run the following commands to push your changes:
    ```bash
    git add .
    git commit -m "Prepare for deployment"
    git push
    ```

## Step 1: Create a Render Service

1.  Go to [dashboard.render.com](https://dashboard.render.com/) and log in.
2.  Click the **"New +"** button and select **"Web Service"**.
3.  Connect your **GitHub account** if you haven't already.
4.  Find your repository (`TNLPayroll`) in the list and click **"Connect"**.

## Step 2: Configure the Service

Fill in the details as follows:

-   **Name:** `tnl-payroll-api` (or any name you like)
-   **Region:** Select the one closest to you (e.g., Singapore or Frankfurt).
-   **Branch:** `main` (or `master`)
-   **Root Directory:** `server` (Important! This tells Render your backend is inside the `server` folder)
-   **Runtime:** `Node`
-   **Build Command:** `npm install`
-   **Start Command:** `node index.js`
-   **Plan:** Select **"Free"**

## Step 3: Set Environment Variables

Scroll down to the **"Environment Variables"** section and click **"Add Environment Variable"**.

You need to add your MongoDB connection string (same as in your `.env` file):

| Key | Value |
| :--- | :--- |
| `MONGO_URI` | `mongodb+srv://...` (Your actual MongoDB Atlas connection string) |
| `sceret_key` | (If you have a JWT secret or similar, add it here too) |

> **Note:** If you are using a local MongoDB (`mongodb://localhost...`), it **will NOT work** on Render. You MUST use a cloud database like **MongoDB Atlas**. If you need help generating an Atlas connection string, let me know!

## Step 4: Deploy

1.  Click **"Create Web Service"**.
2.  Render will start building your app. You can watch the logs in the dashboard.
3.  Once it says **"Live"**, your backend is online! 🎉

## Step 5: Update Frontend (Important!)

Once deployed, Render will give you a URL (e.g., `https://tnl-payroll-api.onrender.com`).

1.  Go back to your frontend code (`client/src/App.jsx`).
2.  Find the line:
    ```javascript
    const API_URL = 'http://localhost:5000/api';
    ```
3.  Change it to your new Render URL:
    ```javascript
    const API_URL = 'https://tnl-payroll-api.onrender.com/api';
    ```
4.  Save and commit/push your frontend changes if you are deploying the frontend too.

---
**Need help with MongoDB Atlas?** Just ask!
