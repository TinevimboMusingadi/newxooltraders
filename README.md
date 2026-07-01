# Newxool Traders — Deriv Affiliate MVP

Affiliate trading platform: OAuth login, live chart, Rise/Fall demo trading via Deriv API. Your app never holds user funds.

## Structure

```
frontend/   React + Vite (landing, trade dashboard, profile)
backend/    Node.js + Express (OAuth, sessions, OTP for trading WS)
```

## Prerequisites

1. **OAuth app** (type: OAuth) at [developers.deriv.com](https://developers.deriv.com)
2. **Affiliate params** from Deriv Partner dashboard: `utm_source`, `utm_campaign`, `sidc`
3. Whitelist redirect URI: `http://localhost:5173/auth/callback` (dev) + production URL

## Local setup

```bash
# Install dependencies
npm run install:all
npm install

# Configure backend
cp backend/.env.example backend/.env
```

### Deriv dashboard (required before Log In / trading)

1. Go to [developers.deriv.com](https://developers.deriv.com) → **Registered apps** → **Web-based apps**
2. **Redirect URL:** `http://localhost:5173/auth/callback`
3. **Scopes:** Trade + Account management
4. Copy **App ID**, **Client ID**, **Client Secret** into `backend/.env`
5. Create a **PAT** under the same app (API tokens tab) → `DERIV_PAT_TOKEN`

```bash
# Verify credentials (no server needed)
npm run test:deriv

# Run both servers
npm run dev

# Verify backend (server must be running)
npm run test:smoke
```

- Frontend: http://localhost:5173
- Backend: http://localhost:4000 (proxied via Vite for `/auth` and `/api`)
- **Dev Login (PAT):** use when OAuth is not configured or `auth.deriv.com` blocks your IP

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `client_id=` empty in OAuth URL | Set `DERIV_CLIENT_ID` in `backend/.env` — OAuth buttons stay hidden until configured |
| Access Denied on Log In | Deriv IP block — use **Dev Login (PAT)** or try mobile hotspot |
| `Cannot GET /auth/dev-login` | Kill port 4000, restart `npm run dev` |
| Real · No account | Set `DERIV_APP_ID`, restart backend, Dev Login again |

## Production deploy

| Service | Host | Notes |
|---------|------|-------|
| Frontend | Vercel | Set `VITE_API_URL` to backend URL, or use `vercel.json` rewrites |
| Backend | Railway or Render | Use `render.yaml` / `railway.json`; set all env vars |
| Sessions | Supabase Postgres | Run `backend/src/db/schema.sql`; set `DATABASE_URL` |

**Production env checklist:**

- `DERIV_REDIRECT_URI=https://yourdomain.com/auth/callback`
- `FRONTEND_URL=https://yourdomain.com`
- Register exact callback URL in Deriv dashboard
- `SESSION_SECRET` — long random string
- `DATABASE_URL` — Supabase connection string (recommended)

## OAuth flows

- **Register** → `/auth/register` → Deriv signup with affiliate UTM params
- **Login** → `/auth/login` → Deriv OAuth for existing users
- **Callback** → backend exchanges code → session cookie → redirect `/trade`

## Trading

- Chart: public WebSocket (`1HZ100V` Volatility 100)
- Trades: authenticated WS via OTP from `POST /api/trading/ws-otp`
- Contract types: CALL (Rise) / PUT (Fall), stake $1/$5/$10, 1m/5m

## Client commission

Affiliate earnings appear in the client's **Deriv Partner Dashboard**. This app does not process payouts.
