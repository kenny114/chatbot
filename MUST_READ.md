# MUST READ - Project Key Information

---
## ⚠️ IMPORTANT: Git Repository Structure
---

This project has **ONE local folder** but pushes to **THREE separate GitHub repos**.

The `frontend/` and `backend/` folders do **NOT** have their own `.git` folders.
Instead, we use **git subtree** to push specific folders to their own repos.

---

## GitHub Repositories

| Repo | URL | Contains | Deployed To |
|------|-----|----------|-------------|
| **Main** | https://github.com/kenny114/chatbot.git | Everything (full monorepo) | - |
| **Backend** | https://github.com/kenny114/chatbotbackend.git | Only `backend/` folder | Railway |
| **Frontend** | https://github.com/kenny114/chatbotfrontend-.git | Only `frontend/` folder | Vercel |

### Git Remotes Configured Locally
```
origin        → https://github.com/kenny114/chatbot.git (Main)
backend-repo  → https://github.com/kenny114/chatbotbackend.git
frontend-repo → https://github.com/kenny114/chatbotfrontend-.git
```

---

## ⚠️ How to Push Changes (READ CAREFULLY)

### Step 1: Always commit to main repo first
```bash
git add <files>
git commit -m "Your message"
git push origin main
```

### Step 2: Push to separate repos using SUBTREE

**For backend changes:**
```bash
git subtree push --prefix=backend backend-repo main
```

**For frontend changes:**
```bash
git subtree push --prefix=frontend frontend-repo main
```

### ⚠️ If subtree push fails with "rejected" error:
This means the remote repo has commits not in your local history. Options:
1. **Force push** (overwrites remote - use carefully):
   ```bash
   git push backend-repo $(git subtree split --prefix=backend):main --force
   git push frontend-repo $(git subtree split --prefix=frontend):main --force
   ```
2. **Or just push to main repo only** - Railway/Vercel may be configured to pull from main repo instead

### ⚠️ DO NOT:
- Create separate `.git` folders inside `frontend/` or `backend/`
- Push directly to backend-repo or frontend-repo without using subtree
- Use `git subtree pull` without understanding the implications

---

## PayPal Configuration

### Current Plan: Pro ($19.99/month)

| Setting | Value | Location |
|---------|-------|----------|
| **Plan ID** | `P-18P894864X127040SNFQOK4Q` | `backend/src/services/paymentService.ts` |
| **Client ID** | `AWWWREiNPF972Cc4Oloht4TGcvU9f7OGWOaWPVtl4JRvvfT4EgXyTBiis1Pk2L3qWcU8FfL6f0lTeCD2` | `frontend/.env` (VITE_PAYPAL_CLIENT_ID) |
| **Mode** | Sandbox/Live | `backend/.env` (PAYPAL_MODE) |

### Pricing Tiers

| Plan | Price | PayPal Plan ID |
|------|-------|----------------|
| Free | $0 | None (no payment) |
| Pro | $19.99/month | `P-18P894864X127040SNFQOK4Q` |
| Custom | Contact Sales | None (manual) |

### To Update PayPal Plan ID
1. Edit `backend/src/services/paymentService.ts` line 69
2. Update the `paypal_plan_id` value in the Pro plan object

---

## Deployment URLs

| Service | URL |
|---------|-----|
| **Frontend (Vercel)** | https://chatbotfrontend.vercel.app (or your domain) |
| **Backend (Railway)** | https://chatbotbackend-production.up.railway.app |

---

## Environment Variables

### Backend (.env)
```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
APIFY_API_TOKEN=your_apify_token
OPENAI_API_KEY=your_openai_key
JWT_SECRET=your_jwt_secret
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-frontend-url.com
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_client_secret
PAYPAL_MODE=sandbox (or live)
```

### Frontend (.env)
```
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
VITE_API_URL=https://your-backend-url.com (for production)
```

---

## Key Files

| File | Purpose |
|------|---------|
| `backend/src/services/paymentService.ts` | PayPal plans, pricing, plan IDs |
| `backend/src/config/plans.ts` | Plan features and limits |
| `frontend/src/pages/Pricing.tsx` | Pricing page UI |
| `frontend/src/pages/Settings.tsx` | User settings, shows current plan |
| `frontend/src/widget/` | Embeddable chat widget |

---

## Quick Commands

```bash
# Install all dependencies
npm install && cd backend && npm install && cd ../frontend && npm install

# Run locally
cd backend && npm run dev    # Backend on port 3001
cd frontend && npm run dev   # Frontend on port 5173

# Build frontend
cd frontend && npm run build

# Build widget only
cd frontend && npm run build:widget
```
