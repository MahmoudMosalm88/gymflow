# GymFlow Project Context

GymFlow is a gym membership management system centered on a multi-tenant SaaS web platform with QR-based check-ins, subscription tracking, reporting, and WhatsApp automation.

## Project Overview

- **SaaS Web Platform (Next.js)**: The primary product located in `/saas-web`. It uses Next.js, PostgreSQL, and Firebase Authentication, designed for multi-tenancy and hosted on GCP.
- **Landing Page (Next.js)**: A professional, gym-owner focused marketing site located in `/app`, exported as a static site.
- **WhatsApp Worker**: A dedicated VM worker in `saas-web/worker/whatsapp-vm` for WhatsApp automation.

## Key Technologies

### SaaS Web Platform (`/saas-web`)
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Prisma/SQL baseline)
- **Auth**: Firebase Authentication (Owner accounts)
- **Infrastructure**: GCP Cloud Run, Cloud SQL, Cloud Storage
- **Migration**: Specialized migration API to import historical desktop SQLite backups into SaaS PostgreSQL.

## Project Structure

- `/saas-web`: The Next.js SaaS migration project.
  - `/app`: Next.js App Router files.
  - `/db`: PostgreSQL schema (`schema.sql`) and migration scripts.
  - `/lib`: Shared logic (Auth, DB, Migration/Backup engines).
  - `/worker`: WhatsApp VM worker.
- `/app`: Root-level Next.js project for the public landing page.
- `/docs`: Project documentation and product memory.
- `/out`: Static export directory for the landing site.

## Building and Running

### Root Landing Site
- **Install Dependencies**: `npm install`
- **Run Development**: `npm run dev`
- **Build**: `npm run build`

### SaaS Web Platform (`/saas-web`)
- **Install Dependencies**: `npm install`
- **Local Dev**: `npm run dev`
- **Apply Schema**: `npm run db:migrate`
- **Typecheck**: `npm run typecheck`

### Landing Page (Root `/app`)
- **Local Dev**: `next dev`
- **Static Export**: `next build` (outputs to `/out`)

## Development Conventions

- **Database Transitions**: Always refer to the SaaS schema in `saas-web/db/schema.sql` when adding features.
- **WhatsApp Integration**: WhatsApp automation is handled in the SaaS stack and VM worker rather than a local desktop runtime.
- **Multi-tenancy**: In the SaaS codebase, every record must be scoped by `organization_id` and `branch_id`.
- **Localization**: Maintain Arabic/English support across the SaaS frontend and marketing site.
