# AssetNexsus

AssetNexsus is a component-based asset management interface with a local authentication API.

## Run locally

```powershell
npm.cmd run dev
```

This starts both the Vite client and the API at `http://localhost:4000`. The Vite development server proxies `/api` calls to that API.

## Authentication API

- `POST /api/auth/register` — creates an Employee account only (`name`, `email`, `password`)
- `POST /api/auth/login` — sign in (`email`, `password`, `remember`)
- `GET /api/auth/me` — restore a session using `Authorization: Bearer <token>`
- `POST /api/auth/forgot-password` and `/api/auth/reset-password` — password recovery
- `GET /api/admin/employees` and `PATCH /api/admin/employees/:id/role` — admin-only Employee Directory and promotion endpoints

Passwords are hashed with Node's `scrypt`. Local development users are kept in `server/data/db.json`; production should use a database, HTTPS-only cookies, rate limiting, and a secure `JWT_SECRET` environment variable.

AssetFlow - Enterprise Asset & Resource Management SystemAssetFlow is a centralized ERP platform designed to simplify and digitize how organizations track, allocate, and maintain physical assets and shared resources. It reduces manual tracking inefficiencies by establishing structured lifecycles and real-time operational visibility without accounting complexities.  

🚀 Key Features
Organization Setup: Centralized management for departments, asset categories, and the employee directory.  
Asset Lifecycle Tracking: Real-time status updates spanning Available, Allocated, Reserved, Under Maintenance, Lost, Retired, and Disposed.  
Conflict-Free Allocation: Intelligent validation mechanics that block double-allocations and prompt direct transfer requests.  
Resource Booking: Visual calendar scheduling for shared spaces or tools equipped with automatic overlap validation.  
Maintenance Pipeline: A 5-stage approval Kanban board workflow that automatically updates asset availability states.  
Audit Cycles: Scheduled verification check-lists that auto-generate discrepancy reports for missing or damaged gear. 
Passwords are hashed with Node's `scrypt`. Local development users are kept in `server/data/db.json`; production should use a database, email service, HTTPS-only cookies, rate limiting, and a secure `JWT_SECRET` environment variable.
