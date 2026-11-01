# Render deployment: static frontend and separate API

The following values use example Render names. Replace them with the exact URLs assigned to your services; Render may append a suffix.

## 1. Deploy the frontend first

1. Push this repository to GitHub. Do not upload environment files.
2. In Render choose **New > Static Site**, connect the repository and select your branch.
3. Leave **Root Directory** blank (the repository root).
4. Set **Build Command** to `npm ci && npm run build` and **Publish Directory** to `client/dist`.
5. Set `NODE_VERSION=24`. Do not add server secrets to the static site. `VITE_` variables are public and embedded in the build.
6. Deploy. Record the exact frontend URL, for example `https://mysystem-web.onrender.com`.
7. Under Redirects/Rewrites add source `/*`, destination `/index.html`, action **Rewrite**. This allows refreshing `/finance`, `/passwords` and `/settings`.

Until the backend URL is configured, the page may load but sign-in will not work. This is expected during setup.

## 2. Deploy the backend

1. Choose **New > Web Service**, connect the same repository and branch, select Node and the Free instance type.
2. Leave Root Directory blank. Build: `npm ci`. Start: `npm start`.
3. Configure the following environment variables:

   | Variable | Value |
   | --- | --- |
   | `NODE_VERSION` | `24` |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | Your Atlas TLS connection string |
   | `JWT_SECRET` | Your existing independent signing secret |
   | `ADMIN_PASSWORD_HASH` | Your newly generated owner-password hash |
   | `VAULT_ENCRYPTION_KEY` | Your existing vault key; keep it stable |
   | `APP_TIMEZONE` | `Asia/Karachi` |
   | `CLIENT_ORIGIN` | `https://mysystem.ahmedcodes.pro` |
   | `ADDITIONAL_CLIENT_ORIGINS` | The exact frontend Render URL from step 1 |
   | `COOKIE_SAME_SITE` | `none` during the initial cross-site Render URL setup |

4. Let Render supply `PORT`; the production server binds to `0.0.0.0`.
5. Allow the backend's outbound IP ranges, shown by Render, in Atlas Network Access. Give the runtime database user the needed permissions on `mysystem`, not broad cluster administrative access.
6. Set Health Check Path to `/health` and deploy. Record the backend URL, for example `https://mysystem-api.onrender.com`.
7. Visit `https://YOUR-BACKEND.onrender.com/health`. Expect `{"status":"ok"}`. `/api/health` also remains available. This checks the HTTP process; it is not a continuous database connectivity probe.
8. Return to the Static Site environment settings and set `VITE_API_URL=https://YOUR-BACKEND.onrender.com`, with no trailing `/api`.
9. Rebuild/redeploy the frontend. Vite variables are build-time values; changing them requires a new build.

The backend CORS allowlist accepts only CLIENT_ORIGIN and the comma-separated exact HTTPS origins in ADDITIONAL_CLIENT_ORIGINS. Do not use `*`, broad `onrender.com` matching or the backend URL as a frontend origin. A future frontend URL can be added to ADDITIONAL_CLIENT_ORIGINS and applied by redeploying the backend.

## 3. Add the frontend domain

1. In the Static Site open **Settings > Custom Domains > Add Custom Domain**.
2. Enter `mysystem.ahmedcodes.pro`.
3. At the DNS provider for `ahmedcodes.pro`, add a CNAME with name `mysystem` pointing to the Static Site's exact `YOUR-FRONTEND.onrender.com` hostname. Do not include `https://` or a path.
4. Remove conflicting A/AAAA/CNAME records for this subdomain only. Leave unrelated domain records alone.
5. Follow Render's verification instructions and wait for the managed TLS certificate to be issued.
6. Open `https://mysystem.ahmedcodes.pro` and verify deep-link refreshes and login.

## 4. Add a same-site API domain for reliable login

An onrender.com API called by ahmedcodes.pro uses cross-site cookies. SameSite=None and Secure are necessary, but browsers may still block third-party cookies. The same issue applies between two independent onrender.com service hostnames. CORS cannot override browser cookie restrictions.

1. In the backend Web Service's Custom Domains, add `api.ahmedcodes.pro`.
2. Add DNS CNAME name `api`, target the backend's exact Render hostname, then verify and wait for HTTPS.
3. Set the frontend `VITE_API_URL=https://api.ahmedcodes.pro` and rebuild it.
4. Set the backend `COOKIE_SAME_SITE=lax` and redeploy it. Keep CLIENT_ORIGIN as `https://mysystem.ahmedcodes.pro`.
5. Use the custom frontend URL for sign-in. The Render frontend URL can still serve the UI, but authenticated use from that URL to the custom API is cross-site; keep `none` if you need to test that combination, and account for browser blocking.

Final recommended topology: `mysystem.ahmedcodes.pro` (Static Site) calls `api.ahmedcodes.pro` (Web Service), with exact-origin credentialed CORS and Secure, host-only, SameSite=Lax cookies. No cookie Domain attribute is needed. Log in again after changing API hostnames.

## 5. Monitoring and free-plan limits

Configure your external HTTP monitor to GET `https://YOUR-BACKEND.onrender.com/health` every 10 minutes and expect status 200. No login, cookie or secret is needed. Ping the backend directly, not the frontend SPA path. No scheduled job is created by this repository.

Render currently spins free web services down after 15 minutes without inbound traffic. Regular successful requests may avoid idle spin-down, but do not guarantee uninterrupted uptime: deployments, restarts, failed monitors, usage limits and platform operations still apply. Free instance hours are shared across the workspace (750 per calendar month). Render describes Free services as intended for hobby/testing workloads rather than production applications.

## 6. Final checks

- Open the custom frontend, log in, add a disposable record, reload and log out. Check on desktop and mobile.
- Confirm refreshing `/finance` does not return a hosting 404.
- Confirm unauthenticated `/api/passwords` returns 401.
- Confirm responses allow only your configured frontend origins; never a wildcard with credentials.
- Keep secrets only in the backend environment and maintain independent encrypted backups and a separate vault-key backup.
- Do not run `npm run seed` if you want the database to remain empty.

## Official references

- https://render.com/docs/static-sites
- https://render.com/docs/redirects-rewrites
- https://render.com/docs/custom-domains
- https://render.com/docs/configure-other-dns
- https://render.com/docs/free
