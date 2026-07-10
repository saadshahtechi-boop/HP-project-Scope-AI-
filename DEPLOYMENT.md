# Deploying Techciko Health Suite to Vercel + GitHub

Everything deploys from **one GitHub repo** to **Vercel**, with a free serverless
Postgres from **Neon**. No separate backend host needed.

## Architecture on Vercel

- `apps/web` — Next.js frontend → Vercel project #1
- `apps/api` — NestJS API running as **Vercel Serverless Functions** → Vercel project #2
- **Neon** — serverless PostgreSQL (free tier), connected to the API

Both projects live in the same repo and redeploy automatically on every
`git push`. You set them up once.

> Why two Vercel projects and not one? A Next.js app and a NestJS API have
> different build outputs. Vercel's standard monorepo pattern is one project per
> app, both from the same repo. It's still one repo, one push, auto-deploy.

---

## 1. Database — Neon (2 minutes)

1. Go to https://neon.tech → create a free project.
2. Copy the **connection string** (starts with `postgresql://...`, includes
   `?sslmode=require`).
3. Keep it handy — it becomes `DATABASE_URL` for the API.

Neon is serverless Postgres, so it fits Vercel's serverless model (no idle server).

---

## 2. Push to GitHub

```bash
git init
git add .
git commit -m "Techciko Health Suite"
git branch -M main
git remote add origin https://github.com/<you>/techciko-health-suite.git
git push -u origin main
```

`.gitignore` already excludes secrets and `node_modules`.

---

## 3. Deploy the API (Vercel project #1)

1. Vercel → **Add New → Project** → import the repo.
2. **Root Directory → `apps/api`** (important).
3. Framework preset: **Other**. Vercel reads `apps/api/vercel.json` and builds
   the serverless function.
4. Add Environment Variables:
   | Var | Value |
   |---|---|
   | `DATABASE_URL` | your Neon connection string |
   | `JWT_ACCESS_SECRET` | any long random string (32+ chars) |
   | `JWT_REFRESH_SECRET` | a different long random string |
   | `JWT_ACCESS_TTL` | `15m` |
   | `JWT_REFRESH_TTL` | `7d` |
   | `ANTHROPIC_API_KEY` | optional — enables the LLM AI assistant |
5. Deploy. You get a URL like `https://techciko-api.vercel.app`.
6. **Run migrations once** (from your machine, pointed at Neon):
   ```bash
   cd apps/api
   npm install
   DATABASE_URL="<your-neon-url>" npx prisma migrate deploy
   DATABASE_URL="<your-neon-url>" npx prisma db seed   # optional demo data
   ```

Verify: open `https://techciko-api.vercel.app/api/health` → `{"status":"ok"}`.

---

## 4. Deploy the Web app (Vercel project #2)

1. Vercel → **Add New → Project** → import the **same repo** again.
2. **Root Directory → `apps/web`**.
3. Framework auto-detects **Next.js**.
4. Add Environment Variable:
   | Var | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://techciko-api.vercel.app/api` |
5. Deploy → `https://techciko.vercel.app`.

---

## 5. Lock CORS (optional but recommended)

On the **API** project, add `WEB_ORIGIN=https://techciko.vercel.app` and redeploy.
The API will then only accept requests from your web app.

---

## First login

The seed uses a placeholder password hash. Either register a fresh user via
`POST /api/auth/register` then sign in, or replace `DEMO_HASH` in
`prisma/seed/seed.ts` with a real `bcrypt.hashSync('yourpassword', 12)` before
seeding.

---

## Local development (Docker, unchanged)

```bash
cp .env.example .env      # set JWT secrets
docker compose up --build
docker compose exec api npx prisma migrate deploy
docker compose exec api npx prisma db seed
```

Web → http://localhost:3000 · API → http://localhost:4000/api

The API's `src/app.factory.ts` is shared by both the local server (`main.ts`)
and the Vercel serverless handler (`api/index.ts`), so behaviour is identical
in both environments.
