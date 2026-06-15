# iManage Data Loader

Full-stack **Next.js** port of `script.sh` for deployment on **Vercel**.

## Architecture

```
Browser (React UI)
    ↓  POST /api/auth/login, /api/operations/run
Next.js API Routes (Node.js on Vercel)
    ↓  x-auth-token + REST calls
iManage Work API (your tenant)
```

| Bash `script.sh` | Web app |
|------------------|---------|
| `read -p` prompts | React forms + CSV upload/paste |
| `AUTH_TOKEN` global | Encrypted **httpOnly session cookie** (iron-session) |
| `curl` + `jq` | `fetch` in `ImanageClient` + TypeScript |
| Local CSV file paths | CSV pasted or uploaded in browser |
| `template_workspace_map.csv` | In-memory map per request (no file needed) |
| Terminal menu | Dashboard cards (Main + Template tabs) |

## Local development

```bash
cd web
cp .env.example .env.local
# Edit SESSION_SECRET (32+ chars)

npm install
npm run dev
```

Open http://localhost:3000

## Deploy to Vercel

1. Push the `web/` folder to GitHub (or import repo in Vercel).
2. Set **Root Directory** to `web` in Vercel project settings.
3. Add environment variables:
   - `SESSION_SECRET` — random 32+ character string
   - `OAUTH_CLIENT_ID` — `web` (default)
   - `OAUTH_CLIENT_SECRET` — same as script.sh
4. Deploy.

> **Note:** Vercel serverless functions have a **60s timeout** (Pro). Very large CSV files may need batching in a future version.

## Operations included

All menu items from `script.sh`:

- Users, Groups (global/library), Roles (global/library)
- File types, File handler, Class, Subclass, Custom, Captions
- Templates: create, folders, search folders, tabs, prefix/suffix, delete, bulk, export

## Security

- Password is **never** stored in the session — only the OAuth access token.
- API calls to iManage run **server-side** (avoids CORS and keeps tokens off the client).
- Use HTTPS in production (Vercel provides this automatically).

## Project structure

```
web/src/
  app/           # Next.js pages + API routes
  components/    # (UI in page.tsx for now)
  lib/
    imanage/     # Auth + HTTP client
    csv/         # CSV parse/export
    operations/  # One module per script.sh operation family
```

## Migrating further

Your original `script.sh` remains in the parent folder. The web app logic lives in `src/lib/operations/`. When you change bash behavior, update the matching TypeScript file and redeploy.
