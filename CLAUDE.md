# HailiteManager — Codebase Guide

Business management platform for **Hailite Xteriors** (roofing + siding company, Quebec).

## Stack

- **Framework**: Next.js 15 App Router (TypeScript strict mode)
- **Database**: Supabase (PostgreSQL) with Row-Level Security
- **Auth**: Supabase Auth (email/password for admin, 4-digit PIN for employees)
- **File storage**: Google Cloud Storage (signed URL upload pattern — NOT Supabase Storage)
- **Payments**: Stripe Payment Links + webhooks
- **CSS**: Tailwind CSS v4 — **no `@apply` with custom classes**; all design-system classes are plain CSS in `globals.css`
- **PDF**: jsPDF (client-side, dynamic import to avoid SSR)

## Two Portals

| Portal | Route group | Auth |
|--------|-------------|------|
| Admin  | `(admin)`   | Supabase session (email/password), role=admin |
| Employee | `(employee)` | Supabase session after PIN login at `/employee-pin` |

## Key Architecture Decisions

### Supabase clients
- `src/lib/supabase/client.ts` — browser (`createBrowserClient`)
- `src/lib/supabase/server.ts` — server components + API routes (`createServerClient`)
- `src/lib/supabase/middleware.ts` — session refresh in middleware
- Use `createAdminClient()` (service role) only in secure API routes

### GCS Storage split
- `src/lib/gcs/storage-client.ts` — **browser-safe** helpers (getGCSPath, uploadToGCS via signed URL)
- `src/lib/gcs/storage.ts` — **server-only** (generateSignedUploadUrl, deleteFromGCS use @google-cloud/storage)
- Client components MUST import from `storage-client.ts` to avoid webpack bundling Node.js modules

### PDF generation
- `src/lib/pdf/generate.ts` — jsPDF generator shared by invoices and quotes
- Import dynamically: `const { generatePDF } = await import('@/lib/pdf/generate')`
- Employee payslips use `src/components/employee/PayrollPDFButton.tsx`

### Tailwind CSS v4
- `globals.css` contains ALL custom classes (`.hm-card`, `.hm-btn-*`, `.hm-nav-item`, etc.)
- Do **NOT** use `@apply` with custom class names — Tailwind v4 does not support it
- Theme via CSS variables: `--color-primary`, `--color-bg`, etc.
- Light theme via `[data-theme="light"]` selector on `<html>`

### auth layout
- `src/app/(auth)/layout.tsx` has `export const dynamic = 'force-dynamic'`
- Required to prevent build-time Supabase pre-render error (no env vars at build time)

## Two Visual Themes

`ThemeContext` toggles `data-theme="light"` on `<html>`. Persisted to localStorage.

- **Dark (default)**: orange primary, purple accent, near-black background
- **Light**: blue primary, green accent, near-white background

## Database Tables (key ones)

```
users, employees, subcontractors, clients
projects, project_tasks, project_photos
quotes, quote_line_items
invoices, invoice_line_items, st_invoices
punch_records, work_sessions
catalog_items, inventory_items
notifications
```

## Quebec Payroll Math

`src/lib/utils/payroll.ts`:
- Federal + provincial income tax (2024 QC brackets)
- EI: 1.66% up to annual max $1,049.12
- QPP: 5.4% on earnings between $3,500–$68,500 exemption
- Overtime: > 8h/day or > 40h/week → 1.5× rate

## Commands

```bash
npm run dev      # Development server
npm run build    # Production build (must pass before push)
npm run lint     # ESLint check
```

## Environment Variables

See `.env.example` for all required vars:
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GCS_PROJECT_ID`, `GCS_CLIENT_EMAIL`, `GCS_PRIVATE_KEY`, `GCS_BUCKET_NAME`, `NEXT_PUBLIC_GCS_BUCKET_NAME`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`
- `JWT_SECRET`

## File Structure

```
src/
├── app/
│   ├── (admin)/admin/        # Admin portal pages
│   ├── (auth)/               # Login, employee-pin
│   ├── (employee)/employee/  # Employee portal pages
│   ├── api/                  # API routes
│   ├── globals.css           # Design system (ALL CSS)
│   ├── error.tsx             # Global error boundary
│   └── not-found.tsx         # 404 page
├── components/
│   ├── dashboard/            # LivePunchFeed
│   ├── employee/             # PayrollPDFButton
│   ├── layout/               # AdminSidebar, AdminHeader, EmployeeSidebar, EmployeeBottomNav
│   ├── ui/                   # Button, Badge, Input, Modal, DataTable, NotificationBell, StatCard
│   └── upload/               # PhotoUpload
├── context/                  # ThemeContext, AuthContext
├── lib/
│   ├── gcs/                  # storage.ts (server), storage-client.ts (browser)
│   ├── pdf/                  # generate.ts (jsPDF)
│   ├── stripe/               # client.ts
│   └── utils/                # format.ts, payroll.ts
└── types/
    └── database.ts           # All TypeScript interfaces
```
