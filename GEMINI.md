# GymFlow Project Context

GymFlow is a comprehensive gym membership management system featuring QR-based check-ins, subscription tracking, and WhatsApp automation. The project is currently in a transition phase from a standalone **Desktop Electron App** to a **Multi-tenant SaaS Web Platform**.

## Project Overview

- **Desktop Application (Electron)**: The legacy/offline version built with Electron, React, and SQLite. It handles local gym management and uses `whatsapp-web.js` for automation.
- **SaaS Web Platform (Next.js)**: A modern, cloud-native migration located in `/saas-web`. It uses Next.js, PostgreSQL, and Firebase Authentication, designed for multi-tenancy and hosted on GCP.
- **Landing Page (Next.js)**: A professional, gym-owner focused marketing site located in `/app`, exported as a static site.

## Key Technologies

### Desktop App
- **Runtime**: Electron
- **Frontend**: React, React Router, Zustand (State), Tailwind CSS
- **Backend/Storage**: Better-SQLite3 (Local Database)
- **Automation**: `whatsapp-web.js` (WhatsApp automation worker)
- **Utilities**: `qrcode` (QR generation), `pdf-lib` (Card generation), `i18next` (Internationalization)

### SaaS Web Platform (`/saas-web`)
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (Prisma/SQL baseline)
- **Auth**: Firebase Authentication (Owner accounts)
- **Infrastructure**: GCP Cloud Run, Cloud SQL, Cloud Storage
- **Migration**: Specialized migration API to import desktop SQLite data into SaaS PostgreSQL.

## Project Structure

- `/src`: Source code for the Electron desktop application.
  - `/main`: Electron main process (Database, IPC handlers, WhatsApp service).
  - `/renderer`: React-based UI for the desktop app.
- `/saas-web`: The Next.js SaaS migration project.
  - `/app`: Next.js App Router files.
  - `/db`: PostgreSQL schema (`schema.sql`) and migration scripts.
  - `/lib`: Shared logic (Auth, DB, Migration/Backup engines).
  - `/worker`: WhatsApp VM worker skeleton.
- `/app`: Root-level Next.js project for the public landing page.
- `/docs`: Project documentation and download assets.
- `/dist`, `/out`: Build and export directories.

## Building and Running

### Desktop App (Root)
- **Install Dependencies**: `npm install`
- **Run Development**: `npm run dev` (Note: Check root package.json for exact scripts)
- **Build/Package**: `npm run build` (Uses `electron-builder`)

### SaaS Web Platform (`/saas-web`)
- **Install Dependencies**: `npm install`
- **Local Dev**: `npm run dev`
- **Apply Schema**: `npm run db:migrate`
- **Typecheck**: `npm run typecheck`

### Landing Page (Root `/app`)
- **Local Dev**: `next dev`
- **Static Export**: `next build` (outputs to `/out/gymflow`)

## Development Conventions

- **Database Transitions**: Always refer to the SaaS schema in `saas-web/db/schema.sql` when adding features to ensure cross-platform compatibility.
- **WhatsApp Integration**: WhatsApp logic is being migrated from the desktop `whatsapp-web.js` implementation to a more stable VM-based worker in the SaaS version.
- **Multi-tenancy**: In the SaaS codebase, every record must be scoped by `organization_id` and `branch_id`.
- **Localization**: The desktop app uses `i18next` for Arabic/English support; maintain this consistency in the SaaS frontend.
