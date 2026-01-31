# Deploying to Vercel

To deploy this Next.js "Proper" Upgrade to Vercel:

1. **Push to GitHub**:
   - Initialize a new repo or push the `ascendancy-web` directory to your existing one.
   - Example:
     ```bash
     cd ascendancy-web
     git init
     git add .
     git commit -m "feat: initial ascendancy web ui"
     # Add your remote and push
     ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com).
   - Click **"Add New"** > **"Project"**.
   - Import your repository.
   - Vercel will automatically detect Next.js.
   - Set the **Root Directory** to `ascendancy-web` (if you pushed the whole workspace).

3. **Environment Variables**:
   - If you integrate the OpenClaw backend later, add your API keys/URLs in the Vercel dashboard.

## Features Included:
- **Framer Motion**: Smooth animations for the "CORE" node and entry transitions.
- **Glassmorphism**: Premium "Cupertino Air" aesthetic with blurred panels.
- **Lucide Icons**: Sharp, futuristic icon set.
- **Responsive**: Works on mobile and desktop.
