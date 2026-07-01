# Deployment Guide

## 1. Backend (Railway or Render)

1. Create a new Web Service from this repo
2. Set **Root Directory** to `backend`
3. **Start command:** `npm start`
4. Add environment variables from [backend/.env.example](../backend/.env.example)
5. Set `DERIV_REDIRECT_URI` to `https://YOUR_FRONTEND_DOMAIN/auth/callback`
6. Set `FRONTEND_URL` to `https://YOUR_FRONTEND_DOMAIN`
7. (Recommended) Create Supabase project, run [schema.sql](../backend/src/db/schema.sql), set `DATABASE_URL`

Register the production callback URL in [developers.deriv.com](https://developers.deriv.com) — must match exactly.

## 2. Frontend (Vercel)

1. Import repo, set **Root Directory** to `frontend`
2. **Build command:** `npm run build`
3. **Output:** `dist`
4. Option A — set `VITE_API_URL=https://your-backend.up.railway.app`
5. Option B — edit [vercel.json](../frontend/vercel.json) rewrites with your backend URL

Update CORS: backend `FRONTEND_URL` must match your Vercel domain.

## 3. Smoke test after deploy

```bash
API_URL=https://your-backend.up.railway.app node scripts/smoke-test.mjs
```

Then test manually:
1. Register → Deriv signup → redirect to `/trade`
2. Login → OAuth → `/trade`
3. Place demo Rise/Fall trade on Volatility 100

## 4. Client handoff

- Affiliate commissions: Deriv Partner Dashboard (not this app)
- Deposits: users use Deriv cashier (`/profile` links there)
- OAuth app credentials stay in your backend env — never in frontend
