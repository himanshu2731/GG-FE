# GG-FE

React frontend for the PDF Signing & Verification System.

## Setup

```bash
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`  
API base: `VITE_API_BASE_URL` (default `http://localhost:8080`)

## Structure

```
src/
  api/          # HTTP client + auth endpoints
  auth/         # token storage + AuthContext
  pages/        # route pages (Home, Login, Signup)
  components/   # shared UI (added as needed)
```

Styling: **Tailwind CSS** (utility classes in JSX). Theme is dark-only.
