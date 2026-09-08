# Nexura Portal — dev server run doc

The Vite app lives in the `Nexura-Portal/` subfolder of this workspace (the
workspace root itself only holds `.freebuff/` and `Nexura-Portal/`). Run all
commands from `Nexura-Portal/`.

## How to reproduce the uncommitted artifacts

A fresh checkout needs the environment file and dependencies:

1. Copy the env file from the main checkout (never commit it — it holds live
   Supabase keys and DB URLs):
   - `cp "<main checkout>/Nexura-Portal/.env" Nexura-Portal/.env`
   - When this checkout *is* the main checkout (as in the current setup), the
     file is already present at `Nexura-Portal/.env` and no copy is needed.
2. Install dependencies with npm:
   - `cd Nexura-Portal && npm install`

No other uncommitted artifacts are required; the app degrades to a local
no-op/mock mode if `.env` is missing.

## How to run the server

Vite dev server (uses `vite.config.js` at the project root — default port):

```bash
cd Nexura-Portal
npm run dev
```

- URL: http://localhost:5173/ (Vite picks the next free port automatically if
  5173 is taken; the log prints the chosen URL).
- The app boots at the public landing page and hydrates Supabase data through
  `src/supabaseClient.js`.
