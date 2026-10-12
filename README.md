# Shree Ganesh Riddhi Siddhi Traders

An Astro storefront for a machinery trader in Biratnagar, Nepal. The public site is designed around finding machinery, comparing details, and asking the business about price and availability. The catalogue, enquiries, settings, and uploaded product images use Cloudflare D1 and R2.

The layout takes cues from the reference site's clear category navigation and quote-oriented product discovery, with an original visual system, responsive catalogue filters, dark and light themes, buying guides, and a protected product manager.

## Local development

Requirements: Node.js 22.12 or newer and npm.

```sh
npm install
npm run db:local:migrate
npm run db:local:demo
npm run dev
```

`npm run dev` starts Astro in background mode. Manage it with:

```sh
npx astro dev status
npx astro dev logs
npx astro dev stop
```

Demo records are clearly labelled sample data. They are kept in `seed/demo.sql`, separate from the production schema migration. Do not run `db:preview:demo` against production.

## Project commands

| Command | Purpose |
| --- | --- |
| `npm run check` | Astro and TypeScript diagnostics |
| `npm test` | Unit tests for input validation and slug helpers |
| `npm run build` | Standard Astro build |
| `npm run build:preview` | Cloudflare preview build with demo mode and no indexing |
| `npm run build:production` | Cloudflare production build with indexing enabled |
| `npm run db:local:migrate` | Apply schema to the local D1 database |
| `npm run db:local:demo` | Add clearly identified sample catalogue records locally |
| `npm run deploy:preview` | Build and deploy the preview Worker environment |
| `npm run deploy` | Build and deploy the production Worker environment |

## Content management

The admin interface is at `/admin/` and is protected by Cloudflare Access plus an email allowlist checked by the Worker. Administrators can manage products, categories, product images, enquiries, and public business details. Product pages support specifications, pricing modes, featured status, draft/published/archived states, and search metadata. The public site only serves published products and their images; draft and archived previews require administrator authentication.

The public contact form stores enquiries in D1 for follow-up in the admin area. It does not send email automatically. The buying guides are editorial pages maintained in the source; they are not entries in a blog CMS.

## Cloudflare setup and launch

The repository is ready for Cloudflare, but a Cloudflare account, D1 database IDs, Access application values, and domain attachment are account-specific and are not included. Follow [Cloudflare setup](docs/cloudflare-setup.md) to configure those resources and [the launch checklist](docs/launch-checklists.md) before publishing.

The preview build sets `PUBLIC_DEMO_MODE=true`, disables indexing, and keeps sample content visibly labelled. The production build sets it to `false`; apply only the schema migration to the production database before launch. Review all business details and product claims with the client before publication.

## Main folders

```text
src/pages/       Public pages, admin pages, and API routes
src/components/  Shared public and admin components
src/lib/         D1 access, validation, SEO, and Access authentication
src/styles/      Tailwind CSS v4 and site styles
migrations/      Production-safe D1 schema migrations
seed/            Explicitly optional local/preview sample records
scripts/         Build wrappers that set the correct environment
docs/            Cloudflare setup and launch checklists
```
