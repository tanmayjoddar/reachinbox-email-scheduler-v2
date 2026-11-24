# ReachInbox Email Job Scheduler

## Frontend

### Setup and Running
```sh
cd frontend
npm install
npm run dev      # Starts Vite dev server (default port 5173)
npm run build    # Type-checks via tsc and builds production bundle to dist/
```

### Dev Proxy Architecture
The frontend dev server proxies `/api`, `/auth`, `/slack`, and `/admin` to `http://localhost:3000`.
Because the browser interacts with a single origin, the `httpOnly` session `token` cookie set by Express travels automatically on all requests without cross-origin configuration or special cookie flags. All client fetch calls use relative paths (`/api/...`).

### Backend Environment Configuration
In `backend/.env`, ensure:
```env
FRONTEND_URL=http://localhost:5173
```
*Note for Windows users:* If Windows kernel port exclusion (WSL/Hyper-V dynamic reservation) blocks port 5173 with `EACCES`, the dev server automatically falls back to port 5241. If using the fallback port, update `FRONTEND_URL` in `backend/.env` accordingly.

### Project Layout
```
frontend/
  src/
    main.tsx                 # QueryClientProvider, BrowserRouter, Toaster root
    App.tsx                  # Client route definitions (/login, /dashboard, /compose)
    index.css                # Tailwind CSS v4 import, font definitions, design theme tokens
    types/api.ts             # TypeScript interfaces for API models and requests
    lib/api.ts               # Same-origin fetch wrapper, error handling, API client functions
    lib/format.ts            # Intl.DateTimeFormat date and time formatter
    lib/parseLeads.ts        # Lead extraction, deduplication, and validation from CSV/TXT
    hooks/                   # React Query hooks (useAuth, useEmails, useSlack)
    components/ui/           # Reusable atomic UI components (Button, Input, Avatar, Badge, Spinner)
    components/layout/       # App shell layout (DashboardLayout, UserMenu, SlackConnect)
    components/emails/       # Inbox list components (EmailList, EmailRow, SearchBox, Pagination)
    components/compose/      # Email composer (ComposeForm, LeadsUpload, SendLaterPopover)
    pages/                   # Route views (LoginPage, DashboardPage, ComposePage)
    routes/RequireAuth.tsx   # Auth guard checking GET /api/me with 401 redirect
```

### Feature Checklist
- [x] **Login (`/login`)**: Centered Figma-style login card with "Login with Google" link to `/auth/google` and error banner on `?error=auth_failed`.
- [x] **Header User Info & Logout**: User profile card with avatar, name, and email. Menu provides access to Bull Board queue dashboard and logout action clearing session.
- [x] **Dashboard Navigation**: Sidebar navigation with core Scheduled and Sent tabs, displaying live counts derived from list queries.
- [x] **Compose View (`/compose`)**: Full email composer with From, To, Subject, delay, hourly limit, and body textarea with formatting controls.
- [x] **Leads Upload & Direct Input**: Drag-and-drop/file input for `.csv` and `.txt` files with parsing, deduplication, valid address counter, and chips display.
- [x] **Timing & Limits**: Delay between emails in seconds, hourly limit, and "Send Later" popover with date-time picker and quick presets.
- [x] **Scheduled & Sent Tables**: Shared `EmailList` and `EmailRow` components rendering inbox rows with local time and status badges.
- [x] **Live Updates**: Automatic background polling every 5 seconds via React Query with `keepPreviousData` to prevent UI flicker.
- [x] **Search**: Debounced search input querying `/api/emails/search` with graceful 503 fallback.
- [x] **States**: Complete loading skeletons/spinners, empty states with tab-specific copy, and error states with retry capability.
- [x] **Slack Integration**: "Connect Slack" button initiating OAuth flow, displaying connected team/channel with disconnect option.
