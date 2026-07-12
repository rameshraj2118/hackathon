# AssetNexsus

AssetNexsus is a component-based asset management interface with a local authentication API.

## Run locally

```powershell
npm.cmd run dev
```

This starts both the Vite client and the API at `http://localhost:4000`. The Vite development server proxies `/api` calls to that API.

## Authentication API

- `POST /api/auth/register` — create an account (`name`, `email`, `password`)
- `POST /api/auth/login` — sign in (`email`, `password`, `remember`)
- `GET /api/auth/me` — restore a session using `Authorization: Bearer <token>`

Passwords are hashed with Node's `scrypt`. Local development users are kept in `server/data/db.json`; production should use a database, HTTPS-only cookies, rate limiting, and a secure `JWT_SECRET` environment variable.
