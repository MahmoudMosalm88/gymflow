# GymFlow Project Context

GymFlow is a gym membership management system centered on a multi-tenant SaaS web platform with QR-based check-ins, subscription tracking, reporting, and WhatsApp automation.

## Project Overview

- **SaaS Web Platform (Next.js)**: The primary product now lives at the repo root. It uses Next.js, PostgreSQL, and Firebase Authentication, designed for multi-tenancy and hosted on GCP.
- **Archived Landing Snapshot**: The retired GitHub Pages landing/download site is preserved under `/archive/landing-pages-site`.
- **WhatsApp Worker**: A dedicated VM worker in `worker/whatsapp-vm` for WhatsApp automation.

## Key Technologies

### SaaS Web Platform (repo root)
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Prisma/SQL baseline)
- **Auth**: Firebase Authentication (Owner accounts)
- **Infrastructure**: GCP Cloud Run, Cloud SQL, Cloud Storage
- **Migration**: Specialized migration API to import historical desktop SQLite backups into SaaS PostgreSQL.

## Project Structure

- `/app`: Next.js App Router files for the active SaaS app.
- `/db`: PostgreSQL schema (`schema.sql`) and migration scripts.
- `/lib`: Shared logic (Auth, DB, Migration/Backup engines).
- `/worker`: WhatsApp VM worker.
- `/archive/landing-pages-site`: Preserved copy of the retired landing site.
- `/docs`: Project documentation and product memory.

## Building and Running

### SaaS Web Platform (repo root)
- **Install Dependencies**: `npm install`
- **Local Dev**: `npm run dev`
- **Apply Schema**: `npm run db:migrate`
- **Typecheck**: `npm run typecheck`

## Development Conventions

- **Database Transitions**: Always refer to the SaaS schema in `db/schema.sql` when adding features.
- **WhatsApp Integration**: WhatsApp automation is handled in the SaaS stack and VM worker rather than a local desktop runtime.
- **Multi-tenancy**: In the SaaS codebase, every record must be scoped by `organization_id` and `branch_id`.
- **Localization**: Maintain Arabic/English support across the SaaS frontend and public routes.
