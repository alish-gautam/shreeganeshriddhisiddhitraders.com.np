# Cloudflare setup

The project uses Astro's Cloudflare adapter, Workers static assets, D1 for catalogue and enquiry data, and R2 for product images. Preview and production use separate D1 databases and R2 buckets. Wrangler environment bindings must be configured separately; the preview and production bindings are already named in `wrangler.jsonc`.

## 1. Create Cloudflare resources

Create these resources in the account that owns `shreeganeshriddhisiddhitraders.com.np`:

| Environment | D1 database | R2 bucket |
| --- | --- | --- |
| Local | `sg-rs-catalog` | `sg-rs-product-images` |
| Preview | `sg-rs-catalog-preview` | `sg-rs-product-images-preview` |
| Production | `sg-rs-catalog-production` | `sg-rs-product-images-production` |

Use the names above so they match `wrangler.jsonc`. Copy the database IDs for the preview and production databases into their corresponding `database_id` fields in that file. Keep the top-level local D1 ID as the local placeholder; local Wrangler uses its local database. Never use the same D1 database for preview and production.

Keep all three R2 buckets private. Do not enable an `r2.dev` public URL or connect a public custom domain to a product-image bucket. The Worker serves public images through `/media/{key}` after checking the associated product's publication state; a public bucket URL bypasses that check and can expose draft or archived images. Verify the bucket's Public access setting in Cloudflare before preview and production.

Install dependencies, then apply the schema:

```sh
npm install
npm run db:preview:migrate
npm run db:production:migrate
```

Only the preview database may receive sample records:

```sh
npm run db:preview:demo
```

The production database should contain no demo records. The migration defines the schema and intentionally inserts no products.

## 2. Protect administrator routes with Cloudflare Access

Create Cloudflare Access self-hosted applications and allow policies for the client’s named administrator email addresses.

- Preview: protect the entire preview hostname, for example `preview.shreeganeshriddhisiddhitraders.com.np`.
- Production: protect `/admin*` and `/api/admin*` on the production hostname. The latter covers all admin mutation and media endpoints.
- Do not create a public bypass policy for these routes. The Worker independently checks the signed Access JWT and an email allowlist.

For each Access application, note its team domain and audience tag. Set the Worker secrets separately for each environment, replacing the example values:

```sh
npx wrangler secret put ACCESS_TEAM_DOMAIN --env preview
npx wrangler secret put ACCESS_AUD --env preview
npx wrangler secret put ADMIN_EMAILS --env preview

npx wrangler secret put ACCESS_TEAM_DOMAIN --env production
npx wrangler secret put ACCESS_AUD --env production
npx wrangler secret put ADMIN_EMAILS --env production
```

Enter the Access team domain (for example, `your-team.cloudflareaccess.com`), the audience tag for that environment's application, and a comma-separated list of approved administrator emails. The Cloudflare Access policy and `ADMIN_EMAILS` must both allow each administrator. Keep these values in Cloudflare secrets; do not commit them to source control.

## 3. Build and deploy

Deploy preview first:

```sh
npm run deploy:preview
```

Attach a preview custom domain to the preview Worker in Cloudflare, then confirm the whole preview hostname is behind Access. The preview build is visibly marked as a demo and sends `Disallow: /` in `robots.txt`.

After client review and launch checklist sign-off, deploy production:

```sh
npm run deploy
```

Attach the apex domain to the production Worker using Cloudflare's custom domain configuration. Add the `www` hostname and redirect it to the canonical apex domain using a Cloudflare redirect rule. Confirm DNS and SSL are active, and verify that the `workers.dev` route remains disabled (`workers_dev: false`).

## 4. Verify the live setup

- Confirm `/`, `/machines/`, category pages, and published product pages load over HTTPS.
- Submit a test enquiry and confirm it appears under `/admin/enquiries/` for an authenticated admin.
- Confirm `/admin/` and `/api/admin/*` require Cloudflare Access and reject unapproved emails.
- Confirm draft products and their images are not publicly accessible.
- Check `/robots.txt` allows indexing only on production and `/sitemap.xml` lists published catalogue pages.
- Test an image upload and removal from the admin interface.

See the official [Astro Cloudflare adapter guide](https://docs.astro.build/en/guides/integrations-guide/cloudflare/), [Wrangler environments guide](https://developers.cloudflare.com/workers/wrangler/environments/), and [Cloudflare Access JWT validation guide](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/) for account-specific details.

## Runtime and costs

This project uses standard Workers, D1, and R2 bindings. Configure Cloudflare usage alerts and review current product quotas and pricing in the account before launch; Cloudflare limits and paid plans can change. No email delivery, analytics account, or external image service is configured by this repository.
