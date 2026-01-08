# Notes UI

This folder contains the Simple Notes UI and API integration.

## Environment variables

The app reads runtime environment variables (SSR/Node `process.env`) without requiring code changes:

- `NG_APP_API_BASE` (preferred): Base URL for backend API, e.g. `http://localhost:8000`
- `NG_APP_BACKEND_URL` (fallback): Base URL for backend API

Requests are made to:

- `GET    {BASE}/notes`
- `POST   {BASE}/notes`
- `GET    {BASE}/notes/:id`
- `PUT    {BASE}/notes/:id`
- `DELETE {BASE}/notes/:id`

If BASE is empty, the app will call relative paths like `/notes`.

## Mock fallback (optional)

Set:

- `NG_APP_FEATURE_FLAGS=mockData=true`

Then, if backend calls fail, the UI will fall back to in-memory mock notes.
